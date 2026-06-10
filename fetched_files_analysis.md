# oh-my-opencode-slim v2-beta CLI Files Analysis

## Summary of Findings

### References to Agent Names
- **orchestrator**: Not found
- **explorer**: Not found (though `DEFAULT_OPENCODE_AGENTS_TO_DISABLE` includes 'explore')
- **librarian**: Not found
- **oracle**: Not found
- **designer**: Not found
- **fixer**: Not found
- **observer**: Not found
- **council**: Not found
- **councillor**: Not found

### References to Plugin Name ("oh-my-opencode-slim")
Found in multiple files:
- `index.ts`: Help text, usage examples
- `paths.ts`: Config file paths (oh-my-opencode-slim.json, oh-my-opencode-slim.jsonc)
- `config-io.ts`: PACKAGE_NAME constant, plugin detection logic
- `install.ts`: GITHUB_REPO constant, installation messages
- `doctor.ts`: Help text, OH_MY_OPENCODE_SLIM_PRESET env var

### References to Config File Paths
- `paths.ts`: Defines all config path resolution logic
- `config-io.ts`: Uses config paths for reading/writing
- `doctor.ts`: Validates config files

---

## File Contents

### 1. src/cli/index.ts (Main CLI Entry)
**References to plugin name**: Yes - in help text and error messages
**References to agent names**: None
**References to config file paths**: Indirectly via imported modules

```typescript
#!/usr/bin/env bun
import { doctor, parseDoctorArgs } from './doctor';
import { install } from './install';
import { getGeneratedPresetNames, isGeneratedPresetName } from './providers';
import type { BackgroundSubagentsArg, BooleanArg, InstallArgs } from './types';

export function parseArgs(args: string[]): InstallArgs {
  const result: InstallArgs = {
    tui: true,
    skills: 'yes',
  };

  for (const arg of args) {
    if (arg === '--no-tui') {
      result.tui = false;
    } else if (arg.startsWith('--skills=')) {
      result.skills = arg.split('=')[1] as BooleanArg;
    } else if (arg.startsWith('--preset=')) {
      const preset = arg.split('=')[1];
      if (!isGeneratedPresetName(preset)) {
        console.error(
          `Unsupported preset: ${preset}. Available presets: ${getGeneratedPresetNames().join(', ')}`,
        );
        process.exit(1);
      }
      result.preset = preset;
    } else if (arg.startsWith('--background-subagents=')) {
      const mode = arg.split('=')[1] as BackgroundSubagentsArg;
      if (!['ask', 'yes', 'no'].includes(mode)) {
        console.error(
          'Unsupported --background-subagents value: use ask, yes, or no',
        );
        process.exit(1);
      }
      result.backgroundSubagents = mode;
    } else if (arg.startsWith('--background-subagents-target=')) {
      result.backgroundSubagentsTarget = arg.split('=')[1];
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--reset') {
      result.reset = true;
    } else if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  result.backgroundSubagents ??=
    result.tui && process.stdin.isTTY ? 'ask' : 'no';

  return result;
}

function printHelp(): void {
  console.log(`
oh-my-opencode-slim installer

Usage:
  bunx oh-my-opencode-slim install [OPTIONS]
  bunx oh-my-opencode-slim doctor [OPTIONS]

Options:
  --skills=yes|no        Install bundled skills (default: yes)
  --preset=<name>        Active generated config preset (default: openai)
  --background-subagents=ask|yes|no
                         Persist required OpenCode background subagent env
                         (default: ask in interactive TTY, otherwise no)
  --background-subagents-target=<path>
                         Shell startup file to update
  --no-tui               Non-interactive mode
  --dry-run              Simulate install without writing files
  --reset                Force overwrite of existing configuration
  -h, --help             Show this help message

Doctor options:
  --json                 Print diagnostics as JSON

Available presets: ${getGeneratedPresetNames().join(', ')}

The installer generates OpenAI and OpenCode Go presets by default.
OpenAI is active unless --preset selects another generated preset.
For the full config reference, see docs/configuration.md.

