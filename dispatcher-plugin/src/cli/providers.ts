import { DEFAULT_AGENT_MCPS } from '../config/agent-mcps';
import { CUSTOM_SKILLS } from './custom-skills';
import type { InstallConfig } from './types';

const SCHEMA_URL =
  'https://unpkg.com/trans-genderian-orchestra@latest/trans-genderian-orchestra.schema.json';

export const GENERATED_PRESETS = ['openai', 'opencode-go'] as const;

// Model mappings by provider/preset.
export const MODEL_MAPPINGS = {
  openai: {
    orchestrator: { model: 'openai/gpt-5.5' },
    planner: { model: 'openai/gpt-5.4-mini', variant: 'low' },
    researcher: { model: 'openai/gpt-5.4-mini', variant: 'low' },
    builder: { model: 'openai/gpt-5.4-mini', variant: 'medium' },
    reviewer: { model: 'openai/gpt-5.4-mini', variant: 'high' },
    council: { model: 'openai/gpt-5.4-mini', variant: 'high' },
    councillor: { model: 'openai/gpt-5.4-mini', variant: 'medium' },
  },
  kimi: {
    orchestrator: { model: 'kimi-for-coding/k2p5' },
    planner: { model: 'kimi-for-coding/k2p5', variant: 'low' },
    researcher: { model: 'kimi-for-coding/k2p5', variant: 'low' },
    builder: { model: 'kimi-for-coding/k2p5', variant: 'medium' },
    reviewer: { model: 'kimi-for-coding/k2p5', variant: 'high' },
    council: { model: 'kimi-for-coding/k2p5', variant: 'high' },
    councillor: { model: 'kimi-for-coding/k2p5', variant: 'medium' },
  },
  copilot: {
    orchestrator: { model: 'github-copilot/claude-opus-4.6' },
    planner: { model: 'github-copilot/grok-code-fast-1', variant: 'low' },
    researcher: { model: 'github-copilot/grok-code-fast-1', variant: 'low' },
    builder: {
      model: 'github-copilot/gemini-3.1-pro-preview',
      variant: 'medium',
    },
    reviewer: { model: 'github-copilot/claude-opus-4.6', variant: 'high' },
    council: { model: 'github-copilot/claude-opus-4.6', variant: 'high' },
    councillor: { model: 'github-copilot/claude-sonnet-4.6', variant: 'low' },
  },
  'zai-plan': {
    orchestrator: { model: 'zai-coding-plan/glm-5' },
    planner: { model: 'zai-coding-plan/glm-5', variant: 'low' },
    researcher: { model: 'zai-coding-plan/glm-5', variant: 'low' },
    builder: { model: 'zai-coding-plan/glm-5', variant: 'medium' },
    reviewer: { model: 'zai-coding-plan/glm-5', variant: 'high' },
    council: { model: 'zai-coding-plan/glm-5', variant: 'high' },
    councillor: { model: 'zai-coding-plan/glm-5', variant: 'medium' },
  },
  'opencode-go': {
    orchestrator: { model: 'opencode-go/glm-5.1' },
    planner: { model: 'opencode-go/minimax-m2.7' },
    researcher: { model: 'opencode-go/minimax-m2.7' },
    builder: { model: 'opencode-go/deepseek-v4-flash', variant: 'high' },
    reviewer: { model: 'opencode-go/deepseek-v4-pro', variant: 'max' },
    council: { model: 'opencode-go/deepseek-v4-pro', variant: 'high' },
    councillor: { model: 'opencode-go/kimi-k2.6' },
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
    const isOrchestrator = agentName === 'orchestrator';

    const skills = isOrchestrator
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
