import * as fs from "node:fs/promises";
import * as path from "node:path";
import { assertValidBeadID, isValidBeadID } from "./def-snapshot";
import { safeWarn } from "./config";

export type Lane = "worktree" | "inline";

export const VALID_LANES = ["worktree", "inline"] as const;

export function isValidLane(value: unknown): value is Lane {
  return value === "worktree" || value === "inline";
}

export function parseLane(value: unknown): Lane | undefined {
  if (value === undefined) return undefined;
  if (isValidLane(value)) return value;
  return undefined;
}

/**
 * Branch name for a worktree lane: tgo/<issueId>-lane
 * Validates issueId via assertValidBeadID.
 */
export function worktreeBranchForIssue(issueId: string): string {
  assertValidBeadID(issueId);
  return `tgo/${issueId}-lane`;
}

/**
 * Sibling worktree path for a given repoRoot and issueId.
 * Resolves repoRoot to absolute, then sibling directory is
 * path.join(parentOfRepo, `${issueId}-lane`).
 * Validates issueId.
 */
export function worktreePathForIssue(repoRoot: string, issueId: string): string {
  assertValidBeadID(issueId);
  const resolved = path.resolve(repoRoot);
  const parent = path.dirname(resolved);
  // Guard against root parent (e.g. "/" or ".")
  if (!parent || parent === "/" || parent === "." || parent === resolved) {
    // Fallback to repoRoot itself joined — still deterministic, but not sibling
    return path.join(resolved, `${issueId}-lane`);
  }
  return path.join(parent, `${issueId}-lane`);
}

/**
 * Check if a target file path is inside a given worktree path.
 * - If targetPath is absolute, resolves and checks prefix.
 * - If targetPath is relative, resolves against worktreePath (session's rewritten context)
 *   and checks if it stays inside (prevents ../ escapes).
 * Returns true if inside, false if outside.
 * Also handles repoRoot-relative resolution for absolute checks when targetPath
 * is absolute but repoRoot is different — just checks absolute containment.
 */
export function isPathInsideWorktree(
  targetPath: string,
  worktreePath: string,
  // repoRoot is accepted for API compatibility but not used for relative resolution;
  // relative paths are resolved against worktreePath per "rewrite context" semantics.
  _repoRoot?: string,
): boolean {
  if (!targetPath || !worktreePath) return false;
  const resolvedWorktree = path.resolve(worktreePath);
  let resolvedTarget: string;
  if (path.isAbsolute(targetPath)) {
    resolvedTarget = path.resolve(targetPath);
  } else {
    // Relative → resolve against worktree (rewritten context)
    resolvedTarget = path.resolve(resolvedWorktree, targetPath);
  }
  // Exact match is inside
  if (resolvedTarget === resolvedWorktree) return true;
  // Ensure worktree prefix with separator to avoid prefix collision (e.g. /tmp/repo vs /tmp/repo2)
  const prefix = resolvedWorktree.endsWith(path.sep) ? resolvedWorktree : resolvedWorktree + path.sep;
  return resolvedTarget.startsWith(prefix);
}

/**
 * Extract a file path from tool args for mutation checks.
 * Supports edit/write (filePath/path), bash (no single file, return undefined),
 * and generic fallback (filePath, path, target, file).
 */
