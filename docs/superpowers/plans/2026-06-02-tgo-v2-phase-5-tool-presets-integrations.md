# TGO v2 Phase 5 Tool Presets And Integrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic Phase 5 tooling preset and integration planning for `bare-bones`, `default`, and `all-bells` without mutating user-managed tools, MCPs, plugins, skills, or secrets.

**Architecture:** Phase 5 introduces pure TypeScript tooling-preset modules, then threads those modules through the existing bootstrap, config merge, manifest, doctor, and command-guidance surfaces. Bootstrap remains preview-first and writes only TGO-managed OpenCode config entries in apply mode; external installs, OAuth flows, and system-level tool changes remain planned/degraded guidance, not real side effects.

**Tech Stack:** TypeScript, Bun test, Biome, existing deterministic command result shape, existing memory filesystem tests, no new runtime dependencies.

---

## Source Specs

- `designs/tgo-v2/specs/00-umbrella-architecture.md`
- `designs/tgo-v2/specs/02-bootstrap-setup-doctor-manifests.md`
- `designs/tgo-v2/specs/03-tools-skills-mcps-integrations.md`
- `designs/tgo-v2/specs/07-implementation-phases-validation-gates.md`
- `docs/superpowers/plans/2026-06-02-tgo-v2-phase-4-workflow-scheduler-integration.md`

## Phase 5 Scope Boundary

In scope:

- `bare-bones`, `default`, and `all-bells` tool preset definitions.
- Parameterized managed-entry planning based on active tool preset.
- Default Context7 as CLI plus skill guidance, not MCP registration.
- Default Researcher-limited `tgo-websearch` and `tgo-grep-app` MCP registrations.
- AFT peer plugin detection and graceful degradation when unavailable.
- Serena and GitHub MCP registrations only for `all-bells` or explicit preset choice.
- Preservation of user-managed plugins, agents, MCPs, and config during preset application.
- Secret-safe MCP auth references through env markers or non-secret OAuth metadata only.
- Doctor warnings for user-managed MCP visibility and degraded/missing preset capabilities.
- `/tgo:setup` and bootstrap CLI guidance that changing tools does not change models or resilience.

Out of scope:

- Installing external CLIs, global packages, MCP servers, or skills.
- Running `ctx7 setup`, `uvx`, `gh`, `bd`, `brew`, `npm install -g`, or any networked installer.
- Implementing real `/tgo:setup` execution beyond existing command metadata and bootstrap support.
- Model presets, `modelPresets` alias behavior, resilience profiles, provider fallback, circuit breaker, and council derivation; those belong to Phase 6.
- Beta migration, uninstall/rollback, package root cutover, and release docs; those belong to Phase 7.
- Broad per-agent runtime MCP permission enforcement in OpenCode internals. Phase 5 records role intent in generated config metadata and tests that command/preset definitions preserve the rule.

## Reuse Justification

No v1 module should be copied in Phase 5.

Approved internal reuse:

- `trans-genderian-orchestra-v2/src/plugin/agents.ts`: reuse the existing TGO agent roster when building managed entries.
- `trans-genderian-orchestra-v2/src/config/opencode-config.ts`: reuse the existing additive config merge behavior so user-managed entries remain visible.
- `trans-genderian-orchestra-v2/src/tools/detect.ts`: extend the detector pattern, keeping detection injectable and side-effect-free.
- `trans-genderian-orchestra-v2/src/commands/result.ts`: reuse structured planned actions, warnings, blocked capabilities, and degraded capabilities.
- `trans-genderian-orchestra-v2/src/manifest/schema.ts`: extend manifest tool status/preset metadata only where Phase 5 needs to record active tool preset outputs.

If any v1 source code is copied later, add a new reuse justification before doing so.

## File Structure

Create these files:

- `trans-genderian-orchestra-v2/src/tools/presets.ts`: tool preset types, plugin/MCP/skill/CLI planning records, and `createToolPresetPlan`.
- `trans-genderian-orchestra-v2/src/tools/presets.test.ts`: tests for `bare-bones`, `default`, `all-bells`, Context7 CLI+skill default, all-bells-only GitHub/Serena, and secret-safe env references.
- `trans-genderian-orchestra-v2/src/tools/managed.ts`: convert a tool preset plan plus agent roster into managed OpenCode entries and planned setup actions.
- `trans-genderian-orchestra-v2/src/tools/managed.test.ts`: tests for generated plugins/MCPs, Researcher-limited default MCP metadata, user config preservation through merge, and no raw secrets.
- `trans-genderian-orchestra-v2/src/tools/preset-detect.test.ts`: tests for AFT/Context7/GitHub/Serena detection and degradation behavior.

Modify these files:

- `trans-genderian-orchestra-v2/src/config/managed-entries.ts`: replace hard-coded default entries with preset-aware managed entries.
- `trans-genderian-orchestra-v2/src/tools/detect.ts`: expand injectable detection for `aft`, `gh`, and `uvx` and make detection preset-aware.
- `trans-genderian-orchestra-v2/src/commands/bootstrap.ts`: pass selected tool preset through planning/detection/manifest updates and keep existing preview/apply safety.
- `trans-genderian-orchestra-v2/src/commands/bootstrap.test.ts`: assert preset-specific planned registrations, preservation, manifest active preset, and secret-safe config.
- `trans-genderian-orchestra-v2/src/commands/doctor.ts`: report user-managed MCP visibility and degraded/missing preset capabilities without writes.
- `trans-genderian-orchestra-v2/src/commands/doctor.test.ts`: assert default Context7 degradation, AFT degradation, all-bells GitHub/Serena guidance, and user-managed MCP visibility.
- `trans-genderian-orchestra-v2/src/cli/index.ts`: pass parsed `--tools` into `runBootstrap`.
- `trans-genderian-orchestra-v2/src/plugin/commands.ts`: update `/tgo:setup` and `/tgo:models` command guidance around independent tool/model/resilience dimensions.
- `trans-genderian-orchestra-v2/src/plugin/agents.test.ts`: assert setup/model command guidance names independent preset dimensions and Phase 5 tool safety.

