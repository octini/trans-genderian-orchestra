# trans-genderian-orchestra v2

TGO v2 is the blank-slate implementation of the OpenCode engineering workflow plugin. The current beta package version is `2.0.0-beta.2`.

This package is in beta implementation and now lives at the repository root after the approved release cutover. Phase 7 release hardening adds deterministic v1/omo-slim migration detection, manifest-linked rollback helpers, safe uninstall, doctor warnings, stable-release gates, and migration documentation.

## Install

Install the current public beta explicitly with the `beta` dist-tag:

```bash
npm install trans-genderian-orchestra@beta
```

Install the beta into OpenCode with:

```bash
opencode plugin trans-genderian-orchestra@beta --global --force
```

The `beta` dist-tag currently points to `2.0.0-beta.2`. npm still points `latest` at the original `2.0.0-beta.0` because it was the first published version. Prefer `@beta` in examples and automation until a stable release moves `latest` to a non-prerelease version.

The published beta plugin has been dogfooded through OpenCode with `/tgo:doctor --json`; the command resolves the CLI through `npx --yes trans-genderian-orchestra@beta doctor --json` and does not run Beads diagnostics.

## Bootstrap

Preview or apply the default setup with explicit preset dimensions:

```bash
trans-genderian-orchestra bootstrap --tools default --models balanced --resilience balanced
```

The bootstrap, doctor, and uninstall paths are deterministic and approval-aware. They write only through manifest-backed operations, create backups before applying config changes, and preserve user-owned providers, plugins, agents, MCPs, and custom config.

## Migration And Uninstall

Doctor reports V1/omo-slim config without mutating it. Migration preview plans v2 replacement rather than side-by-side install. Uninstall removes only TGO-managed entries recorded in the manifest and does not uninstall shared CLIs such as `bd`, `ctx7`, `gh`, or `uvx`.

See `MIGRATION.md` for rollback boundaries and release cutover constraints.
