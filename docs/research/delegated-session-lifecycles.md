# Comparative Research: Lifecycle of Delegated (Subagent) Sessions

Comparative survey dated 2026-08-27 of the lifecycle of delegated (subagent) sessions across 14 systems, evaluated on six dimensions — session reuse, fresh-vs-continue policy, shared context, stall prevention, termination guards, and recovery paths — against TGO's current guardrails and OpenCode-native semantics, with a concise system×dimension comparison table and nine ranked recommendations.

## 0. What TGO gives today (verified, cited)

**Current guardrails in repo:**

1. Every TGO seat hard-capped `steps: 20` in frontmatter — `plugin/assets/agents/dylan.md:5`, `nas.md:5`, `horowitz.md` (via frontmatter `steps: 20`). Kills long-running delegated work at 20 agentic iterations regardless of progress. Update 2026-08-27: caps raised — dylan 100, nas 60, horowitz 40 (tgo-6fv); steps counts LLM loop iterations, not tool calls — parallel tool calls batch within one step.
2. `plugin/src/watchdog.ts:98-349` implements wall-clock/idle/stuck-loop aborts for delegated sessions (sessions with `parentID`). Tracked from `session.status` busy/idle, `tool.execute.before/after` (foreground vs `backgroundInFlight`), sleep-drift corrected via `wallNow - sleepOffsetMs`. Abort reasons: `wall-clock` (since `max(busySince, lastProgress)`), `idle` (paused only while foreground `toolInFlight>0`), `stuck-loop` (`nonProgressCount >= stuckLoopTools && stuckElapsed >= stuckLoopMs` since last edit). Notified to parent via `WATCHDOG_ABORT_MARKER` synthetic prompt.
3. `plugin/src/session.ts:60-73` — `isPrimarySessionData` checks `parentID === null` own-property; `SessionReconciler` tracks busy/streaming per session, cleared on `onCompact`.
4. `plugin/src/lifecycle.ts` / `plugin/src/delegation.ts` — delegation packet requires `issueId/issueStatusObserved/issueAssigneeObserved/claimExitCode/delegationId/beadsOperator` for non-tiny routes; Bernstein-only `beadsOperator="Bernstein"`; closure gated on `completionSafe` report + observed claim + Horowitz review.

**OpenCode-native semantics (exact, cited):**

1. **`steps` semantics** — `steps: Schema.optional(PositiveInt)` described as "Maximum number of agentic iterations before forcing text-only response" (src: github.com/sst/opencode/blob/b2baddcd/packages/opencode/src/config/agent.ts + opencode.ai/docs/agents). Behavior: on final allowed step OpenCode removes tools and injects system+assistant prompt requiring summarization + recommended remaining tasks; new user input resets allowance (src: opencode.ai/docs/agents "When the limit is reached..." / opencode.ai/v2/docs/agents "On the final allowed step, OpenCode removes tools..."). Configurable per agent (frontmatter `steps` or `opencode.json` `agent.<name>.steps`), no default — if not set, iterates until model stops or user interrupts (src: opencode.ai/docs/agents "If this is not set..."). Legacy `maxSteps` deprecated → `steps`.
2. **Session reuse via `task_id`** — `task` tool `BaseParameterFields.task_id?: string` — "This should only be set if you mean to resume a previous task (you can pass a prior task_id and the task will continue the same subagent session as before instead of creating a fresh one)" (src: github.com/sst/opencode/blob/dev/packages/opencode/src/tool/task.ts). Implementation: `params.task_id ? sessions.get(task_id) : undefined`; if found, reuses `nextSession`, else `sessions.create({parentID: ctx.sessionID, ...})`. Default path without `task_id` **always spawns fresh** — live-verified in `docs/research/opencode-plugin-api.md:54-55`: two sequential `task` to same seat created `ses_...5aQY` then `ses_...2PTn` (distinct sessions). TGO board notes active tasks cannot be amended mid-run.
3. **V2 regression** — In opencode v2, `subagent` tool background returns `sessionId ses_...` but "there is still no way to resume a completed agent or steer a running agent — both absent in v2's `subagent` tool" (src: github.com/anomalyco/opencode/issues/36423). Feature request for `resumeSessionId` open (src: github.com/anomalyco/opencode/issues/6584).
4. **Background mode** — Requires `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true` (env-gated schema, else `background` omitted and `background===true` fails hard) (src: github.com/sst/opencode/blob/dev/packages/opencode/src/tool/task.ts + docs/research/opencode-plugin-api.md:57-60). Background `task` returns immediately with `Background task started`, parent notified via `notifyBackgroundResult` injection on completion.
5. **Compaction** — Replaces old context with checkpoint containing structured summary + serialized tail. Triggers: preflight estimate `estimated tokens > context limit - max(requested output tokens, buffer)` (`buffer` default 20000, `keep.tokens` 15000 V1 / 8000 V2 keep) (src: opencode.ai/v2/docs/compaction) and one-shot provider-overflow retry even when `auto:false`. Durable messages preserved; active request rebuilt from latest checkpoint (src: dev.to/opencode-v2-compaction-internals). Config `compaction: {auto, keep:{tokens}, buffer, prune}` (src: opencode.ai/docs/config). Prune path (when `prune:true`) erases old tool outputs beyond `PRUNE_PROTECT 40000` keeping last 2 turns + 40k tokens, never pruning `skill` outputs (src: deepwiki / 4.5 Compaction). Summary itself capped 4096 output tokens, model-visible history, lossy (src: dev.to).
6. **Plugin lifecycle hooks** — `Hooks` interface (src: opencode-book 13.1): `event({event})` (receives `session.created/deleted/diff/error/status/idle/compacted/updated` (src: opencode.ai/docs/plugins)), `tool.execute.before/after`, `experimental.chat.messages.transform`, `experimental.chat.system.transform`, `experimental.session.compacting ({sessionID} → {context[], prompt?})` (src: github.com/sst/opencode/issues/5698), `config`, `permission.ask`, `tool`, etc. `trigger(name,input,output)` passes `output` by reference; compaction hook can append `context[]` or replace `prompt` entirely (src: opencode.ai/docs/plugins "When output.prompt is set..."). Session state tracking pattern uses `Map<sessionID, state>` keyed by `sessionID` (src: gist). Measured TGO event payloads: `session.created {info: Session{ id, parentID: null|id }}` primary iff `parentID===null` (docs/research/opencode-plugin-api.md:52-55). `subagent_depth` (default 1, TGO sets 2) walks parent chain and fails `Subagent depth limit reached` (+ docs/research/opencode-plugin-api.md:61).

