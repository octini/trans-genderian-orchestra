# ruflo — research notes

Sources:
- GitHub repo: https://github.com/ruvnet/ruflo (ruflo, "The original agent meta-harness", ~67k stars, MIT, TypeScript) — located via https://api.github.com/search/repositories?q=ruflo
- README.md: https://raw.githubusercontent.com/ruvnet/ruflo/main/README.md
- ruflo-core plugin: https://raw.githubusercontent.com/ruvnet/ruflo/main/plugins/ruflo-core/README.md
- ruflo-swarm plugin: https://raw.githubusercontent.com/ruvnet/ruflo/main/plugins/ruflo-swarm/README.md
- ruflo-intelligence plugin: https://raw.githubusercontent.com/ruvnet/ruflo/main/plugins/ruflo-intelligence/README.md
- ruflo-autopilot plugin: https://raw.githubusercontent.com/ruvnet/ruflo/main/plugins/ruflo-autopilot/README.md
- ruflo-rag-memory plugin: https://raw.githubusercontent.com/ruvnet/ruflo/main/plugins/ruflo-rag-memory/README.md
- ruflo-goals plugin: https://raw.githubusercontent.com/ruvnet/ruflo/main/plugins/ruflo-goals/README.md
- ruflo-workflows plugin: https://raw.githubusercontent.com/ruvnet/ruflo/main/plugins/ruflo-workflows/README.md
- Agent definitions: `.claude/agents/` tree (e.g. project-coordinator.md, base-template-generator.md, swarm/adaptive-coordinator.md)
- Hooks config: plugins/ruflo-core/hooks/hooks.json

Note: this is the ruvnet project formerly called "claude-flow". The repo also contains `ruflo-agent` (WASM/cloud agents), `ruflo-rvf` (session save/restore), `ruflo-loop-workers` (scheduled background loops), `ruflo-federation` (cross-machine agents), `ruflo-browser` (Playwright), `ruflo-security-audit`, `ruflo-aidefence`, `ruflo-sparc`, `ruflo-adr`, `ruflo-ddd`, etc. It sits on top of Claude Code / Codex rather than being a standalone host.

## (a) Core orchestration primitive

A hybrid **router + supervisor loop** layered on top of Claude Code's own harness, with swarms as the coordination unit.

- Control is **config/hook driven, not a code graph**. Claude Code's native hooks (PreToolUse, PostToolUse, PreCompact, Stop) are wired via `hooks.json` to a shim script that calls Ruflo's CLI/MCP layer. Routing and "learning" fire automatically in the background — the README explicitly says after `init` you "just use Claude Code normally"; the hooks system routes tasks, learns, and coordinates agents invisibly.
- The routing primitive is `hooks_route` (via the `ruflo-intelligence` plugin): it picks which agent/task profile matches an incoming task from learned patterns, claiming ~89% routing accuracy. Decisions can be explained via `hooks_explain`.
- Above routing sits **swarm coordination** (`ruflo-swarm`): topologies (hierarchical, mesh, hierarchical-mesh, ring, star, adaptive), consensus strategies (Byzantine, Raft, Gossip, CRDT, Quorum), and a "queen"-led hierarchy where a coordinator/queen delegates to worker agents.
- **Long-horizon planning** is GOAP (Goal-Oriented Action Planning) with A* search over state space (`ruflo-goals` / goal.ruv.io): plain-English goal → preconditions/actions → shortest viable path → dispatch to agents; replans from current state on failure.
- A second explicit surface is the **workflow state machine** (`ruflo-workflows`): declarative MCP `workflow_*` definitions (create → run ↔ pause → complete/cancel, resumable, human approval gates) plus native Claude Code `Workflow` JS scripts (`.claude/workflows/*.js`) that fan subagents out deterministically with `agent` / `parallel` / `pipeline` / `phase` hooks.
- **Autonomous loops**: `ruflo-autopilot` pairs Claude Code's `/loop` + `ScheduleWakeup` with a 270s cache-aware heartbeat so a swarm keeps running without human input, plus `autopilot_predict` to choose the next action from learned patterns.
- Backdrop "background workers": 12 auto-triggered loops (audit, optimize, testgaps, …) run on timers via `ruflo-loop-workers`.

