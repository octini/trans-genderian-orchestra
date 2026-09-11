import { describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  lookupClaimObserved,
  evaluateLiveDispatchGate,
  verifyLiveClaimForDispatch,
} from "../src/verify-claim";

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

describe("Phase 1 verify-every-claim live host lookup", () => {
  const live = bdAvailable() ? test : test.skip;

  live(
    "(a) live lookup with threaded cwd: open → in_progress + assignee passes gate",
    { timeout: 20_000 },
    async () => {
      const directory = mkdtempSync(path.join(os.tmpdir(), "tgo-bd-probe-"));
      try {
        expect(directory).not.toBe(process.cwd());
        mustSucceed(directory, ["init", "--non-interactive", "--skip-hooks"]);
        const created = mustSucceed(directory, ["create", "TGO live-gate probe", "-t", "task", "-p", "2", "--json"]);
        const issue = JSON.parse(created) as { id: string; status: string };
        expect(issue.status).toBe("open");

        // Live open state fails the gate before claim.
        const openObserved = await lookupClaimObserved(issue.id, directory);
        expect(openObserved.exitCode).toBe(0);
        expect(openObserved.status).toBe("open");
        const openPacket = {
          issueId: issue.id,
          issueStatusObserved: "in_progress",
          issueAssigneeObserved: "ryangking",
          claimExitCode: 0,
          beadsOperator: "Bernstein",
        };
        expect(evaluateLiveDispatchGate(openPacket, openObserved).allowed).toBe(false);

        // Claim, then the threaded-cwd lookup observes in_progress + assignee.
        const claimed = runBd(directory, ["update", "--json", issue.id, "--claim"]);
        expect(claimed.exitCode).toBe(0);
        const observed = await lookupClaimObserved(issue.id, directory);
        expect(observed.exitCode).toBe(0);
        expect(observed.status).toBe("in_progress");
        expect(typeof observed.assignee).toBe("string");
        expect(observed.assignee!.trim().length).toBeGreaterThan(0);

        const packet = {
          issueId: issue.id,
          issueStatusObserved: observed.status,
          issueAssigneeObserved: observed.assignee!,
          claimExitCode: observed.exitCode,
          beadsOperator: "Bernstein",
        };
        const verdict = evaluateLiveDispatchGate(packet, observed);
        expect(verdict.allowed).toBe(true);
        expect(verdict.missing).toEqual([]);
        // Combined helper threads the same explicit cwd.
        const combined = await verifyLiveClaimForDispatch(packet, directory);
        expect(combined.allowed).toBe(true);
        expect(combined.observed.status).toBe("in_progress");
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  );

  live(
    "(b) forged-claim rejection: packet claims in_progress while live reports open or missing → rejected, no spawn",
    { timeout: 20_000 },
    async () => {
      const directory = mkdtempSync(path.join(os.tmpdir(), "tgo-bd-probe-"));
      try {
        expect(directory).not.toBe(process.cwd());
        mustSucceed(directory, ["init", "--non-interactive", "--skip-hooks"]);
        const created = mustSucceed(directory, ["create", "TGO forged-gate probe", "-t", "task", "-p", "2", "--json"]);
        const issue = JSON.parse(created) as { id: string };

        // Live state is open (never claimed); packet forges a live in_progress claim.
        const liveOpen = await lookupClaimObserved(issue.id, directory);
        expect(liveOpen.status).toBe("open");
        const forged = {
          issueId: issue.id,
          issueClaimed: true,
          issueStatusObserved: "in_progress",
          issueAssigneeObserved: "ryangking",
          claimExitCode: 0,
          beadsOperator: "Bernstein",
        };
        const forgedVerdict = evaluateLiveDispatchGate(forged, liveOpen);
        expect(forgedVerdict.allowed).toBe(false);
        expect(forgedVerdict.missing).toContain("live:issueStatusObserved:in_progress");
        expect(forgedVerdict.diagnostics.join(" ")).toContain("in_progress");
        let spawned = false;
        if (forgedVerdict.allowed) spawned = true;
        expect(spawned).toBe(false);

        // Missing id: live lookup exits non-zero and the gate fails closed.
        const missingObserved = await lookupClaimObserved("tgo-does-not-exist-9999", directory);
        expect(missingObserved.exitCode).not.toBe(0);
        expect(missingObserved.status).toBeUndefined();
        const missingPacket = {
          issueId: "tgo-does-not-exist-9999",
          issueStatusObserved: "in_progress",
          issueAssigneeObserved: "ryangking",
          claimExitCode: 0,
          beadsOperator: "Bernstein",
        };
        const missingVerdict = evaluateLiveDispatchGate(missingPacket, missingObserved);
        expect(missingVerdict.allowed).toBe(false);
        expect(missingVerdict.diagnostics.join(" ")).toContain("Keep issue");
        let spawnedMissing = false;
        if (missingVerdict.allowed) spawnedMissing = true;
        expect(spawnedMissing).toBe(false);
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  );

  live(
    "(c) cwd-misdirection: lookup in a second disposable repo with no such id fails closed, no ambient fallback",
    { timeout: 20_000 },
    async () => {
      const repoA = mkdtempSync(path.join(os.tmpdir(), "tgo-bd-probe-"));
      const repoB = mkdtempSync(path.join(os.tmpdir(), "tgo-bd-probe-"));
      try {
        expect(repoA).not.toBe(process.cwd());
        expect(repoB).not.toBe(process.cwd());
        expect(repoA).not.toBe(repoB);
        mustSucceed(repoA, ["init", "--non-interactive", "--skip-hooks"]);
        mustSucceed(repoB, ["init", "--non-interactive", "--skip-hooks"]);
        const created = mustSucceed(repoA, ["create", "TGO misdirection probe", "-t", "task", "-p", "2", "--json"]);
        const issue = JSON.parse(created) as { id: string };
        const claimed = runBd(repoA, ["update", "--json", issue.id, "--claim"]);
        expect(claimed.exitCode).toBe(0);

        // Sanity: the id verifies in its own repo.
        const home = await lookupClaimObserved(issue.id, repoA);
        expect(home.exitCode).toBe(0);
        expect(home.status).toBe("in_progress");

        // Same id pointed at the wrong repo fails closed — never ambient fallback.
        const away = await lookupClaimObserved(issue.id, repoB);
        expect(away.exitCode).not.toBe(0);
        expect(away.status).toBeUndefined();
        const packet = {
          issueId: issue.id,
          issueStatusObserved: "in_progress",
          issueAssigneeObserved: home.assignee ?? "ryangking",
          claimExitCode: 0,
          beadsOperator: "Bernstein",
        };
        const verdict = evaluateLiveDispatchGate(packet, away);
        expect(verdict.allowed).toBe(false);
        expect(verdict.missing).toContain("live:issueStatusObserved:in_progress");
        let spawned = false;
        if (verdict.allowed) spawned = true;
        expect(spawned).toBe(false);

        // Id gate precedes argv: leading-dash ids never reach bd.
        const dashed = await lookupClaimObserved("--json", repoA);
        expect(dashed.exitCode).not.toBe(0);
        expect(dashed.status).toBeUndefined();
        // Explicit cwd is required: empty root fails closed without ambient fallback.
        const noCwd = await lookupClaimObserved(issue.id, "");
        expect(noCwd.exitCode).not.toBe(0);
      } finally {
        rmSync(repoA, { recursive: true, force: true });
        rmSync(repoB, { recursive: true, force: true });
      }
    },
  );
});
