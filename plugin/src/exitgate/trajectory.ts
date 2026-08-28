/**
 * Trajectory scorer — deterministic code-based check over the run step log.
 *
 * Contract (sibling writer implements):
 * .tgo/runs/<runId>.jsonl — append-only, one JSON per line:
 * {"ts":<epoch ms>,"type":"step"|"heartbeat"|"status","seat":"dylan"|...,"tool":"...","argsHash":"<fnv hex>","ok":true|false,"durationMs":<n>,"note":"..."}
 * runId matches VALID_BEAD_ID charset (reuse assertValidBeadID for any path construction).
 *
 * This scorer implements:
 * - expected tool sequence hints check
 * - efficiency signal (step count, repeated loops)
 * - blacklist hard-fail (destructive bash patterns from gate profile)
 * ZERO LLM on hot path. When no run log exists, SKIP with WARNING.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { assertValidBeadID } from "../def-snapshot";
import { compileBlacklist, type GateProfile, DEFAULT_GATE_PROFILE } from "./profile";
import type { Finding } from "./triage";

export interface RunLogEntry {
  ts: number;
  type: "step" | "heartbeat" | "status";
  seat: string;
  tool: string;
  argsHash: string;
  ok: boolean;
  durationMs: number;
  note: string;
  // allow extra fields without failing
  [k: string]: unknown;
}

export interface TrajectoryResult {
  entries: RunLogEntry[];
  findings: Finding[];
  skipped: boolean;
  skipReason?: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseEntry(line: string, lineNo: number): RunLogEntry | undefined {
  const trimmed = line.trim();
  if (trimmed.length === 0) return undefined;
  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;
    // Validate required fields — keep deterministic, tolerant of extra fields
    if (!isRecord(obj)) return undefined;
    const ts = typeof obj.ts === "number" ? obj.ts : Number(obj.ts);
    const type = obj.type as string;
    const seat = typeof obj.seat === "string" ? obj.seat : String(obj.seat ?? "");
    const tool = typeof obj.tool === "string" ? obj.tool : String(obj.tool ?? "");
    const argsHash = typeof obj.argsHash === "string" ? obj.argsHash : String(obj.argsHash ?? "");
    const ok = typeof obj.ok === "boolean" ? obj.ok : Boolean(obj.ok);
    const durationMs = typeof obj.durationMs === "number" ? obj.durationMs : Number(obj.durationMs ?? 0);
    const note = typeof obj.note === "string" ? obj.note : String(obj.note ?? "");
    if (!Number.isFinite(ts)) return undefined;
    if (type !== "step" && type !== "heartbeat" && type !== "status") return undefined;
    if (!seat || !tool) return undefined;
    // argsHash should look like hex but we don't enforce strictly for determinism
    return {
      ts,
      type: type as RunLogEntry["type"],
      seat,
      tool,
      argsHash,
      ok,
      durationMs: Number.isFinite(durationMs) ? durationMs : 0,
      note,
    };
  } catch {
    // Malformed line — surface as a coherence WARNING? But keep deterministic:
    // ignore malformed lines rather than hard-fail, to avoid blocking on writer bugs.
    return undefined;
  }
}

function runLogPath(repoRoot: string, runId: string): string {
  assertValidBeadID(runId);
  return path.join(repoRoot, ".tgo", "runs", `${runId}.jsonl`);
}

/**
 * Score trajectory deterministically.
 * - Blacklist hard-fail: any step where tool is bash (or note contains command) matching profile.blacklist → CRITICAL
 * - Expected sequence: if profile.trajectory.expectedSequence provided, verify it appears in order as subsequence
 * - Efficiency: step count vs maxSteps, repeated tool loop detection
 * When no log exists, SKIP with WARNING (writer lands in sibling ticket).
 */
