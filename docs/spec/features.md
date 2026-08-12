# TGO Spec — Feature Set

Status: **spec** (buildable). Source decision: `docs/wayfinder/decisions.md` (tgo-a6r.9) + architectural-review amendments (2026-08-04, in `docs/research/architectural-review.md` and `docs/spec/roster.md` §5). Related ADRs: `docs/adr/0006-features.md`.

## Adopted (5)

### 1. Autonomous loop ("deepwork"/"keep-going")

- **OPT-IN mode, default OFF.** "Autonomy is a mode, not the default."
- **Hard bounds:** max phases, token budget, mandatory checkpoint cadence.
- **Wake-on-event + heartbeat** (ruflo autopilot pattern); chains phases (gsd-autonomous).

### 2. Checkpoint protocol

Pause list — the loop stops and presents a structured `## CHECKPOINT REACHED` block on:
- irreversible/expensive actions;
- direction changes (plan invalidated by discovery);
- package/dependency legitimacy (gsd `gate="blocking-human"`);
- verification failures Bernstein can't resolve after the escalation ladder;
- user-flagged.

NOT default (routine work auto-approved). Resumable continuation (gsd pattern).

**Baseline posture (decided 2026-08-05):** routine work auto-approved; the checkpoint fires ONLY on the pause list above. Confirmed as the design baseline.

### 3. Reflect / self-improvement loop

Three application tiers:
1. **Auto-file** (no human): skills (advisory, never load-bearing) + `bd remember` + **old-ticket cleanup** (see below).
2. **Human-verify checkpoint:** seat-prompt + config changes (prompts ARE behavior; build-generated, versionable, reversible).
3. **NEVER runtime-applied:** hooks + plugin code → becomes a beads issue, implemented deliberately, shipped as plugin update. The plugin never patches its own enforcement at runtime.

**Beads old-ticket cleanup (auto-file tier):** beads DB hygiene is TGO's job — NOT Magic Context (a context/memory plugin; it won't touch the beads DB). Bernstein runs periodic `bd admin compact --analyze` (semantic summarization of closed issues; Tier 1 = 30+ days, ~70% size cut) and applies summaries via `bd admin compact --apply`. This is irreversible ("permanent graceful decay"; restorable from git via `bd restore`), so it sits under the **checkpoint protocol**: agent-driven, never silent. `bd admin cleanup --older-than N` (full deletes) and `bd compact` (Dolt commit squash + GC) are storage/lifecycle options. **Cadence (decided 2026-08-05, corrected 2026-08-06):** analyze per deepwork-session end + reflect pass (`bd admin compact --analyze`, checkpoint-gated since irreversible); `bd admin compact --dolt` monthly (Dolt GC — note the `--dolt` flag lives on `bd admin compact`, not the top-level `bd compact`).

**Embedded-mode caveat (found 2026-08-06, tgo-96f.12 review):** in beads' default **embedded mode** (this repo; `bd doctor`), only `bd admin compact --analyze` and `bd compact` run. `bd admin compact --apply`, `bd admin compact --dolt`, and `bd admin cleanup` error with "not yet supported in embedded mode" — they require **server mode** (`bd init --server`). The reflect cadence therefore degrades in embedded installs to analyze-only + top-level compact; the apply/GC steps are server-mode capabilities. Bernstein's mandate rule is written for the general (server-mode) case; in embedded installs the analyze step still fires and the unsupported steps error out harmlessly.

### 4. Worktree lanes

- git worktrees ONLY for parallel implementation lanes (Dylan ×2+ concurrent). Not for read-only lanes.
- Appears only on Bernstein-detected concurrency; Bernstein reconciles/merges.

### 5. Presets (prose-driven)

- Named seat→model/variant maps. Three built-ins: **balanced / cheap / frontier** (concrete model assignments: `docs/spec/roster.md` §4). The `register` (concise/natural) and concision on/off are **global settings applied to every preset, not bundled per-preset** (decided 2026-08-06, tgo-96f.8 review — matches the shipped config, where `register` and `concision.enabled` are top-level).
- **Applied at plugin load** — the plugin's `config` hook mutates each seat's `model` from `presets[activePreset]` (decided 2026-08-06, tgo-96f.8 review). OpenCode 1.18.13 mechanics: the `task` tool takes **no model parameter** (`packages/opencode/src/tool/task.ts`: `next.model ?? parent-message model`), so a subagent uses its frontmatter `model` if set, else inherits the parent's model. Per-seat models therefore cannot change mid-session.
- **Runtime switching = prose nudge (decided 2026-08-05):** the user says "go cheap" / "use frontier for this" / "balanced mode" in natural language; Bernstein sets the active preset, which takes effect at the **next plugin load (session start)**. No slash command, no config edit — autonomy-first.

## Deferred

UAT gate + browser evidence; session archaeology; retrospective; model-tier soft-failure escalation (per-role routing already covers the value).

## Bernstein-mandate additions (from the architectural review)

These live in Bernstein's operating rules (`docs/spec/roster.md` §5) and are part of this feature set:

1. **Living-spec mechanism** — work-unit issue IS a living spec (success criteria, bidirectional updates, verify against spec, spec-review checkpoint, decision log).
2. **DAG + wave decomposition** — dependency-ordered DAG; same-level tasks dispatch as waves; next wave waits on prior.
3. **Boolean exit gates** — every Spec carries a deterministic success criterion (tests pass, lint clean) that must hold before close.
4. **Stagnation detection** — 3 identical actions → intervene; periodic progress checks, layered on the hard bounds.
5. **Adaptive re-planning levels** — light (tweak params) / medium (reorder deps) / heavy (full re-decomposition), layered on the escalation ladder.
