# TGO v2 Beta Release Readiness

## Local verification gate

Run these from `trans-genderian-orchestra-v2/`:

```bash
bun test
bun run typecheck
bun run check:ci
bun run build
```

Expected: all commands exit 0. `bun test` should report 0 failures.

## Package preview gate

Run from `trans-genderian-orchestra-v2/`:

```bash
npm pack --dry-run --json
```

Expected: output includes `dist`, `README.md`, `MIGRATION.md`, `RELEASE.md`, and `package.json` in the tarball file list.

## Disposable OpenCode validation gate

Install or link the built package into a disposable OpenCode profile only. Do not mutate the real user profile for beta validation.

Manual prompt inside the disposable profile:

```text
/tgo:doctor --json
```

Expected: with old omo-slim entries present, doctor reports v1 migration availability and planned v2 replacement without writing config.

## Approval gates

No git push, npm publish, latest tag, remote repository rewrite, or archived v1 deletion happens without explicit approval.
