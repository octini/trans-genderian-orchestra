import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { BoardController, createShim, buildBoardText } from "../src/board";
import { computeMetrics, type MetricsSnapshot } from "../src/metrics";
import { appendRunEvent, hashArgs } from "../src/runs";

function fakeRunner(overrides?: Record<string, string>) {
  const calls: string[] = [];
  const runner = async (command: string) => {
    calls.push(command);
    if (overrides?.[command] !== undefined) return overrides[command];
    if (command.includes("in_progress")) return "[]";
    if (command.includes("bd ready")) return JSON.stringify([{ id: "tgo-1", title: "task", priority: 1 }]);
    if (command.includes("bd blocked")) return "[]";
    if (command.includes("bd memories")) return "{}";
    return "";
  };
  return Object.assign(runner, { calls });
}

describe("board — queue and problems rendering", () => {
  test("buildBoardText with queueLines renders QUEUE line", () => {
    const text = buildBoardText({
      inProgress: [],
      ready: [{ id: "a", title: "x", priority: 1 }],
      blocked: [],
      memories: [],
      streaming: [],
      queueLines: ["QUEUE: dylan 3 pending", "QUEUE: nas 3 pending (1 in-flight, wait 5s)"],
    });
    expect(text).toContain("QUEUE: dylan 3 pending");
    expect(text).toContain("QUEUE: nas");
  });

  test("buildBoardText with problems renders PROBLEMS section", () => {
    const text = buildBoardText({
      inProgress: [],
      ready: [],
      blocked: [],
      memories: [],
      streaming: [],
      problems: [
        { runId: "tgo-stuck.1", state: "stuck", reason: "dead heartbeat" },
        { runId: "tgo-await.1", state: "awaiting", reason: "suspended" },
      ],
    });
    expect(text).toContain("PROBLEMS:");
    expect(text).toContain("tgo-stuck.1 · STUCK");
    expect(text).toContain("tgo-await.1 · AWAITING");
  });

  test("BoardController renderFor writes metrics.json and renders QUEUE line", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "tgo-board-queue-"));
    try {
      // need .tgo dir for metrics
      await fs.mkdir(path.join(dir, ".tgo"), { recursive: true });
      const shim = createShim();
      shim.streaming.set("tgo-1", { target: "dylan", startedAt: Date.now() - 2000 });
      const run = fakeRunner({
        "bd list --status in_progress --json": "[]",
        "bd ready --json": JSON.stringify([{ id: "tgo-a", title: "a", priority: 1 }, { id: "tgo-b", title: "b", priority: 1 }]),
        "bd blocked --json": "[]",
        "bd memories --json": "{}",
      });
      const client = {
        session: {
          messages: async () => [{ parts: [{ type: "text", text: "hello" }] }],
        },
      } as any;
      const ctrl = new BoardController({
        run,
        shim,
        refreshMs: 0,
        sessionReuse: { repoRoot: dir, client, maxContextTokens: 100000, supported: true, enabled: true },
      });
      // need to make gate eligible for board injection? renderFor is direct, no gate needed
      const text = await ctrl.renderFor("sess-queue-1");
      expect(text).toContain("QUEUE: dylan");
      expect(text).toContain("pending");
      // metrics.json written
      const metricsRaw = await fs.readFile(path.join(dir, ".tgo", "metrics.json"), "utf-8");
      const metrics = JSON.parse(metricsRaw) as MetricsSnapshot;
      expect(metrics.bySeat["dylan"]?.queueDepth).toBe(2);
      expect(metrics.bySeat["dylan"]?.inFlight).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("BoardController growing-depth warning badge appears", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "tgo-board-grow-"));
    try {
      const shim = createShim();
      const run1 = fakeRunner({
        "bd list --status in_progress --json": "[]",
        "bd ready --json": JSON.stringify([{ id: "a", title: "a", priority: 1 }]),
        "bd blocked --json": "[]",
        "bd memories --json": "{}",
      });
      const run2 = fakeRunner({
        "bd list --status in_progress --json": "[]",
        "bd ready --json": JSON.stringify([{ id: "a", title: "a", priority: 1 }, { id: "b", title: "b", priority: 1 }, { id: "c", title: "c", priority: 1 }]),
        "bd blocked --json": "[]",
        "bd memories --json": "{}",
      });
      const client = { session: { messages: async () => [] } } as any;
      const ctrl = new BoardController({ run: run1, shim, refreshMs: 0, sessionReuse: { repoRoot: dir, client, maxContextTokens: 100000, supported: true, enabled: true } });
      const text1 = await ctrl.renderFor("sess-grow-1");
      expect(text1).not.toContain("⚠️");
      // second render with more ready should show warning
      // hack: replace run, invalidate cache via new sessionID
      const ctrl2 = new BoardController({ run: run2, shim, refreshMs: 0, sessionReuse: { repoRoot: dir, client, maxContextTokens: 100000, supported: true, enabled: true } });
      // copy previous metrics to simulate growth
      (ctrl2 as any).previousMetrics = (ctrl as any).previousMetrics;
      const text2 = await ctrl2.renderFor("sess-grow-2");
      // Since previous had queueDepth 1, new has 3, should warn
      expect(text2).toContain("⚠️ growing");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("BoardController problems section renders mixed states (file-derived)", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "tgo-board-prob-"));
    try {
      const now = Date.now();
      await appendRunEvent(dir, "tgo-prob-stuck.1", { ts: now - 10 * 60 * 1000, type: "heartbeat", seat: "dylan", tool: "heartbeat", argsHash: hashArgs({}), ok: true, issueId: "tgo-prob-stuck.1", note: "heartbeat" });
      const awaitPath = path.join(dir, ".tgo", "tgo-prob-await.1", "await.json");
      await fs.mkdir(path.dirname(awaitPath), { recursive: true });
      await fs.writeFile(awaitPath, "{}", "utf-8");
      await appendRunEvent(dir, "tgo-prob-await.1", { ts: now, type: "step", seat: "dylan", tool: "task", argsHash: hashArgs({}), ok: true, issueId: "tgo-prob-await.1", note: "s" });
      // aborted via terminal status:aborted
      await appendRunEvent(dir, "tgo-prob-aborted.1", { ts: now - 5000, type: "heartbeat", seat: "dylan", tool: "heartbeat", argsHash: hashArgs({}), ok: true, issueId: "tgo-prob-aborted.1", note: "heartbeat" });
      await appendRunEvent(dir, "tgo-prob-aborted.1", { ts: now, type: "status", seat: "dylan", tool: "task", argsHash: hashArgs({}), ok: false, issueId: "tgo-prob-aborted.1", note: "aborted" });

      const shim = createShim();
      const run = fakeRunner({
        "bd list --status in_progress --json": "[]",
        "bd ready --json": "[]",
        "bd blocked --json": "[]",
        "bd memories --json": "{}",
      });
      const client = { session: { messages: async () => [] } } as any;
      const ctrl = new BoardController({ run, shim, refreshMs: 0, sessionReuse: { repoRoot: dir, client, maxContextTokens: 100000, supported: true, enabled: true } });
      const text = await ctrl.renderFor("sess-prob-1");
      expect(text).toContain("PROBLEMS:");
      expect(text).toContain("tgo-prob-stuck.1");
      expect(text).toContain("STUCK");
      expect(text).toContain("tgo-prob-await.1");
      expect(text).toContain("AWAITING");
      expect(text).toContain("tgo-prob-aborted.1");
      expect(text).toContain("ABORTED");
      // stale drop: after resolving stuck, next scan should drop it
      await appendRunEvent(dir, "tgo-prob-stuck.1", { ts: now, type: "status", seat: "dylan", tool: "task", argsHash: hashArgs({}), ok: true, issueId: "tgo-prob-stuck.1", note: "complete" });
      const text2 = await ctrl.renderFor("sess-prob-2");
      expect(text2).not.toContain("tgo-prob-stuck.1");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("board degrades gracefully when metrics.json missing", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "tgo-board-missing-"));
    try {
      const shim = createShim();
      const run = fakeRunner();
      const client = { session: { messages: async () => [] } } as any;
      const ctrl = new BoardController({ run, shim, refreshMs: 0, sessionReuse: { repoRoot: dir, client, maxContextTokens: 100000, supported: true, enabled: true } });
      // ensure no metrics file
      await fs.rm(path.join(dir, ".tgo", "metrics.json"), { force: true }).catch(() => {});
      const text = await ctrl.renderFor("sess-missing-1");
      // should still render without throwing, and should compute queue line anyway (it writes new file)
      expect(text).toContain("TGO JOB BOARD");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
