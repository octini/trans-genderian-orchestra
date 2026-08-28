import * as fs from "node:fs/promises";
import * as path from "node:path";
import { assertValidBeadID, hashString } from "./def-snapshot";
import { safeWarn } from "./config";

/**
 * Run event contract — WRITER side. Reader is sibling ticket; code EXACTLY to this shape.
 * {"ts":<epoch ms>,"type":"step"|"heartbeat"|"status","seat":"dylan"|"nas"|"horowitz","tool":"...","argsHash":"<fnv hex>","ok":true|false,"durationMs":<n>,"note":"..."}
 */
export type RunEventType = "step" | "heartbeat" | "status";
export type RunEventSeat = "dylan" | "nas" | "horowitz" | "bernstein" | "nirvana" | string;

export interface RunEvent {
  ts: number;
  type: RunEventType;
  seat: RunEventSeat;
  tool?: string;
  argsHash?: string;
  ok?: boolean;
  durationMs?: number;
  note?: string;
}

export function runsDir(repoRoot: string): string {
  return path.join(repoRoot, ".tgo", "runs");
}

export function runPath(repoRoot: string, runId: string): string {
  assertValidBeadID(runId);
  return path.join(runsDir(repoRoot), `${runId}.jsonl`);
}

/**
 * Primary await.json location — mirrors def-snapshot layout: .tgo/<runId>/await.json
 * Sibling ticket owns the file; we only detect presence.
 */
export function awaitJsonPath(repoRoot: string, runId: string): string {
  assertValidBeadID(runId);
  return path.join(repoRoot, ".tgo", runId, "await.json");
}

/** Alternate location some siblings may use: .tgo/runs/<runId>.await.json */
export function awaitJsonAltPath(repoRoot: string, runId: string): string {
  assertValidBeadID(runId);
  return path.join(runsDir(repoRoot), `${runId}.await.json`);
}

export async function hasAwaitJson(repoRoot: string, runId: string): Promise<boolean> {
  assertValidBeadID(runId);
  const primary = awaitJsonPath(repoRoot, runId);
  const alt = awaitJsonAltPath(repoRoot, runId);
  // Also check .tgo/runs/<runId>/await.json (directory per run)
  const third = path.join(runsDir(repoRoot), runId, "await.json");
  for (const p of [primary, alt, third]) {
    try {
      await fs.stat(p);
      return true;
    } catch {}
  }
  return false;
}

export async function appendRunEvent(repoRoot: string, runId: string, event: RunEvent): Promise<void> {
  assertValidBeadID(runId);
  if (typeof event.ts !== "number" || !Number.isFinite(event.ts)) {
    throw new Error(`appendRunEvent: ts must be finite number for ${runId}`);
  }
  if (event.type !== "step" && event.type !== "heartbeat" && event.type !== "status") {
    throw new Error(`appendRunEvent: invalid type "${event.type as string}" for ${runId}`);
  }
  if (typeof event.seat !== "string" || event.seat.trim().length === 0) {
    throw new Error(`appendRunEvent: seat must be non-empty string for ${runId}`);
  }
  const dir = runsDir(repoRoot);
  await fs.mkdir(dir, { recursive: true });
  const target = runPath(repoRoot, runId);
  const line = JSON.stringify(event) + "\n";
  await fs.appendFile(target, line, "utf-8");
}

export async function readRunEvents(repoRoot: string, runId: string): Promise<RunEvent[]> {
  assertValidBeadID(runId);
  const target = runPath(repoRoot, runId);
  try {
    const raw = await fs.readFile(target, "utf-8");
    if (!raw.trim()) return [];
    const out: RunEvent[] = [];
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      try {
        const parsed = JSON.parse(t) as RunEvent;
        if (parsed && typeof parsed.ts === "number" && typeof parsed.type === "string" && typeof parsed.seat === "string") {
          out.push(parsed);
        }
      } catch {}
    }
    return out;
  } catch {
    return [];
  }
}

/** Convenience: hash args for argsHash field (FNV-1a via hashString) */
export function hashArgs(args: unknown): string {
  if (typeof args === "string") return hashString(args);
  try {
    return hashString(JSON.stringify(args ?? ""));
  } catch {
    return hashString(String(args));
  }
}

// ── Recovery scan ─────────────────────────────────────────────────────────

export interface RecoveryFlag {
  runId: string;
  reason: "suspended" | "dead-heartbeat";
  lastHeartbeat?: number;
  hasAwaitJson: boolean;
  hasTerminalStatus: boolean;
}

export const DEFAULT_HEARTBEAT_THRESHOLD_MS = 5 * 60 * 1000;

export async function scanRunsForProblems(
  repoRoot: string,
  opts: { heartbeatThresholdMs?: number; now?: number; log?: (level: "warn" | "info" | "error", message: string, extra?: Record<string, unknown>) => void } = {},
): Promise<RecoveryFlag[]> {
  const now = opts.now ?? Date.now();
  const threshold = opts.heartbeatThresholdMs ?? DEFAULT_HEARTBEAT_THRESHOLD_MS;
  const dir = runsDir(repoRoot);
  let files: string[] = [];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }
  const out: RecoveryFlag[] = [];
  for (const file of files) {
    if (!file.endsWith(".jsonl")) continue;
    const runId = file.slice(0, -".jsonl".length);
    try {
      assertValidBeadID(runId);
    } catch {
      continue;
    }
    let events: RunEvent[] = [];
    try {
      events = await readRunEvents(repoRoot, runId);
    } catch (e) {
      safeWarn(opts.log, `scanRunsForProblems read failed for ${runId}`, { error: String(e) });
      continue;
    }
    const hasTerminalStatus = events.some((e) => e.type === "status");
    const heartbeats = events.filter((e) => e.type === "heartbeat");
    const lastHeartbeat = heartbeats.length > 0 ? heartbeats[heartbeats.length - 1]!.ts : undefined;
    // also consider last event ts if no heartbeat but has steps — use last event as heartbeat proxy for stale detection
    const lastEventTs = events.length > 0 ? events[events.length - 1]!.ts : undefined;
    const heartbeatRef = lastHeartbeat ?? lastEventTs;
    let hasAwait = false;
    try {
      hasAwait = await hasAwaitJson(repoRoot, runId);
    } catch {}
    if (hasAwait) {
      out.push({ runId, reason: "suspended", lastHeartbeat: heartbeatRef, hasAwaitJson: true, hasTerminalStatus });
      continue;
    }
    if (!hasTerminalStatus && heartbeatRef !== undefined && now - heartbeatRef > threshold) {
      out.push({ runId, reason: "dead-heartbeat", lastHeartbeat: heartbeatRef, hasAwaitJson: false, hasTerminalStatus });
    }
  }
  return out;
}

