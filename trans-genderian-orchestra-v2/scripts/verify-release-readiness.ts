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

function checkRepositoryDirectory(pkg: ReleasePackageJson): CheckResult {
  const actual = pkg.repository?.directory;
  return {
    id: 'repository.directory',
    ok: actual === 'trans-genderian-orchestra-v2',
    detail: `repository.directory=${actual ?? 'missing'}`,
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
    'No git push, npm publish, latest tag, root cutover, or v1 archive';
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
  checkRepositoryDirectory(pkg),
  checkPackFiles(pkg),
  checkApprovalBoundaries(),
];

console.log(JSON.stringify({ checks }, null, 2));

if (checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}
