import { describe, expect, test } from 'bun:test';
import { createMemoryFileSystem } from '../filesystem/memory-adapter';
import { runDoctor } from './doctor';

describe('doctor command', () => {
  test('reports missing manifest and missing tools without writing files', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/opencode.jsonc': '{}',
    });

    const result = await runDoctor({
      fs,
      homeDir: '/home/user',
      detector: {
        async which() {
          return undefined;
        },
      },
    });

    expect(result.command).toBe('doctor');
    expect(result.mode).toBe('read-only');
    expect(result.planned_actions).toEqual([
      {
        id: 'create-global-manifest',
        title: 'Create missing global TGO manifest',
        target: '/home/user/.config/opencode/tgo/manifest.jsonc',
        action: 'create',
        requires_confirmation: true,
      },
    ]);
    expect(result.changes_applied).toEqual([]);
    expect(result.blocked_capabilities[0]?.capability).toBe('beads');
    expect(result.degraded_capabilities[0]?.capability).toBe('context7-cli');
    expect(
      await fs.exists('/home/user/.config/opencode/tgo/manifest.jsonc'),
    ).toBe(false);
  });

  test('reports raw secret-like values in current config as warnings', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/opencode.jsonc':
        '{"mcp":{"github":{"headers":{"Authorization":"Bearer ghp_1234567890abcdef1234567890abcdef1234"}}}}',
      '/home/user/.config/opencode/tgo/manifest.jsonc': '{"schema_version":1}',
    });

    const result = await runDoctor({
      fs,
      homeDir: '/home/user',
      detector: {
        async which(command) {
          return command === 'git' ? '/usr/bin/git' : undefined;
        },
      },
    });

    expect(result.warnings).toContainEqual({
      code: 'secret-like-config-value',
      message:
        'OpenCode config contains secret-like values; rotate exposed tokens and replace with env references.',
      severity: 'error',
    });
  });

  test('reports missing managed TGO agents without writing files', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/tgo/manifest.jsonc': JSON.stringify({
        package: { name: 'trans-genderian-orchestra', version: '2.0.0-beta.0' },
        active_presets: {
          tools: 'default',
          models: 'balanced',
          resilience: 'balanced',
        },
        managed_config: [{ kind: 'agent', key: 'agent.tgo-builder' }],
        tools: [],
        backups: [],
        ignored_warnings: [],
        last_verified_at: null,
      }),
      '/home/user/.config/opencode/opencode.jsonc': JSON.stringify({
        agent: {
          'tgo-orchestrator': {
            description: 'Present',
            mode: 'primary',
            prompt: 'Present.',
          },
        },
      }),
    });

    const result = await runDoctor({
      fs,
      homeDir: '/home/user',
      detector: {
        async which(command) {
          return command === 'git' ? '/usr/bin/git' : undefined;
        },
      },
    });

    expect(result.warnings.map((warning) => warning.code)).toContain(
      'missing-managed-agent',
    );
    expect(
      result.warnings.some((warning) =>
        warning.message.includes('tgo-builder'),
      ),
    ).toBe(true);
    expect(
      await fs.readText('/home/user/.config/opencode/opencode.jsonc'),
    ).toContain('tgo-orchestrator');
  });
});
