export type WatchdogStatusType = "idle" | "busy" | "retry";

export interface WatchdogConfig {
  enabled: boolean;
  wallClockMs: number;
  idleMs: number;
  checkMs: number;
  stuckLoopTools: number;
  stuckLoopMs: number;
}

export interface WatchdogAbortSignal {
  sessionID: string;
  parentID: string | undefined;
  reason: "wall-clock" | "idle" | "stuck-loop";
  elapsedMs: number;
}

export interface WatchdogDeps {
  log: (level: "info" | "warn" | "error", message: string, extra?: Record<string, unknown>) => void;
  abort: (sessionID: string, reason: "wall-clock" | "idle" | "stuck-loop") => Promise<void>;
  notifyParent: (parentID: string, text: string) => Promise<void>;
  // Injectable clocks for testing. Defaults read the real wall/uptime clocks.
  wallNow?: () => number;
  uptimeNow?: () => number;
}

interface TrackedSession {
  sessionID: string;
  parentID: string | undefined;
  busy: boolean;
  busySince: number;
  lastActivity: number;
  aborted: boolean;
  notified: boolean;
  // Number of tool calls currently executing in this session. A long-running
  // bash command (or any tool) that produces no message/activity events while
  // it runs would otherwise trip the idle cap even though the session is
  // clearly alive. While toolInFlight > 0 the idle clock is paused (wall-clock
  // still applies, so a truly hung command is still caught).
  toolInFlight: number;
  // Number of background-intent tools currently executing (args.background ===
  // true). A background process is explicitly meant to run long (dev server,
  // watcher) — it must not count against wall-clock, and it must not pause
  // idle (a session parked on a background process with no other activity is a
  // genuine stall and should idle-abort, not wall-clock-abort).
  backgroundInFlight: number;
  // Wall time of the last completed FOREGROUND tool call, used as the wall-clock
  // baseline. A completed tool is unambiguous forward progress, so a long but
  // productive session (test-9: 196 tools / 81k output before the 20m cap
  // fired) must not be wall-clocked while work is actually landing. Wall-clock
  // then measures time since the last completed tool, which still catches a
  // hung command (in-flight, no completion) and a text-only stall (no tools at
  // all). Background tools don't reset it — they're meant to run long and are
  // separately wall-clock-exempt while the session stays active.
  lastProgress: number;
  // Wall time the oldest in-flight tool started, for diagnostics.
  toolStartedAt: number;
  // Rolling FIFO window of the last stuckLoopTools tool signatures. A tight
  // loop without edits previously used nonProgressCount since last edit, but
  // read-only seats never edit so any review session died at 20 tools + 5min.
  // The window tracks distinct signatures — true loops reuse 1-2 signatures,
  // healthy broad reading uses many.
  stuckWindow: string[];
  stuckWindowTimes: number[];
}

export const WATCHDOG_ABORT_REASON_STUCK_LOOP = "stuck-loop";
export const WATCHDOG_ABORT_MARKER = "## WATCHDOG-ABORT";

// The host slept during a tick gap when the monotonic (sleep-excluded) uptime
// advanced by far less than the wall-clock gap. Date.now() and busySince/
// lastActivity all advance during sleep, so an overnight laptop sleep would
// otherwise make every delegated session read as idle for hours and get
// aborted on wake (test-7 live finding tgo-hcm). We track the wall↔uptime
// delta each read and shift both clocks back by the sleep window so the
// guards measure awake-time only.

function defaultWallNow(): number {
  return Date.now();
}

function defaultUptimeNow(): number {
  // process.uptime() is a monotonic clock that does NOT advance during system
  // sleep (kernel ticks are suspended); Date.now() is wall clock that DOES.
  return Math.round(process.uptime() * 1000);
}

