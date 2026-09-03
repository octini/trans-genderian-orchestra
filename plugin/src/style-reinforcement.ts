import { analyzeStyleDrift, type DriftMode, type OutputClass, type DriftInput, type DriftFinding } from "./drift";
import { safeWarn } from "./config";
import type { VoiceCardId } from "./voices";
import { delegationStyleToVoiceCardId, type DelegationStyle, DELEGATION_STYLES } from "./delegation";

// Findings-targeted revision instruction (D8) — deterministic spans/evidence/family rendering
export function buildFindingsNudge(findings: DriftFinding[]): string {
  const header = "Style pass — fix only the flagged spans; preserve all protected content.";
  const footer = "Override a flag with a one-word reason if it serves rhythm/emphasis/picture/idiom/joke — otherwise apply the fix.";
  if (!findings || findings.length === 0) {
    return `${header}\n${footer}`;
  }
  const sorted = [...findings].sort((a, b) => {
    const aStart = a.spans[0]?.start ?? Number.MAX_SAFE_INTEGER;
    const bStart = b.spans[0]?.start ?? Number.MAX_SAFE_INTEGER;
    if (aStart !== bStart) return aStart - bStart;
    const axisCmp = a.axis.localeCompare(b.axis);
    if (axisCmp !== 0) return axisCmp;
    const rank = (s: string) => ["none", "low", "medium", "high"].indexOf(s);
    return rank(b.severity) - rank(a.severity);
  });
  const lines: string[] = [];
  lines.push(header);
  for (const f of sorted) {
    const rawFamily = (f as unknown as { family?: string }).family;
    let family: string;
    if (rawFamily) {
      family = rawFamily;
    } else {
      // Fallback: extract from evidence when possible (e.g., "X tell cluster" → X)
      const m = f.evidence.match(/^(.+?) tell cluster$/);
      if (m) family = m[1];
      else if (f.evidence === "Chatbot closer after the answer is complete") family = "closer";
      else if (f.evidence === "Cross-family anti-style cluster") family = "cross-family";
      else family = f.axis;
    }
    const severity = f.severity;
    const basis = f.basis;
    // Evidence in single quotes — preserve verbatim, escape embedded single quotes by replacing with \'
    // But spec says never invent claims — render DriftFinding data only; we keep evidence as-is inside single quotes.
    // If evidence itself contains a single quote, we escape it to keep payload parsable but still show original.
    const evidence = f.evidence.replace(/'/g, "\\'");
    lines.push(`- [${family}] (severity ${severity}, basis ${basis}): evidence '${evidence}'`);
    const spansStr = f.spans.map((s) => `${s.start}:${s.end}`).join(", ");
    lines.push(`  spans: [${spansStr}] — rewrite only these spans; keep code/commands/negations/numbers/explanations verbatim.`);
  }
  lines.push(footer);
  return lines.join("\n");
}

// Deprecated alias — kept for transitional callers but not used internally
export const STYLE_NUDGE = "Style pass — fix only the flagged spans; preserve all protected content.\nOverride a flag with a one-word reason if it serves rhythm/emphasis/picture/idiom/joke — otherwise apply the fix.";

type SessionState = {
  attemptID?: string;
  responseLineageID?: string;
  taskContext?: DriftInput["taskContext"] & { preservation: "known" | "unknown" | "failed" };
  reinforced: boolean;
  disabled: boolean;
  pending: { findings: DriftFinding[] } | null;
  styleOverride?: VoiceCardId;
};

// Explicit-request detection (D2 source b) — session-scoped override
// Covers `use prose` / `use conversational` / `use default` and variants like "write this in prose voice"
export function detectExplicitStyle(text: string): VoiceCardId | "clear" | null {
  const patterns: Array<{ re: RegExp; value: VoiceCardId | "clear" }> = [
    { re: /\bnormal\s+mode\b/gi, value: "clear" },
    { re: /\buse\s+default\b/gi, value: "clear" },
    { re: /\bin\s+default(?:\s+voice)?\b/gi, value: "clear" },
    { re: /\bdefault\s+voice\b/gi, value: "clear" },
    { re: /\buse\s+prose\b/gi, value: "tgo-prose" },
    { re: /\bin\s+prose(?:\s+voice)?\b/gi, value: "tgo-prose" },
    { re: /\bprose\s+voice\b/gi, value: "tgo-prose" },
    { re: /\bswitch\s+to\s+prose\b/gi, value: "tgo-prose" },
    { re: /\bwrite\b[^.!?\n]*\bin\s+prose\b/gi, value: "tgo-prose" },
    { re: /\buse\s+conversational\b/gi, value: "tgo-conversational" },
    { re: /\bin\s+conversational(?:\s+voice)?\b/gi, value: "tgo-conversational" },
    { re: /\bconversational\s+voice\b/gi, value: "tgo-conversational" },
    { re: /\bswitch\s+to\s+conversational\b/gi, value: "tgo-conversational" },
    { re: /\bwrite\b[^.!?\n]*\bin\s+conversational\b/gi, value: "tgo-conversational" },
  ];
  let lastIdx = -1;
  let lastVal: VoiceCardId | "clear" | null = null;
  for (const { re, value } of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const idx = m.index;
      if (idx >= lastIdx) {
        lastIdx = idx;
        lastVal = value;
      }
    }
  }
  return lastVal;
}

