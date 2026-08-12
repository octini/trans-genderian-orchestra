# TGO skill-source inventory — research notes

Sources:
- Local: `/Users/ryan/.agents/skills/*/SKILL.md` (22 installed skills) + `/Users/ryan/.agents/skills/ask-matt/SKILL.md` (router)
- magic-context: https://github.com/cortexkit/magic-context (README.md, master) · https://api.github.com/search/repositories?q=magic-context
- aft: https://github.com/cortexkit/aft (README.md, main) · https://api.github.com/search/repositories?q=aft
- superpowers: https://github.com/obra/superpowers (README.md, main; `skills/` tree via contents API) · https://api.github.com/repos/obra/superpowers
- Framework research (in-repo): `docs/research/oh-my-opencode-slim.md`, `docs/research/gsd-core.md`, `docs/research/bmad-method.md`, `docs/research/ruflo.md`, `docs/research/oh-my-pi.md`, `docs/research/langgraph.md`

## 1. Installed: Matt Pocock skills (~/.agents/skills)

22 skills. `ask-matt` is the router over the other 21.

| name | purpose |
|---|---|
| ask-matt | Ask which skill or flow fits your situation; a router over the skills in this repo. |
| code-review | Review changes since a fixed point (commit/branch/PR) along two axes — Standards and Spec — in parallel sub-agents. |
| codebase-design | Shared vocabulary (module, interface, depth, seam, adapter, leverage, locality) for designing deep modules. |
| diagnosing-bugs | Diagnosis loop for hard bugs and performance regressions — refuses to theorise until it has a tight red feedback loop. |
| domain-modeling | Build and sharpen a project's domain model / ubiquitous language; record ADRs. |
| grill-me | A relentless interview to sharpen a plan or design (stateless, no codebase). |
| grill-with-docs | A relentless interview that also creates docs (ADRs + glossary) as it goes. |
| grilling | The shared primitive: grill the user relentlessly about a plan, decision, or idea. |
| handoff | Compact the current conversation into a handoff document for another agent/session to pick up. |
| implement | Implement a piece of work based on a spec or set of tickets. |
| improve-codebase-architecture | Scan a codebase for deepening opportunities, present as a visual HTML report, then grill through the pick. |
| prototype | Build a throwaway prototype to answer a design question (keep the answer, delete the code). |
| research | Investigate a question against high-trust primary sources; capture findings as a cited Markdown file. |
| resolving-merge-conflicts | Resolve an in-progress git merge/rebase conflict. |
| setup-matt-pocock-skills | Configure the repo for the engineering skills — issue tracker, triage labels, domain doc layout. |
| tdd | Test-driven development: red-green-refactor, test-first feature building. |
| teach | Teach the user a new skill or concept, using the current directory as a stateful workspace. |
| to-spec | Turn the current conversation into a spec and publish it to the project issue tracker. |
| to-tickets | Break a plan/spec into tracer-bullet tickets, each declaring its blocking edges. |
| triage | Move incoming issues/external PRs through a state machine of triage roles into agent-ready briefs. |
| wayfinder | Plan a huge chunk of work as a shared map of decision tickets on the tracker, resolved one at a time. |
| writing-for-agents | Reference for writing any document an agent consumes — skills, AGENTS.md/CLAUDE.md (renamed from writing-great-skills in v1.2.0). |

**ask-matt router** routes to (roughly):
- **Main flow (idea→ship):** `/grill-with-docs` (has a codebase) or `/grill-me` (no codebase), optional `/prototype` detour bridged by `/handoff`, then `/to-spec` → `/to-tickets` → `/implement` (which drives `/tdd` internally and closes with `/code-review`).
- **On-ramps:** `/triage` (incoming issues), `/diagnosing-bugs` (something broken), `/wayfinder` (huge/foggy effort).
- **Codebase health:** `/improve-codebase-architecture`.
- **Vocabulary underneath:** `/domain-modeling`, `/codebase-design`.
- **Crossing sessions:** `/handoff` (fork) vs `/compact` (continue).
- **Standalone:** `/prototype`, `/research`, `/teach`, `/writing-for-agents`.
- **Precondition:** `/setup-matt-pocock-skills`.

