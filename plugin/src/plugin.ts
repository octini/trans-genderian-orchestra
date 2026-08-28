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
import { loadBeadsTui, renderBeadsTui } from "./tui";
import { checkVersionDrift, fetchLatestVersion, PLUGIN_NPM_NAME, readLocalVersion } from "./version";
import { parseCompletionSignal, terminationDecision, type CompletionSignal } from "./termination";
import { selfUpdate } from "./self-update";
import { reconcileSeats } from "./seat-sync";
import { appendRunEvent, hashArgs, pruneRuns, scanRunsForProblems } from "./runs";
import { computeMetrics, writeMetrics, readMetrics } from "./metrics";
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

  // Watchdog: abort delegated subagent sessions that exceed a wall-clock cap or
  // go silent past an idle cap, then inject a marker into the parent so the
  // orchestrator re-dispatches instead of trusting an empty result.
  const watchdog = new WatchdogController(config.watchdog, {
    log: appLog,
    abort: async (sessionID, reason) => {
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
  // tgo-2ry: run snapshot start times for durationMs
  const runToolStarts = new Map<string, number>();
  // F3: sessionID→runId mapping for child tool events (persisted via sessions.json + in-memory)
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
    // don't keep process alive
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
          // F3: check in-memory session→runId first (child events)
          if (sessionToRunId.has(input.sessionID)) runId = sessionToRunId.get(input.sessionID)!;
          if (!runId) {
            try {
              const rawArgs = output?.args as Record<string, unknown> | undefined;
              const packet = rawArgs?.delegationPacket as Record<string, unknown> | undefined;
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
          // seed mapping for future child events in same session
          if (!sessionToRunId.has(input.sessionID)) sessionToRunId.set(input.sessionID, runId);
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
          if (!sessionToRunId.has(input.sessionID)) sessionToRunId.set(input.sessionID, runId);
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
        const report = parseTaskReport(output.output);
        if (output && typeof output === "object") {
          const metadata = output.metadata && typeof output.metadata === "object"
            ? output.metadata as Record<string, unknown>
            : {};
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
