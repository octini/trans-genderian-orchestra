import type { PluginInput } from '@opencode-ai/plugin';
import { parseTaskStatusOutput } from '../../utils/task.js';
import { classifyChanges, collectGitChangeSet } from './change-classifier.js';
import { formatReviewGateReminder, ReviewGateStore } from './state.js';
import type { ChangeSet, ReviewAgent } from './types.js';
import {
  parseEnsembleVerdict,
  parsePrincipalReviewMetadata,
} from './verdict-parser.js';

interface TaskArgs {
  subagent_type?: unknown;
  description?: unknown;
  prompt?: unknown;
}

interface PendingTaskCall {
  callId: string;
  parentSessionId: string;
  agentType: ReviewAgent;
}

export interface ReviewLoopEnforcerOptions {
  shouldManageSession: (sessionID: string) => boolean;
  collectChanges?: () => ChangeSet | undefined;
}

interface TextPart {
  type: string;
  text?: string;
  synthetic?: unknown;
  [key: string]: unknown;
}

interface ChatMessage {
  info: { role: string; agent?: string; sessionID?: string };
  parts: TextPart[];
}

const REVIEW_AGENTS = new Set<ReviewAgent>([
  'composer',
  'ensemble',
  'principal',
]);
const SENTINEL = 'SENTINEL: review-loop-enforcer-v1';

export function createReviewLoopEnforcerHook(
  ctx: PluginInput,
  options: ReviewLoopEnforcerOptions,
) {
  const store = new ReviewGateStore();
  const pendingCalls = new Map<string, PendingTaskCall>();
  const taskAgents = new Map<
    string,
    { parentSessionId: string; agentType: ReviewAgent }
  >();
  const processedTaskCompletions = new Set<string>();
  const collectChanges =
    options.collectChanges ?? (() => collectGitChangeSet(ctx.directory));

  function pendingCallId(input: {
    callID?: string;
    sessionID?: string;
  }): string {
    return input.callID ?? `${input.sessionID ?? 'unknown'}:anonymous`;
  }

  function parseComposerTaskId(
    result: string | undefined,
    fallback: string,
  ): string {
    if (!result) return fallback;
    const metadata =
      /<review_metadata>\s*([\s\S]*?)\s*<\/review_metadata>/i.exec(result)?.[1];
    if (!metadata) return fallback;
    try {
      const parsed = JSON.parse(metadata) as { taskId?: unknown };
      return typeof parsed.taskId === 'string' && parsed.taskId.trim()
        ? parsed.taskId.trim()
        : fallback;
    } catch {
      return fallback;
    }
  }

  function processCompletedTask(
    parentSessionId: string,
    agentType: ReviewAgent,
    output: string,
  ): void {
    const status = parseTaskStatusOutput(output);
    if (!status || status.state !== 'completed') return;

    const signature = `${status.taskID}:completed:${agentType}`;
    if (processedTaskCompletions.has(signature)) return;
    processedTaskCompletions.add(signature);

    if (agentType === 'composer') {
      const taskId = parseComposerTaskId(status.result, status.taskID);
      store.recordComposerCompletion(
        parentSessionId,
        taskId,
        classifyChanges(collectChanges()),
      );
      return;
    }

    if (agentType === 'ensemble') {
      store.recordEnsembleVerdict(
        parentSessionId,
        parseEnsembleVerdict(status.result ?? output),
      );
      return;
    }

    store.recordPrincipalVerdict(
      parentSessionId,
      parsePrincipalReviewMetadata(status.result ?? output),
    );
  }

  return {
    'tool.execute.before': async (
      input: { tool: string; sessionID?: string; callID?: string },
      output: { args?: unknown },
    ): Promise<void> => {
      if (input.tool.toLowerCase() !== 'task') return;
      if (!input.sessionID || !options.shouldManageSession(input.sessionID)) {
        return;
      }

      const args = output.args as TaskArgs | undefined;
      const agentType = args?.subagent_type;
      if (
        typeof agentType !== 'string' ||
        !REVIEW_AGENTS.has(agentType as ReviewAgent)
      ) {
        return;
      }

      const callId = pendingCallId(input);
      pendingCalls.set(callId, {
        callId,
        parentSessionId: input.sessionID,
        agentType: agentType as ReviewAgent,
      });
    },

    'tool.execute.after': async (
      input: { tool: string; sessionID?: string; callID?: string },
      output: { output: unknown },
    ): Promise<void> => {
      if (input.tool.toLowerCase() !== 'task') return;
      if (typeof output.output !== 'string') return;

      const pending = pendingCalls.get(pendingCallId(input));
      if (!pending) return;
      pendingCalls.delete(pending.callId);

      const status = parseTaskStatusOutput(output.output);
      if (status) {
        taskAgents.set(status.taskID, {
          parentSessionId: pending.parentSessionId,
          agentType: pending.agentType,
        });
      }

      processCompletedTask(
        pending.parentSessionId,
        pending.agentType,
        output.output,
      );
    },

    'experimental.chat.messages.transform': async (
      _input: Record<string, never>,
      output: { messages: ChatMessage[] },
    ): Promise<void> => {
      for (const message of output.messages) {
        for (const part of message.parts) {
          if (
            part.type !== 'text' ||
            typeof part.text !== 'string' ||
            part.synthetic !== true
          ) {
            continue;
          }

          const status = parseTaskStatusOutput(part.text);
          if (!status || status.state !== 'completed') continue;

          const tracked = taskAgents.get(status.taskID);
          if (!tracked) continue;

          processCompletedTask(
            tracked.parentSessionId,
            tracked.agentType,
            part.text,
          );
        }
      }

      for (let i = output.messages.length - 1; i >= 0; i -= 1) {
        const message = output.messages[i];
        if (message.info.role !== 'user') continue;
        if (message.info.agent && message.info.agent !== 'conductor') return;
        if (
          !message.info.sessionID ||
          !options.shouldManageSession(message.info.sessionID)
        ) {
          return;
        }

        const gate = store.getGate(message.info.sessionID);
        if (!gate) return;

        const textPart = message.parts.find(
          (part) => part.type === 'text' && typeof part.text === 'string',
        );
        if (!textPart || textPart.text?.includes(SENTINEL)) return;

        textPart.text = [
          textPart.text ?? '',
          '',
          formatReviewGateReminder(gate),
        ].join('\n');
        return;
      }
    },
  };
}
