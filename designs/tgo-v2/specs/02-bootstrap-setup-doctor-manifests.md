---
artifact_type: design_spec
status: draft
spec_id: tgo-v2-02-bootstrap-setup-doctor-manifests
created_at: 2026-06-02
updated_at: 2026-06-02
source_checkpoint: designs/tgo-v2-settled-decisions.md
---

# Bootstrap, Setup, Doctor, Uninstall, And Manifests

## Command Split

TGO commands split into deterministic setup/config commands and agent-orchestrated workflow commands.

Deterministic commands:

- External `bootstrap` CLI.
- `/tgo:setup`.
- `/tgo:doctor`.
- `/tgo:uninstall`.
- `/tgo:init`.
- `/beads:init`.

These use shared TypeScript command logic, structured dry-run/apply results, backups, manifests, predictable validation, injectable adapters, and `--json` output.

Agent-orchestrated commands:

- `/tgo:work` and inferred work flows.
- `/new-stream` and `/close-stream`.
- Council escalation.
- Goal confirmation.
- Spec/plan creation.

Anything that writes config, installs tools, edits manifests, mutates scaffolding, prunes backups, or cleans worktrees must not depend on prose/model behavior.

## External Bootstrap

The npm package ships both the OpenCode plugin entrypoint and external bootstrap CLI. First install:

```bash
npx trans-genderian-orchestra@<version> bootstrap --tools default --models balanced --resilience balanced
```

Bootstrap can add the TGO plugin to global OpenCode config, install/register default peer tools, write the global manifest, back up config, and tell the user to restart OpenCode. A plugin command cannot install the plugin itself, so bootstrap handles chicken-and-egg setup.

Bootstrap defaults to dry-run preview with exact planned changes. Applying requires confirmation or `--yes`. It backs up before writing. It supports `--no-default-agent` and explicit preset flags.

## Default Agent

Bootstrap sets global `default_agent` to `tgo-orchestrator` by default.

If `default_agent` is unset, bootstrap sets it. If it is already set, dry-run previews replacement and asks before applying. Previous value is recorded in manifest/backup so rollback or uninstall can restore it. Users can opt out with `--no-default-agent`.

## Setup

`/tgo:setup` is not required for normal first use. It is for later changes:

- Switch tooling/model/resilience presets.
- Enable/disable tools.
- Rerun guided setup pieces.
- Upgrade pinned dependencies.
- Repair/reconcile manifest drift.
- Adopt existing user-managed dependencies into TGO management.

Setup uses preview, backup, manifest updates, and confirmation for all mutations.

## Project Init

`/tgo:init` performs project-local setup:

- `bd init` when needed.
- Lean `AGENTS.md` with critical rules and links.
- `CONTEXT.md` if missing.
- Beads-aware `docs/agents/*` defaults.
- `docs/agents/validation.md` validation profile.
- `.opencode/tgo/*` artifact directories.
- Project manifest and backup directory.

It previews and backs up before modifying existing project files. It does not require Matt Pocock `setup-matt-pocock-skills` to succeed. Instead, it deterministically creates Beads-aware defaults first; Matt setup can refine later.

`/beads:init` remains a narrow compatibility helper implemented with real `bd init` behavior.

`/init` aliases to `/tgo:init`. `/init:all` is deprecated and should print guidance to bootstrap plus `/tgo:init`.

## Doctor

`/tgo:doctor` is read-only by default. It checks global and project state and returns a structured report. Repairs require `--repair` or interactive confirmation.

Doctor detects:

- Missing or drifted manifest-owned config.
- Missing tools and degraded capabilities.
- Unsafe auth config or raw secret-like values in TGO-managed surfaces.
- V1/omo-slim overlap and migration opportunities.
- User-managed duplicates/conflicts.
- Stale backups.
- Stale implementation/integration worktrees.
- Missing Beads database.
- Broken artifact links/status drift.
- Active overrides and snoozed warnings.
- Interrupted waves.
- Failed/degraded workflows.

Missing external prerequisites such as `bd`, `ctx7`, `uvx`/Serena, or `gh` are reported with exact install/repair commands. Doctor does not silently install them.

## Uninstall And Rollback

`/tgo:uninstall` removes only TGO-managed entries:

- TGO-managed OpenCode config keys.
- TGO-managed plugin entries.
- TGO-managed MCP registrations.
- TGO-generated manifests.
- TGO-managed guidance/artifact scaffolding when explicitly selected.

It can restore from backup for the last install/apply operation when possible. It must not uninstall shared global CLIs like `bd`, `ctx7`, Serena tooling, or `gh` unless TGO installed them and the user explicitly confirms.

