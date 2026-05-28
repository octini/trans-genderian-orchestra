/**
 * Filter available_skills block based on the current agent's permission.skill rules.
 * OpenCode core injects `<available_skills>` globally, so this hook rewrites that
 * block before the prompt is sent.
 */
import type { PluginInput } from '@opencode-ai/plugin';
import { getSkillPermissionsForAgent } from '../../cli/skills';
import { getAgentOverride, type PluginConfig } from '../../config';
import {
  isSkillAllowedForAgentName,
  TIER_1_PRELOADED,
} from '../../skills/skill-loader';

interface MessageInfo {
  role: string;
  agent?: string;
}

interface MessagePart {
  type: string;
  text?: string;
  [key: string]: unknown;
}

interface MessageWithParts {
  info: MessageInfo;
  parts: MessagePart[];
}

const AVAILABLE_SKILLS_BLOCK_REGEX =
  /<available_skills>\s*([\s\S]*?)\s*<\/available_skills>/g;
const SKILL_NAME_REGEX = /<name>([^<]+)<\/name>/;

type SkillRule = 'allow' | 'ask' | 'deny';

interface SkillFilterOptions {
  agentName?: string;
  dynamicRecommendations?: string[];
  permissionRules?: Record<string, SkillRule>;
}

interface SkillEntry {
  name: string;
  block: string;
}

function getCurrentAgent(messages: MessageWithParts[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.info.role === 'user') {
      return message.info.agent ?? 'orchestrator';
    }
  }

  return 'orchestrator';
}

function extractSkillEntries(blockContent: string): SkillEntry[] {
  const entries: SkillEntry[] = [];
  const skillEntryRegex = /<skill>\s*([\s\S]*?)\s*<\/skill>/g;

  for (const match of blockContent.matchAll(skillEntryRegex)) {
    const block = match[0];
    const nameMatch = block.match(SKILL_NAME_REGEX);
    if (!nameMatch) {
      continue;
    }

    entries.push({
      name: nameMatch[1].trim(),
      block,
    });
  }

  return entries;
}

function isSkillAllowedByPermission(
  skillName: string,
  permissionRules: Record<string, SkillRule>,
): boolean {
  const specificRule = permissionRules[skillName];
  if (specificRule !== undefined) {
    return specificRule === 'allow';
  }

  return permissionRules['*'] === 'allow';
}

function normalizeSkillFilterOptions(
  filterOptions: Record<string, SkillRule> | SkillFilterOptions,
): SkillFilterOptions {
  const values = Object.values(filterOptions);
  const isPermissionRuleMap = values.every(
    (value) => value === 'allow' || value === 'ask' || value === 'deny',
  );

  if (isPermissionRuleMap) {
    return {
      permissionRules: filterOptions as Record<string, SkillRule>,
    };
  }

  return filterOptions as SkillFilterOptions;
}

function extractDynamicSkillRecommendations(text: string): string[] {
  const recommendations = new Set<string>();

  for (const match of text.matchAll(
    /\*\*Recommended skills:\*\*([\s\S]*?)(?:\.|\n|$)/g,
  )) {
    for (const skillMatch of match[1].matchAll(/`([^`]+)`/g)) {
      recommendations.add(skillMatch[1].trim());
    }
  }

  for (const match of text.matchAll(
    /"recommended_?skills"\s*:\s*\[([^\]]*)\]/gi,
  )) {
    for (const skillMatch of match[1].matchAll(/"([^"]+)"/g)) {
      recommendations.add(skillMatch[1].trim());
    }
  }

  return [...recommendations].filter(Boolean);
}

function getDynamicRecommendations(messages: MessageWithParts[]): string[] {
  const recommendations = new Set<string>();

  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type !== 'text' || !part.text) {
        continue;
      }

      for (const skillName of extractDynamicSkillRecommendations(part.text)) {
        recommendations.add(skillName);
      }
    }
  }

  return [...recommendations];
}

function isSkillAllowed(
  skillName: string,
  options: SkillFilterOptions,
): boolean {
  if (TIER_1_PRELOADED.includes(skillName)) {
    return true;
  }

  if (options.dynamicRecommendations?.includes(skillName)) {
    return true;
  }

  if (options.permissionRules) {
    return isSkillAllowedByPermission(skillName, options.permissionRules);
  }

  if (options.agentName) {
    return isSkillAllowedForAgentName(options.agentName, skillName);
  }

  return false;
}

function filterAvailableSkillsText(
  text: string,
  filterOptions: Record<string, SkillRule> | SkillFilterOptions,
): string {
  const options = normalizeSkillFilterOptions(filterOptions);

  return text.replace(
    AVAILABLE_SKILLS_BLOCK_REGEX,
    (_fullMatch, blockContent: string) => {
      const allowedEntries = extractSkillEntries(blockContent).filter((entry) =>
        isSkillAllowed(entry.name, options),
      );

      if (allowedEntries.length === 0) {
        return '<available_skills>\nNo skills available.\n</available_skills>';
      }

      return `<available_skills>\n${allowedEntries
        .map((entry) => entry.block)
        .join('\n')}\n</available_skills>`;
    },
  );
}

/**
 * Creates the experimental.chat.messages.transform hook for filtering available skills.
 * This hook runs right before sending to API, so it doesn't affect UI display.
 */
export function createFilterAvailableSkillsHook(
  _ctx: PluginInput,
  config: PluginConfig,
) {
  const permissionRulesByAgent = new Map<string, Record<string, SkillRule>>();

  const getPermissionRules = (agentName: string): Record<string, SkillRule> => {
    const cached = permissionRulesByAgent.get(agentName);
    if (cached) {
      return cached;
    }

    const configuredSkills = getAgentOverride(config, agentName)?.skills;
    const permissionRules = getSkillPermissionsForAgent(
      agentName,
      configuredSkills,
    );
    permissionRulesByAgent.set(agentName, permissionRules);
    return permissionRules;
  };

  return {
    'experimental.chat.messages.transform': async (
      _input: Record<string, never>,
      output: { messages: MessageWithParts[] },
    ): Promise<void> => {
      const { messages } = output;
      if (messages.length === 0) {
        return;
      }

      const agentName = getCurrentAgent(messages);
      const permissionRules = getPermissionRules(agentName);
      const dynamicRecommendations = getDynamicRecommendations(messages);

      for (const message of messages) {
        for (const part of message.parts) {
          if (
            part.type !== 'text' ||
            !part.text ||
            !part.text.includes('<available_skills>')
          ) {
            continue;
          }

          part.text = filterAvailableSkillsText(part.text, {
            agentName,
            dynamicRecommendations,
            permissionRules,
          });
        }
      }
    },
  };
}

export { filterAvailableSkillsText };
