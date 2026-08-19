# OpenCode Plugin API — verified reference (1.18.13)

Source: `@opencode-ai/plugin` v1.18.13 `Hooks` interface + opencode source + the installed opencode-beads 0.7.0 fork. Verified 2026-08-05 during the tgo-96f.1 scaffold spike. This is the wiring reference for hooks #1-#4 and the band.

## Plugin module shape

- Module exports **named** plugin functions: `export const TgoPlugin: Plugin = async (input, options) => Hooks`.
- `package.json` `main` (or `exports["./server"]`) points at the entry. `type: "module"`; deps auto-installed by opencode via Bun into `~/.cache/opencode/packages/<name>/`.
- Local dev: symlink/copy the entry into `~/.config/opencode/plugins/` (auto-loaded at startup). `OPENCODE_CONFIG_DIR` env overrides the config dir for isolated testing.
- `PluginInput`: `{ client, project, directory, worktree, experimental_workspace, serverUrl, $ }` (`$` = Bun shell).

## Hook surface (exact names)

| Architecture name | Exact hook | Input → output |
|---|---|---|
| #1 board | `experimental.chat.messages.transform` | `{}` → `{ messages: { info: Message; parts: Part[] }[] }` |
| #4 concision | `experimental.chat.system.transform` | `{ sessionID?, model }` → `{ system: string[] }` (append per turn) |
| — completion | `experimental.text.complete` | `{ sessionID, messageID, partID }` → `{ text }` |
| — re-injection | `chat.message` | `{ sessionID, agent, model, messageID, variant }` → `{ message, parts }` |
| — session events | `event` | `{ event }` — incl. `session.status`, `session.idle`, `session.compacted`, `session.created/deleted/diff/error/updated` |
| #3 task-fit | `tool.execute.after` | `{ tool, sessionID, callID, args }` → `{ title, output, metadata }` |
| — tool veto | `tool.execute.before` | `{ tool, sessionID, callID }` → `{ args }` (throw to veto) |
| — params | `chat.params` | `{ sessionID, agent, model, provider, message }` → `{ temperature, topP, topK, maxOutputTokens, options }` |
| — prompts | `config` | `Config` — mutate `agent`, `command`, `mcp` etc. |
| — tools | `tool` | `{ name: ToolDefinition }` (custom tools via `tool()` helper) |
| — compaction | `experimental.session.compacting` | `{ sessionID }` → `{ context[], prompt? }` |
| — permissions | `permission.ask` | `Permission` → `{ status: "ask"|"deny"|"allow" }` |

## Verified mechanics

