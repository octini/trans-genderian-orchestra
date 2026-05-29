import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { ConfigLoadWarning } from './loader';
import { loadAgentPrompt, loadPluginConfig } from './loader';

// Test deepMerge indirectly through loadPluginConfig behavior
// since deepMerge is not exported

describe('loadPluginConfig', () => {
  let tempDir: string;
  let userConfigDir: string;
  let originalEnv: typeof process.env;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loader-test-'));
    userConfigDir = path.join(tempDir, 'user-config');
    originalEnv = { ...process.env };
    // Isolate from real user config
    delete process.env.OPENCODE_CONFIG_DIR;
    process.env.XDG_CONFIG_HOME = userConfigDir;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.env = originalEnv;
  });

  test('returns empty config when no config files exist', () => {
    const projectDir = path.join(tempDir, 'project');
    fs.mkdirSync(projectDir, { recursive: true });
    const config = loadPluginConfig(projectDir);
    expect(config).toEqual({});
  });

  test('loads project config from .opencode directory', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        agents: {
          reviewer: { model: 'test/model' },
        },
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('test/model');
  });

  test('loads scoringEngineVersion flag when configured', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        scoringEngineVersion: 'v2-shadow',
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.scoringEngineVersion).toBe('v2-shadow');
  });

  test('loads balanceProviderUsage flag when configured', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        balanceProviderUsage: true,
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.balanceProviderUsage).toBe(true);
  });

  test('loads autoUpdate flag when configured', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        autoUpdate: false,
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.autoUpdate).toBe(false);
  });

  test('loads envelope enforcement mode when configured', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        envelopeEnforcement: 'deny',
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.envelopeEnforcement).toBe('deny');
  });

  test('loads manual plan structure when configured', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        manualPlan: {
          orchestrator: {
            primary: 'openai/gpt-5.5',
            fallback1: 'anthropic/claude-opus-4-6',
            fallback2: 'chutes/kimi-k2.5',
            fallback3: 'opencode/gpt-5-nano',
          },
          planner: {
            primary: 'openai/gpt-5.5',
            fallback1: 'anthropic/claude-opus-4-6',
            fallback2: 'chutes/kimi-k2.5',
            fallback3: 'opencode/gpt-5-nano',
          },
          researcher: {
            primary: 'openai/gpt-5.5',
            fallback1: 'anthropic/claude-opus-4-6',
            fallback2: 'chutes/kimi-k2.5',
            fallback3: 'opencode/gpt-5-nano',
          },
          builder: {
            primary: 'openai/gpt-5.5',
            fallback1: 'anthropic/claude-opus-4-6',
            fallback2: 'chutes/kimi-k2.5',
            fallback3: 'opencode/gpt-5-nano',
          },
          reviewer: {
            primary: 'openai/gpt-5.5',
            fallback1: 'anthropic/claude-opus-4-6',
            fallback2: 'chutes/Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8-TEE',
            fallback3: 'opencode/gpt-5-nano',
          },
        },
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.manualPlan?.reviewer?.fallback2).toBe(
      'chutes/Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8-TEE',
    );
  });

  test('ignores invalid config (schema violation or malformed JSON)', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });

    // Test 1: Invalid temperature (out of range)
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({ agents: { reviewer: { temperature: 5 } } }),
    );
    expect(loadPluginConfig(projectDir)).toEqual({});

    // Test 2: Malformed JSON
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      '{ invalid json }',
    );
    expect(loadPluginConfig(projectDir)).toEqual({});
  });

  test('rejects custom-only prompt fields on built-in agents in config files', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });

    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        agents: {
          reviewer: {
            model: 'openai/gpt-5.5',
            prompt: 'This should be rejected for built-in agents.',
          },
        },
      }),
    );

    expect(loadPluginConfig(projectDir)).toEqual({});
  });

  test('respects OPENCODE_CONFIG_DIR for user config location', () => {
    const customDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'omc-opencode-config-'),
    );
    process.env.OPENCODE_CONFIG_DIR = customDir;

    // Write plugin config in the custom directory
    fs.writeFileSync(
      path.join(customDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        agents: {
          reviewer: { model: 'custom/model-from-opencode-config-dir' },
        },
      }),
    );

    const projectDir = path.join(tempDir, 'project');
    fs.mkdirSync(projectDir, { recursive: true });

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe(
      'custom/model-from-opencode-config-dir',
    );

    fs.rmSync(customDir, { recursive: true, force: true });
  });

  test('falls back to default user config dir when OPENCODE_CONFIG_DIR has no config', () => {
    const customDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'omc-opencode-config-empty-'),
    );
    process.env.OPENCODE_CONFIG_DIR = customDir;

    const defaultConfigDir = path.join(userConfigDir, 'opencode');
    fs.mkdirSync(defaultConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(defaultConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        agents: { reviewer: { model: 'fallback/default-config' } },
      }),
    );

    const projectDir = path.join(tempDir, 'project');
    fs.mkdirSync(projectDir, { recursive: true });

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('fallback/default-config');

    fs.rmSync(customDir, { recursive: true, force: true });
  });
});

