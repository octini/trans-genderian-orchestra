# TGO v3 Review Loop Enforcer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved TGO v3 review-loop enforcer so completed `@composer` work requires either `@ensemble` then `@principal`, or direct `@principal` for conservative low-risk skips.

**Architecture:** Add a small hook package under `src/hooks/review-loop-enforcer/` with pure classifier/parser/state modules and a thin OpenCode hook adapter. The hook tracks Task tool delegations, classifies the current git diff after Composer completion, injects blocking internal reminders into Conductor context, and wires the existing `src/workflow/review-loop-counter.ts` for max-loop escalation. It never auto-invokes subagents.

**Tech Stack:** TypeScript, Bun test, Node `child_process`/`fs`/`path`, existing OpenCode plugin hooks (`tool.execute.before`, `tool.execute.after`, `experimental.chat.messages.transform`)

---

## File Structure

### Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/review-loop-enforcer/types.ts` | Shared review-gate, classifier, verdict, and hook adapter types. |
| `src/hooks/review-loop-enforcer/change-classifier.ts` | Git diff collection and conservative skip classifier. |
| `src/hooks/review-loop-enforcer/change-classifier.test.ts` | TDD tests for markdown-only and under-10-lines/no-risk-path skip rules. |
| `src/hooks/review-loop-enforcer/verdict-parser.ts` | JSON extraction and validation for Ensemble and Principal review metadata. |
| `src/hooks/review-loop-enforcer/verdict-parser.test.ts` | TDD tests for approve/reject/malformed/mismatched verdict behavior. |
| `src/hooks/review-loop-enforcer/state.ts` | Pure review-gate state machine wired to `review-loop-counter`. |
| `src/hooks/review-loop-enforcer/state.test.ts` | TDD tests for required next action transitions and max-loop escalation. |
| `src/hooks/review-loop-enforcer/index.ts` | Hook factory integrating Task output, change classification, state, and reminder injection. |
| `src/hooks/review-loop-enforcer/index.test.ts` | TDD tests for hook flow and reminder injection without auto-invocation. |
| `src/agents/review-metadata.test.ts` | Prompt metadata assertions for Composer, Ensemble, and Principal. |

### Files to Modify

| File | Purpose |
|------|---------|
| `src/hooks/index.ts` | Export `createReviewLoopEnforcerHook`. |
| `src/index.ts` | Instantiate and call the review-loop enforcer hook in existing hook chains. |
| `src/workflow/review-loop-counter.ts` | Only add small exports/helpers if tests need them; preserve existing behavior. |
| `src/workflow/review-loop-counter.test.ts` | Extend only if a new helper/export is added. |
| `src/agents/composer.ts` | Add `taskId` review metadata to output-format prompt only. |
| `src/agents/ensemble.ts` | Add `reviewedTaskId` to the existing Review Panel JSON block only. |
| `src/agents/principal.ts` | Add `reviewedTaskId` confirmation to result metadata only. |

---

## Task 1: TDD the Change Classifier

**Files:**
- Create: `src/hooks/review-loop-enforcer/types.ts`
- Create: `src/hooks/review-loop-enforcer/change-classifier.ts`
- Create: `src/hooks/review-loop-enforcer/change-classifier.test.ts`

- [ ] **Step 1: Write failing classifier tests first**

Create `src/hooks/review-loop-enforcer/change-classifier.test.ts` with these exact test names:

```ts
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';
import { classifyChanges, collectGitChangeSet } from './change-classifier.js';
import type { ChangeSet } from './types.js';

function changeSet(files: ChangeSet['files']): ChangeSet {
  return { files };
}

describe('review-loop change classifier', () => {
  test('classifies markdown-only docs changes as principal-only', () => {
    const result = classifyChanges(
      changeSet([{ path: 'docs/README.md', added: 20, deleted: 2 }]),
    );
    expect(result.requiredReview).toBe('principal');
    expect(result.skipEnsemble).toBe(true);
    expect(result.reason).toContain('markdown-only docs');
  });

  test('classifies under 10 changed lines outside risk paths as principal-only', () => {
    const result = classifyChanges(
      changeSet([{ path: 'src/helpers/string.ts', added: 4, deleted: 5 }]),
    );
    expect(result.requiredReview).toBe('principal');
    expect(result.skipEnsemble).toBe(true);
    expect(result.changedLines).toBe(9);
  });

  test('requires ensemble at exactly 10 changed lines', () => {
    const result = classifyChanges(
      changeSet([{ path: 'src/helpers/string.ts', added: 5, deleted: 5 }]),
    );
    expect(result.requiredReview).toBe('ensemble');
    expect(result.skipEnsemble).toBe(false);
  });

  test('requires ensemble for agent logic even under 10 changed lines', () => {
    const result = classifyChanges(
      changeSet([{ path: 'src/agents/composer.ts', added: 1, deleted: 1 }]),
    );
    expect(result.requiredReview).toBe('ensemble');
    expect(result.reason).toContain('risk path');
  });

  test('requires ensemble for plugin initialization even under 10 changed lines', () => {
    const result = classifyChanges(
      changeSet([{ path: 'src/index.ts', added: 1, deleted: 0 }]),
    );
    expect(result.requiredReview).toBe('ensemble');
  });

  test('requires ensemble for task output utility changes even under 10 changed lines', () => {
    const result = classifyChanges(
      changeSet([{ path: 'src/utils/task.ts', added: 1, deleted: 0 }]),
    );
    expect(result.requiredReview).toBe('ensemble');
    expect(result.reason).toContain('risk path');
  });

  test('requires ensemble when no changed files are detected', () => {
    const result = classifyChanges(changeSet([]));
    expect(result.requiredReview).toBe('ensemble');
    expect(result.reason).toContain('no changed files detected');
  });

  test('requires ensemble for unknown file types', () => {
    const result = classifyChanges(
      changeSet([{ path: 'assets/logo.bin', added: 1, deleted: 0, binary: true }]),
    );
    expect(result.requiredReview).toBe('ensemble');
  });

  test('requires ensemble for mixed docs and hook changes', () => {
    const result = classifyChanges(
      changeSet([
        { path: 'docs/README.md', added: 1, deleted: 0 },
        { path: 'src/hooks/index.ts', added: 1, deleted: 0 },
      ]),
    );
    expect(result.requiredReview).toBe('ensemble');
  });

  test('collectGitChangeSet reads tracked and untracked changes from a real git repo', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'review-loop-enforcer-'));
    const git = (...args: string[]) =>
      execFileSync('git', args, { cwd: dir, stdio: 'ignore' });

    try {
      git('init');
      git('config', 'user.email', 'test@example.com');
      git('config', 'user.name', 'Test User');
      writeFileSync(path.join(dir, 'tracked.txt'), 'one\n');
      git('add', 'tracked.txt');
      git('commit', '-m', 'init');

      writeFileSync(path.join(dir, 'tracked.txt'), 'one\ntwo\n');
      mkdirSync(path.join(dir, 'docs'));
      writeFileSync(path.join(dir, 'docs/new.md'), '# New doc\n');

      const result = collectGitChangeSet(dir);
      const paths = result?.files.map((file) => file.path) ?? [];
      expect(paths).toContain('tracked.txt');
      expect(paths).toContain('docs/new.md');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

Run the targeted test and confirm it fails because the module does not exist yet:

```bash
bun test src/hooks/review-loop-enforcer/change-classifier.test.ts
```

Expected: Bun reports module resolution failure for `change-classifier.js` or missing exports.

- [ ] **Step 2: Add shared types**

Create `src/hooks/review-loop-enforcer/types.ts`:

```ts
export type ReviewAgent = 'composer' | 'ensemble' | 'principal';

