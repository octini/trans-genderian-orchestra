import { test, expect, describe } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { captureDelegationSession, loadSessionMap } from "../src/session-reuse";
import { BoardController, buildBoardTextWithHints, createShim } from "../src/board";
import { validateDelegationPacket } from "../src/delegation";

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "tgo-int-"));
}

describe("captureDelegationSession integration", () => {
  test("foreground task with valid packet + metadata.sessionId → entry stored", async () => {
    const dir = tmpDir();
    try {
      await captureDelegationSession({
        tool: "task",
        input: { args: { delegationPacket: { issueId: "tgo-1pv-a", delegationId: "del-a" } } },
        output: { output: "done", metadata: { sessionId: "ses_abc123" } },
        repoRoot: dir,
        enabled: true,
      });
      const loaded = await loadSessionMap(dir);
      expect(loaded["tgo-1pv-a"]?.sessionId).toBe("ses_abc123");
      expect(loaded["tgo-1pv-a"]?.delegationId).toBe("del-a");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("foreground task with regex-extracted sessionId → entry stored", async () => {
    const dir = tmpDir();
    try {
      await captureDelegationSession({
        tool: "task",
        input: { args: { delegationPacket: { issueId: "tgo-1pv-a2", delegationId: "del-a2" } } },
        output: { output: "output contains ses_xyz999 somewhere" },
        repoRoot: dir,
        enabled: true,
      });
      const loaded = await loadSessionMap(dir);
      expect(loaded["tgo-1pv-a2"]?.sessionId).toBe("ses_xyz999");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("background output (Background task started) → no entry", async () => {
    const dir = tmpDir();
    try {
      await captureDelegationSession({
        tool: "task",
        input: { args: { delegationPacket: { issueId: "tgo-1pv-b", delegationId: "del-b" } } },
        output: { output: "Background task started: ses_abc123", metadata: { sessionId: "ses_abc123" } },
        repoRoot: dir,
        enabled: true,
      });
      const loaded = await loadSessionMap(dir);
      expect(loaded["tgo-1pv-b"]).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("missing/unparseable sessionId → no entry", async () => {
    const dir = tmpDir();
    try {
      await captureDelegationSession({
        tool: "task",
        input: { args: { delegationPacket: { issueId: "tgo-1pv-c" } } },
        output: { output: "no session here" },
        repoRoot: dir,
        enabled: true,
      });
      const loaded = await loadSessionMap(dir);
      expect(loaded["tgo-1pv-c"]).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    const dir2 = tmpDir();
    try {
      await captureDelegationSession({
        tool: "task",
        input: { args: { delegationPacket: { issueId: "tgo-1pv-c2" } } },
        output: { output: "also no id", metadata: {} },
        repoRoot: dir2,
        enabled: true,
      });
      const loaded = await loadSessionMap(dir2);
      expect(loaded["tgo-1pv-c2"]).toBeUndefined();
    } finally {
      rmSync(dir2, { recursive: true, force: true });
    }
  });

  test("sessionId failing /^ses_[A-Za-z0-9]+$/ → no entry", async () => {
    const dir = tmpDir();
    try {
      await captureDelegationSession({
        tool: "task",
        input: { args: { delegationPacket: { issueId: "tgo-1pv-d" } } },
        output: { output: "done", metadata: { sessionId: "bad_id" } },
        repoRoot: dir,
        enabled: true,
      });
      let loaded = await loadSessionMap(dir);
      expect(loaded["tgo-1pv-d"]).toBeUndefined();
      // also test ses_ with trailing dash / invalid char via metadata
      await captureDelegationSession({
        tool: "task",
        input: { args: { delegationPacket: { issueId: "tgo-1pv-d2" } } },
        output: { output: "done", metadata: { sessionId: "ses-" } },
        repoRoot: dir,
        enabled: true,
      });
      loaded = await loadSessionMap(dir);
      expect(loaded["tgo-1pv-d2"]).toBeUndefined();
      // ses_ alone also invalid (regex requires at least one alphanum after)
      await captureDelegationSession({
        tool: "task",
        input: { args: { delegationPacket: { issueId: "tgo-1pv-d3" } } },
        output: { output: "done", metadata: { sessionId: "ses_" } },
        repoRoot: dir,
        enabled: true,
      });
      loaded = await loadSessionMap(dir);
      expect(loaded["tgo-1pv-d3"]).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("tool !== task → no entry", async () => {
    const dir = tmpDir();
    try {
      await captureDelegationSession({
        tool: "bash",
        input: { args: { delegationPacket: { issueId: "tgo-1pv-e" } } },
        output: { output: "ses_abc123", metadata: { sessionId: "ses_abc123" } },
        repoRoot: dir,
        enabled: true,
      });
      const loaded = await loadSessionMap(dir);
      expect(loaded["tgo-1pv-e"]).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("enabled=false → no entry", async () => {
    const dir = tmpDir();
    try {
      await captureDelegationSession({
        tool: "task",
        input: { args: { delegationPacket: { issueId: "tgo-1pv-f" } } },
        output: { output: "done", metadata: { sessionId: "ses_abc123" } },
        repoRoot: dir,
        enabled: false,
      });
      const loaded = await loadSessionMap(dir);
      expect(loaded["tgo-1pv-f"]).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("throwing repoRoot (unwritable path) → resolves without throwing", async () => {
    const file = path.join(os.tmpdir(), `tgo-int-file-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await fs.writeFile(file, "x", "utf-8");
    try {
      await expect(
        captureDelegationSession({
          tool: "task",
          input: { args: { delegationPacket: { issueId: "tgo-throw", delegationId: "d1" } } },
          output: { output: "has ses_abc123", metadata: { sessionId: "ses_abc123" } },
          repoRoot: file,
          enabled: true,
        })
      ).resolves.toBeUndefined();
      // also ensure no throw when repoRoot is nonsense and output contains background
      await expect(
        captureDelegationSession({
          tool: "task",
          input: { args: { delegationPacket: { issueId: "tgo-throw2" } } },
          output: { output: "Background task started" },
          repoRoot: file,
          enabled: true,
        })
      ).resolves.toBeUndefined();
      // with log spy: warn is emitted and promise still resolves
      const calls: Array<{ level: string; message: string }> = [];
      const log = (level: "warn" | "info", message: string) => {
        calls.push({ level, message });
      };
      await expect(
        captureDelegationSession({
          tool: "task",
          input: { args: { delegationPacket: { issueId: "tgo-throw-log", delegationId: "d1" } } },
          output: { output: "has ses_abc123", metadata: { sessionId: "ses_abc123" } },
          repoRoot: file,
          enabled: true,
          log,
        })
      ).resolves.toBeUndefined();
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0]?.level).toBe("warn");
      expect(calls[0]?.message).toContain("session-reuse capture failed:");
    } finally {
      await fs.unlink(file).catch(() => {});
    }
  });
});

describe("board hint builder integration", () => {
  const HINT = (sid: string) => `reusable session ${sid} — pass task_id: "${sid}" on the next task call to continue it.`;

  function makeRunner(inProgress: Array<{ id: string; title: string; priority: number }>) {
    return async (cmd: string) => {
      if (cmd.includes("in_progress")) return JSON.stringify(inProgress);
      if (cmd.includes("bd ready")) return JSON.stringify([]);
      if (cmd.includes("bd blocked")) return JSON.stringify([]);
      if (cmd.includes("bd memories")) return JSON.stringify({});
      return "";
    };
  }

  test("in_progress issue + stored session + small estimate → hint line present exactly once", async () => {
    const dir = tmpDir();
    try {
      const sid = "ses_abc123";
      await fs.mkdir(path.join(dir, ".tgo"), { recursive: true });
      await fs.writeFile(path.join(dir, ".tgo", "sessions.json"), JSON.stringify({ "tgo-1": { sessionId: sid, updatedAt: new Date().toISOString() } }), "utf-8");
      const run = makeRunner([{ id: "tgo-1", title: "Test issue", priority: 1 }]);
      const client = {
        session: {
          messages: async () => [{ parts: [{ type: "text", text: "hello" }] }],
        },
      };
      const ctrl = new BoardController({
        run,
        refreshMs: 0,
        sessionReuse: { repoRoot: dir, client: client as any, maxContextTokens: 100000, supported: true, enabled: true },
      });
      // also test exported builder directly
      const built = await buildBoardTextWithHints(
        { inProgress: [{ id: "tgo-1", title: "Test issue", priority: 1 }], ready: [], blocked: [], memories: [], streaming: [] },
        new Set(["tgo-1"]),
        new Map([["tgo-1", sid]])
      );
      expect(built).toContain(HINT(sid));
      const countBuilt = (built.match(new RegExp(sid, "g")) ?? []).length;
      // builder uses sid twice (once in prefix, once in task_id) => appears twice total? Actually hint line contains sid twice
      // Verify hint line present exactly once
      const hintOccurrencesBuilt = (built.split(HINT(sid)).length - 1);
      expect(hintOccurrencesBuilt).toBe(1);

      const text = await ctrl.renderFor("sess-hint-a");
      expect(text).toContain(HINT(sid));
      const hintOccurrences = text ? text.split(HINT(sid)).length - 1 : 0;
      expect(hintOccurrences).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("estimate over maxContextTokens → absent", async () => {
    const dir = tmpDir();
    try {
      const sid = "ses_abc123";
      await fs.mkdir(path.join(dir, ".tgo"), { recursive: true });
      await fs.writeFile(path.join(dir, ".tgo", "sessions.json"), JSON.stringify({ "tgo-1": { sessionId: sid, updatedAt: new Date().toISOString() } }), "utf-8");
      const run = makeRunner([{ id: "tgo-1", title: "Test issue", priority: 1 }]);
      const largeText = Array.from({ length: 20 }, () => "word").join(" ");
      const client = {
        session: {
          messages: async () => [{ parts: [{ type: "text", text: largeText }] }],
        },
      };
      const ctrl = new BoardController({
        run,
        refreshMs: 0,
        sessionReuse: { repoRoot: dir, client: client as any, maxContextTokens: 5, supported: true, enabled: true },
      });
      const text = await ctrl.renderFor("sess-hint-b");
      expect(text).not.toContain(HINT(sid));
      expect(text).not.toContain("reusable session");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("client.session.messages rejects → absent, no throw", async () => {
    const dir = tmpDir();
    try {
      const sid = "ses_abc123";
      await fs.mkdir(path.join(dir, ".tgo"), { recursive: true });
      await fs.writeFile(path.join(dir, ".tgo", "sessions.json"), JSON.stringify({ "tgo-1": { sessionId: sid, updatedAt: new Date().toISOString() } }), "utf-8");
      const run = makeRunner([{ id: "tgo-1", title: "Test issue", priority: 1 }]);
      const client = {
        session: {
          messages: async () => { throw new Error("network fail"); },
        },
      };
      const ctrl = new BoardController({
        run,
        refreshMs: 0,
        sessionReuse: { repoRoot: dir, client: client as any, maxContextTokens: 100000, supported: true, enabled: true },
      });
      await expect(ctrl.renderFor("sess-hint-c")).resolves.toBeDefined();
      const text = await ctrl.renderFor("sess-hint-c2");
      expect(text).not.toContain(HINT(sid));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("sessionReuse disabled/unsupported deps → absent", async () => {
    const dir = tmpDir();
    try {
      const sid = "ses_abc123";
      await fs.mkdir(path.join(dir, ".tgo"), { recursive: true });
      await fs.writeFile(path.join(dir, ".tgo", "sessions.json"), JSON.stringify({ "tgo-1": { sessionId: sid, updatedAt: new Date().toISOString() } }), "utf-8");
      const run = makeRunner([{ id: "tgo-1", title: "Test issue", priority: 1 }]);
      const client = {
        session: {
          messages: async () => [{ parts: [{ type: "text", text: "hello" }] }],
        },
      };
      // disabled
      const ctrlDisabled = new BoardController({
        run,
        refreshMs: 0,
        sessionReuse: { repoRoot: dir, client: client as any, maxContextTokens: 100000, supported: true, enabled: false },
      });
      const textDisabled = await ctrlDisabled.renderFor("sess-hint-d1");
      expect(textDisabled).not.toContain(HINT(sid));
      // unsupported
      const ctrlUnsupported = new BoardController({
        run,
        refreshMs: 0,
        sessionReuse: { repoRoot: dir, client: client as any, maxContextTokens: 100000, supported: false, enabled: true },
      });
      const textUnsupported = await ctrlUnsupported.renderFor("sess-hint-d2");
      expect(textUnsupported).not.toContain(HINT(sid));
      // also no sessionReuse deps at all
      const ctrlNoDeps = new BoardController({ run, refreshMs: 0 });
      const textNoDeps = await ctrlNoDeps.renderFor("sess-hint-d3");
      expect(textNoDeps).not.toContain(HINT(sid));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("issue not in_progress → absent even with stored session", async () => {
    const dir = tmpDir();
    try {
      const sid = "ses_abc123";
      await fs.mkdir(path.join(dir, ".tgo"), { recursive: true });
      await fs.writeFile(path.join(dir, ".tgo", "sessions.json"), JSON.stringify({ "tgo-2": { sessionId: sid, updatedAt: new Date().toISOString() } }), "utf-8");
      // in_progress contains tgo-1, but session is for tgo-2
      const run = async (cmd: string) => {
        if (cmd.includes("in_progress")) return JSON.stringify([{ id: "tgo-1", title: "Other issue", priority: 1 }]);
        if (cmd.includes("bd ready")) return JSON.stringify([{ id: "tgo-2", title: "Ready issue", priority: 1 }]);
        if (cmd.includes("bd blocked")) return JSON.stringify([]);
        if (cmd.includes("bd memories")) return JSON.stringify({});
        return "";
      };
      const client = {
        session: {
          messages: async () => [{ parts: [{ type: "text", text: "hello" }] }],
        },
      };
      const ctrl = new BoardController({
        run,
        refreshMs: 0,
        sessionReuse: { repoRoot: dir, client: client as any, maxContextTokens: 100000, supported: true, enabled: true },
      });
      const text = await ctrl.renderFor("sess-hint-e");
      expect(text).not.toContain(HINT(sid));
      expect(text).not.toContain("reusable session");
      // also verify ready section doesn't get hint (hints only for in_progress)
      expect(text).toContain("tgo-1");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("progressPath validation", () => {
  const standard = { route: "standard", tiny: false, reasons: [] } as const;
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
  test('".tgo/tgo-123/progress.md" → valid', () => {
    const result = validateDelegationPacket(standard as any, { ...base, progressPath: ".tgo/tgo-123/progress.md" });
    expect(result.valid).toBe(true);
    expect(result.malformed).not.toContain("progressPath");
  });
  test('"progress.md", ".tgo//progress.md", "foo/bar.md" → each rejected', () => {
    for (const bad of ["progress.md", ".tgo//progress.md", "foo/bar.md"]) {
      const result = validateDelegationPacket(standard as any, { ...base, progressPath: bad });
      expect(result.valid).toBe(false);
      expect(result.malformed).toContain("progressPath");
      expect(result.diagnostics.join(" ")).toContain("progressPath must match");
    }
  });
  test("absent → valid", () => {
    const result = validateDelegationPacket(standard as any, { ...base });
    expect(result.valid).toBe(true);
    expect(result.malformed).not.toContain("progressPath");
  });
});

describe("board progress hint", () => {
  const HINT2 = (sid: string) => `reusable session ${sid} — pass task_id: "${sid}" on the next task call to continue it.`;
  function makeRunner2(inProgress: Array<{ id: string; title: string; priority: number }>) {
    return async (cmd: string) => {
      if (cmd.includes("in_progress")) return JSON.stringify(inProgress);
      if (cmd.includes("bd ready")) return JSON.stringify([]);
      if (cmd.includes("bd blocked")) return JSON.stringify([]);
      if (cmd.includes("bd memories")) return JSON.stringify({});
      return "";
    };
  }
  test("temp repoRoot seeded with .tgo/<issueId>/progress.md + stored session map entry + in_progress issue → output contains progress line", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-1";
      const sid = "ses_abc123";
      await fs.mkdir(path.join(dir, ".tgo", issueId), { recursive: true });
      await fs.writeFile(path.join(dir, ".tgo", issueId, "progress.md"), "# Progress\nhello", "utf-8");
      await fs.writeFile(path.join(dir, ".tgo", "sessions.json"), JSON.stringify({ [issueId]: { sessionId: sid, updatedAt: new Date().toISOString() } }), "utf-8");
      const run = makeRunner2([{ id: issueId, title: "Test issue", priority: 1 }]);
      const client = { session: { messages: async () => [{ parts: [{ type: "text", text: "hello" }] }] } };
      const ctrl = new BoardController({
        run,
        refreshMs: 0,
        sessionReuse: { repoRoot: dir, client: client as any, maxContextTokens: 100000, supported: true, enabled: true },
      });
      const text = await ctrl.renderFor("sess-progress-a");
      expect(text).toContain(`progress: .tgo/${issueId}/progress.md`);
      // also test standalone builder directly with repoRoot
      const built = await buildBoardTextWithHints(
        { inProgress: [{ id: issueId, title: "Test issue", priority: 1 }], ready: [], blocked: [], memories: [], streaming: [] },
        new Set([issueId]),
        new Map([[issueId, sid]]),
        6,
        dir
      );
      expect(built).toContain(`progress: .tgo/${issueId}/progress.md`);
      expect(built).toContain(HINT2(sid));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  test("same setup without the file → progress line absent (session hint may still appear)", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-1";
      const sid = "ses_abc123";
      await fs.mkdir(path.join(dir, ".tgo"), { recursive: true });
      await fs.writeFile(path.join(dir, ".tgo", "sessions.json"), JSON.stringify({ [issueId]: { sessionId: sid, updatedAt: new Date().toISOString() } }), "utf-8");
      const run = makeRunner2([{ id: issueId, title: "Test issue", priority: 1 }]);
      const client = { session: { messages: async () => [{ parts: [{ type: "text", text: "hello" }] }] } };
      const ctrl = new BoardController({
        run,
        refreshMs: 0,
        sessionReuse: { repoRoot: dir, client: client as any, maxContextTokens: 100000, supported: true, enabled: true },
      });
      const text = await ctrl.renderFor("sess-progress-b");
      expect(text).not.toContain(`progress: .tgo/${issueId}/progress.md`);
      expect(text).toContain(HINT2(sid));
      const built = await buildBoardTextWithHints(
        { inProgress: [{ id: issueId, title: "Test issue", priority: 1 }], ready: [], blocked: [], memories: [], streaming: [] },
        new Set([issueId]),
        new Map([[issueId, sid]]),
        6,
        dir
      );
      expect(built).not.toContain(`progress: .tgo/${issueId}/progress.md`);
      expect(built).toContain(HINT2(sid));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("board progress hint fail-closed", () => {
  test("repoRoot pointing at a file path (unreadable) → no progress line, no throw", async () => {
    const file = path.join(os.tmpdir(), `tgo-int-file-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await fs.writeFile(file, "x", "utf-8");
    try {
      const issueId = "tgo-1";
      const sid = "ses_abc123";
      // standalone should not throw and not contain progress line
      await expect(
        buildBoardTextWithHints(
          { inProgress: [{ id: issueId, title: "Test issue", priority: 1 }], ready: [], blocked: [], memories: [], streaming: [] },
          new Set([issueId]),
          new Map([[issueId, sid]]),
          6,
          file
        )
      ).resolves.toBeDefined();
      const built = await buildBoardTextWithHints(
        { inProgress: [{ id: issueId, title: "Test issue", priority: 1 }], ready: [], blocked: [], memories: [], streaming: [] },
        new Set([issueId]),
        new Map([[issueId, sid]]),
        6,
        file
      );
      expect(built).not.toContain(`progress: .tgo/${issueId}/progress.md`);
      expect(built).toContain(`reusable session ${sid}`);
      // controller with file repoRoot should also not throw and not contain progress line
      const run = async (cmd: string) => {
        if (cmd.includes("in_progress")) return JSON.stringify([{ id: issueId, title: "Test issue", priority: 1 }]);
        if (cmd.includes("bd ready")) return JSON.stringify([]);
        if (cmd.includes("bd blocked")) return JSON.stringify([]);
        if (cmd.includes("bd memories")) return JSON.stringify({});
        return "";
      };
      // need sessions.json but repoRoot is file, so loadSessionMap will fail gracefully (no throw)
      const client = { session: { messages: async () => [{ parts: [{ type: "text", text: "hello" }] }] } };
      const ctrl = new BoardController({
        run,
        refreshMs: 0,
        sessionReuse: { repoRoot: file, client: client as any, maxContextTokens: 100000, supported: true, enabled: true },
      });
      await expect(ctrl.renderFor("sess-fail-closed")).resolves.toBeDefined();
      const text = await ctrl.renderFor("sess-fail-closed2");
      // fail-closed: no progress line, no throw; session hint may be absent because session map unreadable, but must not throw
      expect(text).not.toContain(`progress: .tgo/${issueId}/progress.md`);
    } finally {
      await fs.unlink(file).catch(() => {});
    }
  });
});

describe("board progress hint regression tgo-30d", () => {
  test("in_progress issue WITH progress.md seeded but NO session map entry → progress line present, reusable hint absent", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-9regress-c";
      await fs.mkdir(path.join(dir, ".tgo", issueId), { recursive: true });
      await fs.writeFile(path.join(dir, ".tgo", issueId, "progress.md"), "# Progress\nhello", "utf-8");
      // intentionally do NOT create .tgo/sessions.json
      const run = async (cmd: string) => {
        if (cmd.includes("in_progress")) return JSON.stringify([{ id: issueId, title: "Test issue", priority: 1 }]);
        if (cmd.includes("bd ready")) return JSON.stringify([]);
        if (cmd.includes("bd blocked")) return JSON.stringify([]);
        if (cmd.includes("bd memories")) return JSON.stringify({});
        return "";
      };
      const client = { session: { messages: async () => [{ parts: [{ type: "text", text: "hello" }] }] } };
      const ctrl = new BoardController({
        run,
        refreshMs: 0,
        sessionReuse: { repoRoot: dir, client: client as any, maxContextTokens: 100000, supported: true, enabled: true },
      });
      const text = await ctrl.renderFor("sess-regress-c");
      expect(text).toContain(`progress: .tgo/${issueId}/progress.md`);
      expect(text).not.toContain("reusable session");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("standalone buildBoardTextWithHints with repoRoot provided but no sessionReuse deps → progress line still rendered", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-9regress-d";
      await fs.mkdir(path.join(dir, ".tgo", issueId), { recursive: true });
      await fs.writeFile(path.join(dir, ".tgo", issueId, "progress.md"), "# Progress\nhello", "utf-8");
      const built = await buildBoardTextWithHints(
        { inProgress: [{ id: issueId, title: "Test issue", priority: 1 }], ready: [], blocked: [], memories: [], streaming: [] },
        undefined,
        undefined,
        6,
        dir
      );
      expect(built).toContain(`progress: .tgo/${issueId}/progress.md`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("progress file seeded with empty string \"\" → progress line still present (existence-based)", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-9regress-e";
      await fs.mkdir(path.join(dir, ".tgo", issueId), { recursive: true });
      await fs.writeFile(path.join(dir, ".tgo", issueId, "progress.md"), "", "utf-8");
      // controller path
      const run = async (cmd: string) => {
        if (cmd.includes("in_progress")) return JSON.stringify([{ id: issueId, title: "Test issue", priority: 1 }]);
        if (cmd.includes("bd ready")) return JSON.stringify([]);
        if (cmd.includes("bd blocked")) return JSON.stringify([]);
        if (cmd.includes("bd memories")) return JSON.stringify({});
        return "";
      };
      const client = { session: { messages: async () => [{ parts: [{ type: "text", text: "hello" }] }] } };
      const ctrl = new BoardController({
        run,
        refreshMs: 0,
        sessionReuse: { repoRoot: dir, client: client as any, maxContextTokens: 100000, supported: true, enabled: true },
      });
      const text = await ctrl.renderFor("sess-regress-e");
      expect(text).toContain(`progress: .tgo/${issueId}/progress.md`);
      // standalone path also existence-based
      const built = await buildBoardTextWithHints(
        { inProgress: [{ id: issueId, title: "Test issue", priority: 1 }], ready: [], blocked: [], memories: [], streaming: [] },
        undefined,
        undefined,
        6,
        dir
      );
      expect(built).toContain(`progress: .tgo/${issueId}/progress.md`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
