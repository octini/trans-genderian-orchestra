# ADR 0006 — Beads-native single-writer: Background Job Board is a renderer over beads

- **Status:** accepted
- **Date:** 2026-08-04
- **Source:** wayfinder decision tgo-a6r.18; `docs/spec/beads-integration.md`

## Context

The Background Job Board could be a parallel store (drift risk) or derived from the tracker. And beads' workflow only works if writes are single-actor. The user asked for beads integrated natively, not merely "used."

## Decision

- **One store, no drift:** the Job Board becomes a **renderer over beads** + a thin live-state shim (streaming tasks). Board = beads-derived snapshot each turn; durable record at phase boundaries.
- **Single-writer intent:** Bernstein is the ONLY intended beads operator in the future architecture. The plugin currently validates lifecycle metadata only; issue creation, claim, closure, reopening, authorization, and recovery are not runtime capabilities. Specialists have ZERO beads surface. Live enforcement is planned follow-up work.
- Wiring lives in TGO's own opencode-beads replacement; `bd` CLI stays the engine dependency, auto-installed.

## Consequences

- No parallel-state drift; beads is the source of truth.
- Work-unit status is machine-readable (bmad-build-auto pattern) and reconciled, not trusted from chat.
- Single-writer enforces the doer/judger split at the tracker level too.

## Follow-up — failed-gate recovery (2026-08-19, tgo-mvw probes)

Reopen/recovery remain disabled/unproven per new disposable probes: `closed`→`bd reopen` works (exit 0 → `open`, `closed_at` cleared) but plugin never calls it; `open`→`reopen` is no-op `is already open` (exit 0); `in_progress`→`reopen` demotes to `open` (exit 0) but is NOT valid failed-gate recovery — actionable is keep `in_progress` open and satisfy missing; `missing`/`bogus`→`bd reopen` exits 1 error resolving; `bd create --deps discovered-from` generically exit 0 but `allowed:false` disabled. Failed-gate recovery is metadata-only (`closureGate` `canClose:false`, `recovery` from `report.recovery`); plugin does not close/reopen/recover. Source of truth is `docs/spec/beads-integration.md` § Failed-gate recovery.
