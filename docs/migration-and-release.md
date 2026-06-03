# Migration And Release

## V1 And omo-slim Detection

Doctor detects existing v1/omo-slim configuration and reports replacement guidance without mutating it.

## Replacement Rule

TGO v2 replaces v1 rather than running side by side. The migration path should preserve user-owned config and use backups before writes.

## Rollback And Uninstall

Rollback relies on manifest-linked backups. Uninstall removes only TGO-managed entries and does not uninstall shared CLIs.

## Root Cutover

The active package lives at the repository root. Archived v1 material is retained as reference material, not active install guidance.

## npm Beta State

- `2.0.0-beta.5` is the current public beta package.
- `trans-genderian-orchestra@beta` is the recommended selector.
- npm `latest` still points to `2.0.0-beta.0` until a non-prerelease version is published.

## Release Gates

Release-readiness validation should include tests, typecheck, lint/check, build/pack verification, migration docs, and explicit approval before publish or tag movement.

## Public Beta Smoke

The reusable public beta smoke command is:

```bash
bun run verify:public-beta-opencode
```

It verifies the published beta through OpenCode in a disposable environment and should be run only when external access is acceptable.

## Remaining Manual Gate

Before applying setup to a real profile, restart a real OpenCode session and run:

```text
/tgo:doctor --json
```

## Spec Coverage

- Spec 00: root package architecture and replacement goals.
- Spec 07: implementation phases, validation gates, root cutover, beta release, and manual OpenCode gate.
