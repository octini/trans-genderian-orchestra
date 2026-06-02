import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

interface CheckResult {
  id: string;
  ok: boolean;
  detail: string;
}

interface LocalPackageJson {
  version: string;
}

const expectedDoctorCommand =
  'npx --yes trans-genderian-orchestra@beta doctor --json';
const repoRoot = new URL('..', import.meta.url).pathname;

function check(id: string, ok: boolean, detail: string): CheckResult {
  return { id, ok, detail };
}

function run(
  command: string,
  args: string[],
  options: { cwd: string; home?: string },
) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    env: options.home ? { ...process.env, HOME: options.home } : process.env,
    encoding: 'utf8',
  });
}

function readJsonLines(output: string): unknown[] {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

function collectStrings(value: unknown, result: string[] = []): string[] {
  if (typeof value === 'string') {
    result.push(value);
    return result;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, result);
    }
    return result;
  }

  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      collectStrings(item, result);
    }
  }

  return result;
}

function readLocalPackage(): LocalPackageJson {
  return JSON.parse(
    readFileSync(join(repoRoot, 'package.json'), 'utf8'),
  ) as LocalPackageJson;
}

function seedDisposableProfile(
  configPath: string,
  manifestPath: string,
): string {
  const originalConfig = JSON.stringify({
    $schema: 'https://opencode.ai/config.json',
    plugin: [],
    agent: { orchestrator: {}, 'user-agent': {} },
    mcp: {},
    provider: { custom: { marker: 'preserve-me' } },
  });

  writeFileSync(configPath, originalConfig);
  writeFileSync(
    manifestPath,
    JSON.stringify({
      schema_version: 1,
      package: {
        name: 'trans-genderian-orchestra',
        version: readLocalPackage().version,
      },
      active_presets: {
        tools: 'default',
        models: 'balanced',
        resilience: 'balanced',
      },
      managed_config: [],
      tools: [],
      backups: [],
      ignored_warnings: [],
    }),
  );

  return originalConfig;
}

const tempRoot = mkdtempSync(join(tmpdir(), 'tgo-public-beta-opencode-'));
const tempHome = join(tempRoot, 'home');
const configDir = join(tempHome, '.config', 'opencode');
const manifestDir = join(configDir, 'tgo');
const configPath = join(configDir, 'opencode.jsonc');
const manifestPath = join(manifestDir, 'manifest.jsonc');
const checks: CheckResult[] = [];

mkdirSync(manifestDir, { recursive: true });
seedDisposableProfile(configPath, manifestPath);

try {
  const npmVersion = run(
    'npm',
    ['view', 'trans-genderian-orchestra@beta', 'version', '--json'],
    { cwd: repoRoot },
  );
  const localPackage = readLocalPackage();
  const publishedVersion =
    npmVersion.status === 0 ? JSON.parse(npmVersion.stdout) : undefined;
  checks.push(
    check(
      'npm_beta_version',
      publishedVersion === localPackage.version,
      `published=${publishedVersion ?? 'unavailable'} local=${localPackage.version}`,
    ),
  );

  const install = run(
    'opencode',
    ['plugin', 'trans-genderian-orchestra@beta', '--global', '--force'],
    { cwd: repoRoot, home: tempHome },
  );
  checks.push(
    check(
      'opencode_plugin_install',
      install.status === 0,
      `exit=${install.status}`,
    ),
  );
  const configBeforeDoctor = readFileSync(configPath, 'utf8');

  const doctor = run(
    'opencode',
    [
      'run',
      '-m',
      'opencode/mimo-v2.5-free',
      '--command=tgo:doctor',
      '--format',
      'json',
      '--dir',
      repoRoot,
      '--',
      '--json',
    ],
    { cwd: repoRoot, home: tempHome },
  );

  const parsed = readJsonLines(doctor.stdout);
  const strings = collectStrings(parsed);
  const toolCommands = strings.filter((value) => value.includes('doctor'));
  const usedExpectedCommand = toolCommands.some((value) =>
    value.includes(expectedDoctorCommand),
  );
  const usedBdDoctor = toolCommands.some((value) =>
    value.includes('bd doctor'),
  );
  const hasDoctorJson = strings.some((value) =>
    value.includes('v1-migration-available'),
  );
  const configUnchanged =
    readFileSync(configPath, 'utf8') === configBeforeDoctor;

  checks.push(
    check('opencode_run_exit', doctor.status === 0, `exit=${doctor.status}`),
  );
  checks.push(
    check(
      'uses_tgo_npx_command',
      usedExpectedCommand,
      toolCommands.join(' | '),
    ),
  );
  checks.push(
    check('does_not_run_bd_doctor', !usedBdDoctor, toolCommands.join(' | ')),
  );
  checks.push(
    check(
      'doctor_json_present',
      hasDoctorJson,
      'v1 migration warning detected',
    ),
  );
  checks.push(check('configUnchanged', configUnchanged, configPath));
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log(JSON.stringify({ checks }, null, 2));

if (checks.some((item) => !item.ok)) {
  process.exitCode = 1;
}
