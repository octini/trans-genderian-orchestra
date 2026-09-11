import { describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  executeBeadsCreate,
  isCreateToolAllowed,
  CREATE_DESCRIPTION_MAX,
  CREATE_TITLE_MAX,
  type CreateToolHost,
  type CreateToolLogger,
} from "../src/create-tool";
import { lookupClaimObserved } from "../src/verify-claim";

type LogEntry = { level: string; message: string; extra?: Record<string, unknown> };

function makeLog(): { log: CreateToolLogger; entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  const log: CreateToolLogger = (level, message, extra) => {
    entries.push({ level, message, extra });
  };
  return { log, entries };
}

function hostFor(repoRoot: string, over: Partial<CreateToolHost> = {}): { host: CreateToolHost; entries: LogEntry[] } {
  const { log, entries } = makeLog();
  return {
    host: { repoRoot, isPrimary: true, allowed: true, log, ...over },
    entries,
  };
}

function bdAvailable(): boolean {
  try {
    execFileSync("bd", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function runBd(cwd: string, args: string[]): { exitCode: number; stdout: string; stderr: string } {
  const result = spawnSync("bd", args, { cwd, encoding: "utf8" });
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout?.toString() ?? "",
    stderr: result.stderr?.toString() ?? result.error?.message ?? "",
  };
}

function mustSucceed(cwd: string, args: string[]): string {
  const result = runBd(cwd, args);
  if (result.exitCode !== 0) {
    throw new Error(`bd ${args.join(" ")} failed: exit ${result.exitCode}\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}

function makeDisposable(): string {
  const directory = mkdtempSync(path.join(os.tmpdir(), "tgo-bd-probe-"));
  expect(directory).not.toBe(process.cwd());
  return directory;
}

function createStdoutFor(id: string): string {
  return JSON.stringify({
    created_at: "2026-09-11T00:00:00Z",
    created_by: "probe",
    id,
    issue_type: "task",
    priority: 2,
    status: "open",
    title: "probe",
    updated_at: "2026-09-11T00:00:00Z",
  });
}

describe("create-only primary-gated tool (Phase 2 final slice)", () => {
  test("allowed flag defaults to allowed with dev/test enable path", () => {
    const saved = process.env.TGO_BEADS_CREATE_ALLOWED;
    try {
      delete process.env.TGO_BEADS_CREATE_ALLOWED;
      expect(isCreateToolAllowed()).toBe(true);
      expect(isCreateToolAllowed(undefined)).toBe(true);
      expect(isCreateToolAllowed(false)).toBe(false);
      expect(isCreateToolAllowed(true)).toBe(true);
      process.env.TGO_BEADS_CREATE_ALLOWED = "1";
      expect(isCreateToolAllowed()).toBe(true);
    } finally {
      if (saved === undefined) delete process.env.TGO_BEADS_CREATE_ALLOWED;
      else process.env.TGO_BEADS_CREATE_ALLOWED = saved;
    }
  });

  test("injection titles/descriptions fail or ride as single argv values with zero misparsed spawn", async () => {
    const directory = makeDisposable();
    try {
      // Rejected before any spawn: empty title, over-cap fields.
      const rejected: Array<Record<string, unknown>> = [
        { title: "" },
        { title: "   " },
        { title: null },
        { title: 123 },
        { title: "x".repeat(CREATE_TITLE_MAX + 1) },
        { title: "ok", description: "x".repeat(CREATE_DESCRIPTION_MAX + 1) },
        { title: "ok", description: 123 },
      ];
      expect(rejected.length).toBeGreaterThanOrEqual(4);
      for (const args of rejected) {
        let spawns = 0;
        let lookups = 0;
        const { host, entries } = hostFor(directory, {
          spawnCreate: async () => {
            spawns++;
            throw new Error("must not spawn");
          },
          lookup: async () => {
            lookups++;
            throw new Error("must not look up");
          },
        });
        await expect(executeBeadsCreate(args, host)).rejects.toThrow(/invalid (title|description)/);
        expect(spawns).toBe(0);
        expect(lookups).toBe(0);
        expect(entries.length).toBeGreaterThan(0);
      }
      // Accepted but dangerous-looking: leading-dash, flag-shaped, and newline
      // text must ride as single `--flag=<value>` argv elements, never new flags.
      const suspicious: Array<{ title: string; description?: string }> = [
        { title: "--json" },
        { title: "-evil" },
        { title: "--title=spoof" },
        { title: "line one\nline two --json" },
        { title: "normal", description: "--json" },
        { title: "normal", description: "-d evil\n--priority=0" },
      ];
      for (const args of suspicious) {
        const seen: Array<{ args: string[]; cwd: string }> = [];
        let calls = 0;
        const { host } = hostFor(directory, {
          spawnCreate: async (spawnArgs, cwd) => {
            seen.push({ args: spawnArgs, cwd });
            return { stdout: createStdoutFor("tgo-abc1"), stderr: "" };
          },
          lookup: async () => {
            calls++;
            return { status: "open", assignee: undefined, exitCode: 0 };
          },
        });
        const result = await executeBeadsCreate({ ...args }, host);
        expect(result).toContain("created tgo-abc1");
        expect(seen).toHaveLength(1);
        expect(seen[0]!.cwd).toBe(directory);
        // Every title/description travels inside one `--flag=<value>` argv
        // element: the full argv must equal the expected shape exactly, so a
        // flag-shaped value never splits into extra parsed flags.
        const expected = ["create", `--title=${args.title.trim()}`];
        if (args.description) expected.push(`--description=${args.description}`);
        expected.push("-t", "task", "-p", "2", "--json");
        expect(seen[0]!.args).toEqual(expected);
        expect(calls).toBe(1);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("off-list type/priority reject with zero spawn", async () => {
    const directory = makeDisposable();
    try {
      const bad: Array<Record<string, unknown>> = [
        { title: "ok", type: "decision" },
        { title: "ok", type: "event" },
        { title: "ok", type: "TASK" },
        { title: "ok", type: "" },
        { title: "ok", type: "--json" },
        { title: "ok", type: 123 },
        { title: "ok", priority: "5" },
        { title: "ok", priority: "-1" },
        { title: "ok", priority: "P0" },
        { title: "ok", priority: "high" },
        { title: "ok", priority: "" },
        { title: "ok", priority: 99 },
      ];
      expect(bad.length).toBeGreaterThanOrEqual(4);
      for (const args of bad) {
        let spawns = 0;
        let lookups = 0;
        const { host } = hostFor(directory, {
          spawnCreate: async () => {
            spawns++;
            throw new Error("must not spawn");
          },
          lookup: async () => {
            lookups++;
            throw new Error("must not look up");
          },
        });
        await expect(executeBeadsCreate(args, host)).rejects.toThrow(/invalid (type|priority)/);
        expect(spawns).toBe(0);
        expect(lookups).toBe(0);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("worker-supplied path fields ignored: cwd pinned to host root, argv exact", async () => {
    const directory = makeDisposable();
    try {
      const seen: Array<{ args: string[]; cwd: string }> = [];
      const seenLookups: Array<{ issueId: unknown; repoRoot: unknown }> = [];
      const { host } = hostFor(directory, {
        spawnCreate: async (args, cwd) => {
          seen.push({ args, cwd });
          return { stdout: createStdoutFor("tgo-p1n"), stderr: "" };
        },
        lookup: async (issueId, repoRoot) => {
          seenLookups.push({ issueId, repoRoot });
          return { status: "open", assignee: undefined, exitCode: 0 };
        },
      });
      const result = await executeBeadsCreate(
        { title: "pinned", description: "body", type: "bug", priority: "1", cwd: "/evil", directory: "/evil", path: "/evil", repoRoot: "/evil", worktree: "/evil" },
        host,
      );
      expect(result).toContain("created tgo-p1n");
      expect(seen).toHaveLength(1);
      expect(seen[0]!.cwd).toBe(directory);
      expect(seen[0]!.args).toEqual([
        "create",
        "--title=pinned",
        "--description=body",
        "-t",
        "bug",
        "-p",
        "1",
        "--json",
      ]);
      expect(seenLookups).toHaveLength(1);
      expect(seenLookups[0]!.repoRoot).toBe(directory);
      expect(seenLookups[0]!.issueId).toBe("tgo-p1n");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("defaults: omitted type/priority/description spawn task/2 without description flag", async () => {
    const directory = makeDisposable();
    try {
      const seen: Array<{ args: string[]; cwd: string }> = [];
      const { host } = hostFor(directory, {
        spawnCreate: async (args, cwd) => {
          seen.push({ args, cwd });
          return { stdout: createStdoutFor("tgo-d3f"), stderr: "" };
        },
        lookup: async () => ({ status: "open", assignee: undefined, exitCode: 0 }),
      });
      const result = await executeBeadsCreate({ title: "minimal" }, host);
      expect(result).toContain("created tgo-d3f");
      expect(seen).toHaveLength(1);
      expect(seen[0]!.args).toEqual(["create", "--title=minimal", "-t", "task", "-p", "2", "--json"]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("allowed:false denies with log entry and zero spawn", async () => {
    const directory = makeDisposable();
    try {
      let spawns = 0;
      let lookups = 0;
      const { host, entries } = hostFor(directory, {
        allowed: false,
        spawnCreate: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
        lookup: async () => {
          lookups++;
          throw new Error("must not look up");
        },
      });
      await expect(executeBeadsCreate({ title: "ok" }, host)).rejects.toThrow(/allowed:false/);
      expect(spawns).toBe(0);
      expect(lookups).toBe(0);
      expect(entries.some((e) => e.level === "error" && e.message.includes("allowed:false"))).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("non-primary denied before any spawn", async () => {
    const directory = makeDisposable();
    try {
      let spawns = 0;
      let lookups = 0;
      const { host } = hostFor(directory, {
        isPrimary: false,
        spawnCreate: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
        lookup: async () => {
          lookups++;
          throw new Error("must not look up");
        },
      });
      await expect(executeBeadsCreate({ title: "ok" }, host)).rejects.toThrow(/primary-seat only/);
      expect(spawns).toBe(0);
      expect(lookups).toBe(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("empty repoRoot fails closed with zero spawn", async () => {
    const directory = makeDisposable();
    try {
      let spawns = 0;
      const { host } = hostFor("", {
        spawnCreate: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
      });
      await expect(executeBeadsCreate({ title: "ok" }, host)).rejects.toThrow(/explicit repoRoot/);
      expect(spawns).toBe(0);
      expect(directory).not.toBe(process.cwd());
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("happy create logs the ID before post-show confirms it exists", async () => {
    const directory = makeDisposable();
    try {
      const seen: Array<{ args: string[]; cwd: string }> = [];
      const logOrder: string[] = [];
      const { log, entries } = makeLog();
      const trackingLog: CreateToolLogger = (level, message, extra) => {
        logOrder.push(`${level}:${message}`);
        log(level, message, extra);
      };
      const { host } = hostFor(directory, {
        log: trackingLog,
        spawnCreate: async (args, cwd) => {
          seen.push({ args, cwd });
          return { stdout: createStdoutFor("tgo-h4ppy"), stderr: "" };
        },
        lookup: async (issueId, repoRoot) => {
          expect(repoRoot).toBe(directory);
          expect(issueId).toBe("tgo-h4ppy");
          logOrder.push("lookup:post-show");
          return { status: "open", assignee: undefined, exitCode: 0 };
        },
      });
      const result = await executeBeadsCreate({ title: "ship it", type: "feature", priority: "0" }, host);
      expect(result).toContain("created tgo-h4ppy");
      expect(result).toContain("verified by re-show");
      expect(seen).toHaveLength(1);
      expect(seen[0]!.cwd).toBe(directory);
      // ID is logged synchronously before the post-show confirm runs.
      const idLogIndex = logOrder.findIndex((line) => line.includes("tgo-h4ppy") && line.startsWith("info:"));
      const lookupIndex = logOrder.findIndex((line) => line === "lookup:post-show");
      expect(idLogIndex).toBeGreaterThanOrEqual(0);
      expect(lookupIndex).toBeGreaterThan(idLogIndex);
      expect(entries.some((e) => e.level === "info" && e.message.includes("tgo-h4ppy"))).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("missing-id stdout denies with no confirm and logged line absent", async () => {
    const directory = makeDisposable();
    try {
      let lookups = 0;
      const { host, entries } = hostFor(directory, {
        spawnCreate: async () => ({ stdout: "not json at all", stderr: "" }),
        lookup: async () => {
          lookups++;
          throw new Error("must not look up without an id");
        },
      });
      await expect(executeBeadsCreate({ title: "ok" }, host)).rejects.toThrow(/no usable issue id/);
      expect(lookups).toBe(0);
      expect(entries.some((e) => e.level === "error")).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("post-show miss fails closed (reconcile by title/time, never auto-delete)", async () => {
    const directory = makeDisposable();
    try {
      const { host, entries } = hostFor(directory, {
        spawnCreate: async () => ({ stdout: createStdoutFor("tgo-m1ss"), stderr: "" }),
        lookup: async () => ({ status: undefined, assignee: undefined, exitCode: 1, stdout: "", stderr: "no issue found" }),
      });
      await expect(executeBeadsCreate({ title: "ok" }, host)).rejects.toThrow(/post-create confirm failed.*reconcile/);
      expect(entries.some((e) => e.level === "error")).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("missing-binary write fails as tool error with no confirm lookup", async () => {
    const directory = makeDisposable();
    try {
      let lookups = 0;
      const { host, entries } = hostFor(directory, {
        spawnCreate: async () => {
          throw Object.assign(new Error("spawn bd ENOENT"), { code: "ENOENT" });
        },
        lookup: async () => {
          lookups++;
          throw new Error("must not confirm a write that never landed");
        },
      });
      await expect(executeBeadsCreate({ title: "ok" }, host)).rejects.toThrow(/write failed.*bd not found on PATH/);
      expect(lookups).toBe(0);
      expect(entries.some((e) => e.level === "error")).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  const live = bdAvailable() ? test : test.skip;

  live("happy create + ID logged + post-show confirms (real bd)", { timeout: 20_000 }, async () => {
    const directory = makeDisposable();
    try {
      mustSucceed(directory, ["init", "--non-interactive", "--skip-hooks"]);
      const { host, entries } = hostFor(directory);
      const result = await executeBeadsCreate({ title: "TGO create-tool probe", description: "probe body", type: "task", priority: "2" }, host);
      const match = result.match(/created (\S+):/);
      expect(match).not.toBeNull();
      const newId = match![1]!;
      expect(result).toContain("verified by re-show");
      expect(entries.some((e) => e.level === "info" && e.message.includes(newId))).toBe(true);
      const observed = await lookupClaimObserved(newId, directory);
      expect(observed.exitCode).toBe(0);
      expect(observed.status).toBe("open");
      expect(result).toContain(newId);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  live("wrong-cwd fails closed with no state change in the home repo", { timeout: 20_000 }, async () => {
    const repoA = makeDisposable();
    const repoB = makeDisposable();
    try {
      expect(repoA).not.toBe(repoB);
      mustSucceed(repoA, ["init", "--non-interactive", "--skip-hooks"]);
      mustSucceed(repoB, ["init", "--non-interactive", "--skip-hooks"]);
      const beforeB = mustSucceed(repoB, ["list", "--json"]);
      // Tool pointed at repoB creates in repoB only; repoA must stay empty.
      const { host } = hostFor(repoB);
      const result = await executeBeadsCreate({ title: "TGO create-tool cwd probe" }, host);
      const match = result.match(/created (\S+):/);
      expect(match).not.toBeNull();
      const newId = match![1]!;
      const homeMiss = await lookupClaimObserved(newId, repoA);
      expect(homeMiss.exitCode).not.toBe(0);
      const afterA = mustSucceed(repoA, ["list", "--json"]);
      expect(afterA.trim()).toBe("[]");
      const afterB = mustSucceed(repoB, ["list", "--json"]);
      expect(afterB).not.toBe(beforeB);
      expect(afterB).toContain(newId);
    } finally {
      rmSync(repoA, { recursive: true, force: true });
      rmSync(repoB, { recursive: true, force: true });
    }
  });
});
