export const REPORT_STATUSES = ["complete", "partial", "blocked", "escalate"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export const RECOVERY_ACTIONS = ["retry", "reroute", "escalate", "user-clarification"] as const;
export type RecoveryAction = (typeof RECOVERY_ACTIONS)[number];

export interface ParsedReport {
  valid: boolean;
  /** True only when the report is valid and explicitly complete. */
  completionSafe: boolean;
  /** True only when VERIFIED contains the exact explicit `exit gate: true` evidence. */
  exitGate: boolean;
  status?: ReportStatus;
  fields: { STATUS?: string; CHANGES?: string; VERIFIED?: string; GAPS?: string };
  raw: string;
  missing: string[];
  malformed: string[];
  contradictions: string[];
  watchdogAborted: boolean;
  recovery: RecoveryAction;
}

const FIELD_NAMES = ["STATUS", "CHANGES", "VERIFIED", "GAPS"] as const;
const FIELD_RE = /(?:^|\n)\s*(?:#{1,6}\s*)?(STATUS|CHANGES|VERIFIED|GAPS)\s*:\s*/gi;

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
    if (fields[name] !== undefined) malformed.push(`${name} (duplicate)`);
    else if (!value) malformed.push(name);
    else fields[name] = value;
  }
  const missing = FIELD_NAMES.filter((name) => fields[name] === undefined);
  const statusText = fields.STATUS?.trim().toLowerCase();
  const status = REPORT_STATUSES.find((candidate) => statusText === candidate);
  if (fields.STATUS !== undefined && !status) malformed.push("STATUS");
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
  // watchdogAborted detection: reroute is authoritative and must not be trusted as complete
  const watchdogAborted = /watchdog.{0,40}abort/i.test(text);
  const valid = !watchdogAborted && missing.length === 0 && malformed.length === 0 && contradictions.length === 0;
  let recovery: RecoveryAction = "retry";
  if (watchdogAborted) recovery = "reroute";
  else if (status === "blocked" || status === "escalate" || contradictions.length > 0) recovery = "escalate";
  else if (fields.GAPS && /clarif(?:y|ication)|ambiguous|unclear|need(?:s)? user/i.test(fields.GAPS)) recovery = "user-clarification";
  return {
    valid,
    completionSafe: valid && status === "complete" && exitGate,
    exitGate,
    status,
    fields,
    raw: text,
    missing,
    malformed,
    contradictions,
    watchdogAborted,
    recovery,
  };
}
