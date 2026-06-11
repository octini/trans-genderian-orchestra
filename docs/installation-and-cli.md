# Installation And CLI

This page covers the real setup and diagnostic commands implemented by the current TGO source.

## Prerequisites

| Requirement | Why it matters |
|---|---|
| OpenCode | TGO is an OpenCode plugin and injects agents, tools, MCPs, hooks, and slash commands into OpenCode at startup. |
| Bun | The published CLI examples use `bunx`, and repository validation uses Bun scripts. |
| Provider access | The generated presets use GitHub Copilot and OpenCode Go model IDs. Authenticate the providers you want to use. |
| Optional shell startup file | Needed only if you let the installer persist `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true`. |

Install OpenCode before running the TGO installer. The installer itself prints OpenCode installation guidance if it cannot find `opencode` on `PATH`.

## Install Or Update

Use the package CLI:

```bash
bunx trans-genderian-orchestra install
```

The `install` subcommand is optional when no subcommand is provided, but spelling it out is clearer in docs and scripts.

### Installer Options

Verified from `src/cli/index.ts`:

| Option | Meaning |
|---|---|
| `--skills=yes\|no` | Install bundled skills. Default: `yes`. |
| `--preset=<name>` | Select active generated preset. Supported generated presets: `github-copilot`, `opencode-go`. Default: `github-copilot`. |
| `--background-subagents=ask\|yes\|no` | Persist required OpenCode background subagent environment setting. Default: `ask` in an interactive TTY, otherwise `no`. |
| `--background-subagents-target=<path>` | Shell startup file to update when enabling background subagents. |
| `--no-tui` | Non-interactive mode. Also skips the GitHub star prompt. |
| `--dry-run` | Simulate install without writing files. |
| `--reset` | Force overwrite of an existing TGO plugin config file. |
| `-h`, `--help` | Print help. |

Examples:

```bash
bunx trans-genderian-orchestra install --dry-run
bunx trans-genderian-orchestra install --preset=opencode-go
bunx trans-genderian-orchestra install --no-tui --skills=yes
bunx trans-genderian-orchestra install --background-subagents=yes
bunx trans-genderian-orchestra install --reset
```

## What The Installer Does

The installer runs a deterministic lifecycle:

1. Check that OpenCode is installed.
2. Add the TGO plugin entry to `opencode.json` or `opencode.jsonc`.
3. Add the TGO TUI badge plugin entry to `tui.json` or `tui.jsonc` when possible.
4. Warm the OpenCode plugin cache when the CLI is running from a package-manager install.
5. Disable OpenCode default agents: `build`, `explore`, `general`, `plan`.
6. Enable OpenCode LSP integration if `lsp` is not already set.
7. Configure background subagent shell environment if requested.
8. Write the TGO plugin config.
9. Copy bundled skills unless disabled.

The installer preserves unrelated user-owned config. It does not remove user providers, plugins, MCPs, skills, or custom agents.

## Dry Runs

Use dry runs before touching a real profile:

```bash
bunx trans-genderian-orchestra install --dry-run --preset=github-copilot
```

Dry run mode skips OpenCode checks, plugin writes, TUI writes, cache warm-up, default-agent disabling, LSP changes, TGO config writes, and skill installation. It prints the config and shell block that would be written.

## Config Files Written Or Read

The CLI resolves OpenCode paths from `OPENCODE_CONFIG_DIR` when set, otherwise from `XDG_CONFIG_HOME/opencode`, otherwise `~/.config/opencode`.

| File | Role |
|---|---|
| `~/.config/opencode/opencode.json` or `.jsonc` | OpenCode core config. TGO adds the plugin entry, disables default agents, and enables LSP if unset. |
| `~/.config/opencode/tui.json` or `.jsonc` | Optional TUI config. TGO adds its version badge entry when possible. |
| `~/.config/opencode/trans-genderian-orchestra.json` | Default TGO plugin config path written by fresh installs. |
| `~/.config/opencode/trans-genderian-orchestra.jsonc` | Preferred by the loader if it already exists; the installer writes here only when it is the existing config path. |
| `<project>/.opencode/trans-genderian-orchestra.json` or `.jsonc` | Optional project-local TGO overrides read by the plugin and doctor. |

## Backups And Rollback

Before overwriting an existing config file, current source creates an adjacent `.bak` file such as:

```text
~/.config/opencode/opencode.json.bak
~/.config/opencode/trans-genderian-orchestra.json.bak
```

There is no implemented `rollback` or `uninstall` CLI command in the current source. To undo an install manually, restore from the relevant `.bak` file and remove the TGO plugin/config entries you no longer want. Prefer doing this in a copied or disposable OpenCode config directory first.

## Doctor

Doctor is read-only:

```bash
bunx trans-genderian-orchestra doctor
bunx trans-genderian-orchestra doctor --json
```

Verified doctor options:

| Option | Meaning |
|---|---|
| `--json` | Print diagnostics as JSON. |
| `-h`, `--help` | Print help. |

Doctor currently checks user and project TGO config files for valid JSON/JSONC, schema validity, and active preset existence. It exits `0` when checks pass and `1` when checks fail or an unknown option is supplied.

## After Installing

Authenticate and refresh models:

```bash
opencode auth login
opencode models --refresh
```

Then restart OpenCode. Restarting is recommended after any plugin install, provider auth change, shell environment update, prompt override, skill install, MCP change, model preset edit, or TGO config edit.

## Beta Package Caveat

The repository package version and the npm `beta` dist-tag can differ. Before documenting or testing the published beta, check:

```bash
npm view trans-genderian-orchestra@beta version --json
```

If npm does not match this repository, use local repository validation commands instead of making public claims about the published beta.
