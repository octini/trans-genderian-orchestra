---
name: tgo-setup
description: TGO per-repo setup. Runs when needed automatically; use this skill to run or verify setup manually. Non-load-bearing — the plugin triggers it itself at first session; this skill only documents/initiates the same steps.
license: MIT
compatibility: opencode
metadata:
  tgo: setup
---

## What I do

Ensure a repo is wired for TGO's per-repo setup (defaults, zero user input):

1. Beads tracker initialized (`.beads/` + Dolt DB), auto-installed if the `bd` CLI is missing.
2. TGO's thin AGENTS.md advice fragment merged (no-clobber).
3. The official `bd setup opencode` managed Beads block installed.

## When to use me

- First session in a repo — the plugin auto-triggers this; you normally never invoke it.
- Manual verification: `bd doctor` for tracker health, `bd ready` to confirm wiring.
- Re-run after a failed setup: run `bd init` and `bd setup opencode` by hand.

## Rules

- **Never clobber** existing AGENTS.md/user content — merge minimally.
- **Idempotent + per-repo marker** — never re-runs; respects a completed setup.
- Defaults: tracker → beads, labels → default triage labels, monorepo → auto-detect.
