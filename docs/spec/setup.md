# TGO Spec — Per-repo Setup

Status: **spec** (buildable). Source decision: `docs/wayfinder/decisions.md` (tgo-a6r.11). Related ADRs: `docs/adr/0007-setup.md`.

## 1. Decision: Option A — auto-trigger at first session

No first message needed: it's a **session-start plugin hook**, exactly like `bd prime` (verified: bd prime auto-runs at session start and provably auto-initialized this repo — `.beads/`, AGENTS.md block, git init). Precedent is real and proven in this exact stack.

**Why not B (detect-and-pause):** the agent can't message the user before the user's first message; and in a task-laden first message, a setup question is the first thing the flow drops — the "forgotten/skipped" failure the user feared.

## 2. Why A is safe — default-complete setup

TGO's setup needs **ZERO user input** to finish. Every question the Pocock setup asked has a TGO-native default:

- tracker → beads (TGO's default),
- labels → default triage labels,
- monorepo → auto-detected (single-context default).

Personal choices are **deferred, not required** — a non-blocking "customize?" nudge or the reflect loop covers them. Setup completes with defaults regardless.

## 3. Guardrails

- **No-clobber:** merge existing AGENTS.md/user content minimally, never overwrite (same as `bd prime`).
- **Idempotent + per-repo marker:** never re-runs.
- Applies to BOTH the Pocock-style setup and the beads setup.

## 4. Deliverables of setup

- `.beads/` initialized (tracker engine installed/verified; auto-installed if missing).
- TGO's global `AGENTS.md` fragment merged (thin always-on advice layer — see `docs/spec/roster.md` §3) + the **official `bd setup opencode` managed Beads block** (guidance only; decided 2026-08-05) — no-clobber merge of existing content.
- Per-repo beads wiring in place (work-unit store for the job board).
