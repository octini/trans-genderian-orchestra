# TGO v2 Public Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal root README with a full GitHub-facing TGO v2 public documentation set, backed by documentation coverage tests.

**Architecture:** Add a docs-first validation layer, then rewrite the README and focused deep-dive docs until the validation layer passes. Keep operational release docs (`MIGRATION.md`, `RELEASE.md`) short and factual, and use the new docs hub for narrative explanations.

**Tech Stack:** Markdown documentation, Bun test runner, TypeScript release tests, existing TGO v2 design specs and source modules.

---

## Constraints

- Use Beads for task tracking. Do not use TodoWrite.
- Stealth mode is active. Do not run git commands, do not commit, and do not stage files unless the user explicitly changes this rule.
- Do not publish npm packages, bump versions, create tags, push, open PRs, delete archives, or change runtime behavior.
- Change only documentation and documentation tests unless a validation failure proves a tiny metadata correction is required.
- Keep every public claim grounded in shipped `2.0.0-beta.2` behavior.
- Do not run `bun run verify:public-beta-opencode` by default; it depends on network/OpenCode/model availability.

## File Structure

- Modify: `src/release/docs.test.ts`
  - Responsibility: enforce required public README/docs coverage and block stale v1 package guidance.
- Modify: `README.md`
  - Responsibility: GitHub/npm landing page for public beta readers.
- Create: `docs/README.md`
  - Responsibility: public docs hub linking every deep dive and operational document.
- Create: `docs/architecture.md`
  - Responsibility: explain TGO v2 umbrella architecture, beta scope, package layout, and v1 differences.
- Create: `docs/agents-and-workflows.md`
  - Responsibility: explain agent roster, workflow contracts, reviewer/council gates, and implementation-vs-planned boundaries.
- Create: `docs/setup-doctor-manifests.md`
  - Responsibility: explain setup/bootstrap/doctor/uninstall behavior, manifests, backups, ownership, rollback, and safe uninstall.
- Create: `docs/tools-skills-mcps.md`
  - Responsibility: explain tool presets, skills, bundled plugin planning, MCP intent, preservation, permissions, and CLI checks.
- Create: `docs/models-resilience-council.md`
  - Responsibility: explain model presets, resilience profiles, fallback classification, semantic retry boundaries, and council derivation.
- Create: `docs/migration-and-release.md`
  - Responsibility: explain v1/omo-slim replacement, root cutover, beta/latest state, release gates, public beta smoke, and remaining manual gate.
- Review only unless stale wording is found: `MIGRATION.md`, `RELEASE.md`
  - Responsibility: short operational guides linked by the docs hub.

## Task 1: Claim The Implementation Work

**Files:**
- No project file edits.

- [ ] **Step 1: Create or claim a Beads task**

Run:

```bash
bd create "Implement TGO v2 public documentation" -t task -p 2
```

Expected: Beads prints a new issue id such as `omo-slim_modifications-abc`.

If a matching issue already exists, use it instead and run:

```bash
bd update <issue-id> --status in_progress
```

Expected: the issue status is `in_progress`.

- [ ] **Step 2: Record the plan path on the issue**

Run:

```bash
bd update <issue-id> --notes "Executing docs/superpowers/plans/2026-06-02-tgo-v2-public-documentation.md. Scope is documentation plus documentation tests only."
```

Expected: Beads accepts the update.

## Task 2: Add Documentation Coverage Tests First

**Files:**
- Modify: `src/release/docs.test.ts`

- [ ] **Step 1: Replace the existing docs test with coverage assertions**

Replace `src/release/docs.test.ts` with:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'bun:test';

const deepDiveDocs = [
  'docs/architecture.md',
  'docs/agents-and-workflows.md',
  'docs/setup-doctor-manifests.md',
  'docs/tools-skills-mcps.md',
  'docs/models-resilience-council.md',
  'docs/migration-and-release.md',
];

