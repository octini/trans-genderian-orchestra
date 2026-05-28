import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  type BackgroundJobBoard,
  createInternalAgentTextPart,
} from '../../utils';
import { log } from '../../utils/logger';
import { verifyPackageExists } from '../../utils/package-verify';
import { createContextOrchestratorHook } from '../context-orchestrator';

const INIT_COMMAND_NAME = 'init';
const INIT_ALL_COMMAND_NAME = 'init:all';
const BEADS_INIT_COMMAND_NAME = 'beads:init';
const SKILLS_COMMAND_NAME = 'setup-matt-pocock-skills';
const NEW_STREAM_COMMAND_NAME = 'new-stream';
const CLOSE_STREAM_COMMAND_NAME = 'close-stream';
const NPX_YES_FLAG = '--yes';
const BEADS_PACKAGE_NAME = 'beads';
const PRIMARY_SKILLS_INSTALL_PACKAGE = '@opencode-ai/skills-installer';
const FALLBACK_SKILLS_INSTALL_PACKAGE = SKILLS_COMMAND_NAME;
const PRIMARY_SKILLS_INSTALL_COMMAND = [
  'npx',
  NPX_YES_FLAG,
  PRIMARY_SKILLS_INSTALL_PACKAGE,
  SKILLS_COMMAND_NAME,
];
const FALLBACK_SKILLS_INSTALL_COMMAND = [
  'npx',
  NPX_YES_FLAG,
  FALLBACK_SKILLS_INSTALL_PACKAGE,
];
const BEADS_INIT_COMMAND = ['npx', NPX_YES_FLAG, BEADS_PACKAGE_NAME, 'init'];
const MANUAL_SKILLS_INSTALL_URL = 'https://github.com/mattpocock/skills';

export interface AuditResults {
  git: boolean;
  gitRemote?: boolean;
  beads: boolean;
  skills: boolean;
}

export interface ExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
}

export interface StartupInitHook {
  auditResults: AuditResults | null;
  getAuditDialog: (results: AuditResults) => string;
  runAudit: () => Promise<AuditResults>;
  registerCommand: (config: Record<string, unknown>) => void;
  handleCommandExecuteBefore: (
    input: { command: string; sessionID: string; arguments: string },
    output: { parts: Array<{ type: string; text?: string }> },
  ) => Promise<void>;
}

type ExecCommand = (cmd: string[], cwd?: string) => Promise<ExecResult>;
type PackageVerifier = (packageName: string) => Promise<boolean>;

interface CommandAttempt {
  command: string[];
  result: ExecResult;
  skippedByVerification?: boolean;
}

interface StartupInitHookOptions {
  execCommand?: ExecCommand;
  templatePath?: string;
  packageVerifier?: PackageVerifier;
  contextOrchestrator?: ReturnType<typeof createContextOrchestratorHook>;
  backgroundJobBoard?: BackgroundJobBoard;
}

