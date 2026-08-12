import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

export const BACKGROUND_ENV_NAME = "OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS";
export const EXA_ENV_NAME = "OPENCODE_ENABLE_EXA";
const START_MARKER = "# >>> tgo env >>>";
const END_MARKER = "# <<< tgo env <<<";
// Older installs used a narrower block name; upsert must treat it as the same
// managed block so an upgrade replaces (not duplicates) it.
const LEGACY_START_MARKER = "# >>> tgo background subagents >>>";
const LEGACY_END_MARKER = "# <<< tgo background subagents <<<";

export type ShellKind = "zsh" | "bash" | "fish";

export function isBackgroundSubagentsEnabled(
  value: string | undefined
): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized !== "" && !["0", "false", "no", "off"].includes(normalized);
}

// The managed env block sets BOTH vars (background subagents + Exa websearch).
// Treat the block as enabled only when both are truthy; if a stale shell
// exports only one (e.g. BACKGROUND inherited, EXA absent), the block must be
// written so the missing flag isn't silently dropped.
export function isEnvBlockEnabled(env: NodeJS.ProcessEnv): boolean {
  return (
    isBackgroundSubagentsEnabled(env[BACKGROUND_ENV_NAME]) &&
    isBackgroundSubagentsEnabled(env[EXA_ENV_NAME])
  );
}

export function detectShellKind(shell: string | undefined): ShellKind | undefined {
  const name = shell?.split("/").at(-1);
  if (name === "zsh" || name === "bash" || name === "fish") return name;
  return undefined;
}

export function detectBackgroundSubagentsTarget(
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  const shell = detectShellKind(env.SHELL);
  const home = env.HOME || os.homedir();
  if (shell === "zsh") return path.join(home, ".zshrc");
  if (shell === "bash") return path.join(home, ".bashrc");
  if (shell === "fish") {
    const configHome = env.XDG_CONFIG_HOME || path.join(home, ".config");
    return path.join(configHome, "fish", "conf.d", "opencode-background-subagents.fish");
  }
  return undefined;
}

export function getBackgroundSubagentsBlock(targetPath: string): string {
  const isFish = targetPath.endsWith(".fish");
  const lines = isFish
    ? [
        `set -gx ${BACKGROUND_ENV_NAME} true`,
        `set -gx ${EXA_ENV_NAME} true`,
      ]
    : [
        `export ${BACKGROUND_ENV_NAME}=true`,
        `export ${EXA_ENV_NAME}=true`,
      ];
  return `${START_MARKER}\n${lines.join("\n")}\n${END_MARKER}`;
}

export function upsertBackgroundSubagentsBlock(
  content: string,
  block: string
): string {
  const start = content.indexOf(START_MARKER);
  const end = content.indexOf(END_MARKER);
  const legacyStart = content.indexOf(LEGACY_START_MARKER);
  const legacyEnd = content.indexOf(LEGACY_END_MARKER);
  if (start !== -1 && end !== -1 && end > start) {
    const afterEnd = end + END_MARKER.length;
    return `${content.slice(0, start)}${block}${content.slice(afterEnd)}`;
  }
  if (legacyStart !== -1 && legacyEnd !== -1 && legacyEnd > legacyStart) {
    const afterEnd = legacyEnd + LEGACY_END_MARKER.length;
    return `${content.slice(0, legacyStart)}${block}${content.slice(afterEnd)}`;
  }
  const separator =
    content.length > 0 && !content.endsWith("\n") ? "\n\n" : "";
  const prefix = content.length > 0 && content.endsWith("\n") ? "\n" : separator;
  return `${content}${prefix}${block}\n`;
}

export async function writeBackgroundSubagentsBlock(targetPath: string): Promise<void> {
  const block = getBackgroundSubagentsBlock(targetPath);
  let content = "";
  try {
    content = await fs.readFile(targetPath, "utf-8");
  } catch {
    // missing file — start fresh
  }
  const next = upsertBackgroundSubagentsBlock(content, block);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, next, "utf-8");
}
