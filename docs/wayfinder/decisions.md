# TGO Wayfinder — Decisions Log

Living record of decisions made during the TGO planning expedition. This file is the durable handoff point if a session must be compacted or restarted. Each entry records the question, the decision, and any gating. The wayfinder map (in beads) is the source of truth for tickets; this log is the source of truth for decisions made in conversation.

**Project:** trans-genderian-orchestra (TGO) — a custom multi-agent orchestration plugin for OpenCode.
**Expedition:** Wayfinder charting + resolution toward a comprehensive TGO spec.
**Operating state:** User is on a mostly-stock OpenCode install. Only plugins installed: `opencode-beads` (0.7.0) and the Matt Pocock skills (at `~/.agents/skills`). No context-management plugins.
**Tracker:** beads (`bd`), initialized in this repo (prefix `tgo`, embedded Dolt, local-only — no git remote).

---

## Q1 — Destination

**Decision:** The map's destination is a complete, user-approved specification of the TGO plugin — architecture, agent roster, sourced features, concision/anti-slop layer, MCP/permission policy, and a ready-to-run set of implementation tickets. The map ends in a hand-off, not a shipped plugin. Prototyping and iteration are their own future wayfinding expeditions.

---

## Q2 — Research scope

**Decision:** Research exactly six frameworks — ruflo, bmad-method, opencode-fusion, gsd-core, oh-my-pi, langgraph (and Deep Agents) — along a fixed set of comparable dimensions:
- (a) core orchestration primitive
- (b) how agents are defined/delegated
- (c) context/shared-state passing
- (d) agent roster philosophy
- (e) skills/tools it ships
- (f) what's worth stealing for TGO

---

## Q3 — Feature requirements

**Decision:** Do not enumerate "minimum orchestration needs" or "beyond-minimum wants" during charting. The framework research resolves the minimum; the beyond-minimum list is a separate decision ticket once research lands.

---

## Q4 — Autonomy model

**Decision:** Skills-over-MCPs, no slash commands, proactive autonomous invocation (philosophy fixed by user notes). Two sub-problems:

- **RESOLVED (verified fact):** Making user-invoked Matt Pocock skills model-invokable is not a problem in opencode — opencode ignores the `disable-model-invocation` frontmatter field (unknown fields are ignored), so those skills are already model-invokable. Verified in-session: `setup-matt-pocock-skills` (which sets `disable-model-invocation: true`) was model-invoked.
- **Open ticket:** Auto-triggering (or skipping) the per-repo `/setup-matt-pocock-skills` setup so TGO's autonomous flow never stalls on a manual one-time setup. Gated on research.

---

## Q5 — Feature sourcing

**Decision:** Keep user's shortlist (magic-context, aft, superpowers, mattpocock/skills, framework-bundled skills). Two additions:

- Source list stays **open** — gaps found during research can draw in skills/repos beyond the shortlist.
- **Curation decision ahead:** whittle borrowed skill sets down to a deliberate subset (not bulk import). This curation is its own ticket, gated on knowing what the framework layer demands.

Square-block-round-hole adaptation problem recorded as a decision ticket gated on framework research.

---

## Q6 — Agent roster

**Decision:** Roster stays as designed: Bernstein (planning/reconciliation), Horowitz (review/high-risk), Nas (research/docs), Dylan (implementation), Nirvana band (Cobain/Grohl/Novoselic + synthesizer). Prompt style fixed: short identity block, rules as bullets, examples, <600 tokens.

Becomes tickets after research: band mechanism (how Nirvana synthesizes three perspectives in an opencode plugin), per-agent role + prompt + permissions, where prompts live (plugin agents vs. AGENTS.md).

---

## Q7 — Always-on writing layer

**Decision:** A modifier that changes *how the agent writes* (concision), not post-hoc editing (stop-slop, humanizer explicitly rejected). Three-tier shape:

- **Skill selection** (which of i-have-adhd / caveman / ponytail, or different skills entirely) — expected to be a fairly straightforward decision, later.
- **Implementation approach** — gated on research.
- **Always-on enforcement mechanism** (system prompt vs. model-invoked skill vs. injected AGENTS.md text) — the trickiest bit; needs its own research before implementation planning.

---

## Q8 — MCP & permission policy

**Decision:** Two research-informed decision tickets, both gated behind research + roster:
- MCP necessity (which MCPs the roster actually needs, learned from frameworks that ship them).
- Per-role permission matrix, mapped onto opencode's `permission` config once the roster is fixed.

---

## Verified beads facts (from functional test)

All `bd` operations are CLI commands via the `bash` tool (no `bd` tool, no beads MCP server). Tested end-to-end in this repo:
- `bd prime` — workflow context + session-close protocol (auto-run by opencode-beads plugin on session start and after compaction)
- `bd create "title" -t task|bug|feature -p 0-4` — create issue
- `bd ready` — list ready work
- `bd show <id>` — issue details
- `bd update <id> --claim` — claim (assignee + in_progress, idempotent)
- `bd close <id>` — close with reason
- `bd remember "insight"` / `bd memories` / `bd forget <key>` — persistent memory, injected via `bd prime`. Do not use MEMORY.md files.
- Do not use markdown TODO lists for task tracking.

**Plugin quirk:** opencode-beads README claims `/bd-*` slash commands, but the installed 0.7.0 registers `beads:*` commands instead (and no `remember` command at all). The `/beads:*` vendor commands also reference beads MCP tools that don't exist. Reliable path = `bd …` via bash. (`docs/agents/issue-tracker.md` already corrected to reflect this.)

---

## Fog (not yet specified)

- How the framework research feeds the architecture decision (plugin shape: agents as opencode agents vs. skills vs. orchestration loop).
- Whether TGO ships its own skills or curates borrowed ones.
- Band synthesis mechanism detail.
- Always-on writing enforcement mechanism.
- Exact MCP set and permission matrix.
- Beads-native integration into the plugin (user wants it natively integrated, beyond just using the plugin).
- Prerequisite plugins outside the orchestration scope: free-coding-models, antigravity-auth (user asked for recommendations beyond these).

---

## Charting complete — map created

**Map:** `tgo-a6r` — "TGO Wayfinder: route to a comprehensive spec" (label `wayfinder:map`, type epic, in beads).

**18 tickets** (all children of the map):

- **Research (7, AFK, frontier):** ruflo, bmad-method, opencode-fusion, gsd-core, oh-my-pi, langgraph + Deep Agents, concision skills audit.
- **Decisions (11, HITL grilling, blocked on research):** architecture (central), beyond-minimum features, skill curation, per-repo setup auto-trigger, Nirvana band, per-agent roles/prompts, concision selection, always-on enforcement, MCP necessity, permission matrix, beads-native integration.

Blocking edges wired via `bd dep add <child> <blocker> --type blocks`. Frontier = `bd ready`.

Wayfinder ticket types expressed as labels: `wayfinder:research` (beads type `spike`), `wayfinder:grilling` (beads type `task`).

---

## Shortlist amended (Q5 source list is OPEN)

