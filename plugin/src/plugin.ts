import { tool, type Plugin, type PluginInput } from "@opencode-ai/plugin";
import { loadTgoConfig, resolveAgentsDir, validateAgentDir, BD_ENV, safeWarn, type TgoConfig } from "./config";
import { BoardController, type BoardMessage } from "./board";
import { ConcisionController } from "./concision";
import { StyleReinforcementController } from "./style-reinforcement";
import { isPrimarySessionData, SessionReconciler } from "./session";
import { TaskFitController, classifyRouting } from "./fit";
import { WatchdogController } from "./watchdog";
import { parseTaskReport } from "./report";
import { SetupController } from "./setup";
import { preapproveExternalDirectory, resolveWorktreeFamily } from "./permissions";
import { DEPENDENCIES, installMissing, runShellCommand } from "./deps";
import { applyPreset, readPresetNudge, resolveActivePreset } from "./presets";
import { validateDelegationBoundary, validateDelegationPacket, verifyClaimObserved as verifyDelegationClaimObserved } from "./delegation";
import { captureDelegationSession, probeSessionReuseCapability, persistAbortHandback, loadSessionMap } from "./session-reuse";
import { ensureDefSnapshot, isValidBeadID, assertValidBeadID } from "./def-snapshot";
import { authorizeLifecycleSession, evaluateClosure, verifyClaimObserved } from "./lifecycle";
import { shouldRunGate, applyGateToClosure, evaluateGatedClosure, gateBlockedWithError } from "./lifecycle";
import { runExitGate } from "./exitgate/gate";
import { loadBeadsTui, renderBeadsTui } from "./tui";
import { checkVersionDrift, fetchLatestVersion, PLUGIN_NPM_NAME, readLocalVersion } from "./version";
import { parseCompletionSignal, terminationDecision, type CompletionSignal } from "./termination";
import { selfUpdate } from "./self-update";
import { reconcileSeats } from "./seat-sync";
// Suspend gate — durable wait-for-user with typed schemas, prose resume, timer catch-up
import {
  suspend as suspendWait,
  tryProseResume,
  listAllAwaits,
  scanExpiredAwaits,
  readAwaitJson,
  parseProseReply,
  getRequiredFields,
  validateAgainstSchema,
  clearAwaitJson,
  formatSuspendBadge,
  isExpired,
} from "./suspend";
import { appendRunEvent, hashArgs, pruneRuns, scanRunsForProblems } from "./runs";
import { computeMetrics, writeMetrics, readMetrics } from "./metrics";
// tgo-dw5: manifest + hooks — additive, clearly-named (crowded hook path)
import { planManifest, MANIFEST_REL_PATH, ManifestScopeConflictError } from "./manifest";
import { manifestOnDispatch, manifestOnComplete, manifestMessageFilter } from "./manifest-hooks";
// No runtime function re-exports here: opencode's legacy plugin loader calls
// EVERY exported function as a plugin factory (input, options), so an entry
// re-export like evaluateClosure gets invoked as one and throws inside the
// host loader ("failed to load plugin", tgo-6tq). Internal helpers stay in
// their own modules; only type re-exports are safe on the entry.
export type { DelegationPacket, DelegationValidation } from "./delegation";
export type { ClosureGate, LifecycleMetadata } from "./lifecycle";
import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";

