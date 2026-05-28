# OMO-Slim Modifications — Project State

## Status: Implementation Phase Complete — Critical fixes applied; 1008 tests passing

This file tracks the current state of the omo-slim modifications project. Updated after every session.

## Current Phase
- ~~Phase 1: Requirements gathering and design~~ ✅ COMPLETE
- ~~Phase 2: Research and exploration of reference frameworks~~ ✅ COMPLETE
- ~~Phase 3: Agent architecture design (Cluster 1 — Operational Config)~~ ✅ COMPLETE
- ~~Phase 4: Content design (Cluster 2 — Agent prompts, delegation envelope, context flow, skill curation)~~ ✅ COMPLETE
- ~~Phase 5: Implementation~~ ✅ COMPLETE
- Phase 6: Testing and refinement

## Delegations Log

| # | Task | Agent | Date |
|---|------|-------|------|
| 1 | Beads initialized (stealth mode) | Orchestrator | 2026-05-24 |
| 2 | Research all reference frameworks & recommend best skeleton | @librarian | 2026-05-24 |
| 3 | Evaluate agent lineup design | @oracle | 2026-05-24 |
| 4 | Research session management patterns across frameworks | @librarian | 2026-05-24 |
| 5 | Research failure/retry/circuit-breaker patterns across frameworks | @librarian | 2026-05-25 |
| 6 | Evaluate council trigger conditions | @oracle | 2026-05-25 |
| 7 | Full initial message audit (addressed vs. pending topics) | Orchestrator | 2026-05-25 |
| 8 | Draft Cluster 2 content design specifications | @librarian | 2026-05-25 |
| 9 | Design gap closure — fix coverage for all 30 points | @oracle + @fixer | 2026-05-25 |
| 10 | Oracle review round 3 — final design audit | @oracle | 2026-05-25 |
| 11 | Council review round 1 — full tri-focus audit | @council | 2026-05-25 |
| 12 | Fixer patch round — address all 9 council issues | @fixer | 2026-05-25 |
| 13 | Council review round 2 — verification & final verdict | @council | 2026-05-25 |
| 14 | Background orchestration re-evaluation — native OpenCode support research | @librarian | 2026-05-25 |
| 15 | Background orchestration design update — DROP→opt-in v1 | Orchestrator | 2026-05-25 |
| 16 | Fork + initial agent cleanup — strip old agents, merge researcher/builder | @fixer | 2026-05-25 |
| 17 | Delegation envelope enforcement hook (runtime validation) | @fixer | 2026-05-25 |
| 18 | Path-gating pre-tool hook (per-agent write patterns) | @fixer | 2026-05-25 |
| 19 | First-turn read preamble (standardized specialist initialization) | @fixer | 2026-05-25 |
| 20 | Skill curation (reconcile pool with design kept/dropped matrices) | @fixer | 2026-05-25 |
| 21 | Context file orchestration (state.md, handoff.md, notes.md lifecycle) | @fixer | 2026-05-25 |
| 22 | Fix subagent delegation failures (integration test findings) | @fixer | 2026-05-25 |
| 23 | Critical fixes: orchestrator permissions, config deep-merge, default model chains, prompt tightening | @fixer | 2026-05-28 |
| 24 | Startup init feature + config-level path gating implementation | @fixer | 2026-05-28 |
| 25 | Context files refreshed and initial project state committed | @fixer | 2026-05-28 |

## Framework Research Results

### Ranked Recommendations for Starting Skeleton

**1st Choice — oh-my-opencode-slim**
- Best programmatic foundation. TypeScript hook architecture fully wired.
- Already supports: model fallbacks, agent presets, per-agent skill/MCP sandboxing, Council feature
- Forking = fastest path since user already knows it
- Modification needed: strip orchestrator's write/plan tools, make it pure dispatcher

**2nd Choice — small-opencode-orchestrator**
- Cleanest, most token-efficient workflow
- Built on OpenCode's native config, minimal custom code
- Orchestrator delegates planning to plan-runner, execution to code-executor
- Perfect fit for "dispatcher" design goal

**3rd Choice — opencode-orchestrator (by agnusdei1207/0xSero)**
- Strict 4-agent architecture (Commander, Planner, Worker, Reviewer)
- In-memory session pool, parallel task queues, strict role guards
- Good structural reference

### Hybrid Strategy
1. **Core:** Fork omo-slim (TypeScript plugin skeleton) — CONFIRMED
2. **Planning:** Borrow GSD/OpenSpec methodology (structured specs, approval gates) — CONFIRMED
3. **Context:** Borrow small-opencode-orchestrator's token-conscious context pruning — CONFIRMED
4. **Verification:** Borrow Swarm's gatekeeper pattern — CONFIRMED

## Key Decisions

### Agent Lineup (Final)