Added a 7th research framework: **oh-my-opencode-slim** (`alvinunreal/oh-my-opencode-slim`, ticket `tgo-a6r.19`, closed). The user has prior hands-on familiarity with it. Findings: `docs/research/oh-my-opencode-slim.md`. Standout steal-worthy bits: in-prompt Background Job Board for parallel delegation without a code DAG, routing-threshold/direct-work-boundary prompt contract, task-fit rejection as a reroute-not-retry signal, per-agent skills/MCPs as permission grants.

---

## TGO plugin architecture — RESOLVED (ticket tgo-a6r.8, closed)

**Q1 — Shape: Hybrid.** Config-first roster + a thin plugin core. Routing/delegation stays prompt-driven; the plugin enforces lifecycle/state and never reimplements control flow.

**Q2 — Roster mapping.** One primary **Orchestrator** (scheduler, "direct work boundary", never does the doing). Named specialists as **background-capable subagents** (Horowitz=review, Nas=research, Dylan=implementation, Nirvana=band). Per-role model routing via presets. `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true`.

**Q3 — Delegation contract.** Five-part Spec (Objective/Files/Interfaces/Constraints/Verification) as the task prompt; specialist returns structured report `STATUS`(complete/partial/blocked/escalate)/`CHANGES`/`VERIFIED`/`GAPS`; orchestrator reads a Background Job Board each turn; heavy state lives in files on disk, never pasted into context.

**Q4 — Enforcement: capabilities, not compliance.** Orchestrator frontmatter denies edit/grep/glob/list/bash, allowlists `task` + read-only (read/websearch/skill). Specialists capped `subagent_depth: 2`, `general` subagent excluded. Specific matrix deferred to tgo-a6r.17.

**Q5 — Ship shape.** npm package = thin code core + global config assets (agent md files, permissions template, presets map) installed to `~/.config/opencode/`. Non-load-bearing setup skill. JSON schema for plugin config. **Global, not per-project** (user preference).

**Q6 — Code boundary = exactly 4 hooks:** (1) Background Job Board injection (`messages.transform`/`chat.message`, sentinel-tagged, strip-and-replace for cache safety); (2) session reconciliation (`session.status`/idle events); (3) task-fit rejection normalization (`tool.execute.after`); (4) always-on concision transform (`messages.transform`) — which skills feed it = tgo-a6r.14, detailed mechanism = tgo-a6r.15.

Everything else stays out of code: routing in prompts, roster in config, models in presets.

---

## Nirvana band mechanism — RESOLVED (ticket tgo-a6r.12, closed)

**Q1 — Invocation.** Band fires only on (a) Orchestrator judgment that a decision is high-stakes/ambiguous, or (b) user prose request ("run it by the band"/"run it by Nirvana"). Never default. No direct `@Nirvana` addressing (autonomy-first). Orchestrator prompt gets a routing rule: ordinary work → fitting specialist; judgment-heavy/ambiguous → @nirvana.

**Q2 — Lenses.** Three judgment axes chosen for efficacy, theming as naming only (prompt content from efficacy, not persona): **Risk** ("what breaks" — bugs/edge cases/failure modes/security), **Structure** ("holds up over time" — maintainability/boundaries/complexity), **Economy** ("simplest thing that works" — less/faster/minimal surface). Naming: Cobain=Risk, Novoselic=Structure, Grohl=Economy. Each = ~50-100 token steering paragraph.

**Q3 — Reconciliation.** Slim's output contract: Band Response (synthesized rec — what Orchestrator acts on) + per-lens details (auditability) + Band Summary (agreement/disagreement/unresolved uncertainty + confidence rating unanimous/majority/split). TGO addition: **named-override rule** — on conflict, synthesizer must state which lens it overrode and why; no averaging into mush; disagreement always surfaced.

**Q4 — Shape.** Nirvana = one registered subagent (synthesizer, strongest model in preset, low temperature). Each lens = tool-less reasoning band-member subagent (no tools — pure judgment), spawned in parallel via `task()` at depth 1: orchestrator(0) → nirvana(1) → lens(2), filling `subagent_depth: 2`. Background-capable on the Job Board so it streams/parallelizes and the orchestrator stays unblocked.

Lens/band content details defer to tgo-a6.13 (per-agent roles and prompts).

---

## Per-agent roles and prompts — RESOLVED (ticket tgo-a6r.13, closed)

