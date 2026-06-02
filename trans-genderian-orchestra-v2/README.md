# trans-genderian-orchestra v2

TGO v2 is the blank-slate implementation of the OpenCode engineering workflow plugin. The current package version is `2.0.0-beta.0`.

This package is in beta implementation and is developed in this subfolder until explicit release cutover moves the package to the repository root. Phase 7 release hardening adds deterministic v1/omo-slim migration detection, manifest-linked rollback helpers, safe uninstall, doctor warnings, stable-release gates, and migration documentation.

## Bootstrap

Preview or apply the default setup with explicit preset dimensions:

```bash
trans-genderian-orchestra bootstrap --tools default --models balanced --resilience balanced
```

The bootstrap, doctor, and uninstall paths are deterministic and approval-aware. They write only through manifest-backed operations, create backups before applying config changes, and preserve user-owned providers, plugins, agents, MCPs, and custom config.

## Migration And Uninstall

Doctor reports V1/omo-slim config without mutating it. Migration preview plans v2 replacement rather than side-by-side install. Uninstall removes only TGO-managed entries recorded in the manifest and does not uninstall shared CLIs such as `bd`, `ctx7`, `gh`, or `uvx`.

See `MIGRATION.md` for rollback boundaries and release cutover constraints.
