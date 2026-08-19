# Issue tracker: Beads

Issues and PRDs for this repo are tracked in beads (`bd`). The commands below are contributor-side or host-dependent CLI workflow; the current TGO plugin validates lifecycle metadata only and does not perform these Beads writes. Bernstein-owned create/claim/close lifecycle integration remains follow-up work.

## Workflow

All contributor-side beads operations are `bd` CLI commands run via the `bash` tool. There is no `bd` tool and no beads MCP server; the opencode-beads plugin's own context explicitly says to call `bd` through bash. This does not make live Beads lifecycle available to the current TGO plugin host.

- `bd prime` — **host-dependent contributor CLI** for workflow context and command guidance; it is not run by the current TGO plugin.
- `bd ready` — **contributor-side CLI** to find available work (no blockers, not claimed).
- `bd show <id>` — **contributor-side CLI** to view issue details.
- `bd update <id> --claim` — **contributor-side CLI** to claim work (sets assignee + `in_progress`; idempotent).
- `bd close <id>` — **contributor-side CLI** to close a completed issue.
- `bd create "title" -t task|bug|feature -p 0-4` — **contributor-side CLI** to create an issue.
- `bd remember "insight"` — persistent project memory, injected via `bd prime`; list with `bd memories`, remove with `bd forget <key>`. Do not create `MEMORY.md` files.
- Do not use markdown TODO lists for task tracking.

## When a skill says "publish to the issue tracker"

Run `bd create "title" -t <type> -p <priority>` via bash as a contributor-side operation; the current plugin does not create the issue.

## When a skill says "fetch the relevant ticket"

Run `bd show <id>` via bash as a contributor-side operation; the current plugin does not perform the lookup.

## Wayfinding operations

Used by `/wayfinder`. Beads-specific maps/blocking aren't assumed here — follow `bd prime` guidance for creating and resolving linked tickets.
