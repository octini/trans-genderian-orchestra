import type { PlannedAction } from '../commands/result';
import type { ManagedEntries } from '../config/managed-entries';
import {
  applyManagedEntries,
  type OpenCodeConfig,
} from '../config/opencode-config';

export type V1ConfigIndicatorKind = 'plugin' | 'agent' | 'mcp';

export interface V1ConfigIndicator {
  kind: V1ConfigIndicatorKind;
  key: string;
  reason: string;
}

export interface V1ConfigDetection {
  has_v1_config: boolean;
  indicators: V1ConfigIndicator[];
}

export interface MigrationPreview {
  status: 'no_v1_config' | 'migration_available';
  indicators: V1ConfigIndicator[];
  planned_actions: PlannedAction[];
  requires_confirmation: boolean;
}

const V1_PLUGIN_PATTERNS = [
  'oh-my-opencode-slim',
  'omo-slim',
  'opencode-slim',
  'trans-genderian-orchestra@2.0.0-beta.13',
] as const;

const V1_AGENT_IDS = [
  'orchestrator',
  'planner',
  'researcher',
  'builder',
  'reviewer',
  'council',
] as const;

const V1_MCP_IDS = ['websearch', 'grep_app', 'grep-app', 'serena'] as const;

function pluginName(entry: string | [string, Record<string, unknown>]): string {
  return Array.isArray(entry) ? entry[0] : entry;
}

function isV1Plugin(plugin: string): boolean {
  return V1_PLUGIN_PATTERNS.some((pattern) => plugin.includes(pattern));
}

export function detectV1EraConfig(config: OpenCodeConfig): V1ConfigDetection {
  const indicators: V1ConfigIndicator[] = [];

  for (const entry of config.plugin ?? []) {
    const plugin = pluginName(entry);
    if (isV1Plugin(plugin)) {
      indicators.push({
        kind: 'plugin',
        key: `plugin.${plugin}`,
        reason: 'V1 or omo-slim plugin entry is active.',
      });
    }
  }

  for (const agentId of V1_AGENT_IDS) {
    if (config.agent?.[agentId]) {
      indicators.push({
        kind: 'agent',
        key: `agent.${agentId}`,
        reason: 'Non-namespaced v1 agent entry is active.',
      });
    }
  }

  for (const mcpId of V1_MCP_IDS) {
    if (config.mcp?.[mcpId]) {
      indicators.push({
        kind: 'mcp',
        key: `mcp.${mcpId}`,
        reason: 'Non-namespaced v1 MCP entry is active.',
      });
    }
  }

  return { has_v1_config: indicators.length > 0, indicators };
}

function actionIdForIndicator(indicator: V1ConfigIndicator): string {
  return `remove-v1-${indicator.key.replace('.', '-').replaceAll('@', '-')}`;
}

export function planMigrationPreview(
  config: OpenCodeConfig,
  _entries: ManagedEntries,
): MigrationPreview {
  const detection = detectV1EraConfig(config);
  if (!detection.has_v1_config) {
    return {
      status: 'no_v1_config',
      indicators: [],
      planned_actions: [],
      requires_confirmation: false,
    };
  }

  const planned_actions: PlannedAction[] = detection.indicators.map(
    (indicator) => ({
      id: actionIdForIndicator(indicator),
      title: `Remove ${indicator.key}`,
      target: indicator.key,
      action: 'remove',
      requires_confirmation: true,
    }),
  );

  planned_actions.push({
    id: 'register-v2-managed-entries',
    title: 'Register TGO v2 managed entries',
    target: 'opencode-config',
    action: 'update',
    requires_confirmation: true,
  });

  return {
    status: 'migration_available',
    indicators: detection.indicators,
    planned_actions,
    requires_confirmation: true,
  };
}

export function buildV2ReplacementConfig(
  config: OpenCodeConfig,
  entries: ManagedEntries,
): OpenCodeConfig {
  const next: OpenCodeConfig = {
    ...config,
    plugin: (config.plugin ?? []).filter(
      (entry) => !isV1Plugin(pluginName(entry)),
    ),
    agent: { ...(config.agent ?? {}) },
    mcp: { ...(config.mcp ?? {}) },
  };

  for (const agentId of V1_AGENT_IDS) {
    delete next.agent?.[agentId];
  }
  for (const mcpId of V1_MCP_IDS) {
    delete next.mcp?.[mcpId];
  }

  return applyManagedEntries(next, entries).config;
}
