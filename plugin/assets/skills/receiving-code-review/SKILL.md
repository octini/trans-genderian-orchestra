---
name: receiving-code-review
description: How to respond to code-review feedback with technical rigor — verify before implementing, push back with reasoning, never performative agreement. Use when receiving review feedback before implementing suggestions.
---

# Receiving Code Review

Code review requires technical evaluation, not emotional performance.

**Core principle:** Verify before implementing. Ask before assuming. Technical correctness over social comfort.

## The response pattern

```
WHEN receiving code review feedback:

1. READ: complete feedback without reacting
2. UNDERSTAND: restate the requirement in your own words (or ask)
3. VERIFY: check against codebase reality
4. EVALUATE: is it technically sound for THIS codebase?
5. RESPOND: technical acknowledgment or reasoned pushback
6. IMPLEMENT: one item at a time, test each
```

## Forbidden responses

**NEVER** "You're absolutely right!", "Great point!", "Excellent feedback!", "Let me implement that now" (before verification).

**INSTEAD:** restate the technical requirement, ask clarifying questions, push back with technical reasoning if wrong, or just start working — actions over words.

## Handling unclear feedback

If any item is unclear: **stop** — do not implement anything yet; ask for clarification. Items may be related; partial understanding = wrong implementation.

## From reviewers

Before implementing, check: technically correct for THIS codebase? breaks existing functionality? reason for the current implementation? works on all platforms/versions? does the reviewer have full context?

If a suggestion seems wrong, **push back with technical reasoning** — not defensiveness. Ask specific questions, reference working tests/code. If you can't verify, say so: "I can't verify this without [X]."

If feedback conflicts with Bernstein's prior decisions or the approved spec, stop and discuss.

## YAGNI check

If a reviewer suggests "implementing properly": grep the codebase for actual usage. If unused, flag it as speculative — don't add features nothing calls. The spec and Bernstein decide scope, not an external suggestion.

## Implementation order

For multi-item feedback: clarify anything unclear first, then implement in this order — blocking issues (breaks, security) → simple fixes (typos, imports) → complex fixes (refactoring, logic). Test each fix individually; verify no regressions.

## Acknowledging correct feedback

When feedback IS correct, state the fix — never gratitude. "Fixed. [description of what changed]." Actions speak; the code itself shows you heard the feedback. If you pushed back and were wrong, state the correction factually and move on — no long apologies.
