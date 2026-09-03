import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {
  awaitJsonPath,
  writeAwaitJson,
  readAwaitJson,
  clearAwaitJson,
  validateAgainstSchema,
  getRequiredFields,
  formatSuspendBadge,
  suspend,
  tryProseResume,
  parseProseReply,
  listAllAwaits,
  isExpired,
  scanExpiredAwaits,
  getBoardBadgeForIssue,
  __setSuspendWriteDelayForTest,
  __clearSuspendWriteDelayForTest,
  STYLE_VALUES,
  styleQuestionSuspendSchema,
  styleQuestionResumeSchema,
  validateStyleQuestionPayload,
  validateStyleAnswerPayload,
  suspendStyleQuestion,
  tryStyleQuestionResume,
} from "../src/suspend";
import type { JsonSchema, AwaitRecord } from "../src/suspend";
import { readProgress, updateProgress } from "../src/progress";
import { buildBoardTextWithHints } from "../src/board";
import { WatchdogController, type WatchdogConfig } from "../src/watchdog";

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "tgo-suspend-"));
}

function makeSchema(): JsonSchema {
  return {
    type: "object",
    properties: {
      decision: { type: "string", enum: ["approve", "reject"] },
      reason: { type: "string" },
    },
    required: ["decision", "reason"],
  };
}

describe("suspend schema validator", () => {
  test("validates type/required/enum/pattern", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        name: { type: "string", pattern: "^[a-z]+$" },
        age: { type: "number" },
        active: { type: "boolean" },
      },
      required: ["name"],
    };
    expect(validateAgainstSchema({ name: "alice", age: 30 }, schema).valid).toBe(true);
    expect(validateAgainstSchema({ age: 30 }, schema).valid).toBe(false);
    expect(validateAgainstSchema({ name: "Alice" }, schema).valid).toBe(false); // pattern
    expect(validateAgainstSchema({ name: "alice", extra: "ok" }, schema).valid).toBe(true);
  });

  test("enum and nested", () => {
    const schema = makeSchema();
    expect(validateAgainstSchema({ decision: "approve", reason: "ok" }, schema).valid).toBe(true);
    expect(validateAgainstSchema({ decision: "maybe", reason: "ok" }, schema).valid).toBe(false);
    expect(validateAgainstSchema({ decision: "approve" }, schema).valid).toBe(false);
  });

  test("array and pattern", () => {
    const schema: JsonSchema = {
      type: "array",
      items: { type: "string", pattern: "^tgo-" },
    };
    expect(validateAgainstSchema(["tgo-1", "tgo-2"], schema).valid).toBe(true);
    expect(validateAgainstSchema(["bad"], schema).valid).toBe(false);
  });
});