export function resolveEffectiveVoiceCardIdFromOverride(opts: {
  packetStyle?: unknown;
  explicitOverride?: VoiceCardId | null | undefined;
}): VoiceCardId {
  if (opts.explicitOverride) return opts.explicitOverride;
  if (typeof opts.packetStyle === "string" && (DELEGATION_STYLES as readonly string[]).includes(opts.packetStyle)) {
    return delegationStyleToVoiceCardId(opts.packetStyle as DelegationStyle);
  }
  return "tgo-default";
}

export interface StyleSessionClient {
  session: {
    get(options: { path: { id: string } }): Promise<{ data?: { parentID?: string | null } }>;
  };
}

export class StyleReinforcementController {
  private readonly sessions = new Map<string, SessionState>();
  private readonly cardId: VoiceCardId;
  private readonly enabled: boolean;
  private readonly productionEnabled: boolean;
  private readonly primaryCache = new Map<string, boolean>();
  private readonly log?: (level: "warn" | "info" | "error", message: string, extra?: Record<string, unknown>) => void;

  constructor(opts: { enabled?: boolean; productionEnabled?: boolean; register?: string; cardId?: VoiceCardId; log?: (level: "warn" | "info" | "error", message: string, extra?: Record<string, unknown>) => void }) {
    this.enabled = opts.enabled ?? true;
    this.productionEnabled = opts.productionEnabled ?? false;
    const legacy = (opts as { register?: string }).register;
    if (opts.cardId) this.cardId = opts.cardId;
    else if (typeof legacy === "string" && (legacy === "prose" || legacy === "conversational")) this.cardId = legacy === "prose" ? "tgo-prose" : "tgo-conversational";
    else if (typeof legacy === "string" && legacy === "natural") this.cardId = "tgo-default";
    else this.cardId = "tgo-default";
    this.log = opts.log;
  }

  private state(sessionID: string): SessionState {
    let state = this.sessions.get(sessionID);
    if (!state) {
      state = { reinforced: false, disabled: false, pending: null };
      this.sessions.set(sessionID, state);
    }
    return state;
  }

  noteUserMessage(sessionID: string, text: string, responseLineageID?: string, taskContext?: SessionState["taskContext"]): void {
    const state = this.state(sessionID);
    // Existing off-switch stays — suppress entirely
    if (/\b(?:stop\s+\w+|normal\s+mode)\b/i.test(text)) state.disabled = true;
    // D2 explicit-request detection: use prose / use conversational / use default (+ variants) set/clear session override
    const explicit = detectExplicitStyle(text);
    if (explicit === "clear") {
      state.styleOverride = undefined;
    } else if (explicit) {
      state.styleOverride = explicit;
    }
    if (responseLineageID && state.responseLineageID === responseLineageID) return;
    if (state.attemptID || state.pending || state.reinforced) {
      state.attemptID = undefined;
      state.reinforced = false;
      state.pending = null;
    }
    state.responseLineageID = responseLineageID;
    state.taskContext = taskContext;
  }

