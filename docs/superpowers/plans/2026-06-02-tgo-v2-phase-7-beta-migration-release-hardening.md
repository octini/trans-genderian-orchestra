# TGO v2 Phase 7 Beta Migration And Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic Phase 7 release-hardening primitives for v1/omo-slim migration preview, v2 replacement planning, manifest-linked rollback, uninstall of TGO-managed entries, release gate checks, and migration documentation.

**Architecture:** Keep Phase 7 as pure TypeScript planning/apply helpers plus bounded command wiring. Migration, uninstall, rollback, and release-gate checks operate on injectable filesystem/config/manifest data and never push, publish, cut over the repo root, or mutate real user config during tests.

**Tech Stack:** TypeScript, Bun test, existing `FileSystemAdapter`, existing deterministic command result contract, existing OpenCode config/manifest helpers, Biome.

---

## Scope Boundary

### In Scope

- V1/omo-slim-era OpenCode config detection.
- Migration preview showing v1-era entries and replacement actions.
- Deterministic config replacement helper that removes detected v1-era active entries and adds v2 managed entries, so v1 and v2 do not run side-by-side after approved migration.
- Manifest-linked rollback helper that restores the config from a recorded backup path.
- Uninstall helper and deterministic command that removes only TGO-managed config entries and leaves user-managed providers, plugins, MCPs, agents, and external CLIs intact.
- Doctor migration/uninstall/release-hardening guidance.
- Stable release gate checker for the approved umbrella spec gates.
- `MIGRATION.md` plus updated v2 `README.md` and package files list.

### Out Of Scope

- Moving v2 package contents to repository root.
- Tagging or archiving v1.
- Publishing npm packages or changing dist-tags.
- Running `git push`, opening PRs, merging to main, deleting worktrees, or cleaning branches automatically.
- Removing user-managed tools, global CLIs, OAuth state, or non-TGO config entries.
- Full executable `/tgo:setup` repair workflows beyond deterministic command metadata and helper modules.
- Manual OpenCode agent workflow validation; Phase 7 documents exact prompts but does not require a running OpenCode session for CI.

### Reuse Justification

- Reuse existing v2 `OpenCodeConfig`, `applyManagedEntries`, manifest store, backup store, filesystem adapter, and command result contract because they are already covered by Phase 1-6 tests and are the correct deterministic surface for config mutation.
- Do not copy v1 implementation modules. V1 package/config values are used only as behavioral references for migration detection names.

---

## File Structure

Create:

- `trans-genderian-orchestra-v2/src/release/migration.ts` — detects v1-era config and plans/builds v2 replacement config.
- `trans-genderian-orchestra-v2/src/release/migration.test.ts` — migration detection and replacement tests.
- `trans-genderian-orchestra-v2/src/release/rollback.ts` — plans and applies manifest-linked backup restore.
- `trans-genderian-orchestra-v2/src/release/rollback.test.ts` — rollback plan/apply tests.
- `trans-genderian-orchestra-v2/src/release/uninstall.ts` — removes TGO-managed config entries only.
- `trans-genderian-orchestra-v2/src/release/uninstall.test.ts` — unmanaged preservation and managed removal tests.
- `trans-genderian-orchestra-v2/src/release/stable-gates.ts` — stable release gate checklist evaluation.
- `trans-genderian-orchestra-v2/src/release/stable-gates.test.ts` — release gate blocking/ready tests.
- `trans-genderian-orchestra-v2/src/commands/uninstall.ts` — deterministic uninstall command using manifest ownership and backups.
- `trans-genderian-orchestra-v2/src/commands/uninstall.test.ts` — dry-run/apply uninstall command tests.
- `trans-genderian-orchestra-v2/MIGRATION.md` — v1/omo-slim to v2 migration guide.

Modify:

- `trans-genderian-orchestra-v2/src/commands/doctor.ts` — report v1 migration preview and stale stable-gate guidance read-only.
- `trans-genderian-orchestra-v2/src/commands/doctor.test.ts` — doctor migration warning coverage.
- `trans-genderian-orchestra-v2/src/cli/args.ts` — parse `uninstall` command flags.
- `trans-genderian-orchestra-v2/src/cli/args.test.ts` — uninstall CLI parsing coverage.
- `trans-genderian-orchestra-v2/src/cli/index.ts` — route `uninstall` command.
- `trans-genderian-orchestra-v2/src/plugin/commands.ts` — add `/tgo:uninstall` guidance and update setup/release wording.
- `trans-genderian-orchestra-v2/src/plugin/agents.test.ts` — command metadata assertions.
- `trans-genderian-orchestra-v2/package.json` — include `MIGRATION.md` in package files.
- `trans-genderian-orchestra-v2/README.md` — update from Phase 1-only wording to current beta state and release boundary.

---

## Task Metadata

```yaml
task_id: phase7-beta-migration-release-hardening
depends_on:
  - phase6-model-resilience-council
allowed_write_paths:
  - trans-genderian-orchestra-v2/src/release/**
  - trans-genderian-orchestra-v2/src/commands/uninstall.ts
  - trans-genderian-orchestra-v2/src/commands/uninstall.test.ts
  - trans-genderian-orchestra-v2/src/commands/doctor.ts
  - trans-genderian-orchestra-v2/src/commands/doctor.test.ts
  - trans-genderian-orchestra-v2/src/cli/args.ts
  - trans-genderian-orchestra-v2/src/cli/args.test.ts
  - trans-genderian-orchestra-v2/src/cli/index.ts
  - trans-genderian-orchestra-v2/src/plugin/commands.ts
  - trans-genderian-orchestra-v2/src/plugin/agents.test.ts
  - trans-genderian-orchestra-v2/package.json
  - trans-genderian-orchestra-v2/README.md
  - trans-genderian-orchestra-v2/MIGRATION.md
validation_commands:
  - bun test src/release/migration.test.ts src/release/rollback.test.ts src/release/uninstall.test.ts src/release/stable-gates.test.ts
  - bun test src/commands/uninstall.test.ts src/commands/doctor.test.ts src/cli/args.test.ts src/plugin/agents.test.ts
  - bun test
  - bun run typecheck
  - bun run check:ci
  - bun run build
parallel_group: phase7-serial
risk_level: medium
requires_user_decision: false
artifact_refs:
  - docs/superpowers/plans/2026-06-02-tgo-v2-phase-7-beta-migration-release-hardening.md
```

---

## Task 1: Add V1 Migration Detection And Replacement Planning

**Files:**

- Create: `trans-genderian-orchestra-v2/src/release/migration.ts`
- Create: `trans-genderian-orchestra-v2/src/release/migration.test.ts`

- [ ] **Step 1: Write the failing migration tests**

