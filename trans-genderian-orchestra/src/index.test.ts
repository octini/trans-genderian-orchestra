import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import TransGenderianOrchestra from './index';
import { SLIM_INTERNAL_INITIATOR_MARKER } from './utils';

function createPluginContext(projectDir: string) {
  return {
    directory: projectDir,
    worktree: projectDir,
    client: {
      app: { log: async () => ({}) },
      tui: { showToast: async () => ({}) },
      session: { status: async () => ({ data: {} }) },
    },
  } as never;
}

describe('plugin config hook', () => {
  let tempDir: string;
  let originalEnv: typeof process.env;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dispatcher-index-test-'));
    originalEnv = { ...process.env };
    delete process.env.OPENCODE_CONFIG_DIR;
    process.env.XDG_CONFIG_HOME = path.join(tempDir, 'user-config');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.env = originalEnv;
  });

  test('deep-merges existing nested agent config with plugin agent defaults', async () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        agents: {
          builder: {
            options: {
              provider: { reasoningEffort: 'medium', textVerbosity: 'low' },
              pluginOnly: true,
            },
          },
        },
      }),
    );

    const plugin = await TransGenderianOrchestra(
      createPluginContext(projectDir),
    );
    const opencodeConfig: Record<string, unknown> = {
      agent: {
        builder: {
          permission: {
            skill: { diagnose: 'deny' },
          },
          options: {
            provider: { textVerbosity: 'high' },
            userOnly: true,
          },
        },
      },
    };

    await plugin.config?.(opencodeConfig);

    const builder = (opencodeConfig.agent as Record<string, unknown>)
      .builder as Record<string, unknown>;
    const permission = builder.permission as Record<string, unknown>;
    const skill = permission.skill as Record<string, unknown>;

    expect(builder.options).toEqual({
      provider: { reasoningEffort: 'medium', textVerbosity: 'high' },
      pluginOnly: true,
      userOnly: true,
    });
    expect(skill.diagnose).toBe('deny');
    expect(skill.tdd).toBeDefined();
  });

  test('startup init command registration survives plugin config hook', async () => {
    const projectDir = path.join(tempDir, 'project');
    fs.mkdirSync(projectDir, { recursive: true });

    const plugin = await TransGenderianOrchestra(
      createPluginContext(projectDir),
    );
    const opencodeConfig: Record<string, unknown> = {};

    await plugin.config?.(opencodeConfig);

    const commands = opencodeConfig.command as Record<string, unknown>;
    expect(commands.init).toBeDefined();
    expect(commands['init:all']).toBeDefined();
    expect(commands['beads:init']).toBeDefined();
    expect(commands['new-stream']).toBeDefined();
    expect(commands['close-stream']).toBeDefined();
    expect(commands['ping-all']).toBeDefined();
  });

  test('startup init ignores unknown command after plugin wiring', async () => {
    const projectDir = path.join(tempDir, 'project');
    fs.mkdirSync(projectDir, { recursive: true });

    const plugin = await TransGenderianOrchestra(
      createPluginContext(projectDir),
    );
    const output = { parts: [{ type: 'text', text: 'template' }] };

    await plugin['command.execute.before']?.(
      { command: 'not-startup', sessionID: 's1', arguments: '' },
      output,
    );

    expect(output.parts).toEqual([{ type: 'text', text: 'template' }]);
  });

  test('startup stream command produces internal-only command output after plugin wiring', async () => {
    const projectDir = path.join(tempDir, 'project');
    fs.mkdirSync(projectDir, { recursive: true });

    const plugin = await TransGenderianOrchestra(
      createPluginContext(projectDir),
    );
    const output = { parts: [{ type: 'text', text: 'template' }] };

    await plugin['command.execute.before']?.(
      { command: 'new-stream', sessionID: 's1', arguments: 'feature-lane' },
      output,
    );

    expect(output.parts).toHaveLength(1);
    expect(output.parts[0].text).toContain('`/new-stream` RESULT');
    expect(output.parts[0].text).toContain('feature-lane');
    expect(output.parts[0].text).toContain(SLIM_INTERNAL_INITIATOR_MARKER);
  });
});
