# TGO v2 Release Readiness And Cutover Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare TGO v2 for a safe beta-facing release path without pushing, publishing, or moving the package root unless the user explicitly approves that gate.

**Architecture:** Keep the publishable package in `trans-genderian-orchestra-v2/` for the first release-readiness pass. Add a root README shim and package metadata so GitHub/npm point readers to the v2 package while preserving the old plugin folder until cutover is explicitly approved. Add deterministic release-check tests and scripts so local beta validation can happen before any remote action.

**Tech Stack:** Bun, TypeScript, Biome, npm package metadata, GitHub repository metadata, OpenCode disposable-profile validation.

---

## Current Facts

- Repository root has no `README.md` and no root `package.json`.
- The old v1 plugin remains under `trans-genderian-orchestra/` with package version `2.0.0-beta.13`.
- The v2 publishable package lives under `trans-genderian-orchestra-v2/` with package version `2.0.0-beta.0`.
- `origin` is `git@github.com:octini/trans-genderian-orchestra.git`.
- Local `master` is ahead of `origin/master`; no remote push has been approved.
- Phase 7 implemented migration preview, rollback, uninstall, doctor warnings, stable-release gates, and migration docs.

## Release Gates

- No `git push`, PR creation, npm publish, `latest` tag, root package cutover, v1 archive/delete, or remote repo rewrite without explicit approval.
- Local validation may create commits, worktrees, temp homes, and tarballs.
- First recommended release-readiness path is a root README shim plus package metadata and local tarball validation. Full root cutover is a later approval-gated path.

## File Structure

- Create `README.md`: root GitHub-facing shim that explains the active v2 package path and old v1 reference folder.
- Modify `trans-genderian-orchestra-v2/package.json`: add repository/bugs/homepage/keywords metadata, include release docs/scripts in `files`, and add a local release verification script.
- Create `trans-genderian-orchestra-v2/RELEASE.md`: exact beta readiness, local tarball, disposable OpenCode validation, and approval-gate checklist.
- Create `trans-genderian-orchestra-v2/scripts/verify-release-readiness.ts`: deterministic local metadata/docs/pack readiness verifier.
- Create `trans-genderian-orchestra-v2/src/release/repository-layout.test.ts`: tests root README and package metadata point to v2.
- Create `trans-genderian-orchestra-v2/src/release/release-readiness.test.ts`: tests release docs and package file inclusion.
- Create `trans-genderian-orchestra-v2/src/release/verify-release-readiness.test.ts`: tests release verifier script registration and required checks.
- Modify `.slim/deepwork/tgo-v2-phased-implementation.md`: ignored coordination update after implementation and validation.

---

## Task 1: Add Root GitHub Presentation Shim

**Files:**

- Create: `README.md`
- Modify: `trans-genderian-orchestra-v2/package.json`
- Create: `trans-genderian-orchestra-v2/src/release/repository-layout.test.ts`

- [ ] **Step 1: Write failing repository layout test**

Create `trans-genderian-orchestra-v2/src/release/repository-layout.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('repository layout metadata', () => {
  test('root README points GitHub readers to the v2 package', () => {
    const rootReadme = readFileSync(new URL('../../../README.md', import.meta.url), 'utf8');

    expect(rootReadme).toContain('trans-genderian-orchestra-v2');
    expect(rootReadme).toContain('Active beta package');
    expect(rootReadme).toContain('No remote push, npm publish, or root cutover happens without explicit approval');
  });

  test('package metadata links npm readers back to the repository subdirectory', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

    expect(pkg.repository).toEqual({
      type: 'git',
      url: 'git+ssh://git@github.com/octini/trans-genderian-orchestra.git',
      directory: 'trans-genderian-orchestra-v2',
    });
    expect(pkg.bugs).toEqual({
      url: 'https://github.com/octini/trans-genderian-orchestra/issues',
    });
    expect(pkg.homepage).toBe(
      'https://github.com/octini/trans-genderian-orchestra/tree/master/trans-genderian-orchestra-v2',
    );
    expect(pkg.keywords).toEqual(
      expect.arrayContaining(['opencode', 'opencode-plugin', 'agents', 'orchestration']),
    );
  });
});
```

- [ ] **Step 2: Run repository layout test red**

Run from `trans-genderian-orchestra-v2/`:

```bash
bun test src/release/repository-layout.test.ts
```

Expected: FAIL because root `README.md` does not exist and v2 package metadata lacks repository fields.

- [ ] **Step 3: Add root README shim**

