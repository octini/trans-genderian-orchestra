import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { BD_ENV } from "./config";
import { VALID_BEAD_ID, isValidBeadID } from "./def-snapshot";
import { lookupClaimObserved, type LiveClaimObserved } from "./verify-claim";

const runFile = promisify(execFile);

/** How long the single update write may take before it fails without state change. */
const UPDATE_TIMEOUT_MS = 10_000;

/** Max title length; longer values are rejected before any spawn. */
export const UPDATE_TITLE_MAX = 200;

/** Max description length; longer values are rejected before any spawn. */
export const UPDATE_DESCRIPTION_MAX = 2000;

/** Living-spec fields accepted on this path (strict allowlist, mirrors create). */
export const UPDATE_TYPES = ["task", "bug", "feature", "epic", "chore"] as const;

export type UpdateIssueType = (typeof UPDATE_TYPES)[number];

/** Priorities accepted on this path, normalized to string before spawn. */
const UPDATE_PRIORITIES = ["0", "1", "2", "3", "4"] as const;

export type UpdateToolLogger = (
  level: "info" | "warn" | "error",
  message: string,
  extra?: Record<string, unknown>,
) => void;

export interface UpdateSpawnResult {
  stdout: string;
  stderr: string;
}

/**
 * Host-supplied context for the update-only tool. repoRoot is the pinned cwd
 * resolved from host input (`directory ?? worktree ?? project.worktree ?? "."`);
 * worker-supplied path fields are never read — tool args carry issueId plus the
 * provided living-spec fields (title, description, priority, type) only.
 */
export interface UpdateToolHost {
  repoRoot: unknown;
  isPrimary: boolean;
  allowed: boolean;
  log?: UpdateToolLogger;
  spawnUpdate?: (args: string[], cwd: string) => Promise<UpdateSpawnResult>;
  lookup?: (issueId: unknown, repoRoot: unknown) => Promise<LiveClaimObserved>;
}

/** Per-tool gate: update writes stay on unless explicitly disabled (override false). */
export const UPDATE_TOOL_ALLOWED_DEFAULT = true;

export function isUpdateToolAllowed(override?: unknown): boolean {
  if (override === false) return false;
  if (override === true) return true;
  if (typeof process !== "undefined" && process.env?.TGO_BEADS_UPDATE_ALLOWED === "1") return true;
  return UPDATE_TOOL_ALLOWED_DEFAULT;
}

function deny(log: UpdateToolLogger, level: "warn" | "error", message: string, extra?: Record<string, unknown>): never {
  try {
    log(level, message, extra);
  } catch {}
  throw new Error(message);
}

