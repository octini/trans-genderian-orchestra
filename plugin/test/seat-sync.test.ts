import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { reconcileSeats } from "../src/seat-sync";

function tmpDir(prefix = "tgo-seat-sync-"): string {
  return mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeSeat(dir: string, name: string, steps: number, extra = ""): string {
  const content = `---\ndescription: test seat\nsteps: ${steps}\n---\nbody ${name} ${extra}\n`;
  mkdirSync(dir, { recursive: true });
  const p = path.join(dir, `${name}.md`);
  writeFileSync(p, content, "utf-8");
  return content;
}

describe("seat-sync", () => {
  test("differing frontmatter → rewritten, .bak contains old content, summary reports the seat", async () => {
    const assets = tmpDir("assets-");
    const installed = tmpDir("installed-");
    try {
      const assetContent = writeSeat(assets, "dylan", 100);
      const oldContent = writeSeat(installed, "dylan", 20);
      const summary = await reconcileSeats(assets, installed, () => {});
      const installedContent = readFileSync(path.join(installed, "dylan.md"), "utf-8");
      expect(installedContent).toBe(assetContent);
      const bakPath = path.join(installed, "dylan.md.bak");
      expect(existsSync(bakPath)).toBe(true);
      expect(readFileSync(bakPath, "utf-8")).toBe(oldContent);
      expect(summary.join(" ")).toContain("dylan");
      // should report steps change 20→100
      expect(summary.join(" ")).toContain("20");
      expect(summary.join(" ")).toContain("100");
    } finally {
      rmSync(assets, { recursive: true, force: true });
      rmSync(installed, { recursive: true, force: true });
    }
  });

  test("identical → file untouched (content + no .bak created)", async () => {
    const assets = tmpDir("assets-");
    const installed = tmpDir("installed-");
    try {
      const content = writeSeat(assets, "dylan", 100, "same");
      writeFileSync(path.join(installed, "dylan.md"), content, "utf-8");
      const statBefore = statSync(path.join(installed, "dylan.md")).mtimeMs;
      // small delay to ensure mtime would change if rewritten
      await new Promise((r) => setTimeout(r, 10));
      const summary = await reconcileSeats(assets, installed, () => {});
      expect(summary.length).toBe(0);
      expect(readFileSync(path.join(installed, "dylan.md"), "utf-8")).toBe(content);
      expect(existsSync(path.join(installed, "dylan.md.bak"))).toBe(false);
      const statAfter = statSync(path.join(installed, "dylan.md")).mtimeMs;
      expect(statAfter).toBe(statBefore);
    } finally {
      rmSync(assets, { recursive: true, force: true });
      rmSync(installed, { recursive: true, force: true });
    }
  });

  test("missing installed file → created", async () => {
    const assets = tmpDir("assets-");
    const installed = tmpDir("installed-");
    try {
      const assetContent = writeSeat(assets, "dylan", 100);
      // installed dir exists but file missing
      const summary = await reconcileSeats(assets, installed, () => {});
      expect(existsSync(path.join(installed, "dylan.md"))).toBe(true);
      expect(readFileSync(path.join(installed, "dylan.md"), "utf-8")).toBe(assetContent);
      expect(existsSync(path.join(installed, "dylan.md.bak"))).toBe(false);
      expect(summary.join(" ")).toContain("dylan");
    } finally {
      rmSync(assets, { recursive: true, force: true });
      rmSync(installed, { recursive: true, force: true });
    }
  });

  test("unreadable installed dir → no throw", async () => {
    const assets = tmpDir("assets-");
    const tmp = tmpDir("tmp-");
    try {
      writeSeat(assets, "dylan", 100);
      // make installed path a file, not a directory, so mkdir/read will fail to treat it as dir
      const fileAsDir = path.join(tmp, "file-as-dir");
      writeFileSync(fileAsDir, "not a dir", "utf-8");
      const throwingLog = () => {
        throw new Error("logger boom");
      };
      // should not throw despite unreadable dir and throwing logger
      let threw = false;
      try {
        const summary = await reconcileSeats(assets, fileAsDir, throwingLog as unknown as (level: string, msg: string) => void);
        expect(Array.isArray(summary)).toBe(true);
      } catch {
        threw = true;
      }
      expect(threw).toBe(false);

      // also test with normal logger and unreadable dir
      const summary2 = await reconcileSeats(assets, fileAsDir, () => {});
      expect(Array.isArray(summary2)).toBe(true);
    } finally {
      rmSync(assets, { recursive: true, force: true });
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
