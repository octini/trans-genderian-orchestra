import { describe, expect, test } from 'bun:test';
import { TGO_AGENT_IDS } from './agent-ids';
import { createTgoAgentConfigs } from './agents';
import { createTgoCommandConfigs } from './commands';
import { getPermissionProfile } from './permissions';

describe('TGO agent role permissions', () => {
  test('defines the full namespaced agent roster', () => {
    expect(TGO_AGENT_IDS).toEqual([
      'tgo-orchestrator',
      'tgo-researcher',
      'tgo-builder',
      'tgo-reviewer',
      'tgo-council',
      'tgo-councillor',
    ]);
  });

  test('keeps orchestrator bounded to coordination tools', () => {
    const permissions = getPermissionProfile('tgo-orchestrator');

    expect(permissions.edit).toBe('deny');
    expect(permissions.write).toBe('deny');
    expect(permissions.apply_patch).toBe('deny');
    expect(permissions.task).toBe('allow');
    expect(permissions.read).toBe('allow');
  });

  test('allows researcher evidence gathering but not implementation patches', () => {
    const permissions = getPermissionProfile('tgo-researcher');

    expect(permissions.read).toBe('allow');
    expect(permissions.grep).toBe('allow');
    expect(permissions.webfetch).toBe('allow');
    expect(permissions.websearch).toBe('allow');
    expect(permissions.write).toBe('allow');
    expect(permissions.apply_patch).toBe('deny');
  });

  test('allows builder implementation tools', () => {
    const permissions = getPermissionProfile('tgo-builder');

    expect(permissions.edit).toBe('allow');
    expect(permissions.write).toBe('allow');
    expect(permissions.apply_patch).toBe('allow');
    expect(permissions.bash).toBe('allow');
    expect(permissions.webfetch).toBe('allow');
  });

  test('keeps reviewer and council read-only', () => {
    for (const agentId of [
      'tgo-reviewer',
      'tgo-council',
      'tgo-councillor',
    ] as const) {
      const permissions = getPermissionProfile(agentId);

      expect(permissions.read).toBe('allow');
      expect(permissions.edit).toBe('deny');
      expect(permissions.write).toBe('deny');
      expect(permissions.apply_patch).toBe('deny');
      expect(permissions.bash).toBe('deny');
    }

    expect(getPermissionProfile('tgo-councillor').question).toBe('deny');
  });
});

describe('TGO plugin config definitions', () => {
  test('creates all role-specific agent configs', () => {
    const agents = createTgoAgentConfigs();

    expect(Object.keys(agents).sort()).toEqual([...TGO_AGENT_IDS].sort());
    expect(agents['tgo-orchestrator'].mode).toBe('primary');
    expect(agents['tgo-researcher'].mode).toBe('subagent');
    expect(agents['tgo-builder'].mode).toBe('subagent');
    expect(agents['tgo-reviewer'].mode).toBe('subagent');
    expect(agents['tgo-council'].mode).toBe('subagent');
    expect(agents['tgo-councillor'].mode).toBe('subagent');
    expect(agents['tgo-builder'].permission).toEqual(
      getPermissionProfile('tgo-builder'),
    );
    expect(agents['tgo-reviewer'].prompt).toContain('read-only verification');
    expect(agents['tgo-orchestrator'].prompt).toContain('inferred_intent');
    expect(agents['tgo-orchestrator'].prompt).toContain('Goal Confirmation');
    expect(agents['tgo-orchestrator'].prompt).toContain('Delegation Envelope');
    expect(agents['tgo-orchestrator'].prompt).toContain(
      'Specialist Result Contract',
    );
    expect(agents['tgo-orchestrator'].prompt).toContain('tool_schema_failure');
    expect(agents['tgo-orchestrator'].prompt).toContain('Artifact Lifecycle');
    expect(agents['tgo-orchestrator'].prompt).toContain('Reviewer Gate');
  });

  test('creates namespaced command configs and compatibility aliases', () => {
    const commands = createTgoCommandConfigs();

    expect(commands['tgo:doctor'].description).toContain(
      'Inspect TGO v2 setup',
    );
    expect(commands['tgo:doctor'].template).toContain(
      'trans-genderian-orchestra doctor --json',
    );
    expect(commands['tgo:doctor'].template).toContain('Do not run bd doctor');
    expect(commands['tgo:setup'].description).toContain('Change TGO v2 setup');
    expect(commands['tgo:setup'].template).toContain(
      'bare-bones, default, or all-bells',
    );
    expect(commands['tgo:setup'].template).toContain(
      'preserve user-managed skills, plugins, MCPs, providers, and agents',
    );
    expect(commands['tgo:setup'].template).toContain(
      'env/OAuth references only',
    );
    expect(commands['tgo:models'].template).toContain(
      'without changing tool or resilience presets',
    );
    expect(commands['tgo:models'].template).toContain('modelPresets');
    expect(commands['tgo:models'].template).toContain('legacy /preset alias');
    expect(commands['tgo:models'].template).toContain(
      'structural/provider failures only',
    );
    expect(commands.preset.template).toContain('legacy compatibility alias');
    expect(commands['tgo:init'].description).toContain('Initialize TGO v2');
    expect(commands['tgo:work'].template).toContain('approved TGO plan');
    expect(commands['tgo:work'].template).toContain(
      'max_parallel_builders = 2',
    );
    expect(commands['tgo:work'].template).toContain('separate worktree/branch');
    expect(commands['tgo:work'].template).toContain('Branch Reviewer artifact');
    expect(commands['tgo:work'].template).toContain('batch Reviewer artifact');
    expect(commands['tgo:work'].template).toContain(
      'dedicated integration worktree',
    );
    expect(commands['tgo:work'].template).toContain(
      'Do not push, open a PR, merge to main, or clean up worktrees without explicit approval.',
    );
    expect(commands['tgo:uninstall'].template).toContain(
      'remove only TGO-managed entries',
    );
    expect(commands['tgo:uninstall'].template).toContain(
      'manifest-linked backup',
    );
    expect(commands['tgo:uninstall'].template).toContain(
      'must not uninstall shared CLIs',
    );
    expect(commands.init.description).toContain('Compatibility alias');
    expect(commands['beads:init'].description).toContain('Compatibility alias');
  });
});
