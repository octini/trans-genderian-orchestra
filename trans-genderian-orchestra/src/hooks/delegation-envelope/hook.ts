import {
  type DelegationEnvelopeParseErrorType,
  extractDelegationEnvelopeV2,
} from '../../config/delegation-envelope';
import type { EnvelopeEnforcementMode } from '../../config/schema';
import { log } from '../../utils/logger';
import {
  DEFAULT_DELEGATION_ENVELOPE_ISSUE,
  formatDelegationEnvelopeDeniedMessage,
  formatDelegationEnvelopeEnforcementReminder,
} from '../_messages';
import type { ToolExecuteInput, ToolExecuteOutput } from '../types';

type ToolExecuteBeforeOutput = ToolExecuteOutput & {
  errorType?: string;
  error_type?: string;
  metadata?: Record<string, unknown>;
};

type DelegationEnforcementOptions = {
  enforcementMode?: EnvelopeEnforcementMode;
};

const ENVELOPE_ERROR_TYPE_PREFIX = 'delegation_envelope';

function normalizeErrorType(
  errorType?: DelegationEnvelopeParseErrorType,
): string {
  return errorType
    ? `${ENVELOPE_ERROR_TYPE_PREFIX}_${errorType.replaceAll('-', '_')}`
    : `${ENVELOPE_ERROR_TYPE_PREFIX}_invalid`;
}

function wrapEnvelopeError(
  output: ToolExecuteBeforeOutput,
  errorType: string,
  issues?: string[],
): void {
  output.errorType = errorType;
  output.error_type = errorType;
  output.metadata = {
    ...(output.metadata ?? {}),
    delegationEnvelope: {
      errorType,
      issues: issues ?? [DEFAULT_DELEGATION_ENVELOPE_ISSUE],
    },
  };
}

export function createDelegationEnforcementHook(
  sessionAgentMap: Map<string, string>,
  options: DelegationEnforcementOptions = {},
): {
  'tool.execute.before': (
    input: ToolExecuteInput,
    output: ToolExecuteBeforeOutput,
  ) => Promise<void>;
} {
  const enforcementMode = options.enforcementMode ?? 'warn-inject';

  return {
    'tool.execute.before': async (
      input: ToolExecuteInput,
      output: ToolExecuteBeforeOutput,
    ): Promise<void> => {
      if (input.tool.toLowerCase() !== 'task') return;
      if (!input.sessionID) return;
      if (sessionAgentMap.get(input.sessionID) !== 'orchestrator') return;

      const args = output.args;
      if (!args) return;
      const prompt = args.prompt;
      if (typeof prompt !== 'string') return;
      const { envelope, issues, errorType } =
        extractDelegationEnvelopeV2(prompt);
      if (envelope) return;

      const normalizedErrorType = normalizeErrorType(errorType);

      log('[delegation-enforcement] orchestrator delegated without envelope', {
        sessionID: input.sessionID,
        enforcementMode,
        errorType: normalizedErrorType,
        issues,
        promptPreview: prompt.slice(0, 200),
      });

      wrapEnvelopeError(output, normalizedErrorType, issues);

      if (enforcementMode === 'log') return;

      if (enforcementMode === 'warn-inject') {
        args.prompt = `${formatDelegationEnvelopeEnforcementReminder(
          issues,
        )}\n\n${prompt}`;
        return;
      }

      output.is_denied = true;
      output.output = formatDelegationEnvelopeDeniedMessage(issues);
    },
  };
}
