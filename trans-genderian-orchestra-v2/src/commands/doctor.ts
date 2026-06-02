import { join } from 'node:path';
import type { FileSystemAdapter } from '../filesystem/adapter';
import { findSecretLikeValues } from '../security/secrets';
import { detectRequiredTools, type CommandDetector } from '../tools/detect';
import {
  createEmptyCommandResult,
  type DeterministicCommandResult,
} from './result';

export interface DoctorInput {
  fs: FileSystemAdapter;
  homeDir: string;
  detector: CommandDetector;
}

function globalConfigPath(homeDir: string): string {
  return join(homeDir, '.config/opencode/opencode.jsonc').replaceAll('\\', '/');
}

function globalManifestPath(homeDir: string): string {
  return join(homeDir, '.config/opencode/tgo/manifest.jsonc').replaceAll(
    '\\',
    '/',
  );
}

export async function runDoctor(
  input: DoctorInput,
): Promise<DeterministicCommandResult> {
  const result = createEmptyCommandResult('doctor', 'read-only');
  const manifestPath = globalManifestPath(input.homeDir);
  const configPath = globalConfigPath(input.homeDir);

  if (!(await input.fs.exists(manifestPath))) {
    result.planned_actions.push({
      id: 'create-global-manifest',
      title: 'Create missing global TGO manifest',
      target: manifestPath,
      action: 'create',
      requires_confirmation: true,
    });
  }

  if (await input.fs.exists(configPath)) {
    const configText = await input.fs.readText(configPath);
    if (findSecretLikeValues(configText).length > 0) {
      result.warnings.push({
        code: 'secret-like-config-value',
        message:
          'OpenCode config contains secret-like values; rotate exposed tokens and replace with env references.',
        severity: 'error',
      });
    }
  }

  const tools = await detectRequiredTools(input.detector);
  result.blocked_capabilities.push(...tools.blocked);
  result.degraded_capabilities.push(...tools.degraded);
  result.next_steps.push('Review doctor output before running any repair command.');
  return result;
}
