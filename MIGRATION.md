# Migrating From TGO v2 / v1 / omo-slim To TGO v3

## Prior-version / omo-slim detection

TGO v3 doctor and migration preview detect old TGO, `oh-my-opencode-slim`, `omo-slim`, non-namespaced legacy agents, and non-namespaced legacy MCP entries.

## Replacement rule

After explicit approval, v3 replaces prior TGO/omo-slim managed entries rather than running side-by-side. The migration preview removes active legacy entries and adds TGO v3-managed entries while preserving user-owned providers, plugins, MCPs, agents, and custom config.

## Rollback

Rollback restores the previous OpenCode config from a manifest-linked backup. TGO does not guess backup paths.

## Uninstall

Uninstall removes only TGO-managed entries recorded in the manifest. It does not uninstall shared CLIs such as `bd`, `ctx7`, `gh`, or `uvx`.

## Release boundary

No automatic push, PR, npm publish, dist-tag movement, remote repository rewrite, or worktree cleanup happens without explicit approval.
