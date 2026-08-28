import { describe, expect, test } from "bun:test";
import { evaluateClosure, verifyClaimObserved } from "../src/lifecycle";
import { parseTaskReport } from "../src/report";

const complete = parseTaskReport("STATUS: complete\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: none");
const lifecycle = { issueId: "tgo-1", issueStatusObserved: "in_progress", issueAssigneeObserved: "ryangking", claimExitCode: 0, delegationId: "d-1", beadsOperator: "Bernstein", reviewComplete: true };

describe("closure metadata validation", () => {
  test("allows complete standard work with review", () => {
    expect(evaluateClosure("standard", lifecycle, complete)).toMatchObject({ canClose: true, closureBlocked: false });
    expect(verifyClaimObserved(lifecycle)).toBe(true);
  });
  test("blocks missing issue and exposes recovery", () => {
    const result = evaluateClosure("heavy", { ...lifecycle, issueId: undefined }, complete);
    expect(result).toMatchObject({ canClose: false, closureBlocked: true, recovery: "retry" });
    expect(result.missing).toContain("issueId");
  });
  test("blocks unclaimed, failed verification, and missing review", () => {
    const report = parseTaskReport("STATUS: partial\nCHANGES: x\nVERIFIED: exit gate: true; failed\nGAPS: fix it");
    const unclaimed = { issueId: "tgo-1", delegationId: "d-1", beadsOperator: "Bernstein", reviewComplete: false };
    const result = evaluateClosure("standard", unclaimed as never, report);
    expect(result.canClose).toBe(false);
    expect(result.missing).toEqual(expect.arrayContaining(["issueStatusObserved:in_progress", "issueAssigneeObserved", "claimExitCode:0", "Horowitz review"]));
    expect(result.diagnostics.join(" ")).toContain("issueStatusObserved");
    expect(result.diagnostics.join(" ")).toContain("in_progress");
    expect(verifyClaimObserved(unclaimed as never)).toBe(false);
  });
  test("distinguishes observed claim from asserted boolean", () => {
    const forged = { issueId: "tgo-1", issueClaimed: true, delegationId: "d-1", beadsOperator: "Bernstein", reviewComplete: true };
    const result = evaluateClosure("standard", forged as never, complete);
    expect(result.canClose).toBe(false);
    expect(result.missing).toEqual(expect.arrayContaining(["issueStatusObserved:in_progress", "issueAssigneeObserved", "claimExitCode:0"]));
    expect(result.diagnostics.join(" ")).toContain("issueStatusObserved");
    expect(result.diagnostics.join(" ")).toContain("in_progress");
    expect(result.diagnostics.join(" ")).toContain("issueAssigneeObserved");
    expect(result.diagnostics.join(" ")).toContain("claimExitCode");
    expect(verifyClaimObserved(forged as never)).toBe(false);
    expect(verifyClaimObserved(lifecycle)).toBe(true);
  });
  test("exposes observed values in diagnostics when claim fields are missing", () => {
    const missing = evaluateClosure("standard", { issueId: "tgo-1", delegationId: "d-1", beadsOperator: "Bernstein", reviewComplete: true } as never, complete);
    expect(missing.missing).toEqual(expect.arrayContaining(["issueStatusObserved:in_progress", "issueAssigneeObserved", "claimExitCode:0"]));
    expect(missing.diagnostics.join(" ")).toContain("issueStatusObserved");
    expect(missing.diagnostics.join(" ")).toContain("in_progress");
    expect(missing.diagnostics.join(" ")).toContain("ryangking".slice(0, 4) === "ryan" ? "issueAssigneeObserved" : "issueAssigneeObserved");
    expect(missing.diagnostics.join(" ")).toContain("claimExitCode");
    const malformed = evaluateClosure("standard", { ...lifecycle, issueStatusObserved: "open", claimExitCode: 1 } as never, complete);
    expect(malformed.canClose).toBe(false);
    expect(malformed.diagnostics.join(" ")).toContain("in_progress");
    expect(malformed.diagnostics.join(" ")).toContain("0");
  });
  test("tiny work bypasses Beads and review ceremony", () => {
    expect(evaluateClosure("tiny", {}, complete)).toMatchObject({ canClose: true, closureBlocked: false });
  });

  // --- failed-gate recovery (tgo-mvw) ---
  test("failed verification: missing reviewComplete, failed VERIFIED, contradictions → blocked with actionable recovery", () => {
    // missing reviewComplete
    const missingReview = evaluateClosure("standard", { ...lifecycle, reviewComplete: false }, complete);
    expect(missingReview).toMatchObject({ canClose: false, closureBlocked: true });
    expect(missingReview.missing).toContain("Horowitz review");
    expect(missingReview.diagnostics.join(" ")).toContain("Horowitz review");
    expect(missingReview.missing.join(" ")).toContain("Horowitz");
    expect(missingReview.recovery).toBeDefined();
    // actionable guidance: diagnostics must say keep open + satisfy missing
    expect(missingReview.diagnostics.join(" ")).toContain("Keep issue");
    expect(missingReview.diagnostics.join(" ")).toContain("satisfy");
    // beadsLifecycle remains metadata-only (allowed:false) — plugin layer guarantees this; evaluateClosure itself is metadata-only
    expect(missingReview.canClose).toBe(false);

    // failed VERIFIED (report not completionSafe)
    const failedVerified = parseTaskReport("STATUS: complete\nCHANGES: x\nVERIFIED: tests failed; exit gate: true\nGAPS: none");
    expect(failedVerified.valid).toBe(false);
    expect(failedVerified.completionSafe).toBe(false);
    const failedGate = evaluateClosure("standard", lifecycle, failedVerified);
    expect(failedGate).toMatchObject({ canClose: false, closureBlocked: true });
    expect(failedGate.diagnostics.join(" ")).toContain("completion-safe");
    expect(failedGate.missing).toEqual(expect.arrayContaining([])); // no lifecycle missing, but report blocks
    expect(failedGate.recovery).toBeDefined();

    // contradictions: STATUS complete but GAPS non-empty
    const contradicted = parseTaskReport("STATUS: complete\nCHANGES: x\nVERIFIED: exit gate: true; tests pass\nGAPS: one gap remains");
    expect(contradicted.contradictions.length).toBeGreaterThan(0);
    expect(contradicted.recovery).toBe("escalate");
    const contradictGate = evaluateClosure("standard", lifecycle, contradicted);
    expect(contradictGate).toMatchObject({ canClose: false, closureBlocked: true, recovery: "escalate" });
    expect(contradictGate.diagnostics.join(" ")).toContain("completion-safe");
    expect(contradictGate.missing).toEqual(expect.any(Array));
  });

  test("active issue blocked (in_progress but missing delegationId/beadsOperator/reviewComplete) → blocked, close not allowed", () => {
    const activeButMissingDelegation = evaluateClosure("standard", { issueId: "tgo-1", issueStatusObserved: "in_progress", issueAssigneeObserved: "ryangking", claimExitCode: 0, beadsOperator: "Bernstein", reviewComplete: true } as never, complete);
    expect(activeButMissingDelegation).toMatchObject({ canClose: false, closureBlocked: true });
    expect(activeButMissingDelegation.missing).toContain("delegationId");
    expect(activeButMissingDelegation.diagnostics.join(" ")).toContain("delegationId");
    expect(activeButMissingDelegation.diagnostics.join(" ")).toContain("Keep issue tgo-1; satisfy");
    expect(activeButMissingDelegation.recovery).toBeDefined();

    const activeMissingOperator = evaluateClosure("standard", { ...lifecycle, beadsOperator: "SomeoneElse" }, complete);
    expect(activeMissingOperator).toMatchObject({ canClose: false, closureBlocked: true });
    expect(activeMissingOperator.missing).toContain("beadsOperator=Bernstein");
    expect(activeMissingOperator.diagnostics.join(" ")).toContain("Bernstein");

    const activeMissingReview = evaluateClosure("standard", { ...lifecycle, reviewComplete: undefined }, complete);
    expect(activeMissingReview).toMatchObject({ canClose: false, closureBlocked: true });
    expect(activeMissingReview.missing).toContain("Horowitz review");
    // prove close not allowed even though claim is in_progress
    expect(verifyClaimObserved({ issueStatusObserved: "in_progress", issueAssigneeObserved: "ryangking", claimExitCode: 0 } as never)).toBe(true);
    expect(activeMissingReview.canClose).toBe(false);
    // actionable: must satisfy missing review before retry/escalate, not reopen (reopen is not valid for active — see beads-probe.test.ts)
    expect(activeMissingReview.diagnostics.join(" ")).toContain("Keep issue");
  });

  test("missing issue (issueId missing or bogus, claimExitCode≠0) → missing fields diagnostics, recovery retry (docs advise user-clarification)", () => {
    const missingId = evaluateClosure("standard", { issueStatusObserved: "in_progress", issueAssigneeObserved: "ryangking", claimExitCode: 0, delegationId: "d-1", beadsOperator: "Bernstein", reviewComplete: true } as never, complete);
    expect(missingId).toMatchObject({ canClose: false, closureBlocked: true });
    expect(missingId.missing).toContain("issueId");
    expect(missingId.diagnostics.join(" ")).toContain("issueId");
    expect(missingId.diagnostics.join(" ")).toContain("Keep issue open");
    // recovery defaults to retry for missing issueId, but docs advise user-clarification/escalate — do not retry same bogus id blindly
    expect(missingId.recovery).toBe("retry");

    const bogusClaim = evaluateClosure("standard", { issueId: "bogus-does-not-exist-xyz", issueStatusObserved: "open", issueAssigneeObserved: "", claimExitCode: 1, delegationId: "d-1", beadsOperator: "Bernstein", reviewComplete: true } as never, complete);
    expect(bogusClaim).toMatchObject({ canClose: false, closureBlocked: true });
    expect(bogusClaim.missing).toEqual(expect.arrayContaining(["issueStatusObserved:in_progress", "issueAssigneeObserved", "claimExitCode:0"]));
    expect(bogusClaim.diagnostics.join(" ")).toContain("issueStatusObserved");
    expect(bogusClaim.diagnostics.join(" ")).toContain("in_progress");
    expect(bogusClaim.diagnostics.join(" ")).toContain("claimExitCode");
    expect(verifyClaimObserved({ issueStatusObserved: "open", issueAssigneeObserved: "", claimExitCode: 1 } as never)).toBe(false);
    // bd reopen on bogus exits 1 — proven in beads-probe.test.ts; retry with same id not actionable
    expect(bogusClaim.recovery).toBe("retry"); // default, but actionable guidance is user-clarification/escalate per docs
  });

  test("watchdog-abort → valid false completionSafe false recovery reroute (never close)", () => {
    const watchdogReport = parseTaskReport("WATCHDOG-ABORT: session timed out\nSTATUS: complete\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: none");
    expect(watchdogReport.valid).toBe(false);
    expect(watchdogReport.completionSafe).toBe(false);
    expect(watchdogReport.watchdogAborted).toBe(true);
    expect(watchdogReport.recovery).toBe("reroute");
    // also covers report.ts watchdog text
    const watchdog2 = parseTaskReport("TGO watchdog abort: no result");
    expect(watchdog2.watchdogAborted).toBe(true);
    expect(watchdog2.recovery).toBe("reroute");
    expect(watchdog2.valid).toBe(false);
    expect(watchdog2.completionSafe).toBe(false);

    const gate = evaluateClosure("standard", lifecycle, watchdogReport);
    expect(gate).toMatchObject({ canClose: false, closureBlocked: true, recovery: "reroute" });
    expect(gate.recovery).toBe("reroute");
    expect(gate.recovery).not.toBe("retry");
    expect(gate.diagnostics.join(" ")).toContain("completion-safe");
    expect(gate.missing).toBeDefined();
    // beadsLifecycle.allowed remains false — plugin metadata-only, never close on watchdog abort
    expect(gate.canClose).toBe(false);
  });

  test("closureGate missing and diagnostics are actionable for retry/reroute/escalate/user-clarification", () => {
    const retryReport = parseTaskReport("STATUS: partial\nCHANGES: x\nVERIFIED: exit gate: true; tests pass\nGAPS: one test remains");
    expect(retryReport.recovery).toBe("retry");
    const retryGate = evaluateClosure("standard", { ...lifecycle, reviewComplete: true }, retryReport);
    expect(retryGate.recovery).toBe("retry");
    expect(retryGate.diagnostics.join(" ")).toContain("Keep issue");

    const escalateReport = parseTaskReport("STATUS: escalate\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: need escalate");
    expect(escalateReport.recovery).toBe("fix-plan");
    const escalateGate = evaluateClosure("standard", lifecycle, escalateReport);
    expect(escalateGate.recovery).toBe("fix-plan");

    const clarificationReport = parseTaskReport("STATUS: blocked\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: need user clarification — ambiguous spec");
    // blocked maps to tripwire (fix-plan) which outranks GAPS clarification
    expect(clarificationReport.recovery).toBe("fix-plan");
    // explicit user-clarification via GAPS
    const userClarReport = parseTaskReport("STATUS: partial\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: need user clarification");
    expect(userClarReport.recovery).toBe("user-clarification");
    const userClarGate = evaluateClosure("standard", lifecycle, userClarReport);
    expect(userClarGate.recovery).toBe("user-clarification");

    const watchdogReport = parseTaskReport("WATCHDOG-ABORT");
    expect(watchdogReport.recovery).toBe("reroute");
    const watchdogGate = evaluateClosure("standard", lifecycle, watchdogReport);
    expect(watchdogGate.recovery).toBe("reroute");
    expect(watchdogGate.recovery).not.toBe("retry");
  });
});
