import { describe, test, expect } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { appendRunEvent, runPath, type RunEvent } from "../src/runs";
import { writeDefSnapshot } from "../src/def-snapshot";
import { parseReplayIntent, replayStep, formatReplayResult } from "../src/replay";

async function tmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "tgo-replay-"));
}

function stepEvent(ts: number, tool: string, overrides: Partial<RunEvent> = {}): RunEvent {
  return {
    ts,
    type: "step",
    seat: "dylan",
    tool,
    argsHash: "a1b2c3d4",
    ok: true,
    issueId: "tgo-r1",
    note: `note-${tool}`,
    cmd: `src/${tool}.ts`,
    durationMs: 42,
    ...overrides,
  };
}

describe("parseReplayIntent", () => {
  test("matches prose request", () => {
    expect(parseReplayIntent("please replay tgo-abc step 3 for me")).toEqual({ runId: "tgo-abc", stepIndex: 3 });
  });
  test("no match returns undefined", () => {
    expect(parseReplayIntent("just chatting")).toBeUndefined();
    expect(parseReplayIntent("replay tgo-abc")).toBeUndefined();
  });
});

describe("replayStep", () => {
  test("round-trip: replay step N returns frozen input + captured output", async () => {
    const dir = await tmpDir();
    const runId = "tgo-r1";
    await appendRunEvent(dir, runId, { ...stepEvent(1, "edit"), ok: true });
    await appendRunEvent(dir, runId, { ...stepEvent(2, "bash"), ok: false, note: "exit 1" });

    const r0 = await replayStep(dir, runId, 0);
    expect(r0.ok).toBe(true);
    expect(r0.step?.tool).toBe("edit");
    expect(r0.inputHash).toBe("a1b2c3d4");
    expect(r0.output?.ok).toBe(true);

    const r1 = await replayStep(dir, runId, 1);
    expect(r1.ok).toBe(true);
    expect(r1.step?.tool).toBe("bash");
    expect(r1.output?.ok).toBe(false);
    expect(r1.output?.note).toBe("exit 1");

    // index beyond the 2 recorded steps → rejected
    const r2 = await replayStep(dir, runId, 2);
    expect(r2.ok).toBe(false);
    expect(r2.reason).toContain("no step 2");

    await fs.rm(dir, { recursive: true, force: true });
  });

  test("no run events → rejected", async () => {
    const dir = await tmpDir();
    const r = await replayStep(dir, "tgo-missing", 0);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("no run events");
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("definition-drift pre-flight rejects on changed promptHash", async () => {
    const dir = await tmpDir();
    const runId = "tgo-r1";
    await appendRunEvent(dir, runId, stepEvent(1, "edit"));
    // pin a snapshot with a known promptHash
    await writeDefSnapshot(dir, "tgo-r1", {
      capturedAt: "2026-01-01T00:00:00.000Z",
      generatedAt: "2026-01-01T00:00:00.000Z",
      promptHash: "deadbeef",
      seatFrontmatterHash: "cafebabe",
      model: "luna",
      preset: "balanced",
      seatFileFound: true,
    } as never);
    // matching hash → ok
    const okR = await replayStep(dir, runId, 0, { currentPromptHash: "deadbeef" });
    expect(okR.ok).toBe(true);
    // drifted hash → rejected with drift flag
    const drift = await replayStep(dir, runId, 0, { currentPromptHash: "changed1" });
    expect(drift.ok).toBe(false);
    expect(drift.driftDetected).toBe(true);
    expect(drift.reason).toContain("drifted");
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("formatReplayResult renders ok and rejected forms", () => {
    expect(formatReplayResult({ ok: false, reason: "no step 0" })).toContain("rejected");
    expect(formatReplayResult({ ok: true, runId: "tgo-x", stepIndex: 1, inputHash: "abcd1234", output: { tool: "edit", ok: true } })).toContain("tgo-x#1");
  });
});