export async function execCommand(
  cmd: string[],
  cwd?: string,
): Promise<ExecResult> {
  try {
    const proc = Bun.spawn(cmd, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;
    return { success: exitCode === 0, stdout, stderr };
  } catch (e) {
    return { success: false, stdout: '', stderr: String(e) };
  }
}

export async function auditGit(
  projectDir: string,
  executor: ExecCommand = execCommand,
): Promise<boolean> {
  const result = await executor(
    ['git', 'rev-parse', '--is-inside-work-tree'],
    projectDir,
  );
  return result.success && result.stdout.trim() === 'true';
}

export function auditBeads(projectDir: string): boolean {
  return existsSync(path.join(projectDir, '.beads'));
}

export function auditSkills(projectDir: string): boolean {
  return existsSync(path.join(projectDir, '.skills'));
}

export async function runAudit(
  projectDir: string,
  executor: ExecCommand = execCommand,
): Promise<AuditResults> {
  const git = await auditGit(projectDir, executor);
  let gitRemote = false;
  if (git) {
    try {
      const remote = await executor(['git', 'remote', '-v'], projectDir);
      gitRemote = remote.success && remote.stdout.trim().length > 0;
    } catch {
      gitRemote = false;
    }
  }

  return {
    git,
    gitRemote,
    beads: auditBeads(projectDir),
    skills: auditSkills(projectDir),
  };
}

export function getAuditDialog(results: AuditResults): string {
  const missingItems: string[] = [];
  const commands: string[] = [];
  const gitRemoteNote =
    results.git && !results.gitRemote
      ? [
          '',
          '## ℹ️ GIT REMOTE NOT CONFIGURED',
          '- Tip: Use `git remote add origin <url>` if this project has a remote repository.',
        ]
      : [];

  if (!results.git) {
    missingItems.push(
      '- [ ] **Git Version Control**: Highly recommended for file integrity.',
    );
    commands.push(
      '- `/init` ──────────► Initialize Git & default AGENTS.md config',
    );
  }

  if (!results.beads) {
    missingItems.push(
      '- [ ] **Beads Issue Tracker**: The preferred local issue manager.',
    );
    commands.push(
      '- `/beads:init` ────► Initialize Beads local tracking database',
    );
  }

  if (!results.skills) {
    missingItems.push(
      "- [ ] **Matt Pocock Skills**: Necessary to run 'diagnose', 'tdd', and 'grill-with-docs'.",
    );
    commands.push(
      `- \`/${SKILLS_COMMAND_NAME}\` ──► Load and index Matt Pocock's core skills suite`,
    );
  }

  if (missingItems.length >= 2) {
    commands.unshift(
      '- `/init:all` ───► All-in-one setup: Initialize Git, Beads, and Matt Pocock skills',
    );
  }

  const header = [
    '┌─────────────────────────────────────────────────────────────┐',
    '│                                                             │',
    '│             🐝  DISPATCHER ENVIRONMENT AUDIT  🐝            │',
    '│                                                             │',
    '└─────────────────────────────────────────────────────────────┘',
    '',
    'I have performed a quick audit of your project workspace.',
  ];

  if (missingItems.length === 0) {
    return [
      ...header,
      '',
      '## ✅ ENVIRONMENT READY',
      'All audited development environments are present.',
      ...gitRemoteNote,
    ].join('\n');
  }

  return [
    ...header,
    'Please approve the initialization of missing development tooling:',
    '',
    '## ⚠️ MISSING ENVIRONMENTS DETECTED',
    ...missingItems,
    '',
    '## 🛠️ RECOMMENDED WORKFLOW',
    'Type or click one of the following commands to initialize your workspace:',
    ...commands,
    ...gitRemoteNote,
    '',
    '*Note: You can skip this dialog and proceed to standard instructions if you prefer an unmanaged workspace.*',
  ].join('\n');
}

function gitRemoteGuidance(): string[] {
  return [
    '- Git remote guidance: If this project has a remote repository (e.g., GitHub), configure it with:',
    '  git remote add origin <repository-url>',
    '  git push -u origin main',
  ];
}

function commandResultSummary(label: string, result: ExecResult): string[] {
  const lines = [`- ${label}: ${result.success ? 'succeeded' : 'failed'}.`];
  const stdout = result.stdout.trim();
  const stderr = result.stderr.trim();

  if (stdout) {
    lines.push(`  - stdout: ${stdout}`);
  }
  if (stderr) {
    lines.push(`  - stderr: ${stderr}`);
  }

  return lines;
}

function commandText(command: string[]): string {
  return command.join(' ');
}

function packageVerificationFailure(packageName: string): ExecResult {
  const message = `Package verification failed for ${packageName}; skipped npx execution.`;
  log('[startup-init] WARN: npx package verification failed', {
    packageName,
  });
  return { success: false, stdout: '', stderr: message };
}

async function runVerifiedNpxCommand(
  command: string[],
  packageName: string,
  projectDir: string,
  executor: ExecCommand,
  packageVerifier: PackageVerifier,
): Promise<CommandAttempt> {
  const exists = await packageVerifier(packageName);
  if (!exists) {
    return {
      command,
      result: packageVerificationFailure(packageName),
      skippedByVerification: true,
    };
  }

  return {
    command,
    result: await executor(command, projectDir),
  };
}

async function runSkillsInstaller(
  projectDir: string,
  executor: ExecCommand,
  packageVerifier: PackageVerifier,
): Promise<CommandAttempt[]> {
  const attempts: CommandAttempt[] = [];
  const primaryAttempt = await runVerifiedNpxCommand(
    PRIMARY_SKILLS_INSTALL_COMMAND,
    PRIMARY_SKILLS_INSTALL_PACKAGE,
    projectDir,
    executor,
    packageVerifier,
  );
  attempts.push(primaryAttempt);

  if (!primaryAttempt.result.success && !primaryAttempt.skippedByVerification) {
    const fallbackAttempt = await runVerifiedNpxCommand(
      FALLBACK_SKILLS_INSTALL_COMMAND,
      FALLBACK_SKILLS_INSTALL_PACKAGE,
      projectDir,
      executor,
      packageVerifier,
    );
    attempts.push(fallbackAttempt);
  }

  return attempts;
}

function skillsInstallerSummary(attempts: CommandAttempt[]): string[] {
  const lines = ['- Matt Pocock skills installer attempts:'];

  for (const attempt of attempts) {
    lines.push(
      ...commandResultSummary(commandText(attempt.command), attempt.result),
    );
  }

  if (!attempts.some((attempt) => attempt.result.success)) {
    lines.push(
      `- Next step: run \`/skills\` and select \`/${SKILLS_COMMAND_NAME}\` from the popover.`,
    );
    lines.push(`- Manual installation: ${MANUAL_SKILLS_INSTALL_URL}`);
  }

  return lines;
}

function defaultTemplatePath(): string {
  const sourceTemplatePath = path.join(
    import.meta.dir,
    '..',
    '..',
    '..',
    'templates',
    'AGENTS.md',
  );
  if (existsSync(sourceTemplatePath)) return sourceTemplatePath;

  return path.join(import.meta.dir, '..', 'templates', 'AGENTS.md');
}

async function seedAgentsFile(
  projectDir: string,
  templatePath: string,
): Promise<string> {
  const agentsPath = path.join(projectDir, 'AGENTS.md');
  if (existsSync(agentsPath)) {
    return 'AGENTS.md already exists; left unchanged.';
  }

  const projectName = path.basename(projectDir) || 'project';
  const template = await readFile(templatePath, 'utf8');
  await writeFile(
    agentsPath,
    template.replaceAll('{{project_name}}', projectName),
    'utf8',
  );
  return 'Created AGENTS.md from Dispatcher template.';
}

function registerCommandIfAbsent(
  opencodeConfig: Record<string, unknown>,
  commandName: string,
  template: string,
  description: string,
): void {
  const commandConfig = opencodeConfig.command as
    | Record<string, unknown>
    | undefined;
  if (commandConfig?.[commandName]) return;
  if (!opencodeConfig.command) opencodeConfig.command = {};
  (opencodeConfig.command as Record<string, unknown>)[commandName] = {
    template,
    description,
  };
}

function normalizeCommand(command: string): string {
  return command.replace(/^\//, '');
}

export function createStartupInitHook(
  projectDir: string,
  options: StartupInitHookOptions = {},
): StartupInitHook {
  const executor = options.execCommand ?? execCommand;
  const templatePath = options.templatePath ?? defaultTemplatePath();
  const packageVerifier = options.packageVerifier ?? verifyPackageExists;
  const contextOrchestrator =
    options.contextOrchestrator ??
    createContextOrchestratorHook(projectDir, new Map());

  const hook: StartupInitHook = {
    auditResults: null,
    getAuditDialog,
    runAudit: async () => {
      const results = await runAudit(projectDir, executor);
      hook.auditResults = results;
      return results;
    },
    registerCommand: (opencodeConfig) => {
      registerCommandIfAbsent(
        opencodeConfig,
        INIT_COMMAND_NAME,
        'Initialize Git and seed a default AGENTS.md if absent',
        'Initialize project version control and Dispatcher agent guidance',
      );
      registerCommandIfAbsent(
        opencodeConfig,
        INIT_ALL_COMMAND_NAME,
        'Initialize Git, Beads, and Matt Pocock skills in one step',
        'Initialize Git, Beads, and Matt Pocock skills in one step',
      );
      registerCommandIfAbsent(
        opencodeConfig,
        BEADS_INIT_COMMAND_NAME,
        'Initialize Beads local issue tracking',
        'Run npx --yes beads init in the project workspace',
      );
      registerCommandIfAbsent(
        opencodeConfig,
        NEW_STREAM_COMMAND_NAME,
        'Start a new Dispatcher work stream; optional label argument',
        'Reset stream metadata and background session reuse counters',
      );
      registerCommandIfAbsent(
        opencodeConfig,
        CLOSE_STREAM_COMMAND_NAME,
        'Close the current Dispatcher work stream',
        'Archive current stream metadata and clear pending session reuse state',
      );
    },
    handleCommandExecuteBefore: async (input, output) => {
      const command = normalizeCommand(input.command);
      if (
        command !== INIT_COMMAND_NAME &&
        command !== INIT_ALL_COMMAND_NAME &&
        command !== BEADS_INIT_COMMAND_NAME &&
        command !== NEW_STREAM_COMMAND_NAME &&
        command !== CLOSE_STREAM_COMMAND_NAME
      ) {
        return;
      }

      output.parts.length = 0;

      if (command === NEW_STREAM_COMMAND_NAME) {
        const label = await contextOrchestrator.startNewStream(
          input.arguments.trim() || undefined,
        );
        options.backgroundJobBoard?.reset();
        output.parts.push(
          createInternalAgentTextPart(
            [
              '## `/new-stream` RESULT',
              `- Current stream: \`${label ?? (input.arguments.trim() || 'default')}\``,
              '- Reset session reuse counters and background job tracking.',
            ].join('\n'),
          ),
        );
        return;
      }

      if (command === CLOSE_STREAM_COMMAND_NAME) {
        const summary = await contextOrchestrator.closeCurrentStream();
        options.backgroundJobBoard?.reset();
        output.parts.push(
          createInternalAgentTextPart(
            [
              '## `/close-stream` RESULT',
              `- Closed stream: \`${summary.label}\``,
              summary.createdAt ? `- Created at: \`${summary.createdAt}\`` : '',
              `- Closed at: \`${summary.closedAt}\``,
              '- Cleared pending session reuse state.',
            ]
              .filter(Boolean)
              .join('\n'),
          ),
        );
        return;
      }

      if (command === INIT_COMMAND_NAME) {
        const results = await hook.runAudit();
        const gitResult = await executor(['git', 'init'], projectDir);
        let agentsStatus: string;
        try {
          agentsStatus = await seedAgentsFile(projectDir, templatePath);
        } catch (error) {
          agentsStatus = `Failed to seed AGENTS.md: ${String(error)}`;
        }

        output.parts.push({
          type: 'text',
          text: [
            hook.getAuditDialog(results),
            '',
            '## `/init` RESULT',
            ...commandResultSummary('git init', gitResult),
            ...(gitResult.success ? gitRemoteGuidance() : []),
            `- ${agentsStatus}`,
          ].join('\n'),
        });
        return;
      }

      if (command === INIT_ALL_COMMAND_NAME) {
        const gitResult = await executor(['git', 'init'], projectDir);
        let agentsStatus: string;
        try {
          agentsStatus = await seedAgentsFile(projectDir, templatePath);
        } catch (error) {
          agentsStatus = `Failed to seed AGENTS.md: ${String(error)}`;
        }
        const beadsAttempt = await runVerifiedNpxCommand(
          BEADS_INIT_COMMAND,
          BEADS_PACKAGE_NAME,
          projectDir,
          executor,
          packageVerifier,
        );
        const skillsAttempts = await runSkillsInstaller(
          projectDir,
          executor,
          packageVerifier,
        );

        output.parts.push({
          type: 'text',
          text: [
            '## `/init:all` RESULT',
            ...commandResultSummary('git init', gitResult),
            ...(gitResult.success ? gitRemoteGuidance() : []),
            `- AGENTS.md seed: ${agentsStatus}`,
            ...commandResultSummary(
              commandText(beadsAttempt.command),
              beadsAttempt.result,
            ),
            ...skillsInstallerSummary(skillsAttempts),
          ].join('\n'),
        });
        return;
      }

      const beadsAttempt = await runVerifiedNpxCommand(
        BEADS_INIT_COMMAND,
        BEADS_PACKAGE_NAME,
        projectDir,
        executor,
        packageVerifier,
      );
      output.parts.push({
        type: 'text',
        text: [
          '## `/beads:init` RESULT',
          ...commandResultSummary(
            commandText(beadsAttempt.command),
            beadsAttempt.result,
          ),
        ].join('\n'),
      });
    },
  };

  return hook;
}
