/**
 * 3-Tier Skill Loading for the Dispatcher plugin.
 *
 * Tier 1: Global Preloaded — loaded at session start for coordination/guardrails
 * Tier 2: Role-Based Allowed Pool — per-agent skill registry, loaded on-demand
 * Tier 3: Dynamic Recommendations — orchestrator suggests, specialist loads
 */

export type SkillTier = 1 | 2 | 3;
export type AgentRole =
  | 'orchestrator'
  | 'planner'
  | 'researcher'
  | 'builder'
  | 'reviewer'
  | 'council';

/**
 * Tier 1: Skills loaded automatically at session start for every agent.
 * These are coordination and operational guardrails — cheap to carry.
 */
export const TIER_1_PRELOADED: string[] = ['using-superpowers', 'handoff'];

/**
 * Tier 2: Per-role skill registry.
 * Agents can load any skill in their allowed pool on-demand via skill({ name }).
 */
export const TIER_2_ROLE_POOL: Record<AgentRole, string[]> = {
  orchestrator: [
    'dispatching-parallel-agents',
    'brainstorming',
    'grill-with-docs',
    'trans-genderian-orchestra',
  ],
  planner: ['writing-plans', 'brainstorming', 'grill-with-docs', 'to-issues'],
  researcher: [
    'codemap',
    'zoom-out',
    'grill-with-docs',
    'diagnose',
    'clonedeps',
  ],
  builder: ['tdd', 'agent-browser', 'prototype', 'simplify', 'diagnose'],
  reviewer: ['requesting-code-review', 'receiving-code-review', 'simplify'],
  council: [],
};

const AGENT_ROLE_ALIASES: Record<string, AgentRole> = {
  orchestrator: 'orchestrator',
  planner: 'planner',
  researcher: 'researcher',
  builder: 'builder',
  reviewer: 'reviewer',
  council: 'council',
  councillor: 'council',
};

function uniqueSkills(skills: string[]): string[] {
  return [...new Set(skills)];
}

/**
 * Get the full set of skills visible to a given agent role.
 * Returns Tier 1 (always) + Tier 2 (if role has a pool) + any dynamic recommendations.
 */
export function getSkillsForAgent(
  role: AgentRole,
  dynamicRecommendations: string[] = [],
): string[] {
  const tier2 = TIER_2_ROLE_POOL[role] ?? [];
  return uniqueSkills([
    ...TIER_1_PRELOADED,
    ...tier2,
    ...dynamicRecommendations,
  ]);
}

/**
 * Resolve a runtime agent name to its Dispatcher skill role.
 */
export function getAgentRole(agentName: string): AgentRole | undefined {
  const normalized = agentName.trim().replace(/^@/, '');
  return AGENT_ROLE_ALIASES[normalized];
}

/**
 * Get the full set of skills visible to a runtime agent name.
 */
export function getSkillsForAgentName(
  agentName: string,
  dynamicRecommendations: string[] = [],
): string[] {
  const role = getAgentRole(agentName);
  if (!role) {
    return uniqueSkills([...TIER_1_PRELOADED, ...dynamicRecommendations]);
  }

  return getSkillsForAgent(role, dynamicRecommendations);
}

/**
 * Check if a skill is in the agent's allowed pool (Tier 1 or Tier 2).
 */
export function isSkillAllowedForAgent(
  role: AgentRole,
  skillName: string,
): boolean {
  if (TIER_1_PRELOADED.includes(skillName)) return true;
  return (TIER_2_ROLE_POOL[role] ?? []).includes(skillName);
}

/**
 * Check if a skill is visible to a runtime agent name.
 */
export function isSkillAllowedForAgentName(
  agentName: string,
  skillName: string,
): boolean {
  const role = getAgentRole(agentName);
  if (!role) {
    return TIER_1_PRELOADED.includes(skillName);
  }

  return isSkillAllowedForAgent(role, skillName);
}
