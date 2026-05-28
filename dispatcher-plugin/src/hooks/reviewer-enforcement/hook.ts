import { extractDelegationEnvelopeV2 } from '../../config/delegation-envelope';
import { parseTaskStatusOutput } from '../../utils';
import { log } from '../../utils/logger';

type WorkAgent = 'builder' | 'researcher' | 'planner';

interface ToolExecuteInput {
  tool: string;
  sessionID?: string;
  callID?: string;
}

interface ToolExecuteOutput {
  args?: unknown;
  output?: unknown;
}

interface ChatMessagePart {
  type: string;
  text?: string;
  [key: string]: unknown;
}

interface ChatMessage {
  info: {
    role: string;
    agent?: string;
    sessionID?: string;
  };
  parts: ChatMessagePart[];
}

interface PendingWorkDelegation {
  callId: string;
  taskId?: string;
  taskKey: string;
  agent: WorkAgent;
  description: string;
  awaitingReview: boolean;
  reminderInjected: boolean;
  councilSuggested: boolean;
  userEscalationSuggested: boolean;
  rejectionCount: number;
}

interface PendingTaskCall {
  callId: string;
  parentSessionId: string;
  agent: string;
  taskKey: string;
  description: string;
}

interface ReviewerEnforcementOptions {
  shouldTrack?: (sessionID: string) => boolean;
}

const WORK_AGENTS = new Set(['builder', 'researcher', 'planner']);
const REVIEWER_ENFORCEMENT_SENTINEL = 'SENTINEL: reviewer-enforcement-v1';
const MAX_PENDING_TASK_CALLS = 100;
const MAX_TRACKED_DELEGATIONS_PER_SESSION = 50;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeAgent(value: unknown): string | undefined {
  return typeof value === 'string' ? value.toLowerCase() : undefined;
}

function pendingCallId(input: { callID?: string; sessionID?: string }): string {
  return input.callID ?? `${input.sessionID ?? 'unknown'}:anonymous`;
}

function taskKeyFromPrompt(
  prompt: string | undefined,
  fallback: string,
): string {
  if (prompt) {
    const { envelope } = extractDelegationEnvelopeV2(prompt);
    const envelopeTask = envelope?.task?.trim();
    if (envelopeTask) return envelopeTask;
  }
  return fallback.trim() || 'unknown task';
}

function descriptionFromArgs(
  args: Record<string, unknown>,
  prompt: string | undefined,
): string {
  const description =
    typeof args.description === 'string' ? args.description.trim() : '';
  if (description) return description;

  const { envelope } = extractDelegationEnvelopeV2(prompt ?? '');
  return envelope?.task?.trim() || 'delegated work';
}

