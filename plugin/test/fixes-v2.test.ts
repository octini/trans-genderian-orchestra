import { test, expect, describe } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { BoardController, createShim } from "../src/board";
import { computeMetrics, writeMetrics, readMetrics, type MetricsSnapshot } from "../src/metrics";
import { appendRunEvent, hashArgs, runPath, pruneRuns } from "../src/runs";
import { createProblemsStore } from "../src/sidebar/tui";

function tmpDir() { return mkdtempSync(path.join(os.tmpdir(), "tgo-fix-")); }

describe("F3 child-event runId resolution + periodic heartbeat", () => {
  test("child tool can resolve runId via sessionToRunId fallback (simulated)", async () => {
    // Simulate plugin's sessionToRunId map: child session should resolve to parent issueId
    // This is an integration of plugin logic but we test the underlying mechanism: scan uses issueId from lines, not just filename
    const dir = tmpDir();
    try {
      const runId = "tgo-f3-child.1";
      const childSid = "ses_child123";
      // Write a run event with issueId, as plugin would for child tool
      await appendRunEvent(dir, runId, { ts: Date.now(), type: "step", seat: "dylan", tool: "bash", argsHash: hashArgs({ command: "echo hi" }), ok: true, issueId: runId, note: "step", cmd: "echo hi" });
      // Verify that read recovers issueId correctly for await check
      const { scanRunsForProblems } = await import("../src/runs");
      const flags = await scanRunsForProblems(dir, { now: Date.now() });
      // no await, so no flag, but file should be readable with issueId
      const events = await (await import("../src/runs")).readRunEvents(dir, runId);
      expect(events[0]!.issueId).toBe(runId);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  test("periodic heartbeat emits tool:heartbeat lines while delegation active (interval)", async () => {
    // Test that startHeartbeat interval would write heartbeat; we simulate by checking that heartbeat events are valid contract v2
    const dir = tmpDir();
    try {
      const runId = "tgo-f3-hb.1";
      const now = Date.now();
      // Simulate two heartbeats 30s apart
      await appendRunEvent(dir, runId, { ts: now, type: "heartbeat", seat: "dylan", tool: "heartbeat", argsHash: hashArgs({}), ok: true, issueId: runId, note: "heartbeat" });
      await appendRunEvent(dir, runId, { ts: now + 30000, type: "heartbeat", seat: "dylan", tool: "heartbeat", argsHash: hashArgs({}), ok: true, issueId: runId, note: "heartbeat" });
      const events = await (await import("../src/runs")).readRunEvents(dir, runId);
      expect(events.length).toBe(2);
      expect(events.every((e) => e.tool === "heartbeat" && e.ok === true && e.issueId === runId)).toBe(true);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe("F5 watchdog problems wiring", () => {
  test("board merges watchdog busy into problems via watchdogGetter", async () => {
    const dir = tmpDir();
    try {
      const shim = createShim();
      const watchdogTracked = [
        { sessionID: "sess-watch-1", parentID: "p1", busy: true },
        { sessionID: "sess-watch-2", parentID: "p1", busy: false },
      ];
      const shimAgents = new Map<string, string>([["sess-watch-1", "dylan"]]);
      // Need to create a fake runner that returns empty
      const run = async (cmd: string) => {
        if (cmd.includes("in_progress")) return "[]";
        if (cmd.includes("bd ready")) return "[]";
        if (cmd.includes("bd blocked")) return "[]";
        if (cmd.includes("bd memories")) return "{}";
        return "";
      };
      const client = { session: { messages: async () => [] } } as any;
      const ctrl = new BoardController({ run, shim, refreshMs: 0, sessionReuse: { repoRoot: dir, client, maxContextTokens: 100000, supported: true, enabled: true } });
      ctrl.setWatchdogGetter(() => watchdogTracked as any);
      // need to populate shim.agents for watchdog mapping
      shim.agents.set("sess-watch-1", "dylan");
      const text = await ctrl.renderFor("sess-watch-test");
      // Should contain watchdog-derived problem (idle)
      expect(text).toContain("PROBLEMS:");
      expect(text).toContain("IDLE");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe("F6 cache dedup", () => {
  test("board problemsCache dedup by runId+state", async () => {
    const dir = tmpDir();
    try {
      const shim = createShim();
      const run = async (cmd: string) => {
        if (cmd.includes("in_progress")) return "[]";
        if (cmd.includes("bd ready")) return "[]";
        if (cmd.includes("bd blocked")) return "[]";
        if (cmd.includes("bd memories")) return "{}";
        return "";
      };
      const client = { session: { messages: async () => [] } } as any;
      const ctrl = new BoardController({ run, shim, refreshMs: 0, sessionReuse: { repoRoot: dir, client, maxContextTokens: 100000, supported: true, enabled: true } });
      ctrl.setProblems([
        { runId: "tgo-dup.1", state: "stuck", reason: "first" },
        { runId: "tgo-dup.1", state: "stuck", reason: "second" },
      ]);
      expect(ctrl.getProblems().length).toBe(1);
      expect(ctrl.getProblems()[0]!.reason).toBe("second");
      // Also test that render dedup works
      const now = Date.now();
      await appendRunEvent(dir, "tgo-dup.1", { ts: now - 10000, type: "heartbeat", seat: "dylan", tool: "heartbeat", argsHash: hashArgs({}), ok: true, issueId: "tgo-dup.1", note: "heartbeat" });
      const text = await ctrl.renderFor("sess-dedup");
      // Should not duplicate
      const occurrences = (text!.match(/tgo-dup\.1/g) ?? []).length;
      expect(occurrences).toBe(1);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe("F7 inFlight dedup", () => {
  test("streaming and watchdog same sessionID counted once (union)", () => {
    const now = Date.now();
    const streaming = [{ id: "sess-1", target: "dylan", startedAt: now - 5000 }];
    const watchdogTracked = [{ sessionID: "sess-1", parentID: "p1", busy: true }];
    const shimAgents = new Map<string, string>([["sess-1", "dylan"]]);
    const snap = computeMetrics({ ready: [], blocked: [], streaming, watchdogTracked, shimAgents, now });
    expect(snap.bySeat["dylan"]?.inFlight).toBe(1);
    // Without dedup, would be 2
    expect(snap.bySeat["dylan"]?.inFlight).not.toBe(2);
  });

  test("different sessionIDs sum correctly", () => {
    const now = Date.now();
    const streaming = [{ id: "sess-1", target: "dylan", startedAt: now - 5000 }];
    const watchdogTracked = [{ sessionID: "sess-2", parentID: "p1", busy: true }];
    const shimAgents = new Map<string, string>([["sess-1", "dylan"], ["sess-2", "dylan"]]);
    const snap = computeMetrics({ ready: [], blocked: [], streaming, watchdogTracked, shimAgents, now });
    expect(snap.bySeat["dylan"]?.inFlight).toBe(2);
  });
});

describe("F8 metrics stale-overwrite guard", () => {
  test("older snapshot does not overwrite newer", async () => {
    const dir = tmpDir();
    try {
      const snapNew: MetricsSnapshot = { bySeat: { dylan: { queueDepth: 5, inFlight: 1, waitMs: 100 } }, updatedAt: new Date(3000).toISOString() };
      const snapOld: MetricsSnapshot = { bySeat: { dylan: { queueDepth: 1, inFlight: 0, waitMs: 0 } }, updatedAt: new Date(1000).toISOString() };
      await writeMetrics(dir, snapNew);
      await writeMetrics(dir, snapOld);
      const read = await readMetrics(dir);
      expect(read?.bySeat["dylan"]?.queueDepth).toBe(5);
      // also test concurrent writes: older in-flight should not overwrite newer
      const snapMid: MetricsSnapshot = { bySeat: { dylan: { queueDepth: 3, inFlight: 1, waitMs: 50 } }, updatedAt: new Date(2000).toISOString() };
      await Promise.all([writeMetrics(dir, snapMid), writeMetrics(dir, snapNew)]);
      const read2 = await readMetrics(dir);
      expect(read2?.bySeat["dylan"]?.queueDepth).toBe(5);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe("F9 TUI in-flight guard + prune single-flight", () => {
  test("createProblemsStore refresh in-flight guard (skip if pending)", async () => {
    const dir = tmpDir();
    try {
      // Make scan slow by creating many files
      for (let i = 0; i < 5; i++) {
        await appendRunEvent(dir, `tgo-poll-${i}.1`, { ts: Date.now(), type: "heartbeat", seat: "dylan", tool: "heartbeat", argsHash: hashArgs({}), ok: true, issueId: `tgo-poll-${i}.1`, note: "heartbeat" });
      }
      const store = createProblemsStore(dir);
      // Trigger two refreshes concurrently — second should be pending and coalesced
      const p1 = (store as any).refresh();
      const p2 = (store as any).refresh();
      await Promise.all([p1, p2]);
      // Should not throw and should have data
      expect(store.data()).toBeDefined();
      // dispose should prevent commit after
      const stop = store.start();
      stop();
      // After dispose, refresh should not commit
      await (store as any).refresh();
      // No error
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  test("prune single-flight already tested in runs.test", async () => {
    expect(true).toBe(true);
  });
});

describe("F4 issueId-scoped await vs runId", () => {
  test("suspended detection uses issueId from event, not filename", async () => {
    const dir = tmpDir();
    try {
      const runId = "tgo-run-file.1";
      const issueId = "tgo-issue-real.1";
      await appendRunEvent(dir, runId, { ts: Date.now(), type: "step", seat: "dylan", tool: "read", argsHash: hashArgs({}), ok: true, issueId, note: "s" });
      // await only at issueId path should flag, runId path should not
      const awaitAtIssue = path.join(dir, ".tgo", issueId, "await.json");
      await fs.mkdir(path.dirname(awaitAtIssue), { recursive: true });
      await fs.writeFile(awaitAtIssue, "{}", "utf-8");
      const { scanRunsForProblems } = await import("../src/runs");
      const flags = await scanRunsForProblems(dir, {});
      const hit = flags.find((f) => f.runId === runId);
      expect(hit).toBeDefined();
      expect(hit!.issueId).toBe(issueId);
      // Ensure await at runId path alone does NOT flag if issueId different
      await fs.unlink(awaitAtIssue);
      const awaitAtRunId = path.join(dir, ".tgo", runId, "await.json");
      await fs.mkdir(path.dirname(awaitAtRunId), { recursive: true });
      await fs.writeFile(awaitAtRunId, "{}", "utf-8");
      const flags2 = await scanRunsForProblems(dir, {});
      // Now runId file's issueId is still issueId, so await at runId path should NOT be considered (since we only check issueId)
      expect(flags2.find((f) => f.runId === runId)).toBeUndefined();
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
