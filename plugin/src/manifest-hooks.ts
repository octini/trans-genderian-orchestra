/**
 * Manifest hooks — onDispatch, onComplete, messageFilter
 *
 * - CONTEXT-LEAN: manifest lives on disk; workers read only their own row; onDispatch injects one compact block.
 * - Missing manifest = zero overhead (all hooks no-op).
 * - Additive, clearly-named functions for crowded hook path.
 */

import { readManifest, getManifestRowSyncFromManifest, type ManifestBead } from "./manifest";
import { isValidBeadID } from "./def-snapshot";
import { parseTaskReport, type ParsedReport } from "./report";

// ---------------------------------------------------------------------------
// onDispatch — inject manifest row into delegation packet scoping
// ---------------------------------------------------------------------------

export interface ManifestDispatchInjection {
  injected: boolean;
  packet: Record<string, unknown>;
  row?: ManifestBead;
  wave?: number;
}

/**
 * Inject the manifest row for issueId into packet as one compact block.
 * If manifest missing or bead not found, no-op (zero overhead).
 * The compact block is `packet.manifest = { story, scope, parallelSet, deps, wave }`.
 * Returns new packet (shallow copy if injected) and row.
 */
export async function manifestOnDispatch(opts: {
  repoRoot: string;
  issueId: string;
  packet: Record<string, unknown>;
}): Promise<ManifestDispatchInjection> {
  const { repoRoot, issueId, packet } = opts;
  if (!isValidBeadID(issueId)) return { injected: false, packet };
  let manifest;
  try {
    manifest = await readManifest(repoRoot);
  } catch {
    return { injected: false, packet };
  }
  if (!manifest) return { injected: false, packet };
  const found = getManifestRowSyncFromManifest(manifest, issueId);
  if (!found) return { injected: false, packet };
  const { bead, wave } = found;
  // inject one compact block — additive, does not overwrite existing packet fields except manifest
  const next = { ...packet };
  next.manifest = {
    issueId: bead.issueId,
    story: bead.story,
    scope: bead.scope,
    parallelSet: bead.parallelSet,
    deps: bead.deps,
    wave,
  };
  // Also ensure scoping is visible to legacy readers that only inspect packet.Files — we keep Files as is,
  // but add manifestScope alias for clarity.
  // No prompt-size blowup: only one row.
  return { injected: true, packet: next, row: bead, wave };
}

// Sync version for tests / messageFilter that already has manifest
export function manifestOnDispatchSync(opts: {
  manifest: import("./manifest").Manifest | undefined;
  issueId: string;
  packet: Record<string, unknown>;
}): ManifestDispatchInjection {
  const { manifest, issueId, packet } = opts;
  if (!manifest || !isValidBeadID(issueId)) return { injected: false, packet };
  const found = getManifestRowSyncFromManifest(manifest, issueId);
  if (!found) return { injected: false, packet };
  const { bead, wave } = found;
  const next = { ...packet };
  next.manifest = {
    issueId: bead.issueId,
    story: bead.story,
    scope: bead.scope,
    parallelSet: bead.parallelSet,
    deps: bead.deps,
    wave,
  };
  return { injected: true, packet: next, row: bead, wave };
}

// ---------------------------------------------------------------------------
// onComplete — mismatch (files touched outside scope) routes to BAIL, not retry
// ---------------------------------------------------------------------------

