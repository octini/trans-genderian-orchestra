# TGO v2 Phase 2 Agent Roster And Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Phase 1 single-agent shell with the full namespaced TGO v2 agent roster, role permission profiles, and bootstrap/doctor checks that preserve user-owned agents.

**Architecture:** Phase 2 keeps implementation inside `trans-genderian-orchestra-v2/` and adds focused plugin modules for agent definitions, command metadata, and permission profiles. Bootstrap-managed entries will register all namespaced agents and their permissions, while doctor verifies required managed agents and warns about missing or altered TGO-managed roster entries without modifying user config.

**Tech Stack:** TypeScript, Bun test, `@opencode-ai/plugin`, local OpenCode config helper types, Biome.

---

## Source Specs

- `designs/tgo-v2/specs/00-umbrella-architecture.md`
- `designs/tgo-v2/specs/01-agent-workflow-delegation-review.md`
- `designs/tgo-v2/specs/02-bootstrap-setup-doctor-manifests.md`
- `designs/tgo-v2/specs/07-implementation-phases-validation-gates.md`
- `docs/superpowers/plans/2026-06-02-tgo-v2-phase-1-bootstrap-foundation.md`

## Phase 2 Scope Boundary

In scope:

- Namespaced TGO role IDs: `tgo-orchestrator`, `tgo-researcher`, `tgo-builder`, `tgo-reviewer`, `tgo-council`, `tgo-councillor`.
- Minimal but role-specific prompts that encode Phase 2 boundaries.
- Role permission profiles matching the approved design at config level.
- Plugin entrypoint that registers all namespaced agents and command metadata through focused modules.
- Bootstrap-managed config entries for all namespaced agents.
- Doctor warnings when required TGO-managed agents are missing or visibly changed.
- Tests proving user-managed agents remain preserved.

Out of scope:

- Final orchestrator workflow prompt.
- Delegation envelope enforcement.
- Artifact lifecycle implementation.
- Path-gating hook internals.
- Beads issue workflows, worktrees, parallel scheduling, and council runtime execution.

## Reuse Justification

No v1 source module should be copied wholesale in Phase 2.

Approved reference-only reuse:

- `trans-genderian-orchestra/src/agents/index.ts`: use permission profile concepts and role boundary categories as a reference. Checked assumption: v2 uses namespaced role IDs and stricter Phase 2 scope, so exact allowlists and old planner role are not copied. V2 tests cover generated permission profiles directly.
- `designs/tgo-v2/specs/01-agent-workflow-delegation-review.md`: use role boundary text and gate requirements as source of truth. V2 tests cover presence of all role IDs and role-specific permissions.

If any v1 source code is copied later, add a new reuse justification before doing so.

## File Structure

Create these files:

- `trans-genderian-orchestra-v2/src/plugin/agent-ids.ts`: role ID constants and `TgoAgentId` union.
- `trans-genderian-orchestra-v2/src/plugin/permissions.ts`: permission profile types and default permissions by role.
- `trans-genderian-orchestra-v2/src/plugin/agents.ts`: role-specific agent definitions.
- `trans-genderian-orchestra-v2/src/plugin/commands.ts`: namespaced command metadata.
- `trans-genderian-orchestra-v2/src/plugin/agents.test.ts`: agent roster and permission behavior tests.

Modify these files:

- `trans-genderian-orchestra-v2/src/index.ts`: import and register plugin agents/commands.
- `trans-genderian-orchestra-v2/src/config/managed-entries.ts`: manage all namespaced agents instead of only `tgo-orchestrator`.
- `trans-genderian-orchestra-v2/src/config/opencode-config.ts`: ensure all managed agents merge without replacing user agents.
- `trans-genderian-orchestra-v2/src/config/opencode-config.test.ts`: extend tests for full roster preservation.
- `trans-genderian-orchestra-v2/src/commands/bootstrap.test.ts`: expect manifest/config to include all managed agents.
- `trans-genderian-orchestra-v2/src/commands/doctor.ts`: warn about missing TGO-managed agents.
- `trans-genderian-orchestra-v2/src/commands/doctor.test.ts`: verify missing-agent warnings and no writes.