Create `README.md` at repository root:

```md
# trans-genderian-orchestra

## Active beta package

The active TGO v2 beta package lives in [`trans-genderian-orchestra-v2/`](trans-genderian-orchestra-v2/).

Start there for the current README, migration guide, package metadata, and release-hardening notes.

## Legacy reference package

The previous implementation remains in [`trans-genderian-orchestra/`](trans-genderian-orchestra/) as a reference while v2 beta validation and cutover are completed.

## Release boundary

No remote push, npm publish, or root cutover happens without explicit approval.
```

- [ ] **Step 4: Add v2 repository metadata**

Modify `trans-genderian-orchestra-v2/package.json` so the top-level metadata includes these fields:

```json
{
  "repository": {
    "type": "git",
    "url": "git+ssh://git@github.com/octini/trans-genderian-orchestra.git",
    "directory": "trans-genderian-orchestra-v2"
  },
  "bugs": {
    "url": "https://github.com/octini/trans-genderian-orchestra/issues"
  },
  "homepage": "https://github.com/octini/trans-genderian-orchestra/tree/master/trans-genderian-orchestra-v2",
  "keywords": [
    "opencode",
    "opencode-plugin",
    "ai",
    "agents",
    "orchestration",
    "llm"
  ]
}
```

Keep existing `name`, `version`, `description`, `type`, `license`, `main`, `types`, `exports`, `bin`, `files`, `scripts`, `dependencies`, `devDependencies`, and `peerDependencies` values unless another task changes them explicitly.

- [ ] **Step 5: Run repository layout test green and static checks**

Run from `trans-genderian-orchestra-v2/`:

```bash
bun test src/release/repository-layout.test.ts
bun run typecheck
bun run check:ci
```

Expected: all pass. If Biome reports formatting changes, run:

```bash
bunx biome check src/release/repository-layout.test.ts package.json --write
```

Then rerun the three verification commands.

- [ ] **Step 6: Commit Task 1**

Run from repository root:

```bash
git add README.md trans-genderian-orchestra-v2/package.json trans-genderian-orchestra-v2/src/release/repository-layout.test.ts
git commit -m "docs: clarify tgo v2 repository presentation"
```

---

## Task 2: Add Release Readiness Documentation

**Files:**

- Create: `trans-genderian-orchestra-v2/RELEASE.md`
- Modify: `trans-genderian-orchestra-v2/package.json`
- Create: `trans-genderian-orchestra-v2/src/release/release-readiness.test.ts`

- [ ] **Step 1: Write failing release readiness docs test**

Create `trans-genderian-orchestra-v2/src/release/release-readiness.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('release readiness documentation', () => {
  test('release guide records local beta validation commands and approval gates', () => {
    const release = readFileSync(new URL('../../RELEASE.md', import.meta.url), 'utf8');

    expect(release).toContain('bun test');
    expect(release).toContain('bun run typecheck');
    expect(release).toContain('bun run check:ci');
    expect(release).toContain('bun run build');
    expect(release).toContain('npm pack --dry-run --json');
    expect(release).toContain('/tgo:doctor --json');
    expect(release).toContain('No git push, npm publish, latest tag, root cutover, or v1 archive');
  });

  test('package ships release documentation', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

    expect(pkg.files).toContain('RELEASE.md');
  });
});
```

- [ ] **Step 2: Run release docs test red**

Run from `trans-genderian-orchestra-v2/`:

```bash
bun test src/release/release-readiness.test.ts
```

Expected: FAIL because `RELEASE.md` is missing and `package.json` does not include it in `files`.

- [ ] **Step 3: Add release guide**

Create `trans-genderian-orchestra-v2/RELEASE.md`:

```md
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

No git push, npm publish, latest tag, root cutover, or v1 archive happens without explicit approval.
```

- [ ] **Step 4: Include release guide in package files**

Modify `trans-genderian-orchestra-v2/package.json` so `files` contains:

```json
[
  "dist",
  "MIGRATION.md",
  "RELEASE.md",
  "README.md",
  "LICENSE"
]
```

- [ ] **Step 5: Run release docs test green and static checks**

Run from `trans-genderian-orchestra-v2/`:

```bash
bun test src/release/release-readiness.test.ts
bun run typecheck
bun run check:ci
```

Expected: all pass. If Biome reports formatting changes, run:

```bash
bunx biome check src/release/release-readiness.test.ts package.json --write
```

Then rerun the three verification commands.

- [ ] **Step 6: Commit Task 2**

