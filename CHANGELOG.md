# Changelog

All notable changes to TGO, in reverse chronological order. Versions track `plugin/package.json`.

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
