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
    expect(
      existsSync(join(repoRoot, 'scripts', 'verify-release-readiness.ts')),
    ).toBe(true);
    expect(existsSync(join(repoRoot, 'trans-genderian-orchestra-v2'))).toBe(
      false,
    );
  });

  test('legacy implementation is archived', () => {
    expect(
      existsSync(join(repoRoot, 'archive', 'trans-genderian-orchestra-v1')),
    ).toBe(true);
    expect(existsSync(join(repoRoot, 'trans-genderian-orchestra'))).toBe(false);
  });

  test('root package metadata is repository-root aware', () => {
    const pkg = JSON.parse(
      readFileSync(join(repoRoot, 'package.json'), 'utf8'),
    );

    expect(pkg.name).toBe('trans-genderian-orchestra');
    expect(pkg.version).toMatch(/^2\.0\.0-beta\.\d+$/);
    expect(pkg.repository).toEqual({
      type: 'git',
      url: 'git+ssh://git@github.com/octini/trans-genderian-orchestra.git',
    });
    expect(pkg.repository.directory).toBeUndefined();
    expect(pkg.homepage).toBe(
      'https://github.com/octini/trans-genderian-orchestra',
    );
    expect(pkg.scripts.test).toBe('bun test --path-ignore-patterns archive');
  });

  test('root README is the real v2 README, not the shim', () => {
    const readme = readFileSync(join(repoRoot, 'README.md'), 'utf8');

    expect(readme).toContain('TGO v2');
    expect(readme).toContain(
      'bootstrap --tools default --models balanced --resilience balanced',
    );
    expect(readme).not.toContain('Active beta package');
  });
});
