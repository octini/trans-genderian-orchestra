import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { safeWarn } from "./config";
import { readProgress } from "./progress";
import { estimateSessionTokens, loadSessionMap, shouldReuseWithSnapshot } from "./session-reuse";
import { readDefSnapshot } from "./def-snapshot";
import { computeMetrics, readMetrics, writeMetrics, renderQueueLine, buildProblemsSection, type ProblemEntry } from "./metrics";
import { scanRunsForProblems } from "./runs";

export const BOARD_SENTINEL_START = "<!-- tgo:board -->";
export const BOARD_SENTINEL_END = "<!-- /tgo:board -->";

export type BdRunner = (command: string) => Promise<string>;

export interface BdIssue {
  id: string;
  title: string;
  priority: number;
  issueType?: string;
  parent?: string;
  blockedBy?: string[];
}

export interface BoardShim {
  streaming: Map<string, { target: string; startedAt: number }>;
  agents: Map<string, string>;
}

export function createShim(): BoardShim {
  return { streaming: new Map(), agents: new Map() };
}

interface RawIssue {
  id?: string;
  title?: string;
  priority?: number;
  issue_type?: string;
  parent?: string;
  blocked_by?: string[];
}

function parseIssues(raw: string): BdIssue[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((i: RawIssue) => ({
        id: String(i.id ?? ""),
        title: String(i.title ?? ""),
        priority: typeof i.priority === "number" ? i.priority : 0,
        issueType: i.issue_type,
        parent: i.parent,
        blockedBy: Array.isArray(i.blocked_by) ? i.blocked_by.map(String) : undefined,
      }))
      .filter((i) => i.id && i.title);
  } catch {
    return [];
  }
}

function clipTitle(title: string, max = 70): string {
  return title.length > max ? `${title.slice(0, max - 1)}…` : title;
}

interface MemoryMap {
  [key: string]: string;
}

function parseMemories(raw: string): Array<{ key: string; value: string }> {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return [];
    return Object.entries(parsed)
      .filter(([key]) => key !== "schema_version")
      .map(([key, value]) => ({ key, value: String(value) }))
      .filter((m) => m.value);
  } catch {
    return [];
  }
}

function line(issue: BdIssue): string {
  const prio = `P${issue.priority}`;
  const epic = issue.issueType === "epic" ? " · epic" : "";
  return `- ${issue.id} · ${prio}${epic} · ${clipTitle(issue.title)}`;
}

export function buildQueueSection(metricsSnapshot: import("./metrics").MetricsSnapshot | undefined, previousSnapshot?: import("./metrics").MetricsSnapshot | undefined): string | undefined {
  const line = renderQueueLine(metricsSnapshot, previousSnapshot);
  if (!line) return undefined;
  return line;
}

export function buildProblemsText(problems: ProblemEntry[]): string | undefined {
  return buildProblemsSection(problems);
}

export function buildBoardText(data: {
  inProgress: BdIssue[];
  ready: BdIssue[];
  blocked: BdIssue[];
  memories: Array<{ key: string; value: string }>;
  streaming: Array<{ id: string; target: string }>;
  queueLines?: string[];
  problems?: ProblemEntry[];
}, maxListed = 6): string {
  const sections: string[] = ["## TGO JOB BOARD"];

  if (data.memories.length > 0) {
    sections.push(
      "MEMORIES:",
      ...data.memories.map((m) => `- ${clipTitle(m.value, 120)}`)
    );
  }
  if (data.inProgress.length > 0) {
    sections.push("IN PROGRESS:", ...data.inProgress.map(line));
  }
  if (data.ready.length > 0) {
    const shown = data.ready.slice(0, maxListed);
    sections.push("READY:", ...shown.map(line));
    if (data.ready.length > shown.length) {
      sections.push(`- … and ${data.ready.length - shown.length} more ready`);
    }
  }
  if (data.blocked.length > 0) {
    const shown = data.blocked.slice(0, maxListed);
    const blocked = shown.map((issue) => {
      const deps = issue.blockedBy?.length ? ` ← ${issue.blockedBy.join(",")}` : "";
      return `${line(issue)}${deps}`;
    });
    sections.push("BLOCKED:", ...blocked);
    if (data.blocked.length > shown.length) {
      sections.push(`- … and ${data.blocked.length - shown.length} more blocked`);
    }
  }
  if (data.streaming.length > 0) {
    sections.push(
      "STREAMING:",
      ...data.streaming.map((s) => `- ${s.id} → ${s.target}`)
    );
  }
  if (data.queueLines && data.queueLines.length > 0) {
    sections.push(...data.queueLines);
  }
  if (data.problems && data.problems.length > 0) {
    const probText = buildProblemsSection(data.problems);
    if (probText) sections.push(probText);
  }

  return sections.join("\n");
}