## 1. Per-system survey (14 systems, 6 dimensions each)

### 1) OpenCode native (highest leverage)

- **SESSION REUSE:** `task(task_id: ses_...)` resumes same subagent session; `task_id` optional, fresh if omitted. V1 `task` supports resume; V2 `subagent` currently does NOT (returns ID but no resume/steer).
- **FRESH-VS-CONTINUE:** Default fresh per `task` call; continue only if caller passes prior `task_id`. Phil: phase-parallel `task` per unit of work, no implicit reuse — presenter must summarize and re-inject context manually (issues 6584 workaround).
- **SHARED CONTEXT:** Child sessions start fresh; no inherited transcript. Parent context stays in parent; child returns single text handoff rendered via `renderOutput({sessionId, state, text})`. Optional compaction hook `experimental.session.compacting` lets plugins inject domain context (bead ID, file reservations, swarm mail) into summary.
- **STALL PREVENTION:** No built-in heartbeat; TGO's `WatchdogController` fills gap (wall-clock/idle/stuck-loop + sleep correction). Upstream has org `subagent_depth` + `steps` caps only.
- **TERMINATION GUARDS:** Hard `steps` cap (tool removal + summarize prompt); `subagent_depth` depth cap; token-based auto-compaction (size-triggered, not relevance); `MAX_STEPS-1` loop kicker via system+assistant prompt (PR 4062).
- **RECOVERY:** On `steps` hit: forced text summary of work + recommended remaining tasks, not error; caller decides resume via `task_id` or fresh delegation. On compaction: checkpoint + replay of last user message; if summary lossy, recovery depends on summary quality (irreversible for active context).

### 2) oh-my-opencode-slim (prompt-driven scheduler on OpenCode)

- **SESSION REUSE:** Explicit reuse via `task_id` = `session/alias`. Plugin maintains `BackgroundJobBoard` (`task ID, specialist, objective, state, resultSummary`) injected each turn as system-reminder (docs/research/oh-my-opencode-slim.md:13-21). "Reusable Sessions" list when `total read context ≤ maxContextLines=50000` and `maxSessionsPerAgent=2`; orchestrator must pass `task_id` to resume to save tokens (40-41).
- **FRESH-VS-CONTINUE:** Orchestrator prompt decides; reuse only if listed as reusable (size/cap checks) and task is follow-up; otherwise spawn fresh. Amendments to active tasks queue in parent, not patched in-flight.
- **SHARED CONTEXT:** Three channels: in-prompt job board (primary), reusable-session context, files on disk (`.slim/deepwork/<slug>.md`, reflections). Subagents receive only self-contained task prompt (Task Prompt Contract) — isolation by design (35-44).
- **STALL PREVENTION:** Foreground-fallback manager (rate-limit failover), phase-reminder injection, wall-clock background-task supervisor (opt-in), one-shot "continue on idle" nudge (opt-in beta) (24). Task-fit rejections (`task-rejection.ts`) as routing signal avoid stuck misrouted work (32).
- **TERMINATION GUARDS:** Inherits OpenCode `steps` + `subagent_depth`; adds scheduler-level wall-clock supervisor and board-level reconciliation on idle. No token-budget guard of its own.
- **RECOVERY:** Completion hook-driven: background-task results injected terminally; idle-reconciliation marks `completed/error/cancelled/reconciled`; orchestrator re-dispatches follow-ups; `task_id` resume pulls full prior context instead of re-sending prompt (19 + issue 27827 workaround).

### 3) ruflo (ruvnet/ruflo, meta-harness on Claude Code/Codex)

- **SESSION REUSE:** Subagents spawned via `agent_spawn`/`agent_execute`/`Task run_in_background:true`; swarm queen delegates workers; `ruflo-rvf` saves/restores full agent memory across sessions/machines in portable RVF format (docs/research/ruflo.md:42-44). No transparent `task_id` resume — RVF is explicit export/import.
- **FRESH-VS-CONTINUE:** Router (`hooks_route` ~89% accuracy) picks agent profile per incoming task; learned routing, not session affinity. Workers ephemeral, spawned/killed per task (32-37).
- **SHARED CONTEXT:** Shared message history at host level + persistent namespace-routed vector memory (AgentDB/SQLite+HNSW, 15 `agentdb_*` tools) with strict `<plugin-stem>-<intent>` namespaces (`patterns, tasks, swarm-state...`) (40-44). Cross-session: Claude memory bridged to AgentDB, federation sync, IPFS pattern transfer.
- **STALL PREVENTION:** Autopilot pairs Claude `/loop` + `ScheduleWakeup` with 270s cache-aware heartbeat; swarm health via `Watchdog`-like 12 auto-triggered loop-workers (audit/optimize/testgaps on timers) (27-28,68).
- **TERMINATION GUARDS:** Topology limits (`maxAgents 6-8`, `hierarchical`/`hierarchical-mesh`), specialized non-overlapping roles, Raft consensus; `max_consecutive`-style limits not explicit — relies on topology caps.
- **RECOVERY:** Workflow state machines (`workflow_*` declarative, resumable, approval gates) + GOAP replanning from current state on failure (A* shortest path) + pending writes recovery via AgentDB namespaces (25-26).

