import { test, expect, describe } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  BACKGROUND_ENV_NAME,
  EXA_ENV_NAME,
  detectBackgroundSubagentsTarget,
  detectShellKind,
  getBackgroundSubagentsBlock,
  isBackgroundSubagentsEnabled,
  isEnvBlockEnabled,
  upsertBackgroundSubagentsBlock,
  writeBackgroundSubagentsBlock,
} from "../src/background";

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "tgo-bg-"));
}

describe("background subagents helpers", () => {
  test("detects true-like environment values", () => {
    expect(isBackgroundSubagentsEnabled("true")).toBe(true);
    expect(isBackgroundSubagentsEnabled("1")).toBe(true);
    expect(isBackgroundSubagentsEnabled("yes")).toBe(true);
    expect(isBackgroundSubagentsEnabled("false")).toBe(false);
    expect(isBackgroundSubagentsEnabled("0")).toBe(false);
    expect(isBackgroundSubagentsEnabled(undefined)).toBe(false);
  });

  test("env block counts as enabled only when BOTH vars are set", () => {
    expect(
      isEnvBlockEnabled({
        [BACKGROUND_ENV_NAME]: "true",
        [EXA_ENV_NAME]: "true",
      })
    ).toBe(true);
    expect(
      isEnvBlockEnabled({ [BACKGROUND_ENV_NAME]: "true" })
    ).toBe(false);
    expect(
      isEnvBlockEnabled({ [EXA_ENV_NAME]: "true" })
    ).toBe(false);
    expect(isEnvBlockEnabled({})).toBe(false);
    expect(
      isEnvBlockEnabled({
        [BACKGROUND_ENV_NAME]: "true",
        [EXA_ENV_NAME]: "false",
      })
    ).toBe(false);
  });

  test("detects supported shell kinds", () => {
    expect(detectShellKind("/bin/zsh")).toBe("zsh");
    expect(detectShellKind("/usr/local/bin/bash")).toBe("bash");
    expect(detectShellKind("/opt/homebrew/bin/fish")).toBe("fish");
    expect(detectShellKind("/bin/sh")).toBeUndefined();
  });

  test("detects shell startup targets including fish XDG config", () => {
    expect(
      detectBackgroundSubagentsTarget({ SHELL: "/bin/zsh" })?.endsWith("/.zshrc")
    ).toBe(true);
    expect(
      detectBackgroundSubagentsTarget({ SHELL: "/bin/bash" })?.endsWith("/.bashrc")
    ).toBe(true);
    expect(
      detectBackgroundSubagentsTarget({
        SHELL: "/usr/bin/fish",
        XDG_CONFIG_HOME: "/tmp/xdg",
      })
    ).toBe("/tmp/xdg/fish/conf.d/opencode-background-subagents.fish");
  });

  test("builds shell-specific managed blocks with background + exa env", () => {
    const bash = getBackgroundSubagentsBlock("/tmp/.bashrc");
    expect(bash).toContain(`export ${BACKGROUND_ENV_NAME}=true`);
    expect(bash).toContain(`export ${EXA_ENV_NAME}=true`);
    expect(bash).toContain("# >>> tgo env >>>");
    expect(bash).toContain("# <<< tgo env <<<");
    const fish = getBackgroundSubagentsBlock("/tmp/conf.d/x.fish");
    expect(fish).toContain(`set -gx ${BACKGROUND_ENV_NAME} true`);
    expect(fish).toContain(`set -gx ${EXA_ENV_NAME} true`);
  });

  test("upserts the block idempotently — replaces not duplicates", () => {
    const block = getBackgroundSubagentsBlock("/tmp/.zshrc");
    const first = upsertBackgroundSubagentsBlock("# existing\n", block);
    const second = upsertBackgroundSubagentsBlock(first, block);
    const count = second.split(">>> tgo env").length - 1;
    expect(count).toBe(1);
  });

  test("migrates the legacy block name to the new env block", () => {
    const legacy = [
      "# mine",
      "# >>> tgo background subagents >>>",
      "export OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true",
      "# <<< tgo background subagents <<<",
      "# end",
    ].join("\n");
    const next = getBackgroundSubagentsBlock("/tmp/.zshrc");
    const updated = upsertBackgroundSubagentsBlock(legacy, next);
    expect(updated).toContain("# mine");
    expect(updated).toContain("# end");
    expect(updated).toContain("# >>> tgo env >>>");
    expect(updated).not.toContain("tgo background subagents");
    const count = updated.split(">>> tgo env").length - 1;
    expect(count).toBe(1);
  });

  test("writes a fresh file with the block", async () => {
    const dir = tmpDir();
    const target = path.join(dir, ".zshrc");
    await writeBackgroundSubagentsBlock(target);
    const content = readFileSync(target, "utf-8");
    expect(content).toContain(`export ${BACKGROUND_ENV_NAME}=true`);
    rmSync(dir, { recursive: true, force: true });
  });

  test("replaces an existing tgo block while preserving user content", async () => {
    const dir = tmpDir();
    const target = path.join(dir, ".zshrc");
    const oldBlock = getBackgroundSubagentsBlock(target);
    writeFileSync(target, `# mine\n${oldBlock}\n# end\n`);
    const next = getBackgroundSubagentsBlock(target);
    const updated = upsertBackgroundSubagentsBlock(
      readFileSync(target, "utf-8"),
      next
    );
    expect(updated).toContain("# mine");
    expect(updated).toContain("# end");
    const count = updated.split(">>> tgo env").length - 1;
    expect(count).toBe(1);
    rmSync(dir, { recursive: true, force: true });
  });
});