function extractTouchedFilesFromReport(report: ParsedReport): string[] {
  const changes = report.fields.CHANGES ?? "";
  if (!changes || changes.trim().length === 0) return [];
  // Split by newline/comma, strip bullets, keep file-like tokens
  const tokens: string[] = [];
  const parts = changes.split(/[\n,]+/);
  for (const raw of parts) {
    const trimmed = raw.trim().replace(/^-\s*/, "").trim();
    if (trimmed.length === 0) continue;
    // heuristic: token contains slash or dot, or ends with known extension
    // but also accept bare filenames like "value.ts"
    const candidates = trimmed.split(/\s+/).filter(Boolean);
    for (const c of candidates) {
      // remove punctuation wrappers like `, (), []
      const cleaned = c.replace(/^[\[`'"({]+|[,\]`'")}\]]+$/g, "").trim();
      if (cleaned.length === 0) continue;
      if (cleaned.includes("/") || cleaned.includes(".") || /^[A-Za-z0-9._-]+\.[A-Za-z0-9]+$/.test(cleaned)) {
        tokens.push(cleaned);
      } else if (/^[A-Za-z0-9._\-\/]+$/.test(cleaned) && cleaned.length > 2) {
        // last resort: if it looks like a path without dot but with slash
        if (cleaned.includes("/")) tokens.push(cleaned);
      }
    }
  }
  // dedupe
  return [...new Set(tokens)];
}

function toBailReport(original: ParsedReport, mismatchFiles: string[]): ParsedReport {
  // Preserve original fields but override taxonomy to bail (terminal, not retry)
  // This consumes the merged status taxonomy {status: bail, retryable: false} -> abandon
  const bailFields: ParsedReport["fields"] = {
    ...original.fields,
    TASK_STATUS: "bail",
    RETRYABLE: "false",
  };
  return {
    ...original,
    valid: original.valid,
    completionSafe: false,
    exitGate: original.exitGate,
    taxonomy: { status: "bail" as const, retryable: false },
    recovery: "abandon" as const,
    fields: bailFields,
    raw: original.raw + `\n[m manifest mismatch: touched outside scope: ${mismatchFiles.join(", ")}]`,
  };
}

export interface ManifestCompleteCheck {
  bail: boolean;
  report: ParsedReport;
  mismatchFiles?: string[];
  row?: ManifestBead;
}

/**
 * Check delegation report's touched-files vs manifest row scope.
 * If any touched file not in scope → route to BAIL (not retry).
 * Missing manifest or missing row → no-op (zero overhead).
 * touchedFiles param allows tests to inject explicit list; otherwise parse CHANGES.
 */
export async function manifestOnComplete(opts: {
  repoRoot: string;
  issueId: string;
  report: ParsedReport;
  touchedFiles?: string[];
}): Promise<ManifestCompleteCheck> {
  const { repoRoot, issueId, report, touchedFiles } = opts;
  if (!isValidBeadID(issueId)) return { bail: false, report };
  let manifest;
  try {
    manifest = await readManifest(repoRoot);
  } catch {
    return { bail: false, report };
  }
  if (!manifest) return { bail: false, report };
  const found = getManifestRowSyncFromManifest(manifest, issueId);
  if (!found) return { bail: false, report };
  const { bead } = found;
  const scopeSet = new Set(bead.scope);
  const touched = touchedFiles !== undefined ? [...new Set(touchedFiles.map((s) => s.trim()).filter(Boolean))] : extractTouchedFilesFromReport(report);
  if (touched.length === 0) return { bail: false, report, row: bead };
  const mismatch = touched.filter((f) => !scopeSet.has(f));
  if (mismatch.length === 0) return { bail: false, report, row: bead };
  const bailed = toBailReport(report, mismatch);
  return { bail: true, report: bailed, mismatchFiles: mismatch, row: bead };
}

// Sync helper for tests
export function manifestOnCompleteSync(opts: {
  manifest: import("./manifest").Manifest | undefined;
  issueId: string;
  report: ParsedReport;
  touchedFiles?: string[];
}): ManifestCompleteCheck {
  const { manifest, issueId, report, touchedFiles } = opts;
  if (!manifest || !isValidBeadID(issueId)) return { bail: false, report };
  const found = getManifestRowSyncFromManifest(manifest, issueId);
  if (!found) return { bail: false, report };
  const { bead } = found;
  const scopeSet = new Set(bead.scope);
  const touched = touchedFiles !== undefined ? [...new Set(touchedFiles.map((s) => s.trim()).filter(Boolean))] : extractTouchedFilesFromReport(report);
  if (touched.length === 0) return { bail: false, report, row: bead };
  const mismatch = touched.filter((f) => !scopeSet.has(f));
  if (mismatch.length === 0) return { bail: false, report, row: bead };
  return { bail: true, report: toBailReport(report, mismatch), mismatchFiles: mismatch, row: bead };
}

// ---------------------------------------------------------------------------
// messageFilter — strip file references outside bead's manifest scope
// ---------------------------------------------------------------------------

export interface ManifestFilterResult {
  filtered: boolean;
  packet: Record<string, unknown>;
  stripped?: string[];
}

/**
 * Filter packet file references outside manifest scope before worker sees it.
 * Currently filters packet.Files array (delegation Files) to intersection with scope.
 * Missing manifest or row → no-op.
 * Stripped list returned for diagnostics, not inlined large.
 */
export async function manifestMessageFilter(opts: {
  repoRoot: string;
  issueId: string;
  packet: Record<string, unknown>;
}): Promise<ManifestFilterResult> {
  const { repoRoot, issueId, packet } = opts;
  if (!isValidBeadID(issueId)) return { filtered: false, packet };
  let manifest;
  try {
    manifest = await readManifest(repoRoot);
  } catch {
    return { filtered: false, packet };
  }
  if (!manifest) return { filtered: false, packet };
  const found = getManifestRowSyncFromManifest(manifest, issueId);
  if (!found) return { filtered: false, packet };
  const { bead } = found;
  const scopeSet = new Set(bead.scope);
  const files = packet.Files;
  if (!Array.isArray(files) || files.length === 0) return { filtered: false, packet };
  const original = files.filter((f) => typeof f === "string") as string[];
  const kept = original.filter((f) => scopeSet.has(f as string));
  const stripped = original.filter((f) => !scopeSet.has(f as string));
  if (stripped.length === 0) return { filtered: false, packet };
  const next = { ...packet, Files: kept };
  return { filtered: true, packet: next, stripped };
}

export function manifestMessageFilterSync(opts: {
  manifest: import("./manifest").Manifest | undefined;
  issueId: string;
  packet: Record<string, unknown>;
}): ManifestFilterResult {
  const { manifest, issueId, packet } = opts;
  if (!manifest || !isValidBeadID(issueId)) return { filtered: false, packet };
  const found = getManifestRowSyncFromManifest(manifest, issueId);
  if (!found) return { filtered: false, packet };
  const scopeSet = new Set(found.bead.scope);
  const files = packet.Files;
  if (!Array.isArray(files)) return { filtered: false, packet };
  const original = files.filter((f) => typeof f === "string") as string[];
  const kept = original.filter((f) => scopeSet.has(f));
  const stripped = original.filter((f) => !scopeSet.has(f));
  if (stripped.length === 0) return { filtered: false, packet };
  return { filtered: true, packet: { ...packet, Files: kept }, stripped };
}

// ---------------------------------------------------------------------------
// Context-lean helpers
// ---------------------------------------------------------------------------

/**
 * Check if adding a new manifest row would blow prompt size — it doesn't,
 * because only the row is inlined. For testing context-lean invariant.
 */
export function manifestRowSizeApprox(row: ManifestBead): number {
  // rough token count: story words + scope entries
  const storyTokens = row.story.split(/\s+/).filter(Boolean).length;
  return storyTokens + row.scope.length * 2;
}
