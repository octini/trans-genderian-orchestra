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

function copilotModelLineup(): ModelLineup {
  return {
    'tgo-orchestrator': [
      { id: 'github-copilot/gpt-5.5', variant: 'xhigh' },
      { id: 'github-copilot/claude-sonnet-4.6', variant: 'max' },
      { id: 'github-copilot/gpt-5.4', variant: 'high' },
    ],
    'tgo-researcher': [
      { id: 'github-copilot/gemini-3.5-flash', variant: 'high' },
      { id: 'github-copilot/gpt-5.5', variant: 'xhigh' },
      { id: 'github-copilot/claude-sonnet-4.6', variant: 'max' },
    ],
    'tgo-builder': [
      { id: 'github-copilot/gpt-5.5', variant: 'xhigh' },
      { id: 'github-copilot/claude-opus-4.7', variant: 'max' },
      { id: 'github-copilot/gpt-5.4', variant: 'high' },
    ],
    'tgo-reviewer': [
      { id: 'github-copilot/claude-opus-4.7', variant: 'max' },
      { id: 'github-copilot/gpt-5.5', variant: 'xhigh' },
      { id: 'github-copilot/claude-sonnet-4.6', variant: 'max' },
    ],
    'tgo-council': [
      { id: 'github-copilot/claude-opus-4.7', variant: 'max' },
      { id: 'github-copilot/gpt-5.5', variant: 'xhigh' },
      { id: 'github-copilot/gemini-3.5-flash', variant: 'high' },
    ],
    'tgo-councillor': [
      { id: 'github-copilot/gemini-3.5-flash', variant: 'high' },
      { id: 'github-copilot/gpt-5.5', variant: 'xhigh' },
      { id: 'github-copilot/claude-opus-4.7', variant: 'max' },
    ],
  };
}

function goModelLineup(): ModelLineup {
  return {
    'tgo-orchestrator': [
      { id: 'opencode-go/mimo-v2.5-pro', variant: 'high' },
      { id: 'opencode-go/kimi-k2.6' },
      { id: 'opencode-go/minimax-m3' },
    ],
    'tgo-researcher': [
      { id: 'opencode-go/mimo-v2.5', variant: 'high' },
      { id: 'opencode-go/deepseek-v4-flash', variant: 'max' },
      { id: 'opencode-go/deepseek-v4-pro', variant: 'max' },
    ],
    'tgo-builder': [
      { id: 'opencode-go/kimi-k2.6' },
      { id: 'opencode-go/deepseek-v4-flash', variant: 'max' },
      { id: 'opencode-go/qwen3.6-plus' },
    ],
    'tgo-reviewer': [
      { id: 'opencode-go/glm-5.1' },
      { id: 'opencode-go/qwen3.7-max' },
      { id: 'opencode-go/kimi-k2.6' },
    ],
    'tgo-council': [
      { id: 'opencode-go/kimi-k2.6' },
      { id: 'opencode-go/mimo-v2.5-pro', variant: 'high' },
      { id: 'opencode-go/deepseek-v4-pro', variant: 'max' },
    ],
    'tgo-councillor': [
      { id: 'opencode-go/mimo-v2.5', variant: 'high' },
      { id: 'opencode-go/kimi-k2.6' },
      { id: 'opencode-go/glm-5.1' },
    ],
  };
}