Examples:
  bunx oh-my-opencode-slim install
  bunx oh-my-opencode-slim install --no-tui --skills=yes
  bunx oh-my-opencode-slim install --background-subagents=yes
  bunx oh-my-opencode-slim install --preset=opencode-go
  bunx oh-my-opencode-slim install --reset
  bunx oh-my-opencode-slim doctor
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'install') {
    const hasSubcommand = args[0] === 'install';
    const installArgs = parseArgs(args.slice(hasSubcommand ? 1 : 0));
    const exitCode = await install(installArgs);
    process.exit(exitCode);
  } else if (args[0] === 'doctor') {
    const doctorArgs = parseDoctorArgs(args.slice(1));
    const exitCode = await doctor(doctorArgs);
    process.exit(exitCode);
  } else if (args[0] === '-h' || args[0] === '--help') {
    printHelp();
    process.exit(0);
  } else {
    console.error(`Unknown command: ${args[0]}`);
    console.error('Run with --help for usage information');
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
```

### 2. src/cli/paths.ts (Config File Paths)
**References to plugin name**: Yes - in getLiteConfig() and getLiteConfigJsonc()
**References to agent names**: None
**References to config file paths**: Yes - defines all config path resolution logic

```typescript
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

function getDefaultOpenCodeConfigDir(): string {
  const userConfigDir = process.env.XDG_CONFIG_HOME
    ? process.env.XDG_CONFIG_HOME
    : join(homedir(), '.config');

  return join(userConfigDir, 'opencode');
}

function getCustomOpenCodeConfigDir(): string | undefined {
  const configDir = process.env.OPENCODE_CONFIG_DIR?.trim();
  return configDir || undefined;
}

function getCustomTuiConfigPath(): string | undefined {
  const configPath = process.env.OPENCODE_TUI_CONFIG?.trim();
  return configPath || undefined;
}

/**
 * Get the OpenCode plugin config directory.
 *
 * Resolution order:
 * 1. OPENCODE_CONFIG_DIR (custom OpenCode directory)
 * 2. XDG_CONFIG_HOME/opencode
 * 3. ~/.config/opencode
 */
export function getConfigDir(): string {
  const customConfigDir = getCustomOpenCodeConfigDir();
  if (customConfigDir) {
    return customConfigDir;
  }

  return getDefaultOpenCodeConfigDir();
}

/**
 * Get OpenCode config directories in read/search order.
 *
 * Resolution order:
 * 1. OPENCODE_CONFIG_DIR (if set)
 * 2. XDG_CONFIG_HOME/opencode or ~/.config/opencode
 *
 * Duplicate entries are removed.
 */
export function getConfigSearchDirs(): string[] {
  const dirs = [getCustomOpenCodeConfigDir(), getDefaultOpenCodeConfigDir()];

  return dirs.filter((dir, index): dir is string => {
    return Boolean(dir) && dirs.indexOf(dir) === index;
  });
}

export function getOpenCodeConfigPaths(): string[] {
  const configDir = getConfigDir();
  return [join(configDir, 'opencode.json'), join(configDir, 'opencode.jsonc')];
}

export function getConfigJson(): string {
  return getOpenCodeConfigPaths()[0];
}

export function getConfigJsonc(): string {
  return getOpenCodeConfigPaths()[1];
}

export function getLiteConfig(): string {
  return join(getConfigDir(), 'oh-my-opencode-slim.json');
}

export function getLiteConfigJsonc(): string {
  return join(getConfigDir(), 'oh-my-opencode-slim.jsonc');
}

export function getTuiConfig(): string {
  const customConfigPath = getCustomTuiConfigPath();
  if (customConfigPath) return customConfigPath;

  return join(getConfigDir(), 'tui.json');
}

export function getTuiConfigJsonc(): string {
  return join(getConfigDir(), 'tui.jsonc');
}

export function getExistingLiteConfigPath(): string {
  const jsonPath = getLiteConfig();
  if (existsSync(jsonPath)) return jsonPath;

  const jsoncPath = getLiteConfigJsonc();
  if (existsSync(jsoncPath)) return jsoncPath;

  return jsonPath;
}

export function getExistingTuiConfigPath(): string {
  const customConfigPath = getCustomTuiConfigPath();
  if (customConfigPath) return customConfigPath;

  const jsonPath = join(getConfigDir(), 'tui.json');
  if (existsSync(jsonPath)) return jsonPath;

  const jsoncPath = getTuiConfigJsonc();
  if (existsSync(jsoncPath)) return jsoncPath;

  return jsonPath;
}

export function getExistingConfigPath(): string {
  const jsonPath = getConfigJson();
  if (existsSync(jsonPath)) return jsonPath;

  const jsoncPath = getConfigJsonc();
  if (existsSync(jsoncPath)) return jsoncPath;

  return jsonPath;
}

export function ensureConfigDir(): void {
  const configDir = getConfigDir();
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
}

export function ensureTuiConfigDir(): void {
  const configDir = dirname(getTuiConfig());
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
}

/**
 * Ensure the directory for OpenCode's main config file exists.
 */
export function ensureOpenCodeConfigDir(): void {
  const configDir = dirname(getConfigJson());
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
}
```

### 3. src/cli/config-io.ts (Config File Manipulation)
**References to plugin name**: Yes - PACKAGE_NAME constant and throughout
**References to agent names**: DEFAULT_OPENCODE_AGENTS_TO_DISABLE includes 'build', 'explore', 'general', 'plan'
**References to config file paths**: Yes - uses config paths for reading/writing

```typescript
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { crossSpawn } from '../utils/compat';
import {
  ensureConfigDir,
  ensureOpenCodeConfigDir,
  ensureTuiConfigDir,
  getExistingConfigPath,
  getExistingTuiConfigPath,
  getLiteConfig,
} from './paths';
import { generateLiteConfig } from './providers';
import type {
  ConfigMergeResult,
  DetectedConfig,
  InstallConfig,
  OpenCodeConfig,
} from './types';

const PACKAGE_NAME = 'oh-my-opencode-slim';
const DEFAULT_OPENCODE_AGENTS_TO_DISABLE = [
  'build',
  'explore',
  'general',
  'plan',
] as const;

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function getPlugins(config: OpenCodeConfig): unknown[] {
  return Array.isArray(config.plugin) ? config.plugin : [];
}

function getPluginEntries(config: OpenCodeConfig): string[] {
  return getPlugins(config).filter(isString);
}

function getPluginSpec(entry: unknown): string | undefined {
  if (isString(entry)) return entry;
  if (!Array.isArray(entry)) return undefined;

  const spec = entry[0];
  return isString(spec) ? spec : undefined;
}

function normalizePathForMatch(path: string): string {
  return path.replaceAll('\\', '/');
}

function findPackageRoot(startPath: string): string | null {
  let currentPath = dirname(startPath);

  while (true) {
    const packageJsonPath = join(currentPath, 'package.json');

    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(
          readFileSync(packageJsonPath, 'utf-8'),
        ) as {
          name?: string;
        };

        if (packageJson.name === PACKAGE_NAME) {
          return currentPath;
        }
      } catch {
        // Ignore invalid package.json while walking upward.
      }
    }

    const parentPath = dirname(currentPath);
    if (parentPath === currentPath) {
      return null;
    }
    currentPath = parentPath;
  }
}

function isLocalPackageRootEntry(entry: string): boolean {
  if (!entry || entry.startsWith('file://')) {
    return false;
  }

  const packageJsonPath = join(entry, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
      name?: string;
    };
    return packageJson.name === PACKAGE_NAME;
  } catch {
    return false;
  }
}

function isPackageManagerInstall(path: string): boolean {
  const normalizedPath = normalizePathForMatch(path);
  return normalizedPath.includes(`/node_modules/${PACKAGE_NAME}`);
}

function isPluginEntry(entry: string): boolean {
  return (
    entry === PACKAGE_NAME ||
    entry.startsWith(`${PACKAGE_NAME}@`) ||
    (entry.startsWith('file://') && entry.includes(PACKAGE_NAME)) ||
    isLocalPackageRootEntry(entry)
  );
}

function isMatchingPluginEntry(entry: unknown): boolean {
  const spec = getPluginSpec(entry);
  return spec ? isPluginEntry(spec) : false;
}

function getPluginEntry(): string {
  const cliEntryPath = process.argv[1];

  if (!cliEntryPath) {
    return PACKAGE_NAME;
  }

  try {
    const packageRoot = findPackageRoot(cliEntryPath);

    if (!packageRoot || isPackageManagerInstall(packageRoot)) {
      return PACKAGE_NAME;
    }

    return packageRoot;
  } catch {
    return PACKAGE_NAME;
  }
}

/**
 * Reads the OpenCode config to find the pinned version for this plugin.
 * Returns the version string (e.g. "1.2.3") if pinned, or undefined
 * if the plugin is unpinned (bare name or @latest).
 */
function getPinnedVersionFromConfig(): string | undefined {
  try {
    const { config } = parseConfig(getExistingConfigPath());
    if (!config) return undefined;
    for (const entry of getPlugins(config)) {
      const spec = getPluginSpec(entry);
      if (!spec) continue;
      if (spec === PACKAGE_NAME) return undefined;
      if (spec.startsWith(`${PACKAGE_NAME}@`)) {
        const version = spec.slice(PACKAGE_NAME.length + 1);
        if (version && version !== 'latest') return version;
      }
    }
  } catch {}
  return undefined;
}

/**
 * Reads the version from the package.json at the given package root.
 * Used as a fallback when the config entry is unpinned (e.g. bunx @beta install).
 */
function getVersionFromPackageRoot(packageRoot: string): string | undefined {
  try {
    const packageJsonPath = join(packageRoot, 'package.json');
    if (!existsSync(packageJsonPath)) return undefined;
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
      version?: string;
    };
    return pkg.version;
  } catch {
    return undefined;
  }
}

