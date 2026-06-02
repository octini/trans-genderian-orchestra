import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('repository layout metadata', () => {
  test('root README points GitHub readers to the v2 package', () => {
    const rootReadme = readFileSync(
      new URL('../../../README.md', import.meta.url),
      'utf8',
    );

    expect(rootReadme).toContain('trans-genderian-orchestra-v2');
    expect(rootReadme).toContain('Active beta package');
    expect(rootReadme).toContain(
      'No remote push, npm publish, or root cutover happens without explicit approval',
    );
  });

  test('package metadata links npm readers back to the repository subdirectory', () => {
    const pkg = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    );

    expect(pkg.repository).toEqual({
      type: 'git',
      url: 'git+ssh://git@github.com/octini/trans-genderian-orchestra.git',
      directory: 'trans-genderian-orchestra-v2',
    });
    expect(pkg.bugs).toEqual({
      url: 'https://github.com/octini/trans-genderian-orchestra/issues',
    });
    expect(pkg.homepage).toBe(
      'https://github.com/octini/trans-genderian-orchestra/tree/master/trans-genderian-orchestra-v2',
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
