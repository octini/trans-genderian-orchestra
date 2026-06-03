import { describe, expect, test } from 'bun:test';
import { detectPresetTools } from './detect';

function detectorWith(commands: Record<string, string | undefined>) {
  return {
    async which(command: string) {
      return commands[command];
    },
  };
}

describe('preset-aware tool detection', () => {
  test('default degrades AFT and Context7 without blocking base install', async () => {
    const result = await detectPresetTools(
      'default',
      detectorWith({
        git: '/usr/bin/git',
        bd: '/opt/bin/bd',
      }),
    );

    expect(result.blocked).toEqual([]);
    expect(result.degraded).toContainEqual({
      capability: 'context7-cli',
      reason: 'Context7 CLI is missing.',
      repair_command: 'npx ctx7 setup --opencode',
    });
    expect(result.degraded).toContainEqual({
      capability: 'aft',
      reason: 'AFT peer plugin is not detectable in the current environment.',
      repair_command:
        'Run bootstrap/setup with the default tools preset after reviewing the preview.',
    });
  });

  test('default accepts Context7 OpenCode setup evidence without ctx7 binary', async () => {
    const result = await detectPresetTools(
      'default',
      detectorWith({
        git: '/usr/bin/git',
        bd: '/opt/bin/bd',
      }),
      { context7SetupConfigured: true },
    );

    expect(result.blocked).toEqual([]);
    expect(result.degraded).not.toContainEqual({
      capability: 'context7-cli',
      reason: 'Context7 CLI is missing.',
      repair_command: 'npx ctx7 setup --opencode',
    });
    expect(result.tools).toContainEqual({
      name: 'ctx7',
      status: 'user-managed',
      path: 'opencode-setup:context7-find-docs',
    });
  });

  test('bare-bones does not require Context7 AFT GitHub or Serena', async () => {
    const result = await detectPresetTools(
      'bare-bones',
      detectorWith({
        git: '/usr/bin/git',
        bd: '/opt/bin/bd',
      }),
    );

    expect(result.blocked).toEqual([]);
    expect(result.degraded).toEqual([]);
    expect(result.tools.map((tool) => tool.name).sort()).toEqual(['bd', 'git']);
  });

  test('all-bells reports missing GitHub and Serena as degraded optional capabilities', async () => {
    const result = await detectPresetTools(
      'all-bells',
      detectorWith({
        git: '/usr/bin/git',
        bd: '/opt/bin/bd',
        ctx7: '/opt/bin/ctx7',
      }),
    );

    expect(result.blocked).toEqual([]);
    expect(result.degraded.map((capability) => capability.capability)).toEqual([
      'aft',
      'github-cli',
      'serena',
    ]);
  });
});
