import * as fs from "node:fs/promises";
import * as path from "node:path";
import { estimateTokens, safeWarn } from "./config";
import { readProgress, writeProgress, formatProgress, parseProgress, updateProgress } from "./progress";
import {
  hashString as defHashString,
  hashFivePartPacket,
  buildDefSnapshot as defBuildSnapshot,
  buildDefSnapshotFromPrompt,
  defSnapshotPath as defPath,
  writeDefSnapshot as defWrite,
  readDefSnapshot as defRead,
  ensureDefSnapshot as defEnsure,
  isValidBeadID,
  assertValidBeadID,
  type DefSnapshot as DefSnapshotType,
} from "./def-snapshot";

export const hashString = defHashString;
export function hashPrompt(promptText: string): string { return defHashString(promptText); }
export function hashSeatFrontmatter(content: string): string { return defHashString(content); }
export type DefSnapshot = DefSnapshotType;
export function defSnapshotPath(repoRoot: string, issueId: string): string { return defPath(repoRoot, issueId); }
export function buildDefSnapshot(opts: { promptText: string; seatFrontmatter: string; model: string; preset: string; capturedAt?: string; seatFileFound?: boolean }): DefSnapshot {
  return buildDefSnapshotFromPrompt({ promptText: opts.promptText, seatFrontmatter: opts.seatFrontmatter, seatFileFound: opts.seatFileFound ?? true, model: opts.model, preset: opts.preset, capturedAt: opts.capturedAt });
}
export const writeDefSnapshot = defWrite;
export const readDefSnapshot = defRead;
export { isValidBeadID, assertValidBeadID, hashFivePartPacket };
export const hashDelegationPacket = hashFivePartPacket;

export interface ReuseDecision {
  reuse: boolean;
  reason: string;
  terminatePrior?: boolean;
}

export function decideReuse(opts: {
  estimate: number;
  maxContextTokens: number;
  existingSnapshot?: DefSnapshot | null;
  currentPromptHash?: string;
  useLatestDefinitions?: boolean;
}): ReuseDecision {
  if (opts.useLatestDefinitions === true) {
    return { reuse: false, reason: "useLatestDefinitions opt-in — terminating prior session", terminatePrior: true };
  }
  if (opts.existingSnapshot) {
    if (opts.currentPromptHash && opts.existingSnapshot.promptHash !== opts.currentPromptHash) {
      return { reuse: true, reason: "pinned — snapshot reused despite definition change" };
    }
    return { reuse: true, reason: "pinned — snapshot exists, default reuse" };
  }
  // backward compatible: absent snapshot = legacy behavior
  if (opts.estimate < opts.maxContextTokens) {
    return { reuse: true, reason: "within budget (legacy, no snapshot)" };
  }
  return { reuse: false, reason: "context overflow (legacy, no snapshot)" };
}

export function shouldReuseWithSnapshot(
  estimate: number,
  maxContextTokens: number,
  opts?: { snapshot?: DefSnapshot | null; useLatestDefinitions?: boolean; currentPromptHash?: string }
): boolean {
  if (opts?.useLatestDefinitions === true) return false;
  if (opts?.snapshot) return true;
  return estimate < maxContextTokens;
}

export interface SessionMapEntry {
  sessionId: string;
  delegationId?: string;
  exitGate?: boolean;
  updatedAt: string;
  promptHash?: string;
}

export type SessionMap = Record<string, SessionMapEntry>;

