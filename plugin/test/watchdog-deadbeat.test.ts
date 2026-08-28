import { test, expect, describe } from "bun:test";
import { isDeadHeartbeat, DEFAULT_RUN_HEARTBEAT_THRESHOLD_MS, detectDeadHeartbeatRuns } from "../src/watchdog";
import * as os from "node:os";
import * as path from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { appendRunEvent, hashArgs } from "../src/runs";

describe("watchdog dead-heartbeat helper", () => {
  test("isDeadHeartbeat respects threshold and terminal status", () => {
    const now = 1_000_000;
    const threshold = 5000;
    expect(isDeadHeartbeat({ lastHeartbeatMs: now - 6000, now, thresholdMs: threshold, hasTerminalStatus: false })).toBe(true);
    expect(isDeadHeartbeat({ lastHeartbeatMs: now - 4000, now, thresholdMs: threshold, hasTerminalStatus: false })).toBe(false);
    expect(isDeadHeartbeat({ lastHeartbeatMs: now - 10000, now, thresholdMs: threshold, hasTerminalStatus: true })).toBe(false);
    expect(isDeadHeartbeat({ lastHeartbeatMs: undefined, now, thresholdMs: threshold, hasTerminalStatus: false })).toBe(false);
    // exact threshold not dead
    expect(isDeadHeartbeat({ lastHeartbeatMs: now - threshold, now, thresholdMs: threshold, hasTerminalStatus: false })).toBe(false);
    expect(isDeadHeartbeat({ lastHeartbeatMs: now - threshold - 1, now, thresholdMs: threshold, hasTerminalStatus: false })).toBe(true);
  });

  test("detectDeadHeartbeatRuns finds stale runs", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "tgo-wd-detect-"));
    try {
      const now = Date.now();
      const threshold = 3000;
      await appendRunEvent(dir, "tgo-wd-old.1", { ts: now - 5000, type: "heartbeat", seat: "dylan", tool: "heartbeat", argsHash: hashArgs({}), ok: true, issueId: "tgo-wd-old.1", note: "heartbeat" });
      await appendRunEvent(dir, "tgo-wd-fresh.1", { ts: now - 1000, type: "heartbeat", seat: "dylan", tool: "heartbeat", argsHash: hashArgs({}), ok: true, issueId: "tgo-wd-fresh.1", note: "heartbeat" });
      await appendRunEvent(dir, "tgo-wd-term.1", { ts: now - 10000, type: "heartbeat", seat: "dylan", tool: "heartbeat", argsHash: hashArgs({}), ok: true, issueId: "tgo-wd-term.1", note: "heartbeat" });
      await appendRunEvent(dir, "tgo-wd-term.1", { ts: now - 9000, type: "status", seat: "dylan", tool: "task", argsHash: hashArgs({}), ok: true, issueId: "tgo-wd-term.1", note: "complete" });
      const hits = await detectDeadHeartbeatRuns(dir, { thresholdMs: threshold, now });
      expect(hits.find((h) => h.runId === "tgo-wd-old.1")).toBeDefined();
      expect(hits.find((h) => h.runId === "tgo-wd-fresh.1")).toBeUndefined();
      expect(hits.find((h) => h.runId === "tgo-wd-term.1")).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("default threshold is 5 minutes", () => {
    expect(DEFAULT_RUN_HEARTBEAT_THRESHOLD_MS).toBe(5 * 60 * 1000);
  });
});
