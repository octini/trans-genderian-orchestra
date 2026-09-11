import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { BD_ENV } from "./config";
import { isValidBeadID } from "./def-snapshot";

const runFile = promisify(execFile);

/** How long a single verify lookup may take before it fails closed. */
const VERIFY_TIMEOUT_MS = 10_000;

/** Observed claim state from a live read-only lookup. Non-zero exit = failed precondition. */
export interface LiveClaimObserved {
  status: string | undefined;
  assignee: string | undefined;
  exitCode: number;
  stdout?: string;
  stderr?: string;
}

/** Packet fields the live dispatch gate inspects. Unknowns fail closed. */
export interface LiveDispatchPacket {
  issueId?: unknown;
  issueStatusObserved?: unknown;
  issueAssigneeObserved?: unknown;
  claimExitCode?: unknown;
  beadsOperator?: unknown;
  issueClaimed?: unknown;
}

export type LiveDispatchRecovery = "retry" | "reroute" | "escalate" | "user-clarification";

export interface LiveDispatchVerdict {
  allowed: boolean;
  missing: string[];
  diagnostics: string[];
  observed: LiveClaimObserved;
  recovery?: LiveDispatchRecovery;
}

function failedObserved(exitCode: number, stdout?: string, stderr?: string): LiveClaimObserved {
  return { status: undefined, assignee: undefined, exitCode, stdout, stderr };
}

function exitCodeOf(error: unknown): { exitCode: number; stdout?: string; stderr?: string } {
  if (error && typeof error === "object") {
    const err = error as { code?: unknown; stdout?: unknown; stderr?: unknown };
    const exitCode = typeof err.code === "number" ? err.code : 1;
    const stdout = typeof err.stdout === "string" ? err.stdout : undefined;
    const stderr = typeof err.stderr === "string" ? err.stderr : undefined;
    return { exitCode, stdout, stderr };
  }
  return { exitCode: 1 };
}

function beadFromShowJson(parsed: unknown): { status?: unknown; assignee?: unknown } | undefined {
  if (Array.isArray(parsed)) return (parsed[0] as Record<string, unknown> | undefined) ?? undefined;
  if (parsed && typeof parsed === "object") {
    // Failure shape is {"error": ...} — no bead to observe.
    if ("error" in (parsed as Record<string, unknown>)) return undefined;
    return parsed as { status?: unknown; assignee?: unknown };
  }
  return undefined;
}

/**
 * Live read-only claim lookup for the non-tiny dispatch gate.
 *
 * Runs `bd show --json <issueId>` as an argv spawn with EXPLICIT cwd threaded
 * from host input. Never directory-flag selection, never ambient-cwd fallback:
 * repoRoot must be a non-empty string and is always passed as cwd (the caller
 * resolves `directory ?? worktree ?? project.worktree ?? "."`). Ids are gated
 * through VALID_BEAD_ID before reaching argv. Read-only; no create/update/
 * close/reopen on this path. Note `bd show` rewrites last-touched even under
 * read-only use; the board re-walk (snapshot) absorbs that perturbation.
 */
