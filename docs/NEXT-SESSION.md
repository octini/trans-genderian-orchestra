# TGO Handoff — 2026-08-28 (end of ideation session)

## State
- 0.2.2 published to npm (this release). Master HEAD: see `git log --oneline -3`. Key commits: 4b51c8d + 4bd9439 (tier 1+2 waves), b45d92d (review fixes), 00affad + 191811a (tgo-v2e seat reconcile).
- After restarting OpenCode on 0.2.2: self-update swaps the slot, then seat reconcile fires on load — verify `grep steps: ~/.config/opencode/agent/dylan.md` shows 100 (nas 60, horowitz 40) and look for the "tgo: seat frontmatter refreshed" warn line. Until verified, delegated sessions still run on steps:20 — keep dispatch specs micro-scoped.
- Gates at release: tsc clean, 570 pass / 0 fail (36 files), lean build OK. Horowitz approved seat-sync after two review rounds (blockers: raw-template diff, agents-dir divergence, backup-failure overwrite, non-atomic writes — all fixed).

## User decisions on record
- Approved ALL 6 improvement directions (pending research lightbulbs): (1) sidebar problems view for stuck/aborted/idle delegated sessions, (2) automated exit-gate execution (per-repo gate profile, auto-run at delegation close), (3) worktree lane auto-enforcement, (4) convoys (wave = bead grouping, auto-landing), (5) quota-aware presets + cost surface, (6) recursion/spawn-cycle blocking.
- Authorized 0.2.2 release with tgo-v2e fix included. Fresh install NOT needed — self-update + load-time reconcile repairs seats; nothing user-owned is touched by reinstall (beads live in repo .beads/, Magic Context memories in its own per-project store).
- Wants broader research before locking the roadmap — see Research below. Next session's main event: discuss and select features, then ticket (tgo-5qx is the tracking issue).

## Research results (Nas wide pass, 2026-08-28)
TOP-5 lightbulbs (ranked by leverage vs cost):
1. **Permission-layer fusion sidekick** (opencode-fusion, archived; theory: cognition.com/blog/devin-fusion) — deny main seat's edit/search/free-bash at the opencode permission layer; cheaper sidekick edits, main reviews. 35-60% cost cut (Cognition-claimed, not independently verified) + cross-vendor second read for free. Makes cost control mechanical instead of advisory. github.com/mihneaptu/opencode-fusion
2. **Delta specs + 3-axis verify triage as exit gate** (OpenSpec, github.com/Fission-AI/OpenSpec) — SHALL/MUST + Scenario deltas, verify = Completeness/Correctness/Coherence with CRITICAL/WARNING/SUGGESTION triage; blocks silently-stale specs. Spec-aware upgrade for direction (2).
3. **Typed handoff manifest + scope-conflict wave planner** (bmad-method) — handoff-manifest.json (story/scope/wave/parallel-set/deps) + pairwise scope-conflict check at PLAN time; catches lane collisions before merge, gives convoys a typed input. Upgrades directions (3)+(4).
4. **wait_for_user explicit blocking state + one-shot continuation nudge** (oh-my-opencode-slim, docs/background-orchestration.md + PR 248) — "waiting on human" becomes first-class for the problems view; 6 safety gates prevent loops. Upgrades directions (1)+(6).
5. **Durable execution patterns from conductor-oss** (Netflix workflow engine — steal patterns, never the JVM engine) — HUMAN/WAIT durable gates, DO_WHILE per-iteration persistence, failureWorkflow saga compensation, version pinning of inflight executions, queue-depth backpressure metric for the sidebar.

Also notable: gsd-core stage-based model assignment (cheap model verifies, frontier plans — upgrades (5)); ruflo native Workflow JS fanout with schema-validated outputs (upgrades (4)); oh-my-pi isolation modes per task (worktree/FUSE/overlayfs/APFS clone — upgrades (3)); Measure's persistent lessons-learned.md/tech-debt.md surfaced at track start; LangChain clarification: LangGraph=runtime (graphs, checkpointing, interrupt), LangChain=framework (middleware: Summarization/HumanInTheLoop/ModelCallLimit — the steal for TGO's token budget), Deep Agents=opinionated preset on create_agent (no new runtime).

## Open items
- tgo-oy3 (P3): board cache invalidation race + failureCounts cardinality — batch with next code wave.
- tgo-12u: still ungrounded (needs bd CLI investigation).
- Accepted residual: seat reconcile is fire-and-forget (ms-wide window where load finishes before repair).
- Horowitz nits, non-blocking: renderSeats console.warn during load; no backup-failure/rename-failure/register-natural tests; resolveAgentsDir truthiness on empty agentDir.
- tgo-5qx: ideation phase 2 tracking issue — research logged, selection discussion pending.

## First moves next session
1. `bd ready` + read this file + tgo-5qx comments.
2. Confirm seats repaired (grep steps:).
3. Discuss top-5 + 6 baseline directions with user → ticket selected features with five-part specs.