## Task Metadata

```yaml
task_id: phase2-agent-roster-permissions
goal: Register the full namespaced TGO agent roster with role permission profiles.
acceptance_criteria:
  - Plugin config registers six TGO-managed agents with namespaced IDs.
  - Bootstrap apply writes all six managed agents without removing user-managed agents.
  - Agent permission profiles match Phase 2 role boundaries.
  - Doctor reports missing required TGO-managed agents in read-only mode.
  - Phase 2 validation commands pass.
dependencies:
  - phase1-bootstrap-foundation
declared_write_scope:
  - trans-genderian-orchestra-v2/src/plugin/**
  - trans-genderian-orchestra-v2/src/index.ts
  - trans-genderian-orchestra-v2/src/config/**
  - trans-genderian-orchestra-v2/src/commands/doctor.ts
  - trans-genderian-orchestra-v2/src/commands/*.test.ts
expected_read_context:
  - designs/tgo-v2/specs/00-umbrella-architecture.md
  - designs/tgo-v2/specs/01-agent-workflow-delegation-review.md
  - trans-genderian-orchestra-v2/src/index.ts
validation_commands:
  - bun test src/plugin/agents.test.ts
  - bun test src/config/opencode-config.test.ts src/commands/bootstrap.test.ts src/commands/doctor.test.ts
  - bun test
  - bun run typecheck
  - bun run check:ci
  - bun run build
parallel_group: phase2-serial
risk_level: medium
requires_user_decision: false
beads_issue: not-created-yet
artifact_refs:
  - docs/superpowers/plans/2026-06-02-tgo-v2-phase-2-agent-roster-permissions.md
```

## Tasks

### Task 1: Add Agent ID Constants And Permission Profiles

**Files:**

- Create: `trans-genderian-orchestra-v2/src/plugin/agent-ids.ts`
- Create: `trans-genderian-orchestra-v2/src/plugin/permissions.ts`
- Create: `trans-genderian-orchestra-v2/src/plugin/agents.test.ts`

- [ ] **Step 1: Write the failing roster and permissions tests**

Create `trans-genderian-orchestra-v2/src/plugin/agents.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { TGO_AGENT_IDS } from './agent-ids';
import { getPermissionProfile } from './permissions';

describe('TGO agent role permissions', () => {
  test('defines the full namespaced agent roster', () => {
    expect(TGO_AGENT_IDS).toEqual([
      'tgo-orchestrator',
      'tgo-researcher',
      'tgo-builder',
      'tgo-reviewer',
      'tgo-council',
      'tgo-councillor',
    ]);
  });

  test('keeps orchestrator bounded to coordination tools', () => {
    const permissions = getPermissionProfile('tgo-orchestrator');

    expect(permissions.edit).toBe('deny');
    expect(permissions.write).toBe('deny');
    expect(permissions.apply_patch).toBe('deny');
    expect(permissions.task).toBe('allow');
    expect(permissions.read).toBe('allow');
  });

  test('allows researcher evidence gathering but not implementation patches', () => {
    const permissions = getPermissionProfile('tgo-researcher');

    expect(permissions.read).toBe('allow');
    expect(permissions.grep).toBe('allow');
    expect(permissions.webfetch).toBe('allow');
    expect(permissions.websearch).toBe('allow');
    expect(permissions.write).toBe('allow');
    expect(permissions.apply_patch).toBe('deny');
  });

  test('allows builder implementation tools', () => {
    const permissions = getPermissionProfile('tgo-builder');

    expect(permissions.edit).toBe('allow');
    expect(permissions.write).toBe('allow');
    expect(permissions.apply_patch).toBe('allow');
    expect(permissions.bash).toBe('allow');
    expect(permissions.webfetch).toBe('allow');
  });

  test('keeps reviewer and council read-only', () => {
    for (const agentId of ['tgo-reviewer', 'tgo-council', 'tgo-councillor'] as const) {
      const permissions = getPermissionProfile(agentId);

      expect(permissions.read).toBe('allow');
      expect(permissions.edit).toBe('deny');
      expect(permissions.write).toBe('deny');
      expect(permissions.apply_patch).toBe('deny');
      expect(permissions.bash).toBe('deny');
    }

    expect(getPermissionProfile('tgo-councillor').question).toBe('deny');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/plugin/agents.test.ts
```

