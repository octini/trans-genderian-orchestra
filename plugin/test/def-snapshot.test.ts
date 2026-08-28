import { test, expect, describe } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {
  hashString,
  hashPrompt,
  hashSeatFrontmatter,
  buildDefSnapshot,
  defSnapshotPath,
  writeDefSnapshot,
  readDefSnapshot,
  ensureDefSnapshot,
  decideReuse,
  shouldReuseWithSnapshot,
  loadSessionMap,
  saveSessionMap,
  upsertSession,
  type DefSnapshot,
  type SessionMap,
} from "../src/session-reuse";
import {
  hashString as delegationHashString,
  buildDefSnapshot as delegationBuild,
  writeDefSnapshot as delegationWrite,
  readDefSnapshot as delegationRead,
  defSnapshotPath as delegationPath,
  ensureDefSnapshot as delegationEnsure,
} from "../src/delegation";
import { hashString as watchdogHashString } from "../src/watchdog";
import { buildBoardTextWithHints, BoardController } from "../src/board";
import { validateDelegationPacket } from "../src/delegation";
import type { RoutingClassification } from "../src/fit";

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "tgo-def-snapshot-"));
}

describe("hash vector pinned", () => {
  test("FNV-1a vector stable — hashString('foo.ts') === b5c9292a across modules", () => {
    // shared vector from watchdog tgo-vtn
    expect(hashString("foo.ts")).toBe("b5c9292a");
    expect(delegationHashString("foo.ts")).toBe("b5c9292a");
    expect(watchdogHashString("foo.ts")).toBe("b5c9292a");
    // also verify prompt/seat helpers reuse same hash
    expect(hashPrompt("foo.ts")).toBe("b5c9292a");
    expect(hashSeatFrontmatter("foo.ts")).toBe("b5c9292a");
  });

  test("hash stability across inputs", () => {
    expect(hashString("")).toBe("811c9dc5"); // FNV-1a offset basis for empty
    expect(hashString("hello")).toBe(hashString("hello"));
    expect(hashString("hello")).not.toBe(hashString("hello "));
    expect(hashString("prompt text A")).not.toBe(hashString("prompt text B"));
  });

  test("delegation buildDefSnapshot hash pinned", () => {
    const snap = delegationBuild({
      promptText: "Implement foo",
      seatFrontmatter: "---\nname: dylan\n---\n",
      model: "opencode-go/muse-spark-1.2-contributor",
      preset: "balanced",
      capturedAt: "2026-08-28T00:00:00.000Z",
    });
    // hashString is deterministic; pin vector for known input
    expect(snap.promptHash).toBe(hashString("Implement foo"));
    expect(snap.seatFrontmatterHash).toBe(hashString("---\nname: dylan\n---\n"));
    // also via session-reuse builder same
    const snap2 = buildDefSnapshot({
      promptText: "Implement foo",
      seatFrontmatter: "---\nname: dylan\n---\n",
      model: "opencode-go/muse-spark-1.2-contributor",
      preset: "balanced",
      capturedAt: "2026-08-28T00:00:00.000Z",
    });
    expect(snap2.promptHash).toBe(snap.promptHash);
    expect(snap2.seatFrontmatterHash).toBe(snap.seatFrontmatterHash);
  });
});