**Q1 — Seat mandates/boundaries.**
- **Bernstein** — primary (Orchestrator). Plan, delegate, reconcile, verify. Scheduler-not-worker: no direct edits, no UI work.
- **Horowitz** — subagent. Review/high-risk. Reviews work that exists; does NOT implement.
- **Nas** — subagent. **Explorer + Librarian combined** (user decision; model requirements similar): repo-local recon AND external knowledge research AND docs. Boundary: never writes implementation code (non-overlap with Dylan, per ruflo's anti-drift). No separate `explore` seat — Nas covers recon.
- **Dylan** — subagent. Implementation. Executes specs; no strategy.
- **Nirvana** — subagent (band, per tgo-a6r.12).

**Q2 — Prompt anatomy (4 blocks, <600 tokens).**
1. **Identity** (1-2 lines) — name + one-line mandate. Naming/UX device, NOT persona cosplay.
2. **Rules as bullets** — do/don't boundaries (the bulk).
3. **Bernstein-only lane-card** — "delegate when" routing thresholds (multi-step impl → @dylan; external research → @nas; judgment-heavy → @nirvana; never UI). bmad's route-to-smallest-safe-path as prompt.
4. **Examples** (1-2) — worked mini-example of the seat's output/report format.

**Budget:** <600 tokens per prompt (body only, frontmatter excluded), **enforced at build time** — the plugin's config schema validates prompt-file size (gsd-core byte-budget idea, as a schema check).

**Q3 — Where prompts live.**
- Seat behavior lives ONLY in agent prompt files (`~/.config/opencode/agent/*.md`) — where the permission graph binds.
- TGO ships a global `AGENTS.md` fragment as a **thin always-on advice layer only**: concise-writing modifier, no-slash-commands/prose-driven reminder, "record work in beads" directive. Never load-bearing (fusion's skills-are-advisory, generalized).
- Repo-specific setup stays out (deferred to tgo-a6r.11).

**Standing rule (all agents, not just band): effectiveness over theming.**

---

## PARKED INVESTIGATIONS (from user, 2026-08-04)

1. **Enforcing beads use by disabling opencode's `todowrite`** — raised in opencode-beads issue #66 (joshuadavidthomas/opencode-beads). Per the discussion, disabling `todowrite` helps enforce beads use; the reporter also mentioned writing a beads skill but gave no detail (not needed). RELEVANT TO: tgo-a6r.18 (beads-native integration) and tgo-a6r.11 (per-repo setup).
2. **Official beads plugin instead of the opencode-beads fork** — the official beads repo (gastownhall/beads) has docs/integrations/opencode.md implying official OpenCode support. Investigate replacing the fork later. RELEVANT TO: tgo-a6r.18.

---

## Skill curation — RESOLVED (ticket tgo-a6r.10, closed)

**Curation = "all batteries included" via curated bundle.** User's instinct (with my endorsement): bundle as many genuinely useful skills as warranted — count FLEXIBLE (5 to 50, depends on what proves helpful; the 15-20 was a rough starting sense, not a cap). Each bundled skill is individually selected, ADAPTED, and token-pruned (borrow-over-author, no wholesale forks).

**Mechanics (what makes a big bundle affordable):**
- **Progressive disclosure** (Deep Agents): skills expose only `SKILL.md` frontmatter at startup, bodies load on demand.
- **Per-seat grants**: skills attach to the seats that need them; other seats don't carry them.
- **Token discipline**: pruned bodies (caveman-micro lesson — 85 tokens beating 552).
- **Nothing load-bearing**: a missing skill never breaks the plugin; permissions/hooks enforce.

**No shipped second-tier suite.** Instead one thin **"works well with" docs page** listing compatible external suites (Matt's installed skills, superpowers, gsd) that TGO won't disable if present and whose per-seat grants TGO *enables* when available. Trim by design.

**Six criteria** (from grilling): (1) adopt by function, not by repo — skill ships only if a seat's mandate needs it AND no opencode-native tool covers it; (2) nothing load-bearing; (3) skills-over-MCPs strictly — if a skill covers the need, the MCP doesn't ship; (4) token discipline; (5) borrow over author (adapted, not forked); (6) per-seat grants.

**Note:** magic-context and aft are PLUGINS/TOOLS, not skills → they belong to the MCP/tool decision (tgo-a6r.16), not the skill bundle.

---

## PARKED INPUTS (2026-08-04, logged on tickets)

- **Concision + writing style, both must be addressed.** `ep01-the-cure-for-ai-slop`, stop-slop, humanizer target writing STYLE (anti-slop), distinct from the concision skills' token reduction. Always-on mechanism must cover BOTH. Parked on tgo-a6r.14 (selection) + tgo-a6r.15 (always-on enforcement).
- **AFT + magic-context = TGO's default memory/context tools** (both plugins, not skills; cortexkit). Parked on tgo-a6r.16.
- **Beads bundled INTO TGO = dream scenario** (default issue tracker). User wants plugin functionality folded into TGO if feasible; else list as dependencies. Parked on tgo-a6r.18.

---

## Plugin bundling strategy — RESOLVED (from conversation, 2026-08-04)

**Rule:** bundle small plugins we want; for larger/actively-developed plugins and engines, rely on dependencies. Decision per-plugin = "is this primitive-expressible (fold in) or engine-backed (depend on)?"

**AFT + magic-context (default = FULL dependencies).** Both are complex and actively developed; making them dependencies ensures they stay updated without the user maintaining them. OPEN DOOR: if we can turn their features into native-feeling TGO functionality, the user is on board with adapting after all (e.g. magic-context's durable memory feeding delegation, alongside the Pocock handoff skill). Decision deferred to tgo-a6r.16, per-feature. Recorded on tgo-a6r.16.

**beads (make our own integration).** TGO writes its own opencode-side beads wiring (commands + session-context injection) — resolving the opencode-beads vs official-beads question by owning the integration layer ourselves. Honest caveat: the `bd` CLI + Dolt DB is an engine that cannot be folded; it stays a dependency. Must follow the no-slash-command rule — the integration is driven via agents/AGENTS.md + the `bd` CLI, not `/bd-*` commands. Recorded on tgo-a6r.18.

**Installer requirement (user caveat).** Any dependency — full plugin OR specific engine — must be installed by the TGO install script: check the workstation for presence, and if missing, fetch and install it as part of the TGO install. This makes dependency management part of TGO's own setup, not a manual step.

---

## MCP / tool necessity — RESOLVED (ticket tgo-a6r.16, closed)

**AFT + magic-context = FULL dependencies (do not adapt).** Confirmed in a follow-up grill. Rationale: their value *is* the engine — AFT's symbol-aware tree-sitter tooling, magic-context's historian/dreamer/recall pipeline. There is no thin stable wrapper to own (unlike beads); "adapting" would mean TGO re-wrapping a fast-moving engine, which is exactly the maintenance tax the user wants to avoid. Native-feel is instead achieved via the **permission graph**: `aft_*` / `ctx_*` tools become grantable/deniable per seat exactly like skills.

- Declared as TGO dependencies/peers.
- Auto-installed by the TGO installer if missing (user caveat).
- Listed on the "works well with" docs page.
- **Revisit only if** a magic-context feature becomes load-bearing for TGO's core loop (e.g. cross-session memory feeding orchestration in a way that breaks TGO if absent) — then define a thin interface around it, not a re-wrap. Today memory is "supporting," not core, so full dependency is right.
- beads = make our own wrapper over the `bd` engine (tgo-a6r.18). AFT + magic-context = depend on the whole plugin. This is the final bundling split.

Note: closes tgo-a6r.16, which unblocks the per-role permission matrix (tgo-a6r.17).

---

## Concision skill selection — RESOLVED (ticket tgo-a6r.14, closed)

**One amalgamated three-axis house-style ruleset, uniform across ALL agents.** The user's instinct corrected my per-seat lean — and the correction was right:

- **Structure** (i-have-adhd): action-first, numbered steps, state-restatement, no preamble/closers.
- **Prose-grammar** (caveman): drop filler/articles/hedging, meaning-preservation guardrails (never drop negations; verbatim code/errors), auto-disable for safety.
- **Code-output** (ponytail): YAGNI ladder, don't-cut list, code-first reporting.
- **Amalgamated** into one pruned injection (~300-500 tokens), applied uniformly to every agent. Rationale: the always-on enforcement is a global `messages.transform` (tgo-a6r.15), so per-seat injection is added machinery; the token objection dissolves under pruning (caveman-micro lesson). The code slider no-ops when a seat produces no code. One universal off-switch ("stop X"/"normal mode" standardized).

**Persona anchor policy (refined):** ONE thin style anchor per slider, kept only for stickiness (audit finding #4 — a one-line anchor holds the style across turns better than bare rules); no cosplay; droppable on evidence.

**Standing rule sharpened — two distinct anchors, never conflated:**
1. **Style anchors** (concision layer): thin, for stickiness, optional.
2. **Identity anchors** (agent prompts, tgo-a6r.13; de-themed 2026-08-07): names are **naming/UX devices only**; any identity anchor is **role-anchored, never name-anchored** — Bernstein is *the scheduler who never does*, Horowitz *the reviewer of existing work*, Nas *the fast read-only researcher*, Dylan *the spec executor*, Nirvana *the lens-merging synthesizer* — but no agent roleplays its namesake (none of them are software engineers). Music/band metaphors removed from all seat prompts. Both anchors bow to effectiveness.

Note: closes tgo-a6r.14, which unblocks tgo-a6r.15 (always-on writing enforcement).

---

## Always-on writing enforcement — RESOLVED (ticket tgo-a6r.15, closed; informed by docs/research/style-skills.md)

**Q1 — Mechanism.** ponytail's pattern: `experimental.chat.system.transform` appending the level-filtered ruleset to the system prompt EVERY turn (drift-proof — SessionStart-once degrades under compaction). Persisted intensity level; one "instruction builder" as source of truth; universal off-switch. Borrow i-have-adhd's "when to break rules" escape list.

**Q2 — Propagation.** Style fragment folded into ALL seat prompts via the build step (no new hook). Rationale (from user Q): ponytail uses a SubagentStart hook because it operates in the open world (unknown subagent prompts); TGO owns a closed roster of five build-generated agents, so folding is both elegant AND structurally guaranteed.

**Q3 — Style layer** (ep01/stop-slop/humanizer audit — docs/research/style-skills.md):
- **Scrub half is always-on and composable.** Banned tells (filler, hedges, AI-vocab, adverbs, passive, em-dash spam, rule-of-three, throat-clearing) AGREE with the concision skills; upgraded with specific tell-vocabulary from humanizer's 33-pattern taxonomy + stop-slop phrase lists + STE vocab. Highest-leverage, lowest-conflict lift.
- **Register dial is class-gated, two positions only** (concise / natural) — never both-on. This replaces the "two parallel layers" idea and the "which winner if both on" problem disappears.
- **No post-hoc editor ever.** humanizer's MECHANISM (rewrite finished text, file-in-place) rejected; its CONTENT (taxonomy, no-fabrication rule, false-positive "clusters not isolated tells" guard) adopted as generation-time don'ts. Draft→self-audit→final is a generation-time INTERNAL loop (legitimate).
- **Toggle determination = hierarchy:** seat-default register → model self-classifies output class → user instruction overrides. No hooks/detection; the judgment lives in prompts (capabilities enforce, prompts advise).

**REFINED roster split (amends tgo-a6r.13):** Nas = READ-ONLY lookup only (recon + research + docs lookup; NO file writing — findings returned as structured reports, never committed artifacts). Dylan = SOLE writer (code + technical docs + prose artifacts; READMEs, PR descriptions). Model split: Nas on cheap flash, Dylan on writing-capable model. Register dial rides on Dylan's output classification only. All OTHER agents (Bernstein/Horowitz/Nirvana) present in concise mode by default — register is presentation-only for them (~99% concise). Precedence (now trivial): structure wins for steps, compression for connective prose, cadence-variety for voice-forward prose.

Note: closes tgo-a6r.15. Remaining open decision tickets: tgo-a6r.9 (feature set), tgo-a6r.11 (setup auto-trigger), tgo-a6r.17 (permission matrix), tgo-a6r.18 (beads-native integration).

---

## Per-role permission matrix — RESOLVED (ticket tgo-a6r.17, closed)

**Scope:** permission FRAMEWORK + per-seat capability constraints + per-seat grant GUIDANCE — not a final inventory. The specific skill/tool/MCP names (context7, review skill, etc.) are deferred until the lineup is real (consistent with the flexible skill-count and "adopt by function" criteria). AFT + magic-context are the ONLY pinned names (known dependencies).

**Per-seat matrix:**
- **Bernstein** (primary): deny `edit`/`grep`/`glob`/`list`; bash = **verification allowlist** (`git diff`/`status`, lint, test — user's Q1 choice); `task` → Horowitz/Nas/Dylan/Nirvana; allow `read`/`websearch`/`skill`; skills = structure+grammar sliders.
- **Horowitz** (review + strategic advisor): deny `edit`; bash = **read-only investigate allowlist** (`git log/show/status`, log/process/file inspection) — distinct from Bernstein's *confirm* allowlist (investigate vs. verify); `task` → built-in `explore` only; review skill. Frameworks support an investigating reviewer (slim Oracle = "architecture/review/debugging"; oh-my-pi WATCHDOG = own tool grant; ruflo reviewer is first-class). Review judges; verification confirms — separate lanes.
- **Nas** (lookup, read-only): deny `edit`/`bash`/`task`; allow `read`/`grep`/`glob`/`list` + `websearch`/`webfetch` + `context7` + MC recall; recon/research skills.
- **Dylan** (sole writer): allow `edit`/`bash`; `task` → built-in `explore` only; all three concision sliders + implementation skills + **AFT symbol tools**.
- **Nirvana + band members**: tool-less (band ticket); Nirvana's only tool is `task` → its band members.
- `subagent_depth: 2` caps all delegation.

**Magic-context recall — broad, not exclusive (user correction).** Recall is pull-based (opt-in querying), so there is NO worklane-contamination concern and no tie to beads. Grant MC recall to ALL named agents (Bernstein/Horowitz/Nas/Dylan); only the tool-less band seats deny it. Guidance: "granted broadly, used tersely" — recall pulls tokens into the agent's window, so cheap agents shouldn't drag in giant recall dumps.

Note: closes tgo-a6r.17 (last blocker cleared). Remaining open decision tickets: tgo-a6r.9 (feature set), tgo-a6r.11 (setup auto-trigger), tgo-a6r.18 (beads-native integration).

---

## Beads-native integration — RESOLVED (ticket tgo-a6r.18, closed)

**Q1 — Coupling: scoped deep integration (user agreed with recommendation).** Beads tracks the *work units* the loop cares about — each delegated task maps to an issue, status machine-readable (bmad-build-auto pattern), Bernstein reconciles via `bd list`/`bd show` status rather than trusting chat. The **Background Job Board becomes a RENDERER over beads + a thin live-state shim**, NOT a parallel structure (one store, no drift). The board's context-injection function survives (the LLM must see a snapshot each turn) but is *derived from beads*. Thin runtime layer kept only for genuinely-live state (streaming tasks, resumable-session aliases); beads captures the durable record at phase boundaries.

**Q2 — Single-writer model (user's correction).** Bernstein is the ONLY beads operator:
- Creates the issue BEFORE delegating; type chosen by delegation target (spike→Nas, task→Dylan, review→Horowitz, decision→only when warranted).
- Assigns (= the claim — verified: beads has no auth layer, assignment IS the claim).
- Marks `in_progress` at dispatch; closes on verified completion; reopens on kick-back; records Horowitz review verdicts.
- Specialists have ZERO beads surface — reinforces the permission matrix (Nas/Horowitz stay bash-less entirely; Dylan never needs `bd`).
- Enforcement invariant: **Bernstein never delegates without first creating the backing issue.**
- Nirvana: **ephemeral, no beads issues** (user decision) — output is a report that graduates to an issue only if Bernstein/requester deems it warrantable.

**AMENDS tgo-a6r.17 (permission matrix):** Bernstein's bash allowlist gains the `bd` CLI commands (create/update/close/dep/label/list/show/remember) alongside verification commands.

**Where the thin board lives:** part of TGO's own opencode-beads replacement — the plugin wiring owns context injection (beads-derived snapshot each turn) + `bd` calls; the `bd` CLI remains the engine dependency, auto-installed by the installer if missing.

Note: closes tgo-a6r.18. Remaining open decision tickets: tgo-a6r.9 (feature set beyond minimum), tgo-a6r.11 (per-repo setup auto-trigger).

---

## Feature set beyond minimum — RESOLVED (ticket tgo-a6r.9, closed)

**Adopted (5):**
1. **Autonomous loop** — OPT-IN "deepwork/keep-going" mode, default OFF. Hard bounds: max phases, token budget, mandatory checkpoint cadence. Wake-on-event + heartbeat (ruflo autopilot pattern), chains phases (gsd-autonomous). "Autonomy is a mode, not the default."
2. **Checkpoint protocol** — pause list: irreversible/expensive actions; direction changes (plan invalidated by discovery); package/dependency legitimacy (gsd `gate="blocking-human"`); verification failures Bernstein can't resolve after the escalation ladder; user-flagged. NOT default (routine work auto-approved). Structured `## CHECKPOINT REACHED` block + resumable continuation (gsd pattern).
3. **Reflect/self-improvement loop** — THREE application tiers: (1) auto-file: skills (advisory, never load-bearing) + `bd remember`; (2) human-verify checkpoint: seat-prompt + config changes (prompts ARE behavior; build-generated, versionable, reversible); (3) NEVER runtime-applied: hooks + plugin code → becomes a beads issue, implemented deliberately, shipped as plugin update. The plugin never patches its own enforcement at runtime.
4. **Worktree lanes** — git worktrees ONLY for parallel implementation lanes (Dylan ×2+ concurrent). Not for read-only lanes. Appears only on Bernstein-detected concurrency; Bernstein reconciles/merges.
5. **Presets (prose-driven)** — named seat→model/variant maps + register (concise/natural) + concision intensity. Three built-ins: balanced/cheap/frontier. Applied at delegation boundaries, never mid-task.

**Deferred:** UAT gate + browser evidence; session archaeology; retrospective; model-tier soft-failure escalation (per-role routing already covers the value).

Note: closes tgo-a6r.9 — the LAST feature decision. Only ONE decision ticket remains open: tgo-a6r.11 (per-repo setup auto-trigger).

---

## Per-repo setup auto-trigger — RESOLVED (ticket tgo-a6r.11, closed) — LAST DECISION TICKET

**Option A — auto-trigger at first session.** No first-message needed: it's a session-start plugin hook, exactly like `bd prime` (verified: bd prime auto-runs at session start and provably auto-initialized this repo — .beads/, AGENTS.md block, git init). Precedent is real and proven in this exact stack.

- **Why not B (detect-and-pause):** the agent can't message the user before the user's first message; and in a task-laden first message, a setup question is the first thing the flow drops — the "forgotten/skipped" failure the user feared.
- **Why A is safe — default-complete setup:** TGO's setup needs ZERO user input to finish. Every question the Pocock setup asked has a TGO-native default: tracker→beads (TGO's default), labels→default triage labels, monorepo→auto-detected (single-context default). Personal choices are deferred, not required — a non-blocking "customize?" nudge or the reflect loop covers them. Setup completes with defaults regardless.
- **Guardrails:** no-clobber (merge existing AGENTS.md/user content minimally, never overwrite — same as bd prime), idempotent + per-repo marker (never re-runs). Applies to BOTH the Pocock-style setup and the beads setup.

Note: closes tgo-a6r.11 — the final open decision ticket. **ALL 18 tickets + map resolved.**

---

## Architectural review — 5 amendments to resolved decisions (2026-08-04)

Source: docs/research/architectural-review.md (Augment Code guide + Anthropic harness + MAST + SCF + Agentic Lybic). Validated the overall shape (hub-and-spoke single-writer, doer/judger split, capabilities-not-compliance, opt-in autonomy, nothing-load-bearing) and surfaced five additions — all to BERNSTEIN'S MANDATE, none to the architecture:

1. **Living-spec mechanism.** Bernstein's work-unit beads issue IS a living spec: bidirectional updates (implementation writes back what was built), explicit success criteria, verification against the spec (not just the diff), spec-review checkpoint before coding starts, decision log on the issue. Addresses context/alignment drift — the top-3 failure mode. (Amends tgo-a6r.9.)
2. **DAG + wave decomposition.** Bernstein decomposes the goal into a dependency-ordered DAG; same-level tasks dispatch together as a wave; next wave waits on prior. Gives the job board its "what runs in parallel when" rule. (Amends tgo-a6r.9.)
3. **Boolean exit gates.** Every delegated Spec carries an explicit deterministic success criterion (tests pass, lint clean) that must hold before Bernstein closes the issue — antidote to vague handoffs and verifier false-passes. (Amends tgo-a6r.9.)
4. **Stagnation detection.** Autonomous loop gains repeated-identical-action detection + periodic progress checks (Agentic Lybic: 3 identical actions → intervene; periodic check every N steps) alongside max-phases/token bounds. (Amends tgo-a6r.9.)
5. **Adaptive re-planning levels.** Bernstein's failure response gains light/medium/heavy (tweak params → reorder deps → full re-decomposition), layered on the escalation ladder. (Amends tgo-a6r.9.)

Key data for the spec: multi-agent uses ~15x tokens vs chat (Anthropic); verification breakdowns = 21.3% of failures (MAST); ~1 in 4 interactions produces a semantic conflict and only pre-execution gating prevents cascading failure (SCF); doer/judger separation is the highest-leverage change (Anthropic).

---

## Spec deliverable shape — RESOLVED (2026-08-04)

**Multi-doc set + ADRs.** The wayfinder's hand-off to the build expedition is a spec package: one `CONTEXT.md` + `docs/spec/` with one doc per concern (architecture, roster, band, skill curation, concision/enforcement, MCP/permissions, beads integration, feature set, setup) + `docs/adr/` for the why-behind decisions. Matches this repo's existing single-context convention (AGENTS.md: "one CONTEXT.md + docs/adr/ at the repo root"). Rationale stays in docs/wayfinder/decisions.md; research stays in docs/research/. Gives build tickets navigable per-concern references without bloating the buildable spec. Resolves the map's final "Not yet specified" item.

---

## PARKED INVESTIGATIONS — RESOLVED (2026-08-05, verified against live sources)

### 1. Official beads OpenCode support vs opencode-beads fork

**Finding:** The official `beads` CLI (v1.1.2 installed; repo moved orgs `steveyegge/beads` → `gastownhall/beads`) now ships native OpenCode integration: `bd setup opencode` installs/updates a **managed AGENTS.md Beads block** (guidance only — no plugin, no hooks, no commands). Confirmed live: `bd setup opencode --check` reports our AGENTS.md block is "installed but stale" (v1 managed block vs new template).

The `opencode-beads` fork (joshuadavidthomas/opencode-beads, v0.7.0 installed) is a real plugin: (a) context injection — runs `bd prime` on `chat.message` (once per session) and re-injects on `session.compacted`; sentinel-tagged (`<beads-context>`); **skips subagents** (token pollution + pointless bd/git ops); dedupes on existing sentinel; (b) `/bd-*` → actually `beads:*` commands parsed from vendor definitions; (c) `beads-task-agent` subagent. Its README claims `/bd-*` but the installed 0.7.0 registers `beads:*` and the vendor commands reference nonexistent beads MCP tools — reliable path remains `bd …` via bash (already corrected in docs/agents/issue-tracker.md).

**Decision:** No action to switch. TGO **writes its own opencode-side beads wiring** (per tgo-a6r.18) — the fork is a small, read-worthy reference for hook #1's injection mechanics (sentinel, dedupe, subagent-skip, model/agent-preserving synthetic prompt) but is deliberately minimal and out-of-scope for feature requests. Official `bd setup opencode` AGENTS.md block is the maintained guidance source; `bd prime` remains the context SSOT. Relevant to: tgo-96f.5 (board injection), tgo-96f.14 (setup).

### 2. Enforcing beads use by disabling opencode todowrite

**Finding:** opencode-beads issue #66 ("force beads instead of built-in todos") is **closed as not planned** — maintainer: out of scope, "easier to fork/patch." But the clean fix needs NO plugin: opencode's `permission` field accepts tool-level rules, including `"todowrite": "deny"` (verified against live opencode docs, tools.md). Bonus: `todowrite` is already disabled for subagents by default.

**Decision:** Enforce at **config level** — `"todowrite": "deny"` in TGO's global permission config. This is capabilities-not-compliance, matching TGO's philosophy exactly: the agent literally cannot fall back to native todos; it must use beads. No prompt-injection, no fork. Also remove the AGENTS.md/AGENTS-block reliance on "never use todowrite" phrasing (advice stays as a thin reminder; enforcement is structural). Relevant to: tgo-96f.4 (permission graph), tgo-96f.14 (setup).

### Re-verification (2026-08-07, after build) — both findings still hold; one new item

- **`beads-mcp` MCP server is now official.** beads ships `beads-mcp` (uv/pip) for MCP-only environments (Claude Desktop, Amp, VS Code). Its own docs: "Prefer CLI + hooks when shell is available — it's more context efficient" (~1-2k vs 10-50k tokens). OpenCode has shell → **no action**; `bd …` via bash stays TGO's only beads path. Confirms the earlier "no beads MCP server" finding is deliberate, not a gap.
- **`bd setup opencode` is still AGENTS.md-only** (no plugin, no hooks) — TGO owning its own wiring remains the right call.
- **`todowrite: deny`** shipped in TGO's global config (`opencode.json` merge), per decision above.
- Refreshed this repo's stale managed beads block (`profile:minimal` v1 → current `profile:full` template) via `bd setup opencode`.

---

## Beads plugin deep-dive — 3 more findings (2026-08-05, verified against installed plugin + CLI)

### A. beads-task-agent assumes MCP tools that don't exist

The plugin's `beads-task-agent` (vendor/agents/task-agent.md) is an autonomous issue-completer loop (`ready → show → claim → execute → create/dep discoveries → close → continue`). Its entire prompt is built on **beads MCP tools** (`ready`/`show`/`claim`/`update`/`create`/`dep`/`close`/`blocked`/`stats`). We run **no beads MCP server** (verified: `bd …` via bash is the only working path). So in our install the task agent would call unregistered tools — same class of bug as the `beads:*` commands referencing nonexistent MCP tools.

**Implication for TGO:** TGO does not need this agent — Bernstein IS the beads operator (single-writer, tgo-a6r.18). But the task-agent prompt is a valuable reference for Bernstein's **living-spec workflow** (claim→execute→close→file-discoveries loop). Mine it for `tgo-96f.8`. Recorded on tgo-96f.8.

### B. `bd init` vs `bd prime` are different phases

- `bd init` = one-time project setup (creates `.beads/` + Dolt DB, sets issue prefix, configures gitignore). Vendor `init.md` also calls the nonexistent MCP `init` tool.
- `bd prime` = per-session AI context load (the SSOT). Not initialization.

Reuses in TGO: init is the setup step for `tgo-96f.14` (already done in this repo); prime is the per-turn context. Recorded on tgo-96f.14.

### C. Old-ticket cleanup is automatable and is TGO's job

Three distinct mechanisms:
- `bd admin compact` — **semantic** summarization of closed issues (Tier 1: 30+ days closed, ~70% size cut; Tier 2 90+ days planned). "Permanent graceful decay"; restorable via `bd restore` from git.
- `bd admin cleanup` — **deletes** closed issues (`--older-than 30`, `--cascade`). Permanent, no restore.
- `bd compact` — squashes old Dolt commits + GC (storage, not issues).

Automation is agent-designed: `bd compact --analyze --json` → agent writes summary → `bd compact --apply --id … --summary`.

**Implication for TGO:** cleanup belongs in the **reflect loop** (`tgo-96f.12`, auto-file tier), NOT Magic Context (a context/memory plugin; it will not touch the beads DB). Bernstein runs periodic `bd admin compact --analyze` and applies summaries. Because it is irreversible, it sits under the **checkpoint protocol** (irreversible action → checkpoint before apply): agent-driven, never silent. Recorded on tgo-96f.12.

---

## Pre-build gap review — all decision-shaped items RESOLVED (2026-08-05)

Full enumeration + tagging in `docs/spec/gap-review.md` (17 gaps: D = decision-shaped, X = discovery-shaped). Discovery-shaped items (delegation mechanics, session lifecycle, board format, hook wiring, band mechanics) are empirically gated on the opencode SDK and are answered by the build's first slice — NOT spec-guessed. All decision-shaped items resolved via grilling:

### G1 — Skill bundle: 11 shipped, 13 seat-grants
Bernstein: wayfinder, grilling, to-tickets, bmad-build-auto, verification-planning, diagnosing-bugs. Horowitz: code-review (lens-expanded w/ bmad 5-lens vocab), diagnosing-bugs. Nas: bmad-deep-recon (adapted read-only + gsd package-legitimacy + confidence). Dylan: implement, tdd, receiving-code-review, diagnosing-bugs. Nirvana: none (tool-less). Decision trail per cluster in `docs/spec/skill-candidates.md`. Long tail on "works well with" page.

### G2 — MCP inventory: context7 only
context7 in MCP mode for **Nas + Dylan** (remote 2-tool server; free key; CLI+Skills fallback). gh_grep, MemPalace, oh-my-pi memory all lose. Websearch native (no web MCP). AFT + magic-context stay pinned full deps. slim's enhanced webfetch flagged as build-time tool.

### G3 — Model presets (Go + free Zen)
**Balanced:** DS4 Flash everywhere (effort max on Bernstein/Horowitz/Nirvana; high on Dylan/band members), **Nas = MiMo V2.5 (vision, the eyes)**. **Cheap:** all `deepseek-v4-flash-free` + `mimo-v2.5-free` for Nas. **Frontier:** Kimi K3 (Bernstein/Horowitz/Nirvana), DS4 Flash (Nas/Dylan). DS4 Pro dropped (Flash is newer + more performant). Reasoning-effort variants confirmed (max/high). Full table: roster.md §4. Presets = data not code (tolerate model drift).

### G9 — Cleanup cadence
`bd admin compact --analyze` per deepwork session end + reflect pass; `bd admin compact --dolt` monthly (the `--dolt` flag lives on `bd admin compact`, not top-level `bd compact`). Checkpoint-gated (irreversible).

### G10 — Setup merge content
TGO thin AGENTS.md fragment + official `bd setup opencode` managed block; no-clobber.

### G11 — Package/name/layout
npm `trans-genderian-orchestra`; config assets to `~/.config/opencode/`; global.

### G12 — Preset switching
Prose nudge only ("go cheap"/"frontier this"); applied at plugin load (config hook), effective next session. No slash commands.

### G13 — Checkpoint posture
Auto-approve routine; checkpoint on pause-list only (confirmed baseline).

### G14 — Bernstein doing-boundary
**Absolute** (never edits, any change → Dylan via beads issue). **Routing depth scales with blast radius:** tiny/mechanical → minimal spec + direct Dylan + fast verify; standard → full spec + wave; judgment-heavy → grilling/wayfinder/band/review. (bmad route-to-smallest-safe-path.)

### G15 — Nirvana model/temp
Synth = preset strongest (DS4 Flash effort max / Kimi K3 frontier), low temp; band members = preset workhorse, effort high.

### G16 — Band output persistence
Band Response → beads decision log (Bernstein appends as note) + chat. Ephemeral, no beads issue.

### G17 — Wave concurrency cap
Max 3 concurrent specialists per wave.

**Post-review state:** the way to the build is clear. All decision-shaped gaps closed; discovery-shaped gaps are the build's first slice's job (spike). Build frontier unchanged: tgo-96f.1 scaffold.

---

## Amendments (2026-08-06, tgo-96f.8/10/12 reviews)

- **G1 — Skill bundle: 11/13 → 13/15.** Added `to-questionnaire` + `wizard` (Bernstein, advisory) per the Pocock v1.2.x review. FINAL BUNDLE lives in `docs/spec/skill-candidates.md` (authoritative).
- **G9 — Cleanup cadence (corrected):** the `--dolt` flag lives on **`bd admin compact --dolt`** monthly, NOT top-level `bd compact --dolt` (that flag doesn't exist). See `docs/spec/features.md` §3.
- **G12 — Preset switching (amended):** applied at **plugin load** (config hook), not "at delegation boundary"; prose nudge persists via `bd remember --key tgo.preset`. See `docs/spec/features.md` §5.
- **G13 — Checkpoint posture (tgo-96f.11):** autonomous-loop encoding shipped in bernstein.md at 499/500 rendered — deepwork opt-in only + hard bounds (3 phases, token budget, cadence) + wake-on-event/heartbeat chains phases; `## CHECKPOINT REACHED` (resumable) pause list; stagnation (3 identical → intervene + progress checks + re-plan ladder). G5 empirical (subagent spawn/reuse + `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS`) split to **tgo-v6g** — needs a live opencode run.
- **G7 — Hook wiring (tgo-96f.6/.7, RESOLVED):** hooks #2 and #3 built. #2 = `SessionReconciler` (src/session.ts) syncing the board's live-state shim from `session.status`/`session.idle`/`session.compacted` + render-cache invalidation. #3 = `TaskFitController` (src/fit.ts) on `tool.execute.after` for the `task` tool — lane-rejection patterns append a `REROUTE-NOT-RETRY` signal naming the delegated seat; source-verified by-reference output mutation (opencode prompt.ts `handleSubtask` reads `result.output` after the trigger). All four runtime hooks now implemented.
- **Deps + works-well-with (tgo-96f.2, RESOLVED):** installer now runs a dependency layer — `src/deps.ts` registry pins beads/AFT/magic-context/context7 (spec §1-2; context7 added per mcp-permissions, the ticket's "three" list predates it). Presence detection is injectable (`hasBin`/`readConfigText`) and installs run through an injectable runner, so tests never touch the real system. `--deps auto|check|skip` (default auto = check + install missing); install output now also prints the `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS` note (spec §3 promised "README + install output"). The "works well with" page ships as `assets/works-well-with.md` (pinned engine deps + coexisting suites: Matt's skills/superpowers/gsd, per skill-curation §3) and is copied into the config dir, no-clobber.
- **Per-repo setup auto-trigger (tgo-96f.14, RESOLVED):** `SetupController` (src/setup.ts) runs on `session.created` (primary sessions only, via `info.parentID`) — `bd init` → `bd setup opencode` → TGO AGENTS fragment, idempotent + no-clobber (marker = `.beads/` + both AGENTS markers). `setup: { enabled, autoInstallBeads }` config switches (autoInstallBeads reuses deps.ts's beads install command). The architecture s6 non-load-bearing setup skill ships as `assets/skills/tgo-setup/SKILL.md`, copied into the config dir at install. G10's D-half (merge content = TGO thin fragment + official `bd setup opencode` block) confirmed built; the live `session.created` firing under a real opencode run is now VERIFIED (tgo-v6g, 2026-08-07).
- **G5 + setup live verification (tgo-v6g, RESOLVED 2026-08-07):** live headless run confirmed (a) `session.created` fires for primary (`parentID:null`) → SetupController ran `bd init → bd setup opencode → AGENTS fragment` in a fresh repo, and idempotently skipped on the second run; (b) `session.created` fires for subagents too (`parentID` = delegator) so the primary-only gate skips them; (c) subagent sessions are **respawned per task call, not reused** across chained phases (two distinct session ids observed); (d) background mode is gated by `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true` — with it, `background:true` tasks launch async and the primary reaches idle first; without it the task tool schema omits `background` and `TaskTool.execute` hard-fails. Also found + fixed a real bug: bd subprocesses via Bun's `$` shell didn't inherit `HOME`, so bd wrote a telemetry config to a literal `~/` dir inside the target repo — plugin.ts now passes `HOME: os.homedir()` (shared `BD_ENV`).
- **G1 skill bundle (tgo-96f.13, RESOLVED 2026-08-07):** the 13-skill FINAL BUNDLE ships as `plugin/assets/skills/<name>/SKILL.md` and is copied into the config dir `skills/` by the installer (generalized `copySkillBundle`, no-clobber; 14 total incl. tgo-setup). Per-seat grants implemented as `permission.skill` pattern objects (`"*": deny` + named allows) in seat frontmatter: Bernstein 8, Horowitz 2, Nas 1, Dylan 4 (diagnosing-bugs granted to 3 seats = 15 grants). `validate` enforces grant↔shipped consistency. **Live-verified:** Bernstein sees exactly its 8 granted skills and a denied skill load is blocked at the permission layer (`permission=skill pattern=* action=deny`); under real delegation Horowitz's `bmad-deep-recon` load was likewise denied. Config-dir skills win name collisions with external suites (scanned last). Bernstein's seat prompt was trimmed to 497/500 to pay for the grant block. Bundle contents: wayfinder, grilling, to-tickets, bmad-build-auto, verification-planning, diagnosing-bugs, to-questionnaire, wizard, code-review (Standards+Spec+five-lens+Fowler), bmad-deep-recon (read-only), implement, tdd, receiving-code-review.
- **G2 — Enhanced webfetch: DROPPED (tgo-a6r.20, RESOLVED 2026-08-07).** The build-time flag for slim's enhanced webfetch (llms.txt probing, content extraction, secondary-model summarization) is formally removed from `mcp-permissions.md` §1 and `gap-review.md` G2. Native OpenCode webfetch + the concision layer cover the value; the plugin never reimplements host tools (`architecture.md` thin-core principle). No plugin-side webfetch tool is built.
- **De-theming — RESOLVED (2026-08-07).** All music/band metaphors removed from seat prompts and spec docs, per user. Names (Bernstein/Horowitz/Nas/Dylan/Nirvana/cobain/grohl/novoselic) retained as pure identifiers; identity lines rewritten strictly role-based: Bernstein "scheduler, never worker", Dylan "execute the spec", Horowitz "review what exists", Nas "research fast and precisely", Nirvana "merge three lens perspectives". `roster.md` standing rule updated; build.test.ts assertion updated. Token counts dropped (Bernstein 497→493).
- **"Band" terminology restored — RESOLVED (2026-08-07).** User prefers the term "band" to "council" for the Nirvana mechanism. The trigger phrase is back to **"run it by the band"**; `docs/spec/council.md` → **`docs/spec/band.md`**; `docs/adr/0003-council.md` → **`docs/adr/0003-band.md`**. Mechanism references renamed throughout: "council" → "band", "councillors" → "band members", "Council Response" → "Band Response", "Council Summary" → "Band Summary". The config/preset key is now **`band-members`** (was `councillors`); `COUNCIL_LENS_SEATS` → `BAND_LENS_SEATS`. No other theming re-added — seat names remain pure identifiers and identity lines stay role-based. All prompts, code, tests, spec docs, and README updated; tests + typecheck + validate green. (Amends the 2026-08-07 de-theming decision's trigger phrase only.)
- **Seat-prompt budget: 500 → 600, frontmatter excluded — RESOLVED (2026-08-07).** `MAX_PROMPT_TOKENS` raised 500 → 600. The budget now counts only the **body** (frontmatter/permissions are config, not prompt — they never reach the model). New `stripFrontmatter()` + `estimatePromptTokens()` in config.ts; all enforcement points (install, load, `validate`, build display) use body-only. Gives Bernstein real headroom (rendered prompt ~364 body tokens) without abandoning the frugality principle. Spec docs + README updated to `<600 tokens (body only)`.
- **Full-build review — 5 fixes RESOLVED (2026-08-07).** A build-vs-plan audit (decisions/spec/ADR vs plugin source) surfaced five issues, all fixed:
  1. **BUG — config hook ran `memories --json` instead of `bd memories --json`** (`plugin.ts`), so the prose-nudge preset read (`resolveActivePreset`) always fell back to the config preset — the G12 runtime preset switching (features.md §5) was dead. Fixed by extracting `readPresetNudge(run)` in `presets.ts` (runs the `bd`-prefixed command, parses, tolerates failure) + regression tests.
  2. **GAP — JSON schema omitted the `setup` config key** while zod + README documented it. Added `setup` to `schema/tgo.config.schema.json` AND added a recursive **schema↔zod parity check** to `validate.ts` (`assertSchemaZodParity`, `$ref`-aware) so top-level and nested config keys can never silently drift again.
  3. **RISK — board injection defaulted to inject (`?? true`)** when a session's eligibility was unknown; if `chat.message` doesn't fire for a subagent session, the board could leak into a subagent. Hardened to **default-deny (`?? false`)** in `board.ts` transform — only sessions the gate explicitly marked eligible receive the board. Existing board tests were fixed (they had silently relied on the old default via mismatched session IDs).
  4. **DEAD CODE — the resumable-session aliases shim** (`setAlias` in `session.ts`, ALIASES board section, shim map) was never populated by any production code, only tests. **Removed** (user decision): `setAlias`, `aliases` from `BoardShim`, the ALIASES renderer, and related tests; spec/ADR/README updated to describe the shim as streaming-only. A resumable-alias feature can return with a real producer.
  5. **NO-OP — load-time budget check defaulted to the plugin package's own `agent/` dir** (empty), so it never checked the rendered seats. Default `agentDir` to `~/.config/opencode/agent` (the dir the installer writes); `validateAgentDir` still tolerates an absent dir. README's load-time caveat updated to match.
   Gate after fixes: typecheck clean, 138 tests / 426 expects green, `validate` PASSED (now including the schema↔zod parity check).
- **Follow-up tickets RESOLVED (2026-08-07).** The four issues filed from the walkthrough (tgo-2xs, tgo-7f5, tgo-g94, tgo-3fa) were closed:
  1. **tgo-2xs (P2) — load-time seat-prompt check now warns, never throws.** Probed headless (opencode 1.18.13): a throwing plugin factory makes opencode **silently drop the entire plugin** (no error, no hooks). Since install/validate already enforce the budget strictly, load-time wraps `validateAgentDir` in try/catch and logs a warning — an oversized hand-edited seat can no longer take TGO down. Verified: plugin loads and fires hooks after the warning.
  2. **tgo-7f5 (P3) — per-repo setup is now granular.** `maybeSetup` computes exactly which steps are missing (`bd init` only when `.beads/` is absent; `bd setup opencode` when the beads block is missing; AGENTS fragment when the TGO markers are missing). Probed: `bd init` on an existing store exits 1 ("Aborting.") — harmless but pointless, and it's now never re-run. Verified against a real initialized store: only the AGENTS fragment ran.
  3. **tgo-g94 (P3) — installer can self-register the plugin.** New `bun run setup --register` flag adds `trans-genderian-orchestra` to the global `opencode.json` `plugin` array (idempotent, no-clobber, recognizes string/tuple/object entries; `--register <module>` for a custom path). Default remains off to avoid surprising config edits; the README still documents the manual symlink/npm path.
  4. **tgo-3fa (P4) — STREAMING target names subagent seats.** The `agents` map moved into the shared `BoardShim`; the board transform now records `info.agent` for every session, so the STREAMING board section renders `sess-xyz → dylan` instead of `→ subagent`. Live-probed (opencode 1.18.13, `opencode run`): `chat.message` DOES fire for subagent sessions (so `noteAgent` already names them) and the transform fires too — the transform write is a belt-and-braces second writer. Unknown sessions still fall back to "subagent".
   Gate after fixes: typecheck clean, 148 tests / 449 expects green, `validate` PASSED, 8 seats render under budget.
- **Blank-slate install — self-registration default ON + background env auto-write (2026-08-08).** User requirement: a completely blank opencode install must run the installer and get *all* of TGO's functionality with no manual steps. Audit confirmed the installer already restores seats, AGENTS fragment, global config (depth 2 + todowrite deny), the 13-skill bundle, and auto-installs the 4 engine deps (bd, AFT, magic-context, context7) via `--deps auto`. **Gap 1:** plugin self-registration defaulted to OFF (`--register` opt-in), so a blank-slate install produced config files but nothing loaded them. **Fix:** registration now defaults ON (opt-out with `--no-register`; `--register <module>` still allows a custom path). Live-verified: `bun run setup` on a fresh dir writes `trans-genderian-orchestra` to the `plugin` array, and a symlinked local plugin loads + fires hooks from a blank slate. **Gap 2:** `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS` (nirvana's parallel lens spawns) could not be set by the installer — opencode has no `env` config key, and a plugin factory setting `process.env` is too late (RuntimeFlags snapshotted at startup; verified against the opencode binary). **Fix:** adopted oh-my-opencode-slim's approach (`src/agents/background-subagents.ts` pattern) — the installer writes an idempotent marker block (`# >>> tgo background subagents >>>` … `export OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true`) to the shell startup file (`~/.zshrc` / `~/.bashrc` / fish `conf.d`), skipping when already set and opting out via `--no-bg`. Verified: writes, idempotent (re-run = 1 block, user content preserved), env-already-set skips.
