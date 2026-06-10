import type { OpenCodeConfig } from '../config/opencode-config';
import type { ManagedConfigEntry, TgoManifest } from '../manifest/schema';

export interface RemoveManagedConfigResult {
  config: OpenCodeConfig;
  removed_keys: string[];
}

function pluginName(entry: string | [string, Record<string, unknown>]): string {
  return Array.isArray(entry) ? entry[0] : entry;
}

function removeEntry(
  config: OpenCodeConfig,
  entry: ManagedConfigEntry,
): boolean {
  if (entry.kind === 'plugin') {
    const plugin = entry.key.replace(/^plugin\./, '');
    const before = config.plugin?.length ?? 0;
    config.plugin = (config.plugin ?? []).filter(
      (item) => pluginName(item) !== plugin,
    );
    return (config.plugin?.length ?? 0) !== before;
  }
  if (entry.kind === 'agent') {
    const agentId = entry.key.replace(/^agent\./, '');
    const existed = Boolean(config.agent?.[agentId]);
    delete config.agent?.[agentId];
    return existed;
  }
  if (entry.kind === 'mcp') {
    const mcpId = entry.key.replace(/^mcp\./, '');
    const existed = Boolean(config.mcp?.[mcpId]);
    delete config.mcp?.[mcpId];
    return existed;
  }
  if (
    entry.kind === 'default_agent' &&
    config.default_agent === 'tgo-orchestrator'
  ) {
    delete config.default_agent;
    return true;
  }
  return false;
}

export function removeTgoManagedConfigEntries(
  config: OpenCodeConfig,
  manifest: TgoManifest,
): RemoveManagedConfigResult {
  const next: OpenCodeConfig = {
    ...config,
    plugin: [...(config.plugin ?? [])],
    agent: { ...(config.agent ?? {}) },
    mcp: { ...(config.mcp ?? {}) },
  };
  const removed_keys: string[] = [];

  for (const entry of manifest.managed_config) {
    if (removeEntry(next, entry)) {
      removed_keys.push(entry.key);
    }
  }

  return { config: next, removed_keys };
}
