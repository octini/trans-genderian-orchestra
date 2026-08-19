import { describe, expect, test } from "bun:test";
import { analyzeStyleDrift } from "../src/drift";

const base = (candidate: string, extra: Partial<Parameters<typeof analyzeStyleDrift>[0]> = {}) => analyzeStyleDrift({ attemptID: "a1", register: "concise", outputClass: "technical-steps-code", mode: "chat", enabled: true, reinforced: false, candidate, ...extra });

describe("style drift analyzer", () => {
  test("reports complete preservation when no obligations are supplied", () => {
    const result = analyzeStyleDrift({
      attemptID: "ordinary",
      register: "concise",
      outputClass: "technical-steps-code",
      mode: "chat",
      enabled: true,
      reinforced: false,
      candidate: "The result is ready.",
    });
    expect(result.metrics.correctness.value).toBe(1);
    expect(result.metrics.preservation.value).toBe(1);
  });
  test("returns stable shape and never rewrites", () => {
    const text = "Run the command. Done."; const result = base(text);
    expect(result.state).toEqual({ attemptID: "a1", enabled: true, reinforced: false });
    expect(result.input.candidate).toBeUndefined();
    expect(result.aggregate.severity).toBe("none");
    expect(result.protectedContent.spans).toEqual([]);
  });
  test("ignores an isolated tell", () => expect(base("Utilize this command.").aggregate.severity).toBe("none"));
  test("reports an anti-style cluster", () => {
    const result = base("Utilize this robust approach. Utilize this robust command.");
    expect(result.findings[0]).toMatchObject({ axis: "anti-style-cluster", basis: "cluster", severity: "low" });
  });
  test("reports repeated identical sentences as strong evidence", () => expect(base("The result is ready. The result is ready.").aggregate).toMatchObject({ severity: "high", actionable: true }));
  test("does not classify protected code or commands", () => {
    const result = base("```\nUtilize this robust command.\n```\n$ git status");
    expect(result.findings).toHaveLength(0); expect(result.protectedContent.treatment.mode).toBe("excluded");
  });
  test("off switch disables aggregation", () => expect(base("The result is ready. The result is ready.", { enabled: false }).aggregate).toEqual({ severity: "none", actionable: false, reinforcementEligible: false }));
  test("natural register suppresses readability findings", () => {
    const long = "This sentence contains many words that make it difficult to scan because it keeps adding clauses and details while continuing beyond a reasonable readable cadence for the reader and the surrounding context without a clear stopping point for the requested result. Another sentence contains many words that make it difficult to scan because it keeps adding clauses and details while continuing beyond a reasonable readable cadence for the reader and the surrounding context without a clear stopping point for the requested result.";
    expect(base(long, { register: "natural" }).findings[0]).toMatchObject({ suppressed: true, severity: "none" });
  });
  test("natural register keeps response-length drift actionable", () => {
    const result = base("The answer is to restart the service. The answer is to restart the service.", { register: "natural" });
    expect(result.aggregate).toMatchObject({ severity: "high", actionable: true });
  });
  test("separated repetition is not strong evidence", () => {
    const result = base("The result is ready. Check the logs. The result is ready.");
    expect(result.aggregate.severity).toBe("none");
  });
  test("reports consecutive identical paragraphs without terminal punctuation", () => {
    const result = base("The result is ready\n\nThe result is ready");
    expect(result.aggregate).toMatchObject({ severity: "high", actionable: true });
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ basis: "strong-evidence", evidence: "Consecutive repeated paragraph: The result is ready" }),
    ]));
  });
  test("protects standalone identifiers without masking ordinary prose", () => {
    expect(base("timeoutMs controls the timeout. timeoutMs controls the timeout.").findings).toHaveLength(0);
    expect(base("MyType is a useful type. MyType is a useful type.").findings).toHaveLength(0);
    expect(base("This is ordinary prose. This is ordinary prose.").aggregate.severity).toBe("high");
  });
  test("does not analyze protected spans inside mixed sentences", () => {
    const result = base("Use timeoutMs. The result is ready.", { taskContext: { protectedSpans: [{ start: 4, end: 13 }] } });
    expect(result.findings).toHaveLength(0);
  });
  test("reinforcement is once-only per attempt and uncertainty blocks it", () => {
    const candidate = "Changed `config.ts`. I changed `config.ts`. The production behavior remains uncertain.";
    expect(base(candidate).aggregate.reinforcementEligible).toBe(false);
    expect(base("The result is ready. The result is ready.", { reinforced: true }).aggregate.reinforcementEligible).toBe(false);
  });
  test("missing required phrases and invalid caller spans are explicit uncertainty", () => {
    const result = base("The result is ready.", { taskContext: { requiredPhrases: ["Keep TLS enabled."], protectedSpans: [{ start: -1, end: 4 }] } });
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ uncertainty: expect.objectContaining({ codes: ["preservation"] }) }),
    ]));
    expect(result.aggregate).toMatchObject({ severity: "none", actionable: false, reinforcementEligible: false });
  });
  test("progress requires status context and cross-family clusters stay within sections", () => {
    expect(base("I changed one thing. I changed another thing.").findings).toHaveLength(0);
    expect(base("Utilize this.\n\nRobust option.").findings).toHaveLength(0);
  });
  test("protected spans use UTF-16 offsets", () => {
    const result = base("😀 `Utilize robust code.`", { taskContext: { protectedSpans: [{ start: 3, end: 25 }] } });
    expect(result.findings).toHaveLength(0);
  });
  test("detects each explicit anti-style family only as a repeated cluster", () => {
    const cases = [
      ["AI-vocabulary", "Leverage this. Leverage that."],
      ["adverb", "Really useful. Really clear."],
      ["modal-hedge", "I think this works. I think that works."],
      ["rule-of-three", "First step. Second step."],
      ["not-x-it-is-y", "Not speed, it's clarity. Not size, it's clarity."],
      ["synonym-cycling", "Fix this. Resolve that."],
      ["hidden-actor", "It is changed. It is updated."],
      ["em-dash-spam", "One — two — three."],
      ["diff-anchored-narration", "Line 10 changed. Line 11 changed."],
    ] as const;
    for (const [family, candidate] of cases) expect(base(candidate).findings.map((f) => f.evidence)).toContain(`${family} tell cluster`);
    expect(base("Leverage this command.").findings).toHaveLength(0);
  });
  test("detects the not-X-it-is-Y family with straight and curly apostrophes", () => {
    for (const candidate of [
      "Not speed, it's clarity. Not size, it's clarity.",
      "Not speed, it’s clarity. Not size, it’s clarity.",
    ]) expect(base(candidate).findings.map((f) => f.evidence)).toContain("not-x-it-is-y tell cluster");
    expect(base("Not only speed matters, it's clarity that counts. Not only size matters, it's clarity that counts.").findings).toHaveLength(0);
    expect(base("Not sure, it's fine. Not sure, it's okay.").findings).toHaveLength(0);
    expect(base("Not today, it's Monday. Not tomorrow, it's Tuesday.").findings).toHaveLength(0);
  });
  test("protects standalone API, security, exact strings, and necessary caveats", () => {
    const candidate = 'Use the API. Preserve security controls. The exact string is "Really robust" or \'Not speed, it\'s clarity.\' because rollback is unsafe.';
    const result = base(candidate);
    expect(result.findings).toHaveLength(0);
    expect(result.protectedContent.spans.length).toBeGreaterThanOrEqual(4);
  });
  test("protects qualifiers and conditional instructions", () => {
    const result = base("If the cache is stale, clear it. Do not remove the retry unless startup is complete. Keep at least 2 retries.");
    expect(result.findings).toHaveLength(0);
    expect(result.protectedContent.spans.length).toBeGreaterThanOrEqual(3);
  });
  test("detects a prior result followed by a progress-only paragraph", () => {
    const result = base("Result: the service is ready.\n\nI changed the service configuration.");
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ axis: "progress-narration", evidence: "Repeated progress narration in status context", basis: "strong-evidence" }),
    ]));
  });
  test("keeps duplicate-section cross-family clusters local", () => {
    const result = base("Utilize this command.\n\nRobust option.");
    expect(result.findings).toHaveLength(0);
    expect(base("Utilize this command.\n\nUtilize another command.").findings).toHaveLength(0);
  });
  test("preservation uncertainty suppresses detected evidence and reinforcement independently", () => {
    const result = base("The result is ready. The result is ready. Production behavior remains uncertain.");
    expect(result.uncertainty).toEqual(expect.arrayContaining([expect.objectContaining({ codes: ["preservation"] })]));
    expect(result.findings.every((f) => f.suppressed)).toBe(true);
    expect(result.aggregate).toEqual({ severity: "none", actionable: false, reinforcementEligible: false });
  });
});
