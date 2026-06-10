import { describe, expect, test } from 'bun:test';
import type { PluginConfig } from '../config';
import {
  AgentOverrideConfigSchema,
  CouncilConfigSchema,
  DEFAULT_DISABLED_AGENTS,
  DEFAULT_MODELS,
  PluginConfigSchema,
  SUBAGENT_NAMES,
} from '../config';
import {
  createAgents,
  getAgentConfigs,
  getDisabledAgents,
  getEnabledAgentNames,
  isSubagent,
} from './index';

function councilConfig() {
  const parsed = CouncilConfigSchema.parse({
    presets: { default: { alpha: { model: 'test/councillor' } } },
  });
  return parsed;
}

describe('agent alias backward compatibility', () => {
  test("applies 'explore' config to 'scribe' agent", () => {
    const config: PluginConfig = {
      agents: {
        explore: { model: 'test/old-explore-model' },
      },
    };
    const agents = createAgents(config);
    const scribe = agents.find((a) => a.name === 'scribe');
    expect(scribe).toBeDefined();
    expect(scribe?.config.model).toBe('test/old-explore-model');
  });

  test("applies 'frontend-ui-ux-engineer' config to 'composer' agent", () => {
    const config: PluginConfig = {
      agents: {
        'frontend-ui-ux-engineer': { model: 'test/old-frontend-model' },
      },
    };
    const agents = createAgents(config);
    const composer = agents.find((a) => a.name === 'composer');
    expect(composer).toBeDefined();
    expect(composer?.config.model).toBe('test/old-frontend-model');
  });

  test('new name takes priority over old alias', () => {
    const config: PluginConfig = {
      agents: {
        explore: { model: 'old-model' },
        scribe: { model: 'new-model' },
      },
    };
    const agents = createAgents(config);
    const scribe = agents.find((a) => a.name === 'scribe');
    expect(scribe?.config.model).toBe('new-model');
  });

  test('new agent names work directly', () => {
    const config: PluginConfig = {
      agents: {
        scribe: { model: 'direct-scribe' },
        composer: { model: 'direct-composer' },
      },
    };
    const agents = createAgents(config);
    expect(agents.find((a) => a.name === 'scribe')?.config.model).toBe(
      'direct-scribe',
    );
    expect(agents.find((a) => a.name === 'composer')?.config.model).toBe(
      'direct-composer',
    );
  });

  test('temperature override via old alias', () => {
    const config: PluginConfig = {
      agents: {
        explore: { temperature: 0.5 },
      },
    };
    const agents = createAgents(config);
    const scribe = agents.find((a) => a.name === 'scribe');
    expect(scribe?.config.temperature).toBe(0.5);
  });

  test('variant override via old alias', () => {
    const config: PluginConfig = {
      agents: {
        explore: { variant: 'low' },
      },
    };
    const agents = createAgents(config);
    const scribe = agents.find((a) => a.name === 'scribe');
    expect(scribe?.config.variant).toBe('low');
  });
});

describe('composer agent fallback', () => {
  test('composer uses its default model when no composer config provided', () => {
    const config: PluginConfig = {
      agents: {
        scribe: { model: 'scribe-custom-model' },
      },
    };
    const agents = createAgents(config);
    const composer = agents.find((a) => a.name === 'composer');
    expect(composer?.config.model).toBe('openai/gpt-5.4-mini');
  });

  test('composer uses its own model when explicitly configured', () => {
    const config: PluginConfig = {
      agents: {
        scribe: { model: 'scribe-model' },
        composer: { model: 'composer-specific-model' },
      },
    };
    const agents = createAgents(config);
    const composer = agents.find((a) => a.name === 'composer');
    expect(composer?.config.model).toBe('composer-specific-model');
  });
});

