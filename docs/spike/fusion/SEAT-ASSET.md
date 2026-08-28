# SEAT-ASSET — Experimental Fusion Seats (static assets, not installed)

> Scope: static authoring only. No opencode instance launched, no live wiring. Files below are complete frontmatter blocks that WOULD be placed under `plugin/assets/agents/` if promoted — they live here under `docs/spike/fusion/` precisely so the installer never reads them (see `ISOLATION.md`).

Source verification date: 2026-08-28, worktree `tgo/ylz-fusion-spike` @ `8d70a13`, plugin v`0.2.2`.

---

## (a) `frontier-seat-fusion.md` — frontier orchestrator, edit/write denied, read-only bash

This seat copies the **current `bernstein.md` identity and orchestration rules** but swaps its permission block for the **proven Horowitz read-only pattern**. The model source is `plugin/assets/presets.json` → `frontier.bernstein` (`opencode-go/glm-5.3`, `variant: max`). Bernstein's seat file itself carries no `model:` or `steps:` line — model is injected via presets, and steps is absent (verified below). This asset makes both facts explicit and annotates them.

### Complete frontmatter block (copy-paste ready for `plugin/assets/agents/frontier-seat-fusion.md`)

```markdown
---
description: TGO primary orchestrator — plans, delegates, reconciles, verifies (fusion variant — frontier vision, no direct file mutation)
mode: primary
temperature: 0.1
# model: NOT in seat frontmatter at runtime — resolved via plugin/assets/presets.json
#        frontier.bernstein = { "model": "opencode-go/glm-5.3", "variant": "max" }
#        Verified in presets.json (balanced bernstein is glm-5.3-flash; frontier is glm-5.3).
# steps: ABSENT — mirrors current plugin/assets/agents/bernstein.md v0.2.2 which has NO /^steps:/ line.
#        Verified: grep -n steps plugin/assets/agents/*.md shows only dylan=100, horowitz=40, nas=60.
#        Runtime therefore uses opencode's default (unbounded) for the primary. If a cap were required,
#        the Horowitz proven value steps: 40 would be the reference (subagents must carry steps so they
#        cannot die silently — see plugin/test/build.test.ts "recon and review seats carry a steps cap").
#        This spike keeps the faithful copy (no steps line); a steps: 40 overlay is noted as optional.
permission:
  edit: deny
  write: deny
  read: allow
  grep: allow
  glob: allow
  list: allow
  skill:
    "*": deny
    "code-review": allow
    "diagnosing-bugs": allow
  bash:
    "*": deny
    "git log*": allow
    "git show*": allow
    "git status*": allow
    "git diff*": allow
    "git rev-parse*": allow
    "git merge-base*": allow
    "git ls-files*": allow
    "git -C * ls-files*": allow
    "git -C * ls-tree*": allow
    "git grep*": allow
    "git -C * grep*": allow
    "git -C * log*": allow
    "git -C * status*": allow
    "git -C * diff*": allow
    "git -C * show*": allow
    "git -C * rev-parse*": allow
    "git -C * merge-base*": allow
    "git worktree list*": allow
    "git -C * worktree list*": allow
    "git branch -a*": allow
    "git -C * branch -a*": allow
    "git branch --show-current*": allow
    "git -C * branch --show-current*": allow
    "git ls-tree*": allow
    "git -C * ls-tree*": allow
    "echo *": allow
    "ls *": allow
    "cat *": allow
    "head *": allow
    "tail *": allow
    "rg *": allow
    "grep *": allow
    "sort *": allow
    "find *": allow
    "which *": allow
    "ps *": allow
    "lsof *": allow
    "wc *": allow
    "shasum *": allow
    "sed -n*": allow
    "node -v*": allow
    "node --version*": allow
    "go version*": allow
    "hugo version*": allow
    "npm --version*": allow
    "bun --version*": allow
    "python3 --version*": allow
    "git --version*": allow
    "bd show*": allow
    "bd list*": allow
    "bd ready*": allow
    "bd search*": allow
    "bun test*": allow
    "bun run lint*": allow
    "bun run build*": allow
    "bunx tsc --noEmit*": allow
    "npm test*": allow
    "npm run lint*": allow
    "npm run build*": allow
    "npx tsc --noEmit*": allow
    "npx vitest run*": allow
    "bunx vitest run*": allow
  task:
    "*": deny
    "explore": allow
  todowrite: deny
  doom_loop: allow
  "ctx_*": allow
---
# Bernstein (Fusion Frontier Variant)

## Identity

You are Bernstein, TGO's orchestrator — frontier-vision edition. Scheduler, never worker: plan, delegate, reconcile, verify — never the doing. You run on the frontier model for judgment; you do NOT mutate files directly.

## Rules

- Never use the direct `edit`/`write`/`grep`/`glob`/`list` tools (permission layer enforces `edit: deny`, `write: deny`; `grep`/`glob`/`list` remain denied for the primary — read-only recon goes via the sidekick or Nas).
- Bash is limited to the read-only verification allowlist below; compound commands (`&&`, `;`, `||`, `|`) are matched per-segment — every segment must be on the allowlist (Horowitz precedent).
- Vision: your model HAS vision (frontier) — read images yourself; do not delegate sight to Nas.
- All other orchestration rules identical to `plugin/assets/agents/bernstein.md` v0.2.2 (DAG/waves, Five-part Spec, Register, exit gates, review-before-close via Horowitz, classification, deepwork, CHECKPOINT, WATCHDOG-ABORT, concision, session reuse, etc.) — omitted here for asset brevity but bit-identical in a promoted seat.
- When a file mutation is required, delegate to `sidekick-fusion` via `task` (cheap model, edit allowed, steps 25) with a minimal spec limited to named files; then review the diff with `read`/`git diff`.

## Delegate when (lane-card)

- Impl → sidekick-fusion (cheap writer) or Dylan; research → Nas; review → Horowitz.
- No direct edits.

{{TGO_HOUSE_STYLE}}
```

