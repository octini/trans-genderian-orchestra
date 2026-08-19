import { test, expect, describe } from "bun:test";
import {
  detectLaneRejection,
  LANE_REJECTION_PATTERNS,
  REROUTE_NOT_RETRY,
  rerouteSignal,
  TaskFitController,
  type TaskFitInput,
  type TaskFitOutput,
  classifyRouting,
  type RouteClass,
} from "../src/fit";

function taskOutput(text: string): TaskFitOutput {
  return { title: "task", output: text, metadata: {} };
}

function taskInput(args?: { subagent_type?: string }): TaskFitInput {
  return { tool: "task", sessionID: "s1", callID: "c1", args };
}

describe("detectLaneRejection", () => {
  test("matches lane-rejection phrases", () => {
    const examples = [
      "STATUS: blocked. This is not my lane.",
      "Not my lane — I'm the review specialist.",
      "Wrong seat for this task.",
      "This isn't my lane, reassign.",
      "Not an implementation task — out of my lane.",
    ];
    for (const example of examples) {
      expect(detectLaneRejection(example), example).toBe(true);
    }
  });

  test("does not match normal status reports", () => {
    const clean = [
      "STATUS: complete · CHANGES: added retry button · VERIFIED: tests pass",
      "STATUS: partial. Two tests failing on edge cases.",
      "This task is done and verified.",
    ];
    for (const example of clean) {
      expect(detectLaneRejection(example), example).toBe(false);
    }
  });

  test("patterns are non-empty and compile", () => {
    expect(LANE_REJECTION_PATTERNS.length).toBeGreaterThan(0);
    for (const pattern of LANE_REJECTION_PATTERNS) {
      expect(pattern).toBeInstanceOf(RegExp);
    }
  });
});

describe("rerouteSignal", () => {
  test("names the rejecting seat when known", () => {
    expect(rerouteSignal("dylan")).toContain("for dylan");
    expect(rerouteSignal("dylan")).toContain(REROUTE_NOT_RETRY);
    expect(rerouteSignal("dylan")).toContain("Do NOT retry the same seat");
  });

  test("omits the seat when unknown", () => {
    const signal = rerouteSignal(undefined);
    expect(signal).toContain(REROUTE_NOT_RETRY);
    expect(signal).not.toContain("for undefined");
  });
});

describe("TaskFitController", () => {
  test("rewrites a lane-rejection into a reroute-not-retry signal", () => {
    const ctrl = new TaskFitController();
    const output = taskOutput("STATUS: blocked. Not my lane.");
    const changed = ctrl.normalize(taskInput({ subagent_type: "dylan" }), output);
    expect(changed).toBe(true);
    expect(output.output).toContain(REROUTE_NOT_RETRY);
    expect(output.output).toContain("for dylan");
    expect(output.output).toContain("Do NOT retry the same seat");
    expect(output.output).toContain("Not my lane");
  });

  test("is a no-op for non-task tools", () => {
    const ctrl = new TaskFitController();
    const output = taskOutput("Not my lane.");
    const changed = ctrl.normalize({ ...taskInput(), tool: "bash" }, output);
    expect(changed).toBe(false);
    expect(output.output).not.toContain(REROUTE_NOT_RETRY);
  });

  test("is a no-op for normal task output", () => {
    const ctrl = new TaskFitController();
    const output = taskOutput("STATUS: complete. All verified.");
    const changed = ctrl.normalize(taskInput(), output);
    expect(changed).toBe(false);
    expect(output.output).toBe("STATUS: complete. All verified.");
  });

  test("is idempotent — does not double-append the signal", () => {
    const ctrl = new TaskFitController();
    const output = taskOutput("STATUS: blocked. Not my lane.");
    ctrl.normalize(taskInput({ subagent_type: "dylan" }), output);
    const first = output.output;
    const changed = ctrl.normalize(taskInput({ subagent_type: "dylan" }), output);
    expect(changed).toBe(false);
    expect(output.output).toBe(first);
  });
});

