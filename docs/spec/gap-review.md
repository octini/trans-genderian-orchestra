# Pre-build Gap Review — TGO

Status: review in progress. Scope: enumerate every unresolved detail in the spec package, tag each **D = decision-shaped** (resolvable now, by choice) or **X = discovery-shaped** (empirically gated on the opencode SDK / build experience — the first build slices find the answer). Decision-shaped items get resolved before build. Source of truth for resolutions: `docs/wayfinder/decisions.md`. Ticket: `tgo-96f.15`.

---

## G1. Skill catalog (D) — the big one

The 6 selection criteria exist; the actual **per-seat skill list does not**. The inventory (`docs/research/skill-sources-inventory.md`) offers strong candidates. Not chosen: which skills ship, adapted for which seat, at what pruned token budget.

Candidates by seat (from the inventory's quick-reference):
- **Bernstein:** grilling, to-tickets, bmad-spec (living spec), bmad-build-auto (machine status), gsd-autonomous, oh-my-opencode-slim deepwork, ruflo goal-plan, verification-planning.
- **Horowitz:** Matt code-review (2-axis), bmad-review (5 lenses), superpowers verification-before-completion, bmad-code-review/correct-course.
- **Nas:** bmad-deep-recon, ruflo deep-research/dossier-collect, gsd research module, codemap, clonedeps.
- **Dylan:** Matt implement + tdd, superpowers subagent-driven-development, writing-plans, executing-plans, systematic-debugging.
- **Nirvana:** bmad-review lenses, gsd verification/gates, superpowers verification-before-completion.
- **memory/context:** handoff, reflect (slim), magic-context ctx_memory/ctx_search (via grant, not skill).

---

## G2. Concrete MCP/permission inventory (D)

AFT + magic-context pinned; everything else deferred. Named-but-unpinned: `context7` (Nas), "review skill" (Horowitz). Needs a yes/no/which per candidate: context7, gh_grep, bmad MemPalace MCP, gsd MemPalace MCP, oh-my-pi memory tools. Skills-over-MCPs applies (if a skill covers it, no MCP).

---

## G3. Model assignment for presets (D, partly user knowledge)

Three presets (balanced/cheap/frontier) exist but **no concrete model names** per seat per preset. Requires user input on what models are available/wanted. Seats: Bernstein, Horowitz, Nas (cheap flash), Dylan (writing-capable), Nirvana synthesizer.

---

## G4. What actually gets sent on delegation (X)

Five-part Spec is the *content* contract. The *mechanics*: how the spec is passed into `task()`, whether the specialist sees the orchestrator's prior turns, how much session context (if any) is forwarded, whether the Background Job Board snapshot goes with it. Empirically determined in build (tgo-96f.1 spike + tgo-96f.5).

---

## G5. Specialist session lifecycle / reuse (X)

Are subagent sessions **reused or spawned fresh per delegation**? How many tasks per session? Does Bernstein decide when to spawn? opencode's subagent/background-subagent semantics decide this. Empirically determined in build (tgo-96f.1 spike).

---

## G6. Job-board injection details (X)

Format (sentinel-tagged snapshot), placement (system reminder), strip-and-replace cache-safety, frequency (every turn?), what subset of beads state renders. The fork's mechanics (verified) are the reference, but TGO's renderer format is its own. Build-determined (tgo-96f.5).

---

## G7. Hook wiring details (X)

`messages.transform` vs `chat.message` for the board; `session.status`/idle exact events; `tool.execute.after` shape for task-fit. Which hooks exist in this opencode version and their exact signatures. Build-determined (tgo-96f.1 spike, tgo-96f.5/6/7).

---

## G8. Band firing mechanics (X)

How "orchestrator judgment" triggers band at the mechanical level; whether Nirvana is a registered subagent or spawned ad hoc; parallel `task()` fan-out shape. Contract specified; mechanics build-determined (tgo-96f.10).

---

## G9. Reflect-loop mechanics (X, partly D)

Tiers specified. Mechanics (how auto-file writes skills/`bd remember`, how human-verify checkpoint presents) are build-determined. One D sub-item: **the housekeeping cadence** — when does Bernstein run `bd admin compact`? (Folded into G3-style decision? No — this is a runtime policy, resolvable now.) Mark: partially D — resolve cadence now, mechanics in build.

---

## G10. Setup auto-trigger scope (X, partly D)

Mechanism (session-start hook, marker file, no-clobber merge) is build-determined. D sub-item: **exact AGENTS.md merge content** — TGO's thin fragment vs official `bd setup opencode` block vs existing content. Resolvable now.

---

## G11. Packaging/shipping details (D)

npm package name, versioning scheme, publish target, `~/.config/opencode/` install layout, config schema shape. Partly D (name, layout) — the user should name TGO's package. Partly X (schema shape follows SDK). Note: `trans-genderian-orchestra` is the working title; npm name may differ.

---

## G12. Presets application point (D)

"Applied at delegation boundaries, never mid-task" is specified. D sub-item: **how the user switches presets at runtime** (prose nudge? config edit? per-session?). Small decision, resolvable now.

---

## G13. Checkpoint protocol presentation (X, partly D)

Pause-list specified. Mechanics (how `## CHECKPOINT REACHED` pauses a background loop, how resume works) build-determined. D sub-item: **default auto-approve for routine work** — confirm the baseline posture (routine auto-approved, listed categories checkpoint).

---

## G14. Bernstein's "direct work boundary" enforcement edge (D)

Spec says Bernstein never does the doing. D sub-item: **what counts as doing** when verification requires it (e.g., Bernstein runs `git diff`/lint/test — allowed) vs. what's strictly delegated (any edit → Dylan). Mostly settled by the permission matrix; confirm the boundary for **small edits** (does Bernstein ever ask for a one-line fix, or always spin Dylan?).

---

## G15. Nirvana's model + temperature (D)

Synthesizer = strongest model, low temp. D sub-item: **which model** (ties to G3) and **exact temperature**. Small, resolvable with G3.

---

## G16. Band output persistence (D)

Nirvana is ephemeral (no beads issues). D sub-item: **where the Band Response lands** if it's not a beads issue — chat only? a file? both? Resolvable now.

---

## G17. Depth/width of delegation tree (D)

`subagent_depth: 2` fixed. D sub-item: **how many parallel specialists in a wave** (DAG+wave says "same-level dispatch together") — is there a cap? E.g., max 3-4 concurrent Dylan lanes + worktree limit. Resolvable now (worktree lanes already say Dylan ×2+).

---

## Summary table

| ID | Item | Tag | Resolve now? | Status |
|---|---|---|---|---|
| G1 | Skill catalog | D | YES | **RESOLVED** (13 skills/15 grants — skill-candidates.md FINAL BUNDLE, amended 2026-08-06) |
| G2 | MCP/permission inventory | D | YES | **RESOLVED** (context7 for Nas+Dylan, rest lose — below) |
| G3 | Model assignment | D (needs user) | YES | **RESOLVED** (3 presets, DS4 Flash workhorse + MiMo eyes + Kimi K3 frontier — roster.md §4) |
| G4 | Delegation mechanics | X | build | — |
| G5 | Session lifecycle/reuse | X | build | **RESOLVED** (2026-08-07 live: respawn-not-reuse; background gated by env var) |
| G6 | Board injection format | X | build | — |
| G7 | Hook wiring | X | build | — |
| G8 | Band mechanics | X | build | — |
| G9 | Reflect-loop (cadence = D; mechanics = X) | D+X | partial | **D RESOLVED** (cleanup cadence: per-deepwork-session analyze + monthly Dolt GC; checkpoint-gated) |
| G10 | Setup merge content | D+X | partial | **D RESOLVED** (TGO thin fragment + official bd setup opencode block; no-clobber) |
| G11 | Packaging/name/layout | D+X | partial | **D RESOLVED** (npm `trans-genderian-orchestra`; global config assets to ~/.config/opencode/) |
| G12 | Preset switching UX | D | YES | **RESOLVED** (prose nudge only — no slash commands) |
| G13 | Checkpoint baseline posture | D+X | partial | **D RESOLVED** (auto-approve routine, pause-list only) |
| G14 | Bernstein doing-boundary | D | YES | **RESOLVED** (absolute; + routing depth scales with blast radius) |
| G15 | Nirvana model/temp | D | with G3 | **RESOLVED** (synth = preset's strongest, low temp; band members = preset workhorse — roster.md §4) |
| G16 | Band output persistence | D | YES | **RESOLVED** (beads decision log + chat) |
| G17 | Wave concurrency cap | D | YES | **RESOLVED** (cap 3 concurrent specialists per wave) |

## Decisions summary (2026-08-05) — all D-shaped gaps closed

All decision-shaped gaps are now resolved and recorded in their spec docs. The remaining open items are exclusively **discovery-shaped** (G4-G8 + the mechanics halves of G9/G10/G13), which the build's first slice answers empirically:

- **G9 cadence:** `bd admin compact --analyze` per deepwork session end + reflect pass; **`bd admin compact --dolt`** monthly (the `--dolt` flag lives on `bd admin compact`, not top-level `bd compact`). Checkpoint-gated (irreversible). → features.md §3
- **G10 merge:** TGO thin fragment + official `bd setup opencode` managed block, no-clobber. → setup.md
- **G11 package:** npm `trans-genderian-orchestra`; config assets to `~/.config/opencode/`. → architecture.md §6
- **G12 preset UX:** prose nudge ("go cheap"/"frontier this"); applied at plugin load (config hook), effective next session. → features.md §5
- **G13 posture:** auto-approve routine; checkpoint on pause-list only. → features.md §2
- **G14 boundary:** Bernstein never edits (absolute); **routing depth scales with blast radius** (tiny→minimal spec+direct Dylan; standard→full spec+wave; judgment-heavy→grilling/band/review). → roster.md §5
- **G16 band output:** beads decision log + chat (durable, matches living-spec). → band.md
- **G17 waves:** max 3 concurrent specialists per wave. → roster.md §5, features.md

## G2 — MCP inventory RESOLVED (2026-08-05, deep-dive)

**context7 → in, MCP mode, granted to Nas + Dylan** (remote 2-tool server `https://mcp.context7.com/mcp`; token-cheap, no local process; matches skills-over-MCPs since it's not a heavyweight server). Free API key auto-generated at `npx ctx7 setup --opencode` (recommended only for higher rate limits). Nas researches (slim Librarian pattern), Dylan writes against current APIs (bmad Amelia pattern). CLI+Skills mode exists (skill drives `ctx7` CLI) but needs bash — Nas denies bash — so MCP is primary; CLI is the fallback.

**Lose:** gh_grep (slim-only; websearch approximates), MemPalace MCP (magic-context owns memory), oh-my-pi memory tools (same), ruflo monolithic MCP (~314 tools; against skills-over-MCPs).

**Websearch = native OpenCode Exa-backed `websearch` — no MCP for web** (all frameworks converge on this; slim is migrating off its websearch MCP toward native + enhanced webfetch).

**Dropped (tgo-a6r.20):** slim's **enhanced webfetch** (llms.txt probing, content extraction, secondary-model summarization). Native OpenCode webfetch + the concision layer cover the value; the plugin never reimplements host tools.

---

## Discovery-shaped answers from the scaffold spike (tgo-96f.1, 2026-08-05)

The scaffold build empirically answered the deferred G4-G8 mechanics against opencode 1.18.13. Full plugin-API reference in `docs/research/opencode-plugin-api.md`; implementation in `plugin/`.

### G7 — Hook wiring (RESOLVED)
- **Hook #1 (board) = `experimental.chat.messages.transform`** — this is the real hook name for the architecture's "messages.transform". **Hook #4 (concision) = `experimental.chat.system.transform`** (system-prompt append per turn) — a DISTINCT hook; the concision spec's own §2 and §6 had disagreed, resolved to §2's mechanism (per-turn system append). Both registered as separate slots in the scaffold core.
- `chat.message` fires once per user message (fork-verified: board's once-per-session injection gate).
- `tool.execute.after` exists with `{ tool, sessionID, callID, args }` in / `{ title, output, metadata }` out — right shape for hook #3 (task-fit rejection). **Implemented in tgo-96f.7** (src/fit.ts): lane-rejection detection appends a `REROUTE-NOT-RETRY` signal; output mutation verified by-reference (prompt.ts `handleSubtask`).
- `session.status` + `session.idle` + `session.compacted` are the session events; `session.compacted` is the re-injection point (fork uses it). **Implemented in tgo-96f.6** (src/session.ts): `SessionReconciler` syncs the board's live-state shim (streaming sessions, resumable aliases) on busy/idle/retry/compacted and invalidates the render cache.
- **Agents auto-discover from `{agent,agents}/**/*.md` in the config dir** (verified in opencode source) — TGO does NOT need a plugin config hook to register seats; the installer drops `.md` files and they load. Plugin config hook stays for commands/presets only.
- **Plugin module = named export** (`export const TgoPlugin: Plugin`), `main` in package.json, deps installed by opencode via Bun automatically.

### G4 — Delegation mechanics (partially RESOLVED)
- `task` is gated by `permission.task` with glob patterns; `"*": "deny"` removes a subagent from the Task description entirely (verified in docs). **Final graph (tgo-96f.4):** Bernstein's `task: { "*": "deny", "horowitz": allow, "nas": allow, "dylan": allow, "nirvana": allow }`; Nas denies `task` outright; Dylan/Horowitz allow built-in `explore` only; Nirvana allows only its three band members. (The scaffold spike's provisional `{ "*": "allow", "general": "deny" }` is superseded — an allowlist without a `"*": deny` catch-all falls through to default-allow, verified empirically.)
- `subagent_depth: 2` caps delegation (global config, written by the installer); `maxSteps` (`steps`) caps iterations.
- Five-part Spec content passes in the task prompt; how much prior-turn context forwards is a hook-5/board-format concern (open).

### G5 — Session lifecycle (RESOLVED, 2026-08-07, live)
- Subagent spawn/reuse semantics + background behavior resolved empirically via headless live run (tgo-v6g): subagent sessions are respawned fresh per `task` call (not reused across chained phases); `session.created` fires for subagents with `parentID` set (setup gate skips them); `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true` gates the `background` task param (schema + hard-fail without it). Full detail in `docs/research/opencode-plugin-api.md` (tgo-v6g row).

### G6 — Board format (partially RESOLVED, format open)
- Fork's mechanics (sentinel `<beads-context>`, strip-and-replace, subagent-skip via `client.app.agents()`, model/agent-preserving synthetic `noReply` prompt) verified as the reference. TGO's renderer format is tgo-96f.5's deliverable.

### G8 — Band mechanics (partially RESOLVED)
- Band members as real `mode: subagent` `.md` agents (cobain/grohl/novoselic) verified loadable; Nirvana's `permission.task` allowlists them. Parallel fan-out mechanics are tgo-96f.10's deliverable.

**Scaffold exit gate met:** npm skeleton under `plugin/`, thin core loads headlessly with zero errors, config validated at load (invalid preset rejected), seat prompts auto-discovered, <1000-token budget enforced, 8 tests green.
