import { describe, expect, test } from 'bun:test';
import type { PluginConfig } from '../config';
import { createAgents, getEnabledAgentNames } from './index';

const councilConfig: NonNullable<PluginConfig['council']> = {
  presets: {
    default: {
      alpha: { model: 'openai/gpt-5.4-mini' },
    },
  },
  timeout: 180000,
  default_preset: 'default',
  councillor_execution_mode: 'parallel',
  councillor_retries: 3,
};

describe('createAgents', () => {
  test('does not register council or councillor when council is not configured', () => {
    const agentNames = createAgents().map((agent) => agent.name);

    expect(agentNames).not.toContain('council');
    expect(agentNames).not.toContain('councillor');
  });

  test('registers councillor only with council configuration', () => {
    const agentNames = createAgents({
      council: councilConfig,
    }).map((agent) => agent.name);

    expect(agentNames).toContain('council');
    expect(agentNames).toContain('councillor');
  });

  test('does not register councillor when council is configured but disabled', () => {
    const agentNames = createAgents({
      council: councilConfig,
      disabled_agents: ['council'],
    }).map((agent) => agent.name);

    expect(agentNames).not.toContain('council');
    expect(agentNames).not.toContain('councillor');
  });

  test('applies default permissions before overrides for every agent type', () => {
    const agents = createAgents({
      agents: {
        orchestrator: {
          options: { topK: 1 },
        },
        builder: {
          options: { topK: 2 },
        },
        specialist: {
          model: 'openai/gpt-5.4-mini',
          options: { topK: 3 },
        },
      },
    });

    for (const name of ['orchestrator', 'builder', 'specialist']) {
      const agent = agents.find((candidate) => candidate.name === name);
      expect(agent).toBeDefined();
      const permission = agent?.config.permission as Record<string, unknown>;
      expect(permission).toBeDefined();
      expect(permission.question).toBe('allow');
      expect(permission.cancel_task).toBe(
        name === 'orchestrator' ? 'allow' : 'deny',
      );
    }
  });
});

describe('getEnabledAgentNames', () => {
  test('excludes councillor when council is disabled', () => {
    expect(getEnabledAgentNames()).not.toContain('councillor');
  });
});
