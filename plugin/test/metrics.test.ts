import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import {
  computeMetrics,
  writeMetrics,
  readMetrics,
  renderQueueLine,
  hasGrowingDepth,
  buildProblemsSection,
  problemsFromRecovery,
  type MetricsSnapshot,
} from "../src/metrics";

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "tgo-metrics-"));
}

describe("metrics — compute", () => {
  test("queueDepth derived from bd counts + inFlight map", () => {
    const now = 1_000_000;
    const ready = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const blocked = [{ id: "d" }];
    const streaming = [
      { id: "a", target: "dylan", startedAt: now - 5000 },
      { id: "b", target: "dylan", startedAt: now - 3000 },
      { id: "c", target: "nas", startedAt: now - 8000 },
    ];
    const snap = computeMetrics({ ready, blocked, streaming, now });
    // queueDepth should be ready.length (3) for all seats
    expect(snap.bySeat["dylan"]?.queueDepth).toBe(3);
    expect(snap.bySeat["nas"]?.queueDepth).toBe(3);
    // inFlight per seat from streaming
    expect(snap.bySeat["dylan"]?.inFlight).toBe(2);
    expect(snap.bySeat["nas"]?.inFlight).toBe(1);
    // waitMs for dylan = now - earliest (now-5000)
    expect(snap.bySeat["dylan"]?.waitMs).toBe(5000);
    expect(snap.bySeat["nas"]?.waitMs).toBe(8000);
    // horowitz not in streaming => inFlight 0, wait 0, queueDepth still 3
    expect(snap.bySeat["horowitz"]?.queueDepth).toBe(3);
    expect(snap.bySeat["horowitz"]?.inFlight).toBe(0);
  });

  test("watchdog tracked adds to inFlight via shimAgents", () => {
    const now = 2_000_000;
    const ready: any[] = [];
    const blocked: any[] = [];
    const streaming: any[] = [];
    const watchdogTracked = [
      { sessionID: "sess1", parentID: "p1", busy: true },
      { sessionID: "sess2", parentID: "p1", busy: true },
      { sessionID: "sess3", parentID: "p1", busy: false },
    ];
    const shimAgents = new Map<string, string>([
      ["sess1", "dylan"],
      ["sess2", "horowitz"],
      ["sess3", "dylan"],
    ]);
    const snap = computeMetrics({ ready, blocked, streaming, watchdogTracked, shimAgents, now });
    expect(snap.bySeat["dylan"]?.inFlight).toBe(1);
    expect(snap.bySeat["horowitz"]?.inFlight).toBe(1);
  });

  test("write/read metrics round-trip", async () => {
    const dir = tmpDir();
    try {
      const snap: MetricsSnapshot = {
        bySeat: {
          dylan: { queueDepth: 5, inFlight: 2, waitMs: 1234 },
          nas: { queueDepth: 5, inFlight: 0, waitMs: 0 },
        },
        updatedAt: new Date().toISOString(),
      };
      await writeMetrics(dir, snap);
      const read = await readMetrics(dir);
      expect(read).toEqual(snap);
      // file exists at .tgo/metrics.json
      const raw = await fs.readFile(path.join(dir, ".tgo", "metrics.json"), "utf-8");
      expect(JSON.parse(raw)).toEqual(snap);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("readMetrics returns undefined for missing file", async () => {
    const dir = tmpDir();
    try {
      const out = await readMetrics(dir);
      expect(out).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("metrics — QUEUE line + warning", () => {
  test("renderQueueLine produces QUEUE: <seat> N pending", () => {
    const snap: MetricsSnapshot = {
      bySeat: {
        dylan: { queueDepth: 3, inFlight: 1, waitMs: 5000 },
        nas: { queueDepth: 0, inFlight: 0, waitMs: 0 },
      },
      updatedAt: new Date().toISOString(),
    };
    const line = renderQueueLine(snap);
    expect(line).toContain("QUEUE: dylan 3 pending");
    expect(line).not.toContain("nas"); // nas has 0 pending and 0 inFlight => omitted
  });

  test("warning badge when depth growing", () => {
    const prev: MetricsSnapshot = {
      bySeat: { dylan: { queueDepth: 2, inFlight: 1, waitMs: 1000 } },
      updatedAt: new Date(1000).toISOString(),
    };
    const curr: MetricsSnapshot = {
      bySeat: { dylan: { queueDepth: 5, inFlight: 1, waitMs: 2000 } },
      updatedAt: new Date(2000).toISOString(),
    };
    expect(hasGrowingDepth(prev, curr)).toBe(true);
    const line = renderQueueLine(curr, prev);
    expect(line).toContain("⚠️ growing");
    // non-growing should not have warning
    const same: MetricsSnapshot = {
      bySeat: { dylan: { queueDepth: 2, inFlight: 1, waitMs: 1000 } },
      updatedAt: new Date(3000).toISOString(),
    };
    expect(hasGrowingDepth(prev, same)).toBe(false);
    expect(renderQueueLine(same, prev)).not.toContain("growing");
  });

  test("renderQueueLine returns undefined when no pending/inFlight", () => {
    const snap: MetricsSnapshot = {
      bySeat: { dylan: { queueDepth: 0, inFlight: 0, waitMs: 0 } },
      updatedAt: new Date().toISOString(),
    };
    expect(renderQueueLine(snap)).toBeUndefined();
  });
});

describe("metrics — problems section", () => {
  test("stuck/aborted/idle/awaiting lists correctly", () => {
    const problems = [
      { runId: "tgo-a.1", state: "stuck" as const, reason: "dead heartbeat" },
      { runId: "tgo-b.1", state: "aborted" as const, reason: "watchdog wall-clock" },
      { runId: "tgo-c.1", state: "idle" as const, reason: "idle 30s" },
      { runId: "tgo-d.1", state: "awaiting" as const, reason: "suspended — await.json present" },
    ];
    const text = buildProblemsSection(problems);
    expect(text).toContain("PROBLEMS:");
    expect(text).toContain("tgo-a.1 · STUCK — dead heartbeat");
    expect(text).toContain("tgo-b.1 · ABORTED — watchdog wall-clock");
    expect(text).toContain("tgo-c.1 · IDLE — idle 30s");
    expect(text).toContain("tgo-d.1 · AWAITING — suspended");
    // order should be stuck, aborted, idle, awaiting
    const idxStuck = text!.indexOf("STUCK");
    const idxAborted = text!.indexOf("ABORTED");
    const idxIdle = text!.indexOf("IDLE");
    const idxAwaiting = text!.indexOf("AWAITING");
    expect(idxStuck).toBeLessThan(idxAborted);
    expect(idxAborted).toBeLessThan(idxIdle);
    expect(idxIdle).toBeLessThan(idxAwaiting);
  });

  test("problemsFromRecovery maps suspended and dead-heartbeat", () => {
    const flags = [
      { runId: "tgo-x.1", reason: "suspended" as const, lastHeartbeat: 1000, hasAwaitJson: true, hasTerminalStatus: false },
      { runId: "tgo-y.1", reason: "dead-heartbeat" as const, lastHeartbeat: 2000, hasAwaitJson: false, hasTerminalStatus: false },
    ];
    const problems = problemsFromRecovery(flags as any);
    expect(problems.find((p) => p.runId === "tgo-x.1")?.state).toBe("awaiting");
    expect(problems.find((p) => p.runId === "tgo-y.1")?.state).toBe("stuck");
  });

  test("buildProblemsSection returns undefined for empty", () => {
    expect(buildProblemsSection([])).toBeUndefined();
  });

  test("buildProblemsSection with mixed states renders all", () => {
    const mixed = [
      { runId: "a", state: "idle" as const, reason: "idle" },
      { runId: "b", state: "stuck" as const, reason: "stuck" },
      { runId: "c", state: "awaiting" as const, reason: "await" },
      { runId: "d", state: "aborted" as const, reason: "abort" },
    ];
    const text = buildProblemsSection(mixed)!;
    expect(text).toContain("a · IDLE");
    expect(text).toContain("b · STUCK");
    expect(text).toContain("c · AWAITING");
    expect(text).toContain("d · ABORTED");
  });
});
