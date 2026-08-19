import { describe, expect, test } from "bun:test";
import { parseTaskReport } from "../src/report";

const complete = "STATUS: complete\nCHANGES: added parser\nVERIFIED: exit gate: true; tests pass\nGAPS: none";

describe("parseTaskReport", () => {
  test("parses the four fields and preserves raw text", () => {
    const result = parseTaskReport(complete);
    expect(result.valid).toBe(true);
    expect(result.completionSafe).toBe(true);
    expect(result.exitGate).toBe(true);
    expect(result.status).toBe("complete");
    expect(result.fields.CHANGES).toBe("added parser");
    expect(result.raw).toBe(complete);
  });
  test("rejects missing and malformed sections", () => {
    const result = parseTaskReport("STATUS: done\nCHANGES: none");
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(expect.arrayContaining(["VERIFIED", "GAPS"]));
    expect(result.malformed).toContain("STATUS");
  });
  test("does not close contradictory verification", () => {
    const result = parseTaskReport("STATUS: complete\nCHANGES: x\nVERIFIED: tests failed\nGAPS: none");
    expect(result.valid).toBe(false);
    expect(result.contradictions.length).toBeGreaterThan(0);
    expect(result.recovery).toBe("escalate");
  });
  test.each(["no failures", "no errors", "did not fail"])(
    "does not treat negated success phrase '%s' as failure",
    (phrase) => {
       const result = parseTaskReport(`STATUS: complete\nCHANGES: x\nVERIFIED: exit gate: true; tests ${phrase}\nGAPS: none`);
      expect(result.valid).toBe(true);
      expect(result.completionSafe).toBe(true);
      expect(result.contradictions).toEqual([]);
    },
  );
  test("keeps partial reports valid but not completion-safe", () => {
     const result = parseTaskReport("STATUS: partial\nCHANGES: x\nVERIFIED: exit gate: true; tests pass\nGAPS: one test remains");
    expect(result.valid).toBe(true);
    expect(result.completionSafe).toBe(false);
  });
  test("rejects a malformed exit-gate boolean", () => {
    const result = parseTaskReport("STATUS: complete\nCHANGES: x\nVERIFIED: exit gate: true-ish\nGAPS: none");
    expect(result.valid).toBe(false);
    expect(result.malformed).toContain("VERIFIED exit-gate claim");
  });
  test("requires explicit exit-gate evidence before completion", () => {
    const result = parseTaskReport("STATUS: complete\nCHANGES: x\nVERIFIED: tests pass\nGAPS: none");
    expect(result.valid).toBe(false);
    expect(result.exitGate).toBe(false);
    expect(result.completionSafe).toBe(false);
    expect(result.malformed).toContain("VERIFIED exit-gate evidence");
  });
  test("classifies watchdog-aborted reports for reroute", () => {
    const result = parseTaskReport("TGO watchdog abort: no result");
    expect(result.valid).toBe(false);
    expect(result.watchdogAborted).toBe(true);
    expect(result.recovery).toBe("reroute");
    expect(result.raw).toContain("watchdog");
  });

  test("failed verification maps to not completionSafe with retry or escalate", () => {
    const failed = parseTaskReport("STATUS: partial\nCHANGES: x\nVERIFIED: exit gate: true; failed\nGAPS: fix it");
    expect(failed.valid).toBe(false);
    expect(failed.completionSafe).toBe(false);
    expect(failed.watchdogAborted).toBe(false);
    expect(["retry", "escalate"]).toContain(failed.recovery);
    const contradicted = parseTaskReport("STATUS: complete\nCHANGES: x\nVERIFIED: exit gate: true; tests pass\nGAPS: gap remains");
    expect(contradicted.valid).toBe(false);
    expect(contradicted.contradictions.length).toBeGreaterThan(0);
    expect(contradicted.recovery).toBe("escalate");
    expect(contradicted.completionSafe).toBe(false);
  });

  test("watchdog-abort recovery is reroute not retry", () => {
    const r1 = parseTaskReport("WATCHDOG-ABORT: timed out");
    expect(r1.watchdogAborted).toBe(true);
    expect(r1.valid).toBe(false);
    expect(r1.completionSafe).toBe(false);
    expect(r1.recovery).toBe("reroute");
    expect(r1.recovery).not.toBe("retry");
    const r2 = parseTaskReport("tgo WATCHDOG abort marker injected");
    expect(r2.recovery).toBe("reroute");
    expect(r2.recovery).not.toBe("retry");
  });

  test("recovery fallback table: watchdog reroute, blocked escalate, clarification, else retry", () => {
    expect(parseTaskReport("WATCHDOG-ABORT").recovery).toBe("reroute");
    expect(parseTaskReport("STATUS: blocked\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: blocked").recovery).toBe("escalate");
    expect(parseTaskReport("STATUS: escalate\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: escalate").recovery).toBe("escalate");
    expect(parseTaskReport("STATUS: complete\nCHANGES: x\nVERIFIED: tests failed\nGAPS: none").recovery).toBe("escalate");
    expect(parseTaskReport("STATUS: partial\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: need user clarification").recovery).toBe("user-clarification");
    expect(parseTaskReport("STATUS: partial\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: todo").recovery).toBe("retry");
  });
});