Run from repository root:

```bash
git add trans-genderian-orchestra-v2/RELEASE.md trans-genderian-orchestra-v2/package.json trans-genderian-orchestra-v2/src/release/release-readiness.test.ts
git commit -m "docs: add tgo v2 release readiness guide"
```

---

## Task 3: Add Deterministic Release Readiness Verifier

**Files:**

- Create: `trans-genderian-orchestra-v2/scripts/verify-release-readiness.ts`
- Modify: `trans-genderian-orchestra-v2/package.json`
- Create: `trans-genderian-orchestra-v2/src/release/verify-release-readiness.test.ts`

- [ ] **Step 1: Write failing verifier tests**

Create `trans-genderian-orchestra-v2/src/release/verify-release-readiness.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('release readiness verifier', () => {
  test('package exposes verify release script', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

    expect(pkg.scripts['verify:release-readiness']).toBe(
      'bun run scripts/verify-release-readiness.ts',
    );
  });

  test('verifier source checks docs, metadata, and approval boundaries', () => {
    const source = readFileSync(
      new URL('../../scripts/verify-release-readiness.ts', import.meta.url),
      'utf8',
    );

    expect(source).toContain('REQUIRED_FILES');
    expect(source).toContain('repository.directory');
    expect(source).toContain('approval_boundaries');
    expect(source).toContain('process.exitCode = 1');
  });
});
```

- [ ] **Step 2: Run verifier tests red**

Run from `trans-genderian-orchestra-v2/`:

```bash
bun test src/release/verify-release-readiness.test.ts
```

Expected: FAIL because the script and package script are missing.

- [ ] **Step 3: Add verifier script**

Create `trans-genderian-orchestra-v2/scripts/verify-release-readiness.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

const REQUIRED_FILES = [
  'README.md',
  'MIGRATION.md',
  'RELEASE.md',
  'package.json',
];

interface CheckResult {
  id: string;
  ok: boolean;
  detail: string;
}

function readPackage(): Record<string, any> {
  return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
}

function checkFiles(): CheckResult {
  const missing = REQUIRED_FILES.filter((file) => !existsSync(join(ROOT, file)));
  return {
    id: 'required_files',
    ok: missing.length === 0,
    detail: missing.length === 0 ? 'all required files present' : `missing: ${missing.join(', ')}`,
  };
}

function checkRepositoryDirectory(pkg: Record<string, any>): CheckResult {
  const actual = pkg.repository?.directory;
  return {
    id: 'repository.directory',
    ok: actual === 'trans-genderian-orchestra-v2',
    detail: `repository.directory=${actual ?? 'missing'}`,
  };
}

function checkPackFiles(pkg: Record<string, any>): CheckResult {
  const files = new Set(pkg.files ?? []);
  const missing = ['dist', 'README.md', 'MIGRATION.md', 'RELEASE.md'].filter(
    (file) => !files.has(file),
  );
  return {
    id: 'package_files',
    ok: missing.length === 0,
    detail: missing.length === 0 ? 'package files list includes release docs' : `missing: ${missing.join(', ')}`,
  };
}

function checkApprovalBoundaries(): CheckResult {
  const release = readFileSync(join(ROOT, 'RELEASE.md'), 'utf8');
  const required = 'No git push, npm publish, latest tag, root cutover, or v1 archive';
  return {
    id: 'approval_boundaries',
    ok: release.includes(required),
    detail: release.includes(required) ? 'approval boundaries documented' : 'approval boundaries missing',
  };
}

const pkg = readPackage();
const checks = [
  checkFiles(),
  checkRepositoryDirectory(pkg),
  checkPackFiles(pkg),
  checkApprovalBoundaries(),
];

console.log(JSON.stringify({ checks }, null, 2));

if (checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}
```

- [ ] **Step 4: Add verifier package script**

Modify `trans-genderian-orchestra-v2/package.json` scripts to include:

```json
"verify:release-readiness": "bun run scripts/verify-release-readiness.ts"
```

- [ ] **Step 5: Run verifier tests and verifier command green**

Run from `trans-genderian-orchestra-v2/`:

```bash
bun test src/release/verify-release-readiness.test.ts
bun run verify:release-readiness
bun run typecheck
bun run check:ci
```

Expected: all pass. Verifier JSON should show four checks with `ok: true`.

- [ ] **Step 6: Commit Task 3**

Run from repository root:

```bash
git add trans-genderian-orchestra-v2/scripts/verify-release-readiness.ts trans-genderian-orchestra-v2/package.json trans-genderian-orchestra-v2/src/release/verify-release-readiness.test.ts
git commit -m "chore: add tgo v2 release readiness verifier"
```

---

## Task 4: Run Local Release Readiness Validation

**Files:**

- No source files expected beyond validation-only fixes.
- May modify touched files if validation exposes formatting, metadata, or documentation defects.

- [ ] **Step 1: Run targeted release readiness tests**

Run from `trans-genderian-orchestra-v2/`:

```bash
bun test src/release/repository-layout.test.ts src/release/release-readiness.test.ts src/release/verify-release-readiness.test.ts
```

Expected: all pass.

- [ ] **Step 2: Run full package verification**

Run from `trans-genderian-orchestra-v2/`:

```bash
bun test
bun run typecheck
bun run check:ci
bun run build
bun run verify:release-readiness
```

Expected: all pass.

- [ ] **Step 3: Run npm pack dry-run preview**

Run from `trans-genderian-orchestra-v2/`:

```bash
npm pack --dry-run --json
```

Expected: command exits 0 and JSON file list includes `package/README.md`, `package/MIGRATION.md`, `package/RELEASE.md`, `package/package.json`, and built `package/dist` files.

- [ ] **Step 4: Run inline release-readiness self-review**

Run from repository root:

```bash
git diff --stat origin/master..HEAD
git diff --name-status origin/master..HEAD
PLACEHOLDER_PATTERN='TO''DO|T''BD|fill'' in|implement'' later|Similar'' to Task|appropriate'' error handling|Write'' tests for the above'
grep -R -E "$PLACEHOLDER_PATTERN" README.md trans-genderian-orchestra-v2/README.md trans-genderian-orchestra-v2/MIGRATION.md trans-genderian-orchestra-v2/RELEASE.md trans-genderian-orchestra-v2/src/release trans-genderian-orchestra-v2/scripts trans-genderian-orchestra-v2/package.json || true
```

Expected: changed files are limited to planned local release-readiness work plus already-merged Phase 1-7 history; placeholder scan prints no matches.

- [ ] **Step 5: Commit validation-only fixes if needed**

If validation exposes a small doc, metadata, or formatting defect, fix only that defect and commit:

```bash
git add README.md trans-genderian-orchestra-v2/README.md trans-genderian-orchestra-v2/MIGRATION.md trans-genderian-orchestra-v2/RELEASE.md trans-genderian-orchestra-v2/package.json trans-genderian-orchestra-v2/src/release trans-genderian-orchestra-v2/scripts
git commit -m "chore: finalize tgo v2 release readiness checks"
```

Expected: skip this step if `git status --short` shows no source/doc changes.

---

## Task 5: Approval Checkpoint For Remote And Cutover Work

**Files:**

- Modify: `.slim/deepwork/tgo-v2-phased-implementation.md`

- [ ] **Step 1: Update deepwork with release-readiness results**

Add a short release-readiness summary to `.slim/deepwork/tgo-v2-phased-implementation.md` recording:

```md
## Release Readiness Planning Summary

- Root README shim added so GitHub readers land on the active v2 beta package.
- V2 package metadata points npm readers to repository subdirectory `trans-genderian-orchestra-v2`.
- Release guide documents local verification, pack dry-run, disposable OpenCode validation, and approval boundaries.
- Release readiness verifier passed locally.
- No remote push, PR, npm publish, latest tag, root cutover, or v1 archive performed.
```

- [ ] **Step 2: Present approval options to the user**

After all local release-readiness validation passes, stop and present exactly these options:

```text
Release-readiness checks are complete locally. Which path should we take next?

1. Push local master to GitHub, no PR, no npm publish
2. Create a GitHub PR/review path before publishing
3. Run disposable OpenCode beta install validation first
4. Plan full root cutover from trans-genderian-orchestra-v2/ to repository root
5. Stop here and keep everything local
```

Expected: do not run remote or destructive commands until the user chooses.

---

## Completion Criteria

- Root GitHub README shim points to `trans-genderian-orchestra-v2/`.
- V2 package metadata includes repository directory, bugs URL, homepage, and keywords.
- `RELEASE.md` exists and is included in package `files`.
- Release readiness verifier exists and passes.
- `bun test`, `bun run typecheck`, `bun run check:ci`, `bun run build`, `bun run verify:release-readiness`, and `npm pack --dry-run --json` pass locally.
- No remote push, PR, npm publish, latest tag, root cutover, or v1 archive happens without explicit approval.
