import { test, expect, describe } from "bun:test";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import {
  parseFrontmatter,
  parseSeatPermission,
  preapproveExternalDirectory,
  reportSeat,
  readSeatContent,
  resolveWorktreeFamily,
} from "../src/permissions";

const agentsDir = path.resolve(__dirname, "../assets/agents");

function seat(name: string): string {
  return readFileSync(path.join(agentsDir, `${name}.md`), "utf-8");
}

describe("frontmatter parsing", () => {
  test("parses top-level fields and nested permission", () => {
    const fm = parseFrontmatter(seat("nas"));
    expect(fm.mode).toBe("subagent");
    const p = fm.permission as Record<string, unknown>;
    expect(p.edit).toBe("deny");
    expect(p.bash).toBe("deny");
    expect(p.task).toBe("deny");
    expect(p["context7_*"]).toBe("allow");
    expect(p["ctx_*"]).toBe("allow");
  });

  test("parses quoted pattern keys (tool prefixes)", () => {
    const p = parseSeatPermission(seat("dylan"));
    expect(p["aft_*"]).toBe("allow");
    expect(p["ast_grep_*"]).toBe("allow");
  });

  test("parses object rules for bash/task", () => {
    const p = parseSeatPermission(seat("bernstein"));
    const bash = p.bash as Record<string, string>;
    expect(bash["*"]).toBe("deny");
    expect(bash["bd *"]).toBeUndefined();
    const task = p.task as Record<string, string>;
    expect(task["*"]).toBe("deny");
    expect(task.dylan).toBe("allow");
  });
});