Bottom line for TGO: the primitive is a **learned-pattern router feeding a supervisor/queen swarm loop**, driven by host hooks + config rather than an explicit node-edge graph; flows are emergent (learned) rather than hard-coded, though declarative workflows exist for deterministic fan-out.

## (b) Agent definition & delegation

- **Agents are declarative markdown files** — standard Claude Code subagent format (YAML frontmatter: `name`, `description`, optional `model`) plus a system prompt body. They live in `.claude/agents/` organized into folders by specialty (core, analysis, architecture, development, devops, testing, documentation, security, swarm, goal, reasoning, neural, specialized, …) with named identity files like `project-coordinator.md`, `python-specialist.md`, `typescript-specialist.md`, `security-auditor.md`, `database-specialist.md`. Descriptions use the classic "Use this agent when you need to…" invocation contract. ruflo-core ships three generalist agents (coder, researcher, reviewer); specialized agents are added per-plugin.
- **Delegation is explicit at the swarm level, learned at the routing level.** The router decides *which* agent profile matches (learned, ~89% accuracy, via `hooks_route` + `hooks_build-agents`), and then the coordinator/supervisor explicitly spawns and dispatches workers (`agent_spawn`, `agent_execute`, `Task` tool with `run_in_background: true`). In the auto-loop, `autopilot_predict` picks the next action — delegation becomes learned/emergent rather than fully deterministic.
- Agents are **reactive workers, not proactive actors** in the default model: they run when routed/spawned. Proactivity is added mechanically via loop-workers (scheduled timers) and `/loop` + Monitor wake signals, not by agents self-initiating.
- Model routing is a separate axis: 3-tier (Agent Booster WASM, Haiku, Sonnet/Opus) cost-optimized routing across providers (Claude, GPT, Gemini, Cohere, Ollama).

## (c) Context & shared-state passing

- **Shared message history** at the host level (Claude Code session); Ruflo layers a **persistent, namespace-routed vector memory** on top rather than relying on in-context sharing alone.
- **AgentDB** is the substrate: SQLite + HNSW vector indexes, 15 `agentdb_*` MCP tools, with a strict **namespace convention** (`<plugin-stem>-<intent>`, kebab-case; reserved namespaces `pattern`, `patterns`, `claude-memories`, `default`). Namespaces include `patterns`, `tasks`, `solutions`, `feedback`, `security`, `swarm-state`, `workflows-state`, `autopilot-patterns`, `goals-horizons`, etc. Each plugin owns its namespace; state is shared by reading/writing namespaces via `memory_*` tools.
- **Cross-session memory**: Claude Code's native auto-memory (`~/.claude/projects/*/memory/*.md`) is bridged into AgentDB (ONNX all-MiniLM-L6-v2 384-dim embeddings) for unified semantic recall. `ruflo-rvf` saves/restores full agent memory across sessions/machines in a portable RVF format. `ruflo-federation` shares state across machines over encrypted channels.
- **Retrieval quality**: SmartRetrieval (ADR-090) — query expansion, multi-query fan-out + Reciprocal Rank Fusion, recency boost, MMR diversity reranking, session round-robin. `memory_search_unified` searches all namespaces at once.
- **Learning pipeline** (4 steps): RETRIEVE → JUDGE → DISTILL → CONSOLIDATE (EWC++ to prevent catastrophic forgetting), with trajectory recording per step, SONA neural patterns, ReasoningBank, and IPFS pattern transfer across projects. So context accumulates as learned patterns + trajectories, not just conversation.
- **Context-window management**: isolation is the norm for parallel agents (each spawned agent gets its own worktree `EnterWorktree/ExitWorktree` and session); shared state is pulled from memory namespaces, not via bloated context sharing. Compaction is host-managed (PreCompact hook) and hooked into learning so summarized sessions persist learnings.

## (d) Roster philosophy

