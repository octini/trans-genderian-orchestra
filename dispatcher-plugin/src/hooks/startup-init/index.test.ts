import { describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { BackgroundJobBoard } from '../../utils';
import { createContextOrchestratorHook } from '../context-orchestrator';
import { createStartupInitHook, type ExecResult } from './index';

function successfulExecutor(): () => Promise<ExecResult> {
  return async () => ({ success: true, stdout: 'ok', stderr: '' });
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'dispatcher-startup-init-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('startup init hook command registration', () => {
  test('registers /init command when absent', () => {
    const hook = createStartupInitHook('/tmp/project');
    const config: Record<string, unknown> = {};

    hook.registerCommand(config);

    const command = (config.command as Record<string, unknown>).init as {
      template?: string;
      description?: string;
    };
    expect(command).toBeDefined();
    expect(command.template).toContain('Initialize Git');
    expect(command.description).toContain('version control');
  });

  test('does not overwrite existing /init command', () => {
    const hook = createStartupInitHook('/tmp/project');
    const existing = { template: 'custom', description: 'custom command' };
    const config: Record<string, unknown> = { command: { init: existing } };

    hook.registerCommand(config);

    expect((config.command as Record<string, unknown>).init).toBe(existing);
  });

  test('registers /beads:init command when absent', () => {
    const hook = createStartupInitHook('/tmp/project');
    const config: Record<string, unknown> = {};

    hook.registerCommand(config);

    const command = (config.command as Record<string, unknown>)[
      'beads:init'
    ] as {
      template?: string;
      description?: string;
    };
    expect(command).toBeDefined();
    expect(command.template).toContain('Beads');
    expect(command.description).toContain('beads init');
  });

  test('registers /init:all command when absent', () => {
    const hook = createStartupInitHook('/tmp/project');
    const config: Record<string, unknown> = {};

    hook.registerCommand(config);

    const command = (config.command as Record<string, unknown>)['init:all'] as {
      template?: string;
      description?: string;
    };
    expect(command).toBeDefined();
    expect(command.template).toContain('Git, Beads, and Matt Pocock skills');
    expect(command.description).toBe(
      'Initialize Git, Beads, and Matt Pocock skills in one step',
    );
  });

  test('does not overwrite existing /beads:init command', () => {
    const hook = createStartupInitHook('/tmp/project');
    const existing = { template: 'custom', description: 'custom command' };
    const config: Record<string, unknown> = {
      command: { 'beads:init': existing },
    };

    hook.registerCommand(config);

    expect((config.command as Record<string, unknown>)['beads:init']).toBe(
      existing,
    );
  });

  test('registers all startup init commands in one config', () => {
    const hook = createStartupInitHook('/tmp/project');
    const config: Record<string, unknown> = {};

    hook.registerCommand(config);

    hook.registerCommand(config);

    const commands = config.command as Record<string, unknown>;

    expect(commands.init).toBeDefined();
    expect(commands['init:all']).toBeDefined();
    expect(commands['beads:init']).toBeDefined();
    expect(commands['new-stream']).toBeDefined();
    expect(commands['close-stream']).toBeDefined();
    expect(
      Object.keys(commands).filter((name) => name === 'init'),
    ).toHaveLength(1);
    expect(
      Object.keys(commands).filter((name) => name === 'init:all'),
    ).toHaveLength(1);
    expect(
      Object.keys(commands).filter((name) => name === 'beads:init'),
    ).toHaveLength(1);
    expect(
      Object.keys(commands).filter((name) => name === 'new-stream'),
    ).toHaveLength(1);
    expect(
      Object.keys(commands).filter((name) => name === 'close-stream'),
    ).toHaveLength(1);
  });
});

