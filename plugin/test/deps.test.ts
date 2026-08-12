import { test, expect, describe } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  checkDependencies,
  DEPENDENCIES,
  defaultDepContext,
  installMissing,
  type DepContext,
  type DepStatus,
} from "../src/deps";

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "tgo-deps-"));
}

function ctx(overrides?: {
  hasBin?: (bin: string) => Promise<string | null>;
  readConfigText?: () => Promise<string>;
}): DepContext {
  return {
    configDir: tmpDir(),
    hasBin: overrides?.hasBin ?? (async () => null),
    readConfigText: overrides?.readConfigText ?? (async () => ""),
  };
}

describe("dependency registry", () => {
  test("pins exactly the four spec'd dependencies", () => {
    const names = DEPENDENCIES.map((d) => d.name);
    expect(names).toEqual(["beads", "AFT", "magic-context", "context7"]);
  });

  test("beads + AFT detect via binary presence", async () => {
    const has = new Set(["bd", "aft"]);
    const statuses = await checkDependencies(
      ctx({ hasBin: async (bin) => (has.has(bin) ? `/usr/local/bin/${bin}` : null) })
    );
    const byName = Object.fromEntries(statuses.map((s) => [s.name, s.present]));
    expect(byName.beads).toBe(true);
    expect(byName.AFT).toBe(true);
    expect(byName["magic-context"]).toBe(false);
    expect(byName.context7).toBe(false);
  });

  test("magic-context + context7 detect via config text when the binary is absent", async () => {
    const statuses = await checkDependencies(
      ctx({
        readConfigText: async () =>
          `{"plugin":["@cortexkit/opencode-magic-context"],"mcp":{"context7":{"type":"remote"}}}`,
      })
    );
    const byName = Object.fromEntries(statuses.map((s) => [s.name, s.present]));
    expect(byName["magic-context"]).toBe(true);
    expect(byName.context7).toBe(true);
    expect(byName.beads).toBe(false);
  });

  test("every dependency ships an install command and a docs url", () => {
    for (const dep of DEPENDENCIES) {
      expect(dep.install.length).toBeGreaterThan(0);
      expect(dep.url).toMatch(/^https?:\/\//);
    }
  });

  test("context7's install command never runs its interactive setup TUI", () => {
    const context7 = DEPENDENCIES.find((d) => d.name === "context7");
    expect(context7).toBeDefined();
    expect(context7!.kind).toBe("mcp");
    for (const cmd of context7!.install) {
      expect(cmd).not.toContain("ctx7 setup");
      expect(cmd).not.toContain("npx ctx7");
    }
    // registration happens via registerMcpServer in build.ts (non-interactive).
    expect(context7!.install[0]).toContain("context7");
  });

  test("defaultDepContext reads opencode.json for plugin/mcp markers", async () => {
    const dir = tmpDir();
    writeFileSync(
      path.join(dir, "opencode.json"),
      JSON.stringify({ plugin: ["@cortexkit/opencode-magic-context"] })
    );
    const text = await defaultDepContext(dir).readConfigText();
    expect(text).toContain("opencode-magic-context");
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("installMissing", () => {
  test("runs install commands only for missing deps, in order", async () => {
    const statuses: DepStatus[] = [
      {
        name: "beads",
        kind: "cli",
        summary: "",
        present: true,
        install: ["skip-me"],
        url: "",
      },
      {
        name: "AFT",
        kind: "plugin",
        summary: "",
        present: false,
        install: ["cmd-a", "cmd-b"],
        url: "",
      },
    ];
    const ran: string[] = [];
    const installed = await installMissing(statuses, async (cmd) => {
      ran.push(cmd);
    });
    expect(ran).toEqual(["cmd-a", "cmd-b"]);
    expect(installed).toEqual(["AFT"]);
  });

  test("is a no-op when everything is present", async () => {
    const statuses: DepStatus[] = [
      { name: "beads", kind: "cli", summary: "", present: true, install: [], url: "" },
    ];
    const ran: string[] = [];
    const installed = await installMissing(statuses, async (cmd) => {
      ran.push(cmd);
    });
    expect(installed).toEqual([]);
    expect(ran).toEqual([]);
  });
});
