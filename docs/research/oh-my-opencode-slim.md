# oh-my-opencode-slim — research notes

Sources:
- https://github.com/alvinunreal/oh-my-opencode-slim (README.md, master branch; ~7.7k stars, 468 forks)
- Repo source (cloned, master @ commit at research time): `src/agents/{orchestrator,index,explorer,oracle,designer,fixer,librarian,observer,council,councillor,council-agents}.ts`, `src/index.ts`, `src/config/{constants,schema}.ts`, `src/utils/background-job-board.ts`, `src/hooks/task-session-manager/board-injection.ts`, `src/skills/*/SKILL.md`
- `docs/{background-orchestration,configuration,project-local-customization,council,interview,tools,mcps,acp-agents}.md`
- `oh-my-opencode-slim.schema.json` (JSON schema for the plugin config)

Note: this is the *slim* OpenCode plugin ("oh-my-opencode-slim" / "OmO-slim") by alvinunreal / Boring Dystopia Development. It is the OpenCode-specific variant; the repo does not reference a separate larger "oh-my-opencode" codebase in its docs (README + all docs link only to the slim repo). Do not conflate with "oh-my-pi".

## (a) Core orchestration primitive

A **prompt-driven scheduler loop wrapped in OpenCode plugin hooks** — not a code control-flow graph. The central abstraction is the **Orchestrator agent**, which is a single foreground LLM whose system prompt turns it into a "scheduler", plus a runtime state structure called the **Background Job Board** that the plugin injects into that prompt.

Mechanically, control flows like this:

1. The plugin (`src/index.ts`) registers agents, tools (`cancel_task`, `wait_for_user`, `webfetch`, `ast_grep_search/replace`), MCPs (`context7`, `gh_grep`), and a set of OpenCode **hooks** (`chat.message`, `experimental.chat.messages.transform`, `tool.execute.after`, `session.status/idle` events, etc.).
2. The orchestrator LLM decides routing itself: its prompt (`buildOrchestratorPrompt` in `src/agents/orchestrator.ts`) instructs it to "plan, schedule, delegate, monitor, reconcile, and verify" and to dispatch specialists with `task(..., background: true)` — OpenCode's native background subagent tool. **Delegation is config/prompt-driven, not a code-level supervisor.**
3. A runtime **BackgroundJobBoard** (`src/utils/background-job-board.ts`) tracks each task as a record (task ID, specialist, objective, state, ownership, dependencies, result). It injects a `### Background Job Board` system-reminder snapshot into the orchestrator's outgoing messages each turn (`injectBackgroundJobBoard` in `src/index.ts:1348`), splitting jobs into **Active / Unreconciled** and **Reusable Sessions**.
4. Completion is **hook-driven**: OpenCode injects terminal background-task results; the plugin's idle-reconciliation hook then marks jobs reconciled. The orchestrator waits, reconciles results, dispatches follow-ups, routes verification, and only then replies.

The old blocking model ("orchestrator works directly → delegates → waits") was replaced wholesale by the scheduler model; there is **no legacy fallback** — background subagents are a hard runtime requirement (`OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true`).

Additional code-level loop machinery (all plugin hooks): a foreground-fallback manager for model failover on rate-limit/error, a phase-reminder injected each turn, a wall-clock background-task supervisor (opt-in), a one-shot "continue on idle" nudge (opt-in beta), and prompt injection of the background job board. So: orchestration logic lives mostly in the *LLM prompt*; the plugin enforces lifecycle and state.

## (b) Agent definition & delegation

**Definition.** Agents are defined in TypeScript factory functions (one per specialist, e.g. `createExplorerAgent`, `createOracleAgent`) whose `config.prompt` is a static system prompt (see `src/agents/*.ts` and the README "Pantheon"). Prompts are then *overridable* per user/project via three layers, resolved in code (`resolvePrompt` in `orchestrator.ts`, `loadAgentPrompt` in `config/loader.ts`): inline `prompt` in config > `<agent>.md` prompt file > built-in default; plus `_append.md` files always appended. Everything is re-composable in a **presets** system (`oh-my-opencode-slim.json` / `.jsonc`), where each named preset maps each agent to a model + variant + skills + mcps.

