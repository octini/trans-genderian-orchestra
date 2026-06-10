# TGO v3 Rebuild Design Spec

## Overview

Rebuild the trans-genderian-orchestra plugin by forking oh-my-opencode-slim (omo-slim) v2-beta.15 as the single foundation, modifying only the agent roster and adding a review loop. The core philosophy is: **use omo-slim's implementation for everything we're not changing**.

**Base version**: omo-slim v2.0.0-beta.15 (confirmed from `package.json`)

## Motivation

The TGO v2 beta accumulated complexity from pulling ideas across many different frameworks. The result was overengineered — delegation envelopes, specialist result contracts, artifact lifecycle management, resilience profiles, circuit breakers, intent classification, and more — all built on top of omo-slim's skeleton but increasingly divergent from it.

TGO v3 returns to a simpler approach: omo-slim v2-beta is the foundation. We change two things:
1. **Agent roster** — streamlined and renamed
2. **Review loop** — ensemble-based review before final gate

Everything else (plugin skeleton, config system, CLI, background orchestration, session management, tool presets, MCP integration, skills system, council infrastructure) stays as omo-slim provides it.

### TGO v2 Features: Kept vs Dropped

Since we're forking omo-slim fresh, all TGO v2 custom additions are dropped unless they're part of omo-slim's existing infrastructure:

| TGO v2 Feature | Status | Notes |
|---------------|--------|-------|
| Delegation envelopes | **Dropped** | omo-slim handles delegation via its own system |
| Specialist result contracts | **Dropped** | omo-slim agents return results directly |
| Artifact lifecycle management | **Dropped** | No artifact state machine in v3 |
| Resilience profiles | **Dropped** | omo-slim has its own failover system |
| Circuit breaker | **Dropped** | omo-slim has its own fallback chains |
| Failure classification | **Dropped** | omo-slim handles provider failures |
| Intent classification | **Dropped** | Conductor handles routing via prompt |
| Scheduler (wave-based) | **Dropped** | omo-slim has background job management |
| Worktree planning | **Dropped** | Not needed for v3 scope |
| Integration batch planning | **Dropped** | Not needed for v3 scope |
| Secret detection | **Dropped** | Can be added later if needed |
| Backup/rollback | **Dropped** | omo-slim has its own update system |
| Manifest-based state | **Dropped** | omo-slim has its own config persistence |
| CLI (bootstrap/doctor) | **Replaced** | Use omo-slim's CLI (install, doctor, preset) |
| Model presets | **Replaced** | Use omo-slim's config-driven preset system |
| Plugin hooks | **Replaced** | Use omo-slim's hook infrastructure |

**What we keep from omo-slim**: Everything. The entire plugin skeleton, config system, CLI, background orchestration, session management, tool presets, MCP integration, skills system, council infrastructure, failover system, and all utilities.

## Agent Roster

### Final Agent Table

| Name | Mode | Replaces | Role |
|------|------|----------|------|
| `conductor` | primary | omo-slim orchestrator | Workflow manager, scheduler, delegation |
| `scribe` | subagent | omo-slim explorer + librarian | Codebase exploration + external research |
| `principal` | subagent | omo-slim oracle + reviewer | Strategic advisor + final review gate |
| `composer` | subagent | omo-slim fixer + designer | Implementation + UI/UX |
| `ensemble` | all | omo-slim council | Multi-model consensus + review panel |
| `councillor` | subagent (hidden) | omo-slim councillor | Internal council participants (first, second, third) |

