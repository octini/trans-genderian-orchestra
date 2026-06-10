import type { PlannedAction } from '../commands/result';
import type { FileSystemAdapter } from '../filesystem/adapter';
import type { BackupManifestRecord, TgoManifest } from '../manifest/schema';

export interface RollbackPlan {
  status: 'ready' | 'blocked';
  backup?: BackupManifestRecord;
  planned_action?: PlannedAction;
  blocked_reason?: 'no_manifest_backups' | 'backup_not_found';
}

export interface RollbackApplyResult {
  status: 'applied' | 'blocked';
  restored_path?: string;
  blocked_reason?: RollbackPlan['blocked_reason'];
}

function latestBackup(manifest: TgoManifest): BackupManifestRecord | undefined {
  return manifest.backups.at(-1);
}

export async function planManifestLinkedRollback(
  fs: FileSystemAdapter,
  manifest: TgoManifest,
): Promise<RollbackPlan> {
  const backup = latestBackup(manifest);
  if (!backup) {
    return { status: 'blocked', blocked_reason: 'no_manifest_backups' };
  }
  if (!(await fs.exists(backup.path))) {
    return { status: 'blocked', backup, blocked_reason: 'backup_not_found' };
  }
  return {
    status: 'ready',
    backup,
    planned_action: {
      id: `restore-${backup.operation_id}-backup`,
      title: `Restore OpenCode config from manifest-linked backup ${backup.operation_id}`,
      target: backup.source_path,
      action: 'update',
      requires_confirmation: true,
    },
  };
}

export async function applyManifestLinkedRollback(
  fs: FileSystemAdapter,
  manifest: TgoManifest,
): Promise<RollbackApplyResult> {
  const plan = await planManifestLinkedRollback(fs, manifest);
  if (plan.status !== 'ready' || !plan.backup) {
    return { status: 'blocked', blocked_reason: plan.blocked_reason };
  }
  const backupText = await fs.readText(plan.backup.path);
  await fs.writeText(plan.backup.source_path, backupText);
  return { status: 'applied', restored_path: plan.backup.source_path };
}
