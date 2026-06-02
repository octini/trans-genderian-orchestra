# Agents And Workflows

## Agent Roster

- Orchestrator: user-facing technical lead, dispatcher, phase controller, and artifact owner.
- Researcher: evidence retrieval, docs/source comparison, and uncertainty reporting.
- Builder: scoped implementation, tests, local validation, and rework.
- Reviewer: required verification gate for behavior-changing work.
- Council: escalation-only synthesis workflow.
- Councillor: internal council participant prompt for independent analysis.

## Role Boundaries

The orchestrator should not silently implement arbitrary project changes. Builders own scoped implementation. Reviewers verify against the user request, plan, and acceptance criteria. Council is reserved for explicit escalation, high-risk decisions, or repeated reviewer rejection loops.

## Permissions

Agent permissions are designed around bounded write scopes and path-gating. User-owned config, tools, providers, skills, plugins, and MCPs are preserved unless explicitly adopted or changed.

## Conversation-Triggered Intent

TGO is designed around conversation-triggered workflows. The user should not need to memorize every slash command; the orchestrator should classify intent, ask for missing decisions when needed, and route to the right workflow.

## Delegation Envelope

Builder and researcher handoffs should carry original user intent, relevant files, constraints, acceptance criteria, non-goals, write scope, validation commands, and reporting requirements.

## Specialist Result Contract

Specialists should report what changed, what was validated, unresolved risks, and exact follow-up needs. Results should be synthesizable by the orchestrator without losing user intent.

## Reviewer Gate

Behavior-changing work should pass a reviewer gate before the orchestrator claims completion. Reviewer output should focus on correctness, regressions, missing tests, and spec mismatch.

## Council Escalation

Council is escalation-only. It is appropriate for explicit user requests, critical-risk decisions, or repeated reviewer rejection loops.

## Scheduler, Worktrees, And Integration

TGO design includes scheduler waves, separate builder worktrees, branch-level reviewer artifacts, dedicated integration validation, and reconciliation tasks for conflicts. These are workflow primitives and should not be confused with unattended production maturity beyond implemented deterministic pieces.

## Resume And Auto-Continue

Durable artifacts and state files exist to preserve context through compaction and handoff. Auto-continue behavior must remain bounded by user intent and validation gates.

## Spec Coverage

- Spec 02: agent roster, role boundaries, and permissions.
- Spec 03: delegation envelopes, artifacts, intent routing, and specialist result contracts.
- Spec 04: Beads work tracking, scheduler, worktrees, integration, and reconciliation.