describe('conductor agent', () => {
  test('conductor is first in agents array', () => {
    const agents = createAgents();
    expect(agents[0].name).toBe('conductor');
  });

  test('conductor has question permission set to allow', () => {
    const agents = createAgents();
    const conductor = agents.find((a) => a.name === 'conductor');
    expect(conductor?.config.permission).toBeDefined();
    expect((conductor?.config.permission as any).question).toBe('allow');
  });

  test('conductor is denied access to council_session', () => {
    const agents = createAgents();
    const conductor = agents.find((a) => a.name === 'conductor');
    expect((conductor?.config.permission as any).council_session).toBe('deny');
  });

  test('conductor is allowed to invoke cancel_task', () => {
    const agents = createAgents();
    const conductor = agents.find((a) => a.name === 'conductor');
    expect((conductor?.config.permission as any).cancel_task).toBe('allow');
  });

  test('conductor accepts overrides', () => {
    const config: PluginConfig = {
      agents: {
        conductor: { model: 'custom-conductor-model', temperature: 0.3 },
      },
    };
    const agents = createAgents(config);
    const conductor = agents.find((a) => a.name === 'conductor');
    expect(conductor?.config.model).toBe('custom-conductor-model');
    expect(conductor?.config.temperature).toBe(0.3);
  });

  test('conductor accepts variant override', () => {
    const config: PluginConfig = {
      agents: {
        conductor: { variant: 'high' },
      },
    };
    const agents = createAgents(config);
    const conductor = agents.find((a) => a.name === 'conductor');
    expect(conductor?.config.variant).toBe('high');
  });

  test('conductor stores model array with per-model variants in _modelArray', () => {
    const config: PluginConfig = {
      agents: {
        conductor: {
          model: [
            { id: 'google/gemini-3-pro', variant: 'high' },
            { id: 'github-copilot/claude-3.5-haiku' },
            'openai/gpt-4',
          ],
        },
      },
    };
    const agents = createAgents(config);
    const conductor = agents.find((a) => a.name === 'conductor');
    expect(conductor?._modelArray).toEqual([
      { id: 'google/gemini-3-pro', variant: 'high' },
      { id: 'github-copilot/claude-3.5-haiku' },
      { id: 'openai/gpt-4' },
    ]);
    expect(conductor?.config.model).toBeUndefined();
  });
});

describe('per-model variant in array config', () => {
  test('subagent stores model array with per-model variants', () => {
    const config: PluginConfig = {
      agents: {
        scribe: {
          model: [
            { id: 'google/gemini-3-flash', variant: 'low' },
            'openai/gpt-4o-mini',
          ],
        },
      },
    };
    const agents = createAgents(config);
    const scribe = agents.find((a) => a.name === 'scribe');
    expect(scribe?._modelArray).toEqual([
      { id: 'google/gemini-3-flash', variant: 'low' },
      { id: 'openai/gpt-4o-mini' },
    ]);
    expect(scribe?.config.model).toBeUndefined();
  });

  test('top-level variant preserved alongside per-model variants', () => {
    const config: PluginConfig = {
      agents: {
        conductor: {
          model: [
            { id: 'google/gemini-3-pro', variant: 'high' },
            'openai/gpt-4',
          ],
          variant: 'low',
        },
      },
    };
    const agents = createAgents(config);
    const conductor = agents.find((a) => a.name === 'conductor');
    // top-level variant still set as default
    expect(conductor?.config.variant).toBe('low');
    // per-model variants stored in _modelArray
    expect(conductor?._modelArray?.[0]?.variant).toBe('high');
    expect(conductor?._modelArray?.[1]?.variant).toBeUndefined();
  });
});

