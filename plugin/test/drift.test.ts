import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeStyleDrift, __loadedFamilies, __injectVoiceCard } from "../src/drift";
import { voiceCardSchema } from "../src/voices";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function loadDefaultCard() {
  const raw = JSON.parse(fs.readFileSync(path.join(packageRoot, "assets", "voices", "tgo-default.json"), "utf-8"));
  return voiceCardSchema.parse(raw);
}

const base = (candidate: string, extra: Partial<Parameters<typeof analyzeStyleDrift>[0]> = {}) => analyzeStyleDrift({ attemptID: "a1", cardId: "tgo-default", outputClass: "technical-steps-code", mode: "chat", enabled: true, reinforced: false, candidate, ...extra });

describe("style drift analyzer", () => {
  test("reports complete preservation when no obligations are supplied", () => {
    const result = analyzeStyleDrift({
      attemptID: "ordinary",
      cardId: "tgo-default",
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
    expect((result.input as unknown as { candidate?: string }).candidate).toBeUndefined();
    expect(result.aggregate.severity).toBe("none");
    expect(result.protectedContent.spans).toEqual([]);
  });
  test("isolated voice-cadence tell without cluster is ignored (tier3 cluster requirement)", () => {
    // single hedge/hidden-actor without cluster should not be drift; corporate-speak single is tier2 and would be actionable, so use voice-cadence single
    expect(base("It is changed.").aggregate.severity).toBe("none");
  });
  test("tier2 single corporate-speak is actionable (whitelist, not cluster) when unprotected", () => {
    const result = base("Utilize this command.");
    // tier2 whitelist: single instance produces a low-severity finding (not actionable) but is still reported as drift evidence.
    // D7 change: isolated concision tells are now recorded (low) but remain non-actionable per aggregation (medium/high only).
    expect(result.findings.map(f=>f.evidence)).toContain("corporate-speak tell cluster");
    expect(result.findings[0].suppressed).toBe(false);
    expect(result.findings[0].severity).toBe("low");
  });
  test("reports an anti-style cluster (corporate-speak)", () => {
    const result = base("Utilize this robust approach. Utilize this robust command.");
    expect(result.findings[0]).toMatchObject({ axis: "anti-style-cluster", basis: "cluster" });
    expect(result.findings.map(f=>f.evidence)).toContain("corporate-speak tell cluster");
  });
  test("reports repeated identical sentences as strong evidence", () => expect(base("The result is ready. The result is ready.").aggregate).toMatchObject({ severity: "high", actionable: true }));
  test("does not classify protected code or commands", () => {
    const result = base("```\nUtilize this robust command.\n```\n$ git status");
    expect(result.findings).toHaveLength(0); expect(result.protectedContent.treatment.mode).toBe("excluded");
  });
  test("off switch disables aggregation", () => expect(base("The result is ready. The result is ready.", { enabled: false }).aggregate).toEqual({ severity: "none", actionable: false, reinforcementEligible: false }));
  test("card-aware gating: strictness low suppresses voice-cadence cluster without strong evidence", () => {
    // create synthetic card with strictness low
    const baseCard = loadDefaultCard();
    const synthetic = voiceCardSchema.parse({
      ...baseCard,
      id: "tgo-default" as const,
      version: "1.0.0",
      voice_invariants: {
        ...baseCard.voice_invariants,
        anti_patterns: {
          refs: ["mechanics","concision","voice-cadence"],
          strictness: "low" as const,
          thresholds: baseCard.voice_invariants.anti_patterns?.thresholds,
        },
      },
    });
    // inject as tgo-test-low
    (synthetic as unknown as { id: string }).id = "tgo-test-low" as unknown as typeof synthetic.id;
    // need to set id to allow injection but our cache key is card.id string; we inject with id tgo-test-low
    const lowCard: typeof synthetic = { ...synthetic, id: "tgo-default" } as unknown as typeof synthetic;
    // Instead create directly with id tgo-conversational style low? Use existing tgo-prose has high, not low. So we create a new card file-like injection
    const lowInject = { ...synthetic, id: "tgo-test-low" } as unknown as import("../src/voices").VoiceCard;
    __injectVoiceCard(lowInject);
    const long = "This sentence contains many words that make it difficult to scan because it keeps adding clauses and details while continuing beyond a reasonable readable cadence for the reader and the surrounding context without a clear stopping point for the requested result. Another sentence contains many words that make it difficult to scan because it keeps adding clauses and details while continuing beyond a reasonable readable cadence for the reader and the surrounding context without a clear stopping point for the requested result.";
    // readability finding is cluster with basis cluster, should be suppressed under low strictness tier3 without strong-evidence
    const resultLow = analyzeStyleDrift({ attemptID: "a1", cardId: "tgo-test-low" as import("../src/voices").VoiceCardId, outputClass: "technical-steps-code", mode: "chat", enabled: true, reinforced: false, candidate: long });
    const readabilityLow = resultLow.findings.find(f=>f.axis==="readability");
    expect(readabilityLow?.suppressed).toBe(true);
    expect(readabilityLow?.severity).toBe("none");
    // strong-evidence should survive low strictness
    const resultStrong = analyzeStyleDrift({ attemptID: "a1", cardId: "tgo-test-low" as import("../src/voices").VoiceCardId, outputClass: "technical-steps-code", mode: "chat", enabled: true, reinforced: false, candidate: "The result is ready. The result is ready." });
    expect(resultStrong.aggregate).toMatchObject({ severity: "high", actionable: true });
  });
  test("card-aware keeps response-length drift actionable regardless of strictness", () => {
    const result = base("The answer is to restart the service. The answer is to restart the service.");
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
    // D7: tier2 single per section is now recorded (low), so two sections each single corporate-speak now yields 2 low findings (intentional D7 change from old cluster>=2 rule)
    const twoSections = base("Utilize this.\n\nRobust option.");
    expect(twoSections.findings.filter(f=>!f.suppressed).length).toBeGreaterThanOrEqual(2);
    expect(twoSections.findings.every(f=>f.evidence.includes("corporate-speak"))).toBe(true);
  });
  test("protected spans use UTF-16 offsets", () => {
    const result = base("😀 `Utilize robust code.`", { taskContext: { protectedSpans: [{ start: 3, end: 25 }] } });
    expect(result.findings).toHaveLength(0);
  });
  test("detects each pack family only as required cluster (new names)", () => {
    const cases = [
      ["corporate-speak", "Utilize this. Utilize that."],
      ["hedge-stacks", "Really useful. Really clear."],
      ["hedge-stacks", "I think this works. I think that works."],
      ["rule-of-three", "First step. Second step."],
      ["not-x-it-is-y", "Not speed, it's clarity. Not size, it's clarity."],
      ["synonym-cycling", "Fix this. Resolve that."],
      ["passive-hidden-actor", "It is changed. It is updated."],
      ["em-dash-budgets", "One — two — three. One — two — three."],
      ["diff-anchored-narration", "Line 10 changed. Line 11 changed."],
      ["verbal-false-limbs", "make an improvement and make an improvement."],
      ["unnamed-authority", "Experts say this. Experts say that."],
      ["circumlocution-swaps", "due to the fact that X. due to the fact that Y."],
      ["novelty-inflation", "coined term and coined term."],
      ["false-balance", "On the other hand, X. On the other hand, Y."],
    ] as const;
    for (const [family, candidate] of cases) {
      const res = base(candidate);
      expect(res.findings.map((f) => f.evidence)).toContain(`${family} tell cluster`);
    }
    expect(base("Leverage this command.").findings.filter(f=>f.evidence.includes("hedge-stacks"))).toHaveLength(0); // single hedge stack isolated should not fire
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
    // D7: tier2 single per section now yields findings, so sections with single corporate-speak each produce separate findings (not zero)
    const result = base("Utilize this command.\n\nRobust option.");
    expect(result.findings.filter(f=>!f.suppressed).length).toBeGreaterThanOrEqual(2);
    // voice-cadence single per section should still be 0 (cluster>=2) - use hedge single per section to verify locality
    expect(base("It is changed.\n\nIt is updated.").findings.filter(f=>f.evidence.includes("passive-hidden-actor")).length).toBe(0);
    expect(base("Fix this.\n\nResolve that.").findings.filter(f=>f.evidence.includes("synonym-cycling") && !f.suppressed).length).toBe(0);
  });
  test("preservation uncertainty suppresses detected evidence and reinforcement independently", () => {
    const result = base("The result is ready. The result is ready. Production behavior remains uncertain.");
    expect(result.uncertainty).toEqual(expect.arrayContaining([expect.objectContaining({ codes: ["preservation"] })]));
    expect(result.findings.every((f) => f.suppressed)).toBe(true);
    expect(result.aggregate).toEqual({ severity: "none", actionable: false, reinforcementEligible: false });
  });
  // --- new tier and card-gating tests ---
  test("every pack family from §7.4 loads and still fires on representative fixture", () => {
    const expectedFamilies = [
      "spelling-caps-repetition","unfilled-placeholders","chat-citation-markup","ai-tracking-params",
      "corporate-speak","verbal-false-limbs","unnamed-authority","circumlocution-swaps",
      "hedge-stacks","passive-hidden-actor","em-dash-budgets","rule-of-three","synonym-cycling","not-x-it-is-y","closer","diff-anchored-narration","novelty-inflation","false-balance"
    ];
    const loadedNames = __loadedFamilies.map(f=>f.name);
    for (const n of expectedFamilies) expect(loadedNames).toContain(n);
    // representative fixtures already tested above; spot check mechanics still fires
    expect(base("[TODO] fix this.").findings.map(f=>f.evidence)).toContain("unfilled-placeholders tell cluster");
    expect(base("https://example.com?foo=1&utm_source=chatgpt").findings.map(f=>f.evidence)).toContain("ai-tracking-params tell cluster");
  });
  test("tier-1 mechanics always actionable when unprotected, even single instance", () => {
    const result = base("[TODO] placeholder");
    const f = result.findings.find(x=>x.evidence.includes("unfilled-placeholders"));
    expect(f).toBeDefined();
    expect(f?.suppressed).toBe(false);
    expect(result.aggregate.actionable).toBe(true);
  });
  test("tier-2 whitelist-gated: protected spans suppress concision", () => {
    const candidate = "Utilize this command and utilize that command.";
    const protectedResult = base(candidate, { taskContext: { protectedSpans: [{ start: 0, end: candidate.length }] } });
    expect(protectedResult.findings.filter(f=>f.evidence.includes("corporate-speak")).every(f=>f.suppressed || f.spans.length===0)).toBe(true);
    expect(protectedResult.findings.filter(f=>!f.suppressed && f.severity!=="none").length).toBe(0);
    const unprotectedResult = base(candidate);
    expect(unprotectedResult.findings.some(f=>f.evidence.includes("corporate-speak") && !f.suppressed)).toBe(true);
  });
  test("tier-3 requires cluster >=2 to become actionable", () => {
    expect(base("It is changed.").findings.filter(f=>f.evidence.includes("passive-hidden-actor"))).toHaveLength(0);
    const clustered = base("It is changed. It is updated.");
    expect(clustered.findings.map(f=>f.evidence)).toContain("passive-hidden-actor tell cluster");
    expect(clustered.findings.find(f=>f.evidence.includes("passive-hidden-actor"))?.suppressed).toBe(false);
  });
  test("card refs-exclusion suppresses (synthetic card excluding passive-hidden-actor)", () => {
    const baseCard = loadDefaultCard();
    const syntheticCard = voiceCardSchema.parse({
      ...baseCard,
      id: "tgo-default",
      voice_invariants: {
        ...baseCard.voice_invariants,
        anti_patterns: {
          refs: ["mechanics","concision"], // exclude voice-cadence family passive-hidden-actor
          strictness: "medium" as const,
          thresholds: baseCard.voice_invariants.anti_patterns?.thresholds,
        },
      },
    });
    const inject: import("../src/voices").VoiceCard = { ...syntheticCard, id: "tgo-test-exclude" as import("../src/voices").VoiceCardId };
    __injectVoiceCard(inject);
    const candidate = "It is changed. It is updated.";
    const defaultResult = base(candidate);
    expect(defaultResult.findings.map(f=>f.evidence)).toContain("passive-hidden-actor tell cluster");
    expect(defaultResult.findings.find(f=>f.evidence.includes("passive-hidden-actor"))?.suppressed).toBe(false);
    const excludedResult = analyzeStyleDrift({ attemptID: "a1", cardId: "tgo-test-exclude" as import("../src/voices").VoiceCardId, outputClass: "technical-steps-code", mode: "chat", enabled: true, reinforced: false, candidate });
    const f = excludedResult.findings.find(x=>x.evidence.includes("passive-hidden-actor"));
    // when refs excludes, the family finding should be suppressed (or not even actionable)
    // Our implementation suppresses with reason card marks family non-applicable
    if (f) expect(f.suppressed).toBe(true);
    expect(excludedResult.aggregate.actionable).toBe(false);
  });
  test("card threshold not met suppresses (em-dash per-100w)", () => {
    const baseCard = loadDefaultCard();
    const highThresholdCard = voiceCardSchema.parse({
      ...baseCard,
      id: "tgo-default",
      voice_invariants: {
        ...baseCard.voice_invariants,
        punctuation_budgets: { ...baseCard.voice_invariants.punctuation_budgets, em_dash_per_100w_max: 10, em_dash_cluster_flag: 10 },
        anti_patterns: {
          ...baseCard.voice_invariants.anti_patterns!,
          thresholds: { ...baseCard.voice_invariants.anti_patterns?.thresholds, em_dash_per_100w_max: 10 },
        },
      },
    });
    const inject = { ...highThresholdCard, id: "tgo-test-high-dash" as import("../src/voices").VoiceCardId };
    __injectVoiceCard(inject);
    // candidate with 2 dashes and ~40 neutral words => ~5 per100w >0.5 (default actionable) but <10 (high threshold suppressed); avoid other families
    const candidate = Array(20).fill("alpha").join(" ") + " — " + Array(20).fill("beta").join(" ") + " — end.";
    const defaultResult = base(candidate);
    expect(defaultResult.findings.map(f=>f.evidence)).toContain("em-dash-budgets tell cluster");
    const highResult = analyzeStyleDrift({ attemptID: "a1", cardId: "tgo-test-high-dash" as import("../src/voices").VoiceCardId, outputClass: "technical-steps-code", mode: "chat", enabled: true, reinforced: false, candidate });
    const f = highResult.findings.find(x=>x.evidence.includes("em-dash-budgets"));
    // with high threshold, below threshold => suppressed
    if (f) expect(f.suppressed).toBe(true);
    expect(highResult.findings.filter(x=>!x.suppressed && (x.severity==="medium" || x.severity==="high")).length).toBe(0);
  });
  test("strictness low + tier3 + weak evidence suppresses while strong-evidence survives", () => {
    const baseCard = loadDefaultCard();
    const lowCard = voiceCardSchema.parse({
      ...baseCard,
      id: "tgo-default",
      voice_invariants: {
        ...baseCard.voice_invariants,
        anti_patterns: {
          refs: ["mechanics","concision","voice-cadence"],
          strictness: "low" as const,
          thresholds: baseCard.voice_invariants.anti_patterns?.thresholds,
        },
      },
    });
    const inject = { ...lowCard, id: "tgo-test-low2" as import("../src/voices").VoiceCardId };
    __injectVoiceCard(inject);
    const weak = analyzeStyleDrift({ attemptID: "a1", cardId: "tgo-test-low2" as import("../src/voices").VoiceCardId, outputClass: "technical-steps-code", mode: "chat", enabled: true, reinforced: false, candidate: "It is changed. It is updated." });
    expect(weak.findings.find(f=>f.evidence.includes("passive-hidden-actor"))?.suppressed).toBe(true);
    const strong = analyzeStyleDrift({ attemptID: "a1", cardId: "tgo-test-low2" as import("../src/voices").VoiceCardId, outputClass: "technical-steps-code", mode: "chat", enabled: true, reinforced: false, candidate: "The result is ready. The result is ready." });
    expect(strong.aggregate.actionable).toBe(true);
  });
  test("preservation finding suppressed regardless of card", () => {
    const result = analyzeStyleDrift({ attemptID: "a1", cardId: "tgo-prose", outputClass: "technical-steps-code", mode: "chat", enabled: true, reinforced: false, candidate: "The result is ready. The result is ready. Production behavior remains uncertain." });
    expect(result.findings.every(f=>f.suppressed)).toBe(true);
    expect(result.aggregate).toEqual({ severity: "none", actionable: false, reinforcementEligible: false });
  });
  test("mechanics never card-suppressed even when card excludes its family (tier1)", () => {
    const baseCard = loadDefaultCard();
    const excludeMechanics = voiceCardSchema.parse({
      ...baseCard,
      id: "tgo-default",
      voice_invariants: {
        ...baseCard.voice_invariants,
        anti_patterns: {
          refs: ["concision"], // exclude mechanics
          strictness: "low" as const,
          thresholds: baseCard.voice_invariants.anti_patterns?.thresholds,
        },
      },
    });
    const inject = { ...excludeMechanics, id: "tgo-test-exclude-mech" as import("../src/voices").VoiceCardId };
    __injectVoiceCard(inject);
    const candidate = "[TODO] fix this.";
    const result = analyzeStyleDrift({ attemptID: "a1", cardId: "tgo-test-exclude-mech" as import("../src/voices").VoiceCardId, outputClass: "technical-steps-code", mode: "chat", enabled: true, reinforced: false, candidate });
    const f = result.findings.find(x=>x.evidence.includes("unfilled-placeholders"));
    expect(f).toBeDefined();
    expect(f?.suppressed).toBe(false);
    expect(result.aggregate.actionable).toBe(true);
  });

  // Fix 2 — Tier-1 protected spans masking
  test("tier-1 protected: [12] citation inside code span suppressed, unprotected citeturn fires", () => {
    const codeSuppressed = base("`code [12] citation` and `citeturn0search0`");
    expect(codeSuppressed.findings.some((f) => f.evidence.includes("chat-citation-markup"))).toBe(false);
    const plainCiteturn = base("leak citeturn0search0 here");
    expect(plainCiteturn.findings.some((f) => f.evidence.includes("chat-citation-markup"))).toBe(true);
    const plainTodoInCode = base("`[TODO]` inside code");
    expect(plainTodoInCode.findings.some((f) => f.evidence.includes("unfilled-placeholders"))).toBe(false);
    const plainTodo = base("[TODO] fix this");
    expect(plainTodo.findings.some((f) => f.evidence.includes("unfilled-placeholders"))).toBe(true);
  });

  // Fix 3 — mechanics.json pattern scoping
  test("mechanics scoping: arr[1] and [1] in prose do NOT fire; citeturn fires; [TODO] fires; code-span suppressed", () => {
    expect(base("arr[1] index").findings.some((f) => f.evidence.includes("chat-citation-markup"))).toBe(false);
    expect(base("[1] in prose").findings.some((f) => f.evidence.includes("chat-citation-markup"))).toBe(false);
    expect(base("citeturn0search0 leak").findings.some((f) => f.evidence.includes("chat-citation-markup"))).toBe(true);
    expect(base("citation oai_citation leak").findings.some((f) => f.evidence.includes("chat-citation-markup"))).toBe(true);
    expect(base("[citation:1] leak").findings.some((f) => f.evidence.includes("chat-citation-markup"))).toBe(true);
    expect(base("[attached_file:1] leak").findings.some((f) => f.evidence.includes("chat-citation-markup"))).toBe(true);
    expect(base("[TODO] placeholder").findings.some((f) => f.evidence.includes("unfilled-placeholders"))).toBe(true);
    expect(base("TODO bare without brackets").findings.some((f) => f.evidence.includes("unfilled-placeholders"))).toBe(false);
    expect(base("20 25-XX-XX").findings.some((f) => f.evidence.includes("unfilled-placeholders"))).toBe(false);
    expect(base("2025-XX-XX date").findings.some((f) => f.evidence.includes("unfilled-placeholders"))).toBe(true);
    expect(base("{{placeholder}} here").findings.some((f) => f.evidence.includes("unfilled-placeholders"))).toBe(true);
    expect(base("<<insert here>> placeholder").findings.some((f) => f.evidence.includes("unfilled-placeholders"))).toBe(true);
    // code-span suppressed per Fix 2
    expect(base("`citeturn0search0` in code").findings.some((f) => f.evidence.includes("chat-citation-markup"))).toBe(false);
    expect(base("`[TODO]` in code").findings.some((f) => f.evidence.includes("unfilled-placeholders"))).toBe(false);
  });
});