function extractRejectionCount(output: string): number {
  const jsonStyle = /["']?rejection_count["']?\s*[:=]\s*(\d+)/i.exec(output);
  if (jsonStyle) return Number(jsonStyle[1]);

  const phraseStyle = /rejection count\s*[:=]?\s*(\d+)/i.exec(output);
  return phraseStyle ? Number(phraseStyle[1]) : 0;
}

function isReviewerRejection(output: string): boolean {
  const summaryMatch =
    /<subtask_summary>\s*([\s\S]*?)\s*<\/subtask_summary>/i.exec(output);
  if (summaryMatch) {
    try {
      const summary = JSON.parse(summaryMatch[1]) as Record<string, unknown>;
      const recommendation = String(summary.recommendation ?? '').toLowerCase();
      const status = String(summary.status ?? '').toLowerCase();
      if (recommendation.includes('request fixes')) return true;
      if (recommendation.includes('escalate')) return true;
      if (status === 'failed' || status === 'partial') return true;
    } catch {
      // Fall back to text matching below.
    }
  }

  return /\b(recommendation|status)\s*:\s*(request fixes|failed|escalate)\b/i.test(
    output,
  );
}

function appendInternalReminder(
  output: { output?: unknown },
  reminder: string,
): void {
  if (typeof output.output !== 'string') return;
  if (output.output.includes(reminder)) return;
  output.output = [
    output.output,
    '',
    '<internal_reminder>',
    reminder,
    '</internal_reminder>',
  ].join('\n');
}

function formatSkippedReviewReminder(pending: PendingWorkDelegation): string {
  return [
    REVIEWER_ENFORCEMENT_SENTINEL,
    `[SYSTEM: Reviewer gate reminder] The ${pending.agent} delegation "${pending.description}" completed without a following @reviewer verification delegation. Every non-trivial work delegation must be reviewed. Delegate to @reviewer now with agent_mode "verification", or explicitly state why this was trivial and safe to skip.`,
  ].join('\n');
}

function formatCouncilReminder(pending: PendingWorkDelegation): string {
  return [
    REVIEWER_ENFORCEMENT_SENTINEL,
    `[SYSTEM: Reviewer rejection escalation] The task "${pending.description}" has ${pending.rejectionCount} consecutive reviewer rejections. Escalate to @council for resolution before continuing the fix loop.`,
  ].join('\n');
}

function formatUserEscalationReminder(pending: PendingWorkDelegation): string {
  return [
    REVIEWER_ENFORCEMENT_SENTINEL,
    `[SYSTEM: Council escalation unresolved] The task "${pending.description}" still appears unresolved after council escalation. Present the situation to the user with the reviewer/council context and ask how to proceed.`,
  ].join('\n');
}

export function createReviewerEnforcementHook(
  options: ReviewerEnforcementOptions = {},
) {
  const pendingTaskCalls = new Map<string, PendingTaskCall>();
  const pendingTaskCallOrder: string[] = [];
  const delegationsBySession = new Map<string, PendingWorkDelegation[]>();
  const rejectionCountsBySession = new Map<string, Map<string, number>>();

  function shouldTrack(sessionID: string | undefined): sessionID is string {
    if (!sessionID) return false;
    return options.shouldTrack ? options.shouldTrack(sessionID) : true;
  }

  function rememberPendingTaskCall(call: PendingTaskCall): void {
    const existingIndex = pendingTaskCallOrder.indexOf(call.callId);
    if (existingIndex >= 0) pendingTaskCallOrder.splice(existingIndex, 1);

    pendingTaskCalls.set(call.callId, call);
    pendingTaskCallOrder.push(call.callId);

    while (pendingTaskCallOrder.length > MAX_PENDING_TASK_CALLS) {
      const evicted = pendingTaskCallOrder.shift();
      if (!evicted) break;
      pendingTaskCalls.delete(evicted);
    }
  }

  function takePendingTaskCall(
    callId?: string,
    parentSessionId?: string,
  ): PendingTaskCall | undefined {
    const resolvedCallId =
      callId ??
      pendingTaskCallOrder.find(
        (candidate) =>
          pendingTaskCalls.get(candidate)?.parentSessionId === parentSessionId,
      );
    if (!resolvedCallId) return undefined;

    const pending = pendingTaskCalls.get(resolvedCallId);
    pendingTaskCalls.delete(resolvedCallId);
    const orderIndex = pendingTaskCallOrder.indexOf(resolvedCallId);
    if (orderIndex >= 0) pendingTaskCallOrder.splice(orderIndex, 1);
    return pending;
  }

  function sessionDelegations(sessionID: string): PendingWorkDelegation[] {
    const existing = delegationsBySession.get(sessionID);
    if (existing) return existing;
    const created: PendingWorkDelegation[] = [];
    delegationsBySession.set(sessionID, created);
    return created;
  }

  function rejectionCountsForSession(sessionID: string): Map<string, number> {
    const existing = rejectionCountsBySession.get(sessionID);
    if (existing) return existing;
    const created = new Map<string, number>();
    rejectionCountsBySession.set(sessionID, created);
    return created;
  }

  function rejectionCountForTask(sessionID: string, taskKey: string): number {
    return rejectionCountsForSession(sessionID).get(taskKey) ?? 0;
  }

  function setRejectionCountForTask(
    sessionID: string,
    taskKey: string,
    count: number,
  ): void {
    const counts = rejectionCountsForSession(sessionID);
    if (count <= 0) {
      counts.delete(taskKey);
      return;
    }
    counts.set(taskKey, count);
  }

  function rememberWorkDelegation(
    sessionID: string,
    pending: PendingTaskCall,
    taskId?: string,
  ): void {
    const delegations = sessionDelegations(sessionID);
    delegations.push({
      callId: pending.callId,
      taskId,
      taskKey: pending.taskKey,
      agent: pending.agent as WorkAgent,
      description: pending.description,
      awaitingReview: true,
      reminderInjected: false,
      councilSuggested: false,
      userEscalationSuggested: false,
      rejectionCount: rejectionCountForTask(sessionID, pending.taskKey),
    });
    while (delegations.length > MAX_TRACKED_DELEGATIONS_PER_SESSION) {
      delegations.shift();
    }
  }

  function latestAwaitingReview(
    sessionID: string,
  ): PendingWorkDelegation | undefined {
    return [...(delegationsBySession.get(sessionID) ?? [])]
      .reverse()
      .find((delegation) => delegation.awaitingReview);
  }

  function findAwaitingReviewByTaskId(
    sessionID: string,
    taskId: string,
  ): PendingWorkDelegation | undefined {
    return [...(delegationsBySession.get(sessionID) ?? [])]
      .reverse()
      .find(
        (delegation) =>
          delegation.awaitingReview && delegation.taskId === taskId,
      );
  }

  function latestRejectedDelegation(
    sessionID: string,
  ): PendingWorkDelegation | undefined {
    return [...(delegationsBySession.get(sessionID) ?? [])]
      .reverse()
      .find((delegation) => delegation.rejectionCount > 0);
  }

  function findDelegationForReview(
    sessionID: string,
    reviewTaskKey: string,
  ): PendingWorkDelegation | undefined {
    const delegations = delegationsBySession.get(sessionID) ?? [];
    return (
      [...delegations]
        .reverse()
        .find(
          (delegation) =>
            delegation.awaitingReview && delegation.taskKey === reviewTaskKey,
        ) ?? latestAwaitingReview(sessionID)
    );
  }

  function handleReviewerResult(
    sessionID: string,
    reviewTaskKey: string,
    outputText: string,
    output: ToolExecuteOutput,
  ): void {
    const delegatedWork = findDelegationForReview(sessionID, reviewTaskKey);
    if (!delegatedWork) return;

    delegatedWork.awaitingReview = false;

    if (!isReviewerRejection(outputText)) {
      delegatedWork.rejectionCount = 0;
      setRejectionCountForTask(sessionID, delegatedWork.taskKey, 0);
      return;
    }

    const reportedCount = extractRejectionCount(outputText);
    const previousCount = rejectionCountForTask(
      sessionID,
      delegatedWork.taskKey,
    );
    delegatedWork.rejectionCount = Math.max(
      reportedCount,
      previousCount + 1,
      delegatedWork.rejectionCount + 1,
    );
    setRejectionCountForTask(
      sessionID,
      delegatedWork.taskKey,
      delegatedWork.rejectionCount,
    );

    log('[reviewer-enforcement] reviewer rejected delegated work', {
      sessionID,
      taskKey: delegatedWork.taskKey,
      rejectionCount: delegatedWork.rejectionCount,
    });

    if (delegatedWork.rejectionCount >= 2 && !delegatedWork.councilSuggested) {
      delegatedWork.councilSuggested = true;
      appendInternalReminder(output, formatCouncilReminder(delegatedWork));
    }
  }

  function handleCouncilResult(
    sessionID: string,
    outputText: string,
    output: ToolExecuteOutput,
  ): void {
    const delegatedWork = latestRejectedDelegation(sessionID);
    if (!delegatedWork) return;
    if (!isReviewerRejection(outputText)) return;

    delegatedWork.rejectionCount = Math.max(
      delegatedWork.rejectionCount + 1,
      3,
    );
    setRejectionCountForTask(
      sessionID,
      delegatedWork.taskKey,
      delegatedWork.rejectionCount,
    );
    if (delegatedWork.userEscalationSuggested) return;

    delegatedWork.userEscalationSuggested = true;
    appendInternalReminder(output, formatUserEscalationReminder(delegatedWork));
  }

  function appendPendingReviewReminder(
    sessionID: string,
    output: ToolExecuteOutput,
  ): void {
    const pending = latestAwaitingReview(sessionID);
    if (!pending || pending.reminderInjected) return;

    pending.reminderInjected = true;
    log('[reviewer-enforcement] work delegation completed without reviewer', {
      sessionID,
      taskKey: pending.taskKey,
      agent: pending.agent,
    });
    appendInternalReminder(output, formatSkippedReviewReminder(pending));
  }

  return {
    'tool.execute.before': async (
      input: ToolExecuteInput,
      output: ToolExecuteOutput,
    ): Promise<void> => {
      if (input.tool.toLowerCase() !== 'task') return;
      if (!shouldTrack(input.sessionID)) return;
      if (!isObjectRecord(output.args)) return;

      const args = output.args;
      const agent = normalizeAgent(args.subagent_type);
      if (!agent) return;

      const prompt = typeof args.prompt === 'string' ? args.prompt : undefined;
      const description = descriptionFromArgs(args, prompt);
      rememberPendingTaskCall({
        callId: pendingCallId(input),
        parentSessionId: input.sessionID,
        agent,
        taskKey: taskKeyFromPrompt(prompt, description),
        description,
      });
    },

    'tool.execute.after': async (
      input: ToolExecuteInput,
      output: ToolExecuteOutput,
    ): Promise<void> => {
      const toolName = input.tool.toLowerCase();
      if (!shouldTrack(input.sessionID)) return;

      if (toolName === 'task_status') {
        if (typeof output.output !== 'string') return;
        const status = parseTaskStatusOutput(output.output);
        if (!status || status.state === 'running') return;
        const pending = findAwaitingReviewByTaskId(
          input.sessionID,
          status.taskID,
        );
        if (!pending) return;
        appendPendingReviewReminder(input.sessionID, output);
        return;
      }

      if (toolName !== 'task') return;

      const pending = takePendingTaskCall(input.callID, input.sessionID);
      if (!pending || typeof output.output !== 'string') return;

      if (WORK_AGENTS.has(pending.agent)) {
        const status = parseTaskStatusOutput(output.output);
        rememberWorkDelegation(input.sessionID, pending, status?.taskID);
        if (!status || status.state !== 'running') {
          appendPendingReviewReminder(input.sessionID, output);
        }
        return;
      }

      if (pending.agent === 'reviewer') {
        handleReviewerResult(
          input.sessionID,
          pending.taskKey,
          output.output,
          output,
        );
        return;
      }

      if (pending.agent === 'council') {
        handleCouncilResult(input.sessionID, output.output, output);
        return;
      }

      appendPendingReviewReminder(input.sessionID, output);
    },

    'experimental.chat.messages.transform': async (
      _input: Record<string, never>,
      output: { messages: ChatMessage[] },
    ): Promise<void> => {
      for (const message of output.messages) {
        if (message.info.role !== 'user') continue;
        if (message.info.agent && message.info.agent !== 'orchestrator') {
          continue;
        }
        if (!shouldTrack(message.info.sessionID)) continue;

        for (const part of message.parts) {
          if (part.type !== 'text' || typeof part.text !== 'string') continue;
          const status = parseTaskStatusOutput(part.text);
          if (!status || status.state !== 'completed') continue;
          const pending = findAwaitingReviewByTaskId(
            message.info.sessionID,
            status.taskID,
          );
          if (!pending) continue;

          const reminderOutput = { output: part.text };
          appendPendingReviewReminder(message.info.sessionID, reminderOutput);
          if (typeof reminderOutput.output === 'string') {
            part.text = reminderOutput.output;
          }
        }
      }
    },

    reset: (): void => {
      pendingTaskCalls.clear();
      pendingTaskCallOrder.splice(0, pendingTaskCallOrder.length);
      delegationsBySession.clear();
      rejectionCountsBySession.clear();
    },
  };
}
