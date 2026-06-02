import { join } from 'node:path';
import { createBackup } from '../backup/store';
import { planDefaultManagedEntries } from '../config/managed-entries';
import {
  applyManagedEntries,
  parseOpenCodeConfig,
  serializeOpenCodeConfig,
} from '../config/opencode-config';
import type { FileSystemAdapter } from '../filesystem/adapter';
import { readManifest, writeManifest } from '../manifest/store';
import { findSecretLikeValues } from '../security/secrets';
import { type CommandDetector, detectRequiredTools } from '../tools/detect';
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

export async function runBootstrap(
  input: BootstrapInput,
): Promise<DeterministicCommandResult> {
  const result = createEmptyCommandResult('bootstrap', input.mode);
  const entries = planDefaultManagedEntries();

  result.planned_actions.push(
    {
      id: 'register-tgo-plugin',
      title: 'Register TGO v2 plugin',
      target: 'plugin',
      action: 'update',
      requires_confirmation: false,
    },
    {
      id: 'register-opencode-beads',
      title: 'Register opencode-beads plugin',
      target: 'plugin',
      action: 'update',
      requires_confirmation: false,
    },
    {
      id: 'register-aft',
      title: 'Register AFT peer plugin',
      target: 'plugin',
      action: 'update',
      requires_confirmation: false,
    },
    {
      id: 'register-tgo-websearch',
      title: 'Register TGO websearch MCP',
      target: 'mcp.tgo-websearch',
      action: 'update',
      requires_confirmation: false,
    },
    {
      id: 'register-tgo-grep-app',
      title: 'Register TGO grep_app MCP',
      target: 'mcp.tgo-grep-app',
      action: 'update',
      requires_confirmation: false,
    },
    {
      id: 'set-default-agent',
      title: 'Set default_agent to tgo-orchestrator',
      target: 'default_agent',
      action: 'update',
      requires_confirmation: true,
    },
  );

  const toolDetection = await detectRequiredTools(input.detector);
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
  manifest.managed_config = [
    { kind: 'plugin', key: 'plugin.trans-genderian-orchestra@2.0.0-beta.0' },
    { kind: 'plugin', key: 'plugin.opencode-beads@0.7.0' },
    { kind: 'plugin', key: 'plugin.aft@0.0.0-pinned-after-verification' },
    { kind: 'agent', key: 'agent.tgo-orchestrator' },
    { kind: 'mcp', key: 'mcp.tgo-websearch' },
    { kind: 'mcp', key: 'mcp.tgo-grep-app' },
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
    key: 'managed_config',
    value_summary: 'Recorded default TGO managed entries.',
  });
  markRestartRequired(result, 'OpenCode config changed.');
  return result;
}
