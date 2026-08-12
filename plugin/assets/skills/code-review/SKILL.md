---
name: code-review
description: Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes — Standards and Spec — plus five lenses, and report them side by side. Use when reviewing a branch, a PR, work-in-progress changes, or asked to "review since X".
---

# Code Review

Two-axis review of the diff between `HEAD` and a fixed point the user supplies:

- **Standards** — does the code conform to this repo's documented coding standards (plus the smell baseline below)?
- **Spec** — does the code faithfully implement the originating issue/spec?

Both axes run as **parallel subagents** so they don't pollute each other's context, then this skill aggregates their findings.

## 1. Pin the fixed point

Whatever the user said is the fixed point — a commit SHA, branch, tag, `main`, `HEAD~5`, etc. If none, ask for it. Capture the diff once: `git diff <fixed-point>...HEAD` (three-dot) and `git log <fixed-point>..HEAD --oneline`. Confirm the fixed point resolves and the diff is non-empty — a bad ref or empty diff fails here, not inside two parallel subagents.

## 2. Identify the spec source

Look for the originating spec, in this order:

1. Issue references in commit messages (`#123`, `Closes #45`, etc.) — fetch via the issue tracker.
2. A path the user passed as an argument.
3. A spec file under `docs/`, `specs/`, or `.scratch/` matching the branch name or feature.
4. If nothing is found, ask where the spec is. If there isn't one, the **Spec** sub-agent skips and reports "no spec available".

## 3. Identify the standards sources

Anything in the repo that documents how code should be written (`CODING_STANDARDS.md`, `CONTRIBUTING.md`). On top of whatever the repo documents, the Standards axis always carries the **smell baseline** below — a fixed set of Fowler code smells (_Refactoring_, ch.3) that applies even when the repo documents nothing. Two rules bind it:

- **The repo overrides.** A documented repo standard always wins; where it endorses something the baseline would flag, suppress the smell.
- **Always a judgement call.** Each smell is a labelled heuristic, never a hard violation — and skip anything tooling already enforces.

Each smell reads *what it is* → *how to fix*:

- **Mysterious Name** — a name that doesn't reveal what it does. → rename.
- **Duplicated Code** — the same logic shape in more than one hunk/file. → extract the shared shape.
- **Feature Envy** — a method reaching into another object's data more than its own. → move it onto the data it envies.
- **Data Clumps** — the same few fields/params travelling together. → bundle into one type.
- **Primitive Obsession** — a primitive standing in for a domain concept. → give it its own type.
- **Repeated Switches** — the same switch/if-cascade on the same type recurs. → polymorphism or a shared map.
- **Shotgun Surgery** — one logical change forcing scattered edits. → gather them into one module.
- **Divergent Change** — one file edited for several unrelated reasons. → split so each changes for one reason.
- **Speculative Generality** — abstraction for needs the spec doesn't have. → delete it.
- **Message Chains** — long `a.b().c().d()` navigation. → hide the walk behind one method.
- **Middle Man** — a class/function that mostly delegates onward. → cut it, call the real target.
- **Refused Bequest** — a subclass that ignores most of what it inherits. → composition over inheritance.

## 4. Run the lenses in parallel

Spawn parallel sub-agents, each with the diff + commit list and its brief. The five lenses (bmad-review vocabulary):

1. **Adversarial** — attack the diff: does the change hold up to hostile scrutiny?
2. **Edge-case** — boundary conditions, empty/null/unusual inputs, error paths.
3. **Verification-gap** — is there evidence the change actually works, or only that it compiles?
4. **Structure** — module boundaries, coupling, cohesion, depth; is the seam right?
5. **Prose** — naming, comments, documentation; does it read well?

Fold the **Standards** axis (documented standards + smell baseline) and **Spec** axis (spec compliance, scope creep, wrong-looking implementations) into the same parallel fan-out as lenses 1–5, each sub-agent quoting the diff/spec line for every finding.

**Standards brief:** "Report — per file/hunk where relevant — (a) every place the diff violates a documented standard: cite the standard (file + rule); and (b) any baseline smell you spot: name it and quote the hunk. Distinguish hard violations from judgement calls — documented-standard breaches can be hard, but baseline smells are always judgement calls, and a documented repo standard overrides the baseline. Skip anything tooling enforces. Under 400 words."

**Spec brief:** "Report: (a) requirements the spec asked for that are missing or partial; (b) behaviour in the diff that wasn't asked for (scope creep); (c) requirements that look implemented but wrong. Quote the spec line for each finding. Under 400 words."

If the spec is missing, skip the Spec sub-agent and note it in the final report.

## 5. Aggregate

Present the reports under their headings, verbatim or lightly cleaned. Do **not** merge or rerank findings — the axes/lenses are deliberately separate. End with a one-line summary: total findings per axis/lens, and the worst issue within each.

## Why two axes

A change can pass one axis and fail the other: code that follows every standard but implements the wrong thing (Standards pass, Spec fail), or code that does exactly what was asked but breaks conventions (Spec pass, Standards fail). Reporting them separately stops one from masking the other.
