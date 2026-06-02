import { describe, expect, test } from 'bun:test';
import { applyManagedEntries } from '../config/opencode-config';
import { findSecretLikeValues } from '../security/secrets';
import { createManagedEntriesForToolPreset } from './managed';

describe('tool preset managed entries', () => {
  test('bare-bones registers no remote MCPs', () => {
    const entries = createManagedEntriesForToolPreset('bare-bones');

    expect(entries.plugins).toContain('trans-genderian-orchestra@2.0.0-beta.0');
    expect(entries.plugins).toContain('opencode-beads@0.7.0');
    expect(entries.plugins).not.toContain(
      'aft@0.0.0-pinned-after-verification',
    );
    expect(entries.mcps).toEqual({});
  });

  test('default registers AFT and Researcher-limited websearch and grep_app MCPs', () => {
    const entries = createManagedEntriesForToolPreset('default');

    expect(entries.plugins).toContain('aft@0.0.0-pinned-after-verification');
    expect(entries.mcps['tgo-websearch']).toMatchObject({
      enabled: true,
      allowed_agents: ['tgo-researcher'],
    });
    expect(entries.mcps['tgo-grep-app']).toMatchObject({
      enabled: true,
      allowed_agents: ['tgo-researcher'],
    });
    expect(entries.mcps['tgo-context7']).toBeUndefined();
  });

  test('all-bells registers optional GitHub and Serena MCPs', () => {
    const entries = createManagedEntriesForToolPreset('all-bells');

    expect(Object.keys(entries.mcps).sort()).toEqual([
      'tgo-github',
      'tgo-grep-app',
      'tgo-serena',
      'tgo-websearch',
    ]);
    expect(entries.mcps['tgo-github']).toMatchObject({
      allowed_agents: ['tgo-researcher', 'tgo-reviewer'],
    });
  });

  test('preset merge preserves user-managed plugins providers and MCPs', () => {
    const existing = {
      plugin: ['user-plugin'],
      provider: { custom: { npm: '@custom/provider' } },
      mcp: { 'user-mcp': { type: 'remote', url: 'https://example.com' } },
      agent: { 'user-agent': { description: 'User agent' } },
    };

    const result = applyManagedEntries(
      existing,
      createManagedEntriesForToolPreset('default'),
    );

    expect(result.config.plugin).toContain('user-plugin');
    expect(result.config.provider).toEqual(existing.provider);
    expect(result.config.mcp?.['user-mcp']).toEqual(existing.mcp['user-mcp']);
    expect(result.config.agent?.['user-agent']).toEqual(
      existing.agent['user-agent'],
    );
    expect(result.config.mcp?.['tgo-websearch']).toBeDefined();
  });

  test('managed MCP config contains only env references and no raw secrets', () => {
    const entries = createManagedEntriesForToolPreset('all-bells');
    const serialized = JSON.stringify(entries.mcps);

    expect(findSecretLikeValues(serialized)).toEqual([]);
    expect(serialized).toContain('{env:EXA_API_KEY}');
    expect(serialized).toContain('{env:GITHUB_PERSONAL_ACCESS_TOKEN}');
  });
});
