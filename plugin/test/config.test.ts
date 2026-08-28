import { test, expect, describe } from "bun:test";
import {
  assertPromptUnderBudget,
  BD_ENV,
  estimateTokens,
  estimatePromptTokens,
  loadTgoConfig,
  MAX_PROMPT_TOKENS,
  validateAgentDir,
} from "../src/config";

describe("plugin shell environment", () => {
  test("BD_ENV merges process.env so subprocesses keep PATH", () => {
    // Regression: BD_ENV previously replaced the env entirely ({ BD_NON_INTERACTIVE,
    // HOME }), so `bd init` (which shells out to git) failed with "exec: git:
    // executable file not found in $PATH" and per-repo setup silently skipped the
    // store. Verified live via `opencode run` before the fix.
    expect(BD_ENV.PATH).toBe(process.env.PATH);
    expect(BD_ENV.PATH).toBeTruthy();
    expect(BD_ENV.BD_NON_INTERACTIVE).toBe("1");
    expect(BD_ENV.HOME).toBeTruthy();
  });
});

describe("token budget", () => {
  test("estimates tokens from text", () => {
    expect(estimateTokens("word ".repeat(60))).toBe(60);
    expect(estimateTokens("")).toBe(0);
  });

  test("accepts prompts under budget", () => {
    expect(() => assertPromptUnderBudget("x ".repeat(100), "a.md")).not.toThrow();
  });

  test("rejects prompts over budget", () => {
    expect(() => assertPromptUnderBudget("x ".repeat(MAX_PROMPT_TOKENS + 1), "big.md")).toThrow(
      new RegExp(String(MAX_PROMPT_TOKENS))
    );
  });

  test("frontmatter is excluded from the prompt budget", () => {
    const content = [
      "---",
      "description: big config block",
      ...Array.from({ length: 200 }, (_, i) => `granted${i}: allow read grep glob list bash task`),
      "---",
      "x ".repeat(100),
    ].join("\n");
    expect(estimateTokens(content)).toBeGreaterThan(MAX_PROMPT_TOKENS);
    expect(estimatePromptTokens(content)).toBeLessThanOrEqual(MAX_PROMPT_TOKENS);
  });

  test("validates a directory of seat prompts", async () => {
    const checked = await validateAgentDir(new URL("../assets/agents", import.meta.url).pathname);
    expect(checked).toBeGreaterThanOrEqual(7);
  });
});

describe("config schema", () => {
  test("defaults to balanced + concise", async () => {
    const cfg = await loadTgoConfig({});
    expect(cfg.preset).toBe("balanced");
    expect(cfg.register).toBe("concise");
  });

  test("rejects unknown preset", async () => {
    expect(() =>
      loadTgoConfig({ preset: "nonsense" } as unknown as Record<string, unknown>)
    ).toThrow();
  });

  test("tolerates model-name drift (model IDs are free-form)", async () => {
    const cfg = await loadTgoConfig({
      presets: {
        balanced: {
          bernstein: { model: "future/model-x" },
          horowitz: { model: "future/model-x" },
          nas: { model: "future/model-x" },
          dylan: { model: "future/model-x" },
          nirvana: { model: "future/model-x" },
          "band-members": { model: "future/model-x" },
        },
      },
    });
    expect(cfg.presets!.balanced.bernstein.model).toBe("future/model-x");
  });

  test("built-in presets load and cover all seats", async () => {
    const cfg = await loadTgoConfig({});
    for (const name of ["balanced", "cheap", "frontier"] as const) {
      const seats = cfg.presets![name];
      expect(seats.bernstein.model.length).toBeGreaterThan(0);
      expect(seats.nas.variant).toBeDefined();
    }
  });

  test("board defaults to enabled", async () => {
    const cfg = await loadTgoConfig({});
    expect(cfg.board?.enabled).toBe(true);
  });

  test("board can be disabled", async () => {
    const cfg = await loadTgoConfig({ board: { enabled: false } });
    expect(cfg.board?.enabled).toBe(false);
  });

  test("watchdog defaults to enabled with sane caps", async () => {
    const cfg = await loadTgoConfig({});
    expect(cfg.watchdog?.enabled).toBe(true);
    expect(cfg.watchdog?.wallClockMs).toBeGreaterThan(0);
    expect(cfg.watchdog?.idleMs).toBeGreaterThan(0);
    expect(cfg.watchdog?.wallClockMs).toBeGreaterThan(cfg.watchdog!.idleMs);
    // tgo-hcm: idle default is 15m (was 5m) so a briefly-silent active session
    // (long single response, tool latency) isn't falsely aborted.
    expect(cfg.watchdog?.idleMs).toBe(15 * 60 * 1000);
    expect(cfg.watchdog?.wallClockMs).toBe(30 * 60 * 1000);
  });

  test("watchdog can be disabled and tuned", async () => {
    const cfg = await loadTgoConfig({
      watchdog: { enabled: false, wallClockMs: 1000, idleMs: 500, checkMs: 100 },
    });
    expect(cfg.watchdog?.enabled).toBe(false);
    expect(cfg.watchdog?.wallClockMs).toBe(1000);
    expect(cfg.watchdog?.idleMs).toBe(500);
  });

  test("board refreshMs accepts a positive integer", async () => {
    const cfg = await loadTgoConfig({ board: { refreshMs: 1000 } });
    expect(cfg.board?.refreshMs).toBe(1000);
  });

  test("concision defaults to enabled", async () => {
    const cfg = await loadTgoConfig({});
    expect(cfg.concision?.enabled).toBe(true);
  });

  test("concision can be disabled (universal off-switch)", async () => {
    const cfg = await loadTgoConfig({ concision: { enabled: false } });
    expect(cfg.concision?.enabled).toBe(false);
  });
});
