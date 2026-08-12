import * as fs from "node:fs/promises";
import * as path from "node:path";

export type DepMode = "auto" | "check" | "skip";

export interface DepContext {
  configDir: string;
  hasBin: (bin: string) => Promise<string | null>;
  readConfigText: () => Promise<string>;
}

export interface DependencySpec {
  name: string;
  kind: "cli" | "plugin" | "mcp";
  summary: string;
  detect: (ctx: DepContext) => Promise<boolean>;
  install: string[];
  url: string;
}

export interface DepStatus {
  name: string;
  kind: "cli" | "plugin" | "mcp";
  summary: string;
  present: boolean;
  install: string[];
  url: string;
}

export const DEPENDENCIES: DependencySpec[] = [
  {
    name: "beads",
    kind: "cli",
    summary: "work-unit store + job-board engine (bd CLI)",
    detect: (ctx) => ctx.hasBin("bd").then((bin) => bin !== null),
    install: [
      "curl -fsSL https://raw.githubusercontent.com/gastownhall/beads/main/scripts/install.sh | bash",
    ],
    url: "https://beads.gascity.com/",
  },
  {
    name: "AFT",
    kind: "plugin",
    summary: "symbol-aware code tools (aft_*) — full dependency",
    detect: async (ctx) =>
      (await ctx.hasBin("aft")) !== null ||
      (await ctx.readConfigText()).includes("@cortexkit/aft-opencode"),
    install: ["npx @cortexkit/aft@latest setup"],
    url: "https://github.com/cortexkit/aft",
  },
  {
    name: "magic-context",
    kind: "plugin",
    summary: "long-term memory + cross-session recall (ctx_*) — full dependency",
    detect: async (ctx) =>
      (await ctx.hasBin("magic-context")) !== null ||
      (await ctx.readConfigText()).includes("@cortexkit/opencode-magic-context"),
    install: [
      // magic-context's own `npx @cortexkit/magic-context setup` is an
      // interactive TUI (it picks a historian model). The installer instead
      // registers the plugin and writes the user config non-interactively
      // (historian.model from the active preset + opencode compaction off) —
      // see configureMagicContext in magic-context.ts.
      "echo \"[tgo] magic-context: will register the plugin (server + TUI sidebar) + write historian config (historian.model from the active preset).\"",
    ],
    url: "https://github.com/cortexkit/magic-context",
  },
  {
    name: "context7",
    kind: "mcp",
    summary: "docs lookup MCP (context7_*) — granted to Nas + Dylan",
    detect: async (ctx) =>
      (await ctx.hasBin("ctx7")) !== null ||
      (await ctx.readConfigText()).includes("context7"),
    install: [
      // context7's own `npx ctx7 setup --opencode` is an interactive TUI (mode
      // picker + browser OAuth login). Under a non-interactive spawn it throws
      // ExitPromptError and exits 0 while configuring nothing, so this install
      // step never landed the server. The installer instead registers the hosted
      // remote MCP entry directly (no local OAuth) — see registerMcpServer in
      // build.ts, wired in install.ts.
      "echo \"[tgo] context7: will register the hosted remote MCP server (server + no local OAuth).\"",
    ],
    url: "https://mcp.context7.com/mcp",
  },
];

export async function checkDependencies(ctx: DepContext): Promise<DepStatus[]> {
  const statuses: DepStatus[] = [];
  for (const dep of DEPENDENCIES) {
    statuses.push({
      name: dep.name,
      kind: dep.kind,
      summary: dep.summary,
      present: await dep.detect(ctx),
      install: dep.install,
      url: dep.url,
    });
  }
  return statuses;
}

export async function installMissing(
  statuses: DepStatus[],
  run: (cmd: string) => Promise<void>
): Promise<string[]> {
  const installed: string[] = [];
  for (const status of statuses) {
    if (status.present) continue;
    for (const cmd of status.install) {
      await run(cmd);
    }
    installed.push(status.name);
  }
  return installed;
}

export async function runShellCommand(cmd: string): Promise<void> {
  const proc = Bun.spawn(["/bin/sh", "-c", cmd], {
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`dependency install command failed (exit ${code}): ${cmd}`);
  }
}

export function defaultDepContext(configDir: string): DepContext {
  return {
    configDir,
    hasBin: async (bin) => Bun.which(bin) ?? null,
    readConfigText: async () => {
      let text = "";
      for (const file of ["opencode.json", "opencode.jsonc"]) {
        try {
          text += await fs.readFile(path.join(configDir, file), "utf-8");
        } catch {
          // missing config file — fine
        }
      }
      return text;
    },
  };
}