export async function loadSessionMap(repoRoot: string): Promise<SessionMap> {
  const target = path.join(repoRoot, ".tgo", "sessions.json");
  try {
    const raw = await fs.readFile(target, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: SessionMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const entry = value as Record<string, unknown>;
      if (typeof entry.sessionId !== "string" || !/^ses_[A-Za-z0-9]+$/.test(entry.sessionId)) continue;
      if (typeof entry.updatedAt !== "string") continue;
      // promptHash is optional for backward compat; if present must be 8-hex
      if (entry.promptHash !== undefined && (typeof entry.promptHash !== "string" || !/^[0-9a-f]{8}$/.test(entry.promptHash))) continue;
      out[key] = {
        sessionId: entry.sessionId as string,
        delegationId: typeof entry.delegationId === "string" ? entry.delegationId : undefined,
        exitGate: typeof entry.exitGate === "boolean" ? entry.exitGate : undefined,
        updatedAt: entry.updatedAt as string,
        promptHash: typeof entry.promptHash === "string" ? entry.promptHash : undefined,
      } as SessionMapEntry;
      // preserve any extra fields that might be present but ensure required ones are clean
      // if entry had promptHash undefined we already omitted it
    }
    return out;
  } catch {
    return {};
  }
}

export async function saveSessionMap(repoRoot: string, map: SessionMap): Promise<void> {
  const dir = path.join(repoRoot, ".tgo");
  await fs.mkdir(dir, { recursive: true });
  const target = path.join(dir, "sessions.json");
  const tmp = path.join(dir, `sessions.json.${process.pid}.${Date.now()}.tmp`);
  const payload = JSON.stringify(map, null, 2);
  await fs.writeFile(tmp, payload, "utf-8");
  await fs.rename(tmp, target);
}

export function upsertSession(map: SessionMap, issueId: string, entry: SessionMapEntry): SessionMap {
  return { ...map, [issueId]: entry };
}

export function issueIdBySession(map: SessionMap, sessionId: string): string | undefined {
  for (const [issueId, entry] of Object.entries(map)) {
    if (entry.sessionId === sessionId) return issueId;
  }
  return undefined;
}

