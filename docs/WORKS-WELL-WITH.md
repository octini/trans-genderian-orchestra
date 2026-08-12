# Works well with

TGO is not a walled garden. It pins a small set of engine dependencies, ships a curated advisory skill bundle, and leaves the big external skill suites alone — it enables its own per-seat grants for them when they're present, and never disables them.

This page is the human-readable version of the bundling and curation decisions in `docs/spec/mcp-permissions.md` and `docs/spec/skill-curation.md`; those specs stay canonical.

## Engine dependencies (pinned, auto-installed)

These are the four dependencies the installer checks for and installs when missing (`--deps auto`):

| Dependency | What it is | How TGO treats it |
|---|---|---|
| **beads** (`bd` CLI) | The work-unit store and job-board engine (Dolt-backed) | TGO wraps it with its own opencode-side wiring — the Background Job Board is a renderer over beads. Bernstein is the single writer. |
| **AFT** | Symbol-aware code tools (`aft_*`, `ast_grep_*`) | A **full dependency** — its value IS the engine; TGO doesn't adapt or re-wrap it. Dylan's motor lane. |
| **magic-context** | Long-term memory + cross-session recall (`ctx_*`) | A **full dependency** — the historian/dreamer/recall pipeline is the engine. The installer configures it end to end (historian on the active preset's Dylan model, TUI sidebar, built-in compaction off). |
| **context7** | Docs lookup MCP (`context7_*`) | The **one external MCP** — a remote 2-tool server, token-cheap, no local process. Granted to Nas and Dylan. |

The pinned-name policy: AFT and magic-context are adapted as whole plugins, never re-wrapped; beads gets TGO's own opencode-side wrapper over the `bd` engine; context7 is the single external MCP. Everything else came up in research and was deliberately not adopted — `gh_grep` (websearch approximates it), MemPalace MCP and oh-my-pi memory tools (magic-context owns memory), and ruflo's monolithic MCP (against the skills-over-MCPs rule).

## External skill suites (never disabled)

TGO ships its own 13-skill bundle (15 per-seat grants — see `docs/spec/skill-candidates.md`), and it coexists with the suites it drew from. The grants are advisory and per-seat: when a compatible suite is present, TGO enables its grants for it; it never disables the suite.

- **[mattpocock/skills](https://github.com/mattpocock/skills)** — the engineering skills TGO adapted most heavily from (implement, tdd, diagnosing-bugs, code-review, wayfinder, grilling, to-tickets, to-questionnaire, wizard, bmad-build-auto, bmad-deep-recon). TGO's versions are adapted and token-pruned, not forks.
- **[superpowers](https://github.com/obra/superpowers)** — the composable methodology suite. TGO borrowed receiving-code-review (Dylan) and verification-before-completion's content (folded into the exit-gate discipline); subagent-driven-development and dispatching-parallel-agents are concepts TGO owns structurally via Bernstein's delegation.
- **[gsd-core](https://github.com/open-gsd/gsd-core)** — the phase-loop framework. TGO owns its autonomy/checkpoint/gate concepts natively (deepwork mode, checkpoint protocol, boolean exit gates) and adopted the package-legitimacy verdict (OK/SUS/SLOP) inside Nas's bmad-deep-recon.
- **[oh-my-opencode-slim](https://github.com/alvinunreal/oh-my-opencode-slim)** — the OpenCode-specific slim variant. TGO borrowed its background-subagents env approach (marker block in the shell startup file) and its verification-planning method (Bernstein's up-front evidence path).

Suites that came up in research but were not bundled or pinned — improve-codebase-architecture, prototype, handoff, resolving-merge-conflicts, and writing-for-agents — are listed here so the decision is findable: each was evaluated against the six curation criteria (adopt by function / nothing load-bearing / skills-over-MCPs / token discipline / borrow-over-author / per-seat grants) and lost to an existing TGO feature or to opencode-native tooling.

## MCPs and tools

- **context7** is the one external MCP. No framework in the research shipped a websearch MCP; opencode's native `websearch` (Exa provider) wins, and TGO exports `OPENCODE_ENABLE_EXA=true` so it uses Exa.
- **Skills over MCPs, strictly** — if a skill covers a need, the MCP doesn't ship. This is why the memory MCPs and gh_grep are out.
- **AFT and magic-context tools** are granted per seat via the permission graph (`aft_*`, `ast_grep_*`, `ctx_*`) exactly like skills — see `docs/spec/mcp-permissions.md`.

## Cross-vendor review

The balanced and cheap presets keep model families consistent per seat, but nothing forces that: you can override any seat's model via the `presets` config option, so running Horowitz or Nirvana on a different vendor's model for a second opinion is a supported option — a "works well with" choice, not a shipped preset. See `docs/ROSTER.md` for the preset table.

## Related

- Spec: `docs/spec/mcp-permissions.md` (canonical), `docs/spec/skill-curation.md` (canonical), `docs/spec/skill-candidates.md` (the full decision trail)
- Research: `docs/research/skill-sources-inventory.md`, `docs/research/gsd-core.md`, `docs/research/oh-my-opencode-slim.md`
- Human pages: `docs/ROSTER.md`, `docs/ARCHITECTURE.md`
