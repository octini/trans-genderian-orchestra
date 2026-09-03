import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { reconcileSeats } from "../src/seat-sync";
import { foldHouseStyle, loadVoiceCard } from "../src/build";
import { renderFold } from "../src/voices";

function tmpDir(prefix = "tgo-seat-sync-"): string {
  return mkdtempSync(path.join(os.tmpdir(), prefix));
}

function templateWithSteps(steps: number, bodyExtra = ""): string {
  return `---\ndescription: test seat\nsteps: ${steps}\n---\n{{TGO_HOUSE_STYLE}}\nbody ${bodyExtra}\n`;
}

async function getFold(): Promise<string> {
  const card = await loadVoiceCard("default");
  return renderFold(card);
}

describe("seat-sync", () => {
  test("differing frontmatter → rewritten, .bak contains old content, summary reports exact steps change", async () => {
    const assets = tmpDir("assets-");
    const installed = tmpDir("installed-");
    try {
      const fold = await getFold();
      // assets template has steps 100 (new)
      writeFileSync(path.join(assets, "dylan.md"), templateWithSteps(100), "utf-8");
      // installed has rendered old content with steps 20
      const oldTemplate = templateWithSteps(20);
      const oldRendered = foldHouseStyle(oldTemplate, fold);
      mkdirSync(installed, { recursive: true });
      writeFileSync(path.join(installed, "dylan.md"), oldRendered, "utf-8");

      const expectedRendered = foldHouseStyle(templateWithSteps(100), fold);
      const summary = await reconcileSeats(assets, installed, () => {}, "default");

      expect(readFileSync(path.join(installed, "dylan.md"), "utf-8")).toBe(expectedRendered);
      const bakPath = path.join(installed, "dylan.md.bak");
      expect(existsSync(bakPath)).toBe(true);
      expect(readFileSync(bakPath, "utf-8")).toBe(oldRendered);
      expect(summary).toEqual(["dylan (steps 20→100)"]);
    } finally {
      rmSync(assets, { recursive: true, force: true });
      rmSync(installed, { recursive: true, force: true });
    }
  });

  test("identical rendered → no write, no .bak churn", async () => {
    const assets = tmpDir("assets-");
    const installed = tmpDir("installed-");
    try {
      const fold = await getFold();
      const tmpl = templateWithSteps(100, "same");
      writeFileSync(path.join(assets, "dylan.md"), tmpl, "utf-8");
      const rendered = foldHouseStyle(tmpl, fold);
      writeFileSync(path.join(installed, "dylan.md"), rendered, "utf-8");
      const statBefore = statSync(path.join(installed, "dylan.md")).mtimeMs;
      await new Promise((r) => setTimeout(r, 10));
      const summary = await reconcileSeats(assets, installed, () => {}, "default");
      expect(summary.length).toBe(0);
      expect(readFileSync(path.join(installed, "dylan.md"), "utf-8")).toBe(rendered);
      expect(existsSync(path.join(installed, "dylan.md.bak"))).toBe(false);
      const statAfter = statSync(path.join(installed, "dylan.md")).mtimeMs;
      expect(statAfter).toBe(statBefore);
    } finally {
      rmSync(assets, { recursive: true, force: true });
      rmSync(installed, { recursive: true, force: true });
    }
  });

  test("missing installed file → created via render pipeline", async () => {
    const assets = tmpDir("assets-");
    const installed = tmpDir("installed-");
    try {
      const fold = await getFold();
      const tmpl = templateWithSteps(100);
      writeFileSync(path.join(assets, "dylan.md"), tmpl, "utf-8");
      const summary = await reconcileSeats(assets, installed, () => {}, "default");
      const expected = foldHouseStyle(tmpl, fold);
      expect(existsSync(path.join(installed, "dylan.md"))).toBe(true);
      expect(readFileSync(path.join(installed, "dylan.md"), "utf-8")).toBe(expected);
      expect(existsSync(path.join(installed, "dylan.md.bak"))).toBe(false);
      expect(summary).toEqual(["dylan (steps →100)"]);
    } finally {
      rmSync(assets, { recursive: true, force: true });
      rmSync(installed, { recursive: true, force: true });
    }
  });

  test("missing target dir → recursive mkdir and create", async () => {
    const assets = tmpDir("assets-");
    const base = tmpDir("base-");
    try {
      const fold = await getFold();
      const tmpl = templateWithSteps(60);
      writeFileSync(path.join(assets, "nas.md"), tmpl, "utf-8");
      const missingDir = path.join(base, "nested", "agent");
      // ensure it doesn't exist
      expect(existsSync(missingDir)).toBe(false);
      const summary = await reconcileSeats(assets, missingDir, () => {}, "default");
      const expected = foldHouseStyle(tmpl, fold);
      expect(existsSync(path.join(missingDir, "nas.md"))).toBe(true);
      expect(readFileSync(path.join(missingDir, "nas.md"), "utf-8")).toBe(expected);
      expect(summary).toEqual(["nas (steps →60)"]);
    } finally {
      rmSync(assets, { recursive: true, force: true });
      rmSync(base, { recursive: true, force: true });
    }
  });

  test("unreadable installed dir → no throw", async () => {
    const assets = tmpDir("assets-");
    const tmp = tmpDir("tmp-");
    try {
      writeFileSync(path.join(assets, "dylan.md"), templateWithSteps(100), "utf-8");
      const fileAsDir = path.join(tmp, "file-as-dir");
      writeFileSync(fileAsDir, "not a dir", "utf-8");
      const throwingLog = () => {
        throw new Error("logger boom");
      };
      let threw = false;
      try {
        const summary = await reconcileSeats(assets, fileAsDir, throwingLog as unknown as (level: string, msg: string) => void, "default");
        expect(Array.isArray(summary)).toBe(true);
      } catch {
        threw = true;
      }
      expect(threw).toBe(false);

      const summary2 = await reconcileSeats(assets, fileAsDir, () => {}, "default");
      expect(Array.isArray(summary2)).toBe(true);
    } finally {
      rmSync(assets, { recursive: true, force: true });
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("fold content carries banned-tell vocabulary via default card", async () => {
    const assets = tmpDir("assets-");
    const installed = tmpDir("installed-");
    try {
      const fold = await getFold();
      // ensure fold contains banned vocabulary so rendered seats inherit it
      expect(fold).toContain("utilize");
      expect(fold).toContain("seamless");
      expect(fold).toContain("Banned tells");
      const tmpl = templateWithSteps(10, "hello");
      writeFileSync(path.join(assets, "dylan.md"), tmpl, "utf-8");
      const summary = await reconcileSeats(assets, installed, () => {}, "default");
      const rendered = readFileSync(path.join(installed, "dylan.md"), "utf-8");
      expect(rendered).toContain("Banned tells");
      expect(rendered).toContain("utilize");
      expect(summary.length).toBe(1);
    } finally {
      rmSync(assets, { recursive: true, force: true });
      rmSync(installed, { recursive: true, force: true });
    }
  });
});