## Task Metadata

```yaml
task_id: phase5-tool-presets-integrations
goal: Implement deterministic tool preset and integration planning for TGO v2 Phase 5.
acceptance_criteria:
  - bare-bones, default, and all-bells produce expected planned plugin/MCP/skill/CLI registrations.
  - Context7 default is CLI plus skill guidance and does not register a Context7 MCP.
  - Default websearch and grep_app MCP registrations are TGO-namespaced and Researcher-limited in metadata.
  - AFT missing or unavailable produces degraded local-code-intelligence capability without blocking bootstrap.
  - Serena and GitHub MCP registrations appear only for all-bells tool preset.
  - Existing user-managed plugins, agents, MCPs, providers, and custom config remain preserved through config merge.
  - TGO-managed MCP auth uses env/OAuth references only and does not serialize raw secrets.
  - Bootstrap records active tool preset in manifest without changing model or resilience presets.
  - Doctor remains read-only while reporting missing/degraded preset capabilities and user-managed MCP visibility.
  - Phase 5 validation commands pass.
dependencies:
  - phase4-workflow-scheduler-integration
declared_write_scope:
  - trans-genderian-orchestra-v2/src/tools/**
  - trans-genderian-orchestra-v2/src/config/managed-entries.ts
  - trans-genderian-orchestra-v2/src/commands/bootstrap.ts
  - trans-genderian-orchestra-v2/src/commands/bootstrap.test.ts
  - trans-genderian-orchestra-v2/src/commands/doctor.ts
  - trans-genderian-orchestra-v2/src/commands/doctor.test.ts
  - trans-genderian-orchestra-v2/src/cli/index.ts
  - trans-genderian-orchestra-v2/src/plugin/commands.ts
  - trans-genderian-orchestra-v2/src/plugin/agents.test.ts
expected_read_context:
  - designs/tgo-v2/specs/00-umbrella-architecture.md
  - designs/tgo-v2/specs/02-bootstrap-setup-doctor-manifests.md
  - designs/tgo-v2/specs/03-tools-skills-mcps-integrations.md
  - designs/tgo-v2/specs/07-implementation-phases-validation-gates.md
validation_commands:
  - bun test src/tools/presets.test.ts src/tools/managed.test.ts src/tools/preset-detect.test.ts
  - bun test src/commands/bootstrap.test.ts src/commands/doctor.test.ts
  - bun test src/plugin/agents.test.ts
  - bun test
  - bun run typecheck
  - bun run check:ci
  - bun run build
parallel_group: phase5-serial
risk_level: medium
requires_user_decision: false
beads_issue: not-created-yet
artifact_refs:
  - docs/superpowers/plans/2026-06-02-tgo-v2-phase-5-tool-presets-integrations.md
```

## Tasks

### Task 1: Add Tool Preset Definitions

**Files:**

- Create: `trans-genderian-orchestra-v2/src/tools/presets.ts`
- Create: `trans-genderian-orchestra-v2/src/tools/presets.test.ts`

- [ ] **Step 1: Write the failing tool preset tests**

Create `trans-genderian-orchestra-v2/src/tools/presets.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { createToolPresetPlan } from './presets';

describe('tool preset plans', () => {
  test('bare-bones includes core TGO and Beads without remote MCPs', () => {
    const plan = createToolPresetPlan('bare-bones');

    expect(plan.name).toBe('bare-bones');
    expect(plan.peer_plugins.map((plugin) => plugin.id)).toEqual([
      'trans-genderian-orchestra',
      'opencode-beads',
    ]);
    expect(plan.mcps).toEqual([]);
    expect(plan.skills.map((skill) => skill.id)).toContain(
      'setup-matt-pocock-skills',
    );
  });

  test('default includes Context7 CLI plus skill but not Context7 MCP', () => {
    const plan = createToolPresetPlan('default');

    expect(plan.required_cli_tools.map((tool) => tool.name)).toContain('ctx7');
    expect(plan.skills.map((skill) => skill.id)).toContain('context7-mcp');
    expect(plan.mcps.map((mcp) => mcp.id)).not.toContain('tgo-context7');
    expect(plan.peer_plugins.map((plugin) => plugin.id)).toContain('aft');
  });

  test('default limits websearch and grep_app MCPs to Researcher metadata', () => {
    const plan = createToolPresetPlan('default');

    expect(plan.mcps).toContainEqual(
      expect.objectContaining({
        id: 'tgo-websearch',
        allowed_agents: ['tgo-researcher'],
      }),
    );
    expect(plan.mcps).toContainEqual(
      expect.objectContaining({
        id: 'tgo-grep-app',
        allowed_agents: ['tgo-researcher'],
      }),
    );
  });

  test('all-bells adds GitHub and Serena MCPs only in all-bells', () => {
    const defaultPlan = createToolPresetPlan('default');
    const allBells = createToolPresetPlan('all-bells');

    expect(defaultPlan.mcps.map((mcp) => mcp.id)).not.toContain('tgo-github');
    expect(defaultPlan.mcps.map((mcp) => mcp.id)).not.toContain('tgo-serena');
    expect(allBells.mcps.map((mcp) => mcp.id)).toEqual([
      'tgo-websearch',
      'tgo-grep-app',
      'tgo-github',
      'tgo-serena',
    ]);
  });

  test('MCP auth references are env markers or non-secret metadata, never raw secrets', () => {
    const allBells = createToolPresetPlan('all-bells');
    const serialized = JSON.stringify(allBells.mcps);

    expect(serialized).toContain('{env:EXA_API_KEY}');
    expect(serialized).toContain('{env:GITHUB_PERSONAL_ACCESS_TOKEN}');
    expect(allBells.mcps.find((mcp) => mcp.id === 'tgo-serena')?.auth).toBe('oauth');
    expect(serialized).not.toContain('ghp_');
    expect(serialized).not.toContain('github_pat_');
  });
});
```

