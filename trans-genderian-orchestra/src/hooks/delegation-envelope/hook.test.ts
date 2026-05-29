import { beforeEach, describe, expect, mock, test } from 'bun:test';

const logMock = mock(() => {});

mock.module('../../utils/logger', () => ({
  log: logMock,
}));

import { createDelegationEnforcementHook } from './hook';

describe('delegation envelope enforcement hook', () => {
  beforeEach(() => {
    logMock.mockClear();
  });

  test('log mode logs missing envelope without modifying task prompt', async () => {
    const hook = createDelegationEnforcementHook(
      new Map([['session-1', 'orchestrator']]),
      { enforcementMode: 'log' },
    );
    const prompt = 'Delegate this task without an envelope';
    const output = { args: { prompt } };

    await hook['tool.execute.before'](
      { tool: 'task', sessionID: 'session-1', callID: 'call-1' },
      output,
    );

    expect(output.args.prompt).toBe(prompt);
    expect(output.is_denied).toBeUndefined();
    expect(logMock).toHaveBeenCalledWith(
      '[delegation-enforcement] orchestrator delegated without envelope',
      {
        sessionID: 'session-1',
        enforcementMode: 'log',
        errorType: 'delegation_envelope_missing_envelope',
        issues: ['missing <delegation_envelope> block'],
        promptPreview: 'Delegate this task without an envelope',
      },
    );
    expect(output.errorType).toBe('delegation_envelope_missing_envelope');
    expect(output.error_type).toBe('delegation_envelope_missing_envelope');
    expect(output.metadata).toEqual({
      delegationEnvelope: {
        errorType: 'delegation_envelope_missing_envelope',
        issues: ['missing <delegation_envelope> block'],
      },
    });
  });

  test('warn-inject mode injects corrective guidance with parser issues', async () => {
    const hook = createDelegationEnforcementHook(
      new Map([['session-1', 'orchestrator']]),
      { enforcementMode: 'warn-inject' },
    );
    const prompt = [
      '<delegation_envelope>{"task":"Missing required fields"}</delegation_envelope>',
      'Do the delegated work.',
    ].join('\n\n');
    const output = { args: { prompt } };

    await hook['tool.execute.before'](
      { tool: 'task', sessionID: 'session-1', callID: 'call-1' },
      output,
    );

    expect(output.is_denied).toBeUndefined();
    expect(output.args.prompt).toContain(
      '[SYSTEM: Delegation envelope enforcement warning]',
    );
    expect(output.args.prompt).toContain('Envelope parser issues:');
    expect(output.args.prompt).toContain(
      '- verbatim_request: Invalid input: expected string, received undefined',
    );
    expect(output.args.prompt).toContain(
      '- acceptance_criteria: Invalid input: expected array, received undefined',
    );
    expect(output.args.prompt).toContain(prompt);
    expect(logMock).toHaveBeenCalledWith(
      '[delegation-enforcement] orchestrator delegated without envelope',
      expect.objectContaining({
        sessionID: 'session-1',
        enforcementMode: 'warn-inject',
        errorType: 'delegation_envelope_schema_validation',
        issues: expect.arrayContaining([
          'verbatim_request: Invalid input: expected string, received undefined',
        ]),
      }),
    );
  });

  test('warn-inject mode is the default', async () => {
    const hook = createDelegationEnforcementHook(
      new Map([['session-1', 'orchestrator']]),
    );
    const prompt = 'Delegate this task without an envelope';
    const output = { args: { prompt } };

    await hook['tool.execute.before'](
      { tool: 'task', sessionID: 'session-1', callID: 'call-1' },
      output,
    );

    expect(output.is_denied).toBeUndefined();
    expect(output.args.prompt).toContain(
      '[SYSTEM: Delegation envelope enforcement warning]',
    );
    expect(output.args.prompt).toContain(
      '- missing <delegation_envelope> block',
    );
    expect(output.args.prompt).toContain(prompt);
  });

  test('deny mode blocks missing envelope and surfaces parser issues', async () => {
    const hook = createDelegationEnforcementHook(
      new Map([['session-1', 'orchestrator']]),
      { enforcementMode: 'deny' },
    );
    const prompt = [
      '<delegation_envelope>{"task":"Missing required fields"}</delegation_envelope>',
      'Do the delegated work.',
    ].join('\n\n');
    const output = { args: { prompt }, is_denied: false, output: undefined };

    await hook['tool.execute.before'](
      { tool: 'task', sessionID: 'session-1', callID: 'call-1' },
      output,
    );

    expect(output.args.prompt).toBe(prompt);
    expect(output.is_denied).toBe(true);
    expect(output.output).toContain('[DELEGATION ENVELOPE DENIED]');
    expect(output.output).toContain('Envelope parser issues:');
    expect(output.output).toContain(
      '- verbatim_request: Invalid input: expected string, received undefined',
    );
    expect(output.output).toContain(
      '- acceptance_criteria: Invalid input: expected array, received undefined',
    );
  });

  test('valid envelope passes without logging or modification', async () => {
    const hook = createDelegationEnforcementHook(
      new Map([['session-1', 'orchestrator']]),
      { enforcementMode: 'deny' },
    );
    const prompt = [
      '<delegation_envelope>',
      JSON.stringify({
        verbatim_request: 'Implement configurable envelope enforcement.',
        task: 'Update hook behavior.',
        acceptance_criteria: ['All modes are supported.'],
        context_summary: 'Tests cover enforcement behavior.',
        file_references: [],
        risk_tier: 'low',
      }),
      '</delegation_envelope>',
      'Do the delegated work.',
    ].join('');
    const output = { args: { prompt }, is_denied: false };

    await hook['tool.execute.before'](
      { tool: 'task', sessionID: 'session-1', callID: 'call-1' },
      output,
    );

    expect(output.args.prompt).toBe(prompt);
    expect(output.is_denied).toBe(false);
    expect(logMock).not.toHaveBeenCalled();
  });

  test('valid envelope wrapped in markdown JSON fences passes', async () => {
    const hook = createDelegationEnforcementHook(
      new Map([['session-1', 'orchestrator']]),
      { enforcementMode: 'deny' },
    );
    const prompt = [
      '<delegation_envelope>\n',
      '```json\n',
      JSON.stringify({
        verbatim_request: 'Implement configurable envelope enforcement.',
        task: 'Update hook behavior.',
        acceptance_criteria: ['All modes are supported.'],
        context_summary: 'Tests cover enforcement behavior.',
        file_references: [],
        risk_tier: 'low',
      }),
      '\n```\n',
      '</delegation_envelope>',
      'Do the delegated work.',
    ].join('');
    const output = { args: { prompt }, is_denied: false };

    await hook['tool.execute.before'](
      { tool: 'task', sessionID: 'session-1', callID: 'call-1' },
      output,
    );

    expect(output.args.prompt).toBe(prompt);
    expect(output.is_denied).toBe(false);
    expect(logMock).not.toHaveBeenCalled();
  });

  test('deny mode wraps invalid JSON with a typed envelope error', async () => {
    const hook = createDelegationEnforcementHook(
      new Map([['session-1', 'orchestrator']]),
      { enforcementMode: 'deny' },
    );
    const prompt = '<delegation_envelope>{not-json}</delegation_envelope>';
    const output = { args: { prompt }, is_denied: false, output: undefined };

    await hook['tool.execute.before'](
      { tool: 'task', sessionID: 'session-1', callID: 'call-1' },
      output,
    );

    expect(output.is_denied).toBe(true);
    expect(output.output).toContain('[DELEGATION ENVELOPE DENIED]');
    expect(output.output).toContain('- invalid JSON:');
    expect(output.errorType).toBe('delegation_envelope_invalid_json');
    expect(output.error_type).toBe('delegation_envelope_invalid_json');
    expect(output.metadata).toEqual({
      delegationEnvelope: {
        errorType: 'delegation_envelope_invalid_json',
        issues: [expect.stringContaining('invalid JSON:')],
      },
    });
    expect(logMock).toHaveBeenCalledWith(
      '[delegation-enforcement] orchestrator delegated without envelope',
      expect.objectContaining({
        errorType: 'delegation_envelope_invalid_json',
        issues: [expect.stringContaining('invalid JSON:')],
      }),
    );
  });
});