## 2. magic-context

**What it is:** `cortexkit/magic-context` (MIT, ~1.6k stars, part of **CortexKit** — a family of plugins modeled on brain regions). Self-managing context + long-term project memory for coding agents: the "hippocampus." One session runs indefinitely with no compaction pauses; a background **historian** compresses old history into tiered compartments, a **dreamer** consolidates/verifies/curates memories overnight, and the right memories auto-surface every turn. Works across sessions and across OpenCode + Pi (shared SQLite store, ~/.local/share/cortexkit/magic-context/context.db).

**What it ships:** an OpenCode/Pi **plugin** (npm `@cortexkit/opencode-magic-context`), a CLI (`@cortexkit/magic-context` with `setup`/`doctor`), slash commands (`/ctx-status`, `/ctx-flush`, `/ctx-dream`, …), a config file (`magic-context.jsonc`), a desktop dashboard app, and SQLite storage. **It does not ship a skill suite** — it ships **tools** plus commands/hooks. It deliberately disables the host's built-in compaction and refuses to coexist with other context managers (DCP, OMO hooks).

Skill/file inventory (no SKILL.md suite; one incidental dogfood skill in the repo):
- Agent tools: `ctx_reduce` (queue stale tagged content for cache-aware removal), `ctx_memory` (write/delete durable cross-session memories in a category taxonomy: PROJECT_RULES, ARCHITECTURE, CONSTRAINTS, CONFIG_VALUES, NAMING), `ctx_search` (semantic search across memories + conversation history + git commits + notes + primers), `ctx_expand` (decompress a history range to raw transcript), `ctx_note` (deferred intentions / smart notes).
- Commands: `/ctx-status`, `/ctx-flush`, `/ctx-recomp`, `/ctx-wrapup`, `/ctx-session-upgrade`, `/ctx-aug` (sidekick augmentation), `/ctx-dream` (on-demand dreamer), `/ctx-embed`.
- Dreamer tasks: map, verify, verify-broad, curate, classify, retrospective, maintain-docs (ARCHITECTURE.md/STRUCTURE.md), user-memories, promote/refresh primers, smart-notes.
- Repo ships `.agents/skills/remotion-best-practices/SKILL.md` (Remotion video best-practices rules) — incidental dogfooding for their own dashboard, not part of the product distribution.

## 3. aft

**What it actually is:** `cortexkit/aft` (MIT, ~230 stars, part of CortexKit) — an acronym loosely standing for the **agent file tools** crate (`agent-file-tools`) that powers it. It's a **Rust binary with thin OpenCode/Pi adapters** ("the sensorimotor cortex for coding agents"): it gives an agent a proper IDE and OS. It **hoists the host's built-in tool slots** (`read`, `write`, `edit`, `apply_patch`, `grep`, `glob`, `bash` become tree-sitter-backed, indexed, symbol-aware, output-compressed) and adds an `aft_*` tool family on top. Not a skill system and not an acronym for a methodology — a tooling/infrastructure plugin.

**What it ships:** a single `aft` Rust binary (JSON-over-stdio protocol, tree-sitter for 27 languages, trigram + semantic indexes, LSP client), plus per-harness TS adapter plugins (`@cortexkit/aft-opencode`, `@cortexkit/aft-pi`), a CLI (`npx @cortexkit/aft@latest setup` / `doctor`), config (`aft.jsonc`), and a persistent per-project daemon (BridgePool). **No SKILL.md files.**

- Sensory (perceive): `aft_outline` (every symbol in a file/dir/URL, one call), `aft_zoom` (inspect one symbol, optional callgraph), `aft_search` (hybrid semantic+lexical code search), `aft_callgraph` (callers/callees/data-flow/impact analysis), `aft_inspect` (one-call code-health report: LSP errors, TODOs, dead code, duplicates), trigram `grep`/`glob`.
- Motor (act): symbol-aware `edit` (fuzzy find/replace, named-symbol replace, batch/multi-file/glob), `write`, `apply_patch` (atomic rollback), `aft_refactor` (workspace symbol move, extract, inline), `aft_import` (import add/remove/organize), `ast_grep_search`/`ast_grep_replace` (structural AST search/replace).
- Brainstem (stay alive): `bash` with output compression + command rewriting, `background: true` tasks (`bash_status`/`bash_kill`/`bash_watch`, survive restarts), PTY (`bash_write`/`bash_status`), `aft_safety` (per-file undo stack, checkpoints, restore).

