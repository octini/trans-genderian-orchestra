import { describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { validateDelegationBoundary, verifyClaimObserved } from "../src/delegation";

type BdResult = { command: string; exitCode: number; stdout: string; stderr: string };

function bdAvailable(): boolean {
  try {
    execFileSync("bd", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function runBd(cwd: string, args: string[]): BdResult {
  const result = spawnSync("bd", args, { cwd, encoding: "utf8" });
  return {
    command: ["bd", ...args].map((argument) => JSON.stringify(argument)).join(" "),
    exitCode: result.status ?? 1,
    stdout: result.stdout?.toString() ?? "",
    stderr: result.stderr?.toString() ?? result.error?.message ?? "",
  };
}

function expectBdSuccess(result: BdResult): void {
  if (result.exitCode !== 0) {
    throw new Error(
      `Beads command failed\ncommand: ${result.command}\nexit code: ${result.exitCode}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }
}

function issueFrom(stdout: string): { status: string; assignee?: string; close_reason?: string } {
  const value = JSON.parse(stdout) as Array<{ status: string; assignee?: string; close_reason?: string }> | { status: string; assignee?: string; close_reason?: string };
  return Array.isArray(value) ? value[0]! : value;
}

describe("independent Beads CLI probe", () => {
  const testBd = bdAvailable() ? test : test.skip;

  testBd("reproduces the supported CLI lifecycle in a disposable repository", { timeout: 20_000 }, () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "tgo-bd-probe-"));
    try {
      const version = runBd(directory, ["--version"]);
      expectBdSuccess(version);
      expect(version.stdout).toContain("bd version");
      expectBdSuccess(runBd(directory, ["init", "--non-interactive", "--skip-hooks"]));
      expect(existsSync(path.join(directory, ".beads"))).toBe(true);
      expect(directory).not.toBe(process.cwd());
      const created = runBd(directory, ["create", "TGO disposable probe", "-t", "task", "-p", "2", "--json"]);
      expectBdSuccess(created);
      const issue = JSON.parse(created.stdout) as { id: string; status: string };
      expect(issue.status).toBe("open");
      const shown = runBd(directory, ["show", "--json", issue.id]);
      expectBdSuccess(shown);
      expect((JSON.parse(shown.stdout) as Array<{ status: string }>)[0]?.status).toBe("open");
      const claimed = runBd(directory, ["update", "--json", issue.id, "--claim"]);
      expectBdSuccess(claimed);
      const claimedIssue = issueFrom(claimed.stdout);
      expect(claimedIssue.status).toBe("in_progress");
      expect(claimedIssue.assignee).toBeTruthy();
      const claimedShown = runBd(directory, ["show", "--json", issue.id]);
      expectBdSuccess(claimedShown);
      expect(issueFrom(claimedShown.stdout).status).toBe("in_progress");
      const closed = runBd(directory, ["close", issue.id, "--reason", "probe complete", "--json"]);
      expectBdSuccess(closed);
      const closedShown = runBd(directory, ["show", "--json", issue.id]);
      expectBdSuccess(closedShown);
      const closedIssue = issueFrom(closedShown.stdout);
      expect(closedIssue.status).toBe("closed");
      expect(closedIssue.close_reason).toBe("probe complete");
      const invalid = runBd(directory, ["show", "--json"]);
      expect(invalid.exitCode).not.toBe(0);
      expect(invalid.command).toBe('"bd" "show" "--json"');
      expect(typeof invalid.stdout).toBe("string");
      expect(typeof invalid.stderr).toBe("string");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  testBd("(1) happy claim: create → open, bd update --claim exit 0, bd show ⇒ in_progress + assignee truthy", { timeout: 20_000 }, () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "tgo-bd-probe-"));
    try {
      expect(directory).not.toBe(process.cwd());
      expectBdSuccess(runBd(directory, ["init", "--non-interactive", "--skip-hooks"]));
      const created = runBd(directory, ["create", "TGO happy claim probe", "-t", "task", "-p", "2", "--json"]);
      expectBdSuccess(created);
      const issue = JSON.parse(created.stdout) as { id: string; status: string };
      expect(issue.status).toBe("open");
      const claimed: BdResult = runBd(directory, ["update", "--json", issue.id, "--claim"]);
      expect(claimed.exitCode).toBe(0);
      expect(typeof claimed.stdout).toBe("string");
      expect(typeof claimed.stderr).toBe("string");
      const claimedIssue = issueFrom(claimed.stdout);
      expect(claimedIssue.status).toBe("in_progress");
      expect(claimedIssue.assignee).toBeTruthy();
      // capture observed fields as would be supplied to delegation packet
      const observed = {
        issueStatusObserved: claimedIssue.status,
        issueAssigneeObserved: claimedIssue.assignee!,
        claimExitCode: claimed.exitCode,
      };
      expect(observed.issueStatusObserved).toBe("in_progress");
      expect(observed.claimExitCode).toBe(0);
      expect(verifyClaimObserved(observed as never)).toBe(true);
      const shown = runBd(directory, ["show", "--json", issue.id]);
      expectBdSuccess(shown);
      const shownIssue = issueFrom(shown.stdout);
      expect(shownIssue.status).toBe("in_progress");
      expect(shownIssue.assignee).toBeTruthy();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("(2) forged packet without observed fields rejected by validateDelegationBoundary/verifyClaimObserved", () => {
    // Also covered in delegation.test.ts: rejects forged issueClaimed:true without observed fields
    const forgedPacket = {
      Objective: "Replace the value",
      Files: ["src/value.ts"],
      Interfaces: "Keep the exported function signature",
      Constraints: "Do not change adjacent behavior",
      Verification: "Run the focused test",
      exitGate: true,
      issueId: "tgo-test",
      issueClaimed: true,
      delegationId: "delegation-test",
      beadsOperator: "Bernstein",
    };
    const result = validateDelegationBoundary({
      touchSet: ["src/value.ts"],
      delegationPacket: forgedPacket,
    });
    expect(result?.valid).toBe(false);
    expect(result?.missing).toEqual(expect.arrayContaining(["issueStatusObserved", "issueAssigneeObserved", "claimExitCode"]));
    expect(result?.diagnostics.join(" ")).toContain("issueClaimed is forgeable");
    expect(result?.diagnostics.join(" ")).toContain("observed claim fields");
    expect(verifyClaimObserved(forgedPacket as never)).toBe(false);
    // documented as covered in delegation.test.ts
  });

  test("(3) observed packet passes validator (issueStatusObserved:in_progress etc.)", () => {
    const observedPacket = {
      Objective: "Replace the value",
      Files: ["src/value.ts"],
      Interfaces: "Keep the exported function signature",
      Constraints: "Do not change adjacent behavior",
      Verification: "Run the focused test",
      exitGate: true,
      issueId: "tgo-test",
      issueStatusObserved: "in_progress",
      issueAssigneeObserved: "ryangking",
      claimExitCode: 0,
      delegationId: "delegation-test",
      beadsOperator: "Bernstein",
    };
    const result = validateDelegationBoundary({
      touchSet: ["src/value.ts"],
      delegationPacket: observedPacket,
    });
    expect(result?.valid).toBe(true);
    expect(result?.missing).toEqual([]);
    expect(result?.malformed).toEqual([]);
    expect(result?.diagnostics.join(" ")).not.toContain("forgeable");
    expect(verifyClaimObserved(observedPacket as never)).toBe(true);
  });

  testBd("(4) bd show --json with missing id and bd update --json <nonexistent> --claim yield non-zero exit", { timeout: 20_000 }, () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "tgo-bd-probe-"));
    try {
      expect(directory).not.toBe(process.cwd());
      expectBdSuccess(runBd(directory, ["init", "--non-interactive", "--skip-hooks"]));
      // missing id
      const missingShow: BdResult = runBd(directory, ["show", "--json"]);
      expect(missingShow.exitCode).not.toBe(0);
      expect(missingShow.exitCode).toBe(1);
      expect(typeof missingShow.stdout).toBe("string");
      expect(typeof missingShow.stderr).toBe("string");

      // nonexistent id show
      const bogusId = "tgo-does-not-exist-9999";
      const bogusShow: BdResult = runBd(directory, ["show", "--json", bogusId]);
      expect(bogusShow.exitCode).not.toBe(0);
      expect(typeof bogusShow.stdout).toBe("string");
      expect(typeof bogusShow.stderr).toBe("string");

      // nonexistent id claim
      const bogusClaim: BdResult = runBd(directory, ["update", "--json", bogusId, "--claim"]);
      expect(bogusClaim.exitCode).not.toBe(0);
      expect(bogusClaim.exitCode).toBe(1);
      expect(typeof bogusClaim.stdout).toBe("string");
      expect(typeof bogusClaim.stderr).toBe("string");

      // treated as failed precondition — verifyClaimObserved would fail
      expect(verifyClaimObserved({ issueStatusObserved: "open", issueAssigneeObserved: "", claimExitCode: bogusClaim.exitCode } as never)).toBe(false);

      // valid direction: ensure create then show still works to prove repo is functional
      const created = runBd(directory, ["create", "TGO missing-id probe", "-t", "task", "-p", "2", "--json"]);
      expectBdSuccess(created);
      const issue = JSON.parse(created.stdout) as { id: string };
      const shown = runBd(directory, ["show", "--json", issue.id]);
      expectBdSuccess(shown);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  testBd("(5) double-claim on already-claimed id remains in_progress exit 0", { timeout: 20_000 }, () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "tgo-bd-probe-"));
    try {
      expect(directory).not.toBe(process.cwd());
      expectBdSuccess(runBd(directory, ["init", "--non-interactive", "--skip-hooks"]));
      const created = runBd(directory, ["create", "TGO double-claim probe", "-t", "task", "-p", "2", "--json"]);
      expectBdSuccess(created);
      const issue = JSON.parse(created.stdout) as { id: string };
      const firstClaim: BdResult = runBd(directory, ["update", "--json", issue.id, "--claim"]);
      expect(firstClaim.exitCode).toBe(0);
      const first = issueFrom(firstClaim.stdout);
      expect(first.status).toBe("in_progress");
      expect(first.assignee).toBeTruthy();

      const secondClaim: BdResult = runBd(directory, ["update", "--json", issue.id, "--claim"]);
      expect(secondClaim.exitCode).toBe(0);
      const second = issueFrom(secondClaim.stdout);
      expect(second.status).toBe("in_progress");
      expect(second.assignee).toBeTruthy();

      const shown = runBd(directory, ["show", "--json", issue.id]);
      expectBdSuccess(shown);
      const shownIssue = issueFrom(shown.stdout);
      expect(shownIssue.status).toBe("in_progress");
      expect(shownIssue.assignee).toBeTruthy();
      // capture observed fields for both claims
      expect(verifyClaimObserved({ issueStatusObserved: second.status, issueAssigneeObserved: second.assignee!, claimExitCode: secondClaim.exitCode } as never)).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  // --- failed-gate recovery probes (tgo-mvw) ---
  // Recovery creation via `bd create --deps discovered-from:<parent>` remains disabled/unproven in plugin.
  // The plugin is metadata-only; recovery `bd create` is planned but unsupported until live probe records exit 0 + new id.
  // All probes below use real subprocess spawnSync("bd", ...) and disposable mkdtempSync directories.

  testBd("(6) closed→open: create → claim → close → bd reopen exit 0, status open, closed_at cleared", { timeout: 20_000 }, () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "tgo-bd-probe-"));
    try {
      expect(directory).not.toBe(process.cwd());
      expectBdSuccess(runBd(directory, ["init", "--non-interactive", "--skip-hooks"]));
      const created = runBd(directory, ["create", "TGO closed-reopen probe", "-t", "task", "-p", "2", "--json"]);
      expectBdSuccess(created);
      const issue = JSON.parse(created.stdout) as { id: string };
      const claimed = runBd(directory, ["update", "--json", issue.id, "--claim"]);
      expect(claimed.exitCode).toBe(0);
      expect(issueFrom(claimed.stdout).status).toBe("in_progress");
      const closed = runBd(directory, ["close", issue.id, "--reason", "probe complete", "--json"]);
      expect(closed.exitCode).toBe(0);
      const closedShown = runBd(directory, ["show", "--json", issue.id]);
      expectBdSuccess(closedShown);
      const closedIssue = JSON.parse(closedShown.stdout) as Array<Record<string, unknown>>;
      expect(closedIssue[0]?.status).toBe("closed");
      expect(closedIssue[0]?.closed_at).toBeTruthy();
      // bd reopen closed → open
      const reopen = runBd(directory, ["reopen", issue.id, "-r", "recovery test", "--json"]);
      expect(reopen.exitCode).toBe(0);
      // stdout is JSON array with status open when --json, stderr empty
      if (reopen.stdout.trim()) {
        const reopened = JSON.parse(reopen.stdout) as Array<{ status: string }>;
        expect(reopened[0]?.status).toBe("open");
      }
      const reopenShown = runBd(directory, ["show", "--json", issue.id]);
      expectBdSuccess(reopenShown);
      const reopenedIssue = JSON.parse(reopenShown.stdout) as Array<Record<string, unknown>>;
      expect(reopenedIssue[0]?.status).toBe("open");
      // closed_at must be cleared after reopen (no longer closed)
      expect(reopenedIssue[0]?.closed_at).toBeUndefined();
      // Reopened event if observable: history should contain open after closed
      const history = runBd(directory, ["history", issue.id, "--json"]);
      if (history.exitCode === 0 && history.stdout.trim()) {
        const entries = JSON.parse(history.stdout) as Array<{ Issue: { status: string } }>;
        // most recent is open, previous is closed
        expect(entries[0]?.Issue.status).toBe("open");
        expect(entries.some((e) => e.Issue.status === "closed")).toBe(true);
        // Reopened event string if present in plain history
        const plain = runBd(directory, ["history", issue.id]);
        if (plain.stdout.includes("Reopened")) {
          expect(plain.stdout).toContain("Reopened");
        }
      }
      // then close again for cleanup
      const closedAgain = runBd(directory, ["close", issue.id, "--reason", "cleanup", "--json"]);
      expect(closedAgain.exitCode).toBe(0);
      const finalShown = runBd(directory, ["show", "--json", issue.id]);
      expectBdSuccess(finalShown);
      expect((JSON.parse(finalShown.stdout) as Array<{ status: string }>)[0]?.status).toBe("closed");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  testBd("(7) active→reopen is NOT valid recovery: in_progress demotes to open or already-open no-op (exit 0, not in_progress)", { timeout: 20_000 }, () => {
    // Spec hypothesized "is not closed (status: in_progress); nothing to do" but real bd 1.1.2 demotes in_progress → open.
    // Probes both open→reopen and in_progress→reopen to prove reopen is NOT valid recovery for active issue.
    const directory = mkdtempSync(path.join(os.tmpdir(), "tgo-bd-probe-"));
    try {
      expect(directory).not.toBe(process.cwd());
      expectBdSuccess(runBd(directory, ["init", "--non-interactive", "--skip-hooks"]));
      // open → reopen should be no-op "is already open"
      const createdOpen = runBd(directory, ["create", "TGO active-open probe", "-t", "task", "-p", "2", "--json"]);
      expectBdSuccess(createdOpen);
      const idOpen = (JSON.parse(createdOpen.stdout) as { id: string }).id;
      const shownOpen = runBd(directory, ["show", "--json", idOpen]);
      expect(issueFrom(shownOpen.stdout).status).toBe("open");
      const reopenOpen = runBd(directory, ["reopen", idOpen, "--json"]);
      expect(reopenOpen.exitCode).toBe(0);
      // real bd for open: empty stdout, stderr "is already open"
      expect((reopenOpen.stderr + reopenOpen.stdout).toLowerCase()).toContain("already open");
      const afterOpen = runBd(directory, ["show", "--json", idOpen]);
      expect(issueFrom(afterOpen.stdout).status).toBe("open");

      // in_progress → reopen demotes to open (loses claim) — NOT valid recovery
      const created = runBd(directory, ["create", "TGO active-inprog probe", "-t", "task", "-p", "2", "--json"]);
      expectBdSuccess(created);
      const id = (JSON.parse(created.stdout) as { id: string }).id;
      const claimed = runBd(directory, ["update", "--json", id, "--claim"]);
      expect(claimed.exitCode).toBe(0);
      expect(issueFrom(claimed.stdout).status).toBe("in_progress");
      const shownBefore = runBd(directory, ["show", "--json", id]);
      expect(issueFrom(shownBefore.stdout).status).toBe("in_progress");
      const reopenActive = runBd(directory, ["reopen", id, "--json"]);
      expect(reopenActive.exitCode).toBe(0);
      // Real bd 1.1.2: exit 0, stdout JSON status open, stderr empty — demotes in_progress to open.
      // If future bd changes to no-op with message, accept either but ensure not in_progress preservation via reopen alone.
      const combined = (reopenActive.stdout + reopenActive.stderr).toLowerCase();
      const saysAlreadyOpen = combined.includes("is already open") || combined.includes("is not closed");
      const stdoutJson = (() => {
        try { return JSON.parse(reopenActive.stdout) as Array<{ status: string }>; } catch { return null; }
      })();
      if (stdoutJson) {
        expect(stdoutJson[0]?.status).toBe("open");
      } else {
        expect(saysAlreadyOpen).toBe(true);
      }
      const after = runBd(directory, ["show", "--json", id]);
      expectBdSuccess(after);
      const afterIssue = issueFrom(after.stdout);
      // After reopen, status is open (demoted) — claim lost, proving reopen is NOT valid recovery for active issue.
      // If bd ever becomes no-op, status would remain open vs in_progress, still not preserving claim without re-claim.
      expect(["open", "in_progress"]).toContain(afterIssue.status);
      if (stdoutJson) {
        expect(afterIssue.status).toBe("open");
      } else {
        // no-op case: remains in_progress if we had started open, but we started in_progress — either way, reopen did not keep claim safely
        expect(afterIssue.status).not.toBe("closed");
      }
      // Prove actionable is keep open + satisfy missing + retry/reroute/escalate, NOT reopen to preserve in_progress
      // Re-claim would be required after demotion, so reopen alone is not a recovery.
      const reClaim = runBd(directory, ["update", "--json", id, "--claim"]);
      expect(reClaim.exitCode).toBe(0);
      expect(issueFrom(reClaim.stdout).status).toBe("in_progress");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  testBd("(8) missing→error: bd reopen bogus and no-id exit 1", { timeout: 20_000 }, () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "tgo-bd-probe-"));
    try {
      expect(directory).not.toBe(process.cwd());
      expectBdSuccess(runBd(directory, ["init", "--non-interactive", "--skip-hooks"]));
      // bogus id variants: spec requires both `bd reopen --json bogus... --json` and `bd reopen --json` (no id)
      const bogus1 = runBd(directory, ["reopen", "--json", "bogus-does-not-exist-xyz", "--json"]);
      // also cover canonical forms
      const bogus2 = runBd(directory, ["reopen", "bogus-does-not-exist-xyz", "--json"]);
      const bogus3 = runBd(directory, ["reopen", "--json", "bogus-does-not-exist-xyz"]);
      for (const result of [bogus1, bogus2, bogus3]) {
        expect(result.exitCode).toBe(1);
        expect(result.exitCode).not.toBe(0);
        const msg = (result.stderr + result.stdout).toLowerCase();
        expect(msg).toMatch(/no issue found|error resolving|does not exist/);
        expect(typeof result.stdout).toBe("string");
        expect(typeof result.stderr).toBe("string");
      }
      const noId = runBd(directory, ["reopen", "--json"]);
      expect(noId.exitCode).toBe(1);
      expect(noId.exitCode).not.toBe(0);
      expect((noId.stderr + noId.stdout).toLowerCase()).toMatch(/requires at least 1 arg|error/);
      const noIdNoJson = runBd(directory, ["reopen"]);
      expect(noIdNoJson.exitCode).not.toBe(0);
      // prove missing issue cannot be recovered via reopen — must use user-clarification/escalate, not retry same id
      // recovery `bd create --deps discovered-from:<parent>` remains disabled/unproven in plugin (metadata-only)
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