function updateErrorMessage(error: unknown): string {
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

async function defaultSpawnUpdate(args: string[], cwd: string): Promise<UpdateSpawnResult> {
  const { stdout, stderr } = await runFile("bd", args, {
    cwd,
    env: BD_ENV,
    timeout: UPDATE_TIMEOUT_MS,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return { stdout: stdout ?? "", stderr: stderr ?? "" };
}

function beadFromUpdateShowStdout(stdout?: string): Record<string, unknown> | undefined {
  try {
    const trimmed = (stdout ?? "").trim();
    if (trimmed.length === 0) return undefined;
    const parsed: unknown = JSON.parse(trimmed);
    const bead = Array.isArray(parsed)
      ? (parsed[0] as Record<string, unknown> | undefined)
      : (parsed as Record<string, unknown> | undefined);
    if (!bead || typeof bead !== "object") return undefined;
    if ("error" in bead) return undefined;
    return bead;
  } catch {
    return undefined;
  }
}

function invalidIdMessage(raw: unknown): string {
  return `must match VALID_BEAD_ID ${VALID_BEAD_ID.source}`;
}

/**
 * Update-only host write: verify-first, strip-to-provided-fields, confirm-by-re-show.
 *
 * Sequence: primary + allowed + explicit-cwd + VALID_BEAD_ID + field gates
 * first (no spawn on any reject; at least one of title/description/priority/
 * type is required) → pre `show` lookup (missing → deny, no spawn) → REFUSE
 * `closed` issues (deny with a reopen-first hint; never mutate closed) →
 * `update <id>` with ONLY the provided fields as single `--flag=<value>` argv
 * elements (a leading-dash value stays a value, never a parsed flag) → post
 * `show` confirms the edited fields round-tripped. A retry after a crash
 * between write and confirm converges via the post-verify re-show and never
 * issues a blind second write. Update ONLY — no other lifecycle writes here.
 * Diagnostics go through the host log; reads are never cleared or mutated here.
 */
export async function executeBeadsUpdate(
  toolArgs: Record<string, unknown>,
  host: UpdateToolHost,
): Promise<string> {
  const log: UpdateToolLogger = host.log ?? (() => {});
  const spawn = host.spawnUpdate ?? defaultSpawnUpdate;
  const lookup = host.lookup ?? lookupClaimObserved;

  if (!host.allowed) {
    deny(log, "error", "tgo_beads_update denied: update writes are disabled (allowed:false)", {
      allowed: false,
    });
  }
  if (!host.isPrimary) {
    deny(log, "warn", "tgo_beads_update denied: primary-seat only — delegated seats cannot edit issues");
  }
  if (typeof host.repoRoot !== "string" || host.repoRoot.trim().length === 0) {
    deny(log, "error", "tgo_beads_update denied: explicit repoRoot is required; ambient cwd is never used");
  }
  const cwd = host.repoRoot as string;

  // Only issueId + living-spec fields are read from worker args; cwd/path/directory fields are ignored.
  const rawId = toolArgs?.issueId;
  if (typeof rawId !== "string") {
    deny(log, "warn", `tgo_beads_update denied: invalid issueId ${JSON.stringify(rawId)} — ${invalidIdMessage(rawId)}`);
  }
  const id = (rawId as string).trim();
  if (id.length === 0 || !isValidBeadID(id)) {
    deny(log, "warn", `tgo_beads_update denied: invalid issueId ${JSON.stringify(rawId)} — ${invalidIdMessage(rawId)}`, {
      issueId: rawId as string,
    });
  }

  const rawTitle = toolArgs?.title;
  let title: string | undefined;
  if (rawTitle !== undefined && rawTitle !== null) {
    if (typeof rawTitle !== "string") {
      deny(log, "warn", `tgo_beads_update denied for ${id}: invalid title ${JSON.stringify(rawTitle)} — title must be a non-empty string (≤${UPDATE_TITLE_MAX} chars)`, {
        issueId: id,
      });
    }
    const trimmed = (rawTitle as string).trim();
    if (trimmed.length === 0) {
      deny(log, "warn", `tgo_beads_update denied for ${id}: invalid title — title must be a non-empty string`, {
        issueId: id,
      });
    }
    if (trimmed.length > UPDATE_TITLE_MAX) {
      deny(log, "warn", `tgo_beads_update denied for ${id}: invalid title — title too long (≤${UPDATE_TITLE_MAX} chars)`, {
        issueId: id,
        titleLength: trimmed.length,
      });
    }
    title = trimmed;
  }

  const rawDescription = toolArgs?.description;
  let description: string | undefined;
  if (rawDescription !== undefined && rawDescription !== null) {
    if (typeof rawDescription !== "string") {
      deny(log, "warn", `tgo_beads_update denied for ${id}: invalid description ${JSON.stringify(rawDescription)} — description must be a string (≤${UPDATE_DESCRIPTION_MAX} chars)`, {
        issueId: id,
      });
    }
    if ((rawDescription as string).length > UPDATE_DESCRIPTION_MAX) {
      deny(log, "warn", `tgo_beads_update denied for ${id}: invalid description — description too long (≤${UPDATE_DESCRIPTION_MAX} chars)`, {
        issueId: id,
        descriptionLength: (rawDescription as string).length,
      });
    }
    description = rawDescription as string;
  }

  const rawPriority = toolArgs?.priority;
  let priority: (typeof UPDATE_PRIORITIES)[number] | undefined;
  if (rawPriority !== undefined && rawPriority !== null && String(rawPriority).trim().length > 0) {
    const normalized = String(rawPriority).trim();
    if (!(UPDATE_PRIORITIES as readonly string[]).includes(normalized)) {
      deny(log, "warn", `tgo_beads_update denied for ${id}: invalid priority ${JSON.stringify(rawPriority)} — must be one of ${(UPDATE_PRIORITIES as readonly string[]).join("|")}`, {
        issueId: id,
      });
    }
    priority = normalized as (typeof UPDATE_PRIORITIES)[number];
  } else if (rawPriority !== undefined && rawPriority !== null) {
    deny(log, "warn", `tgo_beads_update denied for ${id}: invalid priority ${JSON.stringify(rawPriority)} — must be one of ${(UPDATE_PRIORITIES as readonly string[]).join("|")}`, {
      issueId: id,
    });
  }

  const rawType = toolArgs?.type;
  let type: UpdateIssueType | undefined;
  if (rawType !== undefined && rawType !== null && String(rawType).trim().length > 0) {
    if (typeof rawType !== "string" || !(UPDATE_TYPES as readonly string[]).includes(rawType.trim())) {
      deny(log, "warn", `tgo_beads_update denied for ${id}: invalid type ${JSON.stringify(rawType)} — must be one of ${(UPDATE_TYPES as readonly string[]).join("|")}`, {
        issueId: id,
      });
    }
    type = (rawType as string).trim() as UpdateIssueType;
  } else if (typeof rawType === "string") {
    deny(log, "warn", `tgo_beads_update denied for ${id}: invalid type ${JSON.stringify(rawType)} — must be one of ${(UPDATE_TYPES as readonly string[]).join("|")}`, {
      issueId: id,
    });
  }

  const edited: string[] = [];
  if (title !== undefined) edited.push("title");
  if (description !== undefined) edited.push("description");
  if (priority !== undefined) edited.push("priority");
  if (type !== undefined) edited.push("type");
  if (edited.length === 0) {
    deny(log, "warn", `tgo_beads_update denied for ${id}: no fields to edit — provide at least one of title|description|priority|type`, {
      issueId: id,
    });
  }

  let pre: LiveClaimObserved;
  try {
    pre = await lookup(id, cwd);
  } catch (error) {
    deny(log, "error", `tgo_beads_update denied for ${id}: pre-update lookup failed: ${String(error)}`, {
      issueId: id,
    });
  }
  if (pre!.exitCode !== 0) {
    deny(log, "error", `tgo_beads_update denied for ${id}: pre-update lookup failed (exit ${pre!.exitCode}, failed precondition); refusing write`, {
      issueId: id,
      claimExitCode: pre!.exitCode,
      stderr: (pre!.stderr ?? "").trim().slice(0, 400),
    });
  }
  if (pre!.status === "closed") {
    deny(log, "warn", `tgo_beads_update denied for ${id}: issue is closed — reopen first with tgo_beads_reopen before editing living-spec fields (never mutate closed)`, {
      issueId: id,
    });
  }

  // Provided fields ride as single `--flag=<value>` argv elements so a
  // leading-dash value (e.g. `--json`) stays a value, never a parsed flag.
  const args = ["update", id];
  if (title !== undefined) args.push(`--title=${title}`);
  if (description !== undefined) args.push(`--description=${description}`);
  if (priority !== undefined) args.push(`--priority=${priority}`);
  if (type !== undefined) args.push(`--type=${type}`);
  try {
    await spawn(args, cwd);
  } catch (error) {
    deny(log, "error", `tgo_beads_update write failed for ${id}: ${updateErrorMessage(error)}`, {
      issueId: id,
    });
  }

  let post: LiveClaimObserved;
  try {
    post = await lookup(id, cwd);
  } catch (error) {
    deny(log, "error", `tgo_beads_update unverified for ${id}: post-update lookup failed: ${String(error)}`, {
      issueId: id,
    });
  }
  const bead = beadFromUpdateShowStdout(post!.stdout);
  const confirmed =
    post!.exitCode === 0 &&
    !!bead &&
    (title === undefined || bead.title === title) &&
    (description === undefined || (bead.description ?? "") === description) &&
    (priority === undefined || String(bead.priority) === priority) &&
    (type === undefined || bead.issue_type === type);
  if (!confirmed) {
    deny(
      log,
      "error",
      `tgo_beads_update unverified for ${id}: post-update field confirm failed (exit=${post!.exitCode} fields=${edited.join(",")})`,
      { issueId: id, fields: edited, claimExitCode: post!.exitCode },
    );
  }

  try {
    log("info", `beads update observed for ${id}: edited ${edited.join(",")} (verified by re-show)`, {
      issueId: id,
      fields: edited,
    });
  } catch {}
  return `updated ${id}: edited ${edited.join(",")} (verified by re-show)`;
}
