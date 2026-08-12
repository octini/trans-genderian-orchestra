# Architectural review — Augment Code guide + linked sources

Review of the TGO plan against: Augment Code "Multi-Agent Orchestration: A Practical Architecture Without the Buzzwords" guide and its linked sources. Produced 2026-08-04 to inform the TGO spec. This file records what validates the plan and what should change.

## Sources

- https://www.augmentcode.com/guides/multi-agent-orchestration-architecture-guide (Ani Galstian, May 2026)
- https://www.anthropic.com/engineering/harness-design-long-running-apps (Prithvi Rajasekaran, Mar 2026)
- https://www.augmentcode.com/guides/living-specs-for-ai-agent-development (Molisha Shah, Mar 2026)
- MAST failure taxonomy: https://arxiv.org/abs/2503.13657 (Cemri et al., 1600+ traces, 7 frameworks)
- SCF "Semantic Consensus": https://arxiv.org/html/2604.16339v1 (Acharya)
- Agentic Lybic: https://arxiv.org/html/2509.11067v1 (Guo et al., OSWorld 57.07%)

## Key facts learned

### The four primitives (every multi-agent system)
Decomposition (goal → DAG of subtasks), Routing (structural + conditional), State (shared, persistent), Recovery (detect → retry → re-plan → escalate). Every system comprises these four.

### Failure data (MAST)
- 1600+ annotated traces; 14 failure modes in 3 clusters: system design, inter-agent misalignment (36.9% of failures), task verification (21.3%).
- Coordination failures = 36.94% of all failures.
- SCF: production failures 41–86.7%; ~79% from specification and coordination, not model capability.

### State management patterns (5)
Blackboard/shared memory (~2x RAG token cost, broadcast + self-selection); graph-based message passing (low, pull-only); **living specifications** (minimal, external artifact survives context resets); hierarchical summarization (medium, amortized); event-driven delta delivery (low, governance).

### Recovery patterns (failure → recovery)
- Error cascading → schema validation gates at handoffs (system/harness level).
- Infinite loops → two-level turn caps + boolean exit gates in shared state (system).
- Context drift → living spec as correctness anchor (coordination artifact).
- Verifier false passes → independent dual-agent verification (system).
- Parallel write conflicts → one-writer-per-module, isolated git worktrees (architecture).
- Vague handoff conditions → boolean exit gates with explicit success criteria (state file).

### Topology
- Hub-and-spoke: strong state consistency, high observability, single point of failure, hub bottleneck. Best for spec-driven refactors, compliance-auditable workflows.
- Mesh: O(N²) communication, no global owner → semantic contradictions.
- Hierarchical: partitions context, no single agent needs full context.
- AdaptOrch benchmark: adaptive topology selection +22.9% over best single baseline (62% hybrid, 24% parallel, 14% hierarchical).

### Context / long-running agents (Anthropic)
- Two failure modes: context-loss incoherence, premature wrap-up near context limits ("context anxiety").
- Context RESET (fresh agent + structured handoff artifact) beats compaction (in-place summarization) for long tasks — compaction preserves continuity but not a clean slate.
- Anthropic's harness: planner (spec from 1-4 sentence prompt) + generator (one-feature-at-a-time sprints, self-evaluate) + evaluator (Playwright, sprint contract, hard thresholds). 20x cost of solo ($200 vs $9), far better output.
- Sprint contract: generator + evaluator agree on "what done looks like" BEFORE code — bridges high-level spec → testable implementation.
- Self-evaluation bias is the biggest lever: separating doer from judger is the fix; evaluator still needs tuning to be skeptical.
- "Every component in a harness encodes an assumption about what the model can't do on its own; those assumptions are worth stress testing." "Find the simplest solution possible, and only increase complexity when needed."

### Living specs (Augment/Intent/Cosmos)
- Static specs drift; living specs write implementation decisions BACK into the spec (bidirectional, phase 3 of 4).
- 7 sections: role/overview, key commands, architecture/critical files, code-style examples, three-tier boundaries, implementation status, decision log.
- Declarative outcomes beat imperative instructions (over-specification → ignored or followed too literally).
- Four triggers for spec review: after each implementation cycle; before spec→coding transition; when agents surface ambiguities; when data models/requirements change.
- Protected-decision markers (`<!-- BEGIN USER-SPECIFIED -->`) for non-negotiable constraints.
- Antipatterns: under/over-specification, mixed concerns, missing context continuity, vague success criteria, jumping to solutions, environment blindness, token-insensitive specs.
- Intent: Coordinator → spec → DAG → waves (same dependency level in parallel) → Verifier as blocking pre-merge check against spec. Bidirectional spec prevents alignment drift static tickets can't.

