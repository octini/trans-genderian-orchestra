import * as fs from "node:fs/promises";
import * as path from "node:path";
import { safeWarn } from "./config";
import { SEATS } from "./config";

export interface SeatMetrics {
  queueDepth: number;
  inFlight: number;
  waitMs: number;
}

export interface MetricsSnapshot {
  bySeat: Record<string, SeatMetrics>;
  updatedAt: string;
}

export function metricsPath(repoRoot: string): string {
  return path.join(repoRoot, ".tgo", "metrics.json");
}

export async function writeMetrics(repoRoot: string, snapshot: MetricsSnapshot): Promise<void> {
  const dir = path.join(repoRoot, ".tgo");
  await fs.mkdir(dir, { recursive: true });
  const target = metricsPath(repoRoot);
  const tmp = path.join(dir, `metrics.json.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
  await fs.writeFile(tmp, JSON.stringify(snapshot, null, 2), "utf-8");
  await fs.rename(tmp, target);
}

export async function readMetrics(repoRoot: string): Promise<MetricsSnapshot | undefined> {
  const target = metricsPath(repoRoot);
  try {
    const raw = await fs.readFile(target, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    const bySeat = parsed.bySeat;
    const updatedAt = parsed.updatedAt;
    if (!bySeat || typeof bySeat !== "object" || Array.isArray(bySeat)) return undefined;
    if (typeof updatedAt !== "string") return undefined;
    const out: Record<string, SeatMetrics> = {};
    for (const [seat, v] of Object.entries(bySeat as Record<string, unknown>)) {
      if (!v || typeof v !== "object" || Array.isArray(v)) continue;
      const rec = v as Record<string, unknown>;
      if (typeof rec.queueDepth !== "number" || typeof rec.inFlight !== "number" || typeof rec.waitMs !== "number") continue;
      out[seat] = { queueDepth: rec.queueDepth, inFlight: rec.inFlight, waitMs: rec.waitMs };
    }
    return { bySeat: out, updatedAt: updatedAt as string };
  } catch {
    return undefined;
  }
}

export interface ComputeMetricsInput {
  ready: Array<{ id: string }>;
  blocked: Array<{ id: string }>;
  streaming: Array<{ id: string; target: string; startedAt?: number }>;
  watchdogTracked?: ReadonlyArray<{ sessionID: string; parentID?: string; busy: boolean }>;
  shimAgents?: Map<string, string>;
  now?: number;
  previous?: MetricsSnapshot;
}

export function computeMetrics(input: ComputeMetricsInput): MetricsSnapshot {
  const now = input.now ?? Date.now();
  const readyCount = input.ready.length;
  // blocked intentionally not in queueDepth but available for future
  // const blockedCount = input.blocked.length;

  // Build per-seat streaming counts and waitMs
  const streamingBySeat = new Map<string, { count: number; earliest: number | undefined }>();
  for (const s of input.streaming) {
    const seat = (s.target ?? "").trim() || "unknown";
    const cur = streamingBySeat.get(seat) ?? { count: 0, earliest: undefined };
    cur.count += 1;
    if (s.startedAt !== undefined && Number.isFinite(s.startedAt)) {
      if (cur.earliest === undefined || s.startedAt < cur.earliest) cur.earliest = s.startedAt;
    }
    streamingBySeat.set(seat, cur);
  }

  // Incorporate watchdog tracked busy sessions via shimAgents mapping
  if (input.watchdogTracked && input.shimAgents) {
    for (const t of input.watchdogTracked) {
      if (!t.busy) continue;
      const seat = input.shimAgents.get(t.sessionID);
      if (!seat) continue;
      const cur = streamingBySeat.get(seat) ?? { count: 0, earliest: undefined };
      // Only count watchdog if not already counted via streaming? We treat as additional inFlight
      // To avoid double-count, we increment only if this sessionID not already in streaming.
      // But streaming entries are keyed by issue id, not session id, so they are distinct.
      // We count them as extra inFlight for that seat.
      cur.count += 1;
      streamingBySeat.set(seat, cur);
    }
  }

  const bySeat: Record<string, SeatMetrics> = {};
  // Ensure all known seats appear, plus any dynamic seats from streaming
  const allSeats = new Set<string>([...SEATS as readonly string[], ...streamingBySeat.keys()]);
  // Include any seats from previous snapshot to keep stable keys
  if (input.previous) {
    for (const k of Object.keys(input.previous.bySeat)) allSeats.add(k);
  }
  for (const seat of allSeats) {
    const info = streamingBySeat.get(seat);
    const inFlight = info?.count ?? 0;
    const waitMs = info?.earliest !== undefined ? Math.max(0, now - info.earliest) : 0;
    // queueDepth derived from bd counts + inFlight map: currently global ready count
    // Future: could partition by seat if assignment available; for now uniform.
    const queueDepth = readyCount;
    bySeat[seat] = { queueDepth, inFlight, waitMs };
  }

  return { bySeat, updatedAt: new Date(now).toISOString() };
}

export function hasGrowingDepth(previous: MetricsSnapshot | undefined, current: MetricsSnapshot): boolean {
  if (!previous) return false;
  for (const [seat, cur] of Object.entries(current.bySeat)) {
    const prev = previous.bySeat[seat];
    if (prev && cur.queueDepth > prev.queueDepth && cur.queueDepth > 0) return true;
  }
  return false;
}

export function renderQueueLine(snapshot: MetricsSnapshot | undefined, previous?: MetricsSnapshot): string | undefined {
  if (!snapshot) return undefined;
  const lines: string[] = [];
  const growing = hasGrowingDepth(previous, snapshot);
  for (const seat of Object.keys(snapshot.bySeat).sort()) {
    const m = snapshot.bySeat[seat]!;
    // Only render seats with pending or inFlight to keep board concise? But spec says "QUEUE: <seat> N pending"
    // We render all seats where queueDepth >0 or inFlight>0
    if (m.queueDepth === 0 && m.inFlight === 0) continue;
    const base = `QUEUE: ${seat} ${m.queueDepth} pending`;
    const inFlightPart = m.inFlight > 0 ? ` (${m.inFlight} in-flight, wait ${Math.round(m.waitMs / 1000)}s)` : "";
    const warning = growing && m.queueDepth > (previous?.bySeat[seat]?.queueDepth ?? 0) ? " ⚠️ growing" : "";
    lines.push(`${base}${inFlightPart}${warning}`);
  }
  if (lines.length === 0) return undefined;
  return lines.join("\n");
}

// ── Problems rendering ─────────────────────────────────────────────────

export type ProblemState = "stuck" | "aborted" | "idle" | "awaiting";

export interface ProblemEntry {
  runId: string;
  state: ProblemState;
  reason: string;
  lastTs?: number;
}

export function buildProblemsSection(problems: ProblemEntry[]): string | undefined {
  if (problems.length === 0) return undefined;
  const grouped = new Map<ProblemState, ProblemEntry[]>();
  for (const p of problems) {
    const arr = grouped.get(p.state) ?? [];
    arr.push(p);
    grouped.set(p.state, arr);
  }
  const order: ProblemState[] = ["stuck", "aborted", "idle", "awaiting"];
  const lines: string[] = ["PROBLEMS:"];
  for (const state of order) {
    const arr = grouped.get(state);
    if (!arr || arr.length === 0) continue;
    const label = state.toUpperCase();
    for (const e of arr) {
      const note = e.reason ? ` — ${e.reason}` : "";
      lines.push(`- ${e.runId} · ${label}${note}`);
    }
  }
  // Any other states not in order
  for (const [state, arr] of grouped) {
    if (order.includes(state)) continue;
    for (const e of arr) {
      lines.push(`- ${e.runId} · ${state.toUpperCase()} — ${e.reason}`);
    }
  }
  return lines.join("\n");
}

/** Map recovery flags + watchdog state into ProblemEntry[] for board/sidebar */
export function problemsFromRecovery(
  recovery: Array<{ runId: string; reason: "suspended" | "dead-heartbeat"; lastHeartbeat?: number; hasAwaitJson: boolean }>,
  watchdogProblems?: Array<{ sessionID: string; issueId?: string; state: ProblemState; reason: string }>,
): ProblemEntry[] {
  const out: ProblemEntry[] = [];
  for (const r of recovery) {
    if (r.reason === "suspended") {
      out.push({ runId: r.runId, state: "awaiting", reason: "suspended — await.json present", lastTs: r.lastHeartbeat });
    } else if (r.reason === "dead-heartbeat") {
      out.push({ runId: r.runId, state: "stuck", reason: `dead heartbeat — last ${r.lastHeartbeat ? new Date(r.lastHeartbeat).toISOString() : "unknown"}`, lastTs: r.lastHeartbeat });
    }
  }
  if (watchdogProblems) {
    for (const w of watchdogProblems) {
      const runId = w.issueId ?? w.sessionID;
      out.push({ runId, state: w.state, reason: w.reason });
    }
  }
  return out;
}
