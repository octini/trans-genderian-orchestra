import { describe, test, expect } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {
  WINDOW_LIMITS,
  MODEL_BUDGETS,
  budgetFor,
  budgetsForModel,
  spendPct,
  estimateSpendFromSteps,
  buildCostLines,
  scanSeatSteps,
  clearStepCache,
} from "../src/cost";
import { recommendPresetForPressure, resolveSeatModels, PRESSURE_HIGH, PRESSURE_MID } from "../src/presets";

async function tmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "tgo-cost-"));
}

describe("budget math (raw list price)", () => {
  test("window limits are the fixed Go caps", () => {
    expect(WINDOW_LIMITS.fiveHour).toBe(12);
    expect(WINDOW_LIMITS.weekly).toBe(30);
    expect(WINDOW_LIMITS.monthly).toBe(60);
  });

  test("Luna (usage $15) budgets: $3 5h / $7.5 wk / $15 mo", () => {
    expect(budgetFor("opencode-go/gpt-5.6-luna", "fiveHour")).toBe(3);
    expect(budgetFor("opencode-go/gpt-5.6-luna", "weekly")).toBe(7.5);
    expect(budgetFor("opencode-go/gpt-5.6-luna", "monthly")).toBe(15);
  });

  test("GLM Flash (usage $15) matches Luna budget", () => {
    expect(budgetFor("opencode-go/glm-5.3-flash", "fiveHour")).toBe(3);
    expect(budgetFor("opencode-go/glm-5.3-flash", "monthly")).toBe(15);
  });

  test("Muse Contributor (usage $60) budgets: $12 5h / $30 wk / $60 mo", () => {
    const bw = budgetsForModel("opencode-go/muse-spark-1.2-contributor");
    expect(bw?.fiveHour).toBe(12);
    expect(bw?.weekly).toBe(30);
    expect(bw?.monthly).toBe(60);
  });

  test("unknown model degrades to undefined", () => {
    expect(budgetFor("opencode-go/nonexistent", "fiveHour")).toBeUndefined();
    expect(budgetsForModel("opencode-go/nonexistent")).toBeUndefined();
  });

  test("custom table override is honored", () => {
    const custom = { "opencode-go/x": { usageMonthlyUsd: 30 } };
    expect(budgetFor("opencode-go/x", "fiveHour", custom)).toBe(6);
  });
});

describe("spend math", () => {
  test("spendPct is spend/budget rounded, unclamped (over-budget >100%)", () => {
    expect(spendPct(1.5, 3)).toBe(50);
    expect(spendPct(6, 3)).toBe(200);
    expect(spendPct(1, undefined)).toBeUndefined();
  });

  test("estimateSpendFromSteps = steps × list step cost", () => {
    expect(estimateSpendFromSteps("opencode-go/gpt-5.6-luna", 1000)).toBe(1.46);
    expect(estimateSpendFromSteps("opencode-go/gpt-5.6-luna", 0)).toBeUndefined();
    expect(estimateSpendFromSteps("opencode-go/nonexistent", 10)).toBeUndefined();
  });
});

describe("cost surface render", () => {
  const seatModels = {
    horowitz: "opencode-go/gpt-5.6-luna",
    bernstein: "opencode-go/glm-5.3-flash",
    dylan: "opencode-go/nonexistent",
  };

  test("renders budget + spend lines for known models", () => {
    const lines = buildCostLines({ seatModels, stepsBySeat: { horowitz: 1000 } });
    expect(lines.length).toBeGreaterThan(0);
    const horowitz = lines.find((l) => l.startsWith("COST: horowitz"));
    expect(horowitz).toContain("est. $1.46");
    expect(horowitz).toContain("$3");
    expect(horowitz).toContain("49%");
  });

  test("no steps → no spend data", () => {
    const lines = buildCostLines({ seatModels, stepsBySeat: {} });
    const bernstein = lines.find((l) => l.startsWith("COST: bernstein"));
    expect(bernstein).toContain("no spend data");
  });

  test("unknown model → budget unknown", () => {
    const lines = buildCostLines({ seatModels, stepsBySeat: {} });
    const dylan = lines.find((l) => l.startsWith("COST: dylan"));
    expect(dylan).toContain("budget unknown");
  });
});

describe("step scan (file-derived)", () => {
  test("counts type:step events per seat", async () => {
    const dir = await tmpDir();
    const runs = path.join(dir, ".tgo", "runs");
    await fs.mkdir(runs, { recursive: true });
    await fs.writeFile(path.join(runs, "a.jsonl"), [
      '{"ts":1,"type":"step","seat":"dylan","tool":"edit","argsHash":"x","ok":true,"issueId":"tgo-abc"}',
      '{"ts":2,"type":"step","seat":"dylan","tool":"write","argsHash":"x","ok":true,"issueId":"tgo-abc"}',
      '{"ts":3,"type":"status","seat":"dylan","tool":"task","argsHash":"x","ok":true,"note":"complete","issueId":"tgo-abc"}',
      '{"ts":4,"type":"heartbeat","seat":"nas","tool":"heartbeat","argsHash":"x","ok":true,"issueId":"tgo-abc"}',
    ].join("\n"), "utf-8");
    await fs.writeFile(path.join(runs, "b.jsonl"), [
      '{"ts":1,"type":"step","seat":"nas","tool":"edit","argsHash":"x","ok":true,"issueId":"tgo-def"}',
      "not-json",
    ].join("\n"), "utf-8");
    clearStepCache();
    const bySeat = await scanSeatSteps(dir);
    expect(bySeat.dylan).toBe(2);
    expect(bySeat.nas).toBe(1);
    expect(bySeat.horowitz).toBeUndefined();
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("missing runs dir returns empty", async () => {
    const dir = await tmpDir();
    clearStepCache();
    const bySeat = await scanSeatSteps(dir);
    expect(Object.keys(bySeat).length).toBe(0);
    await fs.rm(dir, { recursive: true, force: true });
  });
});

describe("pressure-aware preset recommendation", () => {
  test("no pressure keeps current", () => {
    expect(recommendPresetForPressure(0, "frontier")).toBe("frontier");
    expect(recommendPresetForPressure(2, "cheap")).toBe("cheap");
  });

  test("mid pressure ratchets to balanced", () => {
    expect(recommendPresetForPressure(PRESSURE_MID, "frontier")).toBe("balanced");
    expect(recommendPresetForPressure(5, "frontier")).toBe("balanced");
  });

  test("high pressure ratchets to cheap", () => {
    expect(recommendPresetForPressure(PRESSURE_HIGH, "frontier")).toBe("cheap");
    expect(recommendPresetForPressure(20, "balanced")).toBe("cheap");
  });

  test("non-finite depth returns current (no crash)", () => {
    expect(recommendPresetForPressure(Number.NaN, "frontier")).toBe("frontier");
  });
});

describe("seat model resolution", () => {
  test("band-members expands to lens seats", () => {
    const presets = {
      balanced: {
        bernstein: { model: "opencode-go/glm-5.3-flash", variant: "max" },
        "band-members": { model: "opencode-go/grok-4.6", variant: "xhigh" },
      },
    } as never;
    const models = resolveSeatModels("balanced", presets);
    expect(models.bernstein).toBe("opencode-go/glm-5.3-flash");
    expect(models.cobain).toBe("opencode-go/grok-4.6");
    expect(models.grohl).toBe("opencode-go/grok-4.6");
    expect(models.novoselic).toBe("opencode-go/grok-4.6");
  });

  test("empty/unknown preset → empty map", () => {
    expect(Object.keys(resolveSeatModels("nope", undefined as never)).length).toBe(0);
  });
});