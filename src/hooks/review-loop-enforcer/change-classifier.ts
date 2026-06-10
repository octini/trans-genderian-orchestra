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

export function classifyChanges(
  changeSet: ChangeSet | undefined,
): ChangeClassification {
  if (!changeSet) {
    return requireEnsemble('classification failed', 0, []);
  }

  const changedLines = changeSet.files.reduce(
    (sum, file) => sum + file.added + file.deleted,
    0,
  );
  const riskPaths = changeSet.files.filter(isRiskPath).map((file) => file.path);

  if (changeSet.files.length === 0) {
    return requireEnsemble(
      'no changed files detected; classification unknown',
      changedLines,
      riskPaths,
    );
  }

  if (
    changeSet.files.some((file) => file.binary || isUnknownFileType(file.path))
  ) {
    return requireEnsemble('unknown file type', changedLines, riskPaths);
  }

  if (riskPaths.length > 0) {
    return requireEnsemble(
      `risk path touched: ${riskPaths.join(', ')}`,
      changedLines,
      riskPaths,
    );
  }

  if (changeSet.files.every((file) => isDocsMarkdownPath(file.path))) {
    return requirePrincipal(
      'markdown-only docs changes',
      changedLines,
      riskPaths,
    );
  }

  if (changedLines < 10) {
    return requirePrincipal(
      'under 10 changed lines and no risk path touched',
      changedLines,
      riskPaths,
    );
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
  return {
    requiredReview: 'principal',
    skipEnsemble: true,
    changedLines,
    reason,
    riskPaths,
  };
}

function requireEnsemble(
  reason: string,
  changedLines: number,
  riskPaths: string[],
): ChangeClassification {
  return {
    requiredReview: 'ensemble',
    skipEnsemble: false,
    changedLines,
    reason,
    riskPaths,
  };
}
