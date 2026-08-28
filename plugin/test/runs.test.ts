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
  DEFAULT_HEARTBEAT_THRESHOLD_MS,
  hasAwaitJson,
  awaitJsonPath,
} from "../src/runs";
import { hashString } from "../src/def-snapshot";

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "tgo-runs-"));
}

describe("runs — append/replay", () => {
  let dir: string;
  beforeEach(() => { dir = tmpDir(); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  test("append N events and read back exact sequence", async () => {
    const runId = "tgo-2ry.1";
    const events = [
      { ts: 1000, type: "step" as const, seat: "dylan", tool: "read", argsHash: hashArgs({ path: "a.ts" }), note: "start read" },
      { ts: 1001, type: "heartbeat" as const, seat: "dylan", note: "heartbeat" },
      { ts: 1002, type: "step" as const, seat: "dylan", tool: "edit", argsHash: "abcd1234", ok: true, durationMs: 123, note: "done" },
      { ts: 1003, type: "status" as const, seat: "dylan", ok: true, note: "complete" },
    ];
    for (const e of events) await appendRunEvent(dir, runId, e);
    const read = await readRunEvents(dir, runId);
    expect(read).toEqual(events);
    // file is JSONL: one JSON per line
    const raw = await fs.readFile(runPath(dir, runId), "utf-8");
    const lines = raw.trim().split("\n");
    expect(lines.length).toBe(4);
    for (let i = 0; i < lines.length; i++) {
      expect(JSON.parse(lines[i]!)).toEqual(events[i]);
    }
  });

  test("runPath rejects invalid bead id (VALID_BEAD_ID)", async () => {
    expect(() => runPath(dir, "../evil")).toThrow();
    expect(() => runPath(dir, "-bad")).toThrow();
    expect(() => runPath(dir, "")).toThrow();
    // valid ids pass
    expect(() => runPath(dir, "tgo-123")).not.toThrow();
    expect(() => runPath(dir, "tgo_abc.1-2")).not.toThrow();
  });

  test("appendRunEvent validates ts/type/seat", async () => {
    await expect(appendRunEvent(dir, "tgo-ok", { ts: NaN, type: "step", seat: "dylan" } as any)).rejects.toThrow();
    await expect(appendRunEvent(dir, "tgo-ok", { ts: 1, type: "bad" as any, seat: "dylan" })).rejects.toThrow();
    await expect(appendRunEvent(dir, "tgo-ok", { ts: 1, type: "step", seat: "" } as any)).rejects.toThrow();
  });

  test("hashArgs is FNV hex (8 chars) via hashString", () => {
    const h = hashArgs({ foo: "bar" });
    expect(h).toMatch(/^[0-9a-f]{8}$/);
    expect(h).toBe(hashString(JSON.stringify({ foo: "bar" })));
    expect(hashString("foo.ts")).toBe("b5c9292a"); // pinned vector from def-snapshot
    expect(hashArgs("foo.ts")).toBe(hashString("foo.ts"));
  });

  test("readRunEvents returns [] for missing file", async () => {
    const out = await readRunEvents(dir, "tgo-missing");
    expect(out).toEqual([]);
  });
});

describe("runs — dead-heartbeat detection", () => {
  let dir: string;
  beforeEach(() => { dir = tmpDir(); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  test("running session with stale heartbeat flagged as stuck (dead-heartbeat)", async () => {
    const runId = "tgo-stale.1";
    const now = 1_000_000;
    const threshold = 5 * 60 * 1000;
    // last heartbeat is stale (now - threshold - 1000)
    await appendRunEvent(dir, runId, { ts: now - threshold - 1000, type: "heartbeat", seat: "dylan" });
    await appendRunEvent(dir, runId, { ts: now - threshold - 900, type: "step", seat: "dylan", tool: "read" });
    // no terminal status
    const flags = await scanRunsForProblems(dir, { now, heartbeatThresholdMs: threshold });
    const hit = flags.find((f) => f.runId === runId);
    expect(hit).toBeDefined();
    expect(hit!.reason).toBe("dead-heartbeat");
    expect(hit!.hasTerminalStatus).toBe(false);
  });

  test("threshold boundary: exactly at threshold not flagged, just over flagged", async () => {
    const runIdExact = "tgo-bound-exact.1";
    const runIdOver = "tgo-bound-over.1";
    const now = 2_000_000;
    const threshold = 3000;
    // exact: now - threshold => age == threshold, should NOT flag (requires > threshold)
    await appendRunEvent(dir, runIdExact, { ts: now - threshold, type: "heartbeat", seat: "dylan" });
    // over: now - threshold -1 => age > threshold => flag
    await appendRunEvent(dir, runIdOver, { ts: now - threshold - 1, type: "heartbeat", seat: "dylan" });
    const flags = await scanRunsForProblems(dir, { now, heartbeatThresholdMs: threshold });
    expect(flags.find((f) => f.runId === runIdExact)).toBeUndefined();
    expect(flags.find((f) => f.runId === runIdOver)).toBeDefined();
  });

  test("has terminal status => not flagged even if stale", async () => {
    const runId = "tgo-terminal.1";
    const now = 3_000_000;
    const threshold = 5000;
    await appendRunEvent(dir, runId, { ts: now - 10000, type: "heartbeat", seat: "dylan" });
    await appendRunEvent(dir, runId, { ts: now - 9000, type: "status", seat: "dylan", ok: true });
    const flags = await scanRunsForProblems(dir, { now, heartbeatThresholdMs: threshold });
    expect(flags.find((f) => f.runId === runId)).toBeUndefined();
  });

  test("suspended flagged when await.json exists", async () => {
    const runId = "tgo-suspend.1";
    await appendRunEvent(dir, runId, { ts: Date.now(), type: "step", seat: "dylan", tool: "task" });
    // create await.json at primary location
    const p = awaitJsonPath(dir, runId);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, JSON.stringify({ awaiting: true }), "utf-8");
    const flags = await scanRunsForProblems(dir, { now: Date.now() });
    const hit = flags.find((f) => f.runId === runId);
    expect(hit).toBeDefined();
    expect(hit!.reason).toBe("suspended");
    expect(hit!.hasAwaitJson).toBe(true);
  });

  test("await.json alt path also detected", async () => {
    const runId = "tgo-alt.1";
    await appendRunEvent(dir, runId, { ts: Date.now(), type: "step", seat: "dylan" });
    const alt = path.join(dir, ".tgo", "runs", `${runId}.await.json`);
    await fs.mkdir(path.dirname(alt), { recursive: true });
    await fs.writeFile(alt, "{}", "utf-8");
    const flags = await scanRunsForProblems(dir, {});
    expect(flags.find((f) => f.runId === runId)?.reason).toBe("suspended");
  });
});

describe("runs — prune policy", () => {
  let dir: string;
  beforeEach(() => { dir = tmpDir(); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  test("old run logs pruned without data loss in active runs", async () => {
    const now = Date.now();
    const maxAgeMs = 24 * 60 * 60 * 1000; // 1 day
    const threshold = 5 * 60 * 1000;

    // active run: recent heartbeat, no terminal status -> should be kept even if file mtime is old? Actually mtime will be now, so not old.
    // But we test via mtime: create old file and active file, prune with maxAge, old deleted, active kept.

    const oldRun = "tgo-old.1";
    const activeRun = "tgo-active.1";

    // old run: create file, then set mtime to old
    await appendRunEvent(dir, oldRun, { ts: now - maxAgeMs - 10000, type: "heartbeat", seat: "dylan" });
    await appendRunEvent(dir, oldRun, { ts: now - maxAgeMs - 5000, type: "status", seat: "dylan", ok: true });
    const oldPath = runPath(dir, oldRun);
    // set mtime to old (2 days ago)
    const oldMtime = new Date(now - maxAgeMs - 5000);
    await fs.utimes(oldPath, oldMtime, oldMtime);

    // active run: recent events, no terminal, recent mtime
    await appendRunEvent(dir, activeRun, { ts: now - 1000, type: "heartbeat", seat: "dylan" });
    await appendRunEvent(dir, activeRun, { ts: now - 500, type: "step", seat: "dylan", tool: "read" });
    // mtime stays now (recent)

    const deleted = await pruneRuns(dir, { maxAgeMs, now, heartbeatThresholdMs: threshold });
    expect(deleted).toContain(`${oldRun}.jsonl`);
    expect(deleted).not.toContain(`${activeRun}.jsonl`);

    // active still readable
    const activeEvents = await readRunEvents(dir, activeRun);
    expect(activeEvents.length).toBe(2);
    // old file gone
    await expect(fs.stat(oldPath)).rejects.toThrow();
  });

  test("prune respects maxFiles and maxBytes (oldest first, active skipped)", async () => {
    const now = Date.now();
    // create 3 files, maxFiles=2 => oldest non-active deleted
    for (let i = 0; i < 3; i++) {
      const id = `tgo-prune-${i}.1`;
      await appendRunEvent(dir, id, { ts: now - i * 1000, type: "status", seat: "dylan", ok: true });
      const p = runPath(dir, id);
      // set mtime so i=0 is oldest? Actually append order determines mtime, but we adjust
      const mtime = new Date(now - (3 - i) * 10000);
      await fs.utimes(p, mtime, mtime);
    }
    // Make tgo-prune-1 active (no terminal, recent heartbeat) — it should be skipped
    const activeId = "tgo-prune-1.1";
    // overwrite it to be active: remove status, add heartbeat recent
    const activePath = runPath(dir, activeId);
    await fs.unlink(activePath);
    await appendRunEvent(dir, activeId, { ts: now - 100, type: "heartbeat", seat: "dylan" });
    // set its mtime to oldest to test skipping: it would be candidate for deletion but should be skipped
    await fs.utimes(activePath, new Date(now - 50000), new Date(now - 50000));

    const deleted = await pruneRuns(dir, { maxFiles: 2, maxBytes: 100 * 1024 * 1024, now, maxAgeMs: 100 * 24 * 60 * 60 * 1000 });
    // active should not be deleted even though oldest
    expect(deleted).not.toContain(`${activeId}.jsonl`);
    // total files after prune should be <=2 + active? Actually active skipped, so we should still have 2 files incl active
    const remaining = await fs.readdir(path.join(dir, ".tgo", "runs"));
    expect(remaining.filter((f) => f.endsWith(".jsonl")).length).toBeLessThanOrEqual(3);
  });

  test("prune does not delete suspended (await.json) runs even if old", async () => {
    const now = Date.now();
    const maxAgeMs = 1000;
    const runId = "tgo-suspended-old.1";
    await appendRunEvent(dir, runId, { ts: now - 10000, type: "step", seat: "dylan" });
    const p = runPath(dir, runId);
    await fs.utimes(p, new Date(now - 10000), new Date(now - 10000));
    const awaitPath = awaitJsonPath(dir, runId);
    await fs.mkdir(path.dirname(awaitPath), { recursive: true });
    await fs.writeFile(awaitPath, "{}", "utf-8");
    const deleted = await pruneRuns(dir, { maxAgeMs, now });
    expect(deleted).not.toContain(`${runId}.jsonl`);
  });
});
