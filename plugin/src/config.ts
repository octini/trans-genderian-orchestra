import { z } from "zod";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";

export const MAX_PROMPT_TOKENS = 1000;

// Environment for all $ -spawned bd/git subprocesses. Must merge process.env
// (NOT replace it): a stripped env drops PATH, so `bd init` fails with "exec:
// git: executable file not found in $PATH" and per-repo setup silently skips
// the Dolt store. Kept out of plugin.ts because a named export there broke
// opencode's plugin loader (verified headless).
export const BD_ENV = {
  ...process.env,
  BD_NON_INTERACTIVE: "1",
  HOME: os.homedir(),
} as const;

export const SEATS = [
  "bernstein",
  "horowitz",
  "nas",
  "dylan",
  "nirvana",
  "band-members",
] as const;

export const PRESET_NAMES = ["balanced", "cheap", "frontier"] as const;

const modelRef = z.object({
  model: z.string().min(1),
  variant: z.string().optional(),
});

const seatPreset = z.object({
  bernstein: modelRef,
  horowitz: modelRef,
  nas: modelRef,
  dylan: modelRef,
  nirvana: modelRef,
  "band-members": modelRef,
});

const boardConfig = z.object({
  enabled: z.boolean().default(true),
  refreshMs: z.number().int().positive().default(5000),
});

const concisionConfig = z.object({
  enabled: z.boolean().default(true),
  reinforcement: z.boolean().default(false),
});

const setupConfig = z.object({
  enabled: z.boolean().default(true),
  autoInstallBeads: z.boolean().default(true),
});

const watchdogConfig = z.object({
  enabled: z.boolean().default(true),
  wallClockMs: z.number().int().positive().default(20 * 60 * 1000),
  idleMs: z.number().int().positive().default(15 * 60 * 1000),
  checkMs: z.number().int().positive().default(10 * 1000),
});

export const tgoConfigSchema = z.object({
  preset: z.enum(PRESET_NAMES).default("balanced"),
  presets: z
    .object({
      balanced: seatPreset.optional(),
      cheap: seatPreset.optional(),
      frontier: seatPreset.optional(),
    })
    .optional(),
  register: z.enum(["concise", "natural"]).default("concise"),
  agentDir: z.string().optional(),
  board: boardConfig.optional().default(() => ({ enabled: true, refreshMs: 5000 })),
  concision: concisionConfig.optional().default(() => ({ enabled: true, reinforcement: false })),
  setup: setupConfig.optional().default(() => ({ enabled: true, autoInstallBeads: true })),
  watchdog: watchdogConfig.optional().default(() => ({
    enabled: true,
    wallClockMs: 20 * 60 * 1000,
    idleMs: 15 * 60 * 1000,
    checkMs: 10 * 1000,
  })),
});

export type TgoConfig = z.infer<typeof tgoConfigSchema>;

export function estimateTokens(text: string): number {
  const normalized = text.replace(/\s+/g, " ").trim();
  const words = normalized.length === 0 ? 0 : normalized.split(" ").length;
  const punctuation = (normalized.match(/[^\w\s]/g) ?? []).length;
  return Math.ceil(words + punctuation * 0.25);
}

export function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return content;
  return content.slice(end + 4);
}

export function estimatePromptTokens(content: string): number {
  return estimateTokens(stripFrontmatter(content));
}

export function assertPromptUnderBudget(
  content: string,
  fileName: string
): void {
  const tokens = estimatePromptTokens(content);
  if (tokens > MAX_PROMPT_TOKENS) {
    throw new Error(
      `${fileName}: ${tokens} tokens exceeds the ${MAX_PROMPT_TOKENS}-token seat-prompt budget`
    );
  }
}

export async function loadBuiltinPresets(): Promise<TgoConfig["presets"]> {
  const dir = fileURLToPath(new URL("../assets/presets.json", import.meta.url));
  return JSON.parse(await fs.readFile(dir, "utf-8"));
}

export async function loadTgoConfig(
  options: Record<string, unknown> | undefined
): Promise<TgoConfig> {
  const builtin = await loadBuiltinPresets();
  const parsed = tgoConfigSchema.parse({
    ...options,
    presets: { ...builtin, ...(options?.presets as object | undefined) },
  });
  return parsed;
}

export async function validateAgentDir(agentDir: string): Promise<number> {
  let checked = 0;
  const files = await fs.readdir(agentDir).catch(() => []);
  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const content = await fs.readFile(path.join(agentDir, file), "utf-8");
    assertPromptUnderBudget(content, file);
    checked++;
  }
  return checked;
}
