import { describe, expect, test } from "bun:test";
import { runEndToEndFixture } from "./fixtures/end-to-end";

describe("deterministic orchestration end-to-end fixture", () => {
  test("handles a vague greenfield request with the rigorous path", () => {
    const { vagueGreenfield } = runEndToEndFixture();

    expect(vagueGreenfield.route).toBe("heavy");
    expect(vagueGreenfield.delegation).toBe("validated");
    expect(vagueGreenfield.artifacts.vision).toContain("D&D");
    expect(vagueGreenfield.artifacts.spec).toContain("Campaigns");
    expect(vagueGreenfield.artifacts.dag).toEqual([
      "clarify → research", "research → vision", "vision → spec",
      "spec → implementation", "implementation → review",
    ]);
    expect(vagueGreenfield.events).toEqual([
      "clarification", "research", "vision", "spec", "dag", "delegated",
      "reported", "reviewed", "verified", "closed",
    ]);
    expect(vagueGreenfield.report.completionSafe).toBe(true);
    expect(vagueGreenfield.closure).toMatchObject({ canClose: true, closureBlocked: false });
  });

  test("keeps a literal replacement on the fast path", () => {
    const { trivialLiteral } = runEndToEndFixture();

    expect(trivialLiteral.route).toBe("tiny");
    expect(trivialLiteral.bypassed).toEqual(["grilling", "Wayfinder", "band", "Horowitz"]);
    expect(trivialLiteral.events).toEqual(["verified", "closed"]);
    expect(trivialLiteral.delegation).toBe("bypassed");
    expect(trivialLiteral.closure).toMatchObject({ canClose: true, closureBlocked: false });
  });

  test("recovers from malformed handoff and failed gate without false closure", () => {
    const { malformedRecovery } = runEndToEndFixture();

    expect(malformedRecovery.delegation).toBe("rejected");
    expect(malformedRecovery.report.valid).toBe(false);
    expect(malformedRecovery.report.completionSafe).toBe(false);
    expect(malformedRecovery.recovery).toBe("escalate");
    expect(malformedRecovery.events).toEqual(["delegated", "reported", "recovery"]);
    expect(malformedRecovery.closure).toMatchObject({ canClose: false, closureBlocked: true });
  });

  test("is deterministic and does not need a live model session", () => {
    expect(runEndToEndFixture()).toEqual(runEndToEndFixture());
  });
});
