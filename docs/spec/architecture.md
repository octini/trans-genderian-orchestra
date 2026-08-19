# TGO Spec — Architecture

Status: **spec** (buildable). Source decisions: `docs/wayfinder/decisions.md` (tgo-a6r.8; architectural-review amendments in `docs/research/architectural-review.md`). Related ADRs: `docs/adr/0001-shape.md`.

## 1. Shape

**Hybrid: config-first roster + a thin plugin core.**

- Routing, delegation, and seat behavior live in **config/prompts** (agent `.md` files, permission graph, presets). The plugin never reimplements control flow.
- The routing implementation exposes one `tiny` / `standard` / `heavy` classification result. It is a conservative input to delegation and closure enforcement; the plugin does not close or reopen Beads issues. This classifier only supplies the routing result. Downstream tiny bypass and heavy-pipeline promotion wiring is a later slice.
- The **plugin core observes lifecycle metadata and state** — four core runtime hooks (see §4), plus an opt-in completion observer that is inert by default and does not claim production context or lineage, plus the plugin `config` hook that applies the active preset at load (see `docs/spec/features.md` §5). It does not perform Beads lifecycle writes.
- Everything else (roster, models, prompts, permissions, presets) is configuration, built from templates at install/build time.

## 2. Roster mapping

- **One primary Orchestrator** — Bernstein. Scheduler ("direct work boundary"); never does the doing.
- **Named specialists as background-capable subagents** — Horowitz (review), Nas (research/lookup), Dylan (implementation), Nirvana (band).
- **Per-role model routing** via presets (see `docs/spec/features.md` §5 and `docs/spec/roster.md` §4).
- Requires `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true`.

## 3. Delegation contract

### 3.1 Five-part Spec (the task prompt)

Every delegation carries:

1. **Objective** — what done looks like, one paragraph.
2. **Files** — the exact touch set.
3. **Interfaces** — signatures, contracts, data shapes the work must honor.
4. **Constraints** — boundaries, non-negotiables, what not to touch.
5. **Verification** — the boolean exit gate (tests pass, lint clean) that must hold before the issue closes.

Optional **Register** field (concise/natural) — Bernstein mandates the register when the deliverable's audience makes it matter (docs, copy, prose); omitted, Dylan self-classifies by output class. Applied at the delegation boundary, parallel to presets (see `docs/spec/features.md` §5).

The delegation validator consumes the classifier's route result at the structured task boundary. Standard and heavy packets must contain all five fields above plus `exitGate: true` as a boolean. Tiny packets use the proportional minimal form: `minimal: true`, `Objective`, `Files`, `Verification`, and `exitGate: true`. Non-empty named file paths and non-empty contract fields are required; prose that merely claims an exit gate passed is not validation. Unstructured task calls are outside this validator boundary.

### 3.2 Structured report (the specialist's reply)

`STATUS` (complete / partial / blocked / escalate) · `CHANGES` · `VERIFIED` · `GAPS`.

The plugin parses these four sections deterministically at the task-result boundary. It
preserves the raw report, records missing or malformed sections and contradictory
verification, and assigns recovery as retry, reroute, escalate, or user-clarification.
Watchdog-aborted output is never a completion signal: it is classified for reroute.
Parsing does not verify, claim, close, or reopen Beads issues. `closureGate` is
metadata for Bernstein's later lifecycle operation; the actual lifecycle boundary
is a follow-up, not a capability of this plugin hook path. Failed-gate recovery is metadata-only until host write path proven (plugin does not close/reopen/recover) — the `closureGate` `recovery` derives from `report.recovery` (`watchdog`→`reroute`, `blocked`/`escalate`, else `retry`/`user-clarification`) and no live `bd` calls are made; see `docs/spec/beads-integration.md` § Failed-gate recovery. bd init --directory is unsupported; bd -C fails, must use .cwd(directory). Plugin remains metadata-only until host boundary validated.

### 3.3 State

- The **Background Job Board** snapshot is injected each turn (see `docs/spec/beads-integration.md`).
- **Heavy state lives in files on disk**, never pasted into context.

