import {
  getSkillsForAgentName,
  TIER_1_PRELOADED,
} from '../skills/skill-loader';
import { CUSTOM_SKILLS } from './custom-skills';

/**
 * A skill that is managed externally (e.g. user-installed) and needs
 * permission grants but is NOT installed by this plugin's CLI.
 */
export interface PermissionOnlySkill {
  /** Skill name — must match the name OpenCode uses for permission checks */
  name: string;
  /** List of agents that should auto-allow this skill */
  allowedAgents: string[];
  /** Human-readable description (for documentation only) */
  description: string;
}

/**
 * Skills managed externally (not installed by this plugin's CLI).
 * Entries here only affect agent permission grants — nothing is installed.
 */
export const PERMISSION_ONLY_SKILLS: PermissionOnlySkill[] = [
  {
    name: 'requesting-code-review',
    allowedAgents: ['reviewer'],
    description:
      'Code review template for reviewer subagents in multi-step workflows',
  },
];

/**
 * Get permission presets for a specific agent based on bundled skills.
 * @param agentName - The name of the agent
 * @param skillList - Optional explicit list of skills to allow (overrides defaults)
 * @returns Permission rules for the skill permission type
 */
export function getSkillPermissionsForAgent(
  agentName: string,
  skillList?: string[],
): Record<string, 'allow' | 'ask' | 'deny'> {
  const permissions: Record<string, 'allow' | 'ask' | 'deny'> = {
    '*': 'deny',
  };

  const allowSkill = (name: string) => {
    permissions[name] = 'allow';
  };

  // Tier 1 skills are global guardrails and cannot be disabled.
  for (const name of TIER_1_PRELOADED) {
    allowSkill(name);
  }

  // If the user provided an explicit skill list (even empty), honor it
  // as an override for Tier 2 while still preserving Tier 1 guardrails.
  if (skillList) {
    for (const name of skillList) {
      if (name === '*') {
        permissions['*'] = 'allow';
      } else if (name.startsWith('!')) {
        permissions[name.slice(1)] = 'deny';
      } else {
        allowSkill(name);
      }
    }
    for (const name of TIER_1_PRELOADED) {
      allowSkill(name);
    }
    return permissions;
  }

  // Tier 2 permissions come from the Dispatcher role-based skill pool.
  for (const name of getSkillsForAgentName(agentName)) {
    allowSkill(name);
  }

  // Preserve compatibility with bundled/custom skill metadata until those
  // registries are fully migrated into the role pool.
  for (const skill of [...CUSTOM_SKILLS, ...PERMISSION_ONLY_SKILLS]) {
    const isAllowed =
      skill.allowedAgents.includes('*') ||
      skill.allowedAgents.includes(agentName);
    if (isAllowed) {
      allowSkill(skill.name);
    }
  }

  return permissions;
}