- [ ] **Step 2: Run the preset tests to verify they fail**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/tools/presets.test.ts
```

Expected: FAIL with `Cannot find module './presets'`.

- [ ] **Step 3: Implement the preset definitions**

Create `trans-genderian-orchestra-v2/src/tools/presets.ts`:

```ts
import type { TgoAgentId } from '../plugin/agent-ids';

export type ToolPresetName = 'bare-bones' | 'default' | 'all-bells';

export interface PeerPluginPlan {
  id: string;
  package: string;
  version: string;
  required: boolean;
}

export interface SkillPlan {
  id: string;
  source: 'bundled' | 'curated-matt-pocock' | 'context7';
  enabled_by_default: boolean;
}

export interface McpPlan {
  id: string;
  type: 'remote' | 'local';
  config: Record<string, unknown>;
  allowed_agents: TgoAgentId[];
  auth: 'none' | 'env' | 'oauth';
  optional: boolean;
}

export interface RequiredCliToolPlan {
  name: 'git' | 'bd' | 'ctx7' | 'gh' | 'uvx';
  capability: string;
  missing_status: 'blocked' | 'degraded';
  repair_command: string;
}

export interface ToolPresetPlan {
  name: ToolPresetName;
  peer_plugins: PeerPluginPlan[];
  skills: SkillPlan[];
  mcps: McpPlan[];
  required_cli_tools: RequiredCliToolPlan[];
}

const CORE_PLUGINS: PeerPluginPlan[] = [
  {
    id: 'trans-genderian-orchestra',
    package: 'trans-genderian-orchestra',
    version: '2.0.0-beta.0',
    required: true,
  },
  {
    id: 'opencode-beads',
    package: 'opencode-beads',
    version: '0.7.0',
    required: true,
  },
];

const DEFAULT_SKILLS: SkillPlan[] = [
  {
    id: 'setup-matt-pocock-skills',
    source: 'curated-matt-pocock',
    enabled_by_default: true,
  },
  { id: 'grill-with-docs', source: 'curated-matt-pocock', enabled_by_default: true },
  { id: 'diagnose', source: 'curated-matt-pocock', enabled_by_default: true },
  { id: 'tdd', source: 'curated-matt-pocock', enabled_by_default: true },
  { id: 'to-prd', source: 'curated-matt-pocock', enabled_by_default: true },
  { id: 'to-issues', source: 'curated-matt-pocock', enabled_by_default: true },
  { id: 'triage', source: 'curated-matt-pocock', enabled_by_default: true },
  {
    id: 'improve-codebase-architecture',
    source: 'curated-matt-pocock',
    enabled_by_default: true,
  },
  { id: 'zoom-out', source: 'curated-matt-pocock', enabled_by_default: true },
  { id: 'handoff', source: 'curated-matt-pocock', enabled_by_default: true },
];

const CONTEXT7_SKILL: SkillPlan = {
  id: 'context7-mcp',
  source: 'context7',
  enabled_by_default: true,
};

const DEFAULT_CLIS: RequiredCliToolPlan[] = [
  {
    name: 'git',
    capability: 'git',
    missing_status: 'blocked',
    repair_command: 'Install git from https://git-scm.com/downloads',
  },
  {
    name: 'bd',
    capability: 'beads',
    missing_status: 'blocked',
    repair_command: 'brew install beads or npm install -g @beads/bd',
  },
  {
    name: 'ctx7',
    capability: 'context7-cli',
    missing_status: 'degraded',
    repair_command: 'npx ctx7 setup --opencode',
  },
];

function defaultMcps(): McpPlan[] {
  return [
    {
      id: 'tgo-websearch',
      type: 'remote',
      config: {
        type: 'remote',
        url: 'https://mcp.exa.ai/mcp',
        enabled: true,
        headers: { Authorization: 'Bearer {env:EXA_API_KEY}' },
      },
      allowed_agents: ['tgo-researcher'],
      auth: 'env',
      optional: false,
    },
    {
      id: 'tgo-grep-app',
      type: 'remote',
      config: { type: 'remote', url: 'https://mcp.grep.app', enabled: true },
      allowed_agents: ['tgo-researcher'],
      auth: 'none',
      optional: false,
    },
  ];
}

function allBellsMcps(): McpPlan[] {
  return [
    ...defaultMcps(),
    {
      id: 'tgo-github',
      type: 'remote',
      config: {
        type: 'remote',
        url: 'https://api.githubcopilot.com/mcp/',
        enabled: true,
        headers: { Authorization: 'Bearer {env:GITHUB_PERSONAL_ACCESS_TOKEN}' },
      },
      allowed_agents: ['tgo-researcher', 'tgo-reviewer'],
      auth: 'env',
      optional: true,
    },
    {
      id: 'tgo-serena',
      type: 'local',
      config: { type: 'local', command: 'uvx', args: ['serena-mcp-server'] },
      allowed_agents: ['tgo-researcher'],
      auth: 'oauth',
      optional: true,
    },
  ];
}

