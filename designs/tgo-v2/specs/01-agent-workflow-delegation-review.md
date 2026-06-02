---
artifact_type: design_spec
status: draft
spec_id: tgo-v2-01-agent-workflow-delegation-review
created_at: 2026-06-02
updated_at: 2026-06-02
source_checkpoint: designs/tgo-v2-settled-decisions.md
---

# Agent Workflow, Delegation, Review, And Scheduling

## Role Boundaries

Orchestrator is a technical lead and phase controller. It may classify intent, retrieve small amounts of context, ask clarifying questions, create/update TGO artifacts, schedule specialists, reconcile results, trigger deterministic TGO operations, and record state. It may not edit implementation source, tests, package files, or arbitrary project config outside explicit deterministic setup/init operations.

Researcher produces evidence packs. It inspects code, docs, history, and external sources. It reports sources, findings, contradictions, uncertainty, options, and confidence. It does not implement code.

Builder implements scoped tasks. It edits only within allowed write paths and declared scope, runs validation, reports deviations, and returns structured results. It does not silently expand scope.

Reviewer verifies. It is read-only by default and checks outputs against user intent, approved specs/plans, acceptance criteria, declared write scope, evidence, and validation results.

Council is escalation-only. It receives the same artifacts and question, runs councillor perspectives derived from active role models, and returns one synthesized recommendation.

## Conversation-Triggered Workflow Intent

Users should not need to type slash commands for common TGO workflows. Orchestrator classifies normal messages into workflow intents using a compact prompt/protocol table, not a separate ML engine.

High-confidence examples may route to workflows:

- “Fix this,” “implement this,” “continue,” “next task,” or “work on X” can trigger TGO work flow.
- “Set this repo up,” “initialize TGO here,” or “make this project ready” can trigger `/tgo:init` behavior.
- “Check my setup,” “why is this broken,” or “repair TGO” can trigger doctor or doctor repair preview.
- “Ask the council,” “get another opinion,” or “escalate this” can trigger Council.
- Planning requests can trigger spec/plan creation.

Confidence tiers:

- High: proceed into workflow with Goal Confirmation where needed.
- Medium: ask one short clarification.
- Low: treat as ordinary conversation, research, or planning.

Destructive, global, or config-mutating actions always require preview/confirmation regardless of confidence.

Every inferred workflow route records an `inferred_intent` block with message excerpt, inferred workflow, confidence, confirmation requirement, final route, and reason for clarification if asked.

## Goal Confirmation

Every non-trivial feature/refactor/implementation workflow gets a short Goal Confirmation before execution. It states the selected issue/task, goal, scope, acceptance criteria, key risks, and whether the work is part of an approved plan. Full grilling is reserved for ambiguity, high risk, domain-language uncertainty, or architectural tradeoffs.

Trivial maintenance can use a minimal brief, but still must preserve scope and expected outcome.

## Delegation Envelope

Orchestrator-delegated non-trivial work uses a strict, machine-readable envelope. Required fields:

- `stream_id`
- `phase`
- `goal`
- `scope`
- `out_of_scope`
- `artifact_refs`
- `reuse_policy`
- `acceptance_criteria`
- `verification_required`
- `allowed_write_paths`
- `failure_mode`
- `user_intent`

The `user_intent` block includes:

- `verbatim_request`
- `relevant_quotes`
- `orchestrator_interpretation`
- `user_confirmed_decisions`
- `open_questions`

Specialists must flag mismatches between verbatim user request and Orchestrator interpretation. They should return `needs_decision`, `blocked`, or `rejected_scope` instead of improvising beyond scope.

Strict envelope enforcement applies to orchestrator-delegated work. Direct user-to-specialist invocation remains allowed, but specialists must ask for missing goal/scope/acceptance criteria before meaningful edits.

## Specialist Result Contract

Every orchestrator-delegated specialist task returns a structured result block. Common fields:

- `status`: `completed`, `needs_decision`, `blocked`, `failed`, or `rejected_scope`
- `summary`
- `artifact_refs`
- `changed_files` or `inspected_sources`
- `scope_check`
- `validation_run`
- `remaining_risks`
- `recommended_next_step`

Lane-specific fields:

- Researcher: sources, findings, uncertainty, confidence.
- Builder: files changed, tests run, command output summary, deviations.
- Reviewer: verdict, pass/fail reasons, acceptance criteria coverage, rework instructions.
- Council: decision, competing arguments, recommendation, dissent or uncertainty.

Missing or malformed result block is a `tool_schema_failure`, gets self-correction retries, and cannot complete the task.

## Reviewer Gate

Every code/config/doc change that affects project behavior requires Reviewer before Orchestrator claims completion.

Reviewer verifies:

- Original user intent and confirmed decisions.
- Approved spec/plan and acceptance criteria.
- Evidence/source grounding.
- Declared scope versus actual changed files.
- Validation commands and results.
- Known risks and residual warnings.

First rejection routes back to Builder with structured rework. Second rejection on the same task escalates to Council or user. Reviewer rejection is a semantic failure, not a provider/model fallback trigger.