Expected: FAIL with module resolution errors for `./agent-ids` and `./permissions`.

- [ ] **Step 3: Implement agent IDs and permission profiles**

Create `trans-genderian-orchestra-v2/src/plugin/agent-ids.ts`:

```ts
export const TGO_AGENT_IDS = [
  'tgo-orchestrator',
  'tgo-researcher',
  'tgo-builder',
  'tgo-reviewer',
  'tgo-council',
  'tgo-councillor',
] as const;

export type TgoAgentId = (typeof TGO_AGENT_IDS)[number];
```

Create `trans-genderian-orchestra-v2/src/plugin/permissions.ts`:

```ts
import type { TgoAgentId } from './agent-ids';

export type PermissionAction = 'allow' | 'ask' | 'deny';
export type PermissionValue = PermissionAction | Record<string, PermissionAction>;
export type PermissionProfile = Record<string, PermissionValue>;

const READ_ONLY_PERMISSIONS: PermissionProfile = {
  '*': 'deny',
  read: 'allow',
  glob: 'allow',
  grep: 'allow',
  list: 'allow',
  lsp: 'allow',
  edit: 'deny',
  write: 'deny',
  apply_patch: 'deny',
  bash: 'deny',
  task: 'deny',
};

const ORCHESTRATOR_PERMISSIONS: PermissionProfile = {
  ...READ_ONLY_PERMISSIONS,
  task: 'allow',
  question: 'allow',
  todowrite: 'allow',
};

const RESEARCHER_PERMISSIONS: PermissionProfile = {
  ...READ_ONLY_PERMISSIONS,
  bash: 'allow',
  webfetch: 'allow',
  websearch: 'allow',
  write: 'allow',
  edit: 'allow',
};

const BUILDER_PERMISSIONS: PermissionProfile = {
  '*': 'deny',
  read: 'allow',
  glob: 'allow',
  grep: 'allow',
  list: 'allow',
  lsp: 'allow',
  edit: 'allow',
  write: 'allow',
  apply_patch: 'allow',
  bash: 'allow',
  task: 'allow',
  question: 'allow',
  ast_grep_search: 'allow',
  ast_grep_replace: 'allow',
  webfetch: 'allow',
  websearch: 'allow',
};

const COUNCILLOR_PERMISSIONS: PermissionProfile = {
  ...READ_ONLY_PERMISSIONS,
  question: 'deny',
};

const PERMISSIONS_BY_AGENT: Record<TgoAgentId, PermissionProfile> = {
  'tgo-orchestrator': ORCHESTRATOR_PERMISSIONS,
  'tgo-researcher': RESEARCHER_PERMISSIONS,
  'tgo-builder': BUILDER_PERMISSIONS,
  'tgo-reviewer': READ_ONLY_PERMISSIONS,
  'tgo-council': READ_ONLY_PERMISSIONS,
  'tgo-councillor': COUNCILLOR_PERMISSIONS,
};

export function getPermissionProfile(agentId: TgoAgentId): PermissionProfile {
  return { ...PERMISSIONS_BY_AGENT[agentId] };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/plugin/agents.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add trans-genderian-orchestra-v2/src/plugin/agent-ids.ts trans-genderian-orchestra-v2/src/plugin/permissions.ts trans-genderian-orchestra-v2/src/plugin/agents.test.ts
git commit -m "feat: add tgo agent permission profiles"
```

