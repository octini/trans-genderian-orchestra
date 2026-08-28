import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { assertPromptUnderBudget, estimatePromptTokens } from "./config";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

export const HOUSE_STYLE_SLOT = "{{TGO_HOUSE_STYLE}}";
export const REGISTER_SLOT = "{{TGO_REGISTER}}";
export const AGENTS_MARKER_BEGIN = "<!-- TGO: thin always-on advice layer";
export const AGENTS_MARKER_END = "<!-- END TGO advice layer -->";

export const REGISTERS = ["concise", "natural"] as const;
export type Register = (typeof REGISTERS)[number];

export interface RenderedSeat {
  fileName: string;
  content: string;
}

export async function loadHouseStyle(): Promise<string> {
  const file = path.join(packageRoot, "assets", "house-style.md");
  return fs.readFile(file, "utf-8");
}

export async function loadAgentsFragment(): Promise<string> {
  const file = path.join(packageRoot, "assets", "AGENTS.fragment.md");
  return fs.readFile(file, "utf-8");
}

export function foldHouseStyle(
  template: string,
  houseStyle: string,
  register: Register = "concise"
): string {
  if (!template.includes(HOUSE_STYLE_SLOT)) return template;
  return template
    .replace(HOUSE_STYLE_SLOT, houseStyle.trim())
    .replace(new RegExp(REGISTER_SLOT, "g"), register);
}

export async function renderSeats(
  sourceDir: string,
  register: Register = "concise"
): Promise<RenderedSeat[]> {
  const houseStyle = await loadHouseStyle();
  const files = await fs.readdir(sourceDir).catch((err) => {
    console.warn(`tgo: renderSeats readdir failed: ${String(err)}`, { sourceDir });
    return [] as string[];
  });
  const seats: RenderedSeat[] = [];
  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const template = await fs.readFile(path.join(sourceDir, file), "utf-8");
    const content = foldHouseStyle(template, houseStyle, register);
    assertPromptUnderBudget(content, file);
    seats.push({ fileName: file, content });
  }
  return seats;
}

export async function buildSeatsTo(
  agentsDir: string,
  register: Register = "concise"
): Promise<RenderedSeat[]> {
  const sourceDir = path.join(packageRoot, "assets", "agents");
  const seats = await renderSeats(sourceDir, register);
  await fs.mkdir(agentsDir, { recursive: true });
  for (const seat of seats) {
    await fs.writeFile(path.join(agentsDir, seat.fileName), seat.content, "utf-8");
  }
  return seats;
}

export interface MergeResult {
  action: "created" | "appended" | "unchanged";
}

// opencode loads global config files in order config.json -> opencode.json ->
// opencode.jsonc and merges them with remeda mergeDeep, which REPLACES arrays.
// So the LAST file (opencode.jsonc) wins for the `plugin` array. TGO must write
// to opencode.jsonc when present (or always create it) so its plugin entry
// survives alongside AFT etc. See packages/opencode/src/config/config.ts
// `loadGlobal` in opencode 1.18.x.
export const GLOBAL_OPENCODE_FILE = "opencode.jsonc";
export const LEGACY_OPENCODE_FILE = "opencode.json";
export const TUI_OPENCODE_FILE = "tui.jsonc";
export const TUI_LEGACY_FILE = "tui.json";

export interface GlobalConfigMergeResult {
  action: "created" | "merged" | "unchanged";
  configFile: string;
  backedUp?: boolean;
}

export interface PluginRegisterResult {
  action: "added" | "unchanged";
  configFile: string;
}

export const PLUGIN_MODULE = "trans-genderian-orchestra";

export function hasPluginEntry(
  plugin: unknown,
  module: string
): boolean {
  if (!Array.isArray(plugin)) return false;
  return plugin.some((entry) => {
    if (typeof entry === "string") return entry === module;
    if (Array.isArray(entry)) return entry[0] === module;
    if (entry && typeof entry === "object") {
      const mod = (entry as { module?: unknown }).module;
      return mod === module;
    }
    return false;
  });
}

