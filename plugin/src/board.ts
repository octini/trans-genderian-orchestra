import * as crypto from "node:crypto";
import { readProgress } from "./progress";
import { estimateSessionTokens, loadSessionMap, shouldReuse } from "./session-reuse";

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

export function buildBoardText(data: {
  inProgress: BdIssue[];
  ready: BdIssue[];
  blocked: BdIssue[];
  memories: Array<{ key: string; value: string }>;
  streaming: Array<{ id: string; target: string }>;
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

  return sections.join("\n");
}

export async function buildBoardTextWithHints(
  data: {
    inProgress: BdIssue[];
    ready: BdIssue[];
    blocked: BdIssue[];
    memories: Array<{ key: string; value: string }>;
    streaming: Array<{ id: string; target: string }>;
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
      inProgressLines.push(line(issue));
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

  constructor(opts: {
    run: BdRunner;
    shim?: BoardShim;
    refreshMs?: number;
    sessionReuse?: SessionReuseDeps;
  }) {
    this.run = opts.run;
    this.shim = opts.shim ?? createShim();
    this.refreshMs = opts.refreshMs ?? DEFAULT_BOARD_REFRESH_MS;
    this.sessionReuse = opts.sessionReuse;
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
    const res = await client.app.agents().catch(() => undefined);
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
    const session = await client.session.get({ path: { id: input.sessionID } }).catch(() => undefined);
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
  }

  invalidate(sessionID: string): void {
    this.renderCache.delete(sessionID);
  }

  public async buildBoardTextWithHints(
    data: {
      inProgress: BdIssue[];
      ready: BdIssue[];
      blocked: BdIssue[];
      memories: Array<{ key: string; value: string }>;
      streaming: Array<{ id: string; target: string }>;
    },
    reusableSet?: Set<string>,
    sessionIdsByIssue?: Map<string, string>,
    maxListed = 6
  ): Promise<string> {
    return buildBoardTextWithHints(data, reusableSet, sessionIdsByIssue, maxListed, this.sessionReuse?.repoRoot);
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
          raw = await this.sessionReuse!.client.session.messages({ path: { id: sid } });
        } catch {
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
        if (shouldReuse(estimate, this.sessionReuse!.maxContextTokens)) {
          reusableSet.add(issue.id);
          sessionIdsByIssue.set(issue.id, sid);
        }
      }
    }

    const inner = await this.buildBoardTextWithHints(
      { inProgress, ready, blocked, memories, streaming },
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
