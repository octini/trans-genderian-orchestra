import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC_DIR = join(import.meta.dir, '..');
const OLD_OWNER_MATCHES = ['alvinunreal'];
const OLD_PREFIX_MATCHES = ['omo-slim', 'oh-my-opencode'];

// Skip certain files that are allowed to reference old names.
const SKIP_PATTERNS = [
  '.test.',
  'node_modules',
  '.git',
  'bun.lock',
  'README.zh-CN.md',
  'README.ja-JP.md',
];

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.md', '.json', '.yml', '.yaml'];

describe('rename hygiene', () => {
  function collectFiles(dir: string): string[] {
    const results: string[] = [];

    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      if (statSync(fullPath).isDirectory()) {
        if (!SKIP_PATTERNS.some((pattern) => entry.includes(pattern))) {
          results.push(...collectFiles(fullPath));
        }
      } else if (!SKIP_PATTERNS.some((pattern) => fullPath.includes(pattern))) {
        results.push(fullPath);
      }
    }

    return results;
  }

  it('should not contain references to old GitHub owner alvinunreal in source files', () => {
    const srcFiles = collectFiles(SRC_DIR).filter((file) =>
      SOURCE_EXTENSIONS.some((extension) => file.endsWith(extension)),
    );

    for (const file of srcFiles) {
      const content = readFileSync(file, 'utf-8');
      for (const match of OLD_OWNER_MATCHES) {
        if (content.includes(match)) {
          // Skip .gitignore files and historical remarks.
          if (file.includes('.gitignore') || file.includes('CHANGELOG'))
            continue;

          expect(`File ${file} contains old owner reference: ${match}`).toBe(
            '',
          );
        }
      }
    }
  });

  it('should not contain references to old plugin names in source files', () => {
    const srcFiles = collectFiles(SRC_DIR).filter(
      (file) => file.endsWith('.ts') || file.endsWith('.tsx'),
    );

    for (const file of srcFiles) {
      const content = readFileSync(file, 'utf-8');
      for (const match of OLD_PREFIX_MATCHES) {
        if (content.includes(match)) {
          expect(`File ${file} contains old name reference: ${match}`).toBe('');
        }
      }
    }
  });
});
