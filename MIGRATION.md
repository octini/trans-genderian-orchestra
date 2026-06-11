# Migrating To TGO

This guide is for existing TGO or omo-slim users moving to the current `trans-genderian-orchestra` package.

## What Changed

- The active package lives at the repository root and currently reports `3.0.0-beta.1`.
- Public product naming is TGO or `trans-genderian-orchestra`; version numbers are used here only for operational migration context.
- The active role roster is Conductor, Scribe, Composer, Principal, Ensemble, and Councillor.
- Older role concepts map roughly as compatibility aliases: explorer/librarian → Scribe, designer/fixer → Composer, oracle/reviewer → Principal, council → Ensemble.
- Current real CLI commands are `install` and `doctor`.
- Current source does not implement a `rollback` or `uninstall` CLI command.

## Before You Migrate

1. Back up your OpenCode config directory, especially:

   ```text
   ~/.config/opencode/opencode.json
   ~/.config/opencode/opencode.jsonc
   ~/.config/opencode/trans-genderian-orchestra.json
   ~/.config/opencode/trans-genderian-orchestra.jsonc
   ```

2. If you use a custom config directory, confirm `OPENCODE_CONFIG_DIR` points where you expect.

3. Verify provider authentication separately in OpenCode:

   ```bash
   opencode auth login
   opencode models --refresh
   ```

4. If testing the published beta, verify the npm tag first:

   ```bash
   npm view trans-genderian-orchestra@beta version --json
   ```

## Preview First

Run a dry run before changing a real profile:

```bash
bunx trans-genderian-orchestra install --dry-run
```

To preview a non-default generated preset:

```bash
bunx trans-genderian-orchestra install --dry-run --preset=opencode-go
```

The dry run prints the generated TGO config and any background-subagent shell block that would be written.

## Apply The Install

```bash
bunx trans-genderian-orchestra install
```

The installer merges OpenCode config, writes TGO plugin config, and creates adjacent `.bak` files when overwriting existing files. If an existing TGO config is present, use `--reset` only when you intentionally want it overwritten:

```bash
bunx trans-genderian-orchestra install --reset
```

## Validate With Doctor

Doctor is read-only:

```bash
bunx trans-genderian-orchestra doctor
bunx trans-genderian-orchestra doctor --json
```

It checks user and project TGO config files for valid JSON/JSONC, schema validity, and active preset existence.

## After Migration

Restart OpenCode. Then confirm the current agent roster is available and that your chosen provider models are visible.

If you use runtime preset switching, current source registers:

```text
/preset
/preset opencode-go
```

The command saves the selected preset but asks for restart/reload before relying on the new agent configuration.

## Manual Rollback

There is no implemented rollback CLI command in current source. To undo manually:

1. Stop OpenCode.
2. Restore the relevant `.bak` files created by the installer, or restore your pre-migration backup.
3. Remove or adjust the TGO plugin entry in `opencode.json[c]` if needed.
4. Remove or archive `trans-genderian-orchestra.json[c]` if you no longer want the TGO plugin config.
5. Restart OpenCode.

Do this in a copied config directory first if you are unsure.

## Safety Boundaries

TGO migration should preserve user-owned providers, plugins, MCPs, skills, custom agents, and provider credentials. It does not uninstall shared CLIs such as `gh`, `uvx`, `bd`, or other local tools.

No git push, npm publish, dist-tag movement, remote repository rewrite, or destructive cleanup should happen without explicit approval.
