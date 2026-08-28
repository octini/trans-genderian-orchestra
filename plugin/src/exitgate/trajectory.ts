/**
 * Trajectory scorer — deterministic code-based check over the run step log.
 *
 * Contract v2 (sibling writer adapts separately — reader side here):
 * .tgo/runs/<runId>.jsonl — append-only, one JSON per line:
 * {"ts", "type":"step"|"heartbeat"|"status", "seat", "tool", "argsHash", "ok", "durationMs", "note", "cmd"?, "issueId"?}
 * - tool REQUIRED non-empty on ALL lines (heartbeats use tool:"heartbeat")
 * - ok REQUIRED boolean on ALL lines (no coercion — "ok":"false" is ignored)
 * - issueId REQUIRED valid bead ID on ALL lines
 * - cmd OPTIONAL string: for bash/edit/write, actual command/target (truncated ~500, control chars stripped) — THIS is what blacklist matches
 * - type:"status" RESERVED for terminal delegation outcomes only (note: complete|failed|aborted); tool completions are "step"
 * runId matches VALID_BEAD_ID charset (reuse assertValidBeadID / isValidBeadID for any path construction).
 *
 * This scorer implements:
 * - expected tool sequence hints check
 * - efficiency signal (step count, repeated loops)
 * - blacklist hard-fail (destructive patterns matched against tool+cmd+note, capped input)
 * ZERO LLM on hot path. When no run log exists, SKIP with WARNING.
 * F4 ReDoS choice: blacklist patterns are capped regex (max 200 chars) and haystack capped to 500 chars before match; see profile.ts.
 * F5: if no terminal type:"status" line, trajectory is incomplete → WARNING TRAJECTORY_INCOMPLETE.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { assertValidBeadID, isValidBeadID } from "../def-snapshot";
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
  issueId: string;
  cmd?: string;
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
    if (!isRecord(obj)) return undefined;
    // Strict required-field validation — lines failing are IGNORED (not coerced)
    const tsRaw = obj.ts;
    const ts = typeof tsRaw === "number" ? tsRaw : Number(tsRaw);
    if (!Number.isFinite(ts)) return undefined;
    const type = obj.type;
    if (type !== "step" && type !== "heartbeat" && type !== "status") return undefined;
    const seat = obj.seat;
    if (typeof seat !== "string" || seat.trim().length === 0) return undefined;
    const tool = obj.tool;
    if (typeof tool !== "string" || tool.trim().length === 0) return undefined;
    // Heartbeats must use tool:"heartbeat" per contract v2 — enforce, but if reader sees heartbeat with other tool, treat as invalid and ignore
    if (type === "heartbeat" && tool !== "heartbeat") {
      // Still allow but could be considered malformed; for strictness, ignore heartbeat with non-heartbeat tool
      // However contract says heartbeats use tool:"heartbeat", so we enforce: if type heartbeat and tool != heartbeat → ignore
      return undefined;
    }
    const argsHash = obj.argsHash;
    if (typeof argsHash !== "string" || argsHash.trim().length === 0) return undefined;
    const okRaw = obj.ok;
    if (typeof okRaw !== "boolean") return undefined; // no coercion: "ok":"false" must NOT become true → ignore line
    const ok = okRaw;
    const durationMsRaw = obj.durationMs;
    const durationMs = typeof durationMsRaw === "number" ? durationMsRaw : Number(durationMsRaw);
    if (!Number.isFinite(durationMs)) return undefined;
    const note = obj.note;
    if (typeof note !== "string") return undefined;
    const issueIdRaw = obj.issueId;
    if (typeof issueIdRaw !== "string" || !isValidBeadID(issueIdRaw)) return undefined;
    const issueId = issueIdRaw;
    // cmd optional: if present must be string, control chars stripped, truncated ~500 (writer does, reader just validates string type)
    let cmd: string | undefined;
    if ("cmd" in obj) {
      if (obj.cmd !== undefined && obj.cmd !== null) {
        if (typeof obj.cmd !== "string") return undefined;
        // control chars stripped and truncated already by writer; reader just stores as-is but caps for matching later
        cmd = obj.cmd;
      }
    }
    return {
      ts,
      type: type as RunLogEntry["type"],
      seat: seat as string,
      tool: tool as string,
      argsHash: argsHash as string,
      ok,
      durationMs,
      note: note as string,
      issueId,
      ...(cmd !== undefined ? { cmd } : {}),
    };
  } catch {
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
    findings.push({
      axis: "completeness",
      severity: "WARNING",
      message: "Trajectory: run log exists but contains no valid step entries — skipping trajectory checks",
      source: "trajectory",
      code: "TRAJECTORY_EMPTY",
    });
    return { entries, findings, skipped: true, skipReason: "empty" };
  }

  // F5: if no terminal type:"status" line, trajectory is incomplete → WARNING, not a pass
  const hasTerminalStatus = entries.some((e) => e.type === "status");
  if (!hasTerminalStatus) {
    findings.push({
      axis: "completeness",
      severity: "WARNING",
      message: "Trajectory incomplete: no terminal status line (type:\"status\") — log may be truncated or writer still in-flight",
      source: "trajectory",
      code: "TRAJECTORY_INCOMPLETE",
    });
    // Do not return; continue with other checks but this warning ensures not a silent pass
  }

  // Blacklist hard-fail — compile patterns (capped at 200 chars per profile, haystack capped 500)
  const effectiveBlacklist = profile.blacklist.length > 0 ? profile.blacklist : DEFAULT_GATE_PROFILE.blacklist;
  const blacklistRes = compileBlacklist(effectiveBlacklist);

  // Scan each entry's tool + cmd + note for blacklist matches (F2: cmd is primary for bash/edit/write)
  for (let idx = 0; idx < entries.length; idx++) {
    const entry = entries[idx]!;
    const rawHaystack = `${entry.tool} ${(entry as unknown as { cmd?: string }).cmd ?? ""} ${entry.note}`;
    const haystack = rawHaystack.length > 500 ? rawHaystack.slice(0, 500) : rawHaystack;
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
  // F5 incomplete check for in-memory entries
  const hasTerminalStatus = entries.some((e) => e.type === "status");
  if (!hasTerminalStatus) {
    findings.push({
      axis: "completeness",
      severity: "WARNING",
      message: "Trajectory incomplete: no terminal status line",
      source: "trajectory",
      code: "TRAJECTORY_INCOMPLETE",
    });
  }
  const effectiveBlacklist = profile.blacklist.length > 0 ? profile.blacklist : DEFAULT_GATE_PROFILE.blacklist;
  const blacklistRes = compileBlacklist(effectiveBlacklist);
  for (let idx = 0; idx < entries.length; idx++) {
    const entry = entries[idx]!;
    const rawHaystack = `${entry.tool} ${(entry as unknown as { cmd?: string }).cmd ?? ""} ${entry.note}`;
    const haystack = rawHaystack.length > 500 ? rawHaystack.slice(0, 500) : rawHaystack;
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
