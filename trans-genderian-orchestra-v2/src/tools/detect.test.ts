import { describe, expect, test } from 'bun:test';
import { detectRequiredTools } from './detect';

describe('tool detector', () => {
  test('reports missing required and degraded optional tools', async () => {
    const result = await detectRequiredTools({
      async which(command) {
        return command === 'git' ? `/usr/bin/${command}` : undefined;
      },
    });

    expect(result).toEqual({
      tools: [
        { name: 'git', status: 'user-managed', path: '/usr/bin/git' },
        { name: 'bd', status: 'missing' },
        { name: 'ctx7', status: 'missing' },
      ],
      blocked: [
        {
          capability: 'beads',
          reason: 'Beads CLI is missing.',
          repair_command: 'brew install beads or npm install -g @beads/bd',
        },
      ],
      degraded: [
        {
          capability: 'context7-cli',
          reason: 'Context7 CLI is missing.',
          repair_command: 'npx ctx7 setup --opencode',
        },
      ],
    });
  });
});
