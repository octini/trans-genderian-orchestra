import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { BD_ENV } from "./config";
import { VALID_BEAD_ID, isValidBeadID } from "./def-snapshot";
import { lookupClaimObserved, type LiveClaimObserved } from "./verify-claim";

const runFile = promisify(execFile);

/** How long the single claim write may take before it fails without state change. */
const CLAIM_TIMEOUT_MS = 10_000;

export type ClaimToolLogger = (
  level: "info" | "warn" | "error",
  message: string,
  extra?: Record<string, unknown>,
) => void;

export interface ClaimSpawnResult {
  stdout: string;
  stderr: string;
}

/**
 * Host-supplied context for the claim-only tool. repoRoot is the pinned cwd
 * resolved from host input (`directory ?? worktree ?? project.worktree ?? "."`);
 * worker-supplied path fields are never read — tool args carry issueId only.
 */
export interface ClaimToolHost {
  repoRoot: unknown;
  isPrimary: boolean;
  allowed: boolean;
  log?: ClaimToolLogger;
  spawnClaim?: (args: string[], cwd: string) => Promise<ClaimSpawnResult>;
  lookup?: (issueId: unknown, repoRoot: unknown) => Promise<LiveClaimObserved>;
}

/** Per-tool gate: claim writes stay on unless explicitly disabled (override false). */
export const CLAIM_TOOL_ALLOWED_DEFAULT = true;

export function isClaimToolAllowed(override?: unknown): boolean {
  if (override === false) return false;
  if (override === true) return true;
  if (typeof process !== "undefined" && process.env?.TGO_BEADS_CLAIM_ALLOWED === "1") return true;
  return CLAIM_TOOL_ALLOWED_DEFAULT;
}

function deny(log: ClaimToolLogger, level: "warn" | "error", message: string, extra?: Record<string, unknown>): never {
  try {
    log(level, message, extra);
  } catch {}
  throw new Error(message);
}

function claimErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const err = error as { stderr?: unknown; message?: unknown; code?: unknown };
    if (typeof err.stderr === "string" && err.stderr.trim().length > 0) {
      const line = err.stderr.split(/\r?\n/).find((it) => it.trim().length > 0);
      if (line) return line.trim();
    }
    if (err.code === "ENOENT") return "bd not found on PATH";
    if (typeof err.message === "string" && err.message.trim().length > 0) {
      const line = err.message.split(/\r?\n/).find((it) => it.trim().length > 0);
      if (line) return line.trim();
    }
  }
  return String(error);
}

async function defaultSpawnClaim(args: string[], cwd: string): Promise<ClaimSpawnResult> {
  const { stdout, stderr } = await runFile("bd", args, {
    cwd,
    env: BD_ENV,
    timeout: CLAIM_TIMEOUT_MS,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return { stdout: stdout ?? "", stderr: stderr ?? "" };
}

/**
 * Claim-only host write: verify-first, claim-if-unowned, confirm-by-re-show.
 *
 * Sequence: primary + allowed + explicit-cwd + VALID_BEAD_ID gates first (no
 * spawn on any reject) → pre `show` lookup → `update <id> --claim` via argv
 * spawn only when unowned → post `show` owner confirm. An already-owned issue
 * (own or competing owner) reports without overwrite, so a retry after a crash
 * between write and confirm converges via the live pre-lookup and never issues
 * a blind second write. Claim ONLY — no other lifecycle writes on this path.
 * Diagnostics go through the host log; reads are never cleared or mutated here.
 */
export async function executeBeadsClaim(
  toolArgs: Record<string, unknown>,
  host: ClaimToolHost,
): Promise<string> {
  const log: ClaimToolLogger = host.log ?? (() => {});
  const spawn = host.spawnClaim ?? defaultSpawnClaim;
  const lookup = host.lookup ?? lookupClaimObserved;

  if (!host.allowed) {
    deny(log, "error", "tgo_beads_claim denied: claim writes are disabled (allowed:false)", {
      allowed: false,
    });
  }
  if (!host.isPrimary) {
    deny(log, "warn", "tgo_beads_claim denied: primary-seat only — delegated seats cannot claim issues");
  }
  if (typeof host.repoRoot !== "string" || host.repoRoot.trim().length === 0) {
    deny(log, "error", "tgo_beads_claim denied: explicit repoRoot is required; ambient cwd is never used");
  }
  const cwd = host.repoRoot as string;

  // Only issueId is read from worker args; cwd/path/directory fields are ignored.
  const rawId = toolArgs?.issueId;
  if (typeof rawId !== "string") {
    deny(log, "warn", `tgo_beads_claim denied: invalid issueId ${JSON.stringify(rawId)} — must match VALID_BEAD_ID`);
  }
  const id = (rawId as string).trim();
  if (id.length === 0 || !isValidBeadID(id)) {
    deny(log, "warn", `tgo_beads_claim denied: invalid issueId ${JSON.stringify(rawId)} — must match VALID_BEAD_ID ${VALID_BEAD_ID.source}`, {
      issueId: rawId as string,
    });
  }

  let pre: LiveClaimObserved;
  try {
    pre = await lookup(id, cwd);
  } catch (error) {
    deny(log, "error", `tgo_beads_claim denied for ${id}: pre-claim lookup failed: ${String(error)}`, {
      issueId: id,
    });
  }
  if (pre!.exitCode !== 0) {
    deny(log, "error", `tgo_beads_claim denied for ${id}: pre-claim lookup failed (exit ${pre!.exitCode}, failed precondition); refusing write`, {
      issueId: id,
      claimExitCode: pre!.exitCode,
      stderr: (pre!.stderr ?? "").trim().slice(0, 400),
    });
  }
  if (
    pre!.status === "in_progress" &&
    typeof pre!.assignee === "string" &&
    pre!.assignee.trim().length > 0
  ) {
    try {
      log("info", `beads claim already owned for ${id}: owner ${pre!.assignee} — no overwrite`, {
        issueId: id,
        assignee: pre!.assignee,
      });
    } catch {}
    return `already claimed ${id}: owner ${pre!.assignee} — no overwrite (verify-first, retry safe)`;
  }

  try {
    await spawn(["update", id, "--claim"], cwd);
  } catch (error) {
    deny(log, "error", `tgo_beads_claim write failed for ${id}: ${claimErrorMessage(error)}`, {
      issueId: id,
    });
  }

  let post: LiveClaimObserved;
  try {
    post = await lookup(id, cwd);
  } catch (error) {
    deny(log, "error", `tgo_beads_claim unverified for ${id}: post-claim lookup failed: ${String(error)}`, {
      issueId: id,
    });
  }
  if (
    post!.exitCode !== 0 ||
    post!.status !== "in_progress" ||
    typeof post!.assignee !== "string" ||
    post!.assignee.trim().length === 0
  ) {
    deny(
      log,
      "error",
      `tgo_beads_claim unverified for ${id}: post-claim owner confirm failed (status=${JSON.stringify(post!.status)} assignee=${JSON.stringify(post!.assignee)} exit=${post!.exitCode})`,
      { issueId: id, observedStatus: post!.status, observedAssignee: post!.assignee, claimExitCode: post!.exitCode },
    );
  }

  const owner = (post!.assignee as string).trim();
  try {
    log("info", `beads claim observed for ${id}: owner ${owner} (status in_progress)`, {
      issueId: id,
      assignee: owner,
    });
  } catch {}
  return `claimed ${id}: owner ${owner} (status in_progress, verified by re-show)`;
}