export async function scoreTrajectory(
  repoRoot: string,
  runId: string,
  profile: GateProfile = DEFAULT_GATE_PROFILE,
): Promise<TrajectoryResult> {
  const findings: Finding[] = [];
  const target = runLogPath(repoRoot, runId);

  let raw: string;
  try {
    raw = await fs.readFile(target, "utf-8");
  } catch (e) {
    const code = (e as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      // No run log — SKIP trajectory axis with WARNING (graceful)
      return {
        entries: [],
        findings: [
          {
            axis: "completeness",
            severity: "WARNING",
            message: `Trajectory skipped: no run log at .tgo/runs/${runId}.jsonl (writer lands in sibling ticket)`,
            source: "trajectory",
            code: "TRAJECTORY_SKIP_NO_LOG",
          },
        ],
        skipped: true,
        skipReason: "no-log",
      };
    }
    // Other read errors → WARNING, not CRITICAL (don't block on I/O)
    return {
      entries: [],
      findings: [
        {
          axis: "coherence",
          severity: "WARNING",
          message: `Trajectory skipped: unable to read run log (${String(e)})`,
          source: "trajectory",
          code: "TRAJECTORY_SKIP_READ_ERROR",
        },
      ],
      skipped: true,
      skipReason: "read-error",
    };
  }

  const lines = raw.split(/\r?\n/);
  const entries: RunLogEntry[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined || line.trim().length === 0) continue;
    const entry = parseEntry(line, i + 1);
    if (entry) entries.push(entry);
  }

  if (entries.length === 0) {
    // Empty log is also considered skip? But treat as WARNING not CRITICAL
    findings.push({
      axis: "completeness",
      severity: "WARNING",
      message: "Trajectory: run log exists but contains no valid step entries — skipping trajectory checks",
      source: "trajectory",
      code: "TRAJECTORY_EMPTY",
    });
    return { entries, findings, skipped: true, skipReason: "empty" };
  }

  // Blacklist hard-fail — compile patterns
  const effectiveBlacklist = profile.blacklist.length > 0 ? profile.blacklist : DEFAULT_GATE_PROFILE.blacklist;
  const blacklistRes = compileBlacklist(effectiveBlacklist);

  // Scan each step's note and tool for blacklist matches
  for (let idx = 0; idx < entries.length; idx++) {
    const entry = entries[idx]!;
    // Only check step-type entries with tool bash? Spec says destructive bash patterns, but we check any step's note
    // For precision: if tool is bash OR note looks like a command, run blacklist.
    // We check note and tool+note combined
    const haystack = `${entry.tool} ${entry.note}`;
    for (const re of blacklistRes) {
      if (re.test(haystack)) {
        findings.push({
          axis: "correctness",
          severity: "CRITICAL",
          message: `Blacklist hard-fail: step ${idx + 1} tool=${entry.tool} matched blacklist /${re.source}/ — note="${entry.note.slice(0, 120)}"`,
          source: "trajectory",
          code: "BLACKLIST_HARD_FAIL",
        });
        // Do not break — allow multiple matches but one is enough to block
        break;
      }
    }
  }

  // Expected sequence hint check
  const expected = profile.trajectory.expectedSequence ?? [];
  if (expected.length > 0) {
    const tools = entries.filter((e) => e.type === "step").map((e) => e.tool.toLowerCase());
    // Check expected appears as subsequence in order (case-insensitive substring match)
    let pos = 0;
    for (const hint of expected) {
      const lowerHint = hint.toLowerCase();
      let found = -1;
      for (let i = pos; i < tools.length; i++) {
        if (tools[i]?.includes(lowerHint) || lowerHint.includes(tools[i] ?? "")) {
          found = i;
          break;
        }
      }
      if (found === -1) {
        findings.push({
          axis: "coherence",
          severity: "WARNING",
          message: `Expected tool sequence hint "${hint}" not found in trajectory (tools: ${tools.slice(0, 12).join(", ")})`,
          source: "trajectory",
          code: "EXPECTED_SEQUENCE_MISSING",
        });
        break;
      } else {
        pos = found + 1;
      }
    }
  }

  // Efficiency signal checks
  const maxSteps = profile.trajectory.maxSteps ?? DEFAULT_GATE_PROFILE.trajectory.maxSteps ?? 250;
  const stepCount = entries.filter((e) => e.type === "step").length;
  if (stepCount > maxSteps) {
    findings.push({
      axis: "coherence",
      severity: "WARNING",
      message: `Trajectory efficiency: ${stepCount} steps exceeds maxSteps ${maxSteps}`,
      source: "trajectory",
      code: "EFFICIENCY_MAX_STEPS",
    });
  }

  // Repeated tool loop detection — 6 identical consecutive tools, or 20 total with high repeat ratio
  let maxConsecutive = 1;
  let curConsecutive = 1;
  for (let i = 1; i < entries.length; i++) {
    if (entries[i]!.tool === entries[i - 1]!.tool) {
      curConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, curConsecutive);
    } else {
      curConsecutive = 1;
    }
  }
  if (maxConsecutive >= 6) {
    findings.push({
      axis: "coherence",
      severity: "WARNING",
      message: `Trajectory efficiency: ${maxConsecutive} consecutive identical tool calls detected (possible loop)`,
      source: "trajectory",
      code: "EFFICIENCY_LOOP_CONSECUTIVE",
    });
  }

  // Failure rate signal — many failed steps
  const failed = entries.filter((e) => e.ok === false).length;
  if (failed > 0 && failed / entries.length > 0.5 && entries.length >= 5) {
    findings.push({
      axis: "correctness",
      severity: "WARNING",
      message: `Trajectory: ${failed}/${entries.length} steps failed (${Math.round((failed / entries.length) * 100)}%)`,
      source: "trajectory",
      code: "TRAJECTORY_HIGH_FAILURE_RATE",
    });
  }

  // Duration signal — total duration excessive? > 30 min of tool time
  const totalDuration = entries.reduce((sum, e) => sum + (Number.isFinite(e.durationMs) ? e.durationMs : 0), 0);
  if (totalDuration > 30 * 60 * 1000) {
    findings.push({
      axis: "coherence",
      severity: "SUGGESTION",
      message: `Trajectory: total tool duration ${Math.round(totalDuration / 1000)}s exceeds 30m`,
      source: "trajectory",
      code: "TRAJECTORY_LONG_DURATION",
    });
  }

  // If no findings from trajectory checks, that's PASS for this axis
  // Caller will merge these findings into global triage.

  return {
    entries,
    findings,
    skipped: false,
  };
}

