import { test, expect, describe } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {
  parseCompletionSignal,
  and,
  or,
  not,
  terminationDecision,
} from "../src/termination";
import { captureDelegationSession, loadSessionMap } from "../src/session-reuse";

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "tgo-termination-"));
}

describe("parseCompletionSignal", () => {
  test("complete true when line starting with STATUS: complete", () => {
    expect(parseCompletionSignal("STATUS: complete")).toEqual({ complete: true });
    expect(parseCompletionSignal("status: complete")).toEqual({ complete: true });
    expect(parseCompletionSignal("  STATUS:   complete  ")).toEqual({ complete: true });
    expect(parseCompletionSignal("STATUS: COMPLETE")).toEqual({ complete: true });
    expect(parseCompletionSignal("StAtUs: CoMpLeTe")).toEqual({ complete: true });
  });

  test("complete true when multiline contains STATUS: complete line", () => {
    const text = "Some preamble\nSTATUS: partial\nMore\nSTATUS: complete\nGAPS: none";
    expect(parseCompletionSignal(text).complete).toBe(true);
  });

  test("complete false when STATUS value not complete", () => {
    expect(parseCompletionSignal("STATUS: partial").complete).toBe(false);
    expect(parseCompletionSignal("STATUS: blocked").complete).toBe(false);
    expect(parseCompletionSignal("STATUS: escalate").complete).toBe(false);
    expect(parseCompletionSignal("STATUS: done").complete).toBe(false);
    expect(parseCompletionSignal("STATUS:").complete).toBe(false);
  });

  test("complete false when STATUS not at line start", () => {
    expect(parseCompletionSignal("foo STATUS: complete").complete).toBe(false);
    expect(parseCompletionSignal("The STATUS: complete line inside").complete).toBe(false);
  });

  test("case-insensitive STATUS prefix with leading spaces", () => {
    expect(parseCompletionSignal("   status: complete").complete).toBe(true);
  });

  test("exitGate true variants case-insensitive colon-separated", () => {
    expect(parseCompletionSignal("STATUS: complete\nexitGate: true").exitGate).toBe(true);
    expect(parseCompletionSignal("STATUS: complete\nEXITGATE: TRUE").exitGate).toBe(true);
    expect(parseCompletionSignal("STATUS: complete\nexit gate: true").exitGate).toBe(true);
    expect(parseCompletionSignal("STATUS: complete\nExitGate : true").exitGate).toBe(true);
    expect(parseCompletionSignal("STATUS: complete\nexitGate:  true").exitGate).toBe(true);
    expect(parseCompletionSignal("STATUS: complete\nVERIFIED: exit gate: true; tests pass").exitGate).toBe(true);
  });

  test("exitGate false when explicit false", () => {
    expect(parseCompletionSignal("STATUS: complete\nexitGate: false").exitGate).toBe(false);
    expect(parseCompletionSignal("STATUS: complete\nEXITGATE: FALSE").exitGate).toBe(false);
    expect(parseCompletionSignal("STATUS: complete\nexit gate: false").exitGate).toBe(false);
  });

  test("exitGate absent → undefined", () => {
    expect(parseCompletionSignal("STATUS: complete").exitGate).toBeUndefined();
    expect(parseCompletionSignal("STATUS: complete\nVERIFIED: tests pass").exitGate).toBeUndefined();
  });

  test("garbage text → {complete:false} and no throw", () => {
    expect(parseCompletionSignal("garbage text with no fields")).toEqual({ complete: false });
    expect(parseCompletionSignal("").complete).toBe(false);
    expect(parseCompletionSignal("random\nlines\nhere").complete).toBe(false);
    // never throws on non-string
    expect(parseCompletionSignal(undefined as unknown as string).complete).toBe(false);
    expect(parseCompletionSignal(null as unknown as string).complete).toBe(false);
    expect(parseCompletionSignal((123 as unknown) as string).complete).toBe(false);
  });

  test("tolerant parsing never throws on weird input", () => {
    expect(() => parseCompletionSignal("STATUS: complete\nexitGate: true")).not.toThrow();
    expect(() => parseCompletionSignal("")).not.toThrow();
    expect(() => parseCompletionSignal(undefined as unknown as string)).not.toThrow();
  });

  test("complete true with exitGate true/false/absent combined", () => {
    expect(parseCompletionSignal("STATUS: complete\nexitGate: true")).toEqual({ complete: true, exitGate: true });
    expect(parseCompletionSignal("STATUS: complete\nexitGate: false")).toEqual({ complete: true, exitGate: false });
    const absent = parseCompletionSignal("STATUS: complete\nCHANGES: x");
    expect(absent.complete).toBe(true);
    expect(absent.exitGate).toBeUndefined();
  });
});

