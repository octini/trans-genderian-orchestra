# ADR 0004 — Bundling split: depend on engines (AFT, magic-context), wrap beads, bundle small

- **Status:** accepted
- **Date:** 2026-08-04
- **Source:** wayfinder decision tgo-a6r.16; `docs/spec/mcp-permissions.md`

## Context

Which plugins does TGO ship, depend on, or adapt? Full adaptation means TGO maintains a fast-moving engine — a tax the user explicitly rejects. But beads' value is its opencode-side integration, which is exactly the layer TGO wants to own.

## Decision

- **AFT + magic-context = FULL dependencies** — their value IS the engine (tree-sitter symbol tooling; historian/dreamer/recall pipeline). Native feel via the permission graph (`aft_*`/`ctx_*` grantable per seat), not re-wrapping.
- **beads = TGO writes its own opencode-side wrapper** over the `bd` engine (context injection + `bd` calls); the CLI + Dolt DB stays a dependency.
- **bundle small, depend on large** is the general rule.
- Installer **auto-installs missing dependencies** (beads, AFT, magic-context, context7).

## Consequences

- TGO ships a tiny code core; heavy machinery stays upstream and auto-updates.
- Revisit only if a magic-context feature becomes load-bearing — then a thin interface, not a re-wrap.
