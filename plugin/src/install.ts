import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";
import { loadTgoConfig, resolveAgentsDir, validateAgentDir } from "./config";
import {
  buildSeatsTo,
  CONTEXT7_MCP_SERVER,
  CONTEXT7_MCP_URL,
  GLOBAL_OPENCODE_FILE,
  mergeAgentsFragment,
  mergeOpenCodeConfig,
  registerGlobalPlugin,
  registerMcpServer,
  registerTuiPlugin,
  PLUGIN_MODULE,
} from "./build";
import {
  checkDependencies,
  defaultDepContext,
  installMissing,
  runShellCommand,
  type DepMode,
  type DepStatus,
} from "./deps";
import {
  detectBackgroundSubagentsTarget,
  isEnvBlockEnabled,
  writeBackgroundSubagentsBlock,
} from "./background";
import {
  configureMagicContext,
  historianModelFromPreset,
  type MagicContextConfigureResult,
} from "./magic-context";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const DEFAULTS = {
  configDir: path.join(os.homedir(), ".config", "opencode"),
  agentsSubdir: "agent",
};

const SKILLS_DIR = path.join("assets", "skills");
const SETUP_SKILL_NAME = "tgo-setup";

export interface SkillCopyResult {
  name: string;
  action: "created" | "unchanged";
}

export interface InstallTarget {
  configDir: string;
  agentsDir: string;
}

export interface InstallOptions {
  configDir?: string;
  agentsSubdir?: string;
  deps?: DepMode;
  register?: string | true | false;
  backgroundSubagents?: boolean;
}

export interface InstallReport extends InstallTarget {
  seats: number;
  agentsMerge: string;
  globalMerge: string;
  globalMergeBackedUp: boolean;
  style: string;
  plugin: string | undefined;
  pluginAction: "added" | "unchanged" | undefined;
  backgroundSubagents: string | undefined;
  deps: DepStatus[];
  depsInstalled: string[];
  setupSkill: "created" | "unchanged";
  skills: SkillCopyResult[];
  magicContext: MagicContextConfigureResult | undefined;
  context7Registered: boolean | undefined;
}

export function resolveInstallTarget(overrides?: {
  configDir?: string;
  agentsSubdir?: string;
}): InstallTarget {
  const configDir = overrides?.configDir ?? DEFAULTS.configDir;
  const agentsDir = resolveAgentsDir({ configDir, agentsSubdir: overrides?.agentsSubdir });
  return { configDir, agentsDir };
}

export async function copySetupSkill(configDir: string): Promise<"created" | "unchanged"> {
  const src = path.join(packageRoot, SKILLS_DIR, SETUP_SKILL_NAME, "SKILL.md");
  const dest = path.join(configDir, "skills", SETUP_SKILL_NAME, "SKILL.md");
  try {
    await fs.access(dest);
    return "unchanged";
  } catch {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
    return "created";
  }
}

