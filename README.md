# trans-genderian-orchestra v3

> TGO v3 is an OpenCode workflow plugin that turns ad-hoc AI coding sessions into a review-oriented engineering workflow.

`trans-genderian-orchestra` lives at the repository root. The current repository package version is `3.0.0-beta.1`.

## What It Is

TGO v3 routes work through specialist agents, deterministic setup commands, structured handoffs, and reviewer gates. The goal is to make OpenCode behave less like one improvising assistant and more like a small engineering team with a conductor, scribe, composer, principal reviewer, ensemble panel, and councillor seats.

This beta is usable for setup validation and documentation-led testing, but it is still a public beta. Prefer local repository commands until the npm `beta` dist-tag is verified to match the repository package version.

## Philosophy

- Conductor-led orchestration: the conductor owns phase control, routing, confirmation, delegation, and synthesis instead of silently implementing arbitrary changes.
- Specialist lanes: scribe, composer, principal, ensemble, and councillor roles have separate responsibilities and permission expectations.
- Approval gates: behavior-changing work should pass through scoped implementation, ensemble review, and principal verification.
- Retrieval-led reasoning: agents should inspect project files, docs, history, and external references before relying on memory.
- SDD-style artifacts: specs, plans, evidence, reviews, handoffs, and state files preserve intent across compaction and handoff.
- Deterministic config: setup, bootstrap, doctor, and uninstall flows are previewable, manifest-backed, backup-aware, and reversible.
- Automation before manual testing: release-readiness checks and public beta smoke scripts run before relying on a real OpenCode UI session.

## Quick Start

For local validation, install dependencies and build from the repository root:

```bash
bun install
bun run build
```

To install a published beta into OpenCode, first verify the npm `beta` dist-tag matches the intended release, then use:

```bash
opencode plugin trans-genderian-orchestra@beta --global --force
```

Restart OpenCode after plugin installation. OpenCode does not hot-reload config-time plugin changes reliably enough for this beta validation flow.

Run doctor before applying setup or bootstrap changes:

```text
/tgo:doctor --json
```

The published slash command should resolve the CLI through:

```bash
npx --yes trans-genderian-orchestra@beta doctor --json
```

It intentionally does not run `bd doctor`; Beads diagnostics are separate from TGO doctor output.

## Bootstrap Preview

Preview or apply setup with the implemented installer:

```bash
trans-genderian-orchestra install --dry-run --preset=github-copilot
```

The setup path plans required OpenCode entries and model preset choices while preserving user-owned config. It keeps `~/.config/opencode/opencode.jsonc` minimal for plugin/default-agent/MCP entries and writes TGO-owned agent/model catalog data to `~/.config/opencode/trans-genderian-orchestra.jsonc`.

## Beta Status

- Repository package version: `3.0.0-beta.1`.
- Published-beta selector after dist-tag verification: `trans-genderian-orchestra@beta`.
- The package lives at the repository root.
- V3 replaces the previous TGO v2 role model with conductor, scribe, composer, principal, ensemble, and councillor roles.
- Release hardening: deterministic prior-version/omo-slim detection, rollback helpers, safe uninstall, doctor warnings, release gates, and migration documentation.
- Remaining manual gate: restart a real OpenCode session and run `/tgo:doctor --json` interactively before applying real profile setup.

## Feature Map

- Agent roster and permissions: conductor, scribe, composer, principal, ensemble, and councillor roles with path/permission boundaries.
- Command surface: `/tgo:doctor`, `/tgo:setup`, `/tgo:init`, `/tgo:uninstall`, `/tgo:work`, `/tgo:models`, plus compatibility aliases where implemented.
- Setup lifecycle: deterministic bootstrap, setup preview, doctor inspection, manifest-backed changes, backups, rollback helpers, and safe uninstall.
- Migration lifecycle: prior TGO/omo-slim detection, replacement planning, root package release gates, and explicit publish/tag approval boundaries.
- Tooling: `bare-bones`, `default`, and `all-bells` tool presets; skills and MCP planning; user-managed provider/plugin/MCP preservation.
- Model and resilience planning: generated `github-copilot` and `opencode-go` primary presets, with `github-copilot` active by default; model-switch planning; provider fallback classification; circuit breaker state; semantic retry boundaries; and ensemble/councillor derivation.
- Workflow primitives: delegation envelope, specialist result contract, ensemble review, principal gate, scheduler/worktree planning, and integration/reconciliation primitives.
- Validation harnesses: release-readiness verifier, targeted tests, type checking, and build checks.

## Documentation

- [Architecture](./docs/architecture.md)
- [Agents And Workflows](./docs/agents-and-workflows.md)
- [Setup, Doctor, And Manifests](./docs/setup-doctor-manifests.md)
- [Tools, Skills, And MCPs](./docs/tools-skills-mcps.md)
- [Models, Resilience, And Ensemble](./docs/models-resilience-ensemble.md)
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

Targeted sanity validation:

```bash
bun test src/index.test.ts src/cli/providers.test.ts src/cli/config-io.test.ts
```

Local release-readiness validation:

```bash
bun run typecheck
bun run check:ci
bun run build
bun run verify:release-readiness
```
