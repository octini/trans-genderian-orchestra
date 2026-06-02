# TGO v2 Phase 1 Bootstrap Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the blank-slate `trans-genderian-orchestra-v2/` package skeleton and deterministic bootstrap/doctor/config/manifest foundation for TGO v2.

**Architecture:** Phase 1 creates a new isolated package with a plugin entrypoint, external `bootstrap` CLI, shared deterministic command result contract, manifest/backup logic, OpenCode config merge/preview/apply logic, and read-only doctor checks. All real filesystem/config/process behavior goes through injectable adapters so tests can run against temp fixtures without touching the user’s global OpenCode config.

**Tech Stack:** TypeScript, Bun, `@opencode-ai/plugin`, `zod`, Node filesystem/path APIs, Biome, JSONC-preserving config utilities implemented locally for Phase 1.

---

## Source Specs

- `designs/tgo-v2/specs/00-umbrella-architecture.md`
- `designs/tgo-v2/specs/02-bootstrap-setup-doctor-manifests.md`
- `designs/tgo-v2/specs/03-tools-skills-mcps-integrations.md`
- `designs/tgo-v2/specs/07-implementation-phases-validation-gates.md`
- `designs/tgo-v2-settled-decisions.md`

## Phase 1 Scope Boundary

In scope:

- New blank-slate package at `trans-genderian-orchestra-v2/`.
- Plugin entrypoint that registers minimal namespaced TGO agents and command metadata.
- External CLI with `bootstrap` and `doctor` subcommands.
- Shared deterministic command result contract with `--json` support.
- Manifest read/write helpers for global and project manifests.
- Timestamped backup helper.
- OpenCode config parse/merge/preview/apply helper.
- Secret-like value scanner for TGO-managed config surfaces.
- Bootstrap dry-run/apply planner for default tools/models/resilience.
- Read-only doctor checks for manifest/config/tool drift and degraded capabilities.
- Unit/integration tests using temp HOME/config fixtures only.

Out of scope:

- Full orchestrator prompt and final agent workflow.
- Beads issue generation and `/tgo:work`.
- Parallel Builder scheduling and integration worktrees.
- Context7 OAuth execution.
- Real installation of AFT, `opencode-beads`, Serena, GitHub MCP, or system CLIs.
- V1 migration apply behavior beyond detection/reporting.

## Reuse Justification

No v1 source module should be copied wholesale in Phase 1.

Approved reference-only reuse:

- `trans-genderian-orchestra/package.json`: reuse Bun/TypeScript build conventions and package metadata shape. Checked assumption: v2 also targets ESM Node output and OpenCode plugin package distribution. V2 tests cover CLI/build entrypoints directly.
- `trans-genderian-orchestra/tsconfig.json`: reuse strict TypeScript compiler shape. Checked assumption: v2 source root remains `src`, generated declarations go to `dist`. V2 typecheck covers the new package.
- `trans-genderian-orchestra/biome.json`: reuse formatting/lint style. Checked assumption: v2 wants same Biome conventions. V2 `bun run check:ci` covers formatting/lint compatibility.

If an implementer copies any v1 source module later, they must add a new reuse justification before doing so.

## File Structure

Create these files:

- `trans-genderian-orchestra-v2/package.json`: package metadata, scripts, bin, exports, dependencies.
- `trans-genderian-orchestra-v2/tsconfig.json`: strict TypeScript compiler config.
- `trans-genderian-orchestra-v2/biome.json`: local lint/format config.
- `trans-genderian-orchestra-v2/README.md`: minimal v2 beta package notes.
- `trans-genderian-orchestra-v2/src/index.ts`: OpenCode plugin entrypoint.
- `trans-genderian-orchestra-v2/src/plugin/agents.ts`: minimal namespaced agent definitions.
- `trans-genderian-orchestra-v2/src/plugin/commands.ts`: minimal command metadata.
- `trans-genderian-orchestra-v2/src/cli/index.ts`: external CLI entrypoint.
- `trans-genderian-orchestra-v2/src/cli/args.ts`: CLI argument parser.
- `trans-genderian-orchestra-v2/src/commands/result.ts`: deterministic command result types and helpers.
- `trans-genderian-orchestra-v2/src/commands/bootstrap.ts`: bootstrap dry-run/apply orchestration.
- `trans-genderian-orchestra-v2/src/commands/doctor.ts`: read-only doctor orchestration.
- `trans-genderian-orchestra-v2/src/config/opencode-config.ts`: OpenCode config parse/merge/serialize helpers.
- `trans-genderian-orchestra-v2/src/config/managed-entries.ts`: TGO-managed config entry planning.
- `trans-genderian-orchestra-v2/src/filesystem/adapter.ts`: injectable filesystem adapter interface and real implementation.
- `trans-genderian-orchestra-v2/src/filesystem/memory-adapter.ts`: in-memory filesystem for tests.
- `trans-genderian-orchestra-v2/src/manifest/schema.ts`: manifest types and defaults.
- `trans-genderian-orchestra-v2/src/manifest/store.ts`: manifest read/write/update helpers.
- `trans-genderian-orchestra-v2/src/backup/store.ts`: timestamped backup helper.
- `trans-genderian-orchestra-v2/src/tools/detect.ts`: injectable tool detector.
- `trans-genderian-orchestra-v2/src/security/secrets.ts`: secret-like string scanner/redactor.
- `trans-genderian-orchestra-v2/src/testing/fixtures.ts`: shared test fixtures.
- `trans-genderian-orchestra-v2/src/**/*.test.ts`: tests listed per task below.

## Task 1: Create Blank-Slate Package Skeleton

**Files:**

- Create: `trans-genderian-orchestra-v2/package.json`
- Create: `trans-genderian-orchestra-v2/tsconfig.json`
- Create: `trans-genderian-orchestra-v2/biome.json`
- Create: `trans-genderian-orchestra-v2/README.md`
- Create: `trans-genderian-orchestra-v2/src/index.ts`
- Create: `trans-genderian-orchestra-v2/src/cli/index.ts`
- Test: shell commands in steps

- [ ] **Step 1: Create package metadata**

Create `trans-genderian-orchestra-v2/package.json` with this content:

```json
{
  "name": "trans-genderian-orchestra",
  "version": "2.0.0-beta.0",
  "description": "TGO v2 OpenCode engineering workflow plugin",
  "type": "module",
  "license": "MIT",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "bin": {
    "trans-genderian-orchestra": "./dist/cli/index.js"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "clean:dist": "bun -e \"import { rmSync } from 'node:fs'; rmSync('dist', { recursive: true, force: true })\"",
    "build:plugin": "bun build src/index.ts --outdir dist --target node --format esm --external @opencode-ai/plugin --external zod",
    "build:cli": "bun build src/cli/index.ts --outdir dist/cli --target node --format esm --external zod",
    "build": "bun run clean:dist && bun run build:plugin && bun run build:cli && tsc --emitDeclarationOnly",
    "typecheck": "tsc --noEmit",
    "test": "bun test",
    "lint": "biome lint .",
    "format": "biome format . --write",
    "check:ci": "biome check ."
  },
  "dependencies": {
    "@opencode-ai/plugin": "^1.3.17",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@biomejs/biome": "2.4.11",
    "@types/node": "^24.6.1",
    "bun-types": "1.3.12",
    "typescript": "^5.9.3"
  },
  "peerDependencies": {
    "zod": "^4.0.0"
  }
}
```

- [ ] **Step 2: Create TypeScript config**

Create `trans-genderian-orchestra-v2/tsconfig.json` with this content:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationDir": "./dist",
    "emitDeclarationOnly": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["bun-types"],
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

- [ ] **Step 3: Create Biome config**

Create `trans-genderian-orchestra-v2/biome.json` with this content:

```json
{
  "assist": { "actions": { "source": { "organizeImports": "on" } } },
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "warn"
      }
    }
  },
  "overrides": [
    {
      "includes": ["**/*.test.ts"],
      "linter": {
        "rules": {
          "suspicious": {
            "noExplicitAny": "off"
          }
        }
      }
    }
  ],
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineEnding": "lf",
    "lineWidth": 80
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all"
    }
  }
}
```

