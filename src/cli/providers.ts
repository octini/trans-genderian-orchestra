import { DEFAULT_AGENT_MCPS } from '../config/agent-mcps';
import { CUSTOM_SKILLS } from './custom-skills';
import type { InstallConfig } from './types';

const SCHEMA_URL =
  'https://unpkg.com/trans-genderian-orchestra@latest/trans-genderian-orchestra.schema.json';

export const GENERATED_PRESETS = ['github-copilot', 'opencode-go'] as const;

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
  'github-copilot': {
    conductor: { model: 'github-copilot/gpt-5.5', variant: 'xhigh' },
    scribe: { model: 'github-copilot/gemini-3.5-flash', variant: 'high' },
    composer: { model: 'github-copilot/gpt-5.5', variant: 'xhigh' },
    principal: { model: 'github-copilot/claude-opus-4.7', variant: 'max' },
    ensemble: { model: 'conductor' },
  },
  'zai-plan': {
    conductor: { model: 'zai-coding-plan/glm-5' },
    principal: { model: 'zai-coding-plan/glm-5', variant: 'high' },
    scribe: { model: 'zai-coding-plan/glm-5', variant: 'low' },
    composer: { model: 'zai-coding-plan/glm-5', variant: 'medium' },
  },
  'opencode-go': {
    conductor: { model: 'opencode-go/kimi-k2.6' },
    scribe: { model: 'opencode-go/mimo-v2.5', variant: 'high' },
    composer: { model: 'opencode-go/mimo-v2.5', variant: 'high' },
    principal: { model: 'opencode-go/mimo-v2.5-pro', variant: 'high' },
    ensemble: { model: 'conductor' },
  },
} as const;

const GENERATED_COUNCIL_CONFIG = {
  default_preset: 'github-copilot',
  councillor_execution_mode: 'parallel',
  timeout: 180000,
  presets: {
    'github-copilot': {
      first: {
        model: 'github-copilot/gemini-3.5-flash',
        variant: 'high',
        prompt: 'Focus: Correctness & Architecture',
      },
      second: {
        model: 'github-copilot/gpt-5.5',
        variant: 'xhigh',
        prompt: 'Focus: Edge Cases & Security',
      },
      third: {
        model: 'github-copilot/claude-opus-4.7',
        variant: 'max',
        prompt: 'Focus: UX & Performance',
      },
    },
    'opencode-go': {
      first: {
        model: 'opencode-go/mimo-v2.5',
        variant: 'high',
        prompt: 'Focus: Correctness & Architecture',
      },
      second: {
        model: 'opencode-go/deepseek-v4-flash',
        variant: 'max',
        prompt: 'Focus: Edge Cases & Security',
      },
      third: {
        model: 'opencode-go/qwen3.7-plus',
        prompt: 'Focus: UX & Performance',
      },
    },
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
  const preset = installConfig.preset ?? 'github-copilot';
  if (!isGeneratedPresetName(preset)) {
    throw new Error(
      `Unsupported preset "${preset}". Available generated presets: ${getGeneratedPresetNames().join(', ')}`,
    );
  }

  const config: Record<string, unknown> = {
    $schema: SCHEMA_URL,
    preset,
    presets: {},
    ensemble: {
      ...GENERATED_COUNCIL_CONFIG,
      default_preset: preset,
    },
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
