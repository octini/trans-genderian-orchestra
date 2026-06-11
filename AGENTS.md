# trans-genderian-orchestra Contributor and Agent Guide

This repository contains the public `trans-genderian-orchestra` OpenCode workflow plugin. TGO coordinates specialist agents, setup/doctor CLI commands, model presets, bundled skills, integrations, and Ensemble/Principal verification gates from the repository root.

## Current Agent Roles

### Conductor

- User-facing technical lead, phase controller, workflow router, and result synthesizer.
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
- Produces structured findings for Conductor synthesis and Principal review.

### Councillor

- Hidden internal Ensemble participant spawned by the Ensemble workflow.
- Provides one independent read-only analysis perspective and does not ask the user questions or write files.

## Implementation State

- The active package lives at the repository root and currently reports version `3.0.0-beta.1`.
- Runtime plugin hooks inject TGO agents, tools, MCPs, and commands into OpenCode config at startup.
- The installer keeps required OpenCode edits small and writes TGO plugin config to `~/.config/opencode/trans-genderian-orchestra.json` by default, or an existing `.jsonc` path when one is already present.
- Doctor is read-only and checks user/project TGO config files for JSON/JSONC parse errors, schema validity, and active preset existence.
- Generated default config writes exactly two primary presets, `github-copilot` and `opencode-go`, with `github-copilot` active by default.
- Current CLI commands are `install` and `doctor`; current slash commands are `/preset`, `/interview`, and `/deepwork`.
- CI and release-readiness commands run from the repository root.

## Commands

| Command | Description |
|---|---|
| `bun run build` | Build TypeScript to `dist/`. |
| `bun run typecheck` | Run TypeScript type checking without emitting. |
| `bun test` | Run all tests with Bun. |
| `bun run lint` | Run Biome linter. |
| `bun run format` | Format with Biome. |
| `bun run check:ci` | Run Biome check without auto-fix. |
| `bun run verify:release-readiness` | Run deterministic release-readiness checks. |

## Repository Files

- `README.md`: public project overview and quick start.
- `docs/README.md`: public documentation hub.
- `docs/installation-and-cli.md`: install, doctor, backups, restart expectations.
- `docs/configuration-reference.md`: config files, schema keys, presets, prompt overrides.
- `docs/provider-configurations.md`: provider/model setup guidance.
- `docs/agents-and-workflows.md`: current role roster and review-loop workflow.
- `docs/model-presets-and-ensemble.md`: generated model mappings and Ensemble behavior.
- `docs/architecture.md`: runtime hooks, ownership model, and workflow architecture.
- `docs/skills-and-integrations.md`: bundled skills, tools, MCPs, and safety boundaries.
- `MIGRATION.md` and `RELEASE.md`: migration and release-readiness guidance.
- `src/`: plugin, CLI, hooks, tools, skills, and tests.

## Contributor and Agent Rules

- Update public docs after meaningful user-facing workflow, model, config, or release-process changes.
- Preserve Ensemble and Principal verification as required gates for behavior-changing work.
- Preserve user-owned OpenCode config, providers, plugins, MCPs, skills, and local tools unless the user explicitly adopts or changes them.
- Do not document non-existent commands. Verify CLI and slash command surfaces from source before adding examples.
- Public product naming should be TGO or `trans-genderian-orchestra`; use version labels only in operational contexts such as package version, migration, release, or existing-user comparison.
- Exclude generated/system/local-coordination noise such as `.DS_Store`, `node_modules/`, `dist/`, `.beads/`, `.opencode/`, `.slim/`, and transient build caches from commits.
- Run relevant tests, type checks, release-readiness checks, docs sanity scans, and `git diff --check` from the repository root before reporting completion.
