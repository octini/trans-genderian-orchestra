import { describe, expect, test } from "bun:test";
import {
  validateDelegationBoundary,
  validateDelegationPacket,
  verifyClaimObserved,
  DELEGATION_STYLES,
  isDelegationStyle,
  delegationStyleToVoiceCardId,
  voiceCardIdToDelegationStyle,
  resolveEffectiveVoiceCardId,
} from "../src/delegation";
import type { RoutingClassification } from "../src/fit";

const standard: RoutingClassification = { route: "standard", tiny: false, reasons: [] };
const heavy: RoutingClassification = { route: "heavy", tiny: false, reasons: ["ambiguity"] };
const tiny: RoutingClassification = { route: "tiny", tiny: true, reasons: [] };

const full = {
  Objective: "Replace the value",
  Files: ["src/value.ts"],
  Interfaces: "Keep the exported function signature",
  Constraints: "Do not change adjacent behavior",
  Verification: "Run the focused test",
  exitGate: true,
  issueId: "tgo-test",
  issueStatusObserved: "in_progress",
  issueAssigneeObserved: "ryangking",
  claimExitCode: 0,
  delegationId: "delegation-test",
  beadsOperator: "Bernstein",
};

describe("validateDelegationPacket", () => {
  test("accepts a complete standard packet", () => {
    expect(validateDelegationPacket(standard, full)).toMatchObject({ route: "standard", valid: true, missing: [], malformed: [] });
  });

  test("requires the full contract for heavy work", () => {
    const result = validateDelegationPacket(heavy, { ...full, Interfaces: "" });
    expect(result.valid).toBe(false);
    expect(result.malformed).toContain("Interfaces");
    expect(result.diagnostics.join(" ")).toContain("Interfaces");
  });

  test("requires an actual boolean exit gate", () => {
    const result = validateDelegationPacket(standard, { ...full, exitGate: "tests pass" });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.join(" ")).toContain("explicit boolean");
    expect(result.malformed).toContain("exitGate");
  });

  test("accepts the documented tiny minimal form without full ceremony", () => {
    const result = validateDelegationPacket(tiny, {
      minimal: true,
      Objective: "Replace one literal",
      Files: ["src/value.ts"],
      Verification: "Run the focused test",
      exitGate: true,
    });
    expect(result).toMatchObject({ route: "tiny", valid: true, missing: [], malformed: [] });
  });

  test("reports missing and malformed fields", () => {
    const result = validateDelegationPacket(standard, { Objective: "x", Files: [""] });
    expect(result.missing).toEqual(["Interfaces", "Constraints", "Verification", "exitGate", "issueId", "issueStatusObserved", "issueAssigneeObserved", "claimExitCode", "delegationId", "beadsOperator"]);
    expect(result.malformed).toContain("Files");
    expect(result.diagnostics.length).toBeGreaterThan(2);
    expect(result.missing).toContain("exitGate");
  });

  test("rejects forged issueClaimed:true without observed fields", () => {
    const forged = {
      Objective: "Replace the value",
      Files: ["src/value.ts"],
      Interfaces: "Keep the exported function signature",
      Constraints: "Do not change adjacent behavior",
      Verification: "Run the focused test",
      exitGate: true,
      issueId: "tgo-test",
      issueClaimed: true,
      delegationId: "delegation-test",
      beadsOperator: "Bernstein",
    };
    const result = validateDelegationPacket(standard, forged);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(expect.arrayContaining(["issueStatusObserved", "issueAssigneeObserved", "claimExitCode"]));
    expect(result.diagnostics.join(" ")).toContain("issueClaimed is forgeable");
    expect(result.diagnostics.join(" ")).toContain("observed claim fields");
    expect(verifyClaimObserved(forged as never)).toBe(false);
  });

  test("accepts observed claim fields", () => {
    const result = validateDelegationPacket(standard, full);
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.malformed).toEqual([]);
    expect(verifyClaimObserved(full as never)).toBe(true);
    expect(result.diagnostics.join(" ")).not.toContain("forgeable");
  });

  test("diagnostics contain observed values when claim fields are missing or malformed", () => {
    const missing = validateDelegationPacket(standard, { Objective: "x", Files: [""] });
    expect(missing.diagnostics.join(" ")).toContain("issueStatusObserved");
    expect(missing.diagnostics.join(" ")).toContain("issueAssigneeObserved");
    expect(missing.diagnostics.join(" ")).toContain("claimExitCode");
    const malformedStatus = validateDelegationPacket(standard, { ...full, issueStatusObserved: "open" });
    expect(malformedStatus.valid).toBe(false);
    expect(malformedStatus.malformed).toContain("issueStatusObserved");
    expect(malformedStatus.diagnostics.join(" ")).toContain("in_progress");
    expect(malformedStatus.diagnostics.join(" ")).toContain("observed");
    const malformedExit = validateDelegationPacket(standard, { ...full, claimExitCode: 1 });
    expect(malformedExit.valid).toBe(false);
    expect(malformedExit.malformed).toContain("claimExitCode");
    expect(malformedExit.diagnostics.join(" ")).toContain("0");
  });

  test("validates only structured delegation arguments at the boundary", () => {
    expect(validateDelegationBoundary({ tool: "task" })).toBeUndefined();
    expect(validateDelegationBoundary({
      touchSet: ["src/value.ts"],
      boundedTouchSet: false,
      delegationPacket: full,
    })).toMatchObject({ valid: true, route: "standard" });
  });

  test("classifies at the boundary and rejects files outside its routed touch set", () => {
    const result = validateDelegationBoundary({
      touchSet: ["src/value.ts"],
      boundedTouchSet: false,
      delegationPacket: { ...full, Files: ["src/other.ts"] },
    });
    expect(result?.valid).toBe(false);
    expect(result?.diagnostics.join(" ")).toContain("routed named touch set");
  });

  test("keeps tiny bypass and promotes ordinary task arguments to standard", () => {
    expect(validateDelegationBoundary({
      touchSet: ["src/value.ts"],
      boundedTouchSet: true,
      transformation: "replace literal",
      reversible: true,
      deterministicVerification: true,
      delegationPacket: {
        minimal: true,
        Objective: "Replace one literal",
        Files: ["src/value.ts"],
        Verification: "Run the focused test",
        exitGate: true,
      },
    })).toMatchObject({ route: "tiny", valid: true });
    expect(validateDelegationBoundary({ touchSet: ["src/value.ts"], delegationPacket: full })).toMatchObject({ route: "standard", valid: true });
  });

  test("rejects invalid route values and inconsistent tiny flags at runtime", () => {
    expect(validateDelegationPacket({ route: "other", tiny: false, reasons: [] }, full).valid).toBe(false);
    expect(validateDelegationPacket({ route: "standard", tiny: true, reasons: [] }, full).valid).toBe(false);
  });

  test("progressPath accepts beads IDs with dots and underscores (VALID_BEAD_ID charset)", () => {
    const withDot = { ...full, progressPath: ".tgo/tgo-a6r.20/progress.md" };
    expect(validateDelegationPacket(standard, withDot).valid).toBe(true);
    expect(validateDelegationPacket(standard, withDot).malformed).not.toContain("progressPath");
    const withUnderscore = { ...full, progressPath: ".tgo/tgo_foo/progress.md" };
    expect(validateDelegationPacket(standard, withUnderscore).valid).toBe(true);
    expect(validateDelegationPacket(standard, withUnderscore).malformed).not.toContain("progressPath");
    const withBoth = { ...full, progressPath: ".tgo/tgo-a6r.20_foo-bar/progress.md" };
    expect(validateDelegationPacket(standard, withBoth).valid).toBe(true);
  });

  test("progressPath rejects path traversal and invalid bead IDs", () => {
    const dotDot = { ...full, progressPath: ".tgo/../progress.md" };
    const dotHidden = { ...full, progressPath: ".tgo/.hidden/progress.md" };
    const empty = { ...full, progressPath: ".tgo//progress.md" };
    for (const bad of [dotDot, dotHidden, empty]) {
      const result = validateDelegationPacket(standard, bad);
      expect(result.valid).toBe(false);
      expect(result.malformed).toContain("progressPath");
      expect(result.diagnostics.join(" ")).toContain("progressPath must match");
    }
    const traversal = { ...full, progressPath: ".tgo/../../etc/passwd" };
    expect(validateDelegationPacket(standard, traversal).valid).toBe(false);
  });
});