describe('onWarning callback', () => {
  let tempDir: string;
  let originalEnv: typeof process.env;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onwarning-test-'));
    originalEnv = { ...process.env };
    delete process.env.OPENCODE_CONFIG_DIR;
    process.env.XDG_CONFIG_HOME = tempDir;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.env = originalEnv;
  });

  test('invalid schema calls onWarning with invalid-schema', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({ agents: { reviewer: { temperature: 5 } } }),
    );

    const warnings: ConfigLoadWarning[] = [];
    const config = loadPluginConfig(projectDir, {
      onWarning: (warning) => warnings.push(warning),
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.kind).toBe('invalid-schema');
    expect(warnings[0]?.path).toBe(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
    );
    expect(warnings[0]?.message).toBe('Config does not match schema');
    expect(config).toEqual({});
  });

  test('invalid JSON calls onWarning with invalid-json', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      '{ invalid json }',
    );

    const warnings: ConfigLoadWarning[] = [];
    const config = loadPluginConfig(projectDir, {
      onWarning: (warning) => warnings.push(warning),
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.kind).toBe('invalid-json');
    expect(warnings[0]?.path).toBe(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
    );
    expect(config).toEqual({});
  });

  test('silent option suppresses console warnings', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      '{ invalid json }',
    );

    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const warnings: ConfigLoadWarning[] = [];
      const config = loadPluginConfig(projectDir, {
        silent: true,
        onWarning: (warning) => warnings.push(warning),
      });

      expect(warnings).toHaveLength(1);
      expect(config).toEqual({});
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('read error calls onWarning with read-error', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    const configPath = path.join(
      projectConfigDir,
      'trans-genderian-orchestra.json',
    );
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({}));

    const originalReadFileSync = fs.readFileSync;
    const readSpy = spyOn(fs, 'readFileSync').mockImplementation(((
      ...args: Parameters<typeof fs.readFileSync>
    ) => {
      const [filePath] = args;
      if (filePath === configPath) {
        const error = new Error('Permission denied') as NodeJS.ErrnoException;
        error.code = 'EACCES';
        throw error;
      }

      return originalReadFileSync(...args);
    }) as typeof fs.readFileSync);

    try {
      const warnings: ConfigLoadWarning[] = [];
      const config = loadPluginConfig(projectDir, {
        onWarning: (warning) => warnings.push(warning),
      });

      expect(warnings).toHaveLength(1);
      expect(warnings[0]?.kind).toBe('read-error');
      expect(warnings[0]?.path).toBe(configPath);
      expect(warnings[0]?.message).toBe('Permission denied');
      expect(config).toEqual({});
    } finally {
      readSpy.mockRestore();
    }
  });

  test('missing preset calls onWarning with missing-preset', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        preset: 'nonexistent',
        presets: { other: { reviewer: { model: 'other' } } },
        agents: { reviewer: { model: 'root' } },
      }),
    );

    const warnings: ConfigLoadWarning[] = [];
    const config = loadPluginConfig(projectDir, {
      onWarning: (warning) => warnings.push(warning),
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.kind).toBe('missing-preset');
    expect(warnings[0]?.message).toContain('Preset "nonexistent" not found');
    expect(config.agents?.reviewer?.model).toBe('root');
  });

  test('silent: true on missing preset still calls onWarning but not console.warn', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        preset: 'nonexistent',
        presets: { other: { reviewer: { model: 'other' } } },
        agents: { reviewer: { model: 'root' } },
      }),
    );

    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const warnings: ConfigLoadWarning[] = [];
      const config = loadPluginConfig(projectDir, {
        silent: true,
        onWarning: (warning) => warnings.push(warning),
      });

      expect(warnings).toHaveLength(1);
      expect(warnings[0]?.kind).toBe('missing-preset');
      expect(config.agents?.reviewer?.model).toBe('root');
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('valid config does not call onWarning', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({ agents: { reviewer: { model: 'valid/model' } } }),
    );

    const warnings: ConfigLoadWarning[] = [];
    const config = loadPluginConfig(projectDir, {
      onWarning: (warning) => warnings.push(warning),
    });

    expect(warnings).toHaveLength(0);
    expect(config.agents?.reviewer?.model).toBe('valid/model');
  });

  test('no options object does not break loadPluginConfig', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({ agents: { reviewer: { model: 'model' } } }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('model');
  });
});

