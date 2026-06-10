import { DEFAULT_AGENT_MCPS } from '../config/agent-mcps';
import { CUSTOM_SKILLS } from './custom-skills';
import type { InstallConfig } from './types';

const SCHEMA_URL =
  'https://unpkg.com/oh-my-opencode-slim@latest/oh-my-opencode-slim.schema.json';

export const GENERATED_PRESETS = ['openai', 'opencode-go'] as const;

// Model mappings by provider/preset.
export const MODEL_MAPPINGS = {
  openai: {
    conductor: { model: 'openai/gpt-5.5' },
    principal: { model: 'openai/gpt-5.5', variant: 'high' },
    scribe: { model: 'openai/gpt-5.4-mini', variant: 'low' },
    composer: { model: 'openai/gpt-5.4-mini', variant: 'medium' },
  },
  kimi: {
    conductor: { model: 'kimi-for-coding/k2p5' },
    principal: { model: 'kimi-for-coding/k2p5', variant: 'high' },
    scribe: { model: 'kimi-for-coding/k2p5', variant: 'low' },
    composer: { model: 'kimi-for-coding/k2p5', variant: 'medium' },
  },
  copilot: {
    conductor: { model: 'github-copilot/claude-opus-4.6' },
    principal: { model: 'github-copilot/claude-opus-4.6', variant: 'high' },
    scribe: { model: 'github-copilot/grok-code-fast-1', variant: 'low' },
    composer: {
      model: 'github-copilot/gemini-3.1-pro-preview',
      variant: 'medium',
    },
  },
  'zai-plan': {
    conductor: { model: 'zai-coding-plan/glm-5' },
    principal: { model: 'zai-coding-plan/glm-5', variant: 'high' },
    scribe: { model: 'zai-coding-plan/glm-5', variant: 'low' },
    composer: { model: 'zai-coding-plan/glm-5', variant: 'medium' },
  },
  'opencode-go': {
    conductor: { model: 'opencode-go/glm-5.1' },
    principal: { model: 'opencode-go/deepseek-v4-pro', variant: 'max' },
    scribe: { model: 'opencode-go/minimax-m2.7' },
    composer: { model: 'opencode-go/kimi-k2.6', variant: 'medium' },
    ensemble: { model: 'opencode-go/kimi-k2.6' },
  },
} as const;

export type PresetName = keyof typeof MODEL_MAPPINGS;
export type GeneratedPresetName = (typeof GENERATED_PRESETS)[number];

export function isPresetName(value: string): value is PresetName {
  return Object.hasOwn(MODEL_MAPPINGS, value);
}

export function getPresetNames(): PresetName[] {
  return Object.keys(MODEL_MAPPINGS) as PresetName[];
}

export function isGeneratedPresetName(
  value: string,
): value is GeneratedPresetName {
  return GENERATED_PRESETS.includes(value as GeneratedPresetName);
}

export function getGeneratedPresetNames(): GeneratedPresetName[] {
  return [...GENERATED_PRESETS];
}

export function generateLiteConfig(
  installConfig: InstallConfig,
): Record<string, unknown> {
  const preset = installConfig.preset ?? 'openai';
  if (!isGeneratedPresetName(preset)) {
    throw new Error(
      `Unsupported preset "${preset}". Available generated presets: ${getGeneratedPresetNames().join(', ')}`,
    );
  }

  const config: Record<string, unknown> = {
    $schema: SCHEMA_URL,
    preset,
    presets: {},
  };

  if (preset === 'opencode-go') {
    config.disabled_agents = [];
  }

  const createAgentConfig = (
    agentName: string,
    modelInfo: { model: string; variant?: string },
  ) => {
    const isConductor = agentName === 'conductor';

    const skills = isConductor
      ? ['*']
      : [
          ...CUSTOM_SKILLS.filter(
            (s) =>
              s.allowedAgents.includes('*') ||
              s.allowedAgents.includes(agentName),
          ).map((s) => s.name),
        ];

    return {
      model: modelInfo.model,
      variant: modelInfo.variant,
      skills,
      mcps:
        DEFAULT_AGENT_MCPS[agentName as keyof typeof DEFAULT_AGENT_MCPS] ?? [],
    };
  };

  const buildPreset = (mappingName: PresetName) => {
    const mapping = MODEL_MAPPINGS[mappingName];
    return Object.fromEntries(
      Object.entries(mapping).map(([agentName, modelInfo]) => [
        agentName,
        createAgentConfig(agentName, modelInfo),
      ]),
    );
  };

  const presets = config.presets as Record<string, unknown>;
  for (const presetName of GENERATED_PRESETS) {
    presets[presetName] = buildPreset(presetName);
  }

  if (installConfig.hasTmux) {
    config.tmux = {
      enabled: true,
      layout: 'main-vertical',
      main_pane_size: 60,
    };
  }

  return config;
}
