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
  classifyFailureType,
  FAILURE_TYPE_PATTERNS,
  FAILURE_TYPE_HINTS,
  FAILURE_TYPE_LABELS,
  failureRerouteSignal,
  type FailureType,
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

describe("classifyFailureType — failure-type routing signals (tgo-bf6)", () => {
  const cases: Array<[FailureType, string[]]> = [
    [
      "build",
      [
        "build failed: ts error",
        "error TS2304: Cannot find name 'foo'",
        "TS2345: error: argument of type string is not assignable",
        "Failed to compile src/app.ts",
        "SyntaxError: Unexpected token '{' at src/index.ts:10",
        "Cannot find name 'myVar'",
        "Module not found: Error: Can't resolve './missing'",
      ],
    ],
    [
      "test",
      [
        "test failed: 1 of 10",
        "tests failing: 2 failed",
        "failing tests in src/foo.test.ts",
        "AssertionError: expected 1 to equal 2",
        "FAIL src/foo.test.ts",
        "1 failed, 5 passed",
        "test suite failed — see output",
        "expected foo to equal bar — received baz",
        "expect(value).toEqual(5)",
      ],
    ],
    [
      "dependency",
      [
        "npm ERR! code ERESOLVE unable to resolve dependency tree",
        "npm error: Cannot find module 'lodash'",
        "Cannot find module 'react'",
        "Module not found: lodash",
        "could not resolve dependency react",
        "peer dep missing: react@18",
        "bun install failed with exit 1",
        "ERR_PNPM_FETCH_FAILED",
      ],
    ],
    [
      "deploy",
      [
        "deploy failed: vercel deploy error",
        "deployment failed on CI",
        "CI failed in github actions",
        "docker build failed",
        "push rejected: failed to push",
        "vercel error: deployment aborted",
      ],
    ],
    [
      "env",
      [
        "command not found: bd",
        "executable file not found in $PATH",
        "permission denied: /usr/local/bin/app",
        "no such file or directory: ./missing.sh",
        "ENOENT: no such file or directory open 'config.json'",
        "bad interpreter: /bin/bash^M: no such file",
        "PATH not set in env",
      ],
    ],
    [
      "watchdog",
      [
        "watchdog abort: no result",
        "WATCHDOG-ABORT: timed out",
        "tgo WATCHDOG abort marker injected",
        "Delegated session ses_abc was aborted by the TGO watchdog (wall-clock, 300s).",
      ],
    ],
  ];

  test.each(cases)("classifies %s from representative signatures", (expectedType, examples) => {
    for (const ex of examples) {
      expect(classifyFailureType(ex), `${expectedType}: ${ex}`).toBe(expectedType);
    }
  });

  test("classifies from ParsedReport shape (watchdogAborted flag + raw)", () => {
    expect(classifyFailureType({ watchdogAborted: true, raw: "some text" })).toBe("watchdog");
    expect(classifyFailureType({ raw: "build failed: compile error", fields: { VERIFIED: "error TS2304" } })).toBe("build");
    expect(classifyFailureType({ raw: "test failed: 1 failed", fields: { VERIFIED: "FAIL" } })).toBe("test");
    expect(classifyFailureType({ raw: "npm ERR! missing", fields: {} })).toBe("dependency");
  });

  test("classifies from RunEvent-like shape (note/cmd/status)", () => {
    expect(classifyFailureType({ note: "watchdog abort: idle", tool: "task", issueId: "tgo-1" })).toBe("watchdog");
    expect(classifyFailureType({ note: "end task", cmd: "npm ERR! install failed" })).toBe("dependency");
    expect(classifyFailureType({ note: "test failed", status: "failed" })).toBe("test");
  });

  test("unclassified for benign or empty output — preserves existing routing", () => {
    const benign = [
      "STATUS: complete · CHANGES: added retry button · VERIFIED: exit gate: true; tests pass",
      "This task is done and verified.",
      "build succeeded — 3 files updated",
      "deployment complete: v1.2.3",
      "Updated PATH handling for tests",
      "",
      "   ",
      null,
      undefined,
    ];
    for (const ex of benign) {
      expect(classifyFailureType(ex as unknown as string), String(ex)).toBe("unclassified");
    }
  });

  test("no false positives on benign output containing similar keywords without failure", () => {
    expect(classifyFailureType("tests pass — all 10 passed")).toBe("unclassified");
    expect(classifyFailureType("build succeeded with no errors")).toBe("unclassified");
    expect(classifyFailureType("PATH updated for new tool")).toBe("unclassified");
    expect(classifyFailureType("deployed successfully")).toBe("unclassified");
    expect(classifyFailureType("this path is expected to be a no-op")).toBe("unclassified");
    expect(classifyFailureType("Expected value to be truthy")).toBe("unclassified");
  });

  test("benign prose with expected/to-be is not a test failure, genuine assertion with received is", () => {
    expect(classifyFailureType("this path is expected to be a no-op")).toBe("unclassified");
    expect(classifyFailureType("Expected foo to equal bar — received baz")).toBe("test");
    expect(classifyFailureType("expect(received).toEqual(expected)")).toBe("test");
  });

  test("priority: watchdog wins over other signatures", () => {
    expect(classifyFailureType("watchdog abort: build failed with npm ERR!")).toBe("watchdog");
  });

  test("priority: build vs dependency specificity — 'cannot find module' is dependency, 'cannot find name' is build", () => {
    expect(classifyFailureType("Cannot find module 'lodash'")).toBe("dependency");
    expect(classifyFailureType("Cannot find name 'Foo'")).toBe("build");
  });

  test("rerouteSignal carries failure context when type provided", () => {
    const withBuild = rerouteSignal("dylan", "build");
    expect(withBuild).toContain(REROUTE_NOT_RETRY);
    expect(withBuild).toContain("for dylan");
    expect(withBuild).toContain(FAILURE_TYPE_LABELS.build);
    expect(withBuild).toContain(FAILURE_TYPE_HINTS.build);
    const without = rerouteSignal("dylan");
    expect(without).not.toContain(FAILURE_TYPE_LABELS.build);
    const unclassified = rerouteSignal("dylan", "unclassified");
    expect(unclassified).not.toContain(FAILURE_TYPE_LABELS.build);
    expect(unclassified).toBe(without);
  });

  test("failureRerouteSignal produces same marker with type-specific hint", () => {
    const sig = failureRerouteSignal("dependency", "dylan");
    expect(sig).toContain(REROUTE_NOT_RETRY);
    expect(sig).toContain(FAILURE_TYPE_LABELS.dependency);
    expect(sig).toContain(FAILURE_TYPE_HINTS.dependency);
    expect(sig).toContain("for dylan");
    const testSig = failureRerouteSignal("test");
    expect(testSig).toContain(FAILURE_TYPE_LABELS.test);
    expect(testSig).toContain(FAILURE_TYPE_HINTS.test);
  });

  test("TaskFitController preserves unclassified no-op behavior", () => {
    const ctrl = new TaskFitController();
    const out = taskOutput("STATUS: complete. All verified.");
    expect(ctrl.normalize(taskInput(), out)).toBe(false);
    expect(out.output).toBe("STATUS: complete. All verified.");
  });

  test("TaskFitController reroutes on classified failure even without lane rejection", () => {
    const ctrl = new TaskFitController();
    const out = taskOutput("build failed: error TS2304 Cannot find name 'x'");
    const changed = ctrl.normalize(taskInput({ subagent_type: "dylan" }), out);
    expect(changed).toBe(true);
    expect(out.output).toContain(REROUTE_NOT_RETRY);
    expect(out.output).toContain(FAILURE_TYPE_LABELS.build);
  });

  test("TaskFitController lane rejection still works and is enhanced with failure hint", () => {
    const ctrl = new TaskFitController();
    const out = taskOutput("Not my lane. Also build failed: error TS2304");
    const changed = ctrl.normalize(taskInput({ subagent_type: "horowitz" }), out);
    expect(changed).toBe(true);
    expect(out.output).toContain(REROUTE_NOT_RETRY);
    expect(out.output).toContain("for horowitz");
    expect(out.output).toContain(FAILURE_TYPE_LABELS.build);
  });

  // P1: completed/valid reports NEVER receive the failure advisory
  test("P1 (a): STATUS complete with quoted fixed error does NOT get advisory", () => {
    const ctrl = new TaskFitController();
    const out = taskOutput("STATUS: complete\nCHANGES: fixed error TS2304 in src/foo.ts\nVERIFIED: exit gate: true; all green\nGAPS: none");
    const changed = ctrl.normalize(taskInput({ subagent_type: "dylan" }), out);
    expect(changed).toBe(false);
    expect(out.output).not.toContain(REROUTE_NOT_RETRY);
  });

  test("P1 (b): STATUS complete with GAPS citing npm ERR! does NOT get advisory", () => {
    const ctrl = new TaskFitController();
    const out = taskOutput("STATUS: complete\nCHANGES: done\nVERIFIED: exit gate: true; tests pass\nGAPS: note: previous npm ERR! was fixed");
    const changed = ctrl.normalize(taskInput({ subagent_type: "dylan" }), out);
    expect(changed).toBe(false);
    expect(out.output).not.toContain(REROUTE_NOT_RETRY);
  });

  test("P1 (b) via parsed report: complete status with GAPS still no advisory (parsed param)", () => {
    const ctrl = new TaskFitController();
    const out = taskOutput("STATUS: complete\nCHANGES: done\nVERIFIED: exit gate: true\nGAPS: npm ERR! previously");
    const parsed = { valid: false, status: "complete", taxonomy: { status: "complete" }, raw: out.output, contradictions: ["STATUS complete conflicts with non-empty GAPS"] };
    const changed = ctrl.normalize(taskInput({ subagent_type: "dylan" }), out, parsed as any);
    expect(changed).toBe(false);
    expect(out.output).not.toContain(REROUTE_NOT_RETRY);
  });

  test("P1 (c): genuine failure report DOES get advisory", () => {
    const ctrl = new TaskFitController();
    const out = taskOutput("build failed: error TS2304 Cannot find name 'x'\nSTATUS: partial\nVERIFIED: 1 failed");
    const changed = ctrl.normalize(taskInput({ subagent_type: "dylan" }), out);
    expect(changed).toBe(true);
    expect(out.output).toContain(REROUTE_NOT_RETRY);
    expect(out.output).toContain(FAILURE_TYPE_LABELS.build);
  });

  test("P1 (d): lane rejection still reroutes even with STATUS complete", () => {
    const ctrl = new TaskFitController();
    const out = taskOutput("STATUS: complete but Not my lane — wrong specialist");
    const changed = ctrl.normalize(taskInput({ subagent_type: "dylan" }), out);
    expect(changed).toBe(true);
    expect(out.output).toContain(REROUTE_NOT_RETRY);
    expect(out.output).toContain("for dylan");
  });

  test("P1: failure reroute gated via parsed report param — valid complete skips", () => {
    const ctrl = new TaskFitController();
    const out = taskOutput("build failed: error TS2304 but status says complete");
    const parsed = { valid: true, completionSafe: true, status: "complete", taxonomy: { status: "complete" }, raw: "STATUS: complete" };
    const changed = ctrl.normalize(taskInput({ subagent_type: "dylan" }), out, parsed as any);
    expect(changed).toBe(false);
    expect(out.output).not.toContain(REROUTE_NOT_RETRY);
  });

  test("FAILURE_TYPE_PATTERNS and HINTS cover all classified types", () => {
    const types: Exclude<FailureType, "unclassified">[] = ["build", "test", "dependency", "deploy", "env", "watchdog"];
    for (const t of types) {
      expect(FAILURE_TYPE_PATTERNS[t].length).toBeGreaterThan(0);
      expect(FAILURE_TYPE_HINTS[t]).toBeDefined();
      expect(FAILURE_TYPE_LABELS[t]).toBeDefined();
      for (const re of FAILURE_TYPE_PATTERNS[t]) expect(re).toBeInstanceOf(RegExp);
    }
  });
});