### Task 2: Add Full Agent And Command Registration Modules

**Files:**

- Create: `trans-genderian-orchestra-v2/src/plugin/agents.ts`
- Create: `trans-genderian-orchestra-v2/src/plugin/commands.ts`
- Modify: `trans-genderian-orchestra-v2/src/plugin/agents.test.ts`
- Modify: `trans-genderian-orchestra-v2/src/index.ts`

- [ ] **Step 1: Add failing tests for agent definitions**

Append this test block to `trans-genderian-orchestra-v2/src/plugin/agents.test.ts`:

```ts
import { createTgoAgentConfigs } from './agents';
import { createTgoCommandConfigs } from './commands';

describe('TGO plugin config definitions', () => {
  test('creates all role-specific agent configs', () => {
    const agents = createTgoAgentConfigs();

    expect(Object.keys(agents).sort()).toEqual([...TGO_AGENT_IDS].sort());
    expect(agents['tgo-orchestrator'].mode).toBe('primary');
    expect(agents['tgo-researcher'].mode).toBe('subagent');
    expect(agents['tgo-builder'].mode).toBe('subagent');
    expect(agents['tgo-reviewer'].mode).toBe('subagent');
    expect(agents['tgo-council'].mode).toBe('subagent');
    expect(agents['tgo-councillor'].mode).toBe('subagent');
    expect(agents['tgo-builder'].permission).toEqual(getPermissionProfile('tgo-builder'));
    expect(agents['tgo-reviewer'].prompt).toContain('read-only verification');
  });

  test('creates namespaced command configs and compatibility aliases', () => {
    const commands = createTgoCommandConfigs();

    expect(commands['tgo:doctor'].description).toContain('Inspect TGO v2 setup');
    expect(commands['tgo:setup'].description).toContain('Change TGO v2 setup');
    expect(commands['tgo:init'].description).toContain('Initialize TGO v2');
    expect(commands.init.description).toContain('Compatibility alias');
    expect(commands['beads:init'].description).toContain('Compatibility alias');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/plugin/agents.test.ts
```

Expected: FAIL with module resolution errors for `./agents` and `./commands`.

- [ ] **Step 3: Implement agent and command definition modules**

Create `trans-genderian-orchestra-v2/src/plugin/agents.ts`:

