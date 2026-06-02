import { describe, expect, test } from 'bun:test';
import { createMemoryFileSystem } from '../filesystem/memory-adapter';
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
      detector: {
        async which() {
          return undefined;
        },
      },
    });

    expect(result.planned_actions.map((action) => action.id)).toEqual([
      'register-tgo-plugin',
      'register-opencode-beads',
      'register-aft',
      'register-tgo-websearch',
      'register-tgo-grep-app',
      'set-default-agent',
    ]);
    expect(result.changes_applied).toEqual([]);
    expect(await fs.readText('/home/user/.config/opencode/opencode.jsonc')).toBe(
      '{"plugin":["user-plugin"]}',
    );
    expect(result.blocked_capabilities[0]?.capability).toBe('beads');
    expect(result.degraded_capabilities[0]?.capability).toBe('context7-cli');
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

    const manifest = JSON.parse(
      await fs.readText('/home/user/.config/opencode/tgo/manifest.jsonc'),
    );
    expect(manifest.backups).toHaveLength(1);
    expect(
      manifest.managed_config.map((entry: { key: string }) => entry.key),
    ).toContain('agent.tgo-orchestrator');
  });
});
