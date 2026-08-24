import { describe, expect, test } from "bun:test";
import { BEADS_TUI_COMMANDS, loadBeadsTui, renderBeadsTui, type BeadsTuiSnapshot } from "../src/tui";
import { isPrimarySessionData } from "../src/session";

const runWith = (data: Record<string, unknown[]>, calls: string[]) => async (command: string) => {
  calls.push(command);
  const key = Object.entries(BEADS_TUI_COMMANDS).find(([, value]) => value === command)?.[0];
  return JSON.stringify(key ? data[key] ?? [] : []);
};

describe("renderer-only Beads TUI", () => {
  test("renders stable columns, statuses, metadata, and edges", async () => {
    const calls: string[] = [];
    const snapshot = await loadBeadsTui(runWith({
      ready: [{ id: "r", title: "Ready", priority: 1, assignee: "dylan" }],
      open: [{ id: "o", title: "Open", priority: 2 }],
      pending: [{ id: "p", title: "Pending", priority: 3 }],
      inProgress: [{ id: "i", title: "In progress", priority: 0, assignee: "nas" }],
      blocked: [{ id: "b", title: "Blocked", blocked_by: ["i"], dependencies: ["o"] }],
    }, calls));
    const output = renderBeadsTui(snapshot);
    expect(output).toContain("ID             | TITLE");
    expect(output).toContain("ready");
    expect(output).toContain("in_progress");
    expect(output).toContain("blocked-by: i; depends-on: o");
    expect(output).toContain("dylan");
    expect(calls).not.toContain("bd create");
    expect(calls).not.toContain("bd update --claim");
  });

  test("clips titles and tolerates malformed optional fields", async () => {
    const snapshot = await loadBeadsTui(async () => JSON.stringify([{ id: "x", title: "a".repeat(100), priority: "high", assignee: null, blocked_by: "bad" }]));
    const output = renderBeadsTui(snapshot);
    expect(output).toContain("a".repeat(31) + "…");
    expect(output).toContain("high");
  });

  test("reports unavailable runner and empty data without throwing", async () => {
    expect(renderBeadsTui(await loadBeadsTui(async () => { throw new Error("bd missing"); }))).toContain("UNAVAILABLE");
    expect(renderBeadsTui(await loadBeadsTui(async () => "[]"))).toContain("No ready");
    const empty: BeadsTuiSnapshot = { state: "empty", issues: [] };
    expect(renderBeadsTui(empty)).toContain("No ready");
  });

  test("rejects missing and inherited parentID authorization data", () => {
    expect(isPrimarySessionData({})).toBe(false);
    expect(isPrimarySessionData(Object.create({ parentID: null }))).toBe(false);
    expect(isPrimarySessionData({ parentID: undefined })).toBe(false);
    expect(isPrimarySessionData({ parentID: "child" })).toBe(false);
    expect(isPrimarySessionData({ parentID: null })).toBe(true);
  });

  test("merges duplicate records without losing metadata or edges", async () => {
    const snapshot = await loadBeadsTui(runWith({
      ready: [{ id: "x", title: "Rich", priority: 1, blocked_by: ["a"] }],
      open: [{ id: "x", title: "(untitled)", assignee: "dylan", dependencies: ["b"] }],
    }, []));
    expect(snapshot.state).toBe("ready");
    if (snapshot.state !== "ready") return;
    expect(snapshot.issues[0]).toMatchObject({ title: "Rich", priority: 1, assignee: "dylan", blockedBy: ["a"], dependencies: ["b"] });
  });

  test("reports malformed non-empty command output", async () => {
    const snapshot = await loadBeadsTui(async (command) => command === BEADS_TUI_COMMANDS.ready ? "not json" : "[]");
    expect(snapshot.state).toBe("unavailable");
    expect(renderBeadsTui(snapshot)).toContain("invalid JSON");
  });
});