describe('skill permissions', () => {
  test('conductor gets command-style bundled skills allowed by default', () => {
    const agents = createAgents();
    const conductor = agents.find((a) => a.name === 'conductor');
    expect(conductor).toBeDefined();
    const skillPerm = (conductor?.config.permission as Record<string, unknown>)
      ?.skill as Record<string, string>;
    // conductor gets wildcard allow by default
    expect(skillPerm?.['*']).toBe('allow');
    // CUSTOM_SKILLS loop must also add a named codemap entry for conductor
    expect(skillPerm?.codemap).toBe('allow');
    expect(skillPerm?.clonedeps).toBe('allow');
  });

  test('composer does not get codemap skill allowed by default', () => {
    const agents = createAgents();
    const composer = agents.find((a) => a.name === 'composer');
    expect(composer).toBeDefined();
    const skillPerm = (composer?.config.permission as Record<string, unknown>)
      ?.skill as Record<string, string>;
    expect(skillPerm?.codemap).not.toBe('allow');
    expect(skillPerm?.clonedeps).not.toBe('allow');
  });

  test('principal gets requesting-code-review skill allowed by default', () => {
    const agents = createAgents();
    const principal = agents.find((a) => a.name === 'principal');
    expect(principal).toBeDefined();
    const skillPerm = (principal?.config.permission as Record<string, unknown>)
      ?.skill as Record<string, string>;
    expect(skillPerm?.['requesting-code-review']).toBe('allow');
  });

  test('principal gets simplify skill allowed by default', () => {
    const agents = createAgents();
    const principal = agents.find((a) => a.name === 'principal');
    expect(principal).toBeDefined();
    const skillPerm = (principal?.config.permission as Record<string, unknown>)
      ?.skill as Record<string, string>;
    expect(skillPerm?.simplify).toBe('allow');
  });
});

describe('tool permissions', () => {
  test('ensemble agent is allowed to invoke council_session', () => {
    const agents = createAgents({
      ensemble: councilConfig(),
    });
    const ensemble = agents.find((a) => a.name === 'ensemble');
    expect((ensemble?.config.permission as any).council_session).toBe('allow');
  });

  test('principal is denied access to council_session', () => {
    const agents = createAgents();
    const principal = agents.find((a) => a.name === 'principal');
    expect((principal?.config.permission as any).council_session).toBe('deny');
  });

  test('scribe is denied access to council_session', () => {
    const agents = createAgents();
    const scribe = agents.find((a) => a.name === 'scribe');
    expect((scribe?.config.permission as any).council_session).toBe('deny');
  });

  test('councillor is denied access to council_session', () => {
    const agents = createAgents();
    const councillor = agents.find((a) => a.name === 'councillor');
    expect((councillor?.config.permission as any).council_session).toBe('deny');
  });

  test('subagents are denied access to cancel_task', () => {
    const agents = createAgents({
      ensemble: councilConfig(),
    });
    for (const name of ['principal', 'scribe', 'composer', 'ensemble']) {
      const agent = agents.find((a) => a.name === name);
      expect((agent?.config.permission as any).cancel_task).toBe('deny');
    }
  });
});

describe('isSubagent type guard', () => {
  test('returns true for valid subagent names', () => {
    expect(isSubagent('scribe')).toBe(true);
    expect(isSubagent('scribe')).toBe(true);
    expect(isSubagent('principal')).toBe(true);
    expect(isSubagent('composer')).toBe(true);
    expect(isSubagent('composer')).toBe(true);
  });

  test('returns false for conductor', () => {
    expect(isSubagent('conductor')).toBe(false);
  });

  test('returns false for invalid agent names', () => {
    expect(isSubagent('invalid-agent')).toBe(false);
    expect(isSubagent('')).toBe(false);
    expect(isSubagent('explore')).toBe(false); // old alias, not actual agent name
  });
});

describe('agent classification', () => {
  test('SUBAGENT_NAMES excludes conductor', () => {
    expect(SUBAGENT_NAMES).not.toContain('conductor');
    expect(SUBAGENT_NAMES).toContain('scribe');
    expect(SUBAGENT_NAMES).toContain('composer');
  });

  test('getAgentConfigs applies correct classification visibility and mode', () => {
    // Enable all agents for classification testing
    const configs = getAgentConfigs({ disabled_agents: [] });

    // Primary agent
    expect(configs.conductor.mode).toBe('primary');

    // Subagents
    for (const name of SUBAGENT_NAMES) {
      // Council is a dual-mode agent ("all"), rest are subagents
      if (name === 'ensemble') {
        expect(configs[name]).toBeUndefined();
      } else {
        expect(configs[name].mode).toBe('subagent');
      }
    }
  });
});

