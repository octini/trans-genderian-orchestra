# trans-genderian-orchestra v2

> TGO v2 is an OpenCode dispatcher plugin that turns ad-hoc AI coding sessions into a review-oriented engineering workflow.

`trans-genderian-orchestra` currently lives at the repository root and is published as `2.0.0-beta.6` on the npm `beta` dist-tag.

## What It Is

TGO v2 routes work through specialist agents, deterministic setup commands, durable context artifacts, and reviewer gates. The goal is to make OpenCode behave less like one improvising assistant and more like a small engineering team with a technical lead, researcher, builder, reviewer, and escalation council.

This beta is usable for setup validation and documentation-led testing, but it is still a public beta. Prefer explicit beta commands until a non-prerelease version moves npm `latest` away from the original `2.0.0-beta.0` publish.

## Philosophy

- Technical-lead orchestration: the orchestrator owns phase control, routing, confirmation, delegation, and synthesis instead of silently implementing arbitrary changes.
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

The bootstrap path plans required OpenCode entries, tools, model presets, and resilience settings while preserving user-owned config. It keeps `~/.config/opencode/opencode.jsonc` minimal for plugin/default-agent/MCP entries and writes TGO-owned agent/model catalog data to `~/.config/opencode/trans-genderian-orchestra.jsonc`.

## Beta Status

- Package version: `2.0.0-beta.6`.
- npm `beta` dist-tag: `2.0.0-beta.6`.
- npm `latest` dist-tag: still points at `2.0.0-beta.0`.
- Recommended install selector: `trans-genderian-orchestra@beta`.
- Phase 7 release hardening: deterministic v1/omo-slim detection, rollback helpers, safe uninstall, doctor warnings, release gates, and migration documentation.
- Remaining manual gate: restart a real OpenCode session and run `/tgo:doctor --json` interactively before applying real profile setup.

## Feature Map

- Agent roster and permissions: orchestrator, researcher, builder, reviewer, council, and councillor roles with path/permission boundaries.
- Command surface: `/tgo:doctor`, `/tgo:setup`, `/tgo:init`, `/tgo:uninstall`, `/tgo:work`, `/tgo:models`, plus compatibility aliases where implemented.
- Setup lifecycle: deterministic bootstrap, setup preview, doctor inspection, manifest-backed changes, backups, rollback helpers, and safe uninstall.
- Migration lifecycle: v1/omo-slim detection, replacement planning, root package cutover, beta release gates, and explicit latest-tag caveat.
- Tooling: `bare-bones`, `default`, and `all-bells` tool presets; skills and MCP planning; user-managed provider/plugin/MCP preservation.
- Model and resilience planning: `balanced` compatibility alias, `mixed`, `copilot`, `go`, and `free` model presets; model-switch planning; provider fallback classification; circuit breaker state; semantic retry boundaries; and council derivation.
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
- Generated TGO agent/model catalog data lives in `~/.config/opencode/trans-genderian-orchestra.jsonc`; OpenCode still needs minimal load-bearing entries in `opencode.jsonc` because it has no config include field.
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