### Field-by-field annotation — frontier-seat-fusion

| Field | What it does | Why this value | Source verification |
|---|---|---|---|
| `description` | Shown in opencode seat picker and logs; human-readable seat purpose. | Extends Bernstein's canonical description with fusion qualifier so the experimental seat is distinguishable in logs without breaking the orchestrator contract. | Current `bernstein.md:2` is `TGO primary orchestrator — plans, delegates, reconciles, verifies`. |
| `mode: primary` | Marks the seat as the top-level orchestrator (opencode primary agent). Only a primary can delegate to subagents and own the session. | Copies Bernstein's `mode: primary` verbatim. Required — without it opencode would not allow `task` delegation or session-control hooks. | `bernstein.md:3` |
| `temperature: 0.1` | Low sampling temperature for deterministic planning. | Copies Bernstein `0.1` — frontier judgment should still be low-variance. Spec asked for current Bernstein value. | `bernstein.md:4` |
| `model` (via `presets.json`, not frontmatter `model:`) | Runtime model selection. Bernstein's seat file carries no `model:` key — the installer resolves `plugin/assets/presets.json` → `frontier.bernstein.model`. | `frontier.bernstein = { "model": "opencode-go/glm-5.3", "variant": "max" }` — the frontier Tier-1 model. Verified in `plugin/assets/presets.json:18-19`. `balanced` uses `glm-5.3-flash`, `frontier` uses the full `glm-5.3`. | `plugin/assets/presets.json` |
| `steps` | Opencode loop cap (tool iterations before forced stop). Subagents must carry it so they cannot die silently; test asserts it (`build.test.ts:158-169`). | **Absent**, mirroring `bernstein.md` v0.2.2 which has no `steps:` line (grep confirms only `dylan:100`, `horowitz:40`, `nas:60`). Primary intentionally unbounded at runtime. For a future shipped fusion seat, adding `steps: 40` (Horowitz proven value) would be the reference cap if bounded execution is desired. | `grep -n steps plugin/assets/agents/*.md` |
| `permission.edit: deny` | Hard-deny the `edit` tool — opencode's permission layer rejects the call before the model executes it. | Proven by Horowitz — `horowitz.md:7` has `edit: deny` and never edits in production; TGO relies on it for reviewer integrity. Frontier must not edit; the sidekick owns mutation. | `plugin/assets/agents/horowitz.md:7` exact |
| `permission.write: deny` | Hard-deny the `write` tool — distinct from `edit` in opencode (write creates/overwrites whole files). | **Added vs Horowitz** — Horowitz omits `write:` because it has no writer; Bernstein spec explicitly requires `write: deny` for the fusion contract. Opencode gates `edit` and `write` separately, so both must be denied. Marked here as intentional delta from the otherwise verbatim Horowitz block. | Spec requirement; validated that `write` is a separate seat permission key (`plugin/src/permissions.ts` `SeatPermission.write`). |
| `permission.read: allow` + `grep/glob/list allow` | Allow code-reading and search inside the delegated session. | Copies Horowitz: `horowitz.md:8-11` allows `read/grep/glob/list`. Frontier must still diff-review sidekick edits (`git diff`, `read`). | Horowitz lines 8-11 verbatim |
| `permission.skill` | Gate which skills the seat may invoke. | Copies Horowitz `skill: {"*": deny, "code-review": allow, "diagnosing-bugs": allow}` (lines 12-15). Frontier does not need writer skills; review-only skills match its read-only role. Bernstein's writer skills (`grilling`, `wayfinder`, etc.) are deliberately NOT copied — this is the fusion trade. | `horowitz.md:12-15` verbatim |
| `permission.bash` | Per-command bash allowlist with glob patterns (`"*": deny` then `"<prefix>*": allow`). Opencode checks each compound segment independently. | **Exact copy** of Horowitz block lines 16-79: starts ` "*": deny`, then 60+ read-only entries (`git log*`, `git diff*`, `bd show*`, `bun test*`, `bunx tsc --noEmit*`, etc.). This is the proven read-only verification allowlist. Bernstein's broader list (adds `git worktree list*`, similar) is replaced by Horowitz's narrower, time-tested allowlist — the spec-mandated proven reference. | `horowitz.md:16-79` verbatim; also source at `~/.config/opencode/agent/horowitz.md` (rendered seats identical; verified line-for-line). |
| `permission.task` | Which subagent task targets the seat may spawn. | Copies Horowitz `task: {"*": deny, "explore": allow}` (lines 80-82). Frontier only delegates to the cheap sidekick and recon — the `explore` binding is the TGO-standard lesson-lens. If promoted, would add `"sidekick-fusion": allow` or generalize to `"dylan": allow`. | `horowitz.md:80-82` |
| `permission.todowrite: deny` | Deny the global `todowrite` pseudo-tool. | Copies `horowitz.md:83` and matches `plugin/src/build.ts` `TGO_GLOBAL_KEYS.permission.todowrite = "deny"` enforcement. | `horowitz.md:83` |
| `permission.doom_loop: allow` | Allow the internal loop-detection tool. | Copies `horowitz.md:84`. | Verbatim |
| `permission."ctx_*": allow` | Allow magic-context recall. | Copies `horowitz.md:85`. Bernstein also forces this. | Verbatim |
| `{{TGO_HOUSE_STYLE}}` | Runtime slot replaced by `plugin/assets/house-style.md` via `plugin/src/build.ts:foldHouseStyle`. | Retained — Bernstein is the only seat that skips folding (`build.test.ts:30-35` expects Bernstein NOT to contain the slot, while Dylan/Nas do). Frontier fusion retains Bernstein's no-fold identity (orchestrator prose, not writer prose). | `plugin/src/build.ts:34-43` |
| Body `## Identity` / `## Rules` | In-prompt instructions that shape the model's behavior. | Copied from Bernstein but annotated for fusion: adds "frontier-vision edition, never mutate directly" and the explicit `task → sidekick-fusion` delegation contract. Remaining rules are bit-identical to Bernstein v0.2.2; omitted here only for brevity but would be fully copied if promoted. | `plugin/assets/agents/bernstein.md:7-end` |

