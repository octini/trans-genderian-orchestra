# trans-genderian-orchestra Agent Guide

This repository contains the `trans-genderian-orchestra` OpenCode workflow plugin. TGO v2 coordinates specialist agents, deterministic setup commands, model presets, manifests, and reviewer/council verification gates from the repository root.

## Current Agent Roles

### Orchestrator
- User-facing technical lead, phase controller, workflow router, and artifact owner.
- Preserves user intent, decides when to ask for missing decisions, and routes implementation work to specialists.
- Does not silently perform arbitrary implementation work; behavior-changing work should be scoped, delegated, validated, and reviewed.

### Researcher
- Performs codebase exploration, documentation research, source comparison, and uncertainty reporting.
- Reports relevant files, patterns, external references, options, and risks.
- Stays evidence-first and read-oriented unless a specific workflow grants a narrow artifact-writing scope.

### Builder
- Designs and implements approved scoped changes.
- Updates tests, docs, and validation artifacts for bounded implementation tasks.
- Has broad implementation permissions but must respect task scope, user-owned config, and path-gating rules.

### Reviewer
- Gatekeeper in Verification Mode: checks specialist output against the user request, plan, acceptance criteria, tests, and regression risk.
- Advisor in Advisory Mode: resolves ambiguous architecture, security, and plan-intent conflicts.
- Read-only by default; any trivial fix still requires explicit scope and automated verification.

### Council
- Escalation-only synthesis workflow for high-risk or disputed decisions.
- Triggered by explicit user request, critical-risk decisions, or repeated reviewer rejection loops.
- Synthesizes councillor findings into a final recommendation.

### Councillor
- Internal council participant spawned by the council workflow.
- Provides one independent read-only analysis perspective and does not ask the user questions or write files.

## Current Implementation State

- The active package lives at the repository root and is published on the npm `beta` dist-tag.
- Runtime plugin hooks inject TGO agents and commands into OpenCode config at startup.
- Bootstrap keeps required OpenCode entries minimal in `~/.config/opencode/opencode.jsonc` and writes TGO-owned agent/model catalog data to `~/.config/opencode/trans-genderian-orchestra.jsonc`.
- Doctor reads manifests, `opencode.jsonc`, and the TGO catalog file so setup checks match bootstrap output.
- Built-in model presets are `balanced`, `mixed`, `copilot`, `go`, and `free`; `balanced` is a compatibility alias for `mixed`.
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

## Context Files

- `PROJECT_STATE.md`: historical project status and implementation notes.
- `CONTEXT.md`: current TGO v2 domain glossary.
- `docs/README.md`: public documentation hub.
- `docs/superpowers/specs/`: approved design specs.
- `docs/superpowers/plans/`: implementation plans.
- `templates/AGENTS.md`: project-local AGENTS.md seed used by TGO init flows.

## Project-Specific Rules

- Keep context files current after meaningful architecture, workflow, model, config, or implementation-state changes.
- Preserve reviewer verification as a required gate for behavior-changing work.
- Preserve user-owned OpenCode config, providers, plugins, MCPs, skills, and local tools unless the user explicitly adopts or changes them.
- Exclude generated/system noise such as `.DS_Store`, `node_modules/`, `dist/`, and transient build caches from commits.
