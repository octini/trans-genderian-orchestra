import { describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  UPDATE_DESCRIPTION_MAX,
  UPDATE_TITLE_MAX,
  UPDATE_TYPES,
  executeBeadsUpdate,
  isUpdateToolAllowed,
  type UpdateToolHost,
  type UpdateToolLogger,
} from "../src/update-tool";
import { lookupClaimObserved } from "../src/verify-claim";

type LogEntry = { level: string; message: string; extra?: Record<string, unknown> };

function makeLog(): { log: UpdateToolLogger; entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  const log: UpdateToolLogger = (level, message, extra) => {
    entries.push({ level, message, extra });
  };
  return { log, entries };
}

function hostFor(repoRoot: string, over: Partial<UpdateToolHost> = {}): { host: UpdateToolHost; entries: LogEntry[] } {
  const { log, entries } = makeLog();
  return {
    host: { repoRoot, isPrimary: true, allowed: true, log, ...over },
    entries,
  };
}

function showStdout(bead: Record<string, unknown>): string {
  return JSON.stringify(bead);
}

function openLookup(bead: Record<string, unknown>) {
  return async () => ({ status: "open", assignee: undefined, exitCode: 0, stdout: showStdout(bead), stderr: "" });
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
  const bead = (Array.isArray(parsed) ? parsed[0] : parsed) as Record<string, unknown>;
  return bead;
}