## 4. superpowers

**What it is:** `obra/superpowers` (Jesse Vincent / Prime Radiant, MIT, ~266k stars) — a **complete software-development methodology for coding agents** built as a set of composable Claude-Code-style skills + session-start bootstrap instructions, distributed as a plugin/marketplace for many harnesses (Claude Code, Codex, Cursor, Gemini, Copilot CLI, OpenCode, Pi, …). Workflow: brainstorm → worktree → write plan → subagent-driven-development/executing-plans (TDD inside) → requesting/receiving code-review → finish branch. Skills auto-trigger; "mandatory workflows, not suggestions."

**Skills shipped (14, all in `skills/`):**

| skill | what it does |
|---|---|
| brainstorming | Socratic design refinement before code; explores alternatives, validates design in digestible sections, saves a design document. |
| using-git-worktrees | Creates an isolated workspace on a new branch, runs project setup, verifies a clean test baseline. |
| writing-plans | Turns an approved design into bite-sized (2–5 min) tasks, each with exact file paths, complete code, and verification steps. |
| subagent-driven-development | Dispatches a fresh subagent per task with a two-stage review (spec compliance, then code quality); the autonomy core. |
| executing-plans | Executes plans in batches with human checkpoints (alternative to subagent-driven). |
| test-driven-development | RED-GREEN-REFACTOR: failing test → minimal code → pass → commit; deletes code written before tests. |
| requesting-code-review | Pre-review checklist; reviews work against the plan, reports issues by severity, critical issues block. |
| receiving-code-review | How to respond to review feedback without friction. |
| systematic-debugging | 4-phase root-cause process (incl. root-cause-tracing, defense-in-depth, condition-based-waiting). |
| verification-before-completion | Ensure a fix is actually fixed — evidence over claims. |
| dispatching-parallel-agents | Concurrent subagent workflows for independent work. |
| finishing-a-development-branch | Verify tests, then present merge/PR/keep/discard options; cleans up the worktree. |
| writing-skills | Create new skills following best practices (includes testing methodology). |
| using-superpowers | Introduction to the skills system; the bootstrap injected at session start. |

Philosophy: TDD first, systematic over ad-hoc, complexity reduction, evidence over claims.

## 5. Framework-bundled skills (cross-section)

TGO roster seats: **Bernstein** (planning/reconciliation orchestrator), **Horowitz** (reviewer), **Nas** (research + explorer), **Dylan** (implementer), **Nirvana** (3-lens judgment band). Focus on planning/verification, deep-research/recon, adversarial/edge-case review, implementation discipline, memory/context.

### oh-my-opencode-slim (8–9 bundled skills)
- **verification-planning** — plan an evidence path before non-trivial changes. → Bernstein, Nirvana
- **deepwork** — phased scheduler workflow with Oracle review gates + persistent progress file. → Bernstein (its core "deep work" lane)
- **codemap** — build hierarchical repo maps. → Nas
- **worktrees** — git worktree lanes for parallel work. → Dylan
- **clonedeps** — clone a dependency's source for inspection. → Nas
- **simplify** — behavior-preserving simplification (granted to Oracle). → Horowitz
- **reflect** — turn repeated friction into reusable skills/agents/config (incl. session archaeology). → memory/context
- **oh-my-opencode-slim** — self-configuration of the plugin. → Bernstein (ops)
- *(source-only)* **loop-engineering** — tuning the orchestrator loop. → Bernstein

