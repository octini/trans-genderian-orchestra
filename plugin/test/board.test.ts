import { test, expect, describe } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  appendBoardMessage,
  BOARD_SENTINEL_END,
  BOARD_SENTINEL_START,
  BoardController,
  buildBoardText,
  createShim,
  deriveContext,
  isBoardMessage,
  renderBoard,
  stripBoardMessages,
  type BoardMessage,
  type BdRunner,
} from "../src/board";

const IN_PROGRESS = JSON.stringify([
  { id: "tgo-96f.5", title: "Beads Background Job Board (hook #1)", priority: 1 },
]);

const READY = JSON.stringify([
  { id: "tgo-96f.9", title: "Concision transform (hook #4)", priority: 1 },
  { id: "tgo-a6r", title: "TGO Wayfinder", priority: 1, issue_type: "epic" },
]);

const BLOCKED = JSON.stringify([
  { id: "tgo-96f.8", title: "Bernstein's mandate", priority: 1, blocked_by: ["tgo-96f.5"] },
]);

const MEMORIES = JSON.stringify({
  "parked-investigation": "Enforce beads use via disabling todowrite",
});

function fakeRunner(overrides?: Record<string, string>): BdRunner & { calls: string[] } {
  const calls: string[] = [];
  const runner = async (command: string) => {
    calls.push(command);
    if (overrides?.[command] !== undefined) return overrides[command];
    if (command.includes("in_progress")) return IN_PROGRESS;
    if (command.includes("bd ready")) return READY;
    if (command.includes("bd blocked")) return BLOCKED;
    if (command.includes("bd memories")) return MEMORIES;
    return "";
  };
  return Object.assign(runner, { calls });
}

function msg(role: "user" | "assistant", text?: string): BoardMessage {
  return {
    info: {
      id: role === "user" ? `u-${text ?? "x"}` : "a-1",
      sessionID: "sess-1",
      role,
      time: { created: Date.now() },
      agent: role === "user" ? "bernstein" : "dylan",
      model: { providerID: "opencode-go", modelID: "deepseek-v4-flash" },
    },
    parts: text ? [{ type: "text", text, synthetic: false }] : [],
  };
}

const agentClient = {
  app: {
    agents: async () => ({
      data: [
        { name: "bernstein", mode: "primary" },
        { name: "dylan", mode: "subagent" },
        { name: "explore", mode: "subagent" },
        { name: "nirvana", mode: "subagent" },
        { name: "cobain", mode: "subagent" },
        { name: "grohl", mode: "subagent" },
        { name: "novoselic", mode: "subagent" },
      ],
    }),
  },
  session: {
    get: async () => ({ data: { parentID: null } }),
  },
};

describe("board renderer", () => {
  test("parses bd --json output into a sentinel-wrapped board", async () => {
    const run = fakeRunner();
    const board = await renderBoard(run, createShim());
    expect(board).toContain(BOARD_SENTINEL_START);
    expect(board).toContain(BOARD_SENTINEL_END);
    expect(board).toContain("tgo-96f.5 · P1 · Beads Background Job Board");
    expect(board).toContain("READY:");
    expect(board).toContain("tgo-a6r · P1 · epic · TGO Wayfinder");
    expect(board).toContain("BLOCKED:");
    expect(board).toContain("← tgo-96f.5");
  });

  test("renders persistent memories", async () => {
    const board = await renderBoard(fakeRunner(), createShim());
    expect(board).toContain("MEMORIES:");
    expect(board).toContain("Enforce beads use via disabling todowrite");
  });

  test("ignores memory schema_version", async () => {
    const board = await renderBoard(fakeRunner(), createShim());
    expect(board).not.toContain("schema_version");
  });

  test("merges shim streaming state", async () => {
    const shim = createShim();
    shim.streaming.set("tgo-96f.9", { target: "dylan", startedAt: Date.now() });
    const board = await renderBoard(fakeRunner(), shim);
    expect(board).toContain("STREAMING:");
    expect(board).toContain("tgo-96f.9 → dylan");
  });

  test("returns undefined when bd is unavailable", async () => {
    const run = fakeRunner({
      "bd list --status in_progress --json": "",
      "bd ready --json": "",
      "bd blocked --json": "",
      "bd memories --json": "",
    });
    const board = await renderBoard(run, createShim());
    expect(board).toBeUndefined();
  });

  test("truncates long titles", () => {
    const text = buildBoardText({
      inProgress: [
        { id: "x", title: "a".repeat(200), priority: 1 },
      ],
      ready: [],
      blocked: [],
      memories: [],
      streaming: [],
    });
    expect(text).toContain("a".repeat(69) + "…");
  });

  test("caps ready/blocked lists and notes overflow", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ id: `t${i}`, title: `task ${i}`, priority: 2 }));
    const text = buildBoardText({
      inProgress: [],
      ready: many,
      blocked: many,
      memories: [],
      streaming: [],
    }, 4);
    expect(text).toContain("6 more ready");
    expect(text).toContain("6 more blocked");
    const readyLines = text.split("\n").filter((l) => l.startsWith("- t"));
    expect(readyLines.length).toBe(8);
  });
});

