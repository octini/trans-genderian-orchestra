import * as fs from "node:fs/promises";
import * as path from "node:path";
import { estimateTokens, safeWarn } from "./config";
import { readProgress, writeProgress, formatProgress, parseProgress, updateProgress } from "./progress";

export function hashString(s: string): string {
  // FNV-1a 32-bit — shared with watchdog.ts; stable vector: hashString("foo.ts") === "b5c9292a"
  let hash = 2166136261;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function hashPrompt(promptText: string): string {
  return hashString(promptText);
}

export function hashSeatFrontmatter(content: string): string {
  return hashString(content);
}

export interface DefSnapshot {
  promptHash: string;
  model: string;
  preset: string;
  seatFrontmatterHash: string;
  capturedAt: string;
}

export function defSnapshotPath(repoRoot: string, issueId: string): string {
  return path.join(repoRoot, ".tgo", issueId, "def-snapshot.json");
}

export function buildDefSnapshot(opts: {
  promptText: string;
  seatFrontmatter: string;
  model: string;
  preset: string;
  capturedAt?: string;
}): DefSnapshot {
  return {
    promptHash: hashPrompt(opts.promptText),
    seatFrontmatterHash: hashSeatFrontmatter(opts.seatFrontmatter),
    model: opts.model,
    preset: opts.preset,
    capturedAt: opts.capturedAt ?? new Date().toISOString(),
  };
}

export async function writeDefSnapshot(
  repoRoot: string,
  issueId: string,
  snapshot: DefSnapshot,
  opts?: { useLatestDefinitions?: boolean }
): Promise<boolean> {
  const target = defSnapshotPath(repoRoot, issueId);
  const dir = path.dirname(target);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
  // write-once semantics: never downgrade or mutate mid-run unless explicit opt-in
  if (!opts?.useLatestDefinitions) {
    try {
      await fs.access(target);
      return false;
    } catch {}
  }
  const tmp = path.join(dir, `def-snapshot.json.${process.pid}.${Date.now()}.tmp`);
  try {
    const payload = JSON.stringify(snapshot, null, 2);
    await fs.writeFile(tmp, payload, "utf-8");
    await fs.rename(tmp, target);
    return true;
  } catch {
    try { await fs.rm(tmp, { force: true }); } catch {}
    return false;
  }
}

export async function readDefSnapshot(repoRoot: string, issueId: string): Promise<DefSnapshot | undefined> {
  const target = defSnapshotPath(repoRoot, issueId);
  try {
    const raw = await fs.readFile(target, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return undefined;
    const promptHash = parsed.promptHash;
    const seatFrontmatterHash = parsed.seatFrontmatterHash;
    const model = parsed.model;
    const preset = parsed.preset;
    const capturedAt = parsed.capturedAt;
    if (typeof promptHash !== "string" || !/^[0-9a-f]{8}$/.test(promptHash)) return undefined;
    if (typeof seatFrontmatterHash !== "string" || !/^[0-9a-f]{8}$/.test(seatFrontmatterHash)) return undefined;
    if (typeof model !== "string" || model.trim().length === 0) return undefined;
    if (typeof preset !== "string" || preset.trim().length === 0) return undefined;
    if (typeof capturedAt !== "string" || capturedAt.trim().length === 0) return undefined;
    return parsed as unknown as DefSnapshot;
  } catch {
    return undefined;
  }
}

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
}): Promise<{ snapshot: DefSnapshot; written: boolean; reused: boolean }> {
  const existing = await readDefSnapshot(opts.repoRoot, opts.issueId);
  if (existing && !opts.useLatestDefinitions) {
    return { snapshot: existing, written: false, reused: true };
  }
  const snapshot = buildDefSnapshot({
    promptText: opts.promptText,
    seatFrontmatter: opts.seatFrontmatter,
    model: opts.model,
    preset: opts.preset,
    capturedAt: opts.capturedAt,
  });
  const written = await writeDefSnapshot(opts.repoRoot, opts.issueId, snapshot, { useLatestDefinitions: opts.useLatestDefinitions });
  if (!written && existing) {
    return { snapshot: existing, written: false, reused: true };
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
    const issueId = typeof packet?.issueId === "string" ? packet.issueId.trim() : "";
    const delegationId = typeof packet?.delegationId === "string" ? packet.delegationId.trim() : undefined;
    const outputRec = deps.output as Record<string, unknown> | undefined;
    const outputText = typeof outputRec?.output === "string" ? (outputRec.output as string) : "";
    if (outputText.includes("Background task started")) {
      return;
    }
    if (!issueId) {
      return;
    }
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
    // Snapshot delegation definition at start — host-code write, atomic tmp+rename, write-once
    let promptHash: string | undefined;
    try {
      const useLatest = deps.useLatestDefinitions ?? (typeof packet?.useLatestDefinitions === "boolean" ? packet.useLatestDefinitions : false);
      // Resolve promptText: explicit deps > packet Objective > packet JSON
      let promptText = deps.promptText;
      if (promptText === undefined) {
        if (typeof packet?.Objective === "string" && packet.Objective.trim().length > 0) promptText = packet.Objective as string;
        else if (packet) promptText = JSON.stringify(packet);
        else promptText = "";
      }
      let seatFrontmatter = deps.seatFrontmatter;
      if (seatFrontmatter === undefined) {
        if (typeof packet?.seatFrontmatter === "string") seatFrontmatter = packet.seatFrontmatter as string;
        else seatFrontmatter = "";
      }
      const model = deps.model ?? (typeof packet?.model === "string" ? packet.model as string : "unknown");
      const preset = deps.preset ?? (typeof packet?.preset === "string" ? packet.preset as string : "balanced");
      if (promptText !== undefined && promptText.length > 0) {
        const existing = await readDefSnapshot(deps.repoRoot, issueId);
        if (!existing || useLatest) {
          const result = await ensureDefSnapshot({
            repoRoot: deps.repoRoot,
            issueId,
            promptText,
            seatFrontmatter,
            model,
            preset,
            useLatestDefinitions: useLatest,
          });
          promptHash = result.snapshot.promptHash;
        } else {
          promptHash = existing.promptHash;
        }
      }
    } catch {}
    const map = await loadSessionMap(deps.repoRoot);
    const exitGate = typeof packet?.exitGate === "boolean" ? (packet.exitGate as boolean) : undefined;
    const entry: SessionMapEntry = {
      sessionId,
      delegationId,
      updatedAt: new Date().toISOString(),
      ...(exitGate !== undefined ? { exitGate } : {}),
      ...(promptHash ? { promptHash } : {}),
    };
    await saveSessionMap(deps.repoRoot, upsertSession(map, issueId, entry));
  } catch (error) {
    safeWarn(deps.log as unknown as (level: "warn" | "info" | "error", message: string, extra?: Record<string, unknown>) => void, `session-reuse capture failed: ${String(error)}`);
  }
}