function getOpenCodePluginCacheDir(version?: string): string {
  const cacheDir =
    process.env.XDG_CACHE_HOME?.trim() || join(homedir(), '.cache');
  const suffix = version
    ? `${PACKAGE_NAME}@${version}`
    : `${PACKAGE_NAME}@latest`;
  return join(cacheDir, 'opencode', 'packages', suffix);
}

function writeOpenCodePluginCacheManifest(
  cacheDir: string,
  version: string = 'latest',
): ConfigMergeResult | null {
  try {
    writeFileSync(
      join(cacheDir, 'package.json'),
      JSON.stringify(
        {
          name: `${PACKAGE_NAME}-cache`,
          private: true,
          dependencies: {
            [PACKAGE_NAME]: version,
          },
        },
        null,
        2,
      ),
    );
    return null;
  } catch (err) {
    return {
      success: false,
      configPath: cacheDir,
      error: `Failed to write cache package.json: ${err}`,
    };
  }
}

function verifyOpenCodePluginCache(cacheDir: string): ConfigMergeResult | null {
  const pluginPackageJsonPath = join(
    cacheDir,
    'node_modules',
    PACKAGE_NAME,
    'package.json',
  );

  if (!existsSync(pluginPackageJsonPath)) {
    return {
      success: false,
      configPath: cacheDir,
      error: `Cached plugin package not found at ${pluginPackageJsonPath}`,
    };
  }

  try {
    const packageJson = JSON.parse(
      readFileSync(pluginPackageJsonPath, 'utf-8'),
    ) as {
      name?: string;
    };

    if (packageJson.name !== PACKAGE_NAME) {
      return {
        success: false,
        configPath: cacheDir,
        error: `Cached plugin package has unexpected name: ${packageJson.name}`,
      };
    }
  } catch (err) {
    return {
      success: false,
      configPath: cacheDir,
      error: `Failed to verify cached plugin package: ${err}`,
    };
  }

  return null;
}

