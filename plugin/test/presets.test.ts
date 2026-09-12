import { test, expect, describe } from "bun:test";
import {
  applyPreset,
  BAND_LENS_SEATS,
  BD_MEMORIES_COMMAND,
  isPresetName,
  PRESET_MEMORY_KEY,
  readPresetNudge,
  resolveActivePreset,
} from "../src/presets";
import { loadTgoConfig } from "../src/config";

describe("readPresetNudge", () => {
  test("runs the bd memories command with the bd prefix", async () => {
    const calls: string[] = [];
    await readPresetNudge(async (command) => {
      calls.push(command);
      return "{}";
    });
    expect(calls).toEqual([BD_MEMORIES_COMMAND]);
    expect(BD_MEMORIES_COMMAND.startsWith("bd ")).toBe(true);
  });

  test("parses the memories JSON into a record", async () => {
    const memories = await readPresetNudge(async () =>
      JSON.stringify({ [PRESET_MEMORY_KEY]: "frontier", schema_version: 1 })
    );
    expect(memories[PRESET_MEMORY_KEY]).toBe("frontier");
  });

  test("returns {} on a command failure", async () => {
    expect(await readPresetNudge(async () => "")).toEqual({});
  });

  test("returns {} on unparseable output", async () => {
    expect(await readPresetNudge(async () => "not json")).toEqual({});
  });

  test("emits tgo: warn via injected logger on bd memories failure", async () => {
    const logs: Array<{ level: string; message: string; extra?: unknown }> = [];
    const log = (level: "warn" | "info" | "error", message: string, extra?: Record<string, unknown>) => logs.push({ level, message, extra });
    const result = await readPresetNudge(async () => {
      throw new Error("bd down");
    }, log);
    expect(result).toEqual({});
    expect(logs.some((l) => l.level === "warn" && l.message.includes("tgo: readPresetNudge"))).toBe(true);
  });
});

describe("resolveActivePreset", () => {
  test("defaults to config preset when no memory nudge", async () => {
    const cfg = await loadTgoConfig({ preset: "balanced" });
    expect(resolveActivePreset(cfg, {})).toBe("balanced");
  });

  test("memory nudge wins over config preset", async () => {
    const cfg = await loadTgoConfig({ preset: "balanced" });
    expect(resolveActivePreset(cfg, { [PRESET_MEMORY_KEY]: "frontier" })).toBe("frontier");
  });

  test("ignores an invalid nudge", async () => {
    const cfg = await loadTgoConfig({ preset: "cheap" });
    expect(resolveActivePreset(cfg, { [PRESET_MEMORY_KEY]: "ludicrous" })).toBe("cheap");
  });

  test("memory schema_version key is ignored", async () => {
    const cfg = await loadTgoConfig({ preset: "balanced" });
    expect(resolveActivePreset(cfg, { schema_version: 1 })).toBe("balanced");
  });
});

describe("isPresetName", () => {
  test("accepts the three built-ins", () => {
    expect(isPresetName("balanced")).toBe(true);
    expect(isPresetName("cheap")).toBe(true);
    expect(isPresetName("frontier")).toBe(true);
  });

  test("rejects junk", () => {
    expect(isPresetName("max")).toBe(false);
    expect(isPresetName(42)).toBe(false);
    expect(isPresetName(undefined)).toBe(false);
  });
});

