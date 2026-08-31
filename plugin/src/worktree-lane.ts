import * as fs from "node:fs/promises";
import * as fsSync from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
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
 * G2: realpath-based resolution — defeats symlink escapes.
 * Resolves the deepest EXISTING ancestor via fs.realpathSync and joins the
 * not-yet-existing tail lexically (a symlink cannot exist at a path that
 * does not exist, so the tail is safe). Returns undefined when even the
 * filesystem root cannot be resolved (caller treats as conservative block).
 */
function realpathTargetSafe(resolved: string): string | undefined {
  try {
    return fsSync.realpathSync(resolved);
  } catch {}
  // Walk up to the nearest existing ancestor, realpath it, join the lexical tail
  let cur = path.dirname(resolved);
  const tail: string[] = [path.basename(resolved)];
  for (let i = 0; i < 64; i++) {
    try {
      const real = fsSync.realpathSync(cur);
      return tail.length === 0 ? real : path.join(real, ...tail);
    } catch {}
    const parent = path.dirname(cur);
    if (parent === cur) return undefined;
    tail.unshift(path.basename(cur));
    cur = parent;
  }
  return undefined;
}

/**
 * Check if a target file path is inside a given worktree path.
 * - G2: containment is REALPATH-based (fs.realpathSync on the deepest existing
 *   ancestor of both sides) so symlinked directories inside the worktree that
 *   escape the boundary are blocked. Unresolvable worktree root → false (block).
 * - If targetPath is absolute, resolves and checks prefix.
 * - If targetPath is relative, resolves against repoRoot (child's actual cwd =
 *   parent checkout) when provided — this implements the G1 strict fallback:
 *   relative paths in lane=worktree child sessions resolve outside the worktree
 *   and are BLOCKED with corrective error asking orchestrator to re-dispatch
 *   with the worktree. When repoRoot is absent, falls back to worktreePath.
 * Returns true if inside, false if outside (or unresolvable — conservative).
 */
export function isPathInsideWorktree(
  targetPath: string,
  worktreePath: string,
  repoRoot?: string,
): boolean {
  if (!targetPath || !worktreePath) return false;
  const resolvedWorktree = path.resolve(worktreePath);
  let resolvedTarget: string;
  if (path.isAbsolute(targetPath)) {
    resolvedTarget = path.resolve(targetPath);
  } else if (targetPath.startsWith("~/")) {
    // Expand ~/ against homedir then check
    const home = process.env.HOME ?? os.homedir();
    resolvedTarget = path.resolve(home, targetPath.slice(2));
  } else {
    // G1 strict fallback: relative → resolve against repoRoot (child's actual cwd = parent checkout)
    // When repoRoot is provided, relative resolves outside worktree → blocked. Fallback to worktreePath only if repoRoot absent.
    const base = repoRoot ? path.resolve(repoRoot) : resolvedWorktree;
    resolvedTarget = path.resolve(base, targetPath);
  }
  // Exact match is inside (fast path, no fs work)
  if (resolvedTarget === resolvedWorktree) return true;
  // G2: realpath both sides; unresolvable → conservative block
  const realWorktree = realpathTargetSafe(resolvedWorktree);
  if (!realWorktree) return false;
  const realTarget = realpathTargetSafe(resolvedTarget);
  if (!realTarget) return false;
  if (realTarget === realWorktree) return true;
  // Ensure worktree prefix with separator to avoid prefix collision (e.g. /tmp/repo vs /tmp/repo2)
  const prefix = realWorktree.endsWith(path.sep) ? realWorktree : realWorktree + path.sep;
  return realTarget.startsWith(prefix);
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
  // Some edit tools use nested "edits" array — G2: ALL edits must be checked,
  // not just the first (second edit could target outside the worktree).
  if (Array.isArray((obj as Record<string, unknown>).edits)) {
    const edits = (obj as Record<string, unknown>).edits as Array<Record<string, unknown>>;
    for (const e of edits) {
      if (e && typeof e === "object" && typeof (e as Record<string, unknown>).filePath === "string") {
        return ((e as Record<string, unknown>).filePath as string).trim();
      }
    }
    if (edits.length > 0 && typeof edits[0]?.filePath === "string") return (edits[0].filePath as string).trim();
  }
  return undefined;
}

/**
 * G2: extract ALL file-path targets from tool args (edit/multiedit/write).
 * Multi-edit calls carry several targets — every one must pass containment.
 */
export function extractAllFilePathsFromArgs(tool: string, args: unknown): string[] {
  if (!args || typeof args !== "object") return [];
  const obj = args as Record<string, unknown>;
  if (tool.toLowerCase().includes("bash")) return [];
  const out: string[] = [];
  const candidates = ["filePath", "path", "target", "file", "filepath"];
  for (const key of candidates) {
    const v = obj[key];
    if (typeof v === "string" && v.trim().length > 0) out.push(v.trim());
  }
  if (Array.isArray((obj as Record<string, unknown>).edits)) {
    const edits = (obj as Record<string, unknown>).edits as Array<Record<string, unknown>>;
    for (const e of edits) {
      if (e && typeof e === "object" && typeof (e as Record<string, unknown>).filePath === "string") {
        const p = ((e as Record<string, unknown>).filePath as string).trim();
        if (p) out.push(p);
      }
    }
  }
  return out;
}

