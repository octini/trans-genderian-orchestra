import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { BD_ENV } from "./config";
import { VALID_BEAD_ID, isValidBeadID } from "./def-snapshot";
import { lookupClaimObserved, type LiveClaimObserved } from "./verify-claim";
import { checkCloseGate, blockedCloseMessage } from "./exitgate/close-gate";

const runFile = promisify(execFile);

/** How long the single close write may take before it fails without state change. */
const CLOSE_TIMEOUT_MS = 10_000;

/** Max close-reason length; longer values are rejected before any spawn. */
export const CLOSE_REASON_MAX = 500;

export type CloseToolLogger = (
  level: "info" | "warn" | "error",
  message: string,
  extra?: Record<string, unknown>,
) => void;

export interface CloseSpawnResult {
  stdout: string;
  stderr: string;
}

export interface CloseGateResult {
  allowed: boolean;
  gate?: unknown;
  message?: string;
}

/**
 * Host-supplied context for the close-only tool. repoRoot is the pinned cwd
 * resolved from host input (`directory ?? worktree ?? project.worktree ?? "."`);
 * worker-supplied path fields are never read — tool args carry issueId + reason only.
 */
export interface CloseToolHost {
  repoRoot: unknown;
  isPrimary: boolean;
  allowed: boolean;
  log?: CloseToolLogger;
  spawnClose?: (args: string[], cwd: string) => Promise<CloseSpawnResult>;
  lookup?: (issueId: unknown, repoRoot: unknown) => Promise<LiveClaimObserved>;
  checkGate?: (repoRoot: string, issueId: string, specText: string) => Promise<CloseGateResult>;
}

/** Per-tool gate: close writes stay off unless explicitly enabled (dev/test path). */
export const CLOSE_TOOL_ALLOWED_DEFAULT = false;

export function isCloseToolAllowed(override?: unknown): boolean {
  if (override === true) return true;
  if (typeof process !== "undefined" && process.env?.TGO_BEADS_CLOSE_ALLOWED === "1") return true;
  return CLOSE_TOOL_ALLOWED_DEFAULT;
}

function deny(log: CloseToolLogger, level: "warn" | "error", message: string, extra?: Record<string, unknown>): never {
  try {
    log(level, message, extra);
  } catch {}
  throw new Error(message);
}