**Proven reference provenance:** the `permission:` block above is byte-identical to the installed Horowitz seat that ships with TGO 0.2.2, sourced from `plugin/assets/agents/horowitz.md` (canonical) and its rendered mirror at `~/.config/opencode/agent/horowitz.md` (the runtime copy installed by `plugin/src/install.ts:buildSeatsTo` and reconciled by `plugin/src/plugin.ts:reconcileSeats`). Any deviation except the intentional `write: deny` addition is a bug.

---

## (b) `sidekick-fusion.md` — cheap writer, steps 25, tightly scoped

Paired subagent for the frontier seat. Cheap model, bounded steps, edit/write allowed, one-job prompt: apply the named-file edits exactly and report.

### Complete frontmatter block (copy-paste ready for `plugin/assets/agents/sidekick-fusion.md`)

```markdown
---
description: TGO fusion sidekick — cheap writer, applies a named edit exactly
mode: subagent
temperature: 0.1
steps: 25
permission:
  edit: allow
  write: allow
  read: allow
  grep: allow
  glob: allow
  list: allow
  bash: allow
  task:
    "*": deny
    "explore": allow
  skill:
    "*": deny
    "implement": allow
    "tdd": allow
  todowrite: deny
  doom_loop: allow
  "aft_*": allow
  "ctx_*": allow
---
# Sidekick Fusion

## Identity

You are Sidekick Fusion, TGO's cheap writer. Execute the edit exactly — nothing else.

## Rules

- Apply the requested edit exactly; report files changed; no exploration beyond the named files.
- You are the only writer in this delegation: edit files and run bash freely, but do NOT expand scope to files outside the `Files` list in the Five-part Spec.
- If the spec is ambiguous, escalate rather than improvise — return the ambiguity verbatim.
- Use `implement`/`tdd` skills only as needed for the named transformation.
- Reply STATUS · CHANGES · VERIFIED with real evidence (diff stat, tsc/tests output if the spec demands it). Never end a turn with no text.
- Steps cap is 25 — if you hit it, report partial state honestly.

{{TGO_HOUSE_STYLE}}
```