**Delegation.** Explicit and orchestrator-decided. The orchestrator prompt embeds per-agent "lane cards" (`@explorer`, `@librarian`, `@oracle`, `@designer`, `@fixer`, `@council`, `@observer`) with **Delegation Rules**: "Delegate when", "Don't delegate when", stats, and a rule of thumb. Custom agents can inject their own routing card via `orchestratorPrompt` in config. The orchestrator chooses who acts next; specialists are **reactive subagents** — they never self-start, and they are largely *passive* (execution only). Key disciplines encoded in the prompt: delegate anything non-trivial (never UI work), parallelize independent lanes, track task IDs, never reissue a rejected task unchanged, and a "direct work boundary" (orchestrator may only ask questions, read minimal context, run final checks).

A notable guardrail: **task-fit rejections** (`task-rejection.ts`). A specialist that receives out-of-role work must return a brief reason instead of doing partial work; the orchestrator treats that as routing input and must not retry the same task with the same specialist.

## (c) Context & shared-state passing

State flows through three channels:

1. **In-prompt Background Job Board** (primary). The orchestrator's working memory is a serialized snapshot of tracked tasks — alias (`exp-1`, `fix-2`...), native task ID, agent, state (`running/completed/error/cancelled/reconciled`), objective, ownership, and a `resultSummary`. Specialist outputs are described as "inputs, not final truth"; the orchestrator reconciles them against each other and the user goal. Board snapshots are injected as a system-reminder each turn with a `SENTINEL` marker and are strip-and-replaced to stay cache-safe (an append-only `checkpoint-compatible` mode exists for checkpoint workflows).

2. **Session reuse for context sharing.** Completed specialist sessions stay reusable (up to `maxSessionsPerAgent=2`, and only if total read context ≤ `maxContextLines=50000`). The board's "Reusable Sessions" section lists them, and the orchestrator must pass the session/alias as `task_id` to resume — context reuse saves tokens instead of re-spawning. Active tasks cannot be amended mid-run; amendments queue in the parent conversation.

3. **Files on disk for heavy state.** `deepwork` (SKILL.md) and `reflect` skills persist long-lived state in `.slim/deepwork/<slug>.md` (progress, phase plans, confirmed research findings, review gates) and `~/.config/opencode/oh-my-opencode-slim/reflections/sessions/*.json` — git-ignored, with explicit rules to reference files by path, not content. The plugin also reads OpenCode's SQLite DB for session archaeology.

There is no vector memory and no message-history compaction built in; isolation is by design — subagents get only their task prompt (must be self-contained per the "Task Prompt Contract"), and the orchestrator's context stays focused on decisions while worker detail lives in the board/reusable sessions. Human-in-the-loop is explicit: `wait_for_user` and `question` tools.

## (d) Roster philosophy

A **small, fixed, named pantheon of role-based specialists** — "seven divine beings" plus optional extras — deliberately *not* a single generalist and *not* unbounded dynamic spawning:

- Core seven: **Orchestrator** (delegator), **Explorer** (codebase recon), **Oracle** (architecture/review/debugging), **Council** (multi-model consensus), **Librarian** (external knowledge), **Designer** (UI/UX), **Fixer** (bounded implementation).
- Optional: **Observer** (visual/media analysis, disabled by default).
- Two dynamic mechanisms on top: `councillor-<seat>` subagents generated from `council.presets` config (one per model seat, hidden), and **custom agents** inferred from unknown `agents.<name>` config keys.

The philosophy is *role-per-job with model mixing*: each lane is bound to the model best suited for its cost/speed/quality profile (e.g. cheap flash model for Explorer/Librarian, strongest reasoning model for Oracle/Orchestrator), and presets let you swap the whole team's models at runtime with `/preset`. Designers/fixers are kept separate specifically because delegating UI to a coder degrades quality. Identities are strong (named personas with role/lore) but behaviorally lightweight — the persona is a routing/UX device, not added capability.

