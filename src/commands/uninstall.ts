import { join } from 'node:path';
import { createBackup } from '../backup/store';
import {
  parseOpenCodeConfig,
  serializeOpenCodeConfig,
} from '../config/opencode-config';
import type { FileSystemAdapter } from '../filesystem/adapter';
import { readManifest, writeManifest } from '../manifest/store';
import { removeTgoManagedConfigEntries } from '../release/uninstall';
import {
  createEmptyCommandResult,
  type DeterministicCommandResult,
  markRestartRequired,
} from './result';

export interface UninstallInput {
  fs: FileSystemAdapter;
  homeDir: string;
  mode: 'dry-run' | 'apply';
  operationId: string;
  timestamp: string;
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

export async function runUninstall(
  input: UninstallInput,
): Promise<DeterministicCommandResult> {
  const result = createEmptyCommandResult('uninstall', input.mode);
  const configPath = globalConfigPath(input.homeDir);
  const manifestPath = globalManifestPath(input.homeDir);
  const manifest = await readManifest(input.fs, manifestPath);
  const existingText = (await input.fs.exists(configPath))
    ? await input.fs.readText(configPath)
    : '{}';
  const existingConfig = parseOpenCodeConfig(existingText);
  const removed = removeTgoManagedConfigEntries(existingConfig, manifest);

  result.planned_actions.push({
    id: 'remove-tgo-managed-config',
    title: `Remove ${removed.removed_keys.length} TGO-managed config entries`,
    target: configPath,
    action: 'remove',
    requires_confirmation: true,
  });
  result.next_steps.push(
    'Review uninstall preview before applying with --yes.',
  );

  if (input.mode === 'dry-run') {
    return result;
  }

  const backup = await createBackup(input.fs, {
    backupRoot: globalBackupRoot(input.homeDir),
    operationId: input.operationId,
    sourcePath: configPath,
    timestamp: input.timestamp,
  });
  result.backups_created.push(backup);
  await input.fs.writeText(configPath, serializeOpenCodeConfig(removed.config));
  result.changes_applied.push({
    id: 'write-uninstalled-opencode-config',
    title: 'Write OpenCode config without TGO-managed entries',
    target: configPath,
  });
  manifest.managed_config = [];
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
    value_summary: 'Cleared TGO-managed config entries after uninstall.',
  });
  markRestartRequired(result, 'OpenCode config changed.');
  return result;
}