### 4) BMAD-method (process/skills methodology, not runtime)

- **SESSION REUSE:** N/A — no execution engine. "Agent" is a host IDE session following `SKILL.md` workflow; `bmad-build-auto` writes machine-readable spec status (`draft/ready-for-dev/in-progress/in-review/done/blocked` + `deferred[]`) so *external orchestrator* can resume without parsing chat (docs/research/bmad-method.md:19). Re-derives `SPEC.md` from append-only `.memlog.md` each run.
- **FRESH-VS-CONTINUE:** Workflow's first step detects incoming message names a spec and resumes at matching stage; otherwise routes to smallest safe path (one-shot vs plan-code-review) (18,25).
- **SHARED CONTEXT:** Durable documents on disk as state bus: `planning_artifacts/` + `implementation_artifacts/` (`sprint-status.yaml`, `CONTEXT.md` predicate fact-store, `epic-<N>-context.md`) (29-34). Subagents context-free (reference file only) + digests written to disk as they land (crash-resumable) (34).
- **STALL PREVENTION:** N/A — no autonomous loop; stall is human process stall, mitigated by `sprint-status.yaml` + never-downgrade merge via `sprint_plan.py`.
- **TERMINATION GUARDS:** Spec-frontmatter `status` + `blocked` condition codes as machine guards; review findings `deferred` (non-blocking) vs `blocked` (19).
- **RECOVERY:** Append-only log: re-render spec from `.memlog.md`; sprint status persisted, so any run resumes from disk; subagent digests accumulated on disk (30-31).

### 5) GSD (get-shit-done / gsd-core, meta-prompting framework)

- **SESSION REUSE:** None by default — each step spawns specialist with fresh 200k-token context via `gsd-tools.cjs init`. Continuation agents spawned fresh with `<completed_tasks>` context after `## CHECKPOINT REACHED` (20). Cross-session memory via optional MemPalace temporal KG + file bus.
- **FRESH-VS-CONTINUE:** Orchestrator (thin Markdown workflow) decides routing pre-scripted per step; `STATE.md` spine records active milestone/phase + completed plans; survives `/clear`/context resets (11-14,26).
- **SHARED CONTEXT:** All shared state files in `.planning/` (`PROJECT.md, REQUIREMENTS.md, STATE.md, CONTEXT.md, RESEARCH.md, PLAN.md, SUMMARY.md...`) (25). Artifact routing table explicit per consumer; parallel-write safety via `O_EXCL` lockfile (`STATE.md.lock`, 10s stale, spin+jitter) (28). Node `CONTEXT.md` predicate `CLASS.subkey=value` fact-store.
- **STALL PREVENTION:** Human checkpoints `type="checkpoint:human-verify|decision|human-action"` → executor returns `## CHECKPOINT REACHED` with table, orchestrator spawns continuation (20). Dynamic model-tier escalation on orchestrator-detected soft failure (37). Loop Host Contract 12 hooks define agent roles per phase (14).
- **TERMINATION GUARDS:** Completion markers regex (`## PLANNING COMPLETE` etc.) as deterministic termination per phase (12); 4 gate types (Confirm/Quality/Safety/Transition); byte-budget ceilings on workflow files (38k/54k/90k) (47,57).
- **RECOVERY:** File bus is checkpoint: next agent always starts from persisted verified artifacts, not reconstructed memory; `STATE.md` lock ensures no lost updates; broken-windows ledger `.planning/WINDOWS.md` blocks `/gsd-ship` while open (30).

### 6) oh-my-pi (omp/pi, harness + SDK)

- **SESSION REUSE:** `task` tool `tasks[]` with self-contained brief + optional `outputSchema`; subagents start blank, no history. Swarm YAML (`waits_for/reports_to`) builds DAG → waves (topo sort), each agent via `runSubprocess` — no implicit session resume. Vibe-mode persistent keep-alive workers are exception (15-19,28).
- **FRESH-VS-CONTINUE:** Fresh by default; `local://` URIs + structured output (`agent://<id>/field`) + IRC for live peer coord (32). Magic keyword `orchestrate` injected as hidden system notice turns main agent into orchestrator for one turn (decompose→parallel `task` batch→verify→respawn fix-ups) (18-19).
- **SHARED CONTEXT:** Shared workspace filesystem (signal/structured-output/tracking files) + hub tool (message live agents, wait/cancel background jobs) + `local://` large-payload refs (32). Parent JSONL session compaction strategies: LLM summarization, `snapcompact` (history → bitmap PNG frames), `shake` (elide to `artifact://`), `handoff` (new session + doc) (33).
- **STALL PREVENTION:** `followUp()/steer()` mid-turn injection; Swarm orchestrator waits per wave; background jobs auto-deliver via hub; monitor + `ask` picker for human-in-loop (11-14). No heartbeat — stall surfaces as missing `agent://` output.
- **TERMINATION GUARDS:** Spawn policy allowlist `task.maxRecursionDepth=2`, blocked-self-recursion guard, `outputSchema` validation (per-task JSON Schema) (28).
- **RECOVERY:** `checkpoint`/`rewind` (session tree branch/fork `/tree`), `retain/recall/reflect/memory_edit/learn` local memory pipeline (→ `MEMORY.md` + `memory_summary.md` + generated `skills/`) injected as Memory Guidance at session start (34-35).