describe('deepMerge behavior', () => {
  let tempDir: string;
  let userConfigDir: string;
  let originalEnv: typeof process.env;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-test-'));
    userConfigDir = path.join(tempDir, 'user-config');
    originalEnv = { ...process.env };

    // Set XDG_CONFIG_HOME to control user config location
    delete process.env.OPENCODE_CONFIG_DIR;
    process.env.XDG_CONFIG_HOME = userConfigDir;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.env = originalEnv;
  });

  test('merges nested agent configs from user and project', () => {
    // Create user config
    const userOpencodeDir = path.join(userConfigDir, 'opencode');
    fs.mkdirSync(userOpencodeDir, { recursive: true });
    fs.writeFileSync(
      path.join(userOpencodeDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        agents: {
          reviewer: { model: 'user/reviewer-model', temperature: 0.5 },
          researcher: { model: 'user/researcher-model' },
        },
      }),
    );

    // Create project config (should override/merge with user)
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        agents: {
          reviewer: { temperature: 0.8 }, // Override temperature only
          builder: { model: 'project/builder-model' }, // Add new agent
        },
      }),
    );

    const config = loadPluginConfig(projectDir);

    // reviewer: model from user, temperature from project
    expect(config.agents?.reviewer?.model).toBe('user/reviewer-model');
    expect(config.agents?.reviewer?.temperature).toBe(0.8);

    // researcher: from user only
    expect(config.agents?.researcher?.model).toBe('user/researcher-model');

    // builder: from project only
    expect(config.agents?.builder?.model).toBe('project/builder-model');
  });

  test('deeply merges nested agent options from user and project', () => {
    const userOpencodeDir = path.join(userConfigDir, 'opencode');
    fs.mkdirSync(userOpencodeDir, { recursive: true });
    fs.writeFileSync(
      path.join(userOpencodeDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        agents: {
          builder: {
            model: 'user/builder-model',
            options: {
              provider: { reasoningEffort: 'medium', textVerbosity: 'low' },
            },
          },
        },
      }),
    );

    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        agents: {
          builder: {
            options: {
              provider: { textVerbosity: 'high' },
              extra: { cache: true },
            },
          },
        },
      }),
    );

    const config = loadPluginConfig(projectDir);

    expect(config.agents?.builder?.options).toEqual({
      provider: { reasoningEffort: 'medium', textVerbosity: 'high' },
      extra: { cache: true },
    });
  });

  test('merges nested tmux configs', () => {
    const userOpencodeDir = path.join(userConfigDir, 'opencode');
    fs.mkdirSync(userOpencodeDir, { recursive: true });
    fs.writeFileSync(
      path.join(userOpencodeDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        tmux: {
          enabled: true,
          layout: 'main-vertical',
          main_pane_size: 60,
        },
      }),
    );

    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        tmux: {
          enabled: false, // Override enabled
          layout: 'tiled', // Override layout
        },
      }),
    );

    const config = loadPluginConfig(projectDir);

    expect(config.tmux?.enabled).toBe(false); // From project (override)
    expect(config.tmux?.layout).toBe('tiled'); // From project
    expect(config.tmux?.main_pane_size).toBe(60); // From user (preserved)
  });

  test("preserves user tmux.enabled when project doesn't specify", () => {
    const userOpencodeDir = path.join(userConfigDir, 'opencode');
    fs.mkdirSync(userOpencodeDir, { recursive: true });
    fs.writeFileSync(
      path.join(userOpencodeDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        tmux: {
          enabled: true,
          layout: 'main-vertical',
        },
      }),
    );

    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        agents: { reviewer: { model: 'test' } }, // No tmux override
      }),
    );

    const config = loadPluginConfig(projectDir);

    expect(config.tmux?.enabled).toBe(true); // Preserved from user
    expect(config.tmux?.layout).toBe('main-vertical'); // Preserved from user
  });

  test('project config overrides top-level arrays', () => {
    const userOpencodeDir = path.join(userConfigDir, 'opencode');
    fs.mkdirSync(userOpencodeDir, { recursive: true });
    fs.writeFileSync(
      path.join(userOpencodeDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        disabled_mcps: ['websearch'],
      }),
    );

    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        disabled_mcps: ['context7'],
      }),
    );

    const config = loadPluginConfig(projectDir);

    // disabled_mcps should be from project (overwrites, not merges)
    expect(config.disabled_mcps).toEqual(['context7']);
  });

  test('handles missing user config gracefully', () => {
    // Don't create user config, only project
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        agents: {
          reviewer: { model: 'project/model' },
        },
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('project/model');
  });

  test('handles missing project config gracefully', () => {
    const userOpencodeDir = path.join(userConfigDir, 'opencode');
    fs.mkdirSync(userOpencodeDir, { recursive: true });
    fs.writeFileSync(
      path.join(userOpencodeDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        agents: {
          reviewer: { model: 'user/model' },
        },
      }),
    );

    // No project config
    const projectDir = path.join(tempDir, 'project');
    fs.mkdirSync(projectDir, { recursive: true });

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('user/model');
  });

  test('merges fallback timeout and chains from user and project', () => {
    const userOpencodeDir = path.join(userConfigDir, 'opencode');
    fs.mkdirSync(userOpencodeDir, { recursive: true });
    fs.writeFileSync(
      path.join(userOpencodeDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        fallback: {
          timeoutMs: 15000,
          chains: {
            reviewer: ['openai/gpt-5.5', 'opencode/glm-4.7-free'],
          },
        },
      }),
    );

    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        fallback: {
          chains: {
            researcher: ['google/antigravity-gemini-3-flash'],
          },
        },
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.fallback?.timeoutMs).toBe(15000);
    expect(config.fallback?.chains.reviewer).toEqual([
      'openai/gpt-5.5',
      'opencode/glm-4.7-free',
    ]);
    expect(config.fallback?.chains.researcher).toEqual([
      'google/antigravity-gemini-3-flash',
    ]);
  });

  test('parses default specialist timeouts', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({}),
    );

    const config = loadPluginConfig(projectDir);

    expect(config.timeouts).toMatchObject({
      planner: 600000,
      researcher: 600000,
      builder: 1500000,
      reviewer: 600000,
      council: 600000,
      councillor: 600000,
    });
  });

  test('merges specialist timeouts from user and project', () => {
    const userOpencodeDir = path.join(userConfigDir, 'opencode');
    fs.mkdirSync(userOpencodeDir, { recursive: true });
    fs.writeFileSync(
      path.join(userOpencodeDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        timeouts: {
          planner: 111,
          builder: 222,
        },
      }),
    );

    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        timeouts: {
          researcher: 333,
        },
      }),
    );

    const config = loadPluginConfig(projectDir);

    expect(config.timeouts).toMatchObject({
      planner: 111,
      researcher: 333,
      builder: 222,
    });
  });

  test('preserves fallback chains with additional agent keys', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        fallback: {
          chains: {
            writing: ['openai/gpt-5.5'],
          },
        },
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.fallback?.chains.writing).toEqual(['openai/gpt-5.5']);
  });
});

