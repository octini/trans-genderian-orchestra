import type { RouteClass } from "./fit";
import type { ParsedReport, RecoveryAction } from "./report";

export interface LifecycleMetadata {
  issueId?: unknown;
  issueStatusObserved?: unknown;
  issueAssigneeObserved?: unknown;
  claimExitCode?: unknown;
  delegationId?: unknown;
  beadsOperator?: unknown;
  reviewComplete?: unknown;
}

export interface ClosureGate {
  canClose: boolean;
  /** Metadata-only blocker; this does not query Beads issue state. */
  closureBlocked: boolean;
  recovery?: RecoveryAction;
  missing: string[];
  diagnostics: string[];
}

export interface LifecycleSessionClient {
  session?: {
    get?: (input: { path: { id: string } }) => Promise<{ data?: unknown } | undefined>;
  };
}

/**
 * Authorize lifecycle metadata from host-observable session lineage only.
 * Packet fields, including beadsOperator, are not authorization credentials.
 */
export async function authorizeLifecycleSession(
  client: LifecycleSessionClient,
  sessionID: string,
): Promise<boolean> {
  if (!sessionID || !client.session?.get) return false;
  try {
    const result = await client.session.get({ path: { id: sessionID } });
    if (!result?.data || typeof result.data !== "object") return false;
    if (!Object.prototype.hasOwnProperty.call(result.data, "parentID")) return false;
    const parentID = (result.data as { parentID?: unknown }).parentID;
    return parentID === null;
  } catch {
    return false;
  }
}

/**
 * Verify observed claim metadata — replaces forgeable `issueClaimed` boolean.
 * True only when bd reports status in_progress, assignee truthy, and claim exit 0.
 */
export function verifyClaimObserved(lifecycle: LifecycleMetadata): boolean {
  return (
    lifecycle.issueStatusObserved === "in_progress" &&
    typeof lifecycle.issueAssigneeObserved === "string" &&
    lifecycle.issueAssigneeObserved.trim().length > 0 &&
    lifecycle.claimExitCode === 0
  );
}

function deriveRecoveryFromTaxonomy(report: ParsedReport | undefined): RecoveryAction {
  if (!report) return "retry";
  // Precedence: watchdog and contradictions are authoritative (from report.ts)
  if (report.watchdogAborted) return "reroute";
  if (report.contradictions.length > 0) return "escalate";
  // Terminal taxonomy outranks GAPS clarification — human already decided
  switch (report.taxonomy.status) {
    case "bail":
      return "abandon";
    case "tripwire":
      return "fix-plan";
    default:
      break;
  }
  // GAPS clarification remains the route for complete/failed reports
  const gapsNeedsClarification = report.fields.GAPS && /clarif(?:y|ication)|ambiguous|unclear|need(?:s)? user/i.test(report.fields.GAPS);
  if (gapsNeedsClarification) {
    return "user-clarification";
  }
  // Taxonomy routing — consumes discriminated union {status, retryable}
  switch (report.taxonomy.status) {
    case "failed":
      return report.taxonomy.retryable ? "retry" : "escalate";
    case "complete":
      return "retry";
    default:
      return report.recovery ?? "retry";
  }
}

export type GateReasonCode = "GATE_BLOCKED_CRITICAL" | "GATE_SKIPPED_BAIL" | "GATE_PASSED" | "GATE_SKIPPED_DISABLED" | "GATE_SKIPPED_TOGGLE";

export interface GateResultForLifecycle {
  passed: boolean;
  blocked: boolean;
  reasonCode: GateReasonCode;
  reason?: string;
  findings?: unknown[];
  compensation?: { title: string; body: string; discoveredFrom: string; severity: string };
  skipped?: boolean;
  skipReason?: string;
}

export interface GateAwareClosureGate extends ClosureGate {
  gateBlocked?: boolean;
  gateReasonCode?: GateReasonCode;
  gateReason?: string;
  gateFindings?: unknown[];
  gateCompensation?: { title: string; body: string; discoveredFrom: string; severity: string };
}

/** Determine if exit gate should run — bail/abandon and non-complete skip the gate (taxonomy-aware). */
export function shouldRunGate(report: ParsedReport | undefined): boolean {
  if (!report) return false;
  if (report.watchdogAborted) return false;
  if (report.taxonomy.status === "bail") return false;
  if (report.taxonomy.status !== "complete") return false;
  return true;
}

