# Public Beta OpenCode Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a repeatable automated smoke check proving the published TGO beta works through OpenCode before manual UI testing.

**Architecture:** Keep the smoke outside the default test suite because it requires OpenCode, npm/network access, and a usable model. Implement a standalone TypeScript script that creates a disposable HOME, installs the public beta plugin into that HOME, seeds schema-safe old omo-slim agent config, runs `/tgo:doctor --json` through `opencode run`, and asserts the actual command path and read-only doctor result.

**Tech Stack:** Bun, TypeScript, Node filesystem/process APIs, OpenCode CLI, npm registry, existing release docs/tests.

---

## Source Design

- Spec: `docs/superpowers/specs/2026-06-02-public-beta-opencode-validation-design.md`
- Published beta expected at plan time: `trans-genderian-orchestra@2.0.0-beta.2`
- npm tags expected at plan time: `beta: 2.0.0-beta.2`, `latest: 2.0.0-beta.0`

## File Structure

- Create `scripts/verify-public-beta-opencode.ts`: executable release smoke script.
- Create `src/release/public-beta-opencode.test.ts`: static test for script registration and safety guardrails.
- Modify `package.json`: add `verify:public-beta-opencode` script.
- Modify `RELEASE.md`: document the automated public-beta OpenCode smoke.
- Modify `.slim/deepwork/tgo-v2-phased-implementation.md`: ignored coordination update after validation.

---

## Task 1: Register Public Beta OpenCode Smoke

**Files:**

- Create: `src/release/public-beta-opencode.test.ts`
- Create: `scripts/verify-public-beta-opencode.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing registration and guardrail test**

Create `src/release/public-beta-opencode.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('public beta OpenCode validation smoke', () => {
  test('package exposes explicit public beta OpenCode smoke script', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

    expect(pkg.scripts['verify:public-beta-opencode']).toBe(
      'bun run scripts/verify-public-beta-opencode.ts',
    );
  });

  test('smoke script is disposable-home only and checks the TGO command path', () => {
    const source = readFileSync(
      new URL('../../scripts/verify-public-beta-opencode.ts', import.meta.url),
      'utf8',
    );

    expect(source).toContain('mkdtempSync');
    expect(source).toContain('trans-genderian-orchestra@beta');
    expect(source).toContain('npx --yes trans-genderian-orchestra@beta doctor --json');
    expect(source).toContain('bd doctor');
    expect(source).toContain('configUnchanged');
    expect(source).toContain('process.exitCode = 1');
  });
});
```

- [ ] **Step 2: Run registration test red**

Run from repository root:

```bash
bun test src/release/public-beta-opencode.test.ts
```

Expected: FAIL because `verify:public-beta-opencode` and `scripts/verify-public-beta-opencode.ts` do not exist.

- [ ] **Step 3: Add package script and smoke script skeleton**

Modify `package.json` scripts to include:

```json
"verify:public-beta-opencode": "bun run scripts/verify-public-beta-opencode.ts"
```

Create `scripts/verify-public-beta-opencode.ts`:

```ts
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

interface CheckResult {
  id: string;
  ok: boolean;
  detail: string;
}

const expectedDoctorCommand = 'npx --yes trans-genderian-orchestra@beta doctor --json';

function run(command: string, args: string[], options: { cwd: string; home: string }) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, HOME: options.home },
    encoding: 'utf8',
  });
}

function readJsonLines(output: string): unknown[] {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

function collectStrings(value: unknown, result: string[] = []): string[] {
  if (typeof value === 'string') {
    result.push(value);
    return result;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, result);
    }
    return result;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      collectStrings(item, result);
    }
  }
  return result;
}

function check(id: string, ok: boolean, detail: string): CheckResult {
  return { id, ok, detail };
}

const repoRoot = new URL('..', import.meta.url).pathname;
const tempRoot = mkdtempSync(join(tmpdir(), 'tgo-public-beta-opencode-'));
const tempHome = join(tempRoot, 'home');
const configDir = join(tempHome, '.config', 'opencode');
const manifestDir = join(configDir, 'tgo');
const configPath = join(configDir, 'opencode.jsonc');
const manifestPath = join(manifestDir, 'manifest.jsonc');
const originalConfig = JSON.stringify({
  $schema: 'https://opencode.ai/config.json',
  plugin: [],
  agent: { orchestrator: {}, 'user-agent': {} },
  mcp: {},
  provider: { custom: { marker: 'preserve-me' } },
});

mkdirSync(manifestDir, { recursive: true });
writeFileSync(configPath, originalConfig);
writeFileSync(
  manifestPath,
  JSON.stringify({
    schema_version: 1,
    package: { name: 'trans-genderian-orchestra', version: '2.0.0-beta.2' },
    active_presets: { tools: 'default', models: 'balanced', resilience: 'balanced' },
    managed_config: [],
    tools: [],
    backups: [],
    ignored_warnings: [],
  }),
);

const checks: CheckResult[] = [];

