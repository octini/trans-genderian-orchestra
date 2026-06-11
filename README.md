# trans-genderian-orchestra

> TGO is an OpenCode workflow plugin that turns one ad-hoc AI coding assistant into an orchestrated engineering team.

`trans-genderian-orchestra` lives at the repository root. The repository package currently reports version `3.0.0-beta.1`; verify the npm `beta` dist-tag before assuming a published package matches this checkout.

## What TGO Does

TGO adds a structured agent roster, setup CLI, model presets, review gates, and workflow helpers to OpenCode. Instead of asking one assistant to plan, research, write, review, and summarize everything, TGO routes work through specialized agents with clear responsibilities:

| Role | What it does | Write access |
|---|---|---|
| Conductor | User-facing technical lead: clarifies intent, plans, delegates, coordinates, and reports outcomes. | No |
| Scribe | Research specialist: explores code, reads docs, compares sources, and reports evidence. | No |
| Composer | Implementation specialist: edits files, writes tests, builds UI, fixes bugs, and validates changes. | Yes |
| Principal | Strategic advisor and final verification gate for architecture, risk, and acceptance criteria. | No |
| Ensemble | Multi-model consensus and review panel for hard decisions or Composer review. | No |
| Councillor | Hidden internal Ensemble seat with one review perspective. | No |

The goal is practical: preserve user intent, retrieve facts before reasoning, keep implementation scoped, and avoid claiming work is complete until review and validation have happened.

## Who It Is For

TGO is useful if you want OpenCode to behave more like a small engineering team than a single chatbot. It is especially helpful for:

- multi-file features or bug fixes that need research before editing;
- risky changes where independent review matters;
- users who want explicit setup, configuration, and model choices;
- projects that benefit from spec-like states, handoffs, and verification gates;
- long-running OpenCode sessions where context and delegation discipline matter.

For quick one-off edits, TGO still works, but its real value appears when tasks need planning, implementation, review, and final verification.

## Quick Start

Prerequisites: OpenCode, Bun, and at least one OpenCode provider you can authenticate.

Install or update TGO through the bundled CLI:

```bash
bunx trans-genderian-orchestra install
```

Useful installer variants:

```bash
bunx trans-genderian-orchestra install --dry-run
bunx trans-genderian-orchestra install --preset=opencode-go
bunx trans-genderian-orchestra install --no-tui --skills=yes
```

Check the generated TGO config with the read-only doctor:

```bash
bunx trans-genderian-orchestra doctor
bunx trans-genderian-orchestra doctor --json
```

After installation, authenticate and refresh OpenCode models as needed:

```bash
opencode auth login
opencode models --refresh
```

Restart OpenCode after installing or changing plugin, agent, prompt, model, skill, MCP, or shell environment settings.

## What The Installer Changes

The installer is intentionally conservative. In current source it:

1. checks for OpenCode;
2. adds the TGO plugin entry to OpenCode config;
3. adds the optional TUI version badge config;
4. warms OpenCode's plugin cache when running from a package-manager install;
5. disables OpenCode's default `build`, `explore`, `general`, and `plan` agents;
6. enables OpenCode LSP integration when not already set;
7. optionally configures `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true`;
8. writes `~/.config/opencode/trans-genderian-orchestra.json` by default, or an existing `.jsonc` file if one is already present;
9. installs bundled skills unless `--skills=no` is used.

Existing OpenCode configuration is merged rather than replaced wholesale. File writes create adjacent `.bak` backups for files that already existed.

## A Typical Task Walkthrough

You can speak normally to the Conductor:

```text
Add a provider configuration guide and make sure the model preset docs match the source.
```

A healthy TGO flow looks like this:

1. **Conductor** clarifies scope and acceptance criteria.
2. **Scribe** reads source, docs, and external references if needed.
3. **Composer** makes the scoped file changes and runs relevant validation.
4. **Ensemble** reviews non-trivial implementation work with multiple perspectives.
5. **Composer** reworks any actionable findings.
6. **Principal** performs the final verification gate.
7. **Conductor** reports what changed, what passed, and what caveats remain.

Markdown-only docs changes may skip Ensemble and go directly to Principal review, depending on the review gate classification.

## Verified Slash Commands

The current plugin source registers these OpenCode slash commands when the plugin is loaded:

| Command | Purpose |
|---|---|
| `/preset` | List configured presets. |
| `/preset <name>` | Save a runtime preset selection; restart or reload OpenCode to apply agent config safely. |
| `/interview <idea>` | Start a localhost interview UI and live markdown spec for clarifying a product idea. |
| `/deepwork <task>` | Start the bundled deepwork workflow for complex multi-phase coding tasks. |

The setup and diagnostic commands are CLI commands, not `/tgo:*` slash commands:

```bash
bunx trans-genderian-orchestra install
bunx trans-genderian-orchestra doctor --json
```

## Documentation Map

Start with the docs hub, or jump directly to a topic:

- [Documentation hub](./docs/README.md)
- [Installation and CLI](./docs/installation-and-cli.md)
- [Configuration reference](./docs/configuration-reference.md)
- [Provider configurations](./docs/provider-configurations.md)
- [Agents and workflows](./docs/agents-and-workflows.md)
- [Model presets and Ensemble](./docs/model-presets-and-ensemble.md)
- [Architecture](./docs/architecture.md)
- [Skills and integrations](./docs/skills-and-integrations.md)
- [Migration guide](./MIGRATION.md)
- [Release checklist](./RELEASE.md)

## Beta And npm Caveat

This repository is ahead of, or may differ from, what is published on npm. Before recommending or testing a published beta, verify the dist-tag:

```bash
npm view trans-genderian-orchestra@beta version --json
```

Use repository-local commands for validation when the npm beta does not match the checkout you are testing.

## Validation For Contributors

Common checks from the repository root:

```bash
bun run verify:release-readiness
bun run typecheck
bun test src/index.test.ts src/cli/providers.test.ts src/cli/config-io.test.ts
git diff --check
```

The full `bun test` suite may be useful before release, but the dashboard tests can hit a known `EADDRINUSE` issue in some local environments.