describe("classifyRouting", () => {
  const literalPhoneReplacement = {
    touchSet: ["src/contacts.ts"],
    boundedTouchSet: true,
    transformation: "replace the literal phone number with the corrected literal",
    reversible: true,
    deterministicVerification: true,
  } as const;

  const ambiguousPhoneUpdate = {
    ...literalPhoneReplacement,
    transformation: "update the phone number",
    ambiguity: true,
  } as const;

  const multiFileContactChange = {
    ...literalPhoneReplacement,
    touchSet: ["src/contacts.ts", "src/contact-form.ts"],
  } as const;

  const riskyApiConfigurationChange = {
    ...literalPhoneReplacement,
    apiSchemaAuthDependencyMigrationSecurityOrDeploymentImpact: true,
  } as const;

  const failedVerification = { ...literalPhoneReplacement, failedVerification: true } as const;
  const discretionaryEscalation = { ...literalPhoneReplacement, agentEscalation: true } as const;

  test("classifies a literal phone replacement as tiny", () => {
    expect(classifyRouting(literalPhoneReplacement)).toEqual({ route: "tiny", tiny: true, reasons: [] });
  });

  test("promotes an ambiguous phone update to heavy", () => {
    expect(classifyRouting(ambiguousPhoneUpdate).route).toBe("heavy");
  });

  test("rejects a multi-file contact change from tiny", () => {
    expect(classifyRouting(multiFileContactChange).route).toBe("standard");
    expect(classifyRouting(multiFileContactChange).tiny).toBe(false);
  });

  test("promotes a risky API/configuration change to heavy", () => {
    expect(classifyRouting(riskyApiConfigurationChange).route).toBe("heavy");
  });

  test("promotes failed verification to heavy", () => {
    expect(classifyRouting(failedVerification).route).toBe("heavy");
  });

  test("supports discretionary escalation to heavy", () => {
    expect(classifyRouting(discretionaryEscalation).route).toBe("heavy");
  });

  test("promotes incomplete tiny evidence to standard", () => {
    const result = classifyRouting({ ...literalPhoneReplacement, deterministicVerification: false });
    expect(result.route).toBe("standard");
    expect(result.tiny).toBe(false);
    expect(result.reasons).toContain("deterministic verification");
  });

  test("promotes ambiguity and blast-radius triggers to heavy", () => {
    const result = classifyRouting({ ...literalPhoneReplacement, ambiguity: true, highBlastRadius: true });
    expect(result.route).toBe("heavy");
    expect(result.reasons).toEqual(["ambiguity", "high blast radius"]);
  });

  test.each([
    "missingLocationOrOldValue",
    "multipleInterpretationsOrFiles",
    "failedVerification",
    "unexpectedDiff",
    "userVisible",
    "irreversible",
    "greenfieldOrUnfamiliar",
    "agentEscalation",
  ] as const)("promotes %s to heavy", (trigger) => {
    expect(classifyRouting({ ...literalPhoneReplacement, [trigger]: true }).route).toBe("heavy");
  });

  test("keeps API and migration impact out of the tiny path", () => {
    expect(classifyRouting(riskyApiConfigurationChange).route).toBe("heavy");
  });

  test("defaults unknown work to standard, not tiny", () => {
    expect(classifyRouting({}).route).toBe("standard");
  });

  test("requires a small named touch set", () => {
    expect(classifyRouting({ ...literalPhoneReplacement, touchSet: [] }).route).toBe("standard");
    expect(classifyRouting(multiFileContactChange).route).toBe("standard");
    expect(classifyRouting({ ...literalPhoneReplacement, touchSet: [" "] }).route).toBe("standard");
  });

  // Preset mapping is intent only (routing docs/tests slice) — not delegation validation or closure enforcement.
  // This classifier only supplies the routing result. Downstream tiny bypass and heavy-pipeline promotion wiring is a later slice.
  test("route suggests preset intent — tiny→Dylan, standard→full spec + wave, heavy→band (intent, not enforcement)", () => {
    function presetIntent(route: RouteClass): string {
      if (route === "tiny") return "dylan-direct";
      if (route === "standard") return "full-spec-wave";
      return "band-review-heavy";
    }
    expect(presetIntent(classifyRouting(literalPhoneReplacement).route)).toBe("dylan-direct");
    expect(presetIntent(classifyRouting({}).route)).toBe("full-spec-wave");
    expect(presetIntent(classifyRouting(riskyApiConfigurationChange).route)).toBe("band-review-heavy");
    // also verify heavy via ambiguity still maps to band intent
    expect(presetIntent(classifyRouting(ambiguousPhoneUpdate).route)).toBe("band-review-heavy");
  });
});
