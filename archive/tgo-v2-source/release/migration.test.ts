import { describe, expect, test } from 'bun:test';
import { planDefaultManagedEntries } from '../config/managed-entries';
import {
  buildV2ReplacementConfig,
  detectV1EraConfig,
  planMigrationPreview,
} from './migration';

describe('release migration planning', () => {
  test('detects v1-era omo-slim config without mutating it', () => {
    const config = {
      plugin: [
        'oh-my-opencode-slim',
        'trans-genderian-orchestra@2.0.0-beta.13',
      ],
      agent: {
        orchestrator: { prompt: 'v1 orchestrator' },
        builder: { prompt: 'v1 builder' },
        'user-agent': { prompt: 'keep me' },
      },
      mcp: {
        websearch: { type: 'remote' },
        'user-search': { type: 'remote' },
      },
    };

    const detection = detectV1EraConfig(config);

    expect(detection.has_v1_config).toBe(true);
    expect(detection.indicators.map((indicator) => indicator.key)).toEqual([
      'plugin.oh-my-opencode-slim',
      'plugin.trans-genderian-orchestra@2.0.0-beta.13',
      'agent.orchestrator',
      'agent.builder',
      'mcp.websearch',
    ]);
    expect(config.plugin).toContain('oh-my-opencode-slim');
  });

  test('migration preview plans v2 replacement instead of side-by-side install', () => {
    const config = {
      plugin: ['oh-my-opencode-slim', 'user-plugin'],
      agent: { orchestrator: {}, 'user-agent': {} },
      mcp: { websearch: {}, 'user-mcp': {} },
    };

    const preview = planMigrationPreview(
      config,
      planDefaultManagedEntries('default'),
    );

    expect(preview.status).toBe('migration_available');
    expect(preview.planned_actions.map((action) => action.id)).toEqual([
      'remove-v1-plugin-oh-my-opencode-slim',
      'remove-v1-agent-orchestrator',
      'remove-v1-mcp-websearch',
      'register-v2-managed-entries',
    ]);
    expect(preview.requires_confirmation).toBe(true);
  });

  test('does not treat user-owned GitHub MCP as v1-era config', () => {
    const config = {
      plugin: ['trans-genderian-orchestra@beta'],
      mcp: {
        github: {
          type: 'remote',
          url: 'https://api.githubcopilot.com/mcp/',
        },
      },
    };

    const detection = detectV1EraConfig(config);
    const preview = planMigrationPreview(
      config,
      planDefaultManagedEntries('default'),
    );

    expect(detection.has_v1_config).toBe(false);
    expect(preview.status).toBe('no_v1_config');
    expect(preview.planned_actions).toEqual([]);
  });

  test('replacement config removes v1 active entries and preserves user-owned entries', () => {
    const config = {
      plugin: ['oh-my-opencode-slim', 'user-plugin'],
      agent: { orchestrator: {}, 'user-agent': {} },
      mcp: { websearch: {}, 'user-mcp': {} },
      provider: { custom: {} },
    };

    const replacement = buildV2ReplacementConfig(
      config,
      planDefaultManagedEntries('bare-bones'),
    );

    expect(replacement.plugin).not.toContain('oh-my-opencode-slim');
    expect(replacement.plugin).toContain('user-plugin');
    expect(replacement.plugin).toContain('trans-genderian-orchestra@beta');
    expect(replacement.plugin).not.toContain(
      'trans-genderian-orchestra@2.0.0-beta.0',
    );
    expect(replacement.agent?.orchestrator).toBeUndefined();
    expect(replacement.agent?.['user-agent']).toEqual({});
    expect(replacement.agent?.['tgo-orchestrator']).toBeDefined();
    expect(replacement.mcp?.websearch).toBeUndefined();
    expect(replacement.mcp?.['user-mcp']).toEqual({});
    expect(replacement.provider).toEqual({ custom: {} });
  });
});
