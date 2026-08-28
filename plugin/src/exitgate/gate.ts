/**
 * Gate orchestrator — combines delta-spec parse, triage, and trajectory scorer.
 * Deterministic, no LLM, no network.
 *
 * Wire: gate runs at delegation close (consumes merged status taxonomy from
 * report.ts — bail/abandon paths skip the gate; complete paths run it).
 * Gate failure blocks close with a typed reason.
 * Compensation convention: on gate-blocked failure, the gate OUTPUT may
 * recommend a compensation issue linked discovered-from — linking convention
 * only, no engine.
 */

import { loadGateProfile, DEFAULT_GATE_PROFILE, type GateProfile } from "./profile";
import { parseDeltaSpec } from "./delta-spec";
import { scoreTrajectory } from "./trajectory";
import { triageFindings, type Finding, type TriageResult } from "./triage";
import type { ParsedReport } from "../report";

export interface GateInput {
  repoRoot: string;
  issueId: string;
  specText: string;
  report: ParsedReport;
  /** Optional pre-loaded profile (for tests / hot path). If absent, loads from .tgo/gate.json with defaults. */
  profile?: GateProfile;
}

export type GateReasonCode = "GATE_BLOCKED_CRITICAL" | "GATE_SKIPPED_BAIL" | "GATE_PASSED" | "GATE_SKIPPED_DISABLED" | "GATE_SKIPPED_TOGGLE";

export interface GateResult {
  /** Overall pass (no CRITICAL). */
  passed: boolean;
  blocked: boolean;
  /** Typed reason code — gate failure blocks close with this. */
  reasonCode: GateReasonCode;
  /** Human-readable reason. */
  reason?: string;
  /** Triage result over all findings. */
  triage: TriageResult;
  /** Raw findings (union of all axes). */
  findings: Finding[];
  /** Whether trajectory was skipped (no log). */
  trajectorySkipped?: boolean;
  /** Compensation recommendation when blocked — linking convention only. */
  compensation?: {
    title: string;
    body: string;
    discoveredFrom: string;
    severity: "CRITICAL";
  };
  /** Profile used. */
  profile: GateProfile;
  /** Whether gate was skipped entirely. */
  skipped: boolean;
  skipReason?: string;
}

/**
 * Determine if gate should be skipped based on taxonomy.
 * Bail / abandon paths skip the gate (human rejected — never reroute).
 * Complete paths run it. Other non-complete statuses: skip with warning?
 * For deterministic behavior: only "complete" runs gate; bail skips; others are
 * considered not completion-safe already so gate is moot but we still report skip.
 */
function shouldSkipForTaxonomy(report: ParsedReport): { skip: boolean; reason?: string } {
  const status = report.taxonomy.status;
  if (status === "bail") {
    return { skip: true, reason: "bail/abandon — human rejection skips gate" };
  }
  // Also skip if valid === false due to watchdog? Watchdog is reroute not close — gate moot
  if (report.watchdogAborted) {
    return { skip: true, reason: "watchdog abort — reroute, not close" };
  }
  // Only complete reports are expected to run gate to block close.
  // Failed/tripwire are already blocked via completionSafe, but we surface that as skip to keep gate lean.
  if (status !== "complete") {
    return { skip: true, reason: `${status} — not complete, gate not applicable` };
  }
  return { skip: false };
}

