export const REPORT_STATUSES = ["complete", "partial", "blocked", "escalate"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export const RECOVERY_ACTIONS = ["retry", "reroute", "escalate", "user-clarification"] as const;
export type RecoveryAction = (typeof RECOVERY_ACTIONS)[number];

export const TASK_STATUSES = ["complete", "bail", "failed", "tripwire"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskTaxonomy =
  | { status: "complete"; retryable: boolean }
  | { status: "bail"; retryable: boolean }
  | { status: "failed"; retryable: boolean }
  | { status: "tripwire"; retryable: boolean };

export interface ParsedReport {
  valid: boolean;
  /** True only when the report is valid and explicitly complete. */
  completionSafe: boolean;
  /** True only when VERIFIED contains the exact explicit `exit gate: true` evidence. */
  exitGate: boolean;
  status?: ReportStatus;
  /** Typed taxonomy status — discriminated union discriminant */
  taskStatus: TaskStatus;
  retryable: boolean;
  taxonomy: TaskTaxonomy;
  fields: { STATUS?: string; CHANGES?: string; VERIFIED?: string; GAPS?: string; TASK_STATUS?: string; RETRYABLE?: string };
  raw: string;
  missing: string[];
  malformed: string[];
  contradictions: string[];
  watchdogAborted: boolean;
  recovery: RecoveryAction;
}

const FIELD_NAMES = ["STATUS", "CHANGES", "VERIFIED", "GAPS"] as const;
const FIELD_RE = /(?:^|\n)\s*(?:#{1,6}\s*)?(STATUS|CHANGES|VERIFIED|GAPS|TASK_STATUS|RETRYABLE)\s*:\s*/gi;

function hasFailure(text: string): boolean {
  const withoutNegatedSuccess = text
    .replace(/\bno\s+(?:failures?|errors?)\b/gi, "")
    .replace(/\bdid\s+not\s+fail(?:ed|ure|ing)?\b/gi, "");
  return /\b(?:fail(?:ed|ure)?|failing|error|not run|unverified|unknown|did not pass)\b/i.test(withoutNegatedSuccess);
}

/** Parse a specialist report without treating prose as proof of completion. */
export function parseTaskReport(raw: string): ParsedReport {
  const text = typeof raw === "string" ? raw : String(raw ?? "");
  const fields: ParsedReport["fields"] = {};
  const malformed: string[] = [];
  const matches = [...text.matchAll(FIELD_RE)];
  for (let i = 0; i < matches.length; i++) {
    const name = matches[i]?.[1]?.toUpperCase() as keyof ParsedReport["fields"];
    const start = (matches[i]?.index ?? 0) + (matches[i]?.[0]?.length ?? 0);
    const value = text.slice(start, matches[i + 1]?.index ?? text.length).trim();
    if (fields[name] !== undefined) malformed.push(`${String(name)} (duplicate)`);
    else if (!value) malformed.push(String(name));
    else fields[name] = value;
  }
  const missing = FIELD_NAMES.filter((name) => fields[name as keyof ParsedReport["fields"]] === undefined);
  const statusText = fields.STATUS?.trim().toLowerCase();
  const status = REPORT_STATUSES.find((candidate) => statusText === candidate);
  const statusIsTaxonomy = TASK_STATUSES.find((candidate) => statusText === candidate);
  // STATUS is malformed only if it matches neither legacy nor taxonomy
  if (fields.STATUS !== undefined && !status && !statusIsTaxonomy) malformed.push("STATUS");
  // Optional taxonomy field validation
  const taskStatusText = fields.TASK_STATUS?.trim().toLowerCase();
  const taskStatusFromField = taskStatusText ? (TASK_STATUSES.find((c) => taskStatusText === c) as TaskStatus | undefined) : undefined;
  if (fields.TASK_STATUS !== undefined && !taskStatusFromField) malformed.push("TASK_STATUS");

  const retryableText = fields.RETRYABLE?.trim().toLowerCase();
  let retryableFromField: boolean | undefined;
  if (fields.RETRYABLE !== undefined) {
    if (["true", "yes", "1"].includes(retryableText ?? "")) retryableFromField = true;
    else if (["false", "no", "0"].includes(retryableText ?? "")) retryableFromField = false;
    else malformed.push("RETRYABLE");
  }

  const contradictions: string[] = [];
  if (status === "complete" && fields.VERIFIED && hasFailure(fields.VERIFIED)) {
    contradictions.push("STATUS complete conflicts with failed or unverified VERIFIED evidence");
  }
  if (status === "complete" && fields.GAPS && !/^\s*(?:none|n\/a|no gaps?)[.!]?\s*$/i.test(fields.GAPS)) {
    contradictions.push("STATUS complete conflicts with non-empty GAPS");
  }
  const exitGate = /exit\s*gate\s*:\s*true(?![\w-])/i.test(fields.VERIFIED ?? "");
  if (!exitGate) {
    malformed.push(/exit\s*gate/i.test(fields.VERIFIED ?? "")
      ? "VERIFIED exit-gate claim"
      : "VERIFIED exit-gate evidence");
  } else if (hasFailure(fields.VERIFIED ?? "")) {
    malformed.push("VERIFIED exit-gate claim");
  }
  // Determine taskStatus — precedence: explicit TASK_STATUS > STATUS taxonomy value > legacy mapping > default failed
  let taskStatus: TaskStatus;
  if (taskStatusFromField) {
    taskStatus = taskStatusFromField;
  } else if (statusIsTaxonomy) {
    taskStatus = statusIsTaxonomy as TaskStatus;
  } else if (status) {
    // legacy mapping for backward compat
    if (status === "complete") taskStatus = "complete";
    else if (status === "partial") taskStatus = "failed";
    else if (status === "blocked" || status === "escalate") taskStatus = "tripwire";
    else taskStatus = "failed";
  } else {
    // absent status defaults to failed (spec)
    taskStatus = "failed";
  }

  // Additional contradiction for taxonomy complete (mirrors legacy, ensures precedence)
  if (taskStatus === "complete" && fields.VERIFIED && hasFailure(fields.VERIFIED)) {
    const msg = "TASK_STATUS complete conflicts with failed or unverified VERIFIED evidence";
    if (!contradictions.includes(msg) && !contradictions.some((c) => c.includes("STATUS complete conflicts"))) {
      contradictions.push(msg);
    }
  }
  if (taskStatus === "complete" && fields.GAPS && !/^\s*(?:none|n\/a|no gaps?)[.!]?\s*$/i.test(fields.GAPS)) {
    const msg = "TASK_STATUS complete conflicts with non-empty GAPS";
    if (!contradictions.includes(msg) && !contradictions.some((c) => c.includes("STATUS complete conflicts with non-empty GAPS"))) {
      contradictions.push(msg);
    }
  }

  // Determine retryable — explicit field wins, else default per taskStatus
  let retryable: boolean;
  if (retryableFromField !== undefined) {
    retryable = retryableFromField;
  } else {
    if (taskStatus === "failed") retryable = true;
    else if (taskStatus === "complete") retryable = false;
    else retryable = false;
  }

  const taxonomy: TaskTaxonomy = { status: taskStatus, retryable } as TaskTaxonomy;

  // watchdogAborted detection: reroute is authoritative and must not be trusted as complete
  const watchdogAborted = /watchdog.{0,40}abort/i.test(text);
  const valid = !watchdogAborted && missing.length === 0 && malformed.length === 0 && contradictions.length === 0;
  let recovery: RecoveryAction = "retry";
  if (watchdogAborted) recovery = "reroute";
  else if (contradictions.length > 0) recovery = "escalate";
  else if (fields.GAPS && /clarif(?:y|ication)|ambiguous|unclear|need(?:s)? user/i.test(fields.GAPS)) recovery = "user-clarification";
  else if (taskStatus === "bail") recovery = "escalate";
  else if (taskStatus === "tripwire") recovery = "escalate";
  else if (taskStatus === "failed") recovery = retryable ? "retry" : "escalate";
  else if (taskStatus === "complete") recovery = "retry";
  else {
    // fallback for any unexpected — preserve legacy blocked/escalate handling
    if (status === "blocked" || status === "escalate") recovery = "escalate";
  }
  return {
    valid,
    completionSafe: valid && taskStatus === "complete" && exitGate,
    exitGate,
    status,
    taskStatus,
    retryable,
    taxonomy,
    fields,
    raw: text,
    missing,
    malformed,
    contradictions,
    watchdogAborted,
    recovery,
  };
}