function readRepoFile(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('release documentation', () => {
  test('package ships migration and release documentation', () => {
    const pkg = JSON.parse(readRepoFile('package.json'));

    expect(pkg.files).toContain('MIGRATION.md');
    expect(pkg.files).toContain('RELEASE.md');
  });

  test('migration guide documents v1 replacement and rollback boundaries', () => {
    const migration = readRepoFile('MIGRATION.md');

    expect(migration).toContain('V1/omo-slim detection');
    expect(migration).toContain(
      'v2 replaces v1 rather than running side-by-side',
    );
    expect(migration).toContain('manifest-linked backup');
    expect(migration).toContain(
      'No automatic push, PR, latest publish, root cutover, or worktree cleanup',
    );
  });

  test('readme is the public beta front door', () => {
    const readme = readRepoFile('README.md');

    expect(readme).toContain('2.0.0-beta.2');
    expect(readme).toContain('trans-genderian-orchestra@beta');
    expect(readme).toContain(
      'opencode plugin trans-genderian-orchestra@beta --global --force',
    );
    expect(readme).toContain('/tgo:doctor --json');
    expect(readme).toContain('verify:public-beta-opencode');
    expect(readme).toContain('latest');
    expect(readme).toContain('bootstrap --tools default --models balanced --resilience balanced');
    expect(readme).toContain('lives at the repository root');
    expect(readme).not.toContain('Active beta package');
    expect(readme).not.toContain('this subfolder');

    for (const docPath of deepDiveDocs) {
      expect(readme).toContain(`./${docPath}`);
    }
  });

  test('docs hub links every public deep dive and operational guide', () => {
    const docsHub = readRepoFile('docs/README.md');

    for (const docPath of deepDiveDocs) {
      expect(existsSync(new URL(`../../${docPath}`, import.meta.url))).toBe(true);
      expect(docsHub).toContain(`./${docPath.replace('docs/', '')}`);
    }

    expect(docsHub).toContain('../MIGRATION.md');
    expect(docsHub).toContain('../RELEASE.md');
  });

  test('public docs avoid stale v1 package guidance', () => {
    const publicDocs = [
      'README.md',
      'docs/README.md',
      ...deepDiveDocs,
    ].map((path) => [path, readRepoFile(path)] as const);

    for (const [path, contents] of publicDocs) {
      expect(contents, path).not.toContain('trans-genderian-orchestra-v2/');
      expect(contents, path).not.toContain('npm install ./trans-genderian-orchestra-v2');
      expect(contents, path).not.toContain('working `/ping-all`');
      expect(contents, path).not.toContain('installer TUI');
      expect(contents, path).not.toContain('multiplexer panes');
      expect(contents, path).not.toContain('browser interview flow');
      expect(contents, path).not.toContain('stable release');
    }
  });

  test('feature docs cover every v2 design spec number', () => {
    const docsCorpus = deepDiveDocs
      .map((path) => readRepoFile(path))
      .join('\n\n');

    for (const specNumber of ['00', '01', '02', '03', '04', '05', '06', '07']) {
      expect(docsCorpus).toContain(`Spec ${specNumber}`);
    }
  });
});
```

- [ ] **Step 2: Run the docs tests and confirm they fail for missing docs**

Run:

```bash
bun test src/release/docs.test.ts
```

Expected: FAIL because `docs/README.md` and the deep-dive docs do not exist yet, or because the current README lacks required public beta coverage.

- [ ] **Step 3: Update Beads with the red result**

Run:

```bash
bd update <issue-id> --notes "Red docs test established with bun test src/release/docs.test.ts; expected failures are missing public docs and README coverage."
```

Expected: Beads accepts the note.

## Task 3: Rewrite The Root README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite `README.md` as the public landing page**

Use these exact sections in this order:

```markdown
# trans-genderian-orchestra v2

> TGO v2 is an OpenCode dispatcher plugin that turns ad-hoc AI coding sessions into a review-oriented engineering workflow.

`trans-genderian-orchestra` currently lives at the repository root and is published as `2.0.0-beta.2` on the npm `beta` dist-tag.

## What It Is

TGO v2 routes work through specialist agents, deterministic setup commands, durable context artifacts, and reviewer gates. The goal is to make OpenCode behave less like one improvising assistant and more like a small engineering team with a technical lead, researcher, builder, reviewer, and escalation council.

This beta is usable for setup validation and documentation-led testing, but it is still a public beta. Prefer explicit beta commands until a stable release moves npm `latest` away from the original `2.0.0-beta.0` publish.

## Philosophy

- Pure dispatcher: the orchestrator routes, confirms, delegates, and synthesizes instead of silently implementing arbitrary changes.
- Specialist lanes: researcher, builder, reviewer, council, and councillor roles have separate responsibilities and permission expectations.
- Approval gates: behavior-changing work should pass through approved plans, scoped implementation, and reviewer verification.
- Retrieval-led reasoning: agents should inspect project files, docs, history, and external references before relying on memory.
- SDD-style artifacts: specs, plans, evidence, reviews, handoffs, and state files preserve intent across compaction and handoff.
- Deterministic config: setup, bootstrap, doctor, and uninstall flows are previewable, manifest-backed, backup-aware, and reversible.
- Automation before manual testing: release-readiness checks and public beta smoke scripts run before relying on a real OpenCode UI session.

## Quick Start

Install the current public beta explicitly:

```bash
npm install trans-genderian-orchestra@beta
```

Install the beta into OpenCode:

```bash
opencode plugin trans-genderian-orchestra@beta --global --force
```

Restart OpenCode after plugin installation. OpenCode does not hot-reload config-time plugin changes reliably enough for this beta validation flow.

Run doctor before applying setup or bootstrap changes:

```text
/tgo:doctor --json
```

The published slash command resolves the CLI through:

```bash
npx --yes trans-genderian-orchestra@beta doctor --json
```

It intentionally does not run `bd doctor`; Beads diagnostics are separate from TGO doctor output.

## Bootstrap Preview

Preview or apply setup with explicit preset dimensions:

```bash
trans-genderian-orchestra bootstrap --tools default --models balanced --resilience balanced
```

The bootstrap path plans TGO-managed plugins, agents, commands, tools, model presets, and resilience settings while preserving user-owned OpenCode config.

## Beta Status

- Package version: `2.0.0-beta.2`.
- npm `beta` dist-tag: `2.0.0-beta.2`.
- npm `latest` dist-tag: still points at `2.0.0-beta.0`.
- Recommended install selector: `trans-genderian-orchestra@beta`.
- Remaining manual gate: restart a real OpenCode session and run `/tgo:doctor --json` interactively before applying real profile setup.

## Feature Map

- Agent roster and permissions: orchestrator, researcher, builder, reviewer, council, and councillor roles with path/permission boundaries.
- Command surface: `/tgo:doctor`, `/tgo:setup`, `/tgo:init`, `/tgo:uninstall`, `/tgo:work`, `/tgo:models`, plus compatibility aliases where implemented.
- Setup lifecycle: deterministic bootstrap, setup preview, doctor inspection, manifest-backed changes, backups, rollback helpers, and safe uninstall.
- Migration lifecycle: v1/omo-slim detection, replacement planning, root package cutover, beta release gates, and explicit latest-tag caveat.
- Tooling: `bare-bones`, `default`, and `all-bells` tool presets; skills and MCP planning; user-managed provider/plugin/MCP preservation.
- Model and resilience planning: model presets, model-switch planning, provider fallback classification, circuit breaker state, semantic retry boundaries, and council derivation.
- Workflow primitives: delegation envelope, specialist result contract, reviewer gate, scheduler/worktree planning, integration/reconciliation primitives, and auto-continue/resume concepts.
- Validation harnesses: release-readiness tests and the reusable `verify:public-beta-opencode` smoke script.

## Documentation

- [Architecture](./docs/architecture.md)
- [Agents And Workflows](./docs/agents-and-workflows.md)
- [Setup, Doctor, And Manifests](./docs/setup-doctor-manifests.md)
- [Tools, Skills, And MCPs](./docs/tools-skills-mcps.md)
- [Models, Resilience, And Council](./docs/models-resilience-council.md)
- [Migration And Release](./docs/migration-and-release.md)
- [Docs Hub](./docs/README.md)
- [Operational Migration Guide](./MIGRATION.md)
- [Operational Release Guide](./RELEASE.md)

## Safety Boundaries

- Doctor is read-only.
- Setup and bootstrap should preview planned actions before writing.
- Writes are manifest-linked and backup-aware.
- Uninstall removes only TGO-managed entries recorded in the manifest.
- Shared CLIs such as `bd`, `ctx7`, `gh`, and `uvx` are not uninstalled by TGO.
- Secret-like values are warned about, redacted, or rejected on TGO-managed surfaces.
- TGO does not push, open PRs, merge, publish, delete worktrees, or remove user tools without explicit approval.

## Validation

Focused documentation validation:

```bash
bun test src/release/docs.test.ts src/release/release-readiness.test.ts src/release/repository-layout.test.ts
```

Full local release-readiness validation for this docs-only change:

```bash
bun run typecheck
bun run check:ci
bun run verify:release-readiness
```

The public beta OpenCode smoke exists as:

```bash
bun run verify:public-beta-opencode
```

Run it only when network/OpenCode/model access is acceptable for the current validation session.
```

- [ ] **Step 2: Run the docs test again**

Run:

```bash
bun test src/release/docs.test.ts
```

Expected: FAIL remains because the docs hub and deep-dive docs still need to be created.

## Task 4: Create The Docs Hub

**Files:**
- Create: `docs/README.md`

- [ ] **Step 1: Create `docs/README.md`**

Use these sections:

```markdown
# TGO v2 Documentation

This hub collects the current public beta documentation for `trans-genderian-orchestra` v2. The root README is the front door; these pages are the deeper references.

## Start Here

- [Architecture](./architecture.md)
- [Agents And Workflows](./agents-and-workflows.md)
- [Setup, Doctor, And Manifests](./setup-doctor-manifests.md)
- [Tools, Skills, And MCPs](./tools-skills-mcps.md)
- [Models, Resilience, And Council](./models-resilience-council.md)
- [Migration And Release](./migration-and-release.md)

## Operational Guides

- [Migration Guide](../MIGRATION.md)
- [Release Guide](../RELEASE.md)

## Validation Commands

```bash
bun test src/release/docs.test.ts src/release/release-readiness.test.ts src/release/repository-layout.test.ts
bun run typecheck
bun run check:ci
bun run verify:release-readiness
```

`bun run verify:public-beta-opencode` is available for public beta smoke testing, but it depends on a usable OpenCode/network/model environment.

## Spec Coverage Map

- Spec 00: umbrella architecture and workflow philosophy.
- Spec 01: deterministic setup foundation.
- Spec 02: agent roster and permissions.
- Spec 03: workflow contracts and artifacts.
- Spec 04: scheduler, worktrees, and integration flow.
- Spec 05: tools, skills, MCPs, and integrations.
- Spec 06: models, resilience, and council derivation.
- Spec 07: implementation phases and validation gates.
```

- [ ] **Step 2: Run the docs test again**

Run:

```bash
bun test src/release/docs.test.ts
```

Expected: FAIL remains because the deep-dive docs still need to be created.

## Task 5: Create Architecture Deep Dive

**Files:**
- Create: `docs/architecture.md`

- [ ] **Step 1: Create `docs/architecture.md`**

Use sections covering these exact points:

```markdown
# TGO v2 Architecture

## Purpose

TGO v2 is an OpenCode workflow plugin that coordinates specialist agents, durable artifacts, deterministic setup, and reviewer gates. It is designed to make OpenCode sessions more reliable without giving the plugin silent authority over user config or release actions.

## Beta Scope

- Current public package: `2.0.0-beta.2`.
- Current recommended selector: `trans-genderian-orchestra@beta`.
- npm `latest` caveat: `latest` still points to `2.0.0-beta.0` until stable release.
- The package lives at the repository root after the approved root cutover.

## Core Goals

- Preserve exact user intent across handoffs.
- Retrieve/read before reasoning.
- Use SDD-inspired phases as workflow states.
- Keep setup deterministic, reversible, previewed, backed up, and secret-safe.
- Preserve user-owned OpenCode config.
- Require explicit approval for destructive or release actions.

## Non-Goals

- TGO is not a general-purpose package manager.
- TGO does not silently remove or overwrite user-managed tools, skills, plugins, MCPs, providers, or config.
- TGO does not start work from startup hooks, timers, compaction hooks, polling, or ready Beads issues without a conversation-triggered action.
- TGO does not bypass Reviewer for behavior-changing work.
- TGO does not store raw API keys, PATs, tokens, or passwords in manifests, generated config, Beads notes, artifacts, or doctor output.

## Package Layout

The active package is the repository root. Archived v1 material remains reference material only and is not active package guidance.

## Namespacing

TGO-managed commands use the `tgo:` namespace where practical. Compatibility aliases exist only where implemented by the plugin command config.

## Global And Project Scope

Global setup handles OpenCode-level plugin/config installation. Project initialization handles Beads, guidance, validation, and local artifact scaffolding. Both flows should preview changes and preserve user-owned config.

## Retained V1 Ideas

- Dispatcher-oriented workflows.
- Specialist roles.
- Permission/path-gating concepts.
- Council-style escalation.
- Rich public documentation style.

## Explicit V1 Changes

- V2 replaces v1/omo-slim instead of running side by side.
- The active package is no longer a nested v2 subdirectory.
- Planner responsibilities are folded into orchestrator phase control rather than a permanent Planner role.
- Runtime claims are limited to implemented beta behavior.

## Spec Coverage

- Spec 00: architecture goals, non-goals, artifact model, and workflow philosophy.
- Spec 07: implementation phase order, validation gates, and beta release hardening.
```

## Task 6: Create Agents And Workflows Deep Dive

**Files:**
- Create: `docs/agents-and-workflows.md`

- [ ] **Step 1: Create `docs/agents-and-workflows.md`**

Use sections covering these exact points:

```markdown
# Agents And Workflows

## Agent Roster

- Orchestrator: user-facing technical lead, dispatcher, phase controller, and artifact owner.
- Researcher: evidence retrieval, docs/source comparison, and uncertainty reporting.
- Builder: scoped implementation, tests, local validation, and rework.
- Reviewer: required verification gate for behavior-changing work.
- Council: escalation-only synthesis workflow.
- Councillor: internal council participant prompt for independent analysis.

## Role Boundaries

The orchestrator should not silently implement arbitrary project changes. Builders own scoped implementation. Reviewers verify against the user request, plan, and acceptance criteria. Council is reserved for explicit escalation, high-risk decisions, or repeated reviewer rejection loops.

## Permissions

Agent permissions are designed around bounded write scopes and path-gating. User-owned config, tools, providers, skills, plugins, and MCPs are preserved unless explicitly adopted or changed.

## Conversation-Triggered Intent

TGO is designed around conversation-triggered workflows. The user should not need to memorize every slash command; the orchestrator should classify intent, ask for missing decisions when needed, and route to the right workflow.

## Delegation Envelope

Builder and researcher handoffs should carry original user intent, relevant files, constraints, acceptance criteria, non-goals, write scope, validation commands, and reporting requirements.

## Specialist Result Contract

Specialists should report what changed, what was validated, unresolved risks, and exact follow-up needs. Results should be synthesizable by the orchestrator without losing user intent.

## Reviewer Gate

Behavior-changing work should pass a reviewer gate before the orchestrator claims completion. Reviewer output should focus on correctness, regressions, missing tests, and spec mismatch.

## Council Escalation

Council is escalation-only. It is appropriate for explicit user requests, critical-risk decisions, or repeated reviewer rejection loops.

## Scheduler, Worktrees, And Integration

TGO design includes scheduler waves, separate builder worktrees, branch-level reviewer artifacts, dedicated integration validation, and reconciliation tasks for conflicts. Public docs should describe these as workflow primitives and avoid claiming unattended production maturity beyond implemented deterministic pieces.

## Resume And Auto-Continue

Durable artifacts and state files exist to preserve context through compaction and handoff. Auto-continue behavior must remain bounded by user intent and validation gates.

## Spec Coverage

- Spec 02: agent roster, role boundaries, and permissions.
- Spec 03: delegation envelopes, artifacts, intent routing, and specialist result contracts.
- Spec 04: Beads work tracking, scheduler, worktrees, integration, and reconciliation.
```

## Task 7: Create Setup, Doctor, And Manifests Deep Dive

**Files:**
- Create: `docs/setup-doctor-manifests.md`

- [ ] **Step 1: Create `docs/setup-doctor-manifests.md`**

Use sections covering these exact points:

```markdown
# Setup, Doctor, And Manifests

## Command Surface

- `/tgo:doctor`: inspect TGO setup state and report repairs.
- `/tgo:setup`: preview setup or preset changes.
- `/tgo:init`: initialize project-local Beads, guidance, validation, and artifact scaffolding.
- `/tgo:uninstall`: preview and remove TGO-managed setup entries safely.
- `/tgo:work`: start or continue approved TGO-managed implementation work.
- `/tgo:models`: inspect or switch model presets.

## Doctor Is Read-Only

Doctor reports setup state, v1/omo-slim detection, warnings, and repair suggestions without mutating config.

## Bootstrap And Setup

Use explicit preset dimensions:

```bash
trans-genderian-orchestra bootstrap --tools default --models balanced --resilience balanced
```

Setup should preview planned changes, preserve user-managed config, and separate tool/model/resilience dimensions.

## Command Result Contract

Deterministic commands should report planned actions, warnings, changed paths, backup paths, manifest updates, and next steps in a machine-readable result shape where available.

## Manifests

TGO-managed entries are tracked in manifests so later repair, rollback, and uninstall operations can distinguish plugin-owned changes from user-owned config.

## Backups And Rollback

Config writes should create timestamped backups before mutation. Rollback helpers should reference manifest-linked backups rather than guessing at global state.

## Config Merge And Ownership

TGO should deep-merge config, preserve existing user providers/plugins/agents/MCPs, and avoid overwriting user-owned settings unless explicitly requested.

## Secret-Like Values

Raw API keys, PATs, tokens, and passwords should not be stored in manifests, generated config, Beads notes, artifacts, or doctor output. Secret-like values should be warned about, redacted, or rejected on TGO-managed surfaces.

## CLI Detection

Doctor/setup flows may detect required CLIs such as `bd`, `ctx7`, `gh`, or `uvx`, but uninstall must not remove shared CLIs.

## Safe Uninstall

Uninstall removes only TGO-managed entries recorded in the manifest and should create or reference a backup for rollback.

## Spec Coverage

- Spec 01: deterministic setup foundation, manifests, backups, doctor, config merge, and secret safety.
- Spec 07: validation gates and safe beta migration/release hardening.
```

## Task 8: Create Tools, Skills, And MCPs Deep Dive

**Files:**
- Create: `docs/tools-skills-mcps.md`

- [ ] **Step 1: Create `docs/tools-skills-mcps.md`**

Use sections covering these exact points:

```markdown
# Tools, Skills, And MCPs

## Tool Presets

- `bare-bones`: minimal managed tool planning.
- `default`: recommended balanced tool preset for normal beta validation.
- `all-bells`: broader managed tool planning for users who opt into more integrations.

Tool preset changes must not silently change model or resilience presets.

## Bundled Plugin Planning

TGO setup can plan related OpenCode plugins where implemented, but it must preserve user-managed plugins and avoid treating the plugin as a general-purpose package manager.

## Skill Policy

Skills are part of the workflow surface. TGO should preserve user-managed skills and only manage entries it owns or the user explicitly adopts.

## MCP Intent

The design includes integrations for documentation lookup, AFT/code intelligence, web search, GitHub operations, grep_app search, and Serena-style code navigation where available. Public docs should explain intent without claiming every external service is always installed or authenticated.

## User-Managed Preservation

Existing providers, plugins, MCPs, skills, agents, and custom config are user-owned by default.

## Permissions

MCP/tool permissions should be explicit and bounded. Generated config should avoid broad mutation authority unless the user chooses it.

## Required CLI Detection

Doctor and setup can warn about missing CLIs required for a selected preset. Missing optional tools should be warnings with next steps, not silent destructive repair.

## Spec Coverage

- Spec 05: tool presets, integrations, skills, MCP planning, preservation rules, and CLI detection.
```

## Task 9: Create Models, Resilience, And Council Deep Dive

**Files:**
- Create: `docs/models-resilience-council.md`

- [ ] **Step 1: Create `docs/models-resilience-council.md`**

Use sections covering these exact points:

```markdown
# Models, Resilience, And Council

## Model Presets

TGO separates model presets from tool and resilience presets. `/tgo:models` inspects or switches model presets without changing tool or resilience dimensions.

## Model Switch Planning

Model changes should be planned, previewed, and scoped so provider config and user-owned settings are preserved.

## Fallback Classification

Provider fallback is for structural/provider failures such as provider errors, unavailable models, or transport failures. It is not a way to treat semantic disagreement as success.

## Circuit Breaker

Resilience design includes circuit-breaker behavior to avoid repeatedly selecting failing providers or models without surfacing the failure.

## Resilience Profiles

Resilience profiles should define retry and fallback behavior separately from model selection and tool presets.

## Semantic Retry Boundaries

Semantic failures require review, rework, or escalation. They should not be hidden by automatic provider fallback.

## Council Derivation

Council behavior derives from model and role configuration so different councillor seats can provide independent analysis when escalation is needed.

## Councillor Seats

Councillor seats are internal council participants. They should not ask the user questions or write files; they provide independent read-only analysis for synthesis.

## Council Synthesis Readiness

Council synthesis is appropriate when the user explicitly asks, risk is high, or reviewer loops suggest that a broader architectural decision is needed.

## Spec Coverage

- Spec 06: model presets, fallback routing, resilience profiles, and council derivation.
```

## Task 10: Create Migration And Release Deep Dive

**Files:**
- Create: `docs/migration-and-release.md`

- [ ] **Step 1: Create `docs/migration-and-release.md`**

Use sections covering these exact points:

```markdown
# Migration And Release

## V1 And omo-slim Detection

Doctor detects existing v1/omo-slim configuration and reports replacement guidance without mutating it.

## Replacement Rule

TGO v2 replaces v1 rather than running side by side. The migration path should preserve user-owned config and use backups before writes.

## Rollback And Uninstall

Rollback relies on manifest-linked backups. Uninstall removes only TGO-managed entries and does not uninstall shared CLIs.

## Root Cutover

The active package lives at the repository root. Archived v1 material is retained as reference material, not active install guidance.

## npm Beta State

- `2.0.0-beta.2` is the current public beta package.
- `trans-genderian-orchestra@beta` is the recommended selector.
- npm `latest` still points to `2.0.0-beta.0` until stable release.

## Release Gates

Release-readiness validation should include tests, typecheck, lint/check, build/pack verification, migration docs, and explicit approval before publish or tag movement.

## Public Beta Smoke

The reusable public beta smoke command is:

```bash
bun run verify:public-beta-opencode
```

It verifies the published beta through OpenCode in a disposable environment and should be run only when external access is acceptable.

## Remaining Manual Gate

Before applying setup to a real profile, restart a real OpenCode session and run:

```text
/tgo:doctor --json
```

## Spec Coverage

- Spec 00: root package architecture and replacement goals.
- Spec 07: implementation phases, validation gates, root cutover, beta release, and manual OpenCode gate.
```

## Task 11: Check Operational Docs For Conflicts

**Files:**
- Review: `MIGRATION.md`
- Review: `RELEASE.md`

- [ ] **Step 1: Search for stale package path guidance**

Run:

```bash
rg -n "trans-genderian-orchestra-v2/|npm install ./trans-genderian-orchestra-v2|stable release|this subfolder|Active beta package" MIGRATION.md RELEASE.md
```

Expected: no output.

- [ ] **Step 2: If stale wording appears, update only the conflicting sentence**

Expected edit rule: keep `MIGRATION.md` and `RELEASE.md` short operational documents. Do not turn them into narrative docs.

## Task 12: Run Focused Documentation Validation

**Files:**
- Validate: docs and tests from prior tasks.

- [ ] **Step 1: Run focused release documentation tests**

Run:

```bash
bun test src/release/docs.test.ts src/release/release-readiness.test.ts src/release/repository-layout.test.ts
```

Expected: PASS.

- [ ] **Step 2: If the stale-guidance test fails on the phrase `stable release` inside the README/latest caveat, rewrite the docs to say `non-prerelease version` instead of `stable release`**

Run the focused tests again afterward.

Expected: PASS.

- [ ] **Step 3: Update Beads with focused validation result**

Run:

```bash
bd update <issue-id> --notes "Focused docs validation passed: bun test src/release/docs.test.ts src/release/release-readiness.test.ts src/release/repository-layout.test.ts."
```

Expected: Beads accepts the note.

## Task 13: Run Full Local Validation

**Files:**
- Validate: whole TypeScript/docs package.

- [ ] **Step 1: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 2: Run Biome CI check**

Run:

```bash
bun run check:ci
```

Expected: PASS with no formatting/lint failures.

- [ ] **Step 3: Run release-readiness verifier**

Run:

```bash
bun run verify:release-readiness
```

Expected: PASS.

- [ ] **Step 4: Record validation in Beads**

Run:

```bash
bd update <issue-id> --notes "Full local docs validation passed: bun run typecheck; bun run check:ci; bun run verify:release-readiness. Did not run verify:public-beta-opencode because it depends on external OpenCode/network/model access."
```

Expected: Beads accepts the note.

## Task 14: Finish The Beads Issue

**Files:**
- No project file edits.

- [ ] **Step 1: Close the Beads issue**

Run:

```bash
bd close <issue-id> --reason "Implemented and validated TGO v2 public documentation refresh."
```

Expected: issue closes successfully.

- [ ] **Step 2: Report changed files and validation**

Final response should list:

- Changed docs/test files.
- Focused validation command result.
- Full validation command result.
- Whether `verify:public-beta-opencode` was skipped and why.

## Self-Review Checklist For Implementer

- README mentions `2.0.0-beta.2`, `trans-genderian-orchestra@beta`, `opencode plugin trans-genderian-orchestra@beta --global --force`, `/tgo:doctor --json`, `verify:public-beta-opencode`, and the `latest` caveat.
- README links every deep-dive doc.
- Docs hub links every deep-dive doc plus `MIGRATION.md` and `RELEASE.md`.
- Public docs do not contain active install guidance for `trans-genderian-orchestra-v2/`.
- Feature docs include `Spec 00` through `Spec 07` coverage lines.
- Docs distinguish implemented deterministic primitives from planned/live orchestrator maturity where relevant.
- No runtime TypeScript behavior changed.