```ts
import { TGO_AGENT_IDS, type TgoAgentId } from './agent-ids';
import { getPermissionProfile, type PermissionProfile } from './permissions';

export interface TgoAgentConfig {
  description: string;
  mode: 'primary' | 'subagent' | 'all';
  prompt: string;
  permission: PermissionProfile;
}

const ROLE_PROMPTS: Record<TgoAgentId, string> = {
  'tgo-orchestrator':
    'You are the TGO v2 Orchestrator: technical lead, phase controller, scheduler, artifact owner, and user-facing coordinator. You classify intent, preserve user intent, delegate specialist labor, and require Reviewer before behavior-changing completion. You do not edit implementation files directly.',
  'tgo-researcher':
    'You are the TGO v2 Researcher. Produce evidence packs from code, docs, history, and external sources. Report sources, findings, contradictions, uncertainty, options, and confidence. Do not implement code.',
  'tgo-builder':
    'You are the TGO v2 Builder. Implement scoped tasks only inside allowed write paths, run validation, report changed files and deviations, and stop with needs_decision rather than expanding scope silently.',
  'tgo-reviewer':
    'You are the TGO v2 Reviewer. Perform read-only verification against user intent, approved specs/plans, acceptance criteria, declared write scope, evidence, and validation results. Return pass/fail verdicts and rework instructions.',
  'tgo-council':
    'You are the TGO v2 Council synthesizer. Use council only for escalation: repeated reviewer rejection, high-risk decisions, disputed tooling/model behavior, or explicit user request. Return one synthesized recommendation.',
  'tgo-councillor':
    'You are a TGO v2 Councillor. Provide one independent council perspective from the assigned focus. Do not ask the user questions or write files.',
};

const DESCRIPTIONS: Record<TgoAgentId, string> = {
  'tgo-orchestrator': 'TGO Orchestrator: technical lead, phase controller, and workflow router.',
  'tgo-researcher': 'TGO Researcher: retrieves code/docs/history evidence and reports uncertainty.',
  'tgo-builder': 'TGO Builder: implements scoped tasks with validation.',
  'tgo-reviewer': 'TGO Reviewer: read-only verification gate for behavior-changing work.',
  'tgo-council': 'TGO Council: escalation-only synthesis for hard decisions.',
  'tgo-councillor': 'TGO Councillor: internal council perspective participant.',
};

export function createTgoAgentConfigs(): Record<TgoAgentId, TgoAgentConfig> {
  return Object.fromEntries(
    TGO_AGENT_IDS.map((agentId) => [
      agentId,
      {
        description: DESCRIPTIONS[agentId],
        mode: agentId === 'tgo-orchestrator' ? 'primary' : 'subagent',
        prompt: ROLE_PROMPTS[agentId],
        permission: getPermissionProfile(agentId),
      },
    ]),
  ) as Record<TgoAgentId, TgoAgentConfig>;
}
```

Create `trans-genderian-orchestra-v2/src/plugin/commands.ts`:

```ts
export interface TgoCommandConfig {
  description: string;
  template: string;
}

export function createTgoCommandConfigs(): Record<string, TgoCommandConfig> {
  return {
    'tgo:doctor': {
      description: 'Inspect TGO v2 setup state and report repairs.',
      template: 'Run the deterministic TGO doctor workflow. Use --json when structured output is needed.',
    },
    'tgo:setup': {
      description: 'Change TGO v2 setup, presets, managed tools, or repair state with preview.',
      template: 'Run the deterministic TGO setup workflow with preview before config mutation.',
    },
    'tgo:init': {
      description: 'Initialize TGO v2 project-local Beads, guidance, validation, and artifact scaffolding.',
      template: 'Run the TGO project initialization workflow with preview and backups.',
    },
    'tgo:work': {
      description: 'Start or continue approved TGO-managed implementation work.',
      template: 'Route the request through TGO work intent, goal confirmation, Builder, Reviewer, and artifacts.',
    },
    'tgo:models': {
      description: 'Switch or inspect TGO v2 model lineup presets.',
      template: 'Inspect or switch TGO model presets without changing tool or resilience presets.',
    },
    init: {
      description: 'Compatibility alias for /tgo:init.',
      template: 'Route this compatibility alias to /tgo:init.',
    },
    'beads:init': {
      description: 'Compatibility alias for Beads project initialization through /tgo:init.',
      template: 'Run the Beads initialization portion of TGO project init using the real bd init flow.',
    },
    preset: {
      description: 'Compatibility alias for model preset switching through /tgo:models.',
      template: 'Route this compatibility alias to /tgo:models.',
    },
  };
}
```

- [ ] **Step 4: Wire the plugin entrypoint**

Replace `trans-genderian-orchestra-v2/src/index.ts` with:

```ts
import type { Plugin } from '@opencode-ai/plugin';
import { createTgoAgentConfigs } from './plugin/agents';
import { createTgoCommandConfigs } from './plugin/commands';

const plugin: Plugin = async (_ctx) => {
  return {
    async config(config) {
      config.agent = {
        ...config.agent,
        ...createTgoAgentConfigs(),
      };
      config.command = {
        ...config.command,
        ...createTgoCommandConfigs(),
      };
    },
  };
};

export default plugin;
```