- [ ] **Step 4: Create minimal README**

Create `trans-genderian-orchestra-v2/README.md` with this content:

```md
# trans-genderian-orchestra v2

TGO v2 is the blank-slate implementation of the OpenCode engineering workflow plugin.

This package is in beta design/implementation and is developed in this subfolder until release cutover moves the package to the repository root.

Phase 1 includes only the deterministic bootstrap, doctor, manifest, backup, and config foundation.
```

- [ ] **Step 5: Create minimal plugin entrypoint**

Create `trans-genderian-orchestra-v2/src/index.ts` with this content:

```ts
import type { Plugin } from '@opencode-ai/plugin';

const plugin: Plugin = async () => {
  return {
    config(config) {
      config.agent = {
        ...config.agent,
        'tgo-orchestrator': {
          description:
            'TGO Orchestrator: technical lead, phase controller, and workflow router.',
          mode: 'primary',
          prompt:
            'You are the TGO v2 Orchestrator. Phase 1 only registers the agent shell; full workflow behavior is implemented in later phases.',
        },
      };
      config.command = {
        ...config.command,
        'tgo:doctor': {
          description: 'Inspect TGO v2 setup state and report repairs.',
          prompt:
            'Run the deterministic TGO doctor workflow. In Phase 1, use the external CLI doctor command for authoritative checks.',
        },
      };
    },
  };
};

export default plugin;
```

- [ ] **Step 6: Create temporary CLI entrypoint**

Create `trans-genderian-orchestra-v2/src/cli/index.ts` with this content:

```ts
#!/usr/bin/env bun

console.log('TGO v2 CLI skeleton. Bootstrap and doctor are added in Phase 1 tasks.');
```

- [ ] **Step 7: Run skeleton checks**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun install
cd trans-genderian-orchestra-v2 && bun run typecheck
cd trans-genderian-orchestra-v2 && bun run build
```

Expected:

- `bun install` creates `bun.lock` in `trans-genderian-orchestra-v2/`.
- `bun run typecheck` exits 0.
- `bun run build` exits 0 and creates `dist/index.js` and `dist/cli/index.js`.

- [ ] **Step 8: Commit skeleton**

Run:

```bash
git add trans-genderian-orchestra-v2/package.json trans-genderian-orchestra-v2/bun.lock trans-genderian-orchestra-v2/tsconfig.json trans-genderian-orchestra-v2/biome.json trans-genderian-orchestra-v2/README.md trans-genderian-orchestra-v2/src/index.ts trans-genderian-orchestra-v2/src/cli/index.ts
git commit -m "feat: scaffold tgo v2 package"
```

Expected: commit succeeds and contains only the new v2 skeleton files.

## Task 2: Add Deterministic Command Result Contract

**Files:**

- Create: `trans-genderian-orchestra-v2/src/commands/result.ts`
- Test: `trans-genderian-orchestra-v2/src/commands/result.test.ts`

- [ ] **Step 1: Write result contract tests**

Create `trans-genderian-orchestra-v2/src/commands/result.test.ts` with this content:

```ts
import { describe, expect, test } from 'bun:test';
import {
  createEmptyCommandResult,
  markRestartRequired,
  pushWarning,
} from './result';