function closeErrorMessage(error: unknown): string {
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

async function defaultSpawnClose(args: string[], cwd: string): Promise<CloseSpawnResult> {
  const { stdout, stderr } = await runFile("bd", args, {
    cwd,
    env: BD_ENV,
    timeout: CLOSE_TIMEOUT_MS,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return { stdout: stdout ?? "", stderr: stderr ?? "" };
}

async function defaultCheckGate(repoRoot: string, issueId: string, specText: string): Promise<CloseGateResult> {
  return checkCloseGate(repoRoot, issueId, specText);
}

function specTextFromShowStdout(stdout?: string): string {
  try {
    if (!stdout || stdout.trim().length === 0) return "";
    const parsed: unknown = JSON.parse(stdout.trim());
    const bead = Array.isArray(parsed)
      ? (parsed[0] as Record<string, unknown> | undefined)
      : (parsed as Record<string, unknown> | undefined);
    if (!bead || typeof bead !== "object") return "";
    if ("error" in bead) return "";
    const description = (bead as { description?: unknown }).description;
    return typeof description === "string" ? description : "";
  } catch {
    return "";
  }
}

/**
 * Close-only host write: verify-first, gate-checked, confirm-by-re-show.
 *
 * Sequence: primary + allowed + explicit-cwd + VALID_BEAD_ID + reason gates
 * first (no spawn on any reject) → pre `show` lookup → already-closed returns
 * logged no-op (never reopen) → claim-verified (in_progress + assignee, else
 * deny) → `checkCloseGate` on the same pinned cwd (gate deny blocks close) →
 * `close <id> --reason <reason>` via argv spawn → post `show` closed confirm.
 * A crash between gate-pass and close requires a fresh gate on retry, never a
 * prior pass. Close ONLY — no other lifecycle writes on this path.
 * Diagnostics go through the host log; reads are never cleared here.
 */
export async function executeBeadsClose(
  toolArgs: Record<string, unknown>,
  host: CloseToolHost,
): Promise<string> {
  const log: CloseToolLogger = host.log ?? (() => {});
  const spawn = host.spawnClose ?? defaultSpawnClose;
  const lookup = host.lookup ?? lookupClaimObserved;
  const checkGate = host.checkGate ?? defaultCheckGate;

  if (!host.allowed) {
    deny(log, "error", "tgo_beads_close denied: close writes are disabled (allowed:false)", {
      allowed: false,
    });
  }
  if (!host.isPrimary) {
    deny(log, "warn", "tgo_beads_close denied: primary-seat only — delegated seats cannot close issues");
  }
  if (typeof host.repoRoot !== "string" || host.repoRoot.trim().length === 0) {
    deny(log, "error", "tgo_beads_close denied: explicit repoRoot is required; ambient cwd is never used");
  }
  const cwd = host.repoRoot as string;

  // Only issueId + reason are read from worker args; cwd/path/directory fields are ignored.
  const rawId = toolArgs?.issueId;
  if (typeof rawId !== "string") {
    deny(log, "warn", `tgo_beads_close denied: invalid issueId ${JSON.stringify(rawId)} — must match VALID_BEAD_ID`);
  }
  const id = (rawId as string).trim();
  if (id.length === 0 || !isValidBeadID(id)) {
    deny(log, "warn", `tgo_beads_close denied: invalid issueId ${JSON.stringify(rawId)} — must match VALID_BEAD_ID ${VALID_BEAD_ID.source}`, {
      issueId: rawId as string,
    });
  }

  const rawReason = toolArgs?.reason;
  if (typeof rawReason !== "string") {
    deny(log, "warn", `tgo_beads_close denied for ${id}: invalid reason ${JSON.stringify(rawReason)} — reason must be a non-empty string`, {
      issueId: id,
    });
  }
  const reason = (rawReason as string).trim();
  if (reason.length === 0) {
    deny(log, "warn", `tgo_beads_close denied for ${id}: invalid reason — reason must be a non-empty string`, {
      issueId: id,
    });
  }
  if (reason.length > CLOSE_REASON_MAX) {
    deny(log, "warn", `tgo_beads_close denied for ${id}: invalid reason — reason too long (≤${CLOSE_REASON_MAX} chars)`, {
      issueId: id,
    });
  }

  let pre: LiveClaimObserved;
  try {
    pre = await lookup(id, cwd);
  } catch (error) {
    deny(log, "error", `tgo_beads_close denied for ${id}: pre-close lookup failed: ${String(error)}`, {
      issueId: id,
    });
  }
  if (pre!.exitCode !== 0) {
    deny(log, "error", `tgo_beads_close denied for ${id}: pre-close lookup failed (exit ${pre!.exitCode}, failed precondition); refusing write`, {
      issueId: id,
      claimExitCode: pre!.exitCode,
      stderr: (pre!.stderr ?? "").trim().slice(0, 400),
    });
  }
  if (pre!.status === "closed") {
    try {
      log("info", `beads close already closed for ${id} — no-op (never reopen)`, {
        issueId: id,
      });
    } catch {}
    return `already closed ${id} — no-op (never reopen)`;
  }
  if (
    pre!.status !== "in_progress" ||
    typeof pre!.assignee !== "string" ||
    pre!.assignee.trim().length === 0
  ) {
    deny(
      log,
      "error",
      `tgo_beads_close denied for ${id}: claim unverified (status=${JSON.stringify(pre!.status)} assignee=${JSON.stringify(pre!.assignee)} exit=${pre!.exitCode}) — close requires verified claim`,
      { issueId: id, observedStatus: pre!.status, observedAssignee: pre!.assignee, claimExitCode: pre!.exitCode },
    );
  }

  const specText = specTextFromShowStdout(pre!.stdout);
  let gate: CloseGateResult;
  try {
    gate = await checkGate(cwd, id, specText);
  } catch (error) {
    deny(log, "error", `tgo_beads_close denied for ${id}: gate evaluation error: ${String(error)}`, {
      issueId: id,
    });
  }
  if (!gate!.allowed) {
    let detail = typeof gate!.message === "string" && gate!.message.trim().length > 0 ? gate!.message : "";
    if (!detail && gate!.gate && typeof gate!.gate === "object") {
      try {
        detail = blockedCloseMessage(gate!.gate as Parameters<typeof blockedCloseMessage>[0]);
      } catch {
        detail = "";
      }
    }
    deny(log, "error", `tgo_beads_close denied for ${id}: close blocked by exit gate${detail ? ` — ${detail}` : ""}`, {
      issueId: id,
    });
  }

  try {
    await spawn(["close", id, "--reason", reason], cwd);
  } catch (error) {
    deny(log, "error", `tgo_beads_close write failed for ${id}: ${closeErrorMessage(error)}`, {
      issueId: id,
    });
  }

  let post: LiveClaimObserved;
  try {
    post = await lookup(id, cwd);
  } catch (error) {
    deny(log, "error", `tgo_beads_close unverified for ${id}: post-close lookup failed: ${String(error)}`, {
      issueId: id,
    });
  }
  if (post!.exitCode !== 0 || post!.status !== "closed") {
    deny(
      log,
      "error",
      `tgo_beads_close unverified for ${id}: post-close confirm failed (status=${JSON.stringify(post!.status)} exit=${post!.exitCode})`,
      { issueId: id, observedStatus: post!.status, claimExitCode: post!.exitCode },
    );
  }

  try {
    log("info", `beads close observed for ${id}: closed (reason: ${reason})`, {
      issueId: id,
    });
  } catch {}
  return `closed ${id}: verified closed (reason: ${reason})`;
}
