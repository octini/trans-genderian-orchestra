import {
  type DelegationEnvelope,
  extractDelegationEnvelopeV2,
} from '../../config/delegation-envelope';
import { parseTaskStatusOutput } from '../../utils';
import { log } from '../../utils/logger';
import {
  formatCouncilReminder,
  formatInternalReminder,
  formatSkippedReviewReminder,
  formatUserEscalationReminder,
} from '../_messages';
import type { ToolExecuteInput, ToolExecuteOutput } from '../types';

const WORK_AGENTS = new Set(['builder', 'researcher', 'planner'] as const);
type WorkAgent = typeof WORK_AGENTS extends Set<infer T> ? T : never;
type DelegationEnvelopeCache = Map<string, DelegationEnvelope | null>;

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
  agentMode?: string;
}

interface ReviewerEnforcementOptions {
  shouldTrack?: (sessionID: string) => boolean;
}

const MAX_PENDING_TASK_CALLS = 100;
const MAX_TRACKED_DELEGATIONS_PER_SESSION = 50;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeAgent(value: unknown): string | undefined {
  return typeof value === 'string' ? value.toLowerCase() : undefined;
}

function isWorkAgent(agent: string): agent is WorkAgent {
  return (WORK_AGENTS as ReadonlySet<string>).has(agent);
}

function pendingCallId(input: { callID?: string; sessionID?: string }): string {
  return input.callID ?? `${input.sessionID ?? 'unknown'}:anonymous`;
}

function envelopeFromCache(
  prompt: string | undefined,
  callId: string,
  cache: DelegationEnvelopeCache,
): DelegationEnvelope | null {
  if (prompt === undefined) return null;
  if (!cache.has(callId)) {
    cache.set(callId, extractDelegationEnvelopeV2(prompt).envelope);
  }
  return cache.get(callId) ?? null;
}

function taskKeyFromPrompt(
  prompt: string | undefined,
  fallback: string,
  callId: string,
  cache: DelegationEnvelopeCache,
): string {
  const envelope = envelopeFromCache(prompt, callId, cache);
  const envelopeTask = envelope?.task?.trim();
  if (envelopeTask) return envelopeTask;
  return fallback.trim() || 'unknown task';
}

function agentModeFromPrompt(
  prompt: string | undefined,
  callId: string,
  cache: DelegationEnvelopeCache,
): string | undefined {
  const envelope = envelopeFromCache(prompt, callId, cache);
  return typeof envelope?.agent_mode === 'string'
    ? envelope.agent_mode.toLowerCase()
    : undefined;
}

function descriptionFromArgs(
  args: Record<string, unknown>,
  prompt: string | undefined,
  callId: string,
  cache: DelegationEnvelopeCache,
): string {
  const description =
    typeof args.description === 'string' ? args.description.trim() : '';
  if (description) return description;

  const envelope = envelopeFromCache(prompt, callId, cache);
  return envelope?.task?.trim() || 'delegated work';
}

function isExplicitTrue(value: unknown): boolean {
  if (value === true) return true;
  return typeof value === 'string' && value.trim().toLowerCase() === 'true';
}

function isTrivialDelegation(
  args: Record<string, unknown>,
  prompt: string | undefined,
  callId: string,
  cache: DelegationEnvelopeCache,
): boolean {
  if (isExplicitTrue(args.trivial)) return true;

  const envelope = envelopeFromCache(prompt, callId, cache);
  return envelope?.trivial === true;
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
  output.output = [output.output, '', formatInternalReminder(reminder)].join(
    '\n',
  );
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
      if (counts.size === 0) {
        rejectionCountsBySession.delete(sessionID);
      }
      return;
    }
    counts.set(taskKey, count);
  }

  function trackedStateCounts(): Record<string, number> {
    let trackedDelegations = 0;
    let awaitingReviewDelegations = 0;
    for (const delegations of delegationsBySession.values()) {
      trackedDelegations += delegations.length;
      awaitingReviewDelegations += delegations.filter(
        (delegation) => delegation.awaitingReview,
      ).length;
    }

    let rejectionCounts = 0;
    for (const counts of rejectionCountsBySession.values()) {
      rejectionCounts += counts.size;
    }

    return {
      pendingTaskCalls: pendingTaskCalls.size,
      trackedDelegationSessions: delegationsBySession.size,
      trackedDelegations,
      awaitingReviewDelegations,
      rejectionCountSessions: rejectionCountsBySession.size,
      rejectionCounts,
    };
  }

  function hasTrackedState(counts: Record<string, number>): boolean {
    return Object.values(counts).some((count) => count > 0);
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
    // reportedCount comes from the reviewer's output. previousCount is the
    // persisted per-task count stored before this review delegation, and the
    // max keeps the effective rejection count from ever decreasing.
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

    // The guard above only processes real council rejections via the
    // isReviewerRejection check. A council rejection bumps the count to at
    // least 3 so the user escalation reminder fires.
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

      const callId = pendingCallId(input);
      const prompt = typeof args.prompt === 'string' ? args.prompt : undefined;
      const envelopeCache: DelegationEnvelopeCache = new Map();
      envelopeFromCache(prompt, callId, envelopeCache);

      const description = descriptionFromArgs(
        args,
        prompt,
        callId,
        envelopeCache,
      );
      const taskKey = taskKeyFromPrompt(
        prompt,
        description,
        callId,
        envelopeCache,
      );
      if (
        isWorkAgent(agent) &&
        isTrivialDelegation(args, prompt, callId, envelopeCache)
      ) {
        log('[reviewer-enforcement] skipping trivial work delegation', {
          sessionID: input.sessionID,
          taskKey,
          agent,
        });
        return;
      }

      rememberPendingTaskCall({
        callId,
        parentSessionId: input.sessionID,
        agent,
        taskKey,
        description,
        agentMode: agentModeFromPrompt(prompt, callId, envelopeCache),
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

      if (isWorkAgent(pending.agent)) {
        const status = parseTaskStatusOutput(output.output);
        rememberWorkDelegation(input.sessionID, pending, status?.taskID);
        if (!status || status.state !== 'running') {
          appendPendingReviewReminder(input.sessionID, output);
        }
        return;
      }

      if (pending.agent === 'reviewer') {
        if (pending.agentMode === 'advisory') {
          appendPendingReviewReminder(input.sessionID, output);
          return;
        }

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

    reset: (reason = 'manual reset'): void => {
      const counts = trackedStateCounts();
      if (hasTrackedState(counts)) {
        log(
          '[reviewer-enforcement] WARN: resetting tracked state; pending reviewer enforcement state discarded',
          {
            reason,
            ...counts,
          },
        );
      }
      pendingTaskCalls.clear();
      pendingTaskCallOrder.splice(0, pendingTaskCallOrder.length);
      delegationsBySession.clear();
      rejectionCountsBySession.clear();
    },
  };
}
