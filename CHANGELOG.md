# Changelog

All notable changes to TGO, in reverse chronological order. Versions track `plugin/package.json`.

## [0.4.1] - 2026-09-03

- **Docs-only release published to refresh the npm package page — no source changes (`plugin/src/**` and `plugin/dist/**` unchanged from 0.4.0):** living docs refreshed to the voice-cards model (README + plugin mirror, CONTEXT, CONCISION, ARCHITECTURE, ROSTER, SETUP, CONTRIBUTING now describe `style.card` / always-on default card / rule packs / findings-targeted nudges); four-voice README validation PoC added at `docs/validation/voice-cards/` (normal/default/conversational/prose, generated under byte-exact renderer payloads); npm version badge now dynamic (`img.shields.io/npm/v/...`) instead of hand-bumped.

## [0.4.0] - 2026-09-03

- **Factory writing styles (default / conversational / prose) replace the concise/natural register dial — default always-on, cards assigned by delegation packet, explicit request, or ask-when-ambiguous:** `tgo-default` always-on for every seat; named cards override when assigned via `DelegationPacket.style`, explicit user request (`use prose` / `use conversational` / `use default` + `stop X` / `normal mode` off-switch), or orchestrator suspend question when ambiguous. Precedence: explicit request > packet assignment > default. Dylan self-classify demoted to fallback for unassigned creative-writing tasks only. Config `register` → `style.card` (old key safely ignored).
- **Measured rhythm targets + verbatim calibration exemplars shipped inside card JSON:** `tgo-prose` ~29/44/27 (short 1–10w / medium 11–24w / long 25w+) mean ~19w median ~16 p90 ~37 max ≤60; `tgo-conversational` ~26/42/32 mean ~20w median 19 p90 34 max ≤60. Long via paratactic addition (and-chains of full clauses), not subordination depth; paragraph-head discipline (max one long opener before short landing; never two longs stacked); one device per sentence; exemplars embedded verbatim with shape tags (`scene-vignette` / `argument` / `instruction` / `narrative`), loader injects 1–2 by shape, never all.
- **Drift enforcement becomes card-aware via three loadable rule packs (mechanics always-on / concision whitelist / voice-cadence cluster-judged):** `mechanics` (low-FP: spelling/caps/repetition + mechanical paste-tells — unfilled placeholders, chat citation markup, AI tracking params) always-on; `concision` (medium-FP: verbal false limbs table, unnamed-authority patterns, circumlocution swaps, corporate speak) whitelist-gated; `voice-cadence` (high-FP: passive/hidden-actor, hedge stacks, novelty inflation, false balance, em-dash budgets, rule-of-three, synonym cycling) cluster-judged. Cards declare `anti_patterns.refs` + `strictness` + numeric thresholds; replaces `register=natural` suppression.
- **Generic style nudge replaced by findings-targeted revision instructions (flag-then-override):** `DriftFinding` spans/evidence/family built into `STYLE_NUDGE` replacement — a flag survives only if no one-word override reason applies (`rhythm` / `emphasis` / `picture` / `idiom` / `joke`). Active on all cards (same spine, card-tuned selection).
- **Benchmark gains card-aware regression gates (`--check`):** `plugin/benchmark/style-quality.ts` extended with numeric regression gates against D9–D11 targets (sentence buckets, mean/median/p90/max, em-dash, device-per-sentence, hedge budgets, passive rate); `bun run benchmark/style-quality.ts --check` fails on drift.
- **Assets + schema:** `plugin/assets/voices/{tgo-default,tgo-prose,tgo-conversational}.json` + `plugin/schema/voice-card.schema.json` + `plugin/assets/rule-packs/{mechanics,concision,voice-cadence}.json` + `plugin/schema/rule-pack.schema.json`; `plugin/src/voices.ts` loader + `plugin/src/drift.ts` pack-gated; `plugin/src/validate.ts` parity extended; `.gitignore` `*.rtf` (human calibration corpus never ships); `plugin/src/build.ts` + `plugin/src/concision.ts` single-source from default card; `plugin/src/style-reinforcement.ts` card-aware.
- **Gates:** `bun run validate` PASSED, `bunx tsc --noEmit` clean, `bun test` 1004 pass / 0 fail, `bun run src/build.ts` Lean ok.

## [0.3.1] - 2026-08-31

