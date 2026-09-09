import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { problemsFromRecovery, buildProblemsSection } from "../src/metrics";
import { FAILURE_TYPE_HINTS, classifyFailureType, isRunPathRerouteEnabled } from "../src/fit";
import { BoardController, createShim, buildBoardText } from "../src/board";
import { appendRunEvent, hashArgs, scanRunsForProblems } from "../src/runs";

const SAVED_ENV: Record<string, string | undefined> = {};
function saveEnv(keys: string[]) {
  for (const k of keys) SAVED_ENV[k] = process.env[k];
}
function restoreEnv(keys: string[]) {
  for (const k of keys) {
    if (SAVED_ENV[k] === undefined) delete process.env[k];
    else process.env[k] = SAVED_ENV[k];
  }
}
const FLAG_KEYS = ["TGO_RUN_PATH_REROUTE", "TGO_RUN_PATH_REROUTE_KILL", "TGO_DISABLE_RUN_PATH_REROUTE"];
afterEach(() => restoreEnv(FLAG_KEYS));

function fakeRunner() {
  const runner = async (command: string) => {
    if (command.includes("in_progress")) return "[]";
    if (command.includes("bd ready")) return "[]";
    if (command.includes("bd blocked")) return "[]";
    if (command.includes("bd memories")) return "{}";
    return "";
  };
  return runner;
}

