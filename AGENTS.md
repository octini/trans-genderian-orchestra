# trans-genderian-orchestra Contributor and Agent Guide

This repository contains the public `trans-genderian-orchestra` OpenCode workflow plugin. TGO coordinates specialist agents, deterministic setup commands, model presets, manifests, and ensemble/principal verification gates from the repository root.

## Current Agent Roles

### Conductor
- User-facing technical lead, phase controller, workflow router, and artifact owner.
- Preserves user intent, decides when to ask for missing decisions, and routes implementation work to specialists.
- Does not silently perform arbitrary implementation work; behavior-changing work should be scoped, delegated, validated, and reviewed.

### Scribe
- Performs codebase exploration, documentation research, source comparison, and uncertainty reporting.
- Reports relevant files, patterns, external references, options, and risks.
- Stays evidence-first and read-oriented unless a specific workflow grants a narrow artifact-writing scope.

### Composer
- Designs and implements approved scoped changes.
- Updates tests, docs, and validation artifacts for bounded implementation tasks.
- Has broad implementation permissions but must respect task scope, user-owned config, and path-gating rules.

### Principal
- Final strategic advisor and verification gate.
- Checks specialist output against the user request, plan, acceptance criteria, tests, and regression risk.
- Read-only by default; any trivial fix still requires explicit scope and automated verification.

### Ensemble
- Multi-model consensus engine and review panel for high-risk work, explicit user requests, or review-loop verification.
- Runs councillor seats with distinct review focuses and uses majority consensus with critical-issue override.
- Produces structured findings for conductor synthesis and principal review.

### Councillor
- Internal ensemble participant spawned by the ensemble workflow.
- Provides one independent read-only analysis perspective and does not ask the user questions or write files.

## Implementation State

- The active package lives at the repository root and currently reports version `3.0.0-beta.1`.
- Runtime plugin hooks inject TGO agents and commands into OpenCode config at startup.
- Bootstrap keeps required OpenCode entries minimal in `~/.config/opencode/opencode.jsonc` and writes TGO-owned agent/model catalog data to `~/.config/opencode/trans-genderian-orchestra.jsonc`.
- Doctor reads manifests, `opencode.jsonc`, and the TGO catalog file so setup checks match bootstrap output.
- Generated default config writes exactly two primary presets, `github-copilot` and `opencode-go`, with `github-copilot` active by default.
- CI commands run from the repository root.

## Commands

| Command | Description |
|---------|-------------|
| `bun run build` | Build TypeScript to `dist/` |
| `bun run typecheck` | Run TypeScript type checking without emitting |
| `bun test` | Run all tests with Bun |
| `bun run lint` | Run Biome linter |
| `bun run format` | Format with Biome |
| `bun run check:ci` | Run Biome check without auto-fix |
| `bun run verify:release-readiness` | Run deterministic release-readiness checks |

## Repository Files

- `README.md`: public project overview and quick start.
- `docs/README.md`: public documentation hub.
- `MIGRATION.md` and `RELEASE.md`: migration and release-readiness guidance.
- `src/`: plugin, CLI, hooks, tools, and tests.

## Contributor and Agent Rules

- Update public docs after meaningful user-facing workflow, model, config, or release-process changes.
- Preserve ensemble and principal verification as required gates for behavior-changing work.
- Preserve user-owned OpenCode config, providers, plugins, MCPs, skills, and local tools unless the user explicitly adopts or changes them.
- Exclude generated/system/local-coordination noise such as `.DS_Store`, `node_modules/`, `dist/`, `.beads/`, `.opencode/`, and transient build caches from commits.
- Run relevant tests, type checks, and release-readiness checks from the repository root before reporting completion.
