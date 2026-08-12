# Issue tracker: Beads

Issues and PRDs for this repo are tracked in beads (`bd`), the opencode issue-tracking plugin.

## Workflow

All beads operations are `bd` CLI commands run via the `bash` tool. There is no `bd` tool and no beads MCP server; the opencode-beads plugin's own context explicitly says to call `bd` through bash.

- `bd prime` — workflow context and command guidance (auto-run by the plugin on session start and after compaction; also safe to run manually).
- `bd ready` — find available work (no blockers, not claimed).
- `bd show <id>` — view issue details.
- `bd update <id> --claim` — claim work (sets assignee + `in_progress`; idempotent).
- `bd close <id>` — close a completed issue.
- `bd create "title" -t task|bug|feature -p 0-4` — create an issue.
- `bd remember "insight"` — persistent project memory, injected via `bd prime`; list with `bd memories`, remove with `bd forget <key>`. Do not create `MEMORY.md` files.
- Do not use markdown TODO lists for task tracking.

## When a skill says "publish to the issue tracker"

Run `bd create "title" -t <type> -p <priority>` via bash.

## When a skill says "fetch the relevant ticket"

Run `bd show <id>` via bash.

## Wayfinding operations

Used by `/wayfinder`. Beads-specific maps/blocking aren't assumed here — follow `bd prime` guidance for creating and resolving linked tickets.
