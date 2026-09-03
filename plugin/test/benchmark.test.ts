import { describe, expect, test } from "bun:test";
import { checkMaxHard, checkParagraphHead, checkRhythmDynamic, checkRhythmStatic, runBenchmark } from "../benchmark/style-quality";

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

  test("exposes byCard aggregation with 3× coverage and card-aware gates", async () => {
    const report = runBenchmark();
    // byCard must exist alongside byMode/byTaskClass (D14)
    expect(report.byCard).toBeDefined();
    expect(Object.keys(report.byCard).sort()).toEqual(["tgo-conversational", "tgo-default", "tgo-prose"]);
    // 3× coverage: each fixture run under each card per variant (10 fixtures × 3 cards = 30 per variant)
    for (const variant of Object.keys(report.variants) as Array<keyof typeof report.variants>) {
      expect(report.variants[variant]).toHaveLength(30);
      // each card contributes 10 per variant
      for (const cardId of ["tgo-default", "tgo-prose", "tgo-conversational"] as const) {
        expect(report.byCard[cardId][variant].cases).toBe(10);
      }
    }
    // legacy 5-way variant labels preserved for history with byCard aliasing
    expect(Object.keys(report.variants)).toEqual(["none", "tgo-small", "tgo-current", "tgo-ste-selective", "tgo-large"]);
    // cardGates present and green for current fixtures
    expect(report.cardGates).toBeDefined();
    for (const cardId of ["tgo-default", "tgo-prose", "tgo-conversational"] as const) {
      expect(report.cardGates![cardId].rhythmStaticFailures).toEqual([]);
      expect(report.cardGates![cardId].driftRegression).toBeLessThanOrEqual(0.25);
    }
    // limitations document the new gates
    expect(report.limitations.some((l) => l.includes("byCard"))).toBe(true);
    expect(report.limitations.some((l) => l.toLowerCase().includes("rhythm buckets"))).toBe(true);
    expect(report.limitations.some((l) => l.includes("Paragraph-head"))).toBe(true);
    // variant cases carry cardId and card-aware metrics
    expect(report.variants["tgo-current"].every((c) => (c as { cardId?: string }).cardId !== undefined)).toBe(true);
    expect(report.variants["tgo-current"].every((c) => (c as { rhythm?: unknown }).rhythm !== undefined)).toBe(true);
  });

  test("rhythm bucket deviation gate trips (negative test)", () => {
    // 20 sentences × 30 words => 0/0/100 buckets vs prose 29/44/27, mean 30 vs 19 — deviant by >5/2
    const longSent = "word ".repeat(30).trim() + ".";
    const deviant = Array(20).fill(longSent).join(" ");
    const failures = checkRhythmDynamic(deviant, "tgo-prose");
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.some((f) => f.includes("short bucket") && f.includes("deviates"))).toBe(true);
    expect(failures.some((f) => f.includes("mean") && f.includes("deviates"))).toBe(true);
    // also max hard cap via dynamic
    const sixtyOne = "word ".repeat(61).trim() + ".";
    const maxFailures = checkRhythmDynamic(Array(10).fill(sixtyOne).join(" "), "tgo-default", { minSentences: 1, minWords: 1 });
    expect(maxFailures.some((f) => f.includes(">60"))).toBe(true);
    // static card check passes for shipped cards, but would fail for deviant declaration (prove gate exists)
    expect(checkRhythmStatic("tgo-prose")).toEqual([]);
    expect(checkRhythmStatic("tgo-conversational")).toEqual([]);
  });

  test("max>60 hard fail gate trips when fed violating fixture", async () => {
    const { STYLE_QUALITY_FIXTURES } = await import("./fixtures/style-quality");
    const sixtyOne = "word ".repeat(61).trim() + ".";
    const violating = {
      id: "test-max-violation",
      description: "synthetic max>60 violation",
      cardId: "tgo-default" as const,
      register: "default" as const,
      outputClass: "technical-steps-code" as const,
      mode: "chat" as const,
      candidate: sixtyOne,
      expected: { aggregate: "none" as const, actionable: false, reinforcementEligible: false, findings: [], preservation: "exact" as const, requiredClaims: [sixtyOne.slice(0, 5)] },
      protected: [],
    };
    const report = runBenchmark([...STYLE_QUALITY_FIXTURES, violating as unknown as typeof STYLE_QUALITY_FIXTURES[number]]);
    expect(report.failures.some((f) => f.includes("test-max-violation") && f.includes(">60"))).toBe(true);
    // direct helper proves hard fail
    expect(checkMaxHard(sixtyOne, "test-max")).toEqual(["test-max: max 61 >60 hard fail"]);
  });

  test("paragraph-head discipline gate trips when fed violating fixture", async () => {
    const { STYLE_QUALITY_FIXTURES } = await import("./fixtures/style-quality");
    const longSent = "word ".repeat(30).trim() + ".";
    // two longs stacked at paragraph head
    const twoLongs = `${longSent} ${longSent} Short.`;
    // helper level
    expect(checkParagraphHead(twoLongs, "test-para").some((f) => f.includes("both long") || f.includes("never two longs"))).toBe(true);
    expect(checkParagraphHead(twoLongs, "test-para").some((f) => f.includes("not short landing"))).toBe(true);
    // benchmark level — fixture with stacked longs
    const violating = {
      id: "test-para-violation",
      description: "synthetic paragraph-head violation",
      cardId: "tgo-prose" as const,
      register: "default" as const,
      outputClass: "voice-forward-prose" as const,
      mode: "chat" as const,
      candidate: twoLongs,
      expected: { aggregate: "none" as const, actionable: false, reinforcementEligible: false, findings: [], preservation: "exact" as const, requiredClaims: ["Short."] },
      protected: [],
    };
    const report = runBenchmark([...STYLE_QUALITY_FIXTURES, violating as unknown as typeof STYLE_QUALITY_FIXTURES[number]]);
    expect(report.failures.some((f) => f.includes("test-para-violation") && (f.includes("both long") || f.includes("never two longs") || f.includes("not short landing")))).toBe(true);
  });

  test("dynamic rhythm gate wired into runBenchmark for size-qualifying fixtures (Fix 4)", async () => {
    const { STYLE_QUALITY_FIXTURES } = await import("./fixtures/style-quality");
    const baseLong = "The marquee said CLOSED FOR THE SEASON and the wind carried pine scent through the valley while the sun set behind hills with quiet grace tonight across the empty lot";
    const suffixes = ["alpha","bravo","charlie","delta","echo","foxtrot","golf","hotel","india","juliet","kilo","lima","mike","november","oscar","papa","quebec","romeo","sierra","tango"];
    const deviant = Array.from({ length: 20 }, (_, i) => `${baseLong} ${suffixes[i]}.`).join(" ");
    const qualifying = {
      id: "test-dynamic-rhythm",
      description: "size-qualifying deviant rhythm",
      cardId: "tgo-prose" as const,
      register: "default" as const,
      outputClass: "voice-forward-prose" as const,
      mode: "chat" as const,
      candidate: deviant,
      expected: { aggregate: "none" as const, actionable: false, reinforcementEligible: false, findings: [], preservation: "exact" as const, requiredClaims: [baseLong.slice(0, 20)] },
      protected: [],
    };
    const report = runBenchmark([...STYLE_QUALITY_FIXTURES, qualifying as unknown as typeof STYLE_QUALITY_FIXTURES[number]]);
    expect(report.failures.some((f) => f.includes("test-dynamic-rhythm"))).toBe(true);
    // Short fixture exempt via helper size gate (prose exemplars 40/31/28 words should not trip)
    const shortDeviant = `${baseLong}. He salted the next batch anyway. The moths kept coming.`;
    const shortFixture = {
      id: "test-short-exempt",
      description: "short not qualifying",
      cardId: "tgo-prose" as const,
      register: "default" as const,
      outputClass: "voice-forward-prose" as const,
      mode: "chat" as const,
      candidate: shortDeviant,
      expected: { aggregate: "none" as const, actionable: false, reinforcementEligible: false, findings: [], preservation: "exact" as const, requiredClaims: ["He salted"] },
      protected: [],
    };
    const reportShort = runBenchmark([...STYLE_QUALITY_FIXTURES, shortFixture as unknown as typeof STYLE_QUALITY_FIXTURES[number]]);
    expect(reportShort.failures.some((f) => f.includes("test-short-exempt"))).toBe(false);
  });
});