export function createToolPresetPlan(name: ToolPresetName): ToolPresetPlan {
  if (name === 'bare-bones') {
    return {
      name,
      peer_plugins: CORE_PLUGINS,
      skills: DEFAULT_SKILLS,
      mcps: [],
      required_cli_tools: DEFAULT_CLIS.filter((tool) => tool.name !== 'ctx7'),
    };
  }

  const defaultPlan: ToolPresetPlan = {
    name,
    peer_plugins: [
      ...CORE_PLUGINS,
      { id: 'aft', package: 'aft', version: '0.0.0-pinned-after-verification', required: false },
    ],
    skills: [...DEFAULT_SKILLS, CONTEXT7_SKILL],
    mcps: name === 'all-bells' ? allBellsMcps() : defaultMcps(),
    required_cli_tools:
      name === 'all-bells'
        ? [
            ...DEFAULT_CLIS,
            {
              name: 'gh',
              capability: 'github-cli',
              missing_status: 'degraded',
              repair_command: 'Install gh from https://cli.github.com/',
            },
            {
              name: 'uvx',
              capability: 'serena',
              missing_status: 'degraded',
              repair_command: 'Install uvx from https://docs.astral.sh/uv/',
            },
          ]
        : DEFAULT_CLIS,
  };

  return defaultPlan;
}
```

- [ ] **Step 4: Run the preset tests to verify they pass**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/tools/presets.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

Run:

```bash
git add trans-genderian-orchestra-v2/src/tools/presets.ts trans-genderian-orchestra-v2/src/tools/presets.test.ts
git commit -m "feat: define tgo tool presets"
```

### Task 2: Add Preset-Aware Managed Entries

**Files:**

- Create: `trans-genderian-orchestra-v2/src/tools/managed.ts`
- Create: `trans-genderian-orchestra-v2/src/tools/managed.test.ts`
- Modify: `trans-genderian-orchestra-v2/src/config/managed-entries.ts`

- [ ] **Step 1: Write the failing managed-entry tests**

Create `trans-genderian-orchestra-v2/src/tools/managed.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { applyManagedEntries } from '../config/opencode-config';
import { findSecretLikeValues } from '../security/secrets';
import { createManagedEntriesForToolPreset } from './managed';

describe('tool preset managed entries', () => {
  test('bare-bones registers no remote MCPs', () => {
    const entries = createManagedEntriesForToolPreset('bare-bones');

    expect(entries.plugins).toContain('trans-genderian-orchestra@2.0.0-beta.0');
    expect(entries.plugins).toContain('opencode-beads@0.7.0');
    expect(entries.plugins).not.toContain('aft@0.0.0-pinned-after-verification');
    expect(entries.mcps).toEqual({});
  });

  test('default registers AFT and Researcher-limited websearch and grep_app MCPs', () => {
    const entries = createManagedEntriesForToolPreset('default');

    expect(entries.plugins).toContain('aft@0.0.0-pinned-after-verification');
    expect(entries.mcps['tgo-websearch']).toMatchObject({
      enabled: true,
      allowed_agents: ['tgo-researcher'],
    });
    expect(entries.mcps['tgo-grep-app']).toMatchObject({
      enabled: true,
      allowed_agents: ['tgo-researcher'],
    });
    expect(entries.mcps['tgo-context7']).toBeUndefined();
  });

  test('all-bells registers optional GitHub and Serena MCPs', () => {
    const entries = createManagedEntriesForToolPreset('all-bells');

    expect(Object.keys(entries.mcps).sort()).toEqual([
      'tgo-github',
      'tgo-grep-app',
      'tgo-serena',
      'tgo-websearch',
    ]);
    expect(entries.mcps['tgo-github']).toMatchObject({
      allowed_agents: ['tgo-researcher', 'tgo-reviewer'],
    });
  });

  test('preset merge preserves user-managed plugins providers and MCPs', () => {
    const existing = {
      plugin: ['user-plugin'],
      provider: { custom: { npm: '@custom/provider' } },
      mcp: { 'user-mcp': { type: 'remote', url: 'https://example.com' } },
      agent: { 'user-agent': { description: 'User agent' } },
    };

    const result = applyManagedEntries(
      existing,
      createManagedEntriesForToolPreset('default'),
    );

    expect(result.config.plugin).toContain('user-plugin');
    expect(result.config.provider).toEqual(existing.provider);
    expect(result.config.mcp?.['user-mcp']).toEqual(existing.mcp['user-mcp']);
    expect(result.config.agent?.['user-agent']).toEqual(existing.agent['user-agent']);
    expect(result.config.mcp?.['tgo-websearch']).toBeDefined();
  });

  test('managed MCP config contains only env references and no raw secrets', () => {
    const entries = createManagedEntriesForToolPreset('all-bells');
    const serialized = JSON.stringify(entries.mcps);

    expect(findSecretLikeValues(serialized)).toEqual([]);
    expect(serialized).toContain('{env:EXA_API_KEY}');
    expect(serialized).toContain('{env:GITHUB_PERSONAL_ACCESS_TOKEN}');
  });
});
```

- [ ] **Step 2: Run the managed-entry tests to verify they fail**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/tools/managed.test.ts
```

Expected: FAIL with `Cannot find module './managed'`.

- [ ] **Step 3: Implement preset-aware managed entries**

Create `trans-genderian-orchestra-v2/src/tools/managed.ts`:

```ts
import type { ManagedEntries } from '../config/managed-entries';
import { createTgoAgentConfigs } from '../plugin/agents';
import { createToolPresetPlan, type ToolPresetName } from './presets';

export function createManagedEntriesForToolPreset(
  preset: ToolPresetName,
): ManagedEntries {
  const plan = createToolPresetPlan(preset);
  return {
    plugins: plan.peer_plugins.map(
      (plugin) => `${plugin.package}@${plugin.version}`,
    ),
    defaultAgent: 'tgo-orchestrator',
    agents: createTgoAgentConfigs(),
    mcps: Object.fromEntries(
      plan.mcps.map((mcp) => [
        mcp.id,
        {
          ...mcp.config,
          allowed_agents: mcp.allowed_agents,
          tgo_managed: true,
          optional: mcp.optional,
        },
      ]),
    ),
  };
}
```

Modify `trans-genderian-orchestra-v2/src/config/managed-entries.ts` to use the new helper while preserving the existing function name:

```ts
import type { ToolPresetName } from '../tools/presets';
import { createManagedEntriesForToolPreset } from '../tools/managed';

export interface ManagedEntries {
  plugins: string[];
  defaultAgent: string;
  agents: Record<string, unknown>;
  mcps: Record<string, unknown>;
}

export function planDefaultManagedEntries(
  tools: ToolPresetName = 'default',
): ManagedEntries {
  return createManagedEntriesForToolPreset(tools);
}
```

- [ ] **Step 4: Run the managed-entry tests to verify they pass**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/tools/managed.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

Run:

```bash
git add trans-genderian-orchestra-v2/src/tools/managed.ts trans-genderian-orchestra-v2/src/tools/managed.test.ts trans-genderian-orchestra-v2/src/config/managed-entries.ts
git commit -m "feat: plan preset managed entries"
```

### Task 3: Add Preset-Aware Tool Detection

**Files:**

- Create: `trans-genderian-orchestra-v2/src/tools/preset-detect.test.ts`
- Modify: `trans-genderian-orchestra-v2/src/tools/detect.ts`

- [ ] **Step 1: Write the failing preset detection tests**

Create `trans-genderian-orchestra-v2/src/tools/preset-detect.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { detectPresetTools } from './detect';

function detectorWith(commands: Record<string, string | undefined>) {
  return {
    async which(command: string) {
      return commands[command];
    },
  };
}

describe('preset-aware tool detection', () => {
  test('default degrades AFT and Context7 without blocking base install', async () => {
    const result = await detectPresetTools('default', detectorWith({
      git: '/usr/bin/git',
      bd: '/opt/bin/bd',
    }));

    expect(result.blocked).toEqual([]);
    expect(result.degraded).toContainEqual({
      capability: 'context7-cli',
      reason: 'Context7 CLI is missing.',
      repair_command: 'npx ctx7 setup --opencode',
    });
    expect(result.degraded).toContainEqual({
      capability: 'aft',
      reason: 'AFT peer plugin is not detectable in the current environment.',
      repair_command: 'Run bootstrap/setup with the default tools preset after reviewing the preview.',
    });
  });

  test('bare-bones does not require Context7 AFT GitHub or Serena', async () => {
    const result = await detectPresetTools('bare-bones', detectorWith({
      git: '/usr/bin/git',
      bd: '/opt/bin/bd',
    }));

    expect(result.blocked).toEqual([]);
    expect(result.degraded).toEqual([]);
    expect(result.tools.map((tool) => tool.name).sort()).toEqual(['bd', 'git']);
  });

  test('all-bells reports missing GitHub and Serena as degraded optional capabilities', async () => {
    const result = await detectPresetTools('all-bells', detectorWith({
      git: '/usr/bin/git',
      bd: '/opt/bin/bd',
      ctx7: '/opt/bin/ctx7',
    }));

    expect(result.blocked).toEqual([]);
    expect(result.degraded.map((capability) => capability.capability)).toEqual([
      'aft',
      'github-cli',
      'serena',
    ]);
  });
});
```

- [ ] **Step 2: Run the preset detection tests to verify they fail**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/tools/preset-detect.test.ts
```

Expected: FAIL because `detectPresetTools` is not exported.

- [ ] **Step 3: Implement preset-aware detection**

Modify `trans-genderian-orchestra-v2/src/tools/detect.ts`:

```ts
import type { CapabilityStatus } from '../commands/result';
import { createToolPresetPlan, type ToolPresetName } from './presets';

export interface CommandDetector {
  which(command: string): Promise<string | undefined>;
}

export interface DetectedTool {
  name: 'git' | 'bd' | 'ctx7' | 'gh' | 'uvx' | 'aft';
  status: 'user-managed' | 'missing';
  path?: string;
}

export interface ToolDetectionResult {
  tools: DetectedTool[];
  blocked: CapabilityStatus[];
  degraded: CapabilityStatus[];
}

async function detectTool(
  detector: CommandDetector,
  name: DetectedTool['name'],
): Promise<DetectedTool> {
  const path = await detector.which(name);
  return path
    ? { name, status: 'user-managed', path }
    : { name, status: 'missing' };
}

function missingTool(
  tools: DetectedTool[],
  name: DetectedTool['name'],
): boolean {
  return tools.find((tool) => tool.name === name)?.status === 'missing';
}

export async function detectPresetTools(
  preset: ToolPresetName,
  detector: CommandDetector,
): Promise<ToolDetectionResult> {
  const plan = createToolPresetPlan(preset);
  const cliTools = await Promise.all(
    plan.required_cli_tools.map((tool) => detectTool(detector, tool.name)),
  );
  const tools = preset === 'bare-bones'
    ? cliTools
    : [...cliTools, await detectTool(detector, 'aft')];

  const blocked: CapabilityStatus[] = [];
  const degraded: CapabilityStatus[] = [];

  for (const required of plan.required_cli_tools) {
    if (!missingTool(tools, required.name)) {
      continue;
    }
    const status = {
      capability: required.capability,
      reason:
        required.name === 'ctx7'
          ? 'Context7 CLI is missing.'
          : `${required.capability} is missing.`,
      repair_command: required.repair_command,
    };
    if (required.missing_status === 'blocked') {
      blocked.push(status);
    } else {
      degraded.push(status);
    }
  }

  if (preset !== 'bare-bones' && missingTool(tools, 'aft')) {
    degraded.unshift({
      capability: 'aft',
      reason: 'AFT peer plugin is not detectable in the current environment.',
      repair_command:
        'Run bootstrap/setup with the default tools preset after reviewing the preview.',
    });
  }

  return { tools, blocked, degraded };
}

