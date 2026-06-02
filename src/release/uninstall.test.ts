import { describe, expect, test } from 'bun:test';
import type { TgoManifest } from '../manifest/schema';
import { removeTgoManagedConfigEntries } from './uninstall';

function manifest(): TgoManifest {
  return {
    schema_version: 1,
    package: { name: 'trans-genderian-orchestra', version: '2.0.0-beta.0' },
    active_presets: {
      tools: 'default',
      models: 'balanced',
      resilience: 'balanced',
    },
    managed_config: [
      { kind: 'plugin', key: 'plugin.trans-genderian-orchestra@2.0.0-beta.0' },
      { kind: 'agent', key: 'agent.tgo-builder' },
      { kind: 'mcp', key: 'mcp.tgo-websearch' },
      { kind: 'default_agent', key: 'default_agent' },
    ],
    tools: [],
    backups: [],
    ignored_warnings: [],
  };
}

describe('TGO managed uninstall helpers', () => {
  test('removes only manifest-owned config entries', () => {
    const config = {
      plugin: ['trans-genderian-orchestra@2.0.0-beta.0', 'user-plugin'],
      agent: { 'tgo-builder': {}, 'user-agent': {} },
      mcp: { 'tgo-websearch': {}, 'user-mcp': {} },
      provider: { custom: {} },
      default_agent: 'tgo-orchestrator',
    };

    const result = removeTgoManagedConfigEntries(config, manifest());

    expect(result.config.plugin).toEqual(['user-plugin']);
    expect(result.config.agent).toEqual({ 'user-agent': {} });
    expect(result.config.mcp).toEqual({ 'user-mcp': {} });
    expect(result.config.provider).toEqual({ custom: {} });
    expect(result.config.default_agent).toBeUndefined();
    expect(result.removed_keys).toEqual([
      'plugin.trans-genderian-orchestra@2.0.0-beta.0',
      'agent.tgo-builder',
      'mcp.tgo-websearch',
      'default_agent',
    ]);
  });

  test('does not remove matching user entries when manifest does not own them', () => {
    const result = removeTgoManagedConfigEntries(
      { plugin: ['user-plugin'], agent: { 'tgo-builder': {} } },
      { ...manifest(), managed_config: [] },
    );

    expect(result.config.plugin).toEqual(['user-plugin']);
    expect(result.config.agent?.['tgo-builder']).toEqual({});
    expect(result.removed_keys).toEqual([]);
  });
});
