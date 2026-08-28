import { analyzeStyleDrift, type DriftMode, type DriftRegister, type OutputClass, type DriftInput } from "./drift";

export const STYLE_NUDGE = "Self-audit the next response for correctness-neutral style drift; preserve all technical content and required caveats.";

type SessionState = {
  attemptID?: string;
  responseLineageID?: string;
  taskContext?: DriftInput["taskContext"] & { preservation: "known" | "unknown" | "failed" };
  reinforced: boolean;
  disabled: boolean;
  pending: boolean;
};

export interface StyleSessionClient {
  session: {
    get(options: { path: { id: string } }): Promise<{ data?: { parentID?: string | null } }>;
  };
}

export class StyleReinforcementController {
  private readonly sessions = new Map<string, SessionState>();
  private readonly register: DriftRegister;
  private readonly enabled: boolean;
  private readonly productionEnabled: boolean;
  private readonly primaryCache = new Map<string, boolean>();
  private readonly log?: (level: "warn" | "info" | "error", message: string, extra?: Record<string, unknown>) => void;

  constructor(opts: { enabled?: boolean; productionEnabled?: boolean; register?: DriftRegister; log?: (level: "warn" | "info" | "error", message: string, extra?: Record<string, unknown>) => void }) {
    this.enabled = opts.enabled ?? true;
    this.productionEnabled = opts.productionEnabled ?? false;
    this.register = opts.register ?? "concise";
    this.log = opts.log;
  }

  private state(sessionID: string): SessionState {
    let state = this.sessions.get(sessionID);
    if (!state) {
      state = { reinforced: false, disabled: false, pending: false };
      this.sessions.set(sessionID, state);
    }
    return state;
  }

  noteUserMessage(sessionID: string, text: string, responseLineageID?: string, taskContext?: SessionState["taskContext"]): void {
    const state = this.state(sessionID);
    if (/\b(?:stop\s+\w+|normal\s+mode)\b/i.test(text)) state.disabled = true;
    if (responseLineageID && state.responseLineageID === responseLineageID) return;
    if (state.attemptID || state.pending || state.reinforced) {
      state.attemptID = undefined;
      state.reinforced = false;
      state.pending = false;
    }
    state.responseLineageID = responseLineageID;
    state.taskContext = taskContext;
  }

  private async isPrimary(client: StyleSessionClient, sessionID: string): Promise<boolean> {
    const cached = this.primaryCache.get(sessionID);
    if (cached !== undefined) return cached;
    const result = await client.session.get({ path: { id: sessionID } }).catch((err) => {
      const msg = "tgo: style-reinforcement isPrimary session.get failed";
      if (this.log) this.log("warn", msg, { sessionID, error: String(err) });
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
    const result = analyzeStyleDrift({ attemptID: state.attemptID, register: this.register, outputClass, mode, enabled: true, reinforced: false, candidate, taskContext: context });
    if (!result.aggregate.reinforcementEligible) return false;
    state.pending = true;
    return true;
  }

  async appendPending(client: StyleSessionClient, sessionID: string, system: string[]): Promise<boolean> {
    const state = this.state(sessionID);
    if (!state.pending || state.reinforced || state.disabled || !this.enabled || !(await this.isPrimary(client, sessionID))) return false;
    system.push(STYLE_NUDGE);
    state.pending = false;
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
