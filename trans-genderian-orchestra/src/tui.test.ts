import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  formatSidebarModelName,
  getSidebarAgentNames,
  readConfigInvalid,
} from './tui';
import type { TuiSnapshot } from './tui-state';

function createSnapshot(overrides: Partial<TuiSnapshot> = {}): TuiSnapshot {
  return {
    version: 1,
    updatedAt: 0,
    agentModels: {},
    ...overrides,
  };
}

describe('tui sidebar agents', () => {
  test('hides disabled agents when models are persisted explicitly', () => {
    const agentNames = getSidebarAgentNames(
      createSnapshot({
        agentModels: {
          researcher: 'openai/gpt-5.4-mini',
          builder: 'openai/gpt-5.4-mini',
        },
      }),
    );

    expect(agentNames).toEqual(['researcher', 'builder']);
    expect(agentNames).not.toContain('council');
    expect(agentNames).not.toContain('councillor');
  });

  test('uses default-enabled fallback before models are persisted', () => {
    const agentNames = getSidebarAgentNames(createSnapshot({}));

    expect(agentNames).toContain('planner');
    expect(agentNames).toContain('researcher');
    expect(agentNames).toContain('builder');
    expect(agentNames).toContain('reviewer');
    expect(agentNames).not.toContain('council');
    expect(agentNames).not.toContain('councillor');
  });
});

describe('formatSidebarModelName', () => {
  test('keeps only the segment after the last slash', () => {
    expect(formatSidebarModelName('openai/gpt-5.5-fast')).toBe('gpt-5.5-fast');
    expect(
      formatSidebarModelName(
        'fireworks-ai/accounts/fireworks/routers/kimi-k2p5-turbo',
      ),
    ).toBe('kimi-k2p5-turbo');
  });

  test('leaves model names without slashes unchanged', () => {
    expect(formatSidebarModelName('pending')).toBe('pending');
  });
});

describe('readConfigInvalid', () => {
  let originalEnv: typeof process.env;
  let configHome: string;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Isolate from real user config and env presets
    delete process.env.OPENCODE_CONFIG_DIR;
    delete process.env.TRANS_GENDERIAN_ORCHESTRA_PRESET;
    configHome = fs.mkdtempSync(path.join(os.tmpdir(), 'omos-tui-env-'));
    process.env.XDG_CONFIG_HOME = configHome;
  });

  afterEach(() => {
    fs.rmSync(configHome, { recursive: true, force: true });
    process.env = originalEnv;
  });

  test('detects invalid config from the current directory without persisted state', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omos-tui-'));
    try {
      const projectDir = path.join(tempDir, 'project');
      const configDir = path.join(projectDir, '.opencode');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'trans-genderian-orchestra.json'),
        JSON.stringify({ agents: { reviewer: { temperature: 5 } } }),
      );

      expect(readConfigInvalid(projectDir)).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('returns false for valid config', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omos-tui-'));
    try {
      const projectDir = path.join(tempDir, 'project');
      const configDir = path.join(projectDir, '.opencode');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'trans-genderian-orchestra.json'),
        JSON.stringify({ agents: { reviewer: { model: 'valid/model' } } }),
      );

      expect(readConfigInvalid(projectDir)).toBe(false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