## 4. Code boundary — four core hooks (+ opt-in observer and load-time preset application)

Beyond the four runtime hooks, the plugin registers the `config` hook to apply the active preset (seat→model/variant) at plugin load — documented in `docs/spec/features.md` §5, implemented in tgo-96f.12. It is a load-time mutation, not a runtime loop hook.

1. **Background Job Board injection** — `experimental.chat.messages.transform`/`chat.message`; sentinel-tagged; strip-and-replace for cache safety. The LLM must see a per-turn snapshot.
2. **Session reconciliation** — `session.status`/idle events; keeps the board consistent with reality across compactions and resumes.
3. **Task-fit rejection normalization** — `tool.execute.after`; turns a specialist's "this isn't my lane" rejection into a reroute-not-retry signal for Bernstein.
4. **Always-on concision transform** — `experimental.chat.system.transform`; the house-style injection appended to the system prompt each turn (see `docs/spec/concision-enforcement.md` §2). Which skills feed it = selection decision; detailed mechanism = enforcement decision.

Hook names verified against `@opencode-ai/plugin` 1.18.13 (scaffold tgo-96f.1, 2026-08-05): the board transform is `experimental.chat.messages.transform` (hook #1); the concision transform is `experimental.chat.system.transform` (hook #4) — distinct hooks.

The `experimental.text.complete` observer is a supporting, opt-in boundary for surrogate-only style reinforcement. It is inert on the verified production path without explicit preservation context and response lineage. The explicit-context controller path is a non-production surrogate under the current hook limitations. Watchdog activity hooks and load-time config/setup paths are supporting lifecycle code, not additional core orchestra hooks. Apart from these documented supporting boundaries, everything else stays out of orchestration code: routing stays in prompts, the roster in config, and models in presets.

## 5. Enforcement: capabilities, not compliance

- **Bernstein's frontmatter denies** `edit`, `grep`, `glob`, `list`, `bash` (except the verification/`bd` allowlists — see `docs/spec/mcp-permissions.md`); **allowlists** `task` + read-only (`read`/`websearch`/`skill`).
- **Specialists capped** at `subagent_depth: 2` (global `opencode.json` setting, not per-agent — verified in opencode source; the permission graph's per-seat file is separate). The `general` subagent is excluded from the delegation graph.
- The point: the Orchestrator *cannot* drift into doing. The permission graph enforces the lane; prompts only advise.

## 6. Ship shape

- **npm package** = thin code core + **global config assets** (agent `.md` files, permission template, presets map) installed to `~/.config/opencode/`.
- **Non-load-bearing setup skill** (see `docs/spec/setup.md`).
- **JSON schema** for plugin config — validates prompt-file size (<1000 tokens per seat prompt, body only) and structure at build time.
- **Global, not per-project** (user preference). Repo-specific setup is the separate auto-triggered path.
- Installer **auto-installs missing dependencies** (beads, AFT, magic-context, context7) — see `docs/spec/mcp-permissions.md`.

## 7. Data points that motivated the shape

- Multi-agent orchestration consumes ~15x tokens vs plain chat (Anthropic harness) — the plugin must be token-frugal by construction (thin core, heavy state on disk).
- Verification breakdowns = 21.3% of failures (MAST) — hence the boolean exit gates and doer/judger split.
- ~1 in 4 agent interactions produces a semantic conflict; only pre-execution gating prevents cascading failure (SCF) — hence capabilities-not-compliance.
- Doer/judger separation is the highest-leverage single change (Anthropic harness) — hence the Bernstein/Dylan split.

## 8. Deterministic contract fixture

`plugin/test/end-to-end.test.ts` runs a model-free fixture with two routes. A vague
greenfield desktop D&D request records clarification, research, vision/spec work,
dependency-graph wayfinding, delegation, report parsing, Horowitz review, the exit
gate, and closure metadata. A bounded phone-number literal replacement uses the tiny
route and records its fast verification while bypassing grilling, Wayfinder, the
band, and Horowitz. A malformed handoff and failed gate must recover and cannot close.
The fixture checks these observable contracts; it does not add a runtime workflow.