export async function warmOpenCodePluginCache(): Promise<ConfigMergeResult | null> {
  const cliEntryPath = process.argv[1];
  if (!cliEntryPath) {
    return null;
  }

  const packageRoot = findPackageRoot(cliEntryPath);
  if (!packageRoot || !isPackageManagerInstall(packageRoot)) {
    return null;
  }

  const pinnedVersion = getPinnedVersionFromConfig();
  const runningVersion = getVersionFromPackageRoot(packageRoot);
  const cacheVersion = pinnedVersion ?? runningVersion;
  const cacheDir = getOpenCodePluginCacheDir(cacheVersion);

  try {
    mkdirSync(cacheDir, { recursive: true });
  } catch (err) {
    return {
      success: false,
      configPath: cacheDir,
      error: `Failed to create OpenCode cache directory: ${err}`,
    };
  }

  const manifestError = writeOpenCodePluginCacheManifest(
    cacheDir,
    cacheVersion,
  );
  if (manifestError) return manifestError;

  try {
    const proc = crossSpawn(['bun', 'install', '--ignore-scripts'], {
      cwd: cacheDir,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    await proc.exited;

    if (proc.exitCode !== 0) {
      const stderr = (await proc.stderr()).trim();
      return {
        success: false,
        configPath: cacheDir,
        error: stderr || `bun install exited with code ${proc.exitCode}`,
      };
    }

    const verificationError = verifyOpenCodePluginCache(cacheDir);
    if (verificationError) return verificationError;

    return { success: true, configPath: cacheDir };
  } catch (err) {
    return {
      success: false,
      configPath: cacheDir,
      error: `Failed to warm OpenCode cache: ${err}`,
    };
  }
}

/**
 * Strip JSON comments (single-line // and multi-line) and trailing commas for JSONC support.
 */
export function stripJsonComments(json: string): string {
  const commentPattern = /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g;
  const trailingCommaPattern = /\\"|"(?:\\"|[^"])*"|(,)(\s*[}\]])/g;

  return json
    .replace(commentPattern, (match, commentGroup) =>
      commentGroup ? '' : match,
    )
    .replace(trailingCommaPattern, (match, comma, closing) =>
      comma ? closing : match,
    );
}

export function parseConfigFile(path: string): {
  config: OpenCodeConfig | null;
  error?: string;
} {
  try {
    if (!existsSync(path)) return { config: null };
    const stat = statSync(path);
    if (stat.size === 0) return { config: null };
    const content = readFileSync(path, 'utf-8');
    if (content.trim().length === 0) return { config: null };
    return { config: JSON.parse(stripJsonComments(content)) as OpenCodeConfig };
  } catch (err) {
    return { config: null, error: String(err) };
  }
}

export function parseConfig(path: string): {
  config: OpenCodeConfig | null;
  error?: string;
} {
  const result = parseConfigFile(path);
  if (result.config || result.error) return result;

  if (path.endsWith('.json')) {
    const jsoncPath = path.replace(/\.json$/, '.jsonc');
    return parseConfigFile(jsoncPath);
  }
  return { config: null };
}

/**
 * Write config to file atomically.
 */
export function writeConfig(configPath: string, config: OpenCodeConfig): void {
  if (configPath.endsWith('.jsonc')) {
    console.warn(
      '[config-manager] Writing to .jsonc file - comments will not be preserved',
    );
  }

  const tmpPath = `${configPath}.tmp`;
  const bakPath = `${configPath}.bak`;
  const content = `${JSON.stringify(config, null, 2)}\n`;

  // Backup existing config if it exists
  if (existsSync(configPath)) {
    copyFileSync(configPath, bakPath);
  }

  // Atomic write pattern: write to tmp, then rename
  writeFileSync(tmpPath, content);
  renameSync(tmpPath, configPath);
}

export async function addPluginToOpenCodeConfig(): Promise<ConfigMergeResult> {
  const configPath = getExistingConfigPath();

  try {
    ensureOpenCodeConfigDir();
  } catch (err) {
    return {
      success: false,
      configPath,
      error: `Failed to create config directory: ${err}`,
    };
  }

  try {
    const { config: parsedConfig, error } = parseConfig(configPath);
    if (error) {
      return {
        success: false,
        configPath,
        error: `Failed to parse config: ${error}`,
      };
    }
    const config = parsedConfig ?? {};
    const plugins = getPlugins(config);

    const pluginEntry = getPluginEntry();

    // Remove existing oh-my-opencode-slim entries
    const filteredPlugins = plugins.filter(
      (plugin) => !isMatchingPluginEntry(plugin),
    );

    // Add fresh entry
    filteredPlugins.push(pluginEntry);
    config.plugin = filteredPlugins;

    writeConfig(configPath, config);
    return { success: true, configPath };
  } catch (err) {
    return {
      success: false,
      configPath,
      error: `Failed to update opencode config: ${err}`,
    };
  }
}

export async function addPluginToOpenCodeTuiConfig(): Promise<ConfigMergeResult> {
  const configPath = getExistingTuiConfigPath();

  try {
    ensureTuiConfigDir();
  } catch (err) {
    return {
      success: false,
      configPath,
      error: `Failed to create config directory: ${err}`,
    };
  }

  try {
    const { config: parsedConfig, error } = parseConfig(configPath);
    if (error) {
      return {
        success: false,
        configPath,
        error: `Failed to parse TUI config: ${error}`,
      };
    }
    const config = parsedConfig ?? {};
    const plugins = getPlugins(config);
    const pluginEntry = getPluginEntry();
    const filteredPlugins = plugins.filter(
      (plugin) => !isMatchingPluginEntry(plugin),
    );

    filteredPlugins.push(pluginEntry);
    config.plugin = filteredPlugins;

    writeConfig(configPath, config);
    return { success: true, configPath };
  } catch (err) {
    return {
      success: false,
      configPath,
      error: `Failed to update opencode TUI config: ${err}`,
    };
  }
}

// Removed: addAuthPlugins - no longer needed with cliproxy
// Removed: addProviderConfig - default opencode now has kimi provider config

export function writeLiteConfig(
  installConfig: InstallConfig,
  targetPath?: string,
): ConfigMergeResult {
  const configPath = targetPath ?? getLiteConfig();

  try {
    ensureConfigDir();
    const config = generateLiteConfig(installConfig);

    // Atomic write for lite config too
    const tmpPath = `${configPath}.tmp`;
    const bakPath = `${configPath}.bak`;
    const content = `${JSON.stringify(config, null, 2)}\n`;

    // Backup existing config if it exists
    if (existsSync(configPath)) {
      copyFileSync(configPath, bakPath);
    }

    writeFileSync(tmpPath, content);
    renameSync(tmpPath, configPath);

    return { success: true, configPath };
  } catch (err) {
    return {
      success: false,
      configPath,
      error: `Failed to write lite config: ${err}`,
    };
  }
}

export function disableDefaultAgents(): ConfigMergeResult {
  const configPath = getExistingConfigPath();

  try {
    ensureOpenCodeConfigDir();
    const { config: parsedConfig, error } = parseConfig(configPath);
    if (error) {
      return {
        success: false,
        configPath,
        error: `Failed to parse config: ${error}`,
      };
    }
    const config = parsedConfig ?? {};

    const agent = (config.agent ?? {}) as Record<string, unknown>;
    for (const agentName of DEFAULT_OPENCODE_AGENTS_TO_DISABLE) {
      const existing = agent[agentName];
      agent[agentName] = {
        ...(existing && typeof existing === 'object' && !Array.isArray(existing)
          ? existing
          : {}),
        disable: true,
      };
    }
    config.agent = agent;

    writeConfig(configPath, config);
    return { success: true, configPath };
  } catch (err) {
    return {
      success: false,
      configPath,
      error: `Failed to disable default agents: ${err}`,
    };
  }
}

export function enableLspByDefault(): ConfigMergeResult {
  const configPath = getExistingConfigPath();

  try {
    ensureOpenCodeConfigDir();
    const { config: parsedConfig, error } = parseConfig(configPath);
    if (error) {
      return {
        success: false,
        configPath,
        error: `Failed to parse config: ${error}`,
      };
    }
    const config = parsedConfig ?? {};

    if (config.lsp === undefined) {
      config.lsp = true;
      writeConfig(configPath, config);
    }

    return { success: true, configPath };
  } catch (err) {
    return {
      success: false,
      configPath,
      error: `Failed to enable LSP: ${err}`,
    };
  }
}

export function canModifyOpenCodeConfig(): boolean {
  try {
    const configPath = getExistingConfigPath();
    if (!existsSync(configPath)) return true; // Will be created
    const stat = statSync(configPath);
    // Check if writable - simple check for now
    return !!(stat.mode & 0o200);
  } catch {
    return false;
  }
}

// Antigravity, Google provider, and Chutes provider functions removed in simplification refactor.

export function detectCurrentConfig(): DetectedConfig {
  const result: DetectedConfig = {
    isInstalled: false,
    hasKimi: false,
    hasOpenAI: false,
    hasAnthropic: false,
    hasCopilot: false,
    hasZaiPlan: false,
    hasAntigravity: false,
    hasChutes: false,
    hasOpencodeZen: false,
    hasTmux: false,
  };

  const { config } = parseConfig(getExistingConfigPath());
  if (!config) return result;

  const plugins = getPluginEntries(config);
  result.isInstalled = plugins.some((p) => isPluginEntry(p));
  result.hasAntigravity = plugins.some((p) =>
    p.startsWith('opencode-antigravity-auth'),
  );

  // Check for providers
  const providers = config.provider as Record<string, unknown> | undefined;
  result.hasKimi = !!providers?.kimi;
  result.hasAnthropic = !!providers?.anthropic;
  result.hasCopilot = !!providers?.['github-copilot'];
  result.hasZaiPlan = !!providers?.['zai-coding-plan'];
  result.hasChutes = !!providers?.chutes;
  if (providers?.google) result.hasAntigravity = true;

  // Try to detect from lite config
  const { config: liteConfig } = parseConfig(getLiteConfig());
  if (liteConfig && typeof liteConfig === 'object') {
    const configObj = liteConfig as Record<string, unknown>;
    const presetName = configObj.preset as string;
    const presets = configObj.presets as Record<string, unknown>;
    const agents = presets?.[presetName] as
      | Record<string, { model?: string }>
      | undefined;

    if (agents) {
      const models = Object.values(agents)
        .map((a) => a?.model)
        .filter(Boolean);
      result.hasOpenAI = models.some((m) => m?.startsWith('openai/'));
      result.hasAnthropic = models.some((m) => m?.startsWith('anthropic/'));
      result.hasCopilot = models.some((m) => m?.startsWith('github-copilot/'));
      result.hasZaiPlan = models.some((m) => m?.startsWith('zai-coding-plan/'));
      result.hasOpencodeZen = models.some((m) => m?.startsWith('opencode/'));
      if (models.some((m) => m?.startsWith('google/'))) {
        result.hasAntigravity = true;
      }
      if (models.some((m) => m?.startsWith('chutes/'))) {
        result.hasChutes = true;
      }
    }

    if (configObj.tmux && typeof configObj.tmux === 'object') {
      const tmuxConfig = configObj.tmux as { enabled?: boolean };
      result.hasTmux = tmuxConfig.enabled === true;
    }
  }

  return result;
}
```

### 4. src/cli/install.ts (Install Command)
**References to plugin name**: Yes - GITHUB_REPO constant and messages
**References to agent names**: None
**References to config file paths**: Indirectly through imported functions

```typescript
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import {
  detectBackgroundSubagentsTarget,
  expandHomePath,
  getBackgroundSubagentsBlock,
  isBackgroundSubagentsEnabled,
  manualBackgroundSubagentsInstructions,
  writeBackgroundSubagentsBlock,
} from './background-subagents';
import {
  addPluginToOpenCodeConfig,
  addPluginToOpenCodeTuiConfig,
  detectCurrentConfig,
  disableDefaultAgents,
  enableLspByDefault,
  generateLiteConfig,
  getOpenCodePath,
  getOpenCodeVersion,
  isOpenCodeInstalled,
  warmOpenCodePluginCache,
  writeLiteConfig,
} from './config-manager';
import { CUSTOM_SKILLS, installCustomSkill } from './custom-skills';
import { getExistingLiteConfigPath } from './paths';
import type { ConfigMergeResult, InstallArgs, InstallConfig } from './types';

// Colors
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

const SYMBOLS = {
  check: `${GREEN}[ok]${RESET}`,
  cross: `${RED}[x]${RESET}`,
  arrow: `${BLUE}->${RESET}`,
  bullet: `${DIM}-${RESET}`,
  info: `${BLUE}[i]${RESET}`,
  warn: `${YELLOW}[!]${RESET}`,
  star: `${YELLOW}★${RESET}`,
};

const GITHUB_REPO = 'alvinunreal/oh-my-opencode-slim';
const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;

function printHeader(isUpdate: boolean): void {
  console.log();
  console.log(
    `${BOLD}oh-my-opencode-slim ${isUpdate ? 'Update' : 'Install'}${RESET}`,
  );
  console.log('='.repeat(30));
  console.log();
}

function printStep(step: number, total: number, message: string): void {
  console.log(`${DIM}[${step}/${total}]${RESET} ${message}`);
}

function printSuccess(message: string): void {
  console.log(`${SYMBOLS.check} ${message}`);
}

function printError(message: string): void {
  console.log(`${SYMBOLS.cross} ${RED}${message}${RESET}`);
}

function printInfo(message: string): void {
  console.log(`${SYMBOLS.info} ${message}`);
}

async function confirm(message: string, defaultYes = true): Promise<boolean> {
  const suffix = defaultYes ? ' (Y/n) ' : ' (y/N) ';
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const answer = (await rl.question(`${message}${suffix}`))
      .trim()
      .toLowerCase();
    if (!answer) return defaultYes;
    return answer === 'y' || answer === 'yes';
  } finally {
    rl.close();
  }
}

