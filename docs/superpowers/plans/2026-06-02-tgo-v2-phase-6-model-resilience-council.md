# TGO v2 Phase 6 Model Resilience Council Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic Phase 6 primitives for model presets, canonical/legacy model preset config resolution, resilience profiles, provider-failure fallback decisions, session-local circuit breaker state, and council derivation.

**Architecture:** Phase 6 adds pure TypeScript modules for model/resilience decisions first, then threads selected preset names through bootstrap, doctor, manifest, CLI, and command guidance. Runtime provider calls, real OpenCode model switching, and model availability probing remain out of scope; this phase produces deterministic planning/validation surfaces that later runtime execution can consume.

**Tech Stack:** TypeScript, Bun test runner, existing deterministic command result shape, existing OpenCode config merge/manifest helpers.

---

## Source Context

Implement from these approved design specs:

- `designs/tgo-v2/specs/05-model-presets-council.md`
- `designs/tgo-v2/specs/06-resilience-fallback-escalation.md`
- `designs/tgo-v2/specs/07-implementation-phases-validation-gates.md`
- `designs/tgo-v2/specs/00-umbrella-architecture.md`
- `designs/tgo-v2/specs/02-bootstrap-setup-doctor-manifests.md`

Relevant existing implementation surfaces:

- `trans-genderian-orchestra-v2/src/manifest/schema.ts`
- `trans-genderian-orchestra-v2/src/manifest/store.ts`
- `trans-genderian-orchestra-v2/src/config/opencode-config.ts`
- `trans-genderian-orchestra-v2/src/commands/bootstrap.ts`
- `trans-genderian-orchestra-v2/src/commands/doctor.ts`
- `trans-genderian-orchestra-v2/src/cli/args.ts`
- `trans-genderian-orchestra-v2/src/cli/index.ts`
- `trans-genderian-orchestra-v2/src/plugin/commands.ts`
- `trans-genderian-orchestra-v2/src/plugin/agents.test.ts`

## Scope

In scope:

- Built-in provisional `balanced` model preset catalog with role-specific model chains.
- Canonical `modelPresets` config key and legacy `presets` alias handling.
- Warning when `modelPresets` and legacy `presets` both define the same preset differently.
- Deterministic model preset switch plan for `/tgo:models` that changes model preset state only.
- Deterministic resilience profile catalog for `conservative`, `balanced`, and `aggressive`.
- Deterministic resilience switch plan that changes resilience settings only.
- Failure-class fallback eligibility: provider fallback only for structural/provider failures.
- Session-local circuit breaker state: threshold, cooldown, half-open probe, close on success.
- Council derivation from active Orchestrator/Researcher/Builder/Reviewer lineups.
- Bootstrap threading for `--models` and `--resilience` to manifest active presets without changing tool preset behavior.
- Doctor reporting active tools/models/resilience dimensions and advisory warnings.
- Command guidance for `/tgo:models`, `/preset`, and `/tgo:setup` independence.

Out of scope:

- Real provider API calls, model availability probing, rate-limit detection from live OpenCode sessions, or runtime model mutation.
- Persisting provider health across OpenCode restarts.
- Installing providers, storing provider credentials, or changing user provider config.
- Full `/tgo:models` executable command implementation beyond deterministic planning helpers and plugin command guidance.
- Beta migration/cutover, rollback/uninstall, and v1 config adoption.
- Real Council execution. Phase 6 derives the seat plan and partial-failure synthesis eligibility only.

## File Structure

- `trans-genderian-orchestra-v2/src/models/presets.ts`: built-in model catalog, role model lineups, model preset switch planning.
- `trans-genderian-orchestra-v2/src/models/presets.test.ts`: model preset catalog and switch-plan tests.
- `trans-genderian-orchestra-v2/src/models/config.ts`: canonical `modelPresets` and legacy `presets` alias resolution from OpenCode config.
- `trans-genderian-orchestra-v2/src/models/config.test.ts`: alias behavior and conflict-warning tests.
- `trans-genderian-orchestra-v2/src/resilience/profiles.ts`: resilience profile definitions and switch planning.
- `trans-genderian-orchestra-v2/src/resilience/profiles.test.ts`: profile independence and warning tests.
- `trans-genderian-orchestra-v2/src/resilience/fallback.ts`: failure classes and provider fallback eligibility.
- `trans-genderian-orchestra-v2/src/resilience/fallback.test.ts`: structural/provider versus semantic fallback tests.
- `trans-genderian-orchestra-v2/src/resilience/circuit-breaker.ts`: session-local provider/model circuit breaker.
- `trans-genderian-orchestra-v2/src/resilience/circuit-breaker.test.ts`: open/half-open/close behavior tests.
- `trans-genderian-orchestra-v2/src/models/council.ts`: council synthesizer and councillor seat derivation.
- `trans-genderian-orchestra-v2/src/models/council.test.ts`: council derivation and partial-failure synthesis tests.
- Modify `trans-genderian-orchestra-v2/src/config/opencode-config.ts`: expose `modelPresets` and legacy `presets` as known optional config fields.
- Modify `trans-genderian-orchestra-v2/src/manifest/schema.ts`: narrow built-in `ModelPreset` to include `balanced` while still allowing user-defined strings through `string`.
- Modify `trans-genderian-orchestra-v2/src/commands/bootstrap.ts` and `.test.ts`: accept `models` and `resilience`, record active preset choices, preserve tools independence.
- Modify `trans-genderian-orchestra-v2/src/commands/doctor.ts` and `.test.ts`: report active dimensions and model/resilience warnings without writing files.
- Modify `trans-genderian-orchestra-v2/src/cli/index.ts` and `src/cli/args.test.ts`: parse/pass model and resilience presets.
- Modify `trans-genderian-orchestra-v2/src/plugin/commands.ts` and `src/plugin/agents.test.ts`: command guidance for model/resilience independence, alias behavior, and fallback boundaries.

