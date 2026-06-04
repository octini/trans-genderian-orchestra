import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function globalManifestPath(homeDir: string): string {
  return join(homeDir, '.config/opencode/tgo/manifest.jsonc');
}

export function readActiveModelPresetFromGlobalManifest(
  homeDir = process.env.HOME ?? homedir(),
): string | undefined {
  const manifestPath = globalManifestPath(homeDir);
  if (!existsSync(manifestPath)) {
    return undefined;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as unknown;
  if (!isRecord(manifest) || !isRecord(manifest.active_presets)) {
    return undefined;
  }

  const modelPreset = manifest.active_presets.models;
  return typeof modelPreset === 'string' ? modelPreset : undefined;
}