describe("Condition combinators and/or/not", () => {
  test("and short-circuits — second not called when first false", () => {
    let secondCalled = false;
    const a: (n: number) => boolean = (n) => n > 0;
    const b: (n: number) => boolean = (n) => {
      secondCalled = true;
      return n < 10;
    };
    const combined = and(a, b);
    expect(combined(-1)).toBe(false);
    expect(secondCalled).toBe(false);
    secondCalled = false;
    expect(combined(5)).toBe(true);
    expect(secondCalled).toBe(true);
  });

  test("and all true → true, any false → false", () => {
    const alwaysTrue = () => true;
    const alwaysFalse = () => false;
    expect(and(alwaysTrue, alwaysTrue)(0)).toBe(true);
    expect(and(alwaysTrue, alwaysFalse)(0)).toBe(false);
    expect(and(alwaysFalse, alwaysTrue)(0)).toBe(false);
    expect(and()(0)).toBe(true);
  });

  test("or short-circuits — second not called when first true", () => {
    let secondCalled = false;
    const a: (n: number) => boolean = (n) => n > 0;
    const b: (n: number) => boolean = () => {
      secondCalled = true;
      return false;
    };
    const combined = or(a, b);
    expect(combined(5)).toBe(true);
    expect(secondCalled).toBe(false);
    secondCalled = false;
    expect(combined(-1)).toBe(false);
    expect(secondCalled).toBe(true);
  });

  test("or any true → true, all false → false", () => {
    const t = () => true;
    const f = () => false;
    expect(or(t, f)(0)).toBe(true);
    expect(or(f, f)(0)).toBe(false);
    expect(or(f, t)(0)).toBe(true);
    expect(or()(0)).toBe(false);
  });

  test("not negates", () => {
    const isPositive = (n: number) => n > 0;
    expect(not(isPositive)(5)).toBe(false);
    expect(not(isPositive)(-1)).toBe(true);
    expect(not(not(isPositive))(5)).toBe(true);
  });

  test("not with and/or composition", () => {
    const a = (n: number) => n > 5;
    const b = (n: number) => n < 10;
    const combined = not(and(a, b));
    expect(combined(7)).toBe(false);
    expect(combined(3)).toBe(true);
    expect(combined(11)).toBe(true);
  });
});

describe("terminationDecision", () => {
  test("complete+gate+residual → true", () => {
    expect(
      terminationDecision({
        signal: { complete: true, exitGate: true },
        exitGateRequired: true,
        toolCallsAfterCompletion: 1,
      }),
    ).toBe(true);
    expect(
      terminationDecision({
        signal: { complete: true, exitGate: true },
        exitGateRequired: true,
        toolCallsAfterCompletion: 5,
      }),
    ).toBe(true);
  });

  test("complete without gate-required → true on residual", () => {
    expect(
      terminationDecision({
        signal: { complete: true },
        exitGateRequired: false,
        toolCallsAfterCompletion: 1,
      }),
    ).toBe(true);
    expect(
      terminationDecision({
        signal: { complete: true, exitGate: false },
        exitGateRequired: false,
        toolCallsAfterCompletion: 1,
      }),
    ).toBe(true);
    expect(
      terminationDecision({
        signal: { complete: true, exitGate: undefined },
        exitGateRequired: false,
        toolCallsAfterCompletion: 2,
      }),
    ).toBe(true);
  });

  test("complete but exitGate required and false → false", () => {
    expect(
      terminationDecision({
        signal: { complete: true, exitGate: false },
        exitGateRequired: true,
        toolCallsAfterCompletion: 1,
      }),
    ).toBe(false);
    expect(
      terminationDecision({
        signal: { complete: true },
        exitGateRequired: true,
        toolCallsAfterCompletion: 1,
      }),
    ).toBe(false);
    expect(
      terminationDecision({
        signal: { complete: true, exitGate: undefined },
        exitGateRequired: true,
        toolCallsAfterCompletion: 3,
      }),
    ).toBe(false);
  });

  test("no residual tool call → false", () => {
    expect(
      terminationDecision({
        signal: { complete: true, exitGate: true },
        exitGateRequired: true,
        toolCallsAfterCompletion: 0,
      }),
    ).toBe(false);
    expect(
      terminationDecision({
        signal: { complete: true },
        exitGateRequired: false,
        toolCallsAfterCompletion: 0,
      }),
    ).toBe(false);
  });

  test("not complete → false regardless of gate and residual", () => {
    expect(
      terminationDecision({
        signal: { complete: false, exitGate: true },
        exitGateRequired: true,
        toolCallsAfterCompletion: 1,
      }),
    ).toBe(false);
    expect(
      terminationDecision({
        signal: { complete: false },
        exitGateRequired: false,
        toolCallsAfterCompletion: 10,
      }),
    ).toBe(false);
  });

  test("edge: exitGateRequired true but signal exitGate true with 0 residual → false", () => {
    expect(
      terminationDecision({
        signal: { complete: true, exitGate: true },
        exitGateRequired: true,
        toolCallsAfterCompletion: 0,
      }),
    ).toBe(false);
  });
});

