#!/usr/bin/env bun

import { runBootstrap } from '../commands/bootstrap';
import { runDoctor } from '../commands/doctor';
import { createNodeFileSystem } from '../filesystem/adapter';
import { parseCliArgs } from './args';

function printHelp(): void {
  console.log(`trans-genderian-orchestra v2

Usage:
  trans-genderian-orchestra bootstrap [--tools default] [--models balanced] [--resilience balanced] [--dry-run] [--yes] [--json]
  trans-genderian-orchestra doctor [--json]
`);
}

function createPathDetector() {
  return {
    async which(command: string): Promise<string | undefined> {
      const paths = (process.env.PATH ?? '').split(':');
      for (const path of paths) {
        const candidate = `${path}/${command}`;
        if (await Bun.file(candidate).exists()) {
          return candidate;
        }
      }
      return undefined;
    },
  };
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));
  const fs = createNodeFileSystem();
  const homeDir = process.env.TGO_TEST_HOME ?? process.env.HOME;

  if (!homeDir) {
    throw new Error('HOME is not set.');
  }

  if (args.command === 'help') {
    printHelp();
    return;
  }

  if (args.command === 'doctor') {
    const result = await runDoctor({
      fs,
      homeDir,
      detector: createPathDetector(),
    });
    console.log(
      args.json ? JSON.stringify(result, null, 2) : result.next_steps.join('\n'),
    );
    return;
  }

  const result = await runBootstrap({
    fs,
    homeDir,
    mode: args.yes ? 'apply' : 'dry-run',
    operationId: `bootstrap-${Date.now()}`,
    timestamp: new Date().toISOString().replaceAll(':', '-'),
    detector: createPathDetector(),
  });

  console.log(
    args.json ? JSON.stringify(result, null, 2) : result.next_steps.join('\n'),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