describe('createAgents', () => {
  test('creates all agents without config', () => {
    const agents = createAgents();
    const names = agents.map((a) => a.name);
    expect(names).toContain('conductor');
    expect(names).toContain('scribe');
    expect(names).toContain('composer');
    expect(names).toContain('principal');
    expect(names).toContain('scribe');
    expect(names).toContain('composer');
  });

  test('creates exactly 5 agents by default (ensemble unconfigured)', () => {
    const agents = createAgents();
    expect(agents.length).toBe(5);
  });

  test('does not create ensemble when ensemble is not configured', () => {
    const agents = createAgents();
    const names = agents.map((a) => a.name);
    const conductor = agents.find((a) => a.name === 'conductor');

    expect(names).not.toContain('ensemble');
    // Note: conductor prompt references @ensemble as a delegation target
    // but the ensemble agent itself is not instantiated
  });

  test('creates ensemble when ensemble is configured', () => {
    const agents = createAgents({
      ensemble: councilConfig(),
    });
    const names = agents.map((a) => a.name);
    const conductor = agents.find((a) => a.name === 'conductor');

    expect(names).toContain('ensemble');
    expect(conductor?.config.prompt).toContain('@ensemble');
  });
});

describe('getAgentConfigs', () => {
  test('returns config record keyed by agent name', () => {
    const configs = getAgentConfigs();
    expect(configs.conductor).toBeDefined();
    expect(configs.scribe).toBeDefined();
    // conductor has no hardcoded default model; resolved at runtime via
    // chat.message hook when _modelArray is configured, or left to the user
    expect(configs.scribe.model).toBeDefined();
  });

  test('includes description in SDK config', () => {
    const configs = getAgentConfigs();
    expect(configs.conductor.description).toBeDefined();
    expect(configs.scribe.description).toBeDefined();
  });
});

describe('ensemble agent model resolution', () => {
  test('ensemble agent uses default model', () => {
    const agents = createAgents({
      ensemble: councilConfig(),
    });
    const ensemble = agents.find((a) => a.name === 'ensemble');
    expect(ensemble?.config.model).toBe(DEFAULT_MODELS.ensemble);
  });

  test('councillor agent uses default model', () => {
    const agents = createAgents();
    const councillor = agents.find((a) => a.name === 'councillor');
    expect(councillor?.config.model).toBe(DEFAULT_MODELS.councillor);
  });

  test('ensemble falls back to legacy master.model when no preset override', () => {
    // Simulates a pre-1.0.0 config with ensemble.master.model but no ensemble
    // entry in the agent preset — the exact scenario from issue #369.
    const config: PluginConfig = {
      agents: {
        principal: { model: 'openai/gpt-5.5' },
      },
      ensemble: {
        ...councilConfig(),
        _legacyMasterModel: 'anthropic/claude-opus-4-6',
      },
    };
    const agents = createAgents(config);
    const ensemble = agents.find((a) => a.name === 'ensemble');
    expect(ensemble?.config.model).toBe('anthropic/claude-opus-4-6');
  });

  test('ensemble preset override takes precedence over legacy master.model', () => {
    // If user has explicit ensemble in preset, that wins — legacy is ignored.
    const config: PluginConfig = {
      agents: {
        ensemble: { model: 'google/gemini-3-pro' },
      },
      ensemble: {
        ...councilConfig(),
        _legacyMasterModel: 'anthropic/claude-opus-4-6',
      },
    };
    const agents = createAgents(config);
    const ensemble = agents.find((a) => a.name === 'ensemble');
    expect(ensemble?.config.model).toBe('google/gemini-3-pro');
  });

  test('ensemble uses default when no legacy master and no preset override', () => {
    // No legacy master, no preset override → standard default
    const config: PluginConfig = {
      ensemble: councilConfig(),
    };
    const agents = createAgents(config);
    const ensemble = agents.find((a) => a.name === 'ensemble');
    expect(ensemble?.config.model).toBe(DEFAULT_MODELS.ensemble);
  });

  test('end-to-end: raw master.model config flows through schema to ensemble agent', () => {
    // Integration test: start from raw user config with deprecated master.model,
    // parse through CouncilConfigSchema, then pass to createAgents.
    // This validates the full seam between schema transform and agent resolution.
    const rawCouncilConfig = {
      master: { model: 'anthropic/claude-opus-4-6' },
      presets: {
        default: {
          alpha: { model: 'openai/gpt-5.4-mini' },
        },
      },
    };

    const parsed = CouncilConfigSchema.safeParse(rawCouncilConfig);
    expect(parsed.success).toBe(true);

    if (parsed.success) {
      const config: PluginConfig = {
        ensemble: parsed.data,
      };
      const agents = createAgents(config);
      const ensemble = agents.find((a) => a.name === 'ensemble');
      // Legacy master.model should flow through schema → agent
      expect(ensemble?.config.model).toBe('anthropic/claude-opus-4-6');
    }
  });
});

