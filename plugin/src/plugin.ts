import { tool, type Plugin, type PluginInput } from "@opencode-ai/plugin";
import { loadTgoConfig, validateAgentDir, BD_ENV, type TgoConfig } from "./config";
import { BoardController, type BoardMessage } from "./board";
import { ConcisionController } from "./concision";
import { StyleReinforcementController } from "./style-reinforcement";
import { SessionReconciler } from "./session";
import { TaskFitController, classifyRouting } from "./fit";
import { WatchdogController } from "./watchdog";
import { parseTaskReport } from "./report";
import { SetupController } from "./setup";
import { preapproveExternalDirectory, resolveWorktreeFamily } from "./permissions";
import { DEPENDENCIES, installMissing, runShellCommand } from "./deps";
import { applyPreset, readPresetNudge, resolveActivePreset } from "./presets";
import { validateDelegationBoundary, validateDelegationPacket, verifyClaimObserved as verifyDelegationClaimObserved } from "./delegation";
import { authorizeLifecycleSession, evaluateClosure, verifyClaimObserved } from "./lifecycle";
import { loadBeadsTui, renderBeadsTui } from "./tui";
export { validateDelegationBoundary, validateDelegationPacket, verifyClaimObserved as verifyDelegationClaimObserved } from "./delegation";
export type { DelegationPacket, DelegationValidation } from "./delegation";
export { evaluateClosure, authorizeLifecycleSession, verifyClaimObserved } from "./lifecycle";
export type { ClosureGate, LifecycleMetadata } from "./lifecycle";
import * as path from "node:path";
import * as os from "node:os";

export function isPrimarySessionData(data: unknown): boolean {
  return Boolean(
    data &&
      typeof data === "object" &&
      Object.prototype.hasOwnProperty.call(data, "parentID") &&
      (data as { parentID?: unknown }).parentID === null
  );
}

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

  const seatDir =
    config.agentDir ?? path.join(os.homedir(), ".config", "opencode", "agent");
  // Load-time budget re-check. Warn, never throw: a throwing factory makes
  // opencode silently drop the entire plugin (verified headless, 1.18.13), so
  // an oversized hand-edited seat must not take TGO down. install/validate
  // paths still enforce the budget strictly.
  try {
    const checked = await validateAgentDir(seatDir);
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
  });

  const reconciler = new SessionReconciler({ shim: board.shimState });

  const concision = new ConcisionController({
    enabled: config.concision?.enabled,
    register: config.register,
  });
  const styleReinforcement = new StyleReinforcementController({
    enabled: config.concision?.enabled,
    productionEnabled: config.concision?.reinforcement,
    register: config.register,
  });

  const fit = new TaskFitController();

  // Watchdog: abort delegated subagent sessions that exceed a wall-clock cap or
  // go silent past an idle cap, then inject a marker into the parent so the
  // orchestrator re-dispatches instead of trusting an empty result.
  const watchdog = new WatchdogController(config.watchdog, {
    log: appLog,
    abort: async (sessionID) => {
      await client.session.abort({ path: { id: sessionID } });
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
    if (info.parentID !== null) return;
    const directory = info.directory;
    if (!directory) return;
    try {
      const result = await setup.maybeSetup(directory);
      if (result.action === "completed") {
        appLog("info", `per-repo setup: ${result.steps.join(" → ")} (${directory})`);
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
        void handleSessionCreated(event.properties.info);
      }
    },

    config: async (input) => {
      const active = resolveActivePreset(config, await readPresetNudge(runBd));
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
      // A tool is about to execute (bash, edit, etc.). While a foreground tool
      // runs the idle clock is paused so long-running commands don't false-trip
      // the cap. Background-intent calls (args.background === true — dev
      // servers, watchers) are exempt from both wall-clock and idle so a
      // productive session parked on a long-running process isn't killed.
      const background =
        output?.args != null &&
        typeof output.args === "object" &&
        (output.args as Record<string, unknown>).background === true;
      watchdog.noteToolStart(input.sessionID, background);
    },

    "tool.execute.after": async (input, output) => {
      const background =
        input.args != null &&
        typeof input.args === "object" &&
        (input.args as Record<string, unknown>).background === true;
      const isProgress = input.tool === "edit";
      watchdog.noteToolEnd(input.sessionID, background, isProgress);
      watchdog.noteActivity(input.sessionID);
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
    },
  };
};

export default TgoPlugin;