describe("run-path reroute — metrics wiring (tgo-21a)", () => {
  test("dead-heartbeat attaches watchdog failureType + hint when enabled, with audit", () => {
    saveEnv(FLAG_KEYS);
    const calls: Array<{ level: string; message: string; extra?: Record<string, unknown> }> = [];
    const log = (level: "warn" | "info" | "error", message: string, extra?: Record<string, unknown>) => {
      calls.push({ level, message, extra });
    };
    const flags = [
      { runId: "tgo-y.1", issueId: "tgo-y.1", reason: "dead-heartbeat" as const, lastHeartbeat: 2000, hasAwaitJson: false, hasTerminalStatus: false },
    ];
    const problems = problemsFromRecovery(flags as any, undefined, { runPathRerouteEnabled: true, log: log as any });
    const entry = problems.find((p) => p.runId === "tgo-y.1")!;
    expect(entry.state).toBe("stuck");
    expect(entry.failureType).toBe("watchdog");
    expect(entry.hint).toBe(FAILURE_TYPE_HINTS.watchdog);
    expect(calls.length).toBe(1);
    expect(calls[0]!.message).toContain("run-path reroute signal emitted");
    expect(calls[0]!.extra).toMatchObject({ runId: "tgo-y.1", failureType: "watchdog" });
  });

  test("dead-heartbeat attaches nothing when kill-switch disables (no hint, no audit)", () => {
    saveEnv(FLAG_KEYS);
    const calls: unknown[] = [];
    const log = (() => { calls.push(1); }) as any;
    const flags = [
      { runId: "tgo-y.1", issueId: "tgo-y.1", reason: "dead-heartbeat" as const, lastHeartbeat: 2000, hasAwaitJson: false, hasTerminalStatus: false },
    ];
    const problems = problemsFromRecovery(flags as any, undefined, { runPathRerouteEnabled: false, log });
    const entry = problems.find((p) => p.runId === "tgo-y.1")!;
    expect(entry.state).toBe("stuck");
    expect(entry.reason).toContain("dead heartbeat");
    expect(entry.failureType).toBeUndefined();
    expect(entry.hint).toBeUndefined();
    expect(calls.length).toBe(0);
  });

  test("suspended/aborted keep existing state/reason strings unchanged (no hint, no audit) even when enabled", () => {
    saveEnv(FLAG_KEYS);
    const calls: unknown[] = [];
    const log = (() => { calls.push(1); }) as any;
    const flags = [
      { runId: "tgo-x.1", issueId: "tgo-x.1", reason: "suspended" as const, lastHeartbeat: 1000, hasAwaitJson: true, hasTerminalStatus: false },
      { runId: "tgo-z.1", issueId: "tgo-z.1", reason: "aborted" as const, lastHeartbeat: 1000, hasAwaitJson: false, hasTerminalStatus: true },
    ];
    const problems = problemsFromRecovery(flags as any, undefined, { runPathRerouteEnabled: true, log });
    const susp = problems.find((p) => p.runId === "tgo-x.1")!;
    const abort = problems.find((p) => p.runId === "tgo-z.1")!;
    expect(susp.state).toBe("awaiting");
    expect(susp.reason).toBe("suspended — await.json present");
    expect(susp.failureType).toBeUndefined();
    expect(susp.hint).toBeUndefined();
    expect(abort.state).toBe("aborted");
    expect(abort.reason).toBe("aborted — terminal status");
    expect(abort.failureType).toBeUndefined();
    expect(abort.hint).toBeUndefined();
    expect(calls.length).toBe(0);
  });

  test("reuses classifyFailureType (no duplicate classifier): RecoveryFlag → watchdog only for dead-heartbeat", () => {
    expect(classifyFailureType({ runId: "tgo-y.1", issueId: "tgo-y.1", reason: "dead-heartbeat", hasAwaitJson: false, hasTerminalStatus: false })).toBe("watchdog");
    expect(classifyFailureType({ runId: "tgo-x.1", issueId: "tgo-x.1", reason: "suspended", hasAwaitJson: true, hasTerminalStatus: false })).toBe("unclassified");
    expect(classifyFailureType({ runId: "tgo-z.1", issueId: "tgo-z.1", reason: "aborted", hasAwaitJson: false, hasTerminalStatus: true })).toBe("unclassified");
  });

  test("buildProblemsSection surfaces hint alongside reason, preserves suspended/aborted strings", () => {
    const enriched = problemsFromRecovery(
      [{ runId: "tgo-y.1", issueId: "tgo-y.1", reason: "dead-heartbeat" as const, lastHeartbeat: 2000, hasAwaitJson: false, hasTerminalStatus: false }] as any,
      undefined,
      { runPathRerouteEnabled: true, log: (() => {}) as any },
    );
    const text = buildProblemsSection([
      ...enriched,
      { runId: "tgo-x.1", state: "awaiting" as const, reason: "suspended — await.json present" },
      { runId: "tgo-z.1", state: "aborted" as const, reason: "aborted — terminal status" },
    ])!;
    expect(text).toContain("tgo-y.1 · STUCK — dead heartbeat");
    expect(text).toContain(FAILURE_TYPE_HINTS.watchdog);
    expect(text).toContain("tgo-x.1 · AWAITING — suspended — await.json present");
    expect(text).not.toContain("tgo-x.1 · AWAITING — suspended — await.json present — Watchdog");
    expect(text).toContain("tgo-z.1 · ABORTED — aborted — terminal status");
  });

  test("flag helper: default on, explicit kill off", () => {
    saveEnv(FLAG_KEYS);
    delete process.env.TGO_RUN_PATH_REROUTE;
    delete process.env.TGO_RUN_PATH_REROUTE_KILL;
    delete process.env.TGO_DISABLE_RUN_PATH_REROUTE;
    expect(isRunPathRerouteEnabled()).toBe(true);
    process.env.TGO_RUN_PATH_REROUTE_KILL = "1";
    expect(isRunPathRerouteEnabled()).toBe(false);
    delete process.env.TGO_RUN_PATH_REROUTE_KILL;
    process.env.TGO_RUN_PATH_REROUTE = "0";
    expect(isRunPathRerouteEnabled()).toBe(false);
    process.env.TGO_RUN_PATH_REROUTE = "1";
    expect(isRunPathRerouteEnabled()).toBe(true);
  });
});

