/**
 * Suspend / await.json durable wait gate
 *
 * Concurrency model (single-host, in-process per-issue mutex):
 * - All await.json writers (suspend via writeAwaitJson, resume via clearAwaitJson/mutateAwaitJson,
 *   expiry via persistExpiredFlag, session-deleted cleanup via clearAwaitJson) run in ONE Node
 *   process. Races exist only at await-point interleavings, not true parallel filesystem races.
 * - POSIX rename/link tricks cannot fix lost updates between two writers that interleave at an
 *   await point. Fix = serialize the writers with an in-process promise-chain mutex keyed by
 *   path.resolve(repoRoot) + ":" + issueId (withAwaitLock). All mutations go through it.
 * - createdAt is a staleness token across restarts (file survives restart, used to detect
 *   superseded generations after a restart), not a CAS token for in-process concurrency. The
 *   mutex provides the in-process correctness; createdAt provides cross-restart staleness
 *   detection (e.g., expiry must not mark a newer generation as expired).
 * - Cross-process concurrency (two hosts writing the same repo) is out of scope — single-host
 *   assumption. A future multi-host deployment would need a real file lock or Beads-level
 *   coordination.
 * - Every tmp file is created with a unique name and removed in a finally block, so no .tmp
 *   files remain after any sequence, even when the mutation throws.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { assertValidBeadID, hashString } from "./def-snapshot";
import { updateProgress } from "./progress";

// JSON-Schema subset descriptor — dependency-free, no zod
export type JsonSchema = {
  type?: "object" | "string" | "number" | "boolean" | "array" | "integer" | "null";
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: unknown[];
  pattern?: string;
  items?: JsonSchema;
  description?: string;
};

export interface AwaitRecord {
  issueId: string;
  suspendSchema: JsonSchema;
  suspendPayload: unknown;
  resumeSchema: JsonSchema;
  reason: string;
  createdAt: string;
  until?: string;
  sessionId?: string;
  // F3: persisted expiry flag — when true, chat gate skips this candidate and board shows expired suffix
  expired?: boolean;
}

export function awaitJsonPath(repoRoot: string, issueId: string): string {
  assertValidBeadID(issueId);
  return path.join(repoRoot, ".tgo", issueId, "await.json");
}

// Fault-injection hook for deterministic concurrency tests — mirrors def-snapshot pattern
let __suspendFaultDelayMs = 0;
let __suspendFaultFired = false;
export function __setSuspendWriteDelayForTest(ms: number): void {
  __suspendFaultDelayMs = ms;
  __suspendFaultFired = false;
}
export function __clearSuspendWriteDelayForTest(): void {
  __suspendFaultDelayMs = 0;
  __suspendFaultFired = false;
}

// Monotonic unique createdAt generator — ensures staleness token is unique even within same ms
// (ISO string alone is not unique; reviewer finding "non-unique token" eliminated by uniqueness here
// plus mutex serialization). Counter suffix does not affect Date parsing for `until`.
let _suspendSeq = 0;
function nextCreatedAt(): string {
  return `${new Date().toISOString()}#${process.pid}-${_suspendSeq++}-${Math.random().toString(36).slice(2, 5)}`;
}

// ---------------------------------------------------------------------------
// In-process per-issue mutex — promise-chain keyed by resolved repoRoot + issueId
// ---------------------------------------------------------------------------
const awaitLockChains = new Map<string, Promise<void>>();

/**
 * Serialize async work per issue. Each call appends `fn` to the chain for
 * `path.resolve(repoRoot)+":"+issueId`, awaits the previous tail, runs, and
 * stores the new tail. On `fn` rejection the chain still advances (finally
 * releases the tail) and the error is rethrown to the caller.
 */
