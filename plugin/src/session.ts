import { createShim, type BoardShim } from "./board";

export type SessionStatusType = "idle" | "busy" | "retry";

export interface SessionReconcilerOptions {
  shim?: BoardShim;
}

export class SessionReconciler {
  private readonly shim: BoardShim;
  private readonly busy = new Set<string>();

  constructor(opts: SessionReconcilerOptions = {}) {
    this.shim = opts.shim ?? createShim();
  }

  get shimState(): BoardShim {
    return this.shim;
  }

  noteAgent(sessionID: string, agent: string): void {
    this.shim.agents.set(sessionID, agent);
  }

  onStatus(sessionID: string, status: SessionStatusType): void {
    if (status === "busy" || status === "retry") {
      this.busy.add(sessionID);
      this.markStreaming(sessionID);
    } else {
      this.busy.delete(sessionID);
      this.shim.streaming.delete(sessionID);
    }
  }

  onIdle(sessionID: string): void {
    this.busy.delete(sessionID);
    this.shim.streaming.delete(sessionID);
  }

  onCompact(sessionID: string): void {
    this.shim.agents.delete(sessionID);
    this.busy.delete(sessionID);
    this.shim.streaming.delete(sessionID);
  }

  isBusy(sessionID: string): boolean {
    return this.busy.has(sessionID);
  }

  private markStreaming(sessionID: string): void {
    const target = this.shim.agents.get(sessionID) ?? "subagent";
    const existing = this.shim.streaming.get(sessionID);
    this.shim.streaming.set(sessionID, {
      target,
      startedAt: existing?.startedAt ?? Date.now(),
    });
  }
}

/**
 * Primary sessions are exactly the top-level ones: opencode marks them by a
 * `parentID` that is present but null, while subagents carry a parent id. The
 * own-property check keeps inherited fakes (e.g. `Object.create({parentID:
 * null})`) from passing as primary.
 */
export function isPrimarySessionData(data: unknown): boolean {
  return Boolean(
    data &&
      typeof data === "object" &&
      Object.prototype.hasOwnProperty.call(data, "parentID") &&
      (data as { parentID?: unknown }).parentID === null
  );
}
