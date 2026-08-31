/**
 * tgo-4qw: integration smoke test.
 *
 * This is the final pre-commit gate. Each test exercises ONE integration point
 * end-to-end against a real temp repo, proving the prior tickets compose. It is
 * NOT a re-test of unit logic — each feature's unit suite already covers that.
 * Reproducible on a clean checkout: `bun test test/smoke.test.ts`.
 */

import { describe, test, expect } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { planManifest, ManifestScopeConflictError } from "../src/manifest";
import { writeDefSnapshot, readDefSnapshot } from "../src/def-snapshot";
import { appendRunEvent } from "../src/runs";
import { replayStep } from "../src/replay";
import { resetRecursionState, recordDispatch, onChildCreated, checkSpawnAllowed } from "../src/recursion";
import { suspend, tryProseResume } from "../src/suspend";
import { runExitGate } from "../src/exitgate/gate";
import { parseTaskReport } from "../src/report";
import { initConvoy, markWaveComplete, landConvoy } from "../src/convoy";
import { renderQueueLine, buildProblemsSection, type MetricsSnapshot, type ProblemEntry } from "../src/metrics";
import { stateOf } from "../src/sidebar/scope";

async function tmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "tgo-smoke-"));
}

describe("tgo-4qw integration smoke", () => {
  test("manifest conflict rejected at plan time", async () => {
    const dir = await tmpDir();
    const overlapping = {
      waves: [{
        wave: 1,
        beads: [
          { issueId: "tgo-m1", story: "a", scope: ["src/shared.ts"], parallelSet: "1", deps: [] },
          { issueId: "tgo-m2", story: "b", scope: ["src/shared.ts"], parallelSet: "1", deps: [] },
        ],
      }],
    };
    await expect(planManifest(dir, overlapping)).rejects.toThrow(ManifestScopeConflictError);
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("version pin: def snapshot write→read round-trip", async () => {
    const dir = await tmpDir();
    const snap = { promptHash: "deadbeef", seatFrontmatterHash: "cafebabe", model: "luna", preset: "balanced", seatFileFound: true, capturedAt: "2026-01-01T00:00:00.000Z" } as never;
    await writeDefSnapshot(dir, "tgo-pin", snap);
    const read = await readDefSnapshot(dir, "tgo-pin");
    expect(read?.promptHash).toBe("deadbeef");
    expect(read?.model).toBe("luna");
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("step replay round-trip from a produced run log", async () => {
    const dir = await tmpDir();
    const runId = "tgo-rr";
    await appendRunEvent(dir, runId, { ts: 1, type: "step", seat: "dylan", tool: "edit", argsHash: "abcd1234", ok: true, issueId: "tgo-rr", note: "e", cmd: "src/a.ts" });
    const r = await replayStep(dir, runId, 0);
    expect(r.ok).toBe(true);
    expect(r.inputHash).toBe("abcd1234");
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("recursion block fires at depth cap", () => {
    resetRecursionState();
    recordDispatch("s0", "tgo-x");
    onChildCreated("s1", "s0");
    const r = checkSpawnAllowed("s1", "tgo-x", { maxDepth: 1 });
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain("depth");
    resetRecursionState();
  });

  test("suspend → prose resume clears the gate", async () => {
    const dir = await tmpDir();
    await suspend({
      repoRoot: dir,
      issueId: "tgo-sr",
      suspendSchema: { type: "object", required: [], properties: {} },
      suspendPayload: {},
      resumeSchema: { type: "object", required: ["confirm"], properties: { confirm: { type: "boolean" } } },
      reason: "smoke",
    });
    const bad = await tryProseResume({ repoRoot: dir, issueId: "tgo-sr", rawReply: '{"confirm": "yes"}' });
    expect(bad.success).toBe(false);
    const good = await tryProseResume({ repoRoot: dir, issueId: "tgo-sr", rawReply: '{"confirm": true}' });
    expect(good.success).toBe(true);
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("exit-gate blocks a blacklisted report", async () => {
    const dir = await tmpDir();
    const issueId = "tgo-eg";
    await appendRunEvent(dir, issueId, { ts: 1, type: "step", seat: "dylan", tool: "bash", argsHash: "h", ok: true, issueId, note: "exposed TOPSECRET" });
    await appendRunEvent(dir, issueId, { ts: 2, type: "status", seat: "dylan", tool: "bash", argsHash: "h", ok: true, issueId, note: "complete" });
    const gate = await runExitGate({
      repoRoot: dir,
      issueId,
      specText: "objective\nVERIFICATION: SHALL complete the work",
      report: parseTaskReport("STATUS: complete\nCHANGES: src/a.ts\nVERIFICATION: done\nGAPS: none"),
      profile: { enabled: true, toggles: { deltaSpec: true, triage: true, trajectory: true }, blacklist: ["TOPSECRET"], trajectory: {} },
    });
    expect(gate.blocked).toBe(true);
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("convoy lands waves in defined order", async () => {
    const dir = await tmpDir();
    const waves = [
      { wave: 1, beads: [{ issueId: "tgo-c1", scope: ["src/w1.ts"] }] },
      { wave: 2, beads: [{ issueId: "tgo-c2", scope: ["src/w2.ts"] }] },
      { wave: 3, beads: [{ issueId: "tgo-c3", scope: ["src/w3.ts"] }] },
    ];
    await initConvoy(dir, { goal: "smoke", remainingBudget: 10, waves });
    await markWaveComplete(dir, ["tgo-c2", "tgo-c1", "tgo-c3"]);
    const order: number[] = [];
    const result = await landConvoy(dir, {
      gateCheck: async () => ({ ok: true }),
      mergeWorktree: async (wave) => { order.push(wave); },
    });
    expect(result.landed).toBe(true);
    expect(order).toEqual([1, 2, 3]);
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("queue gauge renders pending count", () => {
    const snap: MetricsSnapshot = { bySeat: { dylan: { queueDepth: 5, inFlight: 1, waitMs: 0 } }, updatedAt: new Date().toISOString() };
    const line = renderQueueLine(snap, undefined);
    expect(line).toContain("5");
  });

  test("problems view renders a stuck session", () => {
    const problems: ProblemEntry[] = [{ runId: "tgo-p1", state: "stuck", reason: "no heartbeat" }];
    const section = buildProblemsSection(problems);
    expect(section).toContain("tgo-p1");
  });

  test("closed-issue filter marks closed beads", () => {
    expect(stateOf({ id: "tgo-c1", status: "closed" } as never, undefined)).toBe("closed");
    expect(stateOf({ id: "tgo-c2", status: "ready" } as never, new Set(["tgo-c2"]))).toBe("ready");
  });
});