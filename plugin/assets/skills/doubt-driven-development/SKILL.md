---
name: doubt-driven-development
description: Orchestrator-run adversarial check of a non-trivial claim on fresh context — CLAIM, EXTRACT, DOUBT, RECONCILE, STOP. Use when stakes are high, code is unfamiliar, or confidence is cheaper to verify now than debug later. Reviewer-side evidence check, never user interrogation (that is grilling).
license: MIT
---

# Doubt-Driven Development

Confidence is not correctness: sessions promote assumptions into facts. Schedule a hostile re-read — a fresh-context reviewer biased to disprove — before a non-trivial decision stands. In-flight, while correction is cheap: not a verdict on finished work (code-review), never user questions (grilling).

## When To Use

Non-trivial means any line holds: new or changed branching; a crossed module or service boundary; claims no type system checks (safety, idempotence, ordering, invariants); correctness leaning on invisible context; irreversible blast radius (deploys, migrations, public APIs). Run before uncertain architecture calls, non-trivial code, and non-obvious facts.

## When NOT To Use

Skip mechanical edits (renames, formatting, moves), verbatim user instructions, reading or summarizing code, one-line self-evident changes, pure tool runs, and whenever the user traded verification for speed. Applied everywhere, it ships nothing.

## Orchestrator-Only Constraint

Any seat may trigger this discipline; Step 3 runs on the orchestrator only. Bernstein dispatches the fresh-context reviewer. Other seats never self-run the adversarial pass — they finish Steps 1–2, attach the package to their report, and escalate. An in-seat reviewer inherits its context and defeats the purpose.

## Process

### 1. CLAIM

State the decision in two or three lines plus why it matters (`CLAIM: "The retry queue preserves ordering under concurrent producers." WHY THIS MATTERS: reordering double-charges customers.`). Vague means vibe, not decision.

### 2. EXTRACT

Hand the reviewer artifact plus contract, never the journey: the diff or function, the proposal plus constraints, the claim beside its evidence. Strip reasoning. One read must hold the unit; oversized changes decompose first.

### 3. DOUBT (orchestrator only)

Frame adversarially — the prompt decides the answer:

```
Break this artifact. Assume the author is overconfident: hunt
unstated assumptions, unhandled edges, hidden coupling, contract
violations, broken conventions, hostile-input failures. Issues
only — no validation, no summary. ARTIFACT: <artifact>
CONTRACT: <contract>
```

Withhold the CLAIM: conclusions handed over return agreement. The adversarial frame outranks any default reviewer shape — issues only, never a balanced verdict.

Cross-model safety: one model shares the author's blind spots, so each interactive cycle offers a different-model second opinion. The user authorizes every invocation; external commands run read-only from a prompt file. Announce every skip; silent ones are banned.

### 4. RECONCILE

Findings are data, not verdict. Re-read the artifact per finding and take the earliest class that fits: **1. Contract misread** — repair the contract, re-classify next cycle. **2. Valid and actionable** — fix the artifact, loop again. **3. Valid trade-off** — record it for the user. **4. Noise** — note it, move on. Reconcile, never rubber-stamp.

### 5. STOP

Stop at trivial or repeated findings, at 3 cycles (escalate — never a fourth alone), or at user override. Three substantive cycles describe the artifact: surface that. Too large for three cycles means decompose in Step 2, not lift the bound.

## Rationalizations

| Rationalization | Reality |
|---|---|
| "Certain — skip doubt" | Certainty is where blind spots nest. |
| "Review costs too much" | Production debugging costs more; the loop is bounded, the bug is not. |
| "End review covers this" | End review is a gate; doubt steers while turning is cheap. |

## Red Flags

Doubting trivia; rubber-stamping without re-reading; a fourth cycle; "is this good?" prompts; skipping under pressure; re-reviewing unchanged artifacts; zero actionable findings over two cycles (theater — escalate); post-commit doubt; silent skips; CLAIM leaked to the reviewer.

## Verification

- [ ] Each non-trivial decision stood as a written CLAIM first.
- [ ] Reviewer saw ARTIFACT plus CONTRACT only — no CLAIM, no reasoning.
- [ ] Prompt demanded issues, not approval.
- [ ] Findings classified in precedence order against the artifact text.
- [ ] A stop condition fired; post-3-cycle substance escalated.
- [ ] Cross-model offered or skip announced.
- [ ] External runs user-authorized and read-only.

*Adapted from addyosmani/agent-skills `doubt-driven-development` (MIT License). Upstream: https://github.com/addyosmani/agent-skills*
