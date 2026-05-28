import { describe, expect, test } from 'bun:test';
import { createSetupSkillsHook, formatSkillRecommendation } from './index';

describe('setup-matt-pocock-skills command hook', () => {
  test('registers /setup-matt-pocock-skills command when absent', () => {
    const hook = createSetupSkillsHook();
    const config: Record<string, unknown> = {};

    hook.registerCommand(config);

    const command = (config.command as Record<string, unknown>)[
      'setup-matt-pocock-skills'
    ] as {
      template?: string;
      description?: string;
    };
    expect(command).toBeDefined();
    expect(command.template).toContain('Matt Pocock skills');
    expect(command.description).toContain('fallback');
  });

  test('does not overwrite existing /setup-matt-pocock-skills command', () => {
    const hook = createSetupSkillsHook();
    const existing = { template: 'custom', description: 'custom command' };
    const config: Record<string, unknown> = {
      command: { 'setup-matt-pocock-skills': existing },
    };

    hook.registerCommand(config);

    expect(
      (config.command as Record<string, unknown>)['setup-matt-pocock-skills'],
    ).toBe(existing);
  });

  test('expands /setup-matt-pocock-skills into setup guidance', async () => {
    const hook = createSetupSkillsHook();
    const output = { parts: [{ type: 'text', text: 'template' }] };

    await hook.handleCommandExecuteBefore(
      { command: 'setup-matt-pocock-skills', sessionID: 's1', arguments: '' },
      output,
    );

    expect(output.parts).toHaveLength(1);
    expect(output.parts[0].text).toContain('Agent Skills Setup');
    expect(output.parts[0].text).toContain('using-superpowers');
    expect(output.parts[0].text).toContain('Dynamic Recommendations');
    expect(output.parts[0].text).toContain('Automatic setup did not complete');
    expect(output.parts[0].text).toContain('/skills');
  });

  test('normalizes slash-prefixed command names', async () => {
    const hook = createSetupSkillsHook();
    const output = { parts: [{ type: 'text', text: 'template' }] };

    await hook.handleCommandExecuteBefore(
      {
        command: '/setup-matt-pocock-skills',
        sessionID: 's1',
        arguments: '',
      },
      output,
    );

    expect(output.parts).toHaveLength(1);
    expect(output.parts[0].text).toContain('Agent Skills Setup');
  });

  test('tries fallback installer when primary installer fails', async () => {
    const calls: string[][] = [];
    const hook = createSetupSkillsHook(
      '/tmp/project',
      async (cmd) => {
        calls.push(cmd);
        const isFallback = cmd[2] === 'setup-matt-pocock-skills';
        return {
          success: isFallback,
          stdout: isFallback ? 'installed' : '',
          stderr: isFallback ? '' : '404',
        };
      },
      async () => true,
    );
    const output = { parts: [{ type: 'text', text: 'template' }] };

    await hook.handleCommandExecuteBefore(
      { command: 'setup-matt-pocock-skills', sessionID: 's1', arguments: '' },
      output,
    );

    expect(calls).toEqual([
      [
        'npx',
        '--yes',
        '@opencode-ai/skills-installer',
        'setup-matt-pocock-skills',
      ],
      ['npx', '--yes', 'setup-matt-pocock-skills'],
    ]);
    expect(output.parts[0].text).toContain(
      'npx --yes @opencode-ai/skills-installer setup-matt-pocock-skills',
    );
    expect(output.parts[0].text).toContain(
      'npx --yes setup-matt-pocock-skills',
    );
    expect(output.parts[0].text).toContain(
      'Matt Pocock skills setup completed',
    );
  });

  test('reports manual next steps when both installers fail', async () => {
    const hook = createSetupSkillsHook(
      '/tmp/project',
      async () => ({
        success: false,
        stdout: '',
        stderr: 'failed',
      }),
      async () => true,
    );
    const output = { parts: [{ type: 'text', text: 'template' }] };

    await hook.handleCommandExecuteBefore(
      { command: 'setup-matt-pocock-skills', sessionID: 's1', arguments: '' },
      output,
    );

    expect(output.parts[0].text).toContain(
      'npx --yes @opencode-ai/skills-installer setup-matt-pocock-skills',
    );
    expect(output.parts[0].text).toContain(
      'npx --yes setup-matt-pocock-skills',
    );
    expect(output.parts[0].text).toContain(
      'run `/skills` and select `/setup-matt-pocock-skills`',
    );
    expect(output.parts[0].text).toContain(
      'https://github.com/mattpocock/skills',
    );
  });

  test('skips npx execution when package verification fails', async () => {
    const calls: string[][] = [];
    const hook = createSetupSkillsHook(
      '/tmp/project',
      async (cmd) => {
        calls.push(cmd);
        return { success: true, stdout: 'installed', stderr: '' };
      },
      async () => false,
    );
    const output = { parts: [{ type: 'text', text: 'template' }] };

    await hook.handleCommandExecuteBefore(
      { command: 'setup-matt-pocock-skills', sessionID: 's1', arguments: '' },
      output,
    );

    expect(calls).toEqual([]);
    expect(output.parts[0].text).toContain('Package verification failed');
    expect(output.parts[0].text).toContain(
      'run `/skills` and select `/setup-matt-pocock-skills`',
    );
  });

  test('ignores other commands', async () => {
    const hook = createSetupSkillsHook();
    const output = { parts: [{ type: 'text', text: 'template' }] };

    await hook.handleCommandExecuteBefore(
      { command: 'deepwork', sessionID: 's1', arguments: 'x' },
      output,
    );

    expect(output.parts).toEqual([{ type: 'text', text: 'template' }]);
  });
});

describe('formatSkillRecommendation', () => {
  test('returns empty string without recommendations', () => {
    expect(formatSkillRecommendation([])).toBe('');
  });

  test('formats recommended skills for delegation envelopes', () => {
    expect(formatSkillRecommendation(['tdd', 'zoom-out'])).toBe(
      '**Recommended skills:** `tdd`, `zoom-out`. Load with `skill({ name: "<name>" })` on first turn.',
    );
  });
});