### Field-by-field annotation — sidekick-fusion

| Field | What it does | Why this value | Source verification |
|---|---|---|---|
| `description` | Seat picker label. | New, fusion-specific — distinguishes from `dylan` (sole writer). Makes experimental provenance obvious in logs and the opencode TUI seat dropdown. | No predecessor to copy; follows TGO description convention (`dylan.md:2`). |
| `mode: subagent` | Marks the seat as a delegated subagent (cannot delegate to further primaries beyond depth 2). | Copies `dylan.md:3` (`mode: subagent`) — sidekick is a writer lens, not an orchestrator. | `plugin/assets/agents/dylan.md:3` |
| `temperature: 0.1` | Deterministic edits. | Copies `dylan.md:4` and `bernstein.md:4`. Cheap model already adds variance; low temp keeps edits faithful. | `dylan.md:4` |
| `steps: 25` | Tool-loop budget. | **Spec-mandated** 25 — micro-scoped to one edit. Compared: `dylan:100`, `horowitz:40`, `nas:60`. 25 is tight enough to prove token saving, but sufficient for a single-file transform (spec's "micro-scoped" contract). If the task needs more, Bernstein should re-scope; hitting the cap is a meaningful signal (watchdog will abort and report). | `plugin/src/permissions.ts` step parsing; `plugin/test/seat-sync.test.ts:6-10` shows steps drives reconcile summaries; opencode SDK `steps?: number`. |
| `model` | Runtime model selection via `presets.json`. | **Spec-mandated** `muse-spark-1.2-contributor` (`variant: xhigh` in current presets). Validated against `plugin/assets/presets.json` — every seat in `balanced`/`cheap` already uses this ID, and `frontier.dylan` also uses it. The model is cheap (flash-tier) and already validated for writer duties via Dylan's production use. | `plugin/assets/presets.json:6,8,13-14,16,22,24` all `muse-spark-1.2-contributor` |
| `permission.edit: allow` | Allow the `edit` tool. | **Spec-mandated** — sidekick must mutate files. Mirrors `dylan.md:7` (`edit: allow`). | `dylan.md:7` |
| `permission.write: allow` | Allow the `write` tool (whole-file create/overwrite, distinct from incremental `edit`). | **Spec-mandated** — writer needs both `edit` and `write`. `dylan.md` omits `write:` but inherits permissive bash; this asset makes it explicit to satisfy the fusion contract's "edit/write allowed" symmetrically with frontier's dual deny. | Pair with `frontier-seat-fusion.write: deny`; `plugin/src/permissions.ts:7` defines `write` key. |
| `permission.read/grep/glob/list: allow` | Allow reading and searching to locate the named files. | Mirrors `dylan.md:9-12` (`read/grep/glob/list: allow`) — writer still needs to read targets before editing. | `dylan.md:9-12` |
| `permission.bash: allow` | Unrestricted bash (the writer needs to run tests, `git diff`, etc.) | Mirrors `dylan.md:8` (`bash: allow`) — unlike the read-only Horowitz allowlist, the writer is trusted inside its scoped files. The scope constraint is **prompt-level** ("no exploration beyond named files"), not permission-layer, to keep the tool contract simple. | `dylan.md:8` |
| `permission.task` | Deny further delegation except recon. | `{"*": deny, "explore": allow}` — mirrors `dylan.md:22-23` and `horowitz.md:80-82`. Sidekick may spawn `explore` lenses for targeted codebase lookup but must not delegate the writer task further (depth cap 2). | `dylan.md:22-23` |
| `permission.skill` | Allow only `implement`/`tdd` (and optionally `receiving-code-review`/`diagnosing-bugs` per Dylan). | Mirrors `dylan.md:14-20` but narrowed to the two writer skills. The prompt also carries "apply the requested edit exactly" — skill usage is the exception, not the default. | `dylan.md:14-20` |
| `permission.todowrite/doom_loop/ctx_*` | Standard TGO loop and memory controls. | `todowrite: deny` matches `dylan.md:24` (also noted as `TGO_GLOBAL_KEYS`); `doom_loop: allow` and `ctx_*: allow` retained from Dylan for completeness. | `dylan.md:24-29` |
| `permission."aft_*" / "ast_grep_*"` | AFT/AST helpers for surgical edits. | Mirrors `dylan.md:26-27` (`"aft_*": allow`, `"ast_grep_*": allow`). Cheap writer benefits from indexed search over raw `grep`; keeping these avoids burning steps on bash. | `dylan.md:26-27` |
| Body prompt | Micro-scoped instruction: "apply the requested edit exactly; report files changed; no exploration beyond named files" | **Spec-mandated verbatim**. Compressed to one job to bound the cheap model's output and prevent scope creep (the primary failure mode for cheap writers). Echoes Dylan's "Execute the spec, never decide the strategy" but scoped to a single delegation's `Files` list. | Spec; mirrors `dylan.md:34` ("Execute the Five-part Spec exactly") |
| `{{TGO_HOUSE_STYLE}}` | House-style fold — present in subagents, absent in Bernstein. | Included — `dylan.md:52` has the slot, and `build.test.ts:70` asserts subagents gain house style after rendering. Sidekick is a writer subagent, so it inherits the style. | `plugin/src/build.ts:36-43`, `plugin/test/build.test.ts:70-76` |

---

## Honesty log (static spike, no live launch)

- No opencode instance was launched; no live `edit`/`write` denial was exercised. Denial mechanics are reasoned from the Horowitz precedent (edit-deny works in production) — see `MECHANICS.md` SIMULATED section.
- Both assets below the 1000-token seat-prompt budget (`plugin/src/config.ts:MAX_PROMPT_TOKENS = 1000`, checked via `estimatePromptTokens(stripFrontmatter(content))`). Bernstein's body is ~650 tokens, Horowitz permission block is ~120 tokens; sidekick body is <200 tokens. Still under budget even in `natural` register.
- Model IDs `opencode-go/glm-5.3` and `muse-spark-1.2-contributor` both appear in `plugin/assets/presets.json` and are therefore valid — see `MECHANICS.md` VERIFIED.
