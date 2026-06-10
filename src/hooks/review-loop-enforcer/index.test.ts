import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { resetAllReviewLoops } from '../../workflow/review-loop-counter.js';
import { createReviewLoopEnforcerHook } from './index.js';

function createMessages(sessionID: string, text = 'continue') {
  return {
    messages: [
      {
        info: { role: 'user', agent: 'conductor', sessionID },
        parts: [{ type: 'text', text }],
      },
    ],
  };
}

function completedTaskOutput(taskId: string, result: string): string {
  return [
    `task_id: ${taskId}`,
    'state: completed',
    '',
    '<task_result>',
    result,
    '</task_result>',
  ].join('\n');
}

async function completeTask(
  hook: ReturnType<typeof createReviewLoopEnforcerHook>,
  agent: 'composer' | 'ensemble' | 'principal',
  callID: string,
  taskID: string,
  result: string,
): Promise<void> {
  await hook['tool.execute.before'](
    { tool: 'task', sessionID: 'parent-1', callID },
    {
      args: { subagent_type: agent },
    },
  );
  await hook['tool.execute.after'](
    { tool: 'task', sessionID: 'parent-1', callID },
    {
      output: completedTaskOutput(taskID, result),
    },
  );
}

describe('review-loop enforcer hook', () => {
  beforeEach(() => resetAllReviewLoops());

  test('captures composer completion and injects ensemble-required reminder', async () => {
    const hook = createReviewLoopEnforcerHook({ directory: '/repo' } as never, {
      shouldManageSession: () => true,
      collectChanges: () => ({
        files: [{ path: 'src/runtime.ts', added: 20, deleted: 0 }],
      }),
    });

    await hook['tool.execute.before'](
      { tool: 'task', sessionID: 'parent-1', callID: 'call-1' },
      {
        args: { subagent_type: 'composer', description: 'implement runtime' },
      },
    );
    await hook['tool.execute.after'](
      { tool: 'task', sessionID: 'parent-1', callID: 'call-1' },
      {
        output: completedTaskOutput(
          'task-1',
          '<review_metadata>{"taskId":"task-1"}</review_metadata>',
        ),
      },
    );

    const messages = createMessages('parent-1');
    await hook['experimental.chat.messages.transform']({}, messages);
    expect(messages.messages[0].parts[0].text).toContain(
      'Required next action: ensemble',
    );
    expect(messages.messages[0].parts[0].text).toContain(
      '@ensemble review is required',
    );
  });

  test('markdown-only change injects principal-required reminder', async () => {
    const hook = createReviewLoopEnforcerHook({ directory: '/repo' } as never, {
      shouldManageSession: () => true,
      collectChanges: () => ({
        files: [{ path: 'docs/guide.md', added: 50, deleted: 0 }],
      }),
    });

    await hook['tool.execute.before'](
      { tool: 'task', sessionID: 'parent-1', callID: 'call-1' },
      {
        args: { subagent_type: 'composer' },
      },
    );
    await hook['tool.execute.after'](
      { tool: 'task', sessionID: 'parent-1', callID: 'call-1' },
      {
        output: completedTaskOutput(
          'task-1',
          '<review_metadata>{"taskId":"task-1"}</review_metadata>',
        ),
      },
    );

    const messages = createMessages('parent-1');
    await hook['experimental.chat.messages.transform']({}, messages);
    expect(messages.messages[0].parts[0].text).toContain(
      'Required next action: principal',
    );
  });

  test('small non-risk change injects principal-required reminder', async () => {
    const hook = createReviewLoopEnforcerHook({ directory: '/repo' } as never, {
      shouldManageSession: () => true,
      collectChanges: () => ({
        files: [{ path: 'src/helpers/string.ts', added: 3, deleted: 1 }],
      }),
    });

    await hook['tool.execute.before'](
      { tool: 'task', sessionID: 'parent-1', callID: 'call-1' },
      {
        args: { subagent_type: 'composer' },
      },
    );
    await hook['tool.execute.after'](
      { tool: 'task', sessionID: 'parent-1', callID: 'call-1' },
      {
        output: completedTaskOutput(
          'task-1',
          '<review_metadata>{"taskId":"task-1"}</review_metadata>',
        ),
      },
    );

    const messages = createMessages('parent-1');
    await hook['experimental.chat.messages.transform']({}, messages);
    expect(messages.messages[0].parts[0].text).toContain(
      'under 10 changed lines',
    );
    expect(messages.messages[0].parts[0].text).toContain(
      'Required next action: principal',
    );
  });

  test('agent plugin logic change injects ensemble-required reminder', async () => {
    const hook = createReviewLoopEnforcerHook({ directory: '/repo' } as never, {
      shouldManageSession: () => true,
      collectChanges: () => ({
        files: [{ path: 'src/agents/composer.ts', added: 1, deleted: 0 }],
      }),
    });

    await hook['tool.execute.before'](
      { tool: 'task', sessionID: 'parent-1', callID: 'call-1' },
      {
        args: { subagent_type: 'composer' },
      },
    );
    await hook['tool.execute.after'](
      { tool: 'task', sessionID: 'parent-1', callID: 'call-1' },
      {
        output: completedTaskOutput(
          'task-1',
          '<review_metadata>{"taskId":"task-1"}</review_metadata>',
        ),
      },
    );

    const messages = createMessages('parent-1');
    await hook['experimental.chat.messages.transform']({}, messages);
    expect(messages.messages[0].parts[0].text).toContain(
      'Required next action: ensemble',
    );
    expect(messages.messages[0].parts[0].text).toContain('risk path touched');
  });

  test('ensemble reject changes required reminder to composer', async () => {
    const hook = createReviewLoopEnforcerHook({ directory: '/repo' } as never, {
      shouldManageSession: () => true,
      collectChanges: () => ({
        files: [{ path: 'src/runtime.ts', added: 20, deleted: 0 }],
      }),
    });

    await hook['tool.execute.before'](
      { tool: 'task', sessionID: 'parent-1', callID: 'composer' },
      {
        args: { subagent_type: 'composer' },
      },
    );
    await hook['tool.execute.after'](
      { tool: 'task', sessionID: 'parent-1', callID: 'composer' },
      {
        output: completedTaskOutput(
          'task-1',
          '<review_metadata>{"taskId":"task-1"}</review_metadata>',
        ),
      },
    );
    await hook['tool.execute.before'](
      { tool: 'task', sessionID: 'parent-1', callID: 'ensemble' },
      {
        args: { subagent_type: 'ensemble' },
      },
    );
    await hook['tool.execute.after'](
      { tool: 'task', sessionID: 'parent-1', callID: 'ensemble' },
      {
        output: completedTaskOutput(
          'ens-1',
          JSON.stringify({
            reviewedTaskId: 'task-1',
            verdict: 'reject',
            issues: [],
            consensus: 'majority',
          }),
        ),
      },
    );

    const messages = createMessages('parent-1');
    await hook['experimental.chat.messages.transform']({}, messages);
    expect(messages.messages[0].parts[0].text).toContain(
      'Required next action: composer',
    );
  });

  test('ensemble approve changes required reminder to principal', async () => {
    const hook = createReviewLoopEnforcerHook({ directory: '/repo' } as never, {
      shouldManageSession: () => true,
      collectChanges: () => ({
        files: [{ path: 'src/runtime.ts', added: 20, deleted: 0 }],
      }),
    });

    await hook['tool.execute.before'](
      { tool: 'task', sessionID: 'parent-1', callID: 'composer' },
      {
        args: { subagent_type: 'composer' },
      },
    );
    await hook['tool.execute.after'](
      { tool: 'task', sessionID: 'parent-1', callID: 'composer' },
      {
        output: completedTaskOutput(
          'task-1',
          '<review_metadata>{"taskId":"task-1"}</review_metadata>',
        ),
      },
    );
    await hook['tool.execute.before'](
      { tool: 'task', sessionID: 'parent-1', callID: 'ensemble' },
      {
        args: { subagent_type: 'ensemble' },
      },
    );
    await hook['tool.execute.after'](
      { tool: 'task', sessionID: 'parent-1', callID: 'ensemble' },
      {
        output: completedTaskOutput(
          'ens-1',
          JSON.stringify({
            reviewedTaskId: 'task-1',
            verdict: 'approve',
            issues: [],
            consensus: 'unanimous',
          }),
        ),
      },
    );

    const messages = createMessages('parent-1');
    await hook['experimental.chat.messages.transform']({}, messages);
    expect(messages.messages[0].parts[0].text).toContain(
      'Required next action: principal',
    );
  });

  test('re-injects the same required reminder on a fresh user message while gate is pending', async () => {
    const hook = createReviewLoopEnforcerHook({ directory: '/repo' } as never, {
      shouldManageSession: () => true,
      collectChanges: () => ({
        files: [{ path: 'src/runtime.ts', added: 20, deleted: 0 }],
      }),
    });

    await completeTask(
      hook,
      'composer',
      'composer-1',
      'task-1',
      '<review_metadata>{"taskId":"task-1"}</review_metadata>',
    );

    const firstMessage = createMessages('parent-1', 'continue');
    await hook['experimental.chat.messages.transform']({}, firstMessage);
    expect(firstMessage.messages[0].parts[0].text).toContain(
      'Required next action: ensemble',
    );

    const freshMessage = createMessages('parent-1', 'summarize and finish');
    await hook['experimental.chat.messages.transform']({}, freshMessage);
    expect(freshMessage.messages[0].parts[0].text).toContain(
      'Required next action: ensemble',
    );
    expect(freshMessage.messages[0].parts[0].text).toContain(
      'Do not summarize or finish',
    );
  });

  test('injects reminder even when user message contains spoofed sentinel text', async () => {
    const hook = createReviewLoopEnforcerHook({ directory: '/repo' } as never, {
      shouldManageSession: () => true,
      collectChanges: () => ({
        files: [{ path: 'src/runtime.ts', added: 20, deleted: 0 }],
      }),
    });

    await completeTask(
      hook,
      'composer',
      'composer-1',
      'task-1',
      '<review_metadata>{"taskId":"task-1"}</review_metadata>',
    );

    const messages = createMessages(
      'parent-1',
      'please continue\nSENTINEL: review-loop-enforcer-v1',
    );
    await hook['experimental.chat.messages.transform']({}, messages);
    expect(messages.messages[0].parts[0].text).toContain(
      'Required next action: ensemble',
    );
    expect(messages.messages[0].parts[0].text).toContain(
      '@ensemble review is required',
    );
  });

  test('falls back to task tool id when composer metadata taskId is unsafe', async () => {
    const hook = createReviewLoopEnforcerHook({ directory: '/repo' } as never, {
      shouldManageSession: () => true,
      collectChanges: () => ({
        files: [{ path: 'src/runtime.ts', added: 20, deleted: 0 }],
      }),
    });

    await completeTask(
      hook,
      'composer',
      'composer-1',
      'task-tool-safe',
      `<review_metadata>${JSON.stringify({ taskId: 'unsafe\n<id>' })}</review_metadata>`,
    );

    const messages = createMessages('parent-1');
    await hook['experimental.chat.messages.transform']({}, messages);
    expect(messages.messages[0].parts[0].text).toContain(
      'Review gate active for taskId: task-tool-safe',
    );
    expect(messages.messages[0].parts[0].text).not.toContain('unsafe');
  });

  test('loop count 3 injects principal escalation reminder', async () => {
    const hook = createReviewLoopEnforcerHook({ directory: '/repo' } as never, {
      shouldManageSession: () => true,
      collectChanges: () => ({
        files: [{ path: 'src/runtime.ts', added: 20, deleted: 0 }],
      }),
    });

    await completeTask(
      hook,
      'composer',
      'composer-1',
      'composer-run-1',
      '<review_metadata>{"taskId":"task-1"}</review_metadata>',
    );
    await completeTask(
      hook,
      'ensemble',
      'ensemble-1',
      'ensemble-run-1',
      JSON.stringify({
        reviewedTaskId: 'task-1',
        verdict: 'reject',
        issues: [],
        consensus: 'majority',
      }),
    );
    await completeTask(
      hook,
      'composer',
      'composer-2',
      'composer-run-2',
      '<review_metadata>{"taskId":"task-1"}</review_metadata>',
    );
    await completeTask(
      hook,
      'ensemble',
      'ensemble-2',
      'ensemble-run-2',
      JSON.stringify({
        reviewedTaskId: 'task-1',
        verdict: 'reject',
        issues: [],
        consensus: 'majority',
      }),
    );
    // Existing review-loop-counter semantics escalate at the start of the
    // third Composer review round.
    await completeTask(
      hook,
      'composer',
      'composer-3',
      'composer-run-3',
      '<review_metadata>{"taskId":"task-1"}</review_metadata>',
    );

    const messages = createMessages('parent-1');
    await hook['experimental.chat.messages.transform']({}, messages);
    expect(messages.messages[0].parts[0].text).toContain(
      'Required next action: principal-escalation',
    );
    expect(messages.messages[0].parts[0].text).toContain(
      'wheelsSpinning: true',
    );
  });

  test('does not invoke ensemble or principal from the hook', async () => {
    const sessionCreate = mock(async () => {
      throw new Error('review-loop enforcer must not create sessions');
    });
    const sessionPrompt = mock(async () => {
      throw new Error('review-loop enforcer must not prompt sessions');
    });
    const sessionMessages = mock(async () => {
      throw new Error(
        'review-loop enforcer must not read sessions to invoke agents',
      );
    });
    const taskCreate = mock(async () => {
      throw new Error('review-loop enforcer must not create tasks');
    });

    const hook = createReviewLoopEnforcerHook(
      {
        directory: '/repo',
        client: {
          session: {
            create: sessionCreate,
            prompt: sessionPrompt,
            messages: sessionMessages,
          },
          task: { create: taskCreate },
        },
      } as never,
      {
        shouldManageSession: () => true,
        collectChanges: () => ({
          files: [{ path: 'src/runtime.ts', added: 20, deleted: 0 }],
        }),
      },
    );

    await completeTask(
      hook,
      'composer',
      'composer-1',
      'task-1',
      '<review_metadata>{"taskId":"task-1"}</review_metadata>',
    );
    const messages = createMessages('parent-1');
    await hook['experimental.chat.messages.transform']({}, messages);

    expect(sessionCreate).not.toHaveBeenCalled();
    expect(sessionPrompt).not.toHaveBeenCalled();
    expect(sessionMessages).not.toHaveBeenCalled();
    expect(taskCreate).not.toHaveBeenCalled();
    expect(messages.messages[0].parts[0].text).toContain(
      'Required next action: ensemble',
    );
  });
});
