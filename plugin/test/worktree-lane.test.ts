import { describe, test, expect } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import {
  worktreeBranchForIssue,
  worktreePathForIssue,
  isPathInsideWorktree,
  extractFilePathFromArgs,
  shouldBlockOutsideWorktree,
  isBashCommandOutsideWorktree,
  ensureWorktreeExists,
  buildWorktreeViolationMessage,
  isValidLane,
} from "../src/worktree-lane";
import { validateDelegationPacket } from "../src/delegation";
import type { RoutingClassification } from "../src/fit";
import { TgoPlugin } from "../src/plugin";
import { isValidBeadID } from "../src/def-snapshot";

function tmpDir(prefix = "tgo-wt-"): string {
  return mkdtempSync(path.join(os.tmpdir(), prefix));
}

const standard: RoutingClassification = { route: "standard", tiny: false, reasons: [] };

describe("worktree lane helpers", () => {
  test("worktreeBranchForIssue validates and formats", () => {
    expect(worktreeBranchForIssue("tgo-123")).toBe("tgo/tgo-123-lane");
    expect(worktreeBranchForIssue("tgo-bh0")).toBe("tgo/tgo-bh0-lane");
    expect(() => worktreeBranchForIssue("../../evil")).toThrow(/VALID_BEAD_ID/);
    expect(() => worktreeBranchForIssue("")).toThrow(/VALID_BEAD_ID/);
    expect(() => worktreeBranchForIssue("tgo/bad")).toThrow(/VALID_BEAD_ID/);
  });

  test("worktreePathForIssue sibling construction", () => {
    const repo = "/tmp/repo";
    expect(worktreePathForIssue(repo, "tgo-123")).toBe(path.join("/tmp", "tgo-123-lane"));
    expect(worktreePathForIssue("/Users/ryan/opencode/tgo", "tgo-bh0")).toBe(path.join("/Users/ryan/opencode", "tgo-bh0-lane"));
    expect(() => worktreePathForIssue(repo, "../evil")).toThrow(/VALID_BEAD_ID/);
  });

  test("isPathInsideWorktree handles absolute and relative", () => {
    const wt = "/tmp/tgo-123-lane";
    const repo = "/tmp/repo";
    // absolute inside
    expect(isPathInsideWorktree("/tmp/tgo-123-lane/src/foo.ts", wt, repo)).toBe(true);
    expect(isPathInsideWorktree("/tmp/tgo-123-lane", wt, repo)).toBe(true);
    // absolute outside (main repo)
    expect(isPathInsideWorktree("/tmp/repo/src/foo.ts", wt, repo)).toBe(false);
    expect(isPathInsideWorktree("/tmp/other/file.ts", wt, repo)).toBe(false);
    // relative inside (resolved against worktree)
    expect(isPathInsideWorktree("src/foo.ts", wt, repo)).toBe(true);
    expect(isPathInsideWorktree("plugin/src/foo.ts", wt, repo)).toBe(true);
    // relative escaping via ../
    expect(isPathInsideWorktree("../repo/src/foo.ts", wt, repo)).toBe(false);
    expect(isPathInsideWorktree("../../etc/passwd", wt, repo)).toBe(false);
    // edge: sibling file with similar prefix not inside
    expect(isPathInsideWorktree("/tmp/tgo-123-lane2/file.ts", wt, repo)).toBe(false);
  });

  test("extractFilePathFromArgs", () => {
    expect(extractFilePathFromArgs("edit", { filePath: "/tmp/foo.ts" })).toBe("/tmp/foo.ts");
    expect(extractFilePathFromArgs("write", { path: "src/bar.ts" })).toBe("src/bar.ts");
    expect(extractFilePathFromArgs("read", { filePath: "a.ts" })).toBe("a.ts"); // read also has path but we still extract
    expect(extractFilePathFromArgs("bash", { command: "ls" })).toBeUndefined();
    expect(extractFilePathFromArgs("edit", {})).toBeUndefined();
    expect(extractFilePathFromArgs("edit", null)).toBeUndefined();
  });

  test("shouldBlockOutsideWorktree — edit/write", () => {
    const wt = "/tmp/tgo-123-lane";
    const repo = "/tmp/repo";
    // Inside worktree → not blocked
    expect(shouldBlockOutsideWorktree({ tool: "edit", args: { filePath: "/tmp/tgo-123-lane/src/foo.ts" }, worktreePath: wt, repoRoot: repo }).block).toBe(false);
    expect(shouldBlockOutsideWorktree({ tool: "edit", args: { filePath: "src/foo.ts" }, worktreePath: wt, repoRoot: repo }).block).toBe(false);
    // Outside worktree absolute → blocked
    const outside = shouldBlockOutsideWorktree({ tool: "edit", args: { filePath: "/tmp/repo/src/foo.ts" }, worktreePath: wt, repoRoot: repo });
    expect(outside.block).toBe(true);
    expect(outside.target).toBe("/tmp/repo/src/foo.ts");
    // Relative escaping → blocked
    expect(shouldBlockOutsideWorktree({ tool: "write", args: { filePath: "../repo/src/foo.ts" }, worktreePath: wt, repoRoot: repo }).block).toBe(true);
    // No file path → not blocked (read-only)
    expect(shouldBlockOutsideWorktree({ tool: "edit", args: {}, worktreePath: wt, repoRoot: repo }).block).toBe(false);
    expect(shouldBlockOutsideWorktree({ tool: "bash", args: { command: "echo hi" }, worktreePath: wt, repoRoot: repo }).block).toBe(false);
  });

  test("isBashCommandOutsideWorktree detects absolute outside", () => {
    const wt = "/tmp/tgo-123-lane";
    const repo = "/tmp/repo";
    // Bash without absolute path → not outside
    expect(isBashCommandOutsideWorktree("bun test", wt, repo)).toBe(false);
    expect(isBashCommandOutsideWorktree("git status", wt, repo)).toBe(false);
    // Bash with absolute path inside repo but outside worktree → outside
    expect(isBashCommandOutsideWorktree("cat /tmp/repo/src/foo.ts", wt, repo)).toBe(true);
    expect(isBashCommandOutsideWorktree("ls /tmp/repo/plugin", wt, repo)).toBe(true);
    // Bash with absolute path inside worktree → not outside
    expect(isBashCommandOutsideWorktree("cat /tmp/tgo-123-lane/src/foo.ts", wt, repo)).toBe(false);
    // Bash with worktree path → not outside
    expect(isBashCommandOutsideWorktree("ls /tmp/tgo-123-lane", wt, repo)).toBe(false);
    // Bash with unrelated absolute path not under repo → not outside (not repo-contained)
    expect(isBashCommandOutsideWorktree("cat /etc/passwd", wt, repo)).toBe(false);
  });

  test("buildWorktreeViolationMessage contains corrective text and path", () => {
    const msg = buildWorktreeViolationMessage({ sessionID: "ses_abc", tool: "edit", target: "/tmp/repo/src/foo.ts", worktreePath: "/tmp/tgo-123-lane", issueId: "tgo-123" });
    expect(msg.toLowerCase()).toContain("run inside your worktree at /tmp/tgo-123-lane".toLowerCase());
    expect(msg).toContain("/tmp/repo/src/foo.ts");
    expect(msg).toContain("ses_abc");
    expect(msg).toContain("lane=worktree");
  });

  test("isValidLane", () => {
    expect(isValidLane("worktree")).toBe(true);
    expect(isValidLane("inline")).toBe(true);
    expect(isValidLane("other")).toBe(false);
    expect(isValidLane(undefined)).toBe(false);
    expect(isValidLane("")).toBe(false);
  });
});