function parseIssueIdFromDelegationText(text: string): string | undefined {
  const quoted = text.match(/["']issueId["']\s*:\s*["']([^"']+)["']/);
  if (quoted && quoted[1]) {
    const v = quoted[1].trim();
    if (v.length > 0) return v;
  }
  const plain = text.match(/\bissueId\b\s*[:=]\s*["']?([A-Za-z0-9][A-Za-z0-9-_]*)/);
  if (plain && plain[1]) {
    const v = plain[1].trim();
    if (v.length > 0) return v;
  }
  return undefined;
}

export async function persistAbortHandback(opts: {
  repoRoot: string;
  sessionID: string;
  reason: "wall-clock" | "idle" | "stuck-loop";
  log?: (level: "info" | "warn" | "error", message: string, extra?: Record<string, unknown>) => void;
  fetchSessionMessages?: (sessionID: string) => Promise<Array<{ role?: string; parts: Array<{ type: string; text?: string }> }> | undefined>;
}): Promise<void> {
  try {
    let map = await loadSessionMap(opts.repoRoot);
    let issueId = issueIdBySession(map, opts.sessionID);
    if (issueId) assertValidBeadID(issueId);
    if (!issueId && opts.fetchSessionMessages) {
      let fetchedIssueId: string | undefined;
      try {
        const messages = await opts.fetchSessionMessages(opts.sessionID);
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
          throw new Error("no messages");
        }
        let firstText: string | undefined;
        let hasUserPart = false;
        for (const msg of messages) {
          if (!msg || (msg as any).role !== "user" || !Array.isArray((msg as any).parts)) continue;
          for (const part of (msg as any).parts as Array<{ type: string; text?: string }>) {
            if (part && part.type === "text" && typeof part.text === "string") {
              hasUserPart = true;
              if (part.text.trim().length > 0) {
                firstText = part.text;
                break;
              }
            }
          }
          if (firstText) break;
        }
        if (!firstText && !hasUserPart) {
          for (const msg of messages) {
            if (!msg || !Array.isArray((msg as any).parts)) continue;
            for (const part of (msg as any).parts as Array<{ type: string; text?: string }>) {
              if (part && part.type === "text" && typeof part.text === "string" && part.text.trim().length > 0) {
                firstText = part.text;
                break;
              }
            }
            if (firstText) break;
          }
        }
        if (!firstText) {
          throw new Error("no text part");
        }
        fetchedIssueId = parseIssueIdFromDelegationText(firstText);
        if (!fetchedIssueId) {
          throw new Error("no issueId in delegation prompt");
        }
      } catch (e) {
        safeWarn(opts.log, `progress handback failed: ${String(e)}`);
        return;
      }
      issueId = fetchedIssueId;
      assertValidBeadID(issueId);
      try {
        const entry: SessionMapEntry = { sessionId: opts.sessionID, updatedAt: new Date().toISOString() };
        const nextMap = upsertSession(map, issueId, entry);
        await saveSessionMap(opts.repoRoot, nextMap);
        map = nextMap;
      } catch (e) {
        safeWarn(opts.log, `progress handback failed: ${String(e)}`);
      }
    }
    if (!issueId) return;
    assertValidBeadID(issueId);
    const blocker = `watchdog abort (${opts.reason}) at ${new Date().toISOString()} — session ${opts.sessionID}; re-dispatch may reuse its task_id`;
    const ok = await updateProgress(opts.repoRoot, issueId, (parts) => ({
      ...parts,
      blockers: [...parts.blockers, blocker],
    }), opts.log);
    if (!ok) {
      throw new Error(`writeProgress failed for ${issueId}`);
    }
  } catch (e) {
    safeWarn(opts.log, `progress handback failed: ${String(e)}`);
  }
}

export function probeSessionReuseCapability(version: string | undefined): { supported: boolean; reason: string } {
  if (version === undefined) {
    return { supported: true, reason: "version unavailable; assuming v1 task tool" };
  }
  const trimmed = version.trim();
  if (trimmed.length === 0) {
    return { supported: true, reason: "version unavailable; assuming v1 task tool" };
  }
  const majorStr = trimmed.split(".")[0] ?? "";
  const cleaned = majorStr.replace(/^v/i, "");
  const major = Number.parseInt(cleaned, 10);
  if (Number.isNaN(major)) {
    return { supported: true, reason: "version unavailable; assuming v1 task tool" };
  }
  if (major >= 2) {
    return { supported: false, reason: "v2 subagent tool cannot resume sessions" };
  }
  return { supported: true, reason: "v1 task tool supports task_id resume" };
}

export function estimateSessionTokens(
  messages: Array<{ parts: Array<{ type: string; text?: string }> }>,
): number {
  let total = 0;
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === "text" && typeof part.text === "string") {
        total += estimateTokens(part.text);
      }
    }
  }
  return total;
}

export function shouldReuse(estimate: number, maxContextTokens: number): boolean {
  return estimate < maxContextTokens;
}

export async function ensureDefSnapshot(opts: {
  repoRoot: string;
  issueId: string;
  promptText: string;
  seatFrontmatter: string;
  model: string;
  preset: string;
  useLatestDefinitions?: boolean;
  capturedAt?: string;
  seatFileFound?: boolean;
}): Promise<{ snapshot: DefSnapshot; written: boolean; reused: boolean }> {
  assertValidBeadID(opts.issueId);
  const existing = await readDefSnapshot(opts.repoRoot, opts.issueId);
  if (existing && !opts.useLatestDefinitions) {
    return { snapshot: existing, written: false, reused: true };
  }
  if (opts.model === "unknown") throw new Error(`ensureDefSnapshot: refusing model "unknown"`);
  const snapshot = buildDefSnapshot({
    promptText: opts.promptText,
    seatFrontmatter: opts.seatFrontmatter,
    seatFileFound: opts.seatFileFound,
    model: opts.model,
    preset: opts.preset,
    capturedAt: opts.capturedAt,
  });
  const written = await writeDefSnapshot(opts.repoRoot, opts.issueId, snapshot, { useLatestDefinitions: opts.useLatestDefinitions });
  if (!written) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const retry = await readDefSnapshot(opts.repoRoot, opts.issueId);
      if (retry) return { snapshot: retry, written: false, reused: true };
      if (existing) return { snapshot: existing, written: false, reused: true };
      await new Promise((r) => setTimeout(r, 5 * (attempt + 1)));
    }
    const finalRetry = await readDefSnapshot(opts.repoRoot, opts.issueId);
    if (finalRetry) return { snapshot: finalRetry, written: false, reused: true };
    if (existing) return { snapshot: existing, written: false, reused: true };
  }
  return { snapshot, written, reused: false };
}

