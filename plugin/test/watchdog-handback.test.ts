import { test, expect, describe } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { loadSessionMap, saveSessionMap } from "../src/session-reuse";
import { persistAbortHandback } from "../src/session-reuse";
import { readProgress, parseProgress, writeProgress, formatProgress } from "../src/progress";

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "tgo-handback-"));
}

describe("watchdog handback tgo-ywp", () => {
  test("sessionID present in map → progress file gains exactly one blocker line containing the reason and session id", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-ywp-a";
      const sid = "ses_abc123";
      await saveSessionMap(dir, {
        [issueId]: { sessionId: sid, updatedAt: new Date().toISOString() },
      });
      // ensure no pre-existing progress
      const before = await readProgress(dir, issueId);
      expect(before).toBeUndefined();

      const logs: Array<{ level: string; message: string }> = [];
      const log = (level: "info" | "warn" | "error", message: string) => {
        logs.push({ level, message });
      };

      await persistAbortHandback({ repoRoot: dir, sessionID: sid, reason: "wall-clock", log: log as any });

      const after = await readProgress(dir, issueId);
      expect(after).toBeDefined();
      const parts = parseProgress(after!);
      expect(parts.blockers.length).toBe(1);
      const blocker = parts.blockers[0]!;
      expect(blocker).toContain("wall-clock");
      expect(blocker).toContain(sid);
      expect(blocker).toContain("watchdog abort");
      expect(blocker).toContain("re-dispatch may reuse its task_id");
      // warn should not be logged on success
      expect(logs.some((l) => l.message.includes("progress handback failed"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("sessionID not in map → no progress write", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-ywp-b";
      const sid = "ses_abc123";
      await saveSessionMap(dir, {
        [issueId]: { sessionId: sid, updatedAt: new Date().toISOString() },
      });
      const logs: Array<{ level: string; message: string }> = [];
      const log = (level: "info" | "warn" | "error", message: string) => {
        logs.push({ level, message });
      };

      await persistAbortHandback({ repoRoot: dir, sessionID: "ses_unknown999", reason: "idle", log: log as any });

      const afterExisting = await readProgress(dir, issueId);
      expect(afterExisting).toBeUndefined();
      const unknownProgress = await readProgress(dir, "tgo-unknown");
      expect(unknownProgress).toBeUndefined();
      expect(logs.some((l) => l.message.includes("progress handback failed"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("readProgress/writeProgress failure (unwritable repoRoot) → callback resolves, warn logged via log spy", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-ywp-c";
      const sid = "ses_abc123";
      await saveSessionMap(dir, {
        [issueId]: { sessionId: sid, updatedAt: new Date().toISOString() },
      });
      // collide issue dir with a file so writeProgress fails
      const collidingPath = path.join(dir, ".tgo", issueId);
      // remove any existing directory that saveSessionMap may have created at .tgo level? No, .tgo/issueId not yet created.
      // Ensure parent exists, then create file at issueId path
      await fs.mkdir(path.join(dir, ".tgo"), { recursive: true });
      // If a directory already exists at collidingPath (unlikely), remove it first
      try {
        await fs.rm(collidingPath, { recursive: true, force: true });
      } catch {}
      await fs.writeFile(collidingPath, "file not dir", "utf-8");

      const logs: Array<{ level: string; message: string }> = [];
      const log = (level: "info" | "warn" | "error", message: string) => {
        logs.push({ level, message });
      };

      await expect(persistAbortHandback({ repoRoot: dir, sessionID: sid, reason: "idle", log: log as any })).resolves.toBeUndefined();

      expect(logs.some((l) => l.level === "warn" && l.message.includes("progress handback failed"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("existing progress preserved and appended (exactly one new blocker)", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-ywp-d";
      const sid = "ses_abc123";
      await saveSessionMap(dir, {
        [issueId]: { sessionId: sid, updatedAt: new Date().toISOString() },
      });
      const initial = formatProgress({
        objective: "Do work",
        touchSet: ["src/a.ts"],
        decisions: ["use X"],
        blockers: ["existing blocker"],
        lastStatus: "in progress",
      });
      const ok = await writeProgress(dir, issueId, initial);
      expect(ok).toBe(true);

      await persistAbortHandback({ repoRoot: dir, sessionID: sid, reason: "stuck-loop", log: (() => {}) as any });

      const after = await readProgress(dir, issueId);
      expect(after).toBeDefined();
      const parts = parseProgress(after!);
      expect(parts.blockers.length).toBe(2);
      expect(parts.blockers[0]).toBe("existing blocker");
      expect(parts.blockers[1]).toContain("stuck-loop");
      expect(parts.blockers[1]).toContain(sid);
      // preserve other fields
      expect(parts.objective).toBe("Do work");
      expect(parts.touchSet).toEqual(["src/a.ts"]);
      expect(parts.decisions).toEqual(["use X"]);
      expect(parts.lastStatus).toBe("in progress");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("map miss + fallback hit via fetchSessionMessages → progress blocker appended and map entry created", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-ywp-e";
      const sid = "ses_fallback123";
      await saveSessionMap(dir, {});
      const delegationText = `delegation packet for testing: {"issueId": "${issueId}", "delegationId": "del_1"} — please proceed`;
      const logs: Array<{ level: string; message: string }> = [];
      const log = (level: "info" | "warn" | "error", message: string) => {
        logs.push({ level, message });
      };
      const fetchSessionMessages = async (sessionID: string) => {
        expect(sessionID).toBe(sid);
        return [{ parts: [{ type: "text", text: delegationText }] }];
      };
      await persistAbortHandback({
        repoRoot: dir,
        sessionID: sid,
        reason: "idle",
        log: log as any,
        fetchSessionMessages: fetchSessionMessages as any,
      });
      const after = await readProgress(dir, issueId);
      expect(after).toBeDefined();
      const parts = parseProgress(after!);
      expect(parts.blockers.length).toBe(1);
      expect(parts.blockers[0]).toContain("idle");
      expect(parts.blockers[0]).toContain(sid);
      expect(parts.blockers[0]).toContain("watchdog abort");
      const map = await loadSessionMap(dir);
      expect(map[issueId]).toBeDefined();
      expect(map[issueId]!.sessionId).toBe(sid);
      expect(logs.some((l) => l.message.includes("progress handback failed"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("map miss + fetchSessionMessages returns undefined → no progress write, no throw, warn logged", async () => {
    const dir = tmpDir();
    try {
      const sid = "ses_unknown777";
      await saveSessionMap(dir, {});
      const logs: Array<{ level: string; message: string }> = [];
      const log = (level: "info" | "warn" | "error", message: string) => {
        logs.push({ level, message });
      };
      const fetchSessionMessages = async (_sessionID: string) => undefined as any;
      await expect(
        persistAbortHandback({
          repoRoot: dir,
          sessionID: sid,
          reason: "wall-clock",
          log: log as any,
          fetchSessionMessages: fetchSessionMessages as any,
        }),
      ).resolves.toBeUndefined();
      const map = await loadSessionMap(dir);
      expect(Object.keys(map).length).toBe(0);
      const stray = await readProgress(dir, "tgo-ywp-e");
      expect(stray).toBeUndefined();
      expect(logs.some((l) => l.level === "warn" && l.message.includes("progress handback failed"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("unknown-section preservation: Notes kept, old blocker kept, new blocker appended (map hit path)", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-ywp-f";
      const sid = "ses_notes123";
      await saveSessionMap(dir, {
        [issueId]: { sessionId: sid, updatedAt: new Date().toISOString() },
      });
      const initial = formatProgress({
        objective: "Seeded objective",
        touchSet: [],
        decisions: [],
        blockers: ["existing blocker"],
        lastStatus: "in progress",
        extra: { Notes: ["keep me", "second note"] },
      });
      const ok = await writeProgress(dir, issueId, initial);
      expect(ok).toBe(true);
      const logs: Array<{ level: string; message: string }> = [];
      const log = (level: "info" | "warn" | "error", message: string) => {
        logs.push({ level, message });
      };
      await persistAbortHandback({ repoRoot: dir, sessionID: sid, reason: "stuck-loop", log: log as any });
      const after = await readProgress(dir, issueId);
      expect(after).toBeDefined();
      const parts = parseProgress(after!);
      expect(parts.blockers.length).toBe(2);
      expect(parts.blockers[0]).toBe("existing blocker");
      expect(parts.blockers[1]).toContain("stuck-loop");
      expect(parts.blockers[1]).toContain(sid);
      expect(parts.extra["Notes"]).toBeDefined();
      expect(parts.extra["Notes"]).toEqual(["keep me", "second note"]);
      expect(logs.some((l) => l.message.includes("progress handback failed"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
