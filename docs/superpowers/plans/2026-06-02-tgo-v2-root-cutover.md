# TGO v2 Root Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote the active TGO v2 package from `trans-genderian-orchestra-v2/` to the repository root, archive the legacy implementation, and validate the root package before any remote action.

**Architecture:** Perform the cutover in an isolated worktree with test-first guardrails. Use a temporary pre-cutover regression test to prove the repository is not yet in the desired root layout, then move tracked package files to root, archive v1, update metadata/docs/tests/verifier for root placement, run full root validation, rerun disposable OpenCode smoke, and stop before push/publish.

**Tech Stack:** Bun, TypeScript, Biome, npm package metadata, OpenCode CLI/plugin validation, git worktrees.

---

## Source Spec

- Approved design: `docs/superpowers/specs/2026-06-02-tgo-v2-root-cutover-design.md`
- Current active package path before implementation: `trans-genderian-orchestra-v2/`
- Legacy implementation path before implementation: `trans-genderian-orchestra/`
- Target legacy archive path: `archive/trans-genderian-orchestra-v1/`
- Remote boundary: no `git push`, PR creation, npm publish, `latest` tag assignment, remote rewrite, or archived-v1 deletion without later explicit approval.

## File Structure

- Move to root: `trans-genderian-orchestra-v2/package.json` -> `package.json`
- Move to root: `trans-genderian-orchestra-v2/bun.lock` -> `bun.lock`
- Move to root: `trans-genderian-orchestra-v2/biome.json` -> `biome.json`
- Move to root: `trans-genderian-orchestra-v2/tsconfig.json` -> `tsconfig.json`
- Move to root: `trans-genderian-orchestra-v2/src/` -> `src/`
- Move to root: `trans-genderian-orchestra-v2/scripts/` -> `scripts/`
- Move to root: `trans-genderian-orchestra-v2/README.md` -> `README.md`
- Move to root: `trans-genderian-orchestra-v2/MIGRATION.md` -> `MIGRATION.md`
- Move to root: `trans-genderian-orchestra-v2/RELEASE.md` -> `RELEASE.md`
- Copy to root before archiving v1: `trans-genderian-orchestra/LICENSE` -> `LICENSE`
- Remove tracked duplicate package ignore file: `trans-genderian-orchestra-v2/.gitignore`
- Archive legacy package: `trans-genderian-orchestra/` -> `archive/trans-genderian-orchestra-v1/`
- Remove obsolete wrapper directory: `trans-genderian-orchestra-v2/`
- Create temporarily before cutover: `root-cutover.pretest.ts`
- After moving files, move the temporary test to: `src/release/root-cutover.test.ts`
- Modify after moving: `src/release/repository-layout.test.ts`
- Modify after moving: `src/release/release-readiness.test.ts`
- Modify after moving: `src/release/verify-release-readiness.test.ts`
- Modify after moving: `scripts/verify-release-readiness.ts`
- Modify after moving: `package.json`
- Modify after moving: `RELEASE.md`
- Modify ignored coordination state: `.slim/deepwork/tgo-v2-phased-implementation.md`

---

## Task 1: Create Cutover Guard Test And Verify Current Layout Fails

**Files:**

- Create temporarily: `root-cutover.pretest.ts`

- [ ] **Step 1: Create an isolated worktree and verify baseline**

Run from repository root:

```bash
git worktree add .worktrees/tgo-v2-root-cutover -b tgo-v2-root-cutover
cd .worktrees/tgo-v2-root-cutover/trans-genderian-orchestra-v2
bun install --frozen-lockfile
bun test
bun run typecheck
bun run check:ci
bun run build
```

Expected: baseline package checks pass with 0 test failures.

- [ ] **Step 2: Write the failing root cutover guard test**

Create `root-cutover.pretest.ts` at repository root:

