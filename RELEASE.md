# TGO Release Checklist

This checklist is for maintainers preparing a `trans-genderian-orchestra` release. Version references here are operational; public product copy should use TGO or `trans-genderian-orchestra` rather than branding the product by version.

## Preflight

- Confirm `package.json` has the intended version.
- Confirm repository metadata points at `octini/trans-genderian-orchestra` without a `repository.directory` subfolder.
- Confirm public docs mention only implemented commands.
- Confirm the npm `beta` or `latest` tag plan is explicit and approved.
- Confirm no local scratch artifacts are included in the package.

## Local Verification Gate

Run from the repository root:

```bash
bun run verify:release-readiness
bun run typecheck
bun test src/index.test.ts src/cli/providers.test.ts src/cli/config-io.test.ts
git diff --check
```

Optional but useful before a release:

```bash
bun run build
bun run check:ci
bun test
```

Known caveats: full `bun test` can hit a dashboard `EADDRINUSE` issue in some local environments, and `bun run check:ci` may report pre-existing import-order issues. Do not hide failures; report them with context.

## Package Preview Gate

```bash
npm pack --dry-run --json
```

Expected package contents include at least:

- `dist/`
- `src/skills/`
- `trans-genderian-orchestra.schema.json`
- `README.md`
- `MIGRATION.md`
- `RELEASE.md`
- `LICENSE`
- `package.json`

## Published Beta Verification

After publishing or moving the `beta` dist-tag, verify it points at the intended version:

```bash
npm view trans-genderian-orchestra@beta version --json
```

Do not claim a published beta matches the repository until this check confirms it.

## Disposable OpenCode Smoke

Use a disposable OpenCode profile for public beta smoke testing. Do not mutate a real user profile unless explicitly approved.

Automated smoke script:

```bash
bun run scripts/verify-public-beta-opencode.ts
```

Expected behavior: the script installs `trans-genderian-orchestra@beta` into a disposable `HOME`, runs the configured OpenCode command path for doctor, confirms TGO doctor JSON is returned, and confirms the disposable config is not unexpectedly mutated.

## Manual Smoke

In a disposable profile:

```bash
bunx trans-genderian-orchestra install --dry-run
bunx trans-genderian-orchestra doctor --json
```

Then, if applying install to the disposable profile:

```bash
bunx trans-genderian-orchestra install
opencode auth login
opencode models --refresh
opencode
```

Inside OpenCode, verify the implemented slash commands only:

```text
/preset
/interview Test a small product idea
/deepwork Test a complex task placeholder
```

Avoid documenting or testing `/tgo:*` commands unless source implements them.

## Approval Boundaries

No git push, npm publish, latest tag, or remote repository rewrite happens without explicit approval.

Also require explicit approval for:

- moving npm dist-tags;
- deleting release branches or worktrees;
- changing package ownership or repository settings;
- mutating a real OpenCode profile during release validation.