- **Many specialists, not one generalist** — the repo ships ~100+ named, role-based agents (coder, tester, reviewer, architect, security, docs, database-specialist, deep-researcher, goal-planner, dossier-investigator, horizon-tracker, memory-specialist, adaptive/hierarchical/mesh coordinators, …). Each has a stable named identity and a narrow, non-overlapping role.
- **Fixed base roster + dynamic spawns**: a curated set of agents is installed with the harness; swarms spawn additional workers at runtime (`agent_spawn`) when a task needs fan-out, and kill them when done (`agent_terminate`). Named subagents are addressable via `Task` with `name:` so peers can `SendMessage` to them.
- **Anti-drift defaults** encode the philosophy: topology `hierarchical`, maxAgents 6–8, strategy `specialized` (clear roles, no overlap), consensus `raft`, memory `hybrid` (SQLite + AgentDB). For 10+ agents use `hierarchical-mesh` (queen + peer mesh).
- No "generalist singleton" — even the three core agents (coder/researcher/reviewer) are distinct roles.

## (e) Skills & tools shipped

- **MCP-first surface**: one `ruflo` MCP server exposing ~314 tools across families — `memory_*`, `agentdb_*`, `embeddings_*`, `hooks_*`/`hooks_intelligence_*`, `neural_*`, `autopilot_*`, `browser_*`, `swarm_*`, `agent_*`, `workflow_*`, `system_*`, `terminal_*`, `aidefence_*`, `ruvllm_*`. Third-party MCP servers are also ingestible (bring-your-own in the web UI).
- **Skills**: 30 skills shipped (e.g. `deep-research`, `goal-plan`, `dossier-collect`, `intelligence-route`, `autopilot-loop`, `memory-search`, `workflow-create`, `neural-train`, `intelligence-transfer`) — packaged as Claude Code skills.
- **Slash commands**: ~60+ commands (`/autopilot`, `/intelligence`, `/goals`, `/workflow`, `/memory-search`, …). Note: this is the opposite of TGO's "no slash commands" goal — Ruflo leans heavily on slash commands for the interactive path, though the autonomous loop path runs without them.
- **Host tools it relies on** (Claude Code native): `Task`, `SendMessage`, `TaskCreate/TaskList/TaskGet/TaskUpdate/TaskOutput/TaskStop`, `Monitor`, `EnterWorktree/ExitWorktree`, `/loop`, `ScheduleWakeup`.
- **Integrations**: Claude Code + Codex as hosts; multi-provider LLM routing (Claude, GPT, Gemini, Cohere, Ollama/OpenRouter); Playwright browser automation; GitHub ops; AIDefence (PII/prompt-injection guards, 3-gate pattern); federation/mTLS across machines; ruvLLM local models; ruvector (Graph RAG, FlashAttention-3, DiskANN); web UI (flo.ruv.io) + GOAP planner UI (goal.ruv.io); human-in-the-loop via workflow pause/approval gates and federation trust downgrades.

## (f) Steal-worthy bits

1. **Learned router (`hooks_route` + pattern DB) as the default delegation mechanism** — instead of TGO hard-coding which agent handles what, let the orchestrator pick from a pattern store with an explainable rationale; matches TGO's agentic-autonomy goal (agents decide who acts next, not the user) and avoids slash-command steering.
2. **Namespace-routed persistent memory as the shared-state bus** (AgentDB + strict `<plugin>-<intent>` namespace convention, one owner per namespace) — gives TGO a clean, collision-free way for a named roster to share state across sessions without sharing one giant context window, and is exactly "skills-over-MCPs"-friendly (memory is a skill, not a client).
3. **Anti-drift swarm defaults as a documented first-class concept** (hierarchical topology, small roster of 6–8, specialized non-overlapping roles, Raft-style single authoritative leader) — a ready-made template for TGO's *named roster* philosophy: few, named, non-overlapping agents with one coordinator rather than unbounded specialist sprawl.
4. **Autonomous loop with a 270s cache-aware heartbeat** (autopilot + `/loop` + Monitor + `ScheduleWakeup`) — a concrete, tested pattern for keeping a swarm working with zero human prompting, which is the literal definition of TGO's agentic-autonomy goal; TGO can adopt the "wake on event, 270s fallback, keep prompt cache warm" trick without copying the slash-command UI.
