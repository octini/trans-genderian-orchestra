# TGO Spec — Per-repo Setup

Status: **spec** (buildable). Source decision: `docs/wayfinder/decisions.md` (tgo-a6r.11). Related ADRs: `docs/adr/0007-setup.md`.

## 1. Decision: Option A — auto-trigger at first session

No first message needed: it's a **session-start plugin hook**. The `bd prime` comparison is host-dependent and evidence-limited: this repository has evidence of auto-initialization in one host run, not universal proof across hosts.

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

- TGO attempts `bd init` and `bd setup opencode` from the target repository when the host exposes the `bd` CLI. Setup preserves subprocess exit code, stdout, and stderr; a nonzero result is reported as failed setup.
- TGO's global `AGENTS.md` fragment is merged (thin always-on advice layer — see `docs/spec/roster.md` §3) with the **official `bd setup opencode` managed Beads block** (guidance only; decided 2026-08-05) — no-clobber merge of existing content.
- A host-supported `.beads/` store may be initialized. The plugin does not read issues or perform Beads create, claim, close, reopen, recovery, or authorization operations. bd init --directory is unsupported; bd -C fails with 'cannot use -C directory ...: no beads project found' — setup must use .cwd(directory); host-mediated lifecycle validation remains future work until OpenCode host boundary proven. Board reads do not authorize lifecycle actions; plugin remains metadata-only (beadsLifecycle.allowed:false).
