import * as fs from "node:fs/promises";
import * as path from "node:path";
import { assertValidBeadID, hashString } from "./def-snapshot";
import { safeWarn } from "./config";

/**
 * Run event contract v2 — WRITER side. Reader adapts to same spec.
 * Every line: {ts, type:"step"|"heartbeat"|"status", seat, tool, argsHash, ok, durationMs, note, cmd?, issueId}
 * - tool REQUIRED non-empty on ALL lines (heartbeats: tool:"heartbeat")
 * - ok REQUIRED boolean
 * - issueId REQUIRED valid bead ID
 * - cmd OPTIONAL for bash/edit/write (truncate ~500, strip controls)
 * - type:"status" RESERVED for terminal delegation outcomes only (note: complete|failed|aborted); tool completions are "step"
 */
export type RunEventType = "step" | "heartbeat" | "status";
export type RunEventSeat = "dylan" | "nas" | "horowitz" | "bernstein" | "nirvana" | string;

export interface RunEvent {
  ts: number;
  type: RunEventType;
  seat: RunEventSeat;
  tool: string;
  argsHash: string;
  ok: boolean;
  durationMs?: number;
  note?: string;
  cmd?: string;
  issueId: string;
}

const TERMINAL_NOTES = new Set(["complete", "failed", "aborted"]);

export function isTerminalStatus(event: RunEvent): boolean {
  return event.type === "status" && typeof event.note === "string" && TERMINAL_NOTES.has(event.note.trim().toLowerCase());
}

export function sanitizeCmd(cmd: string): string {
  // strip control chars except \n \r \t (but we truncate and remove them anyway)
  const stripped = cmd.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  if (stripped.length > 500) return stripped.slice(0, 500);
  return stripped;
}

export function runsDir(repoRoot: string): string {
  return path.join(repoRoot, ".tgo", "runs");
}

export function runPath(repoRoot: string, runId: string): string {
  assertValidBeadID(runId);
  return path.join(runsDir(repoRoot), `${runId}.jsonl`);
}

/**
 * Single await.json location — esy's real path: .tgo/<issueId>/await.json
 * Sibling ticket owns the file; we only detect presence.
 * With contract v2, await checks are issueId-scoped (resolved from event lines).
 */
export function awaitJsonPath(repoRoot: string, issueId: string): string {
  assertValidBeadID(issueId);
  return path.join(repoRoot, ".tgo", issueId, "await.json");
}