export async function detectRequiredTools(
  detector: CommandDetector,
): Promise<ToolDetectionResult> {
  return detectPresetTools('default', detector);
}
```

- [ ] **Step 4: Run the preset detection tests to verify they pass**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/tools/preset-detect.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

Run:

```bash
git add trans-genderian-orchestra-v2/src/tools/detect.ts trans-genderian-orchestra-v2/src/tools/preset-detect.test.ts
git commit -m "feat: detect tgo preset tool capabilities"
```

### Task 4: Thread Tool Presets Through Bootstrap

**Files:**

- Modify: `trans-genderian-orchestra-v2/src/commands/bootstrap.ts`
- Modify: `trans-genderian-orchestra-v2/src/commands/bootstrap.test.ts`
- Modify: `trans-genderian-orchestra-v2/src/cli/index.ts`

- [ ] **Step 1: Write the failing bootstrap tests**

Update `trans-genderian-orchestra-v2/src/commands/bootstrap.test.ts` with these additional assertions/tests:

```ts
  test('dry-run honors bare-bones tool preset without remote MCP actions', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/opencode.jsonc':
        '{"plugin":["user-plugin"],"mcp":{"user-mcp":{"type":"remote"}}}',
    });

    const result = await runBootstrap({
      fs,
      homeDir: '/home/user',
      mode: 'dry-run',
      operationId: 'op-bare',
      timestamp: '2026-06-02T10-00-00-000Z',
      tools: 'bare-bones',
      detector: {
        async which(command) {
          return command === 'git' || command === 'bd' ? `/usr/bin/${command}` : undefined;
        },
      },
    });

    expect(result.planned_actions.map((action) => action.id)).not.toContain(
      'register-tgo-websearch',
    );
    expect(result.planned_actions.map((action) => action.id)).not.toContain(
      'register-tgo-grep-app',
    );
    expect(result.degraded_capabilities).toEqual([]);
    expect(
      await fs.readText('/home/user/.config/opencode/opencode.jsonc'),
    ).toContain('user-mcp');
  });

  test('apply records all-bells preset and preserves models and resilience presets', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/opencode.jsonc':
        '{"plugin":["user-plugin"],"provider":{"custom":{}},"mcp":{"user-mcp":{"type":"remote"}}}',
    });

    const result = await runBootstrap({
      fs,
      homeDir: '/home/user',
      mode: 'apply',
      operationId: 'op-all',
      timestamp: '2026-06-02T10-00-00-000Z',
      tools: 'all-bells',
      detector: {
        async which(command) {
          return ['git', 'bd', 'ctx7'].includes(command)
            ? `/usr/bin/${command}`
            : undefined;
        },
      },
    });

    expect(result.degraded_capabilities.map((capability) => capability.capability)).toEqual([
      'aft',
      'github-cli',
      'serena',
    ]);

    const config = JSON.parse(
      await fs.readText('/home/user/.config/opencode/opencode.jsonc'),
    );
    expect(config.mcp['user-mcp']).toEqual({ type: 'remote' });
    expect(config.provider).toEqual({ custom: {} });
    expect(config.mcp['tgo-github']).toBeDefined();
    expect(config.mcp['tgo-serena']).toBeDefined();

    const manifest = JSON.parse(
      await fs.readText('/home/user/.config/opencode/tgo/manifest.jsonc'),
    );
    expect(manifest.active_presets).toEqual({
      tools: 'all-bells',
      models: 'balanced',
      resilience: 'balanced',
    });
  });
```

Also update existing `runBootstrap` test calls to pass `tools: 'default'`.

- [ ] **Step 2: Run bootstrap tests to verify they fail**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/commands/bootstrap.test.ts
```

Expected: FAIL because `BootstrapInput` does not accept `tools` and bootstrap still hard-codes default planned actions.

- [ ] **Step 3: Implement bootstrap preset wiring**

Modify `trans-genderian-orchestra-v2/src/commands/bootstrap.ts`:

- Import `type ToolPresetName` from `../tools/presets`.
- Import `detectPresetTools` from `../tools/detect`.
- Add `tools: ToolPresetName` to `BootstrapInput`.
- Replace `planDefaultManagedEntries()` with `planDefaultManagedEntries(input.tools)`.
- Replace hard-coded plugin/MCP planned actions with actions derived from `entries.plugins` and `entries.mcps`:

```ts
function plannedActionIdForPlugin(plugin: string): string {
  const packageName = plugin.split('@')[0] ?? plugin;
  return `register-${packageName}`;
}

function plannedActionTitleForPlugin(plugin: string): string {
  const packageName = plugin.split('@')[0] ?? plugin;
  return `Register ${packageName}`;
}
```

- Use `detectPresetTools(input.tools, input.detector)` instead of `detectRequiredTools`.
- In apply mode, set `manifest.active_presets.tools = input.tools` while leaving `models` and `resilience` unchanged.
- Build `manifest.managed_config` from actual `entries.plugins`, `entries.agents`, `entries.mcps`, and `default_agent`.

Modify `trans-genderian-orchestra-v2/src/cli/index.ts` so the bootstrap call includes `tools: args.tools as ToolPresetName`. If type narrowing requires a helper, add a local `parseToolPresetName` function that accepts only `bare-bones`, `default`, or `all-bells` and falls back to `default`.

- [ ] **Step 4: Run bootstrap tests to verify they pass**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/commands/bootstrap.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 4**

Run:

```bash
git add trans-genderian-orchestra-v2/src/commands/bootstrap.ts trans-genderian-orchestra-v2/src/commands/bootstrap.test.ts trans-genderian-orchestra-v2/src/cli/index.ts
git commit -m "feat: wire bootstrap tool presets"
```

### Task 5: Add Doctor And Command Guidance For Tool Integrations

**Files:**

- Modify: `trans-genderian-orchestra-v2/src/commands/doctor.ts`
- Modify: `trans-genderian-orchestra-v2/src/commands/doctor.test.ts`
- Modify: `trans-genderian-orchestra-v2/src/plugin/commands.ts`
- Modify: `trans-genderian-orchestra-v2/src/plugin/agents.test.ts`

