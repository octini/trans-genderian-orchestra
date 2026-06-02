import { describe, expect, test } from 'bun:test';
import { createMemoryFileSystem } from '../filesystem/memory-adapter';
import { createBackup } from './store';

describe('backup store', () => {
  test('creates timestamped backup before config writes', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/opencode.jsonc': '{"plugin":[]}',
    });

    const backup = await createBackup(fs, {
      backupRoot: '/home/user/.config/opencode/tgo/backups',
      operationId: 'op-123',
      sourcePath: '/home/user/.config/opencode/opencode.jsonc',
      timestamp: '2026-06-02T10-00-00-000Z',
    });

    expect(backup.path).toBe(
      '/home/user/.config/opencode/tgo/backups/2026-06-02T10-00-00-000Z-op-123/opencode.jsonc',
    );
    expect(await fs.readText(backup.path)).toBe('{"plugin":[]}');
  });
});
