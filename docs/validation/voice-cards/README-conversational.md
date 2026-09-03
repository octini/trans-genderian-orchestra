# TGO — trans-genderian-orchestra

> Mirrored byte-for-byte in `plugin/README.md` (the npm readme) — edit one, copy to the other.

[![npm version](https://img.shields.io/badge/npm-0.4.0-ba0ce9e)](https://www.npmjs.com/package/trans-genderian-orchestra)
[![License: MIT](https://img.shields.io/badge/license-MIT-6a4c93)](LICENSE)
[![OpenCode 1.18.13](https://img.shields.io/badge/OpenCode-1.18.13-6a4c93)](https://opencode.ai)

Okay, so TGO is a thin orchestration plugin for [OpenCode](https://opencode.ai) that turns a single model call into a small, disciplined ensemble. You still talk to one person — Bernstein, the orchestrator — and he quietly hands work to the right specialist and brings the results back and checks them against the goal you actually set. It is less about adding magic and more about keeping good work from slipping through the cracks.

If you have watched a long agent session slowly drift — losing the plot and rewriting the same fix and marking itself done before the tests pass — you know the feeling and you have probably made a joke about it. TGO is the band that keeps tempo so the soloists can play. It does not play for them. It keeps time so they can.

## Why this shape

So I want to make the case for boring answers, because boring is the point here.

I know the popular position is that agent teams need more tools and more autonomy and more everything, and I have lived that position. I have watched a harness burn tokens like a space heater and call it architecture.

But here is what changed my mind. Anthropic's harness saw plain chat use roughly a fifteenth of the tokens a naive agent harness burned, and coordination can cost more than doing the work. In the MAST taxonomy — more than sixteen hundred traces across seven frameworks — about one in five failures came down to did we actually check that this worked. And roughly one in four agent interactions drifted from what was asked, and only a gate before the work starts keeps that from compounding.

Where else do we get a clean fix for that? TGO stays thin on purpose and the answers are deliberately boring and they hold.

- **Orchestration gets expensive.** Anthropic's harness saw plain chat use roughly a fifteenth of the tokens a naive agent harness burned, and coordination can cost more than doing the work. TGO stays thin on purpose: a small core, most state on disk, and seat prompts that stay comfortably under a thousand tokens (checked at build, at install, and again at load — `plugin/src/config.ts` caps them at 1,000).
- **Verification is where things break.** In the MAST taxonomy — more than sixteen hundred traces across seven frameworks — about one in five failures came down to "did we actually check that this worked?" TGO gives every piece of delegated work a clear, boolean exit gate, and it keeps the person who judges the work separate from the person who did it.
- **Misalignment sneaks in early.** Roughly one in four agent interactions drifted from what was asked, and only a gate before the work starts keeps that from compounding. TGO's permission graph makes those lanes real boundaries the host enforces, not polite suggestions in a prompt.
- **Doer and judger belong apart.** That separation showed up as the highest-leverage change in the literature, so the architecture builds it in: Dylan writes, Bernstein verifies, and Horowitz reviews.

You do not need to take any of this on faith and the trail is in `docs/research/architectural-review.md`, and you also do not need to believe a big token-savings headline. The style-quality benchmark in `docs/spec/style-quality-evaluation.md` is explicit about what it measures: proxy token counts (words plus a little punctuation math), proxy latency and cost, and deterministic surrogate edits, not billed provider usage. It reports cost per successful task as the real tradeoff, and it labels any vendor token-reduction claim as "external, not TGO" so it cannot be mistaken for a measurement. We would rather be clear than impressive. That part is not optional. Clear beats impressive every time, and we mean it.

## Quick start — from empty folder to working repo without a slash command

Okay, hard-boiled eggs, because mine came out perfect this morning and I want credit. Here is the whole method.

You only install the plugin once. After that every new folder takes care of itself the first time you actually ask for something.

**Step one — install it globally.** One command gives you both surfaces — the server-side board that lives in chat, and the TUI sidebar you see on the right. No second install to remember.

```bash
opencode plugin trans-genderian-orchestra -g
```

One npm package exposes both via dual-package exports since v0.1.5 (`exports "./server" → "./dist/server.js"` and `"./tui" → "./dist/tui.js"`; peers `solid-js`, `@opentui/solid`, `@opentui/core` are resolved by the host, not bundled). The board lives on the server (`experimental.chat.messages.transform` / `experimental.chat.system.transform` in `dist/server.js`); the sidebar lives on the TUI (`slots.register` at `order 450` in `tui.jsonc` — tucked between Todo at `400` and Modified Files at `500` — in `dist/tui.js`). The interactive sidebar itself landed in 0.1.6; 0.1.5 shipped the dual exports and a read-only `tgo_beads_snapshot` tool.

If you prefer to wire it by hand, this also works in `opencode.jsonc`:

```json
{ "plugin": ["trans-genderian-orchestra@0.4.0"] }
```

Restart opencode after it installs. That is the global layer done.

**Step two — let any empty folder become a repo.** You do not need a slash command, a template, or a setup wizard. OpenCode just needs a directory to live in, and your first real sentence does the rest.

```bash
mkdir ~/opencode/diceproject
cd ~/opencode/diceproject
opencode
```

That is it — an empty directory is enough. You could also have made that folder in Finder, or reused a cleaned-out directory you had emptied earlier; whatever created the empty folder, the next part is the same. Now talk to it like you would talk to a teammate:

> build me a simple D&D dice roller CLI — `dice 2d6+3` should roll two six-sided dice, add three, and print each die plus the total. keep it tiny, with a quick test I can run.

You did not run `/init` or `/tgo-setup` or anything like it. While Bernstein starts thinking through your request, TGO is already setting up the repo quietly in the background — creating `.beads/` (the work-unit store), initializing the git-backed pieces with `bd init`, running `bd setup opencode`, and merging that thin `AGENTS.md` advice fragment if it is not there yet. It is concurrent with the very first LLM turn, not something that happens at `opencode` launch, and it does not block your prompt. By the time you see a response, the folder is no longer empty. That part is not optional either. The setup has to win the race and it does.

**What "just worked" really was.** Under the hood TGO watches two moments: `session.created` for brand-new primary sessions (and yes, it treats both `parentID === null` and `parentID === undefined` as "primary" — that is the `parentID != null` guard at `plugin/src/plugin.ts:171`, which fixed the cases where the host left the field undefined) and, as a fallback, the very next `chat.message` if the session event was missed. The fallback also double-checks `parentID` through `client.session.get`, and it guards against the root directory (`"/"`), so a stray global session cannot try to init your home folder. Either path lands in the same `SetupController.maybeSetup` — and that controller remembers every directory it has already attempted in memory (`plugin/src/setup.ts`'s `attempted` set, set at the top of `maybeSetup` so concurrent LLM turns do not race), so you will not see it run twice for the same repo even if two messages arrive at once.

If you want the installer-from-source path instead, it still works:

```bash
git clone https://github.com/octini/trans-genderian-orchestra
bun install
bun run setup
```

That builds the seat prompts from templates, writes the global config fragment, auto-installs the engine dependencies (beads, AFT, magic-context, context7), and self-registers the plugin in both `opencode.jsonc` and `tui.jsonc`. A local-plugin path — symlinking `src/plugin.ts` into `~/.config/opencode/plugins/` — is also documented in `docs/SETUP.md`.

**You will know it worked** when that sidebar on the right lights up. Within about a second or two of the setup finishing — no manual `/bd-refresh` — you should see your beads appear. The TUI polls every 1.5 seconds (`POLL_MS 1500` in `plugin/src/sidebar/tui.tsx:20`) but it does not do it the wasteful way: it keeps a cheap signature of the `.beads` directory (`plugin/src/sidebar/bd.ts` walks `.beads` for the newest mtime plus entry count) and only re-reads when something actually changed. The fallback view even pulls `bd list --all` (`plugin/src/sidebar/scope.ts:93`) so in-progress work still shows up before an epic scope fully forms. If you pinned an epic with `/bd-focus`, you can clear it with `/bd-unfocus` and the panel goes back to following whatever bead was last touched.

**A small heads-up that is new in 0.2.1.** On startup TGO quietly compares your installed version (`plugin/package.json`) with what npm says is latest (`https://registry.npmjs.org/trans-genderian-orchestra/latest`). The logic lives in `plugin/src/version.ts` — `compareVersions` handles `v` prefixes and pre-releases, `fetchLatestVersion` gives npm three seconds before it gives up, and `checkVersionDrift` puts it together. If you are behind, you will see a gentle warning in the structured log (`client.app.log` with `service: "tgo"`): *"TGO update available: installed X < npm Y — self-update will refresh cache on restart; if slot stuck: rm -rf ~/.cache/opencode/packages/trans-genderian-orchestra* and restart (opencode plugin --force is a no-op against exact-pinned slots tgo-6m6)"*. It is on by default (`config.checkVersion` in `plugin/src/config.ts:80` defaults to `true`), but it never throws and never blocks startup — it is fire-and-forget, and you can turn it off with `"checkVersion": false` if you prefer.

Lean check, if you like receipts: `grep -c slots.register plugin/dist/server.js` should be `0` and `grep -c experimental.chat plugin/dist/tui.js` should be `0` — server has no TUI slots, TUI has no chat hooks. The build and CI enforce it (`plugin/src/build.ts`). That is the whole secret: cold start, hard stop, and a cheap signature. The sidebar comes on like it wants to.

## How it works day to day

So the session starts and you send a message and we have what I can only describe as a small, disciplined handoff.

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

Bernstein sketches the work as a dependency-ordered DAG, sends each piece out with a five-part spec (Objective / Files / Interfaces / Constraints / Verification), and waits for a structured report back (STATUS / CHANGES / VERIFIED / GAPS). The verification line is the promise you can hold him to — tests pass, lint clean, or the work is not closed. Specialists stay in their lane because the host makes them: Dylan is the only seat that can touch files, Nas never gets `bash` or `task` at all, Horowitz can read but not write, and Nirvana is tool-less by design.

The Background Job Board is the view that follows you through all of this. Each turn the plugin re-derives a short board snapshot from Beads — `bd list`, `bd ready`, `bd blocked`, `bd memories` when the host exposes them — and shares it with the model as context. It is read-only context, not a license to write. Creating, claiming, closing, reopening, or recovering beads outside that read path stays disabled until the host boundary for lifecycle writes is proven; the current plugin stays metadata-only there (`beadsLifecycle.allowed: false`).

- **Session reuse** — follow-up delegations continue the same subagent session (`task_id`) instead of spawning fresh; context-size guarded; state in `.tgo/sessions.json`.
- **Progress files** — per-issue `.tgo/<issueId>/progress.md` (Objective / Touch set / Decisions / Blockers / Status) written by Dylan, read by Bernstein/Horowitz; survives session end.
- **Termination conditions** — composable completion detection stops post-completion waffle and hands the report back.

I found the flashlight on the first try here, which has never happened and will not happen again, but the board staying in sync does happen every turn. And that is the part you can count on.

## What's new in 0.4.0

TGO 0.4.0 is the voice-cards release — it replaces the concise/natural register dial with selectable voice cards and card-aware style enforcement, grouped by shape:

- **Factory voices.** `tgo-default` is always-on for every seat; named cards `tgo-prose` (measured, image-led, 29/44/27 buckets, mean 19 median 16 p90 37) and `tgo-conversational` (casual, frank, 26/42/32 buckets, mean 20 median 19 p90 34) override when assigned via delegation packet `style`, explicit request (`use prose` / `use conversational` / `use default`), or orchestrator ask-when-ambiguous. Precedence: explicit request > packet assignment > default (`tgo-default`). Dylan self-classify survives only as fallback for unassigned creative-writing tasks. Off-switch is `style.enabled: false` or `stop X` / `normal mode`. Long sentences form via paratactic and-chains, not subordination depth; paragraph-head discipline and one-device-per-sentence still apply; shipped exemplars are embedded verbatim by shape (loader injects 1–2, never all); `tgo-default` stays exemplar-free. Old `register` is safely ignored; config is `style.card` (`default` | `prose` | `conversational`).
- **Rule packs.** Drift families moved from hard-coded `drift.ts` into three JSON packs: `mechanics` (low-FP, always-on: spelling/caps/repetition + mechanical paste-tells — unfilled placeholders, chat-citation markup, AI tracking params), `concision` (medium-FP, whitelist-gated: verbal false limbs, unnamed-authority, circumlocution swaps, corporate speak), `voice-cadence` (high-FP, cluster-judged: passive/hidden-actor, hedge stacks, novelty inflation, false balance, em-dash budgets, rule-of-three, synonym cycling). Cards declare `anti_patterns.refs` + `strictness` + numeric thresholds; cadence suppression by `register=natural` is gone.
- **Findings-targeted nudges.** The generic `STYLE_NUDGE` is replaced by a revision instruction built from `DriftFinding` spans/evidence/family — it flags only the spans to fix and preserves code, numbers, and protected content. Flag-then-override applies: keep a flag only if no one-word override fits (`rhythm` / `emphasis` / `picture` / `idiom` / `joke`); otherwise apply the fix. Active on all cards (same spine, card-tuned selection).
- **Benchmark gates.** `plugin/benchmark/style-quality.ts` now checks card-aware regression gates against D9–D11 targets (sentence buckets ±5, mean/median/p90 ±2, max ≤60, em-dash, device-per-sentence, hedge, passive rate); `bun run benchmark/style-quality.ts --check` fails on drift. `byCard` aggregates sit alongside `byMode` / `byTaskClass`.

0.3.1 (2026-08-31) moved Horowitz from `gpt-5.6-luna` (4× quota multiplier) to `qwen3.8-flash` (durable 2×, stronger practical coder, ~3× quota savings) with no behavior change; 0.3.0 was the governance release (version pinning, worktree lanes, exit gates, status taxonomy, wait gate, problems view, cost surface, typed manifests, convoys, recursion blocking, step replay).

Twelve additions from 0.3.0 and four new ones here and the job is the same. The promise holds.

## The roster

| Seat | What they are good at |
|---|---|
| **Bernstein** | The primary. He plans, delegates, reconciles what came back, and verifies it against the exit gate. Scheduler, never a worker. |
| **Horowitz** | Review and strategic advisor. He reads what already exists and tells you what is actually true, then steps back. |
| **Nas** | Read-only recon — code search, web search, docs via context7, and cross-session recall. Findings come back as reports, never as committed artifacts. |
| **Dylan** | The sole writer. Code, technical docs, prose — if a file changes, Dylan changed it. He executes the spec as written; strategy stays with Bernstein. |
| **Nirvana** | The band. Three lenses and a synthesizer, no tools, convened when judgment is heavy or the path is genuinely ambiguous. |

The longer version — prompt anatomy, model routing, and Bernstein's full mandate — is in `docs/ROSTER.md`.

You pick the seat and the lane is already there. You do not have to negotiate it.

## Configuration in one glance

Put options in the second element of the plugin tuple: `["trans-genderian-orchestra", { ... }]`.

| Option | What it does | Default |
|---|---|---|
| `preset` | Which seat→model map to use. `balanced` / `cheap` / `frontier`. | `balanced` |
| `style.card` | Voice card for Dylan's output. `default` (always-on) is terse and scannable; `prose` and `conversational` are assigned via delegation packet, explicit request (`use prose` / `use conversational`), or ask-when-ambiguous. Precedence: explicit request > packet > default. Old `register` is ignored. | `default` |
| `presets` | Partial per-seat overrides on top of any preset. Data, not code — it tolerates model-name drift. | built-ins |
| `agentDir` | Where rendered seat prompts live. | `~/.config/opencode/agent` |
| `board` | `{ enabled, refreshMs }` — the read-only beads board and how often it re-derives. | `true`, `5000` |
| `style` | `{ card, enabled, reinforcement }` — the always-on style layer (default card + optional named-card override) and an opt-in, once-per-attempt findings-targeted nudge. Inert by default without explicit context. Card `default` omits the id. | `default`, `true`, `false` |
| `setup` | `{ enabled, autoInstallBeads }` — the auto-init described above; disable it or ask it to report a missing `bd` instead of installing. | `true`, `true` |
| `checkVersion` | Whether to do that gentle npm drift check on startup. | `true` |
| `sessionReuse` | `{ enabled, maxContextTokens }` — continues prior delegation sessions via task_id when the stored session is under the token budget. | `true`, 100000 |
| `termination` | `{ enabled }` — stops a delegated session after it declares STATUS: complete with its exit gate satisfied and then makes a residual tool call. | `true` |
| `selfUpdate` | `{ enabled }` — refreshes TGO's own plugin cache slot when a newer version is on npm; activates on next restart. | `true` |
| `watchdog` | `{ enabled, wallClockMs, idleMs, checkMs, stuckLoopTools, stuckLoopMs }` — aborts a delegated session that is hung or gone silent and asks Bernstein to re-dispatch. stuck-loop = <3 distinct tool signatures across the last 20 tools within 5m (read-only seats no longer false-trip). | `true`, 30m, 15m, 10s, stuckLoopTools 20, stuckLoopMs 5m |
| `runs` | `{ maxAgeMs, maxBytes, maxFiles, heartbeatThresholdMs }` — run-log retention bounds and the dead-heartbeat threshold for the problems view. | 7d, 50MB, 200, 5m |
| `metrics` | `{ enabled }` — the per-seat queue gauge and problems-view scan. | `true` |
| `recursion` | `{ enabled, maxDepth }` — delegation depth cap plus spawn-cycle detection. | `true`, 4 |
| `cost` | `{ enabled }` — the cost surface (per-seat model budget vs. spend) and quota-aware preset hints. | `true` |

The JSON schema is at `plugin/schema/tgo.config.schema.json`.

There is also a human voice for the docs themselves. The shipped `tgo-prose` and `tgo-conversational` cards are the humanized voices — contractions are fine, examples are welcome, empathy leads — versus the `tgo-default` style (about 300–500 tokens at runtime plus ≤250 folded into seat prompts, built for scanning). Assign a card via `style.card: "prose"` / `"conversational"` or say `use prose` / `use conversational` in session; `use default` or `normal mode` clears it. The card only affects Dylan's voice; the other seats stay on default.

You set the card and Dylan answers in it. The other seats do not get a card at all.

## What the engine behind it actually needs

TGO keeps its dependency surface small and explicit. The installer checks for each of these and installs what is missing (`--deps auto | check | skip`):

- **beads** (`bd` CLI) — the work-unit store the board reads from. Bernstein is the intended single writer in the future; today the board reads `bd list --all`, `bd ready`, and friends, and writes stay out of scope.
- **AFT** — the symbol-aware code tools (`aft_*`, `ast_grep_*`). Dylan's day-to-day.
- **magic-context** — quiet, cross-session recall (`ctx_*`) that the installer wires end to end, including the historian on the active preset's Dylan model and the TUI sidebar.
- **context7** — the one external MCP for docs lookup (`context7_*`), given to Nas and Dylan.

Runtime ties are light: `@opencode-ai/plugin ~1.18.13`, `zod ^4.1.13`, and `bun >= 1.0.0`.

You bring those four and the rest is thin. That is the whole dependency story.

## Permissions that actually enforce

Not guidelines — the seat frontmatter carries a permission matrix the host enforces:

| Seat | Can use | Can't use |
|---|---|---|
| **Bernstein** | `read`, `websearch`, `skill`; planned bash verification allowlist (`git diff`/`status`/`log`/`rev-parse*`, `bd *`, test runners); `task` → the four named seats | `edit`, `grep`, `glob`, `list`, general subagents |
| **Horowitz** | read-only git/log/process inspection; read-only `bd show`/`list`/`ready`/`search`; `task` → `explore` | `edit` and everything else |
| **Nas** | `read`, `grep`, `glob`, `list`, `websearch`, `webfetch`, `context7_*`, `ctx_*` | `edit`, `bash`, `task` |
| **Dylan** | `edit`, `bash`, `aft_*`, `ast_grep_*`, `context7_*`, `ctx_*`; `task` → `explore` — the only writer | `todowrite` and general subagents |
| **Nirvana + band** | `task` → its three band members only (cobain, grohl, novoselic) | everything else |

Globally, `todowrite` is denied for every seat (beads is the tracker), `subagent_depth: 2` caps delegation, and the specialist seats carry a 20-step cap so a long session still returns a usable partial report instead of an empty handoff. The full matrix is in `docs/spec/mcp-permissions.md`.

You do not argue with the lane. You work inside it.

## Skills you get, and the ones it plays nicely with

TGO ships thirteen advisory skills with fifteen per-seat grants — wayfinder, grilling, to-tickets, bmad-build-auto, verification-planning, diagnosing-bugs, to-questionnaire, wizard, code-review, bmad-deep-recon, implement, tdd, and receiving-code-review. Advisory means advisory: if a skill is missing, the plugin still runs. External suites from Matt Pocock, superpowers, and gsd are never disabled; TGO enables its own grants for them when they are present. The coexistence story is in `docs/WORKS-WELL-WITH.md`.

Thirteen skills and none of them can block you. They are there if you want them.

## The house style, in plain language

Every seat shares one house style — the default card (`tgo-default`), always-on: start with the action, keep steps numbered and self-contained, never drop a negation, number, or exact string, keep code changes small (YAGNI), and lead with the change rather than the story of making it. It enforces a plain-language spine (ISO 24495-1 + Strunk & White), the banned-tell list judged by clusters (filler, AI-vocab, marketing adjectives, pomposities, adverbs, modal hedges, rule-of-three, `not X, it's Y`, synonym-cycling, passive with hidden actor, em-dash spam, chatbot closers, diff-anchored narration), STE thresholds (20 instruction / 25 descriptive), and preservation-first (never invent facts; code, numbers, and necessary explanations are protected). The primary loop gets the default card injected every turn (300–500 tokens via `plugin/src/voices.ts` + `plugin/src/concision.ts` single-sourced from `plugin/assets/voices/tgo-default.json`); subagent seats have it folded at build (≤250 tokens). Named voices are separate cards with shipped exemplars — `tgo-prose` (measured, image-led) and `tgo-conversational` (casual, frank) — layered on default when assigned (packet, explicit request, or ask-when-ambiguous; explicit > packet > default; `stop X` / `normal mode` off-switch; Dylan self-classify only for unassigned creative tasks). Drift is card-aware via three rule packs (`mechanics` always-on, `concision` whitelist-gated, `voice-cadence` cluster-judged), and the findings-targeted nudge flags only the spans to fix with a one-word override (`rhythm`/`emphasis`/`picture`/`idiom`/`joke`). The mechanics and the tell list are in `docs/CONCISION.md`.

You write small and you say what you changed. The style is not a mood, it is a constraint.

## Deepwork when you ask for it

Autonomy is a mode, not the default. "Keep going" is opt-in and bounded — max phases, a token budget, a checkpoint rhythm, stagnation detection, and three re-planning levels. When something irreversible, expensive, or direction-changing comes up, TGO pauses and asks.

You ask for deepwork and it stays inside the lines. You do not have to babysit it.

## Where to read next

For the human-readable long form: `docs/ARCHITECTURE.md` (shape and hooks), `docs/ROSTER.md` (the five seats), `docs/CONCISION.md` (the house style), `docs/SETUP.md` (install and per-repo setup), `docs/CONTRIBUTING.md` (dev workflow), and `CHANGELOG.md` (release history). The canonical contracts stay under `docs/spec/`.

If you want the long form, it is there and it is numbered. You can start anywhere.

## Troubleshooting

### Updating TGO

**Automatic (default):** when npm has a newer version than the running one, TGO refreshes its own plugin cache slot in the background (`~/.cache/opencode/packages/trans-genderian-orchestra*` / `…@latest`) and logs `self-updated trans-genderian-orchestra to <version> — restart opencode to activate`. Never downgrades. Disable with `["trans-genderian-orchestra", { "selfUpdate": { "enabled": false } }]`.

**Fallback (stuck slot):** `rm -rf ~/.cache/opencode/packages/trans-genderian-orchestra*` then restart opencode.

**Warning:** `opencode plugin trans-genderian-orchestra --force -g` is a **NO-OP** against exact-pinned cache slots — root cause tgo-6m6: the host's same-spec `opencode.jsonc` patch is deduped as a no-op and the `Npm.add` existence fast-path never consults the registry, so the cached tarball is reused even when stale.

If your slot is stuck, you clear the cache and you restart. That is the fix.

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

Old eggs peel easier than fresh ones, which is backwards, and nobody at the egg council will explain why.
