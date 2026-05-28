import { beforeEach, describe, expect, mock, test } from 'bun:test';

const logMock = mock(() => {});

mock.module('../../utils/logger', () => ({
  log: logMock,
}));

import { createReviewerEnforcementHook } from './index';

function createTaskArgs(agent: string, task = 'Implement reviewer gate') {
  return {
    subagent_type: agent,
    description: task,
    prompt: [
      '<delegation_envelope>',
      JSON.stringify({
        verbatim_request: 'Implement reviewer enforcement',
        task,
        acceptance_criteria: ['Reviewer verifies delegated work'],
        context_summary: 'Test context',
        file_references: [],
        agent_mode: agent === 'reviewer' ? 'verification' : 'advisory',
        risk_tier: 'low',
      }),
      '</delegation_envelope>',
      'Do the task.',
    ].join(''),
  };
}

async function runTask(
  hook: ReturnType<typeof createReviewerEnforcementHook>,
  options: {
    agent: string;
    callID: string;
    task?: string;
    output?: string;
  },
) {
  const beforeOutput = {
    args: createTaskArgs(options.agent, options.task),
  };
  await hook['tool.execute.before'](
    { tool: 'task', sessionID: 'parent-1', callID: options.callID },
    beforeOutput,
  );

  const afterOutput = {
    output:
      options.output ??
      [
        'task_id: child-1',
        'state: completed',
        '<task_result>',
        'done',
        '</task_result>',
      ].join('\n'),
  };
  await hook['tool.execute.after'](
    { tool: 'task', sessionID: 'parent-1', callID: options.callID },
    afterOutput,
  );
  return afterOutput;
}

describe('reviewer-enforcement hook', () => {
  beforeEach(() => {
    logMock.mockClear();
  });

  test('injects reviewer reminder after completed work delegation', async () => {
    const hook = createReviewerEnforcementHook();

    const output = await runTask(hook, {
      agent: 'builder',
      callID: 'call-builder',
    });

    expect(output.output).toContain('SENTINEL: reviewer-enforcement-v1');
    expect(output.output).toContain('Reviewer gate reminder');
    expect(output.output).toContain('Delegate to @reviewer now');
  });

  test('waits for task_status before reminding on running background work', async () => {
    const hook = createReviewerEnforcementHook();

    const launchOutput = await runTask(hook, {
      agent: 'researcher',
      callID: 'call-researcher',
      output: ['task_id: child-1', 'state: running'].join('\n'),
    });
    expect(launchOutput.output).not.toContain('reviewer-enforcement-v1');

    const statusOutput = {
      output: [
        'task_id: child-1',
        'state: completed',
        '<task_result>',
        'research complete',
        '</task_result>',
      ].join('\n'),
    };
    await hook['tool.execute.after'](
      { tool: 'task_status', sessionID: 'parent-1', callID: 'status-1' },
      statusOutput,
    );

    expect(statusOutput.output).toContain('Reviewer gate reminder');
  });

  test('injects reminder into synthetic completed background task messages', async () => {
    const hook = createReviewerEnforcementHook();

    await runTask(hook, {
      agent: 'planner',
      callID: 'call-planner',
      output: ['task_id: child-plan', 'state: running'].join('\n'),
    });

    const messages = {
      messages: [
        {
          info: { role: 'user', agent: 'orchestrator', sessionID: 'parent-1' },
          parts: [
            {
              type: 'text',
              synthetic: true,
              text: [
                'Background task completed: plan work',
                'task_id: child-plan',
                'state: completed',
                '<task_result>',
                'plan complete',
                '</task_result>',
              ].join('\n'),
            },
          ],
        },
      ],
    };

    await hook['experimental.chat.messages.transform']({}, messages);

    expect(messages.messages[0].parts[0].text).toContain(
      'Reviewer gate reminder',
    );
  });

  test('does not track non-orchestrator sessions when shouldTrack returns false', async () => {
    const hook = createReviewerEnforcementHook({ shouldTrack: () => false });

    const output = await runTask(hook, {
      agent: 'researcher',
      callID: 'call-researcher',
    });

    expect(output.output).not.toContain('reviewer-enforcement-v1');
  });

  test('injects council escalation reminder after second reviewer rejection', async () => {
    const hook = createReviewerEnforcementHook();

    await runTask(hook, {
      agent: 'builder',
      callID: 'call-builder-1',
      task: 'Fix task A',
    });

    await runTask(hook, {
      agent: 'reviewer',
      callID: 'call-reviewer-1',
      task: 'Fix task A',
      output: [
        'status: failed',
        'recommendation: request fixes',
        'rejection_count: 1',
      ].join('\n'),
    });

    await runTask(hook, {
      agent: 'builder',
      callID: 'call-builder-2',
      task: 'Fix task A',
    });

    const reviewerOutput = await runTask(hook, {
      agent: 'reviewer',
      callID: 'call-reviewer-2',
      task: 'Fix task A',
      output: [
        'status: failed',
        'recommendation: request fixes',
        'rejection_count: 1',
        '<subtask_summary>',
        JSON.stringify({
          status: 'failed',
          what_changed: 'Reviewed work',
          files_touched: [],
          validation: 'Fail',
          risks: ['Missing requirement'],
          rejection_count: 1,
          recommendation: 'request fixes',
        }),
        '</subtask_summary>',
      ].join('\n'),
    });

    expect(reviewerOutput.output).toContain('Reviewer rejection escalation');
    expect(reviewerOutput.output).toContain('Escalate to @council');
  });

  test('injects user escalation reminder when council also rejects', async () => {
    const hook = createReviewerEnforcementHook();

    await runTask(hook, {
      agent: 'builder',
      callID: 'call-builder',
      task: 'Fix task B',
    });
    await runTask(hook, {
      agent: 'reviewer',
      callID: 'call-reviewer',
      task: 'Fix task B',
      output: [
        'status: failed',
        'recommendation: escalate',
        'rejection_count: 2',
      ].join('\n'),
    });

    const councilOutput = await runTask(hook, {
      agent: 'council',
      callID: 'call-council',
      task: 'Fix task B',
      output: ['status: failed', 'recommendation: escalate'].join('\n'),
    });

    expect(councilOutput.output).toContain('Council escalation unresolved');
    expect(councilOutput.output).toContain('Present the situation to the user');
  });
});
