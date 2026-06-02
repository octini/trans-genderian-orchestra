import { describe, expect, test } from 'bun:test';
import { createMemoryFileSystem } from '../filesystem/memory-adapter';
import { runUninstall } from './uninstall';

const manifestText = JSON.stringify({
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
});

describe('uninstall command', () => {
  test('dry-run previews managed removals without writing files', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/tgo/manifest.jsonc': manifestText,
      '/home/user/.config/opencode/opencode.jsonc': JSON.stringify({
        plugin: ['trans-genderian-orchestra@2.0.0-beta.0', 'user-plugin'],
        agent: { 'tgo-builder': {}, 'user-agent': {} },
        mcp: { 'tgo-websearch': {}, 'user-mcp': {} },
        default_agent: 'tgo-orchestrator',
      }),
    });

    const result = await runUninstall({
      fs,
      homeDir: '/home/user',
      mode: 'dry-run',
      operationId: 'uninstall-1',
      timestamp: '2026-06-02T10-00-00-000Z',
    });

    expect(result.planned_actions.map((action) => action.id)).toEqual([
      'remove-tgo-managed-config',
    ]);
    expect(result.changes_applied).toEqual([]);
    expect(
      await fs.readText('/home/user/.config/opencode/opencode.jsonc'),
    ).toContain('trans-genderian-orchestra@2.0.0-beta.0');
  });

  test('apply backs up config, removes managed entries, and preserves user entries', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/tgo/manifest.jsonc': manifestText,
      '/home/user/.config/opencode/opencode.jsonc': JSON.stringify({
        plugin: ['trans-genderian-orchestra@2.0.0-beta.0', 'user-plugin'],
        agent: { 'tgo-builder': {}, 'user-agent': {} },
        mcp: { 'tgo-websearch': {}, 'user-mcp': {} },
        default_agent: 'tgo-orchestrator',
      }),
    });

    const result = await runUninstall({
      fs,
      homeDir: '/home/user',
      mode: 'apply',
      operationId: 'uninstall-2',
      timestamp: '2026-06-02T10-00-00-000Z',
    });

    expect(result.backups_created).toHaveLength(1);
    expect(result.restart_required).toBe(true);
    const config = JSON.parse(
      await fs.readText('/home/user/.config/opencode/opencode.jsonc'),
    );
    expect(config.plugin).toEqual(['user-plugin']);
    expect(config.agent).toEqual({ 'user-agent': {} });
    expect(config.mcp).toEqual({ 'user-mcp': {} });
    expect(config.default_agent).toBeUndefined();
  });
});
