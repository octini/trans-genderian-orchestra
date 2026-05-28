/**
 * /setup-matt-pocock-skills command handler
 * Injects skill setup guidance and attempts Matt Pocock skills installation.
 */

import { log } from '../../utils/logger';
import { verifyPackageExists } from '../../utils/package-verify';

const COMMAND_NAME = 'setup-matt-pocock-skills';
const NPX_YES_FLAG = '--yes';
const PRIMARY_INSTALL_PACKAGE = '@opencode-ai/skills-installer';
const FALLBACK_INSTALL_PACKAGE = 'setup-matt-pocock-skills';
const PRIMARY_INSTALL_COMMAND = [
  'npx',
  NPX_YES_FLAG,
  PRIMARY_INSTALL_PACKAGE,
  'setup-matt-pocock-skills',
];
const FALLBACK_INSTALL_COMMAND = [
  'npx',
  NPX_YES_FLAG,
  FALLBACK_INSTALL_PACKAGE,
];
const MANUAL_INSTALL_URL = 'https://github.com/mattpocock/skills';

interface ExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
}

type ExecCommand = (cmd: string[], cwd?: string) => Promise<ExecResult>;
type PackageVerifier = (packageName: string) => Promise<boolean>;

interface InstallerAttempt {
  command: string[];
  result: ExecResult;
  skippedByVerification?: boolean;
}

async function execCommand(cmd: string[], cwd?: string): Promise<ExecResult> {
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

function commandText(command: string[]): string {
  return command.join(' ');
}

function normalizeCommand(command: string): string {
  return command.replace(/^\//, '');
}

function addResultDetails(lines: string[], result: ExecResult): void {
  lines.push(`  - Status: ${result.success ? 'succeeded' : 'failed'}`);

  const stdout = result.stdout.trim();
  const stderr = result.stderr.trim();

  if (stdout) {
    lines.push(`  - stdout: ${stdout}`);
  }
  if (stderr) {
    lines.push(`  - stderr: ${stderr}`);
  }
}

function packageVerificationFailure(packageName: string): ExecResult {
  const message = `Package verification failed for ${packageName}; skipped npx execution.`;
  log('[setup-skills] WARN: npx package verification failed', {
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
): Promise<InstallerAttempt> {
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

function installerResultText(attempts: InstallerAttempt[]): string {
  const lines = ['## Skill Installer Result'];

  if (attempts.length === 0) {
    lines.push('- Status: not run');
    lines.push(
      '- Reason: no project directory was available for the installer.',
    );
  } else {
    for (const [index, attempt] of attempts.entries()) {
      lines.push(`- Attempt ${index + 1}: \`${commandText(attempt.command)}\``);
      addResultDetails(lines, attempt.result);
    }
  }

  const installed = attempts.some((attempt) => attempt.result.success);

  if (installed) {
    lines.push(
      '- Next step: Matt Pocock skills setup completed; use the `skill` tool to load installed skills on demand.',
    );
  } else {
    lines.push('- Automatic setup did not complete.');
    lines.push(
      '- Next step: run `/skills` and select `/setup-matt-pocock-skills` from the popover.',
    );
    lines.push(`- Manual installation: ${MANUAL_INSTALL_URL}`);
  }

  return lines.join('\n');
}

export interface SetupSkillsHook {
  shouldInjectSetupReminder: boolean;
  getSetupReminder: () => string;
  registerCommand: (config: Record<string, unknown>) => void;
  handleCommandExecuteBefore: (
    input: { command: string; sessionID: string; arguments: string },
    output: { parts: Array<{ type: string; text?: string }> },
  ) => Promise<void>;
}

/**
 * Create the setup-matt-pocock-skills hook.
 * Returns a setup reminder string that can be injected into the orchestrator prompt.
 */
export function createSetupSkillsHook(
  projectDir?: string,
  executor: ExecCommand = execCommand,
  packageVerifier: PackageVerifier = verifyPackageExists,
): SetupSkillsHook {
  const getSetupReminder = () => `## Agent Skills Setup

The following skills are available for use via the \`skill\` tool:

**Tier 1 — Preloaded (always available):**
- \`using-superpowers\` — Skill workflow enforcement
- \`handoff\` — Create handoff documents

**Tier 2 — On-Demand per Role:**
- Orchestrator: dispatching-parallel-agents, brainstorming, trans-genderian-orchestra
- Planner: writing-plans, brainstorming, grill-with-docs, to-issues
- Researcher: codemap, zoom-out, grill-with-docs, diagnose, clonedeps
- Builder: tdd, agent-browser, prototype, simplify, diagnose
- Reviewer: requesting-code-review, receiving-code-review, simplify

To load a skill, call: \`skill({ name: "skill-name" })\`

**Tier 3 — Dynamic Recommendations:**
The orchestrator may suggest additional skills per task. Load them on-demand.`;

  return {
    shouldInjectSetupReminder: true,
    getSetupReminder,
    registerCommand: (opencodeConfig) => {
      const commandConfig = opencodeConfig.command as
        | Record<string, unknown>
        | undefined;
      if (commandConfig?.[COMMAND_NAME]) return;
      if (!opencodeConfig.command) opencodeConfig.command = {};
      (opencodeConfig.command as Record<string, unknown>)[COMMAND_NAME] = {
        template: 'Install Matt Pocock skills or show setup guidance',
        description:
          'Run the Matt Pocock skills installer with fallback and manual setup steps',
      };
    },
    handleCommandExecuteBefore: async (input, output) => {
      if (normalizeCommand(input.command) !== COMMAND_NAME) return;

      output.parts.length = 0;
      const messageParts = [getSetupReminder()];

      const attempts: InstallerAttempt[] = [];
      if (projectDir) {
        const primaryAttempt = await runVerifiedNpxCommand(
          PRIMARY_INSTALL_COMMAND,
          PRIMARY_INSTALL_PACKAGE,
          projectDir,
          executor,
          packageVerifier,
        );
        attempts.push(primaryAttempt);

        if (
          !primaryAttempt.result.success &&
          !primaryAttempt.skippedByVerification
        ) {
          const fallbackAttempt = await runVerifiedNpxCommand(
            FALLBACK_INSTALL_COMMAND,
            FALLBACK_INSTALL_PACKAGE,
            projectDir,
            executor,
            packageVerifier,
          );
          attempts.push(fallbackAttempt);
        }
      }
      messageParts.push(installerResultText(attempts));

      output.parts.push({ type: 'text', text: messageParts.join('\n\n') });
    },
  };
}

/**
 * Format a dynamic skill recommendation for inclusion in a delegation envelope.
 */
export function formatSkillRecommendation(recommendedSkills: string[]): string {
  if (recommendedSkills.length === 0) return '';
  const skills = recommendedSkills.map((s) => `\`${s}\``).join(', ');
  return `**Recommended skills:** ${skills}. Load with \`skill({ name: "<name>" })\` on first turn.`;
}
