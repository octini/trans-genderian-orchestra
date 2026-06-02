import { describe, expect, test } from 'bun:test';
import { createMemoryFileSystem } from '../filesystem/memory-adapter';
import type { TgoManifest } from '../manifest/schema';
import {
  applyManifestLinkedRollback,
  planManifestLinkedRollback,
} from './rollback';

function manifest(): TgoManifest {
  return {
    schema_version: 1,
    package: { name: 'trans-genderian-orchestra', version: '2.0.0-beta.0' },
    active_presets: {
      tools: 'default',
      models: 'balanced',
      resilience: 'balanced',
    },
    managed_config: [],
    tools: [],
    backups: [
      {
        operation_id: 'op-1',
        created_at: '2026-06-02T10-00-00-000Z',
        path: '/home/user/.config/opencode/tgo/backups/op-1/opencode.jsonc',
        source_path: '/home/user/.config/opencode/opencode.jsonc',
      },
    ],
    ignored_warnings: [],
  };
}

describe('manifest-linked rollback', () => {
  test('plans rollback from the latest manifest backup', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/tgo/backups/op-1/opencode.jsonc':
        '{"plugin":["v1"]}',
    });

    const plan = await planManifestLinkedRollback(fs, manifest());

    expect(plan.status).toBe('ready');
    expect(plan.planned_action).toEqual({
      id: 'restore-op-1-backup',
      title: 'Restore OpenCode config from manifest-linked backup op-1',
      target: '/home/user/.config/opencode/opencode.jsonc',
      action: 'update',
      requires_confirmation: true,
    });
  });

  test('blocks rollback when manifest backup is missing', async () => {
    const fs = createMemoryFileSystem();

    const plan = await planManifestLinkedRollback(fs, manifest());

    expect(plan.status).toBe('blocked');
    expect(plan.blocked_reason).toBe('backup_not_found');
  });

  test('applies rollback by restoring backup content to source path', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/tgo/backups/op-1/opencode.jsonc':
        '{"plugin":["v1"]}',
      '/home/user/.config/opencode/opencode.jsonc': '{"plugin":["v2"]}',
    });

    const result = await applyManifestLinkedRollback(fs, manifest());

    expect(result.status).toBe('applied');
    expect(
      await fs.readText('/home/user/.config/opencode/opencode.jsonc'),
    ).toBe('{"plugin":["v1"]}');
  });
});
