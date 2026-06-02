import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('release documentation', () => {
  test('package ships migration documentation', () => {
    const pkg = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    );

    expect(pkg.files).toContain('MIGRATION.md');
  });

  test('migration guide documents v1 replacement and rollback boundaries', () => {
    const migration = readFileSync(
      new URL('../../MIGRATION.md', import.meta.url),
      'utf8',
    );

    expect(migration).toContain('V1/omo-slim detection');
    expect(migration).toContain(
      'v2 replaces v1 rather than running side-by-side',
    );
    expect(migration).toContain('manifest-linked backup');
    expect(migration).toContain(
      'No automatic push, PR, latest publish, root cutover, or worktree cleanup',
    );
  });

  test('readme reflects current beta scope', () => {
    const readme = readFileSync(
      new URL('../../README.md', import.meta.url),
      'utf8',
    );

    expect(readme).toContain('2.0.0-beta');
    expect(readme).toContain(
      'bootstrap --tools default --models balanced --resilience balanced',
    );
    expect(readme).toContain('Phase 7 release hardening');
  });
});
