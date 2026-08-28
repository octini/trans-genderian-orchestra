import { describe, expect, test } from "bun:test";
import { parseTaskReport, type TaskStatus } from "../src/report";
import { evaluateClosure } from "../src/lifecycle";

const baseLifecycle = {
  issueId: "tgo-1",
  issueStatusObserved: "in_progress",
  issueAssigneeObserved: "ryangking",
  claimExitCode: 0,
  delegationId: "d-1",
  beadsOperator: "Bernstein",
  reviewComplete: true,
};

function reportFor(status: TaskStatus, retryable: boolean, opts: { withGapsClarification?: boolean } = {}) {
  const gaps = opts.withGapsClarification ? "need user clarification" : status === "complete" ? "none" : status === "bail" ? "human rejected" : status === "failed" ? (retryable ? "transient error" : "permanent error") : "scope violation";
  const retryableLine = `\nRETRYABLE: ${retryable}`;
  // Use STATUS field carrying taxonomy value for wire format
  return `STATUS: ${status}\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: ${gaps}${retryableLine}`;
}

describe("task taxonomy parsing — status × retryable → recovery", () => {
  const table: Array<[TaskStatus, boolean, string]> = [
    ["complete", false, "retry"], // complete valid -> retry fallback but completionSafe true; gate will allow close
    ["bail", false, "escalate"],
    ["bail", true, "escalate"], // bail never retry/reroute regardless of retryable
    ["failed", true, "retry"],
    ["failed", false, "escalate"],
    ["tripwire", false, "escalate"],
    ["tripwire", true, "escalate"], // tripwire never plain retry even if retryable true
  ];
  test.each(table)("parse %s retryable=%s → recovery %s", (status, retryable, expectedRecovery) => {
    const raw = reportFor(status, retryable);
    const parsed = parseTaskReport(raw);
    expect(parsed.taskStatus).toBe(status);
    expect(parsed.retryable).toBe(retryable);
    expect(parsed.taxonomy).toEqual({ status, retryable });
    expect(parsed.recovery).toBe(expectedRecovery);
    // discriminated union sanity: taxonomy.status discriminates
    if (parsed.taxonomy.status === "bail") expect(parsed.taxonomy.retryable).toBeDefined();
  });

  test("complete → success path via lifecycle", () => {
    const parsed = parseTaskReport(reportFor("complete", false));
    expect(parsed.valid).toBe(true);
    expect(parsed.completionSafe).toBe(true);
    const gate = evaluateClosure("standard", baseLifecycle, parsed);
    expect(gate.canClose).toBe(true);
    expect(gate.closureBlocked).toBe(false);
    expect(gate.recovery).toBeUndefined();
  });

  test("bail → no-reroute terminal (escalate, never reroute/retry)", () => {
    const parsed = parseTaskReport(reportFor("bail", false));
    expect(parsed.recovery).toBe("escalate");
    expect(parsed.recovery).not.toBe("reroute");
    expect(parsed.recovery).not.toBe("retry");
    const gate = evaluateClosure("standard", baseLifecycle, parsed);
    expect(gate.canClose).toBe(false);
    expect(gate.recovery).toBe("escalate");
    expect(gate.recovery).not.toBe("reroute");
  });

  test("failed retryable → retry", () => {
    const parsed = parseTaskReport(reportFor("failed", true));
    expect(parsed.recovery).toBe("retry");
    const gate = evaluateClosure("standard", baseLifecycle, parsed);
    expect(gate.recovery).toBe("retry");
  });

  test("failed non-retryable → escalate", () => {
    const parsed = parseTaskReport(reportFor("failed", false));
    expect(parsed.recovery).toBe("escalate");
    const gate = evaluateClosure("standard", baseLifecycle, parsed);
    expect(gate.recovery).toBe("escalate");
  });

  test("tripwire → plan-fix/escalate never plain retry", () => {
    const parsed = parseTaskReport(reportFor("tripwire", false));
    expect(parsed.recovery).toBe("escalate");
    expect(parsed.recovery).not.toBe("retry");
    const gate = evaluateClosure("standard", baseLifecycle, parsed);
    expect(gate.recovery).toBe("escalate");
    expect(gate.recovery).not.toBe("retry");
    // even when retryable true, tripwire stays escalate
    const parsedRetryable = parseTaskReport(`STATUS: tripwire\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: scope violation\nRETRYABLE: true`);
    expect(parsedRetryable.taskStatus).toBe("tripwire");
    expect(parsedRetryable.recovery).toBe("escalate");
    expect(parsedRetryable.recovery).not.toBe("retry");
  });
});