describe("run-path reroute — board wiring (tgo-21a)", () => {
  test("BoardController renderFor surfaces watchdog hint for dead-heartbeat, preserves dedupe keys", async () => {
    saveEnv(FLAG_KEYS);
    delete process.env.TGO_RUN_PATH_REROUTE_KILL;
    delete process.env.TGO_DISABLE_RUN_PATH_REROUTE;
    delete process.env.TGO_RUN_PATH_REROUTE;
    const dir = mkdtempSync(path.join(os.tmpdir(), "tgo-runpath-board-"));
    try {
      const now = Date.now();
      await appendRunEvent(dir, "tgo-rp-stuck.1", { ts: now - 10 * 60 * 1000, type: "heartbeat", seat: "dylan", tool: "heartbeat", argsHash: hashArgs({}), ok: true, issueId: "tgo-rp-stuck.1", note: "heartbeat" });
      const shim = createShim();
      const client = { session: { messages: async () => [] } } as any;
      const logs: Array<{ message: string; extra?: Record<string, unknown> }> = [];
      const ctrl = new BoardController({
        run: fakeRunner() as any,
        shim,
        refreshMs: 0,
        sessionReuse: { repoRoot: dir, client, maxContextTokens: 100000, supported: true, enabled: true },
        log: ((_level: string, message: string, extra?: Record<string, unknown>) => { logs.push({ message, extra }); }) as any,
      });
      const text = await ctrl.renderFor("sess-runpath-1");
      expect(text).toContain("tgo-rp-stuck.1");
      expect(text).toContain("STUCK");
      expect(text).toContain(FAILURE_TYPE_HINTS.watchdog);
      // dedupe keys unchanged: runId:state present once
      const cached = ctrl.getProblems();
      const keys = cached.map((p) => `${p.runId}:${p.state}`);
      expect(new Set(keys).size).toBe(keys.length);
      expect(cached.find((p) => p.runId === "tgo-rp-stuck.1")?.failureType).toBe("watchdog");
      // audit log emitted for run-path signal
      expect(logs.some((l) => l.message.includes("run-path reroute signal emitted"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("BoardController kill-switch suppresses hint but preserves base reason", async () => {
    saveEnv(FLAG_KEYS);
    process.env.TGO_RUN_PATH_REROUTE_KILL = "1";
    const dir = mkdtempSync(path.join(os.tmpdir(), "tgo-runpath-kill-"));
    try {
      const now = Date.now();
      await appendRunEvent(dir, "tgo-rp-kill.1", { ts: now - 10 * 60 * 1000, type: "heartbeat", seat: "dylan", tool: "heartbeat", argsHash: hashArgs({}), ok: true, issueId: "tgo-rp-kill.1", note: "heartbeat" });
      const shim = createShim();
      const client = { session: { messages: async () => [] } } as any;
      const ctrl = new BoardController({
        run: fakeRunner() as any,
        shim,
        refreshMs: 0,
        sessionReuse: { repoRoot: dir, client, maxContextTokens: 100000, supported: true, enabled: true },
      });
      const text = await ctrl.renderFor("sess-runpath-kill-1");
      expect(text).toContain("tgo-rp-kill.1");
      expect(text).toContain("STUCK");
      expect(text).not.toContain(FAILURE_TYPE_HINTS.watchdog);
      expect(ctrl.getProblems().find((p) => p.runId === "tgo-rp-kill.1")?.hint).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
      delete process.env.TGO_RUN_PATH_REROUTE_KILL;
    }
  });

  test("BoardController setProblems preserves hint with replace-not-append dedupe (runId:state)", () => {
    const ctrl = new BoardController({ run: fakeRunner() as any, shim: createShim(), refreshMs: 0 });
    ctrl.setProblems([
      { runId: "tgo-d.1", state: "stuck", reason: "dead heartbeat — last x", failureType: "watchdog", hint: FAILURE_TYPE_HINTS.watchdog },
      { runId: "tgo-d.1", state: "stuck", reason: "dead heartbeat — last y", failureType: "watchdog", hint: FAILURE_TYPE_HINTS.watchdog },
      { runId: "tgo-s.1", state: "awaiting", reason: "suspended — await.json present" },
    ] as any);
    const got = ctrl.getProblems();
    expect(got.filter((p) => p.runId === "tgo-d.1").length).toBe(1);
    expect(got.find((p) => p.runId === "tgo-d.1")?.hint).toBe(FAILURE_TYPE_HINTS.watchdog);
    const text = buildBoardText({ inProgress: [], ready: [], blocked: [], memories: [], streaming: [], problems: got });
    expect(text).toContain(FAILURE_TYPE_HINTS.watchdog);
    expect(text).toContain("tgo-s.1 · AWAITING — suspended — await.json present");
  });
});

describe("run-path reroute — plugin wiring contract (tgo-21a)", () => {
  test("startup scan path: scanRunsForProblems detection unchanged, enrichment gated + audit (plugin.ts:357-366 shape)", async () => {
    saveEnv(FLAG_KEYS);
    delete process.env.TGO_RUN_PATH_REROUTE_KILL;
    delete process.env.TGO_DISABLE_RUN_PATH_REROUTE;
    delete process.env.TGO_RUN_PATH_REROUTE;
    const dir = mkdtempSync(path.join(os.tmpdir(), "tgo-runpath-plugin-"));
    try {
      const now = Date.now();
      await appendRunEvent(dir, "tgo-plg-dead.1", { ts: now - 10 * 60 * 1000, type: "heartbeat", seat: "dylan", tool: "heartbeat", argsHash: hashArgs({}), ok: true, issueId: "tgo-plg-dead.1", note: "heartbeat" });
      await appendRunEvent(dir, "tgo-plg-aborted.1", { ts: now - 5000, type: "heartbeat", seat: "dylan", tool: "heartbeat", argsHash: hashArgs({}), ok: true, issueId: "tgo-plg-aborted.1", note: "heartbeat" });
      await appendRunEvent(dir, "tgo-plg-aborted.1", { ts: now, type: "status", seat: "dylan", tool: "task", argsHash: hashArgs({}), ok: false, issueId: "tgo-plg-aborted.1", note: "aborted" });
      // detection logic unchanged: scan still returns raw reasons regardless of flag
      const flags = await scanRunsForProblems(dir, { now });
      expect(flags.find((f) => f.runId === "tgo-plg-dead.1")?.reason).toBe("dead-heartbeat");
      expect(flags.find((f) => f.runId === "tgo-plg-aborted.1")?.reason).toBe("aborted");
      // plugin consumer path (mirrors plugin.ts startup scan): gate + audit + setProblems
      const { isRunPathRerouteEnabled: gate } = await import("../src/fit");
      const audit: Array<{ message: string; extra?: Record<string, unknown> }> = [];
      const problems = problemsFromRecovery(flags as any, undefined, {
        runPathRerouteEnabled: gate(),
        log: ((_l: string, m: string, e?: Record<string, unknown>) => { audit.push({ message: m, extra: e }); }) as any,
      });
      const dead = problems.find((p) => p.runId === "tgo-plg-dead.1")!;
      const aborted = problems.find((p) => p.runId === "tgo-plg-aborted.1")!;
      expect(dead.failureType).toBe("watchdog");
      expect(dead.hint).toBe(FAILURE_TYPE_HINTS.watchdog);
      expect(aborted.reason).toBe("aborted — terminal status");
      expect(aborted.failureType).toBeUndefined();
      expect(audit.length).toBe(1);
      expect(audit[0]!.extra).toMatchObject({ runId: "tgo-plg-dead.1", failureType: "watchdog" });
      // board.setProblems preserves hint (plugin → board handoff)
      const ctrl = new BoardController({ run: fakeRunner() as any, shim: createShim(), refreshMs: 0 });
      ctrl.setProblems(problems as any);
      expect(ctrl.getProblems().find((p) => p.runId === "tgo-plg-dead.1")?.hint).toBe(FAILURE_TYPE_HINTS.watchdog);
      // kill-switch: same flags produce no hint and no audit
      const killed = problemsFromRecovery(flags as any, undefined, { runPathRerouteEnabled: false, log: (() => { throw new Error("must not log when killed"); }) as any });
      expect(killed.find((p) => p.runId === "tgo-plg-dead.1")?.hint).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
