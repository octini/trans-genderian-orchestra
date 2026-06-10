import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('GitHub Actions CI workflow', () => {
  test('runs package commands from repository root', () => {
    const workflow = readFileSync(
      new URL('../../.github/workflows/ci.yml', import.meta.url),
      'utf8',
    );

    expect(workflow).toContain('bun install --frozen-lockfile');
    expect(workflow).toContain('bun run check:ci');
    expect(workflow).toContain('bun run typecheck');
    expect(workflow).toContain('bun run test');
    expect(workflow).not.toContain('- run: bun test\n');
    expect(workflow).not.toContain(
      'working-directory: trans-genderian-orchestra',
    );
  });
});
