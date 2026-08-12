# ADR 0007 — Feature guardrails: opt-in autonomy, checkpoints, hard bounds

- **Status:** accepted
- **Date:** 2026-08-04
- **Source:** wayfinder decision tgo-a6r.9 + architectural-review amendments; `docs/spec/features.md`

## Context

Autonomy is the riskiest feature: unlimited loops burn tokens and make irreversible changes. The architectural review added concrete failure mitigations. The design must let the loop run long without ever running ungoverned.

## Decision

Five adopted features: **autonomous loop** (opt-in "deepwork", default OFF, hard bounds: max phases/token budget/checkpoint cadence), **checkpoint protocol** (pause list + structured `## CHECKPOINT REACHED` + resumable continuation), **reflect loop** (3 tiers: auto-file skills/`bd remember`; human-verify prompt/config; never runtime-applied hooks → beads issue), **worktree lanes** (git worktrees only for parallel implementation lanes), **presets** (prose-driven balanced/cheap/frontier).

Plus Bernstein-mandate additions: **living-spec mechanism**, **DAG + wave decomposition**, **boolean exit gates**, **stagnation detection** (3 identical actions → intervene), **adaptive re-planning levels** (light/medium/heavy on the escalation ladder).

## Consequences

- Autonomy exists but is bounded, checkpointed, and resumable.
- Every work unit has a deterministic success criterion before Bernstein closes it.
- The plugin never patches its own enforcement at runtime — hook/code changes ship as plugin updates.
