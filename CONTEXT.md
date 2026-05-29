# OMO-Slim Modifications — Domain Glossary

## Project
**OMO-Slim Modifications (codename: "Dispatcher")** — A fork of oh-my-opencode-slim that transforms the orchestrator into a pure dispatcher (read-only router with no file writes, no planning, no implementation). The plugin lives in the repository directory `trans-genderian-orchestra/`, matching the internal package name. Uses a hybrid strategy borrowing patterns from small-opencode-orchestrator (token-conscious context pruning), OpenSpec/GSD (structured spec files with approval gates), and Swarm (gatekeeper verification).

## Core Concepts

**Orchestrator** — The central agent. Acts as pure dispatcher. Routes work to specialists, synthesizes results, maintains project state. Read-only: cannot write files, cannot plan, cannot implement. Only delegates. May write ONLY state.md and handoff.md (coordination metadata, not work product). Enforced via pre-tool hook allowlist.

**Planning Agent** — A dedicated agent responsible for decomposing complex requests into structured plans. Separate from orchestrator. Writes `.opencode/plans/` spec files. Not invoked for simple tasks (direct-to-builder path).

**Researcher** — Combines codebase search (Explorer) and documentation research (Librarian). Handles both internal code patterns and external library/docs lookups. Single agent avoids redundant cross-delegation.

**Builder** — Handles both design and implementation (merged Designer + Fixer). Full permissions. For direct-to-builder tasks (no planner), writes a non-blocking micro-sketch to scratchpad for diagnostic trail. For planned tasks, executes against planner's plan directly.

**Reviewer Agent** — Dual-persona gatekeeper. In **Verification Mode**: validates specialist output against the original request. In **Advisory Mode**: provides strategic advice, breaks ties, reviews ambiguous situations. Same agent, different persona selected via delegation envelope flag. Strictly read-only (writes mechanically gated — only trivial fixes with automated verification).

**Delegation Envelope** — Structured data package passed from orchestrator to specialist. Includes verbatim_request (user's original language, unchanged), task description, acceptance criteria, context_summary, file references, and agent_mode (for roles with multiple personas like reviewer).

**Return Protocol** — Specialist's completion report. Includes status (completed/partial/failed/needs_review/needs_info), what changed, files touched, validation results, risks. For complex cases, a handoff document is written instead of a simple summary.

**Council** — Multi-model consensus feature. 3 councillors (different models) and a synthesizer agent. Escalation-only: invoked on user request, planner-flagged critical risk, or reviewer rejection loop (≥2 cycles). For security architecture, source disagreement, or plan-intent conflicts, routes to reviewer Advisory Mode first.

**Persistent Shared Context** — Files (AGENTS.md, plan.md, state.md, handoff.md) that maintain shared understanding between agents across delegations. Read via AGENTS.md mandate, summarized by orchestrator in delegation prompts.

**notes.md** — A first-class persistent context file in `.opencode/notes.md`. Owned by Researcher and Builder, who write observational notes, micro-sketches, and diagnostic findings. Summarized into state.md at /close-stream by the orchestrator. See design §3.4 for full lifecycle.

**Work Stream** — A feature or phase within which builder and researcher sessions are reused. Between streams, sessions are fresh. Stream lifecycle: explicit `/new-stream` and `/close-stream` commands (no auto-detection).

**Preset** — A named configuration defining model assignments (primary + 2 fallbacks per agent), skill/MCP restrictions, and variant settings. Fully customizable per preset — no global fallback chains.

**4-Tier Resilience** — Failure handling strategy: (1) Transient Error Guard — sequential model fallback + circuit breaker per model/provider; (2) Specialist Trajectory Guard — same-session retry ×3 → fresh session → escalate; (3) JSON Self-Correction hook; (4) Error classification: transient (auto-retry) vs. semantic (escalate).

**Circuit Breaker** — 3-state (CLOSED/OPEN/HALF_OPEN) per model/provider. Opens after 5 consecutive failures, recovers after 30s, requires 2 successes to close. Failures not counted against breaker while fallback models remain available.

**Council Trigger** — Condition that causes orchestrator to invoke council. Two-tier: direct-to-council (user request, critical risk, reviewer loop) and advisor-first escalation (source disagreement, security architecture, plan-intent conflict).

**Path-Gating Hook** — Pre-tool enforcement that checks write/edit/apply_patch targets against per-agent path allowlists. Defaults keep the orchestrator limited to `.opencode/state.md`, `.opencode/handoff.md`, and `.opencode/plans/plan.md` status updates; planner to `.opencode/plans/`; researcher to notes/scratchpad files; builder broadly writable; and council/councillors read-only.

**Startup Init** — Dispatcher startup workflow that audits Git, Beads, and Matt Pocock skills, registers `/init`, `/init:all`, `/beads:init`, `/new-stream`, and `/close-stream`, and seeds project `AGENTS.md` from `templates/AGENTS.md` when absent.

**Ping-All Command** — `/ping-all` slash command that spawns concurrent lightweight `task` calls to all enabled specialist agents. Each receives a simple prompt; results collected with 10s timeout and displayed as a markdown table with ✅/❌ per agent.

**Worktree Reconciliation** — Skeleton architecture in `src/hooks/worktree-reconciliation/` for reviewer-led parallel work merging. Designed around: reviewer verifies each worktree's output and runs `git merge` on success, with conflict resolution escalating to the user.

## Agent Roles
- **Orchestrator** — Pure dispatcher (no code, no plans, no writes except state.md)
- **Planner** — Decomposes requests into structured plan.md
- **Researcher** — Codebase search + documentation research (merged Explorer + Librarian)
- **Builder** — Design + implementation (merged Designer + Fixer)
- **Reviewer** — Dual-persona verification gatekeeper + strategic advisor
- **Council** — Multi-model consensus (escalation-only, 3 councillors + synthesizer)
- **Councillor** — Internal read-only council participant spawned only by the council workflow
