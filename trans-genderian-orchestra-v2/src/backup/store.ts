import { basename, join } from 'node:path';
import type { BackupRecord } from '../commands/result';
import type { FileSystemAdapter } from '../filesystem/adapter';

export interface CreateBackupInput {
  backupRoot: string;
  operationId: string;
  sourcePath: string;
  timestamp: string;
}

export async function createBackup(
  fs: FileSystemAdapter,
  input: CreateBackupInput,
): Promise<BackupRecord> {
  const content = await fs.readText(input.sourcePath);
  const backupPath = join(
    input.backupRoot,
    `${input.timestamp}-${input.operationId}`,
    basename(input.sourcePath),
  );
  await fs.writeText(backupPath, content);
  return {
    id: input.operationId,
    path: backupPath.replaceAll('\\', '/'),
    source_path: input.sourcePath.replaceAll('\\', '/'),
  };
}
