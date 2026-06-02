import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('release readiness documentation', () => {
  test('release guide records local beta validation commands and approval gates', () => {
    const release = readFileSync(
      new URL('../../RELEASE.md', import.meta.url),
      'utf8',
    );

    expect(release).toContain('bun test');
    expect(release).toContain('bun run typecheck');
    expect(release).toContain('bun run check:ci');
    expect(release).toContain('bun run build');
    expect(release).toContain('npm pack --dry-run --json');
    expect(release).toContain('/tgo:doctor --json');
    expect(release).toContain(
      'No git push, npm publish, latest tag, root cutover, or v1 archive',
    );
  });

  test('package ships release documentation', () => {
    const pkg = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    );

    expect(pkg.files).toContain('RELEASE.md');
  });
});