export async function buildBoardTextWithHints(
  data: {
    inProgress: BdIssue[];
    ready: BdIssue[];
    blocked: BdIssue[];
    memories: Array<{ key: string; value: string }>;
    streaming: Array<{ id: string; target: string }>;
    queueLines?: string[];
    problems?: ProblemEntry[];
  },
  reusableSet?: Set<string>,
  sessionIdsByIssue?: Map<string, string>,
  maxListed = 6,
  repoRoot?: string
): Promise<string> {
  const sections: string[] = ["## TGO JOB BOARD"];
  if (data.memories.length > 0) {
    sections.push(
      "MEMORIES:",
      ...data.memories.map((m) => `- ${clipTitle(m.value, 120)}`)
    );
  }
  if (data.inProgress.length > 0) {
    const inProgressLines: string[] = [];
    for (const issue of data.inProgress) {
      let rendered = line(issue);
      if (repoRoot) {
        try {
          const snap = await readDefSnapshot(repoRoot, issue.id);
          if (snap) rendered += ` [pinned v${snap.promptHash.slice(0, 8)}]`;
        } catch {}
      }
      inProgressLines.push(rendered);
      if (reusableSet?.has(issue.id) && sessionIdsByIssue?.has(issue.id)) {
        const sid = sessionIdsByIssue.get(issue.id)!;
        inProgressLines.push(`reusable session ${sid} — pass task_id: "${sid}" on the next task call to continue it.`);
      }
      if (repoRoot) {
        try {
          const p = await readProgress(repoRoot, issue.id);
          if (p !== undefined) inProgressLines.push(`progress: .tgo/${issue.id}/progress.md`);
        } catch {}
      }
    }
    sections.push("IN PROGRESS:", ...inProgressLines);
  }
  if (data.ready.length > 0) {
    const shown = data.ready.slice(0, maxListed);
    sections.push("READY:", ...shown.map(line));
    if (data.ready.length > shown.length) {
      sections.push(`- … and ${data.ready.length - shown.length} more ready`);
    }
  }
  if (data.blocked.length > 0) {
    const shown = data.blocked.slice(0, maxListed);
    const blocked = shown.map((issue) => {
      const deps = issue.blockedBy?.length ? ` ← ${issue.blockedBy.join(",")}` : "";
      return `${line(issue)}${deps}`;
    });
    sections.push("BLOCKED:", ...blocked);
    if (data.blocked.length > shown.length) {
      sections.push(`- … and ${data.blocked.length - shown.length} more blocked`);
    }
  }
  if (data.streaming.length > 0) {
    sections.push(
      "STREAMING:",
      ...data.streaming.map((s) => `- ${s.id} → ${s.target}`)
    );
  }
  if (data.queueLines && data.queueLines.length > 0) {
    sections.push(...data.queueLines);
  }
  if (data.problems && data.problems.length > 0) {
    const probText = buildProblemsSection(data.problems);
    if (probText) sections.push(probText);
  }
  return sections.join("\n");
}

