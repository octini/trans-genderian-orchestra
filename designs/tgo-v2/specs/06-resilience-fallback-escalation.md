---
artifact_type: design_spec
status: draft
spec_id: tgo-v2-06-resilience-fallback-escalation
created_at: 2026-06-02
updated_at: 2026-06-02
source_checkpoint: designs/tgo-v2-settled-decisions.md
---

# Resilience, Fallback, And Escalation

## Failure Classes

TGO classifies failures before retrying:

- Structural/provider failures: rate limits, quota, provider overload, 5xx, network errors, model unavailable, provider timeout, repeated empty provider response.
- Tool/schema failures: invalid JSON/tool args, malformed delegation envelope, missing required envelope fields, malformed artifact frontmatter, invalid deterministic-command args.
- Semantic failures: failed tests, bad implementation, Reviewer rejection, scope drift, unsupported claims, weak architecture, missing validation.
- Timeout/cancellation: exceeded lane timeout, user cancelled, partial output incomplete.
- Environmental/pre-existing: unrelated failures already present before TGO work.

Model fallback applies only to structural/provider failures. It never applies to semantic quality failures.

## Provider Fallback And Circuit Breaker

Provider/model fallback uses a session-local circuit breaker:

- Track structural/provider failures per `provider/model` in the active OpenCode session.
- Open after 3 structural/provider failures in a rolling window.
- Cool down for 5 minutes.
- Allow one half-open probe after cooldown.
- Close after one successful response.
- Do not persist provider health across OpenCode restarts initially.

Fallback events affecting delegated work are recorded in artifact metadata/logs.

## Empty Provider Responses

An empty provider response is retryable structural failure only when no usable output/artifact was produced.

- One immediate retry on same model.
- Repeated empty response triggers fallback and counts toward circuit breaker.
- Empty Council response affects only that councillor; Council synthesizes if at least one councillor returns useful output.
- Empty Builder/Researcher/Reviewer response is never success and becomes `blocked_provider_empty_response` if unresolved.

## Tool And Schema Recovery

Tool/schema failures do not count against semantic retry budget.

Allow up to 2 immediate self-correction attempts:

- First includes exact parse/schema error and expected shape.
- Second says not to repeat the invalid call and to switch approach or ask for help.

If still invalid after 2 attempts:

- Orchestrator-delegated specialist task becomes `blocked_tool_schema`.
- Direct user-invoked specialist asks concise clarification or reports inability.
- Deterministic command returns structured error with no unsafe mutation.

Repeated generated-artifact schema failures should trigger protocol/spec improvements, not silent fallback.

## Semantic Retry Model

TGO retains the Trajectory Guard concept but uses an adaptive 3-attempt semantic retry model.

Default semantic retry budget: 3.

Attempt model:

- Attempt 1: retry same specialist with structured feedback.
- Attempt 2: rotate to fresh specialist session/context if failure repeats or Reviewer rejects rework.
- Attempt 3: only for planned work, create a smaller rework/reconciliation/decomposition task.
- After budget: stop automatic retries and escalate to Council or user.

Reviewer rule is stricter: first rejection routes to Builder rework; second rejection on same task escalates to Council or user. No third/fourth/fifth silent loop.

Parallel wave rule: one branch-level rework plus one reconciliation pass before escalation.

Semantic retry budget is configurable. Minimum `1`; default `3`; warn above `3`; allow `4` or `5` only with explicit override. Reviewer second-rejection and parallel-wave caps remain fixed regardless of retry budget.

## Timeout And Cancellation

Every delegated task gets lane/risk-specific timeout policy.

- Researcher: shorter.
- Builder: longer.
- Reviewer: medium.
- Council: bounded by councillor timeout plus synthesis timeout.

Timeout becomes `blocked_timeout` and does not count as success. Partial output is recorded if available. One timeout retry is allowed only when structurally interrupted, not when making poor semantic progress. Repeated timeout triggers fresh session/model fallback only if provider/structural; otherwise Orchestrator re-decomposes.

User cancellation records cancellation in artifacts and Beads, leaves worktrees/branches/partial artifacts intact, and offers resume/inspect/abandon/cleanup.

In parallel waves, one timed-out Builder does not automatically cancel independent siblings. TGO finishes/records the wave and classifies whether timeout blocks dependencies.

## Status Taxonomy

Workflow statuses:

- `completed`: acceptance criteria met, validation passed, Reviewer passed, no blocking degradation.
- `completed_with_warnings`: acceptance criteria and Reviewer pass, but non-blocking warnings remain.
- `completed_with_override`: user explicitly overrode a gate/rejection/degradation.
- `degraded`: workflow ran with reduced capability.
- `blocked`: user action, required dependency, auth, validation failure, unresolved conflict, or repeated tool/schema/provider failure prevents progress.
- `failed`: attempted output is incorrect and needs rework.
- `cancelled`: user stopped the workflow.

Builder implementation tasks cannot be complete because “mostly done.” Optional-tool degradation can be accepted only when acceptance criteria do not require that capability. Required-tool degradation blocks the relevant capability, not necessarily the whole plugin.

Beads issue status becomes done only for `completed` or approved `completed_with_warnings`.

## Failure Reporting

Every failed/degraded workflow produces concise user summary and durable artifact metadata.

User-facing report includes:

- Status.
- Failed step.
- Cause class.
- Affected Beads issue/artifacts.
- What was attempted.
- Exact next options.

Artifact metadata includes:

- `failure_type`
- `attempt_count`
- `last_error_summary`
- `fallback_used`
- `retry_budget_remaining`
- `blocked_on`
- `recommended_next_step`

Beads notes receive short status updates, not full logs. Raw noisy provider/tool output stays in TGO artifacts or structured command results and is redacted for secrets.

## Overrides

Users can override validation gates, Reviewer rejection, degraded capability blocks, parallel scheduling pauses, and failed doctor checks.

Overrides require a short reason, either typed or selected:

- `accepted risk`
- `pre-existing failure`
- `temporary workaround`
- `manual verification completed`
- `not relevant to this task`

Overrides are recorded in artifact frontmatter/body, Beads notes if issue-linked, and manifest state if setup/config-related.

Overrides cannot bypass hard safety rules:

- No secret persistence.
- No destructive cleanup without confirmation.
- No automatic push/merge to main.
- No overwriting user-managed config without approval.

Doctor reports active overrides and distinguishes temporary snoozes from permanent accepted risks.

## Resilience Profiles

Resilience is a third preset dimension. Bootstrap/setup support:

```bash
--resilience conservative|balanced|aggressive
```

Default is `balanced`.

Profiles control:

- `semantic_retry_budget`
- `tool_schema_retries`
- `provider_circuit_breaker_threshold`
- `provider_circuit_breaker_cooldown_ms`
- lane timeouts
- `max_parallel_builders`
- `max_parallel_researchers`
- `max_parallel_reviewers`
- `auto_worktree`
- `auto_continue`
- `auto_commit_after_review`
- override strictness

Most users should not edit exact values. Advanced config can override exact values. Doctor warns when settings increase cost/risk, such as retry budget above 3 or high Builder parallelism.