function pluginKey(entry: unknown): string | undefined {
  if (typeof entry === "string") return entry;
  if (Array.isArray(entry)) return typeof entry[0] === "string" ? entry[0] : undefined;
  if (entry && typeof entry === "object") {
    const mod = (entry as { module?: unknown }).module;
    return typeof mod === "string" ? mod : undefined;
  }
  return undefined;
}

export function unionPluginArrays(...lists: Array<unknown[] | unknown | undefined>): unknown[] {
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      const key = pluginKey(entry);
      if (key !== undefined && seen.has(key)) continue;
      if (key !== undefined) seen.add(key);
      out.push(entry);
    }
  }
  return out;
}

export async function registerGlobalPlugin(
  configDir: string,
  module = PLUGIN_MODULE
): Promise<PluginRegisterResult> {
  // Target the file opencode loads last (opencode.jsonc): it wins the merged
  // `plugin` array. Read BOTH global files so entries living only in the
  // legacy opencode.json (e.g. an earlier TGO registration) migrate forward.
  const dest = path.join(configDir, GLOBAL_OPENCODE_FILE);
  const legacyDest = path.join(configDir, LEGACY_OPENCODE_FILE);
  const { config: target, hadFile } = await readExistingConfig(dest);
  const { config: legacy } = await readExistingConfig(legacyDest);

  if (hadFile && hasPluginEntry(target.plugin, module)) {
    return { action: "unchanged", configFile: dest };
  }

  const plugin = unionPluginArrays(
    legacy.plugin,
    target.plugin,
    [module]
  );
  const next = { ...legacy, ...target, plugin };
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(dest, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
  return { action: "added", configFile: dest };
}

const TGO_GLOBAL_KEYS: Record<string, unknown> = {
  subagent_depth: 2,
  permission: { todowrite: "deny" },
};

export const DEFAULT_AGENT_NAME = "bernstein";

// The TUI plugin list is separate from the server plugin array: opencode's TUI
// loads external plugins only from tui.json/tui.jsonc (TuiConfig.pluginOrigins),
// never from opencode.jsonc. A plugin with a TUI slot (magic-context's sidebar,
// AFT's panels) must be registered in BOTH surfaces or its TUI half silently
// never mounts. magic-context's own wizard writes both (addPluginToOpenCodeConfig
// + addPluginToTuiConfig); TGO's installer must do the same.
export interface TuiPluginRegisterResult {
  action: "added" | "unchanged";
  configFile: string;
}

export async function registerTuiPlugin(
  configDir: string,
  module: string
): Promise<TuiPluginRegisterResult> {
  const dest = path.join(configDir, TUI_OPENCODE_FILE);
  const legacyDest = path.join(configDir, TUI_LEGACY_FILE);
  const { config: target, hadFile } = await readExistingConfig(dest);
  const { config: legacy } = await readExistingConfig(legacyDest);

  if (hadFile && hasPluginEntry(target.plugin, module)) {
    return { action: "unchanged", configFile: dest };
  }

  const plugin = unionPluginArrays(legacy.plugin, target.plugin, [module]);
  const next = { ...legacy, ...target, plugin };
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(dest, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
  return { action: "added", configFile: dest };
}

export const CONTEXT7_MCP_SERVER = "context7";
export const CONTEXT7_MCP_URL = "https://mcp.context7.com/mcp";

export interface McpServerRegisterResult {
  action: "added" | "unchanged";
  configFile: string;
}

// context7's own `npx ctx7 setup --opencode` is an interactive TUI (mode
// picker + browser OAuth login). Run under a non-interactive spawn it throws
// ExitPromptError and exits 0 while configuring NOTHING, so TGO's old install
// step "succeeded" silently and no MCP server ever landed. The hosted endpoint
// at https://mcp.context7.com/mcp answers MCP initialize + tools/list with no
// auth and no well-known OAuth config, so a plain remote entry is all opencode
// needs. This writes it into opencode.jsonc the same way registerGlobalPlugin
// handles the plugin array (union with the legacy file, never clobber).
export async function registerMcpServer(
  configDir: string,
  name: string,
  entry: Record<string, unknown>
): Promise<McpServerRegisterResult> {
  const dest = path.join(configDir, GLOBAL_OPENCODE_FILE);
  const legacyDest = path.join(configDir, LEGACY_OPENCODE_FILE);
  const { config: target } = await readExistingConfig(dest);
  const { config: legacy } = await readExistingConfig(legacyDest);
  const base = { ...legacy, ...target };
  const mcp = (base.mcp as Record<string, unknown>) ?? {};
  if (mcp[name] !== undefined) {
    return { action: "unchanged", configFile: dest };
  }
  const next = { ...base, mcp: { ...mcp, [name]: entry } };
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(dest, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
  return { action: "added", configFile: dest };
}

export function hasGlobalTgoKeys(config: Record<string, unknown>): boolean {
  if (config.subagent_depth !== 2) return false;
  if (config.default_agent !== DEFAULT_AGENT_NAME) return false;
  const permission = config.permission as Record<string, unknown> | undefined;
  return permission?.todowrite === "deny";
}

export function stripJsoncComments(text: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      out += c;
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      continue;
    }
    if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i++;
      out += " ";
      continue;
    }
    out += c;
  }
  return out.replace(/,\s*([}\]])/g, "$1");
}