export async function runExitGate(input: GateInput): Promise<GateResult> {
  const profile = input.profile ?? (await loadGateProfile(input.repoRoot));

  // Master disabled?
  if (!profile.enabled) {
    const emptyTriage = triageFindings([]);
    return {
      passed: true,
      blocked: false,
      reasonCode: "GATE_SKIPPED_DISABLED",
      reason: "gate disabled via profile.enabled=false",
      triage: emptyTriage,
      findings: [],
      profile,
      skipped: true,
      skipReason: "disabled",
    };
  }

  // Taxonomy-based skip
  const taxSkip = shouldSkipForTaxonomy(input.report);
  if (taxSkip.skip) {
    const emptyTriage = triageFindings([]);
    return {
      passed: true,
      blocked: false,
      reasonCode: "GATE_SKIPPED_BAIL",
      reason: `gate skipped: ${taxSkip.reason}`,
      triage: emptyTriage,
      findings: [],
      profile,
      skipped: true,
      skipReason: taxSkip.reason,
    };
  }

  const findings: Finding[] = [];

  // Delta-spec parse (toggle-aware)
  if (profile.toggles.deltaSpec) {
    const delta = parseDeltaSpec(input.specText);
    for (const f of delta.findings) findings.push(f);
    // Also surface requirement count as potential completeness signal?
    // If spec contains requirements, verify that report VERIFIED mentions at least one?
    // Keep minimal: only findings from parser.
  }

  // Triage axis is always enabled via above findings; toggle controls whether we treat triage as blocking?
  // But spec says toggles declare blacklist patterns and gate toggles — so deltaSpec/triage/trajectory toggles.
  // If triage disabled, we would not block on triage? Simplify: if triage toggle false, downgrade CRITICAL to WARNING.
  // For now, if toggles.triage is false, we skip delta-spec findings? Already handled.

  // Trajectory scorer (toggle-aware)
  let trajectorySkipped = false;
  if (profile.toggles.trajectory) {
    const traj = await scoreTrajectory(input.repoRoot, input.issueId, profile);
    trajectorySkipped = traj.skipped;
    for (const f of traj.findings) findings.push(f);
  }

  // Additional correctness check: if report is not completionSafe but taxonomy is complete, that's a pre-existing contradiction
  // The gate surfaces it but the main closure gate already blocks; we add a triage finding for completeness if needed.
  // However we should not duplicate report contradictions as gate findings unnecessarily — keep gate focused on delta+trajectory+blacklist.
  // If blacklist findings exist, they are already added via trajectory.

  // Apply triage toggle: if triage disabled, convert CRITICAL to WARNING (lenient)
  let effectiveFindings = findings;
  if (!profile.toggles.triage) {
    effectiveFindings = findings.map((f) => (f.severity === "CRITICAL" ? { ...f, severity: "WARNING" as const } : f));
  }

  const triage = triageFindings(effectiveFindings);

  if (triage.blocked) {
    return {
      passed: false,
      blocked: true,
      reasonCode: "GATE_BLOCKED_CRITICAL",
      reason: triage.reason,
      triage,
      findings: effectiveFindings,
      trajectorySkipped,
      profile,
      skipped: false,
      compensation: {
        title: `Compensate ${input.issueId} gate failure`,
        body: `Gate blocked ${input.issueId} with ${triage.findings.filter((f) => f.severity === "CRITICAL").length} CRITICAL finding(s):\n${triage.findings.filter((f) => f.severity === "CRITICAL").map((f) => `- [${f.axis}/${f.severity}] ${f.message}`).join("\n")}\n\nCreate with: bd create --deps discovered-from:${input.issueId}`,
        discoveredFrom: input.issueId,
        severity: "CRITICAL",
      },
    };
  }

  return {
    passed: true,
    blocked: false,
    reasonCode: "GATE_PASSED",
    triage,
    findings: effectiveFindings,
    trajectorySkipped,
    profile,
    skipped: false,
  };
}

/**
 * Synchronous in-memory gate for tests that bypass file IO.
 * Uses provided profile and synthetic entries; trajectory skipped handling is via flag.
 */
export function runExitGateSync(opts: {
  specText: string;
  report: ParsedReport;
  profile?: GateProfile;
  trajectoryFindings?: Finding[];
  trajectorySkipped?: boolean;
}): GateResult {
  const profile = opts.profile ?? { ...DEFAULT_GATE_PROFILE, blacklist: [...DEFAULT_GATE_PROFILE.blacklist] };

  if (!profile.enabled) {
    const empty = triageFindings([]);
    return {
      passed: true,
      blocked: false,
      reasonCode: "GATE_SKIPPED_DISABLED",
      reason: "gate disabled",
      triage: empty,
      findings: [],
      profile,
      skipped: true,
      skipReason: "disabled",
    };
  }

  const taxSkip = shouldSkipForTaxonomy(opts.report);
  if (taxSkip.skip) {
    const empty = triageFindings([]);
    return {
      passed: true,
      blocked: false,
      reasonCode: "GATE_SKIPPED_BAIL",
      reason: `gate skipped: ${taxSkip.reason}`,
      triage: empty,
      findings: [],
      profile,
      skipped: true,
      skipReason: taxSkip.reason,
    };
  }

  const findings: Finding[] = [];
  if (profile.toggles.deltaSpec) {
    const delta = parseDeltaSpec(opts.specText);
    findings.push(...delta.findings);
  }
  if (profile.toggles.trajectory) {
    if (opts.trajectoryFindings) findings.push(...opts.trajectoryFindings);
    if (opts.trajectorySkipped) {
      // already included trajectory findings param includes skip warning
    }
  }

  let effective = findings;
  if (!profile.toggles.triage) {
    effective = findings.map((f) => (f.severity === "CRITICAL" ? { ...f, severity: "WARNING" as const } : f));
  }

  const triage = triageFindings(effective);
  if (triage.blocked) {
    return {
      passed: false,
      blocked: true,
      reasonCode: "GATE_BLOCKED_CRITICAL",
      reason: triage.reason,
      triage,
      findings: effective,
      trajectorySkipped: opts.trajectorySkipped,
      profile,
      skipped: false,
      compensation: {
        title: `Compensate test gate failure`,
        body: `Gate blocked with CRITICAL`,
        discoveredFrom: "test-id",
        severity: "CRITICAL",
      },
    };
  }
  return {
    passed: true,
    blocked: false,
    reasonCode: "GATE_PASSED",
    triage,
    findings: effective,
    trajectorySkipped: opts.trajectorySkipped,
    profile,
    skipped: false,
  };
}
