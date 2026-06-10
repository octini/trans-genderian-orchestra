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
    expect((config.presets as any)['opencode-go'].ensemble.model).toBe(
      'opencode-go/kimi-k2.6',
    );
    const agents = (config.presets as any).openai;
    expect(agents).toBeDefined();
    expect(agents.conductor.model).toBe('openai/gpt-5.5');
    expect(agents.conductor.variant).toBeUndefined();
    expect(agents.scribe.model).toBe('openai/gpt-5.4-mini');
    expect(agents.scribe.variant).toBe('low');
    expect(agents.composer.model).toBe('openai/gpt-5.4-mini');
    expect(agents.composer.variant).toBe('medium');
  });

  test('generateLiteConfig uses correct OpenAI models', () => {
    const config = generateLiteConfig({
      hasTmux: false,
      installCustomSkills: false,
      reset: false,
    });

    const agents = (config.presets as any).openai;
    expect(agents.conductor.model).toBe(MODEL_MAPPINGS.openai.conductor.model);
    expect(agents.principal.model).toBe('openai/gpt-5.5');
    expect(agents.principal.variant).toBe('high');
    expect(agents.scribe.model).toBe('openai/gpt-5.4-mini');
    expect(agents.scribe.variant).toBe('low');
    expect(agents.scribe.model).toBe('openai/gpt-5.4-mini');
    expect(agents.scribe.variant).toBe('low');
    expect(agents.composer.model).toBe('openai/gpt-5.4-mini');
    expect(agents.composer.variant).toBe('medium');
  });

  test('generateLiteConfig can set opencode-go as active preset', () => {
    const config = generateLiteConfig({
      hasTmux: false,
      installCustomSkills: false,
      preset: 'opencode-go',
      reset: false,
    });

    expect(config.preset).toBe('opencode-go');
    expect(config.disabled_agents).toEqual([]);
    expect((config.presets as any).openai).toBeDefined();
    const agents = (config.presets as any)['opencode-go'];
    expect(agents).toBeDefined();
    expect(agents.conductor.model).toBe('opencode-go/glm-5.1');
    expect(agents.principal.model).toBe('opencode-go/deepseek-v4-pro');
    expect(agents.principal.variant).toBe('max');
    expect(agents.ensemble.model).toBe('opencode-go/kimi-k2.6');
    expect(agents.scribe.model).toBe('opencode-go/minimax-m2.7');
    expect(agents.composer.model).toBe('opencode-go/kimi-k2.6');
    expect(agents.composer.variant).toBe('medium');
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
    expect(agents.conductor.skills).toEqual(['*']);

    // Oracle should have bundled simplify
    expect(agents.principal.skills).toContain('simplify');

    // Orchestrator should implicitly cover bundled codemap via '*'
    expect(agents.conductor.skills).toContain('*');

    // Designer should have no bundled skills by default
    expect(agents.composer.skills).toEqual([]);

    // Explorer should have no bundled skills by default
    expect(agents.scribe.skills).toEqual([]);

    // Fixer should have no bundled skills by default
    expect(agents.composer.skills).toEqual([]);
  });

  test('generateLiteConfig includes mcps field', () => {
    const config = generateLiteConfig({
      hasTmux: false,
      installCustomSkills: false,
      reset: false,
    });

    const agents = (config.presets as any).openai;
    expect(agents.conductor.mcps).toBeDefined();
    expect(Array.isArray(agents.conductor.mcps)).toBe(true);
    expect(agents.scribe.mcps).toBeDefined();
    expect(Array.isArray(agents.scribe.mcps)).toBe(true);
  });

  test('generateLiteConfig openai includes correct mcps', () => {
    const config = generateLiteConfig({
      hasTmux: false,
      installCustomSkills: false,
      reset: false,
    });

    const agents = (config.presets as any).openai;
    expect(agents.conductor.mcps).toEqual(['*', '!context7']);
    expect(agents.scribe.mcps).toContain('websearch');
    expect(agents.scribe.mcps).toContain('context7');
    expect(agents.scribe.mcps).toContain('grep_app');
    expect(agents.composer.mcps).toEqual([]);
  });
});
