# TGO v2 Beta Release Readiness

## Public beta install

Install the current public beta explicitly with the `beta` dist-tag:

```bash
npm install trans-genderian-orchestra@beta
```

Install the beta into a disposable OpenCode profile or an explicitly approved real profile with:

```bash
opencode plugin trans-genderian-orchestra@beta --global --force
```

The `beta` dist-tag currently points to `2.0.0-beta.5`. npm still points `latest` at the original `2.0.0-beta.0` because it was the first published version. Prefer `@beta` in public examples, automation, and validation until a future non-prerelease publish moves `latest`.

The published beta plugin has been verified in a real OpenCode command path: `/tgo:doctor --json` executes `npx --yes trans-genderian-orchestra@beta doctor --json`, avoids `bd doctor`, and returns TGO doctor JSON without stderr.

## Local verification gate

Run these from repository root:

```bash
bun test --path-ignore-patterns archive
bun run typecheck
bun run check:ci
bun run build
```

Expected: all commands exit 0. `bun test --path-ignore-patterns archive` should report 0 failures.

## Package preview gate

Run from repository root:

```bash
npm pack --dry-run --json
```

Expected: output includes `dist`, `README.md`, `MIGRATION.md`, `RELEASE.md`, and `package.json` in the tarball file list.

## Disposable OpenCode validation gate

Install or link the built package into a disposable OpenCode profile only. Do not mutate the real user profile for beta validation unless that profile has been explicitly approved for dogfooding.

Automated public beta smoke:

```bash
bun run verify:public-beta-opencode
```

Expected: installs `trans-genderian-orchestra@beta` into a disposable `HOME`, runs `/tgo:doctor --json` through OpenCode, confirms the actual command uses `npx --yes trans-genderian-orchestra@beta doctor --json`, confirms `bd doctor` is not run, confirms TGO doctor JSON is returned, and confirms the disposable config is unchanged.

Manual prompt inside the disposable profile:

```text
/tgo:doctor --json
```

Expected: with old omo-slim entries present, doctor reports v1 migration availability and planned v2 replacement without writing config.

## Approval gates

No git push, npm publish, latest tag, remote repository rewrite, or archived v1 deletion happens without explicit approval.
