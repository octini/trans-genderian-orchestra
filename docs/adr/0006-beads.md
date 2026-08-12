# ADR 0006 — Beads-native single-writer: Background Job Board is a renderer over beads

- **Status:** accepted
- **Date:** 2026-08-04
- **Source:** wayfinder decision tgo-a6r.18; `docs/spec/beads-integration.md`

## Context

The Background Job Board could be a parallel store (drift risk) or derived from the tracker. And beads' workflow only works if writes are single-actor. The user asked for beads integrated natively, not merely "used."

## Decision

- **One store, no drift:** the Job Board becomes a **renderer over beads** + a thin live-state shim (streaming tasks). Board = beads-derived snapshot each turn; durable record at phase boundaries.
- **Single-writer:** Bernstein is the ONLY beads operator. Creates the issue before delegating, assignment = claim, marks in_progress at dispatch, closes on verified completion, reopens on kick-back. Specialists have ZERO beads surface. Enforcement invariant: **Bernstein never delegates without first creating the backing issue.** Nirvana is ephemeral (no beads issues).
- Wiring lives in TGO's own opencode-beads replacement; `bd` CLI stays the engine dependency, auto-installed.

## Consequences

- No parallel-state drift; beads is the source of truth.
- Work-unit status is machine-readable (bmad-build-auto pattern) and reconciled, not trusted from chat.
- Single-writer enforces the doer/judger split at the tracker level too.