describe('preset resolution', () => {
  let tempDir: string;
  let originalEnv: typeof process.env;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preset-test-'));
    originalEnv = { ...process.env };
    delete process.env.OPENCODE_CONFIG_DIR;
    process.env.XDG_CONFIG_HOME = path.join(tempDir, 'user-config');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.env = originalEnv;
  });

  test('backward compatibility: config with only agents works unchanged', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        agents: { reviewer: { model: 'direct-model' } },
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('direct-model');
    expect(config.preset).toBeUndefined();
  });

  test("preset applied: preset + presets returns preset's agents", () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        preset: 'fast',
        presets: {
          fast: { reviewer: { model: 'fast-model' } },
        },
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('fast-model');
  });

  test('root agents override preset agents', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        preset: 'fast',
        presets: {
          fast: {
            reviewer: { model: 'fast-model', temperature: 0.1 },
            researcher: { model: 'researcher-model' },
          },
        },
        agents: {
          reviewer: { temperature: 0.9 }, // Should override preset temperature
        },
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('fast-model');
    expect(config.agents?.reviewer?.temperature).toBe(0.9);
    expect(config.agents?.researcher?.model).toBe('researcher-model');
  });

  test('missing preset: preset set but not in presets -> returns empty/root agents', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        preset: 'nonexistent',
        presets: {
          other: { reviewer: { model: 'other' } },
        },
        agents: { reviewer: { model: 'root' } },
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('root');
  });

  test('preset only: no root agents, just preset works', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        preset: 'dev',
        presets: {
          dev: { reviewer: { model: 'dev-model' } },
        },
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('dev-model');
  });

  test('invalid preset shape: bad agent config in preset fails schema validation', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });

    // preset agents with invalid temperature
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        preset: 'invalid',
        presets: {
          invalid: { reviewer: { temperature: 5 } },
        },
      }),
    );

    // Should return empty config due to validation failure
    expect(loadPluginConfig(projectDir)).toEqual({});
  });

  test('nonexistent preset from config warns and falls back to root agents', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        preset: 'nonexistent',
        presets: {
          other: { reviewer: { model: 'other' } },
        },
        agents: { reviewer: { model: 'root' } },
      }),
    );

    const consoleWarnSpy = spyOn(console, 'warn');
    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('root');
    expect(consoleWarnSpy).toHaveBeenCalled();
    const warningMessage = consoleWarnSpy.mock.calls[0][0] as string;
    expect(warningMessage).toContain('Preset "nonexistent" not found');
    expect(warningMessage).toContain('Available presets: other');
  });

  test('nonexistent preset with no root agents returns empty agents', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        preset: 'nonexistent',
        presets: {
          other: { reviewer: { model: 'other' } },
        },
      }),
    );

    const consoleWarnSpy = spyOn(console, 'warn');
    const config = loadPluginConfig(projectDir);
    expect(config.agents).toBeUndefined();
    expect(consoleWarnSpy).toHaveBeenCalled();
    const warningMessage = consoleWarnSpy.mock.calls[0][0] as string;
    expect(warningMessage).toContain('Preset "nonexistent" not found');
  });

  test('options from preset are deep-merged with root agents', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        preset: 'openai',
        presets: {
          openai: {
            reviewer: {
              model: 'openai/gpt-5.5',
              options: { textVerbosity: 'low' },
            },
          },
        },
        agents: {
          reviewer: {
            options: { reasoningEffort: 'medium' },
          },
        },
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('openai/gpt-5.5');
    // deepMerge should combine both option keys
    expect(config.agents?.reviewer?.options).toEqual({
      textVerbosity: 'low',
      reasoningEffort: 'medium',
    });
  });

  test('options from preset only work without root agents', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        preset: 'anthropic-thinking',
        presets: {
          'anthropic-thinking': {
            reviewer: {
              model: 'anthropic/claude-sonnet-4-6',
              options: {
                thinking: { type: 'enabled', budgetTokens: 16000 },
              },
            },
          },
        },
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('anthropic/claude-sonnet-4-6');
    expect(config.agents?.reviewer?.options).toEqual({
      thinking: { type: 'enabled', budgetTokens: 16000 },
    });
  });

  test('root options override preset options for same key', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        preset: 'concise',
        presets: {
          concise: {
            reviewer: {
              model: 'openai/gpt-5.5',
              options: { textVerbosity: 'low' },
            },
          },
        },
        agents: {
          reviewer: {
            options: { textVerbosity: 'high' },
          },
        },
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('openai/gpt-5.5');
    // root wins over preset for same key
    expect(config.agents?.reviewer?.options).toEqual({
      textVerbosity: 'high',
    });
  });
});