export async function hasAwaitJson(repoRoot: string, issueId: string): Promise<boolean> {
  assertValidBeadID(issueId);
  const p = awaitJsonPath(repoRoot, issueId);
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
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
  if (typeof event.tool !== "string" || event.tool.trim().length === 0) {
    throw new Error(`appendRunEvent: tool REQUIRED non-empty for ${runId} (heartbeat uses "heartbeat")`);
  }
  if (typeof event.ok !== "boolean") {
    throw new Error(`appendRunEvent: ok REQUIRED boolean for ${runId}`);
  }
  if (typeof event.issueId !== "string" || event.issueId.trim().length === 0) {
    throw new Error(`appendRunEvent: issueId REQUIRED for ${runId}`);
  }
  assertValidBeadID(event.issueId);
  if (typeof event.argsHash !== "string" || event.argsHash.trim().length === 0) {
    throw new Error(`appendRunEvent: argsHash REQUIRED for ${runId}`);
  }
  // Enforce status only for terminal outcomes (warn, don't hard-fail for forward compat, but validate note)
  if (event.type === "status") {
    const note = (event.note ?? "").trim().toLowerCase();
    if (!TERMINAL_NOTES.has(note)) {
      // Allow but warn — scanner will not treat as terminal, so this would be a bug if writer emits non-terminal status
      // Throw for strict contract v2? Spec says RESERVED, so we enforce
      throw new Error(`appendRunEvent: status RESERVED for terminal notes complete|failed|aborted, got "${event.note}" for ${runId}`);
    }
  }
  // cmd handling: truncate and strip controls if present
  if (event.cmd !== undefined) {
    if (typeof event.cmd !== "string") throw new Error(`appendRunEvent: cmd must be string for ${runId}`);
    event = { ...event, cmd: sanitizeCmd(event.cmd) };
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
        if (
          parsed &&
          typeof parsed.ts === "number" &&
          typeof parsed.type === "string" &&
          typeof parsed.seat === "string" &&
          typeof parsed.tool === "string" &&
          typeof (parsed as any).ok === "boolean" &&
          typeof parsed.issueId === "string"
        ) {
          out.push(parsed);
        } else {
          // For backward compat, allow old lines without required fields but don't push? Actually we want to keep them for scanning old files, but writer now always writes v2.
          // If old file has missing fields, still push if it has ts/type/seat for graceful degradation
          if (parsed && typeof (parsed as any).ts === "number" && typeof (parsed as any).type === "string" && typeof (parsed as any).seat === "string") {
            // synthesize missing required fields for old data so scanner can still function
            const synthetic: RunEvent = {
              ts: (parsed as any).ts,
              type: parsed.type as RunEventType,
              seat: parsed.seat,
              tool: (parsed as any).tool ?? (parsed.type === "heartbeat" ? "heartbeat" : "unknown"),
              argsHash: (parsed as any).argsHash ?? hashString(""),
              ok: typeof (parsed as any).ok === "boolean" ? (parsed as any).ok : true,
              issueId: (parsed as any).issueId ?? runId,
              note: (parsed as any).note,
              durationMs: (parsed as any).durationMs,
              cmd: (parsed as any).cmd,
            };
            out.push(synthetic);
          }
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
  issueId: string;
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
    if (events.length === 0) continue;
    // Resolve issueId per run — use first event's issueId (contract v2 guarantees it), fallback to runId for old files
    const issueId = events[0]?.issueId ?? runId;
    try {
      assertValidBeadID(issueId);
    } catch {
      continue;
    }
    const hasTerminalStatus = events.some(isTerminalStatus);
    const heartbeats = events.filter((e) => e.type === "heartbeat");
    const lastHeartbeat = heartbeats.length > 0 ? heartbeats[heartbeats.length - 1]!.ts : undefined;
    const lastEventTs = events.length > 0 ? events[events.length - 1]!.ts : undefined;
    const heartbeatRef = lastHeartbeat ?? lastEventTs;
    let hasAwait = false;
    try {
      hasAwait = await hasAwaitJson(repoRoot, issueId);
    } catch {}
    if (hasAwait) {
      out.push({ runId, issueId, reason: "suspended", lastHeartbeat: heartbeatRef, hasAwaitJson: true, hasTerminalStatus });
      continue;
    }
    if (!hasTerminalStatus && heartbeatRef !== undefined && now - heartbeatRef > threshold) {
      out.push({ runId, issueId, reason: "dead-heartbeat", lastHeartbeat: heartbeatRef, hasAwaitJson: false, hasTerminalStatus });
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

// Single-flight guard for prune
let pruneInFlight: Promise<string[]> | undefined;

export async function pruneRuns(repoRoot: string, opts: PruneOptions = {}): Promise<string[]> {
  if (pruneInFlight) return pruneInFlight;
  const p = (async () => {
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
    type Info = { file: string; runId: string; issueId: string; mtimeMs: number; size: number; events: RunEvent[]; hasTerminal: boolean; lastTs?: number };
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
      let issueId = runId;
      try {
        events = await readRunEvents(repoRoot, runId);
        hasTerminal = events.some(isTerminalStatus);
        if (events.length > 0) {
          lastTs = events[events.length - 1]!.ts;
          issueId = events[0]?.issueId ?? runId;
        }
      } catch {}
      try {
        assertValidBeadID(issueId);
      } catch {
        issueId = runId;
      }
      infos.push({ file, runId, issueId, mtimeMs: stat.mtimeMs, size: stat.size, events, hasTerminal, lastTs });
    }

    infos.sort((a, b) => a.mtimeMs - b.mtimeMs);

    const toDelete = new Set<string>();
    const heartbeatThreshold = opts.heartbeatThresholdMs ?? DEFAULT_HEARTBEAT_THRESHOLD_MS;
    for (const info of infos) {
      const age = now - info.mtimeMs;
      if (age <= maxAgeMs) continue;
      const isActive = !info.hasTerminal && info.lastTs !== undefined && now - info.lastTs <= heartbeatThreshold;
      if (isActive) {
        safeWarn(opts.log, `pruneRuns skipping active run ${info.runId}`, { age, hasTerminal: info.hasTerminal });
        continue;
      }
      let hasAwait = false;
      try {
        hasAwait = await hasAwaitJson(repoRoot, info.issueId);
      } catch {}
      if (hasAwait) continue;
      toDelete.add(info.file);
    }

    let remaining = infos.filter((i) => !toDelete.has(i.file));
    let remainingBytes = remaining.reduce((acc, i) => acc + i.size, 0);

    for (const info of [...remaining].sort((a, b) => a.mtimeMs - b.mtimeMs)) {
      if (remaining.length <= maxFiles && remainingBytes <= maxBytes) break;
      const isActive = !info.hasTerminal && info.lastTs !== undefined && now - info.lastTs <= heartbeatThreshold;
      if (isActive) continue;
      let hasAwait = false;
      try {
        hasAwait = await hasAwaitJson(repoRoot, info.issueId);
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
    }
    return deleted;
  })();
  pruneInFlight = p;
  try {
    return await p;
  } finally {
    pruneInFlight = undefined;
  }
}
