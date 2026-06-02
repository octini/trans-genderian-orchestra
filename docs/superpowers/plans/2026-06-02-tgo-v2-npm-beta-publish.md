# TGO v2 npm Beta Publish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `trans-genderian-orchestra@2.0.0-beta.0` to npm under the `beta` dist-tag after fresh local, package, auth, and registry verification.

**Architecture:** Treat npm publish as a gated release operation rather than a normal code change. Re-run the root package validation from a clean, synced `master`; verify npm auth and registry state; inspect the exact packed artifact; stop for explicit approval before the irreversible `npm publish --tag beta`; then verify the registry and dist-tags after publish.

**Tech Stack:** Bun, TypeScript, Biome, npm registry, GitHub `origin/master`, OpenCode disposable smoke evidence from prior release-readiness/root-cutover validation.

---

## Current Facts

- Repository root is now the active TGO v2 package root.
- Root `package.json` declares `name: "trans-genderian-orchestra"` and `version: "2.0.0-beta.0"`.
- Root package metadata points to `git+ssh://git@github.com/octini/trans-genderian-orchestra.git` with no `repository.directory`.
- `origin/master` is synced with local `master` except for local Beads metadata files.
- `npm view trans-genderian-orchestra version dist-tags --json` currently returns npm `E404`, meaning the package name is not publicly published or is inaccessible with the current registry/account.
- No `latest` publish is approved by this plan.

## Release Boundaries

- Do not publish `latest`.
- Do not create an npm provenance/automation token or change npm account security settings in this plan.
- Do not create a GitHub release, PR, tag, or remote branch in this plan.
- Do not delete `archive/trans-genderian-orchestra-v1/`.
- Stop and ask the user for explicit final approval immediately before running `npm publish --tag beta`.

## File Structure

- No source or package metadata changes are expected.
- May update `.slim/deepwork/tgo-v2-phased-implementation.md` after publish with registry evidence.
- If validation exposes a small documentation mismatch, fix only that mismatch, run the affected checks, and commit it before returning to the publish checklist.

---

## Task 1: Verify Clean Local Release State

**Files:**

- No planned source changes.

- [ ] **Step 1: Check Git state**

Run from repository root:

```bash
git status --short --branch
git log --oneline -3
```

Expected:

```text
## master...origin/master
 M .beads/interactions.jsonl
 M .beads/issues.jsonl
```

The final three commits should include the root cutover push history and `docs: update root cutover README wording`. If any source, docs, package, or config files are dirty, stop and inspect them before continuing.

- [ ] **Step 2: Confirm package identity**

Run from repository root:

```bash
node -e 'const p=require("./package.json"); console.log(JSON.stringify({name:p.name, version:p.version, private:p.private, repository:p.repository, homepage:p.homepage, files:p.files}, null, 2))'
```

Expected output includes:

```json
{
  "name": "trans-genderian-orchestra",
  "version": "2.0.0-beta.0",
  "repository": {
    "type": "git",
    "url": "git+ssh://git@github.com/octini/trans-genderian-orchestra.git"
  },
  "homepage": "https://github.com/octini/trans-genderian-orchestra"
}
```

Expected: `private` is absent or `false`, and `files` contains `dist`, `MIGRATION.md`, `RELEASE.md`, `README.md`, and `LICENSE`.

---

## Task 2: Run Final Pre-Publish Verification

**Files:**

- No planned source changes.

- [ ] **Step 1: Run full root verification**

Run from repository root:

```bash
bun install --frozen-lockfile
bun test
bun run typecheck
bun run check:ci
bun run build
bun run verify:release-readiness
```

Expected:

- `bun install --frozen-lockfile` exits 0 without changing `bun.lock`.
- `bun test` exits 0 and ignores `archive/` through the package script.
- `bun run typecheck` exits 0.
- `bun run check:ci` exits 0.
- `bun run build` exits 0 and writes `dist/` artifacts.
- `bun run verify:release-readiness` prints checks `required_files`, `repository_root`, `package_files`, and `approval_boundaries`, all with `ok: true`.

- [ ] **Step 2: Confirm no tracked files changed from verification**

Run from repository root:

```bash
git status --short --branch
```

Expected: only `.beads/interactions.jsonl` and `.beads/issues.jsonl` are dirty. If `dist/` appears, confirm it is ignored and not staged.

---

## Task 3: Inspect npm Registry And Account State

**Files:**

- No planned source changes.

- [ ] **Step 1: Confirm npm registry**

Run from repository root:

```bash
npm config get registry
```

Expected:

```text
https://registry.npmjs.org/
```

If another registry is configured, stop and ask the user before changing npm config.

- [ ] **Step 2: Confirm npm login**

Run from repository root:

```bash
npm whoami
```

Expected: prints the npm username authorized to publish this package. If it fails with `ENEEDAUTH`, ask the user to run `npm login` in the terminal and then rerun this step.

- [ ] **Step 3: Confirm package name remains unpublished**

Run from repository root:

```bash
npm view trans-genderian-orchestra version dist-tags --json
```