describe('environment variable preset override', () => {
  let tempDir: string;
  let originalEnv: typeof process.env;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-preset-test-'));
    originalEnv = { ...process.env };
    delete process.env.OPENCODE_CONFIG_DIR;
    process.env.XDG_CONFIG_HOME = path.join(tempDir, 'user-config');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.env = originalEnv;
  });

  test('Env var overrides preset from config file', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        preset: 'config-preset',
        presets: {
          'config-preset': { reviewer: { model: 'config-model' } },
          'env-preset': { reviewer: { model: 'env-model' } },
        },
      }),
    );

    process.env.TRANS_GENDERIAN_ORCHESTRA_PRESET = 'env-preset';
    const config = loadPluginConfig(projectDir);
    expect(config.preset).toBe('env-preset');
    expect(config.agents?.reviewer?.model).toBe('env-model');
  });

  test('Env var works when config has no preset', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        presets: {
          'env-preset': { reviewer: { model: 'env-model' } },
        },
      }),
    );

    process.env.TRANS_GENDERIAN_ORCHESTRA_PRESET = 'env-preset';
    const config = loadPluginConfig(projectDir);
    expect(config.preset).toBe('env-preset');
    expect(config.agents?.reviewer?.model).toBe('env-model');
  });

  test('Env var is ignored if empty string', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        preset: 'config-preset',
        presets: {
          'config-preset': { reviewer: { model: 'config-model' } },
        },
      }),
    );

    process.env.TRANS_GENDERIAN_ORCHESTRA_PRESET = '';
    const config = loadPluginConfig(projectDir);
    expect(config.preset).toBe('config-preset');
    expect(config.agents?.reviewer?.model).toBe('config-model');
  });

  test('Env var is ignored if undefined', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        preset: 'config-preset',
        presets: {
          'config-preset': { reviewer: { model: 'config-model' } },
        },
      }),
    );

    delete process.env.TRANS_GENDERIAN_ORCHESTRA_PRESET;
    const config = loadPluginConfig(projectDir);
    expect(config.preset).toBe('config-preset');
    expect(config.agents?.reviewer?.model).toBe('config-model');
  });

  test('Env var with nonexistent preset warns and falls back', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        preset: 'config-preset',
        presets: {
          'config-preset': { reviewer: { model: 'config-model' } },
        },
        agents: { reviewer: { model: 'fallback' } },
      }),
    );

    process.env.TRANS_GENDERIAN_ORCHESTRA_PRESET = 'typo-preset';
    const consoleWarnSpy = spyOn(console, 'warn');
    const config = loadPluginConfig(projectDir);
    expect(config.preset).toBe('typo-preset');
    expect(config.agents?.reviewer?.model).toBe('fallback');
    expect(consoleWarnSpy).toHaveBeenCalled();
    const calls = consoleWarnSpy.mock.calls as string[][];
    const warningMessage =
      calls.find((call) => call[0]?.includes('typo-preset'))?.[0] || '';
    expect(warningMessage).toContain('Preset "typo-preset" not found');
    expect(warningMessage).toContain('environment variable');
    expect(warningMessage).toContain('config-preset');
  });
});

