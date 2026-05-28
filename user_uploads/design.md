# opencode-delegation-orchestrator Design Document

## Overview

A new OpenCode plugin that implements a read-only orchestrator pattern for AI agent delegation. The orchestrator acts purely as a dispatcher — it never writes code, never edits files, and never creates plans. All work is delegated to specialist agents via OpenCode's native subagent system.

## Philosophy

The orchestrator is a **non-technical team lead**, not an individual contributor. It coordinates specialists, makes routing decisions, and ensures work aligns with the user's intent. The specialists are the engineers who do the actual work — research, planning, building, and reviewing.

## Agent Lineup (4+1 Model)

| Agent | Role | Permissions | Model Tier | Timeout |
|-------|------|-------------|------------|---------|
| **orchestrator** | Team lead — read-only dispatcher, never writes or plans | read, bash (diagnostics only) | High (user's main model) | N/A |
| **planner** | Complex request decomposition into structured plans | read, bash, web, MCPs | High | 10 min |
| **researcher** | Internal codebase + external docs research | read, bash, web, MCPs | Fast/cheap | 10 min |
| **builder** | Full permissions — design + implementation | all | High | 25 min |
| **reviewer** | Loop-closer, validates against original intent | read, write (quick fixes only) | High | 10 min |
| **council** | Multi-LLM consensus for critical decisions | read-only (councillors) | Configurable | 10 min/councillor |

### Rationale for Consolidation

- **researcher** combines codebase search and external docs research: A single agent can search both internal code and external documentation. Simpler mental model, fewer context switches.
- **builder** combines design and implementation: UI/UX work and implementation are often intertwined. One agent owns the full build from design through code.
- **planner** remains separate from **orchestrator**: The dispatcher shouldn't plan — it should recognize when planning is needed and hand off to the specialist.

## Context Files (5 Separate)

| File | Purpose | When Updated |
|------|---------|--------------|
| **AGENTS.md** | Static reference: skills, plugins, MCPs, agent roles, rules | Rarely — version controlled |
| **plan.md** | Active plan with ordered tasks, dependencies, acceptance criteria | After planner completes |
| **state.md** | Active sessions, completed tasks, last delegation | After every delegation |
| **notes.md** | Free-form notes, observations, ideas, and context gathered during work | Continuously, by any agent |
| **handoff.md** | Optional — only when complications arise | As needed |

### Why Separate Files?

- **AGENTS.md** is static config — it doesn't change during a session
- **plan.md** and **state.md** update at different frequencies and for different reasons
- **notes.md** captures transient context that doesn't fit in state or plan (observations, hypotheses, bookmarks)
- Separating them avoids merge conflicts when multiple agents are active
- **handoff.md** is purely optional — only created when a session needs to be resumed by a different agent

## Routing Logic

The orchestrator performs lightweight classification on every request:

1. **Simple** — single clear task ("add a test", "fix this bug", "search for X")
   → Directly delegate to the appropriate specialist

2. **Complex** — multi-part work, cross-cutting changes, architectural decisions
   → Invoke planner first, then orchestrator delegates plan tasks to appropriate specialists

3. **Ambiguous** — unclear scope, conflicting requirements, or novel domain
   → Invoke grill-with-docs skill to clarify before proceeding

4. **Pure research** — "how does X work", "find examples of Y"
   → Delegate directly to researcher

5. **Review** — "check this PR", "review this design"
   → Delegate directly to reviewer

### Decision Flow

```
User Request
    ↓
[Simple?] → Direct delegation to specialist
    ↓ No
[Complex?] → Invoke planner → Delegate plan tasks to specialists
    ↓ No
[Ambiguous?] → Invoke grill-with-docs → Reclassify
    ↓ No
[Research?] → Delegate to researcher
    ↓ No
[Review?] → Delegate to reviewer
    ↓ No
[Unknown] → Ask clarifying question
```

## Delegation Envelope

Every delegation carries a structured envelope:

```typescript
interface DelegationEnvelope {
  // Exact user request, preserved verbatim
  verbatim_request: string;
  
  // Clean task description for the specialist
  task: string;
  
  // What "done" looks like
  acceptance_criteria: string[];
  
  // Summary of relevant context (not full files)
  context_summary: string;
  
  // File paths the specialist should read
  files: string[];
  
  // Target agent name
  agent: string;
  
  // Session ID for reuse (optional)
  session_id?: string;
  
  // Link back to plan task (if applicable)
  parent_plan_task_id?: string;
  
  // Skills to load (on-demand loading)
  skills: string[];
  
  // How to handle errors
  error_strategy: "fail_fast" | "best_effort";
}
```

## Return Protocols

### Standard Summary

Every specialist returns:

1. **Status** — `completed`, `partial`, `failed`, `needs_review`, `needs_info`
2. **What changed** — Bullet list of changes made
3. **Files touched** — Absolute paths
4. **Validation** — How the agent verified their work (tests, lint, etc.)
5. **Risks** — Any concerns or follow-ups needed

The `needs_info` status tells the orchestrator the specialist cannot proceed without clarification — this is distinct from `failed` (which indicates an error) and allows the orchestrator to ask the user rather than retrying blindly.

### Reviewer Integration

- **Reviewer is mandatory on EVERY delegation** — no exceptions
- Reviewer receives:
  - The original `verbatim_request`
  - The `plan.md` (if one exists)
  - The specialist's return summary
- Reviewer can:
  - Approve (return to user)
  - Request changes (send back to specialist)
  - Escalate to council (critical disagreement)
  - Apply quick fixes directly (minor issues only)

### Handoff Document

For complex cases where a session needs to be resumed:

- Invoke the `/handoff` skill
- Creates a structured handoff document with:
  - Original request
  - Current state
  - Blockers
  - Next steps
  - Relevant context

## Permission Enforcement (3 Layers)

To ensure the orchestrator never violates its read-only constraint:

1. **Config layer** — `edit: "deny"`, `write: "deny"` in agent definition
2. **Pre-tool hook** — Intercept tool calls before execution, block write/edit operations
3. **Prompt reinforcement** — Front-loaded system prompt with few-shot examples of delegation

This is borrowed from settings-opencode's mechanical delegation pattern.

## Model Configuration

Stored in a separate JSONC file (`config/models.jsonc`):

```jsonc
{
  // Global default
  "default_model": "opencode-go/kimi-k2.6",
  
  // Per-agent overrides
  "agents": {
    "planner": {
      "model": "github-copilot/claude-opus-4.7",
      "fallback_chain": ["opencode-go/glm-5.1", "nvidia/z-ai/glm-5.1"]
    },
    "researcher": {
      "model": "github-copilot/gpt-5.4-mini",
      "fallback_chain": ["opencode-go/mimo-v2.5-pro", "nvidia/moonshotai/kimi-k2.6"]
    },
    "builder": {
      "model": "github-copilot/claude-opus-4.7",
      "fallback_chain": ["opencode-go/kimi-k2.6", "nvidia/moonshotai/kimi-k2.6"]
    },
    "reviewer": {
      "model": "github-copilot/claude-opus-4.7",
      "fallback_chain": ["opencode-go/glm-5.1", "nvidia/z-ai/glm-5.1"]
    }
  },
  
  // Council configuration
  "council": {
    "presets": {
      "default": {
        "alpha": { "model": "github-copilot/claude-opus-4.7" },
        "beta": { "model": "nvidia/z-ai/glm-5.1" },
        "gamma": { "model": "google/antigravity-gemini-3.1-pro" }
      }
    }
  }
}
```

## Council Feature

### Trigger Conditions

Council is invoked when any of these occur:
- User explicitly requests it ("ask the council")
- Model selection ambiguity (which model for this task?)
- Security-related changes
- Routing ambiguity (which agent should handle this?)
- Planner disagreement (planner suggests different approach than orchestrator)
- Reviewer flags significant deviation
- Fallback chain exhausted

### Mechanics

- **3 councillors + 1 governor/synthesizer**
- Councillors are strictly **read-only**
- Each councillor gets the same context + question
- Governor synthesizes responses into a single recommendation
- Default preset: diverse providers (GitHub Copilot, NVIDIA, Google)
- User can configure custom presets

## Timeouts

| Agent | Timeout | Rationale |
|-------|---------|-----------|
| planner | 10 min | Planning should be quick — if it takes longer, the task is too vague |
| researcher | 10 min | Research is bounded; deep dives should be chunked |
| builder | 25 min | Implementation can be complex; give room for compilation, tests |
| reviewer | 10 min | Review should be quick — if it's complex, flag for council |
| council | 10 min/councillor | Parallel execution; total ~10-15 min for 3 councillors |

## Parallelization Strategy

1. **Native parallel subagents** — OpenCode's built-in `Task` tool for concurrent execution
2. **Explicit opt-in worktrees** — When true isolation is needed (e.g., conflicting changes)
3. **Reviewer handles merges** — When parallel branches complete, reviewer reconciles

### When to Parallelize

- Independent research tasks (explore codebase + look up docs)
- Multiple test files for different features
- Independent bug fixes
- Council councillors (always parallel)

### When NOT to Parallelize

- Sequential dependencies (B depends on A)
- Shared file mutations (risk of conflicts)
- UI/UX work that needs consistency

## Fallback Chains

### Triggers (Availability-Based)

- HTTP 429/529/503 (rate limit)
- Request timeout
- Connection error
- Model unavailability

### Stuck Detection

- 3+ identical responses from a model → mark as stuck, trigger fallback

### NO Quality-Based Fallbacks

- Never fallback because "the model is doing a bad job"
- Never fallback because "this model can't handle this task"
- Quality issues are handled by reviewer/council, not fallback

## Session Resumption & Persistent Sessions

The framework supports persistent specialist sessions within a **work stream** (e.g., a feature, bugfix, or phase). The orchestrator decides when to start a new session vs. continue an existing one.

### Work Stream Model

- A work stream is a logical unit of work with a unique ID (e.g., `feature-auth-refactor`)
- Within a stream, the same specialist session is reused so the agent accumulates context
- Between streams, fresh sessions are started to avoid context pollution
- The orchestrator tracks this in `state.md`

### Session Tracking (state.md)

```yaml
active_sessions:
  researcher: ses_abc123
  builder: ses_def456
current_stream: "feature-auth-refactor"
stream_history:
  - stream: "setup-project"
    sessions:
      researcher: ses_xyz789
      builder: ses_abc012
    completed: true
    closed_at: "2026-01-15T10:30:00Z"
```

### Decision Logic

```
Does a session exist for this agent in the current stream?
├── Yes → Reuse session_id (inject accumulated context)
└── No → Start new session, record in state.md
```

### Context Injection on Reuse

When reusing a session, the orchestrator provides:
- Summary of what was accomplished in previous delegations to this agent
- Current state of the work stream
- Any new information discovered since the last delegation

This is distinct from the automatic context inheritance that OpenCode subagents provide — it is actively curated by the orchestrator.

## Live Context Injection

The framework uses a hybrid approach combining curated envelope context and shared context files.

### Delegation Envelope (Curated)

The orchestrator actively reads live context and includes it in the `context_summary` field of every delegation. This is explicit, controlled, and curated — the orchestrator decides what is relevant.

### Shared Context Files (Automatic)

Specialists always read `state.md` and `plan.md` at the start of each task. These files are updated by the orchestrator after every delegation, ensuring specialists see the latest project state.

### Session Context Inheritance (Implicit)

OpenCode's native subagent system automatically carries forward session context when a session is reused. This is automatic but not curated.

### Why the Hybrid Approach

- **Envelope curation** prevents information overload — the orchestrator filters what matters
- **Shared files** ensure all specialists see consistent project state regardless of session reuse
- **Session inheritance** accumulates context within a work stream naturally
- Combining all three gives explicit control without relying solely on any single mechanism

## Background Orchestration

### Architecture

The orchestrator supports dispatching tasks to specialists that run asynchronously, with the orchestrator polling for completion.

### Components

1. **Background Job Board** — Tracks all delegated tasks:
   - Task ID
   - Agent assigned
   - Status (`pending`, `running`, `completed`, `failed`)
   - Start time
   - Last polled
   - Result (when completed)

2. **Poller** — The orchestrator periodically checks running tasks:
   - Poll interval: 30 seconds
   - Timeout enforcement based on agent type (see Timeouts section)
   - On completion: trigger reviewer validation

3. **Reconciler** — When multiple parallel background tasks complete:
   - Collect all results
   - Detect conflicts (e.g., both tasks modified the same file)
   - Queue reviewer to reconcile
   - Update `state.md` with combined results

### When to Use Background Mode

- Multiple independent research tasks (parallelize research)
- Independent bug fixes across different files
- Council councillors (always parallel)
- Long-running builds or tests

### When NOT to Use Background Mode

- Sequential dependencies
- Tasks that need immediate user feedback
- UI/UX work that needs consistency across files

### Task Completion Signaling

Specialists signal completion through the standard return format (see Return Protocols). For background tasks, an additional status field is used:

- **`completed`** — Task finished successfully, result available
- **`partial`** — Task completed but with caveats (errors, skipped items)
- **`failed`** — Task could not complete
- **`needs_review`** — Task completed but reviewer should check
- **`needs_info`** — Task cannot proceed without clarification from orchestrator or user

The `needs_info` status is critical for async work — it tells the orchestrator to ask the user rather than waiting indefinitely.

## MCP & Skills Strategy

### Core MCPs (Pre-configured)

| MCP Server | Purpose | Skill Alternative? |
|-----------|---------|-------------------|
| `context7` | Library documentation lookup | `context7-mcp` skill exists — either works |
| `github` | GitHub API operations (PRs, issues, code) | None — MCP only |
| `grep_app` | Fast code search across GitHub | None — MCP only |
| `websearch` | Web search with content extraction | `web-search` skill exists — MCP preferred for richness |
| `playwright` | Browser automation for testing/scraping | None — MCP only |

### MCP vs Skill Decision Matrix

| Capability | Recommendation | Rationale |
|-----------|---------------|-----------|
| Library docs | **Skill preferred** | `context7-mcp` skill is lighter, works offline |
| Web search | **MCP preferred** | Feature-rich (Exa/Tavily), filtering, content extraction |
| GitHub code search | **MCP required** | No pure skill alternative |
| GitHub API ops | **MCP required** | No skill alternative |
| Browser automation | **MCP required** | Complex workflows need persistent state |

### Skills Ecosystem

#### Preload at Session Start

These skills are loaded for every session:
- `brainstorming` — Explore intent before implementation
- `diagnose` — Disciplined diagnosis loop
- `grill-with-docs` — Stress-test against domain model
- `handoff` — Compact conversation for session resume
- `zoom-out` — Broader context perspective
- `deepen-plan` — Second-pass planning confidence check

#### Load On-Demand

These skills are loaded per-delegation via the envelope:
- `simplify` — Code clarity reduction (builder)
- `codemap` — Repository mapping (researcher)
- `clonedeps` — Dependency source inspection (researcher)
- `caveman-review` — Ultra-terse review format (reviewer)
- `investigate` — 5-phase debugging with evidence chain (researcher)
- `skill-tuning` — Diagnose agent coordination failures (orchestrator)
- `systematic-debugging` — Debug before proposing fixes (builder, researcher)
- `tdd` — Test-driven development (builder)
- `verification-before-completion` — Run checks before claiming success (builder)
- `writing-plans` — Create implementation plans (planner)
- `executing-plans` — Execute written plans (builder)
- `to-issues` — Break plans into trackable issues (planner)
- `using-git-worktrees` — Isolated workspaces for parallel work (builder)
- `prototype` — Throwaway prototypes for design exploration (builder)

#### Available but Not Preloaded

These skills exist in the ecosystem and can be invoked manually:
- `lfg` — Full autonomous pipeline with STOP gates
- `orchestrating-swarms` — Multi-agent orchestration primitives
- `impeccable/critique` — Parallel sub-agent design critique
- `impeccable/audit` — Technical quality audit
- `skill-tuning` — Agent coordination failure diagnosis
- `repo-intake-and-plan` — Conservative repo scanning before execution

## Agent Prompt Design Principles

These principles guide the system prompts for each agent. Exact prompts are defined during implementation.

### Orchestrator

**Core directive:** "You are a team lead, not an individual contributor."

- **3-layer enforcement reminder** — Config + pre-tool hook + prompt reinforcement
- **Delegation examples** — Few-shot examples of "I should delegate this" vs. "I should do this myself"
- **Anti-pattern warnings** — "If you find yourself writing code, STOP. Delegate to builder."
- **Session awareness** — Check state.md for active sessions before creating new ones
- **Error handling** — On specialist failure: retry once, then escalate to council or ask user

### Planner

**Core directive:** "Decompose complex requests into independently executable tasks."

- **Plan template** — Every plan must have: ordered tasks, dependencies, acceptance criteria, estimated complexity
- **Deepening discipline** — After initial plan, invoke `deepen-plan` to check confidence
- **YAGNI enforcement** — "Do not include tasks that are not explicitly required"
- **Dependency analysis** — Flag tasks that must run sequentially vs. can run in parallel
- **Risk assessment** — Identify high-risk tasks and suggest error_strategy

### Researcher

**Core directive:** "Gather evidence before drawing conclusions."

- **Evidence chain** — Every claim must cite source (file path, doc URL, line number)
- **No fix without root cause** — Adopted from `investigate` skill's Iron Law discipline
- **Internal + external** — Search codebase first, then external docs, then web search
- **Chunking** — Deep research should be chunked into bounded sub-questions
- **Return format** — Structured findings with confidence levels (high/medium/low)

### Builder

**Core directive:** "Build the right thing, then build it right."

- **Test-first** — Invoke `tdd` skill when tests exist or should exist
- **YAGNI** — "Do not add features not in the acceptance criteria"
- **Verification** — Always run checks before claiming completion (lint, tests, typecheck)
- **Incremental** — Prefer small, verifiable changes over large refactors
- **Handoff readiness** — If work cannot be completed, create handoff document

### Reviewer

**Core directive:** "Validate against the original intent."

- **Terse format** — Adopt `caveman-review` format: `L<line>: <problem>. <fix>.`
- **Severity prefixes** — 🔴 bug, 🟡 risk, 🔵 nit, ❓ question
- **Approval criteria** — Changes must: (1) satisfy verbatim_request, (2) not break existing functionality, (3) follow project conventions
- **Quick fix authority** — Minor issues (nits, formatting) can be fixed directly; everything else goes back to builder
- **Escalation triggers** — Significant deviation from plan, security concerns, architectural disagreement → council

### Council

**Core directive:** "Provide the highest-confidence recommendation possible."

- **Read-only** — Councillors cannot use write/edit tools
- **Independent analysis** — Each councillor analyzes separately; no seeing others' responses
- **Diverse perspectives** — Default preset uses different providers (Anthropic, OpenAI, Google)
- **Governor synthesis** — Synthesizer resolves disagreements with explicit reasoning
- **Confidence scoring** — Final recommendation includes confidence level and dissent notes

## Implementation Notes

### File Structure

```
opencode-delegation-orchestrator/
├── src/
│   ├── index.ts              # Plugin entry point
│   ├── agents/
│   │   ├── orchestrator.ts   # Dispatcher agent definition
│   │   ├── planner.ts        # Planning agent
│   │   ├── researcher.ts     # Research agent
│   │   ├── builder.ts        # Build agent
│   │   └── reviewer.ts       # Review agent
│   ├── council/
│   │   ├── council.ts        # Council agent definition
│   │   ├── councillor.ts     # Individual councillor
│   │   └── manager.ts        # Council execution manager
│   ├── context/
│   │   ├── context-manager.ts # Context file management
│   │   └── envelope.ts       # Delegation envelope types
│   ├── utils/
│   │   ├── session-manager.ts # Subagent session management
│   │   ├── fallback.ts       # Fallback chain manager
│   │   └── background-job-board.ts # Background task tracking
│   └── types/
│       └── opencode-plugin.d.ts  # Plugin SDK types
├── commands/
│   └── init.md               # /init command definition
├── config/
│   ├── default.jsonc         # Default configuration
│   └── models.jsonc            # Model overrides & fallback chains
├── AGENTS.md                 # Static agent reference (generated by /init)
└── package.json
```

### Key Dependencies

- `@opencode-ai/plugin` — Plugin SDK
- `zod` — Schema validation for envelopes and configs

### Build Output

- TypeScript source compiled to `dist/`
- ESM module format
- Bun runtime

## Future Considerations (Post-v1)

- Continuous learning — session pattern capture and instinct injection
- Sandboxing — Docker/Podman isolation for sensitive operations
- Workflow DAGs — YAML-defined workflows for repeatable processes
- Instinct store — shared learned patterns across harnesses
- Plugin marketplace — publish to skills.sh registry