- [ ] **Step 5: Run the tests to verify they pass**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/plugin/agents.test.ts
bun run typecheck
```

Expected: both pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add trans-genderian-orchestra-v2/src/plugin/agents.ts trans-genderian-orchestra-v2/src/plugin/commands.ts trans-genderian-orchestra-v2/src/plugin/agents.test.ts trans-genderian-orchestra-v2/src/index.ts
git commit -m "feat: register full tgo agent roster"
```

### Task 3: Extend Bootstrap Managed Entries For Full Roster

**Files:**

- Modify: `trans-genderian-orchestra-v2/src/config/managed-entries.ts`
- Modify: `trans-genderian-orchestra-v2/src/config/opencode-config.ts`
- Modify: `trans-genderian-orchestra-v2/src/config/opencode-config.test.ts`
- Modify: `trans-genderian-orchestra-v2/src/commands/bootstrap.ts`
- Modify: `trans-genderian-orchestra-v2/src/commands/bootstrap.test.ts`

- [ ] **Step 1: Update config tests first**

Extend `trans-genderian-orchestra-v2/src/config/opencode-config.test.ts` with assertions that all six managed agents are written and that an existing user agent remains:

```ts
test('adds all TGO-managed agents while preserving user agents', () => {
  const existing = parseOpenCodeConfig(
    JSON.stringify({
      agent: {
        'user-agent': {
          description: 'User-owned agent',
          mode: 'subagent',
          prompt: 'Do user things.',
        },
      },
    }),
  );

  const result = applyManagedEntries(existing, planDefaultManagedEntries());

  expect(result.config.agent?.['user-agent']).toBeDefined();
  for (const agentId of TGO_AGENT_IDS) {
    expect(result.config.agent?.[agentId]).toBeDefined();
  }
  expect(result.config.default_agent).toBe('tgo-orchestrator');
});
```

Also add imports at the top:

```ts
import { TGO_AGENT_IDS } from '../plugin/agent-ids';
```

- [ ] **Step 2: Update bootstrap test expectations first**

In `trans-genderian-orchestra-v2/src/commands/bootstrap.test.ts`, add assertions after reading the generated config and manifest:

```ts
for (const agentId of TGO_AGENT_IDS) {
  expect(config.agent[agentId]).toBeDefined();
}
expect(manifest.managed_config.map((entry: { key: string }) => entry.key)).toContain('agent.tgo-builder');
expect(manifest.managed_config.map((entry: { key: string }) => entry.key)).toContain('agent.tgo-reviewer');
```

Also add import:

```ts
import { TGO_AGENT_IDS } from '../plugin/agent-ids';
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/config/opencode-config.test.ts src/commands/bootstrap.test.ts
```

Expected: FAIL because managed entries still only include `tgo-orchestrator`.

- [ ] **Step 4: Implement full roster managed entries**

Update `trans-genderian-orchestra-v2/src/config/managed-entries.ts` to import `createTgoAgentConfigs` and use it for `agents`:

```ts
import { createTgoAgentConfigs } from '../plugin/agents';
```

Change the `agents` value in `planDefaultManagedEntries()` to:

```ts
agents: createTgoAgentConfigs(),
```

Update `trans-genderian-orchestra-v2/src/commands/bootstrap.ts` so `manifest.managed_config` uses all managed agents instead of one hard-coded agent. Replace the hard-coded `agent.tgo-orchestrator` section with:

```ts
...Object.keys(entries.agents).map((agentId) => ({
  kind: 'agent' as const,
  key: `agent.${agentId}`,
})),
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/config/opencode-config.test.ts src/commands/bootstrap.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add trans-genderian-orchestra-v2/src/config/managed-entries.ts trans-genderian-orchestra-v2/src/config/opencode-config.ts trans-genderian-orchestra-v2/src/config/opencode-config.test.ts trans-genderian-orchestra-v2/src/commands/bootstrap.ts trans-genderian-orchestra-v2/src/commands/bootstrap.test.ts
git commit -m "feat: bootstrap full tgo agent roster"
```

