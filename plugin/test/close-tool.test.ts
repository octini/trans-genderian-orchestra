import { describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  executeBeadsClose,
  isCloseToolAllowed,
  CLOSE_REASON_MAX,
  type CloseToolHost,
  type CloseToolLogger,
} from "../src/close-tool";
import { lookupClaimObserved } from "../src/verify-claim";

type LogEntry = { level: string; message: string; extra?: Record<string, unknown> };

function makeLog(): { log: CloseToolLogger; entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  const log: CloseToolLogger = (level, message, extra) => {
    entries.push({ level, message, extra });
  };
  return { log, entries };
}

function hostFor(repoRoot: string, over: Partial<CloseToolHost> = {}): { host: CloseToolHost; entries: LogEntry[] } {
  const { log, entries } = makeLog();
  return {
    host: {
      repoRoot,
      isPrimary: true,
      allowed: true,
      log,
      checkGate: async () => ({ allowed: true }),
      ...over,
    },
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

describe("close-only primary-gated tool (Phase 2 second slice)", () => {
  test("allowed flag defaults to allowed with dev/test enable path", () => {
    const saved = process.env.TGO_BEADS_CLOSE_ALLOWED;
    try {
      delete process.env.TGO_BEADS_CLOSE_ALLOWED;
      expect(isCloseToolAllowed()).toBe(true);
      expect(isCloseToolAllowed(undefined)).toBe(true);
      expect(isCloseToolAllowed(false)).toBe(false);
      expect(isCloseToolAllowed(true)).toBe(true);
      process.env.TGO_BEADS_CLOSE_ALLOWED = "1";
      expect(isCloseToolAllowed()).toBe(true);
    } finally {
      if (saved === undefined) delete process.env.TGO_BEADS_CLOSE_ALLOWED;
      else process.env.TGO_BEADS_CLOSE_ALLOWED = saved;
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
        "--close",
        "a\nb",
        123,
        null,
      ];
      expect(badIds.length).toBeGreaterThanOrEqual(4);
      for (const bad of badIds) {
        let spawns = 0;
        let lookups = 0;
        let gates = 0;
        const { host, entries } = hostFor(directory, {
          spawnClose: async () => {
            spawns++;
            throw new Error("must not spawn");
          },
          lookup: async () => {
            lookups++;
            throw new Error("must not look up");
          },
          checkGate: async () => {
            gates++;
            throw new Error("must not gate");
          },
        });
        await expect(executeBeadsClose({ issueId: bad, reason: "done" }, host)).rejects.toThrow(/invalid issueId/);
        expect(spawns).toBe(0);
        expect(lookups).toBe(0);
        expect(gates).toBe(0);
        expect(entries.length).toBeGreaterThan(0);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("bad reasons reject before any spawn", async () => {
    const directory = makeDisposable();
    try {
      const badReasons: unknown[] = ["", "   ", null, 123, "x".repeat(CLOSE_REASON_MAX + 1)];
      expect(badReasons.length).toBeGreaterThanOrEqual(3);
      for (const bad of badReasons) {
        let spawns = 0;
        let lookups = 0;
        let gates = 0;
        const { host } = hostFor(directory, {
          spawnClose: async () => {
            spawns++;
            throw new Error("must not spawn");
          },
          lookup: async () => {
            lookups++;
            return { status: "in_progress", assignee: "ryangking", exitCode: 0 };
          },
          checkGate: async () => {
            gates++;
            return { allowed: true };
          },
        });
        await expect(executeBeadsClose({ issueId: "tgo-abc", reason: bad }, host)).rejects.toThrow(/invalid reason/);
        expect(spawns).toBe(0);
        expect(lookups).toBe(0);
        expect(gates).toBe(0);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("reason-as-flag stays a single argv value (e.g. --json)", async () => {
    const directory = makeDisposable();
    try {
      const seen: Array<{ args: string[]; cwd: string }> = [];
      let calls = 0;
      const { host } = hostFor(directory, {
        spawnClose: async (args, cwd) => {
          seen.push({ args, cwd });
          return { stdout: "", stderr: "" };
        },
        lookup: async (issueId, repoRoot) => {
          expect(repoRoot).toBe(directory);
          calls++;
          if (calls === 1) return { status: "in_progress", assignee: "ryangking", exitCode: 0 };
          return { status: "closed", assignee: "ryangking", exitCode: 0 };
        },
      });
      const result = await executeBeadsClose({ issueId: "tgo-abc", reason: "--json" }, host);
      expect(result).toContain("closed tgo-abc");
      expect(seen).toHaveLength(1);
      expect(seen[0]!.args).toEqual(["close", "tgo-abc", "--reason", "--json"]);
      expect(seen[0]!.cwd).toBe(directory);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("worker-supplied path fields ignored: cwd pinned to host root, argv exact", async () => {
    const directory = makeDisposable();
    try {
      const seen: Array<{ args: string[]; cwd: string }> = [];
      const seenLookups: Array<{ issueId: unknown; repoRoot: unknown }> = [];
      const seenGates: Array<{ repoRoot: string; issueId: string }> = [];
      let calls = 0;
      const { host } = hostFor(directory, {
        spawnClose: async (args, cwd) => {
          seen.push({ args, cwd });
          return { stdout: "", stderr: "" };
        },
        lookup: async (issueId, repoRoot) => {
          seenLookups.push({ issueId, repoRoot });
          calls++;
          if (calls === 1) return { status: "in_progress", assignee: "ryangking", exitCode: 0 };
          return { status: "closed", assignee: "ryangking", exitCode: 0 };
        },
        checkGate: async (repoRoot, issueId) => {
          seenGates.push({ repoRoot, issueId });
          return { allowed: true };
        },
      });
      const result = await executeBeadsClose(
        { issueId: "tgo-abc", reason: "done", cwd: "/evil", directory: "/evil", path: "/evil", repoRoot: "/evil", worktree: "/evil" },
        host,
      );
      expect(result).toContain("closed tgo-abc");
      expect(seen).toHaveLength(1);
      expect(seen[0]!.cwd).toBe(directory);
      expect(seen[0]!.args).toEqual(["close", "tgo-abc", "--reason", "done"]);
      for (const seenLookup of seenLookups) {
        expect(seenLookup.repoRoot).toBe(directory);
        expect(seenLookup.issueId).toBe("tgo-abc");
      }
      expect(seenGates).toHaveLength(1);
      expect(seenGates[0]!.repoRoot).toBe(directory);
      expect(seenGates[0]!.issueId).toBe("tgo-abc");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("allowed:false denies with log entry and zero spawn", async () => {
    const directory = makeDisposable();
    try {
      let spawns = 0;
      let lookups = 0;
      let gates = 0;
      const { host, entries } = hostFor(directory, {
        allowed: false,
        spawnClose: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
        lookup: async () => {
          lookups++;
          throw new Error("must not look up");
        },
        checkGate: async () => {
          gates++;
          throw new Error("must not gate");
        },
      });
      await expect(executeBeadsClose({ issueId: "tgo-abc", reason: "done" }, host)).rejects.toThrow(/allowed:false/);
      expect(spawns).toBe(0);
      expect(lookups).toBe(0);
      expect(gates).toBe(0);
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
      let gates = 0;
      const { host } = hostFor(directory, {
        isPrimary: false,
        spawnClose: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
        lookup: async () => {
          lookups++;
          throw new Error("must not look up");
        },
        checkGate: async () => {
          gates++;
          throw new Error("must not gate");
        },
      });
      await expect(executeBeadsClose({ issueId: "tgo-abc", reason: "done" }, host)).rejects.toThrow(/primary-seat only/);
      expect(spawns).toBe(0);
      expect(lookups).toBe(0);
      expect(gates).toBe(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("empty repoRoot fails closed with zero spawn", async () => {
    const directory = makeDisposable();
    try {
      let spawns = 0;
      const { host } = hostFor("", {
        spawnClose: async () => {
          spawns++;
          throw new Error("must not spawn");
        },
      });
      await expect(executeBeadsClose({ issueId: "tgo-abc", reason: "done" }, host)).rejects.toThrow(/explicit repoRoot/);
      expect(spawns).toBe(0);
      expect(directory).not.toBe(process.cwd());
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("claim-unverified denies with zero close spawn and no gate pass", async () => {
    const directory = makeDisposable();
    try {
      const cases: Array<{ status: string | undefined; assignee: string | undefined; exitCode: number }> = [
        { status: "open", assignee: undefined, exitCode: 0 },
        { status: "in_progress", assignee: undefined, exitCode: 0 },
        { status: "in_progress", assignee: "  ", exitCode: 0 },
        { status: undefined, assignee: undefined, exitCode: 1 },
      ];
      for (const observed of cases) {
        let spawns = 0;
        let gates = 0;
        const { host } = hostFor(directory, {
          lookup: async () => ({ ...observed }),
          checkGate: async () => {
            gates++;
            return { allowed: true };
          },
          spawnClose: async () => {
            spawns++;
            throw new Error("must not spawn");
          },
        });
        await expect(executeBeadsClose({ issueId: "tgo-abc", reason: "done" }, host)).rejects.toThrow(/claim unverified|pre-close lookup failed/);
        expect(spawns).toBe(0);
        // Gate must not pass on unverified claim: either not called or never allowed.
        expect(gates).toBe(0);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("gate-deny blocks close with zero spawn", async () => {
    const directory = makeDisposable();
    try {
      let spawns = 0;
      let lookups = 0;
      const { host, entries } = hostFor(directory, {
        lookup: async () => {
          lookups++;
          return { status: "in_progress", assignee: "ryangking", exitCode: 0 };
        },
        checkGate: async () => ({ allowed: false, message: "GATE_BLOCKED_CRITICAL — synthetic" }),
        spawnClose: async () => {
          spawns++;
          throw new Error("must not spawn on gate deny");
        },
      });
      await expect(executeBeadsClose({ issueId: "tgo-abc", reason: "done" }, host)).rejects.toThrow(/exit gate|blocked/);
      expect(spawns).toBe(0);
      expect(lookups).toBe(1);
      expect(entries.some((e) => e.level === "error")).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("happy close confirms closed via post-show on the same pinned cwd", async () => {
    const directory = makeDisposable();
    try {
      const spawnSeen: Array<{ args: string[]; cwd: string }> = [];
      const lookupCwds: string[] = [];
      const gateCwds: string[] = [];
      let calls = 0;
      const { host, entries } = hostFor(directory, {
        spawnClose: async (args, cwd) => {
          spawnSeen.push({ args, cwd });
          return { stdout: "", stderr: "" };
        },
        lookup: async (issueId, repoRoot) => {
          lookupCwds.push(repoRoot as string);
          calls++;
          if (calls === 1) return { status: "in_progress", assignee: "ryangking", exitCode: 0 };
          return { status: "closed", assignee: "ryangking", exitCode: 0 };
        },
        checkGate: async (repoRoot) => {
          gateCwds.push(repoRoot);
          return { allowed: true };
        },
      });
      const result = await executeBeadsClose({ issueId: "tgo-abc", reason: "verified done" }, host);
      expect(result).toContain("closed tgo-abc");
      expect(result).toContain("verified closed");
      expect(spawnSeen).toHaveLength(1);
      expect(spawnSeen[0]!.args).toEqual(["close", "tgo-abc", "--reason", "verified done"]);
      expect(spawnSeen[0]!.cwd).toBe(directory);
      expect(lookupCwds).toEqual([directory, directory]);
      expect(gateCwds).toEqual([directory]);
      expect(entries.some((e) => e.level === "info" && e.message.includes("close observed"))).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("already-closed returns logged no-op and never reopens", async () => {
    const directory = makeDisposable();
    try {
      const { host, entries } = hostFor(directory, {
        lookup: async () => ({ status: "closed", assignee: "ryangking", exitCode: 0 }),
        checkGate: async () => {
          throw new Error("gate must not run for already-closed");
        },
        spawnClose: async () => {
          throw new Error("must never reopen or re-close");
        },
      });
      const result = await executeBeadsClose({ issueId: "tgo-abc", reason: "done" }, host);
      expect(result).toContain("already closed tgo-abc");
      expect(result).toContain("never reopen");
      expect(entries.some((e) => e.level === "info" && e.message.includes("already closed"))).toBe(true);
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
          return { status: "in_progress", assignee: "ryangking", exitCode: 0 };
        },
        spawnClose: async () => {
          throw Object.assign(new Error("spawn bd ENOENT"), { code: "ENOENT" });
        },
      });
      await expect(executeBeadsClose({ issueId: "tgo-abc", reason: "done" }, host)).rejects.toThrow(/write failed.*bd not found on PATH/);
      expect(lookups).toBe(1);
      expect(entries.some((e) => e.level === "error")).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("split-cwd TOCTOU impossible: gate-cwd equals close-cwd on one pinned root", async () => {
    const directory = makeDisposable();
    try {
      expect(directory).not.toBe(process.cwd());
      const cwds = new Set<string>();
      let calls = 0;
      const { host } = hostFor(directory, {
        lookup: async (_issueId, repoRoot) => {
          cwds.add(repoRoot as string);
          calls++;
          if (calls === 1) return { status: "in_progress", assignee: "ryangking", exitCode: 0 };
          return { status: "closed", assignee: "ryangking", exitCode: 0 };
        },
        checkGate: async (repoRoot) => {
          cwds.add(repoRoot);
          return { allowed: true };
        },
        spawnClose: async (args, cwd) => {
          cwds.add(cwd);
          expect(args).toEqual(["close", "tgo-abc", "--reason", "done"]);
          return { stdout: "", stderr: "" };
        },
      });
      const result = await executeBeadsClose(
        { issueId: "tgo-abc", reason: "done", directory: "/evil-a", worktree: "/evil-b" },
        host,
      );
      expect(result).toContain("closed tgo-abc");
      expect(cwds.size).toBe(1);
      expect([...cwds][0]).toBe(directory);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("crash between gate-pass and close requires a fresh gate on retry", async () => {
    const directory = makeDisposable();
    try {
      let gateCalls = 0;
      let spawnCalls = 0;
      let lookups = 0;
      const statuses: Array<{ status: string | undefined; assignee: string | undefined; exitCode: number }> = [
        { status: "in_progress", assignee: "ryangking", exitCode: 0 },
        { status: "in_progress", assignee: "ryangking", exitCode: 0 },
        { status: "closed", assignee: "ryangking", exitCode: 0 },
      ];
      const { host } = hostFor(directory, {
        lookup: async () => statuses[Math.min(lookups++, statuses.length - 1)]!,
        checkGate: async () => {
          gateCalls++;
          return { allowed: true };
        },
        spawnClose: async (args, cwd) => {
          spawnCalls++;
          expect(cwd).toBe(directory);
          if (spawnCalls === 1) throw new Error("simulated crash after gate-pass, before close landed");
          expect(args).toEqual(["close", "tgo-abc", "--reason", "done"]);
          return { stdout: "", stderr: "" };
        },
      });
      await expect(executeBeadsClose({ issueId: "tgo-abc", reason: "done" }, host)).rejects.toThrow(/write failed.*simulated crash/);
      expect(gateCalls).toBe(1);
      const result = await executeBeadsClose({ issueId: "tgo-abc", reason: "done" }, host);
      expect(result).toContain("closed tgo-abc");
      expect(gateCalls).toBe(2);
      expect(spawnCalls).toBe(2);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  const live = bdAvailable() ? test : test.skip;

  live("happy close + post-show closed (real bd + real gate)", { timeout: 20_000 }, async () => {
    const directory = makeDisposable();
    try {
      mustSucceed(directory, ["init", "--non-interactive", "--skip-hooks"]);
      const created = mustSucceed(directory, ["create", "TGO close-tool probe", "-t", "task", "-p", "2", "--json"]);
      const issue = JSON.parse(created) as { id: string; status: string };
      expect(issue.status).toBe("open");
      mustSucceed(directory, ["update", issue.id, "--claim"]);
      // Real gate path: no checkGate mock, so executeBeadsClose uses checkCloseGate on the pinned cwd.
      const { log, entries } = makeLog();
      const realHost: CloseToolHost = { repoRoot: directory, isPrimary: true, allowed: true, log };
      const result = await executeBeadsClose({ issueId: issue.id, reason: "probe complete" }, realHost);
      expect(result).toContain(`closed ${issue.id}`);
      expect(result).toContain("verified closed");
      const observed = await lookupClaimObserved(issue.id, directory);
      expect(observed.exitCode).toBe(0);
      expect(observed.status).toBe("closed");
      expect(entries.some((e) => e.level === "info")).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  live("already-closed no-op never reopens (real bd)", { timeout: 20_000 }, async () => {
    const directory = makeDisposable();
    try {
      mustSucceed(directory, ["init", "--non-interactive", "--skip-hooks"]);
      const created = mustSucceed(directory, ["create", "TGO close-tool closed probe", "-t", "task", "-p", "2", "--json"]);
      const issue = JSON.parse(created) as { id: string };
      mustSucceed(directory, ["update", issue.id, "--claim"]);
      mustSucceed(directory, ["close", issue.id, "--reason", "first close"]);
      const before = await lookupClaimObserved(issue.id, directory);
      expect(before.status).toBe("closed");
      const { log } = makeLog();
      const realHost: CloseToolHost = { repoRoot: directory, isPrimary: true, allowed: true, log };
      const again = await executeBeadsClose({ issueId: issue.id, reason: "second close" }, realHost);
      expect(again).toContain(`already closed ${issue.id}`);
      expect(again).toContain("never reopen");
      const after = await lookupClaimObserved(issue.id, directory);
      expect(after.status).toBe("closed");
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
      const created = mustSucceed(repoA, ["create", "TGO close-tool cwd probe", "-t", "task", "-p", "2", "--json"]);
      const issue = JSON.parse(created) as { id: string };
      mustSucceed(repoA, ["update", issue.id, "--claim"]);
      let spawns = 0;
      const { log } = makeLog();
      const host: CloseToolHost = {
        repoRoot: repoB,
        isPrimary: true,
        allowed: true,
        log,
        spawnClose: async () => {
          spawns++;
          throw new Error("must not write to the wrong repo");
        },
      };
      await expect(executeBeadsClose({ issueId: issue.id, reason: "done" }, host)).rejects.toThrow();
      expect(spawns).toBe(0);
      const home = await lookupClaimObserved(issue.id, repoA);
      expect(home.exitCode).toBe(0);
      expect(home.status).toBe("in_progress");
    } finally {
      rmSync(repoA, { recursive: true, force: true });
      rmSync(repoB, { recursive: true, force: true });
    }
  });
});
