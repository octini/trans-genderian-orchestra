# Migrating From v1 / omo-slim To TGO v2

## V1/omo-slim detection

TGO v2 doctor and migration preview detect old `oh-my-opencode-slim`, `omo-slim`, non-namespaced v1 agents, and non-namespaced v1 MCP entries.

## Replacement rule

After explicit approval, v2 replaces v1 rather than running side-by-side. The migration preview removes active v1-era entries and adds TGO v2-managed entries while preserving user-owned providers, plugins, MCPs, agents, and custom config.

## Rollback

Rollback restores the previous OpenCode config from a manifest-linked backup. TGO does not guess backup paths.

## Uninstall

Uninstall removes only TGO-managed entries recorded in the manifest. It does not uninstall shared CLIs such as `bd`, `ctx7`, `gh`, or `uvx`.

## Release boundary

No automatic push, PR, latest publish, root cutover, or worktree cleanup happens without explicit approval.
