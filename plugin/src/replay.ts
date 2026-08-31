/**
 * tgo-ccl: step replay — re-run a single frozen step from .tgo/runs/<runId>.jsonl
 * WITHOUT re-running the DAG (mastra time-travel pattern). Horowitz debugging
 * tool; prose-driven invocation only (no new slash command).
 *
 * Replay is isolated: it reconstructs the step from the frozen snapshot
 * (argsHash + cmd/note/ok) and the recorded output — side-effects are CAPTURED,
 * not re-applied to live state. A pre-flight check compares against the
 * pinned definition snapshot (T-A) and rejects replay if the definition has
 * drifted.
 */

import { readRunEvents, type RunEvent } from "./runs";
import { readDefSnapshot } from "./def-snapshot";

export interface ReplayIntent {
  runId: string;
  stepIndex: number;
}

/**
 * Parse prose intent: "replay tgo-abc step 3" → { runId, stepIndex }.
 * Returns undefined when the message is not a replay request.
 */
export function parseReplayIntent(text: string): ReplayIntent | undefined {
  const m = /replay\s+([A-Za-z0-9][A-Za-z0-9._-]*)\s+step\s+(\d+)/i.exec(text);
  if (!m) return undefined;
  return { runId: m[1], stepIndex: Number.parseInt(m[2], 10) };
}

export interface ReplayResult {
  ok: boolean;
  reason?: string;
  runId?: string;
  stepIndex?: number;
  step?: RunEvent;
  /** Frozen input identifier (the step's argsHash). */
  inputHash?: string;
  /** Captured output — NOT re-applied to live state. */
  output?: { tool: string; ok: boolean; note?: string; cmd?: string; durationMs?: number };
  driftDetected?: boolean;
}

/**
 * Replay the Nth step (0-indexed among type:"step" events) of a run.
 * - Pre-flight: rejects when a provided currentPromptHash differs from the
 *   pinned definition snapshot (definition drift).
 * - No partial-state mutation: reads only; side-effects are captured, not
 *   re-applied to the live run log.
 */
export async function replayStep(
  repoRoot: string,
  runId: string,
  stepIndex: number,
  opts?: { currentPromptHash?: string },
): Promise<ReplayResult> {
  const events = await readRunEvents(repoRoot, runId);
  if (events.length === 0) {
    return { ok: false, reason: `no run events for ${runId}`, runId, stepIndex };
  }
  const steps = events.filter((e) => e.type === "step");
  const step = steps[stepIndex];
  if (!step) {
    return { ok: false, reason: `no step ${stepIndex} in run ${runId} (${steps.length} steps)`, runId, stepIndex };
  }

  // Pre-flight: definition drift (consumes the pinned T-A snapshot).
  if (opts?.currentPromptHash) {
    let snapshot: Awaited<ReturnType<typeof readDefSnapshot>>;
    try {
      snapshot = await readDefSnapshot(repoRoot, step.issueId);
    } catch {
      snapshot = undefined;
    }
    if (snapshot?.promptHash && opts.currentPromptHash !== snapshot.promptHash) {
      return {
        ok: false,
        reason: "definition drifted — replay rejected",
        runId,
        stepIndex,
        step,
        driftDetected: true,
      };
    }
  }

  return {
    ok: true,
    runId,
    stepIndex,
    step,
    inputHash: step.argsHash,
    output: { tool: step.tool, ok: step.ok, note: step.note, cmd: step.cmd, durationMs: step.durationMs },
  };
}

/** Human summary of a replay result (for prose reply / logs). */
export function formatReplayResult(r: ReplayResult): string {
  if (!r.ok) return `step replay rejected: ${r.reason}`;
  const o = r.output!;
  const extras = [o.note ? `note=${o.note}` : "", o.cmd ? `cmd=${o.cmd}` : ""].filter(Boolean).join(" ");
  return `step replay ${r.runId}#${r.stepIndex}: tool=${o.tool} ok=${o.ok} inputHash=${r.inputHash}${extras ? ` ${extras}` : ""}`;
}