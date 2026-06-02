import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

const REQUIRED_FILES = [
  'README.md',
  'MIGRATION.md',
  'RELEASE.md',
  'package.json',
];

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
  return JSON.parse(
    readFileSync(join(ROOT, 'package.json'), 'utf8'),
  ) as ReleasePackageJson;
}

function checkFiles(): CheckResult {
  const missing = REQUIRED_FILES.filter(
    (file) => !existsSync(join(ROOT, file)),
  );
  return {
    id: 'required_files',
    ok: missing.length === 0,
    detail:
      missing.length === 0
        ? 'all required files present'
        : `missing: ${missing.join(', ')}`,
  };
}

function checkRepositoryRoot(pkg: ReleasePackageJson): CheckResult {
  const directory = pkg.repository?.directory;
  return {
    id: 'repository_root',
    ok:
      pkg.repository?.type === 'git' &&
      pkg.repository?.url ===
        'git+ssh://git@github.com/octini/trans-genderian-orchestra.git' &&
      directory === undefined,
    detail:
      directory === undefined
        ? 'repository points to root'
        : `repository.directory=${directory}`,
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
    detail:
      missing.length === 0
        ? 'package files list includes release docs'
        : `missing: ${missing.join(', ')}`,
  };
}

function checkApprovalBoundaries(): CheckResult {
  const release = readFileSync(join(ROOT, 'RELEASE.md'), 'utf8');
  const required =
    'No git push, npm publish, latest tag, remote repository rewrite, or archived v1 deletion';
  return {
    id: 'approval_boundaries',
    ok: release.includes(required),
    detail: release.includes(required)
      ? 'approval boundaries documented'
      : 'approval boundaries missing',
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
