/**
 * tgo-5em: quota-aware budget math + cost surface.
 *
 * Budget math is on RAW list price (documented gotcha: dashboard dollars are
 * raw, never cross-model compare unnormalized). No network calls — budgets are
 * a static table, NOT live pricing. The cost surface is file-derived
 * (.tgo/runs/*.jsonl step counts) with a nominal raw list-step cost, and
 * degrades gracefully when budget or step-cost data is missing.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

export type BudgetWindow = "fiveHour" | "weekly" | "monthly";

/**
 * OpenCode Go per-model window limits in raw provider dollars. A model's budget
 * for a window = windowLimit × (usageMonthlyUsd / 60). See docs (memory #38).
 */
export const WINDOW_LIMITS: Record<BudgetWindow, number> = {
  fiveHour: 12,
  weekly: 30,
  monthly: 60,
};

export interface ModelBudget {
  /** The model's Go "Usage" monthly raw dollars. */
  usageMonthlyUsd: number;
  /** Nominal RAW list dollars per step (request ≈ step; documented approximation). */
  listStepUsd?: number;
}

/** Static budget table — unknown models degrade to "budget unknown". */
export const MODEL_BUDGETS: Record<string, ModelBudget> = {
  "opencode-go/gpt-5.6-luna": { usageMonthlyUsd: 15, listStepUsd: 0.00146 },
  "opencode-go/glm-5.3-flash": { usageMonthlyUsd: 15, listStepUsd: 0.0019 },
  "opencode-go/muse-spark-1.2-contributor": { usageMonthlyUsd: 60, listStepUsd: 0.00027 },
};

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Budget for one window in raw dollars, or undefined when the model is unknown. */
export function budgetFor(
  model: string,
  window: BudgetWindow,
  table: Record<string, ModelBudget> = MODEL_BUDGETS,
): number | undefined {
  const b = table[model];
  if (!b || typeof b.usageMonthlyUsd !== "number" || b.usageMonthlyUsd <= 0) return undefined;
  return round2(WINDOW_LIMITS[window] * (b.usageMonthlyUsd / 60));
}

export interface BudgetWindows {
  usageMonthlyUsd: number;
  fiveHour: number;
  weekly: number;
  monthly: number;
}

/** All three windows for a model, or undefined when unknown. */
export function budgetsForModel(
  model: string,
  table: Record<string, ModelBudget> = MODEL_BUDGETS,
): BudgetWindows | undefined {
  const b = table[model];
  if (!b || typeof b.usageMonthlyUsd !== "number" || b.usageMonthlyUsd <= 0) return undefined;
  const factor = b.usageMonthlyUsd / 60;
  return {
    usageMonthlyUsd: b.usageMonthlyUsd,
    fiveHour: round2(WINDOW_LIMITS.fiveHour * factor),
    weekly: round2(WINDOW_LIMITS.weekly * factor),
    monthly: round2(WINDOW_LIMITS.monthly * factor),
  };
}

/** Spend as a percentage of a budget window; undefined when budget unknown. Not clamped (over-budget shows >100%). */
export function spendPct(spendUsd: number, budgetUsd: number | undefined): number | undefined {
  if (budgetUsd === undefined || budgetUsd <= 0) return undefined;
  return Math.round((spendUsd / budgetUsd) * 100);
}

/** Estimated raw spend = steps × nominal list-step cost. Undefined without data. */
export function estimateSpendFromSteps(
  model: string,
  steps: number,
  table: Record<string, ModelBudget> = MODEL_BUDGETS,
): number | undefined {
  const s = table[model]?.listStepUsd;
  if (s === undefined || !Number.isFinite(steps) || steps <= 0) return undefined;
  return round2(steps * s);
}

export interface CostSurfaceInput {
  /** seat → model (resolved from the active preset). */
  seatModels: Record<string, string>;
  /** seat → observed step count (file-derived). */
  stepsBySeat: Record<string, number>;
}

/** Render cost/budget lines for the board. Missing data degrades gracefully. */
export function buildCostLines(
  input: CostSurfaceInput,
  table: Record<string, ModelBudget> = MODEL_BUDGETS,
): string[] {
  const lines: string[] = [];
  const seats = Object.keys(input.seatModels).sort();
  for (const seat of seats) {
    const model = input.seatModels[seat];
    if (!model) continue;
    const bw = budgetsForModel(model, table);
    const steps = input.stepsBySeat[seat] ?? 0;
    const spend = estimateSpendFromSteps(model, steps, table);
    if (!bw) {
      lines.push(`COST: ${seat} → ${model}: budget unknown`);
      continue;
    }
    const spendPart = spend !== undefined ? `est. $${spend}` : "no spend data";
    const pct = spend !== undefined ? spendPct(spend, bw.fiveHour) : undefined;
    const pctPart = pct !== undefined ? ` (${pct}% of 5h budget)` : "";
    lines.push(`COST: ${seat} → ${model}: ${spendPart} of $${bw.fiveHour} 5h${pctPart}`);
  }
  return lines;
}

let stepCache: { at: number; repoRoot: string; bySeat: Record<string, number> } | undefined;

/**
 * Scan run logs for per-seat step counts (type:"step" events carry a seat).
 * File-derived, cached for ttlMs to keep board ticks cheap.
 */
export async function scanSeatSteps(repoRoot: string, ttlMs = 30_000): Promise<Record<string, number>> {
  const now = Date.now();
  if (stepCache && stepCache.repoRoot === repoRoot && now - stepCache.at < ttlMs) {
    return stepCache.bySeat;
  }
  const out: Record<string, number> = {};
  const dir = path.join(repoRoot, ".tgo", "runs");
  let files: string[] = [];
  try {
    files = await fs.readdir(dir);
  } catch {
    stepCache = { at: now, repoRoot, bySeat: out };
    return out;
  }
  for (const f of files) {
    if (!f.endsWith(".jsonl")) continue;
    let raw = "";
    try {
      raw = await fs.readFile(path.join(dir, f), "utf-8");
    } catch {
      continue;
    }
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || !t.startsWith("{")) continue;
      let ev: { type?: string; seat?: string } | null = null;
      try {
        ev = JSON.parse(t) as { type?: string; seat?: string };
      } catch {
        continue;
      }
      if (ev && ev.type === "step" && typeof ev.seat === "string" && ev.seat.trim().length > 0) {
        out[ev.seat] = (out[ev.seat] ?? 0) + 1;
      }
    }
  }
  stepCache = { at: now, repoRoot, bySeat: out };
  return out;
}

/** Test/debug: clear the step scan cache. */
export function clearStepCache(): void {
  stepCache = undefined;
}