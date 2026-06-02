import { describe, expect, test } from 'bun:test';
import {
  BUILT_IN_MODEL_CATALOG_VERSION,
  createBuiltInModelCatalog,
  planModelPresetSwitch,
} from './presets';

describe('model preset catalog', () => {
  test('defines a provisional balanced model lineup for every TGO role', () => {
    const catalog = createBuiltInModelCatalog();
    const balanced = catalog.presets.balanced;

    expect(catalog.version).toBe(BUILT_IN_MODEL_CATALOG_VERSION);
    expect(Object.keys(catalog.presets)).toEqual(['balanced']);
    expect(Object.keys(balanced.roles).sort()).toEqual([
      'tgo-builder',
      'tgo-council',
      'tgo-councillor',
      'tgo-orchestrator',
      'tgo-researcher',
      'tgo-reviewer',
    ]);
    expect(balanced.roles['tgo-orchestrator'][0]).toEqual({
      id: 'opencode-go/mimo-v2.5',
      variant: 'high',
    });
    expect(balanced.roles['tgo-reviewer'][0]).toEqual({
      id: 'github-copilot/claude-opus-4.7',
      variant: 'max',
    });
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
