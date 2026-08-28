/**
 * Manifest for handoff waves — typed, on-disk, plan-time scope-conflict checked.
 *
 * Manifest file at `.tgo/manifest.json` with shape:
 * `{waves:[{wave, beads:[{issueId, story, scope:[], parallelSet, deps[]}]}]}`
 *
 * - Written at PLAN time by primary seat via host tool tgo_plan_manifest.
 * - Pairwise touch-set intersection across beads in SAME parallelSet (within same wave) → typed conflict error, refuse write.
 * - Cross-wave overlaps are legal (sequenced by deps).
 * - Context-lean: lives on disk; board shows one-line pointer; workers read only their own row.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { assertValidBeadID, isValidBeadID, VALID_BEAD_ID } from "./def-snapshot";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ManifestBead {
  issueId: string;
  story: string;
  scope: string[];
  parallelSet: string;
  deps: string[];
}

export interface ManifestWave {
  wave: number;
  beads: ManifestBead[];
}

export interface Manifest {
  waves: ManifestWave[];
}

export interface ScopeConflict {
  wave: number;
  parallelSet: string;
  beads: [string, string];
  overlappingFiles: string[];
}

// ---------------------------------------------------------------------------
// Paths & constants
// ---------------------------------------------------------------------------

export const MANIFEST_REL_PATH = ".tgo/manifest.json";

export function manifestPath(repoRoot: string): string {
  return path.join(repoRoot, MANIFEST_REL_PATH);
}

// Typed error for plan-time scope collision
export class ManifestScopeConflictError extends Error {
  readonly code = "MANIFEST_SCOPE_CONFLICT" as const;
  readonly conflicts: ScopeConflict[];
  constructor(message: string, conflicts: ScopeConflict[]) {
    super(message);
    this.name = "ManifestScopeConflictError";
    this.conflicts = conflicts;
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateManifest(manifest: unknown): { valid: boolean; errors: string[]; manifest?: Manifest } {
  const errors: string[] = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    errors.push("manifest must be an object with waves[]");
    return { valid: false, errors };
  }
  const m = manifest as Record<string, unknown>;
  if (!Array.isArray(m.waves)) {
    errors.push("manifest.waves must be an array");
    return { valid: false, errors };
  }
  const waves: ManifestWave[] = [];
  const seenIssueIds = new Set<string>();
  for (let wi = 0; wi < m.waves.length; wi++) {
    const w = m.waves[wi] as unknown;
    if (!w || typeof w !== "object" || Array.isArray(w)) {
      errors.push(`waves[${wi}] must be an object`);
      continue;
    }
    const waveRec = w as Record<string, unknown>;
    const waveNum = waveRec.wave;
    if (typeof waveNum !== "number" || !Number.isInteger(waveNum) || waveNum < 0) {
      errors.push(`waves[${wi}].wave must be a non-negative integer`);
    }
    if (!Array.isArray(waveRec.beads)) {
      errors.push(`waves[${wi}].beads must be an array`);
      continue;
    }
    const beads: ManifestBead[] = [];
    for (let bi = 0; bi < waveRec.beads.length; bi++) {
      const b = (waveRec.beads as unknown[])[bi] as unknown;
      if (!b || typeof b !== "object" || Array.isArray(b)) {
        errors.push(`waves[${wi}].beads[${bi}] must be an object`);
        continue;
      }
      const rec = b as Record<string, unknown>;
      const issueId = rec.issueId;
      if (typeof issueId !== "string" || issueId.trim().length === 0) {
        errors.push(`waves[${wi}].beads[${bi}].issueId must be non-empty string`);
      } else if (!isValidBeadID(issueId.trim())) {
        errors.push(`waves[${wi}].beads[${bi}].issueId must match VALID_BEAD_ID ${VALID_BEAD_ID.source} — got ${JSON.stringify(issueId)}`);
      } else if (seenIssueIds.has(issueId.trim())) {
        errors.push(`duplicate issueId ${issueId} across waves`);
      } else {
        seenIssueIds.add(issueId.trim());
      }
      const story = rec.story;
      if (typeof story !== "string" || story.trim().length === 0) {
        errors.push(`waves[${wi}].beads[${bi}].story must be non-empty string`);
      }
      const scope = rec.scope;
      if (!Array.isArray(scope) || scope.length === 0) {
        errors.push(`waves[${wi}].beads[${bi}].scope must be non-empty string array`);
      } else {
        for (let si = 0; si < scope.length; si++) {
          const s = scope[si];
          if (typeof s !== "string" || s.trim().length === 0) {
            errors.push(`waves[${wi}].beads[${bi}].scope[${si}] must be non-empty string`);
          }
        }
        // dedupe check within same bead? optional
        const scopeSet = new Set<string>();
        for (const s of scope as string[]) {
          if (typeof s === "string" && scopeSet.has(s.trim())) {
            errors.push(`waves[${wi}].beads[${bi}].scope duplicate ${JSON.stringify(s)}`);
          } else if (typeof s === "string") scopeSet.add(s.trim());
        }
      }
      const parallelSet = rec.parallelSet;
      if (typeof parallelSet !== "string" || parallelSet.trim().length === 0) {
        errors.push(`waves[${wi}].beads[${bi}].parallelSet must be non-empty string`);
      }
      const deps = rec.deps;
      if (!Array.isArray(deps)) {
        errors.push(`waves[${wi}].beads[${bi}].deps must be an array`);
      } else {
        for (let di = 0; di < deps.length; di++) {
          const d = deps[di];
          if (typeof d !== "string" || d.trim().length === 0) {
            errors.push(`waves[${wi}].beads[${bi}].deps[${di}] must be non-empty string`);
          } else if (!isValidBeadID((d as string).trim())) {
            errors.push(`waves[${wi}].beads[${bi}].deps[${di}] must match VALID_BEAD_ID`);
          }
        }
      }
      // only push if we have valid issueId and story etc? push anyway for conflict check if we can
      if (
        typeof issueId === "string" &&
        isValidBeadID(issueId.trim()) &&
        typeof story === "string" &&
        story.trim().length > 0 &&
        Array.isArray(scope) &&
        typeof parallelSet === "string" &&
        parallelSet.trim().length > 0 &&
        Array.isArray(deps)
      ) {
        beads.push({
          issueId: issueId.trim(),
          story: story.trim(),
          scope: (scope as string[]).map((s) => (typeof s === "string" ? s.trim() : String(s))),
          parallelSet: parallelSet.trim(),
          deps: (deps as string[]).map((d) => (typeof d === "string" ? d.trim() : String(d))),
        });
      }
    }
    if (typeof waveNum === "number" && Number.isInteger(waveNum) && waveNum >= 0) {
      waves.push({ wave: waveNum, beads });
    }
  }
  if (errors.length > 0) return { valid: false, errors };
  // sort waves by wave number for deterministic output
  waves.sort((a, b) => a.wave - b.wave);
  return { valid: true, errors: [], manifest: { waves } };
}

// ---------------------------------------------------------------------------
// Scope-conflict check — pairwise intersection within SAME parallelSet per wave
// Cross-wave overlaps are legal (sequenced by deps).
// O(waves * beads_in_parallelSet^2 * scopeSize) — small sets, run once at plan time.
// ---------------------------------------------------------------------------

export function checkScopeConflicts(manifest: Manifest): { hasConflict: boolean; conflicts: ScopeConflict[] } {
  const conflicts: ScopeConflict[] = [];
  for (const wave of manifest.waves) {
    // group by parallelSet
    const bySet = new Map<string, ManifestBead[]>();
    for (const bead of wave.beads) {
      const key = bead.parallelSet;
      const list = bySet.get(key) ?? [];
      list.push(bead);
      bySet.set(key, list);
    }
    for (const [parallelSet, beads] of bySet) {
      // pairwise
      for (let i = 0; i < beads.length; i++) {
        for (let j = i + 1; j < beads.length; j++) {
          const a = beads[i]!;
          const b = beads[j]!;
          const setA = new Set(a.scope);
          const overlapping = b.scope.filter((f) => setA.has(f));
          if (overlapping.length > 0) {
            conflicts.push({
              wave: wave.wave,
              parallelSet,
              beads: [a.issueId, b.issueId],
              overlappingFiles: [...new Set(overlapping)],
            });
          }
        }
      }
    }
  }
  return { hasConflict: conflicts.length > 0, conflicts };
}

// ---------------------------------------------------------------------------
// Disk IO — atomic tmp+rename, never partial. Missing file = undefined (no-op).
// ---------------------------------------------------------------------------

export async function readManifest(repoRoot: string): Promise<Manifest | undefined> {
  const target = manifestPath(repoRoot);
  try {
    const raw = await fs.readFile(target, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    const v = validateManifest(parsed);
    if (!v.valid || !v.manifest) return undefined;
    // also check conflicts? reading does not need conflict check, but we can return as is
    return v.manifest;
  } catch {
    return undefined;
  }
}

export async function writeManifestAtomic(repoRoot: string, manifest: Manifest): Promise<void> {
  const target = manifestPath(repoRoot);
  const dir = path.dirname(target);
  await fs.mkdir(dir, { recursive: true });
  const content = JSON.stringify(manifest, null, 2);
  const tmp = path.join(dir, `.manifest-${Date.now()}-${process.pid}-${Math.random().toString(36).slice(2)}.tmp`);
  let renamed = false;
  try {
    await fs.writeFile(tmp, content, "utf-8");
    await fs.rename(tmp, target);
    renamed = true;
  } finally {
    if (!renamed) {
      try {
        await fs.unlink(tmp);
      } catch {}
    }
  }
}

// ---------------------------------------------------------------------------
// Plan-time entry — validates, conflict-checks, then writes atomically.
// Throws ManifestScopeConflictError on same-parallelSet overlap (typed, refuse write).
// Throws Error on schema validation failure.
// ---------------------------------------------------------------------------

export async function planManifest(repoRoot: string, manifest: Manifest | unknown): Promise<Manifest> {
  const v = validateManifest(manifest);
  if (!v.valid || !v.manifest) {
    throw new Error(`manifest validation failed: ${v.errors.join("; ")}`);
  }
  const normalized = v.manifest;
  const conflict = checkScopeConflicts(normalized);
  if (conflict.hasConflict) {
    const details = conflict.conflicts
      .map((c) => `wave ${c.wave} parallelSet ${JSON.stringify(c.parallelSet)} beads ${c.beads.join(" vs ")} overlap ${c.overlappingFiles.join(", ")}`)
      .join("; ");
    throw new ManifestScopeConflictError(`MANIFEST_SCOPE_CONFLICT: manifest scope conflict: ${details}`, conflict.conflicts);
  }
  await writeManifestAtomic(repoRoot, normalized);
  return normalized;
}

export async function getManifestRow(
  repoRoot: string,
  issueId: string
): Promise<{ bead: ManifestBead; wave: number } | undefined> {
  if (!isValidBeadID(issueId)) return undefined;
  const m = await readManifest(repoRoot);
  if (!m) return undefined;
  for (const wave of m.waves) {
    for (const bead of wave.beads) {
      if (bead.issueId === issueId) return { bead, wave: wave.wave };
    }
  }
  return undefined;
}

export function getManifestRowSyncFromManifest(manifest: Manifest | undefined, issueId: string): { bead: ManifestBead; wave: number } | undefined {
  if (!manifest) return undefined;
  for (const wave of manifest.waves) {
    for (const bead of wave.beads) {
      if (bead.issueId === issueId) return { bead, wave: wave.wave };
    }
  }
  return undefined;
}

export function buildManifestPointer(manifest: Manifest | undefined): string | undefined {
  if (!manifest) return undefined;
  const waveCount = manifest.waves.length;
  return `manifest: ${MANIFEST_REL_PATH} (${waveCount} waves)`;
}

export function buildManifestPointerFromCount(waveCount: number): string {
  return `manifest: ${MANIFEST_REL_PATH} (${waveCount} waves)`;
}