Create `src/release/migration.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { planDefaultManagedEntries } from '../config/managed-entries';
import {
  buildV2ReplacementConfig,
  detectV1EraConfig,
  planMigrationPreview,
} from './migration';

describe('release migration planning', () => {
  test('detects v1-era omo-slim config without mutating it', () => {
    const config = {
      plugin: ['oh-my-opencode-slim', 'trans-genderian-orchestra@2.0.0-beta.13'],
      agent: {
        orchestrator: { prompt: 'v1 orchestrator' },
        builder: { prompt: 'v1 builder' },
        'user-agent': { prompt: 'keep me' },
      },
      mcp: {
        websearch: { type: 'remote' },
        'user-search': { type: 'remote' },
      },
    };

    const detection = detectV1EraConfig(config);

    expect(detection.has_v1_config).toBe(true);
    expect(detection.indicators.map((indicator) => indicator.key)).toEqual([
      'plugin.oh-my-opencode-slim',
      'plugin.trans-genderian-orchestra@2.0.0-beta.13',
      'agent.orchestrator',
      'agent.builder',
      'mcp.websearch',
    ]);
    expect(config.plugin).toContain('oh-my-opencode-slim');
  });

  test('migration preview plans v2 replacement instead of side-by-side install', () => {
    const config = {
      plugin: ['oh-my-opencode-slim', 'user-plugin'],
      agent: { orchestrator: {}, 'user-agent': {} },
      mcp: { websearch: {}, 'user-mcp': {} },
    };

    const preview = planMigrationPreview(config, planDefaultManagedEntries('default'));

    expect(preview.status).toBe('migration_available');
    expect(preview.planned_actions.map((action) => action.id)).toEqual([
      'remove-v1-plugin-oh-my-opencode-slim',
      'remove-v1-agent-orchestrator',
      'remove-v1-mcp-websearch',
      'register-v2-managed-entries',
    ]);
    expect(preview.requires_confirmation).toBe(true);
  });

  test('replacement config removes v1 active entries and preserves user-owned entries', () => {
    const config = {
      plugin: ['oh-my-opencode-slim', 'user-plugin'],
      agent: { orchestrator: {}, 'user-agent': {} },
      mcp: { websearch: {}, 'user-mcp': {} },
      provider: { custom: {} },
    };

    const replacement = buildV2ReplacementConfig(
      config,
      planDefaultManagedEntries('bare-bones'),
    );

    expect(replacement.plugin).not.toContain('oh-my-opencode-slim');
    expect(replacement.plugin).toContain('user-plugin');
    expect(replacement.plugin).toContain('trans-genderian-orchestra@2.0.0-beta.0');
    expect(replacement.agent?.orchestrator).toBeUndefined();
    expect(replacement.agent?.['user-agent']).toEqual({});
    expect(replacement.agent?.['tgo-orchestrator']).toBeDefined();
    expect(replacement.mcp?.websearch).toBeUndefined();
    expect(replacement.mcp?.['user-mcp']).toEqual({});
    expect(replacement.provider).toEqual({ custom: {} });
  });
});
```

- [ ] **Step 2: Run the migration tests red**

Run:

```bash
bun test src/release/migration.test.ts
```

Expected: fails with `Cannot find module './migration'`.

- [ ] **Step 3: Implement migration planning**

Create `src/release/migration.ts`:

```ts
import type { PlannedAction } from '../commands/result';
import {
  applyManagedEntries,
  type OpenCodeConfig,
} from '../config/opencode-config';
import type { ManagedEntries } from '../config/managed-entries';

export type V1ConfigIndicatorKind = 'plugin' | 'agent' | 'mcp';

export interface V1ConfigIndicator {
  kind: V1ConfigIndicatorKind;
  key: string;
  reason: string;
}

export interface V1ConfigDetection {
  has_v1_config: boolean;
  indicators: V1ConfigIndicator[];
}

export interface MigrationPreview {
  status: 'no_v1_config' | 'migration_available';
  indicators: V1ConfigIndicator[];
  planned_actions: PlannedAction[];
  requires_confirmation: boolean;
}

const V1_PLUGIN_PATTERNS = [
  'oh-my-opencode-slim',
  'omo-slim',
  'opencode-slim',
  'trans-genderian-orchestra@2.0.0-beta.13',
] as const;

const V1_AGENT_IDS = [
  'orchestrator',
  'planner',
  'researcher',
  'builder',
  'reviewer',
  'council',
] as const;

const V1_MCP_IDS = ['websearch', 'grep_app', 'grep-app', 'github', 'serena'] as const;

function pluginName(entry: string | [string, Record<string, unknown>]): string {
  return Array.isArray(entry) ? entry[0] : entry;
}

function isV1Plugin(plugin: string): boolean {
  return V1_PLUGIN_PATTERNS.some((pattern) => plugin.includes(pattern));
}

export function detectV1EraConfig(config: OpenCodeConfig): V1ConfigDetection {
  const indicators: V1ConfigIndicator[] = [];

  for (const entry of config.plugin ?? []) {
    const plugin = pluginName(entry);
    if (isV1Plugin(plugin)) {
      indicators.push({
        kind: 'plugin',
        key: `plugin.${plugin}`,
        reason: 'V1 or omo-slim plugin entry is active.',
      });
    }
  }

  for (const agentId of V1_AGENT_IDS) {
    if (config.agent?.[agentId]) {
      indicators.push({
        kind: 'agent',
        key: `agent.${agentId}`,
        reason: 'Non-namespaced v1 agent entry is active.',
      });
    }
  }

  for (const mcpId of V1_MCP_IDS) {
    if (config.mcp?.[mcpId]) {
      indicators.push({
        kind: 'mcp',
        key: `mcp.${mcpId}`,
        reason: 'Non-namespaced v1 MCP entry is active.',
      });
    }
  }

  return { has_v1_config: indicators.length > 0, indicators };
}

function actionIdForIndicator(indicator: V1ConfigIndicator): string {
  return `remove-v1-${indicator.key.replace('.', '-').replaceAll('@', '-')}`;
}

export function planMigrationPreview(
  config: OpenCodeConfig,
  entries: ManagedEntries,
): MigrationPreview {
  const detection = detectV1EraConfig(config);
  if (!detection.has_v1_config) {
    return {
      status: 'no_v1_config',
      indicators: [],
      planned_actions: [],
      requires_confirmation: false,
    };
  }

  const planned_actions: PlannedAction[] = detection.indicators.map((indicator) => ({
    id: actionIdForIndicator(indicator),
    title: `Remove ${indicator.key}`,
    target: indicator.key,
    action: 'remove',
    requires_confirmation: true,
  }));

  planned_actions.push({
    id: 'register-v2-managed-entries',
    title: 'Register TGO v2 managed entries',
    target: 'opencode-config',
    action: 'update',
    requires_confirmation: true,
  });

  return {
    status: 'migration_available',
    indicators: detection.indicators,
    planned_actions,
    requires_confirmation: true,
  };
}

export function buildV2ReplacementConfig(
  config: OpenCodeConfig,
  entries: ManagedEntries,
): OpenCodeConfig {
  const next: OpenCodeConfig = {
    ...config,
    plugin: (config.plugin ?? []).filter((entry) => !isV1Plugin(pluginName(entry))),
    agent: { ...(config.agent ?? {}) },
    mcp: { ...(config.mcp ?? {}) },
  };

  for (const agentId of V1_AGENT_IDS) {
    delete next.agent?.[agentId];
  }
  for (const mcpId of V1_MCP_IDS) {
    delete next.mcp?.[mcpId];
  }

  return applyManagedEntries(next, entries).config;
}
```

