# Migration And Release

## Prior-version And omo-slim Detection

Doctor detects existing TGO v2, v1, and omo-slim configuration and reports replacement guidance without mutating it.

## Replacement Rule

TGO v3 replaces prior TGO/omo-slim managed entries rather than running side by side. The migration path should preserve user-owned config and use backups before writes.

## Rollback And Uninstall

Rollback relies on manifest-linked backups. Uninstall removes only TGO-managed entries and does not uninstall shared CLIs.

## Root Package State

The active package lives at the repository root. Internal planning artifacts and archived legacy source are not active public install guidance.

## npm Beta State

- `3.0.0-beta.1` is the current repository package version.
- `trans-genderian-orchestra@beta` is the recommended selector after npm `beta` is verified to match the intended repository version.
- Verify npm `beta` before public release claims; do not rely on `latest` until a stable release intentionally moves it.

## Release Gates

Release-readiness validation should include tests, typecheck, lint/check, build/pack verification, migration docs, and explicit approval before publish or tag movement.

## Public Beta Smoke

The reusable public beta smoke command is:

```bash
bun run scripts/verify-public-beta-opencode.ts
```

It verifies the published beta through OpenCode in a disposable environment and should be run only when external access is acceptable.

## Remaining Manual Gate

Before applying setup to a real profile, restart a real OpenCode session and run:

```text
/tgo:doctor --json
```

## Approval Boundary

No git push, npm publish, dist-tag movement, remote repository rewrite, or destructive cleanup happens without explicit approval.
