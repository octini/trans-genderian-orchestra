import * as fs from "node:fs/promises";
import * as path from "node:path";

export const VALID_BEAD_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

// Fault-injection hook for deterministic concurrency tests — delays the first write-once fs.open
let __defSnapshotFaultDelayMs = 0;
let __defSnapshotFaultFired = false;
export function __setDefSnapshotWriteDelayForTest(ms: number): void { __defSnapshotFaultDelayMs = ms; __defSnapshotFaultFired = false; }
export function __clearDefSnapshotWriteDelayForTest(): void { __defSnapshotFaultDelayMs = 0; __defSnapshotFaultFired = false; }

export function isValidBeadID(id: string): boolean {
  return VALID_BEAD_ID.test(id);
}

export function assertValidBeadID(issueId: string): void {
  if (!isValidBeadID(issueId)) {
    throw new Error(`invalid issueId "${issueId}" — must match ${VALID_BEAD_ID.source} (VALID_BEAD_ID)`);
  }
}

export function hashString(s: string): string {
  // FNV-1a 32-bit — stable vector: hashString("foo.ts") === "b5c9292a"
  let hash = 2166136261;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export interface DefSnapshot {
  promptHash: string;
  model: string;
  preset: string;
  seatFrontmatterHash: string;
  seatFileFound: boolean;
  capturedAt: string;
}

export function defSnapshotPath(repoRoot: string, issueId: string): string {
  assertValidBeadID(issueId);
  return path.join(repoRoot, ".tgo", issueId, "def-snapshot.json");
}

// Hash the complete five-part delegation definition — mutating any section changes the hash.
// Canonical form: length-prefixed sections ("${len}:${section}" joined) prevents delimiter collision.
export function normalizeFivePartSections(packet: {
  Objective?: unknown;
  Files?: unknown;
  Interfaces?: unknown;
  Constraints?: unknown;
  Verification?: unknown;
}): string[] {
  const obj = typeof packet.Objective === "string" ? packet.Objective : JSON.stringify(packet.Objective ?? "");
  const files = Array.isArray(packet.Files)
    ? JSON.stringify(packet.Files)
    : typeof packet.Files === "string"
      ? packet.Files
      : JSON.stringify(packet.Files ?? "");
  const interfaces = typeof packet.Interfaces === "string" ? packet.Interfaces : JSON.stringify(packet.Interfaces ?? "");
  const constraints = typeof packet.Constraints === "string" ? packet.Constraints : JSON.stringify(packet.Constraints ?? "");
  const verification = typeof packet.Verification === "string" ? packet.Verification : JSON.stringify(packet.Verification ?? "");
  return [obj, files, interfaces, constraints, verification];
}

export function lengthPrefixJoin(parts: string[]): string {
  return parts.map((s) => `${s.length}:${s}`).join("");
}

export function canonicalizeFivePart(
  sections: string[],
  joiner: (parts: string[]) => string = lengthPrefixJoin,
): string {
  return joiner(sections);
}

export function hashFivePartPacket(packet: {
  Objective?: unknown;
  Files?: unknown;
  Interfaces?: unknown;
  Constraints?: unknown;
  Verification?: unknown;
}): string {
  const sections = normalizeFivePartSections(packet);
  const canonical = canonicalizeFivePart(sections);
  return hashString(canonical);
}

export function buildDefSnapshot(opts: {
  packet: { Objective?: unknown; Files?: unknown; Interfaces?: unknown; Constraints?: unknown; Verification?: unknown };
  seatFrontmatter: string;
  seatFileFound: boolean;
  model: string;
  preset: string;
  capturedAt?: string;
}): DefSnapshot {
  if (opts.model === "unknown" || opts.model.trim().length === 0) {
    throw new Error(`buildDefSnapshot: model must be a resolved host-authoritative model, not "unknown"`);
  }
  if (opts.preset.trim().length === 0) {
    throw new Error(`buildDefSnapshot: preset must be non-empty`);
  }
  return {
    promptHash: hashFivePartPacket(opts.packet),
    seatFrontmatterHash: hashString(opts.seatFrontmatter),
    seatFileFound: opts.seatFileFound,
    model: opts.model,
    preset: opts.preset,
    capturedAt: opts.capturedAt ?? new Date().toISOString(),
  };
}

// Legacy helper for tests that hash raw promptText (kept for compatibility, but production uses hashFivePartPacket)
export function buildDefSnapshotFromPrompt(opts: {
  promptText: string;
  seatFrontmatter: string;
  seatFileFound?: boolean;
  model: string;
  preset: string;
  capturedAt?: string;
}): DefSnapshot {
  if (opts.model === "unknown" || opts.model.trim().length === 0) {
    throw new Error(`buildDefSnapshotFromPrompt: model must not be "unknown"`);
  }
  return {
    promptHash: hashString(opts.promptText),
    seatFrontmatterHash: hashString(opts.seatFrontmatter),
    seatFileFound: opts.seatFileFound ?? true,
    model: opts.model,
    preset: opts.preset,
    capturedAt: opts.capturedAt ?? new Date().toISOString(),
  };
}

export async function writeDefSnapshot(
  repoRoot: string,
  issueId: string,
  snapshot: DefSnapshot,
  opts?: { useLatestDefinitions?: boolean }
): Promise<boolean> {
  assertValidBeadID(issueId);
  if (snapshot.model === "unknown") {
    throw new Error(`writeDefSnapshot: refusing to write snapshot with model "unknown"`);
  }
  const target = defSnapshotPath(repoRoot, issueId);
  const dir = path.dirname(target);
  try { await fs.mkdir(dir, { recursive: true }); } catch {}

  if (!opts?.useLatestDefinitions) {
    // write-once via tmp+link — final appears atomically WITH FULL CONTENT, never empty/partial
    const content = JSON.stringify(snapshot, null, 2);
    const tmp = path.join(dir, `.def-snapshot-${hashString(content)}-${process.pid}-${Math.random().toString(36).slice(2)}.tmp`);
    try {
      await fs.writeFile(tmp, content, "utf-8");
      // Fault injection for deterministic concurrency test: delay between tmp write and link
      if (__defSnapshotFaultDelayMs > 0 && !__defSnapshotFaultFired) {
        __defSnapshotFaultFired = true;
        await new Promise((r) => setTimeout(r, __defSnapshotFaultDelayMs));
      }
      await fs.link(tmp, target);
      try { await fs.unlink(tmp); } catch {}
      return true;
    } catch (e) {
      try { await fs.unlink(tmp); } catch {}
      const code = (e as NodeJS.ErrnoException)?.code;
      if (code === "EEXIST") return false;
      if (code === "ENOENT") {
        try { await fs.mkdir(dir, { recursive: true }); } catch {}
        // One retry with fresh tmp after ensuring dir exists
        const retryTmp = path.join(dir, `.def-snapshot-${hashString(content)}-${process.pid}-${Math.random().toString(36).slice(2)}.tmp`);
        try {
          await fs.writeFile(retryTmp, content, "utf-8");
          await fs.link(retryTmp, target);
          try { await fs.unlink(retryTmp); } catch {}
          return true;
        } catch (e2) {
          try { await fs.unlink(retryTmp); } catch {}
          const code2 = (e2 as NodeJS.ErrnoException)?.code;
          if (code2 === "EEXIST") return false;
          throw e2;
        }
      }
      throw e;
    }
  }

  // useLatestDefinitions: overwrite via tmp+rename (host-authoritative upgrade)
  const tmp = path.join(dir, `def-snapshot.json.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
  try {
    await fs.writeFile(tmp, JSON.stringify(snapshot, null, 2), "utf-8");
    await fs.rename(tmp, target);
    return true;
  } catch {
    try { await fs.rm(tmp, { force: true }); } catch {}
    return false;
  }
}

export async function readDefSnapshot(repoRoot: string, issueId: string): Promise<DefSnapshot | undefined> {
  assertValidBeadID(issueId);
  const target = defSnapshotPath(repoRoot, issueId);
  try {
    const raw = await fs.readFile(target, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return undefined;
    const promptHash = parsed.promptHash;
    const seatFrontmatterHash = parsed.seatFrontmatterHash;
    const model = parsed.model;
    const preset = parsed.preset;
    const capturedAt = parsed.capturedAt;
    const seatFileFound = parsed.seatFileFound;
    if (typeof promptHash !== "string" || !/^[0-9a-f]{8}$/.test(promptHash)) return undefined;
    if (typeof seatFrontmatterHash !== "string" || !/^[0-9a-f]{8}$/.test(seatFrontmatterHash)) return undefined;
    if (typeof model !== "string" || model.trim().length === 0 || model === "unknown") return undefined;
    if (typeof preset !== "string" || preset.trim().length === 0) return undefined;
    if (typeof capturedAt !== "string" || capturedAt.trim().length === 0) return undefined;
    // seatFileFound is required for new snapshots; legacy snapshots without it are treated as found=true for compat
    let found: boolean;
    if (seatFileFound === undefined) found = true;
    else if (typeof seatFileFound === "boolean") found = seatFileFound;
    else return undefined;
    return {
      promptHash: promptHash as string,
      seatFrontmatterHash: seatFrontmatterHash as string,
      model: model as string,
      preset: preset as string,
      seatFileFound: found,
      capturedAt: capturedAt as string,
    };
  } catch {
    return undefined;
  }
}

export async function ensureDefSnapshot(opts: {
  repoRoot: string;
  issueId: string;
  packet?: { Objective?: unknown; Files?: unknown; Interfaces?: unknown; Constraints?: unknown; Verification?: unknown };
  promptText?: string;
  seatFrontmatter: string;
  seatFileFound: boolean;
  model: string;
  preset: string;
  useLatestDefinitions?: boolean;
  capturedAt?: string;
}): Promise<{ snapshot: DefSnapshot; written: boolean; reused: boolean }> {
  assertValidBeadID(opts.issueId);
  const existing = await readDefSnapshot(opts.repoRoot, opts.issueId);
  if (existing && !opts.useLatestDefinitions) return { snapshot: existing, written: false, reused: true };
  let snapshot: DefSnapshot;
  if (opts.packet !== undefined) {
    snapshot = buildDefSnapshot({
      packet: opts.packet,
      seatFrontmatter: opts.seatFrontmatter,
      seatFileFound: opts.seatFileFound,
      model: opts.model,
      preset: opts.preset,
      capturedAt: opts.capturedAt,
    });
  } else if (opts.promptText !== undefined) {
    snapshot = buildDefSnapshotFromPrompt({
      promptText: opts.promptText,
      seatFrontmatter: opts.seatFrontmatter,
      seatFileFound: opts.seatFileFound,
      model: opts.model,
      preset: opts.preset,
      capturedAt: opts.capturedAt,
    });
  } else {
    throw new Error("ensureDefSnapshot: either packet or promptText must be provided");
  }
  const written = await writeDefSnapshot(opts.repoRoot, opts.issueId, snapshot, { useLatestDefinitions: opts.useLatestDefinitions });
  if (!written) {
    // Loser: poll FINAL path only with generous deadline (2s, 10 attempts); persistent absence → typed error, never divergent
    const attempts = 10;
    const intervalMs = 200;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const retry = await readDefSnapshot(opts.repoRoot, opts.issueId);
      if (retry) return { snapshot: retry, written: false, reused: true };
      if (existing) return { snapshot: existing, written: false, reused: true };
      if (attempt < attempts - 1) await new Promise((r) => setTimeout(r, intervalMs));
    }
    const finalRetry = await readDefSnapshot(opts.repoRoot, opts.issueId);
    if (finalRetry) return { snapshot: finalRetry, written: false, reused: true };
    if (existing) return { snapshot: existing, written: false, reused: true };
    throw new Error(`def-snapshot convergence failed for ${opts.issueId}: final file absent after 2s poll`);
  }
  return { snapshot, written, reused: false };
}