export async function captureDelegationSession(deps: { tool: string; input: unknown; output: unknown; repoRoot: string; enabled: boolean; log?: (level: "warn" | "info", message: string) => void; promptText?: string; seatFrontmatter?: string; model?: string; preset?: string; useLatestDefinitions?: boolean }): Promise<void> {
  if (!deps.enabled) return;
  if (deps.tool !== "task") return;
  try {
    const rawInput = deps.input as Record<string, unknown> | undefined;
    const taskArgs = rawInput && typeof rawInput.args === "object" && rawInput.args !== null
      ? (rawInput.args as Record<string, unknown>)
      : (rawInput as Record<string, unknown> | undefined);
    const packet = taskArgs?.delegationPacket && typeof taskArgs.delegationPacket === "object"
      ? (taskArgs.delegationPacket as Record<string, unknown>)
      : undefined;
    const issueIdRaw = typeof packet?.issueId === "string" ? packet.issueId.trim() : "";
    const delegationId = typeof packet?.delegationId === "string" ? packet.delegationId.trim() : undefined;
    const outputRec = deps.output as Record<string, unknown> | undefined;
    const outputText = typeof outputRec?.output === "string" ? (outputRec.output as string) : "";
    if (outputText.includes("Background task started")) {
      return;
    }
    if (!issueIdRaw) {
      return;
    }
    if (!isValidBeadID(issueIdRaw)) {
      throw new Error(`invalid issueId "${issueIdRaw}" — must match ${/^[A-Za-z0-9][A-Za-z0-9._-]*$/.source}`);
    }
    const issueId = issueIdRaw;
    let sessionId: string | undefined;
    const meta = (deps.output as unknown as { metadata?: unknown })?.metadata;
    if (meta && typeof meta === "object" && typeof (meta as Record<string, unknown>).sessionId === "string") {
      const raw = (meta as Record<string, unknown>).sessionId as string;
      if (raw.trim().length > 0) sessionId = raw.trim();
    }
    if (!sessionId) {
      const match = outputText.match(/ses_[A-Za-z0-9]+/);
      if (match) sessionId = match[0];
    }
    if (!sessionId) {
      return;
    }
    if (!/^ses_[A-Za-z0-9]+$/.test(sessionId)) {
      return;
    }
    // After-hook NEVER touches snapshot — write-once at start only. Read existing promptHash for session map.
    let promptHash: string | undefined;
    try {
      const snap = await readDefSnapshot(deps.repoRoot, issueId);
      if (snap) promptHash = snap.promptHash;
    } catch (e) {
      // Invalid issueId already rejected above; readDefSnapshot validates again, but we treat as no snapshot
      if (String(e).includes("invalid issueId")) throw e;
    }
    const map = await loadSessionMap(deps.repoRoot);
    const exitGate = typeof packet?.exitGate === "boolean" ? (packet.exitGate as boolean) : undefined;
    const entry: SessionMapEntry = {
      sessionId,
      delegationId,
      updatedAt: new Date().toISOString(),
      ...(exitGate !== undefined ? { exitGate } : {}),
      ...(promptHash ? { promptHash } : {}),
    };
    // Validate issueId before session map write as well
    assertValidBeadID(issueId);
    await saveSessionMap(deps.repoRoot, upsertSession(map, issueId, entry));
  } catch (error) {
    safeWarn(deps.log as unknown as (level: "warn" | "info" | "error", message: string, extra?: Record<string, unknown>) => void, `session-reuse capture failed: ${String(error)}`);
  }
}