describe("SessionMapEntry exitGate round-trip through capture", () => {
  test("exitGate true stored and loaded", async () => {
    const dir = tmpDir();
    try {
      await captureDelegationSession({
        tool: "task",
        input: { args: { delegationPacket: { issueId: "tgo-term-a", delegationId: "d1", exitGate: true } } },
        output: { output: "done", metadata: { sessionId: "ses_abc123" } },
        repoRoot: dir,
        enabled: true,
      });
      const loaded = await loadSessionMap(dir);
      expect(loaded["tgo-term-a"]?.sessionId).toBe("ses_abc123");
      expect(loaded["tgo-term-a"]?.exitGate).toBe(true);
      expect(loaded["tgo-term-a"]?.delegationId).toBe("d1");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("exitGate false stored and loaded", async () => {
    const dir = tmpDir();
    try {
      await captureDelegationSession({
        tool: "task",
        input: { args: { delegationPacket: { issueId: "tgo-term-b", delegationId: "d2", exitGate: false } } },
        output: { output: "has ses_xyz999", metadata: {} },
        repoRoot: dir,
        enabled: true,
      });
      const loaded = await loadSessionMap(dir);
      expect(loaded["tgo-term-b"]?.sessionId).toBe("ses_xyz999");
      expect(loaded["tgo-term-b"]?.exitGate).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("exitGate absent → entry has no exitGate field", async () => {
    const dir = tmpDir();
    try {
      await captureDelegationSession({
        tool: "task",
        input: { args: { delegationPacket: { issueId: "tgo-term-c", delegationId: "d3" } } },
        output: { output: "ses_foo123 present" },
        repoRoot: dir,
        enabled: true,
      });
      const loaded = await loadSessionMap(dir);
      expect(loaded["tgo-term-c"]?.sessionId).toBe("ses_foo123");
      expect(loaded["tgo-term-c"]?.exitGate).toBeUndefined();
      // verify raw JSON has no exitGate key
      const raw = await fs.readFile(path.join(dir, ".tgo", "sessions.json"), "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed["tgo-term-c"].exitGate).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("exitGate non-boolean ignored (not stored)", async () => {
    const dir = tmpDir();
    try {
      await captureDelegationSession({
        tool: "task",
        input: { args: { delegationPacket: { issueId: "tgo-term-d", exitGate: "true" as unknown as boolean } } },
        output: { output: "ses_bar456" },
        repoRoot: dir,
        enabled: true,
      });
      const loaded = await loadSessionMap(dir);
      expect(loaded["tgo-term-d"]?.exitGate).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("exitGate round-trip persists through save/load", async () => {
    const dir = tmpDir();
    try {
      // first capture with true
      await captureDelegationSession({
        tool: "task",
        input: { args: { delegationPacket: { issueId: "tgo-term-e", delegationId: "d5", exitGate: true } } },
        output: { output: "ses_round1" },
        repoRoot: dir,
        enabled: true,
      });
      let loaded = await loadSessionMap(dir);
      expect(loaded["tgo-term-e"]?.exitGate).toBe(true);
      // second capture same issue with false overwrites
      await captureDelegationSession({
        tool: "task",
        input: { args: { delegationPacket: { issueId: "tgo-term-e", delegationId: "d5", exitGate: false } } },
        output: { output: "ses_round2" },
        repoRoot: dir,
        enabled: true,
      });
      loaded = await loadSessionMap(dir);
      expect(loaded["tgo-term-e"]?.sessionId).toBe("ses_round2");
      expect(loaded["tgo-term-e"]?.exitGate).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