### gsd-core (~67 skills across 6 namespaces — gsd-workflow, gsd-project, gsd-quality, gsd-context, gsd-manage, gsd-ideate — plus namespace **meta-skills** that collapse ~2150 tokens of eager listing to ~120)
- **gsd-autonomous** — chains discuss → plan → execute across all remaining phases, auto-approving checkpoints except blocking-human gates. → Bernstein
- **gsd-mempalace-recall** (+ MemPalace MCP: `recall`/`capture`, temporal knowledge graph) — cross-session memory recalled before planning, captured at phase boundaries. → memory/context
- Verification spine (workflow/quality namespaces): plan-checker (≤3 revision loops), verifier (requirement + decision coverage), 4 canonical **gates** (Confirm/Quality/Safety/Transition), **broken-windows ledger** (WINDOWS.md blocks ship). → Horowitz, Nirvana
- Research module — fetch-to-disk with content-addressed cache + provider waterfall, confidence stamping, package-legitimacy verdicts (OK/SUS/SLOP); agents return `RESEARCH.md` paths, never raw content. → Nas
- `intel` codebase-intelligence tool family. → Nas
- Executor wave-parallelism + `## CHECKPOINT REACHED` completion markers + file-backed `STATE.md`. → Dylan, Bernstein
- `gsd-project`/`gsd-manage` namespaces (config, state, phase, roadmap, milestone, workstream, audit). → Bernstein

### bmad-method
- **bmad-help** — scans artifacts, detects the phase you're in, recommends next steps (routing substitute for a state machine). → Bernstein
- **bmad-review** — five lenses run in parallel subagents (adversarial, edge-case, verification-gap, structure, prose), one findings array. → Horowitz, Nirvana
- **bmad-deep-recon** — research in three modes (draft a deep-research prompt / process a report / run in-place with parallel fan-out + claim verification; six typed packs). → Nas
- **bmad-forge-idea** — one-question-at-a-time adversarial pressure test of an idea. → Bernstein (grilling)
- **bmad-advanced-elicitation** — Socratic / first-principles / pre-mortem / red-team refinement. → Bernstein
- **bmad-brainstorming** — coach, 100+ ideas, anti-bias domain shifts. → Bernstein
- **bmad-spec** — memlog-derived spec contract (Why/Capabilities/Constraints/Non-goals/Success signal + status frontmatter). → Bernstein, Dylan
- **bmad-build** — step-file workflow (clarify → plan → implement → review → present), routes one-shot vs plan-code-review by blast radius. → Dylan, Bernstein
- **bmad-build-auto** — unattended surface writing machine-readable status (draft/ready-for-dev/in-progress/in-review/done/blocked + deferred[] findings + blocked conditions). → Dylan, Bernstein
- **bmad-code-review** + **bmad-correct-course** — post-build review and course-correction loop. → Horowitz
- **bmad-party-mode** — multi-agent deliberation with an independence ladder (session/auto/subagent/agent-team). → Nirvana
- **bmad-checkpoint-preview**, **bmad-project-context** (kernel.md + verified bundle), **bmad-retrospective**. → Bernstein, memory/context

### ruflo (30 skills)
- **deep-research** — heavyweight research skill. → Nas
- **dossier-collect** — gathers a dossier of facts on a subject. → Nas
- **goal-plan** — GOAP long-horizon planning (preconditions/actions, A* shortest viable path, replan on failure). → Bernstein
- **intelligence-route** — learned-pattern routing of tasks to agents (~89% accuracy, explainable). → Bernstein
- **autopilot-loop** — autonomous loop with cache-aware 270s heartbeat. → Bernstein
- **memory-search** — unified semantic recall across namespaced memory (AgentDB). → memory/context
- **neural-train** — learn/distill recurring patterns into durable memory (RETRIEVE→JUDGE→DISTILL→CONSOLIDATE). → memory/context
- **intelligence-transfer** — move learned patterns across projects. → memory/context
- **workflow-create** — declarative resumable workflow definitions with approval gates. → Bernstein

