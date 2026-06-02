---
artifact_type: design_spec
status: draft
spec_id: tgo-v2-00-umbrella-architecture
created_at: 2026-06-02
updated_at: 2026-06-02
source_checkpoint: designs/tgo-v2-settled-decisions.md
---

# TGO v2 Umbrella Architecture

## Purpose

`trans-genderian-orchestra` v2 is a full OpenCode engineering workflow plugin, not just a dispatcher. It should make OpenCode behave like a small disciplined engineering team: a technical lead, researcher, implementation engineer, reviewer, and escalation council operating through durable artifacts, Beads work tracking, and explicit verification gates.

The design optimizes for reliable engineering outcomes first and token efficiency second. The plugin should be proactive and capable, but every autonomous behavior must be bounded by user intent, approved artifacts, explicit state, and recoverable operations.

## Core Goals

- Preserve exact user intent across orchestrator-to-specialist handoffs.
- Enforce retrieval-led reasoning: retrieve/read first, reason second, rely on pretrained memory last.
- Use SDD-inspired phases without exploding the permanent agent roster.
- Keep setup deterministic, reversible, previewed, backed up, and secret-safe.
- Use Beads for actionable work tracking and TGO artifacts for reasoning, evidence, plans, handoffs, reviews, and decisions.
- Support conversation-triggered workflows so users do not need to memorize slash commands.
- Support guarded parallel implementation by default using worktrees, declared write scopes, Reviewer gates, and batch integration.
- Preserve user-owned OpenCode config, skills, plugins, MCPs, providers, and existing tools unless the user explicitly adopts or changes them.
- Replace the user's `oh-my-opencode-slim` workflow with an actively installed, globally useful TGO toolchain.

## Non-Goals

- TGO v2 is not a general-purpose package manager.
- TGO v2 does not silently remove or overwrite user-managed tools, skills, plugins, MCPs, providers, or config.
- TGO v2 does not start work from startup hooks, timers, compaction hooks, polling, or ready Beads issues without a conversation-triggered action.
- TGO v2 does not bypass Reviewer for behavior-changing work.
- TGO v2 does not store raw API keys, PATs, tokens, or passwords in manifests, generated config, Beads notes, artifacts, or doctor output.
- TGO v2 does not preserve v1 planner/orchestrator semantics solely for compatibility.
- TGO v2 does not treat Matt Pocock's `setup-matt-pocock-skills` as an executable script.
- TGO v2 does not push, open PRs, merge into the user's main branch, delete worktrees, or remove user tools without explicit approval.

## Agent Roster

The permanent roster is small:

- `tgo-orchestrator`: technical lead, architect, phase controller, scheduler, artifact owner, and user-facing coordinator.
- `tgo-researcher`: evidence retrieval, docs/source comparison, uncertainty reporting.
- `tgo-builder`: scoped implementation, tests, local validation, and rework.
- `tgo-reviewer`: required verification gate for behavior-changing work.
- `tgo-council`: escalation-only synthesis workflow.
- `tgo-councillor`: internal council participant prompt using the model behind a role seat.

The former separate Planner role is merged into Orchestrator. Orchestrator owns phase control and specs/plans, but not implementation edits. Researcher owns evidence. Builder owns code/test/doc implementation in scoped worktrees. Reviewer owns verdicts. Council resolves repeated failures, high-risk tradeoffs, and explicit user escalations.

## Core Workflow

TGO uses SDD-inspired phases as workflow states, not as permanent agents:

- Intake: classify request, preserve user intent, identify ambiguity.
- Retrieve: inspect code/docs/history/external sources before technical judgment.
- Propose: compare approaches and recommend one.
- Spec: capture approved intent, constraints, non-goals, and acceptance criteria.
- Design: define architecture, boundaries, artifacts, dependencies, and risks.
- Tasks: produce schedulable implementation metadata and Beads issues only after approval.
- Apply: Builder implements scoped work in worktrees.
- Verify: Reviewer verifies branch-level and batch-level outcomes.
- Archive: record decisions, reviews, Beads links, commits, and continuation state.

Not every request needs every phase. Trivial read-only answers can stay lightweight. Non-trivial behavioral changes require approved artifacts, scoped delegation, Builder implementation, Reviewer pass, and recorded validation.

## Artifact System

TGO artifacts live under `.opencode/tgo/` in project workspaces:

- `.opencode/tgo/specs/*.md`
- `.opencode/tgo/plans/*.md`
- `.opencode/tgo/evidence/*.md`
- `.opencode/tgo/reviews/*.md`
- `.opencode/tgo/handoffs/*.md`
- `.opencode/tgo/state.jsonc`
- `.opencode/tgo/manifest.jsonc`

Specs, plans, evidence, reviews, and handoffs are Markdown with YAML frontmatter. State and manifests are JSONC. Beads links to artifact paths rather than duplicating artifact bodies.

Artifacts are status-driven and append-safe. Draft specs/plans may be updated. Approved artifacts should not be materially rewritten; material changes create a new revision or mark the old artifact `superseded`. Reviewer and Council artifacts are audit evidence and are immutable after creation except metadata fixes.

## Preset Dimensions

TGO has three independent preset dimensions:

