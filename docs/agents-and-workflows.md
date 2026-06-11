# Agents And Workflows

TGO coordinates OpenCode through a six-role roster. Each role has a narrow job, permission posture, and place in the review loop.

## Role Roster

| Role | What it does | Typical trigger | Write access |
|---|---|---|---|
| Conductor | User-facing technical lead, planner, router, and result synthesizer. | Every normal user request. | No |
| Scribe | Evidence-first research: codebase exploration, docs lookup, source comparison, uncertainty reports. | “Find out…”, “where is…”, “how does this work?”, pre-implementation discovery. | No |
| Composer | Implementation: code changes, docs edits, UI/UX work, tests, validation. | Approved scoped implementation or rework. | Yes |
| Principal | Strategic advice and final review gate. | Architecture/risk questions, debugging strategy, final verification. | No |
| Ensemble | Multi-model consensus engine and review panel. | Hard decisions, explicit multi-perspective requests, Composer review. | No |
| Councillor | Hidden internal Ensemble participant with one review perspective. | Spawned by Ensemble through the `council_session` tool. | No |

## Permissions And Boundaries

- Conductor coordinates; it should not silently research or implement.
- Scribe reads and reports evidence; it does not edit files.
- Composer edits files inside the approved scope and runs relevant validation.
- Principal verifies against user intent, acceptance criteria, risk, and tests; it is read-only by default.
- Ensemble synthesizes multiple read-only councillor perspectives.
- Councillors are hidden subagents with read-only tools and no question permission.

TGO also preserves user-owned OpenCode config, providers, plugins, MCPs, skills, and local tools unless the user explicitly asks TGO to adopt or change them.

## Conductor Delegation

The Conductor's job is to keep the workflow coherent:

1. understand the user request;
2. ask clarifying questions only when needed;
3. decide whether research, implementation, review, or final verification is needed;
4. delegate to the right specialist;
5. integrate specialist results without losing user intent;
6. report concise outcomes and caveats.

Common routing:

| Need | Route |
|---|---|
| Codebase or docs discovery | Scribe |
| Implementation, docs writing, UI work, tests | Composer |
| Architecture trade-offs or final gate | Principal |
| Multiple independent perspectives or review panel | Ensemble |

## Review Loop

For behavior-changing or non-trivial work, the intended loop is:

```text
Composer implementation → Ensemble review → Composer rework if needed → Principal final gate
```

Details:

1. Composer returns a structured summary, changed files, validation evidence, and a stable `taskId`.
2. Ensemble reviews the Composer output, original task, and changed files.
3. If Ensemble rejects, Conductor sends specific findings back to Composer for rework.
4. If Ensemble approves, Principal performs final verification.
5. If Principal fails the work, Composer reworks and the loop repeats as needed.
6. After three Composer↔Ensemble cycles, Conductor escalates to Principal with a “wheels spinning” signal.

Markdown-only docs changes are currently classified for Principal review without requiring Ensemble, unless risk or source changes make the task non-trivial.

## Ensemble And Councillors

Ensemble has two modes:

- **General consensus** for hard questions that need multiple perspectives.
- **Review panel** for structured review of Composer work.

Generated councillor seats use these focus areas:

| Seat | Focus |
|---|---|
| `first` | Correctness and architecture. |
| `second` | Edge cases and security. |
| `third` | UX and performance. |

Ensemble uses majority consensus with critical-issue override. Any critical issue should reject the work even if most seats otherwise approve.

## Example Task Lifecycle

User request:

```text
Add a new provider guide and make sure the default model preset docs match source.
```

Expected TGO flow:

1. Conductor identifies this as docs work with source accuracy requirements.
2. Scribe reads `src/cli/providers.ts`, config schema, and existing docs.
3. Composer rewrites the provider guide and updates links.
4. Composer runs targeted docs/source sanity checks and requested tests.
5. Because this is markdown-only docs work, Principal can perform the final read-only verification gate.
6. Conductor reports files changed, validation results, and caveats.

Riskier implementation work would add Ensemble review before Principal.

## Background Specialist Tasks

TGO includes hooks that help Conductor manage background specialist tasks:

- track task IDs and aliases by agent;
- capture read context for reusable sessions;
- inject a background job board into Conductor context;
- warn when terminal tasks still need reconciliation;
- expose `cancel_task` to Conductor for obsolete or conflicting background work.

Cancellation is not rollback. If a writing task is cancelled, inspect and reconcile any partial file changes before continuing.

## Verified Slash Commands

Current source registers:

| Command | Behavior |
|---|---|
| `/preset` | Lists configured presets and active marker. |
| `/preset <name>` | Saves the requested preset and asks for restart/reload before agent config is applied safely. |
| `/interview <idea>` | Starts or resumes an interview UI and live markdown spec for clarifying product requirements. |
| `/deepwork <task>` | Activates the bundled deepwork workflow for complex, phased coding sessions. |

Setup and diagnostics are CLI commands, not slash commands:

```bash
bunx trans-genderian-orchestra install
bunx trans-genderian-orchestra doctor --json
```

Do not document or rely on `/tgo:*` commands unless future source adds them.
