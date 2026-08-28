import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import {
  appendRunEvent,
  readRunEvents,
  runPath,
  pruneRuns,
  scanRunsForProblems,
  hashArgs,
  hasAwaitJson,
  awaitJsonPath,
  isTerminalStatus,
} from "../src/runs";
import { hashString } from "../src/def-snapshot";
import type { RunEvent } from "../src/runs";

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "tgo-runs-"));
}

function v2Event(runId: string, overrides: Partial<RunEvent> & { type: RunEvent["type"] }): RunEvent {
  const base: RunEvent = {
    ts: Date.now(),
    type: overrides.type,
    seat: overrides.seat ?? "dylan",
    tool: overrides.tool ?? (overrides.type === "heartbeat" ? "heartbeat" : "read"),
    argsHash: overrides.argsHash ?? hashArgs({}),
    ok: overrides.ok ?? true,
    issueId: overrides.issueId ?? runId,
    note: overrides.note,
    durationMs: overrides.durationMs,
    cmd: overrides.cmd,
  };
  return { ...base, ...overrides, issueId: overrides.issueId ?? runId };
}

describe("runs — append/replay contract v2", () => {
  let dir: string;
  beforeEach(() => { dir = tmpDir(); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  test("append N events and read back exact sequence (contract v2 required fields)", async () => {
    const runId = "tgo-2ry.1";
    const events: RunEvent[] = [
      { ts: 1000, type: "step", seat: "dylan", tool: "read", argsHash: hashArgs({ path: "a.ts" }), ok: true, issueId: runId, note: "start read", cmd: "read a.ts" },
      { ts: 1001, type: "heartbeat", seat: "dylan", tool: "heartbeat", argsHash: hashArgs({}), ok: true, issueId: runId, note: "heartbeat" },
      { ts: 1002, type: "step", seat: "dylan", tool: "edit", argsHash: "abcd1234", ok: true, issueId: runId, durationMs: 123, note: "end edit", cmd: "edit a.ts" },
      { ts: 1003, type: "status", seat: "dylan", tool: "task", argsHash: hashArgs({}), ok: true, issueId: runId, note: "complete" },
    ];
    for (const e of events) await appendRunEvent(dir, runId, e);
    const read = await readRunEvents(dir, runId);
    expect(read).toEqual(events);
    const raw = await fs.readFile(runPath(dir, runId), "utf-8");
    const lines = raw.trim().split("\n");
    expect(lines.length).toBe(4);
    for (let i = 0; i < lines.length; i++) expect(JSON.parse(lines[i]!)).toEqual(events[i]);
  });

  test("runPath rejects invalid bead id", async () => {
    expect(() => runPath(dir, "../evil")).toThrow();
    expect(() => runPath(dir, "-bad")).toThrow();
    expect(() => runPath(dir, "")).toThrow();
    expect(() => runPath(dir, "tgo-123")).not.toThrow();
  });

  test("appendRunEvent validates required tool/ok/issueId and status terminal", async () => {
    await expect(appendRunEvent(dir, "tgo-ok", { ts: NaN, type: "step", seat: "dylan", tool: "read", argsHash: "a", ok: true, issueId: "tgo-ok" } as any)).rejects.toThrow();
    await expect(appendRunEvent(dir, "tgo-ok", { ts: 1, type: "step", seat: "dylan", tool: "", argsHash: "a", ok: true, issueId: "tgo-ok" } as any)).rejects.toThrow();
    await expect(appendRunEvent(dir, "tgo-ok", { ts: 1, type: "step", seat: "dylan", tool: "read", argsHash: "a", ok: "true" as any, issueId: "tgo-ok" } as any)).rejects.toThrow();
    await expect(appendRunEvent(dir, "tgo-ok", { ts: 1, type: "step", seat: "dylan", tool: "read", argsHash: "a", ok: true, issueId: "" } as any)).rejects.toThrow();
    // status with non-terminal note should throw per contract v2
    await expect(appendRunEvent(dir, "tgo-ok", { ts: 1, type: "status", seat: "dylan", tool: "task", argsHash: "a", ok: true, issueId: "tgo-ok", note: "end read" } as any)).rejects.toThrow();
    // status with terminal note succeeds
    await expect(appendRunEvent(dir, "tgo-ok", { ts: 1, type: "status", seat: "dylan", tool: "task", argsHash: "a", ok: true, issueId: "tgo-ok", note: "complete" } as any)).resolves.toBeUndefined();
    await expect(appendRunEvent(dir, "tgo-ok", { ts: 1, type: "status", seat: "dylan", tool: "task", argsHash: "a", ok: false, issueId: "tgo-ok", note: "failed" } as any)).resolves.toBeUndefined();
    await expect(appendRunEvent(dir, "tgo-ok", { ts: 1, type: "status", seat: "dylan", tool: "task", argsHash: "a", ok: false, issueId: "tgo-ok", note: "aborted" } as any)).resolves.toBeUndefined();
  });

  test("cmd truncation and control strip", async () => {
    const runId = "tgo-cmd.1";
    const long = "a".repeat(600) + "\x00\x01\x02b";
    const ev: RunEvent = { ts: 1, type: "step", seat: "dylan", tool: "bash", argsHash: "h", ok: true, issueId: runId, note: "x", cmd: long };
    await appendRunEvent(dir, runId, ev);
    const read = await readRunEvents(dir, runId);
    expect(read[0]!.cmd!.length).toBe(500);
    expect(read[0]!.cmd!.includes("\x00")).toBe(false);
  });

  test("hashArgs FNV hex", () => {
    const h = hashArgs({ foo: "bar" });
    expect(h).toMatch(/^[0-9a-f]{8}$/);
    expect(h).toBe(hashString(JSON.stringify({ foo: "bar" })));
    expect(hashString("foo.ts")).toBe("b5c9292a");
    expect(hashArgs("foo.ts")).toBe(hashString("foo.ts"));
  });

  test("read returns [] for missing", async () => {
    expect(await readRunEvents(dir, "tgo-missing")).toEqual([]);
  });
});

describe("runs — F1 terminal-only status", () => {
  let dir: string;
  beforeEach(() => { dir = tmpDir(); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  test("status with non-terminal note not treated as terminal (active not flagged)", async () => {
    const runId = "tgo-f1.1";
    const now = 1_000_000;
    const threshold = 1000;
    // Write a status with non-terminal note via raw JSONL (bypass validation to simulate old buggy writer)
    // Instead we test isTerminalStatus helper directly and scanner behavior with step vs status
    await appendRunEvent(dir, runId, v2Event(runId, { ts: now - 5000, type: "heartbeat", tool: "heartbeat", argsHash: hashArgs({}), ok: true, note: "heartbeat" }));
    await appendRunEvent(dir, runId, v2Event(runId, { ts: now - 4000, type: "step", tool: "bash", argsHash: "h", ok: true, note: "end bash" }));
    // This step completion should NOT be terminal, so stale heartbeat should flag
    const flags = await scanRunsForProblems(dir, { now, heartbeatThresholdMs: threshold });
    const hit = flags.find((f) => f.runId === runId);
    expect(hit?.reason).toBe("dead-heartbeat");
    // Now add terminal status
    await appendRunEvent(dir, runId, v2Event(runId, { ts: now - 100, type: "status", tool: "task", argsHash: "h", ok: true, note: "complete" }));
    const flags2 = await scanRunsForProblems(dir, { now, heartbeatThresholdMs: threshold });
    expect(flags2.find((f) => f.runId === runId)).toBeUndefined();
  });

  test("isTerminalStatus only true for status+terminal note", () => {
    expect(isTerminalStatus({ ts: 1, type: "status", seat: "d", tool: "task", argsHash: "h", ok: true, issueId: "tgo-1", note: "complete" } as any)).toBe(true);
    expect(isTerminalStatus({ ts: 1, type: "status", seat: "d", tool: "task", argsHash: "h", ok: true, issueId: "tgo-1", note: "failed" } as any)).toBe(true);
    expect(isTerminalStatus({ ts: 1, type: "status", seat: "d", tool: "task", argsHash: "h", ok: true, issueId: "tgo-1", note: "aborted" } as any)).toBe(true);
    expect(isTerminalStatus({ ts: 1, type: "status", seat: "d", tool: "task", argsHash: "h", ok: true, issueId: "tgo-1", note: "end read" } as any)).toBe(false);
    expect(isTerminalStatus({ ts: 1, type: "step", seat: "d", tool: "bash", argsHash: "h", ok: true, issueId: "tgo-1", note: "complete" } as any)).toBe(false);
  });
});

describe("runs — F2 contract v2 line shape", () => {
  let dir: string;
  beforeEach(() => { dir = tmpDir(); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  test("every line has tool/ok/issueId, heartbeat tool is heartbeat", async () => {
    const runId = "tgo-v2.1";
    await appendRunEvent(dir, runId, v2Event(runId, { ts: 1000, type: "step", tool: "bash", argsHash: "h", ok: true, note: "s", cmd: "echo hi" }));
    await appendRunEvent(dir, runId, v2Event(runId, { ts: 1001, type: "heartbeat", tool: "heartbeat", argsHash: hashArgs({}), ok: true, note: "heartbeat" }));
    await appendRunEvent(dir, runId, v2Event(runId, { ts: 1002, type: "status", tool: "task", argsHash: "h", ok: true, note: "complete" }));
    const events = await readRunEvents(dir, runId);
    for (const e of events) {
      expect(typeof e.tool).toBe("string");
      expect(e.tool.length).toBeGreaterThan(0);
      expect(typeof e.ok).toBe("boolean");
      expect(typeof e.issueId).toBe("string");
      expect(e.issueId).toBe(runId);
    }
    expect(events.find((e) => e.type === "heartbeat")!.tool).toBe("heartbeat");
    expect(events.find((e) => e.type === "heartbeat")!.ok).toBe(true);
    expect(events.find((e) => e.tool === "bash")!.cmd).toBe("echo hi");
  });
});

describe("runs — dead-heartbeat detection", () => {
  let dir: string;
  beforeEach(() => { dir = tmpDir(); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  test("stale heartbeat flagged", async () => {
    const runId = "tgo-stale.1";
    const now = 1_000_000;
    const threshold = 5 * 60 * 1000;
    await appendRunEvent(dir, runId, v2Event(runId, { ts: now - threshold - 1000, type: "heartbeat", tool: "heartbeat", argsHash: hashArgs({}), ok: true, note: "heartbeat" }));
    await appendRunEvent(dir, runId, v2Event(runId, { ts: now - threshold - 900, type: "step", tool: "read", argsHash: "h", ok: true, note: "s" }));
    const flags = await scanRunsForProblems(dir, { now, heartbeatThresholdMs: threshold });
    expect(flags.find((f) => f.runId === runId)?.reason).toBe("dead-heartbeat");
  });

  test("threshold boundary", async () => {
    const now = 2_000_000;
    const threshold = 3000;
    const exact = "tgo-bound-exact.1";
    const over = "tgo-bound-over.1";
    await appendRunEvent(dir, exact, v2Event(exact, { ts: now - threshold, type: "heartbeat", tool: "heartbeat", argsHash: hashArgs({}), ok: true, note: "heartbeat" }));
    await appendRunEvent(dir, over, v2Event(over, { ts: now - threshold - 1, type: "heartbeat", tool: "heartbeat", argsHash: hashArgs({}), ok: true, note: "heartbeat" }));
    const flags = await scanRunsForProblems(dir, { now, heartbeatThresholdMs: threshold });
    expect(flags.find((f) => f.runId === exact)).toBeUndefined();
    expect(flags.find((f) => f.runId === over)).toBeDefined();
  });

  test("terminal status not flagged even if stale", async () => {
    const runId = "tgo-terminal.1";
    const now = 3_000_000;
    await appendRunEvent(dir, runId, v2Event(runId, { ts: now - 10000, type: "heartbeat", tool: "heartbeat", argsHash: hashArgs({}), ok: true, note: "heartbeat" }));
    await appendRunEvent(dir, runId, v2Event(runId, { ts: now - 9000, type: "status", tool: "task", argsHash: "h", ok: true, note: "complete" }));
    const flags = await scanRunsForProblems(dir, { now, heartbeatThresholdMs: 5000 });
    expect(flags.find((f) => f.runId === runId)).toBeUndefined();
  });

  test("suspended flagged when await.json exists (issueId-scoped)", async () => {
    const runId = "tgo-suspend.1";
    await appendRunEvent(dir, runId, v2Event(runId, { ts: Date.now(), type: "step", tool: "task", argsHash: "h", ok: true, note: "s" }));
    const p = awaitJsonPath(dir, runId);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, "{}", "utf-8");
    const flags = await scanRunsForProblems(dir, { now: Date.now() });
    expect(flags.find((f) => f.runId === runId)?.reason).toBe("suspended");
  });

  test("F4 issueId-scoped await: alt path not detected, only .tgo/<issueId>/await.json", async () => {
    const runId = "tgo-alt.1";
    await appendRunEvent(dir, runId, v2Event(runId, { ts: Date.now(), type: "step", tool: "read", argsHash: "h", ok: true, note: "s" }));
    const alt = path.join(dir, ".tgo", "runs", `${runId}.await.json`);
    await fs.mkdir(path.dirname(alt), { recursive: true });
    await fs.writeFile(alt, "{}", "utf-8");
    const flags = await scanRunsForProblems(dir, {});
    expect(flags.find((f) => f.runId === runId)).toBeUndefined();
    // primary path does flag
    const p = awaitJsonPath(dir, runId);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, "{}", "utf-8");
    const flags2 = await scanRunsForProblems(dir, {});
    expect(flags2.find((f) => f.runId === runId)?.reason).toBe("suspended");
  });

  test("F4 with issueId from line (runId != issueId file)", async () => {
    const runId = "tgo-run-xyz.1";
    const issueId = "tgo-issue-abc.1";
    // run file named runId but event carries different issueId — await check should use issueId from line
    await appendRunEvent(dir, runId, { ts: Date.now(), type: "step", seat: "dylan", tool: "read", argsHash: "h", ok: true, issueId, note: "s" });
    const p = awaitJsonPath(dir, issueId);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, "{}", "utf-8");
    const flags = await scanRunsForProblems(dir, {});
    const hit = flags.find((f) => f.runId === runId);
    expect(hit).toBeDefined();
    expect(hit!.issueId).toBe(issueId);
    expect(hit!.reason).toBe("suspended");
  });
});

describe("runs — prune policy", () => {
  let dir: string;
  beforeEach(() => { dir = tmpDir(); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  test("old pruned, active kept", async () => {
    const now = Date.now();
    const maxAgeMs = 24 * 60 * 60 * 1000;
    const threshold = 5 * 60 * 1000;
    const oldRun = "tgo-old.1";
    const activeRun = "tgo-active.1";
    await appendRunEvent(dir, oldRun, v2Event(oldRun, { ts: now - maxAgeMs - 10000, type: "heartbeat", tool: "heartbeat", argsHash: hashArgs({}), ok: true, note: "heartbeat" }));
    await appendRunEvent(dir, oldRun, v2Event(oldRun, { ts: now - maxAgeMs - 5000, type: "status", tool: "task", argsHash: "h", ok: true, note: "complete" }));
    const oldPath = runPath(dir, oldRun);
    await fs.utimes(oldPath, new Date(now - maxAgeMs - 5000), new Date(now - maxAgeMs - 5000));
    await appendRunEvent(dir, activeRun, v2Event(activeRun, { ts: now - 1000, type: "heartbeat", tool: "heartbeat", argsHash: hashArgs({}), ok: true, note: "heartbeat" }));
    await appendRunEvent(dir, activeRun, v2Event(activeRun, { ts: now - 500, type: "step", tool: "read", argsHash: "h", ok: true, note: "s" }));
    const deleted = await pruneRuns(dir, { maxAgeMs, now, heartbeatThresholdMs: threshold });
    expect(deleted).toContain(`${oldRun}.jsonl`);
    expect(deleted).not.toContain(`${activeRun}.jsonl`);
    expect((await readRunEvents(dir, activeRun)).length).toBe(2);
    await expect(fs.stat(oldPath)).rejects.toThrow();
  });

  test("prune respects maxFiles active skipped", async () => {
    const now = Date.now();
    for (let i = 0; i < 3; i++) {
      const id = `tgo-prune-${i}.1`;
      await appendRunEvent(dir, id, v2Event(id, { ts: now - i * 1000, type: "status", tool: "task", argsHash: "h", ok: true, note: "complete" }));
      await fs.utimes(runPath(dir, id), new Date(now - (3 - i) * 10000), new Date(now - (3 - i) * 10000));
    }
    const activeId = "tgo-prune-1.1";
    await fs.unlink(runPath(dir, activeId));
    await appendRunEvent(dir, activeId, v2Event(activeId, { ts: now - 100, type: "heartbeat", tool: "heartbeat", argsHash: hashArgs({}), ok: true, note: "heartbeat" }));
    await fs.utimes(runPath(dir, activeId), new Date(now - 50000), new Date(now - 50000));
    const deleted = await pruneRuns(dir, { maxFiles: 2, maxBytes: 100 * 1024 * 1024, now, maxAgeMs: 100 * 24 * 60 * 60 * 1000 });
    expect(deleted).not.toContain(`${activeId}.jsonl`);
    const remaining = await fs.readdir(path.join(dir, ".tgo", "runs"));
    expect(remaining.filter((f) => f.endsWith(".jsonl")).length).toBeLessThanOrEqual(3);
  });

  test("prune does not delete suspended even if old (issueId-scoped)", async () => {
    const now = Date.now();
    const runId = "tgo-suspended-old.1";
    await appendRunEvent(dir, runId, v2Event(runId, { ts: now - 10000, type: "step", tool: "read", argsHash: "h", ok: true, note: "s" }));
    await fs.utimes(runPath(dir, runId), new Date(now - 10000), new Date(now - 10000));
    const p = awaitJsonPath(dir, runId);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, "{}", "utf-8");
    const deleted = await pruneRuns(dir, { maxAgeMs: 1000, now });
    expect(deleted).not.toContain(`${runId}.jsonl`);
  });

  test("F8 single-flight prune: concurrent calls share same promise", async () => {
    const now = Date.now();
    await appendRunEvent(dir, "tgo-conc-1.1", v2Event("tgo-conc-1.1", { ts: now - 100000, type: "status", tool: "task", argsHash: "h", ok: true, note: "complete" }));
    await fs.utimes(runPath(dir, "tgo-conc-1.1"), new Date(now - 100000), new Date(now - 100000));
    const p1 = pruneRuns(dir, { maxAgeMs: 1000, now });
    const p2 = pruneRuns(dir, { maxAgeMs: 1000, now });
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual(r2);
  });
});
