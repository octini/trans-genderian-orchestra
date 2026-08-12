# ADR 0005 — Always-on enforcement: per-turn transform + folded prompts, register dial on Dylan only

- **Status:** accepted
- **Date:** 2026-08-04
- **Source:** wayfinder decisions tgo-a6r.14, tgo-a6r.15; `docs/spec/concision-enforcement.md`

## Context

A writing layer must be drift-proof across compactions. SessionStart-once injection degrades; a SubagentStart hook works in the open world but TGO owns a closed roster. Two styles ("parallel layers") create a "which wins" ambiguity; post-hoc editors rewrite finished text (rejected). Concision and anti-slop both must be covered.

## Decision

- **Mechanism:** `experimental.chat.system.transform` appends the level-filtered house style EVERY turn (drift-proof) + the style fragment is folded into all seat prompts at build time (no new hook; structurally guaranteed for the closed roster).
- **Style:** one amalgamated 3-axis ruleset (structure/prose/code, ~300-500 tokens), uniform. Scrub list (banned tells + humanizer taxonomy) always-on. **Register dial = 2 positions (concise/natural), class-gated, only Dylan's output toggles it**; other seats concise by default.
- **No post-hoc editor ever.** Draft→self-audit→final is an internal generation-time loop. Toggle hierarchy (amended 2026-08-05 to match `concision-enforcement.md` §4/§5): seat-default register → **Bernstein mandate** (optional Register field on the Five-part Spec, applied at the delegation boundary) → model self-classifies output class → user instruction overrides.

## Consequences

- Consistent voice across seats and across compactions.
- The dial replaces the two-parallel-layers ambiguity entirely.
- Anti-slop is a writing-time modifier, never a rewrite pass.