export type RequiredReview = 'ensemble' | 'principal';

export type RequiredNextAction =
  | 'ensemble'
  | 'principal'
  | 'composer'
  | 'principal-escalation';

export interface ChangedFile {
  path: string;
  added: number;
  deleted: number;
  binary?: boolean;
}

export interface ChangeSet {
  files: ChangedFile[];
}

export interface ChangeClassification {
  requiredReview: RequiredReview;
  skipEnsemble: boolean;
  changedLines: number;
  reason: string;
  riskPaths: string[];
}
```

- [ ] **Step 3: Implement the classifier and git diff collector**

Create `src/hooks/review-loop-enforcer/change-classifier.ts` with these behaviors:

```ts
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { ChangeClassification, ChangedFile, ChangeSet } from './types.js';

const DOC_MARKDOWN_ROOT_FILES = new Set([
  'README.md',
  'MIGRATION.md',
  'RELEASE.md',
  'CHANGELOG.md',
  'CONTEXT.md',
  'PROJECT_STATE.md',
]);

const RISK_PATH_PREFIXES = [
  'src/agents/',
  'src/hooks/',
  'src/workflow/',
  'src/config/',
  'src/council/',
  'src/tools/',
  'src/multiplexer/',
  'src/utils/',
];

const RISK_EXACT_PATHS = new Set(['src/index.ts']);