async function askToStarRepo(config: InstallConfig): Promise<void> {
  if (!config.promptForStar || config.dryRun || !process.stdin.isTTY) return;

  console.log();
  const shouldStar = await confirm(
    `${SYMBOLS.star} Star the repo on GitHub?`,
    true,
  );
  if (!shouldStar) return;

  try {
    const { execFileSync } = await import('node:child_process');
    execFileSync(
      'gh',
      ['api', '--silent', '--method', 'PUT', `/user/starred/${GITHUB_REPO}`],
      { stdio: 'ignore', timeout: 10_000 },
    );
    printSuccess('Thanks for starring! ★');
  } catch {
    printInfo(
      `Couldn't star automatically. You can star manually:\n  ${BLUE}${GITHUB_URL}${RESET}`,
    );
  }
}

async function checkOpenCodeInstalled(): Promise<{
  ok: boolean;
  version?: string;
  path?: string;
}> {
  const installed = await isOpenCodeInstalled();
  if (!installed) {
    printError('OpenCode is not installed on this system.');
    printInfo('Install it with:');
    console.log(
      `     ${BLUE}curl -fsSL https://opencode.ai/install | bash${RESET}`,
    );
    console.log();
    printInfo('Or if already installed, add it to your PATH:');
    console.log(`     ${BLUE}export PATH="$HOME/.local/bin:$PATH"${RESET}`);
    console.log(`     ${BLUE}export PATH="$HOME/.opencode/bin:$PATH"${RESET}`);
    return { ok: false };
  }
  const version = await getOpenCodeVersion();
  const path = getOpenCodePath();
  const detectedVersion = version ?? '';
  const pathInfo = path ? ` (${DIM}${path}${RESET})` : '';
  printSuccess(`OpenCode ${detectedVersion} detected${pathInfo}`);
  return { ok: true, version: version ?? undefined, path: path ?? undefined };
}

export function shouldPromptForBackgroundSubagents(
  config: InstallConfig,
): boolean {
  return Boolean(config.promptForStar && process.stdin.isTTY);
}

export async function configureBackgroundSubagents(
  config: InstallConfig,
): Promise<{ enabledNow: boolean; configuredTarget?: string }> {
  if (
    isBackgroundSubagentsEnabled(
      process.env.OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS,
    )
  ) {
    printSuccess(
      'OpenCode background subagents already enabled in environment',
    );
    return { enabledNow: true };
  }

  const target =
    config.backgroundSubagentsTarget !== undefined
      ? expandHomePath(config.backgroundSubagentsTarget)
      : detectBackgroundSubagentsTarget();

  if (config.backgroundSubagents === 'no') {
    printInfo('OpenCode background subagents are not enabled.');
    console.log(manualBackgroundSubagentsInstructions({ targetPath: target }));
    return { enabledNow: false };
  }

  if (!target) {
    printInfo('No safe shell startup file detected.');
    console.log(manualBackgroundSubagentsInstructions());
    return { enabledNow: false };
  }

  const block = getBackgroundSubagentsBlock(target);

  if (config.dryRun) {
    printInfo(
      'Dry run mode - background subagents block that would be written:',
    );
    console.log(`Target: ${target}`);
    console.log(`\n${block}\n`);
    return { enabledNow: false, configuredTarget: target };
  }

  if (config.backgroundSubagents === 'ask') {
    if (!shouldPromptForBackgroundSubagents(config)) {
      printInfo('Skipped background subagents shell configuration.');
      console.log(
        manualBackgroundSubagentsInstructions({ targetPath: target }),
      );
      return { enabledNow: false };
    }

    const shouldWrite = await confirm(
      `Enable OpenCode background subagents in ${target}?`,
      true,
    );
    if (!shouldWrite) {
      printInfo('Skipped background subagents shell configuration.');
      console.log(
        manualBackgroundSubagentsInstructions({ targetPath: target }),
      );
      return { enabledNow: false };
    }
  }

  try {
    writeBackgroundSubagentsBlock(target);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    printError(`Could not write background subagents shell config: ${message}`);
    printInfo('Add the setting manually instead:');
    console.log(manualBackgroundSubagentsInstructions({ targetPath: target }));
    return { enabledNow: false };
  }

  printSuccess(
    `Background subagents enabled ${SYMBOLS.arrow} ${DIM}${target}${RESET}`,
  );
  return { enabledNow: false, configuredTarget: target };
}

function handleStepResult(
  result: ConfigMergeResult,
  successMsg: string,
): boolean {
  if (!result.success) {
    printError(`Failed: ${result.error}`);
    return false;
  }
  printSuccess(
    `${successMsg} ${SYMBOLS.arrow} ${DIM}${result.configPath}${RESET}`,
  );
  return true;
}

