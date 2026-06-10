import { describe, expect, it } from 'bun:test';
import { getSkillPermissionsForAgent } from './skills';

describe('skills permissions', () => {
  it('should allow all skills for conductor by default', () => {
    const permissions = getSkillPermissionsForAgent('conductor');
    expect(permissions['*']).toBe('allow');
  });

  it('should deny all skills for other agents by default', () => {
    const permissions = getSkillPermissionsForAgent('composer');
    expect(permissions['*']).toBe('deny');
  });

  it('should allow bundled skills for specific agents', () => {
    // Designer should only inherit the default non-conductor deny rule
    const composerPerms = getSkillPermissionsForAgent('composer');
    expect(Object.keys(composerPerms)).toEqual(['*']);

    // Oracle should have simplify allowed by default
    const principalPerms = getSkillPermissionsForAgent('principal');
    expect(principalPerms.simplify).toBe('allow');

    const conductorPerms = getSkillPermissionsForAgent('conductor');
    expect(conductorPerms.clonedeps).toBe('allow');
    expect(conductorPerms.deepwork).toBe('allow');
    expect(conductorPerms['trans-genderian-orchestra']).toBe('allow');
  });

  it('should honor explicit skill list overrides', () => {
    // Override with empty list
    const emptyPerms = getSkillPermissionsForAgent('conductor', []);
    expect(emptyPerms['*']).toBe('deny');
    expect(Object.keys(emptyPerms).length).toBe(1);

    // Override with specific list
    const specificPerms = getSkillPermissionsForAgent('composer', [
      'my-skill',
      '!bad-skill',
    ]);
    expect(specificPerms['*']).toBe('deny');
    expect(specificPerms['my-skill']).toBe('allow');
    expect(specificPerms['bad-skill']).toBe('deny');
  });

  it('should honor wildcard in explicit list', () => {
    const wildcardPerms = getSkillPermissionsForAgent('composer', ['*']);
    expect(wildcardPerms['*']).toBe('allow');
  });
});