### 7) opencode-fusion (Devin Fusion sidekick pattern in OpenCode config)

- **SESSION REUSE:** No reuse — sidekick sessions ephemeral, "shares none of your conversation context", hence required five-part Spec contract + REPORT. Transcript *is* shared between primary agents (`build` ↔ `normal`) as caveat (32).
- **FRESH-VS-CONTINUE:** Always fresh delegation via `task` allowlist; main `build` denied `edit/grep/glob/list` so delegation is only path to disk (permission-enforced) (16-18,51). Human approval per `git commit/push`.
- **SHARED CONTEXT:** File-bound: diff + verbatim dictated patch + self-contained packets; no shared history — executor gets Objective/Files/Interfaces/Constraints/Verification Spec, returns `STATUS/CHANGES/VERIFIED/GAPS` (12,30-31,52).
- **STALL PREVENTION:** Escalation ladder coded in prompt: (1) re-delegate with feedback, (2) dictate verbatim patch, (3) revise plan; reverse `STATUS: escalate` to named role bounces misrouted work fast (17,27,53). Subagents cannot spawn beyond `subagent_depth:2`.
- **TERMINATION GUARDS:** Permission graph (main cannot edit) + prompt-only cost discipline; no `steps` override — relies on OpenCode defaults.
- **RECOVERY:** `fusion-audit` logs delegation tree + per-agent token/cost via session DB (checkable "did it really delegate?") (33-34). Miss → re-delegate verbatim patch.

### 8) Gastown (gastownhall, workspace manager for Claude Code / Copilot)

- **SESSION REUSE:** Bead/hook model replaces session resume. Town (`~/gt/.beads/` `hq-*`) + rig (`<rig>/mayor/rig/.beads/`) two-level ledger. Workers are **polecats** (ephemeral) vs persistent **Witness/Refinery/Mayor/Deacon**. Polecats git worktrees from `mayor/rig` share object store. Session continuation via `gt seance` — discovers previous sessions via `.events.jsonl` logs to query predecessors (gastown README "Seance") + `gt prime` context recovery + `/handoff` refresh (glossary).
- **FRESH-VS-CONTINUE:** Work pinned via `bd pin --for <agent>` + `gt sling <bead-id> <rig>` → Hook queue; `bd hook` shows pinned work (coordination). Convoy batches beads across rigs with dependencies. Fresh polecat per bead; Witness decides continue vs sling new.
- **SHARED CONTEXT:** Beads ledger (git-backed hooks) is shared bus — issue state, MRs, molecules (durable chained beads) survive restarts. Routes `routes.jsonl` (`prefix → rig`) enable cross-rig transparent `bd show`. Mailboxes + `gt mail check --inject`.
- **STALL PREVENTION:** **Witness** per rig monitors polecat health, detects stuck agents, triggers nudge/handoff/cleanup + tracks completion; **Deacon** daemon patrols all rigs; **Dogs** for batch maintenance (gastown README + architecture). `gt feed --problems` TUI for stuck detection. Convoys labeled `mountain` get autonomous stall detection + smart skip.
- **TERMINATION GUARDS:** Bead status lifecycle (`Created→Active→Suspended→Completed→Archived`), convoy budgets, Witness enforces `maxAgents`-style caps via sling policy (hook lifecycle).
- **RECOVERY:** Git worktree persistence + `seance` query + `gt patrol` recovery; failed `suspended` sessions preserve filesystem for next attempt; molecules survive restarts (+ modal-devin parallel).

### 9) Claude Code / Claude Agent SDK (Anthropic first-party)

- **SESSION REUSE:** Session = conversation history persisted to `~/.claude/projects/*/<id>.jsonl`. Reuse via `claude --continue` (most recent in dir), `claude --resume <id>` / `/resume` picker, or SDK `ClaudeAgentOptions{ continue_conversation, resume: sessionId, fork_session, resume_session_at, resume_drops_turn }` (src: code.claude.com/docs/en/agent-sdk/sessions + sessions). `fork_session` = copy transcript to new ID, original untouched. SDK `ClaudeSDKClient` auto-reuses same session across calls vs `query()` fresh by default.
- **FRESH-VS-CONTINUE:** `--continue` = most recent in cwd (no ID); `resume` = specific ID (required for multi-tenant / non-most-recent); `fork_session` = branch to try alternative without losing original (aiskillcerts comparison). CLI hides `-p`/SDK/`/loop`/background sessions from `continue` picker.
- **SHARED CONTEXT:** Conversation persists, not filesystem — file snapshots via checkpointing feature ("Sessions persist the conversation, not the filesystem"). Shared via filesystem/branch handoffs. `SessionStore` adapter (append/load/listSessions) mirrors JSONL to S3/Redis/DB for cross-host resume; `projectKey` encodes cwd (session-storage).
- **STALL PREVENTION:** Idle more than ~1h + >100k tokens → resume dialog with cache-expired cost warning (sessions "On a Pro or Max plan..."). Hooks: `PreCompact` receives `trigger manual/auto`.
- **TERMINATION GUARDS:** `max_turns`, `max_budget_usd` + error subtypes `error_max_turns` / `error_max_budget_usd` (agent-loop). Auto-compaction when context window nears limit; emits `compact_boundary` system message. `CLAUDE.md` re-injected every request so rules survive compaction. `maxTurns`/`effort` + `thinking` knobs.
- **RECOVERY:** On limit hit: catch error, resume with higher `max_turns`/`max_budget_usd` to continue same session (agent-loop example). Resume offers *resume from summary* (run `/compact` now, replace history with summary + 5 recent files) vs *resume full as-is* (re-cache full history) (sessions dialog). `resume_session_at` truncates to message UUID with safety check `resume_drops_turn`. `getSessionMessages` returns post-compaction chain (503 raw → 18 visible); raw via `store.load`.

