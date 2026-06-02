import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('public beta OpenCode validation smoke', () => {
  test('package exposes explicit public beta OpenCode smoke script', () => {
    const pkg = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    );

    expect(pkg.scripts['verify:public-beta-opencode']).toBe(
      'bun run scripts/verify-public-beta-opencode.ts',
    );
  });

  test('smoke script is disposable-home only and checks the TGO command path', () => {
    const source = readFileSync(
      new URL('../../scripts/verify-public-beta-opencode.ts', import.meta.url),
      'utf8',
    );

    expect(source).toContain('mkdtempSync');
    expect(source).toContain('trans-genderian-orchestra@beta');
    expect(source).toContain(
      'npx --yes trans-genderian-orchestra@beta doctor --json',
    );
    expect(source).toContain('bd doctor');
    expect(source).toContain('configUnchanged');
    expect(source).toContain('process.exitCode = 1');
  });
});
