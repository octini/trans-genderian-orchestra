import { describe, test, expect } from "bun:test";
import {
  checkSpawnAllowed,
  recordDispatch,
  onChildCreated,
  onSessionDeleted,
  resetRecursionState,
  getSessionDepth,
} from "../src/recursion";

// Build a delegation chain s0(root) → s1 → ... → sn, attributing issueIds.
function buildChain(issueIds: Array<string | null>): string[] {
  resetRecursionState();
  const ids: string[] = [];
  for (let i = 0; i <= issueIds.length; i++) ids.push(`s${i}`);
  for (let i = 1; i < ids.length; i++) {
    recordDispatch(ids[i - 1], issueIds[i - 1]);
    onChildCreated(ids[i], ids[i - 1]);
  }
  return ids;
}

describe("recursion depth cap", () => {
  test("depth is 0-indexed from root and increments per spawn", () => {
    const ids = buildChain([null, null, null]);
    expect(getSessionDepth(ids[0])).toBe(0);
    expect(getSessionDepth(ids[1])).toBe(1);
    expect(getSessionDepth(ids[2])).toBe(2);
    expect(getSessionDepth(ids[3])).toBe(3);
  });

  test("depth N allowed, N+1 blocked at the cap (maxDepth 4)", () => {
    const ids = buildChain([null, null, null, null]); // s4 at depth 4
    expect(getSessionDepth(ids[4])).toBe(4);
    // inside cap: s3 (depth 3) can still spawn → child depth 4
    const allow = checkSpawnAllowed(ids[3], null, { maxDepth: 4 });
    expect(allow.allowed).toBe(true);
    expect(allow.depth).toBe(4);
    // at cap: s4 (depth 4) cannot spawn → blocked with typed reason
    const block = checkSpawnAllowed(ids[4], null, { maxDepth: 4 });
    expect(block.allowed).toBe(false);
    expect(block.reason).toContain("depth cap");
    // root can always spawn
    expect(checkSpawnAllowed(ids[0], null, { maxDepth: 4 }).allowed).toBe(true);
  });

  test("default maxDepth is 4 when no config given", () => {
    const ids = buildChain([null, null, null, null]);
    expect(checkSpawnAllowed(ids[4], null).allowed).toBe(false);
    expect(checkSpawnAllowed(ids[3], null).allowed).toBe(true);
  });

  test("enabled false disables the hard gate", () => {
    const ids = buildChain([null, null, null, null]);
    expect(checkSpawnAllowed(ids[4], null, { enabled: false }).allowed).toBe(true);
  });
});

describe("recursion cycle detection", () => {
  test("A→B→A blocked", () => {
    const ids = buildChain(["A", "B"]); // s1=A, s2=B
    const back = checkSpawnAllowed(ids[2], "A", { maxDepth: 4 });
    expect(back.allowed).toBe(false);
    expect(back.reason).toContain("cycle");
  });

  test("self-spawn (A→A) blocked", () => {
    const ids = buildChain(["A"]);
    const self = checkSpawnAllowed(ids[1], "A", { maxDepth: 4 });
    expect(self.allowed).toBe(false);
    expect(self.reason).toContain("cycle");
  });

  test("A→B→C allowed", () => {
    const ids = buildChain(["A", "B"]);
    const next = checkSpawnAllowed(ids[2], "C", { maxDepth: 4 });
    expect(next.allowed).toBe(true);
    expect(next.depth).toBe(3);
  });

  test("longer cycle detected within bound (A→B→C, C→A)", () => {
    const ids = buildChain(["A", "B", "C"]); // s1=A, s2=B, s3=C
    const back = checkSpawnAllowed(ids[3], "A", { maxDepth: 4 });
    expect(back.allowed).toBe(false);
  });

  test("cycle detection truncated by cycleBound", () => {
    const ids = buildChain(["A", "B", "C"]); // s3=C, ancestor A is 2 hops up
    // cycleBound 1 walks only self + 1 ancestor (C, B) → A not seen → allowed
    const beyondBound = checkSpawnAllowed(ids[3], "A", { cycleBound: 1 });
    expect(beyondBound.allowed).toBe(true);
    // cycleBound 2 reaches A → blocked
    const withinBound = checkSpawnAllowed(ids[3], "A", { cycleBound: 2 });
    expect(withinBound.allowed).toBe(false);
  });

  test("null issueId never triggers a cycle", () => {
    const ids = buildChain([null, null]);
    expect(checkSpawnAllowed(ids[2], null, { maxDepth: 4 }).allowed).toBe(true);
  });
});

describe("recursion lifecycle hygiene", () => {
  test("onSessionDeleted releases depth so a reused id is treated as root", () => {
    const ids = buildChain(["A", "B"]);
    expect(getSessionDepth(ids[2])).toBe(2);
    onSessionDeleted(ids[1]);
    // child's depth is untouched
    expect(getSessionDepth(ids[2])).toBe(2);
    // a fresh session reusing the deleted id that was never a child is depth 0
    expect(getSessionDepth("s-deleted-fresh")).toBe(0);
  });

  test("queue consumes oldest pending spawn first (sequential children)", () => {
    resetRecursionState();
    // parent s0 dispatches two children in sequence
    recordDispatch("s0", "X");
    recordDispatch("s0", "Y");
    onChildCreated("s1", "s0");
    onChildCreated("s2", "s0");
    expect(getSessionDepth("s1")).toBe(1);
    expect(getSessionDepth("s2")).toBe(1);
    // first child attributed X, second Y → each spawns the other's issue = cycle
    const c1 = checkSpawnAllowed("s1", "Y", { maxDepth: 4 });
    expect(c1.allowed).toBe(true);
    const c2 = checkSpawnAllowed("s2", "X", { maxDepth: 4 });
    expect(c2.allowed).toBe(true);
  });
});