export function extractFilePathFromArgs(tool: string, args: unknown): string | undefined {
  if (!args || typeof args !== "object") return undefined;
  const obj = args as Record<string, unknown>;
  // Bash has no single file path — handled separately
  if (tool.toLowerCase().includes("bash")) return undefined;
  const candidates = ["filePath", "path", "target", "file", "filepath"];
  for (const key of candidates) {
    const v = obj[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  // Some edit tools use nested "edits" array — check first edit's filePath
  if (Array.isArray((obj as Record<string, unknown>).edits)) {
    const first = (obj as Record<string, unknown>).edits as Array<Record<string, unknown>>;
    if (first.length > 0 && typeof first[0]?.filePath === "string") return (first[0].filePath as string).trim();
  }
  return undefined;
}

/**
 * Heuristic: does a bash command string contain an absolute path that is
 * inside repoRoot but outside worktree? If so, treat as outside mutation.
 * Also detects if command explicitly references a path outside worktree via
 * absolute path containment check.
 * Returns true if command should be considered outside (i.e., block).
 */
export function isBashCommandOutsideWorktree(
  command: string,
  worktreePath: string,
  repoRoot: string,
): boolean {
  if (!command || !worktreePath || !repoRoot) return false;
  // Extract absolute-looking paths from command: tokens starting with "/" or containing ":\"
  // Simple regex for absolute POSIX paths (and Windows drive)
  const absolutePathRegex = /(?:^|[\s"'`])(\/(?:[^ \s"'`\\]+\/?)+)/g;
  let match: RegExpExecArray | null;
  const resolvedWorktree = path.resolve(worktreePath);
  const resolvedRepo = path.resolve(repoRoot);
  while ((match = absolutePathRegex.exec(command)) !== null) {
    const candidateRaw = match[1].trim().replace(/[,;|&]+$/, "");
    if (!candidateRaw) continue;
    // Strip trailing punctuation that is not part of path
    const candidate = candidateRaw.replace(/[.]+$/, "");
    // Only consider paths that are absolute and look like file paths (contain "/" or known repo)
    // Check if candidate is inside repoRoot but not inside worktree
    try {
      const resolvedCandidate = path.resolve(candidate);
      // If candidate is inside repoRoot (main checkout) but not inside worktree, it's outside
      const isInsideRepo = resolvedCandidate === resolvedRepo || resolvedCandidate.startsWith(resolvedRepo + path.sep);
      const isInsideWorktree = resolvedCandidate === resolvedWorktree || resolvedCandidate.startsWith(resolvedWorktree + path.sep);
      // If it's inside repo but outside worktree, block
      if (isInsideRepo && !isInsideWorktree) return true;
      // Also if candidate is absolute and not inside worktree but looks like a file path,
      // and worktree is sibling of repo, then it's outside.
      // For generic case, if candidate is absolute and not inside worktree, but command
      // contains that path, we consider it outside only if it's plausibly a mutation target.
      // To avoid false positives for "echo /tmp/foo", we only block when candidate is under repoRoot
      // or when command contains typical mutation verbs?
      // For now, only block repoRoot-contained paths.
    } catch {
      continue;
    }
  }
  return false;
}

/**
 * Determine if a tool call should be blocked because it would mutate outside the worktree.
 * Returns { block, reason, target } where block indicates violation.
 * Zero overhead when lane is not worktree is handled by caller.
 */
export function shouldBlockOutsideWorktree(opts: {
  tool: string;
  args: unknown;
  worktreePath: string;
  repoRoot: string;
}): { block: boolean; target?: string; reason?: string } {
  const { tool, args, worktreePath, repoRoot } = opts;
  const lower = tool.toLowerCase();
  // Bash handling
  if (lower.includes("bash")) {
    const obj = args && typeof args === "object" ? (args as Record<string, unknown>) : {};
    const cmd = (obj.command as string) ?? (obj.cmd as string) ?? (obj.input as string);
    if (typeof cmd === "string" && cmd.trim().length > 0) {
      if (isBashCommandOutsideWorktree(cmd, worktreePath, repoRoot)) {
        return { block: true, target: cmd, reason: `bash command references path outside worktree at ${worktreePath}` };
      }
      // Generic bash without absolute outside path is considered inside after context rewrite → allow
      return { block: false };
    }
    return { block: false };
  }
  const filePath = extractFilePathFromArgs(tool, args);
  if (!filePath) return { block: false };
  const inside = isPathInsideWorktree(filePath, worktreePath, repoRoot);
  if (!inside) {
    return { block: true, target: filePath, reason: `file ${filePath} is outside worktree at ${worktreePath}` };
  }
  return { block: false };
}

export interface EnsureWorktreeOpts {
  repoRoot: string;
  issueId: string;
  worktreePath?: string;
  branch?: string;
  /** Optional runner for git commands — for testing. Defaults to Bun.spawn. */
  runGit?: (args: string[], cwd: string) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  /** Optional fs existence check — for testing. */
  exists?: (p: string) => Promise<boolean>;
  log?: (level: "info" | "warn" | "error", message: string, extra?: Record<string, unknown>) => void;
}

async function defaultRunGit(args: string[], cwd: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  try {
    // Prefer Bun.spawn if available
    if (typeof Bun !== "undefined" && typeof (Bun as unknown as { spawn?: unknown }).spawn === "function") {
      const proc = (Bun as unknown as { spawn: (args: string[], opts: unknown) => { stdout: ReadableStream; stderr: ReadableStream; exited: Promise<number> } }).spawn(args, {
        cwd,
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);
      return { exitCode, stdout, stderr };
    }
  } catch {}
  // Fallback to node:child_process
  const { spawn } = await import("node:child_process");
  return await new Promise((resolve) => {
    const child = spawn(args[0], args.slice(1), { cwd });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => { stdout += d.toString(); });
    child.stderr?.on("data", (d) => { stderr += d.toString(); });
    child.on("close", (code) => resolve({ exitCode: code ?? 1, stdout, stderr }));
    child.on("error", (err) => resolve({ exitCode: 1, stdout: "", stderr: String(err) }));
  });
}

async function defaultExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure a worktree exists for the given issueId at the expected sibling path.
 * Idempotent: if worktree already exists at path, returns created:false without git worktree add.
 * Validates issueId via assertValidBeadID for both branch and path.
 * Returns { worktreePath, branch, created }.
 */
export async function ensureWorktreeExists(opts: EnsureWorktreeOpts): Promise<{ worktreePath: string; branch: string; created: boolean }> {
  const { repoRoot, issueId } = opts;
  assertValidBeadID(issueId);
  const worktreePath = opts.worktreePath ?? worktreePathForIssue(repoRoot, issueId);
  const branch = opts.branch ?? worktreeBranchForIssue(issueId);
  const runGit = opts.runGit ?? defaultRunGit;
  const exists = opts.exists ?? defaultExists;
  const log = opts.log;

  // Validate again for path construction
  assertValidBeadID(issueId);

  // Idempotent check: if worktree directory already exists, assume it's the correct worktree
  // (We could run `git worktree list --porcelain` to verify, but fs existence is sufficient for idempotency)
  try {
    if (await exists(worktreePath)) {
      // Also check that it's actually a git worktree (contains .git file/dir)
      // If it exists but is not a git worktree, we still return created:false to avoid clobbering
      if (log) log("info", `worktree already exists at ${worktreePath} for ${issueId}`, { worktreePath, issueId, branch });
      return { worktreePath, branch, created: false };
    }
  } catch {}

  // Ensure parent directory exists
  const parent = path.dirname(worktreePath);
  try {
    await fs.mkdir(parent, { recursive: true });
  } catch {}

  // Determine if branch already exists: `git show-ref --verify refs/heads/<branch>`
  // We try to avoid using -b when branch exists.
  let branchExists = false;
  try {
    const ref = `refs/heads/${branch}`;
    const res = await runGit(["git", "show-ref", "--verify", ref], repoRoot);
    branchExists = res.exitCode === 0;
  } catch {
    branchExists = false;
  }

  // Fallback: try `git branch --list <branch>` if show-ref not available
  if (!branchExists) {
    try {
      const res = await runGit(["git", "branch", "--list", branch], repoRoot);
      if (res.stdout && res.stdout.trim().length > 0) branchExists = true;
    } catch {}
  }

  // Attempt worktree add
  const worktreeArgs = branchExists
    ? ["git", "worktree", "add", worktreePath, branch]
    : ["git", "worktree", "add", worktreePath, "-b", branch];

  try {
    const result = await runGit(worktreeArgs, repoRoot);
    if (result.exitCode === 0) {
      if (log) log("info", `worktree created at ${worktreePath} branch ${branch} for ${issueId}`, { worktreePath, branch, issueId });
      return { worktreePath, branch, created: true };
    }
    // If exitCode !=0, check if it's because worktree already exists (idempotent) or branch exists
    const combined = (result.stdout + " " + result.stderr).toLowerCase();
    if (combined.includes("already exists") || combined.includes("already checked out")) {
      // Treat as existing
      return { worktreePath, branch, created: false };
    }
    // If branchExists was false but -b failed because branch already exists (race), try without -b
    if (!branchExists && combined.includes("already exists")) {
      const retry = await runGit(["git", "worktree", "add", worktreePath, branch], repoRoot);
      if (retry.exitCode === 0) return { worktreePath, branch, created: true };
      const retryCombined = (retry.stdout + " " + retry.stderr).toLowerCase();
      if (retryCombined.includes("already exists") || retryCombined.includes("already checked out")) {
        return { worktreePath, branch, created: false };
      }
      throw new Error(`git worktree add failed for ${issueId}: ${retry.stderr || retry.stdout}`);
    }
    throw new Error(`git worktree add failed for ${issueId}: ${result.stderr || result.stdout} (exit ${result.exitCode})`);
  } catch (e) {
    // If worktreePath was created despite error (race), treat as exists
    try {
      if (await exists(worktreePath)) {
        return { worktreePath, branch, created: false };
      }
    } catch {}
    throw e;
  }
}

/**
 * Build a corrective error message for a blocked worktree lane violation.
 * Includes the worktree path and how to comply.
 */
export function buildWorktreeViolationMessage(opts: {
  sessionID: string;
  tool: string;
  target?: string;
  worktreePath: string;
  issueId?: string;
}): string {
  const { sessionID, tool, target, worktreePath, issueId } = opts;
  const issuePart = issueId ? ` for ${issueId}` : "";
  const targetPart = target ? ` Target: ${target}.` : "";
  // Spec example: "run inside your worktree at <path>"
  return `Worktree lane violation: session ${sessionID}${issuePart} with lane=worktree attempted ${tool} outside worktree.${targetPart} Run inside your worktree at ${worktreePath}. All mutating operations must be inside ${worktreePath}.`;
}
