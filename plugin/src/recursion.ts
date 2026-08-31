/**
 * tgo-wpl: spawn depth cap + cycle detection.
 *
 * Deterministic, in-memory, no IO, no LLM. Enforced at the task boundary
 * (tool.execute.before), so a model instruction cannot bypass it — the hard
 * gate is a host-side throw, not a prompt-honor-system. Soft shaping (manifest
 * onDispatch rewrite + messageFilter) runs BEFORE this gate: a shaped dispatch
 * is still refused here if it exceeds the cap or closes a cycle.
 *
 * Bounded memory: depth is an integer per live session; cycle detection walks
 * the ancestor chain only up to cycleBound (default maxDepth). All maps are
 * cleared on session.deleted.
 *
 * Restart caveat (same as the worktree lane): state is in-memory. A plugin
 * restart resets depth, so a resumed subagent is treated as depth 0 until it
 * nests again — enforcement resumes on the next dispatch from it.
 */

export interface RecursionConfig {
  /** Maximum allowed subagent spawn depth (inclusive, 0-indexed from root). */
  maxDepth?: number;
  /** Ancestor-chain walk bound for cycle detection; defaults to maxDepth. */
  cycleBound?: number;
  /** Master toggle. When false, the hard gate is a no-op. */
  enabled?: boolean;
}

const DEFAULT_MAX_DEPTH = 4;

const sessionDepth = new Map<string, number>();
const sessionParent = new Map<string, string>();
const sessionIssueId = new Map<string, string>();
const pendingSpawn = new Map<string, Array<{ issueId: string | null; depth: number }>>();

/**
 * Record a pending spawn from the dispatching (parent) session at the task
 * boundary, keyed by parent so the session.created handler can attribute depth
 * and issueId to the new child. A queue (not a single slot) so a parent that
 * dispatches several children in sequence attributes each correctly.
 */
export function recordDispatch(parentSessionId: string, issueId: string | null): void {
  const depth = (sessionDepth.get(parentSessionId) ?? 0) + 1;
  const queue = pendingSpawn.get(parentSessionId) ?? [];
  queue.push({ issueId, depth });
  pendingSpawn.set(parentSessionId, queue);
}

/** session.created handler: consume the parent's oldest pending spawn. */
export function onChildCreated(childSessionId: string, parentSessionId: string): void {
  sessionParent.set(childSessionId, parentSessionId);
  const queue = pendingSpawn.get(parentSessionId);
  const entry = queue && queue.length > 0 ? queue.shift()! : undefined;
  if (entry && queue && queue.length === 0) {
    pendingSpawn.delete(parentSessionId);
  }
  sessionDepth.set(
    childSessionId,
    entry ? entry.depth : (sessionDepth.get(parentSessionId) ?? 0) + 1,
  );
  if (entry && entry.issueId) sessionIssueId.set(childSessionId, entry.issueId);
}

/** session.deleted handler: release all maps for the session. */
export function onSessionDeleted(sessionId: string): void {
  sessionDepth.delete(sessionId);
  sessionParent.delete(sessionId);
  sessionIssueId.delete(sessionId);
  pendingSpawn.delete(sessionId);
}

export interface SpawnCheck {
  allowed: boolean;
  reason?: string;
  depth?: number;
}

/**
 * Hard gate: depth cap + cycle detection. Deterministic, no LLM.
 * - depth: a session at depth >= maxDepth cannot spawn another child.
 * - cycle: spawning an issueId already present in the ancestor chain (including
 *   the caller's own issueId, i.e. self-spawn) is refused.
 */
export function checkSpawnAllowed(
  sessionId: string,
  issueId: string | null,
  config?: RecursionConfig,
): SpawnCheck {
  if (config && config.enabled === false) return { allowed: true };
  const maxDepth = config?.maxDepth ?? DEFAULT_MAX_DEPTH;
  const cycleBound = config?.cycleBound ?? maxDepth;
  const depth = sessionDepth.get(sessionId) ?? 0;

  if (depth >= maxDepth) {
    return {
      allowed: false,
      depth,
      reason: `spawn depth cap exceeded (depth ${depth} >= maxDepth ${maxDepth})`,
    };
  }

  if (issueId) {
    let cur: string | undefined = sessionId;
    let steps = 0;
    while (cur !== undefined && steps <= cycleBound) {
      if (sessionIssueId.get(cur) === issueId) {
        return {
          allowed: false,
          depth,
          reason: `spawn cycle detected (${issueId} already in the delegation chain)`,
        };
      }
      cur = sessionParent.get(cur);
      steps += 1;
    }
  }

  return { allowed: true, depth: depth + 1 };
}

/** Introspection: current spawn depth of a session (0 for root/primary). */
export function getSessionDepth(sessionId: string): number {
  return sessionDepth.get(sessionId) ?? 0;
}

/** Test/debug: reset all in-memory state. */
export function resetRecursionState(): void {
  sessionDepth.clear();
  sessionParent.clear();
  sessionIssueId.clear();
  pendingSpawn.clear();
}