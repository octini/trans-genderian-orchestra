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
});
