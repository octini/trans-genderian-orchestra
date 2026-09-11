import { describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  DEP_TYPE_ALLOWLIST,
  executeBeadsDep,
  isDepToolAllowed,
  type DepToolHost,
  type DepToolLogger,
} from "../src/dep-tool";
import { lookupClaimObserved } from "../src/verify-claim";

type LogEntry = { level: string; message: string; extra?: Record<string, unknown> };

function makeLog(): { log: DepToolLogger; entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  const log: DepToolLogger = (level, message, extra) => {
    entries.push({ level, message, extra });
  };
  return { log, entries };
}

function hostFor(repoRoot: string, over: Partial<DepToolHost> = {}): { host: DepToolHost; entries: LogEntry[] } {
  const { log, entries } = makeLog();
  return {
    host: { repoRoot, isPrimary: true, allowed: true, log, ...over },
    entries,
  };
}

function okLookup() {
  return async () => ({ status: "open", assignee: undefined, exitCode: 0 });
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

function depListIds(cwd: string, issueId: string): Array<{ id: string; dependency_type?: string }> {
  const out = mustSucceed(cwd, ["dep", "list", issueId, "--json"]);
  return JSON.parse(out) as Array<{ id: string; dependency_type?: string }>;
}

describe("dep-only primary-gated tool (Spec A Bernstein-operator suite)", () => {
  test("allowed flag defaults to allowed with dev/test enable path", () => {
    const saved = process.env.TGO_BEADS_DEP_ALLOWED;
    try {
      delete process.env.TGO_BEADS_DEP_ALLOWED;
      expect(isDepToolAllowed()).toBe(true);
      expect(isDepToolAllowed(undefined)).toBe(true);
      expect(isDepToolAllowed(false)).toBe(false);
      expect(isDepToolAllowed(true)).toBe(true);
      process.env.TGO_BEADS_DEP_ALLOWED = "1";
      expect(isDepToolAllowed()).toBe(true);
    } finally {
      if (saved === undefined) delete process.env.TGO_BEADS_DEP_ALLOWED;
      else process.env.TGO_BEADS_DEP_ALLOWED = saved;
    }
  });

  test("injection rejects: malformed ids either side fail validation with zero spawn", async () => {
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
        for (const args of [{ issueId: bad, dependsOnId: "tgo-abc" }, { issueId: "tgo-abc", dependsOnId: bad }]) {
          let spawns = 0;
          let lookups = 0;
          let lists = 0;
          const { host, entries } = hostFor(directory, {
            spawnDep: async () => {
              spawns++;
              throw new Error("must not spawn");
            },
            lookup: async () => {
              lookups++;
              throw new Error("must not look up");
            },
            listDeps: async () => {
              lists++;
              throw new Error("must not list");
            },
          });
          await expect(executeBeadsDep(args as Record<string, unknown>, host)).rejects.toThrow(/invalid (issueId|dependsOnId)/);
          expect(spawns).toBe(0);
          expect(lookups).toBe(0);
          expect(lists).toBe(0);
          expect(entries.length).toBeGreaterThan(0);
        }
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("off-list type denied before any spawn; allowlist covers skills-emitted types", async () => {
    expect(DEP_TYPE_ALLOWLIST).toContain("blocks");
    expect(DEP_TYPE_ALLOWLIST).toContain("discovered-from");
    const directory = makeDisposable();
    try {
      let spawns = 0;
      let lookups = 0;
      const { host, entries } = hostFor(directory, {
        spawnDep: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
        lookup: async () => {
          lookups++;
          throw new Error("must not look up");
        },
      });
      await expect(
        executeBeadsDep({ issueId: "tgo-abc", dependsOnId: "tgo-def", type: "bogus" }, host),
      ).rejects.toThrow(/invalid type/);
      expect(spawns).toBe(0);
      expect(lookups).toBe(0);
      expect(entries.length).toBeGreaterThan(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("worker-supplied path fields ignored: single pinned cwd for lookups+spawn+list, argv exact", async () => {
    const directory = makeDisposable();
    try {
      const seenSpawn: Array<{ args: string[]; cwd: string }> = [];
      const seenLookups: Array<{ issueId: unknown; repoRoot: unknown }> = [];
      const seenLists: Array<{ issueId: string; cwd: string }> = [];
      const { host } = hostFor(directory, {
        spawnDep: async (args, cwd) => {
          seenSpawn.push({ args, cwd });
          return { stdout: "", stderr: "" };
        },
        lookup: async (issueId, repoRoot) => {
          seenLookups.push({ issueId, repoRoot });
          return { status: "open", assignee: undefined, exitCode: 0 };
        },
        listDeps: async (issueId, cwd) => {
          seenLists.push({ issueId, cwd });
          return { exitCode: 0, deps: [{ id: "tgo-def", dependency_type: "blocks" }] };
        },
      });
      const result = await executeBeadsDep(
        { issueId: "tgo-abc", dependsOnId: "tgo-def", cwd: "/evil", directory: "/evil", path: "/evil", repoRoot: "/evil" },
        host,
      );
      expect(result).toContain("wired tgo-abc depends on tgo-def");
      expect(seenSpawn).toHaveLength(1);
      expect(seenSpawn[0]!.cwd).toBe(directory);
      expect(seenSpawn[0]!.args).toEqual(["dep", "add", "tgo-abc", "tgo-def"]);
      expect(seenLookups).toHaveLength(2);
      for (const seen of seenLookups) expect(seen.repoRoot).toBe(directory);
      expect(seenLists).toHaveLength(1);
      expect(seenLists[0]).toEqual({ issueId: "tgo-abc", cwd: directory });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("explicit type passes --type flag through", async () => {
    const directory = makeDisposable();
    try {
      const seenSpawn: Array<{ args: string[]; cwd: string }> = [];
      const { host } = hostFor(directory, {
        spawnDep: async (args, cwd) => {
          seenSpawn.push({ args, cwd });
          return { stdout: "", stderr: "" };
        },
        lookup: okLookup(),
        listDeps: async () => ({ exitCode: 0, deps: [{ id: "tgo-def", dependency_type: "discovered-from" }] }),
      });
      const result = await executeBeadsDep(
        { issueId: "tgo-abc", dependsOnId: "tgo-def", type: "discovered-from" },
        host,
      );
      expect(result).toContain("type discovered-from");
      expect(seenSpawn[0]!.args).toEqual(["dep", "add", "tgo-abc", "tgo-def", "--type", "discovered-from"]);
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
        spawnDep: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
        lookup: async () => {
          lookups++;
          throw new Error("must not look up");
        },
      });
      await expect(executeBeadsDep({ issueId: "tgo-abc", dependsOnId: "tgo-def" }, host)).rejects.toThrow(/allowed:false/);
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
        spawnDep: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
        lookup: async () => {
          lookups++;
          throw new Error("must not look up");
        },
      });
      await expect(executeBeadsDep({ issueId: "tgo-abc", dependsOnId: "tgo-def" }, host)).rejects.toThrow(/primary-seat only/);
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
        spawnDep: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
      });
      await expect(executeBeadsDep({ issueId: "tgo-abc", dependsOnId: "tgo-def" }, host)).rejects.toThrow(/explicit repoRoot/);
      expect(spawns).toBe(0);
      expect(directory).not.toBe(process.cwd());
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("missing endpoint denied with zero write-spawn (either side)", async () => {
    const directory = makeDisposable();
    try {
      // Missing from-side: only one lookup runs before deny.
      {
        let spawns = 0;
        let lookups = 0;
        const { host } = hostFor(directory, {
          spawnDep: async () => {
            spawns++;
            throw new Error("must not spawn");
          },
          lookup: async () => {
            lookups++;
            return { status: undefined, assignee: undefined, exitCode: 1, stderr: "no issue" };
          },
        });
        await expect(executeBeadsDep({ issueId: "tgo-missing", dependsOnId: "tgo-def" }, host)).rejects.toThrow(/pre-dep lookup failed/);
        expect(spawns).toBe(0);
        expect(lookups).toBe(1);
      }
      // Missing to-side: both lookups run, still no spawn.
      {
        let spawns = 0;
        let lookups = 0;
        const { host } = hostFor(directory, {
          spawnDep: async () => {
            spawns++;
            throw new Error("must not spawn");
          },
          lookup: async (issueId) => {
            lookups++;
            if (issueId === "tgo-abc") return { status: "open", assignee: undefined, exitCode: 0 };
            return { status: undefined, assignee: undefined, exitCode: 1, stderr: "no issue" };
          },
        });
        await expect(executeBeadsDep({ issueId: "tgo-abc", dependsOnId: "tgo-missing" }, host)).rejects.toThrow(/pre-dep lookup failed/);
        expect(spawns).toBe(0);
        expect(lookups).toBe(2);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("self-edge denied with zero spawn", async () => {
    const directory = makeDisposable();
    try {
      let spawns = 0;
      let lookups = 0;
      const { host, entries } = hostFor(directory, {
        spawnDep: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
        lookup: async () => {
          lookups++;
          throw new Error("must not look up");
        },
      });
      await expect(executeBeadsDep({ issueId: "tgo-abc", dependsOnId: "tgo-abc" }, host)).rejects.toThrow(/self-edge/);
      expect(spawns).toBe(0);
      expect(lookups).toBe(0);
      expect(entries.length).toBeGreaterThan(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("missing-binary write fails as tool error with reads intact, no list", async () => {
    const directory = makeDisposable();
    try {
      let lookups = 0;
      let lists = 0;
      const { host, entries } = hostFor(directory, {
        lookup: async (issueId, repoRoot) => {
          lookups++;
          expect(repoRoot).toBe(directory);
          expect(issueId).not.toBe("/evil");
          return { status: "open", assignee: undefined, exitCode: 0 };
        },
        spawnDep: async () => {
          throw Object.assign(new Error("spawn bd ENOENT"), { code: "ENOENT" });
        },
        listDeps: async () => {
          lists++;
          throw new Error("must not list after failed write");
        },
      });
      await expect(executeBeadsDep({ issueId: "tgo-abc", dependsOnId: "tgo-def" }, host)).rejects.toThrow(/write failed.*bd not found on PATH/);
      expect(lookups).toBe(2);
      expect(lists).toBe(0);
      expect(entries.some((e) => e.level === "error")).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("post-verify fail-closed: nonzero list exit denies with no state claim", async () => {
    const directory = makeDisposable();
    try {
      let spawns = 0;
      const { host } = hostFor(directory, {
        spawnDep: async () => {
          spawns++;
          return { stdout: "", stderr: "" };
        },
        lookup: okLookup(),
        listDeps: async () => ({ exitCode: 1, deps: [], stderr: "boom" }),
      });
      await expect(executeBeadsDep({ issueId: "tgo-abc", dependsOnId: "tgo-def" }, host)).rejects.toThrow(/unverified/);
      expect(spawns).toBe(1);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("post-verify fail-closed: absent edge denies", async () => {
    const directory = makeDisposable();
    try {
      const { host } = hostFor(directory, {
        spawnDep: async () => ({ stdout: "", stderr: "" }),
        lookup: okLookup(),
        listDeps: async () => ({ exitCode: 0, deps: [{ id: "tgo-other", dependency_type: "blocks" }] }),
      });
      await expect(executeBeadsDep({ issueId: "tgo-abc", dependsOnId: "tgo-def" }, host)).rejects.toThrow(/unverified/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  const live = bdAvailable() ? test : test.skip;

  live("happy wire + post-verify via real bd", { timeout: 20_000 }, async () => {
    const directory = makeDisposable();
    try {
      mustSucceed(directory, ["init", "--non-interactive", "--skip-hooks"]);
      const a = JSON.parse(mustSucceed(directory, ["create", "TGO dep-tool probe A", "-t", "task", "-p", "2", "--json"])) as { id: string };
      const b = JSON.parse(mustSucceed(directory, ["create", "TGO dep-tool probe B", "-t", "task", "-p", "2", "--json"])) as { id: string };
      const { host, entries } = hostFor(directory);
      const result = await executeBeadsDep({ issueId: a.id, dependsOnId: b.id }, host);
      expect(result).toContain(`wired ${a.id} depends on ${b.id}`);
      expect(result).toContain("verified by dep list");
      expect(entries.some((e) => e.level === "info" && e.message.includes("dep observed"))).toBe(true);
      const deps = depListIds(directory, a.id);
      expect(deps.filter((d) => d.id === b.id)).toHaveLength(1);
      // Both endpoints read intact.
      const showA = await lookupClaimObserved(a.id, directory);
      const showB = await lookupClaimObserved(b.id, directory);
      expect(showA.exitCode).toBe(0);
      expect(showB.exitCode).toBe(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  live("duplicate-edge retry converges: logged success, single edge, never errors", { timeout: 20_000 }, async () => {
    const directory = makeDisposable();
    try {
      mustSucceed(directory, ["init", "--non-interactive", "--skip-hooks"]);
      const a = JSON.parse(mustSucceed(directory, ["create", "TGO dep-tool dup A", "-t", "task", "-p", "2", "--json"])) as { id: string };
      const b = JSON.parse(mustSucceed(directory, ["create", "TGO dep-tool dup B", "-t", "task", "-p", "2", "--json"])) as { id: string };
      const first = await executeBeadsDep({ issueId: a.id, dependsOnId: b.id }, hostFor(directory).host);
      expect(first).toContain(`wired ${a.id} depends on ${b.id}`);
      const second = await executeBeadsDep({ issueId: a.id, dependsOnId: b.id }, hostFor(directory).host);
      expect(second).toContain(`wired ${a.id} depends on ${b.id}`);
      expect(depListIds(directory, a.id).filter((d) => d.id === b.id)).toHaveLength(1);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  live("different-type re-add denied, original edge intact", { timeout: 20_000 }, async () => {
    const directory = makeDisposable();
    try {
      mustSucceed(directory, ["init", "--non-interactive", "--skip-hooks"]);
      const a = JSON.parse(mustSucceed(directory, ["create", "TGO dep-tool retype A", "-t", "task", "-p", "2", "--json"])) as { id: string };
      const b = JSON.parse(mustSucceed(directory, ["create", "TGO dep-tool retype B", "-t", "task", "-p", "2", "--json"])) as { id: string };
      const first = await executeBeadsDep({ issueId: a.id, dependsOnId: b.id, type: "blocks" }, hostFor(directory).host);
      expect(first).toContain(`wired ${a.id} depends on ${b.id}`);
      expect(depListIds(directory, a.id).find((d) => d.id === b.id)?.dependency_type).toBe("blocks");
      // Native bd errors on a different-type re-add (exit 1, "already exists"); the tool surfaces it as a clean denial.
      await expect(
        executeBeadsDep({ issueId: a.id, dependsOnId: b.id, type: "discovered-from" }, hostFor(directory).host),
      ).rejects.toThrow(/tgo_beads_dep.*write failed/);
      const edges = depListIds(directory, a.id).filter((d) => d.id === b.id);
      expect(edges).toHaveLength(1);
      expect(edges[0]?.dependency_type).toBe("blocks");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  live("typed wire stores requested type", { timeout: 20_000 }, async () => {
    const directory = makeDisposable();
    try {
      mustSucceed(directory, ["init", "--non-interactive", "--skip-hooks"]);
      const a = JSON.parse(mustSucceed(directory, ["create", "TGO dep-tool typed A", "-t", "task", "-p", "2", "--json"])) as { id: string };
      const b = JSON.parse(mustSucceed(directory, ["create", "TGO dep-tool typed B", "-t", "task", "-p", "2", "--json"])) as { id: string };
      const result = await executeBeadsDep({ issueId: a.id, dependsOnId: b.id, type: "discovered-from" }, hostFor(directory).host);
      expect(result).toContain("type discovered-from");
      const deps = depListIds(directory, a.id);
      expect(deps.find((d) => d.id === b.id)?.dependency_type).toBe("discovered-from");
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
      const a = JSON.parse(mustSucceed(repoA, ["create", "TGO dep-tool cwd A", "-t", "task", "-p", "2", "--json"])) as { id: string };
      const b = JSON.parse(mustSucceed(repoA, ["create", "TGO dep-tool cwd B", "-t", "task", "-p", "2", "--json"])) as { id: string };
      let spawns = 0;
      const { host } = hostFor(repoB, {
        spawnDep: async () => {
          spawns++;
          throw new Error("must not write to the wrong repo");
        },
      });
      await expect(executeBeadsDep({ issueId: a.id, dependsOnId: b.id }, host)).rejects.toThrow();
      expect(spawns).toBe(0);
      expect(depListIds(repoA, a.id)).toHaveLength(0);
    } finally {
      rmSync(repoA, { recursive: true, force: true });
      rmSync(repoB, { recursive: true, force: true });
    }
  });

  live("live self-edge denied by the tool before bd runs", { timeout: 20_000 }, async () => {
    const directory = makeDisposable();
    try {
      mustSucceed(directory, ["init", "--non-interactive", "--skip-hooks"]);
      const a = JSON.parse(mustSucceed(directory, ["create", "TGO dep-tool self A", "-t", "task", "-p", "2", "--json"])) as { id: string };
      let spawns = 0;
      const { host } = hostFor(directory, {
        spawnDep: async () => {
          spawns++;
          throw new Error("must not spawn self-edge");
        },
      });
      await expect(executeBeadsDep({ issueId: a.id, dependsOnId: a.id }, host)).rejects.toThrow(/self-edge/);
      expect(spawns).toBe(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
