import { join } from 'node:path';
import { createBackup } from '../backup/store';
import { planDefaultManagedEntries } from '../config/managed-entries';
import {
  applyManagedEntries,
  parseOpenCodeConfig,
  serializeOpenCodeConfig,
} from '../config/opencode-config';
import type { FileSystemAdapter } from '../filesystem/adapter';
import type { ModelPreset, ResiliencePreset } from '../manifest/schema';
import { readManifest, writeManifest } from '../manifest/store';
import { findSecretLikeValues } from '../security/secrets';
import { type CommandDetector, detectPresetTools } from '../tools/detect';
import type { ToolPresetName } from '../tools/presets';
import {
  createEmptyCommandResult,
  type DeterministicCommandResult,
  markRestartRequired,
} from './result';

export interface BootstrapInput {
  fs: FileSystemAdapter;
  homeDir: string;
  mode: 'dry-run' | 'apply';
  operationId: string;
  timestamp: string;
  tools: ToolPresetName;
  models: ModelPreset;
  resilience: ResiliencePreset;
  detector: CommandDetector;
}

function globalConfigPath(homeDir: string): string {
  return join(homeDir, '.config/opencode/opencode.jsonc').replaceAll('\\', '/');
}

function globalManifestPath(homeDir: string): string {
  return join(homeDir, '.config/opencode/tgo/manifest.jsonc').replaceAll(
    '\\',
    '/',
  );
}

function globalBackupRoot(homeDir: string): string {
  return join(homeDir, '.config/opencode/tgo/backups').replaceAll('\\', '/');
}

function plannedActionIdForPlugin(plugin: string): string {
  const packageName = plugin.split('@')[0] ?? plugin;
  return `register-${packageName}`;
}

function plannedActionTitleForPlugin(plugin: string): string {
  const packageName = plugin.split('@')[0] ?? plugin;
  return `Register ${packageName}`;
}

export async function runBootstrap(
  input: BootstrapInput,
): Promise<DeterministicCommandResult> {
  const result = createEmptyCommandResult('bootstrap', input.mode);
  const entries = planDefaultManagedEntries(input.tools);

  for (const plugin of entries.plugins) {
    result.planned_actions.push({
      id: plannedActionIdForPlugin(plugin),
      title: plannedActionTitleForPlugin(plugin),
      target: 'plugin',
      action: 'update',
      requires_confirmation: false,
    });
  }

  for (const mcpId of Object.keys(entries.mcps)) {
    result.planned_actions.push({
      id: `register-${mcpId}`,
      title: `Register ${mcpId} MCP`,
      target: `mcp.${mcpId}`,
      action: 'update',
      requires_confirmation: false,
    });
  }

  result.planned_actions.push({
    id: 'set-default-agent',
    title: 'Set default_agent to tgo-orchestrator',
    target: 'default_agent',
    action: 'update',
    requires_confirmation: true,
  });

  const toolDetection = await detectPresetTools(input.tools, input.detector);
  result.blocked_capabilities.push(...toolDetection.blocked);
  result.degraded_capabilities.push(...toolDetection.degraded);

  const configPath = globalConfigPath(input.homeDir);
  const existingText = (await input.fs.exists(configPath))
    ? await input.fs.readText(configPath)
    : '{}';
  const existingConfig = parseOpenCodeConfig(existingText);
  const applied = applyManagedEntries(existingConfig, entries);
  result.warnings.push(...applied.warnings);

  const serialized = serializeOpenCodeConfig(applied.config);
  const secretMatches = findSecretLikeValues(serialized);
  if (secretMatches.length > 0) {
    result.blocked_capabilities.push({
      capability: 'config-write',
      reason: 'TGO-managed config contains secret-like values.',
    });
    return result;
  }

  if (input.mode === 'dry-run') {
    result.next_steps.push(
      'Run bootstrap with --yes to apply after reviewing planned actions.',
    );
    return result;
  }

  const backup = await createBackup(input.fs, {
    backupRoot: globalBackupRoot(input.homeDir),
    operationId: input.operationId,
    sourcePath: configPath,
    timestamp: input.timestamp,
  });
  result.backups_created.push(backup);

  await input.fs.writeText(configPath, serialized);
  result.changes_applied.push({
    id: 'write-opencode-config',
    title: 'Write OpenCode config with TGO-managed entries',
    target: configPath,
  });

  const manifestPath = globalManifestPath(input.homeDir);
  const manifest = await readManifest(input.fs, manifestPath);
  manifest.active_presets.tools = input.tools;
  manifest.active_presets.models = input.models;
  manifest.active_presets.resilience = input.resilience;
  manifest.managed_config = [
    ...entries.plugins.map((plugin) => ({
      kind: 'plugin' as const,
      key: `plugin.${plugin}`,
    })),
    ...Object.keys(entries.agents).map((agentId) => ({
      kind: 'agent' as const,
      key: `agent.${agentId}`,
    })),
    ...Object.keys(entries.mcps).map((mcpId) => ({
      kind: 'mcp' as const,
      key: `mcp.${mcpId}`,
    })),
    { kind: 'default_agent', key: 'default_agent' },
  ];
  manifest.backups.push({
    operation_id: input.operationId,
    created_at: input.timestamp,
    path: backup.path,
    source_path: backup.source_path,
  });
  await writeManifest(input.fs, manifestPath, manifest);
  result.manifest_updates.push({
    path: manifestPath,
    key: 'active_presets',
    value_summary: `Recorded ${input.tools} tools, ${input.models} models, and ${input.resilience} resilience presets.`,
  });
  markRestartRequired(result, 'OpenCode config changed.');
  return result;
}
