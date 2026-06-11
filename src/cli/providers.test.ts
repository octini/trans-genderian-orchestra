/// <reference types="bun-types" />

import { describe, expect, test } from 'bun:test';
import { generateLiteConfig, MODEL_MAPPINGS } from './providers';

describe('providers', () => {
  test('MODEL_MAPPINGS includes generated provider mappings', () => {
    const keys = Object.keys(MODEL_MAPPINGS);
    expect(keys).toContain('github-copilot');
    expect(keys).toContain('opencode-go');
  });

  test('generateLiteConfig defaults to github-copilot and includes only generated primary presets', () => {
    const config = generateLiteConfig({
      hasTmux: false,
      installCustomSkills: false,
      reset: false,
    });

    expect(config.$schema).toBe(
      'https://unpkg.com/trans-genderian-orchestra@latest/trans-genderian-orchestra.schema.json',
    );
    expect(config.preset).toBe('github-copilot');
    expect(config.disabled_agents).toBeUndefined();
    expect(Object.keys(config.presets as any).sort()).toEqual([
      'github-copilot',
      'opencode-go',
    ]);
    const agents = (config.presets as any)['github-copilot'];
    expect(agents).toBeDefined();
    expect(agents.conductor.model).toBe('github-copilot/gpt-5.5');
    expect(agents.conductor.variant).toBe('xhigh');
    expect(agents.scribe.model).toBe('github-copilot/gemini-3.5-flash');
    expect(agents.scribe.variant).toBe('high');
    expect(agents.composer.model).toBe('github-copilot/gpt-5.5');
    expect(agents.composer.variant).toBe('xhigh');
    expect(agents.principal.model).toBe('github-copilot/claude-opus-4.7');
    expect(agents.principal.variant).toBe('max');
    expect(agents.ensemble.model).toBe('conductor');
  });

  test('generateLiteConfig uses approved GitHub Copilot models', () => {
    const config = generateLiteConfig({
      hasTmux: false,
      installCustomSkills: false,
      reset: false,
    });

    const agents = (config.presets as any)['github-copilot'];
    expect(agents.conductor.model).toBe(
      MODEL_MAPPINGS['github-copilot'].conductor.model,
    );
    expect(agents.conductor.variant).toBe('xhigh');
    expect(agents.scribe.model).toBe('github-copilot/gemini-3.5-flash');
    expect(agents.scribe.variant).toBe('high');
    expect(agents.composer.model).toBe('github-copilot/gpt-5.5');
    expect(agents.composer.variant).toBe('xhigh');
    expect(agents.principal.model).toBe('github-copilot/claude-opus-4.7');
    expect(agents.principal.variant).toBe('max');
    expect(agents.ensemble.model).toBe('conductor');
  });

  test('generateLiteConfig can set opencode-go as active preset', () => {
    const config = generateLiteConfig({
      hasTmux: false,
      installCustomSkills: false,
      preset: 'opencode-go',
      reset: false,
    });

    expect(config.preset).toBe('opencode-go');
    expect((config.ensemble as any).default_preset).toBe('opencode-go');
    expect(config.disabled_agents).toEqual([]);
    expect(Object.keys(config.presets as any).sort()).toEqual([
      'github-copilot',
      'opencode-go',
    ]);
    const agents = (config.presets as any)['opencode-go'];
    expect(agents).toBeDefined();
    expect(agents.conductor.model).toBe('opencode-go/mimo-v2.5-pro');
    expect(agents.conductor.variant).toBe('high');
    expect(agents.scribe.model).toBe('opencode-go/mimo-v2.5');
    expect(agents.scribe.variant).toBe('high');
    expect(agents.composer.model).toBe('opencode-go/mimo-v2.5');
    expect(agents.composer.variant).toBe('high');
    expect(agents.principal.model).toBe('opencode-go/mimo-v2.5-pro');
    expect(agents.principal.variant).toBe('high');
    expect(agents.ensemble.model).toBe('conductor');
    expect(agents.ensemble.variant).toBeUndefined();
  });

  test('generateLiteConfig includes approved ensemble council defaults', () => {
    const config = generateLiteConfig({
      hasTmux: false,
      installCustomSkills: false,
      reset: false,
    });

    const ensemble = config.ensemble as any;
    expect(ensemble.default_preset).toBe('github-copilot');
    expect(ensemble.councillor_execution_mode).toBe('parallel');
    expect(ensemble.timeout).toBe(180000);
    expect(Object.keys(ensemble.presets).sort()).toEqual([
      'github-copilot',
      'opencode-go',
    ]);

    expect(ensemble.presets['github-copilot'].first).toEqual({
      model: 'github-copilot/gemini-3.5-flash',
      variant: 'high',
      prompt: 'Focus: Correctness & Architecture',
    });
    expect(ensemble.presets['github-copilot'].second).toEqual({
      model: 'github-copilot/gpt-5.5',
      variant: 'xhigh',
      prompt: 'Focus: Edge Cases & Security',
    });
    expect(ensemble.presets['github-copilot'].third).toEqual({
      model: 'github-copilot/claude-opus-4.7',
      variant: 'max',
      prompt: 'Focus: UX & Performance',
    });

    expect(ensemble.presets['opencode-go'].first).toEqual({
      model: 'opencode-go/mimo-v2.5',
      variant: 'high',
      prompt: 'Focus: Correctness & Architecture',
    });
    expect(ensemble.presets['opencode-go'].second).toEqual({
      model: 'opencode-go/deepseek-v4-flash',
      variant: 'max',
      prompt: 'Focus: Edge Cases & Security',
    });
    expect(ensemble.presets['opencode-go'].third).toEqual({
      model: 'opencode-go/kimi-k2.6',
      prompt: 'Focus: UX & Performance',
    });
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

  test('generateLiteConfig rejects legacy presets as active presets', () => {
    expect(() =>
      generateLiteConfig({
        hasTmux: false,
        installCustomSkills: false,
        preset: 'openai',
        reset: false,
      }),
    ).toThrow('Unsupported preset "openai"');
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

    const agents = (config.presets as any)['github-copilot'];
    // Orchestrator should always have '*'
    expect(agents.conductor.skills).toEqual(['*']);

    // Oracle should have bundled simplify
    expect(agents.principal.skills).toContain('simplify');

    // Orchestrator should implicitly cover bundled codemap via '*'
    expect(agents.conductor.skills).toContain('*');

    // Composer should include bundled simplify by default
    expect(agents.composer.skills).toEqual(['simplify']);

    // Explorer should have no bundled skills by default
    expect(agents.scribe.skills).toEqual([]);
  });

  test('generateLiteConfig includes mcps field', () => {
    const config = generateLiteConfig({
      hasTmux: false,
      installCustomSkills: false,
      reset: false,
    });

    const agents = (config.presets as any)['github-copilot'];
    expect(agents.conductor.mcps).toBeDefined();
    expect(Array.isArray(agents.conductor.mcps)).toBe(true);
    expect(agents.scribe.mcps).toBeDefined();
    expect(Array.isArray(agents.scribe.mcps)).toBe(true);
  });

  test('generateLiteConfig github-copilot includes correct mcps', () => {
    const config = generateLiteConfig({
      hasTmux: false,
      installCustomSkills: false,
      reset: false,
    });

    const agents = (config.presets as any)['github-copilot'];
    expect(agents.conductor.mcps).toEqual(['*', '!context7']);
    expect(agents.scribe.mcps).toContain('websearch');
    expect(agents.scribe.mcps).toContain('context7');
    expect(agents.scribe.mcps).toContain('grep_app');
    expect(agents.composer.mcps).toEqual([]);
  });
});