async function runInstall(config: InstallConfig): Promise<number> {
  const detected = detectCurrentConfig();
  const isUpdate = detected.isInstalled;

  printHeader(isUpdate);

  let totalSteps = 7;
  if (config.installCustomSkills) totalSteps += 1;
  totalSteps += 1;

  let step = 1;

  printStep(step++, totalSteps, 'Checking OpenCode installation...');
  if (config.dryRun) {
    printInfo('Dry run mode - skipping OpenCode check');
  } else {
    const { ok } = await checkOpenCodeInstalled();
    if (!ok) return 1;
  }
  printStep(step++, totalSteps, 'Adding oh-my-opencode-slim plugin...');
  if (config.dryRun) {
    printInfo('Dry run mode - skipping plugin installation');
  } else {
    const pluginResult = await addPluginToOpenCodeConfig();
    if (!handleStepResult(pluginResult, 'Plugin added')) return 1;
  }

  printStep(step++, totalSteps, 'Adding TUI version badge...');
  if (config.dryRun) {
    printInfo('Dry run mode - skipping TUI plugin installation');
  } else {
    const tuiResult = await addPluginToOpenCodeTuiConfig();
    if (!tuiResult.success) {
      printInfo(`Skipped TUI badge: ${tuiResult.error}`);
    } else {
      handleStepResult(tuiResult, 'TUI badge added');
    }
  }

  printStep(step++, totalSteps, 'Warming OpenCode plugin cache...');
  if (config.dryRun) {
    printInfo('Dry run mode - skipping cache warm-up');
  } else {
    const cacheResult = await warmOpenCodePluginCache();
    if (cacheResult === null) {
      printInfo('Local development install - cache warm-up not required');
    } else if (!cacheResult.success) {
      printInfo(`Skipped cache warm-up: ${cacheResult.error}`);
    } else {
      handleStepResult(cacheResult, 'OpenCode cache warmed');
    }
  }

  printStep(step++, totalSteps, 'Disabling OpenCode default agents...');
  if (config.dryRun) {
    printInfo('Dry run mode - skipping agent disabling');
  } else {
    const agentResult = disableDefaultAgents();
    if (!handleStepResult(agentResult, 'Default agents disabled')) return 1;
  }

  printStep(step++, totalSteps, 'Enabling OpenCode LSP integration...');
  if (config.dryRun) {
    printInfo('Dry run mode - skipping LSP configuration');
  } else {
    const lspResult = enableLspByDefault();
    if (!handleStepResult(lspResult, 'LSP enabled')) return 1;
  }

  printStep(step++, totalSteps, 'Configuring OpenCode background subagents...');
  const backgroundSubagents = await configureBackgroundSubagents(config);

  printStep(step++, totalSteps, 'Writing oh-my-opencode-slim configuration...');
  if (config.dryRun) {
    const liteConfig = generateLiteConfig(config);
    printInfo('Dry run mode - configuration that would be written:');
    console.log(`\n${JSON.stringify(liteConfig, null, 2)}\n`);
  } else {
    const configPath = getExistingLiteConfigPath();
    const configExists = existsSync(configPath);

    if (configExists && !config.reset) {
      printInfo(
        `Configuration already exists at ${configPath}. ` +
          'Use --reset to overwrite.',
      );
    } else {
      const liteResult = writeLiteConfig(
        config,
        configExists ? configPath : undefined,
      );
      if (
        !handleStepResult(
          liteResult,
          configExists ? 'Config reset' : 'Config written',
        )
      )
        return 1;
    }
  }

  // Install custom skills if requested
  if (config.installCustomSkills) {
    printStep(step++, totalSteps, 'Installing custom skills...');
    if (config.dryRun) {
      printInfo('Dry run mode - would install custom skills:');
      for (const skill of CUSTOM_SKILLS) {
        printInfo(`  - ${skill.name}`);
      }
    } else {
      let customSkillsInstalled = 0;
      for (const skill of CUSTOM_SKILLS) {
        printInfo(`Installing ${skill.name}...`);
        if (installCustomSkill(skill)) {
          printSuccess(`Installed: ${skill.name}`);
          customSkillsInstalled++;
        } else {
          printInfo(`Skipped: ${skill.name} (already installed)`);
        }
      }
      const totalCustom = CUSTOM_SKILLS.length;
      printSuccess(
        `${customSkillsInstalled}/${totalCustom} custom skills processed`,
      );
    }
  }

  const statusMsg = isUpdate
    ? 'Configuration updated!'
    : 'Installation complete!';
  console.log(`${SYMBOLS.star} ${BOLD}${GREEN}${statusMsg}${RESET}`);
  console.log();
  console.log(`${BOLD}Next steps:${RESET}`);
  console.log();

  const configPath = getExistingLiteConfigPath();

  console.log('  1. Log in to the provider(s) you want to use:');
  console.log(`     ${BLUE}$ opencode auth login${RESET}`);
  console.log();
  console.log('  2. Refresh the models OpenCode can see:');
  console.log(`     ${BLUE}$ opencode models --refresh${RESET}`);
  console.log();
  console.log('  3. Review your generated config:');
  console.log(`     ${BLUE}${configPath}${RESET}`);
  console.log();
  console.log('  4. Start OpenCode:');
  if (backgroundSubagents.enabledNow) {
    console.log(`     ${BLUE}$ opencode${RESET}`);
  } else if (backgroundSubagents.configuredTarget) {
    console.log(
      `     ${BLUE}$ source ${backgroundSubagents.configuredTarget}${RESET}`,
    );
    console.log(`     ${BLUE}$ opencode${RESET}`);
    console.log(
      `     ${DIM}Or restart your terminal before running opencode.${RESET}`,
    );
  } else {
    console.log(
      `     ${BLUE}$ OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true opencode${RESET}`,
    );
  }
  console.log();
  console.log('  5. Verify the agents are responding:');
  console.log(`     ${BLUE}> ping all agents${RESET}`);
  console.log();

  const modelsInfo =
    config.preset && config.preset !== 'openai'
      ? `Generated OpenAI and OpenCode Go presets; ${config.preset} is active.`
      : 'Generated OpenAI and OpenCode Go presets; OpenAI is active by default.';
  console.log(`${modelsInfo}`);
  const altProviders = 'For the full configuration reference, see:';
  console.log(altProviders);
  const docsUrl =
    'https://github.com/alvinunreal/oh-my-opencode-slim/' +
    'blob/master/docs/configuration.md';
  console.log(`  ${BLUE}${docsUrl}${RESET}`);
  console.log();

  await askToStarRepo(config);

  return 0;
}

export async function install(args: InstallArgs): Promise<number> {
  const config: InstallConfig = {
    hasTmux: false,
    installCustomSkills: args.skills === 'yes',
    preset: args.preset,
    promptForStar: args.tui,
    dryRun: args.dryRun,
    reset: args.reset ?? false,
    backgroundSubagents: args.backgroundSubagents ?? 'no',
    backgroundSubagentsTarget: args.backgroundSubagentsTarget,
  };

  return runInstall(config);
}
```

### 5. src/cli/doctor.ts (Doctor Command)
**References to plugin name**: Yes - help text and OH_MY_OPENCODE_SLIM_PRESET env var
**References to agent names**: None
**References to config file paths**: Indirectly through imported functions

```typescript
import * as fs from 'node:fs';
import { z } from 'zod';
import { findPluginConfigPaths, mergePluginConfigs } from '../config/loader';
import { type PluginConfig, PluginConfigSchema } from '../config/schema';
import { stripJsonComments } from './config-io';

