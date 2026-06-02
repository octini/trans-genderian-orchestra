import { beforeEach, describe, expect, mock, test } from 'bun:test';

const logMock = mock(() => {});

mock.module('../../utils/logger', () => ({
  log: logMock,
}));

import { createReadBudgetHook } from './hook';

function createOutput(output: unknown = 'real content') {
  return {
    args: {},
    output,
    is_denied: false,
  };
}

describe('orchestrator read budget hook', () => {
  beforeEach(() => {
    logMock.mockClear();
  });

  test('increments read count on read/glob calls', async () => {
    const hook = createReadBudgetHook();
    const first = createOutput('read content');
    const second = createOutput('glob content');
    const third = createOutput('third content');

    await hook['tool.execute.before'](
      { tool: 'read', sessionID: 'session-1' },
      first,
    );
    await hook['tool.execute.before'](
      { tool: 'glob', sessionID: 'session-1' },
      second,
    );
    await hook['tool.execute.before'](
      { tool: 'Read', sessionID: 'session-1' },
      third,
    );

    expect(first.output).toBe('read content');
    expect(second.output).toBe('glob content');
    expect(third.output).toBe('third content');
    expect(third.is_denied).toBe(false);
  });

  test('resets count on task call', async () => {
    const hook = createReadBudgetHook();

    for (let index = 0; index < 2; index += 1) {
      await hook['tool.execute.before'](
        { tool: 'read', sessionID: 'session-1' },
        createOutput(`read ${index}`),
      );
    }

    await hook['tool.execute.before'](
      { tool: 'task', sessionID: 'session-1' },
      createOutput('task output'),
    );

    const afterReset = createOutput('after reset');
    await hook['tool.execute.before'](
      { tool: 'glob', sessionID: 'session-1' },
      afterReset,
    );

    expect(afterReset.output).toBe('after reset');
    expect(afterReset.is_denied).toBe(false);
  });

  test('logs read count metrics when orchestrator delegates', async () => {
    const hook = createReadBudgetHook({
      shouldCheck: (sessionID) => sessionID === 'orchestrator-session',
    });

    for (let index = 0; index < 3; index += 1) {
      await hook['tool.execute.before'](
        { tool: 'read', sessionID: 'orchestrator-session' },
        createOutput(`read ${index}`),
      );
    }

    await hook['tool.execute.before'](
      { tool: 'task', sessionID: 'orchestrator-session' },
      createOutput('task output'),
    );

    expect(logMock).toHaveBeenCalledWith(
      '[metrics] session orchestrator-session orchestrator reads before delegation: 3',
    );
  });

  test('logs warning at threshold 3 without mutating output', async () => {
    const hook = createReadBudgetHook();
    const output = createOutput('third read');

    await hook['tool.execute.before'](
      { tool: 'read', sessionID: 'session-1' },
      createOutput('first read'),
    );
    await hook['tool.execute.before'](
      { tool: 'grep', sessionID: 'session-1' },
      createOutput('second read'),
    );
    await hook['tool.execute.before'](
      { tool: 'glob', sessionID: 'session-1' },
      output,
    );

    expect(output.output).toBe('third read');
    expect(output.is_denied).toBe(false);
    expect(logMock).toHaveBeenCalledWith(
      '[read-budget] orchestrator approaching read budget limit for session session-1: 3 consecutive reads',
    );
  });

  test('denies reads at threshold 5', async () => {
    const hook = createReadBudgetHook();
    const output = createOutput('fifth read');

    for (const tool of ['read', 'glob', 'grep', 'ast_grep_search']) {
      await hook['tool.execute.before'](
        { tool, sessionID: 'session-1' },
        createOutput(`${tool} output`),
      );
    }

    await hook['tool.execute.before'](
      { tool: 'lsp_diagnostics', sessionID: 'session-1' },
      output,
    );

    expect(output.is_denied).toBe(true);
    expect(output.output).toBe(
      '[SYSTEM: Orchestrator read budget exceeded. You have made 5 read/research calls without delegating. As a pure dispatcher, you must delegate investigation to @researcher. Please route this task to the appropriate specialist.]',
    );
    expect(logMock).toHaveBeenCalledWith(
      '[read-budget] orchestrator exceeded read budget for session session-1: 5 consecutive reads without delegation',
    );
  });

  test('tracks list, codesearch, and webfetch as read tools', async () => {
    const hook = createReadBudgetHook();
    const output = createOutput('fifth read');

    for (const tool of ['read', 'list', 'codesearch', 'webfetch']) {
      await hook['tool.execute.before'](
        { tool, sessionID: 'session-1' },
        createOutput(`${tool} output`),
      );
    }

    await hook['tool.execute.before'](
      { tool: 'glob', sessionID: 'session-1' },
      output,
    );

    expect(output.is_denied).toBe(true);
    expect(output.output).toContain(
      'Orchestrator read budget exceeded. You have made 5 read/research calls',
    );
  });

  test('ignores non-orchestrator sessions', async () => {
    const hook = createReadBudgetHook({
      shouldCheck: (sessionID) => sessionID === 'orchestrator-session',
    });

    for (let index = 0; index < 5; index += 1) {
      const output = createOutput(`read ${index}`);
      await hook['tool.execute.before'](
        { tool: 'read', sessionID: 'builder-session' },
        output,
      );

      expect(output.output).toBe(`read ${index}`);
      expect(output.is_denied).toBe(false);
    }

    expect(logMock).not.toHaveBeenCalled();
  });
});