describe('deterministic command result contract', () => {
  test('creates all required top-level arrays and flags', () => {
    const result = createEmptyCommandResult('bootstrap', 'dry-run');

    expect(result.command).toBe('bootstrap');
    expect(result.mode).toBe('dry-run');
    expect(result.planned_actions).toEqual([]);
    expect(result.changes_applied).toEqual([]);
    expect(result.backups_created).toEqual([]);
    expect(result.manifest_updates).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.blocked_capabilities).toEqual([]);
    expect(result.degraded_capabilities).toEqual([]);
    expect(result.restart_required).toBe(false);
    expect(result.next_steps).toEqual([]);
  });

  test('warning helper appends stable warning entries', () => {
    const result = createEmptyCommandResult('doctor', 'read-only');

    pushWarning(result, {
      code: 'missing-bd',
      message: 'Beads CLI is not installed.',
      severity: 'warning',
    });

    expect(result.warnings).toEqual([
      {
        code: 'missing-bd',
        message: 'Beads CLI is not installed.',
        severity: 'warning',
      },
    ]);
  });

  test('restart helper records restart requirement once', () => {
    const result = createEmptyCommandResult('bootstrap', 'apply');

    markRestartRequired(result, 'OpenCode config changed.');
    markRestartRequired(result, 'OpenCode config changed.');

    expect(result.restart_required).toBe(true);
    expect(result.next_steps).toEqual(['Restart OpenCode: OpenCode config changed.']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun test src/commands/result.test.ts
```

Expected: FAIL because `src/commands/result.ts` does not exist.

- [ ] **Step 3: Implement result contract**

Create `trans-genderian-orchestra-v2/src/commands/result.ts` with this content:

```ts
export type CommandName = 'bootstrap' | 'doctor' | 'setup' | 'uninstall' | 'init';

export type CommandMode = 'dry-run' | 'apply' | 'read-only' | 'repair';

export type Severity = 'info' | 'warning' | 'error';

export interface CommandNotice {
  code: string;
  message: string;
  severity: Severity;
}

export interface PlannedAction {
  id: string;
  title: string;
  target: string;
  action: 'create' | 'update' | 'remove' | 'check' | 'install' | 'adopt';
  requires_confirmation: boolean;
}

export interface AppliedChange {
  id: string;
  title: string;
  target: string;
}

export interface BackupRecord {
  id: string;
  path: string;
  source_path: string;
}

export interface ManifestUpdate {
  path: string;
  key: string;
  value_summary: string;
}

export interface CapabilityStatus {
  capability: string;
  reason: string;
  repair_command?: string;
}

export interface DeterministicCommandResult {
  command: CommandName;
  mode: CommandMode;
  planned_actions: PlannedAction[];
  changes_applied: AppliedChange[];
  backups_created: BackupRecord[];
  manifest_updates: ManifestUpdate[];
  warnings: CommandNotice[];
  blocked_capabilities: CapabilityStatus[];
  degraded_capabilities: CapabilityStatus[];
  restart_required: boolean;
  next_steps: string[];
}

export function createEmptyCommandResult(
  command: CommandName,
  mode: CommandMode,
): DeterministicCommandResult {
  return {
    command,
    mode,
    planned_actions: [],
    changes_applied: [],
    backups_created: [],
    manifest_updates: [],
    warnings: [],
    blocked_capabilities: [],
    degraded_capabilities: [],
    restart_required: false,
    next_steps: [],
  };
}

export function pushWarning(
  result: DeterministicCommandResult,
  warning: CommandNotice,
): void {
  result.warnings.push(warning);
}

export function markRestartRequired(
  result: DeterministicCommandResult,
  reason: string,
): void {
  result.restart_required = true;
  const step = `Restart OpenCode: ${reason}`;
  if (!result.next_steps.includes(step)) {
    result.next_steps.push(step);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun test src/commands/result.test.ts
```

Expected: PASS with 3 tests.

- [ ] **Step 5: Commit result contract**

Run:

```bash
git add trans-genderian-orchestra-v2/src/commands/result.ts trans-genderian-orchestra-v2/src/commands/result.test.ts
git commit -m "feat: add deterministic command result contract"
```

Expected: commit succeeds.

## Task 3: Add Filesystem Adapters For Fixture-Safe Tests

**Files:**

- Create: `trans-genderian-orchestra-v2/src/filesystem/adapter.ts`
- Create: `trans-genderian-orchestra-v2/src/filesystem/memory-adapter.ts`
- Test: `trans-genderian-orchestra-v2/src/filesystem/memory-adapter.test.ts`

- [ ] **Step 1: Write in-memory filesystem tests**

Create `trans-genderian-orchestra-v2/src/filesystem/memory-adapter.test.ts` with this content:

```ts
import { describe, expect, test } from 'bun:test';
import { createMemoryFileSystem } from './memory-adapter';

describe('memory filesystem adapter', () => {
  test('reads and writes normalized absolute paths', async () => {
    const fs = createMemoryFileSystem({ '/home/user/.config/opencode/opencode.jsonc': '{}' });

    expect(await fs.exists('/home/user/.config/opencode/opencode.jsonc')).toBe(true);
    expect(await fs.readText('/home/user/.config/opencode/opencode.jsonc')).toBe('{}');

    await fs.writeText('/home/user/.config/opencode/tgo/manifest.jsonc', '{"version":1}');

    expect(await fs.readText('/home/user/.config/opencode/tgo/manifest.jsonc')).toBe('{"version":1}');
  });

  test('lists files under a directory prefix', async () => {
    const fs = createMemoryFileSystem({
      '/repo/a.txt': 'a',
      '/repo/nested/b.txt': 'b',
      '/other/c.txt': 'c',
    });

    expect(await fs.listFiles('/repo')).toEqual(['/repo/a.txt', '/repo/nested/b.txt']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun test src/filesystem/memory-adapter.test.ts
```

Expected: FAIL because filesystem adapter files do not exist.

- [ ] **Step 3: Implement filesystem adapter interface**

Create `trans-genderian-orchestra-v2/src/filesystem/adapter.ts` with this content:

```ts
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

export interface FileSystemAdapter {
  exists(path: string): Promise<boolean>;
  readText(path: string): Promise<string>;
  writeText(path: string, content: string): Promise<void>;
  listFiles(path: string): Promise<string[]>;
}

async function listFilesRecursive(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = join(path, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(entryPath)));
    } else if (entry.isFile()) {
      files.push(resolve(entryPath));
    }
  }

  return files.sort();
}

export function createNodeFileSystem(): FileSystemAdapter {
  return {
    async exists(path) {
      try {
        await stat(path);
        return true;
      } catch {
        return false;
      }
    },
    async readText(path) {
      return readFile(path, 'utf8');
    },
    async writeText(path, content) {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content, 'utf8');
    },
    async listFiles(path) {
      if (!(await this.exists(path))) {
        return [];
      }
      return listFilesRecursive(path);
    },
  };
}
```

- [ ] **Step 4: Implement memory adapter**

Create `trans-genderian-orchestra-v2/src/filesystem/memory-adapter.ts` with this content:

```ts
import { resolve } from 'node:path';
import type { FileSystemAdapter } from './adapter';

function normalize(path: string): string {
  return resolve('/', path).replaceAll('\\', '/');
}

export function createMemoryFileSystem(
  initialFiles: Record<string, string> = {},
): FileSystemAdapter & { snapshot(): Record<string, string> } {
  const files = new Map<string, string>();

  for (const [path, content] of Object.entries(initialFiles)) {
    files.set(normalize(path), content);
  }

  return {
    async exists(path) {
      const normalized = normalize(path);
      if (files.has(normalized)) {
        return true;
      }
      const prefix = `${normalized}/`;
      return Array.from(files.keys()).some((filePath) => filePath.startsWith(prefix));
    },
    async readText(path) {
      const normalized = normalize(path);
      const content = files.get(normalized);
      if (content === undefined) {
        throw new Error(`File not found: ${normalized}`);
      }
      return content;
    },
    async writeText(path, content) {
      files.set(normalize(path), content);
    },
    async listFiles(path) {
      const normalized = normalize(path);
      const prefix = `${normalized}/`;
      return Array.from(files.keys())
        .filter((filePath) => filePath.startsWith(prefix))
        .sort();
    },
    snapshot() {
      return Object.fromEntries(Array.from(files.entries()).sort());
    },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun test src/filesystem/memory-adapter.test.ts
```

Expected: PASS with 2 tests.

- [ ] **Step 6: Commit filesystem adapters**

Run:

```bash
git add trans-genderian-orchestra-v2/src/filesystem
git commit -m "feat: add fixture-safe filesystem adapters"
```

Expected: commit succeeds.

## Task 4: Add Secret Scanner

**Files:**

- Create: `trans-genderian-orchestra-v2/src/security/secrets.ts`
- Test: `trans-genderian-orchestra-v2/src/security/secrets.test.ts`

- [ ] **Step 1: Write secret scanner tests**

Create `trans-genderian-orchestra-v2/src/security/secrets.test.ts` with this content:

```ts
import { describe, expect, test } from 'bun:test';
import { findSecretLikeValues, redactSecretLikeValues } from './secrets';

describe('secret scanner', () => {
  test('detects token-like values in config text', () => {
    const text = '{"headers":{"Authorization":"Bearer ghp_1234567890abcdef1234567890abcdef1234"}}';

    expect(findSecretLikeValues(text)).toEqual([
      {
        kind: 'github_token',
        match: 'ghp_1234567890abcdef1234567890abcdef1234',
      },
    ]);
  });

  test('does not flag environment variable references', () => {
    const text = '{"headers":{"Authorization":"Bearer {env:GITHUB_PERSONAL_ACCESS_TOKEN}"}}';

    expect(findSecretLikeValues(text)).toEqual([]);
  });

  test('redacts secret-like values', () => {
    const text = 'token=github_pat_abcdefghijklmnopqrstuvwxyz_1234567890';

    expect(redactSecretLikeValues(text)).toBe('token=[REDACTED:github_token]');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun test src/security/secrets.test.ts
```

Expected: FAIL because `src/security/secrets.ts` does not exist.

- [ ] **Step 3: Implement secret scanner**

Create `trans-genderian-orchestra-v2/src/security/secrets.ts` with this content:

```ts
export interface SecretMatch {
  kind: 'github_token' | 'generic_assignment';
  match: string;
}

const secretPatterns: Array<{ kind: SecretMatch['kind']; pattern: RegExp }> = [
  { kind: 'github_token', pattern: /ghp_[A-Za-z0-9_]{30,}/g },
  { kind: 'github_token', pattern: /github_pat_[A-Za-z0-9_]{30,}/g },
  {
    kind: 'generic_assignment',
    pattern: /(?:api[_-]?key|secret|token|password)\s*=\s*['"]?[A-Za-z0-9_./+=-]{24,}/gi,
  },
];

export function findSecretLikeValues(text: string): SecretMatch[] {
  const matches: SecretMatch[] = [];

  for (const { kind, pattern } of secretPatterns) {
    for (const match of text.matchAll(pattern)) {
      const value = match[0];
      if (value.includes('{env:')) {
        continue;
      }
      matches.push({ kind, match: value });
    }
  }

  return matches;
}

export function redactSecretLikeValues(text: string): string {
  let redacted = text;
  for (const secret of findSecretLikeValues(text)) {
    redacted = redacted.replaceAll(secret.match, `[REDACTED:${secret.kind}]`);
  }
  return redacted;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun test src/security/secrets.test.ts
```

Expected: PASS with 3 tests.

- [ ] **Step 5: Commit secret scanner**

Run:

```bash
git add trans-genderian-orchestra-v2/src/security
git commit -m "feat: add secret-safe config scanner"
```

Expected: commit succeeds.

## Task 5: Add Manifest Schema And Store

**Files:**

- Create: `trans-genderian-orchestra-v2/src/manifest/schema.ts`
- Create: `trans-genderian-orchestra-v2/src/manifest/store.ts`
- Test: `trans-genderian-orchestra-v2/src/manifest/store.test.ts`

- [ ] **Step 1: Write manifest store tests**

Create `trans-genderian-orchestra-v2/src/manifest/store.test.ts` with this content:

```ts
import { describe, expect, test } from 'bun:test';
import { createMemoryFileSystem } from '../filesystem/memory-adapter';
import { createDefaultManifest } from './schema';
import { readManifest, writeManifest } from './store';

describe('manifest store', () => {
  test('returns default manifest when file is missing', async () => {
    const fs = createMemoryFileSystem();

    const manifest = await readManifest(fs, '/home/user/.config/opencode/tgo/manifest.jsonc');

    expect(manifest.schema_version).toBe(1);
    expect(manifest.package.name).toBe('trans-genderian-orchestra');
    expect(manifest.active_presets).toEqual({
      tools: 'default',
      models: 'balanced',
      resilience: 'balanced',
    });
  });

  test('writes stable JSONC-compatible manifest JSON', async () => {
    const fs = createMemoryFileSystem();
    const manifest = createDefaultManifest();
    manifest.managed_config.push({ kind: 'agent', key: 'agent.tgo-orchestrator' });

    await writeManifest(fs, '/home/user/.config/opencode/tgo/manifest.jsonc', manifest);

    const written = await fs.readText('/home/user/.config/opencode/tgo/manifest.jsonc');
    expect(JSON.parse(written).managed_config).toEqual([
      { kind: 'agent', key: 'agent.tgo-orchestrator' },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun test src/manifest/store.test.ts
```

Expected: FAIL because manifest files do not exist.

- [ ] **Step 3: Implement manifest schema**

Create `trans-genderian-orchestra-v2/src/manifest/schema.ts` with this content:

```ts
export type ToolPreset = 'bare-bones' | 'default' | 'all-bells';
export type ModelPreset = 'balanced' | string;
export type ResiliencePreset = 'conservative' | 'balanced' | 'aggressive';

export interface ManagedConfigEntry {
  kind: 'agent' | 'mcp' | 'plugin' | 'command' | 'default_agent';
  key: string;
}

export interface ToolStatus {
  name: string;
  status: 'user-managed' | 'tgo-installed' | 'missing' | 'degraded';
  version?: string;
}

export interface BackupManifestRecord {
  operation_id: string;
  created_at: string;
  path: string;
  source_path: string;
}

export interface TgoManifest {
  schema_version: 1;
  package: {
    name: 'trans-genderian-orchestra';
    version: string;
  };
  active_presets: {
    tools: ToolPreset;
    models: ModelPreset;
    resilience: ResiliencePreset;
  };
  managed_config: ManagedConfigEntry[];
  tools: ToolStatus[];
  backups: BackupManifestRecord[];
  ignored_warnings: Array<{
    code: string;
    scope: 'global' | 'project';
    reason: string;
    expires_at?: string;
  }>;
  last_verification?: {
    checked_at: string;
    status: 'clean' | 'warnings' | 'blocked';
  };
}

export function createDefaultManifest(): TgoManifest {
  return {
    schema_version: 1,
    package: {
      name: 'trans-genderian-orchestra',
      version: '2.0.0-beta.0',
    },
    active_presets: {
      tools: 'default',
      models: 'balanced',
      resilience: 'balanced',
    },
    managed_config: [],
    tools: [],
    backups: [],
    ignored_warnings: [],
  };
}
```

- [ ] **Step 4: Implement manifest store**

Create `trans-genderian-orchestra-v2/src/manifest/store.ts` with this content:

```ts
import type { FileSystemAdapter } from '../filesystem/adapter';
import { createDefaultManifest, type TgoManifest } from './schema';

export async function readManifest(
  fs: FileSystemAdapter,
  path: string,
): Promise<TgoManifest> {
  if (!(await fs.exists(path))) {
    return createDefaultManifest();
  }
  const text = await fs.readText(path);
  return { ...createDefaultManifest(), ...JSON.parse(text) } as TgoManifest;
}

export async function writeManifest(
  fs: FileSystemAdapter,
  path: string,
  manifest: TgoManifest,
): Promise<void> {
  await fs.writeText(path, `${JSON.stringify(manifest, null, 2)}\n`);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun test src/manifest/store.test.ts
```

Expected: PASS with 2 tests.

- [ ] **Step 6: Commit manifest store**

Run:

```bash
git add trans-genderian-orchestra-v2/src/manifest
git commit -m "feat: add tgo manifest store"
```

Expected: commit succeeds.

## Task 6: Add Timestamped Backup Store

**Files:**

- Create: `trans-genderian-orchestra-v2/src/backup/store.ts`
- Test: `trans-genderian-orchestra-v2/src/backup/store.test.ts`

- [ ] **Step 1: Write backup tests**

Create `trans-genderian-orchestra-v2/src/backup/store.test.ts` with this content:

```ts
import { describe, expect, test } from 'bun:test';
import { createMemoryFileSystem } from '../filesystem/memory-adapter';
import { createBackup } from './store';

describe('backup store', () => {
  test('creates timestamped backup before config writes', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/opencode.jsonc': '{"plugin":[]}',
    });

    const backup = await createBackup(fs, {
      backupRoot: '/home/user/.config/opencode/tgo/backups',
      operationId: 'op-123',
      sourcePath: '/home/user/.config/opencode/opencode.jsonc',
      timestamp: '2026-06-02T10-00-00-000Z',
    });

    expect(backup.path).toBe(
      '/home/user/.config/opencode/tgo/backups/2026-06-02T10-00-00-000Z-op-123/opencode.jsonc',
    );
    expect(await fs.readText(backup.path)).toBe('{"plugin":[]}');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun test src/backup/store.test.ts
```

Expected: FAIL because backup store does not exist.

- [ ] **Step 3: Implement backup store**

Create `trans-genderian-orchestra-v2/src/backup/store.ts` with this content:

```ts
import { basename, join } from 'node:path';
import type { FileSystemAdapter } from '../filesystem/adapter';
import type { BackupRecord } from '../commands/result';

export interface CreateBackupInput {
  backupRoot: string;
  operationId: string;
  sourcePath: string;
  timestamp: string;
}

export async function createBackup(
  fs: FileSystemAdapter,
  input: CreateBackupInput,
): Promise<BackupRecord> {
  const content = await fs.readText(input.sourcePath);
  const backupPath = join(
    input.backupRoot,
    `${input.timestamp}-${input.operationId}`,
    basename(input.sourcePath),
  );
  await fs.writeText(backupPath, content);
  return {
    id: input.operationId,
    path: backupPath.replaceAll('\\', '/'),
    source_path: input.sourcePath.replaceAll('\\', '/'),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun test src/backup/store.test.ts
```

Expected: PASS with 1 test.

- [ ] **Step 5: Commit backup store**

Run:

```bash
git add trans-genderian-orchestra-v2/src/backup
git commit -m "feat: add manifest-linked backup store"
```

Expected: commit succeeds.

## Task 7: Add OpenCode Config Parse And Merge Helpers

**Files:**

- Create: `trans-genderian-orchestra-v2/src/config/opencode-config.ts`
- Create: `trans-genderian-orchestra-v2/src/config/managed-entries.ts`
- Test: `trans-genderian-orchestra-v2/src/config/opencode-config.test.ts`

- [ ] **Step 1: Write config merge tests**

Create `trans-genderian-orchestra-v2/src/config/opencode-config.test.ts` with this content:

```ts
import { describe, expect, test } from 'bun:test';
import { planDefaultManagedEntries } from './managed-entries';
import { applyManagedEntries, parseOpenCodeConfig } from './opencode-config';

describe('OpenCode config helpers', () => {
  test('parses empty or missing config into safe defaults', () => {
    expect(parseOpenCodeConfig('')).toEqual({});
    expect(parseOpenCodeConfig('{"plugin":[]}')).toEqual({ plugin: [] });
  });

  test('adds TGO managed entries without removing user entries', () => {
    const config = parseOpenCodeConfig(
      '{"plugin":["user-plugin"],"mcp":{"user-mcp":{"type":"local","command":["echo","ok"]}},"provider":{"anthropic":{}}}',
    );

    const result = applyManagedEntries(config, planDefaultManagedEntries());

    expect(result.config.plugin).toContain('user-plugin');
    expect(result.config.plugin).toContain('trans-genderian-orchestra@2.0.0-beta.0');
    expect(result.config.plugin).toContain('opencode-beads@0.7.0');
    expect(result.config.mcp?.['user-mcp']).toEqual({
      type: 'local',
      command: ['echo', 'ok'],
    });
    expect(result.config.mcp?.['tgo-websearch']).toBeDefined();
    expect(result.config.default_agent).toBe('tgo-orchestrator');
    expect(result.warnings).toEqual([]);
  });

  test('warns before replacing existing default_agent', () => {
    const config = parseOpenCodeConfig('{"default_agent":"my-agent"}');

    const result = applyManagedEntries(config, planDefaultManagedEntries());

    expect(result.config.default_agent).toBe('tgo-orchestrator');
    expect(result.warnings).toEqual([
      {
        code: 'default-agent-conflict',
        message: 'default_agent will change from my-agent to tgo-orchestrator.',
        severity: 'warning',
      },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun test src/config/opencode-config.test.ts
```

Expected: FAIL because config helpers do not exist.

- [ ] **Step 3: Implement managed entries**

Create `trans-genderian-orchestra-v2/src/config/managed-entries.ts` with this content:

```ts
export interface ManagedEntries {
  plugins: string[];
  defaultAgent: string;
  agents: Record<string, unknown>;
  mcps: Record<string, unknown>;
}

export function planDefaultManagedEntries(): ManagedEntries {
  return {
    plugins: [
      'trans-genderian-orchestra@2.0.0-beta.0',
      'opencode-beads@0.7.0',
      'aft@0.0.0-pinned-after-verification',
    ],
    defaultAgent: 'tgo-orchestrator',
    agents: {
      'tgo-orchestrator': {
        description: 'TGO Orchestrator: technical lead and phase controller.',
        mode: 'primary',
      },
    },
    mcps: {
      'tgo-websearch': {
        type: 'remote',
        url: 'https://mcp.exa.ai/mcp',
        enabled: true,
        headers: {
          Authorization: 'Bearer {env:EXA_API_KEY}',
        },
      },
      'tgo-grep-app': {
        type: 'remote',
        url: 'https://mcp.grep.app',
        enabled: true,
      },
    },
  };
}
```

- [ ] **Step 4: Implement OpenCode config helpers**

Create `trans-genderian-orchestra-v2/src/config/opencode-config.ts` with this content:

```ts
import type { CommandNotice } from '../commands/result';
import type { ManagedEntries } from './managed-entries';

export interface OpenCodeConfig {
  plugin?: Array<string | [string, Record<string, unknown>]>;
  agent?: Record<string, unknown>;
  mcp?: Record<string, unknown>;
  provider?: Record<string, unknown>;
  default_agent?: string;
  [key: string]: unknown;
}

export interface ApplyConfigResult {
  config: OpenCodeConfig;
  warnings: CommandNotice[];
}

export function parseOpenCodeConfig(text: string): OpenCodeConfig {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return {};
  }
  return JSON.parse(trimmed) as OpenCodeConfig;
}

function appendUniquePlugin(
  plugins: Array<string | [string, Record<string, unknown>]>,
  plugin: string,
): void {
  const exists = plugins.some((entry) => Array.isArray(entry) ? entry[0] === plugin : entry === plugin);
  if (!exists) {
    plugins.push(plugin);
  }
}

export function applyManagedEntries(
  config: OpenCodeConfig,
  entries: ManagedEntries,
): ApplyConfigResult {
  const next: OpenCodeConfig = {
    ...config,
    plugin: [...(config.plugin ?? [])],
    agent: { ...(config.agent ?? {}) },
    mcp: { ...(config.mcp ?? {}) },
  };
  const warnings: CommandNotice[] = [];

  for (const plugin of entries.plugins) {
    appendUniquePlugin(next.plugin ?? [], plugin);
  }

  next.agent = {
    ...next.agent,
    ...entries.agents,
  };
  next.mcp = {
    ...next.mcp,
    ...entries.mcps,
  };

  if (config.default_agent && config.default_agent !== entries.defaultAgent) {
    warnings.push({
      code: 'default-agent-conflict',
      message: `default_agent will change from ${config.default_agent} to ${entries.defaultAgent}.`,
      severity: 'warning',
    });
  }
  next.default_agent = entries.defaultAgent;

  return { config: next, warnings };
}

export function serializeOpenCodeConfig(config: OpenCodeConfig): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun test src/config/opencode-config.test.ts
```

Expected: PASS with 3 tests.

- [ ] **Step 6: Commit config helpers**

Run:

```bash
git add trans-genderian-orchestra-v2/src/config
git commit -m "feat: add opencode config merge helpers"
```

Expected: commit succeeds.

## Task 8: Add Tool Detector

**Files:**

- Create: `trans-genderian-orchestra-v2/src/tools/detect.ts`
- Test: `trans-genderian-orchestra-v2/src/tools/detect.test.ts`

- [ ] **Step 1: Write tool detector tests**

Create `trans-genderian-orchestra-v2/src/tools/detect.test.ts` with this content:

```ts
import { describe, expect, test } from 'bun:test';
import { detectRequiredTools } from './detect';

describe('tool detector', () => {
  test('reports missing required and degraded optional tools', async () => {
    const result = await detectRequiredTools({
      async which(command) {
        return command === 'git' ? `/usr/bin/${command}` : undefined;
      },
    });

    expect(result).toEqual({
      tools: [
        { name: 'git', status: 'user-managed', path: '/usr/bin/git' },
        { name: 'bd', status: 'missing' },
        { name: 'ctx7', status: 'missing' },
      ],
      blocked: [
        {
          capability: 'beads',
          reason: 'Beads CLI is missing.',
          repair_command: 'brew install beads or npm install -g @beads/bd',
        },
      ],
      degraded: [
        {
          capability: 'context7-cli',
          reason: 'Context7 CLI is missing.',
          repair_command: 'npx ctx7 setup --opencode',
        },
      ],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun test src/tools/detect.test.ts
```

Expected: FAIL because tool detector does not exist.

- [ ] **Step 3: Implement tool detector**

Create `trans-genderian-orchestra-v2/src/tools/detect.ts` with this content:

```ts
import type { CapabilityStatus } from '../commands/result';

export interface CommandDetector {
  which(command: string): Promise<string | undefined>;
}

export interface DetectedTool {
  name: 'git' | 'bd' | 'ctx7';
  status: 'user-managed' | 'missing';
  path?: string;
}

export interface ToolDetectionResult {
  tools: DetectedTool[];
  blocked: CapabilityStatus[];
  degraded: CapabilityStatus[];
}

async function detectTool(
  detector: CommandDetector,
  name: DetectedTool['name'],
): Promise<DetectedTool> {
  const path = await detector.which(name);
  return path ? { name, status: 'user-managed', path } : { name, status: 'missing' };
}

export async function detectRequiredTools(
  detector: CommandDetector,
): Promise<ToolDetectionResult> {
  const tools = await Promise.all([
    detectTool(detector, 'git'),
    detectTool(detector, 'bd'),
    detectTool(detector, 'ctx7'),
  ]);

  const blocked: CapabilityStatus[] = [];
  const degraded: CapabilityStatus[] = [];

  if (tools.find((tool) => tool.name === 'bd')?.status === 'missing') {
    blocked.push({
      capability: 'beads',
      reason: 'Beads CLI is missing.',
      repair_command: 'brew install beads or npm install -g @beads/bd',
    });
  }

  if (tools.find((tool) => tool.name === 'ctx7')?.status === 'missing') {
    degraded.push({
      capability: 'context7-cli',
      reason: 'Context7 CLI is missing.',
      repair_command: 'npx ctx7 setup --opencode',
    });
  }

  return { tools, blocked, degraded };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun test src/tools/detect.test.ts
```

Expected: PASS with 1 test.

- [ ] **Step 5: Commit tool detector**

Run:

```bash
git add trans-genderian-orchestra-v2/src/tools
git commit -m "feat: add bootstrap tool detection"
```

Expected: commit succeeds.

## Task 9: Add Bootstrap Dry-Run And Apply

**Files:**

- Create: `trans-genderian-orchestra-v2/src/commands/bootstrap.ts`
- Test: `trans-genderian-orchestra-v2/src/commands/bootstrap.test.ts`

- [ ] **Step 1: Write bootstrap tests**

Create `trans-genderian-orchestra-v2/src/commands/bootstrap.test.ts` with this content:

```ts
import { describe, expect, test } from 'bun:test';
import { createMemoryFileSystem } from '../filesystem/memory-adapter';
import { runBootstrap } from './bootstrap';

describe('bootstrap command', () => {
  test('dry-run plans default managed entries and writes nothing', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/opencode.jsonc': '{"plugin":["user-plugin"]}',
    });

    const result = await runBootstrap({
      fs,
      homeDir: '/home/user',
      mode: 'dry-run',
      operationId: 'op-1',
      timestamp: '2026-06-02T10-00-00-000Z',
      detector: { async which() { return undefined; } },
    });

    expect(result.planned_actions.map((action) => action.id)).toEqual([
      'register-tgo-plugin',
      'register-opencode-beads',
      'register-aft',
      'register-tgo-websearch',
      'register-tgo-grep-app',
      'set-default-agent',
    ]);
    expect(result.changes_applied).toEqual([]);
    expect(await fs.readText('/home/user/.config/opencode/opencode.jsonc')).toBe(
      '{"plugin":["user-plugin"]}',
    );
    expect(result.blocked_capabilities[0]?.capability).toBe('beads');
    expect(result.degraded_capabilities[0]?.capability).toBe('context7-cli');
  });

  test('apply creates backup before writing config and manifest', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/opencode.jsonc': '{"plugin":["user-plugin"]}',
    });

    const result = await runBootstrap({
      fs,
      homeDir: '/home/user',
      mode: 'apply',
      operationId: 'op-2',
      timestamp: '2026-06-02T10-00-00-000Z',
      detector: { async which(command) { return command === 'git' ? '/usr/bin/git' : undefined; } },
    });

    expect(result.backups_created).toHaveLength(1);
    expect(result.backups_created[0]?.source_path).toBe(
      '/home/user/.config/opencode/opencode.jsonc',
    );
    expect(result.restart_required).toBe(true);

    const config = JSON.parse(await fs.readText('/home/user/.config/opencode/opencode.jsonc'));
    expect(config.plugin).toContain('user-plugin');
    expect(config.plugin).toContain('trans-genderian-orchestra@2.0.0-beta.0');
    expect(config.default_agent).toBe('tgo-orchestrator');

    const manifest = JSON.parse(await fs.readText('/home/user/.config/opencode/tgo/manifest.jsonc'));
    expect(manifest.backups).toHaveLength(1);
    expect(manifest.managed_config.map((entry: { key: string }) => entry.key)).toContain(
      'agent.tgo-orchestrator',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun test src/commands/bootstrap.test.ts
```

Expected: FAIL because bootstrap command does not exist.

- [ ] **Step 3: Implement bootstrap command**

Create `trans-genderian-orchestra-v2/src/commands/bootstrap.ts` with this content:

```ts
import { join } from 'node:path';
import { createBackup } from '../backup/store';
import { planDefaultManagedEntries } from '../config/managed-entries';
import {
  applyManagedEntries,
  parseOpenCodeConfig,
  serializeOpenCodeConfig,
} from '../config/opencode-config';
import type { FileSystemAdapter } from '../filesystem/adapter';
import { readManifest, writeManifest } from '../manifest/store';
import { findSecretLikeValues } from '../security/secrets';
import { detectRequiredTools, type CommandDetector } from '../tools/detect';
import {
  createEmptyCommandResult,
  markRestartRequired,
  type DeterministicCommandResult,
} from './result';

export interface BootstrapInput {
  fs: FileSystemAdapter;
  homeDir: string;
  mode: 'dry-run' | 'apply';
  operationId: string;
  timestamp: string;
  detector: CommandDetector;
}

function globalConfigPath(homeDir: string): string {
  return join(homeDir, '.config/opencode/opencode.jsonc').replaceAll('\\', '/');
}

function globalManifestPath(homeDir: string): string {
  return join(homeDir, '.config/opencode/tgo/manifest.jsonc').replaceAll('\\', '/');
}

function globalBackupRoot(homeDir: string): string {
  return join(homeDir, '.config/opencode/tgo/backups').replaceAll('\\', '/');
}

export async function runBootstrap(
  input: BootstrapInput,
): Promise<DeterministicCommandResult> {
  const result = createEmptyCommandResult('bootstrap', input.mode);
  const entries = planDefaultManagedEntries();

  result.planned_actions.push(
    {
      id: 'register-tgo-plugin',
      title: 'Register TGO v2 plugin',
      target: 'plugin',
      action: 'update',
      requires_confirmation: false,
    },
    {
      id: 'register-opencode-beads',
      title: 'Register opencode-beads plugin',
      target: 'plugin',
      action: 'update',
      requires_confirmation: false,
    },
    {
      id: 'register-aft',
      title: 'Register AFT peer plugin',
      target: 'plugin',
      action: 'update',
      requires_confirmation: false,
    },
    {
      id: 'register-tgo-websearch',
      title: 'Register TGO websearch MCP',
      target: 'mcp.tgo-websearch',
      action: 'update',
      requires_confirmation: false,
    },
    {
      id: 'register-tgo-grep-app',
      title: 'Register TGO grep_app MCP',
      target: 'mcp.tgo-grep-app',
      action: 'update',
      requires_confirmation: false,
    },
    {
      id: 'set-default-agent',
      title: 'Set default_agent to tgo-orchestrator',
      target: 'default_agent',
      action: 'update',
      requires_confirmation: true,
    },
  );

  const toolDetection = await detectRequiredTools(input.detector);
  result.blocked_capabilities.push(...toolDetection.blocked);
  result.degraded_capabilities.push(...toolDetection.degraded);

  const configPath = globalConfigPath(input.homeDir);
  const existingText = (await input.fs.exists(configPath))
    ? await input.fs.readText(configPath)
    : '{}';
  const existingConfig = parseOpenCodeConfig(existingText);
  const applied = applyManagedEntries(existingConfig, entries);
  result.warnings.push(...applied.warnings);

  const serialized = serializeOpenCodeConfig(applied.config);
  const secretMatches = findSecretLikeValues(serialized);
  if (secretMatches.length > 0) {
    result.blocked_capabilities.push({
      capability: 'config-write',
      reason: 'TGO-managed config contains secret-like values.',
    });
    return result;
  }

  if (input.mode === 'dry-run') {
    result.next_steps.push('Run bootstrap with --yes to apply after reviewing planned actions.');
    return result;
  }

  const backup = await createBackup(input.fs, {
    backupRoot: globalBackupRoot(input.homeDir),
    operationId: input.operationId,
    sourcePath: configPath,
    timestamp: input.timestamp,
  });
  result.backups_created.push(backup);

  await input.fs.writeText(configPath, serialized);
  result.changes_applied.push({
    id: 'write-opencode-config',
    title: 'Write OpenCode config with TGO-managed entries',
    target: configPath,
  });

  const manifestPath = globalManifestPath(input.homeDir);
  const manifest = await readManifest(input.fs, manifestPath);
  manifest.managed_config = [
    { kind: 'plugin', key: 'plugin.trans-genderian-orchestra@2.0.0-beta.0' },
    { kind: 'plugin', key: 'plugin.opencode-beads@0.7.0' },
    { kind: 'plugin', key: 'plugin.aft@0.0.0-pinned-after-verification' },
    { kind: 'agent', key: 'agent.tgo-orchestrator' },
    { kind: 'mcp', key: 'mcp.tgo-websearch' },
    { kind: 'mcp', key: 'mcp.tgo-grep-app' },
    { kind: 'default_agent', key: 'default_agent' },
  ];
  manifest.backups.push({
    operation_id: input.operationId,
    created_at: input.timestamp,
    path: backup.path,
    source_path: backup.source_path,
  });
  await writeManifest(input.fs, manifestPath, manifest);
  result.manifest_updates.push({
    path: manifestPath,
    key: 'managed_config',
    value_summary: 'Recorded default TGO managed entries.',
  });
  markRestartRequired(result, 'OpenCode config changed.');
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun test src/commands/bootstrap.test.ts
```

Expected: PASS with 2 tests.

- [ ] **Step 5: Commit bootstrap command**

Run:

```bash
git add trans-genderian-orchestra-v2/src/commands/bootstrap.ts trans-genderian-orchestra-v2/src/commands/bootstrap.test.ts
git commit -m "feat: add bootstrap dry-run and apply foundation"
```

Expected: commit succeeds.

## Task 10: Add Read-Only Doctor Checks

**Files:**

- Create: `trans-genderian-orchestra-v2/src/commands/doctor.ts`
- Test: `trans-genderian-orchestra-v2/src/commands/doctor.test.ts`

- [ ] **Step 1: Write doctor tests**

Create `trans-genderian-orchestra-v2/src/commands/doctor.test.ts` with this content:

```ts
import { describe, expect, test } from 'bun:test';
import { createMemoryFileSystem } from '../filesystem/memory-adapter';
import { runDoctor } from './doctor';

describe('doctor command', () => {
  test('reports missing manifest and missing tools without writing files', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/opencode.jsonc': '{}',
    });

    const result = await runDoctor({
      fs,
      homeDir: '/home/user',
      detector: { async which() { return undefined; } },
    });

    expect(result.command).toBe('doctor');
    expect(result.mode).toBe('read-only');
    expect(result.planned_actions).toEqual([
      {
        id: 'create-global-manifest',
        title: 'Create missing global TGO manifest',
        target: '/home/user/.config/opencode/tgo/manifest.jsonc',
        action: 'create',
        requires_confirmation: true,
      },
    ]);
    expect(result.changes_applied).toEqual([]);
    expect(result.blocked_capabilities[0]?.capability).toBe('beads');
    expect(result.degraded_capabilities[0]?.capability).toBe('context7-cli');
    expect(await fs.exists('/home/user/.config/opencode/tgo/manifest.jsonc')).toBe(false);
  });

  test('reports raw secret-like values in current config as warnings', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/opencode.jsonc':
        '{"mcp":{"github":{"headers":{"Authorization":"Bearer ghp_1234567890abcdef1234567890abcdef1234"}}}}',
      '/home/user/.config/opencode/tgo/manifest.jsonc': '{"schema_version":1}',
    });

    const result = await runDoctor({
      fs,
      homeDir: '/home/user',
      detector: { async which(command) { return command === 'git' ? '/usr/bin/git' : undefined; } },
    });

    expect(result.warnings).toContainEqual({
      code: 'secret-like-config-value',
      message: 'OpenCode config contains secret-like values; rotate exposed tokens and replace with env references.',
      severity: 'error',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun test src/commands/doctor.test.ts
```

Expected: FAIL because doctor command does not exist.

- [ ] **Step 3: Implement doctor command**

Create `trans-genderian-orchestra-v2/src/commands/doctor.ts` with this content:

```ts
import { join } from 'node:path';
import type { FileSystemAdapter } from '../filesystem/adapter';
import { findSecretLikeValues } from '../security/secrets';
import { detectRequiredTools, type CommandDetector } from '../tools/detect';
import { createEmptyCommandResult, type DeterministicCommandResult } from './result';

export interface DoctorInput {
  fs: FileSystemAdapter;
  homeDir: string;
  detector: CommandDetector;
}

function globalConfigPath(homeDir: string): string {
  return join(homeDir, '.config/opencode/opencode.jsonc').replaceAll('\\', '/');
}

function globalManifestPath(homeDir: string): string {
  return join(homeDir, '.config/opencode/tgo/manifest.jsonc').replaceAll('\\', '/');
}

export async function runDoctor(
  input: DoctorInput,
): Promise<DeterministicCommandResult> {
  const result = createEmptyCommandResult('doctor', 'read-only');
  const manifestPath = globalManifestPath(input.homeDir);
  const configPath = globalConfigPath(input.homeDir);

  if (!(await input.fs.exists(manifestPath))) {
    result.planned_actions.push({
      id: 'create-global-manifest',
      title: 'Create missing global TGO manifest',
      target: manifestPath,
      action: 'create',
      requires_confirmation: true,
    });
  }

  if (await input.fs.exists(configPath)) {
    const configText = await input.fs.readText(configPath);
    if (findSecretLikeValues(configText).length > 0) {
      result.warnings.push({
        code: 'secret-like-config-value',
        message:
          'OpenCode config contains secret-like values; rotate exposed tokens and replace with env references.',
        severity: 'error',
      });
    }
  }

  const tools = await detectRequiredTools(input.detector);
  result.blocked_capabilities.push(...tools.blocked);
  result.degraded_capabilities.push(...tools.degraded);
  result.next_steps.push('Review doctor output before running any repair command.');
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun test src/commands/doctor.test.ts
```

Expected: PASS with 2 tests.

- [ ] **Step 5: Commit doctor command**

Run:

```bash
git add trans-genderian-orchestra-v2/src/commands/doctor.ts trans-genderian-orchestra-v2/src/commands/doctor.test.ts
git commit -m "feat: add read-only doctor foundation"
```

Expected: commit succeeds.

## Task 11: Wire CLI Argument Parser And JSON Output

**Files:**

- Create: `trans-genderian-orchestra-v2/src/cli/args.ts`
- Modify: `trans-genderian-orchestra-v2/src/cli/index.ts`
- Test: `trans-genderian-orchestra-v2/src/cli/args.test.ts`

- [ ] **Step 1: Write CLI parser tests**

Create `trans-genderian-orchestra-v2/src/cli/args.test.ts` with this content:

```ts
import { describe, expect, test } from 'bun:test';
import { parseCliArgs } from './args';

describe('CLI argument parser', () => {
  test('parses default bootstrap dry-run', () => {
    expect(parseCliArgs(['bootstrap', '--dry-run', '--json'])).toEqual({
      command: 'bootstrap',
      dryRun: true,
      yes: false,
      json: true,
      tools: 'default',
      models: 'balanced',
      resilience: 'balanced',
    });
  });

  test('parses bootstrap apply presets', () => {
    expect(
      parseCliArgs([
        'bootstrap',
        '--yes',
        '--tools',
        'all-bells',
        '--models',
        'balanced',
        '--resilience',
        'conservative',
      ]),
    ).toEqual({
      command: 'bootstrap',
      dryRun: false,
      yes: true,
      json: false,
      tools: 'all-bells',
      models: 'balanced',
      resilience: 'conservative',
    });
  });

  test('parses doctor json', () => {
    expect(parseCliArgs(['doctor', '--json'])).toEqual({
      command: 'doctor',
      json: true,
    });
  });
});
```

- [ ] **Step 2: Run parser test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun test src/cli/args.test.ts
```

Expected: FAIL because `src/cli/args.ts` does not exist.

- [ ] **Step 3: Implement CLI parser**

Create `trans-genderian-orchestra-v2/src/cli/args.ts` with this content:

```ts
export type CliArgs =
  | {
      command: 'bootstrap';
      dryRun: boolean;
      yes: boolean;
      json: boolean;
      tools: string;
      models: string;
      resilience: string;
    }
  | { command: 'doctor'; json: boolean }
  | { command: 'help' };

function valueAfter(args: string[], flag: string, fallback: string): string {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : (args[index + 1] ?? fallback);
}

export function parseCliArgs(args: string[]): CliArgs {
  const command = args[0] ?? 'help';
  if (command === 'bootstrap') {
    return {
      command: 'bootstrap',
      dryRun: args.includes('--dry-run') || !args.includes('--yes'),
      yes: args.includes('--yes'),
      json: args.includes('--json'),
      tools: valueAfter(args, '--tools', 'default'),
      models: valueAfter(args, '--models', 'balanced'),
      resilience: valueAfter(args, '--resilience', 'balanced'),
    };
  }
  if (command === 'doctor') {
    return { command: 'doctor', json: args.includes('--json') };
  }
  return { command: 'help' };
}
```

- [ ] **Step 4: Replace CLI entrypoint**

Modify `trans-genderian-orchestra-v2/src/cli/index.ts` to this content:

```ts
#!/usr/bin/env bun

import { createNodeFileSystem } from '../filesystem/adapter';
import { runBootstrap } from '../commands/bootstrap';
import { runDoctor } from '../commands/doctor';
import { parseCliArgs } from './args';

function printHelp(): void {
  console.log(`trans-genderian-orchestra v2

Usage:
  trans-genderian-orchestra bootstrap [--tools default] [--models balanced] [--resilience balanced] [--dry-run] [--yes] [--json]
  trans-genderian-orchestra doctor [--json]
`);
}

function createPathDetector() {
  return {
    async which(command: string): Promise<string | undefined> {
      const paths = (process.env.PATH ?? '').split(':');
      for (const path of paths) {
        const candidate = `${path}/${command}`;
        if (await Bun.file(candidate).exists()) {
          return candidate;
        }
      }
      return undefined;
    },
  };
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));
  const fs = createNodeFileSystem();
  const homeDir = process.env.TGO_TEST_HOME ?? process.env.HOME;

  if (!homeDir) {
    throw new Error('HOME is not set.');
  }

  if (args.command === 'help') {
    printHelp();
    return;
  }

  if (args.command === 'doctor') {
    const result = await runDoctor({
      fs,
      homeDir,
      detector: createPathDetector(),
    });
    console.log(args.json ? JSON.stringify(result, null, 2) : result.next_steps.join('\n'));
    return;
  }

  const result = await runBootstrap({
    fs,
    homeDir,
    mode: args.yes ? 'apply' : 'dry-run',
    operationId: `bootstrap-${Date.now()}`,
    timestamp: new Date().toISOString().replaceAll(':', '-'),
    detector: createPathDetector(),
  });

  console.log(args.json ? JSON.stringify(result, null, 2) : result.next_steps.join('\n'));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
```

- [ ] **Step 5: Run CLI parser test**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun test src/cli/args.test.ts
```

Expected: PASS with 3 tests.

- [ ] **Step 6: Run CLI build**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun run build
```

Expected: PASS and produces `dist/cli/index.js`.

- [ ] **Step 7: Run temp-HOME dry-run smoke command**

Run:

```bash
cd trans-genderian-orchestra-v2 && TGO_TEST_HOME=$(mktemp -d) bun run dist/cli/index.js bootstrap --tools default --models balanced --resilience balanced --dry-run --json
```

Expected output JSON includes:

- `"command": "bootstrap"`
- `"mode": "dry-run"`
- `"planned_actions"`
- `"changes_applied": []`
- `"blocked_capabilities"`
- `"degraded_capabilities"`
- `"restart_required": false`

- [ ] **Step 8: Commit CLI wiring**

Run:

```bash
git add trans-genderian-orchestra-v2/src/cli
git commit -m "feat: wire tgo v2 bootstrap and doctor cli"
```

Expected: commit succeeds.

## Task 12: Final Phase 1 Validation Gate

**Files:**

- Read: `designs/tgo-v2/specs/07-implementation-phases-validation-gates.md`
- Read: `trans-genderian-orchestra-v2/src/**/*.test.ts`

- [ ] **Step 1: Run full Phase 1 CI checks**

Run:

```bash
cd trans-genderian-orchestra-v2 && bun test
cd trans-genderian-orchestra-v2 && bun run typecheck
cd trans-genderian-orchestra-v2 && bun run check:ci
cd trans-genderian-orchestra-v2 && bun run build
```

Expected:

- `bun test` exits 0 and includes tests for result contract, memory filesystem, secret scanner, manifest store, backup store, config helpers, tool detector, bootstrap, doctor, and CLI args.
- `bun run typecheck` exits 0.
- `bun run check:ci` exits 0.
- `bun run build` exits 0.

- [ ] **Step 2: Run dry-run smoke with temp HOME and verify no writes outside temp HOME**

Run:

```bash
cd trans-genderian-orchestra-v2
TEMP_HOME=$(mktemp -d)
bun run dist/cli/index.js bootstrap --tools default --models balanced --resilience balanced --dry-run --json > "$TEMP_HOME/bootstrap-dry-run.json"
find "$TEMP_HOME" -type f | sort
cat "$TEMP_HOME/bootstrap-dry-run.json"
```

Expected:

- `find` lists only `$TEMP_HOME/bootstrap-dry-run.json`.
- JSON has `changes_applied: []`.
- JSON has planned actions for TGO plugin, `opencode-beads`, AFT, `tgo-websearch`, `tgo-grep-app`, and `default_agent`.

- [ ] **Step 3: Run apply smoke with temp HOME**

Run:

```bash
cd trans-genderian-orchestra-v2
TEMP_HOME=$(mktemp -d)
mkdir -p "$TEMP_HOME/.config/opencode"
printf '{"plugin":["user-plugin"]}\n' > "$TEMP_HOME/.config/opencode/opencode.jsonc"
bun run dist/cli/index.js bootstrap --tools default --models balanced --resilience balanced --yes --json > "$TEMP_HOME/bootstrap-apply.json"
cat "$TEMP_HOME/bootstrap-apply.json"
cat "$TEMP_HOME/.config/opencode/opencode.jsonc"
cat "$TEMP_HOME/.config/opencode/tgo/manifest.jsonc"
find "$TEMP_HOME/.config/opencode/tgo/backups" -type f | sort
```

Expected:

- JSON has `mode: apply`.
- JSON has one or more `backups_created` entries before config write.
- JSON has `restart_required: true`.
- OpenCode config still contains `user-plugin`.
- OpenCode config contains `trans-genderian-orchestra@2.0.0-beta.0`, `opencode-beads@0.7.0`, and `default_agent: tgo-orchestrator`.
- Manifest contains `managed_config` entries and backup record.
- Backup directory contains backed-up `opencode.jsonc`.

- [ ] **Step 4: Run doctor smoke with temp HOME**

Run:

```bash
cd trans-genderian-orchestra-v2
TEMP_HOME=$(mktemp -d)
mkdir -p "$TEMP_HOME/.config/opencode"
printf '{}\n' > "$TEMP_HOME/.config/opencode/opencode.jsonc"
bun run dist/cli/index.js doctor --json > "$TEMP_HOME/doctor.json"
cat "$TEMP_HOME/doctor.json"
```

Expected:

- JSON has `command: doctor`.
- JSON has `mode: read-only`.
- JSON includes planned action `create-global-manifest`.
- JSON reports missing `bd` as blocked Beads capability if `bd` is not installed in PATH.
- JSON reports missing `ctx7` as degraded Context7 capability if `ctx7` is not installed in PATH.
- No manifest file is created by doctor.

- [ ] **Step 5: Run secret-safety smoke**

Run:

```bash
cd trans-genderian-orchestra-v2
TEMP_HOME=$(mktemp -d)
mkdir -p "$TEMP_HOME/.config/opencode"
printf '{"mcp":{"github":{"headers":{"Authorization":"Bearer ghp_1234567890abcdef1234567890abcdef1234"}}}}\n' > "$TEMP_HOME/.config/opencode/opencode.jsonc"
bun run dist/cli/index.js doctor --json > "$TEMP_HOME/doctor-secret.json"
cat "$TEMP_HOME/doctor-secret.json"
```

Expected:

- JSON contains warning code `secret-like-config-value`.
- JSON output does not contain the raw token string except inside the source config file; if it appears in doctor output, Phase 1 fails.

- [ ] **Step 6: Commit Phase 1 validation notes if any docs were added**

If implementation adds a short validation log file, commit it:

```bash
git add trans-genderian-orchestra-v2/docs/phase-1-validation.md
git commit -m "docs: record phase 1 validation"
```

Expected: commit only if a validation log file exists. If no validation log file exists, skip this step and record command outputs in the final response.

## Plan Self-Review Checklist

- Spec coverage: Phase 1 scope in `07-implementation-phases-validation-gates.md` is covered by Tasks 1 through 12.
- Deterministic command contract: Task 2.
- Manifest read/write/backup: Tasks 5 and 6.
- OpenCode config merge/preview/apply: Tasks 7 and 9.
- Doctor read-only checks: Task 10.
- Plugin entrypoint/minimal agent registration: Task 1.
- Dry-run/apply/backup/drift/secret-safe tests: Tasks 4, 7, 9, 10, and 12.
- Temp HOME smoke commands: Task 12.
- No real global config mutation in tests: all smoke commands use `TGO_TEST_HOME` or `TEMP_HOME`.
- V1 reuse: no v1 source module copied; package/tooling conventions referenced only.
