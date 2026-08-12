import { test, expect, describe } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  configureMagicContext,
  historianModelFromPreset,
  MAGIC_CONTEXT_CONFIG_DIR,
  MAGIC_CONTEXT_CONFIG_FILE,
} from "../src/magic-context";

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "tgo-mc-"));
}

describe("magic-context configuration", () => {
  test("historianModelFromPreset picks the active preset's dylan model (volume seat — the cheap historian)", () => {
    const presets = {
      balanced: {
        bernstein: { model: "opencode-go/deepseek-v4-pro" },
        dylan: { model: "opencode-go/deepseek-v4-flash" },
      },
      cheap: {
        bernstein: { model: "opencode/deepseek-v4-flash-free" },
        dylan: { model: "opencode/deepseek-v4-flash-free" },
      },
    };
    expect(historianModelFromPreset(presets, "balanced")).toBe("opencode-go/deepseek-v4-flash");
    expect(historianModelFromPreset(presets, "cheap")).toBe("opencode/deepseek-v4-flash-free");
    expect(historianModelFromPreset(presets, "frontier")).toBeUndefined();
    expect(historianModelFromPreset(undefined, "balanced")).toBeUndefined();
  });

  test("writes magic-context.jsonc with the historian model and disables compaction", async () => {
    const configDir = tmpDir();
    const home = tmpDir();
    const r = await configureMagicContext({
      configDir,
      historianModel: "opencode-go/deepseek-v4-flash",
      homeDir: home,
    });
    expect(r.action).toBe("created");
    expect(r.historianModel).toBe("opencode-go/deepseek-v4-flash");
    expect(r.compaction).toBe("written");

    const userConfig = path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE);
    const cfg = JSON.parse(readFileSync(userConfig, "utf-8"));
    expect(cfg.historian.model).toBe("opencode-go/deepseek-v4-flash");

    const open = JSON.parse(readFileSync(path.join(configDir, "opencode.jsonc"), "utf-8"));
    expect(open.compaction).toEqual({ auto: false, prune: false });
    expect(open.default_agent).toBe("bernstein");
    rmSync(configDir, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  });

  test("never clobbers a user-chosen historian model", async () => {
    const configDir = tmpDir();
    const home = tmpDir();
    const userConfig = path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE);
    const { mkdirSync, writeFileSync } = await import("node:fs");
    mkdirSync(path.dirname(userConfig), { recursive: true });
    writeFileSync(
      userConfig,
      JSON.stringify({ historian: { model: "user-picked-model" } })
    );
    const r = await configureMagicContext({
      configDir,
      historianModel: "opencode-go/deepseek-v4-flash",
      homeDir: home,
    });
    expect(r.action).toBe("unchanged");
    const cfg = JSON.parse(readFileSync(userConfig, "utf-8"));
    expect(cfg.historian.model).toBe("user-picked-model");
    rmSync(configDir, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  });

  test("skip leaves everything untouched", async () => {
    const configDir = tmpDir();
    const home = tmpDir();
    const r = await configureMagicContext({ configDir, historianModel: "x/y", homeDir: home, skip: true });
    expect(r.action).toBe("skipped");
    expect(r.compaction).toBe("skipped");
    const { existsSync } = await import("node:fs");
    expect(existsSync(path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE))).toBe(false);
    expect(existsSync(path.join(configDir, "opencode.jsonc"))).toBe(false);
    rmSync(configDir, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  });

  test("no model to write leaves config alone", async () => {
    const configDir = tmpDir();
    const home = tmpDir();
    const r = await configureMagicContext({ configDir, historianModel: undefined, homeDir: home });
    expect(r.action).toBe("skipped");
    const { existsSync } = await import("node:fs");
    expect(existsSync(path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE))).toBe(false);
    rmSync(configDir, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  });
});
