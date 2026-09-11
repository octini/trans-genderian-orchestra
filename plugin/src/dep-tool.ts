import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { BD_ENV } from "./config";
import { VALID_BEAD_ID, isValidBeadID } from "./def-snapshot";
import { lookupClaimObserved, type LiveClaimObserved } from "./verify-claim";

const runFile = promisify(execFile);

/** How long the single dep write may take before it fails without state change. */
const DEP_TIMEOUT_MS = 10_000;

/**
 * Dependency types `bd dep add --type` documents. bd itself stores arbitrary
 * type strings (verified: `--type bogus` persists), so this allowlist is
 * stricter than bd — anything off-list is denied before any spawn.
 */
export const DEP_TYPE_ALLOWLIST = [
  "blocks",
  "tracks",
  "related",
  "parent-child",
  "discovered-from",
  "until",
  "caused-by",
  "validates",
  "relates-to",
  "supersedes",
] as const;

export type DepType = (typeof DEP_TYPE_ALLOWLIST)[number];

/** bd's default when --type is omitted. */
export const DEP_TYPE_DEFAULT: DepType = "blocks";

export function isDepType(value: unknown): value is DepType {
  return typeof value === "string" && (DEP_TYPE_ALLOWLIST as readonly string[]).includes(value);
}

export type DepToolLogger = (
  level: "info" | "warn" | "error",
  message: string,
  extra?: Record<string, unknown>,
) => void;

export interface DepSpawnResult {
  stdout: string;
  stderr: string;
}

export interface DepListObserved {
  exitCode: number;
  deps: Array<{ id: string; dependency_type?: string }>;
  stdout?: string;
  stderr?: string;
}

/**
 * Host-supplied context for the dep-only tool. repoRoot is the pinned cwd
 * resolved from host input (`directory ?? worktree ?? project.worktree ?? "."`);
 * worker-supplied path fields are never read — tool args carry issueId +
 * dependsOnId (+ optional type) only.
 */
export interface DepToolHost {
  repoRoot: unknown;
  isPrimary: boolean;
  allowed: boolean;
  log?: DepToolLogger;
  spawnDep?: (args: string[], cwd: string) => Promise<DepSpawnResult>;
  lookup?: (issueId: unknown, repoRoot: unknown) => Promise<LiveClaimObserved>;
  listDeps?: (issueId: string, cwd: string) => Promise<DepListObserved>;
}

/** Per-tool gate: dep writes stay on unless explicitly disabled (override false). */
export const DEP_TOOL_ALLOWED_DEFAULT = true;

export function isDepToolAllowed(override?: unknown): boolean {
  if (override === false) return false;
  if (override === true) return true;
  if (typeof process !== "undefined" && process.env?.TGO_BEADS_DEP_ALLOWED === "1") return true;
  return DEP_TOOL_ALLOWED_DEFAULT;
}

function deny(log: DepToolLogger, level: "warn" | "error", message: string, extra?: Record<string, unknown>): never {
  try {
    log(level, message, extra);
  } catch {}
  throw new Error(message);
}