describe("delegation lane validation", () => {
  const base = {
    Objective: "Do work",
    Files: ["src/a.ts"],
    Interfaces: "keep",
    Constraints: "none",
    Verification: "run tests",
    exitGate: true,
    issueId: "tgo-123",
    issueStatusObserved: "in_progress",
    issueAssigneeObserved: "tester",
    claimExitCode: 0,
    delegationId: "d-1",
    beadsOperator: "Bernstein",
  };
  test("absent lane → valid", () => {
    const r = validateDelegationPacket(standard as any, { ...base });
    expect(r.valid).toBe(true);
    expect(r.malformed).not.toContain("lane");
  });
  test("lane worktree → valid", () => {
    const r = validateDelegationPacket(standard as any, { ...base, lane: "worktree" });
    expect(r.valid).toBe(true);
  });
  test("lane inline → valid", () => {
    const r = validateDelegationPacket(standard as any, { ...base, lane: "inline" });
    expect(r.valid).toBe(true);
  });
  test("lane invalid string → invalid", () => {
    const r = validateDelegationPacket(standard as any, { ...base, lane: "other" });
    expect(r.valid).toBe(false);
    expect(r.malformed).toContain("lane");
    expect(r.diagnostics.join(" ")).toContain('lane must be');
  });
  test("lane number → invalid", () => {
    const r = validateDelegationPacket(standard as any, { ...base, lane: 123 });
    expect(r.valid).toBe(false);
    expect(r.malformed).toContain("lane");
  });
});

