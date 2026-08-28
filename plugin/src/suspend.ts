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

// Atomic write-once via tmp+link — survives restart, never partial, follows def-snapshot.ts pattern
export async function writeAwaitJson(
  repoRoot: string,
  issueId: string,
  record: AwaitRecord
): Promise<boolean> {
  assertValidBeadID(issueId);
  if (record.issueId !== issueId) {
    throw new Error(`writeAwaitJson: record issueId "${record.issueId}" mismatches path issueId "${issueId}"`);
  }
  const target = awaitJsonPath(repoRoot, issueId);
  const dir = path.dirname(target);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
  const content = JSON.stringify(record, null, 2);
  const tmp = path.join(dir, `.await-${hashString(content)}-${process.pid}-${Math.random().toString(36).slice(2)}.tmp`);
  try {
    await fs.writeFile(tmp, content, "utf-8");
    if (__suspendFaultDelayMs > 0 && !__suspendFaultFired) {
      __suspendFaultFired = true;
      await new Promise((r) => setTimeout(r, __suspendFaultDelayMs));
    }
    await fs.link(tmp, target);
    try {
      await fs.unlink(tmp);
    } catch {}
    return true;
  } catch (e) {
    try {
      await fs.unlink(tmp);
    } catch {}
    const code = (e as NodeJS.ErrnoException)?.code;
    if (code === "EEXIST") return false;
    if (code === "ENOENT") {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch {}
      const retryTmp = path.join(dir, `.await-${hashString(content)}-${process.pid}-${Math.random().toString(36).slice(2)}.tmp`);
      try {
        await fs.writeFile(retryTmp, content, "utf-8");
        await fs.link(retryTmp, target);
        try {
          await fs.unlink(retryTmp);
        } catch {}
        return true;
      } catch (e2) {
        try {
          await fs.unlink(retryTmp);
        } catch {}
        const code2 = (e2 as NodeJS.ErrnoException)?.code;
        if (code2 === "EEXIST") return false;
        throw e2;
      }
    }
    throw e;
  }
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
    return parsed as unknown as AwaitRecord;
  } catch {
    return undefined;
  }
}

// Clear on resume success — atomic rename+unlink, concurrent attempts converge (second gets ENOENT → false)
// Uses rename (atomic on POSIX) rather than unlink, because concurrent unlink of same path can both succeed on APFS/bun threadpool
// (verified: two concurrent fs.unlink of same file both returned success). Rename serializes correctly.
export async function clearAwaitJson(repoRoot: string, issueId: string): Promise<boolean> {
  assertValidBeadID(issueId);
  const target = awaitJsonPath(repoRoot, issueId);
  const dir = path.dirname(target);
  const tmp = path.join(dir, `.await-clear-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
  try {
    await fs.rename(target, tmp);
    try {
      await fs.unlink(tmp);
    } catch {}
    return true;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return false;
    throw e;
  }
}

export async function isSuspended(repoRoot: string, issueId: string): Promise<boolean> {
  const rec = await readAwaitJson(repoRoot, issueId);
  return rec !== undefined;
}

// High-level suspend: writes await.json + appends progress blocker
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
  const record: AwaitRecord = {
    issueId: opts.issueId,
    suspendSchema: opts.suspendSchema,
    suspendPayload: opts.suspendPayload,
    resumeSchema: opts.resumeSchema,
    reason: opts.reason,
    createdAt: opts.createdAt ?? new Date().toISOString(),
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
// Atomic: concurrent valid resumes converge via clearAwaitJson (only first unlink succeeds).
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

  // Validation passed — attempt atomic clear. Concurrent winners converge: only one unlink succeeds.
  const cleared = await clearAwaitJson(opts.repoRoot, opts.issueId);
  if (!cleared) {
    // Another concurrent resume already cleared it — treat as already resumed (converged)
    return { success: false, errors: [`already resumed for ${opts.issueId}`], record };
  }

  // Remove blocker line on success — best effort, filter by badge prefix
  const badge = formatSuspendBlocker(record);
  const prefix = `⏸ awaiting human: ${record.reason}`;
  try {
    await updateProgress(opts.repoRoot, opts.issueId, (parts) => {
      const filtered = parts.blockers.filter((b) => b !== badge && !b.startsWith(prefix));
      return { ...parts, blockers: filtered };
    });
  } catch {}

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
  if (!record.until) return false;
  const untilMs = Date.parse(record.until);
  if (Number.isNaN(untilMs)) return false;
  return nowMs >= untilMs;
}

// Timer catch-up on plugin load: scan .tgo/*/await.json for expired until and surface them (log + board)
// NO daemon, no mid-sleep wake — documented limit: WAIT timers fire on next launch, not mid-sleep.
export async function scanExpiredAwaits(
  repoRoot: string,
  log?: (level: "info" | "warn" | "error", message: string, extra?: Record<string, unknown>) => void,
  nowMs = Date.now()
): Promise<AwaitRecord[]> {
  const all = await listAllAwaits(repoRoot);
  const expired = all.filter((r) => isExpired(r, nowMs));
  for (const rec of expired) {
    const msg = `tgo: timer expired for ${rec.issueId} (until ${rec.until}) — awaiting human: ${rec.reason}`;
    if (log) {
      try {
        log("warn", msg, { issueId: rec.issueId, until: rec.until, reason: rec.reason });
      } catch {}
    } else {
      console.warn(msg);
    }
  }
  return expired;
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
  // Surface expired timer note on board as well
  if (rec.until && isExpired(rec)) {
    return `${badge} (timer expired ${rec.until})`;
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