/**
 * G2: broadened bash-path detection — false negatives are not acceptable.
 * Extracts ALL path-like tokens (absolute, ~/…, ./…, ../…, bare containing "/"),
 * resolves each against the child session's cwd (repoRoot = parent checkout),
 * and blocks when:
 *  1. any token resolves INSIDE repoRoot but OUTSIDE the worktree (unconditional
 *     — the child's cwd is the parent checkout, so every repo-relative path is
 *     outside the lane worktree; false positives are acceptable, the corrective
 *     error explains);
 *  2. a mutation verb is present and any token is unresolvable ($VAR, backtick,
 *     ${}) or has no resolvable path-like token at all (ambiguous);
 *  3. a mutation verb targets a token that resolves outside repoRoot entirely
 *     (ambiguous mutation target);
 *  4. a `cd` token resolves outside the worktree (conservative: shell state
 *     cannot be tracked across compound commands).
 */
const MUTATION_VERBS = /\b(rm|rmdir|mv|cp|dd|tee|truncate|chmod|chown|ln|mkdir|touch|shred|mktemp|sed|patch|install|rsync|scp|unlink)\b|\bgit\s+(clean|checkout|restore|reset|stash|apply|rm|mv)\b|\b(npm|bun|pnpm|yarn)\s+(install|uninstall|add|remove|ci)\b/;

function extractCommandTokens(command: string): string[] {
  const out: string[] = [];
  const tokenRe = /"[^"]*"|'[^']*'|[^\s]+/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(command)) !== null) {
    const tok = m[0];
    // strip surrounding quotes and trailing punctuation
    const cleaned = tok.replace(/^["'`]+/, "").replace(/["'`]+$/, "").replace(/[;|&>)]+$/, "").trim();
    if (cleaned.length > 0) out.push(cleaned);
  }
  return out;
}

function isPathLikeToken(token: string): boolean {
  if (token.startsWith("/") || token.startsWith("~/") || token.startsWith("./") || token.startsWith("../")) return true;
  return token.includes("/") && !token.includes("://");
}

function isMutationCommand(command: string): boolean {
  return MUTATION_VERBS.test(command);
}

export function isBashCommandOutsideWorktree(
  command: string,
  worktreePath: string,
  repoRoot: string,
): boolean {
  if (!command || !worktreePath || !repoRoot) return false;
  const resolvedWorktree = path.resolve(worktreePath);
  const resolvedRepo = path.resolve(repoRoot);
  const lowerCommand = command.toLowerCase();
  const hasMutationVerb = isMutationCommand(lowerCommand);
  const cwdBase = resolvedRepo;
  let sawPathToken = false;
  const tokens = extractCommandTokens(command);
  for (const raw of tokens) {
    if (!isPathLikeToken(raw)) continue;
    sawPathToken = true;
    if (raw.includes("$") || raw.includes("`")) {
      // unresolvable (env/expand) — ambiguous under mutation
      if (hasMutationVerb) return true;
      continue;
    }
    let resolved: string;
    if (raw.startsWith("~/")) {
      const home = process.env.HOME ?? os.homedir();
      resolved = path.resolve(home, raw.slice(2));
    } else if (path.isAbsolute(raw)) {
      resolved = path.resolve(raw);
    } else {
      resolved = path.resolve(cwdBase, raw);
    }
    const insideWorktree = isPathInsideWorktree(resolved, worktreePath, repoRoot);
    if (insideWorktree) continue;
    const insideRepo = resolved === resolvedRepo || resolved.startsWith(resolvedRepo + path.sep);
    // Rule 1: repo-relative token outside the worktree → always block
    if (insideRepo) return true;
    // Rule 4: cd anywhere outside the worktree → conservative block
    if (/\bcd\b/.test(lowerCommand)) return true;
    // Rule 2: mutation targeting a path outside the repo → block; read-only → allow
    if (hasMutationVerb) return true;
  }
  // Rule 3: mutating command with no path-like tokens at all → ambiguous, block
  if (hasMutationVerb && !sawPathToken) return true;
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
  const filePaths = extractAllFilePathsFromArgs(tool, args);
  if (filePaths.length === 0) return { block: false };
  for (const filePath of filePaths) {
    const inside = isPathInsideWorktree(filePath, worktreePath, repoRoot);
    if (!inside) {
      return { block: true, target: filePath, reason: `file ${filePath} is outside worktree at ${worktreePath}` };
    }
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

  // G2: idempotent check now VERIFIES the worktree, not just directory existence.
  // A plain existing directory must NOT be treated as a valid lane worktree.
  try {
    if (await exists(worktreePath)) {
      const valid = await isRegisteredWorktree(worktreePath, runGit, repoRoot);
      if (valid) {
        if (log) log("info", `worktree already exists at ${worktreePath} for ${issueId}`, { worktreePath, issueId, branch });
        return { worktreePath, branch, created: false };
      }
      // Directory exists but is NOT a registered worktree (stale dir, wrong checkout, stray mkdir)
      if (log) log("warn", `path exists at ${worktreePath} but is not a registered git worktree for ${issueId} — refusing to clobber`, { worktreePath, issueId });
      throw new Error(`worktree lane path ${worktreePath} exists but is not a registered git worktree for ${repoRoot} — remove it or choose another issueId`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("not a registered git worktree")) throw e;
  }

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
      // G2: post-create verification — the expected path must actually be a registered worktree
      const verified = await isRegisteredWorktree(worktreePath, runGit, repoRoot);
      if (!verified) {
        throw new Error(`git worktree add reported success but ${worktreePath} is not a registered worktree for ${issueId}`);
      }
      if (log) log("info", `worktree created at ${worktreePath} branch ${branch} for ${issueId}`, { worktreePath, branch, issueId });
      return { worktreePath, branch, created: true };
    }
    // If exitCode !=0, check if it's because worktree already exists (idempotent) or branch exists
    const combined = (result.stdout + " " + result.stderr).toLowerCase();
    if (combined.includes("already exists") || combined.includes("already checked out")) {
      // G2: verify the path IS a registered worktree before treating as ours
      const verified = await isRegisteredWorktree(worktreePath, runGit, repoRoot);
      if (verified) return { worktreePath, branch, created: false };
      // Path exists but isn't registered to this repo — surface, don't silently accept
      throw new Error(`worktree lane path ${worktreePath} exists but is not a registered git worktree for ${issueId}`);
    }
    // G2: branch-collision race — if -b failed because the branch exists (race),
    // retry WITHOUT -b. Previously unreachable: the combined.includes("already exists")
    // branch above consumed this case before the retry could fire.
    if (!branchExists) {
      const retry = await runGit(["git", "worktree", "add", worktreePath, branch], repoRoot);
      if (retry.exitCode === 0) return { worktreePath, branch, created: true };
      const retryCombined = (retry.stdout + " " + retry.stderr).toLowerCase();
      if (retryCombined.includes("already checked out")) {
        return { worktreePath, branch, created: false };
      }
      throw new Error(`git worktree add failed for ${issueId}: ${retry.stderr || retry.stdout}`);
    }
    throw new Error(`git worktree add failed for ${issueId}: ${result.stderr || result.stdout} (exit ${result.exitCode})`);
  } catch (e) {
    // G2: do NOT treat bare directory existence as success after an error —
    // verify porcelain registration before treating as existing
    try {
      if (await exists(worktreePath) && await isRegisteredWorktree(worktreePath, runGit, repoRoot)) {
        return { worktreePath, branch, created: false };
      }
    } catch {}
    throw e;
  }
}