### oh-my-pi (SKILL.md capability packs + bundled agents + memory tools)
- **scout** — bundled read-only research agent. → Nas
- **reviewer** / **security-reviewer** — bundled review agents (separate model roles). → Horowitz
- **librarian** — verbatim-read agent for exact-code recall. → Nas, memory
- **designer** — UI/UX agent. → (design seat)
- `retain` / `recall` / `reflect` / `learn` / `memory_edit` — project-scoped memory; `learn` promotes a lesson into a managed skill file. → memory/context
- Skills as `SKILL.md` capability packs discovered from `.omp`, `.agents`, `.claude`, `.cursor`, `.codex`, extension packages — the Agent-Skills-standard layout. → TGO packaging

### langgraph / Agent Skills standard
- No bundled skill suite (LangGraph ships orchestration primitives; Deep Agents ships harness tools).
- **Agent Skills standard** (agentskills.io) — `SKILL.md` + scripts/templates/refs, progressive disclosure (frontmatter at startup, bodies on demand). → TGO skill packaging model
- `TodoListMiddleware` `write_todos` (pending/in_progress/completed planning state). → Bernstein
- Filesystem-as-shared-memory + **offloading** (>20k-token tool results → file references) and **summarization** at ~85% context (intent/artifacts/next-steps summary). → memory/context, Dylan
- Ephemeral named subagents with one concise report per delegation. → all seats

## 6. Quick reference table

| source | skill | what it does | natural TGO seat |
|---|---|---|---|
| Matt Pocock | grilling (grill-me / grill-with-docs) | relentless interview to sharpen a plan/design | Bernstein |
| Matt Pocock | to-tickets | tracer-bullet tickets with declared blocking edges | Bernstein |
| Matt Pocock | code-review | two-axis review (Standards + Spec) since a fixed point | Horowitz |
| Matt Pocock | implement | spec/ticket-driven implementation | Dylan |
| Matt Pocock | tdd | red-green-refactor | Dylan |
| Matt Pocock | handoff | compact conversation into a handoff doc | memory/context |
| magic-context (plugin) | ctx_memory / ctx_search / ctx_dream | self-managing long-term memory + cross-session recall | memory/context |
| superpowers | subagent-driven-development | fresh subagent per task + two-stage review | Bernstein, Dylan |
| superpowers | writing-plans | bite-sized tasks with exact paths + verification steps | Bernstein |
| superpowers | systematic-debugging | 4-phase root-cause process | Horowitz, Dylan |
| superpowers | verification-before-completion | evidence that the fix is actually fixed | Nirvana, Horowitz |
| superpowers | brainstorming | Socratic design refinement before code | Bernstein |
| gsd-core | gsd-autonomous | autonomous discuss→plan→execute chain with gates | Bernstein |
| gsd-core | gsd-mempalace-recall | cross-session memory (recall/capture) | memory/context |
| gsd-core | verification coverage + gates | requirement/decision coverage; Confirm/Quality/Safety/Transition gates | Nirvana, Horowitz |
| bmad | bmad-review | 5 lenses in parallel (adversarial, edge-case, verification-gap…) | Nirvana, Horowitz |
| bmad | bmad-deep-recon | three-mode deep research with claim verification | Nas |
| bmad | bmad-spec | single-writer memlog-derived spec with machine status | Bernstein |
| bmad | bmad-build-auto | machine-readable implementation status (draft→done/blocked) | Dylan, Bernstein |
| oh-my-opencode-slim | verification-planning | plan an evidence path before non-trivial changes | Bernstein, Nirvana |
| oh-my-opencode-slim | deepwork | phased scheduler workflow with review gates | Bernstein |
| oh-my-opencode-slim | codemap / reflect | repo maps; friction→reusable skills (memory) | Nas, memory/context |
| ruflo | deep-research / dossier-collect | heavyweight research + dossier gathering | Nas |
| ruflo | goal-plan | GOAP long-horizon planning with replan | Bernstein |
| oh-my-pi | scout / reviewer / librarian | bundled read-only research, review, verbatim agents | Nas, Horowitz |
| oh-my-pi | retain / recall / learn | project-scoped memory; promote lessons into skills | memory/context |
| langgraph | Agent Skills standard + write_todos + offload/summarize | packaging standard; planning state; context hygiene | all seats, memory/context |
