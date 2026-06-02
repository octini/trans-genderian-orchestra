import type { ManagedEntries } from '../config/managed-entries';
import { createTgoAgentConfigs } from '../plugin/agents';
import { createToolPresetPlan, type ToolPresetName } from './presets';

export function createManagedEntriesForToolPreset(
  preset: ToolPresetName,
): ManagedEntries {
  const plan = createToolPresetPlan(preset);
  return {
    plugins: plan.peer_plugins.map(
      (plugin) => `${plugin.package}@${plugin.version}`,
    ),
    defaultAgent: 'tgo-orchestrator',
    agents: createTgoAgentConfigs(),
    mcps: Object.fromEntries(
      plan.mcps.map((mcp) => [
        mcp.id,
        {
          ...mcp.config,
          allowed_agents: mcp.allowed_agents,
          tgo_managed: true,
          optional: mcp.optional,
        },
      ]),
    ),
  };
}