```ts
import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function findRepoRoot(start: string): string {
  let current = start;
  while (current !== dirname(current)) {
    if (existsSync(join(current, '.git'))) {
      return current;
    }
    current = dirname(current);
  }
  throw new Error('Unable to find repository root');
}

const repoRoot = findRepoRoot(dirname(fileURLToPath(import.meta.url)));

describe('root cutover layout', () => {
  test('active package lives at repository root', () => {
    expect(existsSync(join(repoRoot, 'package.json'))).toBe(true);
    expect(existsSync(join(repoRoot, 'src', 'index.ts'))).toBe(true);
    expect(existsSync(join(repoRoot, 'scripts', 'verify-release-readiness.ts'))).toBe(true);
    expect(existsSync(join(repoRoot, 'trans-genderian-orchestra-v2'))).toBe(false);
  });

  test('legacy implementation is archived', () => {
    expect(existsSync(join(repoRoot, 'archive', 'trans-genderian-orchestra-v1'))).toBe(true);
    expect(existsSync(join(repoRoot, 'trans-genderian-orchestra'))).toBe(false);
  });

  test('root package metadata is repository-root aware', () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));

    expect(pkg.name).toBe('trans-genderian-orchestra');
    expect(pkg.version).toBe('2.0.0-beta.0');
    expect(pkg.repository).toEqual({
      type: 'git',
      url: 'git+ssh://git@github.com/octini/trans-genderian-orchestra.git',
    });
    expect(pkg.repository.directory).toBeUndefined();
    expect(pkg.homepage).toBe('https://github.com/octini/trans-genderian-orchestra');
  });

  test('root README is the real v2 README, not the shim', () => {
    const readme = readFileSync(join(repoRoot, 'README.md'), 'utf8');

    expect(readme).toContain('TGO v2');
    expect(readme).toContain('bootstrap --tools default --models balanced --resilience balanced');
    expect(readme).not.toContain('Active beta package');
  });
});
```

- [ ] **Step 3: Run the cutover guard test red**

Run from worktree repository root:

```bash
bun test ./root-cutover.pretest.ts
```

Expected: FAIL because root `package.json` is absent, `trans-genderian-orchestra-v2/` still exists, and legacy `trans-genderian-orchestra/` is not archived.

- [ ] **Step 4: Keep the red guard test uncommitted**

Run from worktree repository root:

```bash
git status --short root-cutover.pretest.ts
```

Expected: `root-cutover.pretest.ts` is untracked. Do not commit it while it is red; Task 2 moves it into `src/release/root-cutover.test.ts` and commits only after the cutover guard passes.

---

## Task 2: Promote V2 Package To Root And Archive V1

**Files:**

- Move: `trans-genderian-orchestra-v2/package.json` -> `package.json`
- Move: `trans-genderian-orchestra-v2/bun.lock` -> `bun.lock`
- Move: `trans-genderian-orchestra-v2/biome.json` -> `biome.json`
- Move: `trans-genderian-orchestra-v2/tsconfig.json` -> `tsconfig.json`
- Move: `trans-genderian-orchestra-v2/src/` -> `src/`
- Move: `trans-genderian-orchestra-v2/scripts/` -> `scripts/`
- Move: `trans-genderian-orchestra-v2/README.md` -> `README.md`
- Move: `trans-genderian-orchestra-v2/MIGRATION.md` -> `MIGRATION.md`
- Move: `trans-genderian-orchestra-v2/RELEASE.md` -> `RELEASE.md`
- Copy: `trans-genderian-orchestra/LICENSE` -> `LICENSE`
- Delete: `trans-genderian-orchestra-v2/.gitignore`
- Move: `trans-genderian-orchestra/` -> `archive/trans-genderian-orchestra-v1/`

- [ ] **Step 1: Move tracked package and archive files**

Run from worktree repository root:

```bash
mkdir -p archive
git rm README.md
cp trans-genderian-orchestra/LICENSE LICENSE
git mv trans-genderian-orchestra archive/trans-genderian-orchestra-v1
git mv trans-genderian-orchestra-v2/package.json package.json
git mv trans-genderian-orchestra-v2/bun.lock bun.lock
git mv trans-genderian-orchestra-v2/biome.json biome.json
git mv trans-genderian-orchestra-v2/tsconfig.json tsconfig.json
git mv trans-genderian-orchestra-v2/src src
git mv trans-genderian-orchestra-v2/scripts scripts
git mv trans-genderian-orchestra-v2/README.md README.md
git mv trans-genderian-orchestra-v2/MIGRATION.md MIGRATION.md
git mv trans-genderian-orchestra-v2/RELEASE.md RELEASE.md
git rm trans-genderian-orchestra-v2/.gitignore
rm -rf trans-genderian-orchestra-v2/dist trans-genderian-orchestra-v2/node_modules
rmdir trans-genderian-orchestra-v2
mkdir -p src/release
mv root-cutover.pretest.ts src/release/root-cutover.test.ts
git add LICENSE
```

