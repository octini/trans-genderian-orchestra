import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';

const deepDiveDocs = [
  'docs/architecture.md',
  'docs/agents-and-workflows.md',
  'docs/setup-doctor-manifests.md',
  'docs/tools-skills-mcps.md',
  'docs/models-resilience-council.md',
  'docs/migration-and-release.md',
];

function readRepoFile(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('release documentation', () => {
  test('package ships migration and release documentation', () => {
    const pkg = JSON.parse(readRepoFile('package.json'));

    expect(pkg.files).toContain('MIGRATION.md');
    expect(pkg.files).toContain('RELEASE.md');
  });

  test('migration guide documents v1 replacement and rollback boundaries', () => {
    const migration = readRepoFile('MIGRATION.md');

    expect(migration).toContain('V1/omo-slim detection');
    expect(migration).toContain(
      'v2 replaces v1 rather than running side-by-side',
    );
    expect(migration).toContain('manifest-linked backup');
    expect(migration).toContain(
      'No automatic push, PR, latest publish, root cutover, or worktree cleanup',
    );
  });

  test('readme is the public beta front door', () => {
    const readme = readRepoFile('README.md');

    expect(readme).toContain('2.0.0-beta.6');
    expect(readme).toContain('trans-genderian-orchestra@beta');
    expect(readme).toContain(
      'opencode plugin trans-genderian-orchestra@beta --global --force',
    );
    expect(readme).toContain('/tgo:doctor --json');
    expect(readme).toContain('verify:public-beta-opencode');
    expect(readme).toContain('latest');
    expect(readme).toContain(
      'bootstrap --tools default --models balanced --resilience balanced',
    );
    expect(readme).toContain('lives at the repository root');
    expect(readme).not.toContain('Active beta package');
    expect(readme).not.toContain('this subfolder');

    for (const docPath of deepDiveDocs) {
      expect(readme).toContain(`./${docPath}`);
    }
  });

  test('docs hub links every public deep dive and operational guide', () => {
    const docsHub = readRepoFile('docs/README.md');

    for (const docPath of deepDiveDocs) {
      expect(existsSync(new URL(`../../${docPath}`, import.meta.url))).toBe(
        true,
      );
      expect(docsHub).toContain(`./${docPath.replace('docs/', '')}`);
    }

    expect(docsHub).toContain('../MIGRATION.md');
    expect(docsHub).toContain('../RELEASE.md');
  });

  test('public docs avoid stale v1 package guidance', () => {
    const publicDocs = ['README.md', 'docs/README.md', ...deepDiveDocs].map(
      (path) => [path, readRepoFile(path)] as const,
    );

    for (const [path, contents] of publicDocs) {
      expect(contents, path).not.toContain('trans-genderian-orchestra-v2/');
      expect(contents, path).not.toContain(
        'npm install ./trans-genderian-orchestra-v2',
      );
      expect(contents, path).not.toContain('working `/ping-all`');
      expect(contents, path).not.toContain('installer TUI');
      expect(contents, path).not.toContain('multiplexer panes');
      expect(contents, path).not.toContain('browser interview flow');
      expect(contents, path).not.toContain('stable release');
    }
  });

  test('repository guidance reflects current v2 agent and config model', () => {
    const guidanceDocs = ['AGENTS.md', 'CONTEXT.md', 'README.md'].map(
      (path) => [path, readRepoFile(path)] as const,
    );

    for (const [path, contents] of guidanceDocs) {
      expect(contents, path).not.toContain('pure dispatcher');
      expect(contents, path).not.toContain(
        'Run from `trans-genderian-orchestra/`',
      );
      expect(contents, path).not.toContain('Planning Agent');
      expect(contents, path).not.toContain('working `/ping-all`');
      expect(contents, path).toContain('trans-genderian-orchestra.jsonc');
    }

    expect(readRepoFile('AGENTS.md')).not.toContain('### Planner');
    expect(readRepoFile('CONTEXT.md')).not.toContain(
      '## Agent Roles\n- **Orchestrator** — Pure dispatcher',
    );
  });

  test('feature docs cover every v2 design spec number', () => {
    const docsCorpus = deepDiveDocs
      .map((path) => readRepoFile(path))
      .join('\n\n');

    for (const specNumber of ['00', '01', '02', '03', '04', '05', '06', '07']) {
      expect(docsCorpus).toContain(`Spec ${specNumber}`);
    }
  });
});