describe('options passthrough', () => {
  test('options are applied to agent config via overrides', () => {
    const config: PluginConfig = {
      agents: {
        principal: {
          model: 'openai/gpt-5.5',
          options: { textVerbosity: 'low' },
        },
      },
    };
    const agents = createAgents(config);
    const principal = agents.find((a) => a.name === 'principal');
    expect(principal?.config.options).toEqual({ textVerbosity: 'low' });
  });

  test('options with nested objects are passed through', () => {
    const config: PluginConfig = {
      agents: {
        principal: {
          model: 'anthropic/claude-sonnet-4-6',
          options: {
            thinking: { type: 'enabled', budgetTokens: 16000 },
          },
        },
      },
    };
    const agents = createAgents(config);
    const principal = agents.find((a) => a.name === 'principal');
    expect(principal?.config.options).toEqual({
      thinking: { type: 'enabled', budgetTokens: 16000 },
    });
  });

  test('options work with other overrides', () => {
    const config: PluginConfig = {
      agents: {
        principal: {
          model: 'openai/gpt-5.5',
          variant: 'high',
          temperature: 0.7,
          options: { textVerbosity: 'low', reasoningEffort: 'medium' },
        },
      },
    };
    const agents = createAgents(config);
    const principal = agents.find((a) => a.name === 'principal');
    expect(principal?.config.model).toBe('openai/gpt-5.5');
    expect(principal?.config.variant).toBe('high');
    expect(principal?.config.temperature).toBe(0.7);
    expect(principal?.config.options).toEqual({
      textVerbosity: 'low',
      reasoningEffort: 'medium',
    });
  });

  test('options are absent when not configured', () => {
    const config: PluginConfig = {
      agents: {
        principal: { model: 'openai/gpt-5.5' },
      },
    };
    const agents = createAgents(config);
    const principal = agents.find((a) => a.name === 'principal');
    expect(principal?.config.options).toBeUndefined();
  });

  test('options flow through getAgentConfigs to SDK output', () => {
    const config: PluginConfig = {
      agents: {
        principal: {
          model: 'openai/gpt-5.5',
          options: { textVerbosity: 'low' },
        },
      },
    };
    const configs = getAgentConfigs(config);
    expect(configs.principal.options).toEqual({ textVerbosity: 'low' });
  });

  test('options are shallow-merged with existing agent config options', () => {
    // Simulate an agent factory setting default options
    const config: PluginConfig = {
      agents: {
        principal: {
          model: 'openai/gpt-5.5',
          options: { reasoningEffort: 'medium' },
        },
      },
    };
    const agents = createAgents(config);
    const principal = agents.find((a) => a.name === 'principal');
    // Override options should merge with (not replace) any factory defaults
    expect(principal?.config.options).toEqual({ reasoningEffort: 'medium' });
  });
});

