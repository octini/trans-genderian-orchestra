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
  warning?: string;
}

async function ensureCompaction(configDir?: string): Promise<MagicContextConfigureResult["compaction"]> {
  if (!configDir) return "skipped";
  try {
    const merged = await mergeOpenCodeConfig(configDir, { compaction: true });
    return merged.action === "unchanged" ? "already-off" : "written";
  } catch {
    return "skipped";
  }
}

/**
 * Reconcile magic-context's historian to always follow the active preset's Dylan seat.
 *
 * Shape-preserving per R1:
 * - existing historian.opencode object → update its model/variant in place
 * - else existing flat historian.model → update flat in place
 * - else fresh → write nested { historian: { opencode: { model, variant } } }
 * Variant per R2: free-form string, copy verbatim when present; preserve existing when absent.
 * Atomic write; only writes when content would change (avoid churn).
 * `sync: "off"` or `skip` or missing dylan.model => skipped (no historian write).
 * `configDir` is optional: when provided, also ensures opencode compaction off; when absent, compaction is skipped.
 * Compaction stays installer-managed even with historianSync off.
 */
export async function configureMagicContext(opts: {
  configDir?: string;
  dylan?: { model?: string; variant?: string };
  sync?: "follow" | "off";
  skip?: boolean;
  homeDir?: string;
}): Promise<MagicContextConfigureResult> {
  const userConfigDir = path.join(opts.homeDir ?? os.homedir(), MAGIC_CONTEXT_CONFIG_DIR);
  const userConfig = path.join(userConfigDir, MAGIC_CONTEXT_CONFIG_FILE);

  // Skip / off handling
  if (opts.skip) {
    return { action: "skipped", configFile: userConfig, historianModel: undefined, compaction: "skipped" };
  }
  const sync = opts.sync ?? "follow";
  if (sync === "off") {
    const compaction = await ensureCompaction(opts.configDir);
    return { action: "skipped", configFile: userConfig, historianModel: undefined, compaction };
  }

  const dylanModel = typeof opts.dylan?.model === "string" && opts.dylan.model.length > 0 ? opts.dylan.model : undefined;
  const dylanVariant = typeof opts.dylan?.variant === "string" && opts.dylan.variant.length > 0 ? opts.dylan.variant : undefined;
  const hasDylanVariant = dylanVariant !== undefined;

  if (!dylanModel) {
    // No preset model to reconcile — historian and compaction are left untouched.
    return { action: "skipped", configFile: userConfig, historianModel: undefined, compaction: "skipped" };
  }

  const { data: existing, warning: readWarning, parseError } = await readExisting(userConfig);
  if (parseError) {
    const compaction = await ensureCompaction(opts.configDir);
    return {
      action: "skipped",
      configFile: userConfig,
      historianModel: undefined,
      compaction,
      ...(readWarning ? { warning: readWarning } : {}),
    };
  }
  const existingHistorian = existing?.historian as Record<string, unknown> | undefined;

  // auto_update defaults to ON in both deps (magic-context 0.41.4: !== false; AFT 0.55.1: ?? true).
  // TGO fills auto_update:true when the key is absent; never clobbers explicit false/true.
  const hasAutoUpdate = existing !== undefined && Object.prototype.hasOwnProperty.call(existing, "auto_update");
  const autoUpdateNeedsFill = !hasAutoUpdate;

  // Shape detection per R1
  const nested = existingHistorian?.opencode as Record<string, unknown> | undefined;
  const hasNested = nested !== null && typeof nested === "object" && !Array.isArray(nested);
  const hasFlatModel = typeof existingHistorian?.model === "string" && (existingHistorian.model as string).length > 0;

  let shape: "nested" | "flat" | "fresh";
  if (hasNested) shape = "nested";
  else if (hasFlatModel) shape = "flat";
  else shape = "fresh";

  let next: Record<string, unknown>;
  let action: MagicContextConfigureResult["action"] = "unchanged";
  let needsWrite = false;

  if (shape === "nested") {
    const curModel = typeof nested?.model === "string" ? (nested.model as string) : undefined;
    const curVariant = typeof nested?.variant === "string" ? (nested.variant as string) : undefined;
    const modelNeedsUpdate = curModel !== dylanModel;
    const variantNeedsUpdate = hasDylanVariant && curVariant !== dylanVariant;
    needsWrite = modelNeedsUpdate || variantNeedsUpdate || autoUpdateNeedsFill;
    if (needsWrite) {
      const nextOpencode: Record<string, unknown> = { ...(nested as Record<string, unknown>) };
      nextOpencode.model = dylanModel;
      if (hasDylanVariant) {
        nextOpencode.variant = dylanVariant!;
      }
      // when no dylan variant, preserve existing variant (do nothing)
      const nextHistorian: Record<string, unknown> = { ...(existingHistorian as Record<string, unknown>), opencode: nextOpencode };
      next = { ...(existing ?? {}), historian: nextHistorian };
      if (autoUpdateNeedsFill) next.auto_update = true;
      action = existing ? "updated" : "created";
    } else {
      next = existing as Record<string, unknown>;
      action = "unchanged";
    }
  } else if (shape === "flat") {
    const curModel = typeof existingHistorian?.model === "string" ? (existingHistorian.model as string) : undefined;
    const curVariant = typeof existingHistorian?.variant === "string" ? (existingHistorian.variant as string) : undefined;
    const modelNeedsUpdate = curModel !== dylanModel;
    const variantNeedsUpdate = hasDylanVariant && curVariant !== dylanVariant;
    needsWrite = modelNeedsUpdate || variantNeedsUpdate || autoUpdateNeedsFill;
    if (needsWrite) {
      const nextHistorian: Record<string, unknown> = { ...(existingHistorian as Record<string, unknown>) };
      nextHistorian.model = dylanModel;
      if (hasDylanVariant) {
        nextHistorian.variant = dylanVariant!;
      }
      // preserve existing variant when dylan has none
      next = { ...(existing ?? {}), historian: nextHistorian };
      if (autoUpdateNeedsFill) next.auto_update = true;
      action = existing ? "updated" : "created";
    } else {
      next = existing as Record<string, unknown>;
      action = "unchanged";
    }
  } else {
    // fresh → nested shape per R1
    needsWrite = true;
    const nextOpencode: Record<string, unknown> = {};
    nextOpencode.model = dylanModel;
    if (hasDylanVariant) nextOpencode.variant = dylanVariant!;
    const isExistingObject = typeof existing === "object" && existing !== null && !Array.isArray(existing);
    const isHistorianObject = typeof existingHistorian === "object" && existingHistorian !== null && !Array.isArray(existingHistorian);
    const safeExisting = isExistingObject ? (existing as Record<string, unknown>) : {};
    const safeHistorian = isHistorianObject ? (existingHistorian as Record<string, unknown>) : {};
    const nextHistorian: Record<string, unknown> = { ...safeHistorian, opencode: nextOpencode };
    next = { ...safeExisting, historian: nextHistorian };
    if (autoUpdateNeedsFill) next.auto_update = true;
    action = isExistingObject ? "updated" : "created";
  }

  // If no change needed, avoid churn
  if (!needsWrite) {
    const compaction = await ensureCompaction(opts.configDir);
    return {
      action: "unchanged",
      configFile: userConfig,
      historianModel: dylanModel,
      compaction,
      ...(readWarning ? { warning: readWarning } : {}),
    };
  }

  // Atomic write
  await fs.mkdir(userConfigDir, { recursive: true });
  const tmpFile = `${userConfig}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const content = `${JSON.stringify(next, null, 2)}\n`;
  await fs.writeFile(tmpFile, content, "utf-8");
  let writeWarning: string | undefined = readWarning;
  try {
    await fs.rename(tmpFile, userConfig);
  } catch {
    // Fallback: copy+unlink if rename across devices
    try {
      await fs.copyFile(tmpFile, userConfig);
      await fs.unlink(tmpFile).catch(() => {});
    } catch (copyErr) {
      const msg = `magic-context atomic write fallback failed at ${userConfig}: ${String(copyErr)}`;
      console.warn(msg);
      writeWarning = writeWarning ? `${writeWarning}; ${msg}` : msg;
      await fs.unlink(tmpFile).catch(() => {});
    }
  }

  const compaction = await ensureCompaction(opts.configDir);

  return {
    action,
    configFile: userConfig,
    historianModel: dylanModel,
    compaction,
    ...(writeWarning ? { warning: writeWarning } : {}),
  };
}

async function readExisting(
  file: string
): Promise<{ data: Record<string, unknown> | undefined; warning?: string; parseError?: boolean }> {
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf-8");
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT") {
      return { data: undefined };
    }
    const msg = `magic-context config read error at ${file}: ${String(err)} — skipping historian reconcile to preserve file`;
    console.warn(msg);
    return { data: undefined, warning: msg, parseError: true };
  }
  try {
    return { data: JSON.parse(raw) as Record<string, unknown> };
  } catch (parseErr) {
    const msg = `magic-context config parse error at ${file}: ${String(parseErr)} — skipping historian reconcile to preserve file`;
    console.warn(msg);
    return { data: undefined, warning: msg, parseError: true };
  }
}