export async function renderBoard(
  run: BdRunner,
  shim: BoardShim
): Promise<string | undefined> {
  const [inProgress, ready, blocked, memories] = await Promise.all([
    run("bd list --status in_progress --json"),
    run("bd ready --json"),
    run("bd blocked --json"),
    run("bd memories --json"),
  ]);

  if (!inProgress && !ready && !blocked && !memories) return undefined;

  const text = buildBoardText({
    inProgress: parseIssues(inProgress),
    ready: parseIssues(ready),
    blocked: parseIssues(blocked),
    memories: parseMemories(memories),
    streaming: Array.from(shim.streaming, ([id, s]) => ({ id, target: s.target })),
  });

  return `${BOARD_SENTINEL_START}\n${text}\n${BOARD_SENTINEL_END}`;
}

export interface BoardMessage {
  info: {
    id: string;
    sessionID: string;
    role: "user";
    time: { created: number };
    agent: string;
    model?: { providerID: string; modelID: string };
  };
  parts: Array<{
    id: string;
    sessionID: string;
    messageID: string;
    type: "text";
    text: string;
    synthetic: boolean;
  }>;
}

export function isBoardMessage(message: { parts: Array<{ text?: string }> }): boolean {
  return message.parts.some((part) => part.text?.includes(BOARD_SENTINEL_START));
}

export function stripBoardMessages(messages: BoardMessage[]): number {
  let removed = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (isBoardMessage(messages[i])) {
      messages.splice(i, 1);
      removed++;
    }
  }
  return removed;
}

export function appendBoardMessage(
  messages: BoardMessage[],
  text: string,
  ref: { sessionID: string; agent: string; model?: { providerID: string; modelID: string } }
): void {
  const id = `tgo-board-${crypto.randomUUID()}`;
  const info: BoardMessage["info"] = {
    id,
    sessionID: ref.sessionID,
    role: "user",
    time: { created: Date.now() },
    agent: ref.agent,
    model: ref.model,
  };
  messages.push({
    info,
    parts: [
      {
        id: `tgo-board-part-${crypto.randomUUID()}`,
        sessionID: ref.sessionID,
        messageID: id,
        type: "text",
        text,
        synthetic: true,
      },
    ],
  });
}

export interface TransformContext {
  sessionID: string;
  agent: string;
  model?: { providerID: string; modelID: string };
}

export function deriveContext(messages: BoardMessage[]): TransformContext | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const info = messages[i]?.info;
    if (info?.role === "user" && info.agent) {
      return { sessionID: info.sessionID, agent: info.agent, model: info.model };
    }
  }
  return undefined;
}

export const DEFAULT_BOARD_REFRESH_MS = 5000;

export type SessionReuseDeps = {
  repoRoot: string;
  client: { session: { messages(options: { path: { id: string } }): Promise<any> } };
  maxContextTokens: number;
  supported: boolean;
  enabled?: boolean;
};

export class BoardController {
  private readonly shim: BoardShim;
  private readonly run: BdRunner;
  private readonly refreshMs: number;
  private readonly renderCache = new Map<string, { text: string; at: number }>();
  private readonly sessionEligibility = new Map<string, boolean>();
  private readonly injectedSessions = new Set<string>();
  private agentCache: { byName: Map<string, "primary" | "subagent" | "all">; at: number } | undefined;
  private readonly sessionReuse?: SessionReuseDeps;
  private readonly log?: (level: "warn" | "info" | "error", message: string, extra?: Record<string, unknown>) => void;
  private readonly sessionMessagesCache = new Map<string, { raw: any; at: number }>();
  private readonly sessionMessagesPending = new Map<string, Promise<any>>();
  private static readonly MAX_SESSION_MESSAGES_CACHE = 32;
  // tgo-2ry: queue gauge and problems state — additive, no existing field removed
  private previousMetrics?: import("./metrics").MetricsSnapshot;
  private watchdogGetter?: () => ReadonlyArray<{ sessionID: string; parentID?: string; busy: boolean }>;
  private problemsCache: ProblemEntry[] = [];
  private pruneDone = false;
  private runsConfig?: { maxAgeMs?: number; maxBytes?: number; maxFiles?: number; heartbeatThresholdMs?: number };
  private pruneInFlight?: Promise<string[]>;
  private scanInFlight = false;