Expected: root now contains active package files; `archive/trans-genderian-orchestra-v1/` exists; `trans-genderian-orchestra-v2/` is gone.

- [ ] **Step 2: Update package metadata for repository root**

Modify root `package.json` repository metadata to remove `directory` and point homepage at the repo root:

```json
{
  "repository": {
    "type": "git",
    "url": "git+ssh://git@github.com/octini/trans-genderian-orchestra.git"
  },
  "homepage": "https://github.com/octini/trans-genderian-orchestra"
}
```

Keep the existing package name, version, files, scripts, dependencies, devDependencies, and peerDependencies.

- [ ] **Step 3: Run cutover guard test green**

Run from repository root:

```bash
bun test src/release/root-cutover.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit the file move and root metadata update**

Run from worktree repository root:

```bash
git add -A
git commit -m "chore: promote tgo v2 package to repository root"
```

Expected: commit records root package promotion, v1 archive move, root README replacement, wrapper directory removal, root metadata update, root license copy, and the now-green cutover guard test.

---

## Task 3: Update Metadata, Tests, Verifier, And Release Docs For Root Layout

**Files:**

- Modify: `package.json`
- Modify: `RELEASE.md`
- Modify: `scripts/verify-release-readiness.ts`
- Modify: `src/release/repository-layout.test.ts`
- Modify: `src/release/release-readiness.test.ts`
- Modify: `src/release/verify-release-readiness.test.ts`
- Test: `src/release/root-cutover.test.ts`

- [ ] **Step 1: Update repository layout test for root package**

Replace `src/release/repository-layout.test.ts` with:

```ts
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('repository layout metadata', () => {
  test('root README is the active v2 package README', () => {
    const rootReadme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');

    expect(rootReadme).toContain('TGO v2');
    expect(rootReadme).toContain('bootstrap --tools default --models balanced --resilience balanced');
    expect(rootReadme).toContain('Phase 7 release hardening');
    expect(rootReadme).not.toContain('Active beta package');
  });

  test('package metadata links npm readers back to the repository root', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

    expect(pkg.repository).toEqual({
      type: 'git',
      url: 'git+ssh://git@github.com/octini/trans-genderian-orchestra.git',
    });
    expect(pkg.repository.directory).toBeUndefined();
    expect(pkg.bugs).toEqual({
      url: 'https://github.com/octini/trans-genderian-orchestra/issues',
    });
    expect(pkg.homepage).toBe('https://github.com/octini/trans-genderian-orchestra');
    expect(pkg.keywords).toEqual(
      expect.arrayContaining(['opencode', 'opencode-plugin', 'agents', 'orchestration']),
    );
  });
});
```

- [ ] **Step 2: Update release docs and release readiness test for post-cutover boundaries**

In `RELEASE.md`, change the approval boundary wording from:

```md
No git push, npm publish, latest tag, root cutover, or v1 archive happens without explicit approval.
```

to:

```md
No git push, npm publish, latest tag, remote repository rewrite, or archived v1 deletion happens without explicit approval.
```

Replace `src/release/release-readiness.test.ts` with:

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
    expect(release).toContain(
      'No git push, npm publish, latest tag, remote repository rewrite, or archived v1 deletion',
    );
  });

  test('package ships release documentation', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

    expect(pkg.files).toContain('RELEASE.md');
  });
});
```

- [ ] **Step 3: Update verifier for root metadata**

Replace `scripts/verify-release-readiness.ts` with:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

const REQUIRED_FILES = ['README.md', 'MIGRATION.md', 'RELEASE.md', 'package.json'];

interface ReleasePackageJson {
  files?: string[];
  repository?: {
    directory?: string;
    type?: string;
    url?: string;
  };
}

