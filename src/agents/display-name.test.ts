import { describe, expect, test } from 'bun:test';
import type { PluginConfig } from '../config';
import { createAgents, getAgentConfigs } from './index';

describe('displayName', () => {
  test('stores displayName on agent when configured', () => {
    const config: PluginConfig = {
      agents: {
        scribe: { displayName: 'researcher' },
      },
    };

    const agents = createAgents(config);
    const scribe = agents.find((a) => a.name === 'scribe');
    expect(scribe?.displayName).toBe('researcher');

    const sdkConfigs = getAgentConfigs(config);
    expect((sdkConfigs.scribe as { displayName?: string }).displayName).toBe(
      'researcher',
    );
  });

  test('injects configured displayName into conductor prompt mentions', () => {
    const config: PluginConfig = {
      agents: {
        scribe: { displayName: 'researcher' },
      },
    };

    const agents = createAgents(config);
    const conductor = agents.find((a) => a.name === 'conductor');
    const prompt = conductor?.config.prompt ?? '';

    expect(prompt).toContain('@researcher');
    expect(prompt).not.toMatch(/@scribe\b/);
  });

  test('normalizes @-prefixed displayName in prompt injection', () => {
    const config: PluginConfig = {
      agents: {
        scribe: { displayName: '@researcher' },
      },
    };

    const agents = createAgents(config);
    const conductor = agents.find((a) => a.name === 'conductor');
    const prompt = conductor?.config.prompt ?? '';

    expect(prompt).toContain('@researcher');
    expect(prompt).not.toContain('@@researcher');
    expect(prompt).not.toMatch(/@scribe\b/);
  });

  test('normalizes whitespace-padded displayName in prompt injection', () => {
    const config: PluginConfig = {
      agents: {
        scribe: { displayName: '  researcher  ' },
      },
    };

    const agents = createAgents(config);
    const conductor = agents.find((a) => a.name === 'conductor');
    const prompt = conductor?.config.prompt ?? '';

    expect(prompt).toContain('@researcher');
    expect(prompt).not.toContain('@ researcher ');
    expect(prompt).not.toMatch(/@scribe\b/);
  });

  test('throws when duplicate displayName is assigned', () => {
    const config: PluginConfig = {
      agents: {
        scribe: { displayName: 'helper' },
        principal: { displayName: 'helper' },
      },
    };

    expect(() => createAgents(config)).toThrow(
      "Duplicate displayName 'helper' assigned to multiple agents",
    );
  });

  test('throws when normalized duplicate displayName is assigned', () => {
    const config: PluginConfig = {
      agents: {
        scribe: { displayName: 'advisor' },
        principal: { displayName: ' @advisor ' },
      },
    };

    expect(() => createAgents(config)).toThrow(
      "Duplicate displayName 'advisor' assigned to multiple agents",
    );
  });

  test('throws when displayName conflicts with internal agent name', () => {
    const config: PluginConfig = {
      agents: {
        scribe: { displayName: 'principal' },
      },
    };

    expect(() => createAgents(config)).toThrow(
      "displayName 'principal' conflicts with an agent name",
    );
  });

  test('throws when normalized displayName conflicts with internal agent name', () => {
    const config: PluginConfig = {
      agents: {
        scribe: { displayName: ' @principal ' },
      },
    };

    expect(() => createAgents(config)).toThrow(
      "displayName 'principal' conflicts with an agent name",
    );
  });

  test('throws when conductor displayName conflicts with internal agent name', () => {
    const config: PluginConfig = {
      agents: {
        conductor: { displayName: 'principal' },
      },
    };

    expect(() => createAgents(config)).toThrow(
      /displayName.*conflicts with an agent name/,
    );
  });

  test('throws when displayName is not a safe agent alias', () => {
    const config: PluginConfig = {
      agents: {
        scribe: { displayName: 'senior reviewer' },
      },
    };

    expect(() => createAgents(config)).toThrow(
      "displayName 'senior reviewer' must match /^[a-z][a-z0-9_-]*$/i",
    );
  });

  test('resolves legacy alias for scribe displayName override', () => {
    const config: PluginConfig = {
      agents: {
        explore: { displayName: 'researcher' },
      },
    };

    const agents = createAgents(config);
    const scribe = agents.find((a) => a.name === 'scribe');

    expect(scribe?.displayName).toBe('researcher');
  });

  test('uses displayName as host-facing registry key with hidden internal alias', () => {
    const config: PluginConfig = {
      agents: {
        principal: { displayName: 'advisor' },
      },
    };

    const sdkConfigs = getAgentConfigs(config) as Record<
      string,
      { hidden?: boolean; mode?: string }
    >;

    expect(sdkConfigs.advisor).toBeDefined();
    expect(sdkConfigs.advisor.mode).toBe('subagent');
    expect(sdkConfigs.advisor.hidden).toBeUndefined();

    expect(sdkConfigs.principal).toBeDefined();
    expect(sdkConfigs.principal.mode).toBe('subagent');
    expect(sdkConfigs.principal.hidden).toBe(true);
  });

  test('uses conductor displayName as host-facing key with hidden internal alias', () => {
    const config: PluginConfig = {
      agents: {
        conductor: { displayName: 'engineer' },
      },
    };

    const sdkConfigs = getAgentConfigs(config) as Record<
      string,
      { hidden?: boolean; mode?: string }
    >;

    expect(sdkConfigs.engineer).toBeDefined();
    expect(sdkConfigs.engineer.mode).toBe('primary');
    expect(sdkConfigs.engineer.hidden).toBeUndefined();

    expect(sdkConfigs.conductor).toBeDefined();
    expect(sdkConfigs.conductor.mode).toBe('primary');
    expect(sdkConfigs.conductor.hidden).toBe(true);
  });

  test('keeps internal-only ensemble agents hidden even with displayName configured', () => {
    const config: PluginConfig = {
      disabled_agents: [],
      agents: {
        councillor: { displayName: 'reviewer' },
      },
    };

    const sdkConfigs = getAgentConfigs(config);

    expect(sdkConfigs.reviewer).toBeUndefined();
    expect(sdkConfigs.councillor?.hidden).toBe(true);
  });
});