### 10) LangGraph (+ Deep Agents harness)

- **SESSION REUSE:** `thread_id` (= `config.configurable.thread_id`) is persistent cursor; reusing same `thread_id` resumes same checkpoint thread, new value starts brand-new thread (langgraph/interrupts). Checkpointer (e.g. Postgres, SQS) required for `interrupt()`. Functional API `@entrypoint(checkpointer=InMemorySaver())` restores task results from checkpoint instead of recomputing.
- **FRESH-VS-CONTINUE:** Fresh unless same `thread_id` (and optionally `checkpoint_id` to replay from super-step boundary) passed (checkpoint/README). `Command(resume=...)` is only Command intended as `invoke()` input.
- **SHARED CONTEXT:** Two layers: **checkpointer** (thread-scoped graph state snapshots per super-step — short-term) + **store** (cross-thread namespaced key/value — long-term) (persistence). Pending writes per node within super-step (`checkpoint_writes` table) prevent re-running successful nodes on resume (checkpointers).
- **STALL PREVENTION:** `interrupt(value)` pauses indefinitely, saves state, surfaces payload on `stream.interrupts` (`stream.interrupted=true`). Nodes re-run from beginning on resume but completed `@task` results replay from checkpoint — must keep non-deterministic side effects inside `@task` + idempotent.
- **TERMINATION GUARDS:** Default recursion limit 1000 super-steps caps runaways; checkpointer modes `exit`/`async`/`sync` trade durability vs perf; deterministic pruning not relevance-based, but store compaction possible. Human approval via conditional edge routing back to interrupt node (avoid `while True+interrupt()` exponential replay).
- **RECOVERY:** `graph.invoke/replay` from `checkpoint_id`; time-travel debugging; pending writes avoid duplicate work; Deep Agents adds isolation — subagents quarantine heavy context, coordinator sees only final report + filesystem offload (>20k tokens → file ref + preview) + summarization at ~85% window keeping ~10% recent (docs/research/langgraph.md:27-29) + `experimental.session.compacting`-like prompt injection.

### 11) AutoGen (AgentChat GroupChat)

- **SESSION REUSE:** No implicit cross-run session; `run()`/`run_stream()` reset termination state automatically after each run allowing `team.run(task="follow-up")` to resume conversation from where left off (microsoft.github.io). Agents themselves hold `max_consecutive_auto_reply` counter per agent.
- **FRESH-VS-CONTINUE:** Fresh `GroupChat` per construction; continue by reusing same `Team` instance and calling `run()` again; termination conditions auto-reset.
- **SHARED CONTEXT:** Single group-chat message list (all `BaseAgentEvent|BaseChatMessage` routed through `GroupChatManager`); `AgentMemory` optional but shared context is just the chat history, not separate blackboard. Newer `MemoryStore` exists but not core.
- **STALL PREVENTION:** `MaxConsecutiveAutoReply`/`max_consecutive_auto_reply` (default 15 in 0.2+, per-agent) stops infinite loops; must set on *all* participants — setting only on `UserProxyAgent` leaves `AssistantAgent` unbounded (max_consecutive). Human `input_mode=ALWAYS/TERMINATE/NEVER` controls handoff when limit hit. Production pattern: Redis watchdog on `conv:{id}:heartbeat` with 30s expiry → publish `TIMEOUT_RESET` (architecture).
- **TERMINATION GUARDS:** Composable `TerminationCondition` base class + built-ins: `MaxMessageTermination`, `TextMentionTermination("TERMINATE")`, `SourceMatchTermination`, `HandoffTermination`, combinators `&`/`|` with `reset()` (termination). Overuse of high `N` (50-100) discouraged — fix task ambiguity instead.
- **RECOVERY:** On `max_consecutive` hit: `input()` pause requires human; `TERMINATE` human mode ends; `NEVER` auto-continues. On crash: idempotent handlers + external Redis bus allow safe retry; `TerminationCondition.terminated` flag must be `reset()` before reuse (base termination).

### 12) CrewAI

- **SESSION REUSE:** Crew-level `memory=True` creates default `Memory()` shared across agents; long-term persists across runs (LanceDB + `text-embedding-3-large`), short-term per run (docs.crewai.com/en/concepts/memory). `Crew(memory=Memory(...))` custom config; persisted via `LanceDBStorage`, TTL/compaction optional.
- **FRESH-VS-CONTINUE:** Fresh crew launch by default; continue by reusing same `Memory` instance (reads cross-thread). No session ID — continuity is via memory recall, not transcript replay.
- **SHARED CONTEXT:** Unified `Memory` (replaces ShortTerm/LongTerm/Entity/External) — three-channel: LLM-analyzed `scope/categories/importance` on `remember()`, adaptive-depth `recall()` (composite `semantic*0.5 + recency*0.3 + importance*0.2`, recency half-life 30d), hierarchical scopes `/project/alpha` + `MemorySlice` multi-scope views + `extract_memories()` atomic fact decomposition (unified_memory.py + PR 4420). Memory TUI `crewai memory`. Knowledge sources separate from memory.
- **STALL PREVENTION:** Agent-level `maxIter` + `maxExecutionTime` per `Agent`; crew iteration caps; `CacheHandler` deduplicates expensive calls.
- **TERMINATION GUARDS:** Per-agent `maxIter` (default 25) + crew `maxRPM` + `embedder` token limits; budget not enforced globally — rely on `maxIter`/`maxExecutionTime`.
- **RECOVERY:** No checkpoint graph; recovery via memory consolidation: similarity search detects near-duplicates/contradictions, merges/updates/deletes automatically on save (crewai cognition blog). Failure → rerun tasks, memory already holds prior atomic facts.