describe("update-only primary-gated tool (Spec A Bernstein-operator suite)", () => {
  test("allowed flag defaults to allowed with dev/test enable path", () => {
    const saved = process.env.TGO_BEADS_UPDATE_ALLOWED;
    try {
      delete process.env.TGO_BEADS_UPDATE_ALLOWED;
      expect(isUpdateToolAllowed()).toBe(true);
      expect(isUpdateToolAllowed(undefined)).toBe(true);
      expect(isUpdateToolAllowed(false)).toBe(false);
      expect(isUpdateToolAllowed(true)).toBe(true);
      process.env.TGO_BEADS_UPDATE_ALLOWED = "1";
      expect(isUpdateToolAllowed()).toBe(true);
    } finally {
      if (saved === undefined) delete process.env.TGO_BEADS_UPDATE_ALLOWED;
      else process.env.TGO_BEADS_UPDATE_ALLOWED = saved;
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
        "--claim",
        "bd-1\nid",
        123,
        null,
      ];
      expect(badIds.length).toBeGreaterThanOrEqual(4);
      for (const bad of badIds) {
        let spawns = 0;
        let lookups = 0;
        const { host, entries } = hostFor(directory, {
          spawnUpdate: async () => {
            spawns++;
            throw new Error("must not spawn");
          },
          lookup: async () => {
            lookups++;
            throw new Error("must not look up");
          },
        });
        await expect(executeBeadsUpdate({ issueId: bad, title: "x" }, host)).rejects.toThrow(/invalid issueId/);
        expect(spawns).toBe(0);
        expect(lookups).toBe(0);
        expect(entries.length).toBeGreaterThan(0);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("bad fields denied before any spawn: empty/over-cap/off-list/unset", async () => {
    expect(UPDATE_TYPES).toContain("task");
    expect(UPDATE_TITLE_MAX).toBe(200);
    expect(UPDATE_DESCRIPTION_MAX).toBe(2000);
    const directory = makeDisposable();
    try {
      const badArgs: Array<Record<string, unknown>> = [
        { issueId: "tgo-abc" },
        { issueId: "tgo-abc", title: "" },
        { issueId: "tgo-abc", title: "   " },
        { issueId: "tgo-abc", title: "x".repeat(UPDATE_TITLE_MAX + 1) },
        { issueId: "tgo-abc", title: 123 },
        { issueId: "tgo-abc", description: "x".repeat(UPDATE_DESCRIPTION_MAX + 1) },
        { issueId: "tgo-abc", description: 123 },
        { issueId: "tgo-abc", type: "bogus" },
        { issueId: "tgo-abc", type: "" },
        { issueId: "tgo-abc", type: 123 },
        { issueId: "tgo-abc", priority: "P1" },
        { issueId: "tgo-abc", priority: "5" },
        { issueId: "tgo-abc", priority: "" },
        { issueId: "tgo-abc", priority: "high" },
      ];
      expect(badArgs.length).toBeGreaterThanOrEqual(4);
      for (const args of badArgs) {
        let spawns = 0;
        let lookups = 0;
        const { host, entries } = hostFor(directory, {
          spawnUpdate: async () => {
            spawns++;
            throw new Error("must not spawn");
          },
          lookup: async () => {
            lookups++;
            throw new Error("must not look up");
          },
        });
        await expect(executeBeadsUpdate(args, host)).rejects.toThrow(/no fields to edit|invalid (title|description|type|priority)/);
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
      const bead = { id: "tgo-abc", title: "New title", description: "New desc", priority: 1, issue_type: "bug", status: "open" };
      const { host } = hostFor(directory, {
        spawnUpdate: async (args, cwd) => {
          seenSpawn.push({ args, cwd });
          return { stdout: "", stderr: "" };
        },
        lookup: async (issueId, repoRoot) => {
          seenLookups.push({ issueId, repoRoot });
          return { status: "open", assignee: undefined, exitCode: 0, stdout: showStdout(bead), stderr: "" };
        },
      });
      const result = await executeBeadsUpdate(
        { issueId: "tgo-abc", title: "New title", description: "New desc", priority: 1, type: "bug", cwd: "/evil", directory: "/evil", path: "/evil", repoRoot: "/evil" },
        host,
      );
      expect(result).toContain("updated tgo-abc");
      expect(seenSpawn).toHaveLength(1);
      expect(seenSpawn[0]!.cwd).toBe(directory);
      expect(seenSpawn[0]!.args).toEqual([
        "update",
        "tgo-abc",
        "--title=New title",
        "--description=New desc",
        "--priority=1",
        "--type=bug",
      ]);
      expect(seenLookups).toHaveLength(2);
      for (const seen of seenLookups) {
        expect(seen.repoRoot).toBe(directory);
        expect(seen.issueId).toBe("tgo-abc");
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("title-only edit strips to provided fields", async () => {
    const directory = makeDisposable();
    try {
      const seenSpawn: Array<{ args: string[]; cwd: string }> = [];
      const bead = { id: "tgo-abc", title: "Solo", description: "", priority: 2, issue_type: "task", status: "open" };
      const { host } = hostFor(directory, {
        spawnUpdate: async (args, cwd) => {
          seenSpawn.push({ args, cwd });
          return { stdout: "", stderr: "" };
        },
        lookup: openLookup(bead),
      });
      const result = await executeBeadsUpdate({ issueId: "tgo-abc", title: "Solo" }, host);
      expect(result).toContain("edited title");
      expect(seenSpawn[0]!.args).toEqual(["update", "tgo-abc", "--title=Solo"]);
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
        spawnUpdate: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
        lookup: async () => {
          lookups++;
          throw new Error("must not look up");
        },
      });
      await expect(executeBeadsUpdate({ issueId: "tgo-abc", title: "x" }, host)).rejects.toThrow(/allowed:false/);
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
        spawnUpdate: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
        lookup: async () => {
          lookups++;
          throw new Error("must not look up");
        },
      });
      await expect(executeBeadsUpdate({ issueId: "tgo-abc", title: "x" }, host)).rejects.toThrow(/primary-seat only/);
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
        spawnUpdate: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
      });
      await expect(executeBeadsUpdate({ issueId: "tgo-abc", title: "x" }, host)).rejects.toThrow(/explicit repoRoot/);
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
        spawnUpdate: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
        lookup: async () => {
          lookups++;
          return { status: undefined, assignee: undefined, exitCode: 1, stderr: "no issue" };
        },
      });
      await expect(executeBeadsUpdate({ issueId: "tgo-missing", title: "x" }, host)).rejects.toThrow(/pre-update lookup failed/);
      expect(spawns).toBe(0);
      expect(lookups).toBe(1);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("closed issue refused with reopen hint and zero spawn", async () => {
    const directory = makeDisposable();
    try {
      let spawns = 0;
      let lookups = 0;
      const { host, entries } = hostFor(directory, {
        spawnUpdate: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
        lookup: async () => {
          lookups++;
          return { status: "closed", assignee: undefined, exitCode: 0, stdout: showStdout({ id: "tgo-abc", status: "closed" }), stderr: "" };
        },
      });
      await expect(executeBeadsUpdate({ issueId: "tgo-abc", title: "x" }, host)).rejects.toThrow(/closed.*reopen first/);
      expect(spawns).toBe(0);
      expect(lookups).toBe(1);
      expect(entries.length).toBeGreaterThan(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("missing-binary write fails as tool error with reads intact, no post lookup", async () => {
    const directory = makeDisposable();
    try {
      let lookups = 0;
      const bead = { id: "tgo-abc", title: "T", description: "", priority: 2, issue_type: "task", status: "open" };
      const { host, entries } = hostFor(directory, {
        lookup: async (issueId, repoRoot) => {
          lookups++;
          expect(repoRoot).toBe(directory);
          expect(issueId).not.toBe("/evil");
          return { status: "open", assignee: undefined, exitCode: 0, stdout: showStdout(bead), stderr: "" };
        },
        spawnUpdate: async () => {
          throw Object.assign(new Error("spawn bd ENOENT"), { code: "ENOENT" });
        },
      });
      await expect(executeBeadsUpdate({ issueId: "tgo-abc", title: "T" }, host)).rejects.toThrow(/write failed.*bd not found on PATH/);
      expect(lookups).toBe(1);
      expect(entries.some((e) => e.level === "error")).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("post-verify fail-closed: nonzero post exit denies with no state claim", async () => {
    const directory = makeDisposable();
    try {
      let spawns = 0;
      let calls = 0;
      const { host } = hostFor(directory, {
        spawnUpdate: async () => {
          spawns++;
          return { stdout: "", stderr: "" };
        },
        lookup: async () => {
          calls++;
          if (calls === 1) return { status: "open", assignee: undefined, exitCode: 0, stdout: showStdout({ id: "tgo-abc", status: "open" }), stderr: "" };
          return { status: undefined, assignee: undefined, exitCode: 1, stderr: "boom" };
        },
      });
      await expect(executeBeadsUpdate({ issueId: "tgo-abc", title: "T" }, host)).rejects.toThrow(/unverified/);
      expect(spawns).toBe(1);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("post-verify fail-closed: field mismatch denies", async () => {
    const directory = makeDisposable();
    try {
      let calls = 0;
      const { host } = hostFor(directory, {
        spawnUpdate: async () => ({ stdout: "", stderr: "" }),
        lookup: async () => {
          calls++;
          if (calls === 1) return { status: "open", assignee: undefined, exitCode: 0, stdout: showStdout({ id: "tgo-abc", status: "open" }), stderr: "" };
          return { status: "open", assignee: undefined, exitCode: 0, stdout: showStdout({ id: "tgo-abc", title: "stale", status: "open" }), stderr: "" };
        },
      });
      await expect(executeBeadsUpdate({ issueId: "tgo-abc", title: "T" }, host)).rejects.toThrow(/unverified/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  const live = bdAvailable() ? test : test.skip;

  live("happy field edit + post confirm via real bd", { timeout: 20_000 }, async () => {
    const directory = makeDisposable();
    try {
      mustSucceed(directory, ["init", "--non-interactive", "--skip-hooks"]);
      const created = JSON.parse(mustSucceed(directory, ["create", "TGO update-tool probe", "-t", "task", "-p", "2", "--json"])) as { id: string };
      const { host, entries } = hostFor(directory);
      const result = await executeBeadsUpdate({ issueId: created.id, title: "TGO update-tool edited", priority: "1", type: "bug" }, host);
      expect(result).toContain(`updated ${created.id}`);
      expect(result).toContain("verified by re-show");
      expect(entries.some((e) => e.level === "info" && e.message.includes("update observed"))).toBe(true);
      const bead = showBead(directory, created.id);
      expect(bead.title).toBe("TGO update-tool edited");
      expect(String(bead.priority)).toBe("1");
      expect(bead.issue_type).toBe("bug");
      // Read intact via the shared lookup path.
      const show = await lookupClaimObserved(created.id, directory);
      expect(show.exitCode).toBe(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  live("live closed-refusal leaves the closed issue untouched", { timeout: 20_000 }, async () => {
    const directory = makeDisposable();
    try {
      mustSucceed(directory, ["init", "--non-interactive", "--skip-hooks"]);
      const created = JSON.parse(mustSucceed(directory, ["create", "TGO update-tool closed probe", "-t", "task", "-p", "2", "--json"])) as { id: string };
      mustSucceed(directory, ["close", created.id, "--reason", "done"]);
      let spawns = 0;
      const { host } = hostFor(directory, {
        spawnUpdate: async () => {
          spawns++;
          throw new Error("must not mutate closed");
        },
      });
      await expect(executeBeadsUpdate({ issueId: created.id, title: "mutate attempt" }, host)).rejects.toThrow(/reopen first/);
      expect(spawns).toBe(0);
      const bead = showBead(directory, created.id);
      expect(bead.status).toBe("closed");
      expect(bead.title).toBe("TGO update-tool closed probe");
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
      const created = JSON.parse(mustSucceed(repoA, ["create", "TGO update-tool cwd probe", "-t", "task", "-p", "2", "--json"])) as { id: string };
      let spawns = 0;
      const { host } = hostFor(repoB, {
        spawnUpdate: async () => {
          spawns++;
          throw new Error("must not write to the wrong repo");
        },
      });
      await expect(executeBeadsUpdate({ issueId: created.id, title: "wrong repo edit" }, host)).rejects.toThrow();
      expect(spawns).toBe(0);
      expect(showBead(repoA, created.id).title).toBe("TGO update-tool cwd probe");
    } finally {
      rmSync(repoA, { recursive: true, force: true });
      rmSync(repoB, { recursive: true, force: true });
    }
  });
});