- **Balanced Horowitz → Qwen3.8 Flash:** the review seat moved off `gpt-5.6-luna` (Usage $15 → 4× quota multiplier) to `qwen3.8-flash` (Usage $30 → durable 2×), after post-0.1.12 usage analysis showed Horowitz — not Bernstein — consumed ~75% of the weekly quota (Luna `$4.51` raw × 4× vs Muse Spark's 1×). Qwen3.8 Flash is the strongest practical coder on Lending Desk Bench (89.6 No-Skills; forms/mutations 89 vs Luna 44/33) with cheaper cache-read/write and output rates, cutting Horowitz's quota footprint ~3×. Trade-off: weaker "process closeout" (33) — mitigated by the reviewer's tight-verdict prompt. Other presets unchanged. Updated `plugin/assets/presets.json`, `plugin/test/presets.test.ts`, `docs/ROSTER.md`, `docs/spec/roster.md`, `CONTEXT.md:63`.
- **Gates:** `bun run validate`, `bunx tsc --noEmit`, `bun test`, `bun run src/build.ts` Lean ok.

## [0.3.0] - 2026-08-31

The governance release — twelve features that close the loop between "work handed out" and "work actually correct."

**Trust the handoff.**
- **Version pinning (tgo-5t1):** each delegation snapshots its five-part definition (prompt/preset/seat-frontmatter hash) at dispatch; a `[pinned vN]` board badge marks work whose instructions outlived a definition change; `useLatestDefinitions` opt-out.
- **Worktree lanes (tgo-bh0):** delegated writers run in an isolated git worktree and are blocked outside it — realpath-based symlink-escape detection, `git worktree list --porcelain` validation, multi-edit all-path checks, lifecycle hygiene.

**Check the work.**
- **Exit gates (tgo-z8s):** deterministic checks (delta-spec, triage, trajectory scorer + blacklist) run before a task closes; a critical finding blocks the close with `GATE_BLOCKED_CRITICAL` and suggests a compensation ticket (`discovered-from` link).
- **Status taxonomy (tgo-9kk):** outcomes are `complete`/`bail`/`failed`/`tripwire`, each mapped to a recovery action (`retry`/`reroute`/`escalate`/`user-clarification`/`abandon`/`fix-plan`) with a `STATUS` vs `TASK_STATUS` contradiction diagnostic.

**Wait correctly.**
- **Wait gate (tgo-esy):** a task can suspend with a typed request (`suspendSchema`/`resumeSchema`); the human's prose reply is validated against the requested shape before the task wakes; cross-session single-match resume; expiry scan on next launch (no daemon).

**See the system.**
- **Problems view (tgo-2ry):** append-only `.tgo/runs/<runId>.jsonl` snapshots; dead-heartbeat/aborted/awaiting detection; a per-seat queue gauge with growth warning.
- **Cost surface (tgo-5em):** per-seat model budget vs. spend, quota-aware preset recommendation when the queue backs up (downgrade-only advisory).

**Plan and land.**
- **Typed manifests (tgo-dw5):** `.tgo/manifest.json` declares each bead's scope; plan-time same-parallel-set overlap rejection, completion-time touch-set verification (run-log derived), scope-scoped message filtering, mtime cache.
- **Convoys (tgo-4wq):** work grouped into waves lands in defined order via `.tgo/convoy/.state.json` (scopeHash re-validation, per-task gate check, ordered merge).

**Contain the chaos.**
- **Recursion blocking (tgo-wpl):** delegation depth cap + spawn-cycle detection.
- **Step replay (tgo-ccl):** Horowitz re-watches a recorded step (`replay <runId> step <N>`) without re-running the pipeline; definition-drift pre-flight.

**Also:** sidebar closed-issue filter (`N closed hidden`, tgo-a9i); integration smoke harness (`test/smoke.test.ts`, tgo-4qw); fusion sidekick spike discarded (conditional-go unmet — no frontier-preset cost proof). Config keys added: `runs`, `metrics`, `recursion`, `cost`.

## [0.2.2] - 2026-08-28

- **Seat frontmatter reconciliation at plugin load (tgo-v2e):** rendered-seat diff against installed agents via shared `resolveAgentsDir`, atomic backup-safe writes (`.bak` + tmp+rename); fixes silently-stale `steps`/`permission` caps on existing installs where self-update swapped the slot but seat files retained old frontmatter (191811a, 00affad).
- **Silent-failure logging (tgo-73s):** threaded `safeWarn`/`safeLog` through ~12 fire-and-forget catches (self-update, seat sync, board, watchdog, setup, progress) so swallowed errors surface via `client.app.log` instead of vanishing.
- **Setup retry + single-flight dedup:** `setup.ts` retry with backoff for transient `bd`/`opencode` bootstrap failures; in-flight single-flight dedup prevents concurrent setup races from double-initializing.
- **Board render memoization (N+1 fix):** bounded cache (cap 32) with single-flight coalescing and explicit `reset`/`invalidate` clearing; eliminates per-message re-render of the beads board.
- **Watchdog toolSignature hashing:** FNV-1a full-arg hashing replaces `>200-char` truncation — fixes false stuck-loop aborts when distinct long args collided on prefix.
- **Delegation progressPath hardening:** charset aligned with `VALID_BEAD_ID` (accepts dots/underscores, blocks traversal) for per-issue `.tgo/<id>/progress.md` paths.
- **version.ts build-metadata strip:** `compareVersions` strips `+build` metadata before semver compare so `0.2.2+build` equals `0.2.2`.
- **Docs version drift + Troubleshooting rewrite:** version references reconciled; Troubleshooting rewritten with self-update as primary repair path and `opencode plugin --force` documented as no-op (tgo-6m6).
- **New test suites:** version, self-update edges, install helpers, seat-sync (570 pass / 0 fail across 36 files at release).

## [0.2.1] - 2026-08-28

- **Self-update on drift (tgo-5yu):** when npm's latest published version is newer than the running one, TGO refreshes its own plugin cache slot (`~/.cache/opencode/packages/<name>@latest`) in the background and logs `self-updated ... — restart opencode to activate`. Never downgrades; silent skip when offline; disable with `selfUpdate.enabled: false`. Works around the OpenCode `plugin --force` no-op (tgo-6m6 root cause: same-spec config patch noop + `Npm.add` existence fast-path).

## [0.2.0] - 2026-08-28

- **Steps + watchdog retune (tgo-6fv):** seat steps caps raised — Dylan 100, Nas 60, Horowitz 40 (were 20); `watchdog.wallClockMs` 20m → 30m.
- **Session reuse (tgo-1pv):** follow-up delegations can continue the same subagent session via `task_id`; `.tgo/sessions.json` issue→session map, capability probe (v1/v2), context-size reuse guard (`sessionReuse.maxContextTokens`, default 100000), board hints.
- **Progress files (tgo-30d):** per-issue `.tgo/<issueId>/progress.md` (Objective / Touch set / Decisions / Blockers / Status) written by Dylan, read by Bernstein/Horowitz; owner-token lock, atomic writes; survives session end (built-in compaction is off under Magic Context).
- **Fresh-vs-continue policy (tgo-8k7):** Bernstein lane-card rule — continue via `taskId` when the board shows a reusable session; start fresh on new issue, material touch-set change, or context loss.
- **Abort handback (tgo-ywp):** watchdog aborts append a blocker line to the issue's progress file (session→issue reverse lookup with delegation-prompt fallback) so re-dispatches resume cleanly.
- **Termination conditions (tgo-dho):** composable completion detection — a delegated session that declares `STATUS: complete` with its exit gate satisfied and then makes a residual tool call is stopped and its report forwarded to the parent (`termination.enabled`).
- **Stuck-loop redesign (tgo-b71):** distinct-signature window (<3 distinct tool signatures across the last 20 tools within 5m) replaces since-last-edit counting — read-only review/research lanes no longer false-trip; edit tools clear the window.
- **Docs:** README/SETUP quick-start verb fixed (`opencode plugin <name> -g` — there is no `add` verb), config tables updated (sessionReuse/termination/watchdog), schema parity for new config blocks.

## [0.1.12] - 2026-08-27

- **Ox Alpha withdrawal reconfiguration:** the dead `ox-alpha-free` seat model (revealed as GLM-5.3-Flash at higher cost/quota) removed from all presets. Balanced — Bernstein/Nirvana → `glm-5.3-flash` (max, best Go-fit agentic), Horowitz → `gpt-5.6-luna` (max, best Go-fit coder), Dylan/Nas/band-members → `muse-spark-1.2-contributor` (xhigh). Cheap — Muse Spark (xhigh) on every seat. Frontier (light month) — Bernstein → `glm-5.3` (max), Horowitz → `kimi-k3` (max), Nirvana → `grok-4.6` (xhigh), workhorses → Muse Spark (xhigh). All balanced/cheap seats fit their Go request caps; frontier caps are tight (Grok 4.6 845 / Kimi K3 490 / GLM-5.3 1,080 req/mo). Variant support verified in `~/.cache/opencode/models.json`: Muse Spark and Grok 4.6 top out at `xhigh` (no `max`); the rest support `max`. Updated `plugin/assets/presets.json`, `plugin/test/presets.test.ts`, `docs/spec/roster.md`, `docs/ROSTER.md`, `CONTEXT.md:63`.

## [0.1.11] - 2026-08-24

- **Safe plugin entry exports:** the entry module no longer exports internal helpers — fixes the host legacy loader invoking `evaluateClosure` as a factory (`failed to load plugin` on ~25% of runs) (e21270a, tgo-6tq).
- **Beads sidebar resilience:** the Beads TUI panel shows an explicit error state instead of vanishing, retries with backoff after `bd` failures, and logs the resolved worktree at init under `BEADS_SIDEBAR_DEBUG` (a63a724, tgo-hv6).
- **Gates:** `bunx tsc --noEmit`, `bun run src/build.ts` Lean ok, `bun test` 378 pass.

## [0.1.10] - 2026-08-22

- **Unified presets:** cheap+balanced unified on `opencode-go/ox-alpha-free` max (all six seats); frontier `opencode-go/kimi-k3` max on bernstein/horowitz/nirvana, `opencode-go/ox-alpha-free` max elsewhere (nas/dylan/band-members). Verified `ox-alpha-free` supports `low/high/max`, `kimi-k3` supports `max`. Preset unification landed in 25787a9 (`plugin/assets/presets.json`, `docs/spec/roster.md`, `docs/ROSTER.md`, `CONTEXT.md:63`, `plugin/test/presets.test.ts` — tgo-5ga).
- **Gates:** `bunx tsc --noEmit`, `bun run src/build.ts` Lean ok, `bun test` 373 pass.

## [0.1.9] - 2026-08-20

- **Prose auto-init:** `Bernstein.wireProseAndBeads(nudge: string)` now auto-runs pending repo-bootstrap idempotently before existing preset/deepwork routing in `plugin/src/plugin.ts:35` (guards `ctx:"prose"`, empty/whitespace nudges, and `!prompt.text.includes("tgo")`). `install.ts:67` remains the only blocking `bd init` path — prose path is unawaited try/catch with 3 province logs `auto-init:start/ok/skip/err`.
- **Sidebar scope shortcut:** `scope.ts:61` `canonicalizeIssueFilter: --all → ""` (pre-alias) + `getSidebarScope(allFlag) → "all" | "mine" | null` hit early on `argsBeadId|allFlag` input (no beads invocation) — 1 pass-through, 2 all-alias resolutions, 1 compile gate. `/tgo --all` and `/beads --all` (plugin.ts:148 via `extractSidebarScopeFromText(rawNudge)`, TUI `tui-plugin.ts:244` via `ctx.command.args`) return all scopes; added `plugin/test/scope.test.ts` (26 cases, 1626 total) alongside retained `plugin/test/setup.test.ts` (7 persisted).
- **Humanized docs:** `README.md:24` `docs/SETUP.md:10,92,253,286` `docs/spec/setup.md:13,109,275` humanized via surgical micro-edits — preserved all functional lines (`README` no-op, install list trimmed `2: 2 deps` with `magic-context` promoted to first, `setup.md` maintainer note 3 collapses → 2, spec reconciled `TODO` (bring-your-own) + bootstrap variant + skipped tests + precedence without adding new features.
- **Gates:** `bunx tsc --noEmit`, `bun run src/build.ts` Lean ok, `bun test` 1626+ pass.

## [0.1.8] - 2026-08-20

- **Version-drift warning:** startup fetch of `https://registry.npmjs.org/trans-genderian-orchestra/latest` vs local `plugin/package.json:3` via `plugin/src/version.ts:compareVersions`/`readLocalVersion`/`fetchLatestVersion`; `client.app.log` warn `installed < npm — run: opencode plugin trans-genderian-orchestra --force -g and restart` when `compareVersions < 0`. Behind `config.checkVersion` (`plugin/src/config.ts:83` default `true`, no auto-write); fire-and-forget with 3s abort timeout, never throws (plugin load stays non-fatal).
- **Schema parity:** `plugin/schema/tgo.config.schema.json` adds `checkVersion` (boolean, default true) and missing `watchdog.stuckLoopTools`/`stuckLoopMs` to match `tgoConfigSchema` — `bun run src/validate.ts` PASSED.
- **Gates:** `bunx tsc --noEmit`, `bun run src/build.ts` Lean ok, `bun test` 370 pass.

## [0.1.7] - 2026-08-20

- **Preset create-missing-agent:** `applyPreset` now creates missing seat agents instead of skipping silent drift; missing preset seats logged via `app.log`.
- **Watchdog stuck-loop detector:** `stuckLoopTools` (20) / `stuckLoopMs` (5m) in `tgoConfigSchema` + `plugin/src/watchdog.ts` — aborts delegated sessions that loop on tool calls without progress and injects `WATCHDOG-ABORT` for parent re-dispatch.
- **Gates:** `bunx tsc --noEmit`, `bun run src/build.ts` Lean ok, `bun test` pass.

## [0.1.6] - 2026-08-20

- **Vendored Beads sidebar:** vendored `nycdubliner/opencode-beads-sidebar` MIT (~950 LOC) into TGO as `plugin/src/sidebar/*` + `plugin/src/tui-plugin.ts`; dual-package single-install `exports "./server" → "./dist/server.js"` + `"./tui" → "./dist/tui.js"` with shared peer externals (`solid-js`, `@opentui/solid`, `@opentui/core`, `@opencode-ai/plugin`).
- **Sidebar UX:** Beads TUI sidebar at `order 450` (between Todo `400` and Modified Files `500`) via `slots.register` with glyphs, poll 1.5s (`.beads/last-touched` mtime), collapse 2, header pct; graceful empty/ENOENT states + `BEADS_SIDEBAR_DEBUG` sink.
- **Palette + slash commands:** 6 commands `beads.focus`/`beads.unfocus`/`beads.start`/`beads.close`/`beads.reopen`/`beads.refresh` via `registerLayer` + `kv` focus pin per `sessionID` + `VALID_BEAD_ID` guard (anchored, leading-char restricted, no option injection).
- **Lean 0 tokens:** server 0 `slots.register` startup, TUI 0 `experimental.chat` per-turn — `grep -c slots.register plugin/dist/server.js ==0` + `grep -c experimental.chat plugin/dist/tui.js ==0` validated by `plugin/src/build.ts` and CI (`plugin/dist/server.js` + `plugin/dist/tui.js` separate bundles).
- **Docs single-install:** `opencode plugin add trans-genderian-orchestra` covers both surfaces (server board + TUI sidebar); `README`/`plugin/README` badge `npm-0.1.6` + `plugin` array `trans-genderian-orchestra@0.1.6`.
- **Gates:** `bunx tsc --noEmit`, `bun run src/build.ts` Lean check ok, `bun test` pass.

## [0.1.5] - 2026-08-19

- **Renderer-only Beads snapshot:** added the `tgo_beads_snapshot` OpenCode tool, rendering ready, open, pending, in_progress, and blocked work in a table with assignees, priorities, and dependency edges.
- **Primary-session gate:** the tool runs only in the explicit primary session.
- **Read handling:** malformed, empty, and unavailable Beads responses render explicit snapshot states; the tool is read-only and performs no lifecycle writes.
- **Gates:** 368 tests, TypeScript typecheck, validation, and build gates pass.

## [0.1.4] - 2026-08-19

- **5-way ablation benchmark:** variants none(0)/tgo-small(85)/tgo-current(720)/tgo-ste-selective(580)/tgo-large(6680), 10 fixtures (terse-qa + orchestration + tool-heavy + voice-forward), 50 cases with input/cached/output/retries/delegation/latency/cost/costPerSuccessfulTask (proxy), drift/preservation/requiredClaim/taskSuccess, externalClaims vendor-not-TGO, limitations documented, no auto-adoption, cost per successful task primary tradeoff, no hard 20/25 cap (STE soft metric-only for tool-heavy)
- **Lifecycle claim semantics:** forgeable `issueClaimed` → observed `issueStatusObserved:in_progress` + `issueAssigneeObserved` + `claimExitCode:0`, 8 disposable `bd` probes (happy claim, forged rejection, observed pass, missing/double-claim, 3× reopen: closed→open, active demotes to open, missing exit1, plus `bd -C` unsupported)
- **Failed-gate recovery:** 5-row table (failed verification / active / missing / watchdog-abort / tiny) with `canClose:false` + `recovery: retry/reroute/escalate/user-clarification`, docs state `active≠reopen`, `recovery create --deps discovered-from` disabled (`allowed:false`)
- **Docs audit:** 14 docs now state `bd init --directory unsupported; bd -C fails; must use .cwd(directory); host-mediated lifecycle validation remains future work` + `Board reads do not authorize lifecycle actions; ... allowed:false` + `tgo-3id` separation + CHANGELOG 0.1.0 qualification + `CONTEXT.md` single-writer future intent
- **Routing:** one-shot tiny/standard/heavy intent, preset mapping, docs/tests only, no delegation/closure enforcement
- **Report parser:** deterministic `parseTaskReport` with `WATCHDOG-ABORT` → `reroute`, `blocked/escalate` → `escalate`, GAPS clarification → `user-clarification` else `retry`, no `bd` calls
- **Gates:** `bun test` 360 pass 0 fail 1882 expects, `bunx tsc --noEmit -p plugin/tsconfig.json` clean, `bun run --cwd plugin validate` PASSED

## 0.1.3 — 2026-08-16

- **Changed:** the balanced preset routes every seat through `github-copilot/gpt-5.6-luna` with role-specific reasoning variants.
- **Changed:** the Magic Context Historian now uses `github-copilot/gpt-5.6-luna` at medium reasoning effort in the local user configuration.

## 0.1.2 — 2026-08-12

Docs-only release: the npm package page now carries the full documentation suite (README rewrite, docs/ pages, LICENSE, CHANGELOG). No code changes.

## 0.1.1 — 2026-08-12

- **Fixed:** the magic-context background historian now defaults to the active preset's Dylan model — the volume seat — instead of inheriting a judgment seat's model. The historian stays on the cheap workhorse rather than the expensive seats, and the volume seat's model is the one that matches actual context usage. (`09141ee`, released by `b2fba44`)

## 0.1.0 — 2026-08-12

Initial release. The scaffolded plugin, its config assets, and everything that made the shape real:

- **Thin core, four core hooks plus observer.** Background Job Board injection (`experimental.chat.messages.transform`), session reconciliation (`session.status`/`idle`), task-fit rejection normalization (`tool.execute.after`), and the always-on concision transform (`experimental.chat.system.transform`), plus an opt-in `experimental.text.complete` observer for surrogate-only style reinforcement. Watchdog and load-time config paths are supporting lifecycle code.
- **Opt-in completion observer.** Surrogate-only style reinforcement is default-inert; the observer has no production context or response lineage and keeps state only in memory for the controller instance.
- **The roster.** Five build-generated seats (Bernstein, Horowitz, Nas, Dylan, Nirvana + band members) with the 4-block prompt anatomy, the house-style fold, and the register dial. The Nirvana band wired end to end.
- **Beads-native work tracking (initial intent for 0.1.0). Current plugin host validates metadata only per docs/spec/beads-integration.md; lifecycle writes (create/claim/close/reopen/recovery) remain disabled/unproven — see that spec for host limitation.**
- **Capabilities, not compliance.** Per-seat permission graph in seat frontmatter, global `todowrite` deny, `subagent_depth: 2`, step caps on the specialist seats, and the verification/read-only bash allowlists.
- **Presets.** balanced / cheap / frontier seat→model maps, applied at plugin load, switched at runtime by prose nudge, with partial overrides supported.
- **Deepwork mode.** Opt-in autonomous loop with hard bounds, checkpoint protocol, stagnation detection, and light/medium/heavy re-planning.
- **Installer.** Self-registers the plugin in `opencode.jsonc`; auto-installs beads, AFT, magic-context, and context7; configures magic-context end to end (historian + TUI sidebar); registers context7 as a hosted remote MCP; writes the background-subagents env export to the shell profile; merges existing config JSONC-tolerantly with a `.bak` backup.
- **Per-repo setup.** Auto-triggered on first session (beads init → `bd setup opencode` → AGENTS fragment), idempotent, no-clobber, zero user input.
- **Delegation watchdog.** Aborts hung or stalled delegated sessions and injects a WATCHDOG-ABORT marker into the parent; sleep-aware, background-tool exempt, progress-aware wall clock.
- **Skills.** The 13-skill advisory bundle with 15 per-seat grants.
- **Concision.** Enriched scrub list with concrete tell vocabulary, the no-fabrication rule, the clusters guard, and drift-protection tests; the wait-what ubiquitous-language fold; the prompt budget raised to 1000 tokens; balanced judgment seats moved to the updated V4 Pro.

## Related

- Spec docs: `docs/spec/` (canonical)
- Human pages: `docs/ARCHITECTURE.md`, `docs/ROSTER.md`, `docs/CONCISION.md`, `docs/SETUP.md`, `docs/WORKS-WELL-WITH.md`, `docs/CONTRIBUTING.md`
