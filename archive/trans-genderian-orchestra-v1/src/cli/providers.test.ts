/// <reference types="bun-types" />

import { describe, expect, test } from 'bun:test';
import { generateLiteConfig, MODEL_MAPPINGS } from './providers';

describe('providers', () => {
  test('MODEL_MAPPINGS includes supported providers', () => {
    const keys = Object.keys(MODEL_MAPPINGS);
    expect(keys.sort()).toEqual([
      'copilot',
      'kimi',
      'openai',
      'opencode-go',
      'zai-plan',
    ]);
  });

  test('generateLiteConfig defaults to openai and includes generated presets', () => {
    const config = generateLiteConfig({
      hasTmux: false,
      installCustomSkills: false,
      reset: false,
    });

    expect(config.$schema).toBe(
      'https://unpkg.com/trans-genderian-orchestra@latest/trans-genderian-orchestra.schema.json',
    );
    expect(config.preset).toBe('openai');
    expect(config.disabled_agents).toBeUndefined();
    expect((config.presets as any)['opencode-go']).toBeDefined();
    expect((config.presets as any)['opencode-go'].councillor.model).toBe(
      'opencode-go/kimi-k2.6',
    );
    const agents = (config.presets as any).openai;
    expect(agents).toBeDefined();
    expect(agents.orchestrator.model).toBe('openai/gpt-5.5');
    expect(agents.orchestrator.variant).toBeUndefined();
    expect(agents.builder.model).toBe('openai/gpt-5.4-mini');
    expect(agents.builder.variant).toBe('medium');
  });

  test('generateLiteConfig uses correct OpenAI models', () => {
    const config = generateLiteConfig({
      hasTmux: false,
      installCustomSkills: false,
      reset: false,
    });

    const agents = (config.presets as any).openai;
    expect(agents.orchestrator.model).toBe(
      MODEL_MAPPINGS.openai.orchestrator.model,
    );
    expect(agents.planner.model).toBe('openai/gpt-5.4-mini');
    expect(agents.planner.variant).toBe('low');
    expect(agents.researcher.model).toBe('openai/gpt-5.4-mini');
    expect(agents.researcher.variant).toBe('low');
    expect(agents.builder.model).toBe('openai/gpt-5.4-mini');
    expect(agents.builder.variant).toBe('medium');
    expect(agents.reviewer.model).toBe('openai/gpt-5.4-mini');
    expect(agents.reviewer.variant).toBe('high');
  });

  test('generateLiteConfig can set opencode-go as active preset', () => {
    const config = generateLiteConfig({
      hasTmux: false,
      installCustomSkills: false,
      preset: 'opencode-go',
      reset: false,
    });

    expect(config.preset).toBe('opencode-go');
    expect(config.disabled_agents).toBeUndefined();
    expect((config.presets as any).openai).toBeDefined();
    const agents = (config.presets as any)['opencode-go'];
    expect(agents).toBeDefined();
    expect(agents.orchestrator.model).toBe('opencode-go/glm-5.1');
    expect(agents.reviewer.model).toBe('opencode-go/deepseek-v4-pro');
    expect(agents.reviewer.variant).toBe('max');
    expect(agents.council.model).toBe('opencode-go/deepseek-v4-pro');
    expect(agents.council.variant).toBe('high');
    expect(agents.planner.model).toBe('opencode-go/minimax-m2.7');
    expect(agents.researcher.model).toBe('opencode-go/minimax-m2.7');
    expect(agents.builder.model).toBe('opencode-go/deepseek-v4-flash');
    expect(agents.builder.variant).toBe('high');
    expect(agents.councillor.model).toBe('opencode-go/kimi-k2.6');
  });

  test('generateLiteConfig rejects unsupported preset', () => {
    expect(() =>
      generateLiteConfig({
        hasTmux: false,
        installCustomSkills: false,
        preset: 'not-real',
        reset: false,
      }),
    ).toThrow('Unsupported preset "not-real"');
  });

  test('generateLiteConfig rejects non-generated model mappings as active presets', () => {
    expect(() =>
      generateLiteConfig({
        hasTmux: false,
        installCustomSkills: false,
        preset: 'kimi',
        reset: false,
      }),
    ).toThrow('Unsupported preset "kimi"');
  });

  test('generateLiteConfig rejects inherited property names as presets', () => {
    expect(() =>
      generateLiteConfig({
        hasTmux: false,
        installCustomSkills: false,
        preset: 'toString',
        reset: false,
      }),
    ).toThrow('Unsupported preset "toString"');
  });

  test('generateLiteConfig enables tmux when requested', () => {
    const config = generateLiteConfig({
      hasTmux: true,
      installCustomSkills: false,
      reset: false,
    });

    expect(config.tmux).toBeDefined();
    expect((config.tmux as any).enabled).toBe(true);
    expect((config.tmux as any).layout).toBe('main-vertical');
  });

  test('generateLiteConfig includes default skills', () => {
    const config = generateLiteConfig({
      hasTmux: false,
      installCustomSkills: false,
      reset: false,
    });

    const agents = (config.presets as any).openai;
    // Orchestrator should always have '*'
    expect(agents.orchestrator.skills).toEqual(['*']);

    // Reviewer should have bundled simplify
    expect(agents.reviewer.skills).toContain('simplify');

    // Orchestrator should implicitly cover bundled codemap via '*'
    expect(agents.orchestrator.skills).toContain('*');

    // Planner should have no bundled skills by default
    expect(agents.planner.skills).toEqual([]);

    // Researcher should have bundled codemap by default
    expect(agents.researcher.skills).toContain('codemap');

    // Builder should have bundled simplify by default
    expect(agents.builder.skills).toContain('simplify');
  });

  test('generateLiteConfig includes mcps field', () => {
    const config = generateLiteConfig({
      hasTmux: false,
      installCustomSkills: false,
      reset: false,
    });

    const agents = (config.presets as any).openai;
    expect(agents.orchestrator.mcps).toBeDefined();
    expect(Array.isArray(agents.orchestrator.mcps)).toBe(true);
    expect(agents.researcher.mcps).toBeDefined();
    expect(Array.isArray(agents.researcher.mcps)).toBe(true);
  });

  test('generateLiteConfig openai includes correct mcps', () => {
    const config = generateLiteConfig({
      hasTmux: false,
      installCustomSkills: false,
      reset: false,
    });

    const agents = (config.presets as any).openai;
    expect(agents.orchestrator.mcps).toEqual([]);
    expect(agents.researcher.mcps).toContain('websearch');
    expect(agents.researcher.mcps).toContain('context7');
    expect(agents.researcher.mcps).toContain('grep_app');
    expect(agents.builder.mcps).toEqual([]);
  });
});