### Task 4: Add Doctor Agent Roster Drift Checks

**Files:**

- Modify: `trans-genderian-orchestra-v2/src/commands/doctor.ts`
- Modify: `trans-genderian-orchestra-v2/src/commands/doctor.test.ts`

- [ ] **Step 1: Write failing doctor drift test**

Add this test to `trans-genderian-orchestra-v2/src/commands/doctor.test.ts`:

```ts
test('reports missing managed TGO agents without writing files', async () => {
  const fs = createMemoryFileSystem({
    '/home/user/.config/opencode/tgo/manifest.jsonc': JSON.stringify({
      package: { name: 'trans-genderian-orchestra', version: '2.0.0-beta.0' },
      active_presets: { tools: 'default', models: 'balanced', resilience: 'balanced' },
      managed_config: [{ kind: 'agent', key: 'agent.tgo-builder' }],
      tools: [],
      backups: [],
      ignored_warnings: [],
      last_verified_at: null,
    }),
    '/home/user/.config/opencode/opencode.jsonc': JSON.stringify({
      agent: {
        'tgo-orchestrator': { description: 'Present', mode: 'primary', prompt: 'Present.' },
      },
    }),
  });

  const result = await runDoctor({
    fs,
    homeDir: '/home/user',
    detector: {
      async which(command) {
        return command === 'git' ? '/usr/bin/git' : undefined;
      },
    },
  });

  expect(result.warnings.map((warning) => warning.code)).toContain('missing-managed-agent');
  expect(result.warnings.some((warning) => warning.message.includes('tgo-builder'))).toBe(true);
  expect(await fs.readText('/home/user/.config/opencode/opencode.jsonc')).toContain('tgo-orchestrator');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/commands/doctor.test.ts
```

Expected: FAIL because doctor does not check managed agent drift.

- [ ] **Step 3: Implement read-only missing-agent warning**

Update `trans-genderian-orchestra-v2/src/commands/doctor.ts` to import `TGO_AGENT_IDS` and `parseOpenCodeConfig`:

```ts
import { parseOpenCodeConfig } from '../config/opencode-config';
import { TGO_AGENT_IDS } from '../plugin/agent-ids';
```

After reading config text, parse config and add warnings for missing TGO agents:

```ts
const config = parseOpenCodeConfig(configText);
for (const agentId of TGO_AGENT_IDS) {
  if (!config.agent?.[agentId]) {
    result.warnings.push({
      code: 'missing-managed-agent',
      severity: 'warning',
      message: `TGO-managed agent ${agentId} is missing from OpenCode config.`,
    });
  }
}
```

When config does not exist, this should warn for all required TGO agents and still not write files.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/commands/doctor.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add trans-genderian-orchestra-v2/src/commands/doctor.ts trans-genderian-orchestra-v2/src/commands/doctor.test.ts
git commit -m "feat: detect missing tgo managed agents"
```

### Task 5: Phase 2 Validation Gate

**Files:**

- No planned source changes unless validation exposes an issue.

- [ ] **Step 1: Run targeted tests**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/plugin/agents.test.ts
bun test src/config/opencode-config.test.ts src/commands/bootstrap.test.ts src/commands/doctor.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run full package validation**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test
bun run typecheck
bun run check:ci
bun run build
```

Expected:

- `bun test`: all tests pass.
- `bun run typecheck`: exit 0.
- `bun run check:ci`: exit 0, no fixes applied.
- `bun run build`: exit 0.

- [ ] **Step 3: Run bootstrap apply smoke for full roster**

Run:

