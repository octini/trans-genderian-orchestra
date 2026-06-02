import { describe, expect, test } from 'bun:test';
import { createMemoryFileSystem } from './memory-adapter';

describe('memory filesystem adapter', () => {
  test('reads and writes normalized absolute paths', async () => {
    const fs = createMemoryFileSystem({
      '/home/user/.config/opencode/opencode.jsonc': '{}',
    });

    expect(await fs.exists('/home/user/.config/opencode/opencode.jsonc')).toBe(
      true,
    );
    expect(
      await fs.readText('/home/user/.config/opencode/opencode.jsonc'),
    ).toBe('{}');

    await fs.writeText(
      '/home/user/.config/opencode/tgo/manifest.jsonc',
      '{"version":1}',
    );

    expect(
      await fs.readText('/home/user/.config/opencode/tgo/manifest.jsonc'),
    ).toBe('{"version":1}');
  });

  test('lists files under a directory prefix', async () => {
    const fs = createMemoryFileSystem({
      '/repo/a.txt': 'a',
      '/repo/nested/b.txt': 'b',
      '/other/c.txt': 'c',
    });

    expect(await fs.listFiles('/repo')).toEqual([
      '/repo/a.txt',
      '/repo/nested/b.txt',
    ]);
  });
});