function hashString(s: string): string {
  // FNV-1a 32-bit — no deps, fast, hash full signature for distinctness
  let hash = 2166136261;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function toolSignature(tool: string, input: unknown): string {
  const t = (tool ?? "").trim();
  let primary = "";
  if (input != null) {
    if (typeof input === "string") {
      primary = input;
    } else if (typeof input === "object") {
      const obj = input as Record<string, unknown>;
      const lower = t.toLowerCase();
      const isGrep = lower.includes("grep");
      const isRead = lower.includes("read") || lower === "read";
      const isGlob = lower.includes("glob");
      const isList = lower.includes("list");
      const isBash = lower.includes("bash");
      if (isGrep) {
        const pattern = (obj.pattern as string | undefined) ?? (obj.query as string | undefined);
        const pathVal = (obj.path as string | undefined) ?? (obj.filePath as string | undefined) ?? (obj.target as string | undefined);
        const patStr = pattern != null ? String(pattern).trim() : "";
        const pathStr = pathVal != null ? String(pathVal).trim() : "";
        if (patStr && pathStr) primary = `${patStr}:${pathStr}`;
        else if (patStr) primary = patStr;
        else if (pathStr) primary = pathStr;
        else {
          try {
            primary = JSON.stringify(input);
          } catch {
            primary = String(input);
          }
        }
      } else if (isRead || isGlob || isList) {
        const pathVal = (obj.path as string | undefined) ?? (obj.filePath as string | undefined) ?? (obj.target as string | undefined);
        if (pathVal != null && String(pathVal).trim().length > 0) {
          primary = String(pathVal);
        } else {
          try {
            primary = JSON.stringify(input);
          } catch {
            primary = String(input);
          }
        }
      } else if (isBash) {
        const candidate =
          (obj.command as string | undefined) ??
          (obj.cmd as string | undefined) ??
          (typeof obj.input === "string" ? (obj.input as string) : undefined);
        if (candidate != null && String(candidate).trim().length > 0) {
          primary = String(candidate);
        } else {
          try {
            primary = JSON.stringify(input);
          } catch {
            primary = String(input);
          }
        }
      } else {
        try {
          primary = JSON.stringify(input);
        } catch {
          primary = String(input);
        }
      }
    } else {
      primary = String(input);
    }
  }
  const norm = primary.trim();
  if (norm) {
    const hash = hashString(norm);
    const prefix = norm.slice(0, 48);
    return `${t || "unknown"}:${prefix}:${hash}`;
  }
  return t || "unknown";
}

// Wall-clock and idle guards for delegated (subagent) sessions. opencode's task
// tool blocks until a subagent session ends — a session that goes silent (the
// finish:length / finish:unknown empty-handoff mode) or hangs just burns until
// the model self-terminates. This controller tracks subagent sessions from
// session.status busy/idle events, aborts a session that exceeds a wall-clock
// cap OR sits busy with no activity past an idle cap, and injects a marker into
// the parent session so the orchestrator re-dispatches instead of trusting the
// empty result. Mirrors the state of the art (SWE-agent total_execution_timeout
// + max_consecutive, LangGraph idle_timeout, Codex stream_idle_timeout_ms).
// Sleep-aware: wall↔uptime drift from host sleep is excluded from both clocks
// so a laptop sleeping overnight does not falsely abort active delegates.
export class WatchdogController {
  private readonly sessions = new Map<string, TrackedSession>();
  private readonly timer: ReturnType<typeof setInterval> | undefined;
  private readonly config: WatchdogConfig;
  private readonly deps: WatchdogDeps;
  // Sleep-drift bookkeeping: accumulated wall-clock time that must be
  // subtracted from Date.now()-based clocks to yield awake-only elapsed time.
  private sleepOffsetMs = 0;
  private readonly wallNow: () => number;
  private readonly uptimeNow: () => number;
  private lastWallMs: number;
  private lastUptimeMs: number;

  constructor(config: WatchdogConfig, deps: WatchdogDeps) {
    this.config = config;
    this.deps = deps;
    this.wallNow = deps.wallNow ?? defaultWallNow;
    this.uptimeNow = deps.uptimeNow ?? defaultUptimeNow;
    this.lastWallMs = this.wallNow();
    this.lastUptimeMs = this.uptimeNow();
    if (config.enabled) {
      this.timer = setInterval(() => {
        void this.check();
      }, config.checkMs);
    }
  }

  // A delegation is any session with a parent (created by the task tool).
  noteSessionCreated(info: { id?: string; parentID?: string | null }): void {
    if (!info.id || !info.parentID) return;
    if (this.sessions.has(info.id)) return;
    const now = this.awakeNow();
    this.sessions.set(info.id, {
      sessionID: info.id,
      parentID: info.parentID,
      busy: false,
      busySince: 0,
      lastActivity: now,
      aborted: false,
      notified: false,
      toolInFlight: 0,
      toolStartedAt: 0,
      backgroundInFlight: 0,
      lastProgress: now,
      stuckWindow: [],
      stuckWindowTimes: [],
    });
  }

  noteStatus(sessionID: string, status: WatchdogStatusType): void {
    const tracked = this.sessions.get(sessionID);
    if (!tracked) return;
    const now = this.awakeNow();
    if (status === "busy" || status === "retry") {
      tracked.busy = true;
      tracked.lastActivity = now;
      if (tracked.busySince === 0) tracked.busySince = now;
    } else {
      tracked.busy = false;
      tracked.lastActivity = now;
    }
  }

  onIdle(sessionID: string): void {
    this.noteStatus(sessionID, "idle");
  }

  // Any tool/message activity on the session means it is alive — refresh the
  // idle clock. Tied to the chat.message and tool.execute.after hooks.
  noteActivity(sessionID: string): void {
    const tracked = this.sessions.get(sessionID);
    if (!tracked || tracked.aborted) return;
    tracked.lastActivity = this.awakeNow();
  }

  // A tool call is starting to execute (tool.execute.before). Bump the
  // in-flight counter and refresh activity; while a foreground tool is running
  // the idle clock is paused so long-running bash doesn't false-trip the idle
  // cap. Background-intent tools (args.background === true) are tracked
  // separately: they neither pause idle nor count against wall-clock.
  noteToolStart(sessionID: string, background: boolean | string = false, tool?: string, input?: unknown): void {
    const tracked = this.sessions.get(sessionID);
    if (!tracked || tracked.aborted) return;
    // Flexible overload: background may be a tool name string for backwards-compat
    // or direct signature calls.
    let bg = false;
    let toolName: string | undefined = tool;
    let toolInput: unknown = input;
    if (typeof background === "string") {
      toolName = background;
      toolInput = tool;
      bg = false;
    } else {
      bg = background;
    }
    if (bg) {
      tracked.backgroundInFlight += 1;
    } else {
      tracked.toolInFlight += 1;
      if (tracked.toolInFlight === 1) tracked.toolStartedAt = this.awakeNow();
      const now = this.awakeNow();
      const lower = (toolName ?? "").toLowerCase();
      const isEditTool = lower === "edit" || lower === "write" || lower === "multiedit";
      if (isEditTool) {
        tracked.stuckWindow = [];
        tracked.stuckWindowTimes = [];
        tracked.lastProgress = now;
      } else {
        // Push signature onto rolling FIFO window for stuck-loop detection.
        const sig = toolSignature(toolName ?? "unknown", toolInput);
        tracked.stuckWindow.push(sig);
        tracked.stuckWindowTimes.push(now);
        // Keep window bounded to stuckLoopTools size.
        const max = this.config.stuckLoopTools;
        while (tracked.stuckWindow.length > max) {
          tracked.stuckWindow.shift();
          tracked.stuckWindowTimes.shift();
        }
      }
    }
    tracked.lastActivity = this.awakeNow();
  }

  // A tool call finished (tool.execute.after). Decrement the in-flight counter.
  // A completed FOREGROUND tool is forward progress: record it as the wall-clock
  // baseline so a long-but-productive session isn't killed by a fixed budget
  // (test-9). Background completions don't move the baseline.
  // isProgress is retained for call-site compatibility but no longer drives the
  // stuck-loop detector — the distinct-signature window is capability-agnostic.
  // Edit-tool calls (edit/write/multiedit, case-insensitive) are unambiguous
  // progress: clear the rolling window and update lastProgress.
  noteToolEnd(sessionID: string, background = false, _isProgress = false): void {
    const tracked = this.sessions.get(sessionID);
    if (!tracked || tracked.aborted) return;
    const now = this.awakeNow();
    if (background) {
      if (tracked.backgroundInFlight > 0) tracked.backgroundInFlight -= 1;
    } else if (tracked.toolInFlight > 0) {
      tracked.toolInFlight -= 1;
      if (tracked.toolInFlight === 0) tracked.toolStartedAt = 0;
      tracked.lastProgress = now;
      if (_isProgress) {
        tracked.stuckWindow = [];
        tracked.stuckWindowTimes = [];
      }
    } else if (_isProgress) {
      tracked.stuckWindow = [];
      tracked.stuckWindowTimes = [];
      tracked.lastProgress = now;
    }
    tracked.lastActivity = now;
  }

  onCompact(sessionID: string): void {
    this.sessions.delete(sessionID);
  }

  get size(): number {
    return this.sessions.size;
  }

  get tracked(): ReadonlyArray<{ sessionID: string; parentID: string | undefined; busy: boolean }> {
    return [...this.sessions.values()].map((s) => ({
      sessionID: s.sessionID,
      parentID: s.parentID,
      busy: s.busy,
    }));
  }

  // Awake-only wall clock: Date.now() minus accumulated host-sleep drift. All
  // session clocks (busySince, lastActivity) are stored in this frame. Ticks
  // the sleep offset on every read so hooks firing between checks stay in the
  // same frame as the next check.
  private awakeNow(): number {
    this.tickSleepOffset();
    return this.wallNow() - this.sleepOffsetMs;
  }

  // Update the sleep offset from the wall↔uptime drift observed since the last
  // read. If the host slept, uptime barely advanced while wall clock raced
  // ahead; the difference is the sleep window, which we exclude from both
  // delegate clocks so the guards measure awake-time only.
  private tickSleepOffset(): void {
    const wall = this.wallNow();
    const uptime = this.uptimeNow();
    const wallGap = wall - this.lastWallMs;
    const uptimeGap = uptime - this.lastUptimeMs;
    this.lastWallMs = wall;
    this.lastUptimeMs = uptime;
    if (wallGap <= 0) return;
    // Guard against clock weirdness: only treat a large wall gap with a small
    // uptime gap as sleep (a busy-but-awake host advances uptime normally).
    if (wallGap >= 5 * this.config.checkMs && uptimeGap < wallGap / 2) {
      const sleepMs = wallGap - uptimeGap;
      this.sleepOffsetMs += sleepMs;
      this.deps.log("warn", `watchdog detected host sleep (${Math.round(sleepMs / 1000)}s); excluded from delegate clocks`, {
        sleepMs,
        wallGap,
        uptimeGap,
      });
    }
  }

  async check(): Promise<void> {
    const now = this.awakeNow();
    for (const tracked of this.sessions.values()) {
      if (tracked.aborted) continue;
      if (!tracked.busy) continue;
      const now = this.awakeNow();
      // Wall-clock measures from the later of session start and the last
      // completed foreground tool. A session that keeps completing tools is
      // making forward progress — the 20m cap must not be a fixed budget from
      // session start or it kills productive long sessions (test-9). It still
      // bites for: a hung command (in flight, no completion → baseline is old),
      // a text-only stall (no tools at all → baseline is busySince), and a
      // session whose last real work was long ago.
      const wallBaseline = Math.max(tracked.busySince, tracked.lastProgress);
      const wallElapsed = now - wallBaseline;
      // Idle is paused only by FOREGROUND tools (a long-running bash command
      // etc.) — the session is demonstrably alive. A background-intent process
      // (dev server, watcher) is meant to run long and does not represent
      // session activity, so it neither pauses idle nor counts against
      // wall-clock. A silent session parked on a background process still
      // idle-aborts (genuine stall); an active session parked on one survives
      // past the wall-clock cap (the test-8 false abort).
      const wallClockExempt = tracked.backgroundInFlight > 0 && tracked.toolInFlight === 0;
      const idleElapsed = tracked.toolInFlight > 0 ? 0 : now - tracked.lastActivity;
      const windowSize = tracked.stuckWindow.length;
      const distinct = new Set(tracked.stuckWindow).size;
      const windowElapsed =
        windowSize > 0 && tracked.stuckWindowTimes.length > 0 ? now - tracked.stuckWindowTimes[0]! : 0;
      const isStuckLoop =
        tracked.toolInFlight === 0 &&
        windowSize >= this.config.stuckLoopTools &&
        this.config.stuckLoopTools > 0 &&
        distinct < 3 &&
        windowElapsed >= this.config.stuckLoopMs;
      if (isStuckLoop) {
        await this.abort(tracked, "stuck-loop", windowElapsed);
      } else if (!wallClockExempt && wallElapsed >= this.config.wallClockMs) {
        await this.abort(tracked, "wall-clock", wallElapsed);
      } else if (idleElapsed >= this.config.idleMs) {
        await this.abort(tracked, "idle", idleElapsed);
      }
    }
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async abort(tracked: TrackedSession, reason: "wall-clock" | "idle" | "stuck-loop", elapsedMs: number): Promise<void> {
    tracked.aborted = true;
    tracked.busy = false;
    const signal: WatchdogAbortSignal = {
      sessionID: tracked.sessionID,
      parentID: tracked.parentID,
      reason,
      elapsedMs,
    };
    this.deps.log("warn", `watchdog aborting delegated session ${tracked.sessionID}`, {
      reason,
      elapsedMs,
      parentID: tracked.parentID ?? null,
    });
    try {
      await this.deps.abort(tracked.sessionID, reason);
    } catch (error) {
      this.deps.log("error", `watchdog abort call failed for ${tracked.sessionID}`, {
        error: String(error),
      });
    }
    if (tracked.parentID && !tracked.notified) {
      tracked.notified = true;
      const detail =
        reason === "stuck-loop"
          ? `was stuck in a loop (${tracked.stuckWindow.length} tools, ${Math.round(elapsedMs / 1000)}s window, ${new Set(tracked.stuckWindow).size} distinct signatures)`
          : reason === "idle"
            ? `stopped producing output (idle ${Math.round(elapsedMs / 1000)}s)`
            : `exceeded the wall-clock cap (wall ${Math.round(elapsedMs / 1000)}s)`;
      try {
        await this.deps.notifyParent(
          tracked.parentID,
          `${WATCHDOG_ABORT_MARKER}\nDelegated session ${tracked.sessionID} was aborted by the TGO watchdog (${reason}, ${Math.round(elapsedMs / 1000)}s). It ${detail}. Verify what landed, then re-dispatch it smaller or re-decompose per the lane-card — do not trust the empty result.`,
        );
      } catch (error) {
        this.deps.log("error", `watchdog parent notify failed for ${tracked.sessionID}`, {
          error: String(error),
        });
      }
    }
    this.sessions.delete(tracked.sessionID);
  }
}
