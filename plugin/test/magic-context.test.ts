import { test, expect, describe } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  configureMagicContext,
  MAGIC_CONTEXT_CONFIG_DIR,
  MAGIC_CONTEXT_CONFIG_FILE,
} from "../src/magic-context";
import { tgoConfigSchema } from "../src/config";

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "tgo-mc-"));
}

describe("magic-context historian always-follows Dylan seat", () => {
  test("fresh install seeds nested shape { historian: { opencode: { model, variant } } }", async () => {
    const configDir = tmpDir();
    const home = tmpDir();
    const r = await configureMagicContext({
      configDir,
      dylan: { model: "opencode-go/muse-spark-1.2-contributor", variant: "xhigh" },
      homeDir: home,
    });
    expect(r.action).toBe("created");
    expect(r.historianModel).toBe("opencode-go/muse-spark-1.2-contributor");
    expect(r.compaction).toBe("written");

    const userConfig = path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE);
    const cfg = JSON.parse(readFileSync(userConfig, "utf-8"));
    expect(cfg.historian.opencode.model).toBe("opencode-go/muse-spark-1.2-contributor");
    expect(cfg.historian.opencode.variant).toBe("xhigh");
    // flat shape must not be used for fresh
    expect(cfg.historian.model).toBeUndefined();

    const open = JSON.parse(readFileSync(path.join(configDir, "opencode.jsonc"), "utf-8"));
    expect(open.compaction).toEqual({ auto: false, prune: false });

    rmSync(configDir, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  });

  test("follow updates nested shape model+variant", async () => {
    const configDir = tmpDir();
    const home = tmpDir();
    const userConfig = path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE);
    mkdirSync(path.dirname(userConfig), { recursive: true });
    writeFileSync(userConfig, JSON.stringify({ historian: { opencode: { model: "old/model", variant: "low" } }, other: 123 }));

    const r = await configureMagicContext({
      configDir,
      dylan: { model: "opencode-go/muse-spark-1.3-contributor", variant: "max" },
      homeDir: home,
    });
    expect(r.action).toBe("updated");
    const cfg = JSON.parse(readFileSync(userConfig, "utf-8"));
    expect(cfg.historian.opencode.model).toBe("opencode-go/muse-spark-1.3-contributor");
    expect(cfg.historian.opencode.variant).toBe("max");
    // preserves sibling keys
    expect(cfg.other).toBe(123);
    // shape stays nested
    expect(cfg.historian.model).toBeUndefined();

    rmSync(configDir, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  });

  test("follow updates flat shape model+variant and stays flat (shape-preserving)", async () => {
    const configDir = tmpDir();
    const home = tmpDir();
    const userConfig = path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE);
    mkdirSync(path.dirname(userConfig), { recursive: true });
    writeFileSync(userConfig, JSON.stringify({ historian: { model: "old/model", variant: "low" } }));

    const r = await configureMagicContext({
      configDir,
      dylan: { model: "opencode-go/muse-spark-1.2-contributor", variant: "xhigh" },
      homeDir: home,
    });
    expect(r.action).toBe("updated");
    const cfg = JSON.parse(readFileSync(userConfig, "utf-8"));
    expect(cfg.historian.model).toBe("opencode-go/muse-spark-1.2-contributor");
    expect(cfg.historian.variant).toBe("xhigh");
    // stays flat, no nested opencode injected
    expect(cfg.historian.opencode).toBeUndefined();

    rmSync(configDir, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  });

  test("drifted flat file (github-copilot/gpt-5.6-luna + medium) gets overwritten on follow", async () => {
    const configDir = tmpDir();
    const home = tmpDir();
    const userConfig = path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE);
    mkdirSync(path.dirname(userConfig), { recursive: true });
    writeFileSync(userConfig, JSON.stringify({ historian: { model: "github-copilot/gpt-5.6-luna", variant: "medium" } }));

    const r = await configureMagicContext({
      configDir,
      dylan: { model: "opencode-go/muse-spark-1.2-contributor", variant: "xhigh" },
      homeDir: home,
    });
    expect(r.action).toBe("updated");
    const cfg = JSON.parse(readFileSync(userConfig, "utf-8"));
    expect(cfg.historian.model).toBe("opencode-go/muse-spark-1.2-contributor");
    expect(cfg.historian.variant).toBe("xhigh");

    rmSync(configDir, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  });

  test('"off" leaves file untouched (and compaction stays installer-managed)', async () => {
    const configDir = tmpDir();
    const home = tmpDir();
    const userConfig = path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE);
    mkdirSync(path.dirname(userConfig), { recursive: true });
    const original = { historian: { model: "original/model", variant: "keep-me" }, extra: "preserve" };
    writeFileSync(userConfig, JSON.stringify(original));

    const r = await configureMagicContext({
      configDir,
      dylan: { model: "opencode-go/muse-spark-1.3-contributor", variant: "xhigh" },
      sync: "off",
      homeDir: home,
    });
    expect(r.action).toBe("skipped");
    const cfg = JSON.parse(readFileSync(userConfig, "utf-8"));
    expect(cfg).toEqual(original);
    // compaction stays installer-managed even with historianSync: off
    expect(r.compaction).not.toBe("skipped");
    const open = JSON.parse(readFileSync(path.join(configDir, "opencode.jsonc"), "utf-8"));
    expect(open.compaction).toEqual({ auto: false, prune: false });

    rmSync(configDir, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  });

  test("off leaves file untouched even for nested shape", async () => {
    const home = tmpDir();
    const userConfig = path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE);
    mkdirSync(path.dirname(userConfig), { recursive: true });
    const original = { historian: { opencode: { model: "original/model", variant: "keep" } } };
    writeFileSync(userConfig, JSON.stringify(original));

    const r = await configureMagicContext({
      dylan: { model: "opencode-go/muse-spark-1.2-contributor", variant: "max" },
      sync: "off",
      homeDir: home,
    });
    expect(r.action).toBe("skipped");
    expect(JSON.parse(readFileSync(userConfig, "utf-8"))).toEqual(original);
    rmSync(home, { recursive: true, force: true });
  });

  test("missing dylan model skips and leaves file alone", async () => {
    const configDir = tmpDir();
    const home = tmpDir();
    const r = await configureMagicContext({ configDir, dylan: undefined, homeDir: home });
    expect(r.action).toBe("skipped");
    expect(existsSync(path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE))).toBe(false);

    // existing file should stay untouched when dylan model missing
    const userConfig = path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE);
    mkdirSync(path.dirname(userConfig), { recursive: true });
    const original = { historian: { model: "keep/original", variant: "medium" } };
    writeFileSync(userConfig, JSON.stringify(original));
    const r2 = await configureMagicContext({ configDir, dylan: { variant: "xhigh" }, homeDir: home });
    expect(r2.action).toBe("skipped");
    expect(JSON.parse(readFileSync(userConfig, "utf-8"))).toEqual(original);

    rmSync(configDir, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  });

  test("variant-less dylan preserves existing variant (flat)", async () => {
    const configDir = tmpDir();
    const home = tmpDir();
    const userConfig = path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE);
    mkdirSync(path.dirname(userConfig), { recursive: true });
    writeFileSync(userConfig, JSON.stringify({ historian: { model: "old/model", variant: "medium" } }));

    const r = await configureMagicContext({
      configDir,
      dylan: { model: "opencode-go/muse-spark-1.2-contributor" },
      homeDir: home,
    });
    expect(r.action).toBe("updated");
    const cfg = JSON.parse(readFileSync(userConfig, "utf-8"));
    expect(cfg.historian.model).toBe("opencode-go/muse-spark-1.2-contributor");
    expect(cfg.historian.variant).toBe("medium");

    rmSync(configDir, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  });

  test("variant-less dylan preserves existing variant (nested)", async () => {
    const home = tmpDir();
    const userConfig = path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE);
    mkdirSync(path.dirname(userConfig), { recursive: true });
    writeFileSync(userConfig, JSON.stringify({ historian: { opencode: { model: "old/model", variant: "medium" } } }));

    const r = await configureMagicContext({
      dylan: { model: "opencode-go/muse-spark-1.2-contributor" },
      homeDir: home,
    });
    expect(r.action).toBe("updated");
    const cfg = JSON.parse(readFileSync(userConfig, "utf-8"));
    expect(cfg.historian.opencode.model).toBe("opencode-go/muse-spark-1.2-contributor");
    expect(cfg.historian.opencode.variant).toBe("medium");

    rmSync(home, { recursive: true, force: true });
  });

  test("unchanged avoids churn (no write when already correct)", async () => {
    const home = tmpDir();
    const userConfig = path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE);
    mkdirSync(path.dirname(userConfig), { recursive: true });
    writeFileSync(userConfig, JSON.stringify({ historian: { opencode: { model: "opencode-go/muse-spark-1.2-contributor", variant: "xhigh" } }, auto_update: true }));
    const before = readFileSync(userConfig, "utf-8");

    const r = await configureMagicContext({
      dylan: { model: "opencode-go/muse-spark-1.2-contributor", variant: "xhigh" },
      homeDir: home,
    });
    expect(r.action).toBe("unchanged");
    const after = readFileSync(userConfig, "utf-8");
    expect(after).toBe(before);

    rmSync(home, { recursive: true, force: true });
  });

  test("auto_update: absent → filled true (created/updated)", async () => {
    const home = tmpDir();
    const userConfig = path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE);
    // fresh → should create with auto_update true
    const r1 = await configureMagicContext({
      dylan: { model: "opencode-go/muse-spark-1.2-contributor", variant: "xhigh" },
      homeDir: home,
    });
    expect(r1.action).toBe("created");
    let cfg = JSON.parse(readFileSync(userConfig, "utf-8"));
    expect(cfg.auto_update).toBe(true);
    // existing file with historian correct but auto_update absent → should fill and report updated
    // remove auto_update to simulate absent
    const withoutAuto = { historian: cfg.historian };
    writeFileSync(userConfig, JSON.stringify(withoutAuto));
    const before = readFileSync(userConfig, "utf-8");
    const r2 = await configureMagicContext({
      dylan: { model: "opencode-go/muse-spark-1.2-contributor", variant: "xhigh" },
      homeDir: home,
    });
    expect(r2.action).toBe("updated");
    cfg = JSON.parse(readFileSync(userConfig, "utf-8"));
    expect(cfg.auto_update).toBe(true);
    expect(readFileSync(userConfig, "utf-8")).not.toBe(before);
    // now already filled → unchanged
    const before2 = readFileSync(userConfig, "utf-8");
    const r3 = await configureMagicContext({
      dylan: { model: "opencode-go/muse-spark-1.2-contributor", variant: "xhigh" },
      homeDir: home,
    });
    expect(r3.action).toBe("unchanged");
    expect(readFileSync(userConfig, "utf-8")).toBe(before2);
    rmSync(home, { recursive: true, force: true });
  });

  test("auto_update: explicit false → respected untouched", async () => {
    const home = tmpDir();
    const userConfig = path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE);
    mkdirSync(path.dirname(userConfig), { recursive: true });
    writeFileSync(userConfig, JSON.stringify({ historian: { opencode: { model: "opencode-go/muse-spark-1.2-contributor", variant: "xhigh" } }, auto_update: false }));
    const before = readFileSync(userConfig, "utf-8");
    const r = await configureMagicContext({
      dylan: { model: "opencode-go/muse-spark-1.2-contributor", variant: "xhigh" },
      homeDir: home,
    });
    expect(r.action).toBe("unchanged");
    expect(readFileSync(userConfig, "utf-8")).toBe(before);
    const cfg = JSON.parse(readFileSync(userConfig, "utf-8"));
    expect(cfg.auto_update).toBe(false);
    rmSync(home, { recursive: true, force: true });
  });

  test("auto_update: explicit true → untouched (no clobber)", async () => {
    const home = tmpDir();
    const userConfig = path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE);
    mkdirSync(path.dirname(userConfig), { recursive: true });
    writeFileSync(userConfig, JSON.stringify({ historian: { opencode: { model: "opencode-go/muse-spark-1.2-contributor", variant: "xhigh" } }, auto_update: true }));
    const before = readFileSync(userConfig, "utf-8");
    const r = await configureMagicContext({
      dylan: { model: "opencode-go/muse-spark-1.2-contributor", variant: "xhigh" },
      homeDir: home,
    });
    expect(r.action).toBe("unchanged");
    expect(readFileSync(userConfig, "utf-8")).toBe(before);
    const cfg = JSON.parse(readFileSync(userConfig, "utf-8"));
    expect(cfg.auto_update).toBe(true);
    rmSync(home, { recursive: true, force: true });
  });

  test("preserves unknown sibling keys (top-level and historian)", async () => {
    const home = tmpDir();
    const userConfig = path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE);
    mkdirSync(path.dirname(userConfig), { recursive: true });
    writeFileSync(
      userConfig,
      JSON.stringify({
        historian: { opencode: { model: "old/model", variant: "low" }, extraHistorianKey: "keep" },
        topLevelKeep: { foo: 1 },
        another: "value",
      })
    );

    const r = await configureMagicContext({
      dylan: { model: "opencode-go/muse-spark-1.2-contributor", variant: "xhigh" },
      homeDir: home,
    });
    expect(r.action).toBe("updated");
    const cfg = JSON.parse(readFileSync(userConfig, "utf-8"));
    expect(cfg.historian.opencode.model).toBe("opencode-go/muse-spark-1.2-contributor");
    expect(cfg.historian.extraHistorianKey).toBe("keep");
    expect(cfg.topLevelKeep).toEqual({ foo: 1 });
    expect(cfg.another).toBe("value");

    rmSync(home, { recursive: true, force: true });
  });

  test("skip leaves everything untouched", async () => {
    const configDir = tmpDir();
    const home = tmpDir();
    const r = await configureMagicContext({ configDir, dylan: { model: "x/y" }, homeDir: home, skip: true });
    expect(r.action).toBe("skipped");
    expect(r.compaction).toBe("skipped");
    expect(existsSync(path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE))).toBe(false);
    expect(existsSync(path.join(configDir, "opencode.jsonc"))).toBe(false);
    rmSync(configDir, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  });

  test("fresh nested write can be read back (tmpdir round-trip)", async () => {
    const home = tmpDir();
    const r = await configureMagicContext({
      dylan: { model: "opencode-go/muse-spark-1.3-contributor", variant: "xhigh" },
      homeDir: home,
    });
    expect(r.action).toBe("created");
    const userConfig = path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE);
    const raw = readFileSync(userConfig, "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.historian.opencode.model).toBe("opencode-go/muse-spark-1.3-contributor");
    expect(parsed.historian.opencode.variant).toBe("xhigh");
    rmSync(home, { recursive: true, force: true });
  });

  test("JSONC with comments + flat historian is left byte-identical after reconcile (parse error skip)", async () => {
    const home = tmpDir();
    const userConfig = path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE);
    mkdirSync(path.dirname(userConfig), { recursive: true });
    const rawWithComments = `// magic-context config with comments
{
  // flat historian shape
  "historian": {
    "model": "old/model", // keep
    "variant": "low",
  },
  "other": 123, // trailing comma
}
`;
    writeFileSync(userConfig, rawWithComments, "utf-8");
    const before = readFileSync(userConfig, "utf-8");

    const r = await configureMagicContext({
      dylan: { model: "opencode-go/muse-spark-1.2-contributor", variant: "xhigh" },
      homeDir: home,
    });
    expect(r.action).toBe("skipped");
    const after = readFileSync(userConfig, "utf-8");
    expect(after).toBe(before);
    // warning propagated
    expect(r.warning).toBeDefined();

    rmSync(home, { recursive: true, force: true });
  });

  test("both shapes present: nested updated, flat left untouched, second reconcile unchanged (no oscillation)", async () => {
    const home = tmpDir();
    const userConfig = path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE);
    mkdirSync(path.dirname(userConfig), { recursive: true });
    const bothShapes = {
      historian: {
        opencode: { model: "old/nested", variant: "low" },
        model: "old/flat",
        variant: "flat-var",
        extra: "keep",
      },
      topLevel: "preserve",
    };
    writeFileSync(userConfig, JSON.stringify(bothShapes));

    const r1 = await configureMagicContext({
      dylan: { model: "opencode-go/muse-spark-1.2-contributor", variant: "xhigh" },
      homeDir: home,
    });
    expect(r1.action).toBe("updated");
    const cfg1 = JSON.parse(readFileSync(userConfig, "utf-8"));
    // nested updated
    expect(cfg1.historian.opencode.model).toBe("opencode-go/muse-spark-1.2-contributor");
    expect(cfg1.historian.opencode.variant).toBe("xhigh");
    // flat left untouched
    expect(cfg1.historian.model).toBe("old/flat");
    expect(cfg1.historian.variant).toBe("flat-var");
    expect(cfg1.historian.extra).toBe("keep");
    expect(cfg1.topLevel).toBe("preserve");

    const beforeSecond = readFileSync(userConfig, "utf-8");
    const r2 = await configureMagicContext({
      dylan: { model: "opencode-go/muse-spark-1.2-contributor", variant: "xhigh" },
      homeDir: home,
    });
    expect(r2.action).toBe("unchanged");
    const afterSecond = readFileSync(userConfig, "utf-8");
    expect(afterSecond).toBe(beforeSecond);

    rmSync(home, { recursive: true, force: true });
  });

  test("config parse: {} defaults historianSync to follow; off accepted", () => {
    const parsedDefault = tgoConfigSchema.parse({});
    expect(parsedDefault.magicContext.historianSync).toBe("follow");

    const parsedOff = tgoConfigSchema.parse({ magicContext: { historianSync: "off" } });
    expect(parsedOff.magicContext.historianSync).toBe("off");
  });

  test("JSON-array-root file is treated as absent (fresh) without index-key mangling", async () => {
    const home = tmpDir();
    const userConfig = path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE);
    mkdirSync(path.dirname(userConfig), { recursive: true });
    writeFileSync(userConfig, JSON.stringify([1, 2, 3]));
    const r = await configureMagicContext({
      dylan: { model: "opencode-go/muse-spark-1.2-contributor", variant: "xhigh" },
      homeDir: home,
    });
    expect(r.action).toBe("created");
    const cfg = JSON.parse(readFileSync(userConfig, "utf-8"));
    expect(cfg.historian.opencode.model).toBe("opencode-go/muse-spark-1.2-contributor");
    expect(cfg.historian.opencode.variant).toBe("xhigh");
    expect(cfg.auto_update).toBe(true);
    // must not have index keys from array spread
    expect((cfg as Record<string, unknown>)["0"]).toBeUndefined();
    expect((cfg as Record<string, unknown>)["1"]).toBeUndefined();
    expect(Array.isArray(cfg)).toBe(false);
    rmSync(home, { recursive: true, force: true });
  });

  test("JSON-string-root file is treated as absent (fresh)", async () => {
    const home = tmpDir();
    const userConfig = path.join(home, MAGIC_CONTEXT_CONFIG_DIR, MAGIC_CONTEXT_CONFIG_FILE);
    mkdirSync(path.dirname(userConfig), { recursive: true });
    writeFileSync(userConfig, JSON.stringify("not-an-object"));
    const r = await configureMagicContext({
      dylan: { model: "opencode-go/muse-spark-1.2-contributor" },
      homeDir: home,
    });
    expect(r.action).toBe("created");
    const cfg = JSON.parse(readFileSync(userConfig, "utf-8"));
    expect(cfg.historian.opencode.model).toBe("opencode-go/muse-spark-1.2-contributor");
    expect(typeof cfg).toBe("object");
    expect(Array.isArray(cfg)).toBe(false);
    rmSync(home, { recursive: true, force: true });
  });
});