/**
 * G2: porcelain-based worktree validation — `git worktree list --porcelain` is
 * the authoritative registry. A bare existing directory is NOT a valid lane
 * worktree. Falls back to the .git-file heuristic only when git fails.
 */
async function isRegisteredWorktree(
  worktreePath: string,
  runGit: (args: string[], cwd: string) => Promise<{ exitCode: number; stdout: string; stderr: string }>,
  repoRoot: string,
): Promise<boolean> {
  try {
    const res = await runGit(["git", "worktree", "list", "--porcelain"], repoRoot);
    if (res.exitCode !== 0) return false;
    const resolvedTarget = path.resolve(worktreePath);
    for (const line of res.stdout.split("\n")) {
      if (line.startsWith("worktree ")) {
        const wtPath = line.slice("worktree ".length).trim();
        if (wtPath && path.resolve(wtPath) === resolvedTarget) return true;
      }
    }
    return false;
  } catch {
    // git unavailable — fall back to .git-file heuristic (worktrees have a .git FILE, checkouts a directory)
    try {
      const st = await fs.stat(path.join(worktreePath, ".git"));
      return st.isFile();
    } catch {
      return false;
    }
  }
}

/**
 * Build a corrective error message for a blocked worktree lane violation.
 * Includes the worktree path and how to comply.
 * G1 strict fallback: when target is a relative path (child's cwd is parent checkout),
 * the message MUST contain "your lane requires worktree <path> — ask the orchestrator to re-dispatch with the worktree"
 * per spec. This signals the orchestrator to re-dispatch with worktree context.
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
  const isRelativeTarget = Boolean(target && !path.isAbsolute(target) && !target.startsWith("~/") && !target.startsWith("/"));
  // G1 fallback phrase for relative paths — required by spec when task tool has no worktree/cwd param (investigated: NO param, so strict fallback shipped)
  if (isRelativeTarget) {
    return `Worktree lane violation: session ${sessionID}${issuePart} with lane=worktree attempted ${tool} outside worktree.${targetPart} your lane requires worktree ${worktreePath} — ask the orchestrator to re-dispatch with the worktree. Run inside your worktree at ${worktreePath}.`;
  }
  // Spec example: "run inside your worktree at <path>"
  return `Worktree lane violation: session ${sessionID}${issuePart} with lane=worktree attempted ${tool} outside worktree.${targetPart} Run inside your worktree at ${worktreePath}. All mutating operations must be inside ${worktreePath}.`;
}