### 13) Cursor background/cloud agents

- **SESSION REUSE:** Cloud agents via `POST /v1/agents` + `GET /v1/agents/{id}/runs/{runId}` (v1 lifecycle split: `status ACTIVE/ARCHIVED` vs run `RUNNING/FINISHED/ERROR`) (forum cursor 168957). Local SDK `Agent` inline Node with `SqliteLocalAgentStore run_events`. No transcript resume — new prompt starts fresh run.
- **FRESH-VS-CONTINUE:** Always fresh `v1/agents` creation; reuse via same branch/filesystem, not session. `double Ctrl+B` backgrounds shell; headless waits for background work emitting `stream-json` events (changelog).
- **SHARED CONTEXT:** Git branch + workspace files; MCP context; cloud ephemeral VM not linked to local disk until `autoCreatePR`.
- **STALL PREVENTION:** HTTP/2 keepalive pings, stalled-stream detection with persistent retries, transport fallback HTTP/2→HTTP/1, `stall.stale_completion_dropped` reconciliation bug known (tool `running` → never `completed`, run stays `RUNNING` forever without signal) (@cursor/sdk 1.0.23 bug). Current mitigation: external out-of-process watchdog polling `run_events` + `run.cancel()` + `configureCursorSdk({local:{useHttp1ForAgent:true}})`.
- **TERMINATION GUARDS:** Wall/idle timeouts server-side (undocumented), stream stall retry cap → `"Connection stalled repeatedly"` `ConnectError` (often not propagated to run status).
- **RECOVERY:** Background task completion notification not reconciled if generation mismatch → must external-watchdog `run.cancel()`; cloud `updatedAt` freeze indicates lifecycle migration v0→v1, not hang — check `runs/{runId}` status instead.

### 14) Devin (Cognition, Dynamic Workflows)

- **SESSION REUSE:** Sessions have `session_id`, `parent_session_id`, `child_session_ids` (docs.devin.ai API SessionResponse). Orchestrating workflow script is deterministic Python; each `agent()` call hashed (prompt+schema+settings) → completed agents replay instantly from recorded result on resume; only unfinished reruns (docs.devin.ai/work-with-devin/dynamic-workflows). `Devin worker start` self-generates `acceptor_id` per machine, claimed atomically (`409` if lost race).
- **FRESH-VS-CONTINUE:** Workflow determinism rule: prompts must not depend on time/randomness/env/fs — external inspection belongs *inside* `agent()`. Editing prompt re-runs that agent + downstream; timeout/interrupt resume via `runId` (budget max 7 days). Suspended sessions preserve filesystem for next attempt; failed preserve recovery data (modal-devin session lifecycle).
- **SHARED CONTEXT:** Per-agent VM by default (isolated filesystem, git branch handoff → branch name in structured output); `isolated=false` runs on orchestrator machine sharing working tree with lower resource cap, no isolation (parallel unsafe). Knowledge (cross-session memory from READMEs/.rules) injected per session.
- **STALL PREVENTION:** Outposts watch queue + claim deadline (`status.claim_deadline`) — expired claims return to queue; duplicate invocations exit safely; at-least-once delivery upsert by `session_id` (outposts/orchestration). Modal Sandbox readiness + derived function timeout (`session_function_timeout_seconds`).
- **TERMINATION GUARDS:** ACU budget (Agent Compute Units per action class: planning/context/execution/browser/code), timeout default 12h, 7-day run budget; `status_detail` enums `working/waiting_for_user/waiting_for_approval/finished/inactivity/.../usage_limit_exceeded`.
- **RECOVERY:** Structured `status` (`new/claimed/running/exit/error/suspended/resuming`) + `structured_output` validated JSON; suspend/resume with filesystem snapshot; failure `error` state requires web/API resume; Temporal-like workflow replay (deterministic script + Activities as agents) — non-idempotent external tools must use idempotency keys (agentmarketcap/temporal).

## 2. Comparison table (system × dimension — concise)

