import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('release readiness verifier', () => {
  test('package exposes verify release script', () => {
    const pkg = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    );

    expect(pkg.scripts['verify:release-readiness']).toBe(
      'bun run scripts/verify-release-readiness.ts',
    );
  });

  test('verifier source checks docs, metadata, and approval boundaries', () => {
    const source = readFileSync(
      new URL('../../scripts/verify-release-readiness.ts', import.meta.url),
      'utf8',
    );

    expect(source).toContain('REQUIRED_FILES');
    expect(source).toContain('repository.directory');
    expect(source).toContain('approval_boundaries');
    expect(source).toContain('process.exitCode = 1');
  });
});
