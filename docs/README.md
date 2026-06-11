# TGO Documentation

Welcome to the trans-genderian-orchestra documentation. These pages explain what TGO adds to OpenCode, how to install it, how to configure providers and models, and how to use the agent workflow safely.

Current repository package version: `3.0.0-beta.1`. Verify the npm `beta` dist-tag before assuming a published package matches this repository.

## Start Here

| Page | Use it for |
|---|---|
| [Front README](../README.md) | High-level overview, quick start, role roster, and docs map. |
| [Installation and CLI](./installation-and-cli.md) | Prerequisites, installer lifecycle, doctor, dry runs, backups, and restart expectations. |
| [Agents and workflows](./agents-and-workflows.md) | What Conductor, Scribe, Composer, Principal, Ensemble, and Councillor do in practice. |
| [Configuration reference](./configuration-reference.md) | Config files, schema keys, prompt overrides, presets, and safe customization patterns. |

## Workflows

| Page | Use it for |
|---|---|
| [Provider configurations](./provider-configurations.md) | GitHub Copilot and OpenCode Go presets, mixed-provider examples, cost/performance guidance. |
| [Model presets and Ensemble](./model-presets-and-ensemble.md) | Exact generated model mappings, Ensemble seat behavior, consensus rules, and `/preset`. |
| [Skills and integrations](./skills-and-integrations.md) | Bundled skills, MCPs, tools, permissions, and what TGO intentionally does not bundle. |

## Configuration And Reference

| Page | Use it for |
|---|---|
| [Architecture](./architecture.md) | Runtime hooks, config ownership, retrieval-led reasoning, SDD-like workflow states, and review gates. |
| [Configuration reference](./configuration-reference.md) | All major config keys and examples for modifying them safely. |
| [Installation and CLI](./installation-and-cli.md) | Real CLI commands and options currently implemented in source. |

## Migration, Release, And Advanced Operations

| Page | Use it for |
|---|---|
| [Migration guide](../MIGRATION.md) | Existing TGO or omo-slim users moving to the current package. |
| [Release checklist](../RELEASE.md) | Maintainer release-readiness, packaging, beta smoke, and approval gates. |
| [Contributor guide](../AGENTS.md) | Public contributor and agent rules for this repository. |

## Real Command Surface

Current CLI commands:

```bash
bunx trans-genderian-orchestra install [OPTIONS]
bunx trans-genderian-orchestra doctor [OPTIONS]
```

Current plugin-registered slash commands verified from source:

```text
/preset [name]
/interview <idea>
/deepwork <task>
```

Do not rely on `/tgo:*` commands unless a future source version explicitly implements them.

## Contributor Validation Commands

```bash
bun run verify:release-readiness
bun run typecheck
bun test src/index.test.ts src/cli/providers.test.ts src/cli/config-io.test.ts
git diff --check
```

`bun run check:ci` is useful before release but may currently report pre-existing import-order issues. The full `bun test` suite may hit a known dashboard `EADDRINUSE` issue in some environments.
