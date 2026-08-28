/**
 * Close-gate enforcement for the real `bd close` consumer.
 * The gate is per-repo, deterministic, and must be consulted before the actual
 * `bd close` is executed — the sidebar's `commands.ts` (beads.close) and
 * `bd.ts:mutate` are the real close paths, not just `plugin.ts` metadata.
 *
 * This module is the enforcing consumer: before executing `bd close`,
 * run the gate (or consume the cached result) and if gate.blocked →
 * refuse the close with typed GATE_BLOCKED_CRITICAL + compensation hint.
 *
 * Contract v2: required = ts,type,seat,tool,argsHash,ok,issueId (strict);
 * optional = durationMs→0, note→"", cmd→undefined (default, not rejection).
 * Run log path uses `assertValidBeadID`/`isValidBeadID`.
 */

import { runExitGate } from "./gate";
import { parseTaskReport } from "../report";

/**
 * Check if close is allowed for an issue. Runs the deterministic gate
 * (delta-spec parse + trajectory scorer + triage) with a synthetic complete
 * report (sidebar close implies completion). If gate is disabled/skipped or
 * passes, close is allowed. If gate.blocked (CRITICAL), close is refused.
 *
 * @param repoRoot - worktree / repo root (contains `.tgo/gate.json` and `.tgo/runs/`)
 * @param issueId - bead id (must match VALID_BEAD_ID)
 * @param specText - issue description / spec text (from bead.description)
 * @returns gate result with blocked flag and typed reason; caller MUST not execute `bd close` when blocked
 */
export async function checkCloseGate(
  repoRoot: string,
  issueId: string,
  specText: string,
): Promise<{ allowed: boolean; gate: Awaited<ReturnType<typeof runExitGate>> }> {
  // Sidebar close implies complete — synthesize a complete report so the gate runs
  // (bail/abandon paths would have skipped, but a user-initiated close is a complete intent)
  const syntheticComplete = parseTaskReport("STATUS: complete\nCHANGES: close via sidebar\nVERIFIED: exit gate: true; close check\nGAPS: none");
  const gate = await runExitGate({ repoRoot, issueId, specText: specText ?? "", report: syntheticComplete });
  if (gate.blocked) {
    return { allowed: false, gate };
  }
  return { allowed: true, gate };
}

/**
 * Format a blocked close message with typed reason and compensation hint.
 * Surface to the caller and do not execute `bd close`.
 */
export function blockedCloseMessage(gate: Awaited<ReturnType<typeof runExitGate>>): string {
  const reason = gate.reason ?? "CRITICAL gate findings";
  const comp = gate.compensation
    ? ` — compensation: ${gate.compensation.title} (discovered-from:${gate.compensation.discoveredFrom}) — bd create --deps discovered-from:${gate.compensation.discoveredFrom}`
    : "";
  return `close blocked: ${gate.reasonCode} — ${reason}${comp}`;
}