async function readExistingConfig(
  dest: string
): Promise<{ config: Record<string, unknown>; hadFile: boolean; backedUp: boolean }> {
  let raw = "";
  try {
    raw = await fs.readFile(dest, "utf-8");
  } catch {
    return { config: {}, hadFile: false, backedUp: false };
  }
  try {
    return { config: JSON.parse(raw) as Record<string, unknown>, hadFile: true, backedUp: false };
  } catch {
    // not strict JSON — try a JSONC-tolerant parse before giving up
    try {
      const cleaned = stripJsoncComments(raw);
      return { config: JSON.parse(cleaned) as Record<string, unknown>, hadFile: true, backedUp: false };
    } catch {
      // genuinely unparseable — never clobber; back it up and start fresh
      await fs.rename(dest, `${dest}.bak`).catch(() => {});
      return { config: {}, hadFile: false, backedUp: true };
    }
  }
}

export async function mergeOpenCodeConfig(
  configDir: string,
  opts?: { compaction?: boolean }
): Promise<GlobalConfigMergeResult> {
  // Same reasoning as registerGlobalPlugin: opencode merges global config files
  // in order and the LAST one (opencode.jsonc) wins for arrays. Write TGO's
  // global keys into opencode.jsonc so they survive next to a plugin array
  // owned by AFT. Non-array keys merge fine from either file, so also carry
  // over the legacy opencode.json content.
  const dest = path.join(configDir, GLOBAL_OPENCODE_FILE);
  const legacyDest = path.join(configDir, LEGACY_OPENCODE_FILE);
  const { config: existing, hadFile, backedUp } = await readExistingConfig(dest);
  const { config: legacy } = await readExistingConfig(legacyDest);
  const base = { ...legacy, ...existing };
  const wantCompaction = opts?.compaction === true;
  const compactionOff =
    (base.compaction as Record<string, unknown> | undefined)?.auto === false &&
    (base.compaction as Record<string, unknown> | undefined)?.prune === false;
  if (hadFile && hasGlobalTgoKeys(base) && (!wantCompaction || compactionOff)) {
    return { action: "unchanged", configFile: dest };
  }
  const next: Record<string, unknown> = {
    ...base,
    default_agent: DEFAULT_AGENT_NAME,
    subagent_depth: TGO_GLOBAL_KEYS.subagent_depth,
    permission: {
      ...((base.permission as Record<string, unknown>) ?? {}),
      todowrite: "deny",
    },
  };
  if (wantCompaction) {
    next.compaction = {
      ...((base.compaction as Record<string, unknown>) ?? {}),
      auto: false,
      prune: false,
    };
  }
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(dest, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
  return { action: hadFile ? "merged" : "created", configFile: dest, backedUp };
}

export async function mergeAgentsFragment(configDir: string): Promise<MergeResult> {
  const fragment = await loadAgentsFragment();
  const dest = path.join(configDir, "AGENTS.md");

  let existing = "";
  try {
    existing = await fs.readFile(dest, "utf-8");
  } catch {
    // no existing file
  }

  if (existing.includes(AGENTS_MARKER_BEGIN)) {
    return { action: "unchanged" };
  }

  const wrapped = `${fragment.trim()}\n${AGENTS_MARKER_END}\n`;
  const next = existing.trimEnd() ? `${existing.trimEnd()}\n\n${wrapped}` : wrapped;
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(dest, next, "utf-8");
  return { action: existing ? "appended" : "created" };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const outDir = (() => {
    const idx = argv.indexOf("--outDir");
    return idx !== -1 && argv[idx + 1] ? argv[idx + 1] : undefined;
  })();

  const sourceDir = path.join(packageRoot, "assets", "agents");
  const seats = await renderSeats(sourceDir);

  if (outDir) {
    await buildSeatsTo(outDir);
    console.log(`Built ${seats.length} seat prompts to ${outDir}`);
  } else {
    for (const seat of seats) {
      console.log(
        `${seat.fileName}: ${estimatePromptTokens(seat.content)} tokens (rendered)`
      );
    }
    console.log(`\n${seats.length} seat prompts render under budget. Pass --outDir <dir> to write them.`);
  }

  // dual-package emit: server + TUI (single-install: one npm package exposes both surfaces)
  const distDir = path.join(packageRoot, "dist");
  await fs.mkdir(distDir, { recursive: true });
  const externals = ["solid-js", "@opentui/solid", "@opentui/core", "@opencode-ai/plugin", "@opencode-ai/plugin/*"];
  const serverEntry = path.join(packageRoot, "src/plugin.ts");
  const tuiEntry = path.join(packageRoot, "src/sidebar/tui.tsx");
  const doBuild = async (entry: string, outfile: string) => {
    const result = await Bun.build({
      entrypoints: [entry],
      outdir: distDir,
      target: "node",
      format: "esm",
      external: externals,
    });
    if (!result.success) {
      console.error(result.logs);
      throw new Error(`build failed for ${entry}`);
    }
    // Bun emits based on entry basename (plugin.js / tui.js); rename to stable dist names.
    const emittedBase = path.basename(entry).replace(/\.(ts|tsx|js)$/, ".js");
    const emittedPath = path.join(distDir, emittedBase);
    if (emittedPath !== outfile) {
      // Prefer output path from build result when available.
      const builtPath = (result.outputs as unknown as Array<{ path: string }> | undefined)?.[0]?.path;
      const srcPath = builtPath ?? emittedPath;
      try {
        await fs.rename(srcPath, outfile);
      } catch {
        // Fallback: if rename race, copy then unlink
        try {
          await fs.copyFile(srcPath, outfile);
          await fs.unlink(srcPath).catch(() => {});
        } catch {}
      }
    }
    console.log(`Built ${path.relative(packageRoot, outfile)}`);
  };
  await doBuild(serverEntry, path.join(distDir, "server.js"));
  await doBuild(tuiEntry, path.join(distDir, "tui.js"));

  // lean asserts: server must not contain TUI slots, TUI must not contain chat hooks
  const serverText = await fs.readFile(path.join(distDir, "server.js"), "utf-8");
  if (serverText.includes("slots.register")) throw new Error("lean violation: server.js contains slots.register");
  const tuiText = await fs.readFile(path.join(distDir, "tui.js"), "utf-8");
  if (tuiText.includes("experimental.chat")) throw new Error("lean violation: tui.js contains experimental.chat");
  console.log("Lean check: server 0 slots, tui 0 experimental.chat OK");
}
