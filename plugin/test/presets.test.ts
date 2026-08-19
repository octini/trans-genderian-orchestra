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
  test("routes every balanced seat to Muse Spark with supported effort variants", async () => {
    const cfg = await loadTgoConfig({ preset: "balanced" });
    const balanced = cfg.presets!.balanced;
    const model = "opencode-go/muse-spark-1.2-contributor";
    expect(balanced.bernstein).toEqual({ model, variant: "xhigh" });
    expect(balanced.horowitz).toEqual({ model, variant: "xhigh" });
    expect(balanced.nirvana).toEqual({ model, variant: "xhigh" });
    expect(balanced.dylan).toEqual({ model, variant: "high" });
    expect(balanced.nas).toEqual({ model, variant: "medium" });
    expect(balanced["band-members"]).toEqual({ model, variant: "high" });
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
    expect(applied).toEqual(["bernstein", "horowitz", "nas", "dylan", "nirvana"]);
    expect(agent.bernstein.model).toBe(cfg.presets!.frontier.bernstein.model);
    expect(agent.nas.variant).toBe("high");
  });

  test("band-members preset entry maps to the lens agents", async () => {
    const cfg = await loadTgoConfig({ preset: "balanced" });
    const agent: Record<string, Record<string, unknown>> = {
      cobain: {},
      grohl: {},
      novoselic: {},
    };
    const applied = applyPreset({ agent }, "balanced", cfg.presets);
    expect(applied).toEqual(["cobain", "grohl", "novoselic"]);
    for (const lens of BAND_LENS_SEATS) {
      expect(agent[lens].model).toBe(cfg.presets!.balanced["band-members"].model);
    }
  });

  test("skips seats missing from the agent map", async () => {
    const cfg = await loadTgoConfig({ preset: "balanced" });
    const applied = applyPreset({ agent: { bernstein: {} } }, "balanced", cfg.presets);
    expect(applied).toEqual(["bernstein"]);
  });

  test("unknown preset applies nothing", async () => {
    const cfg = await loadTgoConfig({ preset: "balanced" });
    const agent: Record<string, Record<string, unknown>> = { bernstein: {} };
    expect(applyPreset({ agent }, "nonsense", cfg.presets)).toEqual([]);
  });
});