- [ ] **Step 1: Write the failing doctor and command guidance tests**

Add these tests to `trans-genderian-orchestra-v2/src/commands/doctor.test.ts`:

```ts
  test('reports user-managed MCPs as visible without mutating them', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/tgo/manifest.jsonc': JSON.stringify({
        schema_version: 1,
        package: { name: 'trans-genderian-orchestra', version: '2.0.0-beta.0' },
        active_presets: { tools: 'default', models: 'balanced', resilience: 'balanced' },
        managed_config: [{ kind: 'mcp', key: 'mcp.tgo-websearch' }],
        tools: [],
        backups: [],
        ignored_warnings: [],
      }),
      '/home/user/.config/opencode/opencode.jsonc': JSON.stringify({
        agent: {},
        mcp: {
          'user-search': { type: 'remote', url: 'https://example.com' },
          'tgo-websearch': { type: 'remote', url: 'https://mcp.exa.ai/mcp' },
        },
      }),
    });

    const result = await runDoctor({
      fs,
      homeDir: '/home/user',
      detector: {
        async which(command) {
          return command === 'git' || command === 'bd' ? `/usr/bin/${command}` : undefined;
        },
      },
    });

    expect(result.warnings).toContainEqual({
      code: 'user-managed-mcp-visible',
      message: 'User-managed MCP user-search remains visible and unmanaged by TGO.',
      severity: 'info',
    });
    expect(result.degraded_capabilities.map((capability) => capability.capability)).toContain('context7-cli');
    expect(await fs.readText('/home/user/.config/opencode/opencode.jsonc')).toContain('user-search');
  });

  test('reports all-bells optional GitHub and Serena capability degradation', async () => {
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
      '/home/user/.config/opencode/opencode.jsonc': '{}',
    });

    const result = await runDoctor({
      fs,
      homeDir: '/home/user',
      detector: {
        async which(command) {
          return ['git', 'bd', 'ctx7'].includes(command)
            ? `/usr/bin/${command}`
            : undefined;
        },
      },
    });

    expect(result.degraded_capabilities.map((capability) => capability.capability)).toEqual([
      'aft',
      'github-cli',
      'serena',
    ]);
  });
```

Update `trans-genderian-orchestra-v2/src/plugin/agents.test.ts` command-config assertions with:

```ts
    expect(commands['tgo:setup'].template).toContain('bare-bones, default, or all-bells');
    expect(commands['tgo:setup'].template).toContain('preserve user-managed skills, plugins, MCPs, providers, and agents');
    expect(commands['tgo:setup'].template).toContain('env/OAuth references only');
    expect(commands['tgo:models'].template).toContain('without changing tool or resilience presets');
```

- [ ] **Step 2: Run doctor and command tests to verify they fail**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/commands/doctor.test.ts src/plugin/agents.test.ts
```

Expected: FAIL because doctor does not inspect active tool preset/user-managed MCPs, and command guidance lacks Phase 5 setup wording.

- [ ] **Step 3: Implement doctor and command guidance**

Modify `trans-genderian-orchestra-v2/src/commands/doctor.ts`:

- Import `readManifest` from `../manifest/store`.
- Import `detectPresetTools` from `../tools/detect`.
- Read the global manifest to obtain `active_presets.tools`, defaulting to `default`.
- Use `detectPresetTools(manifest.active_presets.tools, input.detector)`.
- After parsing config, inspect `config.mcp` keys. Any MCP key not present in `manifest.managed_config` as `mcp.<key>` and not starting with `tgo-` emits info warning `user-managed-mcp-visible`.
- Keep doctor read-only.

Modify `trans-genderian-orchestra-v2/src/plugin/commands.ts`:

```ts
    'tgo:setup': {
      description:
        'Change TGO v2 setup, presets, managed tools, or repair state with preview.',
      template:
        'Preview deterministic TGO setup changes. Tool presets may be bare-bones, default, or all-bells; changing tools must preserve user-managed skills, plugins, MCPs, providers, and agents, use env/OAuth references only, and must not change model or resilience presets.',
    },
```

- [ ] **Step 4: Run doctor and command tests to verify they pass**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/commands/doctor.test.ts src/plugin/agents.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 5**

Run:

```bash
git add trans-genderian-orchestra-v2/src/commands/doctor.ts trans-genderian-orchestra-v2/src/commands/doctor.test.ts trans-genderian-orchestra-v2/src/plugin/commands.ts trans-genderian-orchestra-v2/src/plugin/agents.test.ts
git commit -m "feat: report tgo tool preset integration state"
```

### Task 6: Run Phase 5 Validation Gate

**Files:**

- Validate all Phase 5 files.
- Update `.slim/deepwork/tgo-v2-phased-implementation.md` after merge; this file is intentionally ignored and should not be committed.

- [ ] **Step 1: Run targeted tests**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/tools/presets.test.ts src/tools/managed.test.ts src/tools/preset-detect.test.ts
bun test src/commands/bootstrap.test.ts src/commands/doctor.test.ts
bun test src/plugin/agents.test.ts
```

Expected: all pass with zero failures.

- [ ] **Step 2: Run full verification**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test
bun run typecheck
bun run check:ci
bun run build
```

Expected:

- `bun test`: all tests pass with zero failures.
- `bun run typecheck`: `tsc --noEmit` exits 0.
- `bun run check:ci`: Biome exits 0 with no fixes required.
- `bun run build`: plugin, CLI, and declarations build successfully.

- [ ] **Step 3: Run Phase 5 smoke checks**

Run this smoke for preset planning:

```bash
cd trans-genderian-orchestra-v2
bun -e '
import { createToolPresetPlan } from "./src/tools/presets.ts";
import { createManagedEntriesForToolPreset } from "./src/tools/managed.ts";