describe("permission graph — named seats", () => {
  const named = ["bernstein", "horowitz", "nas", "dylan"] as const;

  test("bernstein/horowitz/nas deny edit; all named seats deny todowrite", async () => {
    for (const name of ["bernstein", "horowitz", "nas"] as const) {
      const r = reportSeat(name, await readSeatContent(agentsDir, name));
      expect(r.editDenied, name).toBe(true);
      expect(r.todowriteDenied, name).toBe(true);
    }
  });

  test("all seats pre-allow doom_loop so retry loops never surface a prompt (tgo-5to)", async () => {
    // opencode's doom_loop guard defaults to "ask" (agent.ts:121) and fires when
    // the same tool+input repeats 3x — in test-7 Nas's denied bash calls tripped
    // it and approving only allowed that exact call, so the next attempt re-asked
    // → infinite approve loop. TGO's step caps + WATCHDOG-ABORT already bound
    // loops, so the prompt is pure friction. Seat frontmatter merges over the
    // default (agent.ts:293 Permission.merge), so doom_loop: allow wins.
    for (const name of ["bernstein", "horowitz", "nas", "dylan", "nirvana", "cobain", "grohl", "novoselic"] as const) {
      const p = parseSeatPermission(await readSeatContent(agentsDir, name));
      expect(p.doom_loop, name).toBe("allow");
    }
  });

  test("dylan is the sole writer — edit/bash freely allowed", async () => {
    const r = reportSeat("dylan", await readSeatContent(agentsDir, "dylan"));
    expect(r.editDenied).toBe(false);
    expect(r.todowriteDenied).toBe(true);
  });

  test("bernstein: denies direct file tools, allows read, delegates only to named seats", async () => {
    const r = reportSeat("bernstein", await readSeatContent(agentsDir, "bernstein"));
    expect(r.denyList).toContain("edit");
    expect(r.denyList).toContain("grep");
    expect(r.denyList).toContain("glob");
    expect(r.denyList).toContain("list");
    expect(r.readAllowed).toBe(true);
    expect(r.bashDenyAll).toBe(true);
    // Direct tool permissions and bash command permissions are separate
    // surfaces. Read-only shell glue is intentional for compound verification
    // commands; it does not grant Bernstein the direct grep/glob/list tools.
    expect(r.bashAllowed).toEqual(expect.arrayContaining(["grep *", "rg *", "find *"]));
    expect(r.taskAllowed).toEqual(
      expect.arrayContaining(["horowitz", "nas", "dylan", "nirvana"])
    );
    expect(r.taskAllowed).not.toContain("general");
  });

  test("Bernstein's direct search/listing boundary is distinct from bash inspection", async () => {
    const permission = parseSeatPermission(
      await readSeatContent(agentsDir, "bernstein")
    );
    expect(permission.edit).toBe("deny");
    expect(permission.grep).toBe("deny");
    expect(permission.glob).toBe("deny");
    expect(permission.list).toBe("deny");
    expect((permission.bash as Record<string, string>)["*"]).toBe("deny");
    expect((permission.bash as Record<string, string>)["grep *"]).toBe("allow");
  });

  test("Bernstein bash rules retain a catch-all deny around explicit segments", async () => {
    const bash = parseSeatPermission(
      await readSeatContent(agentsDir, "bernstein")
    ).bash as Record<string, string>;
    expect(bash["*"]).toBe("deny");
    expect(bash["git diff*"]).toBe("allow");
    expect(bash["bd *"]).toBeUndefined();
    expect(bash["rm *"]).toBeUndefined();
    expect(bash["git reset*"]).toBeUndefined();
  });

  test("horowitz: read-only investigate bash allowlist", async () => {
    const r = reportSeat("horowitz", await readSeatContent(agentsDir, "horowitz"));
    expect(r.editDenied).toBe(true);
    expect(r.bashDenyAll).toBe(true);
    expect(r.bashAllowed).toEqual(
      expect.arrayContaining(["git log*", "git show*", "git status*"])
    );
    expect(r.taskAllowed).toEqual(["explore"]);
  });

  test("nas: denies edit/bash/task entirely, allows context7 + MC recall", async () => {
    const r = reportSeat("nas", await readSeatContent(agentsDir, "nas"));
    expect(r.denyList).toEqual(expect.arrayContaining(["edit", "bash", "task"]));
    expect(r.toolAllowPrefixes).toEqual(
      expect.arrayContaining(["context7_*", "ctx_*"])
    );
  });

  test("horowitz: read-only investigate bash allowlist", async () => {
    const r = reportSeat("horowitz", await readSeatContent(agentsDir, "horowitz"));
    expect(r.editDenied).toBe(true);
    expect(r.bashDenyAll).toBe(true);
    expect(r.bashAllowed).toEqual(
      expect.arrayContaining(["git log*", "git show*", "git status*"])
    );
    expect(r.taskAllowed).toEqual(["explore"]);
  });

  test("horowitz allowlist covers compound read-only segments (git rev-parse/merge-base, echo)", async () => {
    const r = reportSeat("horowitz", await readSeatContent(agentsDir, "horowitz"));
    // every segment of a compound command is matched independently — the
    // reviewer must be able to run `git log && git rev-parse` and
    // `ls x && ls y || echo NO_DIST` without permission denials (tgo-zkj)
    expect(r.bashAllowed).toEqual(
      expect.arrayContaining(["git rev-parse*", "git merge-base*", "echo *"])
    );
  });

  test("horowitz allowlist covers the real review commands from test-6 (tgo-5md)", async () => {
    const r = reportSeat("horowitz", await readSeatContent(agentsDir, "horowitz"));
    // review sessions in test-6 ran git against the dnd-sheets repo from
    // ~/opencode, so `git -C <dir>` variants and git ls-files were denied;
    // shasum for pin verification and read-only bd board access were too
    expect(r.bashAllowed).toEqual(
      expect.arrayContaining([
        "git -C * log*",
        "git -C * status*",
        "git -C * diff*",
        "git -C * show*",
        "git -C * rev-parse*",
        "git -C * merge-base*",
        "git ls-files*",
        "shasum *",
        "bd show*",
        "bd list*",
        "bd ready*",
        "bd search*",
      ])
    );
  });

  test("bernstein allowlist covers the piped bd pattern (head/tail/echo)", async () => {
    const r = reportSeat("bernstein", await readSeatContent(agentsDir, "bernstein"));
    expect(r.bashAllowed).toEqual(
      expect.arrayContaining(["head *", "tail *", "echo *", "git rev-parse*"])
    );
  });

  test("horowitz allowlist includes the boolean exit-gate commands its review lane needs (test-8)", async () => {
    // test-8 review sessions were denied `bun test` 7× — Horowitz's lane is
    // running the exit gate, so tests/lint/typecheck must be allowed.
    const r = reportSeat("horowitz", await readSeatContent(agentsDir, "horowitz"));
    expect(r.bashAllowed).toEqual(
      expect.arrayContaining([
        "bun test*",
        "bun run lint*",
        "bunx tsc --noEmit*",
        "npm test*",
        "npm run lint*",
        "npx tsc --noEmit*",
      ])
    );
  });

  test("horowitz gate commands cover build + direct vitest invocation (test-9 gaps)", async () => {
    // test-9 Horowitz was denied `npm run build` (1×), `AUTH_SECRET="" npm run
    // build` (1×), and `npx vitest run` (3×) — the exit gate's build step and
    // the project's actual test runner weren't on the allowlist.
    const r = reportSeat("horowitz", await readSeatContent(agentsDir, "horowitz"));
    expect(r.bashAllowed).toEqual(
      expect.arrayContaining([
        "npm run build*",
        "bun run build*",
        "npx vitest run*",
        "bunx vitest run*",
      ])
    );
  });

  test("horowitz allowlist covers git inspection variants (test-9 gaps)", async () => {
    // test-9 Horowitz was denied `git -C <dir> ls-files` / `git -C <dir>
    // ls-tree` (3×) and `git grep` (2×) while reviewing commits.
    const r = reportSeat("horowitz", await readSeatContent(agentsDir, "horowitz"));
    expect(r.bashAllowed).toEqual(
      expect.arrayContaining([
        "git -C * ls-files*",
        "git -C * ls-tree*",
        "git grep*",
        "git -C * grep*",
      ])
    );
  });

  test("bernstein allowlist covers git show inspection (test-9 gap)", async () => {
    // test-9 the parent (Bernstein) was denied `git show 8488999 --stat` while
    // verifying a review delta.
    const r = reportSeat("bernstein", await readSeatContent(agentsDir, "bernstein"));
    expect(r.bashAllowed).toEqual(
      expect.arrayContaining(["git show*", "git -C * show*"])
    );
  });

  test("read-only seats carry stack-neutral toolchain + git inspection probes (tgo-6ef)", async () => {
    // test-10 on the Hugo theme surfaced 17 denials on the read-only seats:
    // `hugo version` / `go version` / `node -v` (toolchain probes), `git
    // worktree list`, `git branch -a`, `git ls-tree`, `git branch
    // --show-current` (worktree/branch inspection), and `sed -n` (read-only
    // file range print). All are read-only and stack-neutral — add them to both
    // bernstein + horowitz so a new stack's toolchain probing doesn't deny.
    const probes = [
      "node -v*",
      "node --version*",
      "go version*",
      "hugo version*",
      "npm --version*",
      "bun --version*",
      "python3 --version*",
      "git --version*",
      "git worktree list*",
      "git -C * worktree list*",
      "git branch -a*",
      "git -C * branch -a*",
      "git branch --show-current*",
      "git -C * branch --show-current*",
      "git ls-tree*",
      "git -C * ls-tree*",
      "sed -n*",
    ];
    const bernstein = reportSeat("bernstein", await readSeatContent(agentsDir, "bernstein"));
    const horowitz = reportSeat("horowitz", await readSeatContent(agentsDir, "horowitz"));
    expect(bernstein.bashAllowed).toEqual(expect.arrayContaining(probes));
    expect(horowitz.bashAllowed).toEqual(expect.arrayContaining(probes));
  });

  test("bernstein + horowitz allowlists cover the read-only glue commands (test-8 compound denials)", async () => {
    // test-8 compounds like `... | tail -6; echo ...; ls -la ...` were denied
    // because a non-allowed segment (ls/grep/rg/sort/which/find/cat/wc) killed
    // the whole compound. All are read-only; adding them covers the class.
    const glue = [
      "ls *",
      "cat *",
      "grep *",
      "rg *",
      "sort *",
      "find *",
      "which *",
      "wc *",
    ];
    const bernstein = reportSeat("bernstein", await readSeatContent(agentsDir, "bernstein"));
    const horowitz = reportSeat("horowitz", await readSeatContent(agentsDir, "horowitz"));
    expect(bernstein.bashAllowed).toEqual(expect.arrayContaining(glue));
    expect(horowitz.bashAllowed).toEqual(expect.arrayContaining(glue));
  });

  test("bernstein allowlist covers git -C verification variants (tgo-5md)", async () => {
    const r = reportSeat("bernstein", await readSeatContent(agentsDir, "bernstein"));
    expect(r.bashAllowed).toEqual(
      expect.arrayContaining([
        "git -C * diff*",
        "git -C * status*",
        "git -C * log*",
        "git -C * rev-parse*",
      ])
    );
  });

  test("dylan: allows edit/bash, AFT symbol tools, context7, MC recall; delegates only to explore", async () => {
    const r = reportSeat("dylan", await readSeatContent(agentsDir, "dylan"));
    expect(r.editDenied).toBe(false);
    expect(r.toolAllowPrefixes).toEqual(
      expect.arrayContaining(["aft_*", "ast_grep_*", "context7_*", "ctx_*"])
    );
    expect(r.taskAllowed).toEqual(["explore"]);
  });

  test("MC recall granted to all named seats (ctx_* allow)", async () => {
    for (const name of named) {
      const r = reportSeat(name, await readSeatContent(agentsDir, name));
      expect(r.toolAllowPrefixes, name).toContain("ctx_*");
    }
  });

  test("preapproveExternalDirectory allows sibling worktrees under the project parent (tgo-5to)", () => {
    const merged = preapproveExternalDirectory(
      { todowrite: "deny" },
      "/Users/ryan/opencode/tgo_test7"
    );
    const external = (merged.external_directory ?? {}) as Record<string, string>;
    // the wildcard crosses path separators, so it covers any sibling worktree
    // glob (e.g. /Users/ryan/opencode/tgo_test7-t4/*, tgo_test7-t7/*)
    expect(external["/Users/ryan/opencode/*"]).toBe("allow");
    expect(merged.todowrite).toBe("deny");
  });

  test("preapproveExternalDirectory preserves existing external_directory rules", () => {
    const merged = preapproveExternalDirectory(
      { external_directory: { "/tmp/*": "allow" } },
      "/Users/ryan/opencode/tgo_test7"
    );
    const external = (merged.external_directory ?? {}) as Record<string, string>;
    expect(external["/tmp/*"]).toBe("allow");
    expect(external["/Users/ryan/opencode/*"]).toBe("allow");
  });

  test("preapproveExternalDirectory is a no-op without a real worktree", () => {
    expect(preapproveExternalDirectory(undefined, undefined)).toEqual({});
    expect(preapproveExternalDirectory(undefined, "/")).toEqual({});
    const merged = preapproveExternalDirectory({ todowrite: "deny" }, undefined);
    expect(merged.todowrite).toBe("deny");
    expect((merged as { external_directory?: unknown }).external_directory).toBeUndefined();
  });

  test("resolveWorktreeFamily skips root/global candidates (test-9 TUI fallback)", () => {
    // In TUI runs project.worktree can be "/" (global project) while the plugin
    // input's own directory stays reliable. The family must resolve from the
    // first non-root candidate so the pre-approval doesn't silently no-op.
    expect(
      resolveWorktreeFamily("/", undefined, "/Users/ryan/opencode/tgo_test9")
    ).toBe("/Users/ryan/opencode/tgo_test9");
    expect(
      resolveWorktreeFamily(
        undefined,
        "/Users/ryan/opencode/tgo_test9",
        "/Users/ryan/opencode"
      )
    ).toBe("/Users/ryan/opencode/tgo_test9");
    expect(resolveWorktreeFamily("/")).toBeUndefined();
    expect(resolveWorktreeFamily(undefined, undefined, undefined)).toBeUndefined();
    expect(resolveWorktreeFamily(".", "..")).toBeUndefined();
  });

  test("preapproveExternalDirectory resolves from a fallback family (test-9 regression)", () => {
    // The full config-hook path: project.worktree is "/" (global) in the TUI,
    // but directory is reliable — pre-approval must still emit the family.
    const merged = preapproveExternalDirectory(
      { todowrite: "deny" },
      resolveWorktreeFamily("/", undefined, "/Users/ryan/opencode/tgo_test9")
    );
    const external = (merged.external_directory ?? {}) as Record<string, string>;
    expect(external["/Users/ryan/opencode/*"]).toBe("allow");
    expect(merged.todowrite).toBe("deny");
  });
});

describe("permission graph — tool-less seats", () => {
  const toolLess = ["nirvana", "cobain", "grohl", "novoselic"] as const;

  test("nirvana delegates only to its band members", async () => {
    const r = reportSeat("nirvana", await readSeatContent(agentsDir, "nirvana"));
    expect(r.taskAllowed).toEqual(["cobain", "grohl", "novoselic"]);
  });

  test("band members are fully tool-less", async () => {
    for (const name of ["cobain", "grohl", "novoselic"] as const) {
      const r = reportSeat(name, await readSeatContent(agentsDir, name));
      expect(r.allToolsDenied, name).toBe(true);
      expect(r.toolAllowPrefixes, name).toHaveLength(0);
    }
  });
});
