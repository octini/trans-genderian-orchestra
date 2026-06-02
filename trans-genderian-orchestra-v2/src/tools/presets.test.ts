import { describe, expect, test } from 'bun:test';
import { createToolPresetPlan } from './presets';

describe('tool preset plans', () => {
  test('bare-bones includes core TGO and Beads without remote MCPs', () => {
    const plan = createToolPresetPlan('bare-bones');

    expect(plan.name).toBe('bare-bones');
    expect(plan.peer_plugins.map((plugin) => plugin.id)).toEqual([
      'trans-genderian-orchestra',
      'opencode-beads',
    ]);
    expect(plan.mcps).toEqual([]);
    expect(plan.skills.map((skill) => skill.id)).toContain(
      'setup-matt-pocock-skills',
    );
  });

  test('default includes Context7 CLI plus skill but not Context7 MCP', () => {
    const plan = createToolPresetPlan('default');

    expect(plan.required_cli_tools.map((tool) => tool.name)).toContain('ctx7');
    expect(plan.skills.map((skill) => skill.id)).toContain('context7-mcp');
    expect(plan.mcps.map((mcp) => mcp.id)).not.toContain('tgo-context7');
    expect(plan.peer_plugins.map((plugin) => plugin.id)).toContain('aft');
  });

  test('default limits websearch and grep_app MCPs to Researcher metadata', () => {
    const plan = createToolPresetPlan('default');

    expect(plan.mcps).toContainEqual(
      expect.objectContaining({
        id: 'tgo-websearch',
        allowed_agents: ['tgo-researcher'],
      }),
    );
    expect(plan.mcps).toContainEqual(
      expect.objectContaining({
        id: 'tgo-grep-app',
        allowed_agents: ['tgo-researcher'],
      }),
    );
  });

  test('all-bells adds GitHub and Serena MCPs only in all-bells', () => {
    const defaultPlan = createToolPresetPlan('default');
    const allBells = createToolPresetPlan('all-bells');

    expect(defaultPlan.mcps.map((mcp) => mcp.id)).not.toContain('tgo-github');
    expect(defaultPlan.mcps.map((mcp) => mcp.id)).not.toContain('tgo-serena');
    expect(allBells.mcps.map((mcp) => mcp.id)).toEqual([
      'tgo-websearch',
      'tgo-grep-app',
      'tgo-github',
      'tgo-serena',
    ]);
  });

  test('MCP auth references are env markers or non-secret metadata, never raw secrets', () => {
    const allBells = createToolPresetPlan('all-bells');
    const serialized = JSON.stringify(allBells.mcps);

    expect(serialized).toContain('{env:EXA_API_KEY}');
    expect(serialized).toContain('{env:GITHUB_PERSONAL_ACCESS_TOKEN}');
    expect(allBells.mcps.find((mcp) => mcp.id === 'tgo-serena')?.auth).toBe(
      'oauth',
    );
    expect(serialized).not.toContain('ghp_');
    expect(serialized).not.toContain('github_pat_');
  });
});