describe("await.json atomic I/O", () => {
  test("writeAwaitJson is write-once via tmp+link", async () => {
    const dir = tmpDir();
    try {
      const rec: AwaitRecord = {
        issueId: "tgo-s1",
        suspendSchema: { type: "object", properties: { q: { type: "string" } } },
        suspendPayload: { q: "what?" },
        resumeSchema: makeSchema(),
        reason: "need decision",
        createdAt: new Date().toISOString(),
      };
      expect(await writeAwaitJson(dir, "tgo-s1", rec)).toBe(true);
      expect(await writeAwaitJson(dir, "tgo-s1", { ...rec, reason: "second" })).toBe(false);
      const loaded = await readAwaitJson(dir, "tgo-s1");
      expect(loaded?.reason).toBe("need decision");
      // no tmp left
      const files = await fs.readdir(path.join(dir, ".tgo", "tgo-s1"));
      expect(files.some((f) => f.includes(".tmp"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("path validation rejects traversal", async () => {
    const dir = tmpDir();
    try {
      const rec: AwaitRecord = {
        issueId: "../../evil",
        suspendSchema: { type: "string" },
        suspendPayload: {},
        resumeSchema: { type: "string" },
        reason: "x",
        createdAt: new Date().toISOString(),
      };
      await expect(writeAwaitJson(dir, "../../evil", rec)).rejects.toThrow(/VALID_BEAD_ID/);
      await expect(readAwaitJson(dir, "../../evil")).rejects.toThrow(/VALID_BEAD_ID/);
      await expect(clearAwaitJson(dir, "../../evil")).rejects.toThrow(/VALID_BEAD_ID/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("concurrent write convergence", async () => {
    const dir = tmpDir();
    try {
      __setSuspendWriteDelayForTest(100);
      const issueId = "tgo-conc";
      const promises = Array.from({ length: 8 }, (_, i) =>
        writeAwaitJson(dir, issueId, {
          issueId,
          suspendSchema: { type: "string" },
          suspendPayload: { i },
          resumeSchema: { type: "string" },
          reason: `reason-${i}`,
          createdAt: new Date().toISOString(),
        })
      );
      const results = await Promise.all(promises);
      expect(results.filter((r) => r).length).toBe(1);
      const loaded = await readAwaitJson(dir, issueId);
      expect(loaded).toBeDefined();
    } finally {
      __clearSuspendWriteDelayForTest();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("suspend → progress blocker", () => {
  test("suspend writes await.json and appends progress blocker", async () => {
    const dir = tmpDir();
    try {
      const resumed = await suspend({
        repoRoot: dir,
        issueId: "tgo-p1",
        suspendSchema: { type: "object", properties: { q: { type: "string" } } },
        suspendPayload: { q: "choose" },
        resumeSchema: makeSchema(),
        reason: "needs human approval",
      });
      expect(resumed.written).toBe(true);
      const rec = await readAwaitJson(dir, "tgo-p1");
      expect(rec?.reason).toBe("needs human approval");
      const prog = await readProgress(dir, "tgo-p1");
      expect(prog).toContain("⏸ awaiting human: needs human approval — reply with: decision, reason");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("prose resume", () => {
  test("suspend→restart→prose-resume round-trip: file survives restart, valid prose wakes", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-rt";
      await suspend({
        repoRoot: dir,
        issueId,
        suspendSchema: { type: "object", properties: { prompt: { type: "string" } } },
        suspendPayload: { prompt: "approve?" },
        resumeSchema: makeSchema(),
        reason: "awaiting decision",
        sessionId: "ses_ABC123",
      });
      // Simulate restart: read file in new instance
      const afterRestart = await readAwaitJson(dir, issueId);
      expect(afterRestart).toBeDefined();
      expect(afterRestart?.reason).toBe("awaiting decision");

      // Valid prose resume: JSON string matching resumeSchema
      const validReply = JSON.stringify({ decision: "approve", reason: "looks good" });
      const result = await tryProseResume({ repoRoot: dir, issueId, rawReply: validReply });
      expect(result.success).toBe(true);
      expect(await readAwaitJson(dir, issueId)).toBeUndefined();
      const progAfter = await readProgress(dir, issueId);
      // blocker removed
      if (progAfter) expect(progAfter).not.toContain("⏸ awaiting human");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("invalid resume rejected without waking: file stays, blocker preserved", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-inv";
      await suspend({
        repoRoot: dir,
        issueId,
        suspendSchema: { type: "object", properties: { q: { type: "string" } } },
        suspendPayload: {},
        resumeSchema: makeSchema(),
        reason: "need fields",
      });
      // Invalid: missing required field, wrong enum
      const badReply = JSON.stringify({ decision: "maybe", reason: "ok" });
      const result = await tryProseResume({ repoRoot: dir, issueId, rawReply: badReply });
      expect(result.success).toBe(false);
      expect(result.errors?.join(" ")).toContain("must be one of");
      // File stays suspended
      expect(await readAwaitJson(dir, issueId)).toBeDefined();
      const prog = await readProgress(dir, issueId);
      expect(prog).toContain("⏸ awaiting human: need fields");
      // Second invalid: missing reason
      const bad2 = JSON.stringify({ decision: "approve" });
      const r2 = await tryProseResume({ repoRoot: dir, issueId, rawReply: bad2 });
      expect(r2.success).toBe(false);
      expect(r2.errors?.join(" ")).toContain("required");
      expect(await readAwaitJson(dir, issueId)).toBeDefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("parseProseReply handles JSON and raw text", () => {
    expect(parseProseReply('{"decision":"approve","reason":"ok"}')).toEqual({ decision: "approve", reason: "ok" });
    expect(parseProseReply("plain text")).toBe("plain text");
    // embedded JSON extraction
    expect(parseProseReply('here is {"decision":"reject","reason":"no"} please')).toEqual({ decision: "reject", reason: "no" });
  });

  test("atomicity: concurrent resume attempts converge", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-atom";
      await suspend({
        repoRoot: dir,
        issueId,
        suspendSchema: { type: "string" },
        suspendPayload: "concurrent-payload",
        resumeSchema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] },
        reason: "concurrent test",
      });
      const valid = JSON.stringify({ ok: true });
      const promises = Array.from({ length: 6 }, () => tryProseResume({ repoRoot: dir, issueId, rawReply: valid }));
      const results = await Promise.all(promises);
      const successes = results.filter((r) => r.success).length;
      expect(successes).toBe(1);
      const failures = results.filter((r) => !r.success);
      // remaining should be already resumed
      expect(failures.length).toBe(5);
      expect(await readAwaitJson(dir, issueId)).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("board hint renders required fields", () => {
  test("board badge derived from resumeSchema required fields", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-board";
      await suspend({
        repoRoot: dir,
        issueId,
        suspendSchema: { type: "object", properties: { q: { type: "string" } } },
        suspendPayload: {},
        resumeSchema: {
          type: "object",
          properties: {
            choice: { type: "string" },
            comment: { type: "string" },
          },
          required: ["choice", "comment"],
        },
        reason: "needs input",
      });
      const text = await buildBoardTextWithHints(
        { inProgress: [{ id: issueId, title: "Do work", priority: 1 }], ready: [], blocked: [], memories: [], streaming: [] },
        undefined,
        undefined,
        6,
        dir
      );
      expect(text).toContain("⏸ awaiting human: needs input — reply with: choice, comment");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("board badge via getBoardBadgeForIssue", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-bbadge";
      await suspend({
        repoRoot: dir,
        issueId,
        suspendSchema: { type: "string" },
        suspendPayload: "confirm-payload",
        resumeSchema: { type: "string", pattern: "^(yes|no)$" },
        reason: "confirm",
      });
      const badge = await getBoardBadgeForIssue(dir, issueId);
      expect(badge).toContain("⏸ awaiting human: confirm — reply with: string");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("board does not show badge when not suspended", async () => {
    const dir = tmpDir();
    try {
      const text = await buildBoardTextWithHints(
        { inProgress: [{ id: "tgo-none", title: "Work", priority: 1 }], ready: [], blocked: [], memories: [], streaming: [] },
        undefined,
        undefined,
        6,
        dir
      );
      expect(text).not.toContain("⏸ awaiting human");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("watchdog suspended-exclusion", () => {
  function makeConfig(overrides: Partial<WatchdogConfig> = {}): WatchdogConfig {
    return {
      enabled: true,
      wallClockMs: 50,
      idleMs: 30,
      checkMs: 10,
      stuckLoopTools: 20,
      stuckLoopMs: 5 * 60_000,
      ...overrides,
    };
  }
  test("suspended session excluded from idle/stuck aborts", async () => {
    const aborts: string[] = [];
    const wd = new WatchdogController(makeConfig({ wallClockMs: 60_000, idleMs: 30, checkMs: 10 }), {
      log: () => {},
      abort: async (sid) => aborts.push(sid),
      notifyParent: async () => {},
    });
    wd.noteSessionCreated({ id: "s-susp", parentID: "p" });
    wd.noteStatus("s-susp", "busy");
    wd.markSuspended("s-susp");
    await new Promise((r) => setTimeout(r, 40));
    await wd.check();
    expect(aborts).toEqual([]);
    // after resume, should abort
    wd.markResumed("s-susp");
    await new Promise((r) => setTimeout(r, 40));
    await wd.check();
    expect(aborts).toEqual(["s-susp"]);
    wd.dispose();
  });

  test("suspended also excluded from wall-clock", async () => {
    const aborts: string[] = [];
    const wd = new WatchdogController(makeConfig({ wallClockMs: 20, idleMs: 60000, checkMs: 10 }), {
      log: () => {},
      abort: async (sid) => aborts.push(sid),
      notifyParent: async () => {},
    });
    wd.noteSessionCreated({ id: "s-wall", parentID: "p" });
    wd.noteStatus("s-wall", "busy");
    wd.markSuspended("s-wall");
    await new Promise((r) => setTimeout(r, 40));
    await wd.check();
    expect(aborts).toEqual([]);
    wd.dispose();
  });

  test("hydrateSuspended hydrates from await scan", async () => {
    const aborts: string[] = [];
    const wd = new WatchdogController(makeConfig({ wallClockMs: 20, idleMs: 60000, checkMs: 10 }), {
      log: () => {},
      abort: async (sid) => aborts.push(sid),
      notifyParent: async () => {},
    });
    wd.hydrateSuspended(["s-hyd"]);
    wd.noteSessionCreated({ id: "s-hyd", parentID: "p" });
    wd.noteStatus("s-hyd", "busy");
    expect(wd.isSuspended("s-hyd")).toBe(true);
    await new Promise((r) => setTimeout(r, 30));
    await wd.check();
    expect(aborts).toEqual([]);
    wd.dispose();
  });

  test("onCompact clears suspended", () => {
    const wd = new WatchdogController(makeConfig(), {
      log: () => {},
      abort: async () => {},
      notifyParent: async () => {},
    });
    wd.markSuspended("s1");
    expect(wd.isSuspended("s1")).toBe(true);
    wd.onCompact("s1");
    expect(wd.isSuspended("s1")).toBe(false);
    wd.dispose();
  });
});

describe("timer catch-up", () => {
  test("scanExpiredAwaits surfaces expired until on next load", async () => {
    const dir = tmpDir();
    try {
      const now = Date.now();
      const past = new Date(now - 60_000).toISOString();
      const future = new Date(now + 60_000).toISOString();
      await suspend({
        repoRoot: dir,
        issueId: "tgo-exp",
        suspendSchema: { type: "string" },
        suspendPayload: "exp-payload",
        resumeSchema: { type: "string" },
        reason: "timer wait",
        until: past,
      });
      await suspend({
        repoRoot: dir,
        issueId: "tgo-fut",
        suspendSchema: { type: "string" },
        suspendPayload: "fut-payload",
        resumeSchema: { type: "string" },
        reason: "future",
        until: future,
      });
      const logs: Array<{ level: string; message: string }> = [];
      const expired = await scanExpiredAwaits(dir, (lvl, msg) => logs.push({ level: lvl, message: msg }), now);
      expect(expired.length).toBe(1);
      expect(expired[0]?.issueId).toBe("tgo-exp");
      expect(logs.some((l) => l.message.includes("tgo-exp"))).toBe(true);
      expect(logs.some((l) => l.message.includes("tgo-fut"))).toBe(false);
      // board badge for expired includes note
      const badge = await getBoardBadgeForIssue(dir, "tgo-exp");
      expect(badge).toContain("timer expired");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("isExpired handles missing/invalid until", () => {
    expect(isExpired({ issueId: "x", suspendSchema: {}, suspendPayload: {}, resumeSchema: {}, reason: "r", createdAt: new Date().toISOString() } as AwaitRecord)).toBe(false);
    expect(isExpired({ issueId: "x", suspendSchema: {}, suspendPayload: {}, resumeSchema: {}, reason: "r", createdAt: new Date().toISOString(), until: "not-a-date" } as AwaitRecord)).toBe(false);
  });

  test("listAllAwaits survives restart", async () => {
    const dir = tmpDir();
    try {
      await suspend({
        repoRoot: dir,
        issueId: "tgo-list",
        suspendSchema: { type: "string" },
        suspendPayload: "list-payload",
        resumeSchema: { type: "string" },
        reason: "list test",
      });
      const all = await listAllAwaits(dir);
      expect(all.length).toBe(1);
      expect(all[0]?.issueId).toBe("tgo-list");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("format badge helpers", () => {
  test("getRequiredFields and formatSuspendBadge", () => {
    const schema: JsonSchema = { type: "object", properties: { a: { type: "string" }, b: { type: "string" } }, required: ["a"] };
    expect(getRequiredFields(schema)).toEqual(["a"]);
    const rec: AwaitRecord = {
      issueId: "tgo-x",
      suspendSchema: { type: "string" },
      suspendPayload: {},
      resumeSchema: schema,
      reason: "need a",
      createdAt: new Date().toISOString(),
    };
    expect(formatSuspendBadge(rec)).toBe("⏸ awaiting human: need a — reply with: a");
  });
});

describe("style question schema round-trip (T4)", () => {
  test("validates style question payload and answer schemas", () => {
    for (const style of STYLE_VALUES) {
      expect(validateStyleQuestionPayload({ style, reason: "ambiguous task shape" }).valid).toBe(true);
      expect(validateStyleAnswerPayload({ style }).valid).toBe(true);
    }
    expect(validateStyleQuestionPayload({ style: "invalid", reason: "x" }).valid).toBe(false);
    expect(validateStyleQuestionPayload({ style: "prose" }).valid).toBe(false); // missing reason
    expect(validateStyleAnswerPayload({ style: "invalid" }).valid).toBe(false);
    expect(validateStyleAnswerPayload({}).valid).toBe(false);
    // suspend/resume schemas themselves validate via validateAgainstSchema
    expect(validateAgainstSchema({ style: "prose", reason: "why" }, styleQuestionSuspendSchema).valid).toBe(true);
    expect(validateAgainstSchema({ style: "conversational" }, styleQuestionResumeSchema).valid).toBe(true);
    expect(validateAgainstSchema({ style: "default", reason: "r" }, styleQuestionSuspendSchema).valid).toBe(true);
  });

  test("suspendStyleQuestion → tryStyleQuestionResume round-trip via file durable gate (suspend + tryProseResume)", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-styleq";
      const res = await suspendStyleQuestion({
        repoRoot: dir,
        issueId,
        style: "prose",
        reason: "ambiguous style — need user choice",
      });
      expect(res.written).toBe(true);
      const rec = await readAwaitJson(dir, issueId);
      expect(rec).toBeDefined();
      expect(rec?.suspendPayload).toMatchObject({ style: "prose", reason: "ambiguous style — need user choice" });
      expect(validateAgainstSchema(rec!.suspendPayload, styleQuestionSuspendSchema).valid).toBe(true);
      expect(validateAgainstSchema({ style: "prose" }, rec!.resumeSchema).valid).toBe(true);
      // resume via typed helper (wraps tryProseResume, no new durability)
      const ok = await tryStyleQuestionResume({ repoRoot: dir, issueId, rawReply: JSON.stringify({ style: "conversational" }) });
      expect(ok.success).toBe(true);
      expect(await readAwaitJson(dir, issueId)).toBeUndefined();
      // also verify generic suspend with same schemas works (orchestrator-facing, T5 wires usage)
      const res2 = await suspend({
        repoRoot: dir,
        issueId: "tgo-styleq2",
        suspendSchema: styleQuestionSuspendSchema,
        suspendPayload: { style: "default", reason: "fallback" },
        resumeSchema: styleQuestionResumeSchema,
        reason: "fallback question",
      });
      expect(res2.written).toBe(true);
      const resume2 = await tryProseResume({ repoRoot: dir, issueId: "tgo-styleq2", rawReply: JSON.stringify({ style: "default" }) });
      expect(resume2.success).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("invalid style answer rejected via resume schema, file stays suspended", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-style-bad";
      await suspendStyleQuestion({ repoRoot: dir, issueId, style: "prose", reason: "need choice" });
      const bad = await tryStyleQuestionResume({ repoRoot: dir, issueId, rawReply: JSON.stringify({ style: "invalid" }) });
      expect(bad.success).toBe(false);
      expect(bad.errors?.join(" ")).toContain("must be one of");
      expect(await readAwaitJson(dir, issueId)).toBeDefined();
      const bad2 = await tryStyleQuestionResume({ repoRoot: dir, issueId, rawReply: JSON.stringify({}) });
      expect(bad2.success).toBe(false);
      expect(await readAwaitJson(dir, issueId)).toBeDefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
