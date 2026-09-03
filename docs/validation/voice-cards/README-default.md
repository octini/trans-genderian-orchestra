# TGO — trans-genderian-orchestra

> Mirrored byte-for-byte in `plugin/README.md` (the npm readme) — edit one, copy to the other.

[![npm version](https://img.shields.io/badge/npm-0.4.0-ba0ce9e)](https://www.npmjs.com/package/trans-genderian-orchestra)
[![License: MIT](https://img.shields.io/badge/license-MIT-6a4c93)](LICENSE)
[![OpenCode 1.18.13](https://img.shields.io/badge/OpenCode-1.18.13-6a4c93)](https://opencode.ai)

TGO is a thin orchestration plugin for [OpenCode](https://opencode.ai). It turns a single model call into a small, disciplined ensemble. Talk to one person — Bernstein, the orchestrator. He delegates to the right specialist, brings results back, and checks them against the goal you set.

Long agent sessions drift. They lose the plot, rewrite the same fix, or mark themselves done before tests pass. TGO keeps tempo so specialists can play.

## Why this shape

Research describes where agent teams wobble. TGO answers are narrow and boring:

- **Orchestration costs more than the work.** Anthropic's harness measured plain chat at roughly one fifteenth of the tokens a naive agent harness burned, and coordination can outcost execution. TGO stays thin: small core, most state on disk, seat prompts under 1,000 tokens. The budget is checked at build, at install, and again at load (`plugin/src/config.ts` caps at 1,000).
- **Verification breaks most often.** The MAST taxonomy covers more than 1,600 traces across seven frameworks. About one in five failures traced to "did we check?" TGO gives every delegated unit a boolean exit gate and separates the writer from the judge.
- **Misalignment enters early.** Roughly one in four agent interactions drifted from the request. A gate before work starts prevents compounding. TGO enforces lanes in the permission graph. The host enforces them. They are not prompt suggestions.
- **Doer and judger belong apart.** That separation was the highest-leverage change in the literature. Architecture reflects it: Dylan writes, Bernstein verifies, Horowitz reviews.

If you want the trail, read `docs/research/architectural-review.md`. If you want token claims, read `docs/spec/style-quality-evaluation.md`. That benchmark states what it measures: proxy token counts (words plus punctuation math), proxy latency and cost, deterministic surrogate edits, not billed provider usage. It reports cost per successful task. It labels any vendor token-reduction claim as "external, not TGO."

## Quick start — from empty folder to working repo without a slash command

The plugin requires one global install. After that, any empty folder becomes a repo on your first real prompt.

1. Install the plugin globally if you have not yet installed it. Run one command to get both surfaces, the server board in chat and the TUI sidebar on the right.

```bash
opencode plugin trans-genderian-orchestra -g
```

One npm package exposes both surfaces via dual-package exports since v0.1.5 (`exports "./server" → "./dist/server.js"` and `"./tui" → "./dist/tui.js"`; peers `solid-js`, `@opentui/solid`, `@opentui/core` are resolved by the host, not bundled). The board lives on the server (`experimental.chat.messages.transform` / `experimental.chat.system.transform` in `dist/server.js`). The sidebar lives on the TUI (`slots.register` at `order 450` in `tui.jsonc` — between Todo at `400` and Modified Files at `500` — in `dist/tui.js`). The interactive sidebar landed in 0.1.6. 0.1.5 shipped dual exports and the read-only `tgo_beads_snapshot` tool.

If you prefer manual wiring, add this to `opencode.jsonc`:

```json
{ "plugin": ["trans-genderian-orchestra@0.4.0"] }
```

2. If you installed the plugin, restart opencode. The global layer is then complete.

3. Create or open an empty folder if you need a new repo. No slash command, template, or wizard is required. OpenCode needs a directory, and your first real sentence does the rest.

```bash
mkdir ~/opencode/diceproject
cd ~/opencode/diceproject
opencode
```

An empty directory suffices. If you created the folder in Finder or reused a cleaned-out directory, the next step is identical. Talk to it like a teammate:

> build me a simple D&D dice roller CLI — `dice 2d6+3` should roll two six-sided dice, add three, and print each die plus the total. keep it tiny, with a quick test I can run.

You did not run `/init` or `/tgo-setup`. While Bernstein works through the request, TGO sets up the repo in the background. It creates `.beads/` (the work-unit store), runs `bd init` for git-backed pieces, runs `bd setup opencode`, and merges the thin `AGENTS.md` fragment if it is absent. That work runs concurrent with the first LLM turn, not at `opencode` launch, and it does not block your prompt. When you see the first response, the folder is no longer empty.

**What "just worked" really was.** TGO watches two moments. First, `session.created` for brand-new primary sessions. It treats both `parentID === null` and `parentID === undefined` as primary. That is the `parentID != null` guard at `plugin/src/plugin.ts:171`, which fixed cases where the host left the field undefined. Second, as fallback, the very next `chat.message` if the session event was missed. The fallback checks `parentID` through `client.session.get` and guards against the root directory (`"/"`), so a stray global session cannot init your home folder. Either path calls `SetupController.maybeSetup`. That controller tracks every attempted directory in memory (`plugin/src/setup.ts` `attempted` set, set at the top of `maybeSetup` so concurrent turns do not race). It does not run twice for the same repo even if two messages arrive at once.

4. Use the installer-from-source path if you prefer to build from checkout. Run these commands from a clone:

```bash
git clone https://github.com/octini/trans-genderian-orchestra
bun install
bun run setup
```

That path builds seat prompts from templates, writes the global config fragment, auto-installs engine dependencies (beads, AFT, magic-context, context7), and self-registers the plugin in both `opencode.jsonc` and `tui.jsonc`. A local-plugin path that symlinks `src/plugin.ts` into `~/.config/opencode/plugins/` is documented in `docs/SETUP.md`.

5. If setup finished, confirm the sidebar lights up. Within a second or two, without `/bd-refresh`, beads appear. The TUI polls every 1.5 seconds (`POLL_MS 1500` in `plugin/src/sidebar/tui.tsx:20`). It keeps a cheap signature of `.beads` (`plugin/src/sidebar/bd.ts` walks `.beads` for newest mtime plus entry count) and re-reads only when something changed. The fallback view pulls `bd list --all` (`plugin/src/sidebar/scope.ts:93`), so in-progress work shows before epic scope forms. If you pinned an epic with `/bd-focus`, run `/bd-unfocus` to clear it. The panel then follows the last-touched bead.

6. Expect a version check on startup if you run 0.2.1 or later. TGO compares the installed version in `plugin/package.json` with npm latest at `https://registry.npmjs.org/trans-genderian-orchestra/latest`. Logic lives in `plugin/src/version.ts`: `compareVersions` handles `v` prefixes and pre-releases, `fetchLatestVersion` times out after three seconds, `checkVersionDrift` composes them. If the installed version trails npm, TGO writes a warning to the structured log (`client.app.log` with `service: "tgo"`): *"TGO update available: installed X < npm Y — self-update will refresh cache on restart; if slot stuck: rm -rf ~/.cache/opencode/packages/trans-genderian-orchestra* and restart (opencode plugin --force is a no-op against exact-pinned slots tgo-6m6)"*. The check defaults to `true` (`config.checkVersion` in `plugin/src/config.ts:80`). It never throws and never blocks startup. To disable it, set `"checkVersion": false`.

7. Verify the build split if you want receipts. Run `grep -c slots.register plugin/dist/server.js` and expect `0`. Run `grep -c experimental.chat plugin/dist/tui.js` and expect `0`. Server carries no TUI slots. TUI carries no chat hooks. Build and CI enforce this (`plugin/src/build.ts`).

## How it works day to day

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

Bernstein sketches work as a dependency-ordered DAG. He sends each piece with a five-part spec (Objective / Files / Interfaces / Constraints / Verification) and waits for a structured report (STATUS / CHANGES / VERIFIED / GAPS). The verification line is the contract: tests pass, lint passes, or work stays open. Specialists stay in lane because the host enforces it: Dylan is the only writer, Nas never receives `bash` or `task`, Horowitz reads but does not write, Nirvana has no tools.

The Background Job Board follows you. Each turn the plugin re-derives a short board snapshot from Beads — `bd list`, `bd ready`, `bd blocked`, `bd memories` when the host exposes them — and shares it as context. That context is read-only, not a write license. Creating, claiming, closing, reopening, or recovering beads outside the read path stays disabled until the host boundary for lifecycle writes is proven. Current plugin stays metadata-only there (`beadsLifecycle.allowed: false`).

- **Session reuse** — If a follow-up delegation targets the same work, continue the subagent session (`task_id`) instead of spawning a new one. TGO guards context size. State lives in `.tgo/sessions.json`.
- **Progress files** — If Dylan touches a bead, write `.tgo/<issueId>/progress.md` with Objective / Touch set / Decisions / Blockers / Status. Bernstein and Horowitz read it. It survives session end.
- **Termination conditions** — If a delegated session declares STATUS: complete and then makes a residual tool call, stop it. Composable detection prevents post-completion waffle and returns the report.

## What's new in 0.4.0

TGO 0.4.0 is the voice-cards release. It replaces the concise/natural register dial with selectable voice cards and card-aware style enforcement, grouped by shape:

- **Factory voices.** `tgo-default` is always-on for every seat. Named cards `tgo-prose` (measured, image-led, 29/44/27 buckets, mean 19 median 16 p90 37) and `tgo-conversational` (casual, frank, 26/42/32 buckets, mean 20 median 19 p90 34) override when assigned via delegation packet `style`, explicit request (`use prose` / `use conversational` / `use default`), or orchestrator ask-when-ambiguous. Precedence: explicit request > packet assignment > default (`tgo-default`). Dylan self-classify survives only as fallback for unassigned creative-writing tasks. Off-switch is `style.enabled: false` or `stop X` / `normal mode`. Long sentences form via paratactic and-chains, not subordination depth. Paragraph-head discipline and one-device-per-sentence still apply. Shipped exemplars are embedded verbatim by shape (loader injects 1–2, never all). `tgo-default` stays exemplar-free. Old `register` is safely ignored. Config is `style.card` (`default` | `prose` | `conversational`).
- **Rule packs.** Drift families moved from hard-coded `drift.ts` into three JSON packs: `mechanics` (low-FP, always-on: spelling/caps/repetition plus mechanical paste-tells — unfilled placeholders, chat-citation markup, AI tracking params), `concision` (medium-FP, whitelist-gated: verbal false limbs, unnamed-authority, circumlocution swaps, corporate speak), `voice-cadence` (high-FP, cluster-judged: passive/hidden-actor, hedge stacks, novelty inflation, false balance, em-dash budgets, rule-of-three, synonym cycling). Cards declare `anti_patterns.refs` + `strictness` + numeric thresholds. Cadence suppression by `register=natural` is gone.
- **Findings-targeted nudges.** The generic `STYLE_NUDGE` is replaced by a revision instruction built from `DriftFinding` spans/evidence/family. It flags only the spans to fix and preserves code, numbers, and protected content. Flag-then-override applies: keep a flag only if no one-word override fits (`rhythm` / `emphasis` / `picture` / `idiom` / `joke`); otherwise apply the fix. Active on all cards (same spine, card-tuned selection).
- **Benchmark gates.** `plugin/benchmark/style-quality.ts` now checks card-aware regression gates against D9–D11 targets (sentence buckets ±5, mean/median/p90 ±2, max ≤60, em-dash, device-per-sentence, hedge, passive rate). Run `bun run benchmark/style-quality.ts --check` to fail on drift. `byCard` aggregates sit alongside `byMode` / `byTaskClass`.

0.3.1 (2026-08-31) moved Horowitz from `gpt-5.6-luna` (4× quota multiplier) to `qwen3.8-flash` (durable 2×, stronger practical coder, ~3× quota savings) with no behavior change. 0.3.0 was the governance release (version pinning, worktree lanes, exit gates, status taxonomy, wait gate, problems view, cost surface, typed manifests, convoys, recursion blocking, step replay).

## The roster

| Seat | What they’re good at |
|---|---|
| **Bernstein** | The primary. He plans, delegates, reconciles what came back, and verifies it against the exit gate. Scheduler, never a worker. |
| **Horowitz** | Review and strategic advisor. He reads what already exists and tells you what is true, then steps back. |
| **Nas** | Read-only recon — code search, web search, docs via context7, and cross-session recall. Findings come back as reports, never as committed artifacts. |
| **Dylan** | The sole writer. Code, technical docs, prose — if a file changes, Dylan changed it. He executes the spec as written; strategy stays with Bernstein. |
| **Nirvana** | The band. Three lenses and a synthesizer, no tools, convened when judgment is heavy or the path is ambiguous. |

For prompt anatomy, model routing, and Bernstein's full mandate, read `docs/ROSTER.md`.

## Configuration in one glance

If you configure the plugin, put options in the second element of the plugin tuple: `["trans-genderian-orchestra", { ... }]`.

| Option | What it does | Default |
|---|---|---|
| `preset` | Which seat→model map to use. `balanced` / `cheap` / `frontier`. | `balanced` |
| `style.card` | Voice card for Dylan’s output. `default` (always-on) is terse and scannable. `prose` and `conversational` are assigned via delegation packet, explicit request (`use prose` / `use conversational`), or ask-when-ambiguous. Precedence: explicit request > packet > default. Old `register` is ignored. | `default` |
| `presets` | Partial per-seat overrides on top of any preset. Data, not code — it tolerates model-name drift. | built-ins |
| `agentDir` | Where rendered seat prompts live. | `~/.config/opencode/agent` |
| `board` | `{ enabled, refreshMs }` — the read-only beads board and how often it re-derives. | `true`, `5000` |
| `style` | `{ card, enabled, reinforcement }` — the always-on style layer (default card plus optional named-card override) and an opt-in, once-per-attempt findings-targeted nudge. Inert by default without explicit context. Card `default` omits the id. | `default`, `true`, `false` |
| `setup` | `{ enabled, autoInstallBeads }` — the auto-init described above; disable it or ask it to report a missing `bd` instead of installing. | `true`, `true` |
| `checkVersion` | Whether to do the npm drift check on startup. | `true` |
| `sessionReuse` | `{ enabled, maxContextTokens }` — continues prior delegation sessions via task_id when the stored session is under the token budget. | `true`, 100000 |
| `termination` | `{ enabled }` — stops a delegated session after it declares STATUS: complete with its exit gate satisfied and then makes a residual tool call. | `true` |
| `selfUpdate` | `{ enabled }` — refreshes TGO's own plugin cache slot when a newer version is on npm; activates on next restart. | `true` |
| `watchdog` | `{ enabled, wallClockMs, idleMs, checkMs, stuckLoopTools, stuckLoopMs }` — aborts a delegated session that hung or went silent and asks Bernstein to re-dispatch. stuck-loop = <3 distinct tool signatures across the last 20 tools within 5m (read-only seats no longer false-trip). | `true`, 30m, 15m, 10s, stuckLoopTools 20, stuckLoopMs 5m |
| `runs` | `{ maxAgeMs, maxBytes, maxFiles, heartbeatThresholdMs }` — run-log retention bounds and the dead-heartbeat threshold for the problems view. | 7d, 50MB, 200, 5m |
| `metrics` | `{ enabled }` — the per-seat queue gauge and problems-view scan. | `true` |
| `recursion` | `{ enabled, maxDepth }` — delegation depth cap plus spawn-cycle detection. | `true`, 4 |
| `cost` | `{ enabled }` — the cost surface (per-seat model budget vs. spend) and quota-aware preset hints. | `true` |

The JSON schema is at `plugin/schema/tgo.config.schema.json`.

A human voice toggle also exists for docs. If you set `style.card: "prose"` / `"conversational"` or say `use prose` / `use conversational` in session, Dylan writes long-form with shipped exemplars. Set `use default` or `normal mode` to clear it. The 720-token `tgo-current` house style is gone. `tgo-default` is about 300–500 tokens at runtime plus ≤250 folded into seat prompts and is built for scanning. The toggle affects only Dylan prose. Other seats present the same either way.

## What the engine behind it actually needs

TGO keeps its dependency surface small and explicit. The installer checks each item and installs what is missing (`--deps auto | check | skip`):

- **beads** (`bd` CLI) — the work-unit store the board reads from. Bernstein is the intended single writer in the future. Today the board reads `bd list --all`, `bd ready`, and friends. Writes stay out of scope.
- **AFT** — symbol-aware code tools (`aft_*`, `ast_grep_*`). Dylan uses them daily.
- **magic-context** — quiet cross-session recall (`ctx_*`). The installer wires it end to end, including the historian on the active preset's Dylan model and the TUI sidebar.
- **context7** — the one external MCP for docs lookup (`context7_*`), given to Nas and Dylan.

Runtime ties are light: `@opencode-ai/plugin ~1.18.13`, `zod ^4.1.13`, `bun >= 1.0.0`.

## Permissions that actually enforce

These are not guidelines. Seat frontmatter carries a permission matrix and the host enforces it.

| Seat | Can use | Can’t use |
|---|---|---|
| **Bernstein** | `read`, `websearch`, `skill`; planned bash verification allowlist (`git diff`/`status`/`log`/`rev-parse*`, `bd *`, test runners); `task` → the four named seats | `edit`, `grep`, `glob`, `list`, general subagents |
| **Horowitz** | read-only git/log/process inspection; read-only `bd show`/`list`/`ready`/`search`; `task` → `explore` | `edit` and everything else |
| **Nas** | `read`, `grep`, `glob`, `list`, `websearch`, `webfetch`, `context7_*`, `ctx_*` | `edit`, `bash`, `task` |
| **Dylan** | `edit`, `bash`, `aft_*`, `ast_grep_*`, `context7_*`, `ctx_*`; `task` → `explore` — the only writer | `todowrite` and general subagents |
| **Nirvana + band** | `task` → its three band members only (cobain, grohl, novoselic) | everything else |

Globally, `todowrite` is denied for every seat (beads is the tracker), `subagent_depth: 2` caps delegation, and specialist seats carry a 20-step cap. That cap lets a long session return a usable partial report instead of an empty handoff. The full matrix is in `docs/spec/mcp-permissions.md`.

## Skills you get, and the ones it plays nicely with

TGO ships thirteen advisory skills with fifteen per-seat grants: wayfinder, grilling, to-tickets, bmad-build-auto, verification-planning, diagnosing-bugs, to-questionnaire, wizard, code-review, bmad-deep-recon, implement, tdd, receiving-code-review. Advisory means advisory: if a skill is missing, the plugin still runs. External suites from Matt Pocock, superpowers, and gsd are never disabled. When they are present, TGO enables its own grants for them. Coexistence story is in `docs/WORKS-WELL-WITH.md`.

## The house style, in plain language

Every seat shares one house style. Start with the action. Keep steps numbered and self-contained. Keep negations, numbers, and exact strings. Keep code changes small (YAGNI). Lead with the change, not the story of making it. The primary loop receives the instruction every turn. Subagent seats have it folded into prompts at build. A two-position dial is gone. Cards replace it: `tgo-default` always-on (300–500 tokens runtime plus ≤250 folded at build, single-sourced from `plugin/assets/voices/tgo-default.json` via `plugin/src/voices.ts` + `plugin/src/concision.ts`). Named cards `tgo-prose` and `tgo-conversational` layer on default when assigned (packet, explicit request, or ask-when-ambiguous; explicit > packet > default; `stop X` / `normal mode` off-switch; Dylan self-classify only for unassigned creative tasks). Drift is card-aware via three rule packs (`mechanics` always-on, `concision` whitelist-gated, `voice-cadence` cluster-judged). The findings-targeted nudge flags only the spans to fix with a one-word override (`rhythm`/`emphasis`/`picture`/`idiom`/`joke`). Mechanics and tell list are in `docs/CONCISION.md`.

## Deepwork when you ask for it

Autonomy is a mode, not the default. "Keep going" is opt-in and bounded: max phases, token budget, checkpoint rhythm, stagnation detection, three re-planning levels. If something irreversible, expensive, or direction-changing comes up, TGO pauses and asks.

## Where to read next

For the human-readable long form, read `docs/ARCHITECTURE.md` (shape and hooks), `docs/ROSTER.md` (the five seats), `docs/CONCISION.md` (house style), `docs/SETUP.md` (install and per-repo setup), `docs/CONTRIBUTING.md` (dev workflow), and `CHANGELOG.md` (release history). Canonical contracts stay under `docs/spec/`.

## Troubleshooting

### Updating TGO

**Automatic (default):** If npm has a newer version than the running one, TGO refreshes its own plugin cache slot in the background (`~/.cache/opencode/packages/trans-genderian-orchestra*` / `…@latest`) and logs `self-updated trans-genderian-orchestra to <version> — restart opencode to activate`. It never downgrades. To disable it, set `["trans-genderian-orchestra", { "selfUpdate": { "enabled": false } }]`.

**Fallback (stuck slot):** If the slot stays stuck, run `rm -rf ~/.cache/opencode/packages/trans-genderian-orchestra*` then restart opencode.

**Warning:** `opencode plugin trans-genderian-orchestra --force -g` is a **NO-OP** against exact-pinned cache slots. Root cause is tgo-6m6: the host's same-spec `opencode.jsonc` patch is deduped as no-op and the `Npm.add` existence fast-path never consults the registry, so the cached tarball is reused even when stale.

## Developing on TGO

```bash
bun install
bun run validate      # schema + presets + rendered seat-prompt budget
bun run build         # render seat prompts; --outDir <dir> to write to a folder
bun test              # budget + schema + build tests
bunx tsc --noEmit     # typecheck
bun run setup --configDir <dir>   # build + install (defaults to ~/.config/opencode/)
```

## License

MIT. Copyright (c) 2026 octini. See `LICENSE`.
