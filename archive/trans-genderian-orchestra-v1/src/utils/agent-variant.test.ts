import { describe, expect, test } from 'bun:test';
import type { PluginConfig } from '../config';
import {
  applyAgentVariant,
  normalizeAgentName,
  resolveAgentVariant,
  resolveRuntimeAgentName,
  rewriteDisplayNameMentions,
} from './agent-variant';

describe('normalizeAgentName', () => {
  test('returns name unchanged if no @ prefix', () => {
    expect(normalizeAgentName('reviewer')).toBe('reviewer');
  });

  test('strips @ prefix from agent name', () => {
    expect(normalizeAgentName('@reviewer')).toBe('reviewer');
  });

  test('trims whitespace', () => {
    expect(normalizeAgentName('  reviewer  ')).toBe('reviewer');
  });

  test('handles @ prefix with whitespace', () => {
    expect(normalizeAgentName('  @explore  ')).toBe('explore');
  });

  test('handles empty string', () => {
    expect(normalizeAgentName('')).toBe('');
  });
});

describe('resolveAgentVariant', () => {
  test('returns undefined when config is undefined', () => {
    expect(resolveAgentVariant(undefined, 'reviewer')).toBeUndefined();
  });

  test('returns undefined when agents is undefined', () => {
    const config = {} as PluginConfig;
    expect(resolveAgentVariant(config, 'reviewer')).toBeUndefined();
  });

  test('returns undefined when agent has no variant', () => {
    const config = {
      agents: {
        reviewer: { model: 'gpt-4' },
      },
    } as PluginConfig;
    expect(resolveAgentVariant(config, 'reviewer')).toBeUndefined();
  });

  test('returns variant when configured', () => {
    const config = {
      agents: {
        reviewer: { variant: 'high' },
      },
    } as PluginConfig;
    expect(resolveAgentVariant(config, 'reviewer')).toBe('high');
  });

  test('normalizes agent name with @ prefix', () => {
    const config = {
      agents: {
        reviewer: { variant: 'low' },
      },
    } as PluginConfig;
    expect(resolveAgentVariant(config, '@reviewer')).toBe('low');
  });

  test('returns undefined for empty string variant', () => {
    const config = {
      agents: {
        reviewer: { variant: '' },
      },
    } as PluginConfig;
    expect(resolveAgentVariant(config, 'reviewer')).toBeUndefined();
  });

  test('returns undefined for whitespace-only variant', () => {
    const config = {
      agents: {
        reviewer: { variant: '   ' },
      },
    } as PluginConfig;
    expect(resolveAgentVariant(config, 'reviewer')).toBeUndefined();
  });

  test('trims variant whitespace', () => {
    const config = {
      agents: {
        reviewer: { variant: '  medium  ' },
      },
    } as PluginConfig;
    expect(resolveAgentVariant(config, 'reviewer')).toBe('medium');
  });

  test('returns undefined for non-string variant', () => {
    const config = {
      agents: {
        reviewer: { variant: 123 as unknown as string },
      },
    } as PluginConfig;
    expect(resolveAgentVariant(config, 'reviewer')).toBeUndefined();
  });

  test('resolves displayName alias to internal agent for variant lookup', () => {
    const config = {
      agents: {
        reviewer: { displayName: 'advisor', variant: 'high' },
      },
    } as PluginConfig;
    expect(resolveAgentVariant(config, '@advisor')).toBe('high');
  });
});

