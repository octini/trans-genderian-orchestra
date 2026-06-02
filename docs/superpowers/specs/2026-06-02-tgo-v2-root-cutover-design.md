# TGO v2 Root Cutover Design

## Goal

Make the GitHub repository root match the active TGO v2 plugin package root before any remote push, npm publish, latest tag, or v1 archive/delete decision leaves the local machine.

## Current State

- The active v2 package is in `trans-genderian-orchestra-v2/` at version `2.0.0-beta.0`.
- The repository root has only a README shim and no root `package.json`.
- The legacy implementation is in `trans-genderian-orchestra/` at version `2.0.0-beta.13`.
- `master` is locally ahead of `origin/master` and has not been pushed.
- Disposable validation passed for the v2 package and OpenCode slash-command smoke using `opencode/mimo-v2.5-free`.

## Decision

Promote `trans-genderian-orchestra-v2/` to the repository root, archive the legacy implementation under `archive/trans-genderian-orchestra-v1/`, remove the now-obsolete v2 wrapper directory, and validate the package from the new root before any remote operation.

## Alternatives Considered

1. Keep the current root README shim.
   - Lowest risk, already implemented.
   - Rejected because GitHub still shows a wrapper repository and the actual plugin remains one directory deep.

2. Push only the v2 package to a dedicated plugin repository.
   - Clean repository shape.
   - Rejected for now because it creates extra repo-management overhead and loses the straightforward continuity of this repository.

3. Promote v2 to this repository root.
   - Best matches the desired GitHub and package layout.
   - Chosen because local validation has already proven the v2 package and the remaining work is mostly deterministic file movement plus metadata cleanup.

## Target Repository Layout

After cutover, the repository root should contain the active package files directly:

- `package.json`
- `bun.lock`
- `biome.json`
- `tsconfig.json`
- `src/`
- `scripts/`
- `README.md`
- `MIGRATION.md`
- `RELEASE.md`
- `LICENSE`

The legacy implementation should move to:

- `archive/trans-genderian-orchestra-v1/`

The obsolete wrapper directory should be removed:

- `trans-genderian-orchestra-v2/`

## Metadata Changes

Root `package.json` should continue to use the already validated package identity:

- `name`: `trans-genderian-orchestra`
- `version`: `2.0.0-beta.0`
- `bin.trans-genderian-orchestra`: `./dist/cli/index.js`
- `files`: `dist`, `MIGRATION.md`, `RELEASE.md`, `README.md`, `LICENSE`

Repository metadata should change from subdirectory-aware metadata to root-aware metadata:

- Remove `repository.directory`.
- Keep `repository.type` as `git`.
- Keep `repository.url` as `git+ssh://git@github.com/octini/trans-genderian-orchestra.git`.
- Keep `bugs.url` as `https://github.com/octini/trans-genderian-orchestra/issues`.
- Change `homepage` to `https://github.com/octini/trans-genderian-orchestra`.

## Documentation Changes

- Root `README.md` should become the real v2 README, not the shim.
- `RELEASE.md` should describe root-level verification commands.
- `MIGRATION.md` can keep its v1/omo-slim migration content, but any package-path wording should reflect root placement.
- Historical design docs and old implementation plans may keep historical `trans-genderian-orchestra-v2/` paths unless a current release instruction would become misleading.
- The deepwork coordination file should record the cutover result and validation evidence.

## Validation Requirements

Run all package validation from repository root after cutover:

```bash
bun install --frozen-lockfile
bun test
bun run typecheck
bun run check:ci
bun run build
bun run verify:release-readiness
npm pack --dry-run --json
```

Expected outcomes:

- All commands exit 0.
- Tests report 0 failures.
- `verify:release-readiness` reports all checks with `ok: true`.
- `npm pack --dry-run --json` includes `README.md`, `MIGRATION.md`, `RELEASE.md`, `package.json`, `LICENSE`, and `dist` artifacts at package root.

Run disposable OpenCode validation again after cutover:

```bash
opencode run -m opencode/mimo-v2.5-free --command=tgo:doctor --format json -- --json
```

Expected outcomes in a disposable HOME:

- The local root plugin installs or loads.
- Doctor reports `v1-migration-available` for seeded v1-era config.
- Doctor plans `register-v2-managed-entries` and the relevant v1 removal actions.
- Doctor reports `restart_required: false`.
- The disposable config remains unchanged.

## Boundaries

The cutover may create local commits, use an isolated worktree, move files, remove the obsolete v2 wrapper directory, and update ignored deepwork state.

The cutover must not perform any of these without explicit later approval:

- `git push`
- PR creation
- npm publish
- `latest` tag assignment
- remote repository rewrite
- deletion of the archived v1 folder after it has been moved to `archive/trans-genderian-orchestra-v1/`

## Acceptance Criteria

- Active package files live at repository root.
- Legacy implementation is preserved under `archive/trans-genderian-orchestra-v1/`.
- `trans-genderian-orchestra-v2/` no longer exists.
- Root package metadata no longer references `repository.directory`.
- Root README is the real v2 README.
- Root-level full validation passes.
- Disposable OpenCode smoke passes from the new root.
- No remote push, PR, npm publish, latest tag, or archived-v1 deletion is performed.
