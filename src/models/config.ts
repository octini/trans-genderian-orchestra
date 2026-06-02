import type { CommandNotice } from '../commands/result';
import type { OpenCodeConfig } from '../config/opencode-config';
import {
  createBuiltInModelCatalog,
  type ModelCatalog,
  type ModelPresetDefinition,
} from './presets';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeUserPreset(
  name: string,
  value: unknown,
): ModelPresetDefinition | undefined {
  if (!isRecord(value) || !isRecord(value.roles)) {
    return undefined;
  }

  return {
    name,
    description:
      typeof value.description === 'string'
        ? value.description
        : `User-defined model preset ${name}.`,
    catalog_version:
      typeof value.catalog_version === 'string'
        ? value.catalog_version
        : 'user-defined',
    roles: value.roles as ModelPresetDefinition['roles'],
  };
}

function collectPresets(input: unknown): Record<string, ModelPresetDefinition> {
  if (!isRecord(input)) {
    return {};
  }

  const output: Record<string, ModelPresetDefinition> = {};
  for (const [name, value] of Object.entries(input)) {
    const preset = normalizeUserPreset(name, value);
    if (preset) {
      output[name] = preset;
    }
  }
  return output;
}

export interface ModelPresetCatalogResolution {
  catalog: ModelCatalog;
  warnings: CommandNotice[];
}

export function resolveModelPresetCatalog(
  config: OpenCodeConfig,
): ModelPresetCatalogResolution {
  const builtIn = createBuiltInModelCatalog();
  const canonical = collectPresets(config.modelPresets);
  const legacy = collectPresets(config.presets);
  const warnings: CommandNotice[] = [];

  if (Object.keys(legacy).length > 0) {
    warnings.push({
      code: 'legacy-presets-alias',
      message: 'Legacy presets key is being interpreted as modelPresets.',
      severity: 'info',
    });
  }

  for (const [name, legacyPreset] of Object.entries(legacy)) {
    const canonicalPreset = canonical[name];
    if (
      canonicalPreset &&
      JSON.stringify(canonicalPreset) !== JSON.stringify(legacyPreset)
    ) {
      warnings.push({
        code: 'model-presets-alias-conflict',
        message: `modelPresets.${name} differs from legacy presets.${name}; canonical modelPresets wins.`,
        severity: 'warning',
      });
    }
  }

  return {
    catalog: {
      ...builtIn,
      presets: { ...builtIn.presets, ...legacy, ...canonical },
    },
    warnings,
  };
}