interface CheckResult {
  id: string;
  ok: boolean;
  detail: string;
}

function readPackage(): ReleasePackageJson {
  return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as ReleasePackageJson;
}

function checkFiles(): CheckResult {
  const missing = REQUIRED_FILES.filter((file) => !existsSync(join(ROOT, file)));
  return {
    id: 'required_files',
    ok: missing.length === 0,
    detail: missing.length === 0 ? 'all required files present' : `missing: ${missing.join(', ')}`,
  };
}

function checkRepositoryRoot(pkg: ReleasePackageJson): CheckResult {
  const directory = pkg.repository?.directory;
  return {
    id: 'repository_root',
    ok:
      pkg.repository?.type === 'git' &&
      pkg.repository?.url === 'git+ssh://git@github.com/octini/trans-genderian-orchestra.git' &&
      directory === undefined,
    detail: directory === undefined ? 'repository points to root' : `repository.directory=${directory}`,
  };
}

function checkPackFiles(pkg: ReleasePackageJson): CheckResult {
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
  const required =
    'No git push, npm publish, latest tag, remote repository rewrite, or archived v1 deletion';
  return {
    id: 'approval_boundaries',
    ok: release.includes(required),
    detail: release.includes(required) ? 'approval boundaries documented' : 'approval boundaries missing',
  };
}

const pkg = readPackage();
const checks = [
  checkFiles(),
  checkRepositoryRoot(pkg),
  checkPackFiles(pkg),
  checkApprovalBoundaries(),
];

console.log(JSON.stringify({ checks }, null, 2));

if (checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}
```

- [ ] **Step 4: Update verifier source test**

Replace `src/release/verify-release-readiness.test.ts` with:

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

  test('verifier source checks docs, root metadata, and approval boundaries', () => {
    const source = readFileSync(
      new URL('../../scripts/verify-release-readiness.ts', import.meta.url),
      'utf8',
    );

    expect(source).toContain('REQUIRED_FILES');
    expect(source).toContain('repository_root');
    expect(source).toContain('repository?.directory');
    expect(source).toContain('approval_boundaries');
    expect(source).toContain('process.exitCode = 1');
  });
});
```

- [ ] **Step 5: Run cutover tests green and format if needed**

Run from repository root:

```bash
bun test src/release/root-cutover.test.ts src/release/repository-layout.test.ts src/release/release-readiness.test.ts src/release/verify-release-readiness.test.ts
bun run verify:release-readiness
bun run typecheck
bun run check:ci
```

Expected: tests pass; verifier reports checks with `ok: true`; typecheck passes; Biome passes. If Biome reports formatting changes, run:

```bash
bunx biome check package.json RELEASE.md scripts/verify-release-readiness.ts src/release/root-cutover.test.ts src/release/repository-layout.test.ts src/release/release-readiness.test.ts src/release/verify-release-readiness.test.ts --write
```

Then rerun the four verification commands.

- [ ] **Step 6: Commit release test/verifier updates**

Run from worktree repository root:

```bash
git add package.json RELEASE.md scripts/verify-release-readiness.ts src/release/root-cutover.test.ts src/release/repository-layout.test.ts src/release/release-readiness.test.ts src/release/verify-release-readiness.test.ts
git commit -m "chore: update release checks for root package layout"
```

Expected: commit contains root-aware metadata, release doc wording, verifier logic, and tests.

---

## Task 4: Run Root Package Validation And Disposable OpenCode Smoke

**Files:**

- No new source files expected unless validation exposes a defect.
- May modify only touched root package docs/scripts/tests if validation exposes a focused issue.

- [ ] **Step 1: Run full root package validation**

Run from repository root:

```bash
bun install --frozen-lockfile
bun test
bun run typecheck
bun run check:ci
bun run build
bun run verify:release-readiness
npm pack --dry-run --json
```

Expected: all commands exit 0. `bun test` reports 0 failures. Verifier reports all checks with `ok: true`. Pack preview includes `package/README.md`, `package/MIGRATION.md`, `package/RELEASE.md`, `package/package.json`, `package/LICENSE`, and `package/dist` artifacts.

