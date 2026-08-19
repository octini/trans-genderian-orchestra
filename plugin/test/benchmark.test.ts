import { describe, expect, test } from "bun:test";
import { runBenchmark } from "../benchmark/style-quality";

describe("style-quality regression benchmark", () => {
  test("reports deterministic, separate variant and mode measurements", () => {
    const first = runBenchmark();
    const second = runBenchmark();
    expect(first).toEqual(second);
    expect(Object.keys(first.variants)).toEqual(["none", "tgo-small", "tgo-current", "tgo-ste-selective", "tgo-large"]);
    expect(Object.keys(first.variants)).toHaveLength(5);
    expect(first.byMode.chat["tgo-current"].cases).toBeGreaterThan(0);
    expect(first.byMode["tool-heavy"]["tgo-current"].cases).toBeGreaterThan(0);
    expect(first.variants["tgo-current"].every((item) => item.inputTokens.provenance === "proxy" && item.outputTokens.provenance === "proxy")).toBe(true);
    expect(first.variants["tgo-current"].every((item) => item.responseLength.sentences >= 1)).toBe(true);
    expect(first.externalClaims.every((claim) => claim.includes("external") && claim.includes("not TGO measurements"))).toBe(true);
    expect(first.sessions.flatMap((session) => session.variants).every((variant) => variant.lifecycle.every((record) => record.attemptID.length > 0 && record.input.artifact.length > 0 && record.generatedOutput.artifact.length > 0 && record.analyzerResult && record.evaluation.artifact.length > 0 && record.events.includes("completed")))).toBe(true);
    // Per-variant proxy fields and metric coverage
    for (const variant of Object.keys(first.variants) as Array<keyof typeof first.variants>) {
      for (const c of first.variants[variant]) {
        expect(c.cachedInputTokens.provenance).toBe("proxy");
        expect(c.retries).not.toBeUndefined();
        expect(c.delegation).not.toBeUndefined();
        expect(c.latency).not.toBeUndefined();
        expect(c.cost).not.toBeUndefined();
        expect(c.cost.provenance).toBe("proxy");
        expect(c.costPerSuccessfulTask).not.toBeUndefined();
        expect(c.steLength).not.toBeUndefined();
        expect(c.taskSuccess).not.toBeUndefined();
      }
    }
    expect(first.limitations.some((l) => l.toLowerCase().includes("proxy"))).toBe(true);
    expect(first.limitations.some((l) => l.toLowerCase().includes("no auto-adoption"))).toBe(true);
    expect(first.externalClaims.some((claim) => claim.includes("external") && claim.includes("not TGO measurements"))).toBe(true);
  });

  test("requires independent correctness claims in every fixture", async () => {
    const { STYLE_QUALITY_FIXTURES } = await import("./fixtures/style-quality");
    expect(STYLE_QUALITY_FIXTURES.every((fixture) => fixture.expected.requiredClaims.length > 0)).toBe(true);
    expect(STYLE_QUALITY_FIXTURES.every((fixture) => fixture.expected.requiredClaims.every((claim) => !fixture.protected.some(({ text }) => text === claim)))).toBe(true);
  });

  test("fails on analyzer-contract regressions without token-count optimization", () => {
    const report = runBenchmark();
    expect(report.failures).toEqual([]);
    expect(report.variants["tgo-current"].some((item) => item.requiredClaimRetention === 0 && item.preservation === 0)).toBe(true);
  });
});
