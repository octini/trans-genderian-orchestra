---
artifact_type: design_spec
status: draft
spec_id: tgo-v2-03-tools-skills-mcps-integrations
created_at: 2026-06-02
updated_at: 2026-06-02
source_checkpoint: designs/tgo-v2-settled-decisions.md
---

# Tools, Skills, MCPs, And Integrations

## Tooling Presets

Tooling presets control installed/registered capabilities. They are separate from model and resilience presets.

`bare-bones`:

- TGO agents and commands.
- Bundled TGO skills.
- Beads integration.
- No remote MCPs.

`default`:

- Beads.
- Curated Matt Pocock skills.
- Context7 CLI plus skill.
- Websearch MCP.
- grep_app MCP.
- AFT as peer plugin.

`all-bells`:

- Everything in `default`.
- Serena optional code-intelligence MCP.
- Constrained GitHub MCP.
- Full Matt Pocock skill set.

## Skill-First Policy

Prefer skills for repeatable workflows, project-specific procedures, review protocols, self-improvement, diagnosis, planning, and context-preserving processes.

Prefer MCPs/tools for live data, browser automation, GitHub operations, docs/search when skill/CLI cannot preserve function, and external APIs.

If both skill and MCP apply, load the skill first so it guides efficient tool/MCP usage.

MCP servers should not be installed merely because they exist. They are installed when they preserve meaningful functionality not otherwise available through skills, CLI, peer plugins, or built-in tools.

## User-Managed Skills, Plugins, And MCPs

TGO preserves existing user skills, plugins, and MCPs by default.

- TGO adds its own managed skills in a TGO-owned path.
- TGO role-filters TGO-managed skills.
- User-installed skills stay visible unless the user opts into stricter filtering.
- If a user skill shares a name with a TGO-managed skill, TGO warns and prefers the managed path for TGO workflows.
- User-installed MCP servers stay visible by default.
- TGO manages permissions/config only for MCPs it installs or explicitly adopts.
- Doctor reports non-TGO MCPs as user-managed and visible.

## Bundled And Curated Skills

Default curated Matt Pocock skills:

- `setup-matt-pocock-skills`
- `grill-with-docs`
- `diagnose`
- `tdd`
- `to-prd`
- `to-issues`
- `triage`
- `improve-codebase-architecture`
- `zoom-out`
- `handoff`

`all-bells` may install the full Matt Pocock skill set.

Matt Pocock `setup-matt-pocock-skills` is prompt-driven and must not be run as an `npx` executable. TGO installs/loads the skill and/or pre-seeds Beads-aware `docs/agents/*` defaults so Matt workflows have immediate issue-tracker context.

## Skill Discovery And Creation

TGO may notice repeated workflows or missing capabilities and recommend a new skill. Researcher can inspect existing skills/MCPs and recommend whether a skill would replace an MCP or reduce token use. Builder may create a local draft skill only when explicitly authorized and scope is low-risk. Reviewer must verify description, triggers, permissions, and token-efficiency claims. No new skill is enabled/assigned until user approval.

## Beads And opencode-beads

Beads is the default issue tracker. TGO depends on the `bd` CLI for per-project `.beads` databases and uses pinned `opencode-beads` by default rather than vendoring Beads behavior.

`opencode-beads` is registered as a peer plugin. It provides `bd prime` context injection, `/bd-*` commands, and `beads-task-agent`. TGO keeps `beads-task-agent` available but does not make it the default execution path. TGO's Orchestrator remains the normal work router so Goal Confirmation, artifact links, Builder scoping, Reviewer gates, and batch scheduling are preserved.

## Context7

Default uses Context7 CLI plus skill, not Context7 MCP. Bootstrap runs or guides `ctx7` setup, which handles OAuth/API key and skill installation. CLI+skill mode requires the OpenCode runtime to execute local commands; it does not inherently require a terminal UI. If a desktop runtime is sandboxed and cannot execute `ctx7`, Context7 MCP can be used in `all-bells` or explicit fallback.

Context7 degradation:

- Missing `ctx7` degrades documentation retrieval but does not block base install.
- If a task requires current library docs and no Context7 path exists, Researcher may use websearch/manual docs and record degraded capability.

## AFT

AFT is included in `default` as a peer OpenCode plugin, not vendored. It supplies local-code IDE/OS capabilities: outline/zoom/inspect, diagnostics summaries, semantic/local search, AST-aware tools, and AFT-backed edit/read behaviors.

If AFT setup fails, TGO continues with native tools and reports degraded local-code intelligence. AFT overlaps local repo navigation, but it does not replace public GitHub-wide grep.app code search.

## Websearch MCP

`default` includes `tgo-websearch`, limited to Researcher by default. It provides general web search that `webfetch` alone does not replace. Existing implementation supports Exa by default and Tavily via config/env.

Websearch API keys are referenced through env vars. Missing auth degrades web research and is reported by doctor with exact repair instructions.

## grep_app MCP

`default` includes `tgo-grep-app`, limited to Researcher by default. It provides public GitHub code examples and real-world usage search. AFT does not replace this because AFT is local-repo oriented.

If omitted, TGO can fall back to GitHub code search or other tools, but that is less direct and may be less functional.

## GitHub MCP

GitHub MCP is included only in `all-bells` or explicit setup. It is read-only by default and constrained to narrow toolsets because official guidance warns it can add many tokens.

GitHub MCP provides repository/file/commit/branch/PR/actions/releases/users/orgs/security findings/notifications/code search and more. Routine needs can often be handled by `git`, `gh`, Beads, GitHub tools/API, and grep_app.

Write operations should stay behind explicit approval and normally use `gh`/GitHub tools rather than broad MCP write access. Raw PATs must never be stored inline; use env references.

## Serena

Serena is optional `all-bells` local semantic-code intelligence. It supports symbol navigation, LSP-backed project memories/onboarding, refactor/navigation tools, and SDD-style retrieval. It overlaps with AFT and should not be default.

Serena is dependency/install-check only unless `all-bells` or explicit setup is active. Use documented `uvx`/Serena setup path. If unavailable in `all-bells`, report degraded advanced code intelligence without blocking baseline TGO.

## Peer Plugin And Tool Versioning

Third-party tools/plugins are pinned to known-tested versions where possible, especially `opencode-beads`, AFT, Serena/GitHub MCP config assumptions, and bundled skill packs. Doctor can report updates, but upgrades require explicit setup action.

If a dependency already exists and is user-managed, TGO must not overwrite/adopt it automatically. Preview choices:

- Leave user-managed.
- Adopt pinned TGO version.
- Skip capability.

Default is leave user-managed unless known incompatible or broken.

## MCP Permissions

MCP registration and access are governed by tooling preset, project overrides, and per-agent permissions.

- Orchestrator normally has no direct remote MCP access unless needed for workflow setup/status.
- Researcher gets websearch/Context7/grep_app where installed.
- Builder generally does not get broad remote MCP access by default.
- Reviewer and Council remain read-only and artifact-grounded.

MCP IDs are TGO-namespaced so doctor/uninstall can distinguish TGO-managed registrations from user-managed ones.
