import { describe, expect, test } from 'bun:test';
import { planDefaultManagedEntries } from './managed-entries';
import { applyManagedEntries, parseOpenCodeConfig } from './opencode-config';

describe('OpenCode config helpers', () => {
  test('parses empty or missing config into safe defaults', () => {
    expect(parseOpenCodeConfig('')).toEqual({});
    expect(parseOpenCodeConfig('{"plugin":[]}')).toEqual({ plugin: [] });
  });

  test('adds TGO managed entries without removing user entries', () => {
    const config = parseOpenCodeConfig(
      '{"plugin":["user-plugin"],"mcp":{"user-mcp":{"type":"local","command":["echo","ok"]}},"provider":{"anthropic":{}}}',
    );

    const result = applyManagedEntries(config, planDefaultManagedEntries());

    expect(result.config.plugin).toContain('user-plugin');
    expect(result.config.plugin).toContain(
      'trans-genderian-orchestra@2.0.0-beta.0',
    );
    expect(result.config.plugin).toContain('opencode-beads@0.7.0');
    expect(result.config.mcp?.['user-mcp']).toEqual({
      type: 'local',
      command: ['echo', 'ok'],
    });
    expect(result.config.mcp?.['tgo-websearch']).toBeDefined();
    expect(result.config.default_agent).toBe('tgo-orchestrator');
    expect(result.warnings).toEqual([]);
  });

  test('warns before replacing existing default_agent', () => {
    const config = parseOpenCodeConfig('{"default_agent":"my-agent"}');

    const result = applyManagedEntries(config, planDefaultManagedEntries());

    expect(result.config.default_agent).toBe('tgo-orchestrator');
    expect(result.warnings).toEqual([
      {
        code: 'default-agent-conflict',
        message: 'default_agent will change from my-agent to tgo-orchestrator.',
        severity: 'warning',
      },
    ]);
  });
});
