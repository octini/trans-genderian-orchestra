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
    expect(
      result.blocked_capabilities.map((capability) => capability.capability),
    ).toContain('beads');
    expect(
      result.degraded_capabilities.map((capability) => capability.capability),
    ).toContain('context7-cli');
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

  test('accepts TGO-managed agents from the standalone TGO config catalog', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/tgo/manifest.jsonc': JSON.stringify({
        package: { name: 'trans-genderian-orchestra', version: '2.0.0-beta.0' },
        active_presets: {
          tools: 'default',
          models: 'balanced',
          resilience: 'balanced',
        },
        managed_config: [
          { kind: 'agent', key: 'tgo_config.agent.tgo-orchestrator' },
        ],
        tools: [],
        backups: [],
        ignored_warnings: [],
        last_verified_at: null,
      }),
      '/home/user/.config/opencode/opencode.jsonc': JSON.stringify({
        plugin: ['trans-genderian-orchestra@2.0.0-beta.0'],
        default_agent: 'tgo-orchestrator',
      }),
      '/home/user/.config/opencode/trans-genderian-orchestra.jsonc':
        JSON.stringify({
          agent: {
            'tgo-orchestrator': { mode: 'primary' },
            'tgo-researcher': { mode: 'subagent' },
            'tgo-builder': { mode: 'subagent' },
            'tgo-reviewer': { mode: 'subagent' },
            'tgo-council': { mode: 'subagent' },
            'tgo-councillor': { mode: 'subagent' },
          },
          modelPresets: {
            mixed: {
              roles: { 'tgo-builder': [{ id: 'github-copilot/gpt-5.5' }] },
            },
          },
        }),
    });

    const result = await runDoctor({
      fs,
      homeDir: '/home/user',
      detector: {
        async which(command) {
          return command === 'git' || command === 'bd'
            ? `/usr/bin/${command}`
            : undefined;
        },
      },
    });

    expect(result.warnings.map((warning) => warning.code)).not.toContain(
      'missing-managed-agent',
    );
    expect(result.warnings.map((warning) => warning.code)).not.toContain(
      'legacy-presets-alias',
    );
  });

  test('accepts the configured AFT OpenCode plugin without an aft CLI binary', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/tgo/manifest.jsonc': JSON.stringify({
        schema_version: 1,
        package: {
          name: 'trans-genderian-orchestra',
          version: '2.0.0-beta.0',
        },
        active_presets: {
          tools: 'default',
          models: 'balanced',
          resilience: 'balanced',
        },
        managed_config: [],
        tools: [],
        backups: [],
        ignored_warnings: [],
      }),
      '/home/user/.config/opencode/opencode.jsonc': JSON.stringify({
        plugin: ['@cortexkit/aft-opencode@latest'],
      }),
    });

    const result = await runDoctor({
      fs,
      homeDir: '/home/user',
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
    ).not.toContain('aft');
  });

  test('accepts the catalog AFT OpenCode plugin without an aft CLI binary', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/tgo/manifest.jsonc': JSON.stringify({
        schema_version: 1,
        package: {
          name: 'trans-genderian-orchestra',
          version: '2.0.0-beta.0',
        },
        active_presets: {
          tools: 'default',
          models: 'balanced',
          resilience: 'balanced',
        },
        managed_config: [],
        tools: [],
        backups: [],
        ignored_warnings: [],
      }),
      '/home/user/.config/opencode/trans-genderian-orchestra.jsonc':
        JSON.stringify({
          plugin: ['@cortexkit/aft-opencode@latest'],
        }),
    });

    const result = await runDoctor({
      fs,
      homeDir: '/home/user',
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
    ).not.toContain('aft');
  });

  test('accepts Context7 OpenCode setup artifacts without a ctx7 CLI binary', async () => {
    const baseFiles = {
      '/home/user/.config/opencode/tgo/manifest.jsonc': JSON.stringify({
        schema_version: 1,
        package: {
          name: 'trans-genderian-orchestra',
          version: '2.0.0-beta.0',
        },
        active_presets: {
          tools: 'default',
          models: 'balanced',
          resilience: 'balanced',
        },
        managed_config: [],
        tools: [],
        backups: [],
        ignored_warnings: [],
      }),
      '/home/user/.config/opencode/opencode.jsonc': JSON.stringify({
        plugin: ['@cortexkit/aft-opencode@latest'],
      }),
    };
    const setupCases = [
      {
        '/home/user/.agents/skills/find-docs/SKILL.md':
          '# find-docs\n\nUse ctx7 to find current documentation.',
      },
      {
        '/home/user/.config/opencode/AGENTS.md':
          'Use the `ctx7` CLI to fetch current documentation.',
      },
    ];

    for (const setupFiles of setupCases) {
      const fs = createMemoryFileSystem({ ...baseFiles, ...setupFiles });

      const result = await runDoctor({
        fs,
        homeDir: '/home/user',
        detector: {
          async which(command) {
            return command === 'git' || command === 'bd'
              ? `/usr/bin/${command}`
              : undefined;
          },
        },
      });

      expect(
        result.degraded_capabilities.map((capability) => capability.capability),
      ).not.toContain('context7-cli');
    }
  });

  test('reports user-managed MCPs as visible without mutating them', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/tgo/manifest.jsonc': JSON.stringify({
        schema_version: 1,
        package: {
          name: 'trans-genderian-orchestra',
          version: '2.0.0-beta.0',
        },
        active_presets: {
          tools: 'default',
          models: 'balanced',
          resilience: 'balanced',
        },
        managed_config: [{ kind: 'mcp', key: 'mcp.tgo-websearch' }],
        tools: [],
        backups: [],
        ignored_warnings: [],
      }),
      '/home/user/.config/opencode/opencode.jsonc': JSON.stringify({
        agent: {},
        mcp: {
          'user-search': { type: 'remote', url: 'https://example.com' },
          'tgo-websearch': { type: 'remote', url: 'https://mcp.exa.ai/mcp' },
        },
      }),
    });

    const result = await runDoctor({
      fs,
      homeDir: '/home/user',
      detector: {
        async which(command) {
          return command === 'git' || command === 'bd'
            ? `/usr/bin/${command}`
            : undefined;
        },
      },
    });

    expect(result.warnings).toContainEqual({
      code: 'user-managed-mcp-visible',
      message:
        'User-managed MCP user-search remains visible and unmanaged by TGO.',
      severity: 'info',
    });
    expect(
      result.degraded_capabilities.map((capability) => capability.capability),
    ).toContain('context7-cli');
    expect(
      await fs.readText('/home/user/.config/opencode/opencode.jsonc'),
    ).toContain('user-search');
  });

  test('reports all-bells optional GitHub and Serena capability degradation', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/tgo/manifest.jsonc': JSON.stringify({
        schema_version: 1,
        package: {
          name: 'trans-genderian-orchestra',
          version: '2.0.0-beta.0',
        },
        active_presets: {
          tools: 'all-bells',
          models: 'balanced',
          resilience: 'balanced',
        },
        managed_config: [],
        tools: [],
        backups: [],
        ignored_warnings: [],
      }),
      '/home/user/.config/opencode/opencode.jsonc': '{}',
    });

    const result = await runDoctor({
      fs,
      homeDir: '/home/user',
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
  });

  test('reports active preset dimensions and model alias conflicts read-only', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/tgo/manifest.jsonc': JSON.stringify({
        schema_version: 1,
        package: {
          name: 'trans-genderian-orchestra',
          version: '2.0.0-beta.0',
        },
        active_presets: {
          tools: 'default',
          models: 'balanced',
          resilience: 'aggressive',
        },
        managed_config: [],
        tools: [],
        backups: [],
        ignored_warnings: [],
      }),
      '/home/user/.config/opencode/opencode.jsonc': JSON.stringify({
        modelPresets: {
          custom: {
            roles: { 'tgo-builder': [{ id: 'canonical/builder' }] },
          },
        },
        presets: {
          custom: { roles: { 'tgo-builder': [{ id: 'legacy/builder' }] } },
        },
      }),
    });

    const result = await runDoctor({
      fs,
      homeDir: '/home/user',
      detector: {
        async which(command) {
          return ['git', 'bd'].includes(command)
            ? `/usr/bin/${command}`
            : undefined;
        },
      },
    });

    expect(result.warnings).toContainEqual({
      code: 'active-presets',
      message:
        'Active TGO presets: tools=default, models=balanced, resilience=aggressive.',
      severity: 'info',
    });
    expect(result.warnings.map((warning) => warning.code)).toContain(
      'model-presets-alias-conflict',
    );
    expect(result.warnings.map((warning) => warning.code)).toContain(
      'high-semantic-retry-budget',
    );
    expect(
      await fs.readText('/home/user/.config/opencode/opencode.jsonc'),
    ).toContain('canonical/builder');
  });

  test('reports v1 migration preview without mutating config', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/tgo/manifest.jsonc': JSON.stringify({
        schema_version: 1,
        package: {
          name: 'trans-genderian-orchestra',
          version: '2.0.0-beta.0',
        },
        active_presets: {
          tools: 'default',
          models: 'balanced',
          resilience: 'balanced',
        },
        managed_config: [],
        tools: [],
        backups: [],
        ignored_warnings: [],
      }),
      '/home/user/.config/opencode/opencode.jsonc': JSON.stringify({
        plugin: ['oh-my-opencode-slim'],
        agent: { orchestrator: {} },
        mcp: { websearch: {} },
      }),
    });

    const result = await runDoctor({
      fs,
      homeDir: '/home/user',
      detector: {
        async which(command) {
          return ['git', 'bd'].includes(command)
            ? `/usr/bin/${command}`
            : undefined;
        },
      },
    });

    expect(result.warnings).toContainEqual({
      code: 'v1-migration-available',
      message:
        'V1/omo-slim config detected; run bootstrap/setup migration preview before enabling TGO v2 replacement.',
      severity: 'warning',
    });
    expect(result.planned_actions.map((action) => action.id)).toContain(
      'register-v2-managed-entries',
    );
    expect(
      await fs.readText('/home/user/.config/opencode/opencode.jsonc'),
    ).toContain('oh-my-opencode-slim');
  });
});