describe("board message helpers", () => {
  test("isBoardMessage detects the sentinel", () => {
    const plain = msg("user", "hello");
    const board = msg("user", `${BOARD_SENTINEL_START}\nboard\n${BOARD_SENTINEL_END}`);
    expect(isBoardMessage(plain)).toBe(false);
    expect(isBoardMessage(board)).toBe(true);
  });

  test("stripBoardMessages removes board messages in place", () => {
    const messages = [
      msg("user", "real"),
      msg("assistant", "ok"),
      msg("user", `${BOARD_SENTINEL_START}board${BOARD_SENTINEL_END}`),
    ];
    const removed = stripBoardMessages(messages);
    expect(removed).toBe(1);
    expect(messages.length).toBe(2);
  });

  test("appendBoardMessage adds a synthetic user text message", () => {
    const messages: BoardMessage[] = [];
    appendBoardMessage(messages, `${BOARD_SENTINEL_START}board${BOARD_SENTINEL_END}`, {
      sessionID: "sess-1",
      agent: "bernstein",
    });
    expect(messages.length).toBe(1);
    expect(messages[0].info.role).toBe("user");
    expect(messages[0].parts[0].synthetic).toBe(true);
    expect(messages[0].parts[0].text).toContain(BOARD_SENTINEL_START);
  });

  test("deriveContext finds the last user agent", () => {
    const messages = [msg("assistant", "ok"), msg("user", "hi")];
    const ctx = deriveContext(messages);
    expect(ctx?.agent).toBe("bernstein");
    expect(ctx?.sessionID).toBe("sess-1");
  });

  test("deriveContext returns undefined with no user message", () => {
    expect(deriveContext([msg("assistant", "ok")])).toBeUndefined();
  });
});

