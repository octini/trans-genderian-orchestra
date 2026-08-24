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
