import { describe, expect, test } from 'bun:test';
import { createMemoryFileSystem } from '../filesystem/memory-adapter';
import { TGO_AGENT_IDS } from '../plugin/agent-ids';
import { runBootstrap } from './bootstrap';

describe('bootstrap command', () => {
  test('dry-run plans default managed entries and writes nothing', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/opencode.jsonc':
        '{"plugin":["user-plugin"]}',
    });

    const result = await runBootstrap({
      fs,
      homeDir: '/home/user',
      mode: 'dry-run',
      operationId: 'op-1',
      timestamp: '2026-06-02T10-00-00-000Z',
      tools: 'default',
      detector: {
        async which() {
          return undefined;
        },
      },
    });

    expect(result.planned_actions.map((action) => action.id)).toEqual([
      'register-trans-genderian-orchestra',
      'register-opencode-beads',
      'register-aft',
      'register-tgo-websearch',
      'register-tgo-grep-app',
      'set-default-agent',
    ]);
    expect(result.changes_applied).toEqual([]);
    expect(
      await fs.readText('/home/user/.config/opencode/opencode.jsonc'),
    ).toBe('{"plugin":["user-plugin"]}');
    expect(
      result.blocked_capabilities.map((capability) => capability.capability),
    ).toContain('beads');
    expect(
      result.degraded_capabilities.map((capability) => capability.capability),
    ).toContain('context7-cli');
  });

  test('apply creates backup before writing config and manifest', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/opencode.jsonc':
        '{"plugin":["user-plugin"]}',
    });

    const result = await runBootstrap({
      fs,
      homeDir: '/home/user',
      mode: 'apply',
      operationId: 'op-2',
      timestamp: '2026-06-02T10-00-00-000Z',
      tools: 'default',
      detector: {
        async which(command) {
          return command === 'git' ? '/usr/bin/git' : undefined;
        },
      },
    });

    expect(result.backups_created).toHaveLength(1);
    expect(result.backups_created[0]?.source_path).toBe(
      '/home/user/.config/opencode/opencode.jsonc',
    );
    expect(result.restart_required).toBe(true);

    const config = JSON.parse(
      await fs.readText('/home/user/.config/opencode/opencode.jsonc'),
    );
    expect(config.plugin).toContain('user-plugin');
    expect(config.plugin).toContain('trans-genderian-orchestra@2.0.0-beta.0');
    expect(config.default_agent).toBe('tgo-orchestrator');
    for (const agentId of TGO_AGENT_IDS) {
      expect(config.agent[agentId]).toBeDefined();
    }

    const manifest = JSON.parse(
      await fs.readText('/home/user/.config/opencode/tgo/manifest.jsonc'),
    );
    expect(manifest.backups).toHaveLength(1);
    const managedConfigKeys = manifest.managed_config.map(
      (entry: { key: string }) => entry.key,
    );
    expect(managedConfigKeys).toContain('agent.tgo-orchestrator');
    expect(managedConfigKeys).toContain('agent.tgo-builder');
    expect(managedConfigKeys).toContain('agent.tgo-reviewer');
  });

  test('dry-run honors bare-bones tool preset without remote MCP actions', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/opencode.jsonc':
        '{"plugin":["user-plugin"],"mcp":{"user-mcp":{"type":"remote"}}}',
    });

    const result = await runBootstrap({
      fs,
      homeDir: '/home/user',
      mode: 'dry-run',
      operationId: 'op-bare',
      timestamp: '2026-06-02T10-00-00-000Z',
      tools: 'bare-bones',
      detector: {
        async which(command) {
          return command === 'git' || command === 'bd'
            ? `/usr/bin/${command}`
            : undefined;
        },
      },
    });

    expect(result.planned_actions.map((action) => action.id)).not.toContain(
      'register-tgo-websearch',
    );
    expect(result.planned_actions.map((action) => action.id)).not.toContain(
      'register-tgo-grep-app',
    );
    expect(result.degraded_capabilities).toEqual([]);
    expect(
      await fs.readText('/home/user/.config/opencode/opencode.jsonc'),
    ).toContain('user-mcp');
  });

  test('apply records all-bells preset and preserves models and resilience presets', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/opencode.jsonc':
        '{"plugin":["user-plugin"],"provider":{"custom":{}},"mcp":{"user-mcp":{"type":"remote"}}}',
    });

    const result = await runBootstrap({
      fs,
      homeDir: '/home/user',
      mode: 'apply',
      operationId: 'op-all',
      timestamp: '2026-06-02T10-00-00-000Z',
      tools: 'all-bells',
      detector: {
        async which(command) {
          return ['git', 'bd', 'ctx7'].includes(command)
            ? `/usr/bin/${command}`
            : undefined;
        },
      },
    });

    expect(
      result.degraded_capabilities.map((capability) => capability.capability),
    ).toEqual(['aft', 'github-cli', 'serena']);

    const config = JSON.parse(
      await fs.readText('/home/user/.config/opencode/opencode.jsonc'),
    );
    expect(config.mcp['user-mcp']).toEqual({ type: 'remote' });
    expect(config.provider).toEqual({ custom: {} });
    expect(config.mcp['tgo-github']).toBeDefined();
    expect(config.mcp['tgo-serena']).toBeDefined();

    const manifest = JSON.parse(
      await fs.readText('/home/user/.config/opencode/tgo/manifest.jsonc'),
    );
    expect(manifest.active_presets).toEqual({
      tools: 'all-bells',
      models: 'balanced',
      resilience: 'balanced',
    });
  });
});