| System | 1 Session reuse | 2 Fresh-vs-continue policy | 3 Shared context | 4 Stall prevention | 5 Termination guards | 6 Recovery paths |
|---|---|---|---|---|---|---|
| **OpenCode v1/v2** | `task_id=ses_...` resume; v2 subagent none | fresh default; continue iff task_id | fresh child; parent handoff text only; compaction hook injection | none upstream; TGO Watchdog wall/idle/stuck-loop | `steps` hard text-only + depth + token auto-compact | summary+recommendations; resume via task_id; checkpoint replay |
| **oh-my-opencode-slim** | board Aliases + `task_id` reuse (≤2/specialist, ≤50k lines) | orchestrator decides; reusable → resume else fresh | job board + reusable sessions + `.slim/deepwork` files | wall-clock supervisor + idle nudge + task-fit rejection | inherit OpenCode + board reconciliation | hook-driven result injection + idle reconciliation + reroute |
| **ruflo** | RVF export/import across machines | learned router (~89%) → spawn fresh worker | host history + AgentDB namespaced vector memory (HNSW) | 270s heartbeat + 12 loop-workers | topology maxAgents 6-8 + hierarchical Raft | resumable workflows + GOAP replanning + AgentDB pending |
| **BMAD** | file-status resume (spec `status`) | step-01 detects spec name → resume stage | durable docs + spec kernel + sprint-status.yaml | n/a (process gate) | status `blocked` + deferred vs blocked | re-derive from `.memlog.md` + disk digests |
| **GSD** | fresh 200k context per step; continuation agent | workflow pre-scripted waves + STATE.md spine | `.planning/` file bus + O_EXCL lock + predicate facts | checkpoint human-verify gate + dynamic tier escalation | markers `## ... COMPLETE` + gate system + byte caps | file bus persists; WINDOWS.md ledger blocks ship |
| **oh-my-pi** | blank subagents; Swarm waves fresh | fresh default; hub/IRC for live peers | workspace FS + local:// refs + structured `agent://` outputs | followUp/steer + wave wait + hub cancel | maxRecursionDepth 2 + schema validation | checkpoint/rewind + retain/recall/learn → skills |
| **opencode-fusion** | none (ephemeral sidekick) | always fresh; permission-enforced delegation | file diff + verbatim patch + 5-part Spec | escalation ladder (re-delegate→dictate patch→revise) | permission graph (main cannot edit) | re-delegate + audit log (delegation tree) |
| **Gastown** | bead/hook + `gt seance` predecessor query | pin `bd pin --for` + `gt sling`; fresh polecat per bead | git-backed beads (town+rig) + routes.jsonl + mail | Witness/Deacon/Dogs patrol + `gt feed --problems` | bead lifecycle Created→Archived + convoy budgets | git worktree + seance + molecules survive restart |
| **Claude SDK** | `--continue`/`resume id`/`fork_session` + `resume_session_at` | continue=recent in dir; resume=specific id; fork=copy | conversation JSONL + file checkpointing + SessionStore adapter | 1h/>100k cache dialog + PreCompact hook | `max_turns`/`max_budget_usd` + auto-compact 85%+ buffer | limit → resume higher; summary vs full; store mirror |
| **LangGraph** | `thread_id` cursor + `checkpoint_id` replay | same thread → resume; new thread → fresh | checkpointer (per-thread) + store (cross-thread) + writes table | `interrupt()` indefinite + stream.interrupts | recursion 1000 + checkpointer modes sync/async/exit | replay from checkpoint; pending writes skip; Deep Agents offload |
| **AutoGen** | reuse Team instance; run() auto-reset | fresh GroupChat; same Team → continued chat | group-chat message list (no blackboard) | max_consecutive_auto_reply 15 + heartbeat watchdog 30s | composable TerminationCondition Max/Text/Source/Handoff | human input pause; idempotent retry + reset() |
| **CrewAI** | cross-run `Memory()` (LanceDB) | fresh crew; continuity via memory instance | unified Memory (composite scoring + scopes/slices + extract) | maxIter 25 + maxExecutionTime + RPM | per-agent caps, no global budget | consolidation merge/update/delete on save |
| **Cursor** | none (new run per prompt; branch FS) | always fresh v1/agents | git branch + run_events SQLite + MCP | keepalive pings + stale_completion bug → watchdog cancel | server timeouts + stall retry cap | external poll + cancel; check runs/{id} not status |
| **Devin** | hash-keyed agent replay; acceptor_id claim 409 | workflow determinism; runId resume 7d | per-VM isolate or shared tree + Knowledge store | claim deadline expiry → queue return | ACU + 12h timeout + status_detail enums | filesystem snapshot + Temporal workflow replay |

## 3. Recommendations for TGO (ranked, with tradeoffs)

**Context:** Bernstein is orchestrator; Dylan sole writer (allow edit/bash), Nas/Horowitz read-only. TGO wants no slash commands, named roster, concise output, agentic autonomy.

**R1 — Replace hard `steps:20` with soft guard + token/budget guard (highest leverage).**
Raise `steps` to 80–120 for Dylan/explore, keep 20 only for fast probes (e.g. Horowitz would never hit it). Add token-budget guard via `chat.params`/`experimental.session.compacting` hook estimating tokens (like Claude `max_budget_usd`) and a concise wall-clock cap. Tradeoff: costs rise but long tasks stop dying mid-edit; mitigated by concision band + pruning. Cite: OpenCode `steps` = hard text-only, not arch-dependent budget; Devin ACU + Claude budget are softer.

**R2 — Introduce explicit `task_id` session-reuse primitive for Bernstein.**
Expose `task_id` passthrough in TGO delegation shim: Bernstein delegates `task(dylan, ..., task_id?)`; board stores `sessionId` per bead; follow-up on same bead passes its `task_id` so Dylan continues with full filesystem+tool history instead of fresh 20-step window. Adopt oh-my-opencode-slim pattern: reusable only if `total context ≤ maxContextLines` and last tool success, else spawn fresh. Tradeoff: complexity (need BoardShim `sessionId` map + compaction-aware keep) vs 30-50% token saving on multi-phase features and fixes long-running kill. Workaround today documented as manual context injection loses nuance (issue 6584). Keystone shipped 2026-08-27 (tgo-1pv): .tgo/sessions.json map, task tool capture, board hint injection, context-size guard, capability probe.

**R3 — Fresh-vs-continue heuristic for Bernstein (policy, prompt-level).**
*Continue* iff: same `issueId` + same `Files` touch set + last report `partial` with completionSafe=false + bead still `in_progress` and age <1h. *Fresh* iff: new issue, or `Files` set changed >30%, or last session compacted (tail_start_id moved), or `GAPS` indicates context loss. Inject as lane-card rule (like GSD `CONTEXT.md` predicate). Tradeoff: prompt-only, no code, but needs evaluation; prevents stale-context contamination (CrewAI composite recency vs importance tension).

**R4 — File-backed shared context upgrade (STATE.md–style).**
Current TGO shared context = board injection + bead metadata. Add per-issue `.tgo/<issueId>/progress.md` (objective, touch set, decisions, blockers) written by Dylan, read by Bernstein/Horowitz, surviving compaction via `experimental.session.compacting` context append (swarm example). Use `O_EXCL` lockfile like GSD for parallel Dylan protection. Tradeoff: disk churn vs survives `/clear`/compaction and enables `gt seance`-like predecessor query.

