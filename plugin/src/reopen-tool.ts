import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { BD_ENV } from "./config";
import { VALID_BEAD_ID, isValidBeadID } from "./def-snapshot";
import { lookupClaimObserved, type LiveClaimObserved } from "./verify-claim";

const runFile = promisify(execFile);

/** How long the single reopen write may take before it fails without state change. */
const REOPEN_TIMEOUT_MS = 10_000;

export type ReopenToolLogger = (
  level: "info" | "warn" | "error",
  message: string,
  extra?: Record<string, unknown>,
) => void;

export interface ReopenSpawnResult {
  stdout: string;
  stderr: string;
}

/**
 * Host-supplied context for the reopen-only tool. repoRoot is the pinned cwd
 * resolved from host input (`directory ?? worktree ?? project.worktree ?? "."`);
 * worker-supplied path fields are never read — tool args carry issueId only.
 */
export interface ReopenToolHost {
  repoRoot: unknown;
  isPrimary: boolean;
  allowed: boolean;
  log?: ReopenToolLogger;
  spawnReopen?: (args: string[], cwd: string) => Promise<ReopenSpawnResult>;
  lookup?: (issueId: unknown, repoRoot: unknown) => Promise<LiveClaimObserved>;
}

/** Per-tool gate: reopen writes stay on unless explicitly disabled (override false). */
export const REOPEN_TOOL_ALLOWED_DEFAULT = true;

export function isReopenToolAllowed(override?: unknown): boolean {
  if (override === false) return false;
  if (override === true) return true;
  if (typeof process !== "undefined" && process.env?.TGO_BEADS_REOPEN_ALLOWED === "1") return true;
  return REOPEN_TOOL_ALLOWED_DEFAULT;
}

function deny(log: ReopenToolLogger, level: "warn" | "error", message: string, extra?: Record<string, unknown>): never {
  try {
    log(level, message, extra);
  } catch {}
  throw new Error(message);
}

function reopenErrorMessage(error: unknown): string {
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

async function defaultSpawnReopen(args: string[], cwd: string): Promise<ReopenSpawnResult> {
  const { stdout, stderr } = await runFile("bd", args, {
    cwd,
    env: BD_ENV,
    timeout: REOPEN_TIMEOUT_MS,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return { stdout: stdout ?? "", stderr: stderr ?? "" };
}

/**
 * Reopen-only host write: verify-first, closed-only, confirm-by-re-show.
 *
 * Sequence: primary + allowed + explicit-cwd + VALID_BEAD_ID gates first (no
 * spawn on any reject) → pre `show` lookup (missing → deny, no spawn) → allow
 * ONLY `status === "closed"` to proceed: `open` returns a logged no-op
 * (zero spawn, never a blind second write) and `in_progress` is denied
 * explicitly (reopening would demote a live claim and lose the owner, so the
 * claim stays intact) → `reopen <id>` via argv spawn → post `show` open
 * confirm. A crash between reopen and response retries via the live pre-show:
 * the retried lookup already observes `open`, so the retry converges on the
 * already-open no-op and never issues a second write. Never auto-reopen as
 * failed-gate recovery — explicit calls only. Reopen ONLY — no other
 * lifecycle writes on this path. Diagnostics go through the host log; reads
 * are never cleared or mutated here.
 */
export async function executeBeadsReopen(
  toolArgs: Record<string, unknown>,
  host: ReopenToolHost,
): Promise<string> {
  const log: ReopenToolLogger = host.log ?? (() => {});
  const spawn = host.spawnReopen ?? defaultSpawnReopen;
  const lookup = host.lookup ?? lookupClaimObserved;

  if (!host.allowed) {
    deny(log, "error", "tgo_beads_reopen denied: reopen writes are disabled (allowed:false)", {
      allowed: false,
    });
  }
  if (!host.isPrimary) {
    deny(log, "warn", "tgo_beads_reopen denied: primary-seat only — delegated seats cannot reopen issues");
  }
  if (typeof host.repoRoot !== "string" || host.repoRoot.trim().length === 0) {
    deny(log, "error", "tgo_beads_reopen denied: explicit repoRoot is required; ambient cwd is never used");
  }
  const cwd = host.repoRoot as string;

  // Only issueId is read from worker args; cwd/path/directory fields are ignored.
  const rawId = toolArgs?.issueId;
  if (typeof rawId !== "string") {
    deny(log, "warn", `tgo_beads_reopen denied: invalid issueId ${JSON.stringify(rawId)} — must match VALID_BEAD_ID`);
  }
  const id = (rawId as string).trim();
  if (id.length === 0 || !isValidBeadID(id)) {
    deny(log, "warn", `tgo_beads_reopen denied: invalid issueId ${JSON.stringify(rawId)} — must match VALID_BEAD_ID ${VALID_BEAD_ID.source}`, {
      issueId: rawId as string,
    });
  }

  let pre: LiveClaimObserved;
  try {
    pre = await lookup(id, cwd);
  } catch (error) {
    deny(log, "error", `tgo_beads_reopen denied for ${id}: pre-reopen lookup failed: ${String(error)}`, {
      issueId: id,
    });
  }
  if (pre!.exitCode !== 0) {
    deny(log, "error", `tgo_beads_reopen denied for ${id}: pre-reopen lookup failed (exit ${pre!.exitCode}, failed precondition); refusing write`, {
      issueId: id,
      claimExitCode: pre!.exitCode,
      stderr: (pre!.stderr ?? "").trim().slice(0, 400),
    });
  }
  if (pre!.status === "open") {
    try {
      log("info", `beads reopen already open for ${id} — no-op (never re-write)`, {
        issueId: id,
      });
    } catch {}
    return `already open ${id} — no-op (never re-write)`;
  }
  if (pre!.status === "in_progress") {
    deny(log, "warn", `tgo_beads_reopen denied for ${id}: issue is in_progress (owner ${JSON.stringify(pre!.assignee)}) — reopening would demote a live claim and lose the owner; claim stays intact`, {
      issueId: id,
      observedStatus: pre!.status,
      observedAssignee: pre!.assignee,
    });
  }
  if (pre!.status !== "closed") {
    deny(log, "warn", `tgo_beads_reopen denied for ${id}: only closed issues may be reopened (status=${JSON.stringify(pre!.status)})`, {
      issueId: id,
      observedStatus: pre!.status,
    });
  }

  try {
    await spawn(["reopen", id], cwd);
  } catch (error) {
    deny(log, "error", `tgo_beads_reopen write failed for ${id}: ${reopenErrorMessage(error)}`, {
      issueId: id,
    });
  }

  let post: LiveClaimObserved;
  try {
    post = await lookup(id, cwd);
  } catch (error) {
    deny(log, "error", `tgo_beads_reopen unverified for ${id}: post-reopen lookup failed: ${String(error)}`, {
      issueId: id,
    });
  }
  if (post!.exitCode !== 0 || post!.status !== "open") {
    deny(
      log,
      "error",
      `tgo_beads_reopen unverified for ${id}: post-reopen confirm failed (status=${JSON.stringify(post!.status)} exit=${post!.exitCode})`,
      { issueId: id, observedStatus: post!.status, claimExitCode: post!.exitCode },
    );
  }

  try {
    log("info", `beads reopen observed for ${id}: open (verified by re-show)`, {
      issueId: id,
    });
  } catch {}
  return `reopened ${id}: verified open (verified by re-show)`;
}