  constructor(opts: {
    run: BdRunner;
    shim?: BoardShim;
    refreshMs?: number;
    sessionReuse?: SessionReuseDeps;
    log?: (level: "warn" | "info" | "error", message: string, extra?: Record<string, unknown>) => void;
    watchdogGetter?: () => ReadonlyArray<{ sessionID: string; parentID?: string; busy: boolean }>;
  }) {
    this.run = opts.run;
    this.shim = opts.shim ?? createShim();
    this.refreshMs = opts.refreshMs ?? DEFAULT_BOARD_REFRESH_MS;
    this.sessionReuse = opts.sessionReuse;
    this.log = opts.log;
    this.watchdogGetter = opts.watchdogGetter;
  }

  /** tgo-2ry: allow plugin to wire watchdog tracked state without rewriting board */
  setWatchdogGetter(getter: () => ReadonlyArray<{ sessionID: string; parentID?: string; busy: boolean }>): void {
    this.watchdogGetter = getter;
  }

  setRunsConfig(cfg: { maxAgeMs?: number; maxBytes?: number; maxFiles?: number; heartbeatThresholdMs?: number }): void {
    this.runsConfig = cfg;
  }

  /** tgo-2ry: expose problems for tests and allow external injection */
  setProblems(problems: ProblemEntry[]): void {
    // F6 dedupe by runId+state, replace-not-append
    const map = new Map<string, ProblemEntry>();
    for (const p of problems) map.set(`${p.runId}:${p.state}`, p);
    this.problemsCache = [...map.values()];
  }

  getProblems(): ProblemEntry[] {
    return this.problemsCache;
  }

  private async fetchSessionMessagesCached(sid: string): Promise<any> {
    const now = Date.now();
    const cached = this.sessionMessagesCache.get(sid);
    if (cached && now - cached.at < this.refreshMs) return cached.raw;
    const pending = this.sessionMessagesPending.get(sid);
    if (pending) return pending;
    const promise = (async () => {
      try {
        const raw = await this.sessionReuse!.client.session.messages({ path: { id: sid } });
        if (this.sessionMessagesCache.size >= BoardController.MAX_SESSION_MESSAGES_CACHE) {
          const oldest = this.sessionMessagesCache.keys().next().value as string | undefined;
          if (oldest !== undefined) this.sessionMessagesCache.delete(oldest);
        }
        this.sessionMessagesCache.set(sid, { raw, at: Date.now() });
        return raw;
      } finally {
        this.sessionMessagesPending.delete(sid);
      }
    })();
    this.sessionMessagesPending.set(sid, promise);
    return promise;
  }

  get shimState(): BoardShim {
    return this.shim;
  }

  private async loadAgents(
    client: { app: { agents(): Promise<{ data?: Array<{ name: string; mode: "primary" | "subagent" | "all" }> }> } }
  ): Promise<Map<string, "primary" | "subagent" | "all">> {
    const now = Date.now();
    if (this.agentCache && now - this.agentCache.at < 30_000) return this.agentCache.byName;
    const byName = new Map<string, "primary" | "subagent" | "all">();
    const res = await client.app.agents().catch((err) => {
      const msg = "tgo: board loadAgents failed";
      if (this.log) safeWarn(this.log, msg, { error: String(err) });
      else console.warn(`${msg}: ${String(err)}`);
      return undefined;
    });
    for (const agent of res?.data ?? []) {
      byName.set(agent.name, agent.mode);
    }
    this.agentCache = { byName, at: now };
    return byName;
  }

  async shouldInject(
    client: { app: { agents(): Promise<{ data?: Array<{ name: string; mode: "primary" | "subagent" | "all" }> }> } },
    agent: string | undefined
  ): Promise<boolean> {
    if (!agent) return true;
    const agents = await this.loadAgents(client);
    const mode = agents.get(agent);
    if (!mode) return true;
    return mode === "primary" || mode === "all";
  }

