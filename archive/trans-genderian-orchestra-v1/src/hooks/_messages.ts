export const REVIEWER_ENFORCEMENT_SENTINEL =
  'SENTINEL: reviewer-enforcement-v1';

export const DEFAULT_DELEGATION_ENVELOPE_ISSUE =
  'missing or invalid <delegation_envelope> block';

export interface ReviewerReminderTarget {
  agent: string;
  description: string;
  rejectionCount: number;
}

export function formatInternalReminder(reminder: string): string {
  return ['<internal_reminder>', reminder, '</internal_reminder>'].join('\n');
}

export function formatPathGatingDeniedMessage(
  agent: string,
  tool: string,
  filePath: string,
): string {
  return [
    `[PATH GATING DENIED] ${agent} is not allowed to use ${tool}`,
    `on ${filePath}.`,
    'This write/edit was blocked by the Dispatcher path-gating pre-tool hook.',
  ].join(' ');
}

export function formatDelegationEnvelopeIssues(issues?: string[]): string {
  const normalized = issues?.filter((issue) => issue.trim().length > 0);
  const effectiveIssues = normalized?.length
    ? normalized
    : [DEFAULT_DELEGATION_ENVELOPE_ISSUE];
  return effectiveIssues.map((issue) => `- ${issue}`).join('\n');
}

export function formatDelegationEnvelopeEnforcementReminder(
  issues?: string[],
): string {
  return [
    '[SYSTEM: Delegation envelope enforcement warning]',
    'Your Task prompt was missing a valid <delegation_envelope> JSON block. This delegation was allowed, but the child session is receiving this corrective guidance because Dispatcher requires orchestrator delegations to include the V2 envelope.',
    'Envelope parser issues:',
    formatDelegationEnvelopeIssues(issues),
    'Retry future delegations with a valid <delegation_envelope>...</delegation_envelope> block containing verbatim_request, task, acceptance_criteria, context_summary, file_references, risk_tier, and any relevant plan_ref/agent_mode fields.',
    ']',
  ].join('\n');
}

export const formatEnforcementReminder =
  formatDelegationEnvelopeEnforcementReminder;

export function formatDelegationEnvelopeDeniedMessage(
  issues?: string[],
): string {
  return [
    '[DELEGATION ENVELOPE DENIED]',
    'The orchestrator attempted to delegate with a missing or invalid <delegation_envelope> JSON block.',
    'Envelope parser issues:',
    formatDelegationEnvelopeIssues(issues),
    'Please retry the Task call with a valid delegation envelope containing verbatim_request, task, acceptance_criteria, context_summary, file_references, risk_tier, and any relevant plan_ref/agent_mode fields.',
  ].join('\n');
}

export function formatSkippedReviewReminder(
  pending: Pick<ReviewerReminderTarget, 'agent' | 'description'>,
): string {
  return [
    REVIEWER_ENFORCEMENT_SENTINEL,
    `[SYSTEM: Reviewer gate reminder] The ${pending.agent} delegation "${pending.description}" completed without a following @reviewer verification delegation. Every non-trivial work delegation must be reviewed. Delegate to @reviewer now with agent_mode "verification", or explicitly state why this was trivial and safe to skip.`,
  ].join('\n');
}

export function formatCouncilReminder(
  pending: Pick<ReviewerReminderTarget, 'description' | 'rejectionCount'>,
): string {
  return [
    REVIEWER_ENFORCEMENT_SENTINEL,
    `[SYSTEM: Reviewer rejection escalation] The task "${pending.description}" has ${pending.rejectionCount} consecutive reviewer rejections. Escalate to @council for resolution before continuing the fix loop.`,
  ].join('\n');
}

export function formatUserEscalationReminder(
  pending: Pick<ReviewerReminderTarget, 'description'>,
): string {
  return [
    REVIEWER_ENFORCEMENT_SENTINEL,
    `[SYSTEM: Council escalation unresolved] The task "${pending.description}" still appears unresolved after council escalation. Present the situation to the user with the reviewer/council context and ask how to proceed.`,
  ].join('\n');
}