describe('JSONC config support', () => {
  let tempDir: string;
  let originalEnv: typeof process.env;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jsonc-test-'));
    originalEnv = { ...process.env };
    delete process.env.OPENCODE_CONFIG_DIR;
    process.env.XDG_CONFIG_HOME = path.join(tempDir, 'user-config');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.env = originalEnv;
  });

  test('loads .jsonc file with single-line comments', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.jsonc'),
      `{
        // This is a comment
        "agents": {
          "reviewer": { "model": "test/model" } // inline comment
        }
      }`,
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('test/model');
  });

  test('loads .jsonc file with multi-line comments', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.jsonc'),
      `{
        /* Multi-line
           comment block */
        "agents": {
          "researcher": { "model": "researcher-model" }
        }
      }`,
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.researcher?.model).toBe('researcher-model');
  });

  test('loads .jsonc file with trailing commas', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.jsonc'),
      `{
        "agents": {
          "reviewer": { "model": "test-model", },
        },
      }`,
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('test-model');
  });

  test('prefers .jsonc over .json when both exist', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });

    // Create both files
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({ agents: { reviewer: { model: 'json-model' } } }),
    );
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.jsonc'),
      `{
        // JSONC version
        "agents": { "reviewer": { "model": "jsonc-model" } }
      }`,
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('jsonc-model');
  });

  test('falls back to .json when .jsonc does not exist', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });

    // Only create .json file
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({ agents: { reviewer: { model: 'json-model' } } }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('json-model');
  });

  test('loads user config from .jsonc', () => {
    const userOpencodeDir = path.join(tempDir, 'user-config', 'opencode');
    fs.mkdirSync(userOpencodeDir, { recursive: true });
    fs.writeFileSync(
      path.join(userOpencodeDir, 'trans-genderian-orchestra.jsonc'),
      `{
        // User config with comments
        "agents": { "researcher": { "model": "user-researcher" } }
      }`,
    );

    const projectDir = path.join(tempDir, 'project');
    fs.mkdirSync(projectDir, { recursive: true });

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.researcher?.model).toBe('user-researcher');
  });

  test('merges user .jsonc with project .jsonc', () => {
    const userOpencodeDir = path.join(tempDir, 'user-config', 'opencode');
    fs.mkdirSync(userOpencodeDir, { recursive: true });
    fs.writeFileSync(
      path.join(userOpencodeDir, 'trans-genderian-orchestra.jsonc'),
      `{
        // User config
        "agents": {
          "reviewer": { "model": "user-reviewer", "temperature": 0.5 }
        }
      }`,
    );

    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.jsonc'),
      `{
        // Project config
        "agents": { "reviewer": { "temperature": 0.8 } }
      }`,
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('user-reviewer');
    expect(config.agents?.reviewer?.temperature).toBe(0.8);
  });

  test('handles complex JSONC with mixed comments and trailing commas', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.jsonc'),
      `{
        // Main configuration
        "preset": "dev",
        /* Presets definition */
        "presets": {
          "dev": {
            // Development agents
            "reviewer": { "model": "dev-reviewer", },
            "researcher": { "model": "dev-researcher", },
          },
        },
        "tmux": {
          "enabled": true, // Enable tmux
          "layout": "main-vertical",
        },
      }`,
    );

    const config = loadPluginConfig(projectDir);
    expect(config.preset).toBe('dev');
    expect(config.agents?.reviewer?.model).toBe('dev-reviewer');
    expect(config.agents?.researcher?.model).toBe('dev-researcher');
    expect(config.tmux?.enabled).toBe(true);
    expect(config.tmux?.layout).toBe('main-vertical');
  });
});