export async function withAwaitLock<T>(
  repoRoot: string,
  issueId: string,
  fn: () => Promise<T>,
): Promise<T> {
  assertValidBeadID(issueId);
  const key = `${path.resolve(repoRoot)}:${issueId}`;
  const prev = awaitLockChains.get(key) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  awaitLockChains.set(key, next);
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

// For tests: clear the in-memory lock map between isolated tmp dirs (no-op if empty)
export function __clearAwaitLocksForTest(): void {
  awaitLockChains.clear();
}

export function validateAgainstSchema(
  data: unknown,
  schema: JsonSchema,
  pathPrefix = ""
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const loc = pathPrefix || "value";

  // enum check — if present, data must be one of enum values (strict equality via JSON stringify compare for objects)
  if (schema.enum !== undefined) {
    const found = schema.enum.some((v) => {
      // Use JSON stringify for deep equality of primitives/objects, fallback to strict
      try {
        return JSON.stringify(v) === JSON.stringify(data);
      } catch {
        return v === data;
      }
    });
    if (!found) {
      errors.push(`${loc}: must be one of ${JSON.stringify(schema.enum)}`);
      // enum failure is definitive; no need to also check type? But continue for additional context
    }
  }

  if (schema.type !== undefined) {
    const t = schema.type;
    let typeOk = true;
    if (t === "string") typeOk = typeof data === "string";
    else if (t === "number") typeOk = typeof data === "number" && !Number.isNaN(data);
    else if (t === "integer") typeOk = typeof data === "number" && Number.isInteger(data);
    else if (t === "boolean") typeOk = typeof data === "boolean";
    else if (t === "null") typeOk = data === null;
    else if (t === "array") typeOk = Array.isArray(data);
    else if (t === "object") typeOk = typeof data === "object" && data !== null && !Array.isArray(data);
    if (!typeOk) {
      errors.push(`${loc}: expected ${t}, got ${Array.isArray(data) ? "array" : data === null ? "null" : typeof data}`);
      return { valid: false, errors };
    }

    // string pattern
    if (t === "string" && schema.pattern !== undefined && typeof data === "string") {
      try {
        const re = new RegExp(schema.pattern);
        if (!re.test(data)) {
          errors.push(`${loc}: does not match pattern ${schema.pattern}`);
        }
      } catch {
        errors.push(`${loc}: invalid pattern ${schema.pattern}`);
      }
    }

    // object properties / required
    if (t === "object" && typeof data === "object" && data !== null && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(schema.required)) {
        for (const key of schema.required) {
          if (!(key in obj) || obj[key] === undefined) {
            errors.push(`${loc}.${key}: required`);
          }
        }
      }
      if (schema.properties) {
        for (const [key, sub] of Object.entries(schema.properties)) {
          if (key in obj) {
            const subResult = validateAgainstSchema(obj[key], sub, `${loc}.${key}`);
            errors.push(...subResult.errors);
          }
          // missing optional property is ok (unless required already flagged)
        }
      }
    }

    // array items
    if (t === "array" && Array.isArray(data) && schema.items) {
      for (let i = 0; i < data.length; i++) {
        const subResult = validateAgainstSchema(data[i], schema.items, `${loc}[${i}]`);
        errors.push(...subResult.errors);
      }
    }
  } else {
    // no type but has required/properties => treat as object
    if (schema.required || schema.properties) {
      if (typeof data !== "object" || data === null || Array.isArray(data)) {
        errors.push(`${loc}: expected object`);
        return { valid: false, errors };
      }
      const obj = data as Record<string, unknown>;
      if (Array.isArray(schema.required)) {
        for (const key of schema.required) {
          if (!(key in obj) || obj[key] === undefined) {
            errors.push(`${loc}.${key}: required`);
          }
        }
      }
      if (schema.properties) {
        for (const [key, sub] of Object.entries(schema.properties)) {
          if (key in obj) {
            const subResult = validateAgainstSchema(obj[key], sub, `${loc}.${key}`);
            errors.push(...subResult.errors);
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function getRequiredFields(schema: JsonSchema): string[] {
  if (Array.isArray(schema.required) && schema.required.length > 0) {
    return [...schema.required];
  }
  if (schema.properties) {
    return Object.keys(schema.properties);
  }
  if (schema.type === "string" || schema.type === "number" || schema.type === "boolean" || schema.type === "integer") {
    return [schema.type];
  }
  return [];
}

export function formatSuspendBadge(record: AwaitRecord): string {
  const fields = getRequiredFields(record.resumeSchema);
  const fieldsStr = fields.length > 0 ? fields.join(", ") : "response";
  return `⏸ awaiting human: ${record.reason} — reply with: ${fieldsStr}`;
}

export function formatSuspendBlocker(record: AwaitRecord): string {
  return formatSuspendBadge(record);
}

// Write-once via tmp+rename, serialized by withAwaitLock — no link/EEXIST race, no partial.
// Returns true if written, false if already exists (already suspended).
export async function writeAwaitJson(
  repoRoot: string,
  issueId: string,
  record: AwaitRecord
): Promise<boolean> {
  assertValidBeadID(issueId);
  if (record.issueId !== issueId) {
    throw new Error(`writeAwaitJson: record issueId "${record.issueId}" mismatches path issueId "${issueId}"`);
  }
  return withAwaitLock(repoRoot, issueId, async () => {
    const existing = await readAwaitJson(repoRoot, issueId);
    if (existing) return false;
    const target = awaitJsonPath(repoRoot, issueId);
    const dir = path.dirname(target);
    await fs.mkdir(dir, { recursive: true });
    const content = JSON.stringify(record, null, 2);
    const tmp = path.join(dir, `.await-${hashString(content)}-${process.pid}-${Math.random().toString(36).slice(2)}.tmp`);
    let renamed = false;
    try {
      await fs.writeFile(tmp, content, "utf-8");
      if (__suspendFaultDelayMs > 0 && !__suspendFaultFired) {
        __suspendFaultFired = true;
        await new Promise((r) => setTimeout(r, __suspendFaultDelayMs));
      }
      await fs.rename(tmp, target);
      renamed = true;
      return true;
    } finally {
      if (!renamed) {
        try {
          await fs.unlink(tmp);
        } catch {}
      }
    }
  });
}

export async function readAwaitJson(repoRoot: string, issueId: string): Promise<AwaitRecord | undefined> {
  assertValidBeadID(issueId);
  const target = awaitJsonPath(repoRoot, issueId);
  try {
    const raw = await fs.readFile(target, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return undefined;
    // Minimal validation of required fields
    if (typeof parsed.issueId !== "string" || parsed.issueId !== issueId) return undefined;
    if (typeof parsed.reason !== "string") return undefined;
    if (typeof parsed.createdAt !== "string") return undefined;
    if (parsed.suspendSchema === undefined || typeof parsed.suspendSchema !== "object") return undefined;
    if (parsed.resumeSchema === undefined || typeof parsed.resumeSchema !== "object") return undefined;
    // suspendPayload can be anything, allow undefined
    if (parsed.until !== undefined && typeof parsed.until !== "string") return undefined;
    if (parsed.sessionId !== undefined && typeof parsed.sessionId !== "string") return undefined;
    if (parsed.expired !== undefined && typeof parsed.expired !== "boolean") return undefined;
    return parsed as unknown as AwaitRecord;
  } catch {
    return undefined;
  }
}

// Simplified CAS: single-writer under withAwaitLock — no rename-aside/restore/link dance.
// 1) read; if absent → "absent"
// 2) if rec.createdAt !== expectedCreatedAt → "superseded" (no file changes)
// 3) else apply: null → plain unlink; record → tmp+rename (finally-cleaned)
export async function mutateAwaitJson(
  repoRoot: string,
  issueId: string,
  expectedCreatedAt: string,
  mutate: (rec: AwaitRecord) => AwaitRecord | null
): Promise<"applied" | "superseded" | "absent"> {
  assertValidBeadID(issueId);
  return withAwaitLock(repoRoot, issueId, async () => {
    const rec = await readAwaitJson(repoRoot, issueId);
    if (!rec) return "absent";
    if (rec.createdAt !== expectedCreatedAt) return "superseded";
    let mutated: AwaitRecord | null;
    try {
      mutated = mutate(rec);
    } catch (e) {
      // Mutate threw — no file change, propagate
      throw e;
    }
    if (mutated === null) {
      const target = awaitJsonPath(repoRoot, issueId);
      try {
        await fs.unlink(target);
      } catch (e) {
        const code = (e as NodeJS.ErrnoException)?.code;
        if (code === "ENOENT") return "absent";
        throw e;
      }
      return "applied";
    }
    if (mutated.issueId !== issueId) {
      throw new Error(`mutateAwaitJson: mutated issueId "${mutated.issueId}" mismatches "${issueId}"`);
    }
    const target = awaitJsonPath(repoRoot, issueId);
    const dir = path.dirname(target);
    await fs.mkdir(dir, { recursive: true });
    const content = JSON.stringify(mutated, null, 2);
    const tmp = path.join(dir, `.await-mutate-${hashString(content)}-${process.pid}-${Math.random().toString(36).slice(2)}.tmp`);
    let renamed = false;
    try {
      await fs.writeFile(tmp, content, "utf-8");
      await fs.rename(tmp, target);
      renamed = true;
      return "applied";
    } finally {
      if (!renamed) {
        try {
          await fs.unlink(tmp);
        } catch {}
      }
    }
  });
}

// Clear on resume success — delegates to mutateAwaitJson when expectedCreatedAt is provided
// Keep return-signature compatibility: true = applied, false = superseded/absent
export async function clearAwaitJson(repoRoot: string, issueId: string, expectedCreatedAt?: string): Promise<boolean> {
  assertValidBeadID(issueId);
  if (expectedCreatedAt === undefined) {
    // Blind legacy path — only for tests that need unconditional delete; still serialized
    return withAwaitLock(repoRoot, issueId, async () => {
      const target = awaitJsonPath(repoRoot, issueId);
      try {
        await fs.unlink(target);
        return true;
      } catch (e) {
        const code = (e as NodeJS.ErrnoException)?.code;
        if (code === "ENOENT") return false;
        throw e;
      }
    });
  }
  const result = await mutateAwaitJson(repoRoot, issueId, expectedCreatedAt, () => null);
  return result === "applied";
}

export async function isSuspended(repoRoot: string, issueId: string): Promise<boolean> {
  const rec = await readAwaitJson(repoRoot, issueId);
  return rec !== undefined;
}

// High-level suspend: writes await.json + appends progress blocker
// F2: validates suspendPayload against suspendSchema and requires resumeSchema non-null BEFORE any file write
export async function suspend(opts: {
  repoRoot: string;
  issueId: string;
  suspendSchema: JsonSchema;
  suspendPayload: unknown;
  resumeSchema: JsonSchema;
  reason: string;
  createdAt?: string;
  until?: string;
  sessionId?: string;
}): Promise<{ written: boolean; record: AwaitRecord }> {
  assertValidBeadID(opts.issueId);
  // F2: resumeSchema required non-null — reject before any file write
  if (!opts.resumeSchema || typeof opts.resumeSchema !== "object" || Array.isArray(opts.resumeSchema)) {
    throw new Error("suspend: resumeSchema is required and must be a non-null object");
  }
  if (!opts.suspendSchema || typeof opts.suspendSchema !== "object" || Array.isArray(opts.suspendSchema)) {
    throw new Error("suspend: suspendSchema is required and must be a non-null object");
  }
  // F2: validate suspendPayload against suspendSchema at suspend time
  const payloadValidation = validateAgainstSchema(opts.suspendPayload, opts.suspendSchema);
  if (!payloadValidation.valid) {
    throw new Error(`suspend: suspendPayload does not match suspendSchema: ${payloadValidation.errors.join("; ")}`);
  }
  const record: AwaitRecord = {
    issueId: opts.issueId,
    suspendSchema: opts.suspendSchema,
    suspendPayload: opts.suspendPayload,
    resumeSchema: opts.resumeSchema,
    reason: opts.reason,
    createdAt: opts.createdAt ?? nextCreatedAt(),
    ...(opts.until ? { until: opts.until } : {}),
    ...(opts.sessionId ? { sessionId: opts.sessionId } : {}),
  };
  const written = await writeAwaitJson(opts.repoRoot, opts.issueId, record);
  if (written) {
    const blocker = formatSuspendBlocker(record);
    try {
      await updateProgress(opts.repoRoot, opts.issueId, (parts) => {
        if (!parts.blockers.includes(blocker)) {
          return { ...parts, blockers: [...parts.blockers, blocker] };
        }
        return parts;
      });
    } catch {}
  }
  return { written, record };
}

// Parse prose reply: try JSON, fallback to raw string.
// If text is JSON object/array, parse; if text contains JSON substring, extract first JSON object.
export function parseProseReply(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.length === 0) return trimmed;
  // Try direct JSON parse
  try {
    return JSON.parse(trimmed);
  } catch {}
  // Try to extract JSON object/array substring (first { ... } or [ ... ])
  const jsonMatch = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return JSON.parse(jsonMatch[1]!);
    } catch {}
  }
  return trimmed;
}

// Attempt prose resume: validates reply against resumeSchema BEFORE clearing suspend state.
// Invalid reply = rejection with errors, session stays suspended (file preserved).
// Valid reply = clears await.json and removes blocker line, returns success.
// Serialized via clearAwaitJson's withAwaitLock — concurrent valid resumes converge (only first applied).
export async function tryProseResume(opts: {
  repoRoot: string;
  issueId: string;
  rawReply: string | unknown;
  // Optional pre-parsed payload; if rawReply is string, parseProseReply is applied
}): Promise<{ success: boolean; errors?: string[]; record?: AwaitRecord }> {
  assertValidBeadID(opts.issueId);
  const record = await readAwaitJson(opts.repoRoot, opts.issueId);
  if (!record) {
    return { success: false, errors: [`no suspended await for ${opts.issueId}`] };
  }

  let payload: unknown = opts.rawReply;
  if (typeof opts.rawReply === "string") {
    payload = parseProseReply(opts.rawReply);
  }

  const validation = validateAgainstSchema(payload, record.resumeSchema);
  if (!validation.valid) {
    return { success: false, errors: validation.errors, record };
  }

  // Validation passed — attempt atomic clear with per-issue mutex. Concurrent winners converge; newer suspend aborts clear.
  const oldCreatedAt = record.createdAt;
  const oldBadge = formatSuspendBlocker(record);
  const oldPrefix = `⏸ awaiting human: ${record.reason}`;
  const cleared = await clearAwaitJson(opts.repoRoot, opts.issueId, oldCreatedAt);
  if (!cleared) {
    // Check if superseded by newer suspend vs already resumed
    try {
      const cur = await readAwaitJson(opts.repoRoot, opts.issueId);
      if (cur && cur.createdAt !== oldCreatedAt) {
        return { success: false, errors: [`superseded by newer suspend for ${opts.issueId} (createdAt ${cur.createdAt} vs ${oldCreatedAt})`], record: cur };
      }
    } catch {}
    // Otherwise concurrent resume already cleared it — treat as already resumed (converged)
    return { success: false, errors: [`already resumed for ${opts.issueId}`], record };
  }

  // F4: verify-then-clear — only clear blocker/watchdog state if current await is NOT a newer suspend
  let isNewerSuspend = false;
  try {
    const current = await readAwaitJson(opts.repoRoot, opts.issueId);
    if (current && current.createdAt !== oldCreatedAt) {
      isNewerSuspend = true;
    }
  } catch {}
  if (!isNewerSuspend) {
    // Remove blocker line on success — best effort, filter by exact badge/prefix only for old
    try {
      await updateProgress(opts.repoRoot, opts.issueId, (parts) => {
        const filtered = parts.blockers.filter((b) => b !== oldBadge && !b.startsWith(oldPrefix));
        return { ...parts, blockers: filtered };
      });
    } catch {}
  } else {
    // Newer suspend exists — do not clear its blocker; keep new await's blocker intact
    // The old blocker (if same prefix) would be incorrectly removed, so we skip
  }

  return { success: true, record };
}

// Scan for all awaits under .tgo
export async function listAllAwaits(repoRoot: string): Promise<AwaitRecord[]> {
  const tgoDir = path.join(repoRoot, ".tgo");
  let entries: string[] = [];
  try {
    entries = await fs.readdir(tgoDir);
  } catch {
    return [];
  }
  const out: AwaitRecord[] = [];
  for (const entry of entries) {
    // Validate bead id before reading to avoid traversal
    try {
      assertValidBeadID(entry);
    } catch {
      continue;
    }
    const rec = await readAwaitJson(repoRoot, entry);
    if (rec) out.push(rec);
  }
  return out;
}

export function isExpired(record: AwaitRecord, nowMs = Date.now()): boolean {
  // F3: persisted expired flag takes precedence (survives restart, not just derived)
  if (record.expired === true) return true;
  if (!record.until) return false;
  const untilMs = Date.parse(record.until);
  if (Number.isNaN(untilMs)) return false;
  return nowMs >= untilMs;
}

// Persist expiry flag via per-issue mutex — carries the SCANNED record's createdAt as staleness token.
// Inside lock: read; absent → false; createdAt !== scanned.createdAt → false (newer wins); else rewrite with expired:true → true.
// No reread-by-issue outside the lock — caller passes the scanned record from scanExpiredAwaits.
export async function persistExpiredFlag(
  repoRoot: string,
  scanned: AwaitRecord,
): Promise<boolean> {
  assertValidBeadID(scanned.issueId);
  return withAwaitLock(repoRoot, scanned.issueId, async () => {
    const cur = await readAwaitJson(repoRoot, scanned.issueId);
    if (!cur) return false;
    if (cur.createdAt !== scanned.createdAt) return false;
    if (cur.expired === true) return true;
    const next: AwaitRecord = { ...cur, expired: true };
    const target = awaitJsonPath(repoRoot, scanned.issueId);
    const dir = path.dirname(target);
    await fs.mkdir(dir, { recursive: true });
    const content = JSON.stringify(next, null, 2);
    const tmp = path.join(dir, `.await-expire-${hashString(content)}-${process.pid}-${Math.random().toString(36).slice(2)}.tmp`);
    let renamed = false;
    try {
      await fs.writeFile(tmp, content, "utf-8");
      await fs.rename(tmp, target);
      renamed = true;
      return true;
    } finally {
      if (!renamed) {
        try {
          await fs.unlink(tmp);
        } catch {}
      }
    }
  });
}

// Back-compat overload for tests that still call with (repoRoot, issueId string)
// Supports both signatures: (repoRoot, AwaitRecord) and legacy (repoRoot, string issueId)
export async function persistExpiredFlagLegacy(repoRoot: string, issueId: string): Promise<boolean> {
  const rec = await readAwaitJson(repoRoot, issueId);
  if (!rec) return false;
  if (rec.expired === true) return true;
  return persistExpiredFlag(repoRoot, rec);
}

// Timer catch-up on plugin load: scan .tgo/*/await.json for expired until and surface them (log + board)
// NO daemon, no mid-sleep wake — documented limit: WAIT timers fire on next launch, not mid-sleep.
// On expiry transition, atomically persist expired:true via per-issue mutex so chat gate skips and board suffix persists.
export async function scanExpiredAwaits(
  repoRoot: string,
  log?: (level: "info" | "warn" | "error", message: string, extra?: Record<string, unknown>) => void,
  nowMs = Date.now()
): Promise<AwaitRecord[]> {
  const all = await listAllAwaits(repoRoot);
  const newlyExpired = all.filter((r) => r.expired !== true && isExpired(r, nowMs));
  const allExpired = all.filter((r) => isExpired(r, nowMs));
  for (const rec of newlyExpired) {
    let ok = false;
    try {
      ok = await persistExpiredFlag(repoRoot, rec);
    } catch {}
    if (!ok) {
      // Newer generation won or file gone — skip logging old generation
      const cur = await readAwaitJson(repoRoot, rec.issueId);
      if (!cur || cur.createdAt !== rec.createdAt) continue;
      // If cur still matches but persist failed for other reason, still try to log original
    }
    const persisted = (await readAwaitJson(repoRoot, rec.issueId)) ?? { ...rec, expired: true as const };
    if (persisted.createdAt !== rec.createdAt) continue;
    const msg = `tgo: timer expired for ${persisted.issueId} (until ${persisted.until}) — awaiting human: ${persisted.reason}`;
    if (log) {
      try {
        log("warn", msg, { issueId: persisted.issueId, until: persisted.until, reason: persisted.reason });
      } catch {}
    } else {
      console.warn(msg);
    }
  }
  // Also log already-persisted expired that were not newly transitioned
  for (const rec of allExpired.filter((r) => r.expired === true)) {
    const msg = `tgo: timer expired (persisted) for ${rec.issueId} (until ${rec.until}) — awaiting human: ${rec.reason}`;
    if (log) {
      try {
        log("warn", msg, { issueId: rec.issueId, until: rec.until, reason: rec.reason });
      } catch {}
    }
  }
  return allExpired;
}

// Helper for board integration: get badge hint for an issue if suspended
export async function getBoardBadgeForIssue(
  repoRoot: string,
  issueId: string
): Promise<string | undefined> {
  try {
    assertValidBeadID(issueId);
  } catch {
    return undefined;
  }
  const rec = await readAwaitJson(repoRoot, issueId);
  if (!rec) return undefined;
  const badge = formatSuspendBadge(rec);
  // F3: expired suffix derives from persisted field first, fallback to until-derived for pre-existing files
  if (rec.expired === true || (rec.until && isExpired(rec))) {
    const untilStr = rec.until ?? "unknown";
    return `${badge} (timer expired ${untilStr})`;
  }
  return badge;
}

// Atomicity test helper: concurrent resume attempts
export async function __concurrentResumeTestHelper(
  repoRoot: string,
  issueId: string,
  replies: Array<string | unknown>
): Promise<Array<{ success: boolean; errors?: string[] }>> {
  const promises = replies.map((r) => tryProseResume({ repoRoot, issueId, rawReply: r }));
  return Promise.all(promises);
}
