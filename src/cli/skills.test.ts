import { describe, expect, it } from 'bun:test';
import { getSkillPermissionsForAgent } from './skills';

describe('skills permissions', () => {
  it('should allow all skills for conductor by default', () => {
    const permissions = getSkillPermissionsForAgent('conductor');
    expect(permissions['*']).toBe('allow');
  });

  it('should deny wildcard skills for composer by default', () => {
    const permissions = getSkillPermissionsForAgent('composer');
    expect(permissions['*']).toBe('deny');
  });

  it('should allow composer implementation skills by default', () => {
    const composerPerms = getSkillPermissionsForAgent('composer');
    expect(composerPerms.simplify).toBe('allow');
    expect(composerPerms.tdd).toBe('allow');
    expect(composerPerms['test-driven-development']).toBe('allow');
    expect(composerPerms['verification-before-completion']).toBe('allow');
    expect(composerPerms['receiving-code-review']).toBe('allow');
  });

  it('should not explicitly allow composer planning skills by default', () => {
    const composerPerms = getSkillPermissionsForAgent('composer');
    expect(composerPerms.brainstorming).toBeUndefined();
    expect(composerPerms['writing-plans']).toBeUndefined();
  });

  it('should preserve principal skill access by default', () => {
    const principalPerms = getSkillPermissionsForAgent('principal');
    expect(principalPerms.simplify).toBe('allow');
    expect(principalPerms['requesting-code-review']).toBe('allow');
  });

  it('should allow bundled skills for specific agents', () => {
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