try {
  const npmVersion = spawnSync('npm', ['view', 'trans-genderian-orchestra@beta', 'version', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const localPackage = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
    version: string;
  };
  const publishedVersion = npmVersion.status === 0 ? JSON.parse(npmVersion.stdout) : undefined;
  checks.push(
    check(
      'npm_beta_version',
      publishedVersion === localPackage.version,
      `published=${publishedVersion ?? 'unavailable'} local=${localPackage.version}`,
    ),
  );

  const install = run(
    'opencode',
    ['plugin', 'trans-genderian-orchestra@beta', '--global', '--force'],
    { cwd: repoRoot, home: tempHome },
  );
  checks.push(check('opencode_plugin_install', install.status === 0, `exit=${install.status}`));

  const doctor = run(
    'opencode',
    [
      'run',
      '-m',
      'opencode/mimo-v2.5-free',
      '--command=tgo:doctor',
      '--format',
      'json',
      '--dir',
      repoRoot,
      '--',
      '--json',
    ],
    { cwd: repoRoot, home: tempHome },
  );

  const parsed = readJsonLines(doctor.stdout);
  const strings = collectStrings(parsed);
  const toolCommands = strings.filter((value) => value.includes('doctor'));
  const usedExpectedCommand = toolCommands.some((value) => value.includes(expectedDoctorCommand));
  const usedBdDoctor = toolCommands.some((value) => value.includes('bd doctor'));
  const hasDoctorJson = strings.some((value) => value.includes('v1-migration-available'));
  const configUnchanged = readFileSync(configPath, 'utf8') === originalConfig;

  checks.push(check('opencode_run_exit', doctor.status === 0, `exit=${doctor.status}`));
  checks.push(check('uses_tgo_npx_command', usedExpectedCommand, toolCommands.join(' | ')));
  checks.push(check('does_not_run_bd_doctor', !usedBdDoctor, toolCommands.join(' | ')));
  checks.push(check('doctor_json_present', hasDoctorJson, 'v1 migration warning detected'));
  checks.push(check('configUnchanged', configUnchanged, configPath));
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log(JSON.stringify({ checks }, null, 2));

if (checks.some((item) => !item.ok)) {
  process.exitCode = 1;
}
```

- [ ] **Step 4: Run registration test green and static checks**

Run from repository root:

```bash
bun test src/release/public-beta-opencode.test.ts
bun run typecheck
bun run check:ci
```

Expected: all pass. If Biome reports formatting changes, run:

```bash
bunx biome check package.json scripts/verify-public-beta-opencode.ts src/release/public-beta-opencode.test.ts --write
```

Then rerun the three verification commands.

- [ ] **Step 5: Commit Task 1**

Run from repository root:

```bash
git add package.json scripts/verify-public-beta-opencode.ts src/release/public-beta-opencode.test.ts
git commit -m "test: add public beta opencode smoke"
```

---

## Task 2: Document And Run Public Beta OpenCode Smoke

**Files:**

- Modify: `RELEASE.md`
- Modify: `.slim/deepwork/tgo-v2-phased-implementation.md`

- [ ] **Step 1: Add release docs for the smoke command**

Modify `RELEASE.md` under `## Disposable OpenCode validation gate` to include:

```md
Automated public beta smoke:

```bash
bun run verify:public-beta-opencode
```

Expected: installs `trans-genderian-orchestra@beta` into a disposable `HOME`, runs `/tgo:doctor --json` through OpenCode, confirms the actual command uses `npx --yes trans-genderian-orchestra@beta doctor --json`, confirms `bd doctor` is not run, confirms TGO doctor JSON is returned, and confirms the disposable config is unchanged.
```

- [ ] **Step 2: Run focused docs checks**

Run from repository root:

```bash
bun test src/release/release-readiness.test.ts src/release/public-beta-opencode.test.ts
bun run verify:release-readiness
git diff --check -- RELEASE.md
```

Expected: all pass and no whitespace errors.

- [ ] **Step 3: Run the public beta OpenCode smoke**

Run from repository root:

```bash
bun run verify:public-beta-opencode
```

Expected: JSON output with these checks all `ok: true`: `npm_beta_version`, `opencode_plugin_install`, `opencode_run_exit`, `uses_tgo_npx_command`, `does_not_run_bd_doctor`, `doctor_json_present`, `configUnchanged`.

- [ ] **Step 4: Update deepwork with validation result**

Add a short note to `.slim/deepwork/tgo-v2-phased-implementation.md` recording the successful `verify:public-beta-opencode` run and any external dependency caveat if it fails because OpenCode/npm/model access is unavailable.

- [ ] **Step 5: Commit Task 2 docs**

Run from repository root:

```bash
git add RELEASE.md
git commit -m "docs: document public beta opencode smoke"
```

---

## Task 3: Final Validation And Push

**Files:**

- No source files expected beyond previous tasks.

- [ ] **Step 1: Run final focused verification**

Run from repository root:

```bash
bun test src/release/public-beta-opencode.test.ts src/release/release-readiness.test.ts src/plugin/agents.test.ts
bun run verify:release-readiness
bun run verify:public-beta-opencode
```

Expected: all pass.

- [ ] **Step 2: Push committed validation harness and docs**

Run from repository root:

```bash
git status --short --branch
git push origin master
```

Expected: only pre-existing Beads metadata is dirty before push; push succeeds.

- [ ] **Step 3: Report remaining manual-only gate**

Report that manual interactive UI testing can wait until after this automated smoke remains green, and that manual testing still requires restarting any currently running OpenCode UI to reload plugin command definitions.

---

## Completion Criteria

- `verify:public-beta-opencode` exists and is not part of default `bun run test`.
- Smoke uses disposable HOME only and does not mutate real OpenCode config.
- Smoke asserts npm beta matches local package version.
- Smoke asserts OpenCode runs the TGO `npx` command and not `bd doctor`.
- Smoke asserts TGO doctor JSON is present and disposable config is unchanged.
- Release docs include the automated smoke command and expected outcome.
- Focused tests, release-readiness verifier, and public beta OpenCode smoke pass.
- No npm publish, GitHub release, latest tag change, or archived-v1 deletion happens during this work.
