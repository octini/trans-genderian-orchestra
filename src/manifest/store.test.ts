import { describe, expect, test } from 'bun:test';
import { createMemoryFileSystem } from '../filesystem/memory-adapter';
import { createDefaultManifest } from './schema';
import { readManifest, writeManifest } from './store';

describe('manifest store', () => {
  test('returns default manifest when file is missing', async () => {
    const fs = createMemoryFileSystem();

    const manifest = await readManifest(
      fs,
      '/home/user/.config/opencode/tgo/manifest.jsonc',
    );

    expect(manifest.schema_version).toBe(1);
    expect(manifest.package.name).toBe('trans-genderian-orchestra');
    expect(manifest.active_presets).toEqual({
      tools: 'default',
      models: 'balanced',
      resilience: 'balanced',
    });
  });

  test('writes stable JSONC-compatible manifest JSON', async () => {
    const fs = createMemoryFileSystem();
    const manifest = createDefaultManifest();
    manifest.managed_config.push({
      kind: 'agent',
      key: 'agent.tgo-orchestrator',
    });

    await writeManifest(
      fs,
      '/home/user/.config/opencode/tgo/manifest.jsonc',
      manifest,
    );

    const written = await fs.readText(
      '/home/user/.config/opencode/tgo/manifest.jsonc',
    );
    expect(JSON.parse(written).managed_config).toEqual([
      { kind: 'agent', key: 'agent.tgo-orchestrator' },
    ]);
  });
});