```bash
cd trans-genderian-orchestra-v2
TEMP_HOME=$(mktemp -d)
mkdir -p "$TEMP_HOME/.config/opencode"
printf '%s\n' '{"agent":{"user-agent":{"description":"User agent","mode":"subagent","prompt":"User prompt."}}}' > "$TEMP_HOME/.config/opencode/opencode.jsonc"
TGO_TEST_HOME="$TEMP_HOME" bun run dist/cli/index.js bootstrap --tools default --models balanced --resilience balanced --yes --json > "$TEMP_HOME/bootstrap.json"
node - "$TEMP_HOME" <<'NODE'
const fs = require('node:fs')
const path = require('node:path')
const home = process.argv[2]
const config = JSON.parse(fs.readFileSync(path.join(home, '.config/opencode/opencode.jsonc'), 'utf8'))
const manifest = JSON.parse(fs.readFileSync(path.join(home, '.config/opencode/tgo/manifest.jsonc'), 'utf8'))
const agentIds = ['tgo-orchestrator', 'tgo-researcher', 'tgo-builder', 'tgo-reviewer', 'tgo-council', 'tgo-councillor']
for (const agentId of agentIds) {
  if (!config.agent?.[agentId]) throw new Error(`missing ${agentId}`)
}
if (!config.agent?.['user-agent']) throw new Error('user agent was not preserved')
for (const agentId of agentIds) {
  if (!manifest.managed_config.some((entry) => entry.key === `agent.${agentId}`)) throw new Error(`manifest missing ${agentId}`)
}
console.log(JSON.stringify({ smoke: 'phase2-bootstrap-roster', agents: agentIds, user_agent_preserved: true }, null, 2))
NODE
```

Expected: script prints `phase2-bootstrap-roster`, lists all six TGO agents, and reports `user_agent_preserved: true`.

- [ ] **Step 4: Run doctor smoke for missing roster**

Run:

```bash
cd trans-genderian-orchestra-v2
TEMP_HOME=$(mktemp -d)
mkdir -p "$TEMP_HOME/.config/opencode"
printf '%s\n' '{"agent":{"tgo-orchestrator":{"description":"Only orchestrator","mode":"primary","prompt":"Only."}}}' > "$TEMP_HOME/.config/opencode/opencode.jsonc"
TGO_TEST_HOME="$TEMP_HOME" bun run dist/cli/index.js doctor --json > "$TEMP_HOME/doctor.json"
node - "$TEMP_HOME" <<'NODE'
const fs = require('node:fs')
const path = require('node:path')
const home = process.argv[2]
const output = JSON.parse(fs.readFileSync(path.join(home, 'doctor.json'), 'utf8'))
const warnings = output.warnings.filter((warning) => warning.code === 'missing-managed-agent')
if (warnings.length < 5) throw new Error(`expected at least five missing-agent warnings, got ${warnings.length}`)
if (!warnings.some((warning) => warning.message.includes('tgo-builder'))) throw new Error('missing tgo-builder warning')
if (fs.existsSync(path.join(home, '.config/opencode/tgo/manifest.jsonc'))) throw new Error('doctor created manifest in read-only mode')
console.log(JSON.stringify({ smoke: 'phase2-doctor-roster', missing_agent_warnings: warnings.length, read_only: true }, null, 2))
NODE
```

Expected: script reports at least five `missing-managed-agent` warnings and confirms read-only behavior.

- [ ] **Step 5: Commit validation fixes if needed**

If validation required formatting or code fixes, commit them:

```bash
git status --short
git add trans-genderian-orchestra-v2
git commit -m "chore: validate phase 2 agent roster"
```

If no files changed, do not create an empty commit.

## Self-Review Checklist

- Spec coverage: Phase 2 gates from `07-implementation-phases-validation-gates.md` are covered by Tasks 1-5.
- Role boundaries: Orchestrator, Researcher, Builder, Reviewer, Council, and Councillor have explicit prompts and permission profiles.
- User preservation: Tests require user-managed agents to remain present.
- No placeholders: every code and command step has concrete content.
- Scope control: path-gating internals and delegation workflow are intentionally deferred to later phases.