describe('loadAgentPrompt', () => {
  let tempDir: string;
  let originalEnv: typeof process.env;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-test-'));
    originalEnv = { ...process.env };
    delete process.env.OPENCODE_CONFIG_DIR;
    process.env.XDG_CONFIG_HOME = tempDir;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.env = originalEnv;
  });

  test('returns empty object when no prompt files exist', () => {
    const result = loadAgentPrompt('reviewer');
    expect(result).toEqual({});
  });

  test('loads replacement prompt from {agent}.md', () => {
    const promptsDir = path.join(
      tempDir,
      'opencode',
      'trans-genderian-orchestra',
    );
    fs.mkdirSync(promptsDir, { recursive: true });
    fs.writeFileSync(
      path.join(promptsDir, 'reviewer.md'),
      'replacement prompt',
    );

    const result = loadAgentPrompt('reviewer');
    expect(result.prompt).toBe('replacement prompt');
    expect(result.appendPrompt).toBeUndefined();
  });

  test('loads append prompt from {agent}_append.md', () => {
    const promptsDir = path.join(
      tempDir,
      'opencode',
      'trans-genderian-orchestra',
    );
    fs.mkdirSync(promptsDir, { recursive: true });
    fs.writeFileSync(
      path.join(promptsDir, 'reviewer_append.md'),
      'append prompt',
    );

    const result = loadAgentPrompt('reviewer');
    expect(result.prompt).toBeUndefined();
    expect(result.appendPrompt).toBe('append prompt');
  });

  test('loads both replacement and append prompts', () => {
    const promptsDir = path.join(
      tempDir,
      'opencode',
      'trans-genderian-orchestra',
    );
    fs.mkdirSync(promptsDir, { recursive: true });
    fs.writeFileSync(
      path.join(promptsDir, 'reviewer.md'),
      'replacement prompt',
    );
    fs.writeFileSync(
      path.join(promptsDir, 'reviewer_append.md'),
      'append prompt',
    );

    const result = loadAgentPrompt('reviewer');
    expect(result.prompt).toBe('replacement prompt');
    expect(result.appendPrompt).toBe('append prompt');
  });

  test('handles file read errors gracefully', () => {
    const promptsDir = path.join(
      tempDir,
      'opencode',
      'trans-genderian-orchestra',
    );
    fs.mkdirSync(promptsDir, { recursive: true });
    const promptPath = path.join(promptsDir, 'error-agent.md');
    fs.writeFileSync(promptPath, 'content');

    const consoleWarnSpy = spyOn(console, 'warn');

    // Use a unique agent name and check for it specifically
    const originalReadFileSync = fs.readFileSync;
    const readSpy = spyOn(fs, 'readFileSync').mockImplementation(((
      ...args: Parameters<typeof fs.readFileSync>
    ) => {
      const [p] = args;
      if (typeof p === 'string' && p.includes('error-agent.md')) {
        throw new Error('Read error');
      }
      return originalReadFileSync(...args);
    }) as typeof fs.readFileSync);

    try {
      const result = loadAgentPrompt('error-agent');
      expect(result.prompt).toBeUndefined();

      const warningFound = consoleWarnSpy.mock.calls.some((call) =>
        (call[0] as string).includes('Error reading prompt file'),
      );
      expect(warningFound).toBe(true);
    } finally {
      readSpy.mockRestore();
    }
  });

  test('prefers preset prompt files over root prompts', () => {
    const promptsDir = path.join(
      tempDir,
      'opencode',
      'trans-genderian-orchestra',
    );
    const presetDir = path.join(promptsDir, 'test');
    fs.mkdirSync(presetDir, { recursive: true });

    fs.writeFileSync(path.join(promptsDir, 'reviewer.md'), 'root replacement');
    fs.writeFileSync(path.join(presetDir, 'reviewer.md'), 'preset replacement');
    fs.writeFileSync(
      path.join(promptsDir, 'reviewer_append.md'),
      'root append prompt',
    );
    fs.writeFileSync(
      path.join(presetDir, 'reviewer_append.md'),
      'preset append prompt',
    );

    const result = loadAgentPrompt('reviewer', 'test');
    expect(result.prompt).toBe('preset replacement');
    expect(result.appendPrompt).toBe('preset append prompt');
  });

  test('falls back to root prompt files when preset files are missing', () => {
    const promptsDir = path.join(
      tempDir,
      'opencode',
      'trans-genderian-orchestra',
    );
    const presetDir = path.join(promptsDir, 'test');
    fs.mkdirSync(presetDir, { recursive: true });

    fs.writeFileSync(path.join(promptsDir, 'reviewer.md'), 'root replacement');
    fs.writeFileSync(
      path.join(promptsDir, 'reviewer_append.md'),
      'root append prompt',
    );

    const result = loadAgentPrompt('reviewer', 'test');
    expect(result.prompt).toBe('root replacement');
    expect(result.appendPrompt).toBe('root append prompt');
  });

  test('falls back independently between preset and root files', () => {
    const promptsDir = path.join(
      tempDir,
      'opencode',
      'trans-genderian-orchestra',
    );
    const presetDir = path.join(promptsDir, 'test');
    fs.mkdirSync(presetDir, { recursive: true });

    fs.writeFileSync(path.join(presetDir, 'reviewer.md'), 'preset replacement');
    fs.writeFileSync(
      path.join(promptsDir, 'reviewer_append.md'),
      'root append prompt',
    );

    const result = loadAgentPrompt('reviewer', 'test');
    expect(result.prompt).toBe('preset replacement');
    expect(result.appendPrompt).toBe('root append prompt');
  });

  test('ignores unsafe preset names for prompt lookup', () => {
    const promptsDir = path.join(
      tempDir,
      'opencode',
      'trans-genderian-orchestra',
    );
    fs.mkdirSync(promptsDir, { recursive: true });
    fs.writeFileSync(path.join(promptsDir, 'reviewer.md'), 'root replacement');

    const result = loadAgentPrompt('reviewer', '../test');
    expect(result.prompt).toBe('root replacement');
    expect(result.appendPrompt).toBeUndefined();
  });

  test('falls back to root when preset prompt file read fails', () => {
    const promptsDir = path.join(
      tempDir,
      'opencode',
      'trans-genderian-orchestra',
    );
    const presetDir = path.join(promptsDir, 'test');
    fs.mkdirSync(presetDir, { recursive: true });
    const presetPromptPath = path.join(presetDir, 'reviewer.md');
    fs.writeFileSync(presetPromptPath, 'preset replacement');
    fs.writeFileSync(path.join(promptsDir, 'reviewer.md'), 'root replacement');

    const consoleWarnSpy = spyOn(console, 'warn');
    const originalReadFileSync = fs.readFileSync;
    const readSpy = spyOn(fs, 'readFileSync').mockImplementation(((
      ...args: Parameters<typeof fs.readFileSync>
    ) => {
      const [p] = args;
      if (typeof p === 'string' && p === presetPromptPath) {
        throw new Error('Preset read error');
      }
      return originalReadFileSync(...args);
    }) as typeof fs.readFileSync);

    try {
      const result = loadAgentPrompt('reviewer', 'test');
      expect(result.prompt).toBe('root replacement');
      expect(consoleWarnSpy).toHaveBeenCalled();
    } finally {
      readSpy.mockRestore();
    }
  });

  test('works with XDG_CONFIG_HOME environment variable', () => {
    const customConfigHome = path.join(tempDir, 'custom-xdg');
    process.env.XDG_CONFIG_HOME = customConfigHome;

    const promptsDir = path.join(
      customConfigHome,
      'opencode',
      'trans-genderian-orchestra',
    );
    fs.mkdirSync(promptsDir, { recursive: true });
    fs.writeFileSync(path.join(promptsDir, 'xdg-agent.md'), 'xdg prompt');

    const result = loadAgentPrompt('xdg-agent');
    expect(result.prompt).toBe('xdg prompt');
  });

  test('respects OPENCODE_CONFIG_DIR for prompt location', () => {
    const customDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'omc-prompt-config-'),
    );
    process.env.OPENCODE_CONFIG_DIR = customDir;

    const promptsDir = path.join(customDir, 'trans-genderian-orchestra');
    fs.mkdirSync(promptsDir, { recursive: true });
    fs.writeFileSync(
      path.join(promptsDir, 'reviewer.md'),
      'prompt from OPENCODE_CONFIG_DIR dir',
    );

    const result = loadAgentPrompt('reviewer');
    expect(result.prompt).toBe('prompt from OPENCODE_CONFIG_DIR dir');

    fs.rmSync(customDir, { recursive: true, force: true });
  });

  test('falls back to default prompt dir when OPENCODE_CONFIG_DIR has no prompt', () => {
    const customDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'omc-prompt-config-empty-'),
    );
    process.env.OPENCODE_CONFIG_DIR = customDir;

    const promptsDir = path.join(
      tempDir,
      'opencode',
      'trans-genderian-orchestra',
    );
    fs.mkdirSync(promptsDir, { recursive: true });
    fs.writeFileSync(path.join(promptsDir, 'reviewer.md'), 'fallback prompt');

    const result = loadAgentPrompt('reviewer');
    expect(result.prompt).toBe('fallback prompt');

    fs.rmSync(customDir, { recursive: true, force: true });
  });
});

