import { describe, expect, test } from "bun:test";
import { TgoPlugin } from "../src/plugin";

describe("plugin entry exports", () => {
  // OpenCode's legacy plugin loader calls EVERY function export of the entry
  // module as a plugin factory (input, options) — tgo-6tq. Internal helpers
  // re-exported from the entry therefore get invoked as factories and throw
  // inside the host loader. The entry may expose the factory only; the default
  // binding points at that same function and is equally safe.
  test("server entry exports TgoPlugin as its only runtime function", async () => {
    const mod = (await import("../src/plugin")) as Record<string, unknown>;
    const offenders = Object.entries(mod)
      .filter(([, value]) => typeof value === "function" && value !== TgoPlugin)
      .map(([name]) => name);
    expect(offenders).toEqual([]);
    expect(typeof mod.TgoPlugin).toBe("function");
    expect(mod.default).toBe(TgoPlugin);
  });

  test("tui entry default export carries id and tui with no other functions", async () => {
    const mod = (await import("../src/tui-plugin")) as Record<string, unknown>;
    expect(Object.keys(mod)).toEqual(["default"]);
    const plugin = mod.default as { id?: unknown; tui?: unknown };
    expect(typeof plugin).toBe("object");
    expect(plugin.id).toBe("trans-genderian-orchestra");
    expect(typeof plugin.tui).toBe("function");
    const functions = Object.entries(mod)
      .filter(([, value]) => typeof value === "function")
      .map(([name]) => name);
    expect(functions).toEqual([]);
  });
});