## Task Metadata

```yaml
task_id: phase6-model-resilience-council
depends_on:
  - phase5-tool-presets-integrations
write_scope:
  - trans-genderian-orchestra-v2/src/models/**
  - trans-genderian-orchestra-v2/src/resilience/**
  - trans-genderian-orchestra-v2/src/config/opencode-config.ts
  - trans-genderian-orchestra-v2/src/manifest/schema.ts
  - trans-genderian-orchestra-v2/src/commands/bootstrap.ts
  - trans-genderian-orchestra-v2/src/commands/bootstrap.test.ts
  - trans-genderian-orchestra-v2/src/commands/doctor.ts
  - trans-genderian-orchestra-v2/src/commands/doctor.test.ts
  - trans-genderian-orchestra-v2/src/cli/index.ts
  - trans-genderian-orchestra-v2/src/cli/args.test.ts
  - trans-genderian-orchestra-v2/src/plugin/commands.ts
  - trans-genderian-orchestra-v2/src/plugin/agents.test.ts
validation_commands:
  - bun test src/models/presets.test.ts src/models/config.test.ts src/models/council.test.ts
  - bun test src/resilience/profiles.test.ts src/resilience/fallback.test.ts src/resilience/circuit-breaker.test.ts
  - bun test src/commands/bootstrap.test.ts src/commands/doctor.test.ts src/cli/args.test.ts src/plugin/agents.test.ts
  - bun test
  - bun run typecheck
  - bun run check:ci
  - bun run build
parallel_group: phase6-serial
risk_level: medium
requires_user_decision: false
artifact_refs:
  - docs/superpowers/plans/2026-06-02-tgo-v2-phase-6-model-resilience-council.md
```

---

## Task 1: Add Model Preset Catalog And Switch Planning

**Files:**

- Create: `trans-genderian-orchestra-v2/src/models/presets.ts`
- Create: `trans-genderian-orchestra-v2/src/models/presets.test.ts`

- [ ] **Step 1: Write the failing test**

Create `trans-genderian-orchestra-v2/src/models/presets.test.ts`:

```ts
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
      current: { tools: 'all-bells', models: 'balanced', resilience: 'aggressive' },
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/models/presets.test.ts
```

Expected: FAIL with `Cannot find module './presets'`.

- [ ] **Step 3: Write minimal implementation**

Create `trans-genderian-orchestra-v2/src/models/presets.ts`:

```ts
import type { PlannedAction } from '../commands/result';
import type { ModelPreset, ResiliencePreset, ToolPreset } from '../manifest/schema';
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
  warnings: Array<{ code: string; message: string; severity: 'info' | 'warning' | 'error' }>;
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
    next_active_presets: { ...input.current, models: input.requested_model_preset },
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
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/models/presets.test.ts
bun run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add trans-genderian-orchestra-v2/src/models/presets.ts trans-genderian-orchestra-v2/src/models/presets.test.ts
git commit -m "feat: define tgo model presets"
```

---

## Task 2: Add Canonical And Legacy Model Preset Config Resolution

**Files:**

- Create: `trans-genderian-orchestra-v2/src/models/config.ts`
- Create: `trans-genderian-orchestra-v2/src/models/config.test.ts`
- Modify: `trans-genderian-orchestra-v2/src/config/opencode-config.ts`

- [ ] **Step 1: Write the failing test**

Create `trans-genderian-orchestra-v2/src/models/config.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { resolveModelPresetCatalog } from './config';

describe('model preset config resolution', () => {
  test('uses canonical modelPresets over legacy presets', () => {
    const result = resolveModelPresetCatalog({
      modelPresets: { custom: { roles: { 'tgo-builder': [{ id: 'canonical/builder' }] } } },
      presets: { legacy: { roles: { 'tgo-builder': [{ id: 'legacy/builder' }] } } },
    });

    expect(result.catalog.presets.custom.roles['tgo-builder'][0]?.id).toBe('canonical/builder');
    expect(result.catalog.presets.legacy.roles['tgo-builder'][0]?.id).toBe('legacy/builder');
  });

  test('treats legacy presets as model presets when canonical key is absent', () => {
    const result = resolveModelPresetCatalog({
      presets: { legacy: { roles: { 'tgo-reviewer': [{ id: 'legacy/reviewer' }] } } },
    });

    expect(result.catalog.presets.legacy.roles['tgo-reviewer'][0]?.id).toBe('legacy/reviewer');
    expect(result.warnings).toContainEqual({
      code: 'legacy-presets-alias',
      message: 'Legacy presets key is being interpreted as modelPresets.',
      severity: 'info',
    });
  });

  test('warns when canonical modelPresets and legacy presets conflict', () => {
    const result = resolveModelPresetCatalog({
      modelPresets: { custom: { roles: { 'tgo-builder': [{ id: 'canonical/builder' }] } } },
      presets: { custom: { roles: { 'tgo-builder': [{ id: 'legacy/builder' }] } } },
    });

    expect(result.catalog.presets.custom.roles['tgo-builder'][0]?.id).toBe('canonical/builder');
    expect(result.warnings).toContainEqual({
      code: 'model-presets-alias-conflict',
      message: 'modelPresets.custom differs from legacy presets.custom; canonical modelPresets wins.',
      severity: 'warning',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd trans-genderian-orchestra-v2
bun test src/models/config.test.ts
```

Expected: FAIL with `Cannot find module './config'`.

- [ ] **Step 3: Write minimal implementation**

Modify `trans-genderian-orchestra-v2/src/config/opencode-config.ts` to add known optional fields to `OpenCodeConfig`:

```ts
  modelPresets?: Record<string, unknown>;
  presets?: Record<string, unknown>;
```

Create `trans-genderian-orchestra-v2/src/models/config.ts`:

```ts
import type { CommandNotice } from '../commands/result';
import type { OpenCodeConfig } from '../config/opencode-config';
import { createBuiltInModelCatalog, type ModelCatalog, type ModelPresetDefinition } from './presets';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeUserPreset(name: string, value: unknown): ModelPresetDefinition | undefined {
  if (!isRecord(value) || !isRecord(value.roles)) return undefined;
  return {
    name,
    description: typeof value.description === 'string' ? value.description : `User-defined model preset ${name}.`,
    catalog_version: typeof value.catalog_version === 'string' ? value.catalog_version : 'user-defined',
    roles: value.roles as ModelPresetDefinition['roles'],
  };
}

function collectPresets(input: unknown): Record<string, ModelPresetDefinition> {
  if (!isRecord(input)) return {};
  const output: Record<string, ModelPresetDefinition> = {};
  for (const [name, value] of Object.entries(input)) {
    const preset = normalizeUserPreset(name, value);
    if (preset) output[name] = preset;
  }
  return output;
}

export interface ModelPresetCatalogResolution {
  catalog: ModelCatalog;
  warnings: CommandNotice[];
}

export function resolveModelPresetCatalog(config: OpenCodeConfig): ModelPresetCatalogResolution {
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
    if (canonicalPreset && JSON.stringify(canonicalPreset) !== JSON.stringify(legacyPreset)) {
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd trans-genderian-orchestra-v2
bun test src/models/config.test.ts
bun run typecheck
bun run check:ci
```

Expected: PASS. If Biome reports formatting, run `bunx biome check src/models/config.ts src/models/config.test.ts src/config/opencode-config.ts --write` and rerun.

- [ ] **Step 5: Commit**

```bash
git add trans-genderian-orchestra-v2/src/models/config.ts trans-genderian-orchestra-v2/src/models/config.test.ts trans-genderian-orchestra-v2/src/config/opencode-config.ts
git commit -m "feat: resolve tgo model preset config"
```

---

## Task 3: Add Resilience Profiles And Switch Planning

**Files:**

- Create: `trans-genderian-orchestra-v2/src/resilience/profiles.ts`
- Create: `trans-genderian-orchestra-v2/src/resilience/profiles.test.ts`

- [ ] **Step 1: Write the failing test**

Create `trans-genderian-orchestra-v2/src/resilience/profiles.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { createResilienceProfileCatalog, planResilienceSwitch } from './profiles';

describe('resilience profiles', () => {
  test('defines conservative balanced and aggressive profile values', () => {
    const catalog = createResilienceProfileCatalog();

    expect(Object.keys(catalog).sort()).toEqual(['aggressive', 'balanced', 'conservative']);
    expect(catalog.conservative.max_parallel_builders).toBe(1);
    expect(catalog.balanced.semantic_retry_budget).toBe(3);
    expect(catalog.balanced.tool_schema_retries).toBe(2);
    expect(catalog.aggressive.max_parallel_builders).toBe(3);
    expect(catalog.aggressive.auto_continue).toBe(true);
  });

  test('plans resilience switches without changing tools or models', () => {
    const plan = planResilienceSwitch({
      current: { tools: 'default', models: 'balanced', resilience: 'balanced' },
      requested_resilience: 'conservative',
    });

    expect(plan.status).toBe('ready');
    expect(plan.next_active_presets).toEqual({
      tools: 'default',
      models: 'balanced',
      resilience: 'conservative',
    });
    expect(plan.profile.max_parallel_builders).toBe(1);
  });

  test('warns when aggressive profile raises semantic retry budget above three', () => {
    const plan = planResilienceSwitch({
      current: { tools: 'default', models: 'balanced', resilience: 'balanced' },
      requested_resilience: 'aggressive',
    });

    expect(plan.warnings).toContainEqual({
      code: 'high-semantic-retry-budget',
      message: 'Aggressive resilience uses semantic retry budget 4; this can increase cost and risk.',
      severity: 'warning',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd trans-genderian-orchestra-v2
bun test src/resilience/profiles.test.ts
```

Expected: FAIL with `Cannot find module './profiles'`.

- [ ] **Step 3: Write minimal implementation**

Create `trans-genderian-orchestra-v2/src/resilience/profiles.ts`:

```ts
import type { PlannedAction, CommandNotice } from '../commands/result';
import type { ModelPreset, ResiliencePreset, ToolPreset } from '../manifest/schema';

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

export type ResilienceProfileCatalog = Record<ResiliencePreset, ResilienceProfile>;

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
    next_active_presets: { ...input.current, resilience: input.requested_resilience },
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd trans-genderian-orchestra-v2
bun test src/resilience/profiles.test.ts
bun run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add trans-genderian-orchestra-v2/src/resilience/profiles.ts trans-genderian-orchestra-v2/src/resilience/profiles.test.ts
git commit -m "feat: define tgo resilience profiles"
```

---

## Task 4: Add Failure Fallback Eligibility And Circuit Breaker

**Files:**