| Agent | Role | Permissions | Notes |
|-------|------|-------------|-------|
| orchestrator | Pure dispatcher — routes, delegates, synthesizes | read, bash (diag) | Never writes files, plans, or implements; writes ONLY state.md and handoff.md |
| planner | Decomposes complex requests into structured plans | read, bash, web, MCPs | Only invoked for multi-part/complex work; writes plan.md |
| researcher | Codebase + external docs research | read, bash, web, MCPs | Combines explorer + librarian |
| builder | Design + implementation | all | Full permissions; micro-sketch only for direct-to-builder tasks (non-blocking) |
| reviewer | Verification gate + strategic advisor | read-only | Dual personas (Advisory + Verification) via delegation envelope; mandatory on every delegation |
| council | Multi-LLM consensus for critical decisions | read-only | Escalation-only; 3 councillors + synthesizer |

Note: The reviewer is mandatory on every delegation regardless of risk tier. This is a deliberate design choice to recreate GSD-style validation loops. The risk-tier gating was considered and rejected.

### Cluster 1 Decisions (2026-05-25)

#### Timeouts
- planner: 10 minutes
- researcher: 10 minutes
- builder: 25 minutes
- reviewer: 10 minutes
- council: 10 minutes per councillor
— CONFIRMED

#### Model Config
- OpenCode's native per-agent config carries over (model, variant, temperature, top_P, steps)
- Dispatcher plugin presets: fully customizable per-agent model arrays (primary + 2 fallbacks)
- NO global fallback chains — fallbacks are entirely per-preset
- `reasoningEffort` controlled via OpenCode `variant` field mapping to `thinkingLevel`/`thinkingBudget` in provider model definitions
— CONFIRMED

#### Retry / Failure Policy (4-Tier Resilience)
1. **Transient Error Guard:** Sequential model fallback chain (15s timeout per model). Circuit breaker per model/provider (3-state: CLOSED/OPEN/HALF_OPEN, threshold: 5 failures, recovery: 30s, 2 successes to close). Failures not counted against breaker while fallback models remain.
2. **Specialist Trajectory Guard:** Same-session retry with structured feedback (attempts 1-3), session rotation on attempt 4, escalate to user on attempt 5. Repeated errors (same hash) trigger explicit repetition warning.
3. **JSON Self-Correction:** Post-execution hook detects malformed output, appends structured recovery guidance.
4. **Error Handling:** Transient errors (timeout/429/503) auto-retry through fallback chain. Semantic failures escalate. Session preserved on failure for investigation; `/reset-session <agent>` for manual rotation.
— CONFIRMED

#### Fallback Chains
- Per-preset model arrays embedded in each agent's preset entry
- Format: `"agent_name": { "model": ["primary", "fallback1", "fallback2"] }`
- No global `fallback.chains` config (unlike omo-slim)
- Dispatch loop tries each model sequentially until success or exhaustion
— CONFIRMED

#### Council Triggers (Two-Tier)
**Direct-to-council (automatic):**
1. User explicit request
2. Planner-flagged `critical` risk (structured tier field in plan)
3. Reviewer rejection loop (after 2nd rejection on same task) — council fires immediately