describe("absent-field default", () => {
  test("missing TASK_STATUS/STATUS defaults to failed retryable true", () => {
    const raw = "CHANGES: x\nVERIFIED: exit gate: true\nGAPS: none";
    const parsed = parseTaskReport(raw);
    expect(parsed.taskStatus).toBe("failed");
    expect(parsed.retryable).toBe(true);
    expect(parsed.taxonomy).toEqual({ status: "failed", retryable: true });
    expect(parsed.missing).toContain("STATUS");
    expect(parsed.valid).toBe(false);
    // recovery for default failed retryable should be retry (or user-clarification if GAPS, but here none)
    expect(parsed.recovery).toBe("retry");
    const gate = evaluateClosure("standard", baseLifecycle, parsed);
    expect(gate.recovery).toBe("retry");
  });

  test("existing report without new fields keeps working via legacy mapping", () => {
    // legacy partial → mapped to failed retryable
    const legacyPartial = parseTaskReport("STATUS: partial\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: todo");
    expect(legacyPartial.status).toBe("partial");
    expect(legacyPartial.taskStatus).toBe("failed");
    expect(legacyPartial.retryable).toBe(true);
    expect(legacyPartial.recovery).toBe("retry");
    expect(legacyPartial.valid).toBe(true);

    // legacy blocked → mapped to tripwire
    const legacyBlocked = parseTaskReport("STATUS: blocked\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: blocked");
    expect(legacyBlocked.status).toBe("blocked");
    expect(legacyBlocked.taskStatus).toBe("tripwire");
    expect(legacyBlocked.recovery).toBe("escalate");

    // legacy complete → still complete
    const legacyComplete = parseTaskReport("STATUS: complete\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: none");
    expect(legacyComplete.status).toBe("complete");
    expect(legacyComplete.taskStatus).toBe("complete");
    expect(legacyComplete.completionSafe).toBe(true);
  });

  test("explicit TASK_STATUS field overrides STATUS", () => {
    const raw = "STATUS: complete\nTASK_STATUS: bail\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: human rejected";
    const parsed = parseTaskReport(raw);
    expect(parsed.status).toBe("complete");
    expect(parsed.taskStatus).toBe("bail");
    expect(parsed.recovery).toBe("escalate");
  });

  test("RETRYABLE field parsed case-insensitively", () => {
    const t = parseTaskReport("STATUS: failed\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: err\nRETRYABLE: False");
    expect(t.retryable).toBe(false);
    expect(t.recovery).toBe("escalate");
    const t2 = parseTaskReport("STATUS: failed\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: err\nRETRYABLE: TRUE");
    expect(t2.retryable).toBe(true);
    expect(t2.recovery).toBe("retry");
  });
});

