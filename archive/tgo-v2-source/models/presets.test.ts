import { describe, expect, test } from 'bun:test';
import {
  BUILT_IN_MODEL_CATALOG_VERSION,
  createBuiltInModelCatalog,
  planModelPresetSwitch,
} from './presets';

describe('model preset catalog', () => {
  test('defines approved built-in model lineups for every TGO role', () => {
    const catalog = createBuiltInModelCatalog();

    expect(catalog.version).toBe(BUILT_IN_MODEL_CATALOG_VERSION);
    expect(Object.keys(catalog.presets).sort()).toEqual([
      'balanced',
      'copilot',
      'free',
      'go',
      'mixed',
    ]);

    for (const preset of Object.values(catalog.presets)) {
      expect(Object.keys(preset.roles).sort()).toEqual([
        'tgo-builder',
        'tgo-council',
        'tgo-councillor',
        'tgo-orchestrator',
        'tgo-researcher',
        'tgo-reviewer',
      ]);
      for (const lineup of Object.values(preset.roles)) {
        expect(lineup).toHaveLength(3);
      }
    }
  });

  test('balanced is a compatibility alias for the mixed lineup', () => {
    const catalog = createBuiltInModelCatalog();

    expect(catalog.presets.balanced.roles).toEqual(catalog.presets.mixed.roles);
  });

  test('defines the approved copilot preset', () => {
    const copilot = createBuiltInModelCatalog().presets.copilot;

    expect(copilot.roles['tgo-orchestrator']).toEqual([
      { id: 'github-copilot/gpt-5.5', variant: 'xhigh' },
      { id: 'github-copilot/claude-sonnet-4.6', variant: 'max' },
      { id: 'github-copilot/gpt-5.4', variant: 'high' },
    ]);
    expect(copilot.roles['tgo-councillor']).toEqual([
      { id: 'github-copilot/gemini-3.5-flash', variant: 'high' },
      { id: 'github-copilot/gpt-5.5', variant: 'xhigh' },
      { id: 'github-copilot/claude-opus-4.7', variant: 'max' },
    ]);
  });

  test('defines the approved go preset', () => {
    const go = createBuiltInModelCatalog().presets.go;

    expect(go.roles['tgo-orchestrator']).toEqual([
      { id: 'opencode-go/mimo-v2.5-pro', variant: 'high' },
      { id: 'opencode-go/kimi-k2.6' },
      { id: 'opencode-go/minimax-m3' },
    ]);
    expect(go.roles['tgo-councillor']).toEqual([
      { id: 'opencode-go/mimo-v2.5', variant: 'high' },
      { id: 'opencode-go/kimi-k2.6' },
      { id: 'opencode-go/glm-5.1' },
    ]);
  });

  test('defines the approved free preset', () => {
    const free = createBuiltInModelCatalog().presets.free;

    expect(free.roles['tgo-orchestrator']).toEqual([
      { id: 'google/antigravity-claude-sonnet-4-6', variant: 'max' },
      { id: 'nvidia/moonshotai/kimi-k2.6' },
      { id: 'opencode/mimo-v2.5-free', variant: 'high' },
    ]);
    expect(free.roles['tgo-councillor']).toEqual([
      { id: 'google/antigravity-gemini-3.1-pro', variant: 'max' },
      {
        id: 'nvidia/qwen/qwen3-coder-480b-a35b-instruct',
        variant: 'high',
      },
      { id: 'google/antigravity-claude-opus-4-6-thinking', variant: 'max' },
    ]);
  });

  test('defines the approved mixed preset', () => {
    const mixed = createBuiltInModelCatalog().presets.mixed;

    expect(mixed.roles['tgo-orchestrator']).toEqual([
      { id: 'github-copilot/gpt-5.5', variant: 'xhigh' },
      { id: 'opencode-go/mimo-v2.5-pro', variant: 'high' },
      { id: 'nvidia/moonshotai/kimi-k2.6' },
    ]);
    expect(mixed.roles['tgo-councillor']).toEqual([
      { id: 'github-copilot/gemini-3.5-flash', variant: 'high' },
      { id: 'github-copilot/gpt-5.5', variant: 'xhigh' },
      { id: 'github-copilot/claude-opus-4.7', variant: 'max' },
    ]);
  });

  test('plans model preset switches without changing tools or resilience', () => {
    const plan = planModelPresetSwitch({
      current: {
        tools: 'all-bells',
        models: 'balanced',
        resilience: 'aggressive',
      },
      requested_model_preset: 'balanced',
      available_model_presets: createBuiltInModelCatalog().presets,
    });

    expect(plan.status).toBe('ready');
    expect(plan.next_active_presets).toEqual({
      tools: 'all-bells',
      models: 'balanced',
      resilience: 'aggressive',
    });
    expect(plan.planned_actions).toEqual([
      {
        id: 'set-model-preset-balanced',
        title: 'Set active model preset to balanced',
        target: 'manifest.active_presets.models',
        action: 'update',
        requires_confirmation: true,
      },
    ]);
  });

  test('blocks unknown model preset switches without changing any preset dimension', () => {
    const plan = planModelPresetSwitch({
      current: { tools: 'default', models: 'balanced', resilience: 'balanced' },
      requested_model_preset: 'missing-models',
      available_model_presets: createBuiltInModelCatalog().presets,
    });

    expect(plan.status).toBe('blocked');
    expect(plan.blocked_reason).toBe('unknown_model_preset');
    expect(plan.next_active_presets).toEqual({
      tools: 'default',
      models: 'balanced',
      resilience: 'balanced',
    });
  });
});
