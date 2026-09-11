import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { BD_ENV } from "./config";
import { VALID_BEAD_ID, isValidBeadID } from "./def-snapshot";
import { lookupClaimObserved, type LiveClaimObserved } from "./verify-claim";

const runFile = promisify(execFile);

/** How long the single create write may take before it fails without confirm. */
const CREATE_TIMEOUT_MS = 10_000;

/** Max title length; longer values are rejected before any spawn. */
export const CREATE_TITLE_MAX = 200;

/** Max description length; longer values are rejected before any spawn. */
export const CREATE_DESCRIPTION_MAX = 2000;

/** Issue types accepted on this path (strict allowlist; `bd create --help` lists more). */
export const CREATE_TYPES = ["task", "bug", "feature", "epic", "chore"] as const;

export type CreateIssueType = (typeof CREATE_TYPES)[number];

/** Priorities accepted on this path, normalized to string before spawn. */
const CREATE_PRIORITIES = ["0", "1", "2", "3", "4"] as const;

export type CreateToolLogger = (
  level: "info" | "warn" | "error",
  message: string,
  extra?: Record<string, unknown>,
) => void;

export interface CreateSpawnResult {
  stdout: string;
  stderr: string;
}

/**
 * Host-supplied context for the create-only tool. repoRoot is the pinned cwd
 * resolved from host input (`directory ?? worktree ?? project.worktree ?? "."`);
 * worker-supplied path fields are never read — tool args carry title,
 * description, type, and priority only.
 */
export interface CreateToolHost {
  repoRoot: unknown;
  isPrimary: boolean;
  allowed: boolean;
  log?: CreateToolLogger;
  spawnCreate?: (args: string[], cwd: string) => Promise<CreateSpawnResult>;
  lookup?: (issueId: unknown, repoRoot: unknown) => Promise<LiveClaimObserved>;
}

/** Per-tool gate: create writes stay off unless explicitly enabled (dev/test path). */
export const CREATE_TOOL_ALLOWED_DEFAULT = false;

export function isCreateToolAllowed(override?: unknown): boolean {
  if (override === true) return true;
  if (typeof process !== "undefined" && process.env?.TGO_BEADS_CREATE_ALLOWED === "1") return true;
  return CREATE_TOOL_ALLOWED_DEFAULT;
}

function deny(log: CreateToolLogger, level: "warn" | "error", message: string, extra?: Record<string, unknown>): never {
  try {
    log(level, message, extra);
  } catch {}
  throw new Error(message);
}

