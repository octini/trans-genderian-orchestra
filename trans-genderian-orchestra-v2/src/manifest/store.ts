import type { FileSystemAdapter } from '../filesystem/adapter';
import { createDefaultManifest, type TgoManifest } from './schema';

export async function readManifest(
  fs: FileSystemAdapter,
  path: string,
): Promise<TgoManifest> {
  if (!(await fs.exists(path))) {
    return createDefaultManifest();
  }
  const text = await fs.readText(path);
  return { ...createDefaultManifest(), ...JSON.parse(text) } as TgoManifest;
}

export async function writeManifest(
  fs: FileSystemAdapter,
  path: string,
  manifest: TgoManifest,
): Promise<void> {
  await fs.writeText(path, `${JSON.stringify(manifest, null, 2)}\n`);
}
