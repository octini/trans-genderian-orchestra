# Setup, Doctor, And Manifests

## Command Surface

- `/tgo:doctor`: inspect TGO setup state and report repairs.
- `/tgo:setup`: preview setup or preset changes.
- `/tgo:init`: initialize project-local Beads, guidance, validation, and artifact scaffolding.
- `/tgo:uninstall`: preview and remove TGO-managed setup entries safely.
- `/tgo:work`: start or continue approved TGO-managed implementation work.
- `/tgo:models`: inspect or switch model presets.

## Doctor Is Read-Only

Doctor reports setup state, v1/omo-slim detection, warnings, and repair suggestions without mutating config.

## Install And Setup

Preview setup with the implemented installer:

```bash
trans-genderian-orchestra install --dry-run --preset=github-copilot
```

Setup should preview planned changes, preserve user-managed config, and keep generated preset choices explicit.

## Config Ownership

OpenCode has no schema-level `include`, `extends`, or `import` field for peer config files, so TGO keeps the load-bearing OpenCode config small instead of assuming OpenCode can load a sibling file automatically.

- `~/.config/opencode/opencode.jsonc`: minimal required OpenCode entries such as plugin registration, `default_agent`, and TGO-managed MCPs.
- `~/.config/opencode/trans-genderian-orchestra.jsonc`: TGO-owned catalog containing generated TGO agents and built-in `modelPresets`.
- `~/.config/opencode/tgo/manifest.jsonc`: TGO-owned manifest that records active presets, managed config keys, backups, ignored warnings, and verification metadata.

Runtime agent and command availability still comes from the plugin config hook. The peer catalog is owned by TGO commands and setup/doctor checks; it is not an OpenCode schema include.

## Command Result Contract

Deterministic commands should report planned actions, warnings, changed paths, backup paths, manifest updates, and next steps in a machine-readable result shape where available.

## Manifests

TGO-managed entries are tracked in manifests so later repair, rollback, and uninstall operations can distinguish plugin-owned changes from user-owned config.

## Backups And Rollback

Config writes should create timestamped backups before mutation. Rollback helpers should reference manifest-linked backups rather than guessing at global state.

## Config Merge And Ownership

TGO should deep-merge config, preserve existing user providers/plugins/agents/MCPs, and avoid overwriting user-owned settings unless explicitly requested. Bootstrap writes generated TGO agents to the TGO catalog file rather than expanding `opencode.jsonc` with every role definition.

## Secret-Like Values

Raw API keys, PATs, tokens, and passwords should not be stored in manifests, generated config, Beads notes, artifacts, or doctor output. Secret-like values should be warned about, redacted, or rejected on TGO-managed surfaces.

## CLI Detection

Doctor/setup flows may detect required CLIs such as `bd`, `ctx7`, `gh`, or `uvx`, but uninstall must not remove shared CLIs.

## Safe Uninstall

Uninstall removes only TGO-managed entries recorded in the manifest and should create or reference a backup for rollback.

## Spec Coverage

- Spec 01: deterministic setup foundation, manifests, backups, doctor, config merge, and secret safety.
- Spec 07: validation gates and safe beta migration/release hardening.
