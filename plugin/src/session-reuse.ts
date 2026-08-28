import * as fs from "node:fs/promises";
import * as path from "node:path";
import { estimateTokens } from "./config";
import { readProgress, writeProgress, formatProgress, parseProgress, updateProgress } from "./progress";

export interface SessionMapEntry {
  sessionId: string;
  delegationId?: string;
  exitGate?: boolean;
  updatedAt: string;
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
      out[key] = entry as unknown as SessionMapEntry;
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
        try {
          opts.log?.("warn", `progress handback failed: ${String(e)}`);
        } catch {}
        return;
      }
      issueId = fetchedIssueId;
      try {
        const entry: SessionMapEntry = { sessionId: opts.sessionID, updatedAt: new Date().toISOString() };
        const nextMap = upsertSession(map, issueId, entry);
        await saveSessionMap(opts.repoRoot, nextMap);
        map = nextMap;
      } catch (e) {
        try {
          opts.log?.("warn", `progress handback failed: ${String(e)}`);
        } catch {}
      }
    }
    if (!issueId) return;
    const blocker = `watchdog abort (${opts.reason}) at ${new Date().toISOString()} — session ${opts.sessionID}; re-dispatch may reuse its task_id`;
    const ok = await updateProgress(opts.repoRoot, issueId, (parts) => ({
      ...parts,
      blockers: [...parts.blockers, blocker],
    }));
    if (!ok) {
      throw new Error(`writeProgress failed for ${issueId}`);
    }
  } catch (e) {
    try {
      opts.log?.("warn", `progress handback failed: ${String(e)}`);
    } catch {}
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

export async function captureDelegationSession(deps: { tool: string; input: unknown; output: unknown; repoRoot: string; enabled: boolean; log?: (level: "warn" | "info", message: string) => void }): Promise<void> {
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
    const map = await loadSessionMap(deps.repoRoot);
    const exitGate = typeof packet?.exitGate === "boolean" ? (packet.exitGate as boolean) : undefined;
    const entry: SessionMapEntry = {
      sessionId,
      delegationId,
      updatedAt: new Date().toISOString(),
      ...(exitGate !== undefined ? { exitGate } : {}),
    };
    await saveSessionMap(deps.repoRoot, upsertSession(map, issueId, entry));
  } catch (error) {
    try {
      deps.log?.("warn", `session-reuse capture failed: ${String(error)}`);
    } catch {}
  }
}