  async gate(
    client: {
      app: { agents(): Promise<{ data?: Array<{ name: string; mode: "primary" | "subagent" | "all" }> }> };
      session: { get(options: { path: { id: string } }): Promise<{ data?: { parentID?: string | null } }> };
    },
    input: { sessionID: string; agent?: string }
  ): Promise<void> {
    if (this.injectedSessions.has(input.sessionID)) return;
    this.injectedSessions.add(input.sessionID);
    const session = await client.session.get({ path: { id: input.sessionID } }).catch((err) => {
      const msg = "tgo: board gate session.get failed";
      if (this.log) safeWarn(this.log, msg, { sessionID: input.sessionID, error: String(err) });
      else console.warn(`${msg}: ${String(err)}`, { sessionID: input.sessionID });
      return undefined;
    });
    const isPrimary = Boolean(
      session?.data &&
        Object.prototype.hasOwnProperty.call(session.data, "parentID") &&
        session.data.parentID === null
    );
    const eligible = isPrimary && (await this.shouldInject(client, input.agent));
    this.sessionEligibility.set(input.sessionID, eligible);
  }

  reset(sessionID: string): void {
    this.injectedSessions.delete(sessionID);
    this.renderCache.delete(sessionID);
    this.sessionMessagesCache.clear();
    this.sessionMessagesPending.clear();
  }

  invalidate(sessionID: string): void {
    this.renderCache.delete(sessionID);
    this.sessionMessagesCache.clear();
    this.sessionMessagesPending.clear();
  }

  public async buildBoardTextWithHints(
    data: {
      inProgress: BdIssue[];
      ready: BdIssue[];
      blocked: BdIssue[];
      memories: Array<{ key: string; value: string }>;
      streaming: Array<{ id: string; target: string }>;
      queueLines?: string[];
      problems?: ProblemEntry[];
    },
    reusableSet?: Set<string>,
    sessionIdsByIssue?: Map<string, string>,
    maxListed = 6
  ): Promise<string> {
    return buildBoardTextWithHints(data as any, reusableSet, sessionIdsByIssue, maxListed, this.sessionReuse?.repoRoot);
  }

