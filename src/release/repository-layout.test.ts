import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('repository layout metadata', () => {
  test('root README is the active v2 package README', () => {
    const rootReadme = readFileSync(
      new URL('../../README.md', import.meta.url),
      'utf8',
    );

    expect(rootReadme).toContain('TGO v2');
    expect(rootReadme).toContain(
      'bootstrap --tools default --models balanced --resilience balanced',
    );
    expect(rootReadme).toContain('Phase 7 release hardening');
    expect(rootReadme).not.toContain('Active beta package');
  });

  test('package metadata links npm readers back to the repository root', () => {
    const pkg = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    );

    expect(pkg.repository).toEqual({
      type: 'git',
      url: 'git+ssh://git@github.com/octini/trans-genderian-orchestra.git',
    });
    expect(pkg.repository.directory).toBeUndefined();
    expect(pkg.bugs).toEqual({
      url: 'https://github.com/octini/trans-genderian-orchestra/issues',
    });
    expect(pkg.homepage).toBe(
      'https://github.com/octini/trans-genderian-orchestra',
    );
    expect(pkg.keywords).toEqual(
      expect.arrayContaining([
        'opencode',
        'opencode-plugin',
        'agents',
        'orchestration',
      ]),
    );
  });
});