## (e) Skills & tools shipped

**Skills** (prompt-based playbooks, injected into an agent's system prompt only if granted; per-agent `skills` array with `"*"`/`!name` syntax). Eight bundled: `codemap` (hierarchical repo maps), `deepwork` (phased scheduler workflow with Oracle review gates + `.slim/deepwork/` progress file), `verification-planning` (plan an evidence path before non-trivial changes), `simplify` (behavior-preserving simplification, given to Oracle), `worktrees` (git worktree lanes), `clonedeps` (clone dependency source for inspection), `reflect` (turn repeated friction into reusable skills/agents/config; `/reflect --sessions` does SQLite session archaeology), and `oh-my-opencode-slim` (self-configuration). There is also a `loop-engineering` skill in source. Note the stated philosophy: **skills are stateless prompt playbooks; MCPs are running servers** — the plugin prefers skills and treats per-agent skill grants as permission checks.

**Tools** (plugin-registered): `cancel_task`, `wait_for_user` (both orchestrator-only), an enhanced `webfetch` (llms.txt probing, content extraction, secondary-model summarization), and `ast_grep_search`/`ast_grep_replace` (AST-aware search/refactor across 25 languages). Plus hooks that harden native tools: an `apply_patch` rescue/rewriter.

**MCPs**: two built-in — `context7` (up-to-date library docs) and `gh_grep` (GitHub code search via grep.app); access is per-agent with wildcard/exclude syntax. Web search is deliberately *not* shipped — the docs point to OpenCode's built-in Exa-backed `websearch` tool.

**Other integrations**: an **ACP adapter** (`acpAgents` config) wrapping external agent CLIs (Claude Code ACP, Gemini CLI, ollama) as delegatable subagents; a **Multiplexer integration** (Tmux/Zellij/Herdr/cmux/kitty panes per agent); the **Companion** (optional Rust floating desktop window showing active agents); an `/interview` browser Q&A flow that writes a markdown spec; and `/preset` runtime model switching. Human-in-the-loop is via `question`, `wait_for_user`, and permission `ask` modes.

## (f) Steal-worthy bits

1. **Background Job Board as in-prompt state** — a compact, sentinel-tagged snapshot (task ID / alias / agent / state / ownership / result) injected into the coordinator's context each turn. TGO gets automatic parallel delegation and progress visibility without building a code-level DAG; it matches TGO's agentic-autonomy goal because the coordinator stays unblocked and re-entrant.
2. **"Scheduler, not worker" prompt contract + explicit routing thresholds** — the orchestrator prompt hard-codes when to delegate ("never UI work", "multi-step implementation → specialist", parallelize independent lanes) and a "direct work boundary". This is a cheap, prompt-only way to enforce autonomy and delegation discipline in TGO, independent of any code loop.
3. **Task-fit rejection as routing signal** — specialists return a reason instead of attempting partial out-of-role work, and the coordinator must reroute rather than retry. Prevents the classic "agent does a bad job because it was handed the wrong task" failure and gives TGO free self-correction.
4. **Per-agent skills/MCPs as permission grants, skills-over-servers** — skills are stateless prompt playbooks granted per agent via `skills` arrays (`"*"`, `"!name"`), enforced as tool-level permissions, while MCPs are confined to the one lane that needs them (e.g. only Librarian gets `context7`). Aligns with TGO's skills-over-MCPs stance and keeps the coordinator's context lean.
5. **Presets + prompt-file layering for a named roster** — a `presets` map binds each named agent to a model/variant/skills/mcps, overridable by user then project (`<agent>.md` / `_append.md`), so the roster is one coherent, relocatable artifact. This is the cleanest template for TGO's "named roster" as a config artifact, and `/preset` gives runtime roster swaps without slash commands.
