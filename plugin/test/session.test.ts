import { test, expect, describe } from "bun:test";
import { SessionReconciler, type SessionStatusType } from "../src/session";

describe("SessionReconciler", () => {
  test("busy status marks a session streaming with its agent target", () => {
    const reconciler = new SessionReconciler();
    reconciler.noteAgent("s1", "dylan");
    reconciler.onStatus("s1", "busy");
    expect(reconciler.isBusy("s1")).toBe(true);
    expect(reconciler.shimState.streaming.get("s1")?.target).toBe("dylan");
  });

  test("idle status clears streaming and busy state", () => {
    const reconciler = new SessionReconciler();
    reconciler.noteAgent("s1", "dylan");
    reconciler.onStatus("s1", "busy");
    reconciler.onStatus("s1", "idle");
    expect(reconciler.isBusy("s1")).toBe(false);
    expect(reconciler.shimState.streaming.has("s1")).toBe(false);
  });

  test("onIdle clears streaming and busy state", () => {
    const reconciler = new SessionReconciler();
    reconciler.noteAgent("s1", "dylan");
    reconciler.onStatus("s1", "busy");
    reconciler.onIdle("s1");
    expect(reconciler.isBusy("s1")).toBe(false);
    expect(reconciler.shimState.streaming.has("s1")).toBe(false);
  });

  test("onCompact clears agent and streaming state", () => {
    const reconciler = new SessionReconciler();
    reconciler.noteAgent("s1", "dylan");
    reconciler.onStatus("s1", "busy");
    reconciler.onCompact("s1");
    expect(reconciler.isBusy("s1")).toBe(false);
    expect(reconciler.shimState.streaming.has("s1")).toBe(false);
  });

  test("retry status keeps busy state", () => {
    const reconciler = new SessionReconciler();
    reconciler.noteAgent("s1", "dylan");
    reconciler.onStatus("s1", "busy");
    reconciler.onStatus("s1", "retry");
    expect(reconciler.isBusy("s1")).toBe(true);
    expect(reconciler.shimState.streaming.has("s1")).toBe(true);
  });

  test("streaming entry preserves its original startedAt across busy marks", async () => {
    const reconciler = new SessionReconciler();
    reconciler.noteAgent("s1", "nas");
    reconciler.onStatus("s1", "busy");
    const first = reconciler.shimState.streaming.get("s1")?.startedAt;
    await new Promise((r) => setTimeout(r, 5));
    reconciler.onStatus("s1", "retry");
    const second = reconciler.shimState.streaming.get("s1")?.startedAt;
    expect(second).toBe(first);
  });

  test("subagent seat learned via the shared shim resolves the STREAMING target", () => {
    const reconciler = new SessionReconciler();
    // a subagent session never fires chat.message, but the board transform
    // writes its seat into the shared shim agents map (tgo-3fa)
    reconciler.shimState.agents.set("s-sub", "dylan");
    reconciler.onStatus("s-sub", "busy");
    expect(reconciler.shimState.streaming.get("s-sub")?.target).toBe("dylan");
  });

  test("unknown sessions fall back to subagent in the STREAMING target", () => {
    const reconciler = new SessionReconciler();
    reconciler.onStatus("s-mystery", "busy");
    expect(reconciler.shimState.streaming.get("s-mystery")?.target).toBe("subagent");
  });
});