describe("BoardController", () => {
  test("gate marks primary sessions eligible, subagents not", async () => {
    const ctrl = new BoardController({ run: fakeRunner() });
    await ctrl.gate(agentClient, { sessionID: "s1", agent: "bernstein" });
    await ctrl.gate(agentClient, { sessionID: "s2", agent: "dylan" });
    await ctrl.gate(agentClient, { sessionID: "s3", agent: undefined });

    const eligible: string[] = [];
    await ctrl.transform([{ ...msg("user", "task"), info: { ...msg("user", "task").info, sessionID: "s1" } }]);
    eligible.push("s1");
    await ctrl.transform([{ ...msg("user", "task"), info: { ...msg("user", "task").info, sessionID: "s2" } }]);
    await ctrl.transform([{ ...msg("user", "task"), info: { ...msg("user", "task").info, sessionID: "s3" } }]);
    expect(eligible).toEqual(["s1"]);
  });

  test("transform injects the board for eligible sessions", async () => {
    const run = fakeRunner();
    const ctrl = new BoardController({ run });
    await ctrl.gate(agentClient, { sessionID: "sess-1", agent: "bernstein" });
    const messages = [msg("user", "continue")];
    await ctrl.transform(messages);
    expect(messages.some((m) => isBoardMessage(m))).toBe(true);
  });

  test("transform strips a stale board before appending fresh", async () => {
    const run = fakeRunner();
    const ctrl = new BoardController({ run });
    await ctrl.gate(agentClient, { sessionID: "sess-1", agent: "bernstein" });
    const stale = msg("user", `${BOARD_SENTINEL_START}old${BOARD_SENTINEL_END}`);
    const messages = [msg("user", "continue"), stale];
    await ctrl.transform(messages);
    const boards = messages.filter((m) => isBoardMessage(m));
    expect(boards.length).toBe(1);
    expect(boards[0].parts[0].text).not.toContain("old");
  });

  test("does not inject for subagent sessions", async () => {
    const ctrl = new BoardController({ run: fakeRunner() });
    await ctrl.gate(agentClient, { sessionID: "s2", agent: "dylan" });
    const messages = [
      { ...msg("user", "go"), info: { ...msg("user", "go").info, sessionID: "s2" } },
    ];
    await ctrl.transform(messages);
    expect(messages.some((m) => isBoardMessage(m))).toBe(false);
  });

  test("transform learns the subagent seat into the shim (STREAMING target)", async () => {
    const ctrl = new BoardController({ run: fakeRunner() });
    const messages = [
      {
        ...msg("user", "go"),
        info: { ...msg("user", "go").info, sessionID: "s-sub", agent: "dylan" },
      },
    ];
    await ctrl.transform(messages);
    expect(ctrl.shimState.agents.get("s-sub")).toBe("dylan");
  });

  test("defaults to deny when the gate never ran for a session", async () => {
    const ctrl = new BoardController({ run: fakeRunner() });
    const messages = [
      { ...msg("user", "go"), info: { ...msg("user", "go").info, sessionID: "unseen" } },
    ];
    await ctrl.transform(messages);
    expect(messages.some((m) => isBoardMessage(m))).toBe(false);
  });

  test("requires an explicit primary session identity", async () => {
    const ctrl = new BoardController({ run: fakeRunner() });
    const client = {
      app: agentClient.app,
      session: {
        get: async ({ path: { id } }: { path: { id: string } }) =>
          id === "child"
            ? { data: { parentID: "primary" } }
            : id === "missing"
              ? { data: {} }
              : { data: { parentID: null } },
      },
    };
    await ctrl.gate(client, { sessionID: "child", agent: "bernstein" });
    await ctrl.gate(client, { sessionID: "missing", agent: "bernstein" });
    await ctrl.gate(client, { sessionID: "primary", agent: "bernstein" });

    for (const sessionID of ["child", "missing", "primary"]) {
      const messages = [{ ...msg("user", "go"), info: { ...msg("user", "go").info, sessionID } }];
      await ctrl.transform(messages);
      expect(messages.some((message) => isBoardMessage(message)), sessionID).toBe(sessionID === "primary");
    }
  });

  test("band seats (nirvana + lenses) never receive the board", async () => {
    const ctrl = new BoardController({ run: fakeRunner() });
    for (const seat of ["nirvana", "cobain", "grohl", "novoselic"]) {
      await ctrl.gate(agentClient, { sessionID: `s-${seat}`, agent: seat });
      const messages = [
        { ...msg("user", "go"), info: { ...msg("user", "go").info, sessionID: `s-${seat}` } },
      ];
      await ctrl.transform(messages);
      expect(messages.some((m) => isBoardMessage(m)), seat).toBe(false);
    }
  });

  test("caches render within refreshMs (no duplicate bd calls)", async () => {
    const run = fakeRunner();
    const ctrl = new BoardController({ run, refreshMs: 10_000 });
    await ctrl.gate(agentClient, { sessionID: "sess-1", agent: "bernstein" });
    await ctrl.transform([msg("user", "a")]);
    await ctrl.transform([msg("user", "b")]);
    const bdCalls = run.calls.filter((c) => c.includes("bd "));
    expect(bdCalls.length).toBe(4);
  });

  test("re-renders after refreshMs elapses", async () => {
    const run = fakeRunner();
    const ctrl = new BoardController({ run, refreshMs: 1 });
    await ctrl.gate(agentClient, { sessionID: "sess-1", agent: "bernstein" });
    await ctrl.transform([msg("user", "a")]);
    await new Promise((r) => setTimeout(r, 5));
    await ctrl.transform([msg("user", "b")]);
    const bdCalls = run.calls.filter((c) => c.includes("bd "));
    expect(bdCalls.length).toBe(8);
  });

  test("reset re-enables injection for a session", async () => {
    const ctrl = new BoardController({ run: fakeRunner() });
    await ctrl.gate(agentClient, { sessionID: "sess-1", agent: "bernstein" });
    ctrl.reset("sess-1");
    await ctrl.gate(agentClient, { sessionID: "sess-1", agent: "bernstein" });
    const messages = [msg("user", "hi")];
    await ctrl.transform(messages);
    expect(messages.some((m) => isBoardMessage(m))).toBe(true);
  });

  test("memoizes session.messages within TTL — two renders cause one fetch", async () => {
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), "tgo-board-memo-"));
    try {
      const sid = "ses_ABC123456";
      mkdirSync(path.join(repoRoot, ".tgo"), { recursive: true });
      writeFileSync(path.join(repoRoot, ".tgo", "sessions.json"), JSON.stringify({ "tgo-memo": { sessionId: sid, updatedAt: new Date().toISOString() } }));
      const inProg = JSON.stringify([{ id: "tgo-memo", title: "Memo test", priority: 1 }]);
      const run: BdRunner = async (cmd: string) => {
        if (cmd.includes("in_progress")) return inProg;
        if (cmd.includes("bd ready")) return "[]";
        if (cmd.includes("bd blocked")) return "[]";
        if (cmd.includes("bd memories")) return "{}";
        return "";
      };
      let msgCalls = 0;
      const client = {
        session: {
          messages: async (_opts: { path: { id: string } }) => {
            msgCalls++;
            return [{ parts: [{ type: "text", text: "hello world" }] }];
          },
        },
      };
      const ctrl = new BoardController({ run, refreshMs: 10_000, sessionReuse: { repoRoot, client: client as any, maxContextTokens: 100000, supported: true, enabled: true } });
      const r1 = await ctrl.renderFor("board-sess-1");
      const r2 = await ctrl.renderFor("board-sess-2");
      expect(r1).toContain("tgo-memo");
      expect(r2).toContain("tgo-memo");
      expect(msgCalls).toBe(1);
      // cache respects TTL: after expiry, refetch
      const ctrlShort = new BoardController({ run, refreshMs: 5, sessionReuse: { repoRoot, client: client as any, maxContextTokens: 100000, supported: true, enabled: true } });
      msgCalls = 0;
      await ctrlShort.renderFor("a");
      await new Promise((r) => setTimeout(r, 10));
      await ctrlShort.renderFor("b");
      expect(msgCalls).toBe(2);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  test("board loadAgents failure emits tgo: warn via injected logger", async () => {
    const logs: Array<{ level: string; message: string }> = [];
    const log = (level: "warn" | "info" | "error", message: string) => logs.push({ level, message });
    const failingClient = { app: { agents: async () => { throw new Error("agents down"); } } } as any;
    const ctrl = new BoardController({ run: fakeRunner(), log });
    const ok = await ctrl.shouldInject(failingClient, "bernstein");
    expect(ok).toBe(true);
    expect(logs.some((l) => l.message.includes("tgo: board loadAgents failed"))).toBe(true);
  });
});
