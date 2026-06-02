import type { PlannedAction } from '../commands/result';
import type {
  ModelPreset,
  ResiliencePreset,
  ToolPreset,
} from '../manifest/schema';
import type { TgoAgentId } from '../plugin/agent-ids';

export const BUILT_IN_MODEL_CATALOG_VERSION = '2026-06-02';

export interface ModelEntry {
  id: string;
  variant?: string;
}

export type ModelLineup = Record<TgoAgentId, ModelEntry[]>;

export interface ModelPresetDefinition {
  name: string;
  description: string;
  catalog_version: string;
  roles: ModelLineup;
}

export interface ModelCatalog {
  version: string;
  presets: Record<string, ModelPresetDefinition>;
}

export interface ActivePresetDimensions {
  tools: ToolPreset;
  models: ModelPreset;
  resilience: ResiliencePreset;
}

export interface ModelPresetSwitchPlan {
  status: 'ready' | 'blocked';
  blocked_reason?: 'unknown_model_preset';
  current_active_presets: ActivePresetDimensions;
  next_active_presets: ActivePresetDimensions;
  planned_actions: PlannedAction[];
  warnings: Array<{
    code: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
  }>;
}

function balancedModelLineup(): ModelLineup {
  return {
    'tgo-orchestrator': [
      { id: 'opencode-go/mimo-v2.5', variant: 'high' },
      { id: 'google/antigravity-claude-opus-4-6-thinking', variant: 'max' },
      { id: 'nvidia/moonshotai/kimi-k2.6' },
    ],
    'tgo-researcher': [
      { id: 'github-copilot/gemini-3.5-flash', variant: 'high' },
      { id: 'github-copilot/gpt-5.5', variant: 'xhigh' },
      { id: 'github-copilot/claude-opus-4.7', variant: 'max' },
    ],
    'tgo-builder': [
      { id: 'github-copilot/gpt-5.5', variant: 'xhigh' },
      { id: 'github-copilot/claude-opus-4.7', variant: 'max' },
      { id: 'nvidia/z-ai/glm-5.1' },
    ],
    'tgo-reviewer': [
      { id: 'github-copilot/claude-opus-4.7', variant: 'max' },
      { id: 'github-copilot/gpt-5.5', variant: 'xhigh' },
      { id: 'nvidia/z-ai/glm-5.1' },
    ],
    'tgo-council': [{ id: 'opencode-go/mimo-v2.5', variant: 'high' }],
    'tgo-councillor': [
      { id: 'github-copilot/gpt-5.5', variant: 'xhigh' },
      { id: 'github-copilot/claude-opus-4.7', variant: 'max' },
      { id: 'github-copilot/gemini-3.5-flash', variant: 'high' },
    ],
  };
}

export function createBuiltInModelCatalog(): ModelCatalog {
  return {
    version: BUILT_IN_MODEL_CATALOG_VERSION,
    presets: {
      balanced: {
        name: 'balanced',
        description: 'Provisional balanced TGO v2 role lineup.',
        catalog_version: BUILT_IN_MODEL_CATALOG_VERSION,
        roles: balancedModelLineup(),
      },
    },
  };
}

export function planModelPresetSwitch(input: {
  current: ActivePresetDimensions;
  requested_model_preset: string;
  available_model_presets: Record<string, ModelPresetDefinition>;
}): ModelPresetSwitchPlan {
  if (!input.available_model_presets[input.requested_model_preset]) {
    return {
      status: 'blocked',
      blocked_reason: 'unknown_model_preset',
      current_active_presets: input.current,
      next_active_presets: input.current,
      planned_actions: [],
      warnings: [
        {
          code: 'unknown-model-preset',
          message: `Model preset ${input.requested_model_preset} is not defined in modelPresets.`,
          severity: 'error',
        },
      ],
    };
  }

  return {
    status: 'ready',
    current_active_presets: input.current,
    next_active_presets: {
      ...input.current,
      models: input.requested_model_preset,
    },
    planned_actions: [
      {
        id: `set-model-preset-${input.requested_model_preset}`,
        title: `Set active model preset to ${input.requested_model_preset}`,
        target: 'manifest.active_presets.models',
        action: 'update',
        requires_confirmation: true,
      },
    ],
    warnings: [],
  };
}
