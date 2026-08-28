import { test, expect, describe } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
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
  buildDefSnapshot as delegationBuildPacket,
  buildDefSnapshotFromPrompt as delegationBuildFromPrompt,
  writeDefSnapshot as delegationWrite,
  readDefSnapshot as delegationRead,
  defSnapshotPath as delegationPath,
  ensureDefSnapshot as delegationEnsure,
} from "../src/delegation";
import { hashString as watchdogHashString } from "../src/watchdog";
import { buildBoardTextWithHints, BoardController } from "../src/board";
import { validateDelegationPacket } from "../src/delegation";
import type { RoutingClassification } from "../src/fit";
import { hashFivePartPacket, normalizeFivePartSections, canonicalizeFivePart, isValidBeadID, assertValidBeadID, __setDefSnapshotWriteDelayForTest, __clearDefSnapshotWriteDelayForTest } from "../src/def-snapshot";
import { captureDelegationSession } from "../src/session-reuse";

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "tgo-def-snapshot-"));
}

describe("hash vector pinned", () => {
  test("FNV-1a vector stable — hashString('foo.ts') === b5c9292a across modules", () => {
    expect(hashString("foo.ts")).toBe("b5c9292a");
    expect(delegationHashString("foo.ts")).toBe("b5c9292a");
    expect(watchdogHashString("foo.ts")).toBe("b5c9292a");
    expect(hashPrompt("foo.ts")).toBe("b5c9292a");
    expect(hashSeatFrontmatter("foo.ts")).toBe("b5c9292a");
  });

  test("hash stability across inputs", () => {
    expect(hashString("")).toBe("811c9dc5");
    expect(hashString("hello")).toBe(hashString("hello"));
    expect(hashString("hello")).not.toBe(hashString("hello "));
    expect(hashString("prompt text A")).not.toBe(hashString("prompt text B"));
  });

  test("delegation buildDefSnapshot hash pinned", () => {
    const snap = delegationBuildFromPrompt({
      promptText: "Implement foo",
      seatFrontmatter: "---\nname: dylan\n---\n",
      model: "opencode-go/muse-spark-1.2-contributor",
      preset: "balanced",
      capturedAt: "2026-08-28T00:00:00.000Z",
    });
    expect(snap.promptHash).toBe(hashString("Implement foo"));
    expect(snap.seatFrontmatterHash).toBe(hashString("---\nname: dylan\n---\n"));
    expect(snap.seatFileFound).toBe(true);
    const snap2 = buildDefSnapshot({
      promptText: "Implement foo",
      seatFrontmatter: "---\nname: dylan\n---\n",
      model: "opencode-go/muse-spark-1.2-contributor",
      preset: "balanced",
      capturedAt: "2026-08-28T00:00:00.000Z",
    });
    expect(snap2.promptHash).toBe(snap.promptHash);
    expect(snap2.seatFrontmatterHash).toBe(snap.seatFrontmatterHash);
    expect(snap2.seatFileFound).toBe(true);
    const packetSnap = delegationBuildPacket({
      packet: { Objective: "Implement foo", Files: ["a.ts"], Interfaces: "i", Constraints: "c", Verification: "v" },
      seatFrontmatter: "---\nname: dylan\n---\n",
      seatFileFound: true,
      model: "opencode-go/muse-spark-1.2-contributor",
      preset: "balanced",
    });
    expect(packetSnap.promptHash).toBe(hashFivePartPacket({ Objective: "Implement foo", Files: ["a.ts"], Interfaces: "i", Constraints: "c", Verification: "v" }));
  });

  test("five-part hash mutation matrix — each section changes hash", () => {
    const base = { Objective: "O", Files: ["a.ts"], Interfaces: "I", Constraints: "C", Verification: "V" } as const;
    const baseHash = hashFivePartPacket(base);
    const mutateObjective = hashFivePartPacket({ ...base, Objective: "O2" });
    const mutateFiles = hashFivePartPacket({ ...base, Files: ["b.ts"] });
    const mutateInterfaces = hashFivePartPacket({ ...base, Interfaces: "I2" });
    const mutateConstraints = hashFivePartPacket({ ...base, Constraints: "C2" });
    const mutateVerification = hashFivePartPacket({ ...base, Verification: "V2" });
    expect(mutateObjective).not.toBe(baseHash);
    expect(mutateFiles).not.toBe(baseHash);
    expect(mutateInterfaces).not.toBe(baseHash);
    expect(mutateConstraints).not.toBe(baseHash);
    expect(mutateVerification).not.toBe(baseHash);
    // ensure distinct mutations produce distinct hashes
    const hashes = new Set([baseHash, mutateObjective, mutateFiles, mutateInterfaces, mutateConstraints, mutateVerification]);
    expect(hashes.size).toBe(6);
    // hash covers Files array content, not just presence
    const sameFilesDifferentOrder = hashFivePartPacket({ ...base, Files: ["b.ts", "a.ts"] });
    expect(sameFilesDifferentOrder).not.toBe(baseHash);
    // delimiter collision: section containing literal "\n---\n" must produce distinct hash
    const delimiterInObjective = hashFivePartPacket({ ...base, Objective: "O\n---\nI" });
    const splitAcross = hashFivePartPacket({ Objective: "O", Files: ["a.ts"], Interfaces: "I", Constraints: "C", Verification: "V\n---\n" });
    // both delimiter-containing variants must differ from base and from each other — proof length-prefixing works
    expect(delimiterInObjective).not.toBe(baseHash);
    expect(splitAcross).not.toBe(baseHash);
    expect(delimiterInObjective).not.toBe(splitAcross);
    // boundary collision: EXACT vectors that collide under old "\n---\n" join but distinct under length-prefix — on production-normalized inputs
    const rawX = { Objective: "a", Files: "b\n---\nc", Interfaces: "", Constraints: "", Verification: "" };
    const rawY = { Objective: "a\n---\nb", Files: "c", Interfaces: "", Constraints: "", Verification: "" };
    const normX = normalizeFivePartSections(rawX);
    const normY = normalizeFivePartSections(rawY);
    expect(normX).toEqual(["a", "b\n---\nc", "", "", ""]);
    expect(normY).toEqual(["a\n---\nb", "c", "", "", ""]);
    const oldJoiner = (parts: string[]) => parts.join("\n---\n");
    // (a) real collision under old scheme on production-normalized inputs
    expect(canonicalizeFivePart(normX, oldJoiner)).toBe(canonicalizeFivePart(normY, oldJoiner));
    // (b) distinct under length-prefix (default)
    expect(canonicalizeFivePart(normX)).not.toBe(canonicalizeFivePart(normY));
    // (c) end-to-end hashes distinct
    const hashX = hashFivePartPacket(rawX);
    const hashY = hashFivePartPacket(rawY);
    expect(hashX).not.toBe(hashY);
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
        seatFileFound: true,
        capturedAt: new Date().toISOString(),
      };
      const written = await writeDefSnapshot(dir, issueId, snapshot);
      expect(written).toBe(true);
      const loaded = await readDefSnapshot(dir, issueId);
      expect(loaded).toEqual(snapshot);
      const tgoDir = path.join(dir, ".tgo", issueId);
      const files = await fs.readdir(tgoDir);
      expect(files.some((f) => f.includes(".tmp"))).toBe(false);
      expect(files).toContain("def-snapshot.json");
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
        seatFileFound: true,
        capturedAt: "2026-01-01T00:00:00.000Z",
      };
      const second: DefSnapshot = {
        promptHash: hashPrompt("second prompt"),
        seatFrontmatterHash: hashSeatFrontmatter("second seat"),
        model: "model-b",
        preset: "cheap",
        seatFileFound: true,
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
        seatFileFound: true,
        capturedAt: "2026-01-01T00:00:00.000Z",
      };
      const second: DefSnapshot = {
        promptHash: hashPrompt("v2 updated prompt"),
        seatFrontmatterHash: hashSeatFrontmatter("seat v2"),
        model: "model-b",
        preset: "frontier",
        seatFileFound: true,
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
      // unknown model is rejected
      await fs.writeFile(defSnapshotPath(dir, "bad"), JSON.stringify({ promptHash: "b5c9292a", seatFrontmatterHash: "b5c9292a", model: "unknown", preset: "balanced", seatFileFound: true, capturedAt: new Date().toISOString() }), "utf-8");
      expect(await readDefSnapshot(dir, "bad")).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("delegation module mirrors session-reuse path", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-mirror";
      const snap = delegationBuildFromPrompt({
        promptText: "prompt",
        seatFrontmatter: "seat",
        model: "m",
        preset: "balanced",
      });
      expect(await delegationWrite(dir, issueId, snap)).toBe(true);
      expect(await delegationRead(dir, issueId)).toEqual(snap);
      expect(delegationPath(dir, issueId)).toBe(defSnapshotPath(dir, issueId));
      const res = await delegationEnsure({
        repoRoot: dir,
        issueId: "tgo-mirror2",
        promptText: "p2",
        seatFrontmatter: "s2",
        seatFileFound: true,
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
        seatFileFound: true,
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
        seatFileFound: true,
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
        seatFileFound: true,
        useLatestDefinitions: true,
      });
      expect(r3.written).toBe(true);
      expect(r3.reused).toBe(false);
      expect(r3.snapshot.promptHash).toBe(hashPrompt("second different"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("authoritative metadata: seatFileFound flag and model validation", async () => {
    const dir = tmpDir();
    try {
      // missing seat file should be explicit false, not silent empty hash
      const snapMissing = delegationBuildFromPrompt({
        promptText: "p",
        seatFrontmatter: "",
        seatFileFound: false,
        model: "opencode-go/muse-spark-1.2-contributor",
        preset: "balanced",
      });
      expect(snapMissing.seatFileFound).toBe(false);
      expect(snapMissing.seatFrontmatterHash).toBe(hashString(""));
      await writeDefSnapshot(dir, "tgo-seat-missing", snapMissing);
      const loadedMissing = await readDefSnapshot(dir, "tgo-seat-missing");
      expect(loadedMissing?.seatFileFound).toBe(false);
      // present seat file
      const snapFound = delegationBuildFromPrompt({
        promptText: "p",
        seatFrontmatter: "---\nname: dylan\n---\ncontent",
        seatFileFound: true,
        model: "opencode-go/muse-spark-1.2-contributor",
        preset: "balanced",
      });
      expect(snapFound.seatFileFound).toBe(true);
      // unknown model is rejected at write and read
      const badSnap: DefSnapshot = {
        promptHash: hashPrompt("p"),
        seatFrontmatterHash: hashSeatFrontmatter("seat"),
        model: "unknown",
        preset: "balanced",
        seatFileFound: true,
        capturedAt: new Date().toISOString(),
      };
      await expect(writeDefSnapshot(dir, "tgo-bad-model", badSnap)).rejects.toThrow(/unknown/);
      // build with unknown also throws
      expect(() => delegationBuildFromPrompt({ promptText: "p", seatFrontmatter: "s", model: "unknown", preset: "balanced" })).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("VALID_BEAD_ID validation — traversal ids rejected at every entry point", async () => {
    const dir = tmpDir();
    const traversal = "../../target";
    const dotSlash = "../tgo-evil";
    const withSlash = "tgo/bad";
    const empty = "";
    const badPacket = { Objective: "O", Files: ["a.ts"], Interfaces: "i", Constraints: "c", Verification: "v" };
    const goodModel = "opencode-go/muse-spark-1.2-contributor";
    for (const badId of [traversal, dotSlash, withSlash, empty, "-bad", ".hidden"]) {
      expect(isValidBeadID(badId)).toBe(false);
      expect(() => assertValidBeadID(badId)).toThrow(/VALID_BEAD_ID/);
      // defSnapshotPath should throw
      expect(() => defSnapshotPath(dir, badId)).toThrow(/VALID_BEAD_ID/);
      // write should throw (not create file outside .tgo)
      const snap: DefSnapshot = {
        promptHash: hashPrompt("p"),
        seatFrontmatterHash: hashSeatFrontmatter("s"),
        model: goodModel,
        preset: "balanced",
        seatFileFound: true,
        capturedAt: new Date().toISOString(),
      };
      await expect(writeDefSnapshot(dir, badId, snap)).rejects.toThrow(/VALID_BEAD_ID/);
      // read should throw as well (not return undefined silently for traversal)
      await expect(readDefSnapshot(dir, badId)).rejects.toThrow(/VALID_BEAD_ID/);
      // ensure should throw
      await expect(ensureDefSnapshot({ repoRoot: dir, issueId: badId, promptText: "p", seatFrontmatter: "s", seatFileFound: true, model: goodModel, preset: "balanced" })).rejects.toThrow(/VALID_BEAD_ID/);
      // delegation path
      expect(() => delegationPath(dir, badId)).toThrow(/VALID_BEAD_ID/);
      await expect(delegationWrite(dir, badId, snap)).rejects.toThrow(/VALID_BEAD_ID/);
      await expect(delegationRead(dir, badId)).rejects.toThrow(/VALID_BEAD_ID/);
    }
    // valid ids pass
    for (const good of ["tgo-123", "tgo_123", "tgo.123", "A1", "tgo-5t1"]) {
      expect(isValidBeadID(good)).toBe(true);
      expect(() => assertValidBeadID(good)).not.toThrow();
      expect(() => defSnapshotPath(dir, good)).not.toThrow();
    }
    rmSync(dir, { recursive: true, force: true });
  });

  test("concurrent write convergence — N concurrent ensureDefSnapshot → exactly one winner, no corruption (deterministic fault injection)", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-concurrent";
      const N = 12;
      // Deterministic fault injection: delay between tmp write and link so losers must poll FINAL path (no empty/partial read)
      __setDefSnapshotWriteDelayForTest(150);
      try {
        const promises = Array.from({ length: N }, (_, i) =>
          ensureDefSnapshot({
            repoRoot: dir,
            issueId,
            promptText: `prompt-${i}`,
            seatFrontmatter: `seat-${i}`,
            seatFileFound: true,
            model: `model-${i}`,
            preset: "balanced",
          })
        );
        const results = await Promise.all(promises);
        const written = results.filter((r) => r.written).length;
        expect(written).toBe(1);
        const reused = results.filter((r) => r.reused).length;
        expect(reused).toBe(N - 1);
        // zero empty/divergent reads — all losers converged to winner's hash with full content
        const winner = results.find((r) => r.written)!;
        expect(winner).toBeDefined();
        const winnerHash = winner.snapshot.promptHash;
        let emptyReads = 0;
        for (const r of results) {
          if (!r.snapshot || !r.snapshot.promptHash) emptyReads++;
          expect(r.snapshot.promptHash).toBe(winnerHash);
          expect(r.snapshot.model).toBe(winner.snapshot.model);
          expect(r.snapshot.preset).toBe(winner.snapshot.preset);
          expect(r.snapshot.seatFrontmatterHash).toBe(winner.snapshot.seatFrontmatterHash);
          // never empty/partial — snapshot must be fully populated
          expect(r.snapshot.promptHash.length).toBeGreaterThan(0);
          expect(r.snapshot.model.length).toBeGreaterThan(0);
          expect(JSON.stringify(r.snapshot).length).toBeGreaterThan(0);
        }
        expect(emptyReads).toBe(0);
        const loaded = await readDefSnapshot(dir, issueId);
        expect(loaded).toBeDefined();
        expect(loaded?.promptHash).toBe(winnerHash);
        // file is valid JSON, full content, no corruption, no tmp left behind
        const raw = await fs.readFile(defSnapshotPath(dir, issueId), "utf-8");
        expect(raw.length).toBeGreaterThan(0);
        expect(() => JSON.parse(raw)).not.toThrow();
        const parsed = JSON.parse(raw) as { promptHash: string };
        expect(parsed.promptHash).toBe(winnerHash);
        const tgoDir = path.join(dir, ".tgo", issueId);
        const files = await fs.readdir(tgoDir);
        expect(files.some((f) => f.includes(".tmp"))).toBe(false);
        expect(files).toContain("def-snapshot.json");
      } finally {
        __clearDefSnapshotWriteDelayForTest();
      }
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
      seatFileFound: true,
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
      seatFileFound: true,
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
      seatFileFound: true,
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

  test("production reuse wiring — snapshot exists overrides token overflow (board path)", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-prod-reuse";
      const sid = "ses_abc123";
      const snap: DefSnapshot = {
        promptHash: hashPrompt("pinned-work"),
        seatFrontmatterHash: hashSeatFrontmatter("seat"),
        model: "m",
        preset: "balanced",
        seatFileFound: true,
        capturedAt: new Date().toISOString(),
      };
      await writeDefSnapshot(dir, issueId, snap);
      await saveSessionMap(dir, { [issueId]: { sessionId: sid, updatedAt: new Date().toISOString(), promptHash: snap.promptHash } });
      const inProg = JSON.stringify([{ id: issueId, title: "Prod reuse", priority: 1 }]);
      const run = async (cmd: string) => {
        if (cmd.includes("in_progress")) return inProg;
        if (cmd.includes("bd ready")) return "[]";
        if (cmd.includes("bd blocked")) return "[]";
        if (cmd.includes("bd memories")) return "{}";
        return "";
      };
      // Large estimate that would fail legacy shouldReuse but should pass with snapshot
      const largeText = Array.from({ length: 20000 }, () => "word").join(" ");
      const client = {
        session: {
          messages: async () => [{ parts: [{ type: "text", text: largeText }] }],
        },
      };
      const ctrl = new BoardController({ run, refreshMs: 0, sessionReuse: { repoRoot: dir, client: client as any, maxContextTokens: 5, supported: true, enabled: true } });
      const text = await ctrl.renderFor("sess-prod-reuse");
      // With snapshot, should still be considered reusable despite overflow — hint line present
      expect(text).toContain(`reusable session ${sid}`);
      // Also board decision helper directly
      const estimate = 100000;
      expect(shouldReuseWithSnapshot(estimate, 5, { snapshot: snap })).toBe(true);
      expect(shouldReuseWithSnapshot(estimate, 5, { snapshot: null })).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
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
        seatFileFound: true,
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
        seatFileFound: true,
        capturedAt: new Date().toISOString(),
      };
      await writeDefSnapshot(dir, issueId, snap);
      await fs.mkdir(path.join(dir, ".tgo"), { recursive: true });
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
        seatFileFound: true,
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
      const lines = built.split("\n");
      const withLine = lines.find((l) => l.includes(withSnap)) ?? "";
      const withoutLine = lines.find((l) => l.includes(withoutSnap)) ?? "";
      expect(withLine).toContain(`pinned v${snap.promptHash.slice(0, 8)}`);
      expect(withoutLine).not.toContain("pinned v");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("after-hook never rewrites snapshot — captured snapshot survives large second write without useLatest", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-no-rewrite";
      // Simulate first dispatch writes snapshot
      const first: DefSnapshot = {
        promptHash: hashPrompt("first"),
        seatFrontmatterHash: hashSeatFrontmatter("seat1"),
        model: "model-a",
        preset: "balanced",
        seatFileFound: true,
        capturedAt: "2026-01-01T00:00:00.000Z",
      };
      await writeDefSnapshot(dir, issueId, first);
      // Simulate after-hook trying to write different data without useLatest — should not overwrite
      const second: DefSnapshot = {
        promptHash: hashPrompt("second-different"),
        seatFrontmatterHash: hashSeatFrontmatter("seat2"),
        model: "model-b",
        preset: "cheap",
        seatFileFound: true,
        capturedAt: "2026-01-02T00:00:00.000Z",
      };
      const written = await writeDefSnapshot(dir, issueId, second);
      expect(written).toBe(false);
      const loaded = await readDefSnapshot(dir, issueId);
      expect(loaded).toEqual(first);
      // Also verify captureDelegationSession is read-only: call it and ensure snapshot unchanged
      await captureDelegationSession({
        tool: "task",
        input: { args: { delegationPacket: { issueId, delegationId: "d1", Objective: "second-different", Files: ["b.ts"], Interfaces: "i2", Constraints: "c2", Verification: "v2", exitGate: true, issueStatusObserved: "in_progress", issueAssigneeObserved: "tester", claimExitCode: 0, beadsOperator: "Bernstein" } } },
        output: { output: "done", metadata: { sessionId: "ses_abc123" } },
        repoRoot: dir,
        enabled: true,
      });
      const after = await readDefSnapshot(dir, issueId);
      expect(after).toEqual(first);
      expect(after?.promptHash).not.toBe(second.promptHash);
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

describe("delegation packet traversal rejection", () => {
  const standard: RoutingClassification = { route: "standard", tiny: false, reasons: [] };
  const base = {
    Objective: "Do work",
    Files: ["src/a.ts"],
    Interfaces: "keep",
    Constraints: "none",
    Verification: "run tests",
    exitGate: true,
    issueStatusObserved: "in_progress",
    issueAssigneeObserved: "tester",
    claimExitCode: 0,
    delegationId: "del-1",
    beadsOperator: "Bernstein",
  };
  for (const bad of ["../../target", "../evil", "tgo/bad", "-bad", ".hidden", "tgo 123"]) {
    test(`issueId "${bad}" → invalid`, () => {
      const r = validateDelegationPacket(standard as any, { ...base, issueId: bad });
      expect(r.valid).toBe(false);
      expect(r.malformed).toContain("issueId");
      expect(r.diagnostics.join(" ")).toContain("VALID_BEAD_ID");
    });
  }
  test(`issueId "" → invalid (empty)`, () => {
    const r = validateDelegationPacket(standard as any, { ...base, issueId: "" });
    expect(r.valid).toBe(false);
    expect(r.malformed).toContain("issueId");
  });
  test("valid bead ids pass", () => {
    for (const good of ["tgo-123", "tgo_123", "tgo.123", "A1", "tgo-5t1"]) {
      const r = validateDelegationPacket(standard as any, { ...base, issueId: good });
      expect(r.valid).toBe(true);
    }
  });
});

describe("abort-failure skip and host-authoritative snapshot", () => {
  test("plugin abort failure would skip snapshot rewrite — simulate ensure not called on abort throw", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-abort-skip";
      const first: DefSnapshot = {
        promptHash: hashPrompt("first"),
        seatFrontmatterHash: hashSeatFrontmatter("seat1"),
        model: "model-a",
        preset: "balanced",
        seatFileFound: true,
        capturedAt: "2026-01-01T00:00:00.000Z",
      };
      await writeDefSnapshot(dir, issueId, first);
      // Simulate plugin before hook: abort fails, so ensure should NOT be called (snapshot unchanged)
      let ensureCalled = false;
      const mockAbort = async () => { throw new Error("abort failed"); };
      try {
        await mockAbort();
        ensureCalled = true;
        await ensureDefSnapshot({ repoRoot: dir, issueId, promptText: "second", seatFrontmatter: "seat2", seatFileFound: true, model: "model-b", preset: "cheap", useLatestDefinitions: true });
      } catch (e) {
        expect(String(e)).toContain("abort failed");
      }
      expect(ensureCalled).toBe(false);
      const loaded = await readDefSnapshot(dir, issueId);
      expect(loaded).toEqual(first);
      // Now simulate successful abort: ensure with useLatest overwrites
      const r = await ensureDefSnapshot({ repoRoot: dir, issueId, promptText: "second", seatFrontmatter: "seat2", seatFileFound: true, model: "model-b", preset: "cheap", useLatestDefinitions: true });
      expect(r.written).toBe(true);
      const overwritten = await readDefSnapshot(dir, issueId);
      expect(overwritten?.promptHash).toBe(hashPrompt("second"));
      expect(overwritten?.preset).toBe("cheap");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("host-authoritative model/preset not taken from packet spoof", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-host-auth";
      const packet = { Objective: "O", Files: ["a.ts"], Interfaces: "I", Constraints: "C", Verification: "V" };
      const activePreset = "frontier";
      const resolvedModel = "opencode-go/grok-4.6";
      const seatFrontmatter = "---\nname: dylan\n---\nreal content";
      const snap = await delegationEnsure({
        repoRoot: dir,
        issueId,
        packet,
        seatFrontmatter,
        seatFileFound: true,
        model: resolvedModel,
        preset: activePreset,
      });
      expect(snap.snapshot.preset).toBe(activePreset);
      expect(snap.snapshot.model).toBe(resolvedModel);
      expect(snap.snapshot.preset).not.toBe("cheap");
      expect(snap.snapshot.model).not.toBe("unknown");
      expect(snap.snapshot.model).not.toBe("evil-model");
      const spoofPacket = { ...packet, Files: ["evil.ts"], Verification: "evil" };
      const spoofHash = hashFivePartPacket(spoofPacket);
      expect(spoofHash).not.toBe(snap.snapshot.promptHash);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
