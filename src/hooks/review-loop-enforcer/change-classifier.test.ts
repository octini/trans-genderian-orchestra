import { describe, expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
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

  test('does not treat removed internal context files as public docs', () => {
    const result = classifyChanges(
      changeSet([{ path: 'PROJECT_STATE.md', added: 20, deleted: 2 }]),
    );
    expect(result.requiredReview).toBe('ensemble');
    expect(result.skipEnsemble).toBe(false);
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
      changeSet([
        { path: 'assets/logo.bin', added: 1, deleted: 0, binary: true },
      ]),
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