describe('env variable interpolation', () => {
  let tempDir: string;
  let originalEnv: typeof process.env;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-interp-test-'));
    originalEnv = { ...process.env };
    delete process.env.OPENCODE_CONFIG_DIR;
    process.env.XDG_CONFIG_HOME = path.join(tempDir, 'user-config');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.env = originalEnv;
  });

  test('basic substitution: {env:FOO} resolves to the value of FOO', () => {
    process.env.FOO = 'foo-model';
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        agents: { reviewer: { model: '{env:FOO}' } },
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('foo-model');
  });

  test('multiple variables: multiple {env:...} tokens resolve', () => {
    process.env.FOO = 'foo-model';
    process.env.BAR = 'bar-model';
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        agents: {
          reviewer: { model: '{env:FOO}' },
          researcher: { model: '{env:BAR}' },
        },
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('foo-model');
    expect(config.agents?.researcher?.model).toBe('bar-model');
  });

  test('undefined variable: {env:NONEXISTENT} resolves to empty string', () => {
    delete process.env.NONEXISTENT;
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        agents: { reviewer: { model: '{env:NONEXISTENT}' } },
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('');
  });

  test('no interpolation needed: config without {env:...} works unchanged', () => {
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        agents: { reviewer: { model: 'foo-model' } },
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('foo-model');
  });

  test('partial string: "prefix-{env:FOO}-suffix" resolves correctly', () => {
    process.env.FOO = 'foo';
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        agents: { reviewer: { model: 'prefix-{env:FOO}-suffix' } },
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('prefix-foo-suffix');
  });

  test('works in JSONC files with comments', () => {
    process.env.FOO = 'foo-model';
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.jsonc'),
      `{
        // Use env variable for model
        "agents": { "reviewer": { "model": "{env:FOO}" } }
      }`,
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('foo-model');
  });

  test('multiple env vars in a single value', () => {
    process.env.FOO = 'foo';
    process.env.BAR = 'bar';
    const projectDir = path.join(tempDir, 'project');
    const projectConfigDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(projectConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectConfigDir, 'trans-genderian-orchestra.json'),
      JSON.stringify({
        agents: {
          reviewer: { model: '{env:FOO}/{env:BAR}' },
        },
      }),
    );

    const config = loadPluginConfig(projectDir);
    expect(config.agents?.reviewer?.model).toBe('foo/bar');
  });
});