export const TgoPlugin: Plugin = async (
  { client, $, project, directory, worktree }: PluginInput,
  options
) => {
  const config: TgoConfig = await loadTgoConfig(
    options as Record<string, unknown>
  );

  // Plugin diagnostics MUST go through client.app.log, never console.log:
  // console output from the server worker lands in the TUI's stdout stream
  // (it showed up as a stray "auto-populated" message in the input box on
  // opencode 1.18.15). app.log routes to the structured log instead.
  const appLog = (level: "info" | "warn" | "error", message: string, extra?: Record<string, unknown>) => {
    client.app.log({ body: { service: "tgo", level, message, extra } }).catch(() => {});
  };

  // version source unavailable in plugin SDK; assumes v1 task tool (TGO pins opencode 1.18.23) — sessionReuse.enabled is the escape hatch
  const reuseCapability = probeSessionReuseCapability(undefined);
  if (!reuseCapability.supported) {
    appLog("warn", `session reuse disabled: ${reuseCapability.reason}`);
  }

  if (config.checkVersion !== false) {
    void checkVersionDrift()
      .then((drift) => {
        if (drift?.drift) {
          appLog(
            "warn",
            `TGO update available: installed ${drift.local} < npm ${drift.latest} — self-update will refresh cache on restart; if slot stuck: rm -rf ~/.cache/opencode/packages/trans-genderian-orchestra* and restart (opencode plugin --force is a no-op against exact-pinned slots tgo-6m6)`,
            { local: drift.local, latest: drift.latest }
          );
        }
      })
      .catch((err) => {
        appLog("warn", "tgo: version drift check failed", { error: String(err) });
      });
  }

  if (config.selfUpdate?.enabled !== false) {
    void (async () => {
      try {
        const runningVersion = (await readLocalVersion()) ?? "0.0.0";
        await selfUpdate({
          runningVersion,
          pkgName: PLUGIN_NPM_NAME,
          fetchLatest: () => fetchLatestVersion().then((v) => v ?? undefined),
          spawn: async (args: string[]) => {
            try {
              const proc = Bun.spawn(args, {
                stdout: "pipe",
                stderr: "pipe",
                env: BD_ENV as unknown as Record<string, string>,
              });
              const [stdout, stderr, exitCode] = await Promise.all([
                new Response(proc.stdout).text(),
                new Response(proc.stderr).text(),
                proc.exited,
              ]);
              return { exitCode, stdout, stderr };
            } catch (error) {
              return { exitCode: 1, stdout: "", stderr: String(error) };
            }
          },
          log: (level, msg) => appLog(level, msg),
        });
      } catch (err) {
        appLog("warn", "tgo: self-update failed", { error: String(err) });
      }
    })().catch((err) => {
      appLog("warn", "tgo: self-update failed", { error: String(err) });
    });
  }

  const seatDir = resolveAgentsDir({ agentDir: config.agentDir });
  // seat frontmatter reconciliation: self-update swaps code slot but never revisits installed agents — repair drift at load (always on)
  void (async () => {
    try {
      const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
      const assetsAgentsDir = path.join(packageRoot, "assets", "agents");
      const summary = await reconcileSeats(assetsAgentsDir, seatDir, appLog, config.register);
      if (summary.length > 0) {
        let version = "unknown";
        try {
          version = (await readLocalVersion()) ?? "unknown";
        } catch {}
        appLog("warn", `tgo: seat frontmatter refreshed to match ${version}: ${summary.join(", ")}`);
      }
    } catch (err) {
      safeWarn(appLog, "tgo: seat sync failed", { error: String(err) });
    }
  })().catch((err) => {
    safeWarn(appLog, "tgo: seat sync failed", { error: String(err) });
  });
  // Load-time budget re-check. Warn, never throw: a throwing factory makes
  // opencode silently drop the entire plugin (verified headless, 1.18.13), so
  // an oversized hand-edited seat must not take TGO down. install/validate
  // paths still enforce the budget strictly.
  try {
    const checked = await validateAgentDir(seatDir, appLog);
    if (checked > 0) {
      appLog("info", `validated ${checked} seat prompt(s) under budget (${seatDir})`);
    }
  } catch (error) {
    appLog("warn", `load-time seat-prompt check skipped: ${String(error)}`);
  }

  const runBd = async (command: string): Promise<string> => {
    try {
      const args = command.split(/\s+/);
      return await $`${args}`.env(BD_ENV).nothrow().text();
    } catch {
      return "";
    }
  };

  const board = new BoardController({
    run: runBd,
    refreshMs: config.board?.refreshMs ?? 5000,
    sessionReuse: {
      repoRoot: directory ?? worktree ?? (project as unknown as { worktree?: string })?.worktree ?? ".",
      client,
      maxContextTokens: config.sessionReuse?.maxContextTokens ?? 100000,
      supported: reuseCapability.supported,
      enabled: config.sessionReuse?.enabled !== false,
    },
    log: appLog,
  });

  const reconciler = new SessionReconciler({ shim: board.shimState });

  const concision = new ConcisionController({
    enabled: config.concision?.enabled,
    register: config.register,
    log: appLog,
  });
  const styleReinforcement = new StyleReinforcementController({
    enabled: config.concision?.enabled,
    productionEnabled: config.concision?.reinforcement,
    register: config.register,
    log: appLog,
  });

  const fit = new TaskFitController();

  // F1/F3 maps before watchdog so its abort handler can capture them (avoid TDZ)
  const runToolStarts = new Map<string, number>();
  const sessionToRunId = new Map<string, string>();
  const heartbeatIntervals = new Map<string, ReturnType<typeof setInterval>>();
  function sanitizeCmdForRun(cmd: string): string { return cmd.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").slice(0, 500); }
  function extractCmd(tool: string, args: unknown): string | undefined {
    if (!args || typeof args !== "object") return undefined;
    const obj = args as Record<string, unknown>;
    const lower = tool.toLowerCase();
    if (lower.includes("bash")) {
      const c = (obj.command as string) ?? (obj.cmd as string) ?? (obj.input as string);
      if (typeof c === "string" && c.trim()) return sanitizeCmdForRun(c);
    }
    if (lower === "edit" || lower === "write" || lower === "multiedit") {
      const p = (obj.filePath as string) ?? (obj.path as string) ?? (obj.target as string);
      if (typeof p === "string" && p.trim()) return sanitizeCmdForRun(p);
    }
    return undefined;
  }
  function startHeartbeat(repoRoot: string, runId: string, seat: string): void {
    if (heartbeatIntervals.has(runId)) return;
    const interval = setInterval(() => {
      void (async () => {
        try {
          await appendRunEvent(repoRoot, runId, {
            ts: Date.now(),
            type: "heartbeat",
            seat,
            tool: "heartbeat",
            argsHash: hashArgs({}),
            ok: true,
            issueId: runId,
            note: "heartbeat",
          });
        } catch {}
      })();
    }, 30_000);
    if ((interval as any).unref) (interval as any).unref();
    heartbeatIntervals.set(runId, interval);
  }
  function stopHeartbeat(runId: string): void {
    const iv = heartbeatIntervals.get(runId);
    if (iv) {
      clearInterval(iv as any);
      heartbeatIntervals.delete(runId);
    }
  }

  // Watchdog: abort delegated subagent sessions that exceed a wall-clock cap or
  // go silent past an idle cap, then inject a marker into the parent so the
  // orchestrator re-dispatches instead of trusting an empty result.
  const watchdog = new WatchdogController(config.watchdog, {
    log: appLog,
    abort: async (sessionID, reason) => {
      // F2 ensure abort writes terminal status:aborted BEFORE deletion so scanner surfaces it
      try {
        const runId = sessionToRunId.get(sessionID);
        if (runId) {
          const seat = board.shimState.agents.get(sessionID) ?? "dylan";
          const repoRoot2 = directory ?? worktree ?? (project as unknown as { worktree?: string })?.worktree ?? ".";
          await appendRunEvent(repoRoot2, runId, {
            ts: Date.now(),
            type: "status",
            seat,
            tool: "task",
            argsHash: hashArgs({ reason }),
            ok: false,
            issueId: runId,
            note: "aborted",
          });
          try { stopHeartbeat(runId); } catch {}
        }
      } catch {}
      await client.session.abort({ path: { id: sessionID } });
      try {
        const repoRoot = directory ?? worktree ?? (project as unknown as { worktree?: string })?.worktree ?? ".";
        await persistAbortHandback({
          repoRoot,
          sessionID,
          reason,
          log: appLog,
          fetchSessionMessages: async (id) => {
            const raw = (await client.session.messages({ path: { id } } as unknown as { path: { id: string } })) as unknown as
              | Array<{ info: unknown; parts: Array<{ type: string; text?: string }> }>
              | { data?: Array<{ info: unknown; parts: Array<{ type: string; text?: string }> }> };
            const arr = Array.isArray(raw) ? raw : Array.isArray((raw as { data?: unknown })?.data) ? (raw as { data: Array<{ info: unknown; parts: Array<{ type: string; text?: string }> }> }).data : undefined;
            if (!arr) return undefined;
            return arr.map((m) => ({ role: (m as { info?: { role?: string } })?.info?.role, parts: Array.isArray((m as { parts?: unknown })?.parts) ? (m as { parts: Array<{ type: string; text?: string }> }).parts : [] }));
          },
        });
      } catch (e) {
        appLog("warn", `progress handback failed: ${String(e)}`);
      }
    },
    notifyParent: async (parentID, text) => {
      await client.session.prompt({
        path: { id: parentID },
        body: {
          parts: [{ type: "text", text, synthetic: true }],
        },
      });
    },
  });

  // tgo-2ry: wire watchdog → board gauge and run recovery scan on load (additive)
  try {
    board.setWatchdogGetter(() => watchdog.tracked as any);
    board.setWatchdogProblemsGetter(() => (watchdog as any).getProblems?.() ?? []);
    board.setRunsConfig({
      maxAgeMs: (config as any).runs?.maxAgeMs,
      maxBytes: (config as any).runs?.maxBytes,
      maxFiles: (config as any).runs?.maxFiles,
      heartbeatThresholdMs: (config as any).runs?.heartbeatThresholdMs,
    });
  } catch {}
  void (async () => {
    const repoRoot = directory ?? worktree ?? (project as unknown as { worktree?: string })?.worktree ?? ".";
    try {
      await pruneRuns(repoRoot, {
        maxAgeMs: (config as any).runs?.maxAgeMs,
        maxBytes: (config as any).runs?.maxBytes,
        maxFiles: (config as any).runs?.maxFiles,
        heartbeatThresholdMs: (config as any).runs?.heartbeatThresholdMs,
        log: appLog,
      });
    } catch {}
    try {
      const flags = await scanRunsForProblems(repoRoot, {
        heartbeatThresholdMs: (config as any).runs?.heartbeatThresholdMs,
        log: appLog,
      });
      if (flags.length > 0) {
        const { problemsFromRecovery } = await import("./metrics");
        const problems = problemsFromRecovery(flags as any);
        try { board.setProblems(problems as any); } catch {}
        appLog("warn", `tgo: recovery scan flagged ${flags.length} runs`, { flags: flags as any });
      }
    } catch (e) {
      safeWarn(appLog, `recovery scan failed: ${String(e)}`);
    }
  })();

  const delegatedSessionIds = new Set<string>();
  const completionSignals = new Map<string, { signal: CompletionSignal; text: string; exitGateRequired: boolean }>();
  const terminationParentIds = new Map<string, string | undefined>();

  // Suspend gate hydration + timer catch-up on plugin load (no daemon, best-effort catch-up)
  // Documented limit: WAIT timers fire on next launch, not mid-sleep (F3).
  // F3: single-flight guard — hydration must complete before watchdog first check; expired awaits transition to expired state.
  watchdog.setHydrationPending(true);
  try {
    const repoRoot = directory ?? worktree ?? (project as unknown as { worktree?: string })?.worktree ?? ".";
    let all: Array<import("./suspend").AwaitRecord> = [];
    try {
      all = await listAllAwaits(repoRoot);
      const sessionIds: string[] = [];
      for (const rec of all) {
        if (rec.sessionId) sessionIds.push(rec.sessionId);
        else {
          try {
            const map = await loadSessionMap(repoRoot);
            const sid = map[rec.issueId]?.sessionId;
            if (sid) sessionIds.push(sid);
          } catch {}
        }
      }
      if (sessionIds.length > 0) watchdog.hydrateSuspended(sessionIds);
    } catch (e) {
      safeWarn(appLog, `suspend hydration failed: ${String(e)}`);
    }
    // F3: expired transition — scan for expired until, remove from suspended set but keep await.json for board expired flag
    try {
      const expired = await scanExpiredAwaits(repoRoot, appLog);
      for (const rec of expired) {
        // Transition to expired state: no longer considered suspended for watchdog, but board still shows expired badge
        if (rec.sessionId) watchdog.markResumed(rec.sessionId);
        try {
          const map = await loadSessionMap(repoRoot);
          const sid = map[rec.issueId]?.sessionId;
          if (sid) watchdog.markResumed(sid);
        } catch {}
        // Keep await.json with expired flag — board will render "(timer expired ...)"; do not delete file
        appLog("warn", `tgo: expired await ${rec.issueId} transitioned to expired state (removed from suspended set, kept for board)`, {
          issueId: rec.issueId,
          until: rec.until,
        });
      }
    } catch (e) {
      safeWarn(appLog, `timer catch-up failed: ${String(e)}`);
    }
  } finally {
    watchdog.markHydrationDone();
  }

  const setup = new SetupController({
    run: async (command, cwd) => {
      try {
        const args = command.split(/\s+/);
        const proc = cwd ? $`${args}`.cwd(cwd) : $`${args}`;
        const completed = await proc.env({ ...process.env, BD_NON_INTERACTIVE: "1", HOME: os.homedir() }).nothrow();
        return {
          exitCode: completed.exitCode,
          stdout: completed.stdout.toString(),
          stderr: completed.stderr.toString(),
        };
      } catch (error) {
        return { exitCode: 1, stdout: "", stderr: String(error) };
      }
    },
    hasBd: async () => (Bun.which("bd") ?? null) !== null,
    installBd:
      config.setup?.autoInstallBeads === false
        ? undefined
        : async () => {
            const beads = DEPENDENCIES.find((d) => d.name === "beads");
            if (!beads) return;
            const statuses = [
              {
                name: beads.name,
                kind: beads.kind,
                summary: beads.summary,
                present: false,
                install: beads.install,
                url: beads.url,
              },
            ];
            await installMissing(statuses, async (cmd) => {
              await runShellCommand(cmd);
            });
          },
  });

  const debugEvents = process.env.TGO_DEBUG_EVENTS === "1";
  const logEvent = (type: string, id: string, extra?: Record<string, unknown>) => {
    if (!debugEvents) return;
    appLog("info", `event ${type} ${id}`, extra);
  };

  const handleSessionCreated = async (info: { directory?: string; parentID?: string | null }) => {
    if (config.setup?.enabled === false) return;
    if (info.parentID != null) return;
    const resolvedDirectory = info.directory ?? directory;
    if (!resolvedDirectory || resolvedDirectory === "/") return;
    try {
      const result = await setup.maybeSetup(resolvedDirectory);
      if (result.action === "completed") {
        appLog("info", `per-repo setup: ${result.steps.join(" → ")} (${resolvedDirectory})`);
      }
    } catch (error) {
      appLog("warn", `per-repo setup failed: ${String(error)}`);
    }
  };

  return {
    tool: {
      tgo_beads_snapshot: tool({
        description: "Render a read-only Beads work snapshot for the primary session.",
        args: {},
        async execute(_args, context) {
          if (config.board?.enabled === false) {
            return "Beads snapshot disabled by configuration.";
          }
          const session = await client.session.get({ path: { id: context.sessionID } });
          if (!isPrimarySessionData(session.data)) {
            return "Beads snapshot is available only from a primary session.";
          }
          return renderBeadsTui(await loadBeadsTui(runBd));
        },
      }),
      tgo_wait_for_user: tool({
        description: "Suspend current task awaiting human input — durable wait gate (file-based, survives restart). Provide resumeSchema describing expected reply shape.",
        args: {
          issueId: tool.schema.string(),
          reason: tool.schema.string(),
          suspendSchema: tool.schema.string(),
          suspendPayload: tool.schema.string(),
          resumeSchema: tool.schema.string(),
          until: tool.schema.string().optional(),
        },
        async execute(args, context) {
          const repoRoot = directory ?? worktree ?? (project as unknown as { worktree?: string })?.worktree ?? ".";
          const issueId = String((args as Record<string, unknown>).issueId ?? "").trim();
          const reason = String((args as Record<string, unknown>).reason ?? "awaiting human").trim();
          let suspendSchema: unknown;
          let suspendPayload: unknown;
          let resumeSchema: unknown;
          // F2: invalid JSON = typed rejection, no {} coercion
          const rawSuspendSchema = (args as Record<string, unknown>).suspendSchema;
          if (typeof rawSuspendSchema !== "string" || rawSuspendSchema.trim().length === 0) throw new Error("suspendSchema is required and must be a valid JSON string");
          try { suspendSchema = JSON.parse(rawSuspendSchema); } catch (e) { throw new Error(`invalid JSON for suspendSchema: ${String(e)}`); }
          const rawSuspendPayload = (args as Record<string, unknown>).suspendPayload;
          if (typeof rawSuspendPayload !== "string" || rawSuspendPayload.trim().length === 0) throw new Error("suspendPayload is required and must be a valid JSON string");
          try { suspendPayload = JSON.parse(rawSuspendPayload); } catch (e) { throw new Error(`invalid JSON for suspendPayload: ${String(e)}`); }
          const rawResumeSchema = (args as Record<string, unknown>).resumeSchema;
          if (typeof rawResumeSchema !== "string" || rawResumeSchema.trim().length === 0) throw new Error("resumeSchema is required and must be a valid JSON string");
          try { resumeSchema = JSON.parse(rawResumeSchema); } catch (e) { throw new Error(`invalid JSON for resumeSchema: ${String(e)}`); }
          if (!resumeSchema || typeof resumeSchema !== "object" || Array.isArray(resumeSchema)) throw new Error("resumeSchema must be a non-null object");
          const until = (args as Record<string, unknown>).until ? String((args as Record<string, unknown>).until) : undefined;
          assertValidBeadID(issueId);
          const result = await suspendWait({
            repoRoot,
            issueId,
            suspendSchema: suspendSchema as import("./suspend").JsonSchema,
            suspendPayload,
            resumeSchema: resumeSchema as import("./suspend").JsonSchema,
            reason,
            until,
            sessionId: context.sessionID,
          });
          if (result.written) {
            watchdog.markSuspended(context.sessionID);
            // also hydrate via sessions.json mapping for cross-session visibility
            try { board.invalidate(context.sessionID); } catch {}
            return `suspended ${issueId}: ⏸ awaiting human: ${reason} — reply with: ${getRequiredFields(resumeSchema as import("./suspend").JsonSchema).join(", ") || "response"}`;
          } else {
            return `already suspended ${issueId}`;
          }
        },
      }),
      // tgo-dw5: plan-time manifest — primary-seat only, validates + conflict-checks then atomically writes
      tgo_plan_manifest: tool({
        description: "Write .tgo/manifest.json at PLAN time — validates and pairwise checks same-parallelSet scope overlaps; typed error on conflict (refuse write). Primary-seat only.",
        args: {
          manifestJson: tool.schema.string(),
        },
        async execute(args, context) {
          const repoRoot = directory ?? worktree ?? (project as unknown as { worktree?: string })?.worktree ?? ".";
          // PERMISSIONS: primary-seat callable only (delegated seats read-only)
          const authorized = await authorizeLifecycleSession(client, context.sessionID);
          if (!authorized) {
            throw new Error("tgo_plan_manifest is primary-seat only — delegated seats are read-only for manifests");
          }
          const raw = String((args as Record<string, unknown>).manifestJson ?? "").trim();
          if (!raw) throw new Error("manifestJson is required and must be a valid JSON string");
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            throw new Error(`invalid JSON for manifestJson: ${String(e)}`);
          }
          try {
            const written = await planManifest(repoRoot, parsed as import("./manifest").Manifest);
            try { board.invalidate(context.sessionID); } catch {}
            return `manifest written: ${MANIFEST_REL_PATH} (${written.waves.length} waves)`;
          } catch (e) {
            if (e instanceof ManifestScopeConflictError) {
              // typed error surfaced to caller at plan time (refuse write)
              throw new Error(`MANIFEST_SCOPE_CONFLICT: ${e.message}`);
            }
            throw e;
          }
        },
      }),
    },
    event: async ({ event }) => {
      if (event.type === "message.part.updated") {
        // Streaming heartbeat: parts update continuously while a message is
        // being generated, so each update proves the session is alive even
        // though no chat.message/tool.execute events fire mid-stream.
        const part = event.properties.part as { sessionID?: string } | undefined;
        if (part?.sessionID) watchdog.noteActivity(part.sessionID);
      } else if (event.type === "session.compacted") {
        board.reset(event.properties.sessionID);
        reconciler.onCompact(event.properties.sessionID);
        concision.reset();
        // Reinforcement state remains in the live controller instance only.
        watchdog.onCompact(event.properties.sessionID);
        logEvent("session.compacted", event.properties.sessionID);
      } else if (event.type === "session.status") {
        reconciler.onStatus(
          event.properties.sessionID,
          event.properties.status.type
        );
        watchdog.noteStatus(
          event.properties.sessionID,
          event.properties.status.type
        );
        board.invalidate(event.properties.sessionID);
        logEvent("session.status", event.properties.sessionID, {
          status: event.properties.status.type,
        });
      } else if (event.type === "session.idle") {
        reconciler.onIdle(event.properties.sessionID);
        watchdog.onIdle(event.properties.sessionID);
        board.invalidate(event.properties.sessionID);
        logEvent("session.idle", event.properties.sessionID);
      } else if (event.type === "session.created") {
        const info = event.properties.info as {
          id?: string;
          parentID?: string | null;
        };
        logEvent("session.created", info.id ?? "?", {
          parentID: info.parentID ?? null,
        });
        watchdog.noteSessionCreated(info);
        // F1 seed child sessions at creation — resolve runId from parent's current mapping
        try {
          if (info.id && info.parentID) {
            const parentRunId = sessionToRunId.get(info.parentID);
            if (parentRunId) sessionToRunId.set(info.id, parentRunId);
          }
        } catch {}
        try {
          if (info.id && info.parentID && info.parentID !== "") delegatedSessionIds.add(info.id);
        } catch {}
        try {
          if (info.id) terminationParentIds.set(info.id, info.parentID ?? undefined);
        } catch {}
        void handleSessionCreated(event.properties.info);
      } else if (event.type === "session.deleted") {
        const deletedInfo = (event.properties as { info?: { id?: string }; sessionID?: string; id?: string })?.info;
        const deletedId = deletedInfo?.id ?? (event.properties as { sessionID?: string })?.sessionID ?? (event.properties as { id?: string })?.id;
        if (deletedId) {
          try { delegatedSessionIds.delete(deletedId); } catch {}
          try { completionSignals.delete(deletedId); } catch {}
          try { terminationParentIds.delete(deletedId); } catch {}
          // F3 cleanup mapping + heartbeat
          try {
            const runId = sessionToRunId.get(deletedId);
            sessionToRunId.delete(deletedId);
            if (runId) stopHeartbeat(runId);
          } catch {}
          // F3: suspended-state lifecycle — cleanup watchdog and orphaned await.json
          try {
            watchdog.markResumed(deletedId);
          } catch {}
          try {
            const repoRoot = directory ?? worktree ?? (project as unknown as { worktree?: string })?.worktree ?? ".";
            // Find issueId for this session and clear orphaned await if exists
            let issueId: string | undefined;
            try {
              const map = await loadSessionMap(repoRoot);
              issueId = Object.entries(map).find(([, v]) => v.sessionId === deletedId)?.[0];
            } catch {}
            if (!issueId) {
              try {
                const all = await listAllAwaits(repoRoot);
                const rec = all.find((r) => r.sessionId === deletedId);
                if (rec) issueId = rec.issueId;
              } catch {}
            }
            if (issueId) {
              try {
                const rec = await readAwaitJson(repoRoot, issueId);
                if (!rec) {
                  // no await to clear
                } else {
                  const existed = await clearAwaitJson(repoRoot, issueId, rec.createdAt);
                  if (existed) {
                    appLog("info", `tgo: cleared orphaned await for deleted session ${deletedId} / ${issueId}`, { sessionID: deletedId, issueId });
                    // Also remove blocker
                    try {
                      const { updateProgress } = await import("./progress");
                      const rec2 = { reason: "", resumeSchema: {} } as unknown as import("./suspend").AwaitRecord;
                      // Load original rec for accurate prefix if still available (best effort)
                      // For now, filter any suspend blocker
                      await updateProgress(repoRoot, issueId, (parts) => ({
                        ...parts,
                        blockers: parts.blockers.filter((b) => !b.startsWith("⏸ awaiting human:")) ,
                      }));
                    } catch {}
                    try { board.invalidate(deletedId); } catch {}
                  }
                }
              } catch (e) {
                safeWarn(appLog, `tgo: failed to clear orphaned await for ${deletedId}: ${String(e)}`);
              }
            }
          } catch (e) {
            safeWarn(appLog, `tgo: session.deleted suspend cleanup failed: ${String(e)}`);
          }
        }
        logEvent("session.deleted", deletedId ?? "?", {});
      }
    },

    config: async (input) => {
      const active = resolveActivePreset(config, await readPresetNudge(runBd, appLog));
      const applied = applyPreset(
        { agent: input.agent as Record<string, Record<string, unknown>> },
        active,
        config.presets
      );
      appLog(
        "info",
        `preset "${active}" applied to ${applied.length ? applied.join(", ") : "no seats"}`
      );

      // Pre-approve external_directory reads for the project's worktree family
      // (sibling worktrees under the same parent) so delegated sessions that
      // legitimately inspect adjacent worktrees don't surface interactive
      // permission prompts mid-orchestration (test-7 live finding tgo-5to).
      // In TUI runs the factory-time project.worktree can resolve to the GLOBAL
      // project ("/") because plugin state may init before the session's
      // project attaches — fall back to the plugin input's own directory/worktree
      // which stay reliable (test-9 finding). Compute the family from the first
      // non-root candidate.
      const worktreeRoot = resolveWorktreeFamily(
        project?.worktree,
        worktree,
        directory
      );
      const nextPermission = preapproveExternalDirectory(
        input.permission as Record<string, unknown> | undefined,
        worktreeRoot
      );
      if (nextPermission && Object.keys(nextPermission).length > 0) {
        (input as { permission?: unknown }).permission = nextPermission;
        const parent = worktreeRoot ? path.dirname(worktreeRoot) : undefined;
        appLog("info", `pre-approved external_directory for worktree family ${parent}/*`, {
          worktreeRoot,
          projectWorktree: project?.worktree ?? null,
          pluginWorktree: worktree ?? null,
          pluginDirectory: directory ?? null,
        });
      }
    },

    "chat.message": async (input, output) => {
      // --- Suspend gate: prose resume interception — F1 robust: validate ALL candidates, require exactly one valid, clear only after wake ---
      try {
        const repoRoot = directory ?? worktree ?? (project as unknown as { worktree?: string })?.worktree ?? ".";
        const rawText = output.parts
          .filter((p) => (p as { type?: string }).type === "text")
          .map((p) => (p as { text?: string }).text ?? "")
          .join("\n")
          .trim();
        if (rawText.length > 0) {
          // Gather candidates: session-specific if exists, else all suspended awaits for cross-session check
          let issueId: string | undefined;
          try {
            const map = await loadSessionMap(repoRoot);
            issueId = Object.entries(map).find(([, v]) => v.sessionId === input.sessionID)?.[0];
          } catch {}
          let candidateRecs: Array<import("./suspend").AwaitRecord> = [];
          if (issueId) {
            const rec = await readAwaitJson(repoRoot, issueId);
            if (rec) candidateRecs = [rec];
          }
          if (candidateRecs.length === 0) {
            try {
              const all = await listAllAwaits(repoRoot);
              const sessionMatched = all.filter((r) => r.sessionId === input.sessionID);
              if (sessionMatched.length > 0) candidateRecs = sessionMatched;
              else candidateRecs = all; // cross-session: consider all for exactly-one match
            } catch {}
          }
          // F1 pass-through + F3 skip expired: filter out expired candidates before validation
          const activeRecs = candidateRecs.filter((r) => !(r as unknown as { expired?: boolean }).expired && !isExpired(r));
          if (activeRecs.length === 0) {
            // No active candidates (all expired or none) → pass through, do not block
            appLog("info", `tgo: chat pass-through — no active await for ${input.sessionID} (all expired or none)`, { sessionID: input.sessionID });
          } else if (activeRecs.length > 0) {
            const parsed = parseProseReply(rawText);
            const valid: typeof activeRecs = [];
            const invalidDetails: string[] = [];
            for (const rec of activeRecs) {
              const v = validateAgainstSchema(parsed, rec.resumeSchema);
              if (v.valid) valid.push(rec);
              else {
                const required = getRequiredFields(rec.resumeSchema).join(", ") || "response";
                invalidDetails.push(`${rec.issueId}: ${v.errors.join("; ")} — reply with: ${required}`);
              }
            }
            if (valid.length === 0) {
              // F1 pass-through: zero valid → do NOT reject, just pass through and keep suspended
              appLog("info", `tgo: chat pass-through — no candidate matched for ${input.sessionID} — ${invalidDetails.join(" | ")}`, { sessionID: input.sessionID, candidates: activeRecs.map((r) => r.issueId) });
              // Do not throw — pass through untouched
            } else if (valid.length > 1) {
              // F1 pass-through: ambiguous → pass through, do not clear
              const ids = valid.map((r) => r.issueId).join(", ");
              appLog("info", `tgo: chat pass-through — ambiguous matches [${ids}] for ${input.sessionID}, leaving all suspended`, { sessionID: input.sessionID, validIds: ids });
              // Do not throw — pass through
            } else {
              const targetRec = valid[0]!;
              // Exactly one valid — attempt wake BEFORE clear (F1)
              let wakeSucceeded = true;
              let wakeError: unknown;
              const delegatedSid = targetRec.sessionId;
              // For same-session, no separate wake needed (message itself is the wake). For cross-session, prompt delegated.
              if (delegatedSid && delegatedSid !== input.sessionID) {
                try {
                  await client.session.prompt({
                    path: { id: delegatedSid },
                    body: { parts: [{ type: "text", text: `Resumed for ${targetRec.issueId} with: ${rawText}`, synthetic: true }] },
                  });
                } catch (e) {
                  wakeSucceeded = false;
                  wakeError = e;
                }
              }
              if (!wakeSucceeded) {
                // Wake failed — do NOT clear, keep gate, surface error (re-suspend not needed since we never cleared)
                const hint = `wake failed for ${targetRec.issueId}: ${String(wakeError)} — still awaiting human: ${targetRec.reason} — reply with: ${getRequiredFields(targetRec.resumeSchema).join(", ") || "response"}`;
                appLog("error", hint, { issueId: targetRec.issueId, sessionID: input.sessionID, wakeError: String(wakeError) });
                throw new Error(hint);
              }
              // Wake succeeded (or was same-session) — now clear atomically with compare-and-swap (F2)
              const oldCreatedAt = targetRec.createdAt;
              const cleared = await clearAwaitJson(repoRoot, targetRec.issueId, oldCreatedAt);
              if (!cleared) {
                // Check if superseded by newer suspend vs already resumed
                let isSuperseded = false;
                try {
                  const cur = await readAwaitJson(repoRoot, targetRec.issueId);
                  if (cur && cur.createdAt !== oldCreatedAt) isSuperseded = true;
                } catch {}
                if (isSuperseded) {
                  const hint = `resume aborted — superseded by newer suspend for ${targetRec.issueId}`;
                  appLog("warn", hint, { issueId: targetRec.issueId, oldCreatedAt });
                  throw new Error(hint);
                }
                // Concurrent resume already cleared — treat as converged, still mark resumed
                appLog("info", `tgo: concurrent resume converged for ${targetRec.issueId}`, { issueId: targetRec.issueId, sessionID: input.sessionID });
              } else {
                // F4: verify current await is not a newer suspend before clearing blocker/watchdog
                let isNewer = false;
                try {
                  const cur = await readAwaitJson(repoRoot, targetRec.issueId);
                  if (cur && cur.createdAt !== oldCreatedAt) isNewer = true;
                } catch {}
                if (!isNewer) {
                  const badge = formatSuspendBadge(targetRec);
                  const prefix = `⏸ awaiting human: ${targetRec.reason}`;
                  try {
                    const { updateProgress } = await import("./progress");
                    await updateProgress(repoRoot, targetRec.issueId, (parts) => {
                      const filtered = parts.blockers.filter((b) => b !== badge && !b.startsWith(prefix));
                      return { ...parts, blockers: filtered };
                    });
                  } catch {}
                } else {
                  appLog("info", `tgo: skip blocker clear — newer suspend detected for ${targetRec.issueId}`, { issueId: targetRec.issueId, oldCreatedAt, newIsNewer: true });
                }
              }
              // F4: only markResumed if not newer suspend
              let shouldMarkResumed = true;
              try {
                const cur2 = await readAwaitJson(repoRoot, targetRec.issueId);
                if (cur2 && cur2.createdAt !== oldCreatedAt) shouldMarkResumed = false;
              } catch {}
              if (shouldMarkResumed) {
                if (delegatedSid) watchdog.markResumed(delegatedSid);
                try {
                  const map = await loadSessionMap(repoRoot);
                  const sid2 = map[targetRec.issueId]?.sessionId;
                  if (sid2) watchdog.markResumed(sid2);
                } catch {}
                watchdog.markResumed(input.sessionID);
              } else {
                appLog("info", `tgo: skip watchdog markResumed — newer suspend for ${targetRec.issueId}`, { issueId: targetRec.issueId });
              }
              appLog("info", `tgo: prose resume succeeded for ${targetRec.issueId}`, { issueId: targetRec.issueId, sessionID: input.sessionID, crossSession: delegatedSid !== input.sessionID });
              try { board.invalidate(input.sessionID); } catch {}
              if (delegatedSid && delegatedSid !== input.sessionID) try { board.invalidate(delegatedSid); } catch {}
            }
          }
        }
      } catch (e) {
        const msg = String((e as Error)?.message ?? e);
        if (msg.includes("resume validation failed") || msg.includes("ambiguous") || msg.includes("wake failed") || msg.includes("reply with:")) throw e;
        // Otherwise log and continue (non-fatal suspend path)
        safeWarn(appLog, `suspend prose hook failed: ${String(e)}`);
      }
      watchdog.noteActivity(input.sessionID);
      if (config.setup?.enabled !== false && directory && directory !== "/") {
        try {
          const session = await client.session.get({ path: { id: input.sessionID } });
          const data: unknown = (session as { data?: unknown })?.data ?? session;
          const parentID = (data as { parentID?: unknown })?.parentID;
          if (parentID == null) {
            const result = await setup.maybeSetup(directory);
            if (result.action === "completed") {
              appLog("info", `per-repo setup (chat fallback): ${result.steps.join(" → ")} (${directory})`);
            }
          }
        } catch (error) {
          appLog("warn", `per-repo setup fallback failed: ${String(error)}`);
        }
      }
      const text = output.parts
        .filter((part) => part.type === "text")
        .map((part) => (part as { text?: string }).text ?? "")
        .join("\n");
      styleReinforcement.noteUserMessage(input.sessionID, text);
      if (config.board?.enabled === false) return;
      const agent = output.message.agent ?? input.agent;
      reconciler.noteAgent(input.sessionID, agent);
      await board.gate(client, { sessionID: input.sessionID, agent });
    },

    "tool.execute.before": async (input, output) => {
      // termination: residual waffle guard — abort the next tool after completion declared
      try {
        if (config.termination?.enabled !== false && delegatedSessionIds.has(input.sessionID)) {
          const entry = completionSignals.get(input.sessionID);
          if (entry) {
            const exitGateRequired = entry.exitGateRequired ?? false;
            const shouldTerminate = terminationDecision({ signal: entry.signal, exitGateRequired, toolCallsAfterCompletion: 1 });
            if (shouldTerminate) {
              completionSignals.delete(input.sessionID);
              try {
                await client.session.abort({ path: { id: input.sessionID } });
              } catch {}
              try {
                appLog("info", "termination condition met — stopping residual tool calls");
              } catch {}
              try {
                let parentID = terminationParentIds.get(input.sessionID);
                if (!parentID) {
                  try {
                    const sess = await client.session.get({ path: { id: input.sessionID } }) as unknown as { data?: { parentID?: string | null }; parentID?: string | null };
                    const data = (sess as { data?: unknown })?.data as { parentID?: string | null } | undefined;
                    parentID = (data?.parentID ?? (sess as { parentID?: string | null })?.parentID ?? undefined) as string | undefined;
                  } catch {}
                }
                if (parentID) {
                  const truncated = entry.text.slice(0, 2000);
                  await client.session.prompt({
                    path: { id: parentID },
                    body: { parts: [{ type: "text", text: `TGO TERMINATION: completion declared with exit gate satisfied — residual tool call stopped. Report:\n\n${truncated}`, synthetic: true }] },
                  });
                }
              } catch {}
            }
          }
        }
      } catch {}
      const args = output?.args;
      const delegation = input.tool === "task" ? validateDelegationBoundary(args) : undefined;
      if (delegation && !delegation.valid) {
        appLog("error", "delegation packet rejected", delegation as unknown as Record<string, unknown>);
        throw new Error(`Invalid ${delegation.route} delegation packet: ${delegation.diagnostics.join(" ")}`);
      }
      if (delegation?.valid && delegation.route !== "tiny") {
        const authorized = await authorizeLifecycleSession(client, input.sessionID);
        if (!authorized) {
          throw new Error("Beads lifecycle packets are allowed only from an identified primary session.");
        }
      }
      // tgo-dw5: manifest onDispatch + messageFilter — additive, zero-overhead when missing (crowded hook path: clearly-named)
      if (delegation?.valid && input.tool === "task") {
        try {
          const rawArgs = output?.args as Record<string, unknown> | undefined;
          const packet0 = rawArgs?.delegationPacket as Record<string, unknown> | undefined;
          if (packet0 && typeof packet0.issueId === "string" && isValidBeadID((packet0.issueId as string).trim())) {
            const issueId = (packet0.issueId as string).trim();
            const repoRoot = directory ?? worktree ?? (project as unknown as { worktree?: string })?.worktree ?? ".";
            // onDispatch: inject compact manifest row
            try {
              const disp = await manifestOnDispatch({ repoRoot, issueId, packet: packet0 });
              if (disp.injected) {
                (rawArgs as Record<string, unknown>).delegationPacket = disp.packet;
                appLog("info", `manifest onDispatch injected row for ${issueId}`, { issueId, wave: disp.wave });
              }
            } catch (e) {
              safeWarn(appLog, `manifest onDispatch failed: ${String(e)}`);
            }
            // messageFilter: strip file refs outside scope
            try {
              const curPacket = (rawArgs as Record<string, unknown>).delegationPacket as Record<string, unknown>;
              const filt = await manifestMessageFilter({ repoRoot, issueId, packet: curPacket });
              if (filt.filtered) {
                (rawArgs as Record<string, unknown>).delegationPacket = filt.packet;
                appLog("info", `manifest messageFilter stripped ${filt.stripped?.length} files for ${issueId}`, { issueId, stripped: filt.stripped });
              }
            } catch (e) {
              safeWarn(appLog, `manifest messageFilter failed: ${String(e)}`);
            }
          }
        } catch (e) {
          safeWarn(appLog, `manifest hooks (dispatch/filter) failed: ${String(e)}`);
        }
      }
      // Host-code delegation snapshot at dispatch — immutable, atomic tmp+rename, write-once (conductor-oss pattern)
      if (delegation?.valid && input.tool === "task") {
        try {
          const rawArgs = output?.args as Record<string, unknown> | undefined;
          const packet = rawArgs?.delegationPacket && typeof rawArgs.delegationPacket === "object"
            ? (rawArgs.delegationPacket as Record<string, unknown>)
            : undefined;
          if (packet && typeof packet.issueId === "string" && packet.issueId.trim().length > 0) {
            const issueId = (packet.issueId as string).trim();
            // P0: validate BEFORE any path construction — traversal-style ids rejected
            if (!isValidBeadID(issueId)) {
              throw new Error(`invalid issueId "${issueId}" — must match VALID_BEAD_ID`);
            }
            const repoRoot = directory ?? worktree ?? (project as unknown as { worktree?: string })?.worktree ?? ".";
            const useLatest = packet.useLatestDefinitions === true;
            if (useLatest) {
              const map = await loadSessionMap(repoRoot);
              const prior = map[issueId];
              if (prior?.sessionId) {
                try {
                  await client.session.abort({ path: { id: prior.sessionId } });
                } catch (e) {
                  // P1: abort failure surfaces and skips the rewrite — do not overwrite pinned snapshot
                  throw new Error(`useLatestDefinitions abort failed for ${issueId}: ${String(e)}`);
                }
              }
            }
            // Host-authoritative preset: resolve ACTIVE preset (post-nudge) — exact dispatch, no fallback to config.preset
            const memories = await readPresetNudge(runBd, appLog);
            const activePreset = resolveActivePreset(config, memories);
            if (!activePreset || activePreset.trim().length === 0) {
              throw new Error(`host-authoritative preset resolution failed — active preset empty`);
            }
            // Resolve seat name for model + frontmatter — host-authoritative, no fallback
            let seatName: string | undefined;
            try {
              const subagentRaw = (rawArgs as Record<string, unknown>)?.subagent_type;
              if (typeof subagentRaw === "string" && subagentRaw.trim().length > 0) seatName = subagentRaw.trim();
            } catch {}
            if (!seatName || seatName.trim().length === 0) {
              throw new Error(`host-authoritative seat resolution failed for preset "${activePreset}" — subagent_type missing`);
            }
            // Resolve model from ACTIVE preset — exact dispatch, no fallback to other models
            let model: string | undefined;
            const presetMap = (config.presets as Record<string, Record<string, { model: string }>>)?.[activePreset];
            if (!presetMap) {
              throw new Error(`host-authoritative model resolution failed for preset "${activePreset}" seat "${seatName}" — preset not found`);
            }
            const direct = presetMap[seatName as string];
            if (direct?.model) model = direct.model;
            else if (["cobain", "grohl", "novoselic"].includes(seatName) && presetMap["band-members"]?.model) {
              model = presetMap["band-members"].model;
            }
            if (!model || model === "unknown" || model.trim().length === 0) {
              throw new Error(`host-authoritative model resolution failed for preset "${activePreset}" seat "${seatName}"`);
            }
            // Read seat frontmatter host-side — record explicit found flag
            let seatFrontmatter = "";
            let seatFileFound = false;
            try {
              const seatDir = resolveAgentsDir({ agentDir: config.agentDir });
              const p = path.join(seatDir, `${seatName}.md`);
              try {
                const fsMod = await import("node:fs/promises");
                seatFrontmatter = await fsMod.readFile(p, "utf-8");
                seatFileFound = true;
              } catch (e) {
                const code = (e as NodeJS.ErrnoException)?.code;
                if (code === "ENOENT") { seatFileFound = false; seatFrontmatter = ""; }
                else { seatFileFound = false; seatFrontmatter = ""; }
              }
            } catch {
              seatFileFound = false;
              seatFrontmatter = "";
            }
            // Hash covers full five-part definition via packet, not just Objective
            await ensureDefSnapshot({
              repoRoot,
              issueId,
              packet: packet as { Objective?: unknown; Files?: unknown; Interfaces?: unknown; Constraints?: unknown; Verification?: unknown },
              seatFrontmatter,
              seatFileFound,
              model,
              preset: activePreset,
              useLatestDefinitions: useLatest,
            });
          }
        } catch (e) {
          safeWarn(appLog, `def-snapshot capture failed: ${String(e)}`);
          throw e;
        }
      }
      // A tool is about to execute (bash, edit, etc.). While a foreground tool
      // runs the idle clock is paused so long-running commands don't false-trip
      // the cap. Background-intent calls (args.background === true — dev
      // servers, watchers) are exempt from both wall-clock and idle so a
      // productive session parked on a long-running process isn't killed.
      const background =
        output?.args != null &&
        typeof output.args === "object" &&
        (output.args as Record<string, unknown>).background === true;
      watchdog.noteToolStart(input.sessionID, background, input.tool, output?.args);
      // tgo-2ry: append-only run snapshot — step event (writer) contract v2
      void (async () => {
        try {
          const repoRoot = directory ?? worktree ?? (project as unknown as { worktree?: string })?.worktree ?? ".";
          let runId: string | undefined;
          let incomingRunId: string | undefined;
          try {
            const rawArgs = output?.args as Record<string, unknown> | undefined;
            const packet = rawArgs?.delegationPacket as Record<string, unknown> | undefined;
            if (packet && typeof packet.issueId === "string" && isValidBeadID((packet.issueId as string).trim())) {
              incomingRunId = (packet.issueId as string).trim();
            }
          } catch {}
          if (incomingRunId) {
            runId = incomingRunId;
            sessionToRunId.set(input.sessionID, runId);
          } else {
            // Fall back to existing mapping ONLY when packet carries no issueId (non-delegation tool calls)
            if (sessionToRunId.has(input.sessionID)) runId = sessionToRunId.get(input.sessionID)!;
            if (!runId) {
              try {
                const map = await loadSessionMap(repoRoot);
                for (const [iid, entry] of Object.entries(map)) {
                  if (entry.sessionId === input.sessionID) { runId = iid; break; }
                }
              } catch {}
            }
            if (!runId || !isValidBeadID(runId)) return;
            if (input.tool === "task") {
              sessionToRunId.set(input.sessionID, runId);
            } else if (!sessionToRunId.has(input.sessionID)) {
              sessionToRunId.set(input.sessionID, runId);
            }
          }
          if (!runId || !isValidBeadID(runId)) return;
          const seat = board.shimState.agents.get(input.sessionID) ?? "dylan";
          const argsHash = hashArgs(output?.args);
          const ts = Date.now();
          const cmd = extractCmd(input.tool, output?.args);
          runToolStarts.set(`${runId}:${input.tool}:${ts}`, ts);
          runToolStarts.set(`${runId}:${input.tool}:last`, ts);
          await appendRunEvent(repoRoot, runId, {
            ts,
            type: "step",
            seat,
            tool: input.tool,
            argsHash,
            ok: true,
            issueId: runId,
            note: `start ${input.tool}`,
            ...(cmd ? { cmd } : {}),
          });
          // F2 heartbeat: required tool/ok/issueId
          try {
            await appendRunEvent(repoRoot, runId, {
              ts,
              type: "heartbeat",
              seat,
              tool: "heartbeat",
              argsHash: hashArgs({}),
              ok: true,
              issueId: runId,
              note: "heartbeat",
            });
          } catch {}
          // F3 periodic heartbeat while delegation active (30s)
          if (input.tool === "task") {
            try { startHeartbeat(repoRoot, runId, seat); } catch {}
          }
        } catch {}
      })();
    },

    "tool.execute.after": async (input, output) => {
      const background =
        input.args != null &&
        typeof input.args === "object" &&
        (input.args as Record<string, unknown>).background === true;
      const isProgress = input.tool === "edit";
      watchdog.noteToolEnd(input.sessionID, background, isProgress);
      watchdog.noteActivity(input.sessionID);
      // tgo-2ry: run snapshot — step completion (contract v2) + terminal status + session mapping + periodic heartbeat
      void (async () => {
        try {
          const repoRoot = directory ?? worktree ?? (project as unknown as { worktree?: string })?.worktree ?? ".";
          let runId: string | undefined;
          if (sessionToRunId.has(input.sessionID)) runId = sessionToRunId.get(input.sessionID)!;
          if (!runId) {
            try {
              const argsRec = input.args as Record<string, unknown> | undefined;
              const packet = argsRec?.delegationPacket as Record<string, unknown> | undefined;
              if (packet && typeof packet.issueId === "string" && isValidBeadID((packet.issueId as string).trim())) {
                runId = (packet.issueId as string).trim();
              }
            } catch {}
          }
          if (!runId) {
            try {
              const map = await loadSessionMap(repoRoot);
              for (const [iid, entry] of Object.entries(map)) {
                if (entry.sessionId === input.sessionID) { runId = iid; break; }
              }
            } catch {}
          }
          if (!runId || !isValidBeadID(runId)) return;
          // F1 per-dispatch for parent task
          if (input.tool === "task") {
            sessionToRunId.set(input.sessionID, runId);
          } else if (!sessionToRunId.has(input.sessionID)) {
            sessionToRunId.set(input.sessionID, runId);
          }
          const seat = board.shimState.agents.get(input.sessionID) ?? "dylan";
          const lastKey = `${runId}:${input.tool}:last`;
          const startTs = runToolStarts.get(lastKey);
          const nowTs = Date.now();
          const durationMs = startTs ? nowTs - startTs : undefined;
          if (startTs) runToolStarts.delete(lastKey);
          const cmd = extractCmd(input.tool, input.args);
          const argsHash = hashArgs(input.args);
          // F1: tool completions are "step" (not status)
          const okStep = !(output as any)?.error;
          await appendRunEvent(repoRoot, runId, {
            ts: nowTs,
            type: "step",
            seat,
            tool: input.tool,
            argsHash,
            ok: okStep,
            issueId: runId,
            durationMs,
            note: `end ${input.tool}`,
            ...(cmd ? { cmd } : {}),
          });
          // F3: if this is a task delegation, capture child sessionId → runId mapping and handle terminal status + heartbeat lifecycle
          if (input.tool === "task") {
            // capture child sessionId from output (same logic as captureDelegationSession)
            let childSid: string | undefined;
            try {
              const meta = (output as any)?.metadata as Record<string, unknown> | undefined;
              if (meta && typeof meta.sessionId === "string" && meta.sessionId.trim()) childSid = meta.sessionId.trim();
            } catch {}
            if (!childSid) {
              try {
                const outText = typeof (output as any)?.output === "string" ? (output as any).output as string : "";
                const m = outText.match(/ses_[A-Za-z0-9]+/);
                if (m) childSid = m[0];
              } catch {}
            }
            if (childSid && /^ses_[A-Za-z0-9]+$/.test(childSid)) {
              sessionToRunId.set(childSid, runId);
              // start periodic heartbeat for delegation (cleared on terminal)
              try { startHeartbeat(repoRoot, runId, seat); } catch {}
            }
            // F1 terminal status: emit ONCE with complete|failed|aborted
            try {
              const outText = typeof (output as any)?.output === "string" ? (output as any).output as string : "";
              let terminal: "complete" | "failed" | "aborted" = "complete";
              let okTerminal = true;
              if (outText) {
                try {
                  const report = parseTaskReport(outText);
                  if (!report.valid) {
                    terminal = "failed";
                    okTerminal = false;
                  } else if ((report as any).status === "failed" || (report as any).status === "tripwire") {
                    terminal = "failed";
                    okTerminal = false;
                  } else if ((report as any).status === "bail") {
                    terminal = "aborted";
                    okTerminal = false;
                  } else if ((report as any).watchdogAborted) {
                    terminal = "aborted";
                    okTerminal = false;
                  }
                } catch { terminal = okStep ? "complete" : "failed"; okTerminal = okStep; }
              } else {
                terminal = okStep ? "complete" : "failed";
                okTerminal = okStep;
              }
              await appendRunEvent(repoRoot, runId, {
                ts: Date.now(),
                type: "status",
                seat,
                tool: "task",
                argsHash: hashArgs(input.args),
                ok: okTerminal,
                issueId: runId,
                note: terminal,
                ...(cmd ? { cmd } : {}),
              });
              // clear heartbeat on terminal
              stopHeartbeat(runId);
            } catch {}
          }
        } catch {}
      })();
      if (reuseCapability.supported) {
        // After-hook is read-only for snapshots — write-once at start only (P1). Never touches def-snapshot.
        await captureDelegationSession({ tool: input.tool, input, output, repoRoot: directory ?? worktree ?? (project as unknown as { worktree?: string })?.worktree ?? ".", enabled: config.sessionReuse?.enabled !== false, log: appLog });
      }
      if (input.tool === "task" && typeof output?.output === "string") {
        let report = parseTaskReport(output.output);
        if (output && typeof output === "object") {
          const metadata = output.metadata && typeof output.metadata === "object"
            ? output.metadata as Record<string, unknown>
            : {};
          // tgo-dw5: manifest onComplete — mismatch routes to BAIL (not retry), zero-overhead when missing
          // must run before closureGate/gate so bail taxonomy is authoritative
          let effectiveArgsForManifest: Record<string, unknown> | undefined;
          try {
            effectiveArgsForManifest = input.args && typeof input.args === "object" ? input.args as Record<string, unknown> : undefined;
            const pktForManifest = effectiveArgsForManifest?.delegationPacket && typeof effectiveArgsForManifest.delegationPacket === "object"
              ? effectiveArgsForManifest.delegationPacket as Record<string, unknown>
              : undefined;
            const issueIdForManifest = pktForManifest && typeof pktForManifest.issueId === "string" ? String(pktForManifest.issueId).trim() : undefined;
            if (issueIdForManifest && isValidBeadID(issueIdForManifest)) {
              const repoRoot = directory ?? worktree ?? (project as unknown as { worktree?: string })?.worktree ?? ".";
              const mc = await manifestOnComplete({ repoRoot, issueId: issueIdForManifest, report });
              if (mc.bail) {
                report = mc.report;
                appLog("warn", `manifest scope mismatch → bail for ${issueIdForManifest}`, { issueId: issueIdForManifest, mismatch: mc.mismatchFiles });
              }
            }
          } catch (e) {
            safeWarn(appLog, `manifest onComplete failed: ${String(e)}`);
          }
           output.metadata = { ...metadata, specialistReport: report };
          const args = input.args && typeof input.args === "object" ? input.args as Record<string, unknown> : {};
          const packet = args.delegationPacket && typeof args.delegationPacket === "object"
            ? args.delegationPacket as Record<string, unknown>
            : {};
           const route = classifyRouting(args as never).route;
           // Horowitz records review completion on the task result metadata;
           // keep the delegation packet as the lifecycle source for the other
           // fields and pass that review signal into the metadata-only gate.
           const lifecycle = {
             ...packet,
             reviewComplete: metadata.reviewComplete,
           };
             const closureGate = evaluateClosure(route, lifecycle, report);
             output.metadata.closureGate = closureGate;
              if (route !== "tiny") {
                output.metadata.beadsLifecycle = {
                  allowed: false,
                  action: "metadata-only",
                  diagnostics: ["Metadata validation checks observed claim fields (issueStatusObserved, issueAssigneeObserved, claimExitCode) but does not query or mutate Beads; plugin remains metadata-only until host write path proven."]
                };
              }
              // Exit gate: per-repo profile auto-runs at delegation close (taxonomy-aware).
              // Bail/abandon paths skip the gate; complete paths run it. CRITICAL blocks close.
              if (route !== "tiny" && shouldRunGate(report)) {
                let issueIdForError: string | undefined;
                try {
                  const repoRoot = directory ?? worktree ?? (project as unknown as { worktree?: string })?.worktree ?? ".";
                  const specFields = packet as Record<string, unknown>;
                  const specText = [
                    typeof specFields.Objective === "string" ? specFields.Objective : specFields.Objective !== undefined ? JSON.stringify(specFields.Objective) : "",
                    Array.isArray(specFields.Files) ? (specFields.Files as string[]).join("\n") : typeof specFields.Files === "string" ? specFields.Files : specFields.Files !== undefined ? JSON.stringify(specFields.Files) : "",
                    typeof specFields.Interfaces === "string" ? specFields.Interfaces : specFields.Interfaces !== undefined ? JSON.stringify(specFields.Interfaces) : "",
                    typeof specFields.Constraints === "string" ? specFields.Constraints : specFields.Constraints !== undefined ? JSON.stringify(specFields.Constraints) : "",
                    typeof specFields.Verification === "string" ? specFields.Verification : specFields.Verification !== undefined ? JSON.stringify(specFields.Verification) : "",
                  ].filter((s) => s && s.trim().length > 0).join("\n\n");
                  const issueId = typeof (lifecycle as Record<string, unknown>).issueId === "string" && String((lifecycle as Record<string, unknown>).issueId).trim().length > 0
                    ? String((lifecycle as Record<string, unknown>).issueId).trim()
                    : typeof specFields.issueId === "string" ? String(specFields.issueId).trim() : undefined;
                  issueIdForError = issueId;
                  if (issueId) {
                    const gateResult = await runExitGate({ repoRoot, issueId, specText: specText || String(specFields.Objective ?? ""), report });
                    // Enforcing consumer: gate result gates the close path — blocked gate MUST produce canClose:false
                    const merged = evaluateGatedClosure(route, lifecycle as unknown as import("./lifecycle").LifecycleMetadata, report, {
                      passed: gateResult.passed,
                      blocked: gateResult.blocked,
                      reasonCode: gateResult.reasonCode as unknown as import("./lifecycle").GateReasonCode,
                      reason: gateResult.reason,
                      findings: gateResult.findings as unknown[],
                      compensation: gateResult.compensation as unknown as { title: string; body: string; discoveredFrom: string; severity: string },
                      skipped: gateResult.skipped,
                      skipReason: gateResult.skipReason,
                    });
                    (output.metadata as Record<string, unknown>).closureGate = merged;
                    (output.metadata as Record<string, unknown>).exitGate = gateResult;
                    if (gateResult.blocked) {
                      appLog("warn", "exit gate blocked close", { issueId, reason: gateResult.reason, reasonCode: gateResult.reasonCode, findings: gateResult.findings.length });
                    }
                  }
                } catch (e) {
                  const errMsg = String(e);
                  // Gate failure = typed blocked-with-error, never silent proceed (F1)
                  appLog("error", "exit gate evaluation failed — blocking close", { issueId: issueIdForError, error: errMsg });
                  const blocked = gateBlockedWithError(String(issueIdForError ?? "unknown"), errMsg);
                  const merged = evaluateGatedClosure(route, lifecycle as unknown as import("./lifecycle").LifecycleMetadata, report, blocked);
                  (output.metadata as Record<string, unknown>).closureGate = merged;
                  (output.metadata as Record<string, unknown>).exitGate = blocked;
                }
              }
        }
        if (!report.valid) {
          appLog("warn", "specialist report requires recovery", {
            sessionID: input.sessionID,
            recovery: report.recovery,
            missing: report.missing,
            malformed: report.malformed,
            contradictions: report.contradictions,
            watchdogAborted: report.watchdogAborted,
            raw: report.raw,
          });
        }
      }
      await fit.normalize(input, output);
    },

    "experimental.chat.messages.transform": async (_input, output) => {
      try {
        if (config.termination?.enabled !== false) {
          const msgs = output.messages as unknown as Array<{ info: { role?: string; sessionID?: string; id?: string }; parts: Array<{ type: string; text?: string }> }>;
          let lastAssistantText: string | undefined;
          let sessionID: string | undefined;
          for (let i = msgs.length - 1; i >= 0; i--) {
            const m = msgs[i];
            if (!m) continue;
            const role = (m.info as { role?: string })?.role;
            if (role === "assistant") {
              const text = m.parts.filter((p) => p.type === "text").map((p) => p.text ?? "").join("\n");
              lastAssistantText = text;
              sessionID = (m.info as { sessionID?: string })?.sessionID;
              break;
            }
          }
          if (lastAssistantText !== undefined && sessionID !== undefined) {
            if (delegatedSessionIds.has(sessionID)) {
              try {
                const signal = parseCompletionSignal(lastAssistantText);
                if (lastAssistantText.trim().length === 0 || signal.complete === false) {
                  completionSignals.delete(sessionID);
                } else if (signal.complete === true) {
                  let exitGateRequired = false;
                  try {
                    const firstUser = msgs.find((msg) => (msg.info as { role?: string })?.role === "user");
                    const userText = firstUser ? firstUser.parts.filter((p) => p.type === "text").map((p) => p.text ?? "").join("\n") : "";
                    exitGateRequired = /"?exitGate"?\s*:\s*true/i.test(userText);
                  } catch {
                    exitGateRequired = false;
                  }
                  completionSignals.set(sessionID, { signal, text: lastAssistantText, exitGateRequired });
                }
              } catch {}
            }
          }
        }
      } catch {}
      if (config.board?.enabled === false) return;
      await board.transform(output.messages as unknown as BoardMessage[]);
    },

    "experimental.chat.system.transform": async (input, output) => {
      const appended = await concision.transform(client, input, output);
      const reinforced = input.sessionID ? await styleReinforcement.appendPending(client, input.sessionID, output.system) : false;
      if (appended) {
        logEvent("concision.appended", input.sessionID ?? "?", {
          register: config.register,
        });
      }
      if (reinforced) logEvent("style_reinforcement.appended", input.sessionID ?? "?", { register: config.register });
    },

    "experimental.text.complete": async (input, output) => {
      await styleReinforcement.noteCompletion(client, {
        sessionID: input.sessionID,
        messageID: input.messageID,
        candidate: output.text,
      });
    },

    dispose: async () => {
      watchdog.dispose();
      styleReinforcement.reset();
      // F3 clear all heartbeats
      for (const iv of heartbeatIntervals.values()) try { clearInterval(iv as any); } catch {}
      heartbeatIntervals.clear();
      sessionToRunId.clear();
      runToolStarts.clear();
    },
  };
};

export default TgoPlugin;
