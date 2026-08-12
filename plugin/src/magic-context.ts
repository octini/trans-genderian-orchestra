import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { mergeOpenCodeConfig } from "./build";

export const MAGIC_CONTEXT_CONFIG_DIR = path.join(".config", "cortexkit");
export const MAGIC_CONTEXT_CONFIG_FILE = "magic-context.jsonc";
export const MAGIC_CONTEXT_SCHEMA_URL =
  "https://raw.githubusercontent.com/cortexkit/magic-context/master/assets/magic-context.schema.json";

export interface MagicContextConfigureResult {
  action: "created" | "updated" | "unchanged" | "skipped";
  configFile: string;
  historianModel: string | undefined;
  compaction: "written" | "already-off" | "skipped";
}

/**
 * Write magic-context's user-level config so the plugin actually functions.
 *
 * magic-context needs two things beyond the plugin entry to do anything:
 *   1. `historian.model` in its user config — without it the plugin loads but
 *      historian runs fail and nothing is summarized (README "Manual setup").
 *   2. opencode built-in compaction disabled — magic-context DISABLES ITSELF on
 *      conflict when `compaction.auto`/`prune` are on (its conflict-detector
 *      defaults auto:true when the key is absent).
 *
 * Both are fully non-interactive (the interactive `npx @cortexkit/magic-context
 * setup` TUI only *picks* the historian model — we already know it from the
 * active preset's Dylan seat), so the installer can configure magic-context
 * end to end.
 *
 * `skip` returns { action: "skipped", compaction: "skipped" } without writing.
 */
export async function configureMagicContext(opts: {
  configDir: string;
  historianModel: string | undefined;
  skip?: boolean;
  homeDir?: string;
}): Promise<MagicContextConfigureResult> {
  const userConfigDir = path.join(opts.homeDir ?? os.homedir(), MAGIC_CONTEXT_CONFIG_DIR);
  const userConfig = path.join(userConfigDir, MAGIC_CONTEXT_CONFIG_FILE);

  if (opts.skip) {
    return { action: "skipped", configFile: userConfig, historianModel: undefined, compaction: "skipped" };
  }

  const existing = await readExisting(userConfig);
  const existingHistorian = existing?.historian as Record<string, unknown> | undefined;
  const currentModel = typeof existingHistorian?.model === "string" ? existingHistorian.model : undefined;
  const hasModel = typeof currentModel === "string" && currentModel.length > 0;
  // Never clobber a model the user chose interactively; only fill a missing one.
  const nextModel = hasModel ? currentModel : opts.historianModel;

  if (!existing || !hasModel) {
    if (!nextModel) {
      // No preset model to write and no existing one — leave config alone.
      return { action: "skipped", configFile: userConfig, historianModel: undefined, compaction: "skipped" };
    }
    const next: Record<string, unknown> = existing ?? {};
    next.historian = { ...existingHistorian, model: nextModel };
    await fs.mkdir(userConfigDir, { recursive: true });
    await fs.writeFile(userConfig, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
  }

  // Compaction must be off for magic-context to pass its own conflict gate.
  const merged = await mergeOpenCodeConfig(opts.configDir, { compaction: true });
  const compaction: MagicContextConfigureResult["compaction"] =
    merged.action === "unchanged" ? "already-off" : "written";

  return {
    action: !existing ? "created" : hasModel ? "unchanged" : "updated",
    configFile: userConfig,
    historianModel: nextModel,
    compaction,
  };
}

async function readExisting(
  file: string
): Promise<Record<string, unknown> | undefined> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export function historianModelFromPreset(
  presets: Record<string, Record<string, { model?: string }>> | undefined,
  preset = "balanced"
): string | undefined {
  return presets?.[preset]?.dylan?.model;
}