- [ ] **Step 4: Run migration tests green and static checks**

Run:

```bash
bun test src/release/migration.test.ts
bun run typecheck
bun run check:ci
```

Expected: all pass. If Biome reports formatting, run:

```bash
bunx biome check src/release/migration.ts src/release/migration.test.ts --write
bun test src/release/migration.test.ts
bun run typecheck
bun run check:ci
```

- [ ] **Step 5: Commit Task 1**

```bash
git add trans-genderian-orchestra-v2/src/release/migration.ts trans-genderian-orchestra-v2/src/release/migration.test.ts
git commit -m "feat: plan tgo v1 migration replacement"
```

---

## Task 2: Add Manifest-Linked Rollback Helpers

**Files:**

- Create: `trans-genderian-orchestra-v2/src/release/rollback.ts`
- Create: `trans-genderian-orchestra-v2/src/release/rollback.test.ts`

- [ ] **Step 1: Write the failing rollback tests**

Create `src/release/rollback.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { createMemoryFileSystem } from '../filesystem/memory-adapter';
import type { TgoManifest } from '../manifest/schema';
import { applyManifestLinkedRollback, planManifestLinkedRollback } from './rollback';

function manifest(): TgoManifest {
  return {
    schema_version: 1,
    package: { name: 'trans-genderian-orchestra', version: '2.0.0-beta.0' },
    active_presets: { tools: 'default', models: 'balanced', resilience: 'balanced' },
    managed_config: [],
    tools: [],
    backups: [
      {
        operation_id: 'op-1',
        created_at: '2026-06-02T10-00-00-000Z',
        path: '/home/user/.config/opencode/tgo/backups/op-1/opencode.jsonc',
        source_path: '/home/user/.config/opencode/opencode.jsonc',
      },
    ],
    ignored_warnings: [],
  };
}

describe('manifest-linked rollback', () => {
  test('plans rollback from the latest manifest backup', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/tgo/backups/op-1/opencode.jsonc': '{"plugin":["v1"]}',
    });

    const plan = await planManifestLinkedRollback(fs, manifest());

    expect(plan.status).toBe('ready');
    expect(plan.planned_action).toEqual({
      id: 'restore-op-1-backup',
      title: 'Restore OpenCode config from manifest-linked backup op-1',
      target: '/home/user/.config/opencode/opencode.jsonc',
      action: 'update',
      requires_confirmation: true,
    });
  });

  test('blocks rollback when manifest backup is missing', async () => {
    const fs = createMemoryFileSystem();

    const plan = await planManifestLinkedRollback(fs, manifest());

    expect(plan.status).toBe('blocked');
    expect(plan.blocked_reason).toBe('backup_not_found');
  });

  test('applies rollback by restoring backup content to source path', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/tgo/backups/op-1/opencode.jsonc': '{"plugin":["v1"]}',
      '/home/user/.config/opencode/opencode.jsonc': '{"plugin":["v2"]}',
    });

    const result = await applyManifestLinkedRollback(fs, manifest());

    expect(result.status).toBe('applied');
    expect(await fs.readText('/home/user/.config/opencode/opencode.jsonc')).toBe(
      '{"plugin":["v1"]}',
    );
  });
});
```

- [ ] **Step 2: Run rollback tests red**

Run:

```bash
bun test src/release/rollback.test.ts
```

Expected: fails with `Cannot find module './rollback'`.

- [ ] **Step 3: Implement rollback helpers**

Create `src/release/rollback.ts`:

```ts
import type { PlannedAction } from '../commands/result';
import type { FileSystemAdapter } from '../filesystem/adapter';
import type { BackupManifestRecord, TgoManifest } from '../manifest/schema';

export interface RollbackPlan {
  status: 'ready' | 'blocked';
  backup?: BackupManifestRecord;
  planned_action?: PlannedAction;
  blocked_reason?: 'no_manifest_backups' | 'backup_not_found';
}

export interface RollbackApplyResult {
  status: 'applied' | 'blocked';
  restored_path?: string;
  blocked_reason?: RollbackPlan['blocked_reason'];
}

function latestBackup(manifest: TgoManifest): BackupManifestRecord | undefined {
  return manifest.backups.at(-1);
}

export async function planManifestLinkedRollback(
  fs: FileSystemAdapter,
  manifest: TgoManifest,
): Promise<RollbackPlan> {
  const backup = latestBackup(manifest);
  if (!backup) {
    return { status: 'blocked', blocked_reason: 'no_manifest_backups' };
  }
  if (!(await fs.exists(backup.path))) {
    return { status: 'blocked', backup, blocked_reason: 'backup_not_found' };
  }
  return {
    status: 'ready',
    backup,
    planned_action: {
      id: `restore-${backup.operation_id}-backup`,
      title: `Restore OpenCode config from manifest-linked backup ${backup.operation_id}`,
      target: backup.source_path,
      action: 'update',
      requires_confirmation: true,
    },
  };
}

export async function applyManifestLinkedRollback(
  fs: FileSystemAdapter,
  manifest: TgoManifest,
): Promise<RollbackApplyResult> {
  const plan = await planManifestLinkedRollback(fs, manifest);
  if (plan.status !== 'ready' || !plan.backup) {
    return { status: 'blocked', blocked_reason: plan.blocked_reason };
  }
  const backupText = await fs.readText(plan.backup.path);
  await fs.writeText(plan.backup.source_path, backupText);
  return { status: 'applied', restored_path: plan.backup.source_path };
}
```

- [ ] **Step 4: Run rollback tests green and static checks**

Run:

```bash
bun test src/release/rollback.test.ts
bun run typecheck
bun run check:ci
```

Expected: all pass. If formatting fails, run Biome on the two rollback files and rerun checks.

- [ ] **Step 5: Commit Task 2**

```bash
git add trans-genderian-orchestra-v2/src/release/rollback.ts trans-genderian-orchestra-v2/src/release/rollback.test.ts
git commit -m "feat: plan tgo manifest rollback"
```

---

## Task 3: Add TGO-Managed Uninstall Helpers

**Files:**

- Create: `trans-genderian-orchestra-v2/src/release/uninstall.ts`
- Create: `trans-genderian-orchestra-v2/src/release/uninstall.test.ts`

