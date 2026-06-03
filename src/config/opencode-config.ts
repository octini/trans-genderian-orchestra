import type { CommandNotice } from '../commands/result';
import type { ManagedEntries } from './managed-entries';

export interface OpenCodeConfig {
  plugin?: Array<string | [string, Record<string, unknown>]>;
  agent?: Record<string, unknown>;
  mcp?: Record<string, unknown>;
  modelPresets?: Record<string, unknown>;
  presets?: Record<string, unknown>;
  provider?: Record<string, unknown>;
  default_agent?: string;
  [key: string]: unknown;
}

export interface ApplyConfigResult {
  config: OpenCodeConfig;
  warnings: CommandNotice[];
}

export function parseOpenCodeConfig(text: string): OpenCodeConfig {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return {};
  }
  return JSON.parse(trimmed) as OpenCodeConfig;
}

function appendUniquePlugin(
  plugins: Array<string | [string, Record<string, unknown>]>,
  plugin: string,
): void {
  const exists = plugins.some((entry) =>
    Array.isArray(entry) ? entry[0] === plugin : entry === plugin,
  );
  if (!exists) {
    plugins.push(plugin);
  }
}

export function applyManagedEntries(
  config: OpenCodeConfig,
  entries: ManagedEntries,
): ApplyConfigResult {
  const next: OpenCodeConfig = {
    ...config,
    plugin: [...(config.plugin ?? [])],
    agent: { ...(config.agent ?? {}) },
    mcp: { ...(config.mcp ?? {}) },
  };
  const warnings: CommandNotice[] = [];

  for (const plugin of entries.plugins) {
    appendUniquePlugin(next.plugin ?? [], plugin);
  }

  next.agent = {
    ...next.agent,
    ...entries.agents,
  };
  next.mcp = {
    ...next.mcp,
    ...entries.mcps,
  };

  if (config.default_agent && config.default_agent !== entries.defaultAgent) {
    warnings.push({
      code: 'default-agent-conflict',
      message: `default_agent will change from ${config.default_agent} to ${entries.defaultAgent}.`,
      severity: 'warning',
    });
  }
  next.default_agent = entries.defaultAgent;

  return { config: next, warnings };
}

export function applyMinimalManagedEntries(
  config: OpenCodeConfig,
  entries: ManagedEntries,
): ApplyConfigResult {
  const next: OpenCodeConfig = {
    ...config,
    plugin: [...(config.plugin ?? [])],
    mcp: { ...(config.mcp ?? {}) },
  };
  const warnings: CommandNotice[] = [];

  for (const plugin of entries.plugins) {
    appendUniquePlugin(next.plugin ?? [], plugin);
  }

  next.mcp = {
    ...next.mcp,
    ...entries.mcps,
  };

  if (config.default_agent && config.default_agent !== entries.defaultAgent) {
    warnings.push({
      code: 'default-agent-conflict',
      message: `default_agent will change from ${config.default_agent} to ${entries.defaultAgent}.`,
      severity: 'warning',
    });
  }
  next.default_agent = entries.defaultAgent;

  return { config: next, warnings };
}

export function serializeOpenCodeConfig(config: OpenCodeConfig): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}
