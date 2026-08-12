import { test, expect, describe } from "bun:test";
import {
  detectLaneRejection,
  LANE_REJECTION_PATTERNS,
  REROUTE_NOT_RETRY,
  rerouteSignal,
  TaskFitController,
  type TaskFitInput,
  type TaskFitOutput,
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