describe("snapshot write/read round-trip", () => {
  test("writeDefSnapshot and readDefSnapshot round-trip", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-5t1-test";
      const snapshot: DefSnapshot = {
        promptHash: hashPrompt("Objective: do work"),
        seatFrontmatterHash: hashSeatFrontmatter("---\nname: dylan\n---\nImplement with care."),
        model: "opencode-go/muse-spark-1.2-contributor",
        preset: "balanced",
        capturedAt: new Date().toISOString(),
      };
      const written = await writeDefSnapshot(dir, issueId, snapshot);
      expect(written).toBe(true);
      const loaded = await readDefSnapshot(dir, issueId);
      expect(loaded).toEqual(snapshot);
      // atomic tmp+rename leaves no tmp behind
      const tgoDir = path.join(dir, ".tgo", issueId);
      const files = await fs.readdir(tgoDir);
      expect(files.some((f) => f.includes(".tmp"))).toBe(false);
      expect(files).toContain("def-snapshot.json");
      // raw file is valid JSON with 2-space formatting via write
      const raw = await fs.readFile(defSnapshotPath(dir, issueId), "utf-8");
      expect(JSON.parse(raw)).toEqual(snapshot);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("write-once: second write without useLatestDefinitions does not mutate", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-writeonce";
      const first: DefSnapshot = {
        promptHash: hashPrompt("first prompt"),
        seatFrontmatterHash: hashSeatFrontmatter("first seat"),
        model: "model-a",
        preset: "balanced",
        capturedAt: "2026-01-01T00:00:00.000Z",
      };
      const second: DefSnapshot = {
        promptHash: hashPrompt("second prompt"),
        seatFrontmatterHash: hashSeatFrontmatter("second seat"),
        model: "model-b",
        preset: "cheap",
        capturedAt: "2026-01-02T00:00:00.000Z",
      };
      expect(await writeDefSnapshot(dir, issueId, first)).toBe(true);
      expect(await writeDefSnapshot(dir, issueId, second)).toBe(false);
      const loaded = await readDefSnapshot(dir, issueId);
      expect(loaded).toEqual(first);
      expect(loaded?.promptHash).not.toBe(second.promptHash);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("useLatestDefinitions opt-in overwrites snapshot", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-upgrade";
      const first: DefSnapshot = {
        promptHash: hashPrompt("v1"),
        seatFrontmatterHash: hashSeatFrontmatter("seat v1"),
        model: "model-a",
        preset: "balanced",
        capturedAt: "2026-01-01T00:00:00.000Z",
      };
      const second: DefSnapshot = {
        promptHash: hashPrompt("v2 updated prompt"),
        seatFrontmatterHash: hashSeatFrontmatter("seat v2"),
        model: "model-b",
        preset: "frontier",
        capturedAt: "2026-01-02T00:00:00.000Z",
      };
      await writeDefSnapshot(dir, issueId, first);
      const overwritten = await writeDefSnapshot(dir, issueId, second, { useLatestDefinitions: true });
      expect(overwritten).toBe(true);
      const loaded = await readDefSnapshot(dir, issueId);
      expect(loaded).toEqual(second);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("readDefSnapshot returns undefined for missing or corrupt", async () => {
    const dir = tmpDir();
    try {
      expect(await readDefSnapshot(dir, "nope")).toBeUndefined();
      await fs.mkdir(path.join(dir, ".tgo", "bad"), { recursive: true });
      await fs.writeFile(defSnapshotPath(dir, "bad"), "not-json{{{", "utf-8");
      expect(await readDefSnapshot(dir, "bad")).toBeUndefined();
      await fs.writeFile(defSnapshotPath(dir, "bad"), JSON.stringify({ promptHash: "bad", model: "x" }), "utf-8");
      expect(await readDefSnapshot(dir, "bad")).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("delegation module mirrors session-reuse path", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-mirror";
      const snap = delegationBuild({
        promptText: "prompt",
        seatFrontmatter: "seat",
        model: "m",
        preset: "balanced",
      });
      expect(await delegationWrite(dir, issueId, snap)).toBe(true);
      expect(await delegationRead(dir, issueId)).toEqual(snap);
      expect(delegationPath(dir, issueId)).toBe(defSnapshotPath(dir, issueId));
      // ensure via delegation also
      const res = await delegationEnsure({
        repoRoot: dir,
        issueId: "tgo-mirror2",
        promptText: "p2",
        seatFrontmatter: "s2",
        model: "m2",
        preset: "cheap",
      });
      expect(res.written).toBe(true);
      expect(await readDefSnapshot(dir, "tgo-mirror2")).toBeDefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("ensureDefSnapshot write-once vs upgrade", async () => {
    const dir = tmpDir();
    try {
      const r1 = await ensureDefSnapshot({
        repoRoot: dir,
        issueId: "tgo-ensure",
        promptText: "first",
        seatFrontmatter: "seat1",
        model: "m1",
        preset: "balanced",
      });
      expect(r1.written).toBe(true);
      expect(r1.reused).toBe(false);
      const r2 = await ensureDefSnapshot({
        repoRoot: dir,
        issueId: "tgo-ensure",
        promptText: "second different",
        seatFrontmatter: "seat2",
        model: "m2",
        preset: "cheap",
      });
      expect(r2.written).toBe(false);
      expect(r2.reused).toBe(true);
      expect(r2.snapshot.promptHash).toBe(r1.snapshot.promptHash);
      const r3 = await ensureDefSnapshot({
        repoRoot: dir,
        issueId: "tgo-ensure",
        promptText: "second different",
        seatFrontmatter: "seat2",
        model: "m2",
        preset: "cheap",
        useLatestDefinitions: true,
      });
      expect(r3.written).toBe(true);
      expect(r3.reused).toBe(false);
      expect(r3.snapshot.promptHash).toBe(hashPrompt("second different"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("session map promptHash extension", () => {
  test("save/load round-trip preserves promptHash", async () => {
    const dir = tmpDir();
    try {
      const map: SessionMap = {
        "tgo-1": { sessionId: "ses_abc123", delegationId: "d1", updatedAt: new Date().toISOString(), promptHash: hashPrompt("prompt") },
      };
      await saveSessionMap(dir, map);
      const loaded = await loadSessionMap(dir);
      expect(loaded["tgo-1"]?.promptHash).toBe(hashPrompt("prompt"));
      expect(loaded).toEqual(map);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("backward compatible: entries without promptHash still load", async () => {
    const dir = tmpDir();
    try {
      const map: SessionMap = {
        "tgo-legacy": { sessionId: "ses_old123", updatedAt: new Date().toISOString() },
      };
      await saveSessionMap(dir, map);
      const loaded = await loadSessionMap(dir);
      expect(loaded["tgo-legacy"]?.sessionId).toBe("ses_old123");
      expect(loaded["tgo-legacy"]?.promptHash).toBeUndefined();
      // also raw JSON without promptHash parses
      await fs.writeFile(path.join(dir, ".tgo", "sessions.json"), JSON.stringify({ "tgo-raw": { sessionId: "ses_raw999", updatedAt: new Date().toISOString() } }));
      const loaded2 = await loadSessionMap(dir);
      expect(loaded2["tgo-raw"]?.promptHash).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("upsertSession preserves promptHash and is pure", () => {
    const original: SessionMap = {
      "tgo-1": { sessionId: "ses_old", updatedAt: "2026-01-01T00:00:00.000Z", promptHash: hashPrompt("old") },
    };
    const copy = JSON.parse(JSON.stringify(original));
    const next = upsertSession(original, "tgo-1", {
      sessionId: "ses_new",
      updatedAt: "2026-01-02T00:00:00.000Z",
      promptHash: hashPrompt("new"),
    });
    expect(original).toEqual(copy);
    expect(next["tgo-1"]?.promptHash).toBe(hashPrompt("new"));
    expect(next["tgo-1"]?.sessionId).toBe("ses_new");
  });
});

describe("reuse-vs-upgrade decision matrix", () => {
  test("pinned default: snapshot exists → reuse even if estimate over budget", () => {
    const snap: DefSnapshot = {
      promptHash: hashPrompt("pinned"),
      seatFrontmatterHash: hashSeatFrontmatter("seat"),
      model: "m",
      preset: "balanced",
      capturedAt: new Date().toISOString(),
    };
    const d = decideReuse({ estimate: 200000, maxContextTokens: 100000, existingSnapshot: snap, currentPromptHash: hashPrompt("different") });
    expect(d.reuse).toBe(true);
    expect(d.reason).toContain("pinned");
    expect(shouldReuseWithSnapshot(200000, 100000, { snapshot: snap })).toBe(true);
  });

  test("pinned default: current hash matches snapshot → reuse", () => {
    const h = hashPrompt("same");
    const snap: DefSnapshot = {
      promptHash: h,
      seatFrontmatterHash: hashSeatFrontmatter("seat"),
      model: "m",
      preset: "balanced",
      capturedAt: new Date().toISOString(),
    };
    const d = decideReuse({ estimate: 10, maxContextTokens: 100000, existingSnapshot: snap, currentPromptHash: h });
    expect(d.reuse).toBe(true);
  });

  test("useLatestDefinitions opt-in → terminate and do not reuse", () => {
    const snap: DefSnapshot = {
      promptHash: hashPrompt("old"),
      seatFrontmatterHash: hashSeatFrontmatter("seat"),
      model: "m",
      preset: "balanced",
      capturedAt: new Date().toISOString(),
    };
    const d = decideReuse({ estimate: 10, maxContextTokens: 100000, existingSnapshot: snap, currentPromptHash: hashPrompt("old"), useLatestDefinitions: true });
    expect(d.reuse).toBe(false);
    expect(d.terminatePrior).toBe(true);
    expect(d.reason).toContain("useLatestDefinitions");
    expect(shouldReuseWithSnapshot(10, 100000, { snapshot: snap, useLatestDefinitions: true })).toBe(false);
  });

  test("legacy absent snapshot → falls back to token estimate", () => {
    expect(decideReuse({ estimate: 99999, maxContextTokens: 100000, existingSnapshot: null }).reuse).toBe(true);
    expect(decideReuse({ estimate: 100000, maxContextTokens: 100000, existingSnapshot: null }).reuse).toBe(false);
    expect(decideReuse({ estimate: 100001, maxContextTokens: 100000, existingSnapshot: undefined }).reuse).toBe(false);
    expect(shouldReuseWithSnapshot(99999, 100000, { snapshot: null })).toBe(true);
    expect(shouldReuseWithSnapshot(100000, 100000, { snapshot: null })).toBe(false);
  });

  test("useLatestDefinitions with no prior snapshot still does not reuse (upgrade path)", () => {
    const d = decideReuse({ estimate: 10, maxContextTokens: 100000, existingSnapshot: null, useLatestDefinitions: true });
    expect(d.reuse).toBe(false);
  });
});

describe("board badge renders", () => {
  test("board renders pinned badge when snapshot exists", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-badge";
      const snap: DefSnapshot = {
        promptHash: hashPrompt("Objective: do work"),
        seatFrontmatterHash: hashSeatFrontmatter("seat content"),
        model: "m",
        preset: "balanced",
        capturedAt: new Date().toISOString(),
      };
      await writeDefSnapshot(dir, issueId, snap);
      const built = await buildBoardTextWithHints(
        { inProgress: [{ id: issueId, title: "Do work", priority: 1 }], ready: [], blocked: [], memories: [], streaming: [] },
        undefined,
        undefined,
        6,
        dir
      );
      expect(built).toContain(`pinned v${snap.promptHash.slice(0, 8)}`);
      expect(built).toContain(issueId);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("board does not render badge when snapshot absent (legacy)", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-nobadge";
      const built = await buildBoardTextWithHints(
        { inProgress: [{ id: issueId, title: "Do work", priority: 1 }], ready: [], blocked: [], memories: [], streaming: [] },
        undefined,
        undefined,
        6,
        dir
      );
      expect(built).not.toContain("pinned v");
      expect(built).toContain(issueId);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("board badge via controller with snapshot and session reuse", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-badge-ctrl";
      const sid = "ses_abc123";
      const snap: DefSnapshot = {
        promptHash: hashPrompt("Objective: do work"),
        seatFrontmatterHash: hashSeatFrontmatter("seat"),
        model: "m",
        preset: "balanced",
        capturedAt: new Date().toISOString(),
      };
      await writeDefSnapshot(dir, issueId, snap);
      await fs.mkdir(path.join(dir, ".tgo"), { recursive: true });
      // need sessions.json for controller reuse logic, but badge is independent of session map
      await saveSessionMap(dir, { [issueId]: { sessionId: sid, updatedAt: new Date().toISOString(), promptHash: snap.promptHash } });
      const inProg = JSON.stringify([{ id: issueId, title: "Badge ctrl", priority: 1 }]);
      const run = async (cmd: string) => {
        if (cmd.includes("in_progress")) return inProg;
        if (cmd.includes("bd ready")) return "[]";
        if (cmd.includes("bd blocked")) return "[]";
        if (cmd.includes("bd memories")) return "{}";
        return "";
      };
      const client = { session: { messages: async () => [{ parts: [{ type: "text", text: "hi" }] }] } };
      const ctrl = new BoardController({ run, refreshMs: 0, sessionReuse: { repoRoot: dir, client: client as any, maxContextTokens: 100000, supported: true, enabled: true } });
      const text = await ctrl.renderFor("sess-badge");
      expect(text).toContain(`pinned v${snap.promptHash.slice(0, 8)}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("board badge not rendered for issue without snapshot even when other issues have snapshots", async () => {
    const dir = tmpDir();
    try {
      const withSnap = "tgo-with";
      const withoutSnap = "tgo-without";
      const snap: DefSnapshot = {
        promptHash: hashPrompt("with snap"),
        seatFrontmatterHash: hashSeatFrontmatter("seat"),
        model: "m",
        preset: "balanced",
        capturedAt: new Date().toISOString(),
      };
      await writeDefSnapshot(dir, withSnap, snap);
      const built = await buildBoardTextWithHints(
        {
          inProgress: [
            { id: withSnap, title: "With", priority: 1 },
            { id: withoutSnap, title: "Without", priority: 1 },
          ],
          ready: [],
          blocked: [],
          memories: [],
          streaming: [],
        },
        undefined,
        undefined,
        6,
        dir
      );
      // withSnap line should have badge, withoutSnap line should not leak badge
      const lines = built.split("\n");
      const withLine = lines.find((l) => l.includes(withSnap)) ?? "";
      const withoutLine = lines.find((l) => l.includes(withoutSnap)) ?? "";
      expect(withLine).toContain(`pinned v${snap.promptHash.slice(0, 8)}`);
      expect(withoutLine).not.toContain("pinned v");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("delegation packet useLatestDefinitions", () => {
  const standard: RoutingClassification = { route: "standard", tiny: false, reasons: [] };
  const base = {
    Objective: "Do work",
    Files: ["src/a.ts"],
    Interfaces: "keep",
    Constraints: "none",
    Verification: "run tests",
    exitGate: true,
    issueId: "tgo-123",
    issueStatusObserved: "in_progress",
    issueAssigneeObserved: "tester",
    claimExitCode: 0,
    delegationId: "del-1",
    beadsOperator: "Bernstein",
  };
  test("absent → valid", () => {
    const r = validateDelegationPacket(standard as any, { ...base });
    expect(r.valid).toBe(true);
    expect(r.malformed).not.toContain("useLatestDefinitions");
  });
  test("false → valid", () => {
    const r = validateDelegationPacket(standard as any, { ...base, useLatestDefinitions: false });
    expect(r.valid).toBe(true);
  });
  test("true → valid", () => {
    const r = validateDelegationPacket(standard as any, { ...base, useLatestDefinitions: true });
    expect(r.valid).toBe(true);
  });
  test("string/non-boolean → invalid", () => {
    const r = validateDelegationPacket(standard as any, { ...base, useLatestDefinitions: "true" });
    expect(r.valid).toBe(false);
    expect(r.malformed).toContain("useLatestDefinitions");
  });
});