- [ ] **Step 1: Write the failing uninstall helper tests**

Create `src/release/uninstall.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import type { TgoManifest } from '../manifest/schema';
import { removeTgoManagedConfigEntries } from './uninstall';

function manifest(): TgoManifest {
  return {
    schema_version: 1,
    package: { name: 'trans-genderian-orchestra', version: '2.0.0-beta.0' },
    active_presets: { tools: 'default', models: 'balanced', resilience: 'balanced' },
    managed_config: [
      { kind: 'plugin', key: 'plugin.trans-genderian-orchestra@2.0.0-beta.0' },
      { kind: 'agent', key: 'agent.tgo-builder' },
      { kind: 'mcp', key: 'mcp.tgo-websearch' },
      { kind: 'default_agent', key: 'default_agent' },
    ],
    tools: [],
    backups: [],
    ignored_warnings: [],
  };
}

describe('TGO managed uninstall helpers', () => {
  test('removes only manifest-owned config entries', () => {
    const config = {
      plugin: ['trans-genderian-orchestra@2.0.0-beta.0', 'user-plugin'],
      agent: { 'tgo-builder': {}, 'user-agent': {} },
      mcp: { 'tgo-websearch': {}, 'user-mcp': {} },
      provider: { custom: {} },
      default_agent: 'tgo-orchestrator',
    };

    const result = removeTgoManagedConfigEntries(config, manifest());

    expect(result.config.plugin).toEqual(['user-plugin']);
    expect(result.config.agent).toEqual({ 'user-agent': {} });
    expect(result.config.mcp).toEqual({ 'user-mcp': {} });
    expect(result.config.provider).toEqual({ custom: {} });
    expect(result.config.default_agent).toBeUndefined();
    expect(result.removed_keys).toEqual([
      'plugin.trans-genderian-orchestra@2.0.0-beta.0',
      'agent.tgo-builder',
      'mcp.tgo-websearch',
      'default_agent',
    ]);
  });

  test('does not remove matching user entries when manifest does not own them', () => {
    const result = removeTgoManagedConfigEntries(
      { plugin: ['user-plugin'], agent: { 'tgo-builder': {} } },
      { ...manifest(), managed_config: [] },
    );

    expect(result.config.plugin).toEqual(['user-plugin']);
    expect(result.config.agent?.['tgo-builder']).toEqual({});
    expect(result.removed_keys).toEqual([]);
  });
});
```

- [ ] **Step 2: Run uninstall helper tests red**

Run:

```bash
bun test src/release/uninstall.test.ts
```

Expected: fails with `Cannot find module './uninstall'`.

- [ ] **Step 3: Implement uninstall helper**

Create `src/release/uninstall.ts`:

```ts
import type { OpenCodeConfig } from '../config/opencode-config';
import type { ManagedConfigEntry, TgoManifest } from '../manifest/schema';

export interface RemoveManagedConfigResult {
  config: OpenCodeConfig;
  removed_keys: string[];
}

function pluginName(entry: string | [string, Record<string, unknown>]): string {
  return Array.isArray(entry) ? entry[0] : entry;
}

function removeEntry(config: OpenCodeConfig, entry: ManagedConfigEntry): boolean {
  if (entry.kind === 'plugin') {
    const plugin = entry.key.replace(/^plugin\./, '');
    const before = config.plugin?.length ?? 0;
    config.plugin = (config.plugin ?? []).filter((item) => pluginName(item) !== plugin);
    return (config.plugin?.length ?? 0) !== before;
  }
  if (entry.kind === 'agent') {
    const agentId = entry.key.replace(/^agent\./, '');
    const existed = Boolean(config.agent?.[agentId]);
    delete config.agent?.[agentId];
    return existed;
  }
  if (entry.kind === 'mcp') {
    const mcpId = entry.key.replace(/^mcp\./, '');
    const existed = Boolean(config.mcp?.[mcpId]);
    delete config.mcp?.[mcpId];
    return existed;
  }
  if (entry.kind === 'default_agent' && config.default_agent === 'tgo-orchestrator') {
    delete config.default_agent;
    return true;
  }
  return false;
}

export function removeTgoManagedConfigEntries(
  config: OpenCodeConfig,
  manifest: TgoManifest,
): RemoveManagedConfigResult {
  const next: OpenCodeConfig = {
    ...config,
    plugin: [...(config.plugin ?? [])],
    agent: { ...(config.agent ?? {}) },
    mcp: { ...(config.mcp ?? {}) },
  };
  const removed_keys: string[] = [];

  for (const entry of manifest.managed_config) {
    if (removeEntry(next, entry)) {
      removed_keys.push(entry.key);
    }
  }

  return { config: next, removed_keys };
}
```

- [ ] **Step 4: Run uninstall helper tests green and static checks**

Run:

```bash
bun test src/release/uninstall.test.ts
bun run typecheck
bun run check:ci
```

Expected: all pass. If formatting fails, run Biome on the two uninstall helper files and rerun checks.

- [ ] **Step 5: Commit Task 3**

```bash
git add trans-genderian-orchestra-v2/src/release/uninstall.ts trans-genderian-orchestra-v2/src/release/uninstall.test.ts
git commit -m "feat: remove tgo managed config entries"
```

---

## Task 4: Add Deterministic Uninstall Command And CLI Route

**Files:**

- Create: `trans-genderian-orchestra-v2/src/commands/uninstall.ts`
- Create: `trans-genderian-orchestra-v2/src/commands/uninstall.test.ts`
- Modify: `trans-genderian-orchestra-v2/src/cli/args.ts`
- Modify: `trans-genderian-orchestra-v2/src/cli/args.test.ts`
- Modify: `trans-genderian-orchestra-v2/src/cli/index.ts`
- Modify: `trans-genderian-orchestra-v2/src/plugin/commands.ts`
- Modify: `trans-genderian-orchestra-v2/src/plugin/agents.test.ts`

- [ ] **Step 1: Write failing uninstall command and CLI tests**