// ── Bounded growth / prune ───────────────────────────────────────────────

export interface PruneOptions {
  maxAgeMs?: number;
  maxBytes?: number;
  maxFiles?: number;
  now?: number;
  heartbeatThresholdMs?: number;
  log?: (level: "warn" | "info" | "error", message: string, extra?: Record<string, unknown>) => void;
}

export const DEFAULT_PRUNE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const DEFAULT_PRUNE_MAX_BYTES = 50 * 1024 * 1024;
export const DEFAULT_PRUNE_MAX_FILES = 200;

export async function pruneRuns(repoRoot: string, opts: PruneOptions = {}): Promise<string[]> {
  const now = opts.now ?? Date.now();
  const maxAgeMs = opts.maxAgeMs ?? DEFAULT_PRUNE_MAX_AGE_MS;
  const maxBytes = opts.maxBytes ?? DEFAULT_PRUNE_MAX_BYTES;
  const maxFiles = opts.maxFiles ?? DEFAULT_PRUNE_MAX_FILES;
  const dir = runsDir(repoRoot);
  let files: string[] = [];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }
  const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));
  type Info = { file: string; runId: string; mtimeMs: number; size: number; events: RunEvent[]; hasTerminal: boolean; lastTs?: number };
  const infos: Info[] = [];
  let totalBytes = 0;
  for (const file of jsonlFiles) {
    const runId = file.slice(0, -".jsonl".length);
    try {
      assertValidBeadID(runId);
    } catch {
      continue;
    }
    const full = path.join(dir, file);
    let stat: { mtimeMs: number; size: number };
    try {
      const s = await fs.stat(full);
      stat = { mtimeMs: s.mtimeMs, size: s.size };
    } catch {
      continue;
    }
    totalBytes += stat.size;
    let events: RunEvent[] = [];
    let hasTerminal = false;
    let lastTs: number | undefined;
    try {
      events = await readRunEvents(repoRoot, runId);
      hasTerminal = events.some((e) => e.type === "status");
      if (events.length > 0) lastTs = events[events.length - 1]!.ts;
    } catch {}
    infos.push({ file, runId, mtimeMs: stat.mtimeMs, size: stat.size, events, hasTerminal, lastTs });
  }

  // Sort oldest first for pruning decisions
  infos.sort((a, b) => a.mtimeMs - b.mtimeMs);

  const toDelete = new Set<string>();

  // Age-based: delete files older than maxAgeMs, but NEVER delete active runs (no terminal status and recent heartbeat/lastTs within threshold)
  const heartbeatThreshold = opts.heartbeatThresholdMs ?? DEFAULT_HEARTBEAT_THRESHOLD_MS;
  for (const info of infos) {
    const age = now - info.mtimeMs;
    if (age <= maxAgeMs) continue;
    const isActive = !info.hasTerminal && info.lastTs !== undefined && now - info.lastTs <= heartbeatThreshold;
    if (isActive) {
      safeWarn(opts.log, `pruneRuns skipping active run ${info.runId}`, { age, hasTerminal: info.hasTerminal });
      continue;
    }
    // Also skip if await.json present (suspended, not yet terminal)
    let hasAwait = false;
    try {
      hasAwait = await hasAwaitJson(repoRoot, info.runId);
    } catch {}
    if (hasAwait) continue;
    toDelete.add(info.file);
  }

  // Count-based and size-based: if still over limits, delete oldest non-active, non-suspended files first
  let remaining = infos.filter((i) => !toDelete.has(i.file));
  let remainingBytes = remaining.reduce((acc, i) => acc + i.size, 0);

  // Need to delete to satisfy maxFiles and maxBytes
  // Sort remaining oldest first (already sorted)
  for (const info of [...remaining].sort((a, b) => a.mtimeMs - b.mtimeMs)) {
    if (remaining.length <= maxFiles && remainingBytes <= maxBytes) break;
    const isActive = !info.hasTerminal && info.lastTs !== undefined && now - info.lastTs <= heartbeatThreshold;
    if (isActive) continue;
    let hasAwait = false;
    try {
      hasAwait = await hasAwaitJson(repoRoot, info.runId);
    } catch {}
    if (hasAwait) continue;
    toDelete.add(info.file);
    remaining = remaining.filter((r) => r.file !== info.file);
    remainingBytes -= info.size;
  }

  const deleted: string[] = [];
  for (const file of toDelete) {
    const full = path.join(dir, file);
    try {
      await fs.unlink(full);
      deleted.push(file);
    } catch (e) {
      safeWarn(opts.log, `pruneRuns unlink failed for ${file}`, { error: String(e) });
    }
    // Also clean up sibling await.json if present and orphaned? No — sibling owns it, don't delete.
  }
  return deleted;
}
