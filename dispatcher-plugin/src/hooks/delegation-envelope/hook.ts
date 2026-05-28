import { extractDelegationEnvelopeV2 } from '../../config/delegation-envelope';
import type { EnvelopeEnforcementMode } from '../../config/schema';
import { log } from '../../utils/logger';

type ToolExecuteBeforeOutput = {
  args?: Record<string, unknown>;
  output?: unknown;
  is_denied?: boolean;
};

type DelegationEnforcementOptions = {
  enforcementMode?: EnvelopeEnforcementMode;
};

const DEFAULT_ISSUE = 'missing or invalid <delegation_envelope> block';

function formatIssues(issues?: string[]): string {
  const normalized = issues?.filter((issue) => issue.trim().length > 0);
  const effectiveIssues = normalized?.length ? normalized : [DEFAULT_ISSUE];
  return effectiveIssues.map((issue) => `- ${issue}`).join('\n');
}

function correctiveGuidance(issues?: string[]): string {
  return [
    '[SYSTEM: Delegation envelope enforcement warning]',
    'Your Task prompt was missing a valid <delegation_envelope> JSON block. This delegation was allowed, but the child session is receiving this corrective guidance because Dispatcher requires orchestrator delegations to include the V2 envelope.',
    'Envelope parser issues:',
    formatIssues(issues),
    'Retry future delegations with a valid <delegation_envelope>...</delegation_envelope> block containing verbatim_request, task, acceptance_criteria, context_summary, file_references, risk_tier, and any relevant plan_ref/agent_mode fields.',
    ']',
  ].join('\n');
}

function denialMessage(issues?: string[]): string {
  return [
    '[DELEGATION ENVELOPE DENIED]',
    'The orchestrator attempted to delegate with a missing or invalid <delegation_envelope> JSON block.',
    'Envelope parser issues:',
    formatIssues(issues),
    'Please retry the Task call with a valid delegation envelope containing verbatim_request, task, acceptance_criteria, context_summary, file_references, risk_tier, and any relevant plan_ref/agent_mode fields.',
  ].join('\n');
}

export function createDelegationEnforcementHook(
  sessionAgentMap: Map<string, string>,
  options: DelegationEnforcementOptions = {},
): {
  'tool.execute.before': (
    input: { tool: string; sessionID?: string; callID?: string },
    output: ToolExecuteBeforeOutput,
  ) => Promise<void>;
} {
  const enforcementMode = options.enforcementMode ?? 'warn-inject';

  return {
    'tool.execute.before': async (
      input: { tool: string; sessionID?: string; callID?: string },
      output: ToolExecuteBeforeOutput,
    ): Promise<void> => {
      if (input.tool.toLowerCase() !== 'task') return;
      if (!input.sessionID) return;
      if (sessionAgentMap.get(input.sessionID) !== 'orchestrator') return;

      const args = output.args;
      if (!args) return;
      const prompt = args.prompt;
      if (typeof prompt !== 'string') return;
      const { envelope, issues } = extractDelegationEnvelopeV2(prompt);
      if (envelope) return;

      log('[delegation-enforcement] orchestrator delegated without envelope', {
        sessionID: input.sessionID,
        enforcementMode,
        issues,
        promptPreview: prompt.slice(0, 200),
      });

      if (enforcementMode === 'log') return;

      if (enforcementMode === 'warn-inject') {
        args.prompt = `${correctiveGuidance(issues)}\n\n${prompt}`;
        return;
      }

      output.is_denied = true;
      output.output = denialMessage(issues);
    },
  };
}