export async function lookupClaimObserved(
  issueId: unknown,
  repoRoot: unknown,
): Promise<LiveClaimObserved> {
  if (typeof repoRoot !== "string" || repoRoot.trim().length === 0) {
    return failedObserved(1, "", "explicit repoRoot is required; ambient cwd is never used");
  }
  const cwd = repoRoot;
  if (typeof issueId !== "string") return failedObserved(1, "", "issueId must be a string");
  const id = issueId.trim();
  if (id.length === 0 || !isValidBeadID(id)) {
    return failedObserved(1, "", `invalid issueId ${JSON.stringify(issueId)} — must match VALID_BEAD_ID`);
  }
  try {
    const { stdout, stderr } = await runFile("bd", ["show", "--json", id], {
      cwd,
      env: BD_ENV,
      timeout: VERIFY_TIMEOUT_MS,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
    const trimmed = (stdout ?? "").trim();
    let parsed: unknown;
    try {
      parsed = trimmed.length > 0 ? (JSON.parse(trimmed) as unknown) : undefined;
    } catch {
      return { status: undefined, assignee: undefined, exitCode: 1, stdout, stderr };
    }
    const bead = beadFromShowJson(parsed);
    if (!bead) return { status: undefined, assignee: undefined, exitCode: 1, stdout, stderr };
    const status = typeof bead.status === "string" ? bead.status : undefined;
    const assignee = typeof bead.assignee === "string" ? bead.assignee : undefined;
    return { status, assignee, exitCode: 0, stdout, stderr };
  } catch (error) {
    const { exitCode, stdout, stderr } = exitCodeOf(error);
    // A non-zero exit still may carry parseable stdout; prefer observed values
    // when present, otherwise fail closed with the captured streams.
    try {
      if (stdout && stdout.trim().length > 0) {
        const bead = beadFromShowJson(JSON.parse(stdout.trim()) as unknown);
        if (bead) {
          const status = typeof bead.status === "string" ? bead.status : undefined;
          const assignee = typeof bead.assignee === "string" ? bead.assignee : undefined;
          return { status, assignee, exitCode, stdout, stderr };
        }
      }
    } catch {}
    return failedObserved(exitCode, stdout, stderr);
  }
}

/**
 * Live dispatch verdict: packet observed triple plus live observed triple.
 * Allowed only when beadsOperator is Bernstein, the packet carries the observed
 * triple (status in_progress, non-empty assignee, exit 0), and the live lookup
 * confirms the same (live status in_progress, assignee truthy, exit 0).
 * Anything else fails closed with actionable diagnostics; the caller keeps the
 * issue open and surfaces retry/reroute/escalate/user-clarification.
 */
export function evaluateLiveDispatchGate(
  packet: LiveDispatchPacket,
  observed: LiveClaimObserved,
): LiveDispatchVerdict {
  const missing: string[] = [];
  const diagnostics: string[] = [];
  const issueLabel = typeof packet.issueId === "string" && packet.issueId.trim() ? packet.issueId.trim() : "open";

  if (packet.beadsOperator !== "Bernstein") {
    missing.push("beadsOperator=Bernstein");
    diagnostics.push(`beadsOperator must be Bernstein; got ${JSON.stringify(packet.beadsOperator)}.`);
  }
  const packetTriple =
    packet.issueStatusObserved === "in_progress" &&
    typeof packet.issueAssigneeObserved === "string" &&
    packet.issueAssigneeObserved.trim().length > 0 &&
    packet.claimExitCode === 0;
  if (packet.issueStatusObserved !== "in_progress") {
    missing.push("issueStatusObserved:in_progress");
    diagnostics.push(`issueStatusObserved must be "in_progress" (observed claim status); got ${JSON.stringify(packet.issueStatusObserved)}.`);
  }
  if (typeof packet.issueAssigneeObserved !== "string" || !packet.issueAssigneeObserved.trim()) {
    missing.push("issueAssigneeObserved");
    diagnostics.push("issueAssigneeObserved must be a non-empty assignee from observed claim.");
  }
  if (packet.claimExitCode !== 0) {
    missing.push("claimExitCode:0");
    diagnostics.push(`claimExitCode must be 0 (observed claim exit code); got ${JSON.stringify(packet.claimExitCode)}.`);
  }
  if (packet.issueClaimed === true && !packetTriple) {
    diagnostics.push("issueClaimed is forgeable asserted metadata; observed claim fields (issueStatusObserved, issueAssigneeObserved, claimExitCode) are required and must reflect live bd state.");
  }

  if (observed.exitCode !== 0) {
    missing.push("live:claimExitCode:0");
    diagnostics.push(`live lookup exited ${observed.exitCode} (failed precondition); got status ${JSON.stringify(observed.status)}.`);
  }
  if (observed.status !== "in_progress") {
    missing.push("live:issueStatusObserved:in_progress");
    diagnostics.push(`live status must be "in_progress"; got ${JSON.stringify(observed.status)}.`);
  }
  if (typeof observed.assignee !== "string" || !observed.assignee.trim()) {
    missing.push("live:issueAssigneeObserved");
    diagnostics.push(`live assignee must be non-empty; got ${JSON.stringify(observed.assignee)}.`);
  }

  const allowed = missing.length === 0;
  if (!allowed) {
    diagnostics.push(
      `Keep issue ${issueLabel} open; live observed status=${JSON.stringify(observed.status)} assignee=${JSON.stringify(observed.assignee)} exit=${observed.exitCode}; satisfy: ${missing.join(", ")}. Retry, reroute, escalate, or request user-clarification.`,
    );
  }
  return { allowed, missing, diagnostics, observed, recovery: allowed ? undefined : "retry" };
}

/** Combined lookup + verdict for the veto hook and tests. Read-only. */
export async function verifyLiveClaimForDispatch(
  packet: LiveDispatchPacket,
  repoRoot: unknown,
): Promise<LiveDispatchVerdict> {
  const observed = await lookupClaimObserved(packet.issueId, repoRoot);
  return evaluateLiveDispatchGate(packet, observed);
}
