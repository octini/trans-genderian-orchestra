import { describe, expect, test } from "bun:test";
import { validateDelegationBoundary, validateDelegationPacket, verifyClaimObserved } from "../src/delegation";
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
});
