# TGO v3 Review Loop Enforcer Design Spec

## Overview

TGO v3 keeps the omo-slim foundation and adds a small runtime enforcement layer for the approved review loop. The purpose is not to redesign delegation, council behavior, or review prompts; it is to make the already-approved Composer → Ensemble/Principal review path hard to skip accidentally after non-trivial implementation work.

The enforcer should preserve the Conductor-led workflow. It should remind, gate, and block when the next required review step is missing, but it should not silently launch `@ensemble`, `@principal`, or `@composer` itself.

## Current State

- Ensemble/councillor machinery exists and is expected to remain the basis for multi-model review and council-style deliberation.
- Agent prompts already describe the review loop at a behavioral level.
- `src/workflow/review-loop-counter.ts` exists, but it is not wired into runtime hook behavior.
- Because enforcement is prompt-only, Conductor can accidentally proceed after `@composer` work without the appropriate review gate.

## Goals

- Require review after completed `@composer` delegation for everything except the simplest low-risk changes.
- Use conservative skip rules so implementation, agent, review, and plugin-logic changes route to `@ensemble` by default.
- Require `@principal` as the final review gate in both paths:
  - Composer → Ensemble → Principal for non-trivial work.
  - Composer → Principal for explicitly skipped trivial work.
- Wire the existing review loop counter so repeated Composer ↔ Ensemble cycles are tracked deterministically.
- Surface the required next action to Conductor as a blocking internal reminder instead of auto-running subagents.

## Non-Goals

- Do not automatically invoke `@ensemble`, `@principal`, or `@composer` without Conductor.
- Do not block trivial documentation/configuration tweaks from quick principal-only review.
- Do not redesign the ensemble/council system.
- Do not replace prompt-level guidance; runtime enforcement complements it.
- Do not add broad artifact lifecycle machinery or revive TGO v2 orchestration complexity.

## Architecture

Add a focused hook implementation under `src/hooks/review-loop-enforcer/` and register it through the existing hook surface:

- `src/hooks/review-loop-enforcer/` — new hook module, classifiers, state helpers, and tests as needed.
- `src/hooks/index.ts` — export/register the hook with the hook registry.
- `src/index.ts` — include the hook in plugin initialization so it runs during normal TGO sessions.
- `src/workflow/review-loop-counter.ts` — wire existing counter behavior into the enforcer rather than duplicating loop state.
- Verdict parser/schema — validate predictable `@ensemble` JSON metadata before advancing the gate.
- Prompt updates — small additions for Composer, Ensemble, and Principal to emit/consume predictable review metadata.

At runtime, the enforcer observes agent-completion and next-step events, derives the required review action, and blocks forward progress until the required action is satisfied.

## Skip Rules

Skip `@ensemble` only when the completed Composer work is clearly low risk:

1. Markdown-only documentation changes.
2. Simple configuration tweaks.
3. Fewer than 10 changed lines, as long as the change does **not** touch agent, review, or plugin logic.

All other completed Composer work requires `@ensemble` before `@principal`.

Conservative defaults:

- Unknown file types require `@ensemble`.
- Any changes under agent prompt/config generation, hook logic, workflow logic, plugin initialization, model routing, review parsing, or council/ensemble code require `@ensemble`.
- Mixed changes use the highest-risk touched path; for example, docs plus hook logic still requires `@ensemble`.
- If change classification fails, require `@ensemble`.

## State Flow

1. The hook detects a completed `@composer` delegation.
2. The hook records the task in `review-loop-counter`.
3. The hook classifies the resulting changed files and changed-line count.
4. If skip rules match, the hook marks `@ensemble` skipped and requires `@principal` directly.
5. If skip rules do not match, the hook requires `@ensemble`.
6. The hook injects a blocking internal reminder into Conductor's next step with the required action.
7. If Conductor attempts to continue, summarize, or finish before satisfying the gate, the hook repeats the block with the same required next action.
8. After `@ensemble` returns an approved verdict, the hook requires `@principal`.
9. After `@ensemble` rejects, the hook requires `@composer` rework.
10. After `@principal` completes the final gate, the review loop is considered satisfied for that Composer task.

## Verdict Parsing

`@ensemble` should return predictable review metadata in JSON. The parser should validate at least:

- `verdict`: `"approve"` or `"reject"`.
- `criticalIssues`: array of issue objects or strings.
- `requiredNextAction`: expected next agent/action when rejected or approved.
- `reviewedTaskId` or equivalent correlation metadata for the Composer task under review.

Parser rules:

- `verdict: "approve"` with no critical issues requires `@principal` next.
- `verdict: "reject"` requires `@composer` rework next.
- Any critical issue forces rejection, even if the verdict field says approve.
- Missing, malformed, or uncorrelated JSON is treated as a failed review and requires Conductor to obtain a valid `@ensemble` verdict before proceeding.

Principal metadata should confirm the final review gate has been completed for the same Composer task or for the direct principal-only skip path.

## Failure Handling

- If the hook cannot classify changes, require `@ensemble`.
- If the hook cannot correlate an agent result to the active review task, block and request the expected review action with correlation metadata.
- If Conductor tries to finish before the review gate is satisfied, block and repeat the required next action.
- If `@ensemble` rejects, require `@composer` rework and increment the Composer ↔ Ensemble loop count.
- If the loop counter reaches 3 Composer ↔ Ensemble cycles, require `@principal` escalation with `wheelsSpinning: true`.
- If `@principal` escalation is required, do not continue cycling Composer/Ensemble until Principal has reviewed the stalled loop.

## Testing

Required test coverage:

- Composer completion requiring `@ensemble` for normal implementation work.
- Markdown-only Composer change requiring `@principal` directly.
- Small non-agent change under 10 changed lines requiring `@principal` directly.
- Agent/plugin/review logic change requiring `@ensemble`, even when small.
- Ensemble rejection requiring `@composer` rework.
- Ensemble approval requiring `@principal` final review.
- Loop count of 3 requiring `@principal` escalation with `wheelsSpinning: true`.

Additional useful assertions:

- Mixed-risk changes use the highest-risk classification.
- Malformed ensemble JSON does not advance the gate.
- Critical issues override an approve verdict.
- The hook emits blocking reminders but does not invoke subagents directly.

## Implementation Plan Notes

1. Add `src/hooks/review-loop-enforcer/` with a small state machine around Composer task completion, required next action, and review satisfaction.
2. Register the hook in `src/hooks/index.ts` and `src/index.ts`.
3. Wire `src/workflow/review-loop-counter.ts` into the hook for cycle tracking and three-cycle escalation.
4. Add a narrow change classifier for markdown-only, simple-config, small-safe, and high-risk plugin/agent/review logic changes.
5. Add the ensemble verdict parser/schema and correlation checks.
6. Update Composer, Ensemble, and Principal prompts only enough to produce predictable task/review metadata.
7. Add the required tests before broadening behavior.
8. Keep the implementation small and local; this is a follow-up enforcement layer, not a rebuild of the workflow system.
