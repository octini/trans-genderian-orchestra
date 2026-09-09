---
name: verify-before-claim
description: Run verification commands before claiming complete/fixed/passing, committing, PR, closing. Use when about to state success — evidence before assertions, always.
license: MIT
---

# Verify Before Claim

Claiming work is complete without fresh evidence is dishonesty, not efficiency. Evidence before claims, always.

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you have not run the verification command in this session, you cannot claim it passes. Violating the letter of this rule violates its spirit.

## The Gate

Run these steps before claiming any status or expressing satisfaction:

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

## Claim Table

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test of original symptom passes | Code changed, assumed fixed |
| Regression test works | Red-green cycle verified | Test passes once |
| Agent completed | VCS diff shows the changes | Agent reports "success" |
| Requirements met | Line-by-line checklist | Tests passing alone |

## Red Flags — Stop

Stop immediately when you catch any of these:

- Using "should", "probably", "seems to".
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!").
- About to commit, push, or open a PR without verification.
- Trusting an agent success report instead of checking the diff.
- Relying on partial verification or extrapolation.
- Thinking "just this once", or rushing because you are tired.
- Any wording implying success without having run verification.

## Key Patterns

- Tests: run the full command, read the counts, then claim. Never "should pass now".
- Regression tests: write, run (pass), revert the fix, run (must fail), restore, run (pass). A test that never fails proves nothing.
- Build: a passing linter is not a passing build. Run the build.
- Requirements: re-read the spec, check each item, report gaps or completion. Never "tests pass, phase complete".
- Delegation: an agent report is a lead, not evidence. Check the diff, run the gate, report the actual state.

## When To Apply

Apply always before any variation of a success claim, any expression of satisfaction, any positive statement about work state, committing, PR creation, task completion, closing an issue, moving to the next task, or delegating onward. The rule covers exact phrases, paraphrases, synonyms, and implications of success.

Run the command. Read the output. Then claim the result. No shortcuts.

*Adapted from obra/superpowers `verification-before-completion` (MIT License). Upstream: https://github.com/obra/superpowers*
