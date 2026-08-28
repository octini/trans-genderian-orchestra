import { describe, expect, test } from "bun:test";
import type { BdClient, Bead } from "../src/sidebar/bd";
import { resolveScope } from "../src/sidebar/scope";
import { createStore } from "../src/sidebar/tui";

function mockBd(overrides: Partial<BdClient> = {}): BdClient {
  const client = {
    enabled: () => true,
    signature: () => "sig",
    beginRefresh: () => {},
    snapshot: () => "sig",
    lastTouchedID: () => undefined,
    invalidate: () => {},
    mutate: async () => ({ ok: true as const }),
    children: async (): Promise<Bead[]> => [],
    get: async (): Promise<Bead[] | undefined> => undefined,
    ready: async (): Promise<Bead[] | undefined> => [],
    list: async (): Promise<Bead[] | undefined> => [],
    epics: async (): Promise<Bead[] | undefined> => [],
  };
  return Object.assign(client, overrides) as BdClient;
}

const kv = {
  get: <Value>(_key: string, fallback?: Value): Value => fallback as Value,
  set: () => {},
};

const claimable = [{ id: "bd-1", title: "Claimable work", priority: 1 }];

describe("sidebar store refresh", () => {
  test("a failed refresh commits an explicit error state instead of undefined", async () => {
    const bd = mockBd({
      ready: async () => {
        throw new Error("lock contention");
      },
    });
    const store = createStore(bd, kv);
    await store.refresh();
    const data = store.data();
    expect(data?.error).toContain("lock contention");
    expect(data?.items).toEqual([]);
    expect(data?.done).toBe(0);
    expect(data?.total).toBe(0);
    expect(data?.epic).toBeUndefined();
  });

  test("recovers from the error state on a subsequent successful refresh", async () => {
    let failReady = true;
    const bd = mockBd({
      ready: async () => {
        if (failReady) throw new Error("bd spawn failed");
        return claimable;
      },
      list: async () => claimable,
    });
    const store = createStore(bd, kv);
    await store.refresh();
    expect(store.data()?.error).toContain("bd spawn failed");

    failReady = false;
    await store.refresh(true);
    const recovered = store.data();
    expect(recovered?.error).toBeUndefined();
    expect(recovered?.items.map((item) => item.bead.id)).toEqual(["bd-1"]);
    expect(recovered?.fallback).toBe(true);
  });

  test("a disabled client still resolves to undefined so the panel omits silently", async () => {
    const bd = mockBd({ enabled: () => false });
    await expect(resolveScope(bd, undefined)).resolves.toBeUndefined();

    const store = createStore(bd, kv);
    await store.refresh();
    expect(store.data()).toBeUndefined();
  });
});

