---
name: diagnosing-bugs
description: Diagnosis loop for hard bugs and performance regressions. Use when the user says "diagnose"/"debug this", or reports something broken/throwing/failing/slow. Builds a tight red feedback loop before theorising.
---

# Diagnosing Bugs

A discipline for hard bugs. Skip phases only when explicitly justified.

## Redact

You will show commands, outputs, and captured artifacts. **Redact every secret first** — write `<REDACTED>` in its place. Build loops against env vars, so the credential stays in the environment rather than in what you show. Captured artifacts carry auth headers: quote only the lines that carry the signal.

If the redacted output is not enough to diagnose the bug, say so and ask the user.

## Phase 1 — Build a feedback loop

**This is the skill.** Everything else is mechanical. If you have a **tight** pass/fail signal for the bug — one that goes red on *this* bug — you will find the cause; bisection, hypothesis-testing, and instrumentation all just consume it. If you don't have one, no amount of staring at code will save you.

Spend disproportionate effort here. **Be aggressive. Be creative. Refuse to give up.**

### Ways to construct one — try in roughly this order

1. **Failing test** at whatever seam reaches the bug — unit, integration, e2e.
2. **Curl / HTTP script** against a running dev server.
3. **CLI invocation** with a fixture input, diffing stdout against a known-good snapshot.
4. **Headless browser script** — drives the UI, asserts on DOM/console/network.
5. **Replay a captured trace.** Save a real network request/payload/event log; replay it through the code path in isolation.
6. **Throwaway harness.** Spin up a minimal subset of the system (one service, mocked deps) that exercises the bug path with one function call.
7. **Property / fuzz loop.** If the bug is "sometimes wrong output", run 1000 random inputs and look for the failure mode.
8. **Bisection harness.** If the bug appeared between two known states, automate "boot at state X, check, repeat" so you can `git bisect run` it.
9. **Differential loop.** Run the same input through old-version vs new-version (or two configs) and diff outputs.

Build the right feedback loop, and the bug is 90% fixed.

### Tighten the loop

Treat the loop as a product. Once you have *a* loop, **tighten** it: faster? sharper signal (assert on the specific symptom, not "didn't crash")? more deterministic (pin time, seed RNG, isolate filesystem)? A 30-second flaky loop is barely better than no loop; a 2-second deterministic one is a debugging superpower.

### Non-deterministic bugs

The goal is not a clean repro but a **higher reproduction rate**. Loop the trigger 100×, parallelise, add stress, narrow timing windows. A 50%-flake bug is debuggable; 1% is not — keep raising the rate until it's debuggable.

### When you genuinely cannot build a loop

Stop and say so explicitly. List what you tried. Ask the user for: (a) access to whatever environment reproduces it, (b) a redacted captured artifact (HAR, log dump, core dump, recording with timestamps), or (c) permission to add temporary production instrumentation. Do **not** proceed to hypothesise without a loop.

### Completion criterion

Phase 1 is done when the loop is **tight** and **red-capable**: you can name **one command** — a script path, a test invocation, a curl — that you have **already run at least once**, and that is red-capable (drives the actual bug code path and asserts the user's exact symptom), deterministic, fast (seconds, not minutes), and agent-runnable.

If you catch yourself reading code to build a theory before this command exists, **stop** — jumping straight to a hypothesis is the exact failure this skill prevents. No red-capable command, no Phase 2.

## Phase 2 — Reproduce + minimise

Run the loop. Watch it go red. Confirm it produces the failure the **user** described (not a nearby different failure), it's reproducible, and you've captured the exact symptom.

### Minimise

Shrink the repro to the **smallest scenario that still goes red**. Cut inputs, callers, config, data, and steps one at a time, re-running the loop after each cut. Done when every remaining element is load-bearing — removing any one makes the loop go green. The minimal repro becomes the regression test in Phase 5.

## Phase 3 — Hypothesise

Generate **3–5 ranked hypotheses** before testing any. Each must be **falsifiable**: state the prediction. Format: "If <X> is the cause, then <changing Y> will make the bug disappear."

**Show the ranked list to the user before testing.** They often have domain knowledge that re-ranks instantly. Don't block on it — proceed if they're AFK.

## Phase 4 — Instrument

Each probe maps to a specific Phase 3 prediction. **Change one variable at a time.**

1. **Debugger / REPL inspection** if the env supports it. One breakpoint beats ten logs.
2. **Targeted logs** at the boundaries that distinguish hypotheses.
3. Never "log everything and grep".

**Tag every debug log** with a unique prefix (e.g. `[DEBUG-a4f2]`); cleanup is a single grep.

**Perf branch.** For performance regressions, logs are usually wrong. Establish a baseline measurement, then bisect. Measure first, fix second.

## Phase 5 — Fix + regression test

Write the regression test **before the fix** — but only if there is a **correct seam** for it (one where the test exercises the real bug pattern as it occurs at the call site). **If no correct seam exists, that itself is the finding** — the codebase architecture is preventing the bug from being locked down; flag it.

If a correct seam exists: turn the minimised repro into a failing test, watch it fail, apply the fix, watch it pass, then re-run the Phase 1 loop against the original scenario.

## Phase 6 — Cleanup + post-mortem

Required before declaring done:

- Original repro no longer reproduces (re-run the Phase 1 loop)
- Regression test passes (or absence of seam is documented)
- All `[DEBUG-...]` instrumentation removed
- Throwaway prototypes deleted or clearly marked
- The correct hypothesis is stated in the commit/PR message — so the next debugger learns

Then ask: **what would have prevented this bug?** If the answer involves architectural change, hand off with the specifics — after the fix is in, not before.