### SCF (semantic conflict detection)
- Semantic Intent Divergence: agents develop inconsistent interpretations of shared objectives; conflicts at intent level not detectable by schema.
- Types: contradictory intent, resource contention, causal violation.
- Key result: pre-execution conservative blocking (100% completion) beats post-hoc judge (25.1%). False positives cost retries; missed conflicts cost complete failure. Conservative > precise.
- Drift Monitor: continuous semantic-alignment scoring; re-sync when below threshold.

### Agentic Lybic
- FSM-based 4-tier: Controller (global state + triggers), Manager (DAG decomposition + adaptive re-planning), Workers (3 specialized), Evaluator (continuous quality gates).
- Quality gates: periodic check every 5 steps, stagnation detection (3 identical actions), success verification.
- Adaptive re-planning in 3 levels: light (parameter tweaks), medium (subtask reorder/dependency restructure), heavy (full re-decomposition).
- OSWorld SOTA 57.07%.

## What validates the TGO plan

1. **Hub-and-spoke + single-writer** — strong state consistency, pre-execution gating. Best structural choice for a small fixed roster. Validated by both topology table and SCF's conservative-beats-post-hoc finding.
2. **Separate Dylan (doer) from Horowitz (judger)** — Anthropic's single biggest lever (self-evaluation bias).
3. **Bernstein verify / Horowitz review split** — matches independent dual-agent verification.
4. **Capabilities-not-compliance permissions** — pre-execution prevention.
5. **Autonomy as opt-in bounded mode** — cost reality (20x solo).
6. **Nothing load-bearing in skills** — "every component encodes an assumption worth stress-testing."
7. **Worktrees for parallel implementation** — matches one-writer-per-module + isolated worktrees recovery.
8. **Checkpoint protocol (pause list)** — maps to the gsd/human-in-the-loop checkpoint patterns the literature endorses.
9. **Skills-over-MCPs + token discipline** — matches token-cost warnings (SCF: 20k+ tokens/turn for heavyweight MCPs).

## Holes identified → changes applied

### Change 1: Living-spec mechanism (biggest gap)
Every source converges on living specs as the correctness anchor against context/alignment drift (top-3 failure mode). TGO had the components (beads issues, bmad status machine) but not the discipline.
**Applied:** Bernstein's work-unit beads issue IS a living spec: bidirectional updates (implementation writes back what was built), explicit success criteria in the spec, verification against the spec (not just the diff), spec-review checkpoint before coding starts, decision log on the issue.

### Change 2: DAG + wave decomposition
Decomposition is primitive #1; best implementations decompose into a dependency-ordered DAG and run same-level tasks in parallel waves (Intent, Agentic Lybic).
**Applied:** Bernstein decomposes the goal into a DAG; tasks at the same dependency level dispatch together; the job board's "wave" is the parallel unit; next wave waits on prior.

### Change 3: Boolean exit gates
Vague handoff conditions + verifier false passes are documented failure modes; the fix is explicit deterministic success criteria in shared state.
**Applied:** every delegated task's Spec carries an explicit deterministic success criterion (tests pass, lint clean) that must be satisfied before Bernstein closes the issue.

### Change 4: Stagnation detection (small)
**Applied:** autonomous loop gains "repeated identical actions" detection + periodic progress checks (Agentic Lybic: 3 identical actions → intervene; periodic check every N steps), alongside max-phases/token bounds.

### Change 5: Adaptive re-planning levels (small)
**Applied:** Bernstein's failure response gains Agentic Lybic's light/medium/heavy vocabulary (tweak params → reorder deps → full re-decomposition), layered on the escalation ladder.

## What did NOT change

Overall shape holds: hybrid config-first + thin plugin, hub-and-spoke named roster, band, concision layer, beads-native integration, permission matrix. All changes are additions to Bernstein's mandate, not architecture changes.

## Notable data points for the spec

- Anthropic: multi-agent uses ~15x tokens vs chat; harness run 20x solo cost. Coordination overhead can exceed manual work — always consider "does this task need orchestration?"
- MAST: task verification breakdowns = 21.3% — verification gates are not optional.
- SCF: ~1 in 4 interactions produces a semantic conflict; conservative pre-execution gating is the only thing that prevents cascading failure.
- Splitting doer/judger is the highest-leverage change in the entire literature.