function createErrorMessage(error: unknown): string {
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

async function defaultSpawnCreate(args: string[], cwd: string): Promise<CreateSpawnResult> {
  const { stdout, stderr } = await runFile("bd", args, {
    cwd,
    env: BD_ENV,
    timeout: CREATE_TIMEOUT_MS,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return { stdout: stdout ?? "", stderr: stderr ?? "" };
}

function createdIdFromCreateStdout(stdout: string): string | undefined {
  try {
    const trimmed = (stdout ?? "").trim();
    if (trimmed.length === 0) return undefined;
    const parsed: unknown = JSON.parse(trimmed);
    const bead = Array.isArray(parsed)
      ? (parsed[0] as Record<string, unknown> | undefined)
      : (parsed as Record<string, unknown> | undefined);
    if (!bead || typeof bead !== "object") return undefined;
    if ("error" in bead) return undefined;
    const id = (bead as { id?: unknown }).id;
    return typeof id === "string" && id.trim().length > 0 ? id.trim() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Create-only host write: validate-first, spawn once, log ID, confirm by re-show.
 *
 * Sequence: primary + allowed + explicit-cwd + title/type/priority/description
 * gates first (no spawn on any reject) → `create` via argv spawn → LOG THE
 * CREATED ID to the host log synchronously → post `show` exists confirm.
 * Retry is caller-managed and NON-IDEMPOTENT: every spawn mints a fresh issue,
 * so callers reconcile by title/time, never auto-delete, never reuse.
 * A crash between DB success and ID return leaves the logged line as the
 * recovery record (orphan-create mirrors the spec's orphan-claim risk:
 * Bernstein re-claims or re-delegates explicitly, never auto-closes).
 * Create ONLY — no update/close/reopen/dep writes on this path.
 * Diagnostics go through the host log; reads are never cleared or mutated here.
 */
export async function executeBeadsCreate(
  toolArgs: Record<string, unknown>,
  host: CreateToolHost,
): Promise<string> {
  const log: CreateToolLogger = host.log ?? (() => {});
  const spawn = host.spawnCreate ?? defaultSpawnCreate;
  const lookup = host.lookup ?? lookupClaimObserved;

  if (!host.allowed) {
    deny(log, "error", "tgo_beads_create denied: create writes are disabled (allowed:false)", {
      allowed: false,
    });
  }
  if (!host.isPrimary) {
    deny(log, "warn", "tgo_beads_create denied: primary-seat only — delegated seats cannot create issues");
  }
  if (typeof host.repoRoot !== "string" || host.repoRoot.trim().length === 0) {
    deny(log, "error", "tgo_beads_create denied: explicit repoRoot is required; ambient cwd is never used");
  }
  const cwd = host.repoRoot as string;

  // Only title/description/type/priority are read from worker args; cwd/path/directory fields are ignored.
  const rawTitle = toolArgs?.title;
  if (typeof rawTitle !== "string") {
    deny(log, "warn", `tgo_beads_create denied: invalid title ${JSON.stringify(rawTitle)} — title must be a non-empty string (≤${CREATE_TITLE_MAX} chars)`);
  }
  const title = (rawTitle as string).trim();
  if (title.length === 0) {
    deny(log, "warn", "tgo_beads_create denied: invalid title — title must be a non-empty string", {
      title: rawTitle as string,
    });
  }
  if (title.length > CREATE_TITLE_MAX) {
    deny(log, "warn", `tgo_beads_create denied: invalid title — title too long (≤${CREATE_TITLE_MAX} chars)`, {
      titleLength: title.length,
    });
  }

  const rawDescription = toolArgs?.description;
  let description = "";
  if (rawDescription !== undefined && rawDescription !== null) {
    if (typeof rawDescription !== "string") {
      deny(log, "warn", `tgo_beads_create denied: invalid description ${JSON.stringify(rawDescription)} — description must be a string (≤${CREATE_DESCRIPTION_MAX} chars)`);
    }
    description = rawDescription as string;
    if (description.length > CREATE_DESCRIPTION_MAX) {
      deny(log, "warn", `tgo_beads_create denied: invalid description — description too long (≤${CREATE_DESCRIPTION_MAX} chars)`, {
        descriptionLength: description.length,
      });
    }
  }

  const rawType = toolArgs?.type;
  let type: CreateIssueType = "task";
  if (rawType !== undefined && rawType !== null && String(rawType).trim().length > 0) {
    if (typeof rawType !== "string" || !(CREATE_TYPES as readonly string[]).includes(rawType.trim())) {
      deny(log, "warn", `tgo_beads_create denied: invalid type ${JSON.stringify(rawType)} — must be one of ${(CREATE_TYPES as readonly string[]).join("|")}`);
    }
    type = (rawType as string).trim() as CreateIssueType;
  } else if (typeof rawType === "string") {
    deny(log, "warn", `tgo_beads_create denied: invalid type ${JSON.stringify(rawType)} — must be one of ${(CREATE_TYPES as readonly string[]).join("|")}`);
  }

  const rawPriority = toolArgs?.priority;
  let priority: (typeof CREATE_PRIORITIES)[number] = "2";
  if (rawPriority !== undefined && rawPriority !== null && String(rawPriority).trim().length > 0) {
    const normalized = String(rawPriority).trim();
    if (!(CREATE_PRIORITIES as readonly string[]).includes(normalized)) {
      deny(log, "warn", `tgo_beads_create denied: invalid priority ${JSON.stringify(rawPriority)} — must be one of ${(CREATE_PRIORITIES as readonly string[]).join("|")}`);
    }
    priority = normalized as (typeof CREATE_PRIORITIES)[number];
  } else if (
    (typeof rawPriority === "string" && rawPriority.trim().length === 0) ||
    (typeof rawPriority === "number" && !Number.isInteger(rawPriority))
  ) {
    deny(log, "warn", `tgo_beads_create denied: invalid priority ${JSON.stringify(rawPriority)} — must be one of ${(CREATE_PRIORITIES as readonly string[]).join("|")}`);
  }

  // Title/description ride as single `--flag=<value>` argv elements so a
  // leading-dash value (e.g. `--json`) stays a value, never a parsed flag.
  const args = ["create", `--title=${title}`];
  if (description.length > 0) args.push(`--description=${description}`);
  args.push("-t", type, "-p", priority, "--json");

  let stdout = "";
  try {
    const result = await spawn(args, cwd);
    stdout = result.stdout ?? "";
  } catch (error) {
    deny(log, "error", `tgo_beads_create write failed: ${createErrorMessage(error)}`);
  }

  const createdId = createdIdFromCreateStdout(stdout);
  if (!createdId || !isValidBeadID(createdId)) {
    deny(log, "error", `tgo_beads_create unverified: create returned no usable issue id — refusing confirm (stdout: ${JSON.stringify(stdout.trim().slice(0, 200))}, must match VALID_BEAD_ID ${VALID_BEAD_ID.source})`);
  }
  const newId = createdId as string;

  // Recovery record first: a crash after this line but before the confirm (or
  // before the caller sees the return) still leaves the minted id in app.log.
  try {
    log("info", `beads create observed for ${newId}: title ${JSON.stringify(title)} (type ${type}, priority ${priority})`, {
      issueId: newId,
      title,
      type,
      priority,
    });
  } catch {}

  let post: LiveClaimObserved;
  try {
    post = await lookup(newId, cwd);
  } catch (error) {
    deny(log, "error", `tgo_beads_create unverified for ${newId}: post-create lookup failed: ${String(error)}`, {
      issueId: newId,
    });
  }
  if (post!.exitCode !== 0) {
    deny(log, "error", `tgo_beads_create unverified for ${newId}: post-create confirm failed (exit ${post!.exitCode}, failed precondition); reconcile by title/time, never auto-delete`, {
      issueId: newId,
      claimExitCode: post!.exitCode,
      stderr: (post!.stderr ?? "").trim().slice(0, 400),
    });
  }

  return `created ${newId}: title ${JSON.stringify(title)} (type ${type}, priority ${priority}, verified by re-show)`;
}