/**
 * Synchronous helper for tests: score from in-memory entries without file IO.
 * Reuses the same blacklist/efficiency logic.
 */
export function scoreTrajectoryEntries(
  entries: RunLogEntry[],
  profile: GateProfile = DEFAULT_GATE_PROFILE,
): { findings: Finding[] } {
  const findings: Finding[] = [];
  if (entries.length === 0) {
    return {
      findings: [
        {
          axis: "completeness",
          severity: "WARNING",
          message: "Trajectory skipped: no entries",
          source: "trajectory",
          code: "TRAJECTORY_SKIP_NO_LOG",
        },
      ],
    };
  }
  const effectiveBlacklist = profile.blacklist.length > 0 ? profile.blacklist : DEFAULT_GATE_PROFILE.blacklist;
  const blacklistRes = compileBlacklist(effectiveBlacklist);
  for (let idx = 0; idx < entries.length; idx++) {
    const entry = entries[idx]!;
    const haystack = `${entry.tool} ${entry.note}`;
    for (const re of blacklistRes) {
      if (re.test(haystack)) {
        findings.push({
          axis: "correctness",
          severity: "CRITICAL",
          message: `Blacklist hard-fail: step ${idx + 1} tool=${entry.tool} matched blacklist /${re.source}/ — note="${entry.note.slice(0, 120)}"`,
          source: "trajectory",
          code: "BLACKLIST_HARD_FAIL",
        });
        break;
      }
    }
  }
  const expected = profile.trajectory.expectedSequence ?? [];
  if (expected.length > 0) {
    const tools = entries.filter((e) => e.type === "step").map((e) => e.tool.toLowerCase());
    let pos = 0;
    for (const hint of expected) {
      const lowerHint = hint.toLowerCase();
      let found = -1;
      for (let i = pos; i < tools.length; i++) {
        if (tools[i]?.includes(lowerHint) || lowerHint.includes(tools[i] ?? "")) {
          found = i;
          break;
        }
      }
      if (found === -1) {
        findings.push({
          axis: "coherence",
          severity: "WARNING",
          message: `Expected tool sequence hint "${hint}" not found`,
          source: "trajectory",
          code: "EXPECTED_SEQUENCE_MISSING",
        });
        break;
      } else {
        pos = found + 1;
      }
    }
  }
  const maxSteps = profile.trajectory.maxSteps ?? DEFAULT_GATE_PROFILE.trajectory.maxSteps ?? 250;
  const stepCount = entries.filter((e) => e.type === "step").length;
  if (stepCount > maxSteps) {
    findings.push({
      axis: "coherence",
      severity: "WARNING",
      message: `Trajectory efficiency: ${stepCount} steps exceeds maxSteps ${maxSteps}`,
      source: "trajectory",
      code: "EFFICIENCY_MAX_STEPS",
    });
  }
  let maxConsecutive = 1;
  let curConsecutive = 1;
  for (let i = 1; i < entries.length; i++) {
    if (entries[i]!.tool === entries[i - 1]!.tool) {
      curConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, curConsecutive);
    } else {
      curConsecutive = 1;
    }
  }
  if (maxConsecutive >= 6) {
    findings.push({
      axis: "coherence",
      severity: "WARNING",
      message: `Trajectory efficiency: ${maxConsecutive} consecutive identical tool calls`,
      source: "trajectory",
      code: "EFFICIENCY_LOOP_CONSECUTIVE",
    });
  }
  return { findings };
}
