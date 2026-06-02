import type { CommandNotice, PlannedAction } from '../commands/result';
import type {
  ModelPreset,
  ResiliencePreset,
  ToolPreset,
} from '../manifest/schema';

export interface ResilienceProfile {
  name: ResiliencePreset;
  semantic_retry_budget: number;
  tool_schema_retries: number;
  provider_circuit_breaker_threshold: number;
  provider_circuit_breaker_cooldown_ms: number;
  max_parallel_builders: number;
  max_parallel_researchers: number;
  max_parallel_reviewers: number;
  auto_worktree: boolean;
  auto_continue: boolean;
  auto_commit_after_review: boolean;
  override_strictness: 'strict' | 'balanced' | 'flexible';
}

export type ResilienceProfileCatalog = Record<
  ResiliencePreset,
  ResilienceProfile
>;

export interface ActivePresetDimensions {
  tools: ToolPreset;
  models: ModelPreset;
  resilience: ResiliencePreset;
}

export interface ResilienceSwitchPlan {
  status: 'ready';
  current_active_presets: ActivePresetDimensions;
  next_active_presets: ActivePresetDimensions;
  profile: ResilienceProfile;
  planned_actions: PlannedAction[];
  warnings: CommandNotice[];
}

export function createResilienceProfileCatalog(): ResilienceProfileCatalog {
  return {
    conservative: {
      name: 'conservative',
      semantic_retry_budget: 1,
      tool_schema_retries: 1,
      provider_circuit_breaker_threshold: 2,
      provider_circuit_breaker_cooldown_ms: 300_000,
      max_parallel_builders: 1,
      max_parallel_researchers: 1,
      max_parallel_reviewers: 1,
      auto_worktree: false,
      auto_continue: false,
      auto_commit_after_review: false,
      override_strictness: 'strict',
    },
    balanced: {
      name: 'balanced',
      semantic_retry_budget: 3,
      tool_schema_retries: 2,
      provider_circuit_breaker_threshold: 3,
      provider_circuit_breaker_cooldown_ms: 300_000,
      max_parallel_builders: 2,
      max_parallel_researchers: 2,
      max_parallel_reviewers: 1,
      auto_worktree: true,
      auto_continue: false,
      auto_commit_after_review: false,
      override_strictness: 'balanced',
    },
    aggressive: {
      name: 'aggressive',
      semantic_retry_budget: 4,
      tool_schema_retries: 2,
      provider_circuit_breaker_threshold: 4,
      provider_circuit_breaker_cooldown_ms: 120_000,
      max_parallel_builders: 3,
      max_parallel_researchers: 3,
      max_parallel_reviewers: 2,
      auto_worktree: true,
      auto_continue: true,
      auto_commit_after_review: false,
      override_strictness: 'flexible',
    },
  };
}

export function planResilienceSwitch(input: {
  current: ActivePresetDimensions;
  requested_resilience: ResiliencePreset;
}): ResilienceSwitchPlan {
  const profile = createResilienceProfileCatalog()[input.requested_resilience];
  const warnings: CommandNotice[] = [];

  if (profile.semantic_retry_budget > 3) {
    warnings.push({
      code: 'high-semantic-retry-budget',
      message: `${profile.name[0]?.toUpperCase()}${profile.name.slice(1)} resilience uses semantic retry budget ${profile.semantic_retry_budget}; this can increase cost and risk.`,
      severity: 'warning',
    });
  }

  return {
    status: 'ready',
    current_active_presets: input.current,
    next_active_presets: {
      ...input.current,
      resilience: input.requested_resilience,
    },
    profile,
    planned_actions: [
      {
        id: `set-resilience-preset-${input.requested_resilience}`,
        title: `Set active resilience preset to ${input.requested_resilience}`,
        target: 'manifest.active_presets.resilience',
        action: 'update',
        requires_confirmation: true,
      },
    ],
    warnings,
  };
}
