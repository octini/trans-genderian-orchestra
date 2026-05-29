import { describe, expect, it } from 'bun:test';
import { getSkillPermissionsForAgent } from './skills';

describe('skills permissions', () => {
  it('should allow tiered orchestrator skills by default', () => {
    const permissions = getSkillPermissionsForAgent('orchestrator');
    expect(permissions['*']).toBe('deny');
    expect(permissions['using-superpowers']).toBe('allow');
    expect(permissions.handoff).toBe('allow');
    expect(permissions['dispatching-parallel-agents']).toBe('allow');
    expect(permissions.brainstorming).toBe('allow');
    expect(permissions['grill-with-docs']).toBe('allow');
    expect(permissions['trans-genderian-orchestra']).toBe('allow');
    expect(permissions.deepwork).toBeUndefined();
  });

  it('should deny wildcard skills for other agents by default', () => {
    const permissions = getSkillPermissionsForAgent('builder');
    expect(permissions['*']).toBe('deny');
    expect(permissions['unknown-skill']).toBeUndefined();
  });

  it('should allow role-pool skills for specific agents', () => {
    const builderPerms = getSkillPermissionsForAgent('builder');
    expect(builderPerms.tdd).toBe('allow');
    expect(builderPerms['agent-browser']).toBe('allow');
    expect(builderPerms.prototype).toBe('allow');
    expect(builderPerms.simplify).toBe('allow');
    expect(builderPerms.diagnose).toBe('allow');

    const researcherPerms = getSkillPermissionsForAgent('researcher');
    expect(researcherPerms.codemap).toBe('allow');
    expect(researcherPerms['zoom-out']).toBe('allow');
    expect(researcherPerms['grill-with-docs']).toBe('allow');
    expect(researcherPerms.diagnose).toBe('allow');
    expect(researcherPerms.clonedeps).toBe('allow');
    expect(researcherPerms['context7-mcp']).toBeUndefined();

    const plannerPerms = getSkillPermissionsForAgent('planner');
    expect(plannerPerms['writing-plans']).toBe('allow');
    expect(plannerPerms.brainstorming).toBe('allow');
    expect(plannerPerms['grill-with-docs']).toBe('allow');
    expect(plannerPerms['to-issues']).toBe('allow');

    const reviewerPerms = getSkillPermissionsForAgent('reviewer');
    expect(reviewerPerms['requesting-code-review']).toBe('allow');
    expect(reviewerPerms['receiving-code-review']).toBe('allow');
    expect(reviewerPerms.simplify).toBe('allow');
  });

  it('should honor explicit skill list overrides', () => {
    const emptyPerms = getSkillPermissionsForAgent('orchestrator', []);
    expect(emptyPerms['*']).toBe('deny');
    expect(Object.keys(emptyPerms).sort()).toEqual([
      '*',
      'handoff',
      'using-superpowers',
    ]);

    const specificPerms = getSkillPermissionsForAgent('builder', [
      'my-skill',
      '!bad-skill',
    ]);
    expect(specificPerms['*']).toBe('deny');
    expect(specificPerms['my-skill']).toBe('allow');
    expect(specificPerms['bad-skill']).toBe('deny');
    expect(specificPerms['using-superpowers']).toBe('allow');
    expect(specificPerms.tdd).toBeUndefined();
  });

  it('should honor wildcard in explicit list', () => {
    const wildcardPerms = getSkillPermissionsForAgent('builder', ['*']);
    expect(wildcardPerms['*']).toBe('allow');
  });
});