describe("applyPreset", () => {
  test("routes balanced seats: Flash/max on bernstein/horowitz/nirvana, Spark/xhigh elsewhere", async () => {
    const cfg = await loadTgoConfig({ preset: "balanced" });
    const balanced = cfg.presets!.balanced;
    expect(balanced.bernstein).toEqual({ model: "opencode-go/glm-5.3-flash", variant: "max" });
    expect(balanced.horowitz).toEqual({ model: "opencode-go/glm-5.3-flash", variant: "max" });
    expect(balanced.nirvana).toEqual({ model: "opencode-go/glm-5.3-flash", variant: "max" });
    expect(balanced.dylan).toEqual({ model: "opencode-go/muse-spark-1.3-contributor", variant: "xhigh" });
    expect(balanced.nas).toEqual({ model: "opencode-go/muse-spark-1.3-contributor", variant: "xhigh" });
    expect(balanced["band-members"]).toEqual({ model: "opencode-go/muse-spark-1.3-contributor", variant: "xhigh" });
  });

  test("sets model + variant on every seat", async () => {
    const cfg = await loadTgoConfig({ preset: "frontier" });
    const agent: Record<string, Record<string, unknown>> = {
      bernstein: {},
      horowitz: {},
      nas: {},
      dylan: {},
      nirvana: {},
    };
    const applied = applyPreset({ agent }, "frontier", cfg.presets);
    expect(applied.sort()).toEqual(
      ["bernstein", "horowitz", "nas", "dylan", "nirvana", "cobain", "grohl", "novoselic"].sort()
    );
    expect(agent.bernstein.model).toBe(cfg.presets!.frontier.bernstein.model);
    expect(agent.nas.variant).toBe("xhigh");
  });

  test("band-members preset entry maps to the lens agents", async () => {
    const cfg = await loadTgoConfig({ preset: "balanced" });
    const balanced = { ...cfg.presets!.balanced };
    delete balanced.cobain;
    delete balanced.grohl;
    delete balanced.novoselic;
    const presets = { ...cfg.presets!, balanced };
    const agent: Record<string, Record<string, unknown>> = {
      cobain: {},
      grohl: {},
      novoselic: {},
    };
    const applied = applyPreset({ agent }, "balanced", presets);
    expect(applied.sort()).toEqual(
      ["bernstein", "horowitz", "nas", "dylan", "nirvana", "cobain", "grohl", "novoselic"].sort()
    );
    for (const lens of BAND_LENS_SEATS) {
      expect(agent[lens].model).toBe(cfg.presets!.balanced["band-members"].model);
    }
  });

  test("per-lens override wins for that lens only", async () => {
    const cfg = await loadTgoConfig({ preset: "balanced" });
    const balanced = {
      ...cfg.presets!.balanced,
      grohl: { model: "opencode-go/qwen3.8-flash", variant: "high" },
    };
    delete balanced.cobain;
    delete balanced.novoselic;
    const presets = { ...cfg.presets!, balanced };
    const agent: Record<string, Record<string, unknown>> = {
      cobain: {},
      grohl: {},
      novoselic: {},
    };
    const applied = applyPreset({ agent }, "balanced", presets);
    expect(applied.sort()).toEqual(
      ["bernstein", "horowitz", "nas", "dylan", "nirvana", "cobain", "grohl", "novoselic"].sort()
    );
    expect(agent.grohl.model).toBe("opencode-go/qwen3.8-flash");
    expect(agent.grohl.variant).toBe("high");
    expect(agent.cobain.model).toBe(cfg.presets!.balanced["band-members"].model);
    expect(agent.cobain.variant).toBe(cfg.presets!.balanced["band-members"].variant);
    expect(agent.novoselic.model).toBe(cfg.presets!.balanced["band-members"].model);
  });

  test("per-lens override replaces the entry: no variant inheritance from band-members", async () => {
    const cfg = await loadTgoConfig({ preset: "balanced" });
    const presets = {
      ...cfg.presets!,
      balanced: {
        ...cfg.presets!.balanced,
        grohl: { model: "opencode-go/qwen3.8-flash" },
      },
    };
    const agent: Record<string, Record<string, unknown>> = {
      grohl: { model: "old", variant: "xhigh" },
    };
    applyPreset({ agent }, "balanced", presets);
    expect(agent.grohl.model).toBe("opencode-go/qwen3.8-flash");
    expect(agent.grohl.variant).toBeUndefined();
  });

  test("balanced builtins resolve exactly per the decided mapping", async () => {
    const cfg = await loadTgoConfig({ preset: "balanced" });
    expect(cfg.presets!.balanced.cobain).toEqual({
      model: "opencode-go/muse-spark-1.3-contributor",
      variant: "xhigh",
    });
    expect(cfg.presets!.balanced.grohl).toEqual({ model: "opencode-go/qwen3.8-flash", variant: "high" });
    expect(cfg.presets!.balanced.novoselic).toEqual({
      model: "opencode-go/deepseek-v4.1-flash",
      variant: "max",
    });
    const agent: Record<string, Record<string, unknown>> = {};
    applyPreset({ agent }, "balanced", cfg.presets);
    expect(agent.cobain).toEqual({ model: "opencode-go/muse-spark-1.3-contributor", variant: "xhigh" });
    expect(agent.grohl).toEqual({ model: "opencode-go/qwen3.8-flash", variant: "high" });
    expect(agent.novoselic).toEqual({ model: "opencode-go/deepseek-v4.1-flash", variant: "max" });
  });

  test("malformed per-lens variant throws instead of falling back", async () => {
    const cfg = await loadTgoConfig({ preset: "balanced" });
    const presets = {
      ...cfg.presets!,
      balanced: {
        ...cfg.presets!.balanced,
        grohl: { model: "opencode-go/qwen3.8-flash", variant: "max" },
      },
    };
    expect(() => applyPreset({ agent: {} }, "balanced", presets)).toThrow(/unknown variant/);
  });

  test("creates missing agent entries and applies preset to all seats", async () => {
    const cfg = await loadTgoConfig({ preset: "balanced" });
    const agent: Record<string, Record<string, unknown>> = { bernstein: {} };
    const applied = applyPreset({ agent }, "balanced", cfg.presets);
    expect(applied.sort()).toEqual(
      ["bernstein", "horowitz", "nas", "dylan", "nirvana", "cobain", "grohl", "novoselic"].sort()
    );
    expect(agent.dylan.model).toBeDefined();
    expect(agent.nas.model).toBeDefined();
    expect(agent.horowitz.model).toBeDefined();
  });

  test("unknown preset applies nothing", async () => {
    const cfg = await loadTgoConfig({ preset: "balanced" });
    const agent: Record<string, Record<string, unknown>> = { bernstein: {} };
    expect(applyPreset({ agent }, "nonsense", cfg.presets)).toEqual([]);
  });
});