- Tooling presets: `bare-bones`, `default`, `all-bells`.
- Model presets: built-in and user-defined role lineups, with `modelPresets` canonical and legacy `presets` supported as an alias.
- Resilience presets: `conservative`, `balanced`, `aggressive`, plus advanced exact overrides.

Default bootstrap is equivalent to:

```bash
npx trans-genderian-orchestra@<version> bootstrap --tools default --models balanced --resilience balanced
```

Changing tools must not unexpectedly change models or resilience behavior. Changing models must not alter installed tools. Changing resilience must not alter tools or models.

## Namespacing

TGO-managed identifiers are strictly namespaced:

- Agents: `tgo-orchestrator`, `tgo-researcher`, `tgo-builder`, `tgo-reviewer`, `tgo-council`, `tgo-councillor`.
- MCPs: `tgo-websearch`, `tgo-grep-app`, optional `tgo-github`, optional `tgo-serena`.
- Commands: canonical `/tgo:*`, with small compatibility aliases such as `/init`, `/beads:init`, and `/preset`.
- Manifests: global `~/.config/opencode/tgo/manifest.jsonc`; project `.opencode/tgo/manifest.jsonc`.

Strict namespacing makes coexistence, doctor checks, uninstall, rollback, and v1 migration safer. User-facing docs can still call roles Orchestrator, Researcher, Builder, Reviewer, and Council.

## Global And Project Scope

TGO is global-first because the user expects most projects to share the same agent setup, presets, skills, peer plugins, and tool registrations.

Global by default:

- TGO plugin registration.
- TGO agents and commands.
- Tool/model/resilience preset state.
- TGO-managed skill paths and curated skill pack registrations.
- Peer plugin registrations such as `opencode-beads` and AFT.
- MCP registrations controlled by active tooling preset.
- Global manifest and backups.

Project-local by default:

- `.beads` issue database from `bd init`.
- Lean project `AGENTS.md`.
- `CONTEXT.md`.
- `docs/agents/*`, including Beads-aware issue-tracker docs and validation profile.
- `.opencode/tgo/*` artifacts, state, project manifest, and project backups.
- Project overrides for installed capabilities and resilience behavior.

## Release Boundary

V2 is a hard major-version boundary:

- Development starts in `trans-genderian-orchestra-v2/` as a blank-slate package skeleton.
- V1 remains untouched until v2 reaches parity or intentionally supersedes it.
- V2 targets final package identity `trans-genderian-orchestra` from day one.
- Prereleases use `2.0.0-beta.N` under npm dist-tag `next`.
- Stable `2.0.0` and `latest` wait until root cutover.
- At cutover, v2 package contents move to repository root so GitHub and npm use root `README.md`, `package.json`, `src/`, `docs/`, tests, and CLI entrypoints.
- V1 is preserved through git history and optionally `v1-final` or `v1-archive` tag/branch, not necessarily a final `legacy/` directory.

## Stable Release Gates

Stable `2.0.0` requires:

- Bootstrap dry-run, apply, backup, rollback, and uninstall tested.
- `/tgo:doctor` detects drift, missing tools, unsafe auth, v1 config, degraded capabilities, stale worktrees, and unresolved failures.
- `/tgo:init` creates Beads, lean `AGENTS.md`, `CONTEXT.md`, `docs/agents/*`, validation profile, and `.opencode/tgo/*` scaffolding correctly.
- Default preset works in a clean OpenCode config.
- Beta migration from v1 to v2 works and can restore v1.
- Orchestrator to Researcher to Builder to Reviewer flow passes integration tests.
- Parallel Builder wave, integration worktree, batch validation, and batch Reviewer pass are verified.
- Delegation envelopes preserve exact user intent and enforce scope.
- Beads issue creation only happens from approved plans.
- Secret handling is verified.
- README and `MIGRATION.md` are complete.
- V1 is tagged/archived before root cutover.

## Retained V1 Features

V2 should retain or evolve these v1 features:

- Delegation envelopes, made stricter and artifact-referenced.
- Exact user-intent preservation.
- Reviewer enforcement.
- Council workflow, derived from active role models by default.
- Path-gated permissions.
- Persistent context sharing, evolved into typed `.opencode/tgo/*` artifacts.
- Artifact-guided session reuse.
- Skill filtering and role-scoped skill availability.
- MCP registration and per-agent MCP permissions, governed by tool presets and ownership manifests.
- Safer command family.
- Split presets.
- Config merge behavior that preserves user-owned config.
- Context lifecycle.
- Startup/init intent, corrected into external bootstrap plus deterministic setup/init/doctor/uninstall commands.

## Explicit V1 Changes

- Planner is removed as a standalone permanent role.
- Orchestrator is no longer pure read-only, but still cannot write implementation files.
- `/init:all` is deprecated.
- `/beads:init` is corrected to real `bd init` behavior.
- Matt Pocock setup is installed/used as a prompt-driven skill, not run as an executable.
- Beads becomes the default issue tracker.
- Omo-slim coexistence is migration-aware but never auto-destructive.
- Explicit v1 council presets become an advanced override path, not the default council derivation.
- `modelPresets` becomes canonical; legacy `presets` remains an alias for model presets.
