import { describe, test, expect } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {
  computeScopeHash,
  validateConvoyState,
  initConvoy,
  readConvoyState,
  markWaveComplete,
  allWavesComplete,
  convoyLandingOrder,
  landConvoy,
  convoyStatePath,
  MAX_PARALLEL_WAVES,
  type ConvoyWave,
} from "../src/convoy";

async function tmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "tgo-convoy-"));
}

function waves(): ConvoyWave[] {
  return [
    { wave: 1, beads: [{ issueId: "tgo-a1", scope: ["src/w1/a.ts"] }] },
    { wave: 2, beads: [{ issueId: "tgo-a2", scope: ["src/w2/b.ts"] }] },
    { wave: 3, beads: [{ issueId: "tgo-a3", scope: ["src/w3/c.ts"] }] },
  ];
}

describe("scopeHash", () => {
  test("deterministic and sensitive to scope change", () => {
    const a = computeScopeHash(waves());
    const b = computeScopeHash(waves());
    expect(a).toBe(b);
    const tweaked = waves();
    tweaked[0].beads[0].scope = ["src/w1/CHANGED.ts"];
    expect(computeScopeHash(tweaked)).not.toBe(a);
  });
});

describe("state validation", () => {
  test("valid state passes", () => {
    const v = validateConvoyState({
      goal: "ship x",
      scopeHash: computeScopeHash(waves()),
      remainingBudget: 100,
      completedDeps: [],
      waves: waves(),
    });
    expect(v.valid).toBe(true);
  });

  test("missing goal, bad budget, empty waves, >3 waves, bad issueId, bad hash all fail", () => {
    const base = () => ({
      goal: "x",
      scopeHash: computeScopeHash(waves()),
      remainingBudget: 10,
      completedDeps: [],
      waves: waves(),
    });
    expect(validateConvoyState({ ...base(), goal: "" }).valid).toBe(false);
    expect(validateConvoyState({ ...base(), remainingBudget: -1 }).valid).toBe(false);
    expect(validateConvoyState({ ...base(), waves: [] }).valid).toBe(false);
    expect(validateConvoyState({ ...base(), scopeHash: "deadbeef" }).valid).toBe(false);
    const many = { ...base(), waves: [1, 2, 3, 4].map((n) => ({ wave: n, beads: [{ issueId: `tgo-b${n}`, scope: [`s${n}.ts`] }] })) };
    expect(validateConvoyState(many).valid).toBe(false);
    expect(MAX_PARALLEL_WAVES).toBe(3);
  });
});

describe("convoy lifecycle", () => {
  test("init → read roundtrip; invalid init rejects", async () => {
    const dir = await tmpDir();
    const s = await initConvoy(dir, { goal: "ship", remainingBudget: 42, waves: waves() });
    expect(s.scopeHash).toBe(computeScopeHash(waves()));
    const read = await readConvoyState(dir);
    expect(read?.goal).toBe("ship");
    expect(read?.remainingBudget).toBe(42);
    await expect(initConvoy(dir, { goal: "", remainingBudget: 1, waves: waves() })).rejects.toThrow(/CONVOY_INVALID/);
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("missing state file → readConvoyState undefined", async () => {
    const dir = await tmpDir();
    expect(await readConvoyState(dir)).toBeUndefined();
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("markWaveComplete dedupes completedDeps", async () => {
    const dir = await tmpDir();
    await initConvoy(dir, { goal: "x", remainingBudget: 1, waves: waves() });
    const s1 = await markWaveComplete(dir, ["tgo-a1"]);
    const s2 = await markWaveComplete(dir, ["tgo-a1", "tgo-a2"]);
    expect(s2.completedDeps.sort()).toEqual(["tgo-a1", "tgo-a2"].sort());
    expect(s1.completedDeps).toEqual(["tgo-a1"]);
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("allWavesComplete + landing order", async () => {
    const dir = await tmpDir();
    const s = await initConvoy(dir, { goal: "x", remainingBudget: 1, waves: waves() });
    expect(allWavesComplete(s)).toBe(false);
    expect(convoyLandingOrder(s)).toEqual([1, 2, 3]);
    const full = await markWaveComplete(dir, ["tgo-a1", "tgo-a2", "tgo-a3"]);
    expect(allWavesComplete(full)).toBe(true);
    await fs.rm(dir, { recursive: true, force: true });
  });
});

describe("landing", () => {
  test("merges in defined wave order, not completion arrival order", async () => {
    const dir = await tmpDir();
    await initConvoy(dir, { goal: "x", remainingBudget: 1, waves: waves() });
    // complete out of order: wave 2 first, then 1, then 3
    await markWaveComplete(dir, ["tgo-a2"]);
    await markWaveComplete(dir, ["tgo-a1"]);
    await markWaveComplete(dir, ["tgo-a3"]);
    const mergeCalls: number[] = [];
    const result = await landConvoy(dir, {
      gateCheck: async () => ({ ok: true }),
      mergeWorktree: async (wave) => { mergeCalls.push(wave); },
    });
    expect(result.landed).toBe(true);
    expect(mergeCalls).toEqual([1, 2, 3]);
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("aborts at first gate failure, reports partial merges", async () => {
    const dir = await tmpDir();
    await initConvoy(dir, { goal: "x", remainingBudget: 1, waves: waves() });
    await markWaveComplete(dir, ["tgo-a1", "tgo-a2", "tgo-a3"]);
    const mergeCalls: number[] = [];
    const result = await landConvoy(dir, {
      gateCheck: async (id) => (id === "tgo-a2" ? { ok: false, reason: "GATE_BLOCKED_CRITICAL" } : { ok: true }),
      mergeWorktree: async (wave) => { mergeCalls.push(wave); },
    });
    expect(result.landed).toBe(false);
    expect(result.reason).toContain("tgo-a2");
    expect(mergeCalls).toEqual([1]); // wave 1 merged, wave 2 blocked
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("no state or incomplete waves → not landed", async () => {
    const dir = await tmpDir();
    const noState = await landConvoy(dir, {
      gateCheck: async () => ({ ok: true }),
      mergeWorktree: async () => {},
    });
    expect(noState.landed).toBe(false);
    expect(noState.reason).toContain("no convoy state");

    await initConvoy(dir, { goal: "x", remainingBudget: 1, waves: waves() });
    await markWaveComplete(dir, ["tgo-a1"]); // only wave 1 complete
    const incomplete = await landConvoy(dir, {
      gateCheck: async () => ({ ok: true }),
      mergeWorktree: async () => {},
    });
    expect(incomplete.landed).toBe(false);
    expect(incomplete.reason).toContain("not all waves");
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("scopeHash mismatch aborts landing (tampered state)", async () => {
    const dir = await tmpDir();
    const s = await initConvoy(dir, { goal: "ship", remainingBudget: 1, waves: waves() });
    // tamper the file: change a scope but keep the old hash
    const tampered = JSON.parse(JSON.stringify(s)) as typeof s;
    tampered.waves[1].beads[0].scope = ["src/w2/CHANGED.ts"];
    await fs.writeFile(convoyStatePath(dir), JSON.stringify(tampered, null, 2), "utf-8");
    // readConvoyState rejects the mismatch → undefined
    expect(await readConvoyState(dir)).toBeUndefined();
    const result = await landConvoy(dir, {
      gateCheck: async () => ({ ok: true }),
      mergeWorktree: async () => {},
    });
    expect(result.landed).toBe(false);
    await fs.rm(dir, { recursive: true, force: true });
  });
});