Create `src/commands/uninstall.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { createMemoryFileSystem } from '../filesystem/memory-adapter';
import { runUninstall } from './uninstall';

const manifestText = JSON.stringify({
  schema_version: 1,
  package: { name: 'trans-genderian-orchestra', version: '2.0.0-beta.0' },
  active_presets: { tools: 'default', models: 'balanced', resilience: 'balanced' },
  managed_config: [
    { kind: 'plugin', key: 'plugin.trans-genderian-orchestra@2.0.0-beta.0' },
    { kind: 'agent', key: 'agent.tgo-builder' },
    { kind: 'mcp', key: 'mcp.tgo-websearch' },
    { kind: 'default_agent', key: 'default_agent' },
  ],
  tools: [],
  backups: [],
  ignored_warnings: [],
});

describe('uninstall command', () => {
  test('dry-run previews managed removals without writing files', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/tgo/manifest.jsonc': manifestText,
      '/home/user/.config/opencode/opencode.jsonc': JSON.stringify({
        plugin: ['trans-genderian-orchestra@2.0.0-beta.0', 'user-plugin'],
        agent: { 'tgo-builder': {}, 'user-agent': {} },
        mcp: { 'tgo-websearch': {}, 'user-mcp': {} },
        default_agent: 'tgo-orchestrator',
      }),
    });

    const result = await runUninstall({
      fs,
      homeDir: '/home/user',
      mode: 'dry-run',
      operationId: 'uninstall-1',
      timestamp: '2026-06-02T10-00-00-000Z',
    });

    expect(result.planned_actions.map((action) => action.id)).toEqual([
      'remove-tgo-managed-config',
    ]);
    expect(result.changes_applied).toEqual([]);
    expect(await fs.readText('/home/user/.config/opencode/opencode.jsonc')).toContain(
      'trans-genderian-orchestra@2.0.0-beta.0',
    );
  });

  test('apply backs up config, removes managed entries, and preserves user entries', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/tgo/manifest.jsonc': manifestText,
      '/home/user/.config/opencode/opencode.jsonc': JSON.stringify({
        plugin: ['trans-genderian-orchestra@2.0.0-beta.0', 'user-plugin'],
        agent: { 'tgo-builder': {}, 'user-agent': {} },
        mcp: { 'tgo-websearch': {}, 'user-mcp': {} },
        default_agent: 'tgo-orchestrator',
      }),
    });

    const result = await runUninstall({
      fs,
      homeDir: '/home/user',
      mode: 'apply',
      operationId: 'uninstall-2',
      timestamp: '2026-06-02T10-00-00-000Z',
    });

    expect(result.backups_created).toHaveLength(1);
    expect(result.restart_required).toBe(true);
    const config = JSON.parse(await fs.readText('/home/user/.config/opencode/opencode.jsonc'));
    expect(config.plugin).toEqual(['user-plugin']);
    expect(config.agent).toEqual({ 'user-agent': {} });
    expect(config.mcp).toEqual({ 'user-mcp': {} });
    expect(config.default_agent).toBeUndefined();
  });
});
```

Modify `src/cli/args.test.ts` with a test:

```ts
test('parses uninstall flags', () => {
  expect(parseCliArgs(['uninstall', '--yes', '--json'])).toEqual({
    command: 'uninstall',
    yes: true,
    json: true,
  });
});
```

Modify `src/plugin/agents.test.ts` in the command config test:

```ts
expect(commands['tgo:uninstall'].template).toContain(
  'remove only TGO-managed entries',
);
expect(commands['tgo:uninstall'].template).toContain('manifest-linked backup');
expect(commands['tgo:uninstall'].template).toContain('must not uninstall shared CLIs');
```

- [ ] **Step 2: Run command tests red**

Run:

```bash
bun test src/commands/uninstall.test.ts src/cli/args.test.ts src/plugin/agents.test.ts
```

Expected: missing `./uninstall` module and command metadata/parser failures.

- [ ] **Step 3: Implement uninstall command and CLI route**

Create `src/commands/uninstall.ts`:

```ts
import { join } from 'node:path';
import { createBackup } from '../backup/store';
import { parseOpenCodeConfig, serializeOpenCodeConfig } from '../config/opencode-config';
import type { FileSystemAdapter } from '../filesystem/adapter';
import { readManifest, writeManifest } from '../manifest/store';
import { removeTgoManagedConfigEntries } from '../release/uninstall';
import { createEmptyCommandResult, markRestartRequired, type DeterministicCommandResult } from './result';

export interface UninstallInput {
  fs: FileSystemAdapter;
  homeDir: string;
  mode: 'dry-run' | 'apply';
  operationId: string;
  timestamp: string;
}

function globalConfigPath(homeDir: string): string {
  return join(homeDir, '.config/opencode/opencode.jsonc').replaceAll('\\', '/');
}

function globalManifestPath(homeDir: string): string {
  return join(homeDir, '.config/opencode/tgo/manifest.jsonc').replaceAll('\\', '/');
}

function globalBackupRoot(homeDir: string): string {
  return join(homeDir, '.config/opencode/tgo/backups').replaceAll('\\', '/');
}

export async function runUninstall(input: UninstallInput): Promise<DeterministicCommandResult> {
  const result = createEmptyCommandResult('uninstall', input.mode);
  const configPath = globalConfigPath(input.homeDir);
  const manifestPath = globalManifestPath(input.homeDir);
  const manifest = await readManifest(input.fs, manifestPath);
  const existingText = (await input.fs.exists(configPath)) ? await input.fs.readText(configPath) : '{}';
  const existingConfig = parseOpenCodeConfig(existingText);
  const removed = removeTgoManagedConfigEntries(existingConfig, manifest);

  result.planned_actions.push({
    id: 'remove-tgo-managed-config',
    title: `Remove ${removed.removed_keys.length} TGO-managed config entries`,
    target: configPath,
    action: 'remove',
    requires_confirmation: true,
  });
  result.next_steps.push('Review uninstall preview before applying with --yes.');

  if (input.mode === 'dry-run') {
    return result;
  }

  const backup = await createBackup(input.fs, {
    backupRoot: globalBackupRoot(input.homeDir),
    operationId: input.operationId,
    sourcePath: configPath,
    timestamp: input.timestamp,
  });
  result.backups_created.push(backup);
  await input.fs.writeText(configPath, serializeOpenCodeConfig(removed.config));
  result.changes_applied.push({
    id: 'write-uninstalled-opencode-config',
    title: 'Write OpenCode config without TGO-managed entries',
    target: configPath,
  });
  manifest.managed_config = [];
  manifest.backups.push({
    operation_id: input.operationId,
    created_at: input.timestamp,
    path: backup.path,
    source_path: backup.source_path,
  });
  await writeManifest(input.fs, manifestPath, manifest);
  result.manifest_updates.push({
    path: manifestPath,
    key: 'managed_config',
    value_summary: 'Cleared TGO-managed config entries after uninstall.',
  });
  markRestartRequired(result, 'OpenCode config changed.');
  return result;
}
```

Modify `src/cli/args.ts` so `CliArgs` includes `{ command: 'uninstall'; yes: boolean; json: boolean }` and `parseCliArgs()` returns that shape for `uninstall`.

Modify `src/cli/index.ts` to import `runUninstall`, include `trans-genderian-orchestra uninstall [--yes] [--json]` in help, and route the command with `mode: args.yes ? 'apply' : 'dry-run'`.

Modify `src/plugin/commands.ts` to add:

```ts
'tgo:uninstall': {
  description: 'Preview and remove TGO-managed setup entries safely.',
  template:
    'Run deterministic TGO uninstall with preview. It must remove only TGO-managed entries recorded in the manifest, create or reference a manifest-linked backup for rollback, and must not uninstall shared CLIs such as bd, ctx7, gh, or uvx.',
},
```

- [ ] **Step 4: Run command tests green and static checks**

Run:

```bash
bun test src/commands/uninstall.test.ts src/cli/args.test.ts src/plugin/agents.test.ts
bun run typecheck
bun run check:ci
```

Expected: all pass. If formatting fails, run Biome on touched files and rerun checks.

- [ ] **Step 5: Commit Task 4**

```bash
git add trans-genderian-orchestra-v2/src/commands/uninstall.ts trans-genderian-orchestra-v2/src/commands/uninstall.test.ts trans-genderian-orchestra-v2/src/cli/args.ts trans-genderian-orchestra-v2/src/cli/args.test.ts trans-genderian-orchestra-v2/src/cli/index.ts trans-genderian-orchestra-v2/src/plugin/commands.ts trans-genderian-orchestra-v2/src/plugin/agents.test.ts
git commit -m "feat: add deterministic tgo uninstall command"
```

---

## Task 5: Add Doctor Migration Warning And Stable Release Gate Checks

**Files:**

- Create: `trans-genderian-orchestra-v2/src/release/stable-gates.ts`
- Create: `trans-genderian-orchestra-v2/src/release/stable-gates.test.ts`
- Modify: `trans-genderian-orchestra-v2/src/commands/doctor.ts`
- Modify: `trans-genderian-orchestra-v2/src/commands/doctor.test.ts`

- [ ] **Step 1: Write failing release-gate and doctor tests**

Create `src/release/stable-gates.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { evaluateStableReleaseGates } from './stable-gates';

describe('stable release gates', () => {
  test('blocks latest when any stable gate is missing', () => {
    const result = evaluateStableReleaseGates({
      bootstrap_dry_run_apply_backup_rollback_uninstall: true,
      doctor_drift_and_v1_detection: true,
      init_scaffolding: false,
      default_preset_clean_config: true,
      beta_migration_restore_v1: true,
      orchestrator_builder_reviewer_flow: false,
      parallel_integration_reviewer_flow: true,
      delegation_envelopes: true,
      beads_issue_approval: true,
      secret_handling: true,
      readme_and_migration_docs: true,
      v1_tagged_or_archived: false,
    });

    expect(result.status).toBe('blocked');
    expect(result.missing_gates).toEqual([
      'init_scaffolding',
      'orchestrator_builder_reviewer_flow',
      'v1_tagged_or_archived',
    ]);
    expect(result.can_publish_latest).toBe(false);
  });

  test('allows latest only when every gate passes', () => {
    const passed = Object.fromEntries(
      [
        'bootstrap_dry_run_apply_backup_rollback_uninstall',
        'doctor_drift_and_v1_detection',
        'init_scaffolding',
        'default_preset_clean_config',
        'beta_migration_restore_v1',
        'orchestrator_builder_reviewer_flow',
        'parallel_integration_reviewer_flow',
        'delegation_envelopes',
        'beads_issue_approval',
        'secret_handling',
        'readme_and_migration_docs',
        'v1_tagged_or_archived',
      ].map((gate) => [gate, true]),
    );

    const result = evaluateStableReleaseGates(passed);

    expect(result.status).toBe('ready');
    expect(result.missing_gates).toEqual([]);
    expect(result.can_publish_latest).toBe(true);
  });
});
```

Add a doctor test to `src/commands/doctor.test.ts`:

```ts
test('reports v1 migration preview without mutating config', async () => {
  const fs = createMemoryFileSystem({
    '/home/user/.config/opencode/tgo/manifest.jsonc': JSON.stringify({
      schema_version: 1,
      package: { name: 'trans-genderian-orchestra', version: '2.0.0-beta.0' },
      active_presets: { tools: 'default', models: 'balanced', resilience: 'balanced' },
      managed_config: [],
      tools: [],
      backups: [],
      ignored_warnings: [],
    }),
    '/home/user/.config/opencode/opencode.jsonc': JSON.stringify({
      plugin: ['oh-my-opencode-slim'],
      agent: { orchestrator: {} },
      mcp: { websearch: {} },
    }),
  });

  const result = await runDoctor({
    fs,
    homeDir: '/home/user',
    detector: { async which(command) { return ['git', 'bd'].includes(command) ? `/usr/bin/${command}` : undefined; } },
  });

  expect(result.warnings).toContainEqual({
    code: 'v1-migration-available',
    message: 'V1/omo-slim config detected; run bootstrap/setup migration preview before enabling TGO v2 replacement.',
    severity: 'warning',
  });
  expect(result.planned_actions.map((action) => action.id)).toContain(
    'register-v2-managed-entries',
  );
  expect(await fs.readText('/home/user/.config/opencode/opencode.jsonc')).toContain(
    'oh-my-opencode-slim',
  );
});
```

- [ ] **Step 2: Run release/doctor tests red**

Run:

```bash
bun test src/release/stable-gates.test.ts src/commands/doctor.test.ts
```

Expected: release gate module missing and doctor missing migration warning/action.

- [ ] **Step 3: Implement stable gates and doctor migration warning**

Create `src/release/stable-gates.ts`:

```ts
export type StableReleaseGate =
  | 'bootstrap_dry_run_apply_backup_rollback_uninstall'
  | 'doctor_drift_and_v1_detection'
  | 'init_scaffolding'
  | 'default_preset_clean_config'
  | 'beta_migration_restore_v1'
  | 'orchestrator_builder_reviewer_flow'
  | 'parallel_integration_reviewer_flow'
  | 'delegation_envelopes'
  | 'beads_issue_approval'
  | 'secret_handling'
  | 'readme_and_migration_docs'
  | 'v1_tagged_or_archived';

export type StableReleaseGateInput = Partial<Record<StableReleaseGate, boolean>>;

export interface StableReleaseGateResult {
  status: 'ready' | 'blocked';
  missing_gates: StableReleaseGate[];
  can_publish_latest: boolean;
}

export const STABLE_RELEASE_GATES: StableReleaseGate[] = [
  'bootstrap_dry_run_apply_backup_rollback_uninstall',
  'doctor_drift_and_v1_detection',
  'init_scaffolding',
  'default_preset_clean_config',
  'beta_migration_restore_v1',
  'orchestrator_builder_reviewer_flow',
  'parallel_integration_reviewer_flow',
  'delegation_envelopes',
  'beads_issue_approval',
  'secret_handling',
  'readme_and_migration_docs',
  'v1_tagged_or_archived',
];

export function evaluateStableReleaseGates(
  input: StableReleaseGateInput,
): StableReleaseGateResult {
  const missing_gates = STABLE_RELEASE_GATES.filter((gate) => input[gate] !== true);
  return {
    status: missing_gates.length === 0 ? 'ready' : 'blocked',
    missing_gates,
    can_publish_latest: missing_gates.length === 0,
  };
}
```

Modify `src/commands/doctor.ts` to import `planDefaultManagedEntries` and `planMigrationPreview`. After parsing config, call `planMigrationPreview(config, planDefaultManagedEntries(manifest.active_presets.tools))`. If status is `migration_available`, push warning:

```ts
{
  code: 'v1-migration-available',
  message: 'V1/omo-slim config detected; run bootstrap/setup migration preview before enabling TGO v2 replacement.',
  severity: 'warning',
}
```

Also push `...migration.planned_actions` into `result.planned_actions`. Do not write config.

- [ ] **Step 4: Run release/doctor tests green and static checks**

Run:

```bash
bun test src/release/stable-gates.test.ts src/commands/doctor.test.ts
bun run typecheck
bun run check:ci
```

Expected: all pass. If formatting fails, run Biome on touched files and rerun checks.

- [ ] **Step 5: Commit Task 5**

```bash
git add trans-genderian-orchestra-v2/src/release/stable-gates.ts trans-genderian-orchestra-v2/src/release/stable-gates.test.ts trans-genderian-orchestra-v2/src/commands/doctor.ts trans-genderian-orchestra-v2/src/commands/doctor.test.ts
git commit -m "feat: report tgo migration and release gates"
```

---

## Task 6: Add Migration Documentation And Package Release Metadata

**Files:**

- Create: `trans-genderian-orchestra-v2/MIGRATION.md`
- Modify: `trans-genderian-orchestra-v2/README.md`
- Modify: `trans-genderian-orchestra-v2/package.json`

- [ ] **Step 1: Write failing docs/package assertions**

Add a small package metadata test at `src/release/docs.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('release documentation', () => {
  test('package ships migration documentation', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

    expect(pkg.files).toContain('MIGRATION.md');
  });

  test('migration guide documents v1 replacement and rollback boundaries', () => {
    const migration = readFileSync(new URL('../../MIGRATION.md', import.meta.url), 'utf8');

    expect(migration).toContain('V1/omo-slim detection');
    expect(migration).toContain('v2 replaces v1 rather than running side-by-side');
    expect(migration).toContain('manifest-linked backup');
    expect(migration).toContain('No automatic push, PR, latest publish, root cutover, or worktree cleanup');
  });

  test('readme reflects current beta scope', () => {
    const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');

    expect(readme).toContain('2.0.0-beta');
    expect(readme).toContain('bootstrap --tools default --models balanced --resilience balanced');
    expect(readme).toContain('Phase 7 release hardening');
  });
});
```

- [ ] **Step 2: Run docs tests red**

Run:

```bash
bun test src/release/docs.test.ts
```

Expected: fails because `MIGRATION.md` is missing and README/package metadata do not contain expected text.

- [ ] **Step 3: Add docs and package metadata**

Create `MIGRATION.md` with sections:

```md
# Migrating From v1 / omo-slim To TGO v2

## V1/omo-slim detection

TGO v2 doctor and migration preview detect old `oh-my-opencode-slim`, `omo-slim`, non-namespaced v1 agents, and non-namespaced v1 MCP entries.

## Replacement rule

After explicit approval, v2 replaces v1 rather than running side-by-side. The migration preview removes active v1-era entries and adds TGO v2-managed entries while preserving user-owned providers, plugins, MCPs, agents, and custom config.

## Rollback

Rollback restores the previous OpenCode config from a manifest-linked backup. TGO does not guess backup paths.

## Uninstall

Uninstall removes only TGO-managed entries recorded in the manifest. It does not uninstall shared CLIs such as `bd`, `ctx7`, `gh`, or `uvx`.

## Release boundary

No automatic push, PR, latest publish, root cutover, or worktree cleanup happens without explicit approval.
```

Update `README.md` from Phase 1-only wording to mention current beta implementation, bootstrap command, deterministic setup/doctor/uninstall, and Phase 7 release hardening.

Update `package.json` files list to include `MIGRATION.md`.

- [ ] **Step 4: Run docs tests green and static checks**

Run:

```bash
bun test src/release/docs.test.ts
bun run typecheck
bun run check:ci
```

Expected: all pass. If formatting fails, run Biome on touched files and rerun checks.

- [ ] **Step 5: Commit Task 6**

```bash
git add trans-genderian-orchestra-v2/MIGRATION.md trans-genderian-orchestra-v2/README.md trans-genderian-orchestra-v2/package.json trans-genderian-orchestra-v2/src/release/docs.test.ts
git commit -m "docs: add tgo v2 migration release guidance"
```

---

## Task 7: Run Phase 7 Validation Gate

**Files:**

- No new source files expected beyond previous tasks.
- May modify only touched files if validation exposes formatting/type/test issues.

- [ ] **Step 1: Run targeted Phase 7 tests**

Run:

```bash
bun test src/release/migration.test.ts src/release/rollback.test.ts src/release/uninstall.test.ts src/release/stable-gates.test.ts src/release/docs.test.ts
bun test src/commands/uninstall.test.ts src/commands/doctor.test.ts src/cli/args.test.ts src/plugin/agents.test.ts
```

Expected: all pass.

- [ ] **Step 2: Run full package verification**

Run:

```bash
bun test
bun run typecheck
bun run check:ci
bun run build
```

Expected: all pass.

- [ ] **Step 3: Run Phase 7 migration/release smoke**

Run:

```bash
bun -e '
import { planDefaultManagedEntries } from "./src/config/managed-entries.ts";
import { buildV2ReplacementConfig, planMigrationPreview } from "./src/release/migration.ts";
import { evaluateStableReleaseGates } from "./src/release/stable-gates.ts";
const config = { plugin: ["oh-my-opencode-slim", "user-plugin"], agent: { orchestrator: {}, "user-agent": {} }, mcp: { websearch: {}, "user-mcp": {} } };
const entries = planDefaultManagedEntries("bare-bones");
const preview = planMigrationPreview(config, entries);
const replacement = buildV2ReplacementConfig(config, entries);
const gates = evaluateStableReleaseGates({
  bootstrap_dry_run_apply_backup_rollback_uninstall: true,
  doctor_drift_and_v1_detection: true,
  init_scaffolding: true,
  default_preset_clean_config: true,
  beta_migration_restore_v1: true,
  orchestrator_builder_reviewer_flow: true,
  parallel_integration_reviewer_flow: true,
  delegation_envelopes: true,
  beads_issue_approval: true,
  secret_handling: true,
  readme_and_migration_docs: true,
  v1_tagged_or_archived: false,
});
console.log(JSON.stringify({
  smoke: "phase7-migration-release",
  migration: preview.status,
  v1_removed: !replacement.plugin?.includes("oh-my-opencode-slim") && !replacement.agent?.orchestrator && !replacement.mcp?.websearch,
  user_preserved: replacement.plugin?.includes("user-plugin") && Boolean(replacement.agent?.["user-agent"]) && Boolean(replacement.mcp?.["user-mcp"]),
  latest_blocked: gates.status === "blocked" && gates.missing_gates.includes("v1_tagged_or_archived"),
}, null, 2));
'
```

