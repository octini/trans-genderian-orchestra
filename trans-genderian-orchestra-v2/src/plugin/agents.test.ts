import { describe, expect, test } from 'bun:test';
import { TGO_AGENT_IDS } from './agent-ids';
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