- Create: `trans-genderian-orchestra-v2/src/resilience/fallback.ts`
- Create: `trans-genderian-orchestra-v2/src/resilience/fallback.test.ts`
- Create: `trans-genderian-orchestra-v2/src/resilience/circuit-breaker.ts`
- Create: `trans-genderian-orchestra-v2/src/resilience/circuit-breaker.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `trans-genderian-orchestra-v2/src/resilience/fallback.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { classifyFailureForFallback, shouldUseProviderFallback } from './fallback';

describe('fallback failure classification', () => {
  test('uses provider fallback only for structural provider failures', () => {
    expect(shouldUseProviderFallback('structural_provider')).toBe(true);
    expect(shouldUseProviderFallback('semantic')).toBe(false);
    expect(shouldUseProviderFallback('tool_schema')).toBe(false);
    expect(shouldUseProviderFallback('environmental_preexisting')).toBe(false);
  });

  test('classifies provider unavailable and empty response as structural provider', () => {
    expect(classifyFailureForFallback('model unavailable')).toBe('structural_provider');
    expect(classifyFailureForFallback('provider returned empty response')).toBe('structural_provider');
    expect(classifyFailureForFallback('reviewer rejected implementation')).toBe('semantic');
  });
});
```

Create `trans-genderian-orchestra-v2/src/resilience/circuit-breaker.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { createProviderCircuitBreaker } from './circuit-breaker';