describe("beads sidebar: hide closed by default", () => {
  const epic: Bead = { id: "epic-1", title: "Epic", issue_type: "epic", status: "open" };
  const mixedChildren: Bead[] = [
    { id: "epic-1.1", title: "First open", status: "open", issue_type: "task" },
    { id: "epic-1.2", title: "Closed one", status: "closed", issue_type: "task" },
    { id: "epic-1.3", title: "In progress", status: "in_progress", issue_type: "task" },
    { id: "epic-1.4", title: "Closed two", status: "closed", issue_type: "task" },
    { id: "epic-1.5", title: "Ready work", status: "open", issue_type: "task" },
    { id: "epic-1.6", title: "Closed three", status: "closed", issue_type: "task" },
  ];

  test("epic scope: closed rows absent, footer count exact, open order untouched", async () => {
    const bd = mockBd({
      get: async (id) => (id === "epic-1" ? [epic] : undefined),
      children: async (id) => (id === "epic-1" ? mixedChildren : []),
      ready: async () => [{ id: "epic-1.5", status: "open" }],
    });
    const data = await resolveScope(bd, "epic-1");
    expect(data).toBeDefined();
    // closed ids must be absent from rendered list
    const ids = data!.items.map((it) => it.bead.id);
    expect(ids).not.toContain("epic-1.2");
    expect(ids).not.toContain("epic-1.4");
    expect(ids).not.toContain("epic-1.6");
    // open rows preserve byID order (1,3,5)
    expect(ids).toEqual(["epic-1.1", "epic-1.3", "epic-1.5"]);
    // footer count exact: 3 closed hidden
    expect(data!.hiddenClosed).toBe(3);
    expect(data!.done).toBe(3);
    expect(data!.total).toBe(6);
    // ensure no closed state leaked into visible items
    expect(data!.items.every((it) => it.state !== "closed")).toBe(true);
  });

  test("workspace fallback: hides closed, preserves urgency order, counts exact", async () => {
    const openList: Bead[] = [
      { id: "bd-2", title: "Blocked open", status: "open", issue_type: "task" },
      { id: "bd-1", title: "Closed hidden", status: "closed", issue_type: "task" },
      { id: "bd-3", title: "In progress", status: "in_progress", issue_type: "task" },
      { id: "bd-4", title: "Ready", status: "open", issue_type: "task" },
    ];
    const bd = mockBd({
      ready: async () => [{ id: "bd-4", status: "open" }],
      list: async (args) => {
        // verify fetch stays unchanged: workspace pulls "--all"
        expect(args).toContain("--all");
        return openList;
      },
      children: async () => [],
      get: async () => undefined,
    });
    const data = await resolveScope(bd, undefined);
    expect(data).toBeDefined();
    const ids = data!.items.map((it) => it.bead.id);
    expect(ids).not.toContain("bd-1");
    expect(data!.hiddenClosed).toBe(1);
    expect(data!.done).toBe(1);
    expect(data!.total).toBe(4);
    // closed rows absent, fallback still true
    expect(data!.fallback).toBe(true);
    expect(data!.items.every((it) => it.state !== "closed")).toBe(true);
  });

  test("edge: 0 closed → hidden 0, no crash, items untouched in order", async () => {
    const children: Bead[] = [
      { id: "epic-1.1", title: "A", status: "open", issue_type: "task" },
      { id: "epic-1.2", title: "B", status: "in_progress", issue_type: "task" },
    ];
    const bd = mockBd({
      get: async (id) => (id === "epic-1" ? [epic] : undefined),
      children: async () => children,
      ready: async () => [],
    });
    const data = await resolveScope(bd, "epic-1");
    expect(data!.hiddenClosed).toBe(0);
    expect(data!.items.map((it) => it.bead.id)).toEqual(["epic-1.1", "epic-1.2"]);
    expect(data!.done).toBe(0);
    expect(data!.total).toBe(2);
  });

  test("all closed → panel stays visible with hidden count so footer can render", async () => {
    const allClosed: Bead[] = [
      { id: "epic-1.1", title: "X", status: "closed", issue_type: "task" },
      { id: "epic-1.2", title: "Y", status: "closed", issue_type: "task" },
    ];
    const bd = mockBd({
      get: async (id) => (id === "epic-1" ? [epic] : undefined),
      children: async () => allClosed,
      ready: async () => [],
    });
    const data = await resolveScope(bd, "epic-1");
    expect(data).toBeDefined();
    expect(data!.items).toEqual([]);
    expect(data!.hiddenClosed).toBe(2);
    expect(data!.total).toBe(2);
  });

  test("store refresh propagates hiddenClosed for footer rendering", async () => {
    const epicLocal: Bead = { id: "epic-1", title: "Epic", issue_type: "epic", status: "open" };
    const bd = mockBd({
      get: async (id) => (id === "epic-1" ? [epicLocal] : undefined),
      children: async () => mixedChildren,
      ready: async () => [],
      lastTouchedID: () => "epic-1",
      list: async () => [],
    });
    const store = createStore(bd, kv);
    await store.refresh();
    const data = store.data();
    expect(data?.hiddenClosed).toBe(3);
    expect(data?.items.every((it) => it.state !== "closed")).toBe(true);
    // error state still carries hiddenClosed 0 and does not crash
    const failing = mockBd({ ready: async () => { throw new Error("boom"); } });
    const failingStore = createStore(failing, kv);
    await failingStore.refresh();
    expect(failingStore.data()?.hiddenClosed).toBe(0);
    expect(failingStore.data()?.error).toContain("boom");
  });
});