describe("contradiction detection precedence over declared status", () => {
  test("STATUS complete vs VERIFIED failure still fires even when taskStatus complete", () => {
    const raw = "STATUS: complete\nCHANGES: x\nVERIFIED: exit gate: true; tests failed\nGAPS: none";
    const parsed = parseTaskReport(raw);
    expect(parsed.taskStatus).toBe("complete");
    expect(parsed.contradictions.length).toBeGreaterThan(0);
    expect(parsed.valid).toBe(false);
    expect(parsed.completionSafe).toBe(false);
    expect(parsed.recovery).toBe("escalate");
    const gate = evaluateClosure("standard", baseLifecycle, parsed);
    expect(gate.recovery).toBe("escalate");
    expect(gate.canClose).toBe(false);
  });

  test("TASK_STATUS complete vs VERIFIED failure precedence", () => {
    const raw = "TASK_STATUS: complete\nSTATUS: partial\nCHANGES: x\nVERIFIED: exit gate: true; error occurred\nGAPS: none";
    const parsed = parseTaskReport(raw);
    expect(parsed.taskStatus).toBe("complete");
    expect(parsed.contradictions.length).toBeGreaterThan(0);
    expect(parsed.recovery).toBe("escalate");
  });

  test("STATUS complete vs non-empty GAPS contradiction precedence", () => {
    const raw = "STATUS: complete\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: some gap remains";
    const parsed = parseTaskReport(raw);
    expect(parsed.contradictions.length).toBeGreaterThan(0);
    expect(parsed.recovery).toBe("escalate");
    expect(parsed.valid).toBe(false);
  });

  test("missing exit-gate evidence still malformed regardless of taxonomy", () => {
    const raw = "STATUS: bail\nCHANGES: x\nVERIFIED: tests pass\nGAPS: human rejected";
    const parsed = parseTaskReport(raw);
    expect(parsed.malformed).toContain("VERIFIED exit-gate evidence");
    expect(parsed.valid).toBe(false);
    expect(parsed.exitGate).toBe(false);
  });

  test("watchdog abort marker precedence over taxonomy", () => {
    const raw = "WATCHDOG-ABORT\nSTATUS: complete\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: none";
    const parsed = parseTaskReport(raw);
    expect(parsed.watchdogAborted).toBe(true);
    expect(parsed.taskStatus).toBe("complete");
    expect(parsed.recovery).toBe("reroute");
    const gate = evaluateClosure("standard", baseLifecycle, parsed);
    expect(gate.recovery).toBe("reroute");
  });

  test("watchdog abort with bail still reroute", () => {
    const raw = "watchdog abort marker\nSTATUS: bail\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: none";
    const parsed = parseTaskReport(raw);
    expect(parsed.watchdogAborted).toBe(true);
    expect(parsed.recovery).toBe("reroute");
  });

  test("GAPS clarification does not override watchdog/contradiction precedence", () => {
    const raw = "STATUS: complete\nCHANGES: x\nVERIFIED: exit gate: true; tests failed\nGAPS: need user clarification";
    const parsed = parseTaskReport(raw);
    expect(parsed.contradictions.length).toBeGreaterThan(0);
    expect(parsed.recovery).toBe("escalate");
    expect(parsed.recovery).not.toBe("user-clarification");
  });
});

describe("lifecycle taxonomy routing table", () => {
  test.each([
    ["complete", false, undefined], // success path: canClose true, recovery undefined
    ["bail", false, "escalate"],
    ["failed", true, "retry"],
    ["failed", false, "escalate"],
    ["tripwire", false, "escalate"],
  ] as Array<[TaskStatus, boolean, string | undefined]>)("lifecycle %s retryable=%s → %s", (status, retryable, expected) => {
    const raw = reportFor(status, retryable);
    const report = parseTaskReport(raw);
    const gate = evaluateClosure("standard", baseLifecycle, report);
    if (expected === undefined) {
      expect(gate.canClose).toBe(true);
      expect(gate.recovery).toBeUndefined();
    } else {
      expect(gate.canClose).toBe(false);
      expect(gate.recovery).toBe(expected);
    }
  });

  test("lifecycle tiny route still respects taxonomy for recovery when not completionSafe", () => {
    const bail = parseTaskReport(reportFor("bail", false));
    const gate = evaluateClosure("tiny", {}, bail);
    expect(gate.canClose).toBe(false);
    expect(gate.recovery).toBe("escalate");
  });
});

describe("discriminated union no leakage", () => {
  test("taxonomy is discriminated by status field", () => {
    const completed: import("../src/report").TaskTaxonomy = { status: "complete", retryable: false };
    const bailed: import("../src/report").TaskTaxonomy = { status: "bail", retryable: false };
    const failed: import("../src/report").TaskTaxonomy = { status: "failed", retryable: true };
    const tripped: import("../src/report").TaskTaxonomy = { status: "tripwire", retryable: false };
    expect(completed.status).toBe("complete");
    expect(bailed.status).toBe("bail");
    expect(failed.status).toBe("failed");
    expect(tripped.status).toBe("tripwire");
  });
});
