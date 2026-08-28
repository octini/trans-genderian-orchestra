import { test, expect, describe } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { progressPath, readProgress, writeProgress } from "../src/progress";

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "tgo-progress-"));
}

describe("progress path-boundary validation", () => {
  test("progressPath rejects traversal ids", () => {
    for (const bad of ["../../evil", "tgo/bad"]) {
      expect(() => progressPath("/tmp/repo", bad)).toThrow(/VALID_BEAD_ID/);
    }
  });
  test("readProgress rejects traversal ids", async () => {
    for (const bad of ["../../evil", "tgo/bad"]) {
      await expect(readProgress("/tmp/repo", bad)).rejects.toThrow(/VALID_BEAD_ID/);
    }
  });
  test("writeProgress rejects traversal ids", async () => {
    for (const bad of ["../../evil", "tgo/bad"]) {
      await expect(writeProgress("/tmp/repo", bad, "content")).rejects.toThrow(/VALID_BEAD_ID/);
    }
  });
});

describe("writeProgress regression tgo-30d", () => {
  test("fresh foreign lock: pre-create lock with current mtime and content someone-else → returns false and lock preserved", async () => {
    const dir = tmpDir();
    try {
      const issueId = "tgo-lock-a";
      const issueDir = path.join(dir, ".tgo", issueId);
      await fs.mkdir(issueDir, { recursive: true });
      const lockPath = path.join(issueDir, "progress.lock");
      await fs.writeFile(lockPath, "someone-else", "utf-8");
      // Ensure mtime is current (fresh) — not stale
      const now = new Date();
      await fs.utimes(lockPath, now, now);

      const result = await writeProgress(dir, issueId, "new content");
      expect(result).toBe(false);

      // lock file must still exist with original content
      const still = await fs.readFile(lockPath, "utf-8");
      expect(still).toBe("someone-else");
      // also verify file still present via stat
      const stat = await fs.stat(lockPath);
      expect(stat.isFile()).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("writeProgress with non-string repoRoot (e.g. 123 as any) → returns false, does not throw", async () => {
    let threw = false;
    let result: boolean | undefined;
    try {
      result = await writeProgress(123 as any, "tgo-1", "hello");
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(result).toBe(false);

    // also ensure promise resolves without rejection
    await expect(writeProgress(123 as any, "tgo-2", "hello")).resolves.toBe(false);
  });
});