Rollback uses manifest-linked backups only. It does not guess which backups are safe.

## Command Result Contract

Every deterministic command supports human-readable output and `--json` with the same shape:

- `planned_actions`
- `changes_applied`
- `backups_created`
- `manifest_updates`
- `warnings`
- `blocked_capabilities`
- `degraded_capabilities`
- `restart_required`
- `next_steps`

On deterministic command errors, `planned_actions` and `changes_applied` must reflect reality. Schema/argument failures return structured errors and do not partially mutate state.

## Manifests

Manifest format is JSONC if practical. If JSONC parsing/writing proves awkward, fallback is strict JSON plus generated Markdown summaries, but JSONC remains preferred.

Locations:

- Global: `~/.config/opencode/tgo/manifest.jsonc`.
- Project: `.opencode/tgo/manifest.jsonc`.

Global manifest records:

- Active tooling/model/resilience presets.
- TGO package/version.
- Installed/registered peer plugins and MCPs.
- TGO-managed OpenCode config keys and array entries.
- CLI/tool status: `user-managed`, `tgo-installed`, `missing`, or `degraded`.
- Backups and operation IDs.
- Last verification results.
- Ignored warnings/snoozes.

Project manifest records:

- `bd init` status.
- Project-generated files.
- Validation profile status.
- Artifact directory paths.
- Project overrides.
- Worktree/integration state references.
- Project-local backups.
- Project-local ignored warnings/snoozes.

Manifest ownership is the source of truth. TGO should not rely on inline JSONC comments in OpenCode config.

## Backups

Global backups live under:

```text
~/.config/opencode/tgo/backups/
```

Project backups live under:

```text
.opencode/tgo/backups/
```

Each apply operation gets a timestamped backup folder. Manifest records which backup belongs to which operation. Latest 10 backups are retained by default. Pruning only happens through explicit repair action such as `/tgo:doctor --repair --prune-backups`.

## Config Merge And Ownership

TGO config changes are additive and TGO-managed only. Bootstrap/setup preserve unrelated user providers, agents, plugins, MCPs, permissions, and customizations.

TGO uses stable namespaced keys where possible, such as `agent.tgo-orchestrator` and `mcp.tgo-websearch`, and records exact `plugin` array entries in the manifest.

If a user independently adds the same package/config entry, TGO treats it as user-managed unless explicitly adopted. If a user-managed dependency differs from TGO's pinned version, TGO warns but does not block unless known incompatible.

## Secrets And Auth

TGO never writes raw secrets into manifests or generated config.

- Context7 uses `ctx7` OAuth/setup flow.
- GitHub MCP references env vars such as `{env:GITHUB_PERSONAL_ACCESS_TOKEN}`.
- Websearch MCP uses env vars such as `EXA_API_KEY` or `TAVILY_API_KEY`.

Manifests record auth mode/status, such as “configured via env” or “configured via OAuth,” not secret values. Doctor may report missing auth and repair instructions, but must not print or persist secret values. Secret-like output is redacted before artifacts, Beads, manifests, or doctor output.

## Existing Omo-Slim Migration

Bootstrap/doctor detect existing `oh-my-opencode-slim` config, plugins, bundled MCPs, skill paths, and overlapping entries. They never auto-remove omo-slim.

Install preview includes a migration section. After TGO equivalents are installed, TGO can recommend disabling/removing duplicate omo-slim entries. Any modification requires explicit approval and backup. If both plugins remain active, TGO warns about duplicate agents, commands, hooks, MCPs, and prompt/tool noise.

## External CLI Installation

Bootstrap is conservative and cross-platform:

- Detects existing `bd`, `ctx7`, `gh`, and Serena/`uvx` first.
- Prefers compatible user-managed installs.
- Recommends official/stable install paths for missing tools.
- Prefers Homebrew for `bd` on macOS when available.
- Uses `npx`/package-local execution where practical for one-shot setup like `ctx7 setup`.
- Uses `uvx`/documented Serena install path only for `all-bells`.
- Never silently installs system-level CLIs unless `--yes` or interactive confirmation is present.

## Testing Strategy

Deterministic command logic is tested without real installs using injectable adapters:

- Filesystem adapter for config/manifests/backups.
- Package/CLI adapter for detecting/installing `bd`, `ctx7`, AFT, `opencode-beads`, Serena, etc.
- OpenCode config adapter for JSONC parse/merge/write.
- Command runner adapter for dry-run versus apply.

Tests cover dry-run, apply, conflict detection, backup creation, manifest drift, rollback/uninstall, secret-safe behavior, and degraded capability reporting. Real external install smoke tests are optional/manual, not normal CI.
