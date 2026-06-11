# TGO v3 Beta Release Readiness

## Public beta install

After publishing or moving the `beta` dist-tag, verify it points at the intended repository package version:

```bash
npm view trans-genderian-orchestra@beta version --json
```

Install the verified beta into a disposable OpenCode profile or an explicitly approved real profile with:

```bash
opencode plugin trans-genderian-orchestra@beta --global --force
```

The repository package version is `3.0.0-beta.1`. Before making release claims, verify the npm `beta` dist-tag points at the intended package version. Prefer `@beta` in public beta examples and automation after that verification until a stable release intentionally moves `latest`.

The published beta smoke should verify that `/tgo:doctor --json` executes `npx --yes trans-genderian-orchestra@beta doctor --json`, avoids `bd doctor`, and returns TGO doctor JSON without stderr.

## Local verification gate

Run these from repository root:

```bash
bun test
bun run typecheck
bun run check:ci
bun run build
```

Expected: all commands exit 0. `bun test` should report 0 failures.

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
bun run scripts/verify-public-beta-opencode.ts
```

Expected: installs `trans-genderian-orchestra@beta` into a disposable `HOME`, runs `/tgo:doctor --json` through OpenCode, confirms the actual command uses `npx --yes trans-genderian-orchestra@beta doctor --json`, confirms `bd doctor` is not run, confirms TGO doctor JSON is returned, and confirms the disposable config is unchanged.

Manual prompt inside the disposable profile:

```text
/tgo:doctor --json
```

Expected: with old TGO/omo-slim entries present, doctor reports migration availability and planned TGO replacement without writing config.

## Approval gates

No git push, npm publish, latest tag, or remote repository rewrite happens without explicit approval.
