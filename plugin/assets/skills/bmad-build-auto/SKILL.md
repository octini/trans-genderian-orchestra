---
name: bmad-build-auto
description: Drive unattended implementation work in a machine-readable way — write status, findings, and blockers where an orchestrator can read them without parsing chat. Use when running a long implementation stretch autonomously.
---

# bmad-build-auto

One iteration of the same model, running longer with less supervision against an approved spec — writing **machine-readable terminal status** so an external orchestrator (Bernstein) can drive it without parsing chat.

## Contract

Keep the spec/ticket frontmatter status in one of:

- `draft` — intent not yet compressed into a goal
- `ready-for-dev` — approved, implementable
- `in-progress` — claimed and being worked
- `in-review` — implementation done, review pending
- `done` — verified against the exit gate
- `blocked` — cannot proceed; blocking conditions listed

Alongside the status, write:

- `deferred[]` — findings/issues that are real but not blocking; they queue, they don't stop
- `blocked` — the explicit conditions that gate continuation

## Rules

- **Status is machine-readable**: an orchestrator parses it, it never requires reading prose to route.
- **Route by blast radius first**: tiny/mechanical → one-shot; anything non-trivial → plan-code-review against the approved spec.
- **Human checkpoints only where they add value**: intent compression, spec approval, final review. Everything else runs unattended.
- **On failure, diagnose at the layer it entered**: intent (was the goal wrong?) vs spec (was the contract wrong?) vs local code (was the implementation wrong?) — and report which.
- **Backlog policy belongs to the orchestrator**, never to this skill.

Fires when Bernstein delegates a long implementation stretch and wants terminal status rather than a narrative.