**Advisor-first → council escalation:**
4. Specialist/source material disagreement (must be materially contradictory AND load-bearing)
5. Security architecture decisions (not implementation — reviewer handles implementation security)
6. Planner plan conflicts with user intent or known constraints (reframed from "disagreement with orchestrator" — orchestrator shouldn't have independent technical opinions)

Risk tiers: low | medium | high | critical. Council fires automatically on `critical`. `high` routes to reviewer advisory mode first.
— CONFIRMED

### Session Management (from prior session)
- state.md: 3-section markdown (Current Stream / Active Sessions / Recent Delegations)
- Background orchestration: opt-in in v1 via native `task(background=true)` (see §3.6.2)
- Stream lifecycle: explicit `/new-stream` and `/close-stream` commands
- Session reuse: builder + researcher reuse within stream, fresh between streams; planner + reviewer always fresh; council always fresh
- maxReuseCount: 10 tasks per session (builder + researcher)
- Compaction: 40-turn soft threshold → summarize to state.md without rotating; 10-task hard threshold → rotate
- Orchestrator write boundary: state.md + handoff.md only (pre-tool hook allowlist)
- omo-slim's task-session-manager alias hook: KEEP
- opencode-orchestrator's maxReuseCount (10): ADOPT
- Swarm's compaction hooks + cross-agent context injection: ADOPT

## Cluster 2 Decisions (2026-05-25)

### Delegation Envelope
- **Format:** JSON block wrapped in `<delegation_envelope>` XML tags, embedded inline in Task tool prompt
- **Schema:** Zod-validated with self-correction hook for malformed output
- **Fields:**
  - `verbatim_request` (string, required) — exact user words
  - `task` (string, required) — targeted task description
  - `acceptance_criteria` (array of strings, min 1)
  - `context_summary` (string, required) — compressed "where we are"
  - `file_references` (array of {path, purpose, focus_lines?}, default [])
  - `agent_mode` ("verification" | "advisory", optional — mandatory for reviewer)
  - `risk_tier` ("low" | "medium" | "high" | "critical", default "low")
  - `plan_ref` (string, optional — path to plan.md)
- **Excluded fields (moved to global config):** `skills`, `error_strategy`, `session_id`, `agent`
- **Validation:** Post-execution hook detects missing/invalid envelope JSON, appends corrective guidance
— CONFIRMED

## Key Decisions & Specifications (Cluster 2 Resolved)
- **Agent Prompts**: Concisely designed for Orchestrator, Planner, Researcher, Builder, Reviewer, and Council in `designs/cluster2_content_design.md`. ✅ COMPLETE
- **Delegation Envelope Format**: Zod-validated JSON schema wrapped in XML, detailed in `designs/cluster2_content_design.md` Section 2. ✅ CONFIRMED
- **Context Flow & File Formats**: Shared flat Markdown files (`AGENTS.md`, `state.md`, `plan.md`, `notes.md`) mapped in `designs/cluster2_content_design.md` Section 3. ✅ COMPLETE
- **Skill Curation**: Kept vs. Dropped matrix detailed in `designs/cluster2_content_design.md` Section 4.2. ✅ COMPLETE
- **MCP vs. Skill Tradeoffs**: Cost-efficiency analysis and decision rules defined in `designs/cluster2_content_design.md` Section 4.3. ✅ COMPLETE
- **Preloading vs. On-Demand Skills**: Three-tier loading hierarchy established in `designs/cluster2_content_design.md` Section 4.1. ✅ COMPLETE
- **Parallelization Model for v2**: Git worktree isolation with reviewer-led merger and auto-reconciliation detailed in `designs/open_questions_resolved.md` Section 1. ✅ COMPLETE
- **AGENTS.md Global vs. Per-Project Design**: Hierarchical Markdown cascading and Zod parsing compiled in `designs/open_questions_resolved.md` Section 2. ✅ COMPLETE
- **Orchestrator Init Prompt & Project Initialization**: Startup environment audit and interactive dialog flow structured in `designs/open_questions_resolved.md` Section 3. ✅ COMPLETE

---

## Oracle Review (2026-05-25)

Oracle reviewed the unified design doc for internal consistency, functional viability, and topic coverage. Results:
- **Consistency:** 15 findings (8 major, 7 minor) — all resolved.
- **Viability:** 15 risks assessed with mitigations — documented in design.
- **Coverage:** 22/30 ✅, 7/30 ⚠️, 1/30 ❌ — all addressed.
- **Next step:** Second Oracle review to verify resolutions.

## Oracle Review Round 2 (Second Pass)

Status: **Pass with corrections** — 10 items addressed in parallel fixer round.
- All 12 resolved consistency items reconfirmed
- R10 (escalation mechanism), N-V5 (quick-fix gate), N-C3 (schema overlap), N-V1 (error classification), N-V8 (merge strategy) — blocked and fixed
- Remaining items: tracked as known-issues for implementation phase
- Next: Council review

## Oracle Review Round 3 (Final — Unconditional Green Light)

Status: **🟢 Unconditional Green Light** — 30/30 coverage, 7 specification gaps closed.
- All prior 15 consistency findings reconfirmed resolved
- 7 minor gaps patched: reviewer_adherence_rate, Builder timeout semantics, handoff.md ownership matrix, models.min(1) optional, path-gating enforcement, first-turn read preamble, extra_params vs passthrough()
- Final verdict: **"Proceed with confidence to council review."**

## Council Review Round 1 (Tri-Focus Audit)

Status: **CONDITIONAL** (88% confidence) — 30/30 coverage confirmed.
- **3 equal criteria:** Coverage audit vs original 30-point prompt, implementation quality comparison (new vs old design), internal consistency & functional soundness
- **New design is BETTER than old on:** delegation envelope (Zod-validated), resilience (4-tier), context flow (3-pillar pipeline), AGENTS.md inheritance (cascading parser), skill curation (kept/dropped matrices), reviewer (dual-persona), council triggers (two-tier)
- **5 must-fix items identified:** reviewer_adherence_rate contradiction, Builder timeout math, handoff.md ownership ambiguity, models.min(1) vs AGENTS.md template, Reviewer quick-fix scope too broad
- **4 should-fix items identified:** unify extractDelegationEnvelope with parseAndCorrect, package placeholder, context7 reversal doc, background orchestration deferred

## Council Review Round 2 (Final — Unconditional Green Light)

Status: **🟢 Unconditional Green Light** (94% confidence) — all 9 issues resolved.
- All 5 must-fix items: addressed by fixer patches and verified
- All 4 should-fix items: documented and applied
- One additional §1.5 alignment fix (quick-fix glob vs path-gating table) — applied
- Final verdict: **"Design is architecturally sound, fully covers all 30 requirements, and is ready for implementation."**

---

## Implementation Status Checklist

### ✅ Complete — Design Spec (§1-§4, Cluster 2)
| Feature | Status | Files |
|---------|--------|-------|
| §1 Agent prompts (orchestrator, planner, researcher, builder, reviewer, council) | ✅ | `src/agents/*.ts` |
| §2 Delegation envelope schema + extraction + self-correction | ✅ | `src/config/delegation-envelope.ts` |
| §2 Delegation envelope enforcement (runtime hook) | ✅ | `src/hooks/delegation-envelope/hook.ts` |
| §3.1 AGENTS.md template | ✅ | `AGENTS.md` |
| §3.1.1 Path-gating pre-tool hook (per-agent write patterns) | ✅ | `src/hooks/path-gating/hook.ts` |
| §3.2 state.md orchestration | ✅ | `src/hooks/context-orchestrator/hook.ts` |
| §3.3 plan.md (handled by planner agent) | ✅ | `src/agents/planner.ts` |
| §3.4 notes.md (builder/researcher owned) | ✅ | `src/hooks/context-orchestrator/hook.ts` |
| §3.5 handoff.md + escalation triggers | ✅ | `src/hooks/context-orchestrator/hook.ts` |
| §3.6.1 First-turn read preamble (specialist prompts) | ✅ | `src/agents/*.ts` |
| §3.6.2 Background orchestration (opt-in v1) | ✅ | Native OpenCode `task(background=true)` |
| §4.1 3-tier skill loading | ✅ | `src/skills/skill-loader.ts` |
| §4.2 Skill curation (kept/dropped matrices) | ✅ | `src/skills/skill-loader.ts` |
| Agent permissions + tool sandboxing | ✅ | `src/agents/index.ts` |
| Orchestrator delegation permissions (`task` allowed, implementation shell denied) | ✅ | `src/agents/index.ts` |
| Agent config deep-merge (permissions/options preserved under overrides) | ✅ | `src/index.ts`, `src/config/loader.ts` |
| Default model fallback chains + variants | ✅ | `src/config/constants.ts`, `src/agents/index.ts` |
| Orchestrator prompt tightening (pure delegation, no direct implementation path) | ✅ | `src/agents/orchestrator.ts` |
| 4-Tier Resilience (circuit breaker, trajectory guard, JSON correction) | ✅ | Various hooks |
| 1008 tests passing, build clean | ✅ | — |

### ✅ Complete — Startup Init
| Feature | Status | Files |
|---------|--------|-------|
| Audit (git, beads, skills) | ✅ | `src/hooks/startup-init/index.ts` |
| `/init` command (git init + AGENTS.md seed) | ✅ | `src/hooks/startup-init/index.ts` |
| `/beads:init` command | ✅ | `src/hooks/startup-init/index.ts` |
| `/setup-skills` installer execution | ✅ | `src/hooks/setup-skills/index.ts` |
| AGENTS.md template | ✅ | `templates/AGENTS.md` |
| Tests (19 pass) | ✅ | `src/hooks/startup-init/index.test.ts` |

### ✅ Complete — Config-Level Gating
| Feature | Status | Files |
|---------|--------|-------|
| `agentGating` schema in PluginConfig | ✅ | `src/config/schema.ts` |
| Deep merge support for gating | ✅ | `src/config/loader.ts` |
| Path-gating hook reads config overrides | ✅ | `src/hooks/path-gating/hook.ts` |
| Config-level tests (6 new) | ✅ | `src/hooks/path-gating/index.test.ts` |
| Wired into plugin entry point | ✅ | `src/index.ts` |

### ❌ Not Yet Implemented
- **GitHub remote setup** (push fork, CI config)
- **End-to-end manual smoke test** in a live OpenCode session — validate full delegation cycle with envelope enforcement, path gating, startup init prompts, and state/handoff logging
- **Release/packaging validation** — verify published artifact contents after the fork rename/config docs are finalized

## Next Likely Steps

1. **Run live smoke test** — Configure local plugin, launch orchestrator, execute a delegation cycle, and verify delegation envelope + path-gating + startup init + state.md/handoff.md behavior.
2. **Prepare GitHub remote/CI** — Push fork, set up remote tracking, and add CI for `bun run check:ci`, `bun run typecheck`, and `bun test`.
3. **Package/release validation** — Verify templates, skills, hooks, generated schema, and built artifacts are included correctly before any beta publish.