describe("ensureWorktreeExists idempotency with mocks", () => {
  test("creates when missing, returns created:true, second call returns created:false", async () => {
    const dir = tmpDir();
    const repoRoot = path.join(dir, "repo");
    await fs.mkdir(repoRoot, { recursive: true });
    const issueId = "tgo-xyz";
    const worktreePath = worktreePathForIssue(repoRoot, issueId);
    let gitCalls: string[][] = [];
    const runGit = async (args: string[], cwd: string) => {
      gitCalls.push(args);
      if (args[0] === "git" && args[1] === "show-ref") {
        // branch does not exist
        return { exitCode: 1, stdout: "", stderr: "not found" };
      }
      if (args[0] === "git" && args[1] === "branch" && args[2] === "--list") {
        return { exitCode: 0, stdout: "", stderr: "" };
      }
      if (args[0] === "git" && args[1] === "worktree" && args[2] === "add") {
        // simulate successful worktree add by creating directory
        await fs.mkdir(worktreePath, { recursive: true });
        await fs.writeFile(path.join(worktreePath, ".git"), "gitdir: /tmp/fake", "utf-8");
        return { exitCode: 0, stdout: "", stderr: "" };
      }
      return { exitCode: 0, stdout: "", stderr: "" };
    };
    const exists = async (p: string) => {
      try { await fs.stat(p); return true; } catch { return false; }
    };
    // First call should create
    gitCalls = [];
    const res1 = await ensureWorktreeExists({ repoRoot, issueId, runGit, exists });
    expect(res1.created).toBe(true);
    expect(res1.worktreePath).toBe(worktreePath);
    expect(res1.branch).toBe("tgo/tgo-xyz-lane");
    expect(gitCalls.some((a) => a.includes("worktree") && a.includes("add"))).toBe(true);
    // Second call should be idempotent — no git worktree add, just exists check
    gitCalls = [];
    const res2 = await ensureWorktreeExists({ repoRoot, issueId, runGit, exists });
    expect(res2.created).toBe(false);
    expect(res2.worktreePath).toBe(worktreePath);
    // No worktree add on second
    expect(gitCalls.filter((a) => a.includes("worktree") && a.includes("add")).length).toBe(0);
    rmSync(dir, { recursive: true, force: true });
  });

  test("existing worktree respects idempotency even if runGit would fail", async () => {
    const dir = tmpDir();
    const repoRoot = path.join(dir, "repo");
    await fs.mkdir(repoRoot, { recursive: true });
    const issueId = "tgo-abc";
    const worktreePath = worktreePathForIssue(repoRoot, issueId);
    await fs.mkdir(worktreePath, { recursive: true });
    const runGit = async () => {
      throw new Error("should not be called when exists");
    };
    const exists = async (p: string) => {
      try { await fs.stat(p); return true; } catch { return false; }
    };
    const res = await ensureWorktreeExists({ repoRoot, issueId, runGit: runGit as any, exists });
    expect(res.created).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });

  test("validates issueId before path construction", async () => {
    const dir = tmpDir();
    await expect(ensureWorktreeExists({ repoRoot: dir, issueId: "../../evil", runGit: async () => ({ exitCode: 0, stdout: "", stderr: "" }), exists: async () => false })).rejects.toThrow(/VALID_BEAD_ID/);
    await expect(ensureWorktreeExists({ repoRoot: dir, issueId: "tgo/bad", runGit: async () => ({ exitCode: 0, stdout: "", stderr: "" }), exists: async () => false })).rejects.toThrow(/VALID_BEAD_ID/);
    rmSync(dir, { recursive: true, force: true });
  });

  test("branch exists path uses without -b", async () => {
    const dir = tmpDir();
    const repoRoot = path.join(dir, "repo");
    await fs.mkdir(repoRoot, { recursive: true });
    const issueId = "tgo-exist";
    const worktreePath = worktreePathForIssue(repoRoot, issueId);
    let lastArgs: string[] | undefined;
    const runGit = async (args: string[], cwd: string) => {
      if (args[1] === "show-ref") return { exitCode: 0, stdout: "exists", stderr: "" };
      if (args[1] === "worktree" && args[2] === "add") {
        lastArgs = args;
        await fs.mkdir(worktreePath, { recursive: true });
        return { exitCode: 0, stdout: "", stderr: "" };
      }
      return { exitCode: 0, stdout: "", stderr: "" };
    };
    const exists = async (p: string) => { try { await fs.stat(p); return true; } catch { return false; } };
    const res = await ensureWorktreeExists({ repoRoot, issueId, runGit, exists });
    expect(res.created).toBe(true);
    expect(lastArgs).toBeDefined();
    expect(lastArgs!.includes("-b")).toBe(false);
    expect(lastArgs!.includes("tgo/tgo-exist-lane")).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("worktree lane matrix — plugin hook enforcement", () => {
  function basePacket(overrides: Record<string, unknown> = {}) {
    return {
      Objective: "Do work",
      Files: ["src/a.ts"],
      Interfaces: "keep",
      Constraints: "none",
      Verification: "run tests",
      exitGate: true,
      issueId: "tgo-123",
      issueStatusObserved: "in_progress",
      issueAssigneeObserved: "tester",
      claimExitCode: 0,
      delegationId: "d-1",
      beadsOperator: "Bernstein",
      ...overrides,
    };
  }

  function baseInput(overrides: Record<string, unknown> = {}) {
    return {
      client: {
        app: { log: async () => ({}) },
        session: {
          get: async ({ path }: { path: { id: string } }) => ({
            data: path.id === "primary" ? { parentID: null } : path.id.startsWith("ses_") ? { parentID: "primary" } : { parentID: null },
          }),
          abort: async () => {},
          prompt: async () => {},
          messages: async () => [],
        },
      },
      $: (() => {}) as never,
      project: { worktree: "/tmp/repo" },
      directory: "/tmp/repo",
      worktree: "/tmp/repo",
      ...overrides,
    } as never;
  }

  test("lane unset → zero interference (bypass)", async () => {
    const hooks = await TgoPlugin(baseInput(), {});
    const before = hooks["tool.execute.before"]!;
    // No lane set anywhere — edit outside should NOT be blocked
    await expect(before({ sessionID: "ses_unrelated", callID: "c1", tool: "edit" } as never, { args: { filePath: "/tmp/repo/src/outside.ts" } } as never)).resolves.toBeUndefined();
    // Bash outside also not blocked when lane unset
    await expect(before({ sessionID: "ses_unrelated", callID: "c2", tool: "bash" } as never, { args: { command: "cat /tmp/repo/src/foo.ts" } } as never)).resolves.toBeUndefined();
    // Even delegated session without lane should bypass
    await expect(before({ sessionID: "ses_delegated_no_lane", callID: "c3", tool: "edit" } as never, { args: { filePath: "/tmp/repo/src/foo.ts" } } as never)).resolves.toBeUndefined();
  });

  test("lane=worktree outside worktree → auto-create + context rewrite + blocked outside / pass inside", async () => {
    // Use a real temp git repo for realistic auto-create
    const tmpParent = tmpDir("tgo-wt-matrix-");
    const repoRoot = path.join(tmpParent, "repo");
    await fs.mkdir(repoRoot, { recursive: true });
    // Init git repo
    const { spawn } = await import("node:child_process");
    const run = (args: string[], cwd: string) => new Promise<{ exitCode: number }>((resolve) => {
      const child = spawn(args[0], args.slice(1), { cwd });
      child.on("close", (code) => resolve({ exitCode: code ?? 1 }));
      child.on("error", () => resolve({ exitCode: 1 }));
    });
    await run(["git", "init"], repoRoot);
    await run(["git", "config", "user.email", "test@test.com"], repoRoot);
    await run(["git", "config", "user.name", "Test"], repoRoot);
    await fs.writeFile(path.join(repoRoot, "README.md"), "# test", "utf-8");
    await run(["git", "add", "."], repoRoot);
    await run(["git", "commit", "-m", "init"], repoRoot);

    const hooks = await TgoPlugin(baseInput({ directory: repoRoot, worktree: repoRoot, project: { worktree: repoRoot } }), {});
    const before = hooks["tool.execute.before"]!;
    const after = hooks["tool.execute.after"]!;

    // Parent delegates with lane=worktree
    const packet = basePacket({ lane: "worktree", issueId: "tgo-123" });
    const taskArgs = { subagent_type: "dylan", delegationPacket: packet, touchSet: ["src/a.ts"] } as unknown as Record<string, unknown>;
    await before({ sessionID: "primary", callID: "c-task", tool: "task" } as never, { args: taskArgs } as never);

    // Simulate after hook capturing child session
    const childId = "ses_child123";
    await after(
      { sessionID: "primary", callID: "c-task", tool: "task", args: taskArgs } as never,
      { output: "done", metadata: { sessionId: childId } } as never,
    );

    const worktreePath = worktreePathForIssue(repoRoot, "tgo-123");
    // After capture, worktree should have been auto-created (eager)
    // Give a moment for async ensure (it is awaited in after, so should be done)
    expect(existsSync(worktreePath)).toBe(true);

    // Mutation attempt outside worktree → blocked with corrective text
    const outsidePath = path.join(repoRoot, "src/a.ts");
    await expect(before({ sessionID: childId, callID: "c-edit-out", tool: "edit" } as never, { args: { filePath: outsidePath } } as never)).rejects.toThrow(/run inside your worktree at/i);
    await expect(before({ sessionID: childId, callID: "c-edit-out", tool: "edit" } as never, { args: { filePath: outsidePath } } as never)).rejects.toThrow(worktreePath);

    // Bash with outside absolute path also blocked
    await expect(before({ sessionID: childId, callID: "c-bash-out", tool: "bash" } as never, { args: { command: `cat ${outsidePath}` } } as never)).rejects.toThrow(/run inside your worktree at/i);

    // Inside worktree → pass
    const insidePath = path.join(worktreePath, "src/a.ts");
    await expect(before({ sessionID: childId, callID: "c-edit-in", tool: "edit" } as never, { args: { filePath: insidePath } } as never)).resolves.toBeUndefined();
    // Relative path considered inside after rewrite
    await expect(before({ sessionID: childId, callID: "c-edit-rel", tool: "edit" } as never, { args: { filePath: "src/a.ts" } } as never)).resolves.toBeUndefined();
    // Bash without outside path should pass inside lane
    await expect(before({ sessionID: childId, callID: "c-bash-in", tool: "bash" } as never, { args: { command: "bun test" } } as never)).resolves.toBeUndefined();
    // Bash with inside path should pass
    await expect(before({ sessionID: childId, callID: "c-bash-in2", tool: "bash" } as never, { args: { command: `cat ${insidePath}` } } as never)).resolves.toBeUndefined();

    // Lane=inline should NOT enforce (zero overhead path for inline)
    const packetInline = basePacket({ lane: "inline", issueId: "tgo-124" });
    const taskArgsInline = { subagent_type: "dylan", delegationPacket: packetInline, touchSet: ["src/a.ts"] } as unknown as Record<string, unknown>;
    await before({ sessionID: "primary", callID: "c-task2", tool: "task" } as never, { args: taskArgsInline } as never);
    await after(
      { sessionID: "primary", callID: "c-task2", tool: "task", args: taskArgsInline } as never,
      { output: "done", metadata: { sessionId: "ses_inline123" } } as never,
    );
    // Inline lane should not block outside edits (behave like lane unset)
    await expect(before({ sessionID: "ses_inline123", callID: "c-inline-out", tool: "edit" } as never, { args: { filePath: outsidePath } } as never)).resolves.toBeUndefined();

    // Cleanup worktree
    try {
      await new Promise<{ exitCode: number }>((resolve) => {
        const child = spawn("git", ["worktree", "remove", "--force", worktreePath], { cwd: repoRoot });
        child.on("close", (code) => resolve({ exitCode: code ?? 1 }));
        child.on("error", () => resolve({ exitCode: 1 }));
      });
    } catch {}
    rmSync(tmpParent, { recursive: true, force: true });
  });

  test("lane unset does not create worktree (zero overhead)", async () => {
    const tmpParent = tmpDir("tgo-wt-zero-");
    const repoRoot = path.join(tmpParent, "repo");
    await fs.mkdir(repoRoot, { recursive: true });
    const { spawn } = await import("node:child_process");
    const run = (args: string[], cwd: string) => new Promise<void>((resolve) => {
      const child = spawn(args[0], args.slice(1), { cwd });
      child.on("close", () => resolve());
      child.on("error", () => resolve());
    });
    await run(["git", "init"], repoRoot);
    const hooks = await TgoPlugin(baseInput({ directory: repoRoot, worktree: repoRoot, project: { worktree: repoRoot } }), {});
    const before = hooks["tool.execute.before"]!;
    // Call many times with no lane — should not attempt git worktree add, should be fast
    const start = Date.now();
    for (let i = 0; i < 20; i++) {
      await before({ sessionID: `ses_no_lane${i}`, callID: `c${i}`, tool: "edit" } as never, { args: { filePath: "/tmp/repo/src/foo.ts" } } as never);
    }
    const elapsed = Date.now() - start;
    // Should be fast (<500ms) implying zero overhead (no git calls)
    expect(elapsed).toBeLessThan(500);
    // No worktree should have been created for arbitrary issue
    expect(existsSync(path.join(tmpParent, "tgo-123-lane"))).toBe(false);
    rmSync(tmpParent, { recursive: true, force: true });
  });
});
