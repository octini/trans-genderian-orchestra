/**
 * 3-axis verify triage: Completeness / Correctness / Coherence
 * Each finding triaged CRITICAL / WARNING / SUGGESTION.
 * CRITICAL blocks close.
 */

export type Axis = "completeness" | "correctness" | "coherence";
export type Severity = "CRITICAL" | "WARNING" | "SUGGESTION";

export const AXES: readonly Axis[] = ["completeness", "correctness", "coherence"] as const;
export const SEVERITIES: readonly Severity[] = ["CRITICAL", "WARNING", "SUGGESTION"] as const;

export interface Finding {
  axis: Axis;
  severity: Severity;
  message: string;
  source: string;
  /** Optional stable identifier for fixture routing */
  code?: string;
}

export interface AxisVerdict {
  axis: Axis;
  severity: Severity | "PASS";
  count: number;
  findings: Finding[];
  hasCritical: boolean;
}

export interface TriageResult {
  findings: Finding[];
  perAxis: Record<Axis, AxisVerdict>;
  blocked: boolean;
  highestSeverity: Severity | "PASS";
  reason?: string;
}

/** Severity ordering for comparison */
const severityRank: Record<Severity | "PASS", number> = {
  PASS: 0,
  SUGGESTION: 1,
  WARNING: 2,
  CRITICAL: 3,
};

function maxSeverity(findings: Finding[]): Severity | "PASS" {
  let max: Severity | "PASS" = "PASS";
  let maxRank = 0;
  for (const f of findings) {
    const r = severityRank[f.severity] ?? 0;
    if (r > maxRank) {
      maxRank = r;
      max = f.severity;
    }
  }
  return max;
}

/**
 * Triage findings into per-axis verdicts.
 * Deterministic, no LLM.
 * CRITICAL on any axis blocks close.
 */
export function triageFindings(findings: Finding[]): TriageResult {
  const perAxis: Record<Axis, AxisVerdict> = {
    completeness: { axis: "completeness", severity: "PASS", count: 0, findings: [], hasCritical: false },
    correctness: { axis: "correctness", severity: "PASS", count: 0, findings: [], hasCritical: false },
    coherence: { axis: "coherence", severity: "PASS", count: 0, findings: [], hasCritical: false },
  };

  for (const f of findings) {
    const axis = (AXES as readonly string[]).includes(f.axis) ? f.axis : "correctness";
    const bucket = perAxis[axis as Axis];
    bucket.findings.push(f);
  }

  for (const axis of AXES) {
    const bucket = perAxis[axis];
    bucket.count = bucket.findings.length;
    bucket.severity = maxSeverity(bucket.findings);
    bucket.hasCritical = bucket.findings.some((f) => f.severity === "CRITICAL");
  }

  const allMax = maxSeverity(findings);
  const blocked = findings.some((f) => f.severity === "CRITICAL");

  let reason: string | undefined;
  if (blocked) {
    const critical = findings.filter((f) => f.severity === "CRITICAL");
    const axes = [...new Set(critical.map((f) => f.axis))].join(", ");
    reason = `gate blocked: ${critical.length} CRITICAL finding(s) on ${axes}`;
  }

  return {
    findings: [...findings],
    perAxis,
    blocked,
    highestSeverity: allMax,
    reason,
  };
}

/**
 * Helper to create a finding with fixture-friendly code.
 */
export function finding(
  axis: Axis,
  severity: Severity,
  message: string,
  source: string,
  code?: string,
): Finding {
  return { axis, severity, message, source, code };
}

/**
 * Convenience: determine if a triage result should block close.
 */
export function isBlocked(result: TriageResult): boolean {
  return result.blocked;
}