## Council Escalation

Council triggers when:

- Reviewer rejects the same task twice.
- Decision is high-risk, hard to reverse, security-sensitive, or has no clear architecture winner.
- User explicitly asks for Council.
- Model/tooling behavior is disputed or uncertain.
- Parallel wave reveals a shared design/spec problem.

Council is not routine review. It receives the same spec/evidence/review artifacts and returns a synthesized recommendation, not a vote dump. Councillor seats default to active Researcher, Builder, and Reviewer models with council-specific perspectives. Duplicate underlying models remain separate prompted seats by default.

## Parallel Scheduling

Parallel Builder work is enabled by default but bounded.

Defaults:

- `max_parallel_builders = 2`
- `max_parallel_researchers = 4`
- `max_parallel_reviewers = 2` for branch reviews
- Batch review remains single.
- One Council session per stream.
- Orchestrator never runs multiple implementation waves for the same stream at once.

Parallel Builder eligibility requires:

- Same approved plan or explicitly confirmed Beads issue chain.
- Independent tasks.
- Declared write scopes that do not obviously overlap.
- Clear acceptance criteria.
- Clean worktree/branch setup.

If write scopes overlap, run serially unless user explicitly approves parallel. If write scope is unknown, ask one short clarification or run serially.

Research-only tasks can parallelize without write-scope checks. Reviewer/Council can run in parallel more freely because they are read-only, but Reviewer must not review edits still in progress.

## Schedulable Task Metadata

Generated TGO implementation plans must include schedulable metadata before Beads issue generation:

- `task_id`
- `goal`
- `acceptance_criteria`
- `dependencies`
- `declared_write_scope`
- `expected_read_context`
- `validation_commands`
- `parallel_group`
- `risk_level`
- `requires_user_decision`
- `beads_issue`
- `artifact_refs`

If `declared_write_scope`, `dependencies`, or `acceptance_criteria` are missing, TGO must not auto-parallelize the task.

## Worktrees And Branches

TGO-created implementation worktrees default outside the project repo:

```text
../.tgo-worktrees/<repo-name>/<beads-id>-<short-slug>/
```

Branches use:

```text
tgo/<beads-id>-<short-slug>
```

Each implementation task gets its own worktree/branch. TGO records worktree path, branch, base branch, Beads issue, linked plan, validation status, and current commit in artifacts/manifests. TGO never deletes worktrees automatically.

If worktree creation fails, TGO warns and asks before falling back to the current worktree.

## Batch Integration

Parallel sibling branches integrate as a batch in a dedicated integration worktree:

```text
../.tgo-worktrees/<repo>/<plan-id>-integration/
```

TGO waits for all siblings in the current wave to finish or fail, then integrates passed branches in dependency/priority order. It checks clean status and verifies branch heads still point to reviewed commits before merging.

TGO may automatically merge reviewed branches into the integration worktree and create integration commits there after validation passes. It may not merge integration results back into the user's main branch, push, open PRs, or delete branches/worktrees without explicit approval.

After batch integration:

- Run full validation in the integration worktree.
- Run batch Reviewer against parent plan/spec, cross-branch interactions, validation, and Beads/artifact consistency.
- Mark siblings complete only after green validation and batch Reviewer pass.

## Reconciliation

If merge conflicts occur, TGO creates a reconciliation task. It does not let Orchestrator or deterministic git tooling create automatic conflict-resolution commits.

Reconciliation records conflicting branches, files, base commit, attempted merge order, and affected Beads issues. It creates/links a `reconciliation` Beads issue under the same parent plan. Builder resolves conflicts in the integration or fresh reconciliation worktree, scoped to conflicting files plus tests needed to prove integrated behavior. Reviewer then performs a special reconciliation review against original sibling acceptance criteria and conflict-resolution correctness.

## Auto-Continue

Auto-continue is enabled by default but chain-local, not queue-global.

TGO may continue automatically only when the next issue belongs to the same approved plan or explicitly confirmed issue chain, dependencies are resolved, previous issue passed Reviewer and was committed/integrated as required, acceptance criteria are clear, worktree setup is clean, and no new user decision/config mutation/destructive operation is needed.

TGO pauses when reaching a different plan, unrelated Beads issue, ambiguous priority, Reviewer second rejection, failed validation gate, non-obviously-scoped test failure, required global setup/auth/config change, missing approved artifact, or unconfirmed chain goal.

## Resume And Recovery

TGO persists active wave state in `.opencode/tgo/state.jsonc` and linked plan artifacts. It records active worktrees, branches, Beads issues, task status, Reviewer status, integration status, validation status, and last safe checkpoint.

TGO never resumes work from startup. On the next user message or `/tgo:doctor`, it reports interrupted work with options to resume, inspect, abandon, clean up, or run doctor. “Continue” can resume the last active approved wave if no new decision is required.

Before resuming, TGO verifies worktree cleanliness, branch heads, reviewed commits, Beads links, artifact consistency, and integration state.