- **Agents auto-discover** from `{agent,agents}/**/*.md` in config dirs (`~/.config/opencode/` + project `.opencode/`). Frontmatter: `description` (required), `mode` (`primary|subagent|all`), `model`, `temperature`, `permission`, `steps`, `tools`, `color`. Body = system prompt. → TGO seats need NO plugin config hook; installer drops `.md` files.
- **`permission` keys** (glob-matched to tool names): `read, edit, glob, grep, list, bash, task, external_directory, todowrite, webfetch, websearch, lsp, skill, question, doom_loop`. Values: `"ask"|"allow"|"deny"`, or pattern→value object for `read/edit/glob/grep/list/bash/task/external_directory/lsp/skill`. **`todowrite: deny`** supported (config-level, closes parked investigation #66).
- **`task` permissions**: glob patterns; last-match wins; `"*": "deny"` removes the subagent from the Task tool description entirely. Users can still `@`-invoke any subagent.
- **`bash` permissions**: same pattern object, e.g. `{ "*": "ask", "git status *": "allow" }`.
- **Subagent skip**: `client.app.agents()` lists agents; primary/all get board injection, subagents skip (fork pattern).
- **Injection cache-safety**: sentinel tag, check-before-inject, strip-and-replace (fork pattern).
- **Model/agent-preserving synthetic injection**: `client.session.prompt({ body: { noReply: true, model, agent, parts: [{ type: "text", text, synthetic: true }] } })`.
- **`subagent_depth`** caps delegation; **`steps`** (legacy `maxSteps`) caps iterations.

## For later tickets

- **tgo-96f.5 (board):** `experimental.chat.messages.transform` + `chat.message` gate + fork injection pattern.
- **tgo-96f.9 (concision):** `experimental.chat.system.transform` (primary-loop gate via an explicitly host-provided `session.parentID === null`; missing `parentID` fails closed). `chat.params` NOT adopted — register dial is prompt-level, no param injection.
- **tgo-96f.10 (band):** band members as subagent `.md` agents, Nirvana `permission.task` allowlist; parallel `task` fan-out.
- **tgo-96f.12 (presets):** verified 2026-08-06 — the `task` tool takes **no model parameter** and resolves the subagent's model as `next.model ?? { modelID: parentMsg.info.modelID, providerID: parentMsg.info.providerID }` (source `packages/opencode/src/tool/task.ts`). Per-seat models are therefore fixed per session (frontmatter `model` or parent inheritance). Preset application = the `config` hook (`(input: Config) => Promise<void>`, mutates the loaded config in place) setting each seat's `model` from `presets[activePreset]` at plugin load. Source-verified 2026-08-06 (BUILT in tgo-96f.12):
  - Config hook timing: plugins load → `config` hook fires with the live merged `Config` (markdown agents from `{agent,agents}/**/*.md` already merged into `cfg.agent`, config-svc.ts:460) → Agent state builds lazily on first `agents.get()` and reads `cfg.agent[name].model`/`.variant` (agent-svc.ts:281-282), so in-place hook mutation is observed (plugin-index.ts:242-251).
  - `variant` is a first-class AgentConfig field (core/v1/config/agent.ts:15). `createUserMessage` validates it against the model's declared variants: `input.variant ?? (ag.variant && full?.variants?.[ag.variant] ? ag.variant : undefined)` (prompt.ts:646-654) — an undeclared variant silently drops to undefined rather than erroring.
  - The `band-members` preset entry applies to the three lens agents (`cobain`/`grohl`/`novoselic`) — there is no single `band-members` seat.
  - Prose-nudge persistence: Bernstein writes `bd remember --key tgo.preset <name>` (his bash allowlist already permits `bd *`); the plugin's `config` hook reads `bd memories --json` and treats the `tgo.preset` key (schema_version filtered) as the active preset, effective next plugin load (session start). Verified live via headless smoke (2026-08-06).
- **tgo-96f.6 (reconcile, source-verified 2026-08-06):** `event` hook receives `{ event: { id, type, properties } }`; `session.status` properties = `{ sessionID, status: { type: "busy" | "retry" | "idle" } }`; `session.idle`/`session.compacted` properties = `{ sessionID }` (sdk types.gen). `trigger(name, input, output)` passes the output object **by reference** and returns it (plugin-index.ts) — in-place mutation of the board shim + `board.invalidate(sessionID)` (render-cache clear) keeps the live-state consistent across busy/idle/compaction. BUILT in tgo-96f.6.
- **tgo-96f.7 (task-fit, source-verified 2026-08-06):** `tool.execute.after` is triggered with `{ tool, sessionID, callID, args }` and the tool `result` object (prompt.ts `handleSubtask`); after the trigger, `result.title`/`result.output`/`result.metadata` are read into the tool part — so **mutating `output.output` in place IS observed** (same by-reference contract as hook #1). `task` tool args carry `subagent_type` (the delegated seat name). BUILT in tgo-96f.7: lane-rejection detection patterns → appends `REROUTE-NOT-RETRY` signal naming the seat.
- **tgo-96f.14 (setup auto-trigger, LIVE-VERIFIED 2026-08-07):** `session.created` event properties = `{ info: Session }` (sdk types.gen `EventSessionCreated`); the host-observed `Session` carries `{ id, projectID, directory, parentID? }`. The plugin treats a session as primary only when `parentID === null`; an omitted field is not primary and setup is skipped. For an explicitly primary session it reads `directory` and runs per-repo setup (bd init → `bd setup opencode` → TGO AGENTS fragment) idempotently. BUILT in tgo-96f.14: `SetupController` (src/setup.ts) + the non-load-bearing `tgo-setup` skill asset. **Historical host verification (2026-08-07):** `session.created` fired for the primary with `parentID:null`; SetupController ran the sequence in a fresh disposable repo and skipped it on the second run. This is host-dependent evidence, not a guarantee for omitted fields.
- **tgo-v6g (G5, LIVE-VERIFIED 2026-08-07):** headless `opencode run --format json` + `TGO_DEBUG_EVENTS=1` plugin logging against a temp config dir (installer output) in a fresh repo:
  - **`session.created` fires for subagents too** — each subagent session emits `session.created` with `parentID` = the delegating session id (never null). The setup auto-trigger's explicit-primary gate therefore skips per-repo setup for every subagent spawn; missing `parentID` also skips.
  - **Subagent sessions are RESPAWNED, not reused.** Two sequential `task` delegations to the same seat (`nas`) created two distinct session ids (`ses_...5aQY`, then `ses_...2PTn`), each a full created→busy→idle lifecycle under the same primary. Chained phases do not share a session; each `task` call is a fresh session. (The `task_id` param exists to *resume* a specific prior task, but the default path always spawns fresh.)
  - **`task` tool args** carry `description`, `prompt`, `subagent_type`, and optionally `background`; result metadata carries `{ parentSessionId, sessionId, model: { providerID, modelID } }`. The preset's per-seat model (e.g. `opencode-go/mimo-v2.5` for `nas`, set by the plugin `config` hook) IS the model the spawned subagent streams with — confirmed live via metadata.
  - **Background mode is gated by `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true`** — confirmed in the opencode 1.18.13 binary:
    - With the env var: task tool schema includes `background` (`zs` struct); `TaskTool.execute` starts the subagent asynchronously (`e.start`/`forkIn startImmediately:true`) and returns immediately with `<task state="running" summary="Background task started">`; result notification is delivered via `notifyBackgroundResult` when the session completes. Live event stream confirms the primary reaches `idle` BEFORE the subagent finishes (fire-and-continue).
    - Without the env var: `jsonSchema: fromSchema(Ss)` omits `background` (so the model cannot even emit it) and `TaskTool.execute` hard-fails `background===true` with `"Background subagents require OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true"`. Live: the model consistently failed to emit `background:true` despite explicit instruction.
    - The install output note about setting the env var in the shell profile is therefore correct and necessary.
  - **`subagent_depth` enforcement** (source, 1.18.13): `TaskTool.execute` walks the `parentID` chain from the session, and if `h >= subagent_depth ?? 1` fails with `"Subagent depth limit reached"`. TGO's installer writes `subagent_depth: 2`.
  - **Bug found + fixed (tgo-v6g):** bd subprocesses launched via Bun's `$` shell with `.cwd()` did not inherit `HOME`, so `bd` wrote its telemetry config to a literal `~/` dir *inside the target repo*. Fixed in plugin.ts by passing `HOME: os.homedir()` (plus `BD_NON_INTERACTIVE: "1"`) in both `runBd` and SetupController's run wrapper (shared `BD_ENV` const). Verified: fresh repo after fix shows no `~/` dir. Re-run probe then cleaned temp dirs.

Board reads do not authorize lifecycle actions; bd init --directory is unsupported, bd -C fails, must use .cwd(directory). Plugin remains metadata-only (beadsLifecycle.allowed:false) until host boundary validated. SetupController uses .cwd(directory) for per-repo setup.