const bare = createToolPresetPlan("bare-bones");
const defaults = createManagedEntriesForToolPreset("default");
const allBells = createManagedEntriesForToolPreset("all-bells");
const output = {
  smoke: "phase5-tool-presets",
  bare_bones_remote_mcps: bare.mcps.length,
  default_has_websearch: Boolean(defaults.mcps["tgo-websearch"]),
  default_has_context7_mcp: Boolean(defaults.mcps["tgo-context7"]),
  all_bells_has_github: Boolean(allBells.mcps["tgo-github"]),
  all_bells_has_serena: Boolean(allBells.mcps["tgo-serena"]),
  env_auth_only: JSON.stringify(allBells.mcps).includes("{env:GITHUB_PERSONAL_ACCESS_TOKEN}"),
};
console.log(JSON.stringify(output, null, 2));
'
```

Expected JSON:

```json
{
  "smoke": "phase5-tool-presets",
  "bare_bones_remote_mcps": 0,
  "default_has_websearch": true,
  "default_has_context7_mcp": false,
  "all_bells_has_github": true,
  "all_bells_has_serena": true,
  "env_auth_only": true
}
```

Run this smoke for bootstrap config preservation:

```bash
cd trans-genderian-orchestra-v2
export TGO_TEST_HOME=$(mktemp -d)
mkdir -p "$TGO_TEST_HOME/.config/opencode"
printf '{"plugin":["user-plugin"],"mcp":{"user-mcp":{"type":"remote","url":"https://example.com"}},"provider":{"custom":{}}}' > "$TGO_TEST_HOME/.config/opencode/opencode.jsonc"
bun ./src/cli/index.ts bootstrap --tools all-bells --yes --json | bun -e '
const stdin = await new Response(Bun.stdin.stream()).text();
const result = JSON.parse(stdin);
const config = await Bun.file(`${process.env.TGO_TEST_HOME}/.config/opencode/opencode.jsonc`).json();
const manifest = await Bun.file(`${process.env.TGO_TEST_HOME}/.config/opencode/tgo/manifest.jsonc`).json();
console.log(JSON.stringify({
  smoke: "phase5-bootstrap-all-bells",
  applied: result.changes_applied.length > 0,
  user_plugin_preserved: config.plugin.includes("user-plugin"),
  user_mcp_preserved: Boolean(config.mcp["user-mcp"]),
  github_mcp: Boolean(config.mcp["tgo-github"]),
  serena_mcp: Boolean(config.mcp["tgo-serena"]),
  tools: manifest.active_presets.tools,
  models: manifest.active_presets.models,
  resilience: manifest.active_presets.resilience,
}, null, 2));
'
```

Expected JSON:

```json
{
  "smoke": "phase5-bootstrap-all-bells",
  "applied": true,
  "user_plugin_preserved": true,
  "user_mcp_preserved": true,
  "github_mcp": true,
  "serena_mcp": true,
  "tools": "all-bells",
  "models": "balanced",
  "resilience": "balanced"
}
```

- [ ] **Step 4: Inline reviewer-style self-review**

Because TGO/oracle specialist subagents are unavailable in this environment, perform inline review:

```bash
git diff --stat <phase5-plan-commit>..HEAD
git diff --name-status <phase5-plan-commit>..HEAD
grep -R -E 'TO''DO|T''BD|fill'' in|implement'' later|Similar'' to Task|appropriate'' error handling|Write'' tests for the above' trans-genderian-orchestra-v2/src/tools trans-genderian-orchestra-v2/src/commands trans-genderian-orchestra-v2/src/config trans-genderian-orchestra-v2/src/plugin || true
```

Expected:

- Diff touches only files listed in this plan.
- Placeholder scan prints no source-file matches.
- No raw secrets are introduced.
- Context7 remains CLI+skill, not MCP, in default.
- Serena and GitHub MCP remain all-bells only.

- [ ] **Step 5: Merge locally and update deepwork context**

After branch verification passes:

```bash
cd /Users/ryan/OpenCode/general/omo-slim_modifications
git merge --ff-only tgo-v2-phase-5
cd trans-genderian-orchestra-v2
bun test
bun run typecheck
bun run check:ci
bun run build
```

Run the Phase 5 smokes again on merged `master`, changing smoke labels to `phase5-tool-presets-master` and `phase5-bootstrap-all-bells-master`.

Update `.slim/deepwork/tgo-v2-phased-implementation.md` with Phase 5 summary, commits, verification output, and next active phase. Do not commit `.slim/deepwork` or `.beads` metadata unless explicitly requested.

## Completion Criteria

- Phase 5 plan is committed before implementation.
- Phase 5 branch contains Task 1-5 commits and any formatting/review-fix commits.
- Targeted tests pass.
- Full `bun test`, `bun run typecheck`, `bun run check:ci`, and `bun run build` pass.
- Phase 5 smokes produce expected JSON.
- Inline reviewer-style pass finds no blocking issues, or issues are fixed with tests first.
- Branch is merged locally into `master` and verified again.
- No remote push is performed without asking first.

## Manual Testing

No manual OpenCode session test is required for Phase 5. Phase 5 changes deterministic preset/config planning and command guidance. Manual OpenCode testing becomes relevant when Phase 6 model/resilience behavior or later release/migration flows require live provider/tool interactions.

## Self-Review Notes

- Spec coverage: Phase 5 gate items from `designs/tgo-v2/specs/07-implementation-phases-validation-gates.md` are covered by Tasks 1-6.
- Scope control: runtime `/tgo:work` mutation/delegation wiring is not included here because it is outside the Phase 5 tool-preset gate and Phase 4 intentionally ended with preview primitives.
- Placeholder scan command is included with split string literals so it does not self-match this plan.
