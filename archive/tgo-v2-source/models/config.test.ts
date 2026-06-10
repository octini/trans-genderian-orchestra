import { describe, expect, test } from 'bun:test';
import { resolveModelPresetCatalog } from './config';

describe('model preset config resolution', () => {
  test('uses canonical modelPresets over legacy presets', () => {
    const result = resolveModelPresetCatalog({
      modelPresets: {
        custom: { roles: { 'tgo-builder': [{ id: 'canonical/builder' }] } },
      },
      presets: {
        legacy: { roles: { 'tgo-builder': [{ id: 'legacy/builder' }] } },
      },
    });

    expect(result.catalog.presets.custom.roles['tgo-builder'][0]?.id).toBe(
      'canonical/builder',
    );
    expect(result.catalog.presets.legacy.roles['tgo-builder'][0]?.id).toBe(
      'legacy/builder',
    );
  });

  test('treats legacy presets as model presets when canonical key is absent', () => {
    const result = resolveModelPresetCatalog({
      presets: {
        legacy: { roles: { 'tgo-reviewer': [{ id: 'legacy/reviewer' }] } },
      },
    });

    expect(result.catalog.presets.legacy.roles['tgo-reviewer'][0]?.id).toBe(
      'legacy/reviewer',
    );
    expect(result.warnings).toContainEqual({
      code: 'legacy-presets-alias',
      message: 'Legacy presets key is being interpreted as modelPresets.',
      severity: 'info',
    });
  });

  test('warns when canonical modelPresets and legacy presets conflict', () => {
    const result = resolveModelPresetCatalog({
      modelPresets: {
        custom: { roles: { 'tgo-builder': [{ id: 'canonical/builder' }] } },
      },
      presets: {
        custom: { roles: { 'tgo-builder': [{ id: 'legacy/builder' }] } },
      },
    });

    expect(result.catalog.presets.custom.roles['tgo-builder'][0]?.id).toBe(
      'canonical/builder',
    );
    expect(result.warnings).toContainEqual({
      code: 'model-presets-alias-conflict',
      message:
        'modelPresets.custom differs from legacy presets.custom; canonical modelPresets wins.',
      severity: 'warning',
    });
  });
});