function freeModelLineup(): ModelLineup {
  return {
    'tgo-orchestrator': [
      { id: 'google/antigravity-claude-sonnet-4-6', variant: 'max' },
      { id: 'nvidia/moonshotai/kimi-k2.6' },
      { id: 'opencode/mimo-v2.5-free', variant: 'high' },
    ],
    'tgo-researcher': [
      { id: 'google/antigravity-gemini-3.1-pro', variant: 'max' },
      { id: 'opencode/deepseek-v4-flash-free', variant: 'max' },
      { id: 'nvidia/stepfun-ai/step-3.7-flash', variant: 'high' },
    ],
    'tgo-builder': [
      {
        id: 'nvidia/qwen/qwen3-coder-480b-a35b-instruct',
        variant: 'high',
      },
      { id: 'opencode/deepseek-v4-flash-free', variant: 'max' },
      { id: 'google/antigravity-claude-sonnet-4-6', variant: 'max' },
    ],
    'tgo-reviewer': [
      { id: 'google/antigravity-claude-opus-4-6-thinking', variant: 'max' },
      { id: 'nvidia/z-ai/glm-5.1' },
      { id: 'opencode/mimo-v2.5-free', variant: 'high' },
    ],
    'tgo-council': [
      { id: 'nvidia/moonshotai/kimi-k2.6' },
      { id: 'google/antigravity-gemini-3.1-pro', variant: 'max' },
      { id: 'opencode/mimo-v2.5-free', variant: 'high' },
    ],
    'tgo-councillor': [
      { id: 'google/antigravity-gemini-3.1-pro', variant: 'max' },
      {
        id: 'nvidia/qwen/qwen3-coder-480b-a35b-instruct',
        variant: 'high',
      },
      { id: 'google/antigravity-claude-opus-4-6-thinking', variant: 'max' },
    ],
  };
}

function mixedModelLineup(): ModelLineup {
  return {
    'tgo-orchestrator': [
      { id: 'github-copilot/gpt-5.5', variant: 'xhigh' },
      { id: 'opencode-go/mimo-v2.5-pro', variant: 'high' },
      { id: 'nvidia/moonshotai/kimi-k2.6' },
    ],
    'tgo-researcher': [
      { id: 'github-copilot/gemini-3.5-flash', variant: 'high' },
      { id: 'opencode-go/mimo-v2.5', variant: 'high' },
      { id: 'google/antigravity-gemini-3.1-pro', variant: 'max' },
    ],
    'tgo-builder': [
      { id: 'github-copilot/gpt-5.5', variant: 'xhigh' },
      { id: 'opencode-go/kimi-k2.6' },
      { id: 'google/antigravity-claude-sonnet-4-6', variant: 'max' },
    ],
    'tgo-reviewer': [
      { id: 'github-copilot/claude-opus-4.7', variant: 'max' },
      { id: 'opencode-go/glm-5.1' },
      { id: 'google/antigravity-claude-opus-4-6-thinking', variant: 'max' },
    ],
    'tgo-council': [
      { id: 'github-copilot/claude-opus-4.7', variant: 'max' },
      { id: 'opencode-go/kimi-k2.6' },
      { id: 'nvidia/moonshotai/kimi-k2.6' },
    ],
    'tgo-councillor': [
      { id: 'github-copilot/gemini-3.5-flash', variant: 'high' },
      { id: 'github-copilot/gpt-5.5', variant: 'xhigh' },
      { id: 'github-copilot/claude-opus-4.7', variant: 'max' },
    ],
  };
}

export function createBuiltInModelCatalog(): ModelCatalog {
  const mixed = mixedModelLineup();

  return {
    version: BUILT_IN_MODEL_CATALOG_VERSION,
    presets: {
      balanced: {
        name: 'balanced',
        description: 'Compatibility alias for the mixed TGO v2 role lineup.',
        catalog_version: BUILT_IN_MODEL_CATALOG_VERSION,
        roles: mixed,
      },
      copilot: {
        name: 'copilot',
        description: 'GitHub Copilot-only TGO v2 role lineup.',
        catalog_version: BUILT_IN_MODEL_CATALOG_VERSION,
        roles: copilotModelLineup(),
      },
      go: {
        name: 'go',
        description: 'OpenCode Go-only TGO v2 role lineup.',
        catalog_version: BUILT_IN_MODEL_CATALOG_VERSION,
        roles: goModelLineup(),
      },
      free: {
        name: 'free',
        description:
          'Free-provider TGO v2 role lineup using Antigravity, Nvidia NIM, and OpenCode Zen.',
        catalog_version: BUILT_IN_MODEL_CATALOG_VERSION,
        roles: freeModelLineup(),
      },
      mixed: {
        name: 'mixed',
        description:
          'Mixed-provider TGO v2 role lineup using Copilot primaries with Go and free fallbacks.',
        catalog_version: BUILT_IN_MODEL_CATALOG_VERSION,
        roles: mixed,
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
