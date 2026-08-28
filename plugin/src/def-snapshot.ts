import * as fs from "node:fs/promises";
import * as path from "node:path";

export const VALID_BEAD_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

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
export function hashFivePartPacket(packet: {
  Objective?: unknown;
  Files?: unknown;
  Interfaces?: unknown;
  Constraints?: unknown;
  Verification?: unknown;
}): string {
  const obj = typeof packet.Objective === "string" ? packet.Objective : JSON.stringify(packet.Objective ?? "");
  const files = Array.isArray(packet.Files) ? JSON.stringify(packet.Files) : JSON.stringify(packet.Files ?? "");
  const interfaces = typeof packet.Interfaces === "string" ? packet.Interfaces : JSON.stringify(packet.Interfaces ?? "");
  const constraints = typeof packet.Constraints === "string" ? packet.Constraints : JSON.stringify(packet.Constraints ?? "");
  const verification = typeof packet.Verification === "string" ? packet.Verification : JSON.stringify(packet.Verification ?? "");
  const canonical = [obj, files, interfaces, constraints, verification].map((s) => `${s.length}:${s}`).join("");
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
    // atomic exclusive create — if file already exists, fail fast without overwriting.
    // Use open 'wx' for true atomicity against concurrent writers; fall back to access-check if needed.
    try {
      const fh = await fs.open(target, "wx");
      try {
        await fh.writeFile(JSON.stringify(snapshot, null, 2), "utf-8");
      } finally {
        await fh.close();
      }
      return true;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException)?.code;
      if (code === "EEXIST") return false;
      // If wx failed for other reason (e.g. ENOENT dir missing), try mkdir and retry once
      if (code === "ENOENT") {
        try { await fs.mkdir(dir, { recursive: true }); } catch {}
        try {
          const fh2 = await fs.open(target, "wx");
          try {
            await fh2.writeFile(JSON.stringify(snapshot, null, 2), "utf-8");
          } finally {
            await fh2.close();
          }
          return true;
        } catch (e2) {
          if ((e2 as NodeJS.ErrnoException)?.code === "EEXIST") return false;
          // fall through to tmp+rename fallback below for unexpected errors
        }
      }
      // Fallback: check existence via access and then tmp+rename if still absent (paranoid)
      try { await fs.access(target); return false; } catch {}
      // Still absent but wx failed — fallback to tmp+rename (should be rare)
      const tmp = path.join(dir, `def-snapshot.json.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
      try {
        await fs.writeFile(tmp, JSON.stringify(snapshot, null, 2), "utf-8");
        // Try exclusive link: write tmp then attempt to move without overwriting via open check
        try { await fs.access(target); await fs.rm(tmp, { force: true }); return false; } catch {}
        await fs.rename(tmp, target);
        return true;
      } catch {
        try { await fs.rm(tmp, { force: true }); } catch {}
        return false;
      }
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
    // Either pre-existing file or concurrent winner — re-read to converge on single winner.
    // Concurrent losers may race the winner's write (file exists but is empty/not yet flushed), so retry a few times.
    for (let attempt = 0; attempt < 5; attempt++) {
      const retry = await readDefSnapshot(opts.repoRoot, opts.issueId);
      if (retry) return { snapshot: retry, written: false, reused: true };
      if (existing) return { snapshot: existing, written: false, reused: true };
      // Brief backoff before retrying — winner's write is in-flight
      await new Promise((r) => setTimeout(r, 5 * (attempt + 1)));
    }
    const finalRetry = await readDefSnapshot(opts.repoRoot, opts.issueId);
    if (finalRetry) return { snapshot: finalRetry, written: false, reused: true };
    if (existing) return { snapshot: existing, written: false, reused: true };
  }
  return { snapshot, written, reused: false };
}