describe('provider circuit breaker', () => {
  test('opens after threshold structural failures', () => {
    const breaker = createProviderCircuitBreaker({ threshold: 3, cooldown_ms: 300_000 });

    breaker.recordFailure('github-copilot/gpt-5.5', 1_000);
    breaker.recordFailure('github-copilot/gpt-5.5', 2_000);
    expect(breaker.canUse('github-copilot/gpt-5.5', 3_000)).toEqual({ allowed: true, state: 'closed' });
    breaker.recordFailure('github-copilot/gpt-5.5', 3_000);

    expect(breaker.canUse('github-copilot/gpt-5.5', 4_000)).toEqual({ allowed: false, state: 'open' });
  });

  test('allows one half-open probe after cooldown then closes on success', () => {
    const breaker = createProviderCircuitBreaker({ threshold: 2, cooldown_ms: 100 });
    breaker.recordFailure('provider/model', 0);
    breaker.recordFailure('provider/model', 10);

    expect(breaker.canUse('provider/model', 50)).toEqual({ allowed: false, state: 'open' });
    expect(breaker.canUse('provider/model', 120)).toEqual({ allowed: true, state: 'half-open' });
    breaker.recordSuccess('provider/model');

    expect(breaker.canUse('provider/model', 130)).toEqual({ allowed: true, state: 'closed' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd trans-genderian-orchestra-v2
bun test src/resilience/fallback.test.ts src/resilience/circuit-breaker.test.ts
```

Expected: FAIL with missing modules.

- [ ] **Step 3: Write minimal implementation**

Create `trans-genderian-orchestra-v2/src/resilience/fallback.ts`:

```ts
export type FailureClass =
  | 'structural_provider'
  | 'tool_schema'
  | 'semantic'
  | 'timeout_cancellation'
  | 'environmental_preexisting';

export function shouldUseProviderFallback(failureClass: FailureClass): boolean {
  return failureClass === 'structural_provider';
}

export function classifyFailureForFallback(summary: string): FailureClass {
  const normalized = summary.toLowerCase();
  if (
    normalized.includes('rate limit') ||
    normalized.includes('quota') ||
    normalized.includes('provider') ||
    normalized.includes('model unavailable') ||
    normalized.includes('empty response') ||
    normalized.includes('network') ||
    normalized.includes('5xx')
  ) {
    return 'structural_provider';
  }
  if (normalized.includes('schema') || normalized.includes('invalid json')) {
    return 'tool_schema';
  }
  if (normalized.includes('timeout') || normalized.includes('cancel')) {
    return 'timeout_cancellation';
  }
  if (normalized.includes('pre-existing') || normalized.includes('environment')) {
    return 'environmental_preexisting';
  }
  return 'semantic';
}
```

Create `trans-genderian-orchestra-v2/src/resilience/circuit-breaker.ts`:

```ts
export type CircuitState = 'closed' | 'open' | 'half-open';

export interface ProviderCircuitBreakerOptions {
  threshold: number;
  cooldown_ms: number;
}

export interface CircuitDecision {
  allowed: boolean;
  state: CircuitState;
}

interface CircuitRecord {
  failures: number;
  opened_at?: number;
  half_open_probe_used: boolean;
}

export interface ProviderCircuitBreaker {
  recordFailure(providerModel: string, nowMs: number): void;
  recordSuccess(providerModel: string): void;
  canUse(providerModel: string, nowMs: number): CircuitDecision;
}

export function createProviderCircuitBreaker(options: ProviderCircuitBreakerOptions): ProviderCircuitBreaker {
  const records = new Map<string, CircuitRecord>();

  function recordFor(providerModel: string): CircuitRecord {
    const existing = records.get(providerModel);
    if (existing) return existing;
    const created: CircuitRecord = { failures: 0, half_open_probe_used: false };
    records.set(providerModel, created);
    return created;
  }

  return {
    recordFailure(providerModel, nowMs) {
      const record = recordFor(providerModel);
      record.failures += 1;
      if (record.failures >= options.threshold) {
        record.opened_at = nowMs;
        record.half_open_probe_used = false;
      }
    },
    recordSuccess(providerModel) {
      records.set(providerModel, { failures: 0, half_open_probe_used: false });
    },
    canUse(providerModel, nowMs) {
      const record = recordFor(providerModel);
      if (record.opened_at === undefined) return { allowed: true, state: 'closed' };
      if (nowMs - record.opened_at < options.cooldown_ms) return { allowed: false, state: 'open' };
      if (!record.half_open_probe_used) {
        record.half_open_probe_used = true;
        return { allowed: true, state: 'half-open' };
      }
      return { allowed: false, state: 'open' };
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd trans-genderian-orchestra-v2
bun test src/resilience/fallback.test.ts src/resilience/circuit-breaker.test.ts
bun run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add trans-genderian-orchestra-v2/src/resilience/fallback.ts trans-genderian-orchestra-v2/src/resilience/fallback.test.ts trans-genderian-orchestra-v2/src/resilience/circuit-breaker.ts trans-genderian-orchestra-v2/src/resilience/circuit-breaker.test.ts
git commit -m "feat: add provider fallback resilience primitives"
```

---

## Task 5: Add Council Derivation From Active Models

**Files:**

- Create: `trans-genderian-orchestra-v2/src/models/council.ts`
- Create: `trans-genderian-orchestra-v2/src/models/council.test.ts`

- [ ] **Step 1: Write the failing test**

Create `trans-genderian-orchestra-v2/src/models/council.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { createBuiltInModelCatalog } from './presets';
import { deriveCouncilPlan, canSynthesizeCouncilResult } from './council';

describe('council derivation', () => {
  test('derives synthesizer from orchestrator and seats from researcher builder reviewer', () => {
    const balanced = createBuiltInModelCatalog().presets.balanced;
    const plan = deriveCouncilPlan(balanced);

    expect(plan.synthesizer_model).toEqual(balanced.roles['tgo-orchestrator'][0]);
    expect(plan.seats.map((seat) => seat.id)).toEqual([
      'researcher-model-councillor',
      'builder-model-councillor',
      'reviewer-model-councillor',
    ]);
    expect(plan.seats[0]).toMatchObject({
      source_role: 'tgo-researcher',
      focus: 'evidence quality, missing context, source reliability',
    });
  });

  test('keeps duplicate model seats by default and warns about low diversity', () => {
    const balanced = createBuiltInModelCatalog().presets.balanced;
    const duplicated = {
      ...balanced,
      roles: {
        ...balanced.roles,
        'tgo-builder': balanced.roles['tgo-reviewer'],
      },
    };

    const plan = deriveCouncilPlan(duplicated);

    expect(plan.seats).toHaveLength(3);
    expect(plan.warnings.map((warning) => warning.code)).toContain('low-council-model-diversity');
  });

  test('can synthesize from at least one successful councillor', () => {
    expect(canSynthesizeCouncilResult([{ seat_id: 'a', status: 'failed' }])).toBe(false);
    expect(canSynthesizeCouncilResult([{ seat_id: 'a', status: 'completed' }])).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd trans-genderian-orchestra-v2
bun test src/models/council.test.ts
```

Expected: FAIL with `Cannot find module './council'`.

- [ ] **Step 3: Write minimal implementation**

Create `trans-genderian-orchestra-v2/src/models/council.ts`:

```ts
import type { CommandNotice } from '../commands/result';
import type { TgoAgentId } from '../plugin/agent-ids';
import type { ModelEntry, ModelPresetDefinition } from './presets';

export interface CouncilSeatPlan {
  id: string;
  source_role: Extract<TgoAgentId, 'tgo-researcher' | 'tgo-builder' | 'tgo-reviewer'>;
  model: ModelEntry;
  focus: string;
}

export interface CouncilPlan {
  synthesizer_model: ModelEntry;
  seats: CouncilSeatPlan[];
  warnings: CommandNotice[];
}

export interface CouncilSeatResultStatus {
  seat_id: string;
  status: 'completed' | 'failed' | 'timed_out' | 'empty_response';
}

const SEAT_FOCI = {
  'tgo-researcher': 'evidence quality, missing context, source reliability',
  'tgo-builder': 'feasibility, sequencing, operational risk',
  'tgo-reviewer': 'correctness, verification gaps, failure modes',
} as const;

export function deriveCouncilPlan(preset: ModelPresetDefinition): CouncilPlan {
  const seats: CouncilSeatPlan[] = [
    { id: 'researcher-model-councillor', source_role: 'tgo-researcher', model: preset.roles['tgo-researcher'][0], focus: SEAT_FOCI['tgo-researcher'] },
    { id: 'builder-model-councillor', source_role: 'tgo-builder', model: preset.roles['tgo-builder'][0], focus: SEAT_FOCI['tgo-builder'] },
    { id: 'reviewer-model-councillor', source_role: 'tgo-reviewer', model: preset.roles['tgo-reviewer'][0], focus: SEAT_FOCI['tgo-reviewer'] },
  ];
  const uniqueModels = new Set(seats.map((seat) => seat.model.id));
  const warnings: CommandNotice[] = [];
  if (uniqueModels.size < seats.length) {
    warnings.push({
      code: 'low-council-model-diversity',
      message: 'Two or more council seats use the same underlying model; prompted perspectives are still kept as separate seats.',
      severity: 'warning',
    });
  }

  return { synthesizer_model: preset.roles['tgo-orchestrator'][0], seats, warnings };
}

export function canSynthesizeCouncilResult(results: CouncilSeatResultStatus[]): boolean {
  return results.some((result) => result.status === 'completed');
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd trans-genderian-orchestra-v2
bun test src/models/council.test.ts
bun run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add trans-genderian-orchestra-v2/src/models/council.ts trans-genderian-orchestra-v2/src/models/council.test.ts
git commit -m "feat: derive tgo council model seats"
```

---

## Task 6: Thread Model And Resilience Presets Through Bootstrap Doctor And Commands

**Files:**

- Modify: `trans-genderian-orchestra-v2/src/commands/bootstrap.ts`
- Modify: `trans-genderian-orchestra-v2/src/commands/bootstrap.test.ts`
- Modify: `trans-genderian-orchestra-v2/src/commands/doctor.ts`
- Modify: `trans-genderian-orchestra-v2/src/commands/doctor.test.ts`
- Modify: `trans-genderian-orchestra-v2/src/cli/index.ts`
- Modify: `trans-genderian-orchestra-v2/src/cli/args.test.ts`
- Modify: `trans-genderian-orchestra-v2/src/plugin/commands.ts`
- Modify: `trans-genderian-orchestra-v2/src/plugin/agents.test.ts`

- [ ] **Step 1: Write the failing tests**

Modify `trans-genderian-orchestra-v2/src/commands/bootstrap.test.ts`:

```ts
  test('apply records requested model and resilience presets without changing tools', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/tgo/manifest.jsonc': JSON.stringify({
        schema_version: 1,
        package: { name: 'trans-genderian-orchestra', version: '2.0.0-beta.0' },
        active_presets: { tools: 'all-bells', models: 'balanced', resilience: 'balanced' },
        managed_config: [],
        tools: [],
        backups: [],
        ignored_warnings: [],
      }),
      '/home/user/.config/opencode/opencode.jsonc': '{"plugin":["user-plugin"]}',
    });

    await runBootstrap({
      fs,
      homeDir: '/home/user',
      mode: 'apply',
      operationId: 'op-model-resilience',
      timestamp: '2026-06-02T10-00-00-000Z',
      tools: 'all-bells',
      models: 'balanced',
      resilience: 'aggressive',
      detector: { async which(command) { return ['git', 'bd', 'ctx7'].includes(command) ? `/usr/bin/${command}` : undefined; } },
    });

    const manifest = JSON.parse(await fs.readText('/home/user/.config/opencode/tgo/manifest.jsonc'));
    expect(manifest.active_presets).toEqual({
      tools: 'all-bells',
      models: 'balanced',
      resilience: 'aggressive',
    });
  });
```

Add `models: 'balanced'` and `resilience: 'balanced'` to every existing `runBootstrap` test call.

Modify `trans-genderian-orchestra-v2/src/commands/doctor.test.ts`:

```ts
  test('reports active preset dimensions and model alias conflicts read-only', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/tgo/manifest.jsonc': JSON.stringify({
        schema_version: 1,
        package: { name: 'trans-genderian-orchestra', version: '2.0.0-beta.0' },
        active_presets: { tools: 'default', models: 'balanced', resilience: 'aggressive' },
        managed_config: [],
        tools: [],
        backups: [],
        ignored_warnings: [],
      }),
      '/home/user/.config/opencode/opencode.jsonc': JSON.stringify({
        modelPresets: { custom: { roles: { 'tgo-builder': [{ id: 'canonical/builder' }] } } },
        presets: { custom: { roles: { 'tgo-builder': [{ id: 'legacy/builder' }] } } },
      }),
    });

    const result = await runDoctor({
      fs,
      homeDir: '/home/user',
      detector: { async which(command) { return ['git', 'bd'].includes(command) ? `/usr/bin/${command}` : undefined; } },
    });

    expect(result.warnings).toContainEqual({
      code: 'active-presets',
      message: 'Active TGO presets: tools=default, models=balanced, resilience=aggressive.',
      severity: 'info',
    });
    expect(result.warnings.map((warning) => warning.code)).toContain('model-presets-alias-conflict');
    expect(result.warnings.map((warning) => warning.code)).toContain('high-semantic-retry-budget');
    expect(await fs.readText('/home/user/.config/opencode/opencode.jsonc')).toContain('canonical/builder');
  });
```

Modify `trans-genderian-orchestra-v2/src/plugin/agents.test.ts` command-config test to assert:

```ts
    expect(commands['tgo:models'].template).toContain('modelPresets');
    expect(commands['tgo:models'].template).toContain('legacy /preset alias');
    expect(commands['tgo:models'].template).toContain('structural/provider failures only');
    expect(commands.preset.template).toContain('legacy compatibility alias');
```

Modify `trans-genderian-orchestra-v2/src/cli/args.test.ts` to keep existing parser expectations and no new parser syntax; this test already covers `--models` and `--resilience` strings.

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd trans-genderian-orchestra-v2
bun test src/commands/bootstrap.test.ts src/commands/doctor.test.ts src/plugin/agents.test.ts src/cli/args.test.ts
```

Expected failures:

- `runBootstrap` input type does not yet include `models` and `resilience`.
- Doctor does not emit active preset/model alias/resilience warnings.
- `/tgo:models` template lacks modelPresets/legacy/fallback wording.

- [ ] **Step 3: Write minimal implementation**

Modify `trans-genderian-orchestra-v2/src/commands/bootstrap.ts`:

- Import `type ModelPreset, type ResiliencePreset` from `../manifest/schema`.
- Add `models: ModelPreset` and `resilience: ResiliencePreset` to `BootstrapInput`.
- In apply mode, set `manifest.active_presets.models = input.models` and `manifest.active_presets.resilience = input.resilience` next to the existing tools assignment.
- Keep config merge driven only by `input.tools` so changing models/resilience does not mutate MCP/tool registrations.
- Update `manifest_updates` summary to `Recorded ${input.tools} tools, ${input.models} models, and ${input.resilience} resilience presets.`

Modify `trans-genderian-orchestra-v2/src/cli/index.ts`:

- Import `type ModelPreset, type ResiliencePreset` from `../manifest/schema`.
- Add `parseResiliencePresetName(value)` that returns `conservative`, `balanced`, or `aggressive`, defaulting to `balanced`.
- Add `parseModelPresetName(value)` that returns `value || 'balanced'` as `ModelPreset`.
- Pass `models: parseModelPresetName(args.models)` and `resilience: parseResiliencePresetName(args.resilience)` to `runBootstrap`.

Modify `trans-genderian-orchestra-v2/src/commands/doctor.ts`:

- Import `resolveModelPresetCatalog` from `../models/config`.
- Import `planResilienceSwitch` from `../resilience/profiles`.
- After manifest load, push info warning:
  - code `active-presets`
  - message `Active TGO presets: tools=${tools}, models=${models}, resilience=${resilience}.`
  - severity `info`
- After config parse, call `resolveModelPresetCatalog(config)` and push returned warnings.
- Call `planResilienceSwitch({ current: manifest.active_presets, requested_resilience: manifest.active_presets.resilience })` and push returned warnings.
- Keep doctor read-only and preserve existing secret, missing-agent, user-managed MCP, and tool detection behavior.

Modify `trans-genderian-orchestra-v2/src/plugin/commands.ts`:

- Change `/tgo:models` template to: `Inspect or switch TGO model presets through canonical modelPresets, preserving tool and resilience presets. Treat legacy /preset alias and legacy presets config as model-preset compatibility only. Provider fallback is allowed for structural/provider failures only, never semantic failures.`
- Change `preset` alias template to: `Route this legacy compatibility alias to /tgo:models.`

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd trans-genderian-orchestra-v2
bun test src/commands/bootstrap.test.ts src/commands/doctor.test.ts src/plugin/agents.test.ts src/cli/args.test.ts
bun run typecheck
bun run check:ci
```

Expected: PASS. If Biome reports formatting, run `bunx biome check src/commands/bootstrap.ts src/commands/bootstrap.test.ts src/commands/doctor.ts src/commands/doctor.test.ts src/cli/index.ts src/plugin/commands.ts src/plugin/agents.test.ts --write` and rerun.

- [ ] **Step 5: Commit**

```bash
git add trans-genderian-orchestra-v2/src/commands/bootstrap.ts trans-genderian-orchestra-v2/src/commands/bootstrap.test.ts trans-genderian-orchestra-v2/src/commands/doctor.ts trans-genderian-orchestra-v2/src/commands/doctor.test.ts trans-genderian-orchestra-v2/src/cli/index.ts trans-genderian-orchestra-v2/src/plugin/commands.ts trans-genderian-orchestra-v2/src/plugin/agents.test.ts
git commit -m "feat: wire tgo model and resilience presets"
```

---

## Task 7: Run Phase 6 Validation Gate

**Files:**

- All Phase 6 files.
- Update ignored `.slim/deepwork/tgo-v2-phased-implementation.md` after merge.

- [ ] **Step 1: Run targeted tests**

```bash
cd trans-genderian-orchestra-v2
bun test src/models/presets.test.ts src/models/config.test.ts src/models/council.test.ts
bun test src/resilience/profiles.test.ts src/resilience/fallback.test.ts src/resilience/circuit-breaker.test.ts
bun test src/commands/bootstrap.test.ts src/commands/doctor.test.ts src/cli/args.test.ts src/plugin/agents.test.ts
```

Expected: all targeted tests pass.

- [ ] **Step 2: Run full verification**

```bash
cd trans-genderian-orchestra-v2
bun test
bun run typecheck
bun run check:ci
bun run build
```

Expected: all commands exit 0.

- [ ] **Step 3: Run Phase 6 model/resilience smoke**

```bash
cd trans-genderian-orchestra-v2
bun -e '
import { createBuiltInModelCatalog, planModelPresetSwitch } from "./src/models/presets.ts";
import { deriveCouncilPlan, canSynthesizeCouncilResult } from "./src/models/council.ts";
import { planResilienceSwitch } from "./src/resilience/profiles.ts";
import { classifyFailureForFallback, shouldUseProviderFallback } from "./src/resilience/fallback.ts";
import { createProviderCircuitBreaker } from "./src/resilience/circuit-breaker.ts";

const catalog = createBuiltInModelCatalog();
const modelSwitch = planModelPresetSwitch({
  current: { tools: "default", models: "balanced", resilience: "balanced" },
  requested_model_preset: "balanced",
  available_model_presets: catalog.presets,
});
const resilienceSwitch = planResilienceSwitch({
  current: { tools: "default", models: "balanced", resilience: "balanced" },
  requested_resilience: "aggressive",
});
const council = deriveCouncilPlan(catalog.presets.balanced);
const breaker = createProviderCircuitBreaker({ threshold: 2, cooldown_ms: 100 });
breaker.recordFailure("github-copilot/gpt-5.5", 0);
breaker.recordFailure("github-copilot/gpt-5.5", 10);
const openDecision = breaker.canUse("github-copilot/gpt-5.5", 50);
const halfOpenDecision = breaker.canUse("github-copilot/gpt-5.5", 120);

console.log(JSON.stringify({
  smoke: "phase6-model-resilience",
  model_switch: modelSwitch.status,
  resilience: resilienceSwitch.next_active_presets.resilience,
  provider_fallback: shouldUseProviderFallback(classifyFailureForFallback("provider returned empty response")),
  semantic_no_fallback: !shouldUseProviderFallback(classifyFailureForFallback("reviewer rejected implementation")),
  circuit_open: openDecision.state === "open" && openDecision.allowed === false,
  circuit_half_open: halfOpenDecision.state === "half-open" && halfOpenDecision.allowed === true,
  council_seats: council.seats.length,
  council_partial: canSynthesizeCouncilResult([{ seat_id: "a", status: "failed" }, { seat_id: "b", status: "completed" }]),
}, null, 2));
'
```

Expected output:

```json
{
  "smoke": "phase6-model-resilience",
  "model_switch": "ready",
  "resilience": "aggressive",
  "provider_fallback": true,
  "semantic_no_fallback": true,
  "circuit_open": true,
  "circuit_half_open": true,
  "council_seats": 3,
  "council_partial": true
}
```

- [ ] **Step 4: Run Phase 6 bootstrap smoke**

```bash
cd trans-genderian-orchestra-v2
export TGO_TEST_HOME=$(mktemp -d)
mkdir -p "$TGO_TEST_HOME/.config/opencode"
printf '%s\n' '{"plugin":["user-plugin"],"mcp":{"user-mcp":{"type":"remote"}}}' > "$TGO_TEST_HOME/.config/opencode/opencode.jsonc"
bun ./src/cli/index.ts bootstrap --tools bare-bones --models balanced --resilience aggressive --yes --json >/tmp/tgo-phase6-bootstrap.json
bun -e '
const fs = await import("node:fs/promises");
const home = process.env.TGO_TEST_HOME;
const config = JSON.parse(await fs.readFile(`${home}/.config/opencode/opencode.jsonc`, "utf8"));
const manifest = JSON.parse(await fs.readFile(`${home}/.config/opencode/tgo/manifest.jsonc`, "utf8"));
console.log(JSON.stringify({
  smoke: "phase6-bootstrap-presets",
  user_plugin_preserved: config.plugin.includes("user-plugin"),
  user_mcp_preserved: Boolean(config.mcp["user-mcp"]),
  tools: manifest.active_presets.tools,
  models: manifest.active_presets.models,
  resilience: manifest.active_presets.resilience,
}, null, 2));
'
```

Expected output:

```json
{
  "smoke": "phase6-bootstrap-presets",
  "user_plugin_preserved": true,
  "user_mcp_preserved": true,
  "tools": "bare-bones",
  "models": "balanced",
  "resilience": "aggressive"
}
```

- [ ] **Step 5: Inline reviewer-style self-review**

Run:

```bash
PHASE6_PLAN_COMMIT=$(git log --format=%H --grep='docs: add tgo v2 phase 6 plan' -n 1)
git diff --stat "$PHASE6_PLAN_COMMIT..HEAD"
git diff --name-status "$PHASE6_PLAN_COMMIT..HEAD"
PLACEHOLDER_PATTERN='TO''DO|T''BD|fill'' in|implement'' later|Similar'' to Task|appropriate'' error handling|Write'' tests for the above'
grep -R -E "$PLACEHOLDER_PATTERN" trans-genderian-orchestra-v2/src/models trans-genderian-orchestra-v2/src/resilience trans-genderian-orchestra-v2/src/commands trans-genderian-orchestra-v2/src/plugin || true
```

Expected:

- Diff includes only planned Phase 6 files.
- Placeholder scan prints no matches.
- Confirm no raw provider credentials or secrets were introduced.

- [ ] **Step 6: Commit validation fixes if needed**

If formatting or review fixes were needed:

```bash
git add trans-genderian-orchestra-v2/src/models trans-genderian-orchestra-v2/src/resilience trans-genderian-orchestra-v2/src/commands trans-genderian-orchestra-v2/src/cli trans-genderian-orchestra-v2/src/plugin
git commit -m "chore: finish phase 6 validation"
```

Skip this commit if the branch is already clean and verified.

- [ ] **Step 7: Merge locally into master**

From root repository:

```bash
git status --short
git merge --ff-only tgo-v2-phase-6
```

Expected:

- Only pre-existing `.beads/interactions.jsonl` and `.beads/issues.jsonl` are dirty before merge.
- Fast-forward merge succeeds.
- No remote push.

- [ ] **Step 8: Verify merged master**

Run all full verification commands and both Phase 6 smokes again on merged `master`, changing smoke labels to `phase6-model-resilience-master` and `phase6-bootstrap-presets-master`.

- [ ] **Step 9: Update ignored deepwork context and clean worktree**

Update `.slim/deepwork/tgo-v2-phased-implementation.md` with:

- Phase 6 plan commit.
- Phase 6 implementation commits.
- Branch and merged-master verification evidence.
- Any inline review findings.
- Next active phase: Phase 7 beta migration and release cutover planning.

Then remove owned worktree:

```bash
git worktree remove .worktrees/tgo-v2-phase-6
git worktree prune
git worktree list
```

Expected: only root checkout remains.

## Completion Criteria

Phase 6 is complete only when:

- Phase 6 plan is committed.
- Model preset catalog and switch planning tests pass.
- Canonical `modelPresets` and legacy `presets` alias behavior tests pass.
- Resilience profile and switch planning tests pass.
- Provider fallback eligibility tests prove semantic failures do not rotate models.
- Circuit breaker tests prove threshold/open/cooldown/half-open/close behavior.
- Council derivation tests prove seats derive from active Researcher/Builder/Reviewer models.
- Bootstrap records `--models` and `--resilience` in manifest without changing tool behavior.
- Doctor reports active preset dimensions and alias/resilience warnings read-only.
- Full tests, typecheck, check, build, and smokes pass on branch and merged `master`.
- No remote push occurs without explicit approval.
