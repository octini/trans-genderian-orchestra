# TGO Spec — Per-repo Setup

Status: **spec** (buildable). Source decision: `docs/wayfinder/decisions.md` (tgo-a6r.11). Related ADRs: `docs/adr/0007-setup.md`.

Human page: `docs/SETUP.md`.

## 1. Decision: Option A — auto-trigger on first prose, with a forgiving fallback

Setting up a new repo shouldn’t ask you to remember a slash command. TGO treats the **first real sentence you say** in a primary session as the trigger — the same posture as `bd prime`’s auto-initialization, but spoken through chat rather than a slash.

There are two ways that first prose can land, and TGO listens for both:

- **Primary: `session.created`.** The plugin’s `handleSessionCreated` (`plugin/src/plugin.ts:168`) fires when a brand-new session is created. It returns early when `info.parentID != null` — the loose `!= null` is deliberate, catching both `null` and the `undefined` some hosts leave when they don’t set the field. It resolves the target directory as `info.directory ?? directory` (the event’s directory or the plugin’s worktree), bails cleanly on `"/"` so a global session never tries to `bd init` your home, and then calls `SetupController.maybeSetup`.

- **Fallback: `chat.message`.** If `session.created` was missed or arrived too early, `chat.message` at `plugin/src/plugin.ts:287` covers the same ground on the next user message. It re-checks primary-ness via `client.session.get` — again with `parentID == null` as the test — and only runs when the session is primary. The fallback also honors the `/` guard (`directory && directory !== "/"`). A bare `/` slash that the host interpolates as `"/"` therefore never triggers an init; ordinary prose does.

Either path lands in the same controller, and either is enough. A brand-new folder created by `mkdir`, by Finder’s “New Folder,” or by reusing a cleaned-out directory works the same — any empty directory that becomes your worktree qualifies, and the first sentence inside it (“build me a dice roller…”, “hello, set up this repo”) does the rest.

**Why not B (detect-and-pause):** the agent can’t message you before you’ve said anything; and in a prompt that’s already full of intent, a “should I set up?” question is the first thing the flow quietly drops — the exact “forgotten/skipped” failure the design was trying to avoid.

## 2. Why A is safe — default-complete setup

TGO’s setup needs **zero user input** to finish. Every question a manual wizard would ask already has a TGO-native default:

- tracker → beads (TGO’s default),
- labels → default triage labels,
- monorepo → auto-detected (single-context default).

Personal choices are **deferred, not required** — a non-blocking “customize?” nudge or the reflect loop covers them later. Setup completes with defaults regardless, and the whole thing runs **concurrent with that first LLM turn**, not at `opencode` launch. You see Bernstein start to think; beads and `AGENTS.md` appear alongside it.

## 3. Guardrails — generous on the trigger, careful on the writes

- **No-clobber:** merge existing `AGENTS.md` content minimally, never overwrite (same as `bd prime`).
- **Idempotent + per-repo dedupe:** `SetupController` in `plugin/src/setup.ts` keeps an in-memory `attempted` set, written at the *top* of `maybeSetup` before any async work. Two near-simultaneous triggers — say, `session.created` and that first `chat.message` racing the LLM — can’t both run a second `bd init`. A later message to an already-attempted directory returns `already-set-up` immediately.
- **Granular “what’s missing?”** `needsSetup` doesn’t use a single “inited” flag. It checks three independent signals: `.beads/` presence (skips `bd init` when it’s there), the `BEGIN BEADS INTEGRATION` block in `AGENTS.md` (skips `bd setup opencode` when present), and the TGO `AGENTS` fragment markers `<!-- TGO: thin always-on advice layer` / `<!-- END TGO advice layer` (skips the `AGENTS fragment` merge when both are present). An empty folder gets all three steps; a folder that already has `.beads/` but lost a marker only gets what’s absent.
- **Zero user input + no survey.** The install never prompts for tracker, labels, or monorepo answers — those defer.

These guardrails do not authorize lifecycle writes. `bd init --directory` remains unsupported, `bd -C` still fails with `cannot use -C directory …: no beads project found` — setup uses `.cwd(directory)` from the target repository only.

## 4. Deliverables of setup

- TGO attempts `bd init` and `bd setup opencode` from the target repository when the host exposes the `bd` CLI (auto-installed when `config.setup.autoInstallBeads` is left on). Subprocess `{ exitCode, stdout, stderr }` is preserved; a nonzero result is reported as a `failed` setup rather than silently accepted. A missing CLI without an installer returns `no-bd`.
- The official `bd setup opencode` managed Beads block (guidance only; decided 2026-08-05) and TGO’s thin `AGENTS.md` advice layer are merged with the existing file — no-clobber, so user content stays intact. A repo with `.beads/` and both marker blocks is never re-touched.
- A host-supported `.beads/` store may be initialized. The plugin does not read issues or perform Beads create, claim, close, reopen, recovery, or authorization operations. `bd init --directory` is unsupported; `bd -C` fails — setup must use `.cwd(directory)`; host-mediated lifecycle validation remains future work until the OpenCode host boundary is proven. Board reads do not authorize lifecycle actions; the plugin remains metadata-only (`beadsLifecycle.allowed: false`).

## 5. What it looks like from the outside

You won’t see a spinner that says “setting up.” You’ll just notice the folder stops being empty:

```bash
mkdir ~/opencode/diceproject && cd ~/opencode/diceproject && opencode
# then in TGO:
# > build me a simple D&D dice roller CLI ...
```

After that first sentence, `.beads/` and `AGENTS.md` are there, the TUI sidebar at `order 450` refreshes within about 1.5 seconds (`POLL_MS 1500` in `plugin/src/sidebar/tui.tsx:20` via a `.beads` mtime signature — `plugin/src/sidebar/bd.ts` — not a subprocess per tick), and `bd list --all` in `plugin/src/sidebar/scope.ts:93` ensures even un-scoped `in_progress` work is visible right away without anyone running `/bd-refresh`. If you pinned an epic, `/bd-unfocus` clears it.
