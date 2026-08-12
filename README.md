# TGO — trans-genderian-orchestra

> Mirrored byte-for-byte in `plugin/README.md` (the npm readme) — edit one, copy to the other.

[![npm version](https://img.shields.io/badge/npm-0.1.1-6a4c93)](https://www.npmjs.com/package/trans-genderian-orchestra)
[![License: MIT](https://img.shields.io/badge/license-MIT-6a4c93)](LICENSE)
[![OpenCode 1.18.13](https://img.shields.io/badge/OpenCode-1.18.13-6a4c93)](https://opencode.ai)

TGO is a thin multi-agent orchestration plugin for [OpenCode](https://opencode.ai). It runs a fixed band of named, role-anchored subagents around one orchestrator, with routing, delegation, and seat behavior living in configuration rather than in code.

## What it does

TGO turns OpenCode into a hub-and-spoke orchestra with a single writer. Bernstein, the primary, plans each goal as a dependency-ordered DAG of work units, delegates them to the specialist seats, verifies each result against its exit gate, and only then closes the work. The other seats are one-lane by design: Dylan is the only seat that writes code, Nas is read-only research, Horowitz reviews work that exists, and Nirvana is a tool-less review band for judgment-heavy calls.

Everything load-bearing is enforced, not prompted. The plugin core provides exactly four runtime hooks (a job board, session reconciliation, task-fit rerouting, and the always-on concision transform); everything else sits in seat prompts, a per-seat permission graph, and presets. Work units live in [beads](https://github.com/gastownhall/beads): each delegated task is a beads issue with explicit success criteria, and the Background Job Board is a renderer over that store, not a second one.

## Why TGO

The multi-agent literature is blunt about where orchestration fails, and TGO's shape is a direct answer to those failure modes (full trail: `docs/research/architectural-review.md`):

- **Orchestration is expensive.** Anthropic's harness measured ~15x the tokens of plain chat, and coordination overhead can exceed manual work. TGO is token-frugal by construction: a thin core, heavy state on disk, seat prompts under 1000 tokens.
- **Verification is where agents break.** Task-verification breakdowns account for 21.3% of failures in the MAST taxonomy (1600+ annotated traces across 7 frameworks). TGO gives every delegation a boolean exit gate and keeps the judger separate from the doer.
- **Misalignment is the norm, not the exception.** Roughly 1 in 4 agent interactions produces a semantic conflict (SCF); only pre-execution gating prevents cascading failure. TGO's permission graph makes lanes unbreakable rather than merely recommended.
- **Doer/judger separation is the highest-leverage change in the literature** (Anthropic harness). TGO builds it in structurally: Dylan writes, Bernstein verifies, Horowitz reviews.

## Quick start

Add the plugin to your opencode config:

```json
{ "plugin": ["trans-genderian-orchestra@0.1.1"] }
```

OpenCode installs the package and its dependencies. Restart opencode. Per-repo setup (the beads store plus the AGENTS fragment) runs by itself the first time you open a repo — zero user input, idempotent, no-clobber.

Or install from source:

```bash
git clone https://github.com/octini/trans-genderian-orchestra
bun install
bun run setup
```

That builds the seat prompts from templates, writes the global config fragment, auto-installs the engine dependencies (beads, AFT, magic-context, context7), and self-registers the plugin in your global `opencode.jsonc`. Restart opencode.

A local-plugin path also exists, documented in `docs/SETUP.md`: symlink or copy `src/plugin.ts` into `~/.config/opencode/plugins/`, then run the installer for the config assets.

## The roster

| Seat | Role |
|---|---|
| **Bernstein** | Primary (Orchestrator): plans, delegates, reconciles, verifies; the only seat that touches beads. Scheduler, never worker. |
| **Horowitz** | Review and strategic advisor: reviews work that exists; never implements. |
| **Nas** | Read-only lookup: recon, research, docs; findings come back as structured reports, never committed artifacts. |
| **Dylan** | Sole writer: code, technical docs, prose artifacts; executes specs, never decides strategy. |
| **Nirvana** | The band: a tool-less synthesizer plus three lenses, convened for high-stakes or ambiguous judgment. |

Full detail — prompt anatomy, model routing, Bernstein's mandate — in `docs/ROSTER.md`.

## How it works

```
                      ┌────────────────┐
                      │      You       │
                      └───────┬────────┘
                              │
                ┌─────────────▼─────────────┐
                │         Bernstein         │
                │  plan · delegate ·        │
                │  reconcile · verify       │
            └──┬──────────────┬───────────────┬──┘
               │              │               │
        ┌──────▼──────┐  ┌────▼─────┐  ┌──────▼──────┐
        │    Dylan    │  │   Nas    │  │  Horowitz   │
        │ sole writer │  │ read-only│  │ review +    │
        │             │  │ lookup   │  │ advisor     │
        └─────────────┘  └──────────┘  └─────────────┘
        ┌────────────────────────────────────────────┐
        │                  Nirvana                   │
        │      tool-less band: 3 lenses + a          │
        │      synthesizer, for judgment-heavy calls │
        └────────────────────────────────────────────┘
```

Each turn, Bernstein reads the Background Job Board — a per-turn snapshot of in-flight work rendered from beads — and dispatches same-level tasks together as a wave. Delegations carry a five-part spec (Objective / Files / Interfaces / Constraints / Verification) and come back as a structured report (STATUS / CHANGES / VERIFIED / GAPS). Specialists can only do their lane; the orchestrator cannot edit files.

## Configuration

Options go in the second element of the plugin array entry: `["trans-genderian-orchestra", { ... }]`.

| Option | Values | Default | What it does |
|---|---|---|---|
| `preset` | `"balanced"` / `"cheap"` / `"frontier"` | `"balanced"` | The seat→model map applied at plugin load. |
| `register` | `"concise"` / `"natural"` | `"concise"` | Default writing register for the house style; only Dylan's output ever toggles it. |
| `presets` | partial seat→model maps | built-ins | Override individual seat models in any preset. Data, not code — tolerant of model-name drift. |
| `agentDir` | directory path | `~/.config/opencode/agent` | Where seat prompt `.md` files live; re-checked against the token budget at load. |
| `board` | `{ enabled, refreshMs }` | `true`, `5000` | Background Job Board master switch and per-session re-render interval. |
| `concision` | `{ enabled }` | `true` | Universal off-switch for the per-turn house-style injection. |
| `setup` | `{ enabled, autoInstallBeads }` | `true`, `true` | Per-repo setup auto-trigger; whether a missing `bd` CLI is installed or just reported. |
| `watchdog` | `{ enabled, wallClockMs, idleMs, checkMs }` | `true`, 20m, 15m, 10s | Aborts delegated sessions that hang or stall, then tells Bernstein to re-dispatch. |

JSON schema: `plugin/schema/tgo.config.schema.json`.

## Dependencies

TGO pins a small set of engine dependencies; the installer checks for each and installs what's missing (`--deps auto | check | skip`):

- **beads** (`bd` CLI) — the work-unit store and job-board engine; Bernstein is the single writer.
- **AFT** — symbol-aware code tools (`aft_*`, `ast_grep_*`); Dylan's motor lane.
- **magic-context** — long-term memory and cross-session recall (`ctx_*`); the installer configures it end to end, including the historian on the active preset's Dylan model and the TUI sidebar.
- **context7** — the one external MCP, for docs lookup (`context7_*`); granted to Nas and Dylan.

Runtime dependencies: `@opencode-ai/plugin ~1.18.13`, `zod ^4.1.13`. Engine: `bun >= 1.0.0`.

## Permissions

Capabilities, not compliance. The seat prompts carry a per-seat permission matrix that opencode enforces, not just recommends:

| Seat | Allowed | Denied |
|---|---|---|
| **Bernstein** | `read`, `websearch`, `skill`; bash verification allowlist (`git diff`/`status`/`log`/`rev-parse*`, `bd *`, test runners); `task` → the four named seats | `edit`, `grep`, `glob`, `list`, general subagents |
| **Horowitz** | read-only git/log/process inspection; read-only `bd show`/`list`/`ready`/`search`; `task` → `explore` | `edit`; everything else |
| **Nas** | `read`, `grep`, `glob`, `list`, `websearch`, `webfetch`, `context7_*`, `ctx_*` | `edit`, `bash`, `task` entirely |
| **Dylan** | `edit`, `bash`, `aft_*`, `ast_grep_*`, `context7_*`, `ctx_*`; `task` → `explore`; the only seat that writes | `todowrite`; general subagents |
| **Nirvana + band** | `task` → its three band members only (cobain, grohl, novoselic) | everything else |

Globally: `todowrite` is denied for every seat (beads is the only work tracker), `subagent_depth: 2` caps delegation, and `nas`/`horowitz`/`dylan` carry a 20-step cap so a long session returns a usable partial report instead of an empty handoff. The full matrix — including the `git -C <dir>` variants and per-segment compound-command matching — lives in `docs/spec/mcp-permissions.md`.

## Skills

TGO ships a curated advisory bundle: 13 skills, 15 per-seat grants — wayfinder, grilling, to-tickets, bmad-build-auto, verification-planning, diagnosing-bugs, to-questionnaire, wizard, code-review, bmad-deep-recon, implement, tdd, receiving-code-review. Skills are advisory only; nothing load-bearing — a missing skill never breaks the plugin. Per-seat grants go in the seat frontmatter. External suites (mattpocock/skills, superpowers, gsd) are never disabled; TGO enables its grants for them when they're present. See `docs/WORKS-WELL-WITH.md`.

## Always-on concision

Every seat speaks one uniform house style: structure (action-first, numbered steps), prose (never drop negations; keep code and errors verbatim), code (smallest change that works, YAGNI). The primary loop gets the style injected every turn; subagent seats get it folded into their prompts at build time. A two-position register dial (concise / natural) rides on Dylan's output alone, and the whole layer has a universal off-switch: `concision.enabled: false`, or just say "stop X" / "normal mode". The mechanics and the anti-slop scrub list are in `docs/CONCISION.md`.

## Deepwork mode

Autonomy is a mode, not the default. Deepwork ("keep going") is opt-in and hard-bounded: max phases, token budget, mandatory checkpoint cadence, stagnation detection, and light/medium/heavy re-planning levels. A checkpoint protocol pauses on irreversible or expensive actions, direction changes, and dependency-legitimacy questions — routine work still auto-approves.

## Works well with

TGO is not a walled garden. The bundled skills coexist with the big skill suites; AFT and magic-context are first-class engine dependencies; context7 is the one external MCP. See `docs/WORKS-WELL-WITH.md` for the compatible tools and how the grants interact.

## Architecture deep-dive

The design is a hybrid: configuration owns routing, delegation, and seat behavior; a thin plugin core enforces lifecycle and state through exactly four runtime hooks. The permission graph is the enforcement mechanism — the orchestrator cannot drift into doing because it lacks the tools. The shape, the hooks, and the why are in `docs/ARCHITECTURE.md`; the five seats, prompt anatomy, and model routing in `docs/ROSTER.md`; the house style in `docs/CONCISION.md`; install and per-repo setup in `docs/SETUP.md`; the dev workflow in `docs/CONTRIBUTING.md`; release history in `CHANGELOG.md`. The spec docs under `docs/spec/` remain canonical — these pages are the human-readable reformulation.

## Development

```bash
bun install
bun run validate      # schema + presets + rendered seat-prompt budget
bun run build         # render seat prompts; --outDir <dir> to write
bun test              # budget + schema + build tests
bunx tsc --noEmit     # typecheck
bun run setup --configDir <dir>   # build + install (defaults to ~/.config/opencode/)
```

## License

MIT. Copyright (c) 2026 octini. See `LICENSE`.