**R5 — Retune Watchdog, keep as primary stall prevention.**
Current: wall-clock/idle/stuck-loop already mirrors SWE-agent/LangGraph idle_timeout. Tune: `wallClockMs 20m→30m` (baseline already moves to last foreground tool completion, test-9 fix); `idleMs 15m` is already generous for long `bash` (toolInFlight pauses idle) — leave or raise only if false aborts observed; `stuckLoopTools` is already 20 with `stuckLoopMs 5m` — consider requiring sustained non-progress across the full window before aborting. Add heartbeat injection (`notifyParent` already) plus Beads `bd comment add` on abort for audit. Tradeoff: longer stalls waste tokens vs fewer false aborts on productive test-9-style 196-tool runs.

**R6 — Termination guards: complement `steps` with composable conditions (AutoGen-style).**
Add Beads-aware `TextMentionTermination` (`STATUS: complete` + `exitGate:true`) + `MaxMessageTermination` per lane, combined `OR` (like AutoGen `max_msg | text_termination`). Bernstein's `delegation.ts` already validates `exitGate:boolean` + completionSafe; promote to runtime termination condition that the plugin checks on `tool.execute.after` before counting steps. Tradeoff: more config surface vs fewer premature hard caps.

**R7 — Recovery: checkpoint-and-resume with Graceful Handback.**
On guard hit or Watchdog abort: (a) persist partial `REPORT` (STATUS partial + CHANGES + GAPS) to `.tgo/<id>/progress.md`, (b) set Beads label `blocked` + recovery `reroute` (as `lifecycle.ts:65` recovery already does), (c) Bernstein re-dispatches narrower touch set, *reusing* old `task_id` only if progress file shows <50% context. Borrow Devin hash-keyed replay: if re-dispatched Spec hash unchanged, replay prior tool results from board without re-running. Tradeoff: needs progress file + BoardShim persistence vs clean resume-from-checkpoint like LangGraph pending writes.

**R8 — Preserve for deep runs: per-lane model variant + `compaction.keep.tokens` lift.**
Use TGO presets (opencode-plugin-api.md verified) to put strongest model on Dylan planning steps, cheapest on Nas exploration (like oh-my-opencode-slim pantheon). Set `compaction.keep.tokens 8000→15000` for Dylan sessions to retain recent diff context across compaction (lossy 4096 cap is bottleneck, dev.to). Tradeoff: larger keep → earlier next compaction. Verified 2026-08-27: V1 (opencode 1.18.23) honors compaction auto:false on overflow — hard ContextOverflowError, no rescue (PR #17936); V2 overflow recovery fires even with auto:false and keep.tokens applies there. R8 is V2-only relevance.

**R9 — Guardrail for V2 transition.**
If TGO moves to opencode v2 `subagent` tool, prepare shim for missing `task_id` resume (track upstream issue 36423) — fallback to file-bus + fresh spawn until upstream lands resume/steer. Tradeoff: temporary code debt vs future-proof.

## Verified

- `steps:20` in `plugin/assets/agents/dylan.md:5`, `nas.md:5`, `horowitz.md` frontmatter.
- Watchdog wall/idle/stuck/sleep-corrected logic, `WATCHDOG_ABORT_MARKER` (plugin/src/watchdog.ts:1-350).
- `isPrimarySessionData parentID===null` + `SessionReconciler` (plugin/src/session.ts).
- Lifecycle/delegation packet validation (plugin/src/lifecycle.ts, delegation.ts).
- Prior research NOT covering lifecycle — re-read all 8 `docs/research/*.md` to avoid duplication; deepened with session lifecycle per prompt.
- OpenCode `steps` description + tool-removal summarization; `task_id` resume description + creation logic; `subagent_depth:2`, background env gate, `session.created parentID` live probe (docs/research/opencode-plugin-api.md:54-60).
- Compaction checkpoint model (buffer/keep/tail, lossy 4096, prune protect 40k) (src: opencode.ai/v2/docs/compaction, deepwiki, dev.to).
- Plugin hooks list + `experimental.session.compacting` prompt override (src: opencode.ai/docs/plugins, opencode-book 13.1/13.2, sst/opencode#5698).
- Per-system docs as cited in table.

## Gaps

1. OpenCode native — precise `steps` counter granularity (per tool-call vs per assistant turn) not exhaustively verified beyond "agentic iterations"/super-step wording; exact prompt injected at cap (`max-steps.txt`) not fetched — marked as summarization+recommendations only.
2. OpenCode v2 — `subagent` resume/steer truly absent vs roadmap timing — verified via issue 36423 (open, no merge) but no official v2 changelog stating ETA; no plugin hook to emulate resume in v2 besides file bus.
3. Watchdog default thresholds — RESOLVED 2026-08-27: defaults read from plugin/src/config.ts:60-67 — wallClockMs 20m, idleMs 15m, checkMs 10s, stuckLoopTools 20, stuckLoopMs 5m.
4. Gastown — exact Witness/Deacon heartbeat intervals and `mountain` convoy stall thresholds not web-verified (docs truncated early on heartbeats; patrol cycle sec not cited) — treated as N/A-unknown, logic per architecture.
5. Cursor — server-side timeout/stall detection thresholds not public; client-side keepalive pings verified but run `RUNNING` zombie reconciliation remains bug (workaround only).
6. AutoGen/CrewAI — cross-thread long-term retention limits (TTL, vector DB compaction) not bounded in docs — assumed unbounded unless configured.
