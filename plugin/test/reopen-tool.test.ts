import { describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  executeBeadsReopen,
  isReopenToolAllowed,
  type ReopenToolHost,
  type ReopenToolLogger,
} from "../src/reopen-tool";
import { lookupClaimObserved } from "../src/verify-claim";

type LogEntry = { level: string; message: string; extra?: Record<string, unknown> };

function makeLog(): { log: ReopenToolLogger; entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  const log: ReopenToolLogger = (level, message, extra) => {
    entries.push({ level, message, extra });
  };
  return { log, entries };
}

function hostFor(repoRoot: string, over: Partial<ReopenToolHost> = {}): { host: ReopenToolHost; entries: LogEntry[] } {
  const { log, entries } = makeLog();
  return {
    host: { repoRoot, isPrimary: true, allowed: true, log, ...over },
    entries,
  };
}

function showStdout(bead: Record<string, unknown>): string {
  return JSON.stringify(bead);
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

function showBead(cwd: string, issueId: string): Record<string, unknown> {
  const out = mustSucceed(cwd, ["show", "--json", issueId]);
  const parsed: unknown = JSON.parse(out);
  return (Array.isArray(parsed) ? parsed[0] : parsed) as Record<string, unknown>;
}

describe("reopen-only primary-gated tool (Spec B Bernstein-operator suite)", () => {
  test("allowed flag defaults to allowed with dev/test enable path", () => {
    const saved = process.env.TGO_BEADS_REOPEN_ALLOWED;
    try {
      delete process.env.TGO_BEADS_REOPEN_ALLOWED;
      expect(isReopenToolAllowed()).toBe(true);
      expect(isReopenToolAllowed(undefined)).toBe(true);
      expect(isReopenToolAllowed(false)).toBe(false);
      expect(isReopenToolAllowed(true)).toBe(true);
      process.env.TGO_BEADS_REOPEN_ALLOWED = "1";
      expect(isReopenToolAllowed()).toBe(true);
    } finally {
      if (saved === undefined) delete process.env.TGO_BEADS_REOPEN_ALLOWED;
      else process.env.TGO_BEADS_REOPEN_ALLOWED = saved;
    }
  });

  test("injection rejects: malformed ids fail validation with zero spawn", async () => {
    const directory = makeDisposable();
    try {
      const badIds: unknown[] = [
        "bd-1; id",
        "$(id)",
        "bd-1 --json",
        "",
        "   ",
        "-evil",
        "--reopen",
        "bd-1\nid",
        123,
        null,
      ];
      expect(badIds.length).toBeGreaterThanOrEqual(4);
      for (const bad of badIds) {
        let spawns = 0;
        let lookups = 0;
        const { host, entries } = hostFor(directory, {
          spawnReopen: async () => {
            spawns++;
            throw new Error("must not spawn");
          },
          lookup: async () => {
            lookups++;
            throw new Error("must not look up");
          },
        });
        await expect(executeBeadsReopen({ issueId: bad }, host)).rejects.toThrow(/invalid issueId/);
        expect(spawns).toBe(0);
        expect(lookups).toBe(0);
        expect(entries.length).toBeGreaterThan(0);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("worker-supplied path fields ignored: single pinned cwd for lookups+spawn, argv exact", async () => {
    const directory = makeDisposable();
    try {
      const seenSpawn: Array<{ args: string[]; cwd: string }> = [];
      const seenLookups: Array<{ issueId: unknown; repoRoot: unknown }> = [];
      let calls = 0;
      const { host } = hostFor(directory, {
        spawnReopen: async (args, cwd) => {
          seenSpawn.push({ args, cwd });
          return { stdout: "", stderr: "" };
        },
        lookup: async (issueId, repoRoot) => {
          seenLookups.push({ issueId, repoRoot });
          calls++;
          if (calls === 1) return { status: "closed", assignee: undefined, exitCode: 0, stdout: showStdout({ id: "tgo-abc", status: "closed" }), stderr: "" };
          return { status: "open", assignee: undefined, exitCode: 0, stdout: showStdout({ id: "tgo-abc", status: "open" }), stderr: "" };
        },
      });
      const result = await executeBeadsReopen(
        { issueId: "tgo-abc", cwd: "/evil", directory: "/evil", path: "/evil", repoRoot: "/evil" },
        host,
      );
      expect(result).toContain("reopened tgo-abc");
      expect(seenSpawn).toHaveLength(1);
      expect(seenSpawn[0]!.cwd).toBe(directory);
      expect(seenSpawn[0]!.args).toEqual(["reopen", "tgo-abc"]);
      expect(seenLookups).toHaveLength(2);
      for (const seen of seenLookups) {
        expect(seen.repoRoot).toBe(directory);
        expect(seen.issueId).toBe("tgo-abc");
      }
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
        spawnReopen: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
        lookup: async () => {
          lookups++;
          throw new Error("must not look up");
        },
      });
      await expect(executeBeadsReopen({ issueId: "tgo-abc" }, host)).rejects.toThrow(/allowed:false/);
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
        spawnReopen: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
        lookup: async () => {
          lookups++;
          throw new Error("must not look up");
        },
      });
      await expect(executeBeadsReopen({ issueId: "tgo-abc" }, host)).rejects.toThrow(/primary-seat only/);
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
        spawnReopen: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
      });
      await expect(executeBeadsReopen({ issueId: "tgo-abc" }, host)).rejects.toThrow(/explicit repoRoot/);
      expect(spawns).toBe(0);
      expect(directory).not.toBe(process.cwd());
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("missing issue denied with zero write-spawn", async () => {
    const directory = makeDisposable();
    try {
      let spawns = 0;
      let lookups = 0;
      const { host } = hostFor(directory, {
        spawnReopen: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
        lookup: async () => {
          lookups++;
          return { status: undefined, assignee: undefined, exitCode: 1, stderr: "no issue" };
        },
      });
      await expect(executeBeadsReopen({ issueId: "tgo-missing" }, host)).rejects.toThrow(/pre-reopen lookup failed/);
      expect(spawns).toBe(0);
      expect(lookups).toBe(1);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("already-open returns a logged no-op with zero spawn", async () => {
    const directory = makeDisposable();
    try {
      let spawns = 0;
      let lookups = 0;
      const { host, entries } = hostFor(directory, {
        spawnReopen: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
        lookup: async () => {
          lookups++;
          return { status: "open", assignee: undefined, exitCode: 0, stdout: showStdout({ id: "tgo-abc", status: "open" }), stderr: "" };
        },
      });
      const result = await executeBeadsReopen({ issueId: "tgo-abc" }, host);
      expect(result).toContain("already open tgo-abc");
      expect(result).toContain("no-op");
      expect(spawns).toBe(0);
      expect(lookups).toBe(1);
      expect(entries.some((e) => e.level === "info" && e.message.includes("already open"))).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("in_progress denied explicitly with zero spawn, claim intact", async () => {
    const directory = makeDisposable();
    try {
      let spawns = 0;
      let lookups = 0;
      const { host, entries } = hostFor(directory, {
        spawnReopen: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
        lookup: async () => {
          lookups++;
          return { status: "in_progress", assignee: "someone", exitCode: 0, stdout: showStdout({ id: "tgo-abc", status: "in_progress", assignee: "someone" }), stderr: "" };
        },
      });
      await expect(executeBeadsReopen({ issueId: "tgo-abc" }, host)).rejects.toThrow(/in_progress.*demote|demote.*claim|claim.*intact/i);
      expect(spawns).toBe(0);
      expect(lookups).toBe(1);
      expect(entries.length).toBeGreaterThan(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("non-closed other status denied with zero spawn", async () => {
    const directory = makeDisposable();
    try {
      let spawns = 0;
      const { host } = hostFor(directory, {
        spawnReopen: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
        lookup: async () => ({ status: "blocked", assignee: undefined, exitCode: 0, stdout: showStdout({ id: "tgo-abc", status: "blocked" }), stderr: "" }),
      });
      await expect(executeBeadsReopen({ issueId: "tgo-abc" }, host)).rejects.toThrow(/only closed issues may be reopened/);
      expect(spawns).toBe(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("missing-binary write fails as tool error with reads intact, no post lookup", async () => {
    const directory = makeDisposable();
    try {
      let lookups = 0;
      const { host, entries } = hostFor(directory, {
        lookup: async (issueId, repoRoot) => {
          lookups++;
          expect(repoRoot).toBe(directory);
          expect(issueId).not.toBe("/evil");
          return { status: "closed", assignee: undefined, exitCode: 0, stdout: showStdout({ id: "tgo-abc", status: "closed" }), stderr: "" };
        },
        spawnReopen: async () => {
          throw Object.assign(new Error("spawn bd ENOENT"), { code: "ENOENT" });
        },
      });
      await expect(executeBeadsReopen({ issueId: "tgo-abc" }, host)).rejects.toThrow(/write failed.*bd not found on PATH/);
      expect(lookups).toBe(1);
      expect(entries.some((e) => e.level === "error")).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("post-verify fail-closed: still-closed post denies with no state claim", async () => {
    const directory = makeDisposable();
    try {
      let spawns = 0;
      let calls = 0;
      const { host } = hostFor(directory, {
        spawnReopen: async () => {
          spawns++;
          return { stdout: "", stderr: "" };
        },
        lookup: async () => {
          calls++;
          return { status: "closed", assignee: undefined, exitCode: 0, stdout: showStdout({ id: "tgo-abc", status: "closed" }), stderr: "" };
        },
      });
      await expect(executeBeadsReopen({ issueId: "tgo-abc" }, host)).rejects.toThrow(/unverified/);
      expect(spawns).toBe(1);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  const live = bdAvailable() ? test : test.skip;

  live("happy closed→open + post confirm via real bd", { timeout: 20_000 }, async () => {
    const directory = makeDisposable();
    try {
      mustSucceed(directory, ["init", "--non-interactive", "--skip-hooks"]);
      const created = JSON.parse(mustSucceed(directory, ["create", "TGO reopen-tool probe", "-t", "task", "-p", "2", "--json"])) as { id: string };
      mustSucceed(directory, ["close", created.id, "--reason", "done"]);
      expect(showBead(directory, created.id).status).toBe("closed");
      const { host, entries } = hostFor(directory);
      const result = await executeBeadsReopen({ issueId: created.id }, host);
      expect(result).toContain(`reopened ${created.id}`);
      expect(result).toContain("verified by re-show");
      expect(entries.some((e) => e.level === "info" && e.message.includes("reopen observed"))).toBe(true);
      expect(showBead(directory, created.id).status).toBe("open");
      // Read intact via the shared lookup path.
      const show = await lookupClaimObserved(created.id, directory);
      expect(show.exitCode).toBe(0);
      expect(show.status).toBe("open");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  live("live open is a zero-spawn no-op", { timeout: 20_000 }, async () => {
    const directory = makeDisposable();
    try {
      mustSucceed(directory, ["init", "--non-interactive", "--skip-hooks"]);
      const created = JSON.parse(mustSucceed(directory, ["create", "TGO reopen-tool open probe", "-t", "task", "-p", "2", "--json"])) as { id: string };
      let spawns = 0;
      const { host } = hostFor(directory, {
        spawnReopen: async () => {
          spawns++;
          throw new Error("must not spawn for already-open");
        },
      });
      const result = await executeBeadsReopen({ issueId: created.id }, host);
      expect(result).toContain("already open");
      expect(spawns).toBe(0);
      expect(showBead(directory, created.id).status).toBe("open");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  live("live in_progress denial leaves the claim intact", { timeout: 20_000 }, async () => {
    const directory = makeDisposable();
    try {
      mustSucceed(directory, ["init", "--non-interactive", "--skip-hooks"]);
      const created = JSON.parse(mustSucceed(directory, ["create", "TGO reopen-tool claim probe", "-t", "task", "-p", "2", "--json"])) as { id: string };
      mustSucceed(directory, ["update", created.id, "--claim"]);
      const before = showBead(directory, created.id);
      expect(before.status).toBe("in_progress");
      let spawns = 0;
      const { host } = hostFor(directory, {
        spawnReopen: async () => {
          spawns++;
          throw new Error("must not demote a live claim");
        },
      });
      await expect(executeBeadsReopen({ issueId: created.id }, host)).rejects.toThrow(/in_progress/);
      expect(spawns).toBe(0);
      const after = showBead(directory, created.id);
      expect(after.status).toBe("in_progress");
      expect(after.assignee ?? (after as { owner?: unknown }).owner).toBe(before.assignee ?? (before as { owner?: unknown }).owner);
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
      const created = JSON.parse(mustSucceed(repoA, ["create", "TGO reopen-tool cwd probe", "-t", "task", "-p", "2", "--json"])) as { id: string };
      mustSucceed(repoA, ["close", created.id, "--reason", "done"]);
      let spawns = 0;
      const { host } = hostFor(repoB, {
        spawnReopen: async () => {
          spawns++;
          throw new Error("must not write to the wrong repo");
        },
      });
      await expect(executeBeadsReopen({ issueId: created.id }, host)).rejects.toThrow();
      expect(spawns).toBe(0);
      expect(showBead(repoA, created.id).status).toBe("closed");
    } finally {
      rmSync(repoA, { recursive: true, force: true });
      rmSync(repoB, { recursive: true, force: true });
    }
  });
});