describe('resolveRuntimeAgentName', () => {
  test('keeps internal agent names unchanged', () => {
    const config = {
      agents: {
        reviewer: { displayName: 'advisor' },
      },
    } as PluginConfig;

    expect(resolveRuntimeAgentName(config, 'reviewer')).toBe('reviewer');
  });

  test('resolves displayName to internal name', () => {
    const config = {
      agents: {
        reviewer: { displayName: 'advisor' },
      },
    } as PluginConfig;

    expect(resolveRuntimeAgentName(config, 'advisor')).toBe('reviewer');
  });

  test('resolves displayName with @ prefix and whitespace', () => {
    const config = {
      agents: {
        reviewer: { displayName: 'advisor' },
      },
    } as PluginConfig;

    expect(resolveRuntimeAgentName(config, '  @advisor  ')).toBe('reviewer');
  });

  test('resolves displayName configured via current alias key', () => {
    const config = {
      agents: {
        research: { displayName: 'field-researcher' },
      },
    } as PluginConfig;

    expect(resolveRuntimeAgentName(config, 'field-researcher')).toBe(
      'researcher',
    );
  });

  test('returns normalized name when no displayName match exists', () => {
    const config = {
      agents: {
        reviewer: { displayName: 'advisor' },
      },
    } as PluginConfig;

    expect(resolveRuntimeAgentName(config, '  @unknown  ')).toBe('unknown');
  });
});

describe('rewriteDisplayNameMentions', () => {
  test('rewrites displayName mentions to internal names for direct invocation', () => {
    const config = {
      agents: {
        reviewer: { displayName: 'advisor' },
      },
    } as PluginConfig;

    expect(rewriteDisplayNameMentions(config, 'ask @advisor about this')).toBe(
      'ask @reviewer about this',
    );
  });

  test('keeps internal mentions working while rewriting aliases', () => {
    const config = {
      agents: {
        reviewer: { displayName: 'advisor' },
      },
    } as PluginConfig;

    expect(
      rewriteDisplayNameMentions(config, 'compare @advisor with @reviewer'),
    ).toBe('compare @reviewer with @reviewer');
  });

  test('does not rewrite embedded text such as email addresses', () => {
    const config = {
      agents: {
        reviewer: { displayName: 'advisor' },
      },
    } as PluginConfig;

    expect(
      rewriteDisplayNameMentions(
        config,
        'email foo@advisor.com and ask @advisor directly',
      ),
    ).toBe('email foo@advisor.com and ask @reviewer directly');
  });

  test('resolves custom agents by displayName for variant/runtime lookups', () => {
    const config = {
      agents: {
        'custom-advisor': {
          displayName: 'advisor',
          variant: 'high',
          model: 'openai/gpt-5.5',
        },
      },
    } as PluginConfig;

    expect(resolveRuntimeAgentName(config, '@advisor')).toBe('custom-advisor');
    expect(rewriteDisplayNameMentions(config, 'ask @advisor for details')).toBe(
      'ask @custom-advisor for details',
    );
    expect(resolveAgentVariant(config, '@advisor')).toBe('high');
  });
});

describe('applyAgentVariant', () => {
  test('returns body unchanged when variant is undefined', () => {
    const body = { agent: 'reviewer', parts: [] };
    const result = applyAgentVariant(undefined, body);
    expect(result).toEqual(body);
    expect(result).toBe(body); // Same reference
  });

  test('returns body unchanged when body already has variant', () => {
    const body = { agent: 'reviewer', variant: 'medium', parts: [] };
    const result = applyAgentVariant('high', body);
    expect(result.variant).toBe('medium');
    expect(result).toBe(body); // Same reference
  });

  test('applies variant to body without variant', () => {
    const body = { agent: 'reviewer', parts: [] };
    const result = applyAgentVariant('high', body);
    expect(result.variant).toBe('high');
    expect(result.agent).toBe('reviewer');
    expect(result).not.toBe(body); // New object
  });

  test('preserves all existing body properties', () => {
    const body = {
      agent: 'reviewer',
      parts: [{ type: 'text' as const, text: 'hello' }],
      tools: { task: false },
    };
    const result = applyAgentVariant('low', body);
    expect(result.agent).toBe('reviewer');
    expect(result.parts).toEqual([{ type: 'text', text: 'hello' }]);
    expect(result.tools).toEqual({ task: false });
    expect(result.variant).toBe('low');
  });
});