function depErrorMessage(error: unknown): string {
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

async function defaultSpawnDep(args: string[], cwd: string): Promise<DepSpawnResult> {
  const { stdout, stderr } = await runFile("bd", args, {
    cwd,
    env: BD_ENV,
    timeout: DEP_TIMEOUT_MS,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return { stdout: stdout ?? "", stderr: stderr ?? "" };
}

function parseDepList(stdout: string): Array<{ id: string; dependency_type?: string }> | undefined {
  try {
    const trimmed = (stdout ?? "").trim();
    if (trimmed.length === 0) return undefined;
    const parsed: unknown = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return undefined;
    return parsed
      .filter((it): it is Record<string, unknown> => !!it && typeof it === "object" && !("error" in (it as Record<string, unknown>)))
      .filter((it) => typeof it.id === "string")
      .map((it) => ({
        id: it.id as string,
        ...(typeof it.dependency_type === "string" ? { dependency_type: it.dependency_type as string } : {}),
      }));
  } catch {
    return undefined;
  }
}

async function defaultListDeps(issueId: string, cwd: string): Promise<DepListObserved> {
  try {
    const { stdout, stderr } = await runFile("bd", ["dep", "list", issueId, "--json"], {
      cwd,
      env: BD_ENV,
      timeout: DEP_TIMEOUT_MS,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
    const deps = parseDepList(stdout ?? "");
    if (!deps) return { exitCode: 1, deps: [], stdout, stderr };
    return { exitCode: 0, deps, stdout, stderr };
  } catch (error) {
    if (error && typeof error === "object") {
      const err = error as { code?: unknown; stdout?: unknown; stderr?: unknown };
      const exitCode = typeof err.code === "number" ? err.code : 1;
      const stdout = typeof err.stdout === "string" ? err.stdout : undefined;
      const stderr = typeof err.stderr === "string" ? err.stderr : undefined;
      return { exitCode, deps: [], stdout, stderr };
    }
    return { exitCode: 1, deps: [] };
  }
}

function invalidIdMessage(raw: unknown): string {
  return `must match VALID_BEAD_ID ${VALID_BEAD_ID.source}`;
}

/**
 * Dep-only host write: verify-first, wire-if-absent, confirm-by-re-list.
 *
 * Sequence: primary + allowed + explicit-cwd + VALID_BEAD_ID (both sides) +
 * type-allowlist + self-edge gates first (no spawn on any reject) → pre
 * `show` lookup of BOTH endpoints (either missing → deny, no spawn) →
 * `dep add <issueId> <dependsOnId> [--type <type>]` via argv spawn → post
 * `dep list <issueId> --json` edge confirm. A same-type duplicate add is a
 * native bd no-op (exit 0, single edge), so a retry after a crash between
 * write and confirm converges via the post-verify re-list and never issues
 * a blind second edge. Dep ONLY — no other lifecycle writes on this path.
 * Diagnostics go through the host log; reads are never cleared or mutated here.
 */
export async function executeBeadsDep(
  toolArgs: Record<string, unknown>,
  host: DepToolHost,
): Promise<string> {
  const log: DepToolLogger = host.log ?? (() => {});
  const spawn = host.spawnDep ?? defaultSpawnDep;
  const lookup = host.lookup ?? lookupClaimObserved;
  const listDeps = host.listDeps ?? defaultListDeps;

  if (!host.allowed) {
    deny(log, "error", "tgo_beads_dep denied: dep writes are disabled (allowed:false)", {
      allowed: false,
    });
  }
  if (!host.isPrimary) {
    deny(log, "warn", "tgo_beads_dep denied: primary-seat only — delegated seats cannot wire dependencies");
  }
  if (typeof host.repoRoot !== "string" || host.repoRoot.trim().length === 0) {
    deny(log, "error", "tgo_beads_dep denied: explicit repoRoot is required; ambient cwd is never used");
  }
  const cwd = host.repoRoot as string;

  // Only issueId + dependsOnId + type are read from worker args; cwd/path/directory fields are ignored.
  const rawFrom = toolArgs?.issueId;
  if (typeof rawFrom !== "string") {
    deny(log, "warn", `tgo_beads_dep denied: invalid issueId ${JSON.stringify(rawFrom)} — ${invalidIdMessage(rawFrom)}`);
  }
  const from = (rawFrom as string).trim();
  if (from.length === 0 || !isValidBeadID(from)) {
    deny(log, "warn", `tgo_beads_dep denied: invalid issueId ${JSON.stringify(rawFrom)} — ${invalidIdMessage(rawFrom)}`, {
      issueId: rawFrom as string,
    });
  }
  const rawTo = toolArgs?.dependsOnId;
  if (typeof rawTo !== "string") {
    deny(log, "warn", `tgo_beads_dep denied for ${from}: invalid dependsOnId ${JSON.stringify(rawTo)} — ${invalidIdMessage(rawTo)}`, {
      issueId: from,
    });
  }
  const to = (rawTo as string).trim();
  if (to.length === 0 || !isValidBeadID(to)) {
    deny(log, "warn", `tgo_beads_dep denied for ${from}: invalid dependsOnId ${JSON.stringify(rawTo)} — ${invalidIdMessage(rawTo)}`, {
      issueId: from,
      dependsOnId: rawTo as string,
    });
  }
  if (from === to) {
    deny(log, "warn", `tgo_beads_dep denied for ${from}: self-edge refused — issueId and dependsOnId must differ`, {
      issueId: from,
    });
  }

  const rawType = toolArgs?.type;
  let type: DepType = DEP_TYPE_DEFAULT;
  if (rawType !== undefined) {
    if (!isDepType(rawType)) {
      deny(log, "warn", `tgo_beads_dep denied for ${from}: invalid type ${JSON.stringify(rawType)} — must be one of ${DEP_TYPE_ALLOWLIST.join("|")}`, {
        issueId: from,
        dependsOnId: to,
      });
    }
    type = rawType as DepType;
  }

  for (const endpoint of [from, to] as const) {
    let pre: LiveClaimObserved;
    try {
      pre = await lookup(endpoint, cwd);
    } catch (error) {
      deny(log, "error", `tgo_beads_dep denied for ${from} -> ${to}: pre-dep lookup failed for ${endpoint}: ${String(error)}`, {
        issueId: from,
        dependsOnId: to,
      });
    }
    if (pre!.exitCode !== 0) {
      deny(log, "error", `tgo_beads_dep denied for ${from} -> ${to}: pre-dep lookup failed for ${endpoint} (exit ${pre!.exitCode}, failed precondition); refusing write`, {
        issueId: from,
        dependsOnId: to,
        claimExitCode: pre!.exitCode,
        stderr: (pre!.stderr ?? "").trim().slice(0, 400),
      });
    }
  }

  const args = type === DEP_TYPE_DEFAULT && rawType === undefined
    ? ["dep", "add", from, to]
    : ["dep", "add", from, to, "--type", type];
  try {
    await spawn(args, cwd);
  } catch (error) {
    deny(log, "error", `tgo_beads_dep write failed for ${from} -> ${to}: ${depErrorMessage(error)}`, {
      issueId: from,
      dependsOnId: to,
    });
  }

  let post: DepListObserved;
  try {
    post = await listDeps(from, cwd);
  } catch (error) {
    deny(log, "error", `tgo_beads_dep unverified for ${from} -> ${to}: post-dep list failed: ${String(error)}`, {
      issueId: from,
      dependsOnId: to,
    });
  }
  const edge = post!.exitCode === 0
    ? post!.deps.find((it) => it.id === to && (rawType === undefined || it.dependency_type === type))
    : undefined;
  if (post!.exitCode !== 0 || !edge) {
    deny(
      log,
      "error",
      `tgo_beads_dep unverified for ${from} -> ${to}: post-dep edge confirm failed (exit=${post!.exitCode} type=${type})`,
      { issueId: from, dependsOnId: to, depType: type, claimExitCode: post!.exitCode },
    );
  }

  try {
    log("info", `beads dep observed for ${from} -> ${to}: depends on ${to} (type ${edge!.dependency_type ?? type})`, {
      issueId: from,
      dependsOnId: to,
      depType: edge!.dependency_type ?? type,
    });
  } catch {}
  return `wired ${from} depends on ${to} (type ${edge!.dependency_type ?? type}, verified by dep list)`;
}
