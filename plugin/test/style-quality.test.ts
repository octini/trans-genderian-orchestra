import { describe, expect, test } from "bun:test";
import { STYLE_QUALITY_FIXTURES, STYLE_QUALITY_FIXTURE_IDS, type ProtectedKind } from "./fixtures/style-quality";
import { analyzeStyleDrift } from "../src/drift";

const REQUIRED_KINDS: ProtectedKind[] = [
  "code", "command", "error", "warning", "quotation", "exact-string", "number-unit", "negation", "necessary-explanation",
];

describe("style-quality evaluation corpus", () => {
  test("is deterministic and covers the tgo-85r dimensions", () => {
    expect(new Set(STYLE_QUALITY_FIXTURE_IDS).size).toBe(STYLE_QUALITY_FIXTURES.length);
    expect(STYLE_QUALITY_FIXTURES).toHaveLength(10);
    expect(new Set(STYLE_QUALITY_FIXTURES.map((fixture) => fixture.mode))).toEqual(new Set(["chat", "tool-heavy"]));
    expect(new Set(STYLE_QUALITY_FIXTURES.map((fixture) => fixture.outputClass))).toEqual(new Set(["technical-steps-code", "voice-forward-prose"]));
    for (const fixture of STYLE_QUALITY_FIXTURES) {
      expect(fixture.candidate.length).toBeGreaterThan(0);
      expect(fixture.expected.findings.every((finding) => finding.evidence.length > 0)).toBe(true);
      expect(fixture.expected.findings.filter((finding) => finding.suppressed).every((finding) => finding.suppressionReason)).toBe(true);
      expect(fixture.expected.reinforcementEligible).toBe(fixture.expected.actionable && fixture.expected.preservation !== "uncertain");
    }
  });

  test("represents every protected-content category", () => {
    const kinds = new Set(STYLE_QUALITY_FIXTURES.flatMap((fixture) => fixture.protected.map(({ kind }) => kind)));
    for (const kind of REQUIRED_KINDS) expect(kinds).toContain(kind);
  });

  test("connects fixtures to the pure analyzer with ordered one-to-one contracts", () => {
    for (const fixture of STYLE_QUALITY_FIXTURES) {
      const result = analyzeStyleDrift({ attemptID: fixture.id, register: fixture.register, outputClass: fixture.outputClass, mode: fixture.mode, enabled: true, reinforced: false, candidate: fixture.candidate });
      expect(result.input).toEqual({ attemptID: fixture.id, register: fixture.register, outputClass: fixture.outputClass, mode: fixture.mode, enabled: true, reinforced: false });
      expect(result.state).toEqual({ attemptID: fixture.id, enabled: true, reinforced: false });
      expect(result.aggregate.severity).toBe(fixture.expected.aggregate);
      expect(result.aggregate.actionable).toBe(fixture.expected.actionable);
      expect(result.aggregate.reinforcementEligible).toBe(fixture.expected.reinforcementEligible);
      expect(result.protectedContent.spans.length).toBeGreaterThanOrEqual(fixture.expected.protectedKinds.length);
      expect(result.findings).toHaveLength(fixture.expected.findings.length);
      fixture.expected.findings.forEach((expected, index) => {
        const actual = result.findings[index];
        expect(actual).toBeDefined();
        expect(actual).toMatchObject({ axis: expected.axis, severity: expected.severity, basis: expected.basis, evidence: expected.evidence, suppressed: expected.suppressed, spans: expected.spans });
        expect(actual?.uncertainty).toEqual(expect.objectContaining({ codes: expected.uncertainty ? [expected.uncertainty] : [], spans: expect.any(Array) }));
        if (expected.suppressionReason !== undefined) expect(actual?.suppressionReason).toBe(expected.suppressionReason);
      });
      expect(result.metrics.concision).toEqual(expect.objectContaining({ unit: "ratio", baseline: null, value: 0 }));
      expect(result.metrics.readability).toEqual(expect.objectContaining({ unit: "score-0-to-1", baseline: null }));
      expect(result.metrics.correctness).toEqual(expect.objectContaining({ unit: "score-0-to-1", baseline: null }));
      expect(result.metrics.preservation).toEqual(expect.objectContaining({ unit: "score-0-to-1", baseline: null }));
      expect(result.protectedContent.treatment.reason.length).toBeGreaterThan(0);
      expect(result.uncertainty).toEqual(expect.any(Array));
    }
  });

  test("derives stable protected spans without imposing sentence or line caps", () => {
    for (const fixture of STYLE_QUALITY_FIXTURES) {
      expect(fixture.expected.protectedKinds).toEqual(fixture.protected.map(({ kind }) => kind));
      for (const protectedSpan of fixture.protected) expect(fixture.candidate).toContain(protectedSpan.text);
    }
    expect(JSON.stringify(STYLE_QUALITY_FIXTURES)).not.toMatch(/max(Line|Sentence)|lineLimit|sentenceLimit/);
  });

  test("reports STE soft length as metric-only with mode-gated applicability", () => {
    for (const fixture of STYLE_QUALITY_FIXTURES) {
      const result = analyzeStyleDrift({ attemptID: fixture.id, register: fixture.register, outputClass: fixture.outputClass, mode: fixture.mode, enabled: true, reinforced: false, candidate: fixture.candidate });
      if (fixture.mode === "chat") {
        expect(result.metrics.steLength.applicable).toBe(false);
        expect(result.metrics.steLength.violationsPer100w).toBe(0);
        expect(result.metrics.steLength.violations).toBe(0);
      } else {
        // tool-heavy: STE is measured but metric-only
        expect(result.metrics.steLength.applicable).toBe(true);
        expect(result.metrics.steLength.violationsPer100w).toBeGreaterThanOrEqual(0);
        expect(result.metrics.steLength.basis.toLowerCase()).toContain("metric only");
        // never affects reinforcementEligible or valid — steLength does not gate actionable
        // reinforcementEligible is derived from findings/uncertainty only, not steLength
        const hasBlockingFinding = result.findings.some((f) => !f.suppressed && ["medium", "high"].includes(f.severity));
        // For fixtures expected actionable, eligible should align; for non-actionable, not eligible regardless of steLength violations
        expect(result.aggregate.reinforcementEligible).toBe(result.aggregate.actionable && !result.findings.some((f) => f.uncertainty.codes.length > 0));
        void hasBlockingFinding;
      }
    }
    // ste-selective variant: still metric-only even when violations exist (benchmark proxy)
    const toolHeavyFixture = STYLE_QUALITY_FIXTURES.find((f) => f.mode === "tool-heavy")!;
    const candidateWithSteViolation = toolHeavyFixture.candidate + " " + "word ".repeat(30).trim() + ".";
    const selectiveResult = analyzeStyleDrift({ attemptID: `${toolHeavyFixture.id}:tgo-ste-selective`, register: toolHeavyFixture.register, outputClass: toolHeavyFixture.outputClass, mode: toolHeavyFixture.mode, enabled: true, reinforced: false, candidate: candidateWithSteViolation });
    expect(selectiveResult.metrics.steLength.applicable).toBe(true);
    expect(selectiveResult.metrics.steLength.basis.toLowerCase()).toContain("metric only");
    expect(selectiveResult.metrics.steLength.violationsPer100w).toBeGreaterThanOrEqual(0);
    // metric-only never affects reinforcementEligible or valid
    expect(selectiveResult.aggregate.reinforcementEligible).toBe(selectiveResult.aggregate.actionable && selectiveResult.findings.every((f) => f.uncertainty.codes.length === 0));
  });
});