export async function copySkillBundle(configDir: string): Promise<SkillCopyResult[]> {
  const sourceDir = path.join(packageRoot, SKILLS_DIR);
  const entries = await fs.readdir(sourceDir, { withFileTypes: true }).catch(() => []);
  const results: SkillCopyResult[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const src = path.join(sourceDir, entry.name, "SKILL.md");
    const dest = path.join(configDir, "skills", entry.name, "SKILL.md");
    try {
      await fs.access(dest);
      results.push({ name: entry.name, action: "unchanged" });
      continue;
    } catch {
      // not present — copy below
    }
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
    results.push({ name: entry.name, action: "created" });
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export async function install(overrides?: InstallOptions): Promise<InstallReport> {
  const target = resolveInstallTarget(overrides);
  await fs.mkdir(target.configDir, { recursive: true });

  const srcPresets = path.join(packageRoot, "assets", "presets.json");
  const config = await loadTgoConfig({
    preset: "balanced",
    presets: JSON.parse(await fs.readFile(srcPresets, "utf-8")),
  });

  const seats = await buildSeatsTo(target.agentsDir, "default");

  const merged = await mergeAgentsFragment(target.configDir);

  const globalMerge = await mergeOpenCodeConfig(target.configDir);

  const setupSkill = await copySetupSkill(target.configDir);

  const skills = await copySkillBundle(target.configDir);

  const deps = await checkDependencies(defaultDepContext(target.configDir));
  let depsInstalled: string[] = [];
  if (overrides?.deps === "skip") {
    // dependency layer intentionally left alone
  } else if (overrides?.deps === "check") {
    // report-only; no installs run
  } else {
    depsInstalled = await installMissing(deps, runShellCommand);
  }

  // magic-context's own setup is interactive, so the dep step only registers the
  // plugin entry here. opencode then installs the package and loads it.
  // Skipped with --no-register (which means "don't touch the plugin array").
  // Beyond the plugin entry magic-context needs a configured historian model
  // (else historian runs fail and nothing is summarized) AND opencode's built-in
  // compaction off (else magic-context disables itself on conflict). We write
  // both here non-interactively — the interactive `setup` TUI only picks the
  // historian model, which we already know from the active preset.
  const magicContext = deps.find((d) => d.name === "magic-context");
  let magicContextConfig: MagicContextConfigureResult | undefined;
  const magicContextWanted =
    overrides?.register !== false &&
    magicContext &&
    (magicContext.present || depsInstalled.includes("magic-context"));
  if (magicContextWanted) {
    await registerGlobalPlugin(
      target.configDir,
      "@cortexkit/opencode-magic-context@latest"
    );
    // The sidebar is a TUI slot: opencode's TUI loads plugins only from
    // tui.json/tui.jsonc, so the plugin must be registered on BOTH surfaces or
    // the sidebar never mounts even though the server half (ctx_* tools, the
    // historian) works. Verified: MC's own wizard writes both files.
    await registerTuiPlugin(
      target.configDir,
      "@cortexkit/opencode-magic-context@latest"
    );
    magicContextConfig = await configureMagicContext({
      configDir: target.configDir,
      historianModel: historianModelFromPreset(
        config.presets as Record<string, Record<string, { model?: string }>>,
        config.preset
      ),
    });
  }

  // context7's interactive `npx ctx7 setup` can't run under the installer, so
  // register the hosted remote MCP server directly (server answers initialize +
  // tools/list with no auth). Only when the dep is present or being installed,
  // and skipped with --no-register (same contract as magic-context above).
  const context7 = deps.find((d) => d.name === "context7");
  let context7Registered: boolean | undefined;
  if (
    overrides?.register !== false &&
    context7 &&
    (context7.present || depsInstalled.includes("context7"))
  ) {
    await registerMcpServer(target.configDir, CONTEXT7_MCP_SERVER, {
      type: "remote",
      url: CONTEXT7_MCP_URL,
    });
    context7Registered = true;
  }

  await validateAgentDir(target.agentsDir);

  // Self-registration is ON by default: a blank-slate opencode install must end
  // up with the plugin actually loaded, or the seats/skills/deps are inert.
  // Opt out with --no-register (e.g. when wiring the plugin manually).
  let plugin: string | undefined;
  let pluginAction: "added" | "unchanged" | undefined;
  const registerModule =
    overrides?.register === false
      ? undefined
      : typeof overrides?.register === "string"
        ? overrides.register
        : PLUGIN_MODULE;
  if (registerModule) {
    const registered = await registerGlobalPlugin(target.configDir, registerModule);
    await registerTuiPlugin(target.configDir, registerModule);
    plugin = registerModule;
    pluginAction = registered.action;
  }

  // nirvana's parallel lens spawns need background subagents. Unlike the other
  // deps there is no config key or plugin-factory hook that can set it (opencode
  // snapshots RuntimeFlags at startup), so the only automated path is writing
  // the export into the user's shell startup file — same approach as
  // oh-my-opencode-slim. Idempotent marker block; opt out with --no-bg.
  let backgroundSubagents: string | undefined;
  if (overrides?.backgroundSubagents !== false) {
    // The managed block sets BOTH vars. Only short-circuit when both are
    // already enabled; if e.g. a stale shell exports BACKGROUND but not EXA,
    // skipping the write would silently drop the websearch/Exa enable flag
    // (test-7: "Model tried to call unavailable tool 'websearch'").
    const alreadyEnabled = isEnvBlockEnabled(process.env);
    if (alreadyEnabled) {
      backgroundSubagents = "already-in-env";
    } else {
      const target = detectBackgroundSubagentsTarget();
      if (target) {
        await writeBackgroundSubagentsBlock(target);
        backgroundSubagents = `wrote ${target}`;
      }
    }
  }

  return {
    ...target,
    seats: seats.length,
    agentsMerge: merged.action,
    globalMerge: globalMerge.action,
    globalMergeBackedUp: globalMerge.backedUp ?? false,
    style: config.style?.card ?? "default",
    plugin,
    pluginAction,
    backgroundSubagents,
    deps,
    depsInstalled,
    setupSkill,
    skills,
    magicContext: magicContextConfig,
    context7Registered,
  };
}

function depLine(status: DepStatus): string {
  const state = status.present ? "present" : "MISSING";
  return `${status.name.padEnd(14)} ${state.padEnd(8)} ${status.summary}`;
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const arg = (name: string) => {
    const idx = argv.indexOf(name);
    return idx !== -1 && argv[idx + 1] ? argv[idx + 1] : undefined;
  };
  const depsMode = (arg("--deps") ?? "auto") as DepMode;
  const registerValue = argv.includes("--register") ? arg("--register") : undefined;
  const register =
    argv.includes("--no-register")
      ? false
      : registerValue !== undefined && !registerValue.startsWith("--")
        ? registerValue
        : true;
  const backgroundSubagents = argv.includes("--no-bg") ? false : undefined;
  const report = await install({
    configDir: arg("--configDir"),
    agentsSubdir: arg("--agentsSubdir"),
    deps: depsMode,
    register,
    backgroundSubagents,
  });
  console.log(`TGO config installed to ${report.configDir}`);
  console.log(`Seat prompts installed to ${report.agentsDir} (${report.seats} files)`);
  console.log(`AGENTS.md fragment: ${report.agentsMerge}`);
  console.log(`Global config (subagent_depth: 2 + todowrite deny): ${report.globalMerge}`);
  if (report.plugin && report.pluginAction) {
    console.log(`Plugin self-registration: ${report.plugin} → ${report.pluginAction} in ${GLOBAL_OPENCODE_FILE}`);
  }
  if (report.globalMergeBackedUp) {
    console.log(`WARNING: existing ${GLOBAL_OPENCODE_FILE} was not valid JSON/JSONC — backed up to ${GLOBAL_OPENCODE_FILE}.bak and a fresh fragment written. Review the backup.`);
  }
  console.log(`Active preset: balanced · style: ${report.style}`);
  console.log(`Setup skill: ${report.setupSkill} → ${path.join(report.configDir, "skills", SETUP_SKILL_NAME, "SKILL.md")}`);
  const created = report.skills.filter((s) => s.action === "created");
  console.log(`Skill bundle: ${report.skills.length} skills (${created.length} created, ${report.skills.length - created.length} unchanged) → ${path.join(report.configDir, "skills")}`);
  if (report.magicContext) {
    const mc = report.magicContext;
    console.log(
      `Magic Context: config ${mc.action} → ${mc.configFile} (historian model: ${mc.historianModel ?? "none"}) · opencode compaction ${mc.compaction} · registered server+TUI plugin`
    );
  } else {
    console.log("Magic Context: skipped (not installed or --no-register)");
  }
  if (report.context7Registered) {
    console.log(`Context7: registered remote MCP server (${CONTEXT7_MCP_URL}) in ${GLOBAL_OPENCODE_FILE}`);
  } else {
    const ctx7Dep = report.deps.find((d) => d.name === "context7");
    const present = ctx7Dep?.present ?? false;
    console.log(`Context7: skipped (${present ? "already present" : "not installed"} or --no-register)`);
  }
  console.log("Dependency check:");
  for (const status of report.deps) {
    console.log(`  ${depLine(status)}`);
  }
  if (depsMode === "skip") {
    console.log("  (dependency install skipped via --deps skip)");
  } else if (depsMode === "check") {
    const missing = report.deps.filter((d) => !d.present);
    console.log(missing.length
      ? `  ${missing.length} missing — re-run with --deps auto (default) to install.`
      : "  all dependencies present.");
  } else {
    const missing = report.deps.filter((d) => !d.present);
    console.log(report.depsInstalled.length
      ? `  installed: ${report.depsInstalled.join(", ")}`
      : missing.length
        ? `  ${missing.length} missing — installs reported above; re-run to retry.`
        : "  all dependencies present.");
  }
  if (report.backgroundSubagents) {
    if (report.backgroundSubagents === "already-in-env") {
      console.log("Background subagents: already enabled in the environment");
    } else {
      console.log(`Background subagents: ${report.backgroundSubagents} (restart opencode to take effect)`);
    }
  } else {
    console.log("Background subagents: skipped (--no-bg). The nirvana band's parallel lens spawns need OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true at opencode start; without it the band still works but lenses may serialize.");
  }
  console.log(`Validation: passed (config + rendered seat prompts under budget)`);
}