- [ ] **Step 2: Run disposable OpenCode root smoke**

Run from repository root:

```bash
TEMP_ROOT=$(mktemp -d)
TEMP_HOME="$TEMP_ROOT/home"
PKG_DIR=$(pwd)
mkdir -p "$TEMP_HOME/.config/opencode/tgo"
HOME="$TEMP_HOME" opencode plugin "$PKG_DIR" --global --force
node - "$TEMP_HOME/.config/opencode/opencode.jsonc" "$PKG_DIR" <<'NODE'
const fs = require('node:fs');
const [configPath, pkgDir] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.plugin = [pkgDir];
config.agent = { orchestrator: {}, 'user-agent': {} };
fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
NODE
cat > "$TEMP_HOME/.config/opencode/tgo/manifest.jsonc" <<'JSON'
{
  "schema_version": 1,
  "package": { "name": "trans-genderian-orchestra", "version": "2.0.0-beta.0" },
  "active_presets": { "tools": "default", "models": "balanced", "resilience": "balanced" },
  "managed_config": [],
  "tools": [],
  "backups": [],
  "ignored_warnings": []
}
JSON
HOME="$TEMP_HOME" opencode run -m opencode/mimo-v2.5-free --command=tgo:doctor --format json --dir "$PKG_DIR" -- --json > "$TEMP_ROOT/opencode-run.out" 2> "$TEMP_ROOT/opencode-run.err"
OPENCODE_EXIT=$?
node - "$TEMP_ROOT/opencode-run.out" "$TEMP_ROOT/opencode-run.err" "$TEMP_HOME/.config/opencode/opencode.jsonc" "$PKG_DIR" "$OPENCODE_EXIT" <<'NODE'
const fs = require('node:fs');
const [outPath, errPath, configPath, pkgDir, exitCodeText] = process.argv.slice(2);
const raw = fs.readFileSync(outPath, 'utf8');
const errBytes = fs.statSync(errPath).size;
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const lines = raw.split(/\r?\n/).filter(Boolean);
const parsed = [];
for (const line of lines) {
  try {
    parsed.push(JSON.parse(line));
  } catch {}
}

function collectStrings(value, output = []) {
  if (typeof value === 'string') {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, output);
    return output;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, output);
  }
  return output;
}

const embedded = parsed
  .flatMap((event) => collectStrings(event))
  .join('\n');
const combined = `${raw}\n${embedded}`;
const result = {
  commandExitZero: Number(exitCodeText) === 0,
  hasV1MigrationWarning: combined.includes('v1-migration-available'),
  hasRegisterV2Action: combined.includes('register-v2-managed-entries'),
  hasRemoveV1AgentAction: combined.includes('remove-v1-agent-orchestrator'),
  restartRequiredFalse: /\\?"restart_required\\?"\s*:\s*false/.test(combined),
  tempConfigStillHasLocalPlugin: config.plugin?.includes(pkgDir) === true,
  tempConfigStillHasOrchestrator: Boolean(config.agent?.orchestrator),
  tempConfigStillHasUserAgent: Boolean(config.agent?.['user-agent']),
  tempConfigHasTgoManagedAgent: Boolean(config.agent?.['tgo-builder'] || config.agent?.['tgo-orchestrator']),
  stderrBytes: errBytes,
};
console.log(JSON.stringify(result, null, 2));
const ok = result.commandExitZero
  && result.hasV1MigrationWarning
  && result.hasRegisterV2Action
  && result.hasRemoveV1AgentAction
  && result.restartRequiredFalse
  && result.tempConfigStillHasLocalPlugin
  && result.tempConfigStillHasOrchestrator
  && result.tempConfigStillHasUserAgent
  && !result.tempConfigHasTgoManagedAgent
  && result.stderrBytes === 0;
if (!ok) process.exitCode = 1;
NODE
```

Expected: final JSON reports every boolean except `tempConfigHasTgoManagedAgent` as `true`, `tempConfigHasTgoManagedAgent` as `false`, and `stderrBytes` as `0`.

- [ ] **Step 3: Run root cutover self-review**

Run from repository root:

```bash
git status --short
git diff --stat origin/master..HEAD
git diff --name-status origin/master..HEAD
test -f package.json
test -d src
test -d scripts
test -d archive/trans-genderian-orchestra-v1
test ! -e trans-genderian-orchestra-v2
node -e 'const pkg=require("./package.json"); if (pkg.repository?.directory) process.exit(1); console.log(JSON.stringify({name: pkg.name, version: pkg.version, repository: pkg.repository, homepage: pkg.homepage}, null, 2));'
PLACEHOLDER_PATTERN='TO''DO|T''BD|fill'' in|implement'' later|Similar'' to Task|appropriate'' error handling|Write'' tests for the above'
grep -R -E "$PLACEHOLDER_PATTERN" README.md MIGRATION.md RELEASE.md src scripts package.json || true
```

Expected: status is clean after committed validation fixes; root files and archive exist; `trans-genderian-orchestra-v2` is absent; package metadata has no `repository.directory`; placeholder scan prints no matches.

- [ ] **Step 4: Commit validation-only fixes if needed**

If validation exposes a focused doc, metadata, script, or test issue, fix only that issue and commit:

```bash
git add README.md MIGRATION.md RELEASE.md package.json scripts src
git commit -m "chore: finalize tgo root cutover validation"
```

Expected: skip this step if no changes are pending.

---

## Task 5: Update Deepwork And Complete Local Branch Workflow

**Files:**

- Modify: `.slim/deepwork/tgo-v2-phased-implementation.md`

- [ ] **Step 1: Update deepwork with cutover results**

Add a root cutover summary to `.slim/deepwork/tgo-v2-phased-implementation.md` recording:

```md
## Root Cutover Summary

- Root cutover branch/worktree: `.worktrees/tgo-v2-root-cutover` on `tgo-v2-root-cutover`.
- Active v2 package files promoted from `trans-genderian-orchestra-v2/` to repository root.
- Legacy implementation preserved under `archive/trans-genderian-orchestra-v1/`.
- Obsolete `trans-genderian-orchestra-v2/` wrapper removed.
- Root `package.json` metadata now points at the repository root and no longer uses `repository.directory`.
- Root-level package validation passed: `bun test`, `bun run typecheck`, `bun run check:ci`, `bun run build`, `bun run verify:release-readiness`, and `npm pack --dry-run --json`.
- Disposable OpenCode root smoke with `opencode/mimo-v2.5-free` passed and left temp config unchanged.
- No remote push, PR, npm publish, latest tag, remote rewrite, or archived-v1 deletion performed.
```

- [ ] **Step 2: Run final branch verification before completion options**

Run from worktree repository root:

```bash
bun test
bun run typecheck
bun run check:ci
bun run build
bun run verify:release-readiness
```

Expected: all pass.

- [ ] **Step 3: Use finishing-a-development-branch workflow**

After final verification passes, use `superpowers:finishing-a-development-branch` to present completion options. Recommended option should be local fast-forward merge to `master`, because the user has repeatedly approved local phased merges but has not approved any remote push.

If the user chooses local merge, verify merged `master` from repository root:

```bash
bun test
bun run typecheck
bun run check:ci
bun run build
bun run verify:release-readiness
```

Expected: all pass on merged `master` before removing the owned worktree and deleting the feature branch.

---

## Completion Criteria

- `package.json`, `src/`, `scripts/`, `README.md`, `MIGRATION.md`, `RELEASE.md`, `biome.json`, `tsconfig.json`, and `bun.lock` live at repository root.
- `archive/trans-genderian-orchestra-v1/` preserves the legacy implementation.
- `trans-genderian-orchestra-v2/` no longer exists.
- `package.json` has no `repository.directory` and homepage is `https://github.com/octini/trans-genderian-orchestra`.
- Root README is the real v2 README.
- Root release-readiness verifier reports all checks with `ok: true`.
- Full package validation passes from repository root.
- Disposable OpenCode smoke passes from repository root with `opencode/mimo-v2.5-free` and temp config unchanged.
- No `git push`, PR creation, npm publish, `latest` tag assignment, remote rewrite, or archived-v1 deletion happens without later explicit approval.