/** Merge gate result into closure — CRITICAL gate failure blocks close with typed reason. */
export function applyGateToClosure(closure: ClosureGate, gate: GateResultForLifecycle | undefined): GateAwareClosureGate {
  if (!gate || gate.skipped || !gate.blocked) {
    // Not blocked — preserve original closure but expose gate metadata when present
    if (!gate) return { ...closure };
    return {
      ...closure,
      gateBlocked: gate.blocked ?? false,
      gateReasonCode: gate.reasonCode,
      gateReason: gate.reason,
      gateFindings: (gate.findings as unknown[]) ?? undefined,
      gateCompensation: gate.compensation,
    };
  }
  // Gate blocked with CRITICAL — override canClose to false and surface typed reason
  const blockedDiagnostics = gate.reason ? [`Exit gate blocked: ${gate.reason}`] : ["Exit gate blocked: CRITICAL findings"];
  const compDiagnostics = gate.compensation
    ? [`Compensation recommended: ${gate.compensation.title} (discovered-from:${gate.compensation.discoveredFrom}) — bd create with discovered-from link`]
    : [];
  return {
    canClose: false,
    closureBlocked: true,
    recovery: closure.recovery ?? "escalate",
    missing: [...closure.missing, `gate:${gate.reasonCode}`],
    diagnostics: [...closure.diagnostics, ...blockedDiagnostics, ...compDiagnostics],
    gateBlocked: true,
    gateReasonCode: gate.reasonCode,
    gateReason: gate.reason,
    gateFindings: (gate.findings as unknown[]) ?? undefined,
    gateCompensation: gate.compensation,
  };
}

/**
 * Validate closure metadata; this does not verify or mutate a Beads issue.
 * Recovery derives from taxonomy {status, retryable} with precedence:
 * watchdog→reroute, contradictions→escalate, bail→abandon (never reroute),
 * tripwire→fix-plan (never retry), GAPS clarification→user-clarification (for failed/complete),
 * failed+retryable→retry, failed+!retryable→escalate, complete→success. No live bd calls (metadata-only).
 */
export function evaluateClosure(
  route: RouteClass,
  lifecycle: LifecycleMetadata,
  report: ParsedReport | undefined,
): ClosureGate {
  if (route === "tiny") {
    const safe = report?.completionSafe === true;
    const recovery = deriveRecoveryFromTaxonomy(report);
    return {
      canClose: safe,
       closureBlocked: !safe,
      recovery: safe ? undefined : recovery,
      missing: safe ? [] : ["parsed completion-safe report"],
      diagnostics: safe ? [] : ["Tiny work needs a parsed completion-safe report."],
    };
  }

  const missing: string[] = [];
  const diagnostics: string[] = [];
  if (typeof lifecycle.issueId !== "string" || !lifecycle.issueId.trim()) missing.push("issueId");
  if (lifecycle.issueStatusObserved !== "in_progress") {
    missing.push("issueStatusObserved:in_progress");
    diagnostics.push(`issueStatusObserved must be "in_progress" (observed claim status); got ${JSON.stringify(lifecycle.issueStatusObserved)}.`);
  }
  if (typeof lifecycle.issueAssigneeObserved !== "string" || !lifecycle.issueAssigneeObserved.trim()) {
    missing.push("issueAssigneeObserved");
    diagnostics.push("issueAssigneeObserved must be a non-empty assignee from observed claim.");
  }
  if (lifecycle.claimExitCode !== 0) {
    missing.push("claimExitCode:0");
    diagnostics.push(`claimExitCode must be 0 (observed claim exit code); got ${JSON.stringify(lifecycle.claimExitCode)}.`);
  }
  if (typeof lifecycle.delegationId !== "string" || !lifecycle.delegationId.trim()) missing.push("delegationId");
  if (lifecycle.beadsOperator !== "Bernstein") missing.push("beadsOperator=Bernstein");
  if (lifecycle.reviewComplete !== true) missing.push("Horowitz review");
  if (!report) missing.push("parsed report");
  else if (!report.completionSafe) {
    diagnostics.push("Specialist report is not completion-safe.");
  }
  if (missing.length) diagnostics.push(`Keep issue ${typeof lifecycle.issueId === "string" ? lifecycle.issueId : "open"}; satisfy: ${missing.join(", ")}.`);
  else if (report?.completionSafe !== true) diagnostics.push(`Keep issue ${typeof lifecycle.issueId === "string" ? lifecycle.issueId : "open"} open; satisfy: completion-safe report.`);
  const recovery = deriveRecoveryFromTaxonomy(report);
  return {
    canClose: missing.length === 0 && report?.completionSafe === true,
     closureBlocked: missing.length !== 0 || report?.completionSafe !== true,
    recovery: missing.length === 0 && report?.completionSafe === true ? undefined : recovery,
    missing,
    diagnostics,
  };
}