describe("validateDelegationPacket style field (T4)", () => {
  test("accepts style ∈ {default,prose,conversational} and rejects invalid strings; absent = valid (defaults to tgo-default)", () => {
    for (const style of DELEGATION_STYLES) {
      const result = validateDelegationPacket(standard, { ...full, style });
      expect(result.valid).toBe(true);
      expect(result.malformed).not.toContain("style");
    }
    const absent = validateDelegationPacket(standard, full);
    expect(absent.valid).toBe(true);
    expect(absent.malformed).not.toContain("style");
    // defaults to tgo-default via helper
    expect(delegationStyleToVoiceCardId("default")).toBe("tgo-default");
    expect(resolveEffectiveVoiceCardId({})).toBe("tgo-default");
    expect(resolveEffectiveVoiceCardId({ packetStyle: undefined })).toBe("tgo-default");
  });

  test("rejects invalid style strings", () => {
    for (const bad of ["prose2", "natural", "concise", "", "PROSE", "default ", 42, null]) {
      const result = validateDelegationPacket(standard, { ...full, style: bad });
      expect(result.valid).toBe(false);
      expect(result.malformed).toContain("style");
      expect(result.diagnostics.join(" ")).toContain("style must be one of");
    }
  });

  test("validates styleSource enum when present", () => {
    for (const src of ["explicit", "packet"] as const) {
      const result = validateDelegationPacket(standard, { ...full, style: "prose", styleSource: src });
      expect(result.valid).toBe(true);
      expect(result.malformed).not.toContain("styleSource");
    }
    const absent = validateDelegationPacket(standard, { ...full, style: "prose" });
    expect(absent.valid).toBe(true);
    const bad = validateDelegationPacket(standard, { ...full, styleSource: "other" });
    expect(bad.valid).toBe(false);
    expect(bad.malformed).toContain("styleSource");
  });

  test("maps delegation style to VoiceCardId and back", () => {
    expect(delegationStyleToVoiceCardId("default")).toBe("tgo-default");
    expect(delegationStyleToVoiceCardId("prose")).toBe("tgo-prose");
    expect(delegationStyleToVoiceCardId("conversational")).toBe("tgo-conversational");
    expect(voiceCardIdToDelegationStyle("tgo-default")).toBe("default");
    expect(voiceCardIdToDelegationStyle("tgo-prose")).toBe("prose");
    expect(voiceCardIdToDelegationStyle("tgo-conversational")).toBe("conversational");
    expect(isDelegationStyle("prose")).toBe(true);
    expect(isDelegationStyle("invalid")).toBe(false);
  });

  test("precedence helper: explicit > packet > default", () => {
    expect(resolveEffectiveVoiceCardId({ packetStyle: "prose", explicitOverride: "tgo-conversational" })).toBe("tgo-conversational");
    expect(resolveEffectiveVoiceCardId({ packetStyle: "prose", explicitOverride: null })).toBe("tgo-prose");
    expect(resolveEffectiveVoiceCardId({ packetStyle: "conversational" })).toBe("tgo-conversational");
    expect(resolveEffectiveVoiceCardId({ packetStyle: "default" })).toBe("tgo-default");
    expect(resolveEffectiveVoiceCardId({})).toBe("tgo-default");
    expect(resolveEffectiveVoiceCardId({ packetStyle: "invalid" })).toBe("tgo-default");
  });
});
