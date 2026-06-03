import { join } from 'node:path';
import { planDefaultManagedEntries } from '../config/managed-entries';
import { parseOpenCodeConfig } from '../config/opencode-config';
import type { FileSystemAdapter } from '../filesystem/adapter';
import { readManifest } from '../manifest/store';
import { resolveModelPresetCatalog } from '../models/config';
import { TGO_AGENT_IDS } from '../plugin/agent-ids';
import { planMigrationPreview } from '../release/migration';
import { planResilienceSwitch } from '../resilience/profiles';
import { findSecretLikeValues } from '../security/secrets';
import { type CommandDetector, detectPresetTools } from '../tools/detect';
import {
  createEmptyCommandResult,
  type DeterministicCommandResult,
} from './result';

const AFT_PLUGIN_PACKAGE = '@cortexkit/aft-opencode';

export interface DoctorInput {
  fs: FileSystemAdapter;
  homeDir: string;
  detector: CommandDetector;
}

function globalConfigPath(homeDir: string): string {
  return join(homeDir, '.config/opencode/opencode.jsonc').replaceAll('\\', '/');
}

function globalTgoConfigPath(homeDir: string): string {
  return join(
    homeDir,
    '.config/opencode/trans-genderian-orchestra.jsonc',
  ).replaceAll('\\', '/');
}

function globalManifestPath(homeDir: string): string {
  return join(homeDir, '.config/opencode/tgo/manifest.jsonc').replaceAll(
    '\\',
    '/',
  );
}

function context7SkillPath(homeDir: string): string {
  return join(homeDir, '.agents/skills/find-docs').replaceAll('\\', '/');
}

function globalAgentsPath(homeDir: string): string {
  return join(homeDir, '.config/opencode/AGENTS.md').replaceAll('\\', '/');
}

async function hasContext7OpenCodeSetup(
  fs: FileSystemAdapter,
  homeDir: string,
): Promise<boolean> {
  if (await fs.exists(context7SkillPath(homeDir))) {
    return true;
  }

  const agentsPath = globalAgentsPath(homeDir);
  if (!(await fs.exists(agentsPath))) {
    return false;
  }

  const agentsText = await fs.readText(agentsPath);
  return /\b(ctx7|context7|find-docs)\b/i.test(agentsText);
}

function pluginPackageNameFromSpec(plugin: string): string {
  const versionSeparator = plugin.startsWith('@')
    ? plugin.lastIndexOf('@')
    : plugin.indexOf('@');
  return versionSeparator > 0 ? plugin.slice(0, versionSeparator) : plugin;
}

function hasAftOpenCodePlugin(configs: Array<{ plugin?: unknown }>): boolean {
  return configs.some((config) =>
    Array.isArray(config.plugin)
      ? config.plugin.some((entry) => {
          const spec = Array.isArray(entry) ? entry[0] : entry;
          return (
            typeof spec === 'string' &&
            pluginPackageNameFromSpec(spec) === AFT_PLUGIN_PACKAGE
          );
        })
      : false,
  );
}

export async function runDoctor(
  input: DoctorInput,
): Promise<DeterministicCommandResult> {
  const result = createEmptyCommandResult('doctor', 'read-only');
  const manifestPath = globalManifestPath(input.homeDir);
  const configPath = globalConfigPath(input.homeDir);
  const tgoConfigPath = globalTgoConfigPath(input.homeDir);
  const manifest = await readManifest(input.fs, manifestPath);
  const configExists = await input.fs.exists(configPath);
  const configText = configExists ? await input.fs.readText(configPath) : '{}';
  const tgoConfigText = (await input.fs.exists(tgoConfigPath))
    ? await input.fs.readText(tgoConfigPath)
    : '{}';
  const config = parseOpenCodeConfig(configText);
  const tgoConfig = parseOpenCodeConfig(tgoConfigText);
  const aftPluginConfigured = hasAftOpenCodePlugin([config, tgoConfig]);
  const context7SetupConfigured = await hasContext7OpenCodeSetup(
    input.fs,
    input.homeDir,
  );

  result.warnings.push({
    code: 'active-presets',
    message: `Active TGO presets: tools=${manifest.active_presets.tools}, models=${manifest.active_presets.models}, resilience=${manifest.active_presets.resilience}.`,
    severity: 'info',
  });

  if (!(await input.fs.exists(manifestPath))) {
    result.planned_actions.push({
      id: 'create-global-manifest',
      title: 'Create missing global TGO manifest',
      target: manifestPath,
      action: 'create',
      requires_confirmation: true,
    });
  }

  if (configExists) {
    if (findSecretLikeValues(configText).length > 0) {
      result.warnings.push({
        code: 'secret-like-config-value',
        message:
          'OpenCode config contains secret-like values; rotate exposed tokens and replace with env references.',
        severity: 'error',
      });
    }

    const mergedConfig = {
      ...config,
      plugin: [...(config.plugin ?? []), ...(tgoConfig.plugin ?? [])],
      agent: { ...(config.agent ?? {}), ...(tgoConfig.agent ?? {}) },
      modelPresets: {
        ...(config.modelPresets ?? {}),
        ...(tgoConfig.modelPresets ?? {}),
      },
    };
    const modelPresets = resolveModelPresetCatalog(mergedConfig);
    result.warnings.push(...modelPresets.warnings);

    const migration = planMigrationPreview(
      config,
      planDefaultManagedEntries(manifest.active_presets.tools),
    );
    if (migration.status === 'migration_available') {
      result.warnings.push({
        code: 'v1-migration-available',
        message:
          'V1/omo-slim config detected; run bootstrap/setup migration preview before enabling TGO v2 replacement.',
        severity: 'warning',
      });
      result.planned_actions.push(...migration.planned_actions);
    }

    const managedMcps = new Set(
      manifest.managed_config
        .filter((entry) => entry.kind === 'mcp')
        .map((entry) => entry.key.replace(/^mcp\./, '')),
    );

    for (const mcpId of Object.keys(config.mcp ?? {})) {
      if (!managedMcps.has(mcpId) && !mcpId.startsWith('tgo-')) {
        result.warnings.push({
          code: 'user-managed-mcp-visible',
          message: `User-managed MCP ${mcpId} remains visible and unmanaged by TGO.`,
          severity: 'info',
        });
      }
    }

    for (const agentId of TGO_AGENT_IDS) {
      if (!mergedConfig.agent?.[agentId]) {
        result.warnings.push({
          code: 'missing-managed-agent',
          message: `TGO-managed agent ${agentId} is missing from OpenCode config.`,
          severity: 'warning',
        });
      }
    }
  } else {
    for (const agentId of TGO_AGENT_IDS) {
      result.warnings.push({
        code: 'missing-managed-agent',
        message: `TGO-managed agent ${agentId} is missing from OpenCode config.`,
        severity: 'warning',
      });
    }
  }

  const resiliencePlan = planResilienceSwitch({
    current: manifest.active_presets,
    requested_resilience: manifest.active_presets.resilience,
  });
  result.warnings.push(...resiliencePlan.warnings);

  const tools = await detectPresetTools(
    manifest.active_presets.tools,
    input.detector,
    { aftPluginConfigured, context7SetupConfigured },
  );
  result.blocked_capabilities.push(...tools.blocked);
  result.degraded_capabilities.push(...tools.degraded);
  result.next_steps.push(
    'Review doctor output before running any repair command.',
  );
  return result;
}