describe('AgentOverrideConfigSchema options validation', () => {
  test('accepts valid options object', () => {
    const result = AgentOverrideConfigSchema.safeParse({
      options: { textVerbosity: 'low' },
    });
    expect(result.success).toBe(true);
  });

  test('accepts empty options object', () => {
    const result = AgentOverrideConfigSchema.safeParse({ options: {} });
    expect(result.success).toBe(true);
  });

  test('accepts nested values in options', () => {
    const result = AgentOverrideConfigSchema.safeParse({
      options: {
        thinking: { type: 'enabled', budgetTokens: 16000 },
      },
    });
    expect(result.success).toBe(true);
  });

  test('accepts options alongside other fields', () => {
    const result = AgentOverrideConfigSchema.safeParse({
      model: 'openai/gpt-5.5',
      variant: 'high',
      temperature: 0.7,
      options: { textVerbosity: 'low' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.options).toEqual({ textVerbosity: 'low' });
    }
  });

  test('config without options is valid', () => {
    const result = AgentOverrideConfigSchema.safeParse({
      model: 'openai/gpt-5.5',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.options).toBeUndefined();
    }
  });

  test('rejects non-object options', () => {
    const result = AgentOverrideConfigSchema.safeParse({
      options: 'not-an-object',
    });
    expect(result.success).toBe(false);
  });

  test('rejects empty model arrays', () => {
    const result = AgentOverrideConfigSchema.safeParse({
      model: [],
    });
    expect(result.success).toBe(false);
  });

  test('accepts prompt and conductorPrompt override fields', () => {
    const result = AgentOverrideConfigSchema.safeParse({
      model: 'openai/gpt-5.5',
      prompt: 'You are a specialized reviewer.',
      conductorPrompt: '@reviewer\n- Role: Specialized reviewer',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prompt).toBe('You are a specialized reviewer.');
      expect(result.data.conductorPrompt).toBe(
        '@reviewer\n- Role: Specialized reviewer',
      );
    }
  });

  test('rejects empty prompt fields', () => {
    const result = AgentOverrideConfigSchema.safeParse({
      model: 'openai/gpt-5.5',
      prompt: '',
    });
    expect(result.success).toBe(false);
  });

  test('rejects empty conductorPrompt fields', () => {
    const result = AgentOverrideConfigSchema.safeParse({
      model: 'openai/gpt-5.5',
      conductorPrompt: '',
    });
    expect(result.success).toBe(false);
  });

  test('rejects description field on overrides', () => {
    const result = AgentOverrideConfigSchema.safeParse({
      model: 'openai/gpt-5.5',
      description: 'not supported for custom agents',
    } as Record<string, unknown>);
    expect(result.success).toBe(false);
  });
});

describe('PluginConfigSchema custom-agent-only prompt fields', () => {
  test('rejects prompt on built-in top-level agent overrides', () => {
    const result = PluginConfigSchema.safeParse({
      agents: {
        principal: {
          model: 'openai/gpt-5.5',
          prompt: 'ignored built-in prompt override',
        },
      },
    });

    expect(result.success).toBe(false);
  });

  test('rejects conductorPrompt on built-in top-level agent overrides', () => {
    const result = PluginConfigSchema.safeParse({
      agents: {
        scribe: {
          model: 'openai/gpt-5.4-mini',
          conductorPrompt: '@scribe\n- Role: should be invalid here',
        },
      },
    });

    expect(result.success).toBe(false);
  });

  test('rejects custom-only prompt fields on built-in preset agents', () => {
    const result = PluginConfigSchema.safeParse({
      presets: {
        openai: {
          principal: {
            model: 'openai/gpt-5.5',
            prompt: 'ignored preset built-in prompt override',
          },
        },
      },
    });

    expect(result.success).toBe(false);
  });

  test('allows prompt fields on custom agents', () => {
    const result = PluginConfigSchema.safeParse({
      agents: {
        janitor: {
          model: 'openai/gpt-5.4-mini',
          prompt: 'You are Janitor.',
          conductorPrompt: '@janitor\n- Role: Cleanup specialist',
        },
      },
    });

    expect(result.success).toBe(true);
  });

  test('accepts backgroundJobs config', () => {
    const result = PluginConfigSchema.safeParse({
      backgroundJobs: {
        maxSessionsPerAgent: 2,
        readContextMinLines: 10,
        readContextMaxFiles: 8,
      },
    });

    expect(result.success).toBe(true);
  });
});

describe('disabled_agents', () => {
  test('disabled agents are not created', () => {
    const config: PluginConfig = {
      disabled_agents: ['composer', 'composer'],
    };
    const agents = createAgents(config);
    const names = agents.map((a) => a.name);
    expect(names).not.toContain('composer');
    expect(names).not.toContain('composer');
    expect(names).toContain('conductor');
    expect(names).toContain('scribe');
    expect(names).toContain('principal');
    expect(names).toContain('scribe');
  });

  test('protected agents cannot be disabled', () => {
    const config: PluginConfig = {
      disabled_agents: ['conductor', 'councillor'],
    };
    const agents = createAgents(config);
    const names = agents.map((a) => a.name);
    expect(names).toContain('conductor');
    expect(names).toContain('councillor');
  });

  test('disabling ensemble disables ensemble agent', () => {
    const config: PluginConfig = {
      disabled_agents: ['ensemble'],
    };
    const agents = createAgents(config);
    const names = agents.map((a) => a.name);
    expect(names).not.toContain('ensemble');
    // councillor is protected, it stays
    expect(names).toContain('councillor');
  });

  test('agent count decreases when agents are disabled', () => {
    const agents = createAgents();
    expect(agents.length).toBe(5); // ensemble unconfigured

    const disabledConfig: PluginConfig = {
      disabled_agents: ['composer'],
    };
    const disabledAgents = createAgents(disabledConfig);
    expect(disabledAgents.length).toBe(4);
  });

  test('getDisabledAgents respects protection rules', () => {
    const config: PluginConfig = {
      disabled_agents: ['conductor', 'composer', 'councillor'],
    };
    const disabled = getDisabledAgents(config);
    expect(disabled.has('composer')).toBe(true);
    expect(disabled.has('conductor')).toBe(false);
    expect(disabled.has('councillor')).toBe(false);
  });

  test('getEnabledAgentNames filters correctly', () => {
    const config: PluginConfig = {
      disabled_agents: ['composer', 'composer'],
    };
    const enabled = getEnabledAgentNames(config);
    expect(enabled).not.toContain('composer');
    expect(enabled).not.toContain('composer');
    expect(enabled).toContain('conductor');
    expect(enabled).toContain('scribe');
  });

  test('getEnabledAgentNames includes enabled custom agents', () => {
    const config: PluginConfig = {
      disabled_agents: ['janitor'],
      agents: {
        janitor: { model: 'openai/gpt-5.4-mini' },
        reviewer: { model: 'openai/gpt-5.4-mini' },
      },
    };

    const enabled = getEnabledAgentNames(config);
    expect(enabled).toContain('reviewer');
    expect(enabled).not.toContain('janitor');
  });

  test('empty disabled_agents does not create unconfigured ensemble', () => {
    const config: PluginConfig = {
      disabled_agents: [],
    };
    const agents = createAgents(config);
    const names = agents.map((a) => a.name);
    expect(agents.length).toBe(5);
    expect(names).not.toContain('ensemble');
  });
});

describe('observer agent (removed)', () => {
  test('observer is no longer a valid agent name', () => {
    const agents = createAgents();
    const names = agents.map((a) => a.name);
    expect(names).not.toContain('observer');
  });

  test('disabled_agents with observer has no effect', () => {
    const config: PluginConfig = {
      disabled_agents: ['observer'],
    };
    const agents = createAgents(config);
    const names = agents.map((a) => a.name);
    expect(names).not.toContain('observer');
  });
});