export function collectGitChangeSet(cwd: string): ChangeSet | undefined {
  try {
    const output = execFileSync('git', ['diff', '--numstat', 'HEAD', '--'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const changeSet = parseGitNumstat(output);
    const seen = new Set(changeSet.files.map((file) => file.path));

    const untracked = execFileSync(
      'git',
      ['ls-files', '--others', '--exclude-standard'],
      {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );
    for (const filePath of untracked.split(/\r?\n/).filter(Boolean)) {
      if (seen.has(filePath)) continue;
      changeSet.files.push(readUntrackedFile(cwd, filePath));
    }

    return changeSet;
  } catch {
    return undefined;
  }
}

function readUntrackedFile(cwd: string, filePath: string): ChangedFile {
  const absolutePath = path.join(cwd, filePath);
  try {
    if (!statSync(absolutePath).isFile()) {
      return { path: filePath, added: 0, deleted: 0, binary: true };
    }
    const buffer = readFileSync(absolutePath);
    if (buffer.includes(0)) {
      return { path: filePath, added: 0, deleted: 0, binary: true };
    }
    const text = buffer.toString('utf8');
    const added = text.length === 0 ? 0 : text.split(/\r?\n/).length;
    return { path: filePath, added, deleted: 0 };
  } catch {
    return { path: filePath, added: 0, deleted: 0, binary: true };
  }
}

export function parseGitNumstat(output: string): ChangeSet {
  const files = output
    .split(/\r?\n/)
    .map((line): ChangedFile | undefined => {
      if (!line.trim()) return undefined;
      const [addedRaw, deletedRaw, ...pathParts] = line.split('\t');
      const filePath = pathParts.join('\t');
      const binary = addedRaw === '-' || deletedRaw === '-';
      return {
        path: filePath,
        added: binary ? 0 : Number(addedRaw),
        deleted: binary ? 0 : Number(deletedRaw),
        binary,
      };
    })
    .filter((file): file is ChangedFile => Boolean(file));

  return { files };
}

export function classifyChanges(changeSet: ChangeSet | undefined): ChangeClassification {
  if (!changeSet) {
    return requireEnsemble('classification failed', 0, []);
  }

  const changedLines = changeSet.files.reduce(
    (sum, file) => sum + file.added + file.deleted,
    0,
  );
  const riskPaths = changeSet.files.filter(isRiskPath).map((file) => file.path);

  if (changeSet.files.length === 0) {
    return requireEnsemble('no changed files detected; classification unknown', changedLines, riskPaths);
  }

  if (changeSet.files.some((file) => file.binary || isUnknownFileType(file.path))) {
    return requireEnsemble('unknown file type', changedLines, riskPaths);
  }

  if (riskPaths.length > 0) {
    return requireEnsemble(`risk path touched: ${riskPaths.join(', ')}`, changedLines, riskPaths);
  }

  if (changeSet.files.every((file) => isDocsMarkdownPath(file.path))) {
    return requirePrincipal('markdown-only docs changes', changedLines, riskPaths);
  }

  if (changedLines < 10) {
    return requirePrincipal('under 10 changed lines and no risk path touched', changedLines, riskPaths);
  }

  return requireEnsemble('non-trivial change set', changedLines, riskPaths);
}

function isRiskPath(file: ChangedFile): boolean {
  return (
    RISK_EXACT_PATHS.has(file.path) ||
    RISK_PATH_PREFIXES.some((prefix) => file.path.startsWith(prefix))
  );
}

function isDocsMarkdownPath(filePath: string): boolean {
  return (
    filePath.endsWith('.md') &&
    (filePath.startsWith('docs/') || DOC_MARKDOWN_ROOT_FILES.has(filePath))
  );
}

function isUnknownFileType(filePath: string): boolean {
  return !/\.(ts|tsx|js|jsx|json|jsonc|md|yml|yaml|toml|css|scss|html|txt)$/.test(
    filePath,
  );
}

function requirePrincipal(
  reason: string,
  changedLines: number,
  riskPaths: string[],
): ChangeClassification {
  return { requiredReview: 'principal', skipEnsemble: true, changedLines, reason, riskPaths };
}

function requireEnsemble(
  reason: string,
  changedLines: number,
  riskPaths: string[],
): ChangeClassification {
  return { requiredReview: 'ensemble', skipEnsemble: false, changedLines, reason, riskPaths };
}
```

- [ ] **Step 4: Verify classifier tests pass**

```bash
bun test src/hooks/review-loop-enforcer/change-classifier.test.ts
```

Expected: All 10 classifier tests pass.

---

## Task 2: TDD the Verdict Parser

**Files:**
- Modify: `src/hooks/review-loop-enforcer/types.ts`
- Create: `src/hooks/review-loop-enforcer/verdict-parser.ts`
- Create: `src/hooks/review-loop-enforcer/verdict-parser.test.ts`

- [ ] **Step 1: Write failing parser tests first**

Create `src/hooks/review-loop-enforcer/verdict-parser.test.ts` with these exact test names:

```ts
import { describe, expect, test } from 'bun:test';
import {
  parseEnsembleVerdict,
  parsePrincipalReviewMetadata,
} from './verdict-parser.js';

describe('review-loop verdict parser', () => {
  test('parses ensemble approve verdict with reviewedTaskId', () => {
    const parsed = parseEnsembleVerdict(`before
{
  "reviewedTaskId": "task-1",
  "verdict": "approve",
  "per_councillor_findings": { "first": "ok", "second": "ok", "third": "ok" },
  "issues": [],
  "consensus": "unanimous"
}
after`);
    expect(parsed.valid).toBe(true);
    if (parsed.valid) {
      expect(parsed.reviewedTaskId).toBe('task-1');
      expect(parsed.verdict).toBe('approve');
      expect(parsed.requiredNextAction).toBe('principal');
    }
  });

  test('parses ensemble reject verdict', () => {
    const parsed = parseEnsembleVerdict(JSON.stringify({
      reviewedTaskId: 'task-1',
      verdict: 'reject',
      issues: [{ file: 'src/a.ts', line: 1, description: 'bad', severity: 'major' }],
      consensus: 'majority',
    }));
    expect(parsed.valid).toBe(true);
    if (parsed.valid) {
      expect(parsed.verdict).toBe('reject');
      expect(parsed.requiredNextAction).toBe('composer');
    }
  });

  test('forces reject when critical issue is present', () => {
    const parsed = parseEnsembleVerdict(JSON.stringify({
      reviewedTaskId: 'task-1',
      verdict: 'approve',
      issues: [{ severity: 'critical', description: 'data loss' }],
      consensus: 'majority',
    }));
    expect(parsed.valid).toBe(true);
    if (parsed.valid) {
      expect(parsed.verdict).toBe('reject');
      expect(parsed.criticalIssueCount).toBe(1);
      expect(parsed.requiredNextAction).toBe('composer');
    }
  });

  test('returns invalid for malformed JSON', () => {
    const parsed = parseEnsembleVerdict('{ "verdict": "approve" ');
    expect(parsed.valid).toBe(false);
  });

  test('returns invalid when reviewedTaskId is missing', () => {
    const parsed = parseEnsembleVerdict(JSON.stringify({ verdict: 'approve', issues: [] }));
    expect(parsed.valid).toBe(false);
  });

  test('parses principal reviewedTaskId confirmation', () => {
    const parsed = parsePrincipalReviewMetadata(`
<results>
  <verdict>pass</verdict>
  <review_metadata>{"reviewedTaskId":"task-1"}</review_metadata>
</results>`);
    expect(parsed.valid).toBe(true);
    if (parsed.valid) {
      expect(parsed.reviewedTaskId).toBe('task-1');
      expect(parsed.verdict).toBe('pass');
    }
  });
});
```

Run the targeted test and confirm it fails because the parser does not exist yet:

```bash
bun test src/hooks/review-loop-enforcer/verdict-parser.test.ts
```

Expected: Bun reports missing parser module or missing exports.

- [ ] **Step 2: Extend shared parser types**

Append these types to `src/hooks/review-loop-enforcer/types.ts`:

```ts
export type EnsembleVerdict = 'approve' | 'reject';
export type PrincipalVerdict = 'pass' | 'fail';

export type ParsedEnsembleVerdict =
  | {
      valid: true;
      reviewedTaskId: string;
      verdict: EnsembleVerdict;
      requiredNextAction: 'principal' | 'composer';
      criticalIssueCount: number;
      issues: unknown[];
    }
  | { valid: false; reason: string };

export type ParsedPrincipalMetadata =
  | { valid: true; reviewedTaskId: string; verdict: PrincipalVerdict }
  | { valid: false; reason: string };
```

- [ ] **Step 3: Implement parser without broad prompt changes**

Create `src/hooks/review-loop-enforcer/verdict-parser.ts`.

Important implementation detail: Ensemble prompt updates are limited to adding `reviewedTaskId` to the existing Review Panel JSON block. Do **not** require a new Ensemble prompt field for `requiredNextAction`; derive it in the parser from the normalized verdict. Support both the existing `issues` array and an optional `criticalIssues` array so the parser remains compatible with the design spec and current prompt shape.

Core implementation:

```ts
import type {
  ParsedEnsembleVerdict,
  ParsedPrincipalMetadata,
} from './types.js';

export function parseEnsembleVerdict(text: string): ParsedEnsembleVerdict {
  const json = extractFirstJsonObject(text);
  if (!json) return { valid: false, reason: 'No JSON object found' };

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { valid: false, reason: 'Malformed JSON' };
  }

  if (!isRecord(data)) return { valid: false, reason: 'Verdict JSON is not an object' };
  if (typeof data.reviewedTaskId !== 'string' || data.reviewedTaskId.trim() === '') {
    return { valid: false, reason: 'Missing reviewedTaskId' };
  }
  if (data.verdict !== 'approve' && data.verdict !== 'reject') {
    return { valid: false, reason: 'Invalid verdict' };
  }

  const issues = Array.isArray(data.issues) ? data.issues : [];
  const criticalIssues = Array.isArray(data.criticalIssues) ? data.criticalIssues : [];
  const criticalIssueCount =
    criticalIssues.length + issues.filter((issue) => issueHasCriticalSeverity(issue)).length;
  const verdict = criticalIssueCount > 0 ? 'reject' : data.verdict;

  return {
    valid: true,
    reviewedTaskId: data.reviewedTaskId.trim(),
    verdict,
    requiredNextAction: verdict === 'approve' ? 'principal' : 'composer',
    criticalIssueCount,
    issues,
  };
}

export function parsePrincipalReviewMetadata(text: string): ParsedPrincipalMetadata {
  const verdictMatch = /<verdict>\s*(pass|fail)\s*<\/verdict>/i.exec(text);
  const metadataMatch = /<review_metadata>\s*([\s\S]*?)\s*<\/review_metadata>/i.exec(text);
  if (!verdictMatch) return { valid: false, reason: 'Missing principal verdict' };
  if (!metadataMatch) return { valid: false, reason: 'Missing principal review metadata' };

  try {
    const data = JSON.parse(metadataMatch[1]);
    if (!isRecord(data) || typeof data.reviewedTaskId !== 'string') {
      return { valid: false, reason: 'Missing reviewedTaskId' };
    }
    return {
      valid: true,
      reviewedTaskId: data.reviewedTaskId.trim(),
      verdict: verdictMatch[1].toLowerCase() as 'pass' | 'fail',
    };
  } catch {
    return { valid: false, reason: 'Malformed principal review metadata' };
  }
}

function extractFirstJsonObject(text: string): string | undefined {
  const start = text.indexOf('{');
  if (start === -1) return undefined;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') inString = true;
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return text.slice(start, i + 1);
  }
  return undefined;
}

function issueHasCriticalSeverity(issue: unknown): boolean {
  return isRecord(issue) && String(issue.severity ?? '').toLowerCase() === 'critical';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
```

- [ ] **Step 4: Verify parser tests pass**

```bash
bun test src/hooks/review-loop-enforcer/verdict-parser.test.ts
```

Expected: All 6 parser tests pass.

---

## Task 3: TDD the Review Gate State Machine

**Files:**
- Modify: `src/hooks/review-loop-enforcer/types.ts`
- Create: `src/hooks/review-loop-enforcer/state.ts`
- Create: `src/hooks/review-loop-enforcer/state.test.ts`
- Modify only if needed: `src/workflow/review-loop-counter.ts`
- Modify only if needed: `src/workflow/review-loop-counter.test.ts`

- [ ] **Step 1: Write failing state tests first**

Create `src/hooks/review-loop-enforcer/state.test.ts` with these exact test names:

```ts
import { beforeEach, describe, expect, test } from 'bun:test';
import { resetAllReviewLoops } from '../../workflow/review-loop-counter.js';
import type { ChangeClassification } from './types.js';
import { ReviewGateStore } from './state.js';

const ensembleClassification: ChangeClassification = {
  requiredReview: 'ensemble',
  skipEnsemble: false,
  changedLines: 12,
  reason: 'non-trivial change set',
  riskPaths: [],
};

const principalClassification: ChangeClassification = {
  requiredReview: 'principal',
  skipEnsemble: true,
  changedLines: 3,
  reason: 'under 10 changed lines and no risk path touched',
  riskPaths: [],
};

describe('ReviewGateStore', () => {
  beforeEach(() => resetAllReviewLoops());

  test('composer completion requires ensemble for normal implementation work', () => {
    const store = new ReviewGateStore();
    const gate = store.recordComposerCompletion('parent-1', 'task-1', ensembleClassification);
    expect(gate.requiredNextAction).toBe('ensemble');
    expect(gate.skipEnsemble).toBe(false);
  });

  test('markdown-only change requires principal directly', () => {
    const store = new ReviewGateStore();
    const gate = store.recordComposerCompletion('parent-1', 'task-1', {
      ...principalClassification,
      reason: 'markdown-only docs changes',
    });
    expect(gate.requiredNextAction).toBe('principal');
    expect(gate.skipEnsemble).toBe(true);
  });

  test('small non-risk change requires principal directly', () => {
    const store = new ReviewGateStore();
    const gate = store.recordComposerCompletion('parent-1', 'task-1', principalClassification);
    expect(gate.requiredNextAction).toBe('principal');
    expect(gate.skipEnsemble).toBe(true);
  });

  test('agent plugin logic change requires ensemble', () => {
    const store = new ReviewGateStore();
    const gate = store.recordComposerCompletion('parent-1', 'task-1', {
      ...ensembleClassification,
      reason: 'risk path touched: src/agents/composer.ts',
      riskPaths: ['src/agents/composer.ts'],
    });
    expect(gate.requiredNextAction).toBe('ensemble');
  });

  test('ensemble reject requires composer rework', () => {
    const store = new ReviewGateStore();
    store.recordComposerCompletion('parent-1', 'task-1', ensembleClassification);
    const gate = store.recordEnsembleVerdict('parent-1', {
      valid: true,
      reviewedTaskId: 'task-1',
      verdict: 'reject',
      requiredNextAction: 'composer',
      criticalIssueCount: 0,
      issues: [],
    });
    expect(gate?.requiredNextAction).toBe('composer');
  });

  test('ensemble approve requires principal final review', () => {
    const store = new ReviewGateStore();
    store.recordComposerCompletion('parent-1', 'task-1', ensembleClassification);
    const gate = store.recordEnsembleVerdict('parent-1', {
      valid: true,
      reviewedTaskId: 'task-1',
      verdict: 'approve',
      requiredNextAction: 'principal',
      criticalIssueCount: 0,
      issues: [],
    });
    expect(gate?.requiredNextAction).toBe('principal');
  });

  test('loop count 3 requires principal escalation', () => {
    const store = new ReviewGateStore();
    // Existing review-loop-counter semantics set wheelsSpinning at the
    // start of the third Composer review round (loopCount >= 3), not after
    // a third Ensemble rejection completes.
    store.recordComposerCompletion('parent-1', 'task-1', ensembleClassification);
    store.recordEnsembleVerdict('parent-1', {
      valid: true,
      reviewedTaskId: 'task-1',
      verdict: 'reject',
      requiredNextAction: 'composer',
      criticalIssueCount: 0,
      issues: [],
    });
    store.recordComposerCompletion('parent-1', 'task-1', ensembleClassification);
    store.recordEnsembleVerdict('parent-1', {
      valid: true,
      reviewedTaskId: 'task-1',
      verdict: 'reject',
      requiredNextAction: 'composer',
      criticalIssueCount: 0,
      issues: [],
    });
    const gate = store.recordComposerCompletion('parent-1', 'task-1', ensembleClassification);
    expect(gate.requiredNextAction).toBe('principal-escalation');
    expect(gate.wheelsSpinning).toBe(true);
  });

  test('principal pass clears the gate', () => {
    const store = new ReviewGateStore();
    store.recordComposerCompletion('parent-1', 'task-1', principalClassification);
    store.recordPrincipalVerdict('parent-1', {
      valid: true,
      reviewedTaskId: 'task-1',
      verdict: 'pass',
    });
    expect(store.getGate('parent-1')).toBeUndefined();
  });

  test('reviewedTaskId mismatch keeps required gate active', () => {
    const store = new ReviewGateStore();
    store.recordComposerCompletion('parent-1', 'task-1', ensembleClassification);
    const gate = store.recordEnsembleVerdict('parent-1', {
      valid: true,
      reviewedTaskId: 'other-task',
      verdict: 'approve',
      requiredNextAction: 'principal',
      criticalIssueCount: 0,
      issues: [],
    });
    expect(gate?.requiredNextAction).toBe('ensemble');
    expect(gate?.lastError).toContain('reviewedTaskId mismatch');
  });
});
```

Run the targeted test and confirm it fails because `state.ts` does not exist yet:

```bash
bun test src/hooks/review-loop-enforcer/state.test.ts
```

Expected: Bun reports missing `state.js` or missing exports.

- [ ] **Step 2: Add state types**

Append to `src/hooks/review-loop-enforcer/types.ts`:

```ts
export interface ReviewGate {
  parentSessionId: string;
  taskId: string;
  requiredNextAction: RequiredNextAction;
  skipEnsemble: boolean;
  classification: ChangeClassification;
  loopCount: number;
  wheelsSpinning: boolean;
  lastError?: string;
}
```

- [ ] **Step 3: Implement `ReviewGateStore` with existing loop counter**

Create `src/hooks/review-loop-enforcer/state.ts`.

Required behavior:
- `recordComposerCompletion(parentSessionId, reportedTaskId, classification)`:
  - If an active gate exists for the parent session and its `requiredNextAction` is `composer`, keep the existing gate `taskId` as the correlation key.
  - Otherwise use `reportedTaskId` as the correlation key.
  - Call `recordReviewIteration(taskId)`.
  - Treat `review-loop-counter`'s `wheelsSpinning` semantics explicitly: escalation happens at the start of the third Composer review round (`loopCount >= 3`), before asking Ensemble to perform a third review.
  - If `wheelsSpinning` is true, require `principal-escalation` with `wheelsSpinning: true`.
  - Else require `classification.requiredReview` (`ensemble` or `principal`).
- `recordEnsembleVerdict(parentSessionId, parsed)`:
  - If invalid, keep/require `ensemble` with `lastError`.
  - If `reviewedTaskId` mismatches the active gate task id, keep/require `ensemble` with `lastError`.
  - On approve, call `recordEnsembleVerdict(taskId, 'approve')` from the workflow counter and require `principal`.
  - On reject, call `recordEnsembleVerdict(taskId, 'reject')` and require `composer`.
- `recordPrincipalVerdict(parentSessionId, parsed)`:
  - If invalid or mismatched, keep/require `principal` or `principal-escalation` with `lastError`.
  - On pass, call `recordPrincipalVerdict(taskId, 'approve')`, `clearReviewLoop(taskId)`, and clear the active gate.
  - On fail, call `recordPrincipalVerdict(taskId, 'reject')` and require `composer`.

Use import aliases to avoid name collisions:

```ts
import {
  clearReviewLoop,
  recordEnsembleVerdict as recordCounterEnsembleVerdict,
  recordPrincipalVerdict as recordCounterPrincipalVerdict,
  recordReviewIteration,
} from '../../workflow/review-loop-counter.js';
```

Reminder text helper:

```ts
export function formatReviewGateReminder(gate: ReviewGate): string {
  const action =
    gate.requiredNextAction === 'ensemble'
      ? '@ensemble review is required before continuing.'
      : gate.requiredNextAction === 'principal'
        ? '@principal final review is required before continuing.'
        : gate.requiredNextAction === 'principal-escalation'
          ? '@principal escalation is required with wheelsSpinning: true before continuing.'
          : '@composer rework is required before continuing.';

  return [
    '<internal_reminder>',
    'SENTINEL: review-loop-enforcer-v1',
    `Review gate active for taskId: ${gate.taskId}`,
    `Required next action: ${gate.requiredNextAction}`,
    `wheelsSpinning: ${gate.wheelsSpinning}`,
    `Reason: ${gate.lastError ?? gate.classification.reason}`,
    action,
    'Do not summarize or finish until this review gate is satisfied.',
    '</internal_reminder>',
  ].join('\n');
}
```

- [ ] **Step 4: Verify state tests pass**

```bash
bun test src/hooks/review-loop-enforcer/state.test.ts src/workflow/review-loop-counter.test.ts
```

Expected: All state tests pass and existing review-loop-counter tests still pass.

---

## Task 4: TDD the Hook Adapter

**Files:**
- Create: `src/hooks/review-loop-enforcer/index.ts`
- Create: `src/hooks/review-loop-enforcer/index.test.ts`

- [ ] **Step 1: Write failing hook-flow tests first**

Create `src/hooks/review-loop-enforcer/index.test.ts` with these exact test names:

```ts
import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { resetAllReviewLoops } from '../../workflow/review-loop-counter.js';
import { createReviewLoopEnforcerHook } from './index.js';

function createMessages(sessionID: string, text = 'continue') {
  return {
    messages: [
      {
        info: { role: 'user', agent: 'conductor', sessionID },
        parts: [{ type: 'text', text }],
      },
    ],
  };
}

function completedTaskOutput(taskId: string, result: string): string {
  return [`task_id: ${taskId}`, 'state: completed', '', '<task_result>', result, '</task_result>'].join('\n');
}

async function completeTask(
  hook: ReturnType<typeof createReviewLoopEnforcerHook>,
  agent: 'composer' | 'ensemble' | 'principal',
  callID: string,
  taskID: string,
  result: string,
): Promise<void> {
  await hook['tool.execute.before']({ tool: 'task', sessionID: 'parent-1', callID }, {
    args: { subagent_type: agent },
  });
  await hook['tool.execute.after']({ tool: 'task', sessionID: 'parent-1', callID }, {
    output: completedTaskOutput(taskID, result),
  });
}

describe('review-loop enforcer hook', () => {
  beforeEach(() => resetAllReviewLoops());

  test('captures composer completion and injects ensemble-required reminder', async () => {
    const hook = createReviewLoopEnforcerHook({ directory: '/repo' } as never, {
      shouldManageSession: () => true,
      collectChanges: () => ({ files: [{ path: 'src/runtime.ts', added: 20, deleted: 0 }] }),
    });

    await hook['tool.execute.before']({ tool: 'task', sessionID: 'parent-1', callID: 'call-1' }, {
      args: { subagent_type: 'composer', description: 'implement runtime' },
    });
    await hook['tool.execute.after']({ tool: 'task', sessionID: 'parent-1', callID: 'call-1' }, {
      output: completedTaskOutput('task-1', '<review_metadata>{"taskId":"task-1"}</review_metadata>'),
    });

    const messages = createMessages('parent-1');
    await hook['experimental.chat.messages.transform']({}, messages);
    expect(messages.messages[0].parts[0].text).toContain('Required next action: ensemble');
    expect(messages.messages[0].parts[0].text).toContain('@ensemble review is required');
  });

  test('markdown-only change injects principal-required reminder', async () => {
    const hook = createReviewLoopEnforcerHook({ directory: '/repo' } as never, {
      shouldManageSession: () => true,
      collectChanges: () => ({ files: [{ path: 'docs/guide.md', added: 50, deleted: 0 }] }),
    });

    await hook['tool.execute.before']({ tool: 'task', sessionID: 'parent-1', callID: 'call-1' }, {
      args: { subagent_type: 'composer' },
    });
    await hook['tool.execute.after']({ tool: 'task', sessionID: 'parent-1', callID: 'call-1' }, {
      output: completedTaskOutput('task-1', '<review_metadata>{"taskId":"task-1"}</review_metadata>'),
    });

    const messages = createMessages('parent-1');
    await hook['experimental.chat.messages.transform']({}, messages);
    expect(messages.messages[0].parts[0].text).toContain('Required next action: principal');
  });

  test('small non-risk change injects principal-required reminder', async () => {
    const hook = createReviewLoopEnforcerHook({ directory: '/repo' } as never, {
      shouldManageSession: () => true,
      collectChanges: () => ({ files: [{ path: 'src/helpers/string.ts', added: 3, deleted: 1 }] }),
    });

    await hook['tool.execute.before']({ tool: 'task', sessionID: 'parent-1', callID: 'call-1' }, {
      args: { subagent_type: 'composer' },
    });
    await hook['tool.execute.after']({ tool: 'task', sessionID: 'parent-1', callID: 'call-1' }, {
      output: completedTaskOutput('task-1', '<review_metadata>{"taskId":"task-1"}</review_metadata>'),
    });

    const messages = createMessages('parent-1');
    await hook['experimental.chat.messages.transform']({}, messages);
    expect(messages.messages[0].parts[0].text).toContain('under 10 changed lines');
    expect(messages.messages[0].parts[0].text).toContain('Required next action: principal');
  });

  test('agent plugin logic change injects ensemble-required reminder', async () => {
    const hook = createReviewLoopEnforcerHook({ directory: '/repo' } as never, {
      shouldManageSession: () => true,
      collectChanges: () => ({ files: [{ path: 'src/agents/composer.ts', added: 1, deleted: 0 }] }),
    });

    await hook['tool.execute.before']({ tool: 'task', sessionID: 'parent-1', callID: 'call-1' }, {
      args: { subagent_type: 'composer' },
    });
    await hook['tool.execute.after']({ tool: 'task', sessionID: 'parent-1', callID: 'call-1' }, {
      output: completedTaskOutput('task-1', '<review_metadata>{"taskId":"task-1"}</review_metadata>'),
    });

    const messages = createMessages('parent-1');
    await hook['experimental.chat.messages.transform']({}, messages);
    expect(messages.messages[0].parts[0].text).toContain('Required next action: ensemble');
    expect(messages.messages[0].parts[0].text).toContain('risk path touched');
  });

  test('ensemble reject changes required reminder to composer', async () => {
    const hook = createReviewLoopEnforcerHook({ directory: '/repo' } as never, {
      shouldManageSession: () => true,
      collectChanges: () => ({ files: [{ path: 'src/runtime.ts', added: 20, deleted: 0 }] }),
    });

    await hook['tool.execute.before']({ tool: 'task', sessionID: 'parent-1', callID: 'composer' }, {
      args: { subagent_type: 'composer' },
    });
    await hook['tool.execute.after']({ tool: 'task', sessionID: 'parent-1', callID: 'composer' }, {
      output: completedTaskOutput('task-1', '<review_metadata>{"taskId":"task-1"}</review_metadata>'),
    });
    await hook['tool.execute.before']({ tool: 'task', sessionID: 'parent-1', callID: 'ensemble' }, {
      args: { subagent_type: 'ensemble' },
    });
    await hook['tool.execute.after']({ tool: 'task', sessionID: 'parent-1', callID: 'ensemble' }, {
      output: completedTaskOutput('ens-1', JSON.stringify({ reviewedTaskId: 'task-1', verdict: 'reject', issues: [], consensus: 'majority' })),
    });

    const messages = createMessages('parent-1');
    await hook['experimental.chat.messages.transform']({}, messages);
    expect(messages.messages[0].parts[0].text).toContain('Required next action: composer');
  });

  test('ensemble approve changes required reminder to principal', async () => {
    const hook = createReviewLoopEnforcerHook({ directory: '/repo' } as never, {
      shouldManageSession: () => true,
      collectChanges: () => ({ files: [{ path: 'src/runtime.ts', added: 20, deleted: 0 }] }),
    });

    await hook['tool.execute.before']({ tool: 'task', sessionID: 'parent-1', callID: 'composer' }, {
      args: { subagent_type: 'composer' },
    });
    await hook['tool.execute.after']({ tool: 'task', sessionID: 'parent-1', callID: 'composer' }, {
      output: completedTaskOutput('task-1', '<review_metadata>{"taskId":"task-1"}</review_metadata>'),
    });
    await hook['tool.execute.before']({ tool: 'task', sessionID: 'parent-1', callID: 'ensemble' }, {
      args: { subagent_type: 'ensemble' },
    });
    await hook['tool.execute.after']({ tool: 'task', sessionID: 'parent-1', callID: 'ensemble' }, {
      output: completedTaskOutput('ens-1', JSON.stringify({ reviewedTaskId: 'task-1', verdict: 'approve', issues: [], consensus: 'unanimous' })),
    });

    const messages = createMessages('parent-1');
    await hook['experimental.chat.messages.transform']({}, messages);
    expect(messages.messages[0].parts[0].text).toContain('Required next action: principal');
  });

  test('re-injects the same required reminder on a fresh user message while gate is pending', async () => {
    const hook = createReviewLoopEnforcerHook({ directory: '/repo' } as never, {
      shouldManageSession: () => true,
      collectChanges: () => ({ files: [{ path: 'src/runtime.ts', added: 20, deleted: 0 }] }),
    });

    await completeTask(
      hook,
      'composer',
      'composer-1',
      'task-1',
      '<review_metadata>{"taskId":"task-1"}</review_metadata>',
    );

    const firstMessage = createMessages('parent-1', 'continue');
    await hook['experimental.chat.messages.transform']({}, firstMessage);
    expect(firstMessage.messages[0].parts[0].text).toContain('Required next action: ensemble');

    const freshMessage = createMessages('parent-1', 'summarize and finish');
    await hook['experimental.chat.messages.transform']({}, freshMessage);
    expect(freshMessage.messages[0].parts[0].text).toContain('Required next action: ensemble');
    expect(freshMessage.messages[0].parts[0].text).toContain('Do not summarize or finish');
  });

  test('loop count 3 injects principal escalation reminder', async () => {
    const hook = createReviewLoopEnforcerHook({ directory: '/repo' } as never, {
      shouldManageSession: () => true,
      collectChanges: () => ({ files: [{ path: 'src/runtime.ts', added: 20, deleted: 0 }] }),
    });

    await completeTask(hook, 'composer', 'composer-1', 'composer-run-1', '<review_metadata>{"taskId":"task-1"}</review_metadata>');
    await completeTask(hook, 'ensemble', 'ensemble-1', 'ensemble-run-1', JSON.stringify({ reviewedTaskId: 'task-1', verdict: 'reject', issues: [], consensus: 'majority' }));
    await completeTask(hook, 'composer', 'composer-2', 'composer-run-2', '<review_metadata>{"taskId":"task-1"}</review_metadata>');
    await completeTask(hook, 'ensemble', 'ensemble-2', 'ensemble-run-2', JSON.stringify({ reviewedTaskId: 'task-1', verdict: 'reject', issues: [], consensus: 'majority' }));
    // Existing review-loop-counter semantics escalate at the start of the
    // third Composer review round.
    await completeTask(hook, 'composer', 'composer-3', 'composer-run-3', '<review_metadata>{"taskId":"task-1"}</review_metadata>');

    const messages = createMessages('parent-1');
    await hook['experimental.chat.messages.transform']({}, messages);
    expect(messages.messages[0].parts[0].text).toContain('Required next action: principal-escalation');
    expect(messages.messages[0].parts[0].text).toContain('wheelsSpinning: true');
  });

  test('does not invoke ensemble or principal from the hook', async () => {
    const sessionCreate = mock(async () => {
      throw new Error('review-loop enforcer must not create sessions');
    });
    const sessionPrompt = mock(async () => {
      throw new Error('review-loop enforcer must not prompt sessions');
    });
    const sessionMessages = mock(async () => {
      throw new Error('review-loop enforcer must not read sessions to invoke agents');
    });
    const taskCreate = mock(async () => {
      throw new Error('review-loop enforcer must not create tasks');
    });

    const hook = createReviewLoopEnforcerHook({
      directory: '/repo',
      client: {
        session: { create: sessionCreate, prompt: sessionPrompt, messages: sessionMessages },
        task: { create: taskCreate },
      },
    } as never, {
      shouldManageSession: () => true,
      collectChanges: () => ({ files: [{ path: 'src/runtime.ts', added: 20, deleted: 0 }] }),
    });

    await completeTask(
      hook,
      'composer',
      'composer-1',
      'task-1',
      '<review_metadata>{"taskId":"task-1"}</review_metadata>',
    );
    const messages = createMessages('parent-1');
    await hook['experimental.chat.messages.transform']({}, messages);

    expect(sessionCreate).not.toHaveBeenCalled();
    expect(sessionPrompt).not.toHaveBeenCalled();
    expect(sessionMessages).not.toHaveBeenCalled();
    expect(taskCreate).not.toHaveBeenCalled();
    expect(messages.messages[0].parts[0].text).toContain('Required next action: ensemble');
  });
});
```

Run the targeted test and confirm it fails because `index.ts` does not exist yet:

```bash
bun test src/hooks/review-loop-enforcer/index.test.ts
```

Expected: Bun reports missing hook module or missing exports.

- [ ] **Step 2: Implement the hook factory**

Create `src/hooks/review-loop-enforcer/index.ts` with this shape:

```ts
import type { PluginInput } from '@opencode-ai/plugin';
import { parseTaskStatusOutput } from '../../utils/task.js';
import { classifyChanges, collectGitChangeSet } from './change-classifier.js';
import { formatReviewGateReminder, ReviewGateStore } from './state.js';
import type { ChangeSet, ReviewAgent } from './types.js';
import { parseEnsembleVerdict, parsePrincipalReviewMetadata } from './verdict-parser.js';

interface TaskArgs {
  subagent_type?: unknown;
  description?: unknown;
  prompt?: unknown;
}

interface PendingTaskCall {
  callId: string;
  parentSessionId: string;
  agentType: ReviewAgent;
}

interface ReviewLoopEnforcerOptions {
  shouldManageSession: (sessionID: string) => boolean;
  collectChanges?: () => ChangeSet | undefined;
}

const REVIEW_AGENTS = new Set<ReviewAgent>(['composer', 'ensemble', 'principal']);
const SENTINEL = 'SENTINEL: review-loop-enforcer-v1';

export function createReviewLoopEnforcerHook(
  ctx: PluginInput,
  options: ReviewLoopEnforcerOptions,
) {
  const store = new ReviewGateStore();
  const pendingCalls = new Map<string, PendingTaskCall>();
  const taskAgents = new Map<string, { parentSessionId: string; agentType: ReviewAgent }>();
  const processedTaskCompletions = new Set<string>();
  const collectChanges = options.collectChanges ?? (() => collectGitChangeSet(ctx.directory));

  function pendingCallId(input: { callID?: string; sessionID?: string }): string {
    return input.callID ?? `${input.sessionID ?? 'unknown'}:anonymous`;
  }

  function parseComposerTaskId(result: string | undefined, fallback: string): string {
    if (!result) return fallback;
    const metadata = /<review_metadata>\s*([\s\S]*?)\s*<\/review_metadata>/i.exec(result)?.[1];
    if (!metadata) return fallback;
    try {
      const parsed = JSON.parse(metadata);
      return typeof parsed?.taskId === 'string' && parsed.taskId.trim()
        ? parsed.taskId.trim()
        : fallback;
    } catch {
      return fallback;
    }
  }

  function processCompletedTask(parentSessionId: string, agentType: ReviewAgent, output: string): void {
    const status = parseTaskStatusOutput(output);
    if (!status || status.state !== 'completed') return;
    const signature = `${status.taskID}:completed:${agentType}`;
    if (processedTaskCompletions.has(signature)) return;
    processedTaskCompletions.add(signature);

    if (agentType === 'composer') {
      const taskId = parseComposerTaskId(status.result, status.taskID);
      store.recordComposerCompletion(parentSessionId, taskId, classifyChanges(collectChanges()));
      return;
    }

    if (agentType === 'ensemble') {
      store.recordEnsembleVerdict(parentSessionId, parseEnsembleVerdict(status.result ?? output));
      return;
    }

    store.recordPrincipalVerdict(parentSessionId, parsePrincipalReviewMetadata(status.result ?? output));
  }

  return {
    'tool.execute.before': async (
      input: { tool: string; sessionID?: string; callID?: string },
      output: { args?: unknown },
    ): Promise<void> => {
      if (input.tool.toLowerCase() !== 'task') return;
      if (!input.sessionID || !options.shouldManageSession(input.sessionID)) return;
      const args = output.args as TaskArgs | undefined;
      const agentType = args?.subagent_type;
      if (typeof agentType !== 'string' || !REVIEW_AGENTS.has(agentType as ReviewAgent)) return;
      pendingCalls.set(pendingCallId(input), {
        callId: pendingCallId(input),
        parentSessionId: input.sessionID,
        agentType: agentType as ReviewAgent,
      });
    },

    'tool.execute.after': async (
      input: { tool: string; sessionID?: string; callID?: string },
      output: { output: unknown },
    ): Promise<void> => {
      if (input.tool.toLowerCase() !== 'task') return;
      if (typeof output.output !== 'string') return;
      const pending = pendingCalls.get(pendingCallId(input));
      if (!pending) return;
      pendingCalls.delete(pending.callId);

      const status = parseTaskStatusOutput(output.output);
      if (status) {
        taskAgents.set(status.taskID, {
          parentSessionId: pending.parentSessionId,
          agentType: pending.agentType,
        });
      }
      processCompletedTask(pending.parentSessionId, pending.agentType, output.output);
    },

    'experimental.chat.messages.transform': async (
      _input: Record<string, never>,
      output: {
        messages: Array<{
          info: { role: string; agent?: string; sessionID?: string };
          parts: Array<{ type: string; text?: string; synthetic?: unknown; [key: string]: unknown }>;
        }>;
      },
    ): Promise<void> => {
      for (const message of output.messages) {
        for (const part of message.parts) {
          if (part.type !== 'text' || typeof part.text !== 'string' || part.synthetic !== true) continue;
          const status = parseTaskStatusOutput(part.text);
          if (!status || status.state !== 'completed') continue;
          const tracked = taskAgents.get(status.taskID);
          if (!tracked) continue;
          processCompletedTask(tracked.parentSessionId, tracked.agentType, part.text);
        }
      }

      for (let i = output.messages.length - 1; i >= 0; i -= 1) {
        const message = output.messages[i];
        if (message.info.role !== 'user') continue;
        if (message.info.agent && message.info.agent !== 'conductor') return;
        if (!message.info.sessionID || !options.shouldManageSession(message.info.sessionID)) return;
        const gate = store.getGate(message.info.sessionID);
        if (!gate) return;

        const textPart = message.parts.find(
          (part) => part.type === 'text' && typeof part.text === 'string',
        );
        if (!textPart || textPart.text?.includes(SENTINEL)) return;
        textPart.text = [textPart.text ?? '', '', formatReviewGateReminder(gate)].join('\n');
        return;
      }
    },
  };
}
```

- [ ] **Step 3: Verify hook tests pass**

```bash
bun test src/hooks/review-loop-enforcer/index.test.ts
```

Expected: All 9 hook-flow tests pass.

---

## Task 5: Register the Hook

**Files:**
- Modify: `src/hooks/index.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Add export**

In `src/hooks/index.ts`, add:

```ts
export { createReviewLoopEnforcerHook } from './review-loop-enforcer';
```

- [ ] **Step 2: Import, declare, initialize, and call in plugin entrypoint**

In `src/index.ts`:

1. Add to the existing hooks import list:

```ts
createReviewLoopEnforcerHook,
```

2. Add a closure variable near the other hook variables:

```ts
let reviewLoopEnforcerHook: ReturnType<typeof createReviewLoopEnforcerHook>;
```

3. Initialize after `sessionAgentMap` exists and before the return object:

```ts
reviewLoopEnforcerHook = createReviewLoopEnforcerHook(ctx, {
  shouldManageSession: (sessionID) => sessionAgentMap.get(sessionID) === 'conductor',
});
```

4. In `'tool.execute.before'`, call the enforcer after `taskSessionManagerHook['tool.execute.before']`:

```ts
await reviewLoopEnforcerHook['tool.execute.before'](
  input as { tool: string; sessionID?: string; callID?: string },
  output as { args?: unknown },
);
```

5. In `'tool.execute.after'`, add a post-tool hook call after `task-session-manager`:

```ts
await runPostToolHook('review-loop-enforcer', () =>
  reviewLoopEnforcerHook['tool.execute.after'](
    input as { tool: string; sessionID?: string; callID?: string },
    output as { output: unknown },
  ),
);
```

6. In `'experimental.chat.messages.transform'`, call the enforcer after `taskSessionManagerHook` and before `phaseReminderHook`:

```ts
await reviewLoopEnforcerHook['experimental.chat.messages.transform'](
  input,
  typedOutput,
);
```

This ordering lets the existing task-session manager process background completions first, then lets the review enforcer inject the required next-action reminder before the phase reminder.

- [ ] **Step 3: Verify registration compiles**

```bash
bun run typecheck
```

Expected: TypeScript passes with no errors.

---

## Task 6: Add Prompt Metadata Edits Only

**Files:**
- Modify: `src/agents/composer.ts`
- Modify: `src/agents/ensemble.ts`
- Modify: `src/agents/principal.ts`
- Create: `src/agents/review-metadata.test.ts`

- [ ] **Step 1: Write failing prompt metadata tests first**

Create `src/agents/review-metadata.test.ts` with these exact test names:

```ts
import { describe, expect, test } from 'bun:test';
import { createComposerAgent } from './composer.js';
import { createEnsembleAgent } from './ensemble.js';
import { createPrincipalAgent } from './principal.js';

describe('review metadata prompts', () => {
  test('composer prompt requires taskId review metadata', () => {
    const prompt = createComposerAgent('test/model').config.prompt as string;
    expect(prompt).toContain('<review_metadata>');
    expect(prompt).toContain('"taskId"');
  });

  test('ensemble review JSON requires reviewedTaskId', () => {
    const prompt = createEnsembleAgent('test/model').config.prompt as string;
    expect(prompt).toContain('"reviewedTaskId"');
    expect(prompt).toContain('reviewedTaskId of the Composer task');
  });

  test('principal prompt requires reviewedTaskId confirmation', () => {
    const prompt = createPrincipalAgent('test/model').config.prompt as string;
    expect(prompt).toContain('<review_metadata>');
    expect(prompt).toContain('"reviewedTaskId"');
  });
});
```

Run the targeted test and confirm it fails before prompt edits:

```bash
bun test src/agents/review-metadata.test.ts
```

Expected: Tests fail because the prompt metadata strings are not present yet.

- [ ] **Step 2: Update Composer output metadata only**

In `src/agents/composer.ts`, update the Output Format block to include only this additional metadata:

```md
<review_metadata>{"taskId":"stable-task-id-from-request-or-generated-fallback"}</review_metadata>
```

Add one sentence below the block:

```md
Use the taskId provided by Conductor when present; otherwise create a short stable id for this Composer task and keep it unchanged during rework for the same review loop.
```

Do not change Composer role, tools, permissions, or validation rules.

- [ ] **Step 3: Update Ensemble existing Review Panel JSON only**

In `src/agents/ensemble.ts`, add exactly one top-level field to the Review Panel JSON example:

```json
"reviewedTaskId": "reviewedTaskId of the Composer task",
```

Place it before `"verdict"`. Do not add new prompt fields for `requiredNextAction` or `criticalIssues`; the parser derives next action and can detect critical severity from the existing `issues` array.

- [ ] **Step 4: Update Principal result metadata only**

In `src/agents/principal.ts`, add this line inside the `<results>` output format:

```md
  <review_metadata>{"reviewedTaskId":"task-id-being-reviewed"}</review_metadata>
```

Add one sentence under Review Gate:

```md
- Confirm the reviewedTaskId for the Composer task or principal-only skip path you reviewed.
```

Do not change Principal's role, tools, or review criteria.

- [ ] **Step 5: Verify prompt metadata tests pass**

```bash
bun test src/agents/review-metadata.test.ts
```

Expected: All 3 prompt metadata tests pass.

---

## Task 7: End-to-End Targeted Test Pass

**Files:**
- No new files unless earlier targeted tests reveal a small type or import fix.

- [ ] **Step 1: Run all review-loop targeted tests**

```bash
bun test \
  src/hooks/review-loop-enforcer/change-classifier.test.ts \
  src/hooks/review-loop-enforcer/verdict-parser.test.ts \
  src/hooks/review-loop-enforcer/state.test.ts \
  src/hooks/review-loop-enforcer/index.test.ts \
  src/agents/review-metadata.test.ts \
  src/workflow/review-loop-counter.test.ts
```

Expected: All targeted tests pass. These tests cover the required spec cases:
- Composer completion → Ensemble required.
- Markdown-only change → Principal required.
- Small non-risk change → Principal required.
- Agent/plugin logic change → Ensemble required.
- Ensemble reject → Composer required.
- Ensemble approve → Principal required.
- Loop count 3 → Principal escalation with `wheelsSpinning: true` at the start of the third Composer review round.
- Fresh user message while gate is pending → same blocking reminder re-injected.
- Real `collectGitChangeSet` temp-repo parsing → tracked and untracked changes detected.

- [ ] **Step 2: Run TypeScript check**

```bash
bun run typecheck
```

Expected: TypeScript exits 0 with no errors.

- [ ] **Step 3: Run full test suite**

```bash
bun test
```

Expected: All tests pass.

- [ ] **Step 4: Run linter**

```bash
bun run lint
```

Expected: Biome linter exits 0.

- [ ] **Step 5: Run build**

```bash
bun run build
```

Expected: Build succeeds and declaration emit succeeds.

---

## Implementation Constraints Checklist

- [ ] The hook never calls Task, Ensemble, Principal, or Composer by itself.
- [ ] The hook only records state and injects internal reminders into Conductor context.
- [ ] Skip conditions are exactly: markdown-only docs changes OR under 10 changed lines with no risk path touched.
- [ ] There is no standalone “simple configuration tweak” classifier category.
- [ ] Agent/review/plugin logic changes require Ensemble even when under 10 changed lines.
- [ ] `src/utils/` changes require Ensemble because task output parsing and review-support utilities are risk paths.
- [ ] Empty change sets require Ensemble because “no changes detected” is conservative/unknown, not a principal-only skip.
- [ ] Ensemble remains usable for both general consensus and review-panel mode; no council redesign occurs.
- [ ] Prompt edits are limited to Composer `taskId`, Ensemble `reviewedTaskId`, and Principal `reviewedTaskId` confirmation.
- [ ] Existing `src/workflow/review-loop-counter.ts` remains the loop-count source of truth.
- [ ] Loop escalation is interpreted per existing counter semantics: `loopCount >= 3` means principal escalation at the start of the third Composer review round.