describe('startup init hook command handling', () => {
  test('handles /init command with arguments', async () => {
    await withTempDir(async (dir) => {
      const templatePath = path.join(dir, 'template.md');
      await writeFile(templatePath, '# {{project_name}}\n', 'utf8');
      const calls: string[][] = [];
      const hook = createStartupInitHook(dir, {
        templatePath,
        execCommand: async (cmd) => {
          calls.push(cmd);
          if (cmd[0] === 'git' && cmd[1] === 'rev-parse') {
            return { success: false, stdout: '', stderr: 'not a git repo' };
          }
          return { success: true, stdout: 'initialized', stderr: '' };
        },
      });
      const output = { parts: [{ type: 'text', text: 'template' }] };

      await hook.handleCommandExecuteBefore(
        { command: 'init', sessionID: 's1', arguments: 'ignored args' },
        output,
      );

      expect(output.parts).toHaveLength(1);
      expect(output.parts[0].text).toContain('DISPATCHER ENVIRONMENT AUDIT');
      expect(output.parts[0].text).toContain('`/init` RESULT');
      expect(output.parts[0].text).toContain('git init');
      expect(output.parts[0].text).toContain('Git remote guidance');
      expect(output.parts[0].text).toContain(
        'git remote add origin <repository-url>',
      );
      expect(output.parts[0].text).toContain('git push -u origin main');
      expect(output.parts[0].text).toContain('Created AGENTS.md');
      expect(calls).toEqual([
        ['git', 'rev-parse', '--is-inside-work-tree'],
        ['git', 'init'],
      ]);
    });
  });

  test('handles /beads:init command', async () => {
    const calls: string[][] = [];
    const hook = createStartupInitHook('/tmp/project', {
      execCommand: async (cmd) => {
        calls.push(cmd);
        return { success: true, stdout: 'beads ready', stderr: '' };
      },
      packageVerifier: async () => true,
    });
    const output = { parts: [{ type: 'text', text: 'template' }] };

    await hook.handleCommandExecuteBefore(
      { command: 'beads:init', sessionID: 's1', arguments: '' },
      output,
    );

    expect(output.parts).toHaveLength(1);
    expect(output.parts[0].text).toContain('`/beads:init` RESULT');
    expect(output.parts[0].text).toContain('npx --yes beads init');
    expect(output.parts[0].text).toContain('beads ready');
    expect(calls).toEqual([['npx', '--yes', 'beads', 'init']]);
  });

  test('handles /init:all command', async () => {
    await withTempDir(async (dir) => {
      const templatePath = path.join(dir, 'template.md');
      await writeFile(templatePath, '# {{project_name}}\n', 'utf8');
      const calls: string[][] = [];
      const hook = createStartupInitHook(dir, {
        templatePath,
        execCommand: async (cmd) => {
          calls.push(cmd);
          if (cmd[0] === 'git') {
            return { success: true, stdout: 'git ready', stderr: '' };
          }
          if (cmd[2] === 'beads') {
            return { success: true, stdout: 'beads ready', stderr: '' };
          }
          return { success: true, stdout: 'skills ready', stderr: '' };
        },
        packageVerifier: async () => true,
      });
      const output = { parts: [{ type: 'text', text: 'template' }] };

      await hook.handleCommandExecuteBefore(
        { command: 'init:all', sessionID: 's1', arguments: '' },
        output,
      );

      expect(output.parts).toHaveLength(1);
      expect(output.parts[0].text).toContain('`/init:all` RESULT');
      expect(output.parts[0].text).toContain('git init');
      expect(output.parts[0].text).toContain('Git remote guidance');
      expect(output.parts[0].text).toContain(
        'git remote add origin <repository-url>',
      );
      expect(output.parts[0].text).toContain('AGENTS.md seed');
      expect(output.parts[0].text).toContain('Created AGENTS.md');
      expect(output.parts[0].text).toContain('npx --yes beads init');
      expect(output.parts[0].text).toContain(
        'npx --yes @opencode-ai/skills-installer setup-matt-pocock-skills',
      );
      expect(output.parts[0].text).toContain('skills ready');
      expect(calls).toEqual([
        ['git', 'init'],
        ['npx', '--yes', 'beads', 'init'],
        [
          'npx',
          '--yes',
          '@opencode-ai/skills-installer',
          'setup-matt-pocock-skills',
        ],
      ]);
    });
  });

  test('handles /init:all command with skills installer fallback', async () => {
    await withTempDir(async (dir) => {
      const templatePath = path.join(dir, 'template.md');
      await writeFile(templatePath, '# {{project_name}}\n', 'utf8');
      const calls: string[][] = [];
      const hook = createStartupInitHook(dir, {
        templatePath,
        execCommand: async (cmd) => {
          calls.push(cmd);
          if (cmd[0] === 'git') {
            return { success: true, stdout: 'git ready', stderr: '' };
          }
          if (cmd[2] === 'beads') {
            return { success: true, stdout: 'beads ready', stderr: '' };
          }
          if (cmd[2] === '@opencode-ai/skills-installer') {
            return { success: false, stdout: '', stderr: '404' };
          }
          return { success: true, stdout: 'skills ready', stderr: '' };
        },
        packageVerifier: async () => true,
      });
      const output = { parts: [{ type: 'text', text: 'template' }] };

      await hook.handleCommandExecuteBefore(
        { command: 'init:all', sessionID: 's1', arguments: '' },
        output,
      );

      expect(output.parts[0].text).toContain(
        'npx --yes @opencode-ai/skills-installer setup-matt-pocock-skills',
      );
      expect(output.parts[0].text).toContain(
        'npx --yes setup-matt-pocock-skills',
      );
      expect(output.parts[0].text).toContain('skills ready');
      expect(calls).toEqual([
        ['git', 'init'],
        ['npx', '--yes', 'beads', 'init'],
        [
          'npx',
          '--yes',
          '@opencode-ai/skills-installer',
          'setup-matt-pocock-skills',
        ],
        ['npx', '--yes', 'setup-matt-pocock-skills'],
      ]);
    });
  });

  test('handles /init:all command with manual skills setup guidance', async () => {
    await withTempDir(async (dir) => {
      const templatePath = path.join(dir, 'template.md');
      await writeFile(templatePath, '# {{project_name}}\n', 'utf8');
      const hook = createStartupInitHook(dir, {
        templatePath,
        execCommand: async (cmd) => {
          if (cmd[0] === 'git' || cmd[2] === 'beads') {
            return { success: true, stdout: 'ready', stderr: '' };
          }
          return { success: false, stdout: '', stderr: 'failed' };
        },
        packageVerifier: async () => true,
      });
      const output = { parts: [{ type: 'text', text: 'template' }] };

      await hook.handleCommandExecuteBefore(
        { command: 'init:all', sessionID: 's1', arguments: '' },
        output,
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
  });

  test('handles /new-stream command', async () => {
    await withTempDir(async (dir) => {
      const board = new BackgroundJobBoard();
      board.registerLaunch({
        taskID: 'child-1',
        parentSessionID: 'parent-1',
        agent: 'builder',
        description: 'old stream work',
      });
      const contextOrchestrator = createContextOrchestratorHook(dir, new Map());
      const hook = createStartupInitHook(dir, {
        execCommand: successfulExecutor(),
        contextOrchestrator,
        backgroundJobBoard: board,
      });
      const output = { parts: [{ type: 'text', text: 'template' }] };

      await hook.handleCommandExecuteBefore(
        { command: 'new-stream', sessionID: 's1', arguments: 'phase-2' },
        output,
      );

      const state = await readFile(
        path.join(dir, '.opencode', 'state.md'),
        'utf8',
      );
      expect(output.parts[0].text).toContain('`/new-stream` RESULT');
      expect(output.parts[0].text).toContain('phase-2');
      expect(state).toContain('- **Current Stream:** `phase-2`');
      expect(board.list()).toHaveLength(0);
    });
  });

  test('handles /close-stream command', async () => {
    await withTempDir(async (dir) => {
      const contextOrchestrator = createContextOrchestratorHook(dir, new Map());
      await contextOrchestrator.startNewStream('phase-2');
      const board = new BackgroundJobBoard();
      board.registerLaunch({
        taskID: 'child-1',
        parentSessionID: 'parent-1',
        agent: 'researcher',
        description: 'pending work',
      });
      const hook = createStartupInitHook(dir, {
        execCommand: successfulExecutor(),
        contextOrchestrator,
        backgroundJobBoard: board,
      });
      const output = { parts: [{ type: 'text', text: 'template' }] };

      await hook.handleCommandExecuteBefore(
        { command: 'close-stream', sessionID: 's1', arguments: '' },
        output,
      );

      const state = await readFile(
        path.join(dir, '.opencode', 'state.md'),
        'utf8',
      );
      expect(output.parts[0].text).toContain('`/close-stream` RESULT');
      expect(output.parts[0].text).toContain('phase-2');
      expect(state).toContain('## 4. Stream Archive');
      expect(state).toContain('- **Stream:** `phase-2`');
      expect(board.list()).toHaveLength(0);
    });
  });

  test('ignores other commands', async () => {
    const hook = createStartupInitHook('/tmp/project', {
      execCommand: successfulExecutor(),
    });
    const output = { parts: [{ type: 'text', text: 'template' }] };

    await hook.handleCommandExecuteBefore(
      { command: 'deepwork', sessionID: 's1', arguments: 'x' },
      output,
    );

    expect(output.parts).toEqual([{ type: 'text', text: 'template' }]);
  });

  test('skips verified npx commands when package verification fails', async () => {
    await withTempDir(async (dir) => {
      const templatePath = path.join(dir, 'template.md');
      await writeFile(templatePath, '# {{project_name}}\n', 'utf8');
      const calls: string[][] = [];
      const hook = createStartupInitHook(dir, {
        templatePath,
        execCommand: async (cmd) => {
          calls.push(cmd);
          return { success: true, stdout: 'ready', stderr: '' };
        },
        packageVerifier: async (packageName) => packageName !== 'beads',
      });
      const output = { parts: [{ type: 'text', text: 'template' }] };

      await hook.handleCommandExecuteBefore(
        { command: 'beads:init', sessionID: 's1', arguments: '' },
        output,
      );

      expect(calls).toEqual([]);
      expect(output.parts[0].text).toContain('Package verification failed');
    });
  });
});

describe('startup init audit dialog', () => {
  test('checks git remotes when git is initialized', async () => {
    const calls: string[][] = [];
    const hook = createStartupInitHook('/tmp/project', {
      execCommand: async (cmd) => {
        calls.push(cmd);
        if (cmd[0] === 'git' && cmd[1] === 'rev-parse') {
          return { success: true, stdout: 'true', stderr: '' };
        }
        if (cmd[0] === 'git' && cmd[1] === 'remote') {
          return {
            success: true,
            stdout: 'origin\thttps://github.com/example/repo.git (fetch)\n',
            stderr: '',
          };
        }
        return { success: false, stdout: '', stderr: 'unexpected command' };
      },
    });

    const results = await hook.runAudit();

    expect(results.git).toBe(true);
    expect(results.gitRemote).toBe(true);
    expect(calls).toEqual([
      ['git', 'rev-parse', '--is-inside-work-tree'],
      ['git', 'remote', '-v'],
    ]);
  });

  test('does not check git remotes when git is not initialized', async () => {
    const calls: string[][] = [];
    const hook = createStartupInitHook('/tmp/project', {
      execCommand: async (cmd) => {
        calls.push(cmd);
        return { success: false, stdout: '', stderr: 'not a git repo' };
      },
    });

    const results = await hook.runAudit();

    expect(results.git).toBe(false);
    expect(results.gitRemote).toBe(false);
    expect(calls).toEqual([['git', 'rev-parse', '--is-inside-work-tree']]);
  });

  test('returns all missing environment entries', () => {
    const hook = createStartupInitHook('/tmp/project');
    const dialog = hook.getAuditDialog({
      git: false,
      beads: false,
      skills: false,
    });

    expect(dialog).toContain('DISPATCHER ENVIRONMENT AUDIT');
    expect(dialog).toContain('MISSING ENVIRONMENTS DETECTED');
    expect(dialog).toContain('Git Version Control');
    expect(dialog).toContain('Beads Issue Tracker');
    expect(dialog).toContain('Matt Pocock Skills');
    expect(dialog).toContain('/init');
    expect(dialog).toContain('/init:all');
    expect(dialog).toContain('/beads:init');
    expect(dialog).toContain('/setup-matt-pocock-skills');
  });

  test('shows git remote note when git is initialized without a remote', () => {
    const hook = createStartupInitHook('/tmp/project');
    const dialog = hook.getAuditDialog({
      git: true,
      gitRemote: false,
      beads: true,
      skills: true,
    });

    expect(dialog).toContain('ENVIRONMENT READY');
    expect(dialog).toContain('GIT REMOTE NOT CONFIGURED');
    expect(dialog).toContain('git remote add origin <url>');
  });

  test('does not show git remote note when a remote is configured', () => {
    const hook = createStartupInitHook('/tmp/project');
    const dialog = hook.getAuditDialog({
      git: true,
      gitRemote: true,
      beads: true,
      skills: true,
    });

    expect(dialog).toContain('ENVIRONMENT READY');
    expect(dialog).not.toContain('GIT REMOTE NOT CONFIGURED');
    expect(dialog).not.toContain('git remote add origin <url>');
  });

  test('shows git remote note alongside missing non-git environments', () => {
    const hook = createStartupInitHook('/tmp/project');
    const dialog = hook.getAuditDialog({
      git: true,
      gitRemote: false,
      beads: false,
      skills: true,
    });

    expect(dialog).toContain('MISSING ENVIRONMENTS DETECTED');
    expect(dialog).toContain('Beads Issue Tracker');
    expect(dialog).toContain('GIT REMOTE NOT CONFIGURED');
  });

  test('shows /init:all as the first recommended command when multiple items are missing', () => {
    const hook = createStartupInitHook('/tmp/project');
    const dialog = hook.getAuditDialog({
      git: false,
      beads: false,
      skills: true,
    });

    expect(dialog).toContain('`/init:all`');
    expect(dialog).toContain('► All-in-one setup');
    expect(dialog.indexOf('`/init:all`')).toBeLessThan(
      dialog.indexOf('`/init`'),
    );
    expect(dialog.indexOf('`/init`')).toBeLessThan(
      dialog.indexOf('`/beads:init`'),
    );
  });

  test('does not show /init:all when only one item is missing', () => {
    const hook = createStartupInitHook('/tmp/project');
    const singleMissingResults = [
      { git: false, beads: true, skills: true },
      { git: true, beads: false, skills: true },
      { git: true, beads: true, skills: false },
    ];

    for (const results of singleMissingResults) {
      expect(hook.getAuditDialog(results)).not.toContain('`/init:all`');
    }
  });

  test('only mentions missing git environment', () => {
    const hook = createStartupInitHook('/tmp/project');
    const dialog = hook.getAuditDialog({
      git: false,
      beads: true,
      skills: true,
    });

    expect(dialog).toContain('Git Version Control');
    expect(dialog).toContain('/init');
    expect(dialog).not.toContain('/init:all');
    expect(dialog).not.toContain('Beads Issue Tracker');
    expect(dialog).not.toContain('Matt Pocock Skills');
    expect(dialog).not.toContain('/beads:init');
    expect(dialog).not.toContain('/setup-matt-pocock-skills');
  });

  test('only mentions missing beads environment', () => {
    const hook = createStartupInitHook('/tmp/project');
    const dialog = hook.getAuditDialog({
      git: true,
      beads: false,
      skills: true,
    });

    expect(dialog).toContain('Beads Issue Tracker');
    expect(dialog).toContain('/beads:init');
    expect(dialog).not.toContain('Git Version Control');
    expect(dialog).not.toContain('Matt Pocock Skills');
    expect(dialog).not.toContain('/setup-matt-pocock-skills');
  });

  test('only mentions missing skills environment', () => {
    const hook = createStartupInitHook('/tmp/project');
    const dialog = hook.getAuditDialog({
      git: true,
      beads: true,
      skills: false,
    });

    expect(dialog).toContain('Matt Pocock Skills');
    expect(dialog).toContain('/setup-matt-pocock-skills');
    expect(dialog).not.toContain('Git Version Control');
    expect(dialog).not.toContain('Beads Issue Tracker');
    expect(dialog).not.toContain('/beads:init');
  });

  test('returns ready message when nothing is missing', () => {
    const hook = createStartupInitHook('/tmp/project');
    const dialog = hook.getAuditDialog({
      git: true,
      beads: true,
      skills: true,
    });

    expect(dialog).toContain('ENVIRONMENT READY');
    expect(dialog).not.toContain('MISSING ENVIRONMENTS DETECTED');
    expect(dialog).not.toContain('Git Version Control');
    expect(dialog).not.toContain('Beads Issue Tracker');
    expect(dialog).not.toContain('Matt Pocock Skills');
  });
});