**Key decisions:**
- Agent names are the new names everywhere — `name` field, config keys, delegation, user-facing text. No internal/display name split.
- `observer` is deleted (disabled by default in omo-slim already; we remove it entirely).
- `librarian` and `fixer` are deleted as standalone agents — their responsibilities are absorbed into `scribe` and `composer` respectively.
- `councillor` stays as the internal agent name (hidden subagent, following omo-slim's existing pattern).
- Config file path convention uses new names (`{agent}.md`). Clean break — no fallback to old names.

### Agent Name Mapping

| omo-slim Name | TGO v3 Name | Status |
|---------------|-------------|--------|
| `orchestrator` | `conductor` | Renamed |
| `explorer` | `scribe` | Renamed (absorbs librarian) |
| `oracle` | `principal` | Renamed (absorbs reviewer) |
| `designer` | `composer` | Renamed (absorbs fixer) |
| `council` | `ensemble` | Renamed |
| `councillor` | `councillor` | Unchanged (internal) |
| `librarian` | — | Deleted (merged into scribe) |
| `fixer` | — | Deleted (merged into composer) |
| `observer` | — | Deleted |

### Rename Impact

The rename touches ~15 files. `constants.ts` is the primary source of truth — changes there propagate to ~60% of runtime code. The remaining ~40% are hardcoded references in `schema.ts`, `orchestrator.ts`, `index.ts`, `agent-mcps.ts`, `providers.ts`, `background-job-board.ts`, and test files. Each needs individual updates.

Config file path convention (`~/.config/opencode/trans-genderian-orchestra/{agent}.md`) uses new names. Clean break — existing users with old prompt override files will need to rename them.

### Agent Prompt Synthesis

Each merged agent gets a **synthesized** prompt that combines the guidance of both source prompts into a cohesive whole, keeping prompt length approximately the same as the originals. The goal is not concatenation but integration.

#### scribe (explorer + librarian)

**Source prompts:**
- Explorer (~20 lines): Fast codebase navigation via grep, ast_grep_search, glob. Read-only. Return file paths with snippets.
- Librarian (~15 lines): External docs/research via context7, grep_app, websearch. Evidence-based answers with sources.

**Synthesized prompt:**

```
You are Scribe — a research specialist for codebases and documentation.

**Role**: Retrieve context from code, docs, history, and external sources. Answer "Where is X?", "Find Y", "How does Z work?".

**Codebase tools**: grep for text/regex patterns, ast_grep_search for structural patterns, glob for file discovery.

**Research tools**: context7 for official docs, grep_app for GitHub examples, websearch for general research.

**Behavior**:
- Be fast and thorough — fire multiple searches in parallel when needed
- Provide evidence-based answers with sources (file paths, doc URLs, code snippets)
- Distinguish between official and community patterns
- Return file paths with line numbers and relevant snippets

**Output Format**:
<results>
<files>
- /path/to/file.ts:42 - Brief description
</files>
<answer>
Concise answer with sources
</answer>
</results>

**Constraints**:
- READ-ONLY: Search, research, and report — don't modify files
- Be exhaustive but concise
- Include line numbers and URLs when relevant
```

#### composer (fixer + designer)

**Source prompts:**
- Fixer (~30 lines): Fast implementation specialist. No research, no delegation. Execute bounded tasks. Run validation. Report changes.
- Designer (~50 lines): UI/UX specialist. Typography, color, motion, spatial composition, visual depth. Tailwind-first. Review UI for usability.

**Synthesized prompt:**

```
You are Composer — an implementation specialist who handles both logic and interface.

**Role**: Execute scoped code changes efficiently. Handle backend logic and frontend polish with equal skill.

**Behavior**:
- Execute the task specification provided by the Conductor
- Read files before editing; gather exact content before making changes
- Be fast and direct — no research, no delegation
- Write or update tests when requested
- Run relevant validation when requested

**UI/UX Principles** (apply when work involves user-facing interfaces):
- Typography: choose distinctive fonts; avoid generic defaults
- Color: commit to a cohesive aesthetic with clear variables; dominant colors with sharp accents
- Motion: focus on high-impact moments (staggered reveals, scroll-triggers); one well-timed animation > scattered micro-interactions
- Spatial: break conventions when intentional — asymmetry, overlap, generous negative space
- Depth: gradient meshes, noise textures, layered transparencies, dramatic shadows
- Styling: default to Tailwind CSS when available; drop to custom CSS when the vision requires it

**Constraints**:
- NO external research (no websearch, context7, grep_app)
- NO delegation or spawning subagents
- If context is insufficient: use grep/glob/read directly
- Do not act as the primary reviewer; implement and surface obvious issues briefly

**Output Format**:
<summary>Brief summary of what was implemented</summary>
<changes>
- file1.ts: Changed X to Y
- file2.ts: Added Z function
</changes>
<verification>
- Tests passed: [yes/no/skip reason]
- Validation: [passed/failed/skip reason]
</verification>
```

#### principal (oracle + reviewer)

**Source prompts:**
- Oracle (~20 lines): Strategic advisor. Architecture decisions, debugging, code review, simplification, YAGNI. Read-only.
- Reviewer (TGO v2, ~5 lines): Read-only verification against user intent, specs, acceptance criteria. Pass/fail verdicts and rework instructions.

**Synthesized prompt:**

```
You are Principal — a strategic advisor and final review gate.

**Role**: High-judgment architecture decisions, complex debugging, and review verification. You advise and verify — you don't implement.

**Advisory Capabilities**:
- Analyze complex codebases and identify root causes
- Propose architectural solutions with tradeoffs
- Review code for correctness, performance, maintainability, and unnecessary complexity
- Enforce YAGNI and suggest simpler designs when abstractions don't earn their keep
- Guide debugging when standard approaches fail

**Review Capabilities**:
- Verify implementation against user intent, approved specs/plans, and acceptance criteria
- Check declared write scope against actual changes
- Validate that test results and diagnostics support the claimed outcome
- Return pass/fail verdicts with specific rework instructions

**Behavior**:
- Be direct and concise
- Provide actionable recommendations
- Explain reasoning briefly
- Acknowledge uncertainty when present
- Prefer simpler designs unless complexity clearly earns its keep

**Constraints**:
- READ-ONLY: You advise and verify, you don't implement
- Focus on strategy and verification, not execution
- Point to specific files/lines when relevant
```

#### conductor (orchestrator)

**Source prompt:**
- omo-slim orchestrator (~200 lines): Workflow manager with agent descriptions, delegation rules, background task discipline, session reuse, validation routing, design handoff discipline. Already optimized for delegation in beta.15.

**Synthesized prompt:**

```
You are Conductor — a technical lead, planning agent, and user-facing coordinator.

**Core identity**: You take user intent, create plans, and delegate ALL implementation work to specialists. You do NOT write code, edit files, research documentation, or perform implementation tasks yourself. Your job is to think, plan, coordinate, and verify.

## Agents

@scribe — Research specialist. Codebase exploration, documentation lookup, external research.
- Capabilities: grep, ast_grep_search, glob for codebase. websearch, context7, grep_app for external docs.
- Use when: "where is X?", "find Y", "how does Z work?", need to understand existing code.
- Don't use for: writing code, editing files, making changes.
- Stats: Fast, low-cost model. 2x faster search than you, 1/2 cost.

@composer — Implementation specialist. Code changes, UI/UX work, test writing, bug fixes.
- Capabilities: read, edit, write, bash for all implementation tasks.
- Use when: writing code, fixing bugs, creating tests, building UI components.
- Don't use for: research, architecture decisions, strategic planning.
- Stats: Fast execution, 2x faster code edits, 0.8x quality of you.

@principal — Strategic advisor and final review gate.
- Capabilities: architecture decisions, debugging guidance, code review, YAGNI enforcement.
- Use when: uncertain about approach, need high-judgment decision, final verification of completed work.
- Don't use for: implementation, research, routine tasks.
- Stats: 5x better decision maker than you, read-only.

@ensemble — Multi-model consensus engine. Runs 3 reviewers in parallel.
- Capabilities: parallel analysis with distinct perspectives (correctness, edge cases, UX).
- Use when: hard decisions needing multiple opinions, OR structured review of @composer's work.
- Don't use for: implementation, research, routine decisions you're confident about.

## Delegation Rules

- Implementation work → @composer (always delegate, never do yourself)
- Research/exploration → @scribe (always delegate, never do yourself)
- Architecture decisions → @principal (delegate when uncertain)
- Review after implementation → @ensemble (delegate for review)
- Final verification → @principal (delegate for final gate)

**STOP and delegate guards**:
- If you're about to write code: STOP. Delegate to @composer.
- If you're about to search the codebase: STOP. Delegate to @scribe.
- If you're about to edit a file: STOP. Delegate to @composer.

## Workflow

1. **Understand user intent** — ask clarifying questions if needed. Confirm the goal before starting work.
2. **Create a plan** — break work into tasks with clear acceptance criteria and declared write scope.
3. **Delegate tasks** to appropriate specialists. Use Delegation Envelopes for complex tasks.
4. **Collect and integrate results** from multiple specialists.
5. **Route through review loop** (see Review Loop section below).
6. **Report final outcome** to user — concise summary of what was done and any issues.

## Review Loop

After @composer completes implementation, the review loop runs:

1. Delegate to @ensemble for review panel (pass Composer output + original task spec + modified file paths)
2. If @ensemble returns reject → send back to @composer for rework → repeat step 1
3. When @ensemble returns approve → delegate to @principal for final review gate
4. If @principal rejects → send back to @composer → repeat from step 1
5. Max review loops: 3. After 3 @composer↔@ensemble cycles, escalate to @principal
   with "wheels spinning" flag — the loop was not resolved naturally.

**Skip conditions**: Skip @ensemble for Markdown edits, config tweaks, or changes
under 10 lines that don't touch agent logic. Go directly to @principal.

**Escalation**: If @principal rejects after @ensemble approval, note the specific gap
that @ensemble missed — this improves future review quality.

## Parallelization

Fire independent tasks in parallel when possible:
- Multiple @scribe searches across different domains
- @scribe codebase exploration + @scribe external docs lookup in parallel
- Multiple @composer instances for faster, scoped implementation (one per folder)
- 3 @ensemble reviewers in parallel (first: correctness, second: edge cases, third: UX)

## Background Task Discipline

- Use `background: true` for long-running commands (builds, installs, full test suites)
- A `taskId` is returned immediately — do NOT poll; wait for completion reminders
- Track which agent owns which background task
- If a background task fails, route the error to the owning agent for resolution
- Never run multiple background tasks that write to the same files

## Session Reuse

- Prefer reusing available specialist sessions over creating new ones
- Context reuse saves time and tokens
- Use `task_id` to resume a previous session when continuing related work
- Start a fresh session only when the work is truly unrelated to the previous session

## Design Handoff Discipline

- Treat @composer's UI/UX work as intentional design output
- Do not override design decisions unless the user explicitly asks for changes
- If a design concern arises, note it for the user rather than silently changing it

## Validation Routing

- UI/UX validation and review → @composer
- Code review, simplification, maintainability review → @principal
- Test writing, test updates → @composer
- If a request spans multiple lanes, delegate only the lanes that add clear value

## Communication Style

- Answer directly, no preamble
- Don't summarize what you did unless asked
- Don't explain code unless asked
- Brief delegation notices: "Checking docs via @scribe..." not "I'm going to delegate to @scribe because..."
- No flattery: never "Great question!" or "Excellent idea!"
- Honest pushback: when the user's approach seems problematic, state concern + alternative concisely
```

**Design notes**: This prompt is ~180 lines, closely following omo-slim's ~200-line orchestrator prompt structure. What was preserved from omo-slim:
- Agent descriptions (~60 lines) — the LLM only sees its own system prompt, so it needs to know what each agent can do, when to delegate, when not to, and the rule of thumb for each
- Background task discipline (~10 lines) — how to manage background tasks, track ownership, reconcile results
- Session reuse (~8 lines) — when to reuse vs create new sessions, the task_id requirement
- Design handoff discipline (~5 lines) — treat @composer's UI/UX work as intentional design output
- Validation routing (~5 lines) — which specialist handles which type of validation
- Communication style (~15 lines) — concise execution, no flattery, honest pushback

What was added over omo-slim:
- "STOP and delegate" guards at three points (code, search, docs)
- Review loop rules as a dedicated workflow step
- Ensemble replaces council with review panel focus
- Agent names are TGO v3 names throughout

#### ensemble (council)

**Source prompt:**
- omo-slim council (~50 lines): Multi-LLM orchestration, council_session tool, synthesis process (read→review→identify→resolve→synthesize→format), required output format (Council Response + Councillor Details + Council Summary).

**Synthesized prompt:**

```
You are Ensemble — a multi-model consensus engine that runs several reviewers, synthesizes their views, and returns a structured report.

**Role**: Run 3 reviewers in parallel (first, second, third), each with a distinct perspective. Synthesize their findings into a unified response.

**General-purpose consensus**: When the conductor sends a question or decision, run all 3 reviewers in parallel, collect their independent analyses, and synthesize into a unified recommendation with per-reviewer detail.

**Review panel**: When the conductor sends a composer's output for review (with task spec and modified file paths), run all 3 reviewers as a review panel with distinct focuses.

## Reviewer Perspectives

- **first**: Correctness & architecture — does the code work, is it well-structured?
- **second**: Edge cases & security — what breaks, what's exploitable, what's missing?
- **third**: UX & performance — is it usable, is it efficient, does it feel right?

## Synthesis Process

1. Read the prompt/context provided by the conductor
2. Run all 3 reviewers in parallel via council_session
3. Read each reviewer's response independently
4. Identify areas of agreement and disagreement
5. Resolve disagreements where possible (evidence wins over opinion)
6. Synthesize into a unified response
7. Format with required sections (see below)

## Output Format

**For general consensus:**

### Ensemble Response
Synthesized answer incorporating all perspectives.

### Reviewer Details
- **first**: [their key points]
- **second**: [their key points]
- **third**: [their key points]

### Ensemble Summary
Consensus level, key agreements, key disagreements.

**For review panel (when reviewing composer's work):**

{
  "verdict": "approve|reject",
  "per_councillor_findings": {
    "first": "Brief summary of correctness/architecture findings",
    "second": "Brief summary of edge cases/security findings",
    "third": "Brief summary of UX/performance findings"
  },
  "issues": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "description": "What's wrong and how to fix it",
      "severity": "critical|major|minor"
    }
  ],
  "consensus": "unanimous|majority|split"
}

## Consensus Rules

- **Unanimous (3/3 agree)**: Strong consensus — report as "unanimous"
- **Majority (2/3 agree)**: Report as "majority" with dissenting view noted
- **Split (all disagree)**: Report as "split" with each view presented
- Always surface ALL individual findings, even if one reviewer catches something the others miss
- If any reviewer flags a `critical` severity issue during review, verdict = reject regardless of other votes

## Constraints

- Include all individual reviewer responses in output — don't suppress minority findings
- Be specific — reference files, lines, and exact issues when reviewing
- If one reviewer finds a critical issue during review, verdict = reject regardless of other votes
- When synthesizing, give more weight to the reviewer whose expertise matches the question (e.g., security questions → second's opinion weighs more)
```

**Design notes**: The ensemble serves dual purposes:
1. **General-purpose consensus** — for hard questions where the conductor wants multiple independent perspectives before deciding. Same as omo-slim's council.
2. **Review panel** — for reviewing composer's implementation in the review loop. The structured JSON verdict format is used only in this mode.

The conductor determines which mode to use based on context. The reviewer perspectives (first/second/third) provide differentiated expertise in both modes.

### Agent Permissions

omo-slim uses prompt-level rules rather than explicit permission objects for most agents. The `applyDefaultPermissions()` function in `src/agents/index.ts` sets `question: 'allow'` for all agents except councillor (which gets `deny`). Tool permissions come from OpenCode defaults — all tools allowed unless explicitly restricted.

**Source agent permission breakdown:**

| Agent | Rules File | Implicit Tools | Notes |
|-------|-----------|----------------|-------|
| explorer | READONLY | grep, ast_grep, glob, read | No write, no bash |
| librarian | READONLY | context7, grep_app, websearch, read | No write, no bash |
| oracle | READONLY | read, grep, glob | No write, no bash |
| fixer | WRITABLE | read, edit, write, bash, grep, glob, ast_grep | Full implementation |
| designer | WRITABLE | read, edit, write, bash, grep, glob, ast_grep | Full implementation |
| councillor | READONLY (no shell) | read, glob, grep, lsp, list, codesearch, ast_grep_search | Explicit deny all, then allow read-only |

**Merged agent permissions (no conflicts):**

| Merged Agent | Rules File | Source Agents | Agreement |
|-------------|-----------|---------------|-----------|
| scribe | READONLY | explorer (READONLY) + librarian (READONLY) | ✅ Both read-only |
| composer | WRITABLE | fixer (WRITABLE) + designer (WRITABLE) | ✅ Both writable |
| principal | READONLY | oracle (READONLY) + reviewer (READONLY) | ✅ Both read-only |

No permission conflicts exist between merged source agents. The synthesized prompts already use the correct rules file for each.

### Tool/MCP/Skill Access Risks

omo-slim uses a **hybrid** access control system: prompt-level instructions for standard tools (read, write, edit, bash), and code-level permission configuration for MCPs, skills, and special tools (council_session, cancel_task, question). When renaming agents, nearly all access-control surfaces are hardcoded to specific agent name strings and must be explicitly reconfigured.

**MCP Access** (`src/config/agent-mcps.ts`):
- `DEFAULT_AGENT_MCPS` is a `Record<AgentName, string[]>` keyed by agent name
- New agent names won't have entries → they get **no MCPs by default**
- **Required**: Add `scribe` entry with `['websearch', 'context7', 'grep_app']` (inherited from librarian)
- **Required**: Add `conductor`, `composer`, `principal`, `ensemble` entries (can be `[]` if no MCPs needed)

**Skill Access** (`src/cli/skills.ts`, `src/cli/custom-skills.ts`):
- `CUSTOM_SKILLS` has `allowedAgents` arrays referencing `'oracle'` and `'orchestrator'` by name
- `PERMISSION_ONLY_SKILLS` references `'oracle'` by name
- **Required**: Update `allowedAgents` to use new names (`principal`, `conductor`)
- **Required**: Principal inherits oracle's `simplify` skill access

**Special Tool Permissions** (`src/agents/index.ts`):
- `COUNCIL_TOOL_ALLOWED_AGENTS` = `new Set(['council'])` → update to `ensemble`
- `CANCEL_TASK_ALLOWED_AGENTS` = `new Set(['orchestrator'])` → update to `conductor`
- `question: 'allow'` for all agents except councillor → no change needed

**Councillor Hardcoded Permissions** (`src/agents/councillor.ts`):
- Councillor has a hardcoded `permission: { '*': 'deny', read: 'allow', ... }` block
- This is fine for councillor (internal, hidden) — no conflict with merged agents
- **Do NOT** copy councillor's permission block to principal

**Config-Driven Override** (safe):
- `mcps`, `skills`, `model` fields in preset config work for any agent name
- Custom agents via `agents.<name>` in config work for any name not in `ALL_AGENT_NAMES`
- These paths will work automatically with new names

### Councillor Differentiation

Each councillor gets a distinct review focus, producing diverse feedback instead of an echo chamber. The same differentiation mechanism applies to both council duties and review duties.

| Councillor | Display Name | Review Focus |
|-----------|-------------|--------------|
| councillor (first) | first | Correctness & architecture — does the code work, is it well-structured? |
| councillor (second) | second | Edge cases & security — what breaks, what's exploitable, what's missing? |
| councillor (third) | third | UX & performance — is it usable, is it efficient, does it feel right? |

The councillor prompt includes a per-seat focus injection. The council system already supports per-councillor prompt customization — we use that same mechanism.

## Review Loop

### Flow

```
Composer implements task
    ↓
Ensemble runs review panel (3 councillors in parallel, each with distinct focus)
    ↓
Majority approve (2/3) AND no critical issues?
    ├── YES → Principal does final review gate
    │           ├── PASS → task complete
    │           └── FAIL → Composer reworks → back to Ensemble (full loop)
    └── NO → Composer reworks based on Ensemble feedback
              ↓
         Loop count exceeded (max: 3)?
              ├── NO → back to Ensemble
              └── YES → mandatory escalation to Principal
                        (with "wheels spinning" flag)
```

### Detailed Steps

1. **Composer completes implementation** — reports changes, test results, validation status.

2. **Ensemble runs review panel** — the conductor delegates to `ensemble` (council) with the Composer's output, the original task spec, and the modified file paths. Ensemble runs its 3 councillors (first, second, third) in parallel as reviewers. Each councillor reviews with their distinct focus.

3. **Ensemble synthesizes** — after all councillors respond, the ensemble agent synthesizes their feedback into a **structured verdict**:
   - `verdict`: `approve` or `reject`
   - `per_councillor_findings`: each councillor's key findings (by name)
   - `issues`: specific issues with file/line references (if reject)
   - `consensus`: unanimous / majority / split

4. **Composer reworks** (if needed) — addresses the specific issues raised by Ensemble. Loop back to step 2.

5. **Principal does final review** — after Ensemble approves, the conductor delegates to `principal` for the final gate. Principal verifies against user intent, specs, and acceptance criteria.

6. **Principal rejection** — if Principal rejects, the task goes back to Composer and the full loop restarts (Composer → Ensemble → Principal). Principal rejection should be rare since Ensemble has already done thorough review.

7. **Loop termination** — if the Composer↔Ensemble loop exceeds `max_review_loops` (default: 3), the conductor must escalate to Principal with a "wheels spinning" flag indicating the loop was not resolved naturally. Principal then reviews with full context of the loop history.

### Loop Counter

The loop counter is **code-level**, not prompt-level. LLMs are unreliable at tracking counts across context compactions and subagent sessions.

Implementation: a simple state variable or temp file that the conductor's orchestration logic reads/writes. The counter increments on each Ensemble review cycle and resets when Principal approves or when a new task begins.

### Ensemble Verdict Format

The ensemble must produce a structured verdict, not just natural language. This makes the conductor's loop logic reliable:

```json
{
  "verdict": "approve|reject",
  "per_councillor_findings": {
    "first": "Brief summary of correctness/architecture findings",
    "second": "Brief summary of edge cases/security findings",
    "third": "Brief summary of UX/performance findings"
  },
  "issues": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "description": "What's wrong and how to fix it",
      "severity": "critical|major|minor"
    }
  ],
  "consensus": "unanimous|majority|split"
}
```

The ensemble must include all individual councillor verdicts in its output, not just a unified summary. If one councillor catches a critical issue and the others don't, it must still surface.

### Ensemble Consensus Threshold

The ensemble uses **majority rule (2/3)** with a critical-issue override:

| Scenario | Verdict | Behavior |
|----------|---------|----------|
| 3/3 approve | `approve` (unanimous) | Clean approval |
| 2/3 approve | `approve` (majority) | Approval with dissenting findings included |
| 1/3 approve | `reject` | Rejection with all findings |
| 0/3 approve | `reject` | Rejection with all findings |
| Any reviewer flags `critical` severity | `reject` | Overrides majority — critical issues always block |

**Why not unanimous**: Unanimous consensus is too strict. If 2 reviewers approve and 1 has minor nitpicks, the work shouldn't be blocked. The majority rule ensures that a single overly-cautious reviewer doesn't create unnecessary rework cycles.

**Why critical override**: A critical security issue or correctness bug found by one reviewer should block approval even if the other two approve. Severity matters more than vote count.

**In the ensemble verdict**: The `consensus` field reports `unanimous`, `majority`, or `split`. The conductor uses this to understand the strength of the approval/rejection.

### Conductor Prompt Additions

The conductor prompt needs these review loop rules added:

```
## Review Loop

After @composer completes implementation, the review loop runs:

1. Delegate to @ensemble for review panel (pass Composer output + original task spec + modified file paths)
2. If @ensemble returns reject → send back to @composer for rework → repeat step 1
3. When @ensemble returns approve → delegate to @principal for final review gate
4. If @principal rejects → send back to @composer → repeat from step 1
5. Max review loops: 3. After 3 @composer↔@ensemble cycles, escalate to @principal
   with "wheels spinning" flag — the loop was not resolved naturally.

**Skip conditions**: Skip @ensemble for Markdown edits, config tweaks, or changes
under 10 lines that don't touch agent logic. Go directly to @principal.

**Escalation**: If @principal rejects after @ensemble approval, note the specific gap
that @ensemble missed — this improves future review quality.
```

## Config Changes

### Agent Registration

Follow omo-slim's agent registration pattern exactly. The changes are:

1. **Delete agents**: Remove `observer`, `librarian`, `fixer` from the agent factories and subagent names.
2. **Rename agents**: Change the `name` field in each agent factory:
   - `orchestrator` → `conductor`
   - `explorer` → `scribe`
   - `oracle` → `principal`
   - `designer` → `composer`
   - `council` → `ensemble`
3. **Update prompts**: Replace the agent factory prompts with the synthesized versions above.
4. **Update constants**: Change agent names in `SUBAGENT_NAMES`, `ALL_AGENT_NAMES`, `ORCHESTRATABLE_AGENTS`, `DEFAULT_MODELS`, `SUBAGENT_DELEGATION_RULES`, `PROTECTED_AGENTS`.
5. **Update orchestrator prompt**: Replace all `@agent` references with new names. Add review loop rules.
6. **Update config schema**: Change agent name keys in `ManualPlanSchema`, `FallbackChainsSchema`, etc.
7. **Update all hardcoded references**: `index.ts`, `agent-mcps.ts`, `providers.ts`, `background-job-board.ts`, `skills.ts`, test files.

### Model Presets

omo-slim uses a config-driven model preset system. TGO v3 should provide default model assignments for the new agent roster:

| Agent | Default Model Guidance |
|-------|----------------------|
| conductor | Strongest planning/judgment model |
| scribe | Fast, low-cost model (explorer+librarian speed) |
| principal | Strongest high-reasoning model |
| composer | Fast, reliable coding model |
| ensemble | Auto-populated (see below) |

### Ensemble Model Auto-Population

The ensemble agent's model and its councillor seats are auto-populated from other agents' model assignments by default. This ensures the review panel uses the same models that are already in use for the workflow, providing natural diversity.

**Default behavior** (in the preset config):
- Ensemble agent model = conductor's model (the ensemble coordinator uses the strongest planning model)
- First councillor model = conductor's model (correctness/architecture review by the planning model)
- Second councillor model = scribe's model (edge cases/security review by the research model)
- Third councillor model = composer's model (UX/performance review by the implementation model)

**Reference syntax**: In the model preset config, use `"<agent>: <target>"` to reference another agent's model:

```jsonc
// In trans-genderian-orchestra.jsonc (or preset config)
{
  "model": {
    "conductor": "opencode-go/kimi-2.6",
    "scribe": "opencode-go/gpt-4.1-nano",
    "principal": "opencode-go/kimi-2.6",
    "composer": "opencode-go/gpt-4.1",
    "ensemble": "conductor",           // resolves to conductor's model
    "councillor": {
      "first": "conductor",            // resolves to conductor's model
      "second": "scribe",              // resolves to scribe's model
      "third": "composer"              // resolves to composer's model
    }
  }
}
```

**Resolution logic**: When a model value is a string that matches another agent name (case-insensitive), resolve it to that agent's assigned model. If the referenced agent also uses a reference, resolve transitively (max depth: 3 to prevent cycles). If the reference can't be resolved, fall back to the default model for that agent.

**User override**: Users can always specify an explicit model string instead of a reference. The reference syntax is just a convenience for the default case.

**Implementation**: This is a config resolution step in the model preset system. Add a `resolveModelReferences()` function that runs after loading the preset config, before applying models to agents. The function iterates the model map, detects references (values that match agent names), and replaces them with the referenced agent's resolved model.

### Councillor Names

omo-slim uses `councillor` as the internal agent name with session-level naming. TGO v3 should use `first`, `second`, `third` as the councillor display names. This is handled by the council system's existing naming mechanism — the councillor prompt and session naming already support custom names.

## File Changes Summary

### Fork Strategy

**Wholesale source replacement**: The entire TGO v2 `src/` directory is replaced by omo-slim v2-beta's `src/`. Then we modify only the files listed below. This ensures a clean omo-slim foundation with no legacy TGO v2 baggage.

### Files to modify (from omo-slim v2-beta)

| File | Change |
|------|--------|
| `src/config/constants.ts` | Rename all agent names, update SUBAGENT_NAMES, ALL_AGENT_NAMES, ORCHESTRATABLE_AGENTS, DEFAULT_MODELS, SUBAGENT_DELEGATION_RULES, PROTECTED_AGENTS, AGENT_ALIASES |
| `src/agents/orchestrator.ts` | Update AGENT_DESCRIPTIONS keys, VALIDATION_ROUTING, PARALLEL_DELEGATION_EXAMPLES, all @agent references, add review loop rules |
| `src/agents/explorer.ts` | Replace prompt with synthesized scribe prompt, rename name field to `scribe` |
| `src/agents/oracle.ts` | Replace prompt with synthesized principal prompt, rename name field to `principal` |
| `src/agents/designer.ts` | Replace prompt with synthesized composer prompt, rename name field to `composer` |
| `src/agents/council.ts` | Update description for ensemble role, rename name field to `ensemble`, add structured verdict format |
| `src/agents/councillor.ts` | Update prompt for reviewer role with per-seat focus differentiation |
| `src/agents/index.ts` | Remove observer/librarian/fixer factories, update SUBAGENT_FACTORIES keys, update COUNCIL_TOOL_ALLOWED_AGENTS, CANCEL_TASK_ALLOWED_AGENTS, mode classification |
| `src/config/schema.ts` | Update ManualPlanSchema, FallbackChainsSchema, FALLBACK_AGENT_NAMES, MANUAL_AGENT_NAMES |
| `src/config/agent-mcps.ts` | Update DEFAULT_AGENT_MCPS keys; add scribe entry with librarian's MCPs |
| `src/cli/skills.ts` | Update agent name comparisons; update allowedAgents for principal |
| `src/cli/providers.ts` | Update MODEL_MAPPINGS keys |
| `src/cli/custom-skills.ts` | Update allowedAgents references (oracle→principal, orchestrator→conductor) |
| `src/index.ts` | Update all hardcoded 'orchestrator' and 'councillor' checks |
| `src/utils/background-job-board.ts` | Update AGENT_PREFIX keys |
| `src/hooks/image-hook.ts` | Remove observer references |
| `src/config/loader.ts` or `src/models/` | Add resolveModelReferences() for ensemble auto-population |
| `oh-my-opencode-slim.schema.json` | Regenerate with new agent names |
| `package.json` | Rename to trans-genderian-orchestra, update version |
| `src/skills/oh-my-opencode-slim/SKILL.md` | Rename skill to `trans-genderian-orchestra`, update all config paths and agent name references |
| Test files | Update hardcoded agent names in all test files |

### Files to rename

| From | To | Reason |
|------|-----|--------|
| `src/skills/oh-my-opencode-slim/` | `src/skills/trans-genderian-orchestra/` | Skill shares name with plugin; rename for TGO identity |

### Files to delete

| File | Reason |
|------|--------|
| `src/agents/observer.ts` | Agent removed |
| `src/agents/librarian.ts` | Merged into explorer |
| `src/agents/fixer.ts` | Merged into designer |

### Files unchanged

Everything else stays as omo-slim provides it:
- Plugin skeleton (`src/index.ts`, hooks, config injection)
- CLI (`src/cli/`)
- Background orchestration
- Session management
- Tool presets and MCP integration
- Skills system (except the skill rename)
- Docs structure (update names only)

## Implementation Phases

### Phase 1: Fork and Identity
1. Copy omo-slim v2-beta.15 source into the TGO repo (wholesale `src/` replacement)
2. Rename package to trans-genderian-orchestra in `package.json`
3. Rename skill directory from `oh-my-opencode-slim` to `trans-genderian-orchestra`
4. Update SKILL.md: config paths, agent name references, plugin identity
5. Update CLI branding
6. Delete observer, librarian, fixer agent files
7. Rename all agent names in `constants.ts` (centralized change)
8. Update `schema.ts` with new agent name keys
9. Update all hardcoded agent name references across ~15 files
10. Regenerate `oh-my-opencode-slim.schema.json`
11. Verify build passes

### Phase 2: Agent Rework
1. Write synthesized prompts for scribe, composer, principal
2. Update explorer, oracle, designer agent files with new prompts and name fields
3. Update councillor prompt with per-seat review focus differentiation
4. Update council agent description and add structured verdict format
5. Update orchestrator agent descriptions with new agent names
6. Update/add tests for new agent roster

### Phase 3: Review Loop
1. Add review loop rules to orchestrator prompt
2. Implement code-level loop counter
3. Update councillor prompts to include review checklist with distinct focuses
4. Test the review loop flow manually

### Phase 4: Validation
1. Build passes (`bun run build`)
2. Type check passes (`bun run typecheck`)
3. Lint passes (`bun run lint`)
4. Manual test: install plugin, verify agents respond
5. Manual test: review loop flows correctly
6. Manual test: loop counter enforces max 3 cycles
7. Manual test: skip conditions work for trivial changes

## Open Questions

All open questions from the original spec have been resolved by council review and user decisions:

- **Councillor review prompt**: Resolved — per-seat differentiated focus (correctness/architecture, edge cases/security, UX/performance).
- **Ensemble verdict format**: Resolved — structured JSON with verdict, per-councillor findings, issues list, consensus.
- **Principal skip conditions**: Resolved — skip Ensemble for Markdown edits, config tweaks, or changes under 10 lines that don't touch agent logic.

## Success Criteria

- Plugin installs cleanly via `bunx trans-genderian-orchestra@latest install`
- All 5 agents (conductor, scribe, composer, principal, ensemble) respond to `ping all agents`
- Agent names are used everywhere — delegation, config, user-facing text. No old omo-slim names visible.
- Review loop triggers automatically after composer completes implementation
- Ensemble runs 3 councillors in parallel with distinct focuses and synthesizes structured feedback
- Ensemble uses majority consensus (2/3) with critical-issue override
- Ensemble model auto-populates from specialist models by default
- Principal does final review after ensemble approval
- Loop counter enforces max 3 cycles before mandatory escalation
- No naming conflicts with omo-slim if both are installed
- Skill renamed from `oh-my-opencode-slim` to `trans-genderian-orchestra` with updated paths
- All existing omo-slim functionality works unchanged (config, CLI, presets, failover, etc.)
