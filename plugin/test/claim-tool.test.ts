import { describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  executeBeadsClaim,
  isClaimToolAllowed,
  type ClaimToolHost,
  type ClaimToolLogger,
} from "../src/claim-tool";
import { lookupClaimObserved } from "../src/verify-claim";

type LogEntry = { level: string; message: string; extra?: Record<string, unknown> };

function makeLog(): { log: ClaimToolLogger; entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  const log: ClaimToolLogger = (level, message, extra) => {
    entries.push({ level, message, extra });
  };
  return { log, entries };
}

function hostFor(repoRoot: string, over: Partial<ClaimToolHost> = {}): { host: ClaimToolHost; entries: LogEntry[] } {
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

describe("claim-only primary-gated tool (Phase 2 cheapest slice)", () => {
  test("allowed flag defaults to allowed with dev/test enable path", () => {
    const saved = process.env.TGO_BEADS_CLAIM_ALLOWED;
    try {
      delete process.env.TGO_BEADS_CLAIM_ALLOWED;
      expect(isClaimToolAllowed()).toBe(true);
      expect(isClaimToolAllowed(undefined)).toBe(true);
      expect(isClaimToolAllowed(false)).toBe(false);
      expect(isClaimToolAllowed(true)).toBe(true);
      process.env.TGO_BEADS_CLAIM_ALLOWED = "1";
      expect(isClaimToolAllowed()).toBe(true);
    } finally {
      if (saved === undefined) delete process.env.TGO_BEADS_CLAIM_ALLOWED;
      else process.env.TGO_BEADS_CLAIM_ALLOWED = saved;
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
        123,
        null,
      ];
      expect(badIds.length).toBeGreaterThanOrEqual(4);
      for (const bad of badIds) {
        let spawns = 0;
        let lookups = 0;
        const { host, entries } = hostFor(directory, {
          spawnClaim: async () => {
            spawns++;
            throw new Error("must not spawn");
          },
          lookup: async () => {
            lookups++;
            throw new Error("must not look up");
          },
        });
        await expect(executeBeadsClaim({ issueId: bad }, host)).rejects.toThrow(/invalid issueId/);
        expect(spawns).toBe(0);
        expect(lookups).toBe(0);
        expect(entries.length).toBeGreaterThan(0);
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
      let calls = 0;
      const { host } = hostFor(directory, {
        spawnClaim: async (args, cwd) => {
          seen.push({ args, cwd });
          return { stdout: "", stderr: "" };
        },
        lookup: async (issueId, repoRoot) => {
          seenLookups.push({ issueId, repoRoot });
          calls++;
          if (calls === 1) return { status: "open", assignee: undefined, exitCode: 0 };
          return { status: "in_progress", assignee: "ryangking", exitCode: 0 };
        },
      });
      const result = await executeBeadsClaim(
        { issueId: "tgo-abc", cwd: "/evil", directory: "/evil", path: "/evil", repoRoot: "/evil" },
        host,
      );
      expect(result).toContain("claimed tgo-abc");
      expect(seen).toHaveLength(1);
      expect(seen[0]!.cwd).toBe(directory);
      expect(seen[0]!.args).toEqual(["update", "tgo-abc", "--claim"]);
      for (const seenLookup of seenLookups) {
        expect(seenLookup.repoRoot).toBe(directory);
        expect(seenLookup.issueId).toBe("tgo-abc");
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
        spawnClaim: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
        lookup: async () => {
          lookups++;
          throw new Error("must not look up");
        },
      });
      await expect(executeBeadsClaim({ issueId: "tgo-abc" }, host)).rejects.toThrow(/allowed:false/);
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
        spawnClaim: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
        lookup: async () => {
          lookups++;
          throw new Error("must not look up");
        },
      });
      await expect(executeBeadsClaim({ issueId: "tgo-abc" }, host)).rejects.toThrow(/primary-seat only/);
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
        spawnClaim: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
      });
      await expect(executeBeadsClaim({ issueId: "tgo-abc" }, host)).rejects.toThrow(/explicit repoRoot/);
      expect(spawns).toBe(0);
      expect(directory).not.toBe(process.cwd());
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("missing-binary write fails as tool error with reads intact", async () => {
    const directory = makeDisposable();
    try {
      let lookups = 0;
      const { host, entries } = hostFor(directory, {
        lookup: async (issueId, repoRoot) => {
          lookups++;
          expect(repoRoot).toBe(directory);
          return { status: "open", assignee: undefined, exitCode: 0 };
        },
        spawnClaim: async () => {
          throw Object.assign(new Error("spawn bd ENOENT"), { code: "ENOENT" });
        },
      });
      await expect(executeBeadsClaim({ issueId: "tgo-abc" }, host)).rejects.toThrow(/write failed.*bd not found on PATH/);
      expect(lookups).toBe(1);
      expect(entries.some((e) => e.level === "error")).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  const live = bdAvailable() ? test : test.skip;

  live("happy claim + re-show owner confirm", { timeout: 20_000 }, async () => {
    const directory = makeDisposable();
    try {
      mustSucceed(directory, ["init", "--non-interactive", "--skip-hooks"]);
      const created = mustSucceed(directory, ["create", "TGO claim-tool probe", "-t", "task", "-p", "2", "--json"]);
      const issue = JSON.parse(created) as { id: string; status: string };
      expect(issue.status).toBe("open");
      const { host, entries } = hostFor(directory);
      const result = await executeBeadsClaim({ issueId: issue.id }, host);
      expect(result).toContain(`claimed ${issue.id}`);
      expect(result).toContain("verified by re-show");
      expect(entries.some((e) => e.level === "info" && e.message.includes("claim observed"))).toBe(true);
      const observed = await lookupClaimObserved(issue.id, directory);
      expect(observed.exitCode).toBe(0);
      expect(observed.status).toBe("in_progress");
      expect(typeof observed.assignee).toBe("string");
      expect(observed.assignee!.trim().length).toBeGreaterThan(0);
      expect(result).toContain(observed.assignee!);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  live("already-owned reports without overwrite (no second write)", { timeout: 20_000 }, async () => {
    const directory = makeDisposable();
    try {
      mustSucceed(directory, ["init", "--non-interactive", "--skip-hooks"]);
      const created = mustSucceed(directory, ["create", "TGO claim-tool owned probe", "-t", "task", "-p", "2", "--json"]);
      const issue = JSON.parse(created) as { id: string };
      const first = hostFor(directory);
      const claimed = await executeBeadsClaim({ issueId: issue.id }, first.host);
      expect(claimed).toContain(`claimed ${issue.id}`);
      const before = await lookupClaimObserved(issue.id, directory);
      // Second entry must short-circuit on the live pre-lookup: any write spawn throws.
      const second = hostFor(directory, {
        spawnClaim: async () => {
          throw new Error("must not spawn a second write");
        },
      });
      const retry = await executeBeadsClaim({ issueId: issue.id }, second.host);
      expect(retry).toContain(`already claimed ${issue.id}`);
      expect(retry).toContain("no overwrite");
      const after = await lookupClaimObserved(issue.id, directory);
      expect(after.status).toBe("in_progress");
      expect(after.assignee).toBe(before.assignee);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  live("kill-retry: write-then-crash converges via live show with no duplicate write", { timeout: 20_000 }, async () => {
    const directory = makeDisposable();
    try {
      mustSucceed(directory, ["init", "--non-interactive", "--skip-hooks"]);
      const created = mustSucceed(directory, ["create", "TGO claim-tool retry probe", "-t", "task", "-p", "2", "--json"]);
      const issue = JSON.parse(created) as { id: string };
      // Simulate the crashed first attempt: its write landed, its confirm never ran.
      const direct = runBd(directory, ["update", issue.id, "--claim"]);
      expect(direct.exitCode).toBe(0);
      const { host } = hostFor(directory, {
        spawnClaim: async () => {
          throw new Error("retry must verify-first, never blind overwrite");
        },
      });
      const result = await executeBeadsClaim({ issueId: issue.id }, host);
      expect(result).toContain(`already claimed ${issue.id}`);
      const observed = await lookupClaimObserved(issue.id, directory);
      expect(observed.status).toBe("in_progress");
      expect(typeof observed.assignee).toBe("string");
      expect(result).toContain(observed.assignee!);
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
      const created = mustSucceed(repoA, ["create", "TGO claim-tool cwd probe", "-t", "task", "-p", "2", "--json"]);
      const issue = JSON.parse(created) as { id: string };
      let spawns = 0;
      const { host } = hostFor(repoB, {
        spawnClaim: async () => {
          spawns++;
          throw new Error("must not write to the wrong repo");
        },
      });
      await expect(executeBeadsClaim({ issueId: issue.id }, host)).rejects.toThrow();
      expect(spawns).toBe(0);
      const home = await lookupClaimObserved(issue.id, repoA);
      expect(home.exitCode).toBe(0);
      expect(home.status).toBe("open");
    } finally {
      rmSync(repoA, { recursive: true, force: true });
      rmSync(repoB, { recursive: true, force: true });
    }
  });
});
