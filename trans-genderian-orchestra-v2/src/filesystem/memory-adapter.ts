import { resolve } from 'node:path';
import type { FileSystemAdapter } from './adapter';

function normalize(path: string): string {
  return resolve('/', path).replaceAll('\\', '/');
}

export function createMemoryFileSystem(
  initialFiles: Record<string, string> = {},
): FileSystemAdapter & { snapshot(): Record<string, string> } {
  const files = new Map<string, string>();

  for (const [path, content] of Object.entries(initialFiles)) {
    files.set(normalize(path), content);
  }

  return {
    async exists(path) {
      const normalized = normalize(path);
      if (files.has(normalized)) {
        return true;
      }
      const prefix = `${normalized}/`;
      return Array.from(files.keys()).some((filePath) =>
        filePath.startsWith(prefix),
      );
    },
    async readText(path) {
      const normalized = normalize(path);
      const content = files.get(normalized);
      if (content === undefined) {
        throw new Error(`File not found: ${normalized}`);
      }
      return content;
    },
    async writeText(path, content) {
      files.set(normalize(path), content);
    },
    async listFiles(path) {
      const normalized = normalize(path);
      const prefix = `${normalized}/`;
      return Array.from(files.keys())
        .filter((filePath) => filePath.startsWith(prefix))
        .sort();
    },
    snapshot() {
      return Object.fromEntries(Array.from(files.entries()).sort());
    },
  };
}
