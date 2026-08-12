# TGO Spec — Architecture

Status: **spec** (buildable). Source decisions: `docs/wayfinder/decisions.md` (tgo-a6r.8; architectural-review amendments in `docs/research/architectural-review.md`). Related ADRs: `docs/adr/0001-shape.md`.

## 1. Shape

**Hybrid: config-first roster + a thin plugin core.**

- Routing, delegation, and seat behavior live in **config/prompts** (agent `.md` files, permission graph, presets). The plugin never reimplements control flow.
- The **plugin core enforces lifecycle and state** only — exactly four runtime hooks (see §4), plus the plugin `config` hook that applies the active preset at load (see `docs/spec/features.md` §5).
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

### 3.2 Structured report (the specialist's reply)

`STATUS` (complete / partial / blocked / escalate) · `CHANGES` · `VERIFIED` · `GAPS`.

### 3.3 State

- The **Background Job Board** snapshot is injected each turn (see `docs/spec/beads-integration.md`).
- **Heavy state lives in files on disk**, never pasted into context.

## 4. Code boundary — exactly four hooks (+ load-time preset application)

Beyond the four runtime hooks, the plugin registers the `config` hook to apply the active preset (seat→model/variant) at plugin load — documented in `docs/spec/features.md` §5, implemented in tgo-96f.12. It is a load-time mutation, not a runtime loop hook.

1. **Background Job Board injection** — `experimental.chat.messages.transform`/`chat.message`; sentinel-tagged; strip-and-replace for cache safety. The LLM must see a per-turn snapshot.
2. **Session reconciliation** — `session.status`/idle events; keeps the board consistent with reality across compactions and resumes.
3. **Task-fit rejection normalization** — `tool.execute.after`; turns a specialist's "this isn't my lane" rejection into a reroute-not-retry signal for Bernstein.
4. **Always-on concision transform** — `experimental.chat.system.transform`; the house-style injection appended to the system prompt each turn (see `docs/spec/concision-enforcement.md` §2). Which skills feed it = selection decision; detailed mechanism = enforcement decision.

Hook names verified against `@opencode-ai/plugin` 1.18.13 (scaffold tgo-96f.1, 2026-08-05): the board transform is `experimental.chat.messages.transform` (hook #1); the concision transform is `experimental.chat.system.transform` (hook #4) — distinct hooks.

Everything else stays out of code: routing in prompts, roster in config, models in presets.

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