  getStyleOverride(sessionID: string): VoiceCardId | undefined {
    return this.state(sessionID).styleOverride;
  }

  getEffectiveStyle(sessionID: string, packetStyle?: unknown): VoiceCardId {
    const state = this.state(sessionID);
    if (state.styleOverride) return state.styleOverride;
    if (typeof packetStyle === "string" && (DELEGATION_STYLES as readonly string[]).includes(packetStyle)) {
      return delegationStyleToVoiceCardId(packetStyle as DelegationStyle);
    }
    return this.cardId;
  }

  private async isPrimary(client: StyleSessionClient, sessionID: string): Promise<boolean> {
    const cached = this.primaryCache.get(sessionID);
    if (cached !== undefined) return cached;
    const result = await client.session.get({ path: { id: sessionID } }).catch((err) => {
      const msg = "tgo: style-reinforcement isPrimary session.get failed";
      if (this.log) safeWarn(this.log, msg, { sessionID, error: String(err) });
      else console.warn(`${msg}: ${String(err)}`, { sessionID });
      return undefined;
    });
    const data = result?.data;
    const primary = Boolean(
      data && Object.prototype.hasOwnProperty.call(data, "parentID") && data.parentID === null
    );
    this.primaryCache.set(sessionID, primary);
    return primary;
  }

  async noteCompletion(client: StyleSessionClient, input: {
    sessionID: string;
    messageID: string;
    candidate: string;
    outputClass?: OutputClass;
    mode?: DriftMode;
    responseLineageID?: string;
    taskContext?: SessionState["taskContext"];
    packetStyle?: unknown;
  }): Promise<boolean> {
    const { sessionID, messageID, candidate, outputClass = "technical-steps-code", mode = "chat" } = input;
    const state = this.state(sessionID);
    if (!this.productionEnabled || !this.enabled || state.disabled || state.reinforced || state.pending || !(await this.isPrimary(client, sessionID))) return false;
    const lineage = input.responseLineageID ?? state.responseLineageID;
    // The completion hook exposes messageID/partID, but no user-turn lineage.
    // Do not turn an unverified message ID into a second reinforcement attempt.
    if (!lineage) return false;
    state.attemptID ??= `${sessionID}:${lineage}`;
    if (state.responseLineageID && state.responseLineageID !== lineage) return false;
    const context = input.taskContext ?? state.taskContext;
    if (!context || context.preservation !== "known") return false;
    const packetStyle = (input as { packetStyle?: unknown }).packetStyle;
    const cardId = this.getEffectiveStyle(sessionID, packetStyle) ?? this.cardId;
    const result = analyzeStyleDrift({ attemptID: state.attemptID, cardId, outputClass, mode, enabled: true, reinforced: false, candidate, taskContext: context });
    if (!result.aggregate.reinforcementEligible) return false;
    // Store actionable findings only — deterministic, no invention
    const actionable = result.findings.filter((f) => !f.suppressed && (f.severity === "medium" || f.severity === "high") && f.uncertainty.codes.length === 0);
    if (actionable.length === 0) return false;
    state.pending = { findings: actionable };
    return true;
  }

  async appendPending(client: StyleSessionClient, sessionID: string, system: string[]): Promise<boolean> {
    const state = this.state(sessionID);
    if (!state.pending || state.reinforced || state.disabled || !this.enabled || !(await this.isPrimary(client, sessionID))) return false;
    const nudge = buildFindingsNudge(state.pending.findings);
    system.push(nudge);
    state.pending = null;
    state.reinforced = true;
    return true;
  }

  reset(sessionID?: string): void {
    if (sessionID) {
      this.sessions.delete(sessionID);
      this.primaryCache.delete(sessionID);
    } else {
      this.sessions.clear();
      this.primaryCache.clear();
    }
  }
}
