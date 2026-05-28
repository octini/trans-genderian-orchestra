# OMO-Slim Modifications Agent Guide

This repository is the Dispatcher plugin fork of `oh-my-opencode-slim`. It turns the original orchestrator into a pure dispatcher with specialist agents, approval-aware planning, shared context files, and reviewer/council verification gates.

## Current Agent Roles

### Orchestrator
- Pure dispatcher and read-only router.
- Delegates every task to the appropriate specialist and synthesizes results.
- Does not plan, implement, or write project files except allowed coordination metadata (`state.md` and `handoff.md`).

### Planner
- Decomposes complex requests into structured plans/specs.
- Writes `.opencode/plans/` artifacts when planning is required.
- Captures acceptance criteria, approval gates, risks, and implementation sequencing.

### Researcher
- Performs codebase exploration and documentation research.
- Reports relevant files, patterns, external references, and implementation options.
- May write observational notes/scratchpad context when allowed; otherwise stays read-only.

### Builder
- Designs and implements approved changes.
- Updates tests and validation artifacts for bounded implementation tasks.
- Has broad implementation permissions but must respect task scope and path-gating rules.

### Reviewer
- Gatekeeper in Verification Mode: checks specialist output against the original request and acceptance criteria.
- Advisor in Advisory Mode: resolves ambiguous architecture, security, and plan-intent conflicts.
- Read-only by default; trivial fixes require explicit permission and automated verification.

### Council
- Escalation-only consensus workflow for high-risk or disputed decisions.
- Triggered by explicit user request, critical-risk plans, or repeated reviewer rejection loops.
- Read-only; synthesizes councillor findings into a final recommendation.

### Councillor
- Internal council participant spawned by the council workflow.
- Provides independent analysis for consensus; does not ask the user questions or write files.

## Current Implementation State

- Startup init is implemented: environment audit, `/init`, `/beads:init`, `/setup-skills`, and AGENTS.md seeding.
- Path gating is implemented: per-agent write/edit constraints with config-level override support.
- Critical fixes are applied: orchestrator can delegate via `task`, config/permissions deep-merge correctly, default model fallback chains are configured, and the orchestrator prompt is tightened around pure delegation.
- Last recorded validation state: 1008 tests passing and build clean.

## Commands

Run from `dispatcher-plugin/` unless noted otherwise:

| Command | Description |
|---------|-------------|
| `bun run build` | Build TypeScript to `dist/` |
| `bun run typecheck` | Run TypeScript type checking without emitting |
| `bun test` | Run all tests with Bun |
| `bun run lint` | Run Biome linter |
| `bun run format` | Format with Biome |
| `bun run check:ci` | Run Biome check without auto-fix |

## Context Files

- `PROJECT_STATE.md`: high-level project status, decisions, implementation checklist, and next steps.
- `.opencode/implementation-spec.md`: critical-fix implementation tracker.
- `CONTEXT.md`: domain glossary for Dispatcher concepts.
- `dispatcher-plugin/templates/AGENTS.md`: project-local AGENTS.md seed used by Dispatcher `/init`.

## Project-Specific Rules

- Keep the orchestrator pure: no implementation, planning, or arbitrary writes.
- Preserve reviewer verification as a required gate for delegated work.
- Keep context files current after meaningful architecture, workflow, or implementation-state changes.
- Exclude generated/system noise such as `.DS_Store`, `node_modules/`, and transient build caches from commits.