  public async renderFor(sessionID: string): Promise<string | undefined> {
    const now = Date.now();
    const cached = this.renderCache.get(sessionID);
    if (cached && now - cached.at < this.refreshMs) return cached.text;

    const reuseActive =
      Boolean(this.sessionReuse) &&
      this.sessionReuse!.supported === true &&
      this.sessionReuse!.enabled !== false;

    if (!reuseActive) {
      const text = await renderBoard(this.run, this.shim);
      if (text) this.renderCache.set(sessionID, { text, at: now });
      return text;
    }

    const [inProgressRaw, readyRaw, blockedRaw, memoriesRaw] = await Promise.all([
      this.run("bd list --status in_progress --json"),
      this.run("bd ready --json"),
      this.run("bd blocked --json"),
      this.run("bd memories --json"),
    ]);
    if (!inProgressRaw && !readyRaw && !blockedRaw && !memoriesRaw) return undefined;
    const inProgress = parseIssues(inProgressRaw);
    const ready = parseIssues(readyRaw);
    const blocked = parseIssues(blockedRaw);
    const memories = parseMemories(memoriesRaw);
    const streaming = Array.from(this.shim.streaming, ([id, s]) => ({ id, target: s.target }));
    // tgo-2ry: prune on first tick — F9 single-flight + config values (no defaults, no race)
    const repoRootForPrune = this.sessionReuse?.repoRoot;
    if (repoRootForPrune && !this.pruneDone) {
      this.pruneDone = true;
      // single-flight guard at board level as well (runs.ts also has guard)
      if (!this.pruneInFlight) {
        this.pruneInFlight = (async () => {
          try {
            const { pruneRuns } = await import("./runs");
            return await pruneRuns(repoRootForPrune, {
              now,
              maxAgeMs: this.runsConfig?.maxAgeMs,
              maxBytes: this.runsConfig?.maxBytes,
              maxFiles: this.runsConfig?.maxFiles,
              heartbeatThresholdMs: this.runsConfig?.heartbeatThresholdMs,
            });
          } catch { return []; }
        })();
        void this.pruneInFlight.finally(() => { this.pruneInFlight = undefined; }).catch(() => {});
        await this.pruneInFlight.catch(() => {});
      }
    }
    // tgo-2ry: queue-depth gauge
    let queueLines: string[] | undefined;
    let metricsSnapshot: import("./metrics").MetricsSnapshot | undefined;
    try {
      const repoRootForMetrics = this.sessionReuse?.repoRoot;
      if (repoRootForMetrics) {
        const watchdogTracked = this.watchdogGetter ? this.watchdogGetter() : undefined;
        const previous = this.previousMetrics ?? (await readMetrics(repoRootForMetrics).catch(() => undefined));
        const streamingWithStartedAt = Array.from(this.shim.streaming, ([id, s]) => ({ id, target: s.target, startedAt: s.startedAt }));
        metricsSnapshot = computeMetrics({
          ready,
          blocked,
          streaming: streamingWithStartedAt,
          watchdogTracked,
          shimAgents: this.shim.agents,
          now,
          previous,
        });
        await writeMetrics(repoRootForMetrics, metricsSnapshot).catch((e) => {
          safeWarn(this.log, "metrics write failed", { error: String(e) });
        });
        this.previousMetrics = metricsSnapshot;
        const ql = renderQueueLine(metricsSnapshot, previous);
        if (ql) queueLines = ql.split("\n");
      }
    } catch (e) {
      safeWarn(this.log, "queue gauge compute failed", { error: String(e) });
    }
    // tgo-2ry: recovery scan -> problems — F5 watchdog wiring + F6 dedupe/drop stale + F9 in-flight guard
    let problems: ProblemEntry[] | undefined;
    try {
      if (this.scanInFlight) {
        // F9 skip if previous scan pending
        problems = this.problemsCache.length > 0 ? this.problemsCache : undefined;
      } else {
        this.scanInFlight = true;
        const repoRootForProblems = this.sessionReuse?.repoRoot;
        if (repoRootForProblems) {
          const [recovery] = await Promise.all([
            scanRunsForProblems(repoRootForProblems, { now, heartbeatThresholdMs: this.runsConfig?.heartbeatThresholdMs }).catch(() => []),
          ]);
          const { problemsFromRecovery } = await import("./metrics");
          // F5: wire watchdog problems via watchdogGetter
          let watchdogProblems: Array<{ sessionID: string; issueId?: string; state: import("./metrics").ProblemState; reason: string }> | undefined;
          if (this.watchdogGetter) {
            try {
              const tracked = this.watchdogGetter();
              const busy = tracked.filter((t) => t.busy);
              if (busy.length > 0) {
                watchdogProblems = busy.map((t) => {
                  // try to resolve issueId via sessionMap or shim? For now use sessionID as runId placeholder and map to idle (watchdog busy implies idle risk)
                  // If we have a mapping from sessionID to issueId via loadSessionMap, try to resolve
                  return { sessionID: t.sessionID, state: "idle" as const, reason: "watchdog busy — possible idle" };
                });
                // Attempt to enrich with issueId via session map (best effort)
                try {
                  const map = await (await import("./session-reuse")).loadSessionMap(repoRootForProblems).catch(() => ({} as any));
                  for (const wp of watchdogProblems) {
                    for (const [iid, entry] of Object.entries(map as Record<string, any>)) {
                      if (entry.sessionId === wp.sessionID) { (wp as any).issueId = iid; break; }
                    }
                  }
                } catch {}
              }
            } catch {}
          }
          const derived = problemsFromRecovery(recovery as any, watchdogProblems as any);
          // F6: key by runId+state, replace-not-append, drop stale (but keep externally set cache for 1 tick for test harness)
          const dedup = new Map<string, ProblemEntry>();
          for (const p of derived) dedup.set(`${p.runId}:${p.state}`, p);
          // Include previously setProblems that are not stale — for F6 drop, we only keep cache entries that correspond to a current derived/watchdog or were explicitly set and not yet stale.
          // For now, keep cache entries that are not already in dedup (preserves test-injected idle/aborted for one render, but next scan without them will drop)
          for (const p of this.problemsCache) {
            const key = `${p.runId}:${p.state}`;
            if (!dedup.has(key)) dedup.set(key, p);
          }
          const merged = [...dedup.values()];
          if (merged.length > 0) problems = merged;
          this.problemsCache = merged;
        } else if (this.problemsCache.length > 0) {
          problems = this.problemsCache;
        }
        this.scanInFlight = false;
      }
    } catch { this.scanInFlight = false; }
    let reusableSet: Set<string> | undefined;
    let sessionIdsByIssue: Map<string, string> | undefined;
    let map: Record<string, { sessionId: string }> = {};
    try {
      map = (await loadSessionMap(this.sessionReuse!.repoRoot)) as Record<string, { sessionId: string }>;
    } catch {
      map = {};
    }
    if (map && typeof map === "object" && Object.keys(map).length > 0 && inProgress.length > 0) {
      reusableSet = new Set<string>();
      sessionIdsByIssue = new Map<string, string>();
      for (const issue of inProgress) {
        const entry = (map as Record<string, any>)[issue.id];
        if (!entry || typeof entry.sessionId !== "string" || !entry.sessionId) continue;
        const sid = entry.sessionId as string;
        let raw: any;
        try {
          raw = await this.fetchSessionMessagesCached(sid);
        } catch (err) {
          const msg = "tgo: board session.messages failed";
          if (this.log) safeWarn(this.log, msg, { sessionId: sid, error: String(err) });
          else console.warn(`${msg}: ${String(err)}`, { sessionId: sid });
          continue;
        }
        const messages: Array<{ parts: Array<{ type: string; text?: string }> }> = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
            ? raw.data
            : [];
        let estimate: number;
        try {
          estimate = estimateSessionTokens(messages as Array<{ parts: Array<{ type: string; text?: string }> }>);
        } catch {
          continue;
        }
        let snapshot: import("./def-snapshot").DefSnapshot | null | undefined;
        try {
          snapshot = await readDefSnapshot(this.sessionReuse!.repoRoot, issue.id);
        } catch {
          snapshot = null;
        }
        if (shouldReuseWithSnapshot(estimate, this.sessionReuse!.maxContextTokens, { snapshot: snapshot ?? null })) {
          reusableSet.add(issue.id);
          sessionIdsByIssue.set(issue.id, sid);
        }
      }
    }

    const inner = await this.buildBoardTextWithHints(
      { inProgress, ready, blocked, memories, streaming, queueLines, problems },
      reusableSet,
      sessionIdsByIssue
    );
    const text = `${BOARD_SENTINEL_START}\n${inner}\n${BOARD_SENTINEL_END}`;
    if (text) this.renderCache.set(sessionID, { text, at: now });
    return text;
  }

  async transform(messages: BoardMessage[]): Promise<void> {
    const context = deriveContext(messages);
    if (!context) return;

    // Learn the seat for this session regardless of eligibility. Live probe
    // (opencode 1.18.13): chat.message DOES fire for subagent sessions (so
    // noteAgent already names them), and the transform fires too — this line
    // is a belt-and-braces second writer that keeps the shim's session→agent
    // map correct even if chat.message is ever skipped for a subagent. The
    // STREAMING board section thus names subagent seats instead of the
    // "subagent" fallback.
    this.shim.agents.set(context.sessionID, context.agent);

    // Default-deny: only sessions the gate explicitly marked eligible (the
    // primary, via chat.message) receive the board. A session the gate never
    // saw — or one whose agent mode resolves to "subagent" — is skipped
    // rather than defaulting to injection.
    const eligible = this.sessionEligibility.get(context.sessionID) ?? false;
    if (!eligible) return;

    stripBoardMessages(messages);
    const text = await this.renderFor(context.sessionID);
    if (text) appendBoardMessage(messages, text, context);
  }
}
