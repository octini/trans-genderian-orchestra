# ADR 0001 — Hybrid shape: config-first roster + thin plugin core

- **Status:** accepted
- **Date:** 2026-08-04
- **Source:** wayfinder decision tgo-a6r.8; `docs/spec/architecture.md`

## Context

An orchestration plugin can route via code (control-flow reimplementation), via prompts (delegation as instructed behavior), or a mix. The plan must be token-frugal (~15x token multiplier in multi-agent), must never reimplement what opencode's agent/subagent machinery already does, and must enforce lanes *by capability*, not by asking agents to comply.

## Decision

**Hybrid.** Roster, routing, and seat behavior live in config/prompts (agent `.md` files, permission graph, presets). A thin plugin core enforces lifecycle/state only, via exactly **four hooks**: Background Job Board injection, session reconciliation, task-fit rejection normalization, always-on concision transform. Everything else stays out of code.

## Consequences

- Routing stays visible and editable as text; models change in presets, not code.
- The plugin's failure surface is four hooks, not an orchestration engine.
- Enforcement is structural: the Orchestrator's frontmatter denies doing-tools outright.
- Tokens stay low because heavy state lives on disk and the board is injected as a trimmed snapshot.
