---
name: code-simplification
description: Slim working code post-review without behavior change. Use when tested code works but reads heavy — reduce nesting, split long functions, rename, remove dead code — tests stay unchanged and green.
license: MIT
---

# Code Simplification

Reduce complexity while preserving exact behavior — every input, output, side effect, error path, and edge case stays identical. The goal is comprehension speed, not fewer lines.

## When To Use

Use after a feature works and tests pass but reads heavy; when review flags complexity; on deep nesting (3+), long functions (50+), unclear names, duplication, or dead code. Do NOT use on already-clean code, code you do not yet understand, hot paths where simpler means slower, or modules about to be rewritten.

## Process

### 1. Understand First (Chesterton's Fence)

Answer before touching: responsibility? Callers and callees? Edge cases and error paths? Which tests pin behavior? Why written this way (perf, platform, history — check blame)? Cannot answer = read more first.

### 2. Scan for Signals

- **Structure:** deep nesting → guard clauses; long functions → split into named focused functions; nested ternaries → if/else or lookup; boolean flag params → options object; repeated conditionals → named predicate.
- **Naming:** generic (`data`, `temp`) → descriptive words; misleading names (a `get` that mutates) → rename to behavior. Delete what-comments; keep why-comments.
- **Redundancy:** duplicated 5+ line blocks → shared function; dead branches/vars/commented blocks → remove (confirm dead); valueless wrappers → inline; one-strategy patterns → direct approach.

### 3. Apply Incrementally

One change at a time, tests after each: pass → continue, fail → revert. Never edit tests to fit a simplification — that is a behavior change. Ship refactors separately from features/fixes. **Rule of 500:** 500+ line refactors get automation (codemods, AST transforms), not hand edits.

## Rationalizations

| Rationalization | Reality |
|---|---|
| "Working code, don't touch it" | Hard-to-read code is hard-to-fix code. |
| "Fewer lines is simpler" | A 1-line nested ternary loses to a 5-line if/else. |
| "Clean up unrelated code too" | Unscoped refactors make noisy diffs and regressions. |
| "Refactor with the feature" | Separate them — mixed changes resist review and revert. |

## Red Flags

Tests need edits to stay green; error handling removed for "cleanliness"; renames follow taste over project conventions; simplifying un-understood code; batching many changes into one untested commit.

## Verification

- [ ] Tests pass unmodified; build and linter clean.
- [ ] Each change incremental and reviewable; no unrelated edits.
- [ ] Project conventions followed; error handling intact; no dead code left.

*Adapted from addyosmani/agent-skills `code-simplification` (MIT License). Upstream: https://github.com/addyosmani/agent-skills*