Expected: npm `E404 Not Found`, because this is the first publish for the package name. If a version or dist-tags are returned, stop and compare them to `package.json` before continuing.

---

## Task 4: Inspect The Exact Publish Artifact

**Files:**

- No planned source changes.

- [ ] **Step 1: Generate npm dry-run JSON**

Run from repository root:

```bash
npm pack --dry-run --json > /tmp/tgo-v2-npm-pack-dry-run.json
node -e 'const fs=require("node:fs"); const pack=JSON.parse(fs.readFileSync("/tmp/tgo-v2-npm-pack-dry-run.json","utf8"))[0]; console.log(JSON.stringify({name:pack.name, version:pack.version, filename:pack.filename, files:pack.files.map((f)=>f.path).sort()}, null, 2));'
```

Expected:

- `name` is `trans-genderian-orchestra`.
- `version` is `2.0.0-beta.0`.
- `files` includes `package.json`, `README.md`, `MIGRATION.md`, `RELEASE.md`, `LICENSE`, `dist/index.js`, `dist/index.d.ts`, `dist/cli/index.js`, and `dist/cli/index.d.ts`.
- `files` does not include `archive/`, `.beads/`, `.slim/`, `.worktrees/`, `docs/`, or source test files.

- [ ] **Step 2: Run npm publish dry-run**

Run from repository root:

```bash
npm publish --tag beta --dry-run
```

Expected: exits 0 and reports the package that would be published. It must not publish to the registry because `--dry-run` is present.

---

## Task 5: Final Approval Gate And Beta Publish

**Files:**

- No planned source changes.

- [ ] **Step 1: Ask for final publish approval**

Stop and ask the user this exact question:

```text
Final npm beta publish gate is ready. May I run `npm publish --tag beta` for trans-genderian-orchestra@2.0.0-beta.0?
```

Expected: do not proceed unless the user explicitly approves publishing.

- [ ] **Step 2: Publish beta**

Only after approval, run from repository root:

```bash
npm publish --tag beta
```

Expected: exits 0 and publishes `trans-genderian-orchestra@2.0.0-beta.0` with the `beta` dist-tag. If npm reports an OTP requirement, provide the OTP prompt to the user and rerun only with the user-provided OTP using:

```bash
npm publish --tag beta --otp <otp-from-user>
```

Do not write the OTP into any file or command history artifact.

---

## Task 6: Verify Registry State After Publish

**Files:**

- May update `.slim/deepwork/tgo-v2-phased-implementation.md` with publish evidence.

- [ ] **Step 1: Verify npm version and dist-tags**

Run from repository root:

```bash
npm view trans-genderian-orchestra version dist-tags --json
```

Expected output includes:

```json
{
  "version": "2.0.0-beta.0",
  "dist-tags": {
    "beta": "2.0.0-beta.0"
  }
}
```

Expected: `latest` is absent or does not point to `2.0.0-beta.0` unless npm automatically sets it for a first publish. If npm sets `latest` unexpectedly, stop and ask the user before running any dist-tag correction.

- [ ] **Step 2: Verify beta install metadata**

Run from repository root:

```bash
npm view trans-genderian-orchestra@beta name version repository homepage bin --json
```

Expected: name `trans-genderian-orchestra`, version `2.0.0-beta.0`, repository URL `git+ssh://git@github.com/octini/trans-genderian-orchestra.git`, homepage `https://github.com/octini/trans-genderian-orchestra`, and bin entry `trans-genderian-orchestra: ./dist/cli/index.js`.

- [ ] **Step 3: Record publish evidence in deepwork**

Update `.slim/deepwork/tgo-v2-phased-implementation.md` with:

```md
## npm Beta Publish Summary

- Published `trans-genderian-orchestra@2.0.0-beta.0` with npm dist-tag `beta`.
- Pre-publish verification passed: `bun test`, `bun run typecheck`, `bun run check:ci`, `bun run build`, `bun run verify:release-readiness`, `npm pack --dry-run --json`, and `npm publish --tag beta --dry-run`.
- Post-publish verification confirmed npm registry version `2.0.0-beta.0` and `beta` dist-tag.
- No `latest` publish, GitHub release, PR, remote rewrite, or archived v1 deletion was performed.
```

- [ ] **Step 4: Final local status check**

Run from repository root:

```bash
git status --short --branch
```

Expected: `master` remains synced with `origin/master`; only `.beads/interactions.jsonl` and `.beads/issues.jsonl` are dirty unless the deepwork file is visible as ignored local coordination state.

---

## Completion Criteria

- Pre-publish local verification passes from repository root.
- npm registry and account are verified before publish.
- Dry-run package contents are inspected and exclude archive/source/coordination noise.
- User explicitly approves the real publish command after dry-run evidence.
- `trans-genderian-orchestra@2.0.0-beta.0` is published under npm dist-tag `beta`.
- npm registry verification confirms the beta version and package metadata.
- No `latest` publish, GitHub release, PR, remote rewrite, or archived v1 deletion is performed.