Expected output:

```json
{
  "smoke": "phase7-migration-release",
  "migration": "migration_available",
  "v1_removed": true,
  "user_preserved": true,
  "latest_blocked": true
}
```

- [ ] **Step 4: Run Phase 7 uninstall/rollback smoke with temp HOME**

Run:

```bash
export TGO_TEST_HOME=$(mktemp -d)
mkdir -p "$TGO_TEST_HOME/.config/opencode/tgo/backups/op-v1"
cat > "$TGO_TEST_HOME/.config/opencode/opencode.jsonc" <<'JSON'
{"plugin":["trans-genderian-orchestra@2.0.0-beta.0","user-plugin"],"agent":{"tgo-builder":{},"user-agent":{}},"mcp":{"tgo-websearch":{},"user-mcp":{}},"default_agent":"tgo-orchestrator"}
JSON
cat > "$TGO_TEST_HOME/.config/opencode/tgo/backups/op-v1/opencode.jsonc" <<'JSON'
{"plugin":["oh-my-opencode-slim","user-plugin"]}
JSON
cat > "$TGO_TEST_HOME/.config/opencode/tgo/manifest.jsonc" <<JSON
{"schema_version":1,"package":{"name":"trans-genderian-orchestra","version":"2.0.0-beta.0"},"active_presets":{"tools":"default","models":"balanced","resilience":"balanced"},"managed_config":[{"kind":"plugin","key":"plugin.trans-genderian-orchestra@2.0.0-beta.0"},{"kind":"agent","key":"agent.tgo-builder"},{"kind":"mcp","key":"mcp.tgo-websearch"},{"kind":"default_agent","key":"default_agent"}],"tools":[],"backups":[{"operation_id":"op-v1","created_at":"2026-06-02T10-00-00-000Z","path":"$TGO_TEST_HOME/.config/opencode/tgo/backups/op-v1/opencode.jsonc","source_path":"$TGO_TEST_HOME/.config/opencode/opencode.jsonc"}],"ignored_warnings":[]}
JSON
bun ./src/cli/index.ts uninstall --yes --json > /tmp/tgo-phase7-uninstall.json
bun -e '
import { readFileSync } from "node:fs";
const result = JSON.parse(readFileSync("/tmp/tgo-phase7-uninstall.json", "utf8"));
const config = JSON.parse(readFileSync(`${process.env.TGO_TEST_HOME}/.config/opencode/opencode.jsonc`, "utf8"));
console.log(JSON.stringify({
  smoke: "phase7-uninstall-rollback",
  applied: result.changes_applied.some((change) => change.id === "write-uninstalled-opencode-config"),
  backup_created: result.backups_created.length === 1,
  tgo_removed: !config.plugin?.includes("trans-genderian-orchestra@2.0.0-beta.0") && !config.agent?.["tgo-builder"] && !config.mcp?.["tgo-websearch"] && !config.default_agent,
  user_preserved: config.plugin?.includes("user-plugin") && Boolean(config.agent?.["user-agent"]) && Boolean(config.mcp?.["user-mcp"]),
}, null, 2));
'
```

Expected output:

```json
{
  "smoke": "phase7-uninstall-rollback",
  "applied": true,
  "backup_created": true,
  "tgo_removed": true,
  "user_preserved": true
}
```

- [ ] **Step 5: Inline reviewer-style self-review**

Run:

```bash
PHASE7_PLAN_COMMIT=$(git log --format=%H --grep='docs: add tgo v2 phase 7 plan' -n 1)
git diff --stat "$PHASE7_PLAN_COMMIT..HEAD"
git diff --name-status "$PHASE7_PLAN_COMMIT..HEAD"
PLACEHOLDER_PATTERN='TO''DO|T''BD|fill'' in|implement'' later|Similar'' to Task|appropriate'' error handling|Write'' tests for the above'
grep -R -E "$PLACEHOLDER_PATTERN" src/release src/commands src/cli src/plugin README.md MIGRATION.md package.json || true
```

Expected: changed files match the planned Phase 7 source/docs files; placeholder scan prints no matches.

- [ ] **Step 6: Commit any validation-only fixes**

If formatting or copy fixes are needed, keep them scoped and commit with a specific message. If no changes are pending, skip this step.

- [ ] **Step 7: Merge locally and verify merged master**

From repository root:

```bash
git status --short
git merge --ff-only tgo-v2-phase-7
cd trans-genderian-orchestra-v2
bun test
bun run typecheck
bun run check:ci
bun run build
```

Then rerun the two Phase 7 smoke commands with smoke labels changed to `phase7-migration-release-master` and `phase7-uninstall-rollback-master`.

Expected: all pass. Root status after merge should still show only the pre-existing Beads metadata dirtiness unless the user changed other files.

- [ ] **Step 8: Update deepwork and cleanup**

Update `.slim/deepwork/tgo-v2-phased-implementation.md` with Phase 7 summary, verification results, and any remaining manual validation boundaries.

Remove owned worktree from root:

```bash
git worktree remove .worktrees/tgo-v2-phase-7
git worktree prune
git worktree list
git status --short
```

Expected: Phase 7 worktree removed, no remote push performed.

---

## Phase 7 Completion Criteria

- Phase 7 plan committed on `master`.
- V1/omo-slim config detection and migration preview implemented and tested.
- V2 replacement planning removes active v1-era entries while preserving user-owned config.
- Manifest-linked rollback helpers implemented and tested.
- Deterministic uninstall command removes only manifest-owned TGO entries and preserves user entries.
- Doctor reports v1 migration opportunities without writing config.
- Stable release gate checker blocks `latest` until every umbrella gate passes.
- `MIGRATION.md`, README beta/release-boundary wording, and package files metadata are updated.
- Targeted tests, full test suite, typecheck, Biome CI check, build, and Phase 7 smokes pass on branch and merged `master`.
- No remote push, PR, root cutover, latest publish, v1 tag/archive, or worktree cleanup beyond the owned Phase 7 worktree happens without explicit user approval.

## Manual Validation Prompt For Later

Phase 7 does not require live OpenCode manual validation to merge this deterministic slice. Before stable/latest release, run these prompts in a real OpenCode session after installing the beta package into a disposable profile:

```text
Run /tgo:doctor --json against a profile containing old omo-slim entries and summarize the migration preview without applying it.
```

Expected: doctor reports v1 migration availability, planned v2 replacement, and no config writes.

```text
Run /tgo:uninstall as a dry-run and explain exactly which manifest-owned entries would be removed.
```

Expected: only TGO-managed plugin/agents/MCP/default-agent entries are listed; shared CLIs and user-managed providers/plugins/MCPs/agents are not listed for removal.
