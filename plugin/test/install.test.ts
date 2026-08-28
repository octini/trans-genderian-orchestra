import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { buildInstallArgs } from "../src/self-update";
import {
  getBackgroundSubagentsBlock,
  upsertBackgroundSubagentsBlock,
  writeBackgroundSubagentsBlock,
} from "../src/background";

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "tgo-install-"));
}

describe("buildInstallArgs (pure helper)", () => {
  test("output shape is npm install --prefix <dir> pkg@latest with exact flags", () => {
    const args = buildInstallArgs("/tmp/cache/pkgs/foo", "trans-genderian-orchestra");
    expect(args).toEqual([
      "npm",
      "install",
      "--prefix",
      "/tmp/cache/pkgs/foo",
      "trans-genderian-orchestra@latest",
      "--save-exact",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ]);
  });

  test("pkg name is suffixed with @latest", () => {
    const args = buildInstallArgs("/some/dir", "my-pkg");
    expect(args).toContain("my-pkg@latest");
    expect(args[0]).toBe("npm");
    expect(args[1]).toBe("install");
  });

  test("different dirs produce different prefix args", () => {
    const a = buildInstallArgs("/a", "pkg");
    const b = buildInstallArgs("/b", "pkg");
    expect(a[3]).toBe("/a");
    expect(b[3]).toBe("/b");
    expect(a).not.toEqual(b);
  });
});

describe("upsertBackgroundSubagentsBlock (pure helper, marker-exact dedupe)", () => {
  test("fresh insert appends block", () => {
    const block = getBackgroundSubagentsBlock("/tmp/.zshrc");
    const next = upsertBackgroundSubagentsBlock("", block);
    expect(next).toContain("# >>> tgo env >>>");
    expect(next).toContain("# <<< tgo env <<<");
    expect(next.trim().endsWith("# <<< tgo env <<<")).toBe(true);
  });

  test("idempotent — second upsert replaces not duplicates (exact marker match)", () => {
    const block = getBackgroundSubagentsBlock("/tmp/.zshrc");
    const first = upsertBackgroundSubagentsBlock("# existing\n", block);
    const second = upsertBackgroundSubagentsBlock(first, block);
    expect(second.split("# >>> tgo env >>>").length - 1).toBe(1);
    expect(second.split("# <<< tgo env <<<").length - 1).toBe(1);
  });

  test("preserves user content before and after block", () => {
    const block = getBackgroundSubagentsBlock("/tmp/.zshrc");
    const original = "# mine\n# end\n";
    const first = upsertBackgroundSubagentsBlock(original, block);
    expect(first).toContain("# mine");
    // second insertion still preserves
    const withUser = `# head\n${first}\n# tail`;
    const second = upsertBackgroundSubagentsBlock(withUser, block);
    expect(second).toContain("# head");
    expect(second).toContain("# tail");
    expect(second.split("# >>> tgo env >>>").length - 1).toBe(1);
  });

  test("legacy markers are migrated not duplicated", () => {
    const legacy = [
      "# before",
      "# >>> tgo background subagents >>>",
      "export OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true",
      "# <<< tgo background subagents <<<",
      "# after",
    ].join("\n");
    const nextBlock = getBackgroundSubagentsBlock("/tmp/.zshrc");
    const updated = upsertBackgroundSubagentsBlock(legacy, nextBlock);
    expect(updated).toContain("# before");
    expect(updated).toContain("# after");
    expect(updated).toContain("# >>> tgo env >>>");
    expect(updated).not.toContain("tgo background subagents");
    expect(updated.split("# >>> tgo env >>>").length - 1).toBe(1);
  });

  test("using temp dirs — write and upsert round-trip", async () => {
    const dir = tmpDir();
    const target = path.join(dir, ".zshrc");
    try {
      writeFileSync(target, "# user config\n", "utf-8");
      await writeBackgroundSubagentsBlock(target);
      let content = readFileSync(target, "utf-8");
      expect(content).toContain("# user config");
      expect(content).toContain("# >>> tgo env >>>");

      // second write should not duplicate
      await writeBackgroundSubagentsBlock(target);
      content = readFileSync(target, "utf-8");
      expect(content.split("# >>> tgo env >>>").length - 1).toBe(1);

      // manual upsert with same block idempotent
      const block = getBackgroundSubagentsBlock(target);
      const again = upsertBackgroundSubagentsBlock(content, block);
      expect(again.split("# >>> tgo env >>>").length - 1).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("exact marker match — similar markers do not trigger replace", () => {
    const block = getBackgroundSubagentsBlock("/tmp/.zshrc");
    const fake = "# >>> tgo env >>> fake\nsome\n# <<< tgo env <<< fake";
    const content = `${fake}\n# real\n`;
    const next = upsertBackgroundSubagentsBlock(content, block);
    // our block markers are exact "# >>> tgo env >>>" — fake has extra " fake" so not matched
    // implementation treats exact marker indexOf, so fake markers are not recognized as valid block
    // thus it will append a real block rather than replace fake
    expect(next).toContain("# >>> tgo env >>>");
    // should have both fake and real
    expect(next).toContain("fake");
  });
});