export type DoctorArgs = {
  json?: boolean;
  error?: string;
  help?: boolean;
};

export function parseDoctorArgs(args: string[]): DoctorArgs {
  const result: DoctorArgs = {};

  for (const arg of args) {
    if (arg === '--json') {
      result.json = true;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else {
      result.error ??= `Unknown doctor option: ${arg}`;
    }
  }

  return result;
}

export type ConfigCheckResult = {
  scope: 'user' | 'project';
  path: string | null;
  exists: boolean;
  ok: boolean;
  config?: PluginConfig;
  error?: {
    kind: 'invalid-json' | 'invalid-schema' | 'read-error';
    message: string;
    issues?: z.ZodIssue[];
  };
};

export type PresetCheckResult = {
  preset: string;
  ok: boolean;
  error?: { kind: 'missing-preset'; message: string };
};

export type DoctorResult = {
  ok: boolean;
  project: string;
  configs: ConfigCheckResult[];
  presetCheck?: PresetCheckResult;
};

function checkConfigFile(
  scope: 'user' | 'project',
  configPath: string | null,
): ConfigCheckResult {
  if (configPath === null) {
    return { scope, path: null, exists: false, ok: true };
  }

  try {
    const stat = fs.statSync(configPath);

    if (stat.size === 0) {
      return {
        scope,
        path: configPath,
        exists: true,
        ok: false,
        error: {
          kind: 'invalid-json',
          message: 'Empty file is not valid JSON',
        },
      };
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const rawConfig = JSON.parse(stripJsonComments(content));
    const parseResult = PluginConfigSchema.safeParse(rawConfig);

    if (!parseResult.success) {
      return {
        scope,
        path: configPath,
        exists: true,
        ok: false,
        error: {
          kind: 'invalid-schema',
          message: z.prettifyError(parseResult.error),
          issues: parseResult.error.issues,
        },
      };
    }

    return {
      scope,
      path: configPath,
      exists: true,
      ok: true,
      config: parseResult.data,
    };
  } catch (err) {
    if (err instanceof SyntaxError) {
      return {
        scope,
        path: configPath,
        exists: true,
        ok: false,
        error: {
          kind: 'invalid-json',
          message: err.message,
        },
      };
    } else if (
      err instanceof Error &&
      'code' in err &&
      (err as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return {
        scope,
        path: configPath,
        exists: false,
        ok: false,
        error: {
          kind: 'read-error',
          message: 'File was not found while reading',
        },
      };
    }

    return {
      scope,
      path: configPath,
      exists: true,
      ok: false,
      error: {
        kind: 'read-error',
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

function checkPreset(
  mergedConfig: PluginConfig,
): PresetCheckResult | undefined {
  const envPreset = process.env.OH_MY_OPENCODE_SLIM_PRESET;
  const presetName = envPreset || mergedConfig.preset;

  if (presetName === undefined) {
    return undefined;
  }

  if (!mergedConfig.presets?.[presetName]) {
    return {
      preset: presetName,
      ok: false,
      error: {
        kind: 'missing-preset',
        message: `Preset "${presetName}" not found in config`,
      },
    };
  }

  return { preset: presetName, ok: true };
}

function getMergedConfig(
  userConfig?: PluginConfig,
  projectConfig?: PluginConfig,
): PluginConfig {
  return projectConfig
    ? mergePluginConfigs(userConfig ?? {}, projectConfig)
    : (userConfig ?? {});
}

export function runDoctorCheck(cwd: string): DoctorResult {
  const { userConfigPath, projectConfigPath } = findPluginConfigPaths(cwd);

  const userCheck = checkConfigFile('user', userConfigPath);
  const projectCheck = checkConfigFile('project', projectConfigPath);

  const configs = [userCheck, projectCheck];

  const hasInvalidConfig = configs.some((c) => !c.ok);

  let presetCheckResult: DoctorResult['presetCheck'] | undefined;
  if (!hasInvalidConfig) {
    const mergedConfig = getMergedConfig(userCheck.config, projectCheck.config);
    presetCheckResult = checkPreset(mergedConfig);
  }

  return {
    ok:
      configs.every((c) => c.ok) &&
      (!presetCheckResult || presetCheckResult.ok),
    project: cwd,
    configs,
    presetCheck: presetCheckResult,
  };
}

export function formatHumanDoctorResult(result: DoctorResult): string {
  const lines: string[] = [];

  lines.push(`Project: ${result.project}`);
  lines.push('');

  for (const config of result.configs) {
    if (config.path === null) {
      lines.push(`[${config.scope}] No config file found`);
    } else {
      const status = config.ok ? '✓' : '✗';
      lines.push(`[${config.scope}] ${config.path} ${status}`);

      if (!config.ok && config.error) {
        if (config.error.kind === 'invalid-json') {
          lines.push(`  Invalid JSON: ${config.error.message}`);
        } else if (config.error.kind === 'invalid-schema') {
          lines.push('  Schema error:');
          for (const line of config.error.message.split('\n')) {
            lines.push(`  ${line}`);
          }
        } else if (config.error.kind === 'read-error') {
          lines.push(`  Read error: ${config.error.message}`);
        }
      }
    }
  }

  if (result.presetCheck) {
    lines.push('');
    const status = result.presetCheck.ok ? '✓' : '✗';
    lines.push(`[preset] ${result.presetCheck.preset} ${status}`);

    if (result.presetCheck.error) {
      lines.push(`  ${result.presetCheck.error.message}`);
    }
  }

  return lines.join('\n');
}

export function formatJsonDoctorResult(result: DoctorResult): string {
  return JSON.stringify(
    {
      ...result,
      configs: result.configs.map(({ config: _config, ...config }) => config),
    },
    null,
    2,
  );
}

export async function doctor(args: DoctorArgs): Promise<number> {
  if (args.help) {
    console.log(`Usage: oh-my-opencode-slim doctor [OPTIONS]

Options:
  --json              Print diagnostics as JSON
  -h, --help          Show this help message`);
    return 0;
  }

  if (args.error) {
    console.error(args.error);
    return 1;
  }

  const result = runDoctorCheck(process.cwd());

  if (args.json) {
    console.log(formatJsonDoctorResult(result));
  } else {
    console.log(formatHumanDoctorResult(result));
  }

  return result.ok ? 0 : 1;
}
```

### 6. src/cli/system.ts (System Checks)
**References to plugin name**: None
**References to agent names**: None
**References to config file paths**: None

```typescript
import { spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { crossSpawn } from '../utils/compat';

let cachedOpenCodePath: string | null = null;

function resolvePathCommand(command: string): string | null {
  try {
    const resolver = process.platform === 'win32' ? 'where' : 'which';
    const result = spawnSync(resolver, [command], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    if (result.status !== 0) {
      return null;
    }

    const resolved = result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);

    return resolved ?? null;
  } catch {
    return null;
  }
}

function canExecute(command: string, args: string[]): boolean {
  try {
    const result = spawnSync(command, args, {
      stdio: 'ignore',
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

function getOpenCodePaths(): string[] {
  const home = process.env.HOME || process.env.USERPROFILE || '';

  return [
    // PATH (try this first)
    'opencode',
    // User local installations (Linux & macOS)
    `${home}/.local/bin/opencode`,
    `${home}/.opencode/bin/opencode`,
    `${home}/bin/opencode`,
    // System-wide installations
    '/usr/local/bin/opencode',
    '/opt/opencode/bin/opencode',
    '/usr/bin/opencode',
    '/bin/opencode',
    // macOS specific
    '/Applications/OpenCode.app/Contents/MacOS/opencode',
    `${home}/Applications/OpenCode.app/Contents/MacOS/opencode`,
    // Homebrew (macOS & Linux)
    '/opt/homebrew/bin/opencode',
    '/home/linuxbrew/.linuxbrew/bin/opencode',
    `${home}/homebrew/bin/opencode`,
    // macOS user Library
    `${home}/Library/Application Support/opencode/bin/opencode`,
    // Snap (Linux)
    '/snap/bin/opencode',
    '/var/snap/opencode/current/bin/opencode',
    // Flatpak (Linux)
    '/var/lib/flatpak/exports/bin/ai.opencode.OpenCode',
    `${home}/.local/share/flatpak/exports/bin/ai.opencode.OpenCode`,
    // Nix (Linux/macOS)
    '/nix/store/opencode/bin/opencode',
    `${home}/.nix-profile/bin/opencode`,
    '/run/current-system/sw/bin/opencode',
    // Cargo (Rust toolchain)
    `${home}/.cargo/bin/opencode`,
    // npm/npx global
    `${home}/.npm-global/bin/opencode`,
    '/usr/local/lib/node_modules/opencode/bin/opencode',
    // Yarn global
    `${home}/.yarn/bin/opencode`,
    // PNPM
    `${home}/.pnpm-global/bin/opencode`,
  ];
}

export function resolveOpenCodePath(): string {
  if (cachedOpenCodePath) {
    return cachedOpenCodePath;
  }

  const pathOpenCodePath = resolvePathCommand('opencode');
  if (pathOpenCodePath) {
    cachedOpenCodePath = pathOpenCodePath;
    return pathOpenCodePath;
  }

  const paths = getOpenCodePaths();

  for (const opencodePath of paths) {
    if (opencodePath === 'opencode') continue;
    try {
      const stat = statSync(opencodePath);
      if (stat.isFile()) {
        cachedOpenCodePath = opencodePath;
        return opencodePath;
      }
    } catch {
      // Try next path
    }
  }

  // Fallback to 'opencode' and hope it's in PATH
  return 'opencode';
}

export async function isOpenCodeInstalled(): Promise<boolean> {
  const pathOpenCodePath = resolvePathCommand('opencode');

  if (pathOpenCodePath && canExecute(pathOpenCodePath, ['--version'])) {
    cachedOpenCodePath = pathOpenCodePath;
    return true;
  }

  const paths = getOpenCodePaths();

  for (const opencodePath of paths) {
    if (opencodePath === 'opencode') continue;
    try {
      const proc = crossSpawn([opencodePath, '--version'], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      await proc.exited;
      if (proc.exitCode === 0) {
        cachedOpenCodePath = opencodePath;
        return true;
      }
    } catch {
      // Try next path
    }
  }
  return false;
}

export async function isTmuxInstalled(): Promise<boolean> {
  try {
    const proc = crossSpawn(['tmux', '-V'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}

export async function getOpenCodeVersion(): Promise<string | null> {
  const opencodePath = resolveOpenCodePath();
  try {
    const proc = crossSpawn([opencodePath, '--version'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const outputPromise = proc.stdout();
    await proc.exited;
    if (proc.exitCode === 0) {
      return (await outputPromise).trim();
    }
  } catch {
    // Failed
  }
  return null;
}

export function getOpenCodePath(): string | null {
  const path = resolveOpenCodePath();
  return path === 'opencode' ? null : path;
}

export async function fetchLatestVersion(
  packageName: string,
): Promise<string | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
    if (!res.ok) return null;
    const data = (await res.json()) as { version: string };
    return data.version;
  } catch {
    return null;
  }
}
```

### 7. src/cli/types.ts (CLI Types)
**References to plugin name**: None
**References to agent names**: None
**References to config file paths**: None

```typescript
export type BooleanArg = 'yes' | 'no';
export type BackgroundSubagentsArg = 'ask' | 'yes' | 'no';

export interface InstallArgs {
  tui: boolean;
  skills?: BooleanArg;
  preset?: string;
  dryRun?: boolean;
  reset?: boolean;
  backgroundSubagents?: BackgroundSubagentsArg;
  backgroundSubagentsTarget?: string;
}

export interface OpenCodeConfig {
  plugin?: unknown[];
  provider?: Record<string, unknown>;
  agent?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface InstallConfig {
  hasTmux: boolean;
  installCustomSkills: boolean;
  preset?: string;
  promptForStar?: boolean;
  dryRun?: boolean;
  reset: boolean;
  backgroundSubagents: BackgroundSubagentsArg;
  backgroundSubagentsTarget?: string;
}

export interface ConfigMergeResult {
  success: boolean;
  configPath: string;
  error?: string;
}

export interface DetectedConfig {
  isInstalled: boolean;
  hasKimi: boolean;
  hasOpenAI: boolean;
  hasAnthropic?: boolean;
  hasCopilot?: boolean;
  hasZaiPlan?: boolean;
  hasAntigravity: boolean;
  hasChutes?: boolean;
  hasOpencodeZen: boolean;
  hasTmux: boolean;
}
```

---

## Key Observations for Planning

1. **Plugin Architecture**: The plugin uses a "lite config" system separate from OpenCode's main config, stored in `oh-my-opencode-slim.json/jsonc`

2. **Agent Disabling**: The `DEFAULT_OPENCODE_AGENTS_TO_DISABLE` constant in `config-io.ts` disables OpenCode's built-in agents: 'build', 'explore', 'general', 'plan'

3. **Config File Structure**:
   - Main OpenCode config: `opencode.json/jsonc`
   - Plugin-specific config: `oh-my-opencode-slim.json/jsonc`
   - TUI config: `tui.json/jsonc`

4. **Environment Variables**:
   - `OPENCODE_CONFIG_DIR`: Custom OpenCode config directory
   - `OPENCODE_TUI_CONFIG`: Custom TUI config path
   - `OH_MY_OPENCODE_SLIM_PRESET`: Override preset selection
   - `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS`: Enable background subagents

5. **Installation Flow**:
   - Check OpenCode installation
   - Add plugin to OpenCode config
   - Add TUI badge
   - Warm plugin cache
   - Disable default agents
   - Enable LSP
   - Configure background subagents
   - Write lite config
   - Install custom skills (optional)

This analysis provides the foundation for updating your implementation plan with accurate references to the oh-my-opencode-slim v2-beta architecture.