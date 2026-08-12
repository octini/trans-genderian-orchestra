# ADR 0002 — Roster: one primary + named background-capable specialists, single writer

- **Status:** accepted
- **Date:** 2026-08-04
- **Source:** wayfinder decisions tgo-a6r.8, tgo-a6r.13, tgo-a6r.15; `docs/spec/roster.md`

## Context

How many seats, and who may write? Research and grilling converged on a single-writer, doer/judger-split model: one orchestrator who never does, one writer who is the only writer, reviewers/lookups that are read-only. Named specialists give the orchestrator stable, grantable targets; per-role model routing keeps cost down.

## Decision

**Bernstein** (primary orchestrator; scheduler-not-worker; never edits/greps/globs) · **Horowitz** (review + strategic advisor; read-only investigate bash) · **Nas** (read-only lookup: recon + research + docs; no file writes) · **Dylan** (sole writer: code + tech docs + prose) · **Nirvana** (tool-less band). Role-anchored prompts (names = naming/UX devices, never personas). 4-block prompt anatomy, <600 tokens (body only), build-time validated.

## Consequences

- Exactly one writer ⇒ no lane collisions on files.
- The orchestrator cannot drift into doing — enforced by permissions, not advice.
- Nas on a cheap model keeps lookup cheap; Dylan on a writing-capable model.
- All seats speak the same house style; only Dylan toggles the register dial.
