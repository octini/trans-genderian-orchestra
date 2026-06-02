# TGO v2 Settled Design Decisions

Date: 2026-06-01

Status: design checkpoint, not an implementation plan

This document records the design decisions settled so far for `trans-genderian-orchestra` v2. It exists to preserve the conversation before further compression/compaction. It should later be transformed into the formal umbrella spec and phased sub-specs.

No implementation has started for v2 at the time of this checkpoint.

## Executive Summary

TGO v2 should be a full OpenCode engineering workflow plugin, not just a pure dispatcher. It should make OpenCode behave like a small disciplined engineering team:

- Orchestrator: technical lead, architect, project manager, and phase controller.
- Researcher: retrieval/documentation/source-evidence specialist.
- Builder: scoped implementation engineer.
- Reviewer: required verification gate for behavior-changing work.
- Council: escalation-only consensus workflow for high-risk or disputed decisions.
- Beads: default actionable work tracker.
- TGO artifacts: durable reasoning, evidence, plans, specs, handoffs, reviews, and decisions.
- Bootstrap/setup: global-first installation of the default toolchain, plus project-local initialization.

The core shift is away from “orchestrator purity” as the goal. Purity remains a guardrail, but the real goal is reliable engineering flow: retrieve context, shape intent into artifacts, delegate bounded labor, verify before claiming completion, and preserve decisions.

## Core Goals

- Provide a disciplined multi-agent OpenCode workflow for real software engineering work.
- Preserve exact user intent across orchestrator-to-specialist handoffs.
- Enforce retrieval-led reasoning: read first, reason second, rely on model memory last.
- Keep the agent roster small while making workflow phases explicit.
- Use Beads for issue/status tracking and TGO artifacts for reasoning/verification history.
- Make setup reliable enough to replace `oh-my-opencode-slim` for the user’s default OpenCode workflow.
- Prefer functionality first, token efficiency second.
- Avoid registering unnecessary MCP servers when skill/CLI/plugin alternatives preserve function.
- Preserve user-owned OpenCode config, skills, MCPs, providers, and plugins unless explicitly adopted or changed.
- Make deterministic setup/doctor/uninstall logic testable without real external installs.

## Strict Non-Goals

- TGO v2 will not become a general-purpose package manager.
- TGO v2 will not silently remove or overwrite user tools, skills, plugins, MCPs, providers, or config.
- TGO v2 will not auto-start background work from ready Beads issues, startup hooks, timers, compaction hooks, or polling.
- TGO v2 will not bypass Reviewer for changes that affect behavior.
- TGO v2 will not store raw API keys, PATs, tokens, or passwords in manifests or generated config.
- TGO v2 will not preserve v1 planner/orchestrator semantics solely for backward compatibility.
- TGO v2 will not run Matt Pocock’s `setup-matt-pocock-skills` as an `npx` executable.
- TGO v2 will not treat `/init:all` as the safe canonical setup path.

## Design Artifact Structure

The final written design should be split into one umbrella spec plus focused sub-specs.

Umbrella spec:

- Overall TGO v2 architecture.
- Goals and non-goals.
- Retained existing features.
- Glossary.
- Cross-cutting rules.

Sub-spec 1: agent workflow.

- Agent roster.
- SDD-inspired workflow phases.
- Delegation envelopes.
- Reviewer gate.
- Council escalation.

Sub-spec 2: setup and lifecycle commands.

- External bootstrap.
- `/tgo:setup`.
- `/tgo:doctor`.
- `/tgo:uninstall`.
- Manifests.
- Migration.
- Rollback.

Sub-spec 3: tools and integrations.

- Tooling presets.
- MCP registration policy.
- Skill/plugin integration.
- AFT.
- Context7.
- Beads/opencode-beads.
- Serena.
- GitHub MCP.
- websearch MCP.
- grep_app MCP.

Sub-spec 4: Beads and project artifacts.

- Beads-backed work tracking.
- TGO artifact directories.
- `/tgo:work`.
- `/tgo:init`.
- Beads-aware `docs/agents/*` defaults.

Sub-spec 5: models and council derivation.

- Model presets.
- Fallback routing.
- Council derivation from active role models.
- Model capability warnings.

## Agent Roster

TGO v2 uses a simplified permanent roster:

- Orchestrator.
- Researcher.
- Builder.
- Reviewer.
- Council.
- Councillor as internal council participant, not a normal user-facing work lane.

The separate Planner role is removed. Planning/spec/design/task decomposition become orchestrator-owned responsibilities, but the orchestrator remains bounded and does not perform implementation labor.

## Orchestrator Role

The Orchestrator becomes a technical lead / architect / project manager / phase controller.

The Orchestrator owns:

- Request classification.
- Goal confirmation for non-trivial work.
- SDD phase control.
- Specs and plans as durable artifacts.
- Delegation envelopes.
- Routing to Researcher, Builder, Reviewer, and Council.
- Synthesizing specialist output.
- Advancing or stopping workflow phases.
- Recording/connecting artifacts.
- Linking approved plan tasks to Beads issues.

The Orchestrator does not own:

- Implementation source edits.
- Test/source file changes.
- Research evidence generation except summarizing/linking Researcher output.
- Reviewer verdict authorship except recording Reviewer output.
- Arbitrary project config edits outside explicit TGO setup/init commands.

Orchestrator write boundary:

- May write `.opencode/tgo/state.jsonc` or equivalent stream/session state.
- May write `.opencode/tgo/specs/*`.
- May write `.opencode/tgo/plans/*`.
- May write `.opencode/tgo/handoffs/*`.
- May write Beads issue links/metadata after approved plans.
- May write project setup files only during explicit `/tgo:init`, such as lean `AGENTS.md`, `CONTEXT.md`, and `docs/agents/*`.
- Must not write implementation source files or tests.
- Must not write package/config files outside TGO-managed install/init commands.
- Must not write Reviewer verdicts except copied/summarized Reviewer output.
- Must not write Researcher evidence except links/summaries from Researcher output.

## Specialist Roles

Researcher:

- Owns retrieval, source comparison, and evidence packs.
- Inspects codebase behavior, docs, external references, and prior artifacts.
- Reports sources, findings, contradictions, uncertainty, options, and confidence.
- Writes evidence packs under `.opencode/tgo/evidence/*` or equivalent.
- Does not implement code.

Builder:

- Owns implementation against approved specs/plans/delegation envelopes.
- Writes code, tests, and docs only within the allowed task scope.
- Reports touched files, validation commands, deviations, risks, and blocked decisions.
- Returns `needs_decision`, `blocked`, or `rejected_scope` rather than improvising architecture.

Reviewer:

- Owns independent verification and challenge.
- Read-only by default.
- Checks work against user request, specs, acceptance criteria, evidence, tests, and scope.
- Rejects unsupported claims, missing verification, scope drift, missing tests without explanation, and ungrounded implementation choices.
- Required before completion claims for behavior-changing code/config/doc changes.

Council:

- Escalation-only, not routine review.
- Produces one synthesized recommendation, not a vote dump.
- Receives the same spec/evidence/review artifacts as other agents.

Councillors:

- Derived from the active Researcher, Builder, and Reviewer models by default.
- Use council-specific prompts/foci rather than acting as their normal roles.
- Researcher-model councillor focuses on evidence quality, missing context, and source reliability.
- Builder-model councillor focuses on implementation feasibility, sequencing, and operational risk.
- Reviewer-model councillor focuses on correctness, verification gaps, and failure modes.
- If multiple roles use the same underlying LLM, keep separate prompted seats by default and optionally warn about low model diversity.

## Workflow Phases

TGO v2 uses SDD-inspired phases without requiring a separate agent per phase.

General phases:

- Intake: understand and classify the user request.
- Retrieve: gather relevant code/docs/history/evidence before technical judgment.
- Propose: compare approaches and surface tradeoffs.
- Spec: capture approved behavior, constraints, decisions, and acceptance criteria.
- Design: define architecture and boundaries.
- Tasks: break approved design into delegable units.
- Apply: Builder implements code/tests/docs.
- Verify: Reviewer checks work.
- Archive: preserve decisions, handoffs, links, and state.

Small bugfix path:

- Retrieve.
- Apply.
- Verify.
- Archive.

Feature/refactor path:

- Intake.
- Retrieve.
- Propose.
- Spec.
- Design.
- Tasks.
- Apply.
- Verify.
- Archive.

Ambiguous/high-risk path:

- Intake.
- Retrieve.
- Propose.
- Council.
- Spec/design.
- Tasks.
- Apply.
- Verify.
- Archive.

Not every request requires every artifact, but non-trivial work must pass conceptual gates.

## Retrieval-Led Reasoning

Any substantive technical claim must be grounded in at least one of:

- Retrieved codebase evidence.
- External documentation.
- Prior project context files.
- Specialist report.
- Reviewer/council output.
- Explicit user preference.

Otherwise, the claim must be labelled as an assumption.

The Orchestrator may directly:

- Classify requests.
- Ask clarifying questions.
- Inspect small relevant files.
- Decide dispatch.
- Synthesize findings.
- Preserve decisions.

The Orchestrator may not:

- Diagnose complex bugs from memory.
- Pick architectures without retrieval.
- Summarize external framework behavior without source lookup.
- Claim verification without test/reviewer evidence.
- Skip Reviewer because a change seems obvious.

Researcher evidence packs should include:

- Question investigated.
- Sources inspected.
- Relevant findings.
- Contradictions or uncertainty.
- Recommended options.
- Confidence level.

## Goal Confirmation

Every non-trivial feature/refactor gets a short explicit Goal Confirmation before execution.

Full `grill-with-docs` or deeper interrogation is used when:

- The request is ambiguous.
- The risk is high.
- Domain language is uncertain.
- There is a real architectural tradeoff.
- The user explicitly asks for grilling/council-level challenge.

Trivial lookups and trivial fixes can skip both only when marked trivial in the delegation envelope.

## Delegation Envelopes

Delegation envelopes become stricter and artifact-referenced for non-trivial orchestrator-delegated work.

Required fields:

- `stream_id`.
- `phase`.
- `goal`.
- `scope`.
- `out_of_scope`.
- `artifact_refs`.
- `reuse_policy`.
- `acceptance_criteria`.
- `verification_required`.
- `allowed_write_paths`.
- `failure_mode`.
- `user_intent`.

`failure_mode` values should include:

- `needs_decision`.
- `blocked`.
- `rejected_scope`.

`user_intent` block fields:

- `verbatim_request`.
- `relevant_quotes`.
- `orchestrator_interpretation`.
- `user_confirmed_decisions`.
- `open_questions`.

Rules:

- Include the exact latest user text when short enough.
- Use verbatim excerpts for longer/older context.
- Link canonical specs/plans rather than copying all context.
- Require specialists to flag mismatches between verbatim request and orchestrator interpretation.
- Do not let specialists silently follow a questionable interpretation.

Direct specialist invocation remains allowed:

- Strict machine-readable envelopes apply to orchestrator-delegated work, not every direct user message.
- Direct user to Researcher may produce evidence or ask clarifying questions.
- Direct user to Builder is allowed within Builder permissions, but Builder should ask for missing goal/scope/acceptance criteria before meaningful edits.
- Direct user to Reviewer is allowed in read-only review mode.
- Direct user to Council is allowed only as explicit escalation/consensus request.

## Reviewer Gate

Any code, config, or doc change that affects project behavior must pass Reviewer before Orchestrator claims completion.

Reviewer is not required for:

- Trivial read-only answers.
- Pure research.
- Early brainstorming.

If Builder output is rejected twice on the same task:

- Orchestrator escalates to Council, or
- Orchestrator asks the user for a decision.

The Orchestrator must not loop indefinitely.

## Council Triggers

Council is triggered when:

- Reviewer rejects the same task twice.
- A decision is high-risk, hard to reverse, or security-sensitive.
- There is a genuine architecture tradeoff with no clear winner.
- The user explicitly asks for Council.
- Model/tooling behavior is disputed or uncertain.

Council is not routine review.

## Persistent Context And Artifacts

Beads owns actionable work tracking. TGO artifacts preserve reasoning and verification history.

Beads tracks:

- Actionable issues.
- Dependencies.
- Status.
- Priorities.
- Ready/blocked state.

TGO artifacts track:

- Rationale.
- Retrieval.
- Decisions.
- Specs.
- Implementation plans.
- Evidence.
- Reviews.
- Handoffs.

Planned artifact locations:

- `.opencode/tgo/state.jsonc` or equivalent for stream/session/delegation state.
- `.opencode/tgo/specs/*` for approved intent, constraints, design decisions, and acceptance criteria.
- `.opencode/tgo/plans/*` for executable task breakdowns.
- `.opencode/tgo/evidence/*` for Researcher evidence packs.
- `.opencode/tgo/reviews/*` for Reviewer/Council reports.
- `.opencode/tgo/handoffs/*` for durable transfer between sessions/agents.

The earlier v1-style `.opencode/state.md` approach should evolve into typed artifacts rather than one giant state file.

Artifact-guided session reuse:

- Reuse specialist sessions only when same active stream, same specialist lane, and same referenced artifact set apply.
- Start fresh when the task switches domains, context is stale/noisy, or independence matters.
- Reviewer and Council generally get fresh/independent context anchored by artifacts.
- Delegation envelopes should include `reuse_policy`, `stream_id`, and artifact references.

## Beads Integration

Beads is the default issue tracker.

TGO should integrate with Beads through:

- The `bd` CLI.
- The pinned `opencode-beads` plugin.
- Per-project `.beads` databases from `bd init`.
- Beads-aware `docs/agents/*` defaults.

`opencode-beads` should be used rather than vendored by default, unless plugin composition blocks clean use.

`opencode-beads` behavior to account for:

- Requires Beads CLI first.
- Provides `bd prime` context injection on session start/compaction.
- Provides `/bd-*` commands mirroring `bd`.
- Provides `beads-task-agent`.
- Its current implementation can silently skip if `bd prime` fails.
- It injects only into primary/all agents, not ordinary subagents except `beads-task-agent`.

`/beads:init` must be corrected to real Beads CLI behavior:

- Beads command is `bd init`, not `beads init`.
- Current v1 command shape is likely wrong and must be fixed.

Beads and TGO artifacts:

- TGO links Beads issues to artifacts rather than duplicating all artifact content into Beads.
- `/tgo:init` seeds Beads-aware `docs/agents/*`.
- `/tgo:doctor` verifies `.beads` exists and artifact links are coherent.

Approved plans and Beads issues:

- Approved TGO implementation plans automatically generate/link Beads issues.
- Only after spec/plan approval.
- Each plan task becomes one `bd` issue with dependencies/status and links to relevant TGO spec/plan/evidence/review files.
- TGO must not create Beads issues during early brainstorming or unapproved design.
- `/tgo:doctor` can detect approved plan tasks without linked Beads issues and offer repair.

## `/tgo:work` And Autonomy

TGO autonomy is user-triggered, not background self-starting.

TGO must not start work just because Beads has ready issues.

TGO must not launch edits from:

- Startup.
- Timers.
- Compaction hooks.
- Background polling.

Work starts only when the user invokes something like:

- `/tgo:work`.
- `/tgo:work --next`.
- A normal natural-language request.

Work flow:

- Orchestrator inspects ready Beads issues linked to approved TGO plans.
- Orchestrator performs short Goal Confirmation for the selected issue.
- Orchestrator delegates bounded implementation to Builder.
- Reviewer verifies.
- Orchestrator continues to additional ready tasks only after user confirmation or explicit `--auto-continue`.

Ready Beads issues not linked to an approved TGO plan:

- Can still be worked.
- Must pass a lightweight intake gate first.
- Orchestrator retrieves issue context and project docs.
- Orchestrator creates or asks for a minimal spec/task brief.
- User approves before implementation.
- Trivial maintenance issues may use a very small brief.

`beads-task-agent`:

- Should remain installed/available through `opencode-beads`.
- Should not be the default execution path.
- TGO’s orchestrator remains the normal work router.
- `beads-task-agent` is an escape hatch for simple autonomous issue work.

## Matt Pocock Skills

Default curated Matt Pocock skill set:

- `setup-matt-pocock-skills`.
- `grill-with-docs`.
- `diagnose`.
- `tdd`.
- `to-prd`.
- `to-issues`.
- `triage`.
- `improve-codebase-architecture`.
- `zoom-out`.
- `handoff`.

`all-bells` can install the full set.

Important setup decision:

- `setup-matt-pocock-skills` is prompt-driven and has `disable-model-invocation: true`.
- It is not an executable setup script.
- TGO must install/audit/use the skill, not run it as `npx setup-matt-pocock-skills`.
- Current v1 behavior attempting to run it as an `npx` executable is wrong.

Project setup:

- `/tgo:init` should deterministically generate Beads-aware `docs/agents/*` defaults first.
- Those defaults make Beads the immediate issue tracker for Matt Pocock-style workflows.
- Matt Pocock setup becomes optional refinement rather than required blocking setup.
- This removes the current failure mode where setup is treated as a deterministic script.

Matt skill docs should be extended/preseeded for Beads:

- The default local markdown template uses `.scratch` in Matt’s repo.
- TGO should generate Beads-oriented issue tracker docs instead.

## Skill And MCP Policy

Guiding principle:

- Function first, efficiency second.
- Avoid MCP servers when equivalent skill/CLI/plugin functionality preserves function.
- Do not remove useful functionality solely for token purity.

Skill-first rule:

- Use skills for repeatable procedures, project-specific workflows, review protocols, self-improvement, diagnosis loops, planning, and context-preserving processes.
- Use MCPs/tools for live data, browser automation, GitHub operations, docs/search when no skill covers it, and external APIs.
- If both a skill and MCP apply, load/use the skill first to guide efficient tool/MCP use.

Existing user skills:

- Stay visible by default.
- TGO only role-filters TGO-managed skills unless user opts into stricter filtering.
- User skills can coexist unless they conflict by name or tool registration.
- If a user skill shares a name with a TGO-managed skill, TGO warns and prefers the managed path for TGO workflows.
- `/tgo:doctor` reports duplicates/conflicts.
- Project overrides can disable noisy skills.

Existing user MCPs:

- Stay visible by default.
- TGO does not hide or remove user MCPs automatically.
- TGO manages permissions/config only for MCPs it installs or explicitly adopts.
- `/tgo:doctor` reports non-TGO MCPs as user-managed and visible.
- GitHub MCP removal remains manual/user-approved.

TGO-managed MCP permissions:

- Governed by tooling preset.
- Limited to appropriate roles.
- `default` websearch and grep_app should be limited to Researcher by default.

## Tooling Presets

Tooling presets:

- `bare-bones`.
- `default`.
- `all-bells`.

Do not create a separate `offline/local` preset.

`bare-bones` includes:

- Dispatcher agents.
- Bundled skills.
- Beads.
- No remote MCPs.

`default` includes:

- Beads.
- Curated Matt Pocock skills.
- Context7 CLI+skill.
- websearch MCP.
- grep_app MCP.
- AFT.

`all-bells` includes:

- Everything in `default`.
- Serena.
- Constrained GitHub MCP.
- Context7 MCP may be available for fallback/explicit use.

Default first-run install target:

- `--tools default --models balanced`.

Tool preset state:

- Lives primarily in TGO manifests.
- OpenCode config contains only executable results such as plugin/MCP/skill/permission/agent entries.
- Project manifest records project overrides such as disabled/enabled tool capabilities.
- `/tgo:doctor` reconciles manifest state with actual OpenCode config and reports drift.

## Integration-Specific Decisions

Context7:

- `default` uses Context7 CLI+skill mode only.
- Context7 MCP is reserved for `all-bells` or explicit fallback when CLI mode cannot work.
- `npx ctx7 setup --opencode` authenticates via OAuth, generates an API key, installs appropriate skill, and lets user choose CLI or MCP mode.
- CLI+skill mode requires the OpenCode runtime/session to execute local commands such as `ctx7`.
- It does not inherently require using a terminal UI, but desktop viability depends on whether the app exposes local command/tool execution.
- If desktop/sandboxed runtime cannot run local commands, MCP mode is safer.

AFT:

- Included in `default` as a peer OpenCode plugin, not vendored.
- If AFT setup fails, TGO continues with native tools and reports degraded local-code intelligence.
- AFT overlaps local code navigation/search/editing tools.
- AFT does not replace public GitHub-wide grep.app code search in OpenCode.

websearch MCP:

- Included in `default`.
- Limited to Researcher by default.
- Existing v1 websearch supports Exa by default and Tavily via config/env.
- `webfetch` alone is not a replacement because it fetches/analyzes known URLs rather than doing general web search.

grep_app MCP:

- Included in `default`.
- Limited to Researcher by default.
- Remains useful for public GitHub code examples and real-world usage search.
- AFT does not make it redundant.

GitHub MCP:

- Included only in `all-bells` by default.
- Read-only by default.
- Write operations should stay behind explicit approval and normally use `gh`/GitHub tools rather than broad MCP write access.
- Official guidance warns GitHub MCP can add many tokens, so it should be constrained.
- Provides repository/file/commit/branch/PR/actions/releases/users/orgs/security findings/notifications/code search and more.
- Not a Beads replacement.
- Most routine needs can be handled by `git`, `gh`, Beads, GitHub API/tools, and grep_app.
- Config should reference env vars such as `{env:GITHUB_PERSONAL_ACCESS_TOKEN}`, never raw tokens.

Serena:

- Optional dependency/install-check only.
- Only registered when `all-bells` is active.
- Local semantic-code MCP with symbol navigation, LSP-backed intelligence, project memories/onboarding, and refactor/navigation tools.
- Supports retrieval-led SDD but overlaps with AFT.
- Useful for advanced code-intelligence workflows, especially large codebases/refactors.
- Not mandatory for default if AFT and Researcher lane exist.

## Model Presets

Tooling presets and model presets are separate but composable.

Tooling presets control installed/registered capabilities.

Model presets independently control:

- Orchestrator model.
- Researcher model.
- Builder model.
- Reviewer model.
- Council model/fallback behavior.

Changing tools later must not unexpectedly change models.

Bootstrap accepts both dimensions:

- `bootstrap --tools default --models balanced`.

Default with no flags:

- `--tools default --models balanced`.

Command vocabulary:

- `/preset` remains a legacy compatibility alias for model preset switching.
- `/tgo:models <name>` is canonical model-lineup switch.
- `/tgo:setup --tools <preset>` handles tooling preset changes.
- `/tgo:doctor` reports both dimensions, such as `tools=default`, `models=balanced`.

Config keys:

- Canonical model preset config key is `modelPresets`.
- Existing `presets` remains supported as a legacy alias for model presets.
- `/tgo:models` reads `modelPresets` first, then legacy `presets`.
- `/tgo:doctor` warns if both are present and conflict.
- Migration can copy old `presets` into `modelPresets` with approval.

Built-in catalog:

- Model presets ship as a versioned built-in catalog.
- User/global config can add or override via `modelPresets`.
- `/tgo:models` lists built-in plus user-defined presets.
- Global manifest records active model preset and catalog version.
- Actual bundled presets remain provisional until the user provides the model list.

Model capability warnings:

- Built-in catalog supports lightweight role capability requirements.
- `/tgo:doctor` can warn about unsafe user-defined lineups without hard-failing unknown models.

Expected role capabilities:

- Orchestrator: strong reasoning, long context, tool discipline.
- Researcher: retrieval, summarization, citations/source handling.
- Builder: code editing, test generation, tool competence.
- Reviewer: adversarial reasoning, spec comparison, defect detection.
- Council: reasoning diversity and high-context analysis.

Example warning:

- Same low-reasoning model used for orchestrator, builder, and reviewer risks weak independent verification.

## Council And Models

Active preset is the single source of truth.

Default council derivation:

- Council synthesizer model equals active Orchestrator model.
- Councillor models equal active Researcher, Builder, and Reviewer models.

Optional config may override:

- Prompts.
- Seat names.
- Seats.
- Timeouts/retries.
- Explicit models.

Existing explicit `council.presets` are a shipped v1 feature and should not be abruptly removed. Treat explicit presets as an advanced override path, with derived council as default/recommended.

## Bootstrap And Setup Commands

The `trans-genderian-orchestra` npm package should ship both:

- The OpenCode plugin entrypoint.
- The external bootstrap CLI binary.

Avoid a separate installer package.

First install should look like:

```bash
npx trans-genderian-orchestra@<version> bootstrap --tools default --models balanced
```

Reasoning:

- Avoid installer/plugin version skew.
- Manifest records one package/version.
- Rollback/doctor behavior is simpler.
- Bootstrap can register the exact plugin package it came from.

Plugin command chicken-and-egg:

- A plugin command cannot install the plugin itself.
- External bootstrap handles first install.
- In-plugin commands manage later setup/tool changes/project init/doctor/uninstall.

Normal first-run flow:

- Run `npx trans-genderian-orchestra@<version> bootstrap --tools default --models balanced`.
- Restart OpenCode.
- Run `/tgo:init` in each project.
- Optionally run `/tgo:doctor`.
- Later use `/tgo:setup --tools all-bells` or similar to change tool preset.

Bootstrap performs default full setup:

- Adds TGO plugin to global OpenCode config.
- Registers default peer tools/plugins.
- Registers pinned `opencode-beads`.
- Registers AFT plugin.
- Registers Context7 CLI+skill.
- Registers websearch MCP.
- Registers grep_app MCP.
- Writes global manifest.
- Backs up config.
- Shows dry-run preview unless `--yes`.
- Tells user to restart OpenCode.

Guided/auth steps:

- Context7 OAuth may require interactive handoff.
- If skipped, installer records `installed_unauthed`.
- `/tgo:doctor` reports exact repair command.

`/tgo:setup`:

- Not required for normal first use.
- Used later to change preset, enable/disable tools, rerun guided setup pieces, upgrade pinned dependencies, or repair/reconcile manifest drift.

`/tgo:init`:

- Project-local setup only.
- Runs/ensures `bd init`.
- Creates lean `AGENTS.md`.
- Creates `CONTEXT.md` when needed.
- Creates Beads-aware `docs/agents/*`.
- Creates `.opencode/tgo/*` artifact scaffolding.

Legacy command compatibility:

- `/init` aliases to `/tgo:init`.
- `/beads:init` remains a narrow helper implemented correctly via `bd init`.
- `/init:all` is deprecated because it mixes global install, project init, Beads, and skill setup unsafely.
- `/init:all` should print guidance pointing to new commands.

## Deterministic Vs Agent-Orchestrated Commands

Commands split into deterministic setup/config commands and agent-orchestrated workflow commands.

Deterministic commands:

- External `bootstrap`.
- `/tgo:setup`.
- `/tgo:doctor`.
- `/tgo:uninstall`.
- `/tgo:init`.
- `/beads:init`.

Deterministic commands must use:

- Shared TypeScript command logic.
- Structured dry-run/apply results.
- Backups.
- Manifests.
- Predictable validation.

Agent-orchestrated commands:

- `/tgo:work`.
- `/new-stream`.
- `/close-stream`.
- Council escalation.
- Goal confirmation.
- Spec/plan creation.

Agent-orchestrated commands can be prompt-driven because they depend on judgment/context.

Anything that writes config, installs tools, edits manifests, or mutates project scaffolding should not depend on prose/model behavior.

## Deterministic Command Output Contract

Every deterministic command should produce the same structured result shape and support human-readable output plus `--json`.

Shared result fields:

- `planned_actions`.
- `changes_applied`.
- `backups_created`.
- `manifest_updates`.
- `warnings`.
- `blocked_capabilities`.
- `degraded_capabilities`.
- `restart_required`.
- `next_steps`.

## Install Authority And Safety

Bootstrap uses hybrid install authority.

Automatically applies OpenCode-managed/config-package registrations:

- TGO plugin.
- Pinned `opencode-beads`.
- AFT plugin registration.
- websearch MCP config.
- grep_app MCP config.
- Optional GitHub MCP config.
- Global skill paths/skill pack registrations.

For system-level CLIs, bootstrap detects first and asks before installing:

- `bd`.
- `ctx7`.
- Serena / `uvx`.
- `gh` if needed.

Reason:

- These touch the wider machine.
- They may conflict with existing Homebrew/npm/pipx/uv installs.

With `--yes`:

- Bootstrap may apply the recommended install path.

Dependency ownership:

- If a bundled TGO dependency already exists and is user-managed, bootstrap must not overwrite/adopt it automatically.
- Preview existing dependency, TGO pinned version, and choices.
- Choices include leave user-managed, adopt pinned TGO version, or skip.
- Default is leave user-managed unless existing version is incompatible or broken.

Version behavior:

- Compatible/unknown user-managed version: leave user-managed and warn if not pinned.
- Known incompatible version: block only that capability and explain repair choices.
- Adopted dependency: reconcile to TGO pinned version.
- `/tgo:doctor` reports drift until resolved or explicitly ignored.

## Global Default Agent

Bootstrap should make TGO the global `default_agent` with preview/approval.

Rules:

- If `default_agent` is unset, bootstrap sets it to the TGO orchestrator.
- If already set, dry-run previews replacement and asks before applying.
- Previous value is recorded in global manifest/backup.
- Rollback or `/tgo:uninstall` can restore it.
- Users can opt out with `--no-default-agent`.

## Config Merge And User Preservation

Global OpenCode config changes are additive and TGO-managed only.

Installer preserves unrelated user:

- Providers.
- Agents.
- Plugins.
- MCPs.
- Permissions.
- Customizations.
- Skills.

Direct conflicts with TGO-managed keys:

- Must be previewed.
- Require approval.
- Must not be silently overwritten.

Existing user-managed installs:

- Stay preserved unless explicitly adopted into TGO management.

Existing `oh-my-opencode-slim` installs:

- Detected and offered as a migration path.
- Never auto-removed.
- `/tgo:doctor` detects omo-slim plugins, bundled MCPs, skill paths, and overlapping config.
- `/tgo:install`/bootstrap shows a migration section in dry-run preview.
- TGO can recommend disabling/removing duplicate omo-slim entries after TGO equivalents are installed.
- Any removal/modification requires explicit approval.
- OpenCode config is backed up first.
- If both plugins remain active, warn about duplicate agents, duplicate MCP registration, and prompt/tool noise.

## Manifests

TGO keeps managed install manifests to track ownership, repair, drift detection, and future uninstall.

Preferred format:

- JSONC if practical.
- If JSONC parsing is awkward during implementation, fallback is strict JSON plus generated Markdown summaries.

Suggested locations:

- Global: `~/.config/opencode/tgo/manifest.jsonc`.
- Project: `.opencode/tgo/manifest.jsonc`.

Global manifest tracks:

- Active tooling preset.
- Active model preset.
- Model catalog version.
- Installed tool versions.
- Global OpenCode config keys TGO added/manages.
- Peer plugins.
- MCP registrations.
- Backups.
- Last verification results.
- Ignored global warnings.

Project manifest tracks:

- Per-project `bd init` state.
- `AGENTS.md` state/ownership.
- `CONTEXT.md` state/ownership.
- `docs/agents/*` state/ownership.
- Specs/plans/evidence/reviews paths.
- Project overrides.
- Beads/artifact links.
- Ignored project warnings.

Tool preset state:

- One global active preset.
- Project overrides may narrow or expand access to installed capabilities per repo.
- Project overrides must not create separate global installs or duplicate MCP/plugin registrations.

Ignored warnings:

- Stored in the relevant manifest.
- Include scoped reason and optional expiry.
- Never automatic.
- `/tgo:doctor` still shows ignored warnings in a collapsed/summary section.
- Critical warnings cannot be permanently ignored, only snoozed.
- Project ignores live in project manifest.
- Global ignores live in global manifest.

## `/tgo:doctor`

`/tgo:doctor` is read-only by default.

Repairs require explicit second-step invocation:

- `tgo:doctor --repair`, or
- Interactive “Apply recommended repairs?” confirmation.

Repair operations:

- Preview changes.
- Back up first.
- Stay bounded to TGO-owned config/manifest/artifact state unless user explicitly approves broader action.

Missing external prerequisites:

- Report with exact install commands.
- Do not silently install from doctor.

Doctor checks should include:

- Drift.
- Missing tools.
- Unsafe auth.
- v1 config.
- Degraded capabilities.
- Omo-slim overlap.
- Manifest drift.
- Orphaned TGO-managed entries.
- Failed rollback/restore states.
- Missing `.beads`.
- Artifact link coherence.
- Approved plan tasks without linked Beads issues.
- Duplicate/conflicting skills.
- User-managed MCPs visible.
- Model/tool preset state.
- Conflicting `modelPresets` vs legacy `presets`.

## Secrets And Auth

TGO must never write raw secrets into its manifest or OpenCode config.

Auth handling:

- Context7 uses its own `ctx7` OAuth/setup flow.
- GitHub MCP should reference env vars such as `{env:GITHUB_PERSONAL_ACCESS_TOKEN}`.
- websearch MCP should use env vars such as `EXA_API_KEY` or `TAVILY_API_KEY`.

Manifests record:

- Auth mode.
- Auth status.
- Examples: `configured via env`, `configured via OAuth`, `missing env`.

Manifests must not record:

- Secret values.
- Raw tokens.
- Raw PATs.

`/tgo:doctor`:

- May report missing auth.
- May show safe repair instructions.
- Must not print or persist secret values.

`/tgo:install`/bootstrap:

- May add safe config placeholders only.

Important current-machine note:

- During read-only inspection, a raw GitHub PAT appeared inline in `~/.config/opencode/opencode.jsonc` under `mcp.github`.
- That token should be revoked/rotated.
- Later intended edit when allowed: remove only `mcp.github`, preserve the rest of `opencode.jsonc`, then restart OpenCode.
- Do not copy that secret into docs, manifests, logs, or commits.

## Rollback And Uninstall

Add bounded rollback/uninstall support.

`/tgo:uninstall` removes only:

- TGO-managed OpenCode config entries.
- TGO-managed peer plugin registrations.
- TGO-managed MCP registrations.
- Generated TGO manifests.
- Generated TGO-managed guidance/artifact scaffolding.

`/tgo:uninstall` can restore from backup for the last install/apply operation where possible.

It must not automatically uninstall shared global CLIs such as:

- `bd`.
- `ctx7`.
- Serena tooling.
- GitHub tooling.

Exception:

- If TGO installed the CLI and the user explicitly confirms removal.

`/tgo:doctor` should detect:

- Orphaned TGO-managed entries.
- Manifest drift.
- Failed rollback/restore states.

## Version Pinning And Upgrades

Third-party tools/plugins should be pinned to known-tested versions rather than always installing latest.

Pin where possible:

- `opencode-beads`.
- AFT.
- Serena/GitHub MCP config assumptions.
- Bundled skill pack versions.

`/tgo:doctor`:

- Can report available updates.

Upgrades:

- Explicit rather than automatic.

## Testing Strategy

Deterministic command logic should be tested without real installs using injectable adapters.

Adapters:

- Filesystem adapter for config/manifests/backups.
- Package/CLI adapter for detecting/installing `bd`, `ctx7`, AFT, `opencode-beads`, etc.
- OpenCode config adapter for JSONC parsing/merge/write.
- Command runner adapter for dry-run vs apply.

Tests should cover:

- Dry-run.
- Apply.
- Conflict detection.
- Backup creation.
- Manifest drift.
- Rollback/uninstall.
- Degraded capability reporting.
- v1/omo-slim migration warnings.
- Secret-safe config generation.
- Beads init command shape.
- Matt Pocock setup not being treated as executable.

Real external install smoke tests:

- Optional/manual.
- Not normal CI.

## Development Location And Repo Layout

V2 development isolation:

- Start `trans-genderian-orchestra-v2/` as a blank-slate package skeleton.
- Use v1 (`trans-genderian-orchestra/`) as a reference library, not the starting point.
- Copy over only deliberately selected files/modules after reviewing whether they still fit v2.
- Prefer reimplementing orchestration, command setup, manifests, presets, artifact model, and delegation envelopes around the new design.
- Reuse v1 tests selectively as regression tests, rewriting expectations where v2 intentionally changes behavior.
- Keep v1 untouched until v2 reaches verified parity or intentionally supersedes it.

Safe reuse candidates:

- JSON/config merge helpers.
- Permission/path-gating concepts but not exact allowlists.
- Skill filtering hook architecture.
- Council/session lifecycle pieces if not too coupled to old role names.
- Existing tests as behavioral reference.
- MCP definitions for `websearch`/`grep_app`, reviewed against new preset ownership rules.

Rewrite candidates:

- Orchestrator prompt/role roster.
- Planner removal.
- Startup init command surface.
- Beads init/setup.
- Matt Pocock setup behavior.
- Tool preset handling.
- Manifest/doctor/uninstall/bootstrap logic.
- Artifact model.
- Delegation envelopes.

Reuse justification rule:

- Every copied v1 module must have a short reuse justification in the implementation plan.
- Justification must state why it is reused, what assumptions were checked, and what v2 tests cover it.

Package identity during development:

- Develop in `trans-genderian-orchestra-v2/`.
- Target final package identity `trans-genderian-orchestra` from day one.
- Bootstrap/config keys/docs/manifests should align with eventual cutover.
- Filesystem isolation protects v1 during development.

GitHub repository layout:

- GitHub cannot target a subfolder as repository root.
- GitHub landing README is always root `README.md`.
- Current repo root is `/Users/ryan/OpenCode/general/omo-slim_modifications` with remote `git@github.com:octini/trans-genderian-orchestra.git`.
- Current root lacks README; v1 README is nested in `trans-genderian-orchestra/README.md`.

Release cutover:

- During development, v2 lives in `trans-genderian-orchestra-v2/`.
- At release cutover, v2 package contents move to repository root.
- Root should contain `README.md`, `package.json`, `src/`, `docs/`, tests, config, and CLI entrypoints.
- Final GitHub repo root should be plugin package root.
- Published npm package should use root package metadata, not nested package path.
- Temporary planning/workspace-only files like `designs/`, `user_uploads/`, and temporary `.opencode` context should not ship in the package.
- Do not keep v1 under `legacy/` in final repo unless a specific release/legal reason appears.
- Preserve v1 through git history and optionally branch/tag such as `v1-archive` or `v1-final`.
- Root README becomes plugin README.
- Root `package.json` becomes package source of truth.

## Release And Beta Strategy

V2 can have prerelease/beta distribution while developed in `trans-genderian-orchestra-v2/`, but stable `latest` waits until repo-root cutover.

Beta strategy:

- Development remains in v2 subfolder.
- Internal package identity targets `trans-genderian-orchestra`.
- Early testing can use local file paths/git branches.
- Publish beta as npm dist-tag `next` or versions like `2.0.0-beta.1`.
- Stable `latest` moves only after v2 is cut over to root and v1 is archived/tagged.
- Bootstrap defaults to stable unless explicitly requested, e.g. `npx trans-genderian-orchestra@next bootstrap`.

Major version boundary:

- V2 is a hard major-version boundary.
- Package identity remains `trans-genderian-orchestra`.
- Prereleases are `2.0.0-beta.N` under `next`.
- Stable cutover is `2.0.0`.
- `/tgo:doctor` and bootstrap detect v1-era config and offer migration.
- Do not preserve old planner/current orchestrator semantics solely for compatibility.
- Keep only low-cost user-facing aliases such as `/preset`, `/init`, and `/beads:init`.
- Document breaking changes clearly in `MIGRATION.md`.

Beta testing active config:

- V2 beta replaces v1 in active OpenCode config rather than running side-by-side.
- Side-by-side would create duplicate agents, commands, hooks, MCP registrations, and skill filtering behavior.
- Bootstrap backs up v1 config.
- Bootstrap disables/replaces v1-managed entries with v2-managed entries.
- Bootstrap writes manifest state.
- `/tgo:uninstall` or rollback restores v1.
- Users who want both should use separate OpenCode config profiles or separate test machine/worktree, not one merged runtime.

Stable `2.0.0` gates:

- Bootstrap dry-run, apply, backup, rollback, and uninstall paths are tested.
- `/tgo:doctor` detects drift, missing tools, unsafe auth, v1 config, and degraded capabilities.
- `/tgo:init` creates Beads, lean `AGENTS.md`, `CONTEXT.md`, `docs/agents/*`, and `.opencode/tgo/*` correctly.
- Default preset works in a clean OpenCode config.
- Beta migration from v1 to v2 works and can restore v1.
- Orchestrator to Researcher to Builder to Reviewer flow passes integration tests.
- Delegation envelopes preserve exact user intent and enforce scope.
- Beads issue creation only happens from approved plans.
- README and `MIGRATION.md` are complete.
- Secret handling is verified: no raw PATs/API keys in manifests or generated config.
- V1 is tagged/archived before root cutover.

Beta can ship before all gates are perfect. Stable `latest` requires the gates.

## Retained Existing Features

Retain/evolve these v1 features:

- Delegation envelope concept, made stricter and artifact-referenced.
- Exact user-intent preservation in handoffs.
- Reviewer enforcement.
- Council workflow, now derived from active role models by default.
- Path-gated permissions.
- Persistent context sharing, evolved from `.opencode/state.md` to typed `.opencode/tgo/*` artifacts.
- Artifact-guided session reuse.
- Skill filtering and role-scoped skill availability.
- MCP registration and per-agent MCP permissions, now governed by tooling presets and ownership manifests.
- Safer command family.
- Split model/tool presets.
- Config merge behavior that preserves user-owned config.
- Context file lifecycle.
- Startup/init intent, but with corrected command shapes and split responsibilities.

## Explicit V1 Changes/Removals

- Planner role is removed/merged into Orchestrator.
- Orchestrator is no longer a pure read-only dispatcher, but remains bounded away from implementation writes.
- `/init:all` is deprecated.
- `/beads:init` is corrected to real `bd init` behavior.
- Matt Pocock setup is not treated as an executable script.
- Setup moves to external bootstrap plus deterministic `/tgo:setup`, `/tgo:doctor`, and `/tgo:uninstall`.
- Beads becomes default issue tracker.
- Omo-slim coexistence is migration-aware but never auto-destructive.
- Existing explicit council presets become an advanced override path rather than default council behavior.
- Explicit `presets` remains a legacy alias for model presets; `modelPresets` becomes canonical.

## Current Known Risks And Follow-Ups

- Need exact package/version pins for AFT, `opencode-beads`, Context7 CLI behavior, Serena setup, and GitHub MCP config assumptions.
- Need the user’s desired model lineup before final built-in model preset catalog is concrete.
- Need to remove/rotate the raw GitHub PAT found in the current global OpenCode config when user permits config edits.
- Need to validate OpenCode config schema before writing installer/config changes.
- Need to verify JSONC parser/writer choice for manifests and OpenCode config preservation.
- Need to decide exact names for generated TGO-managed skill paths and artifact paths.
- Need to turn this checkpoint into formal specs before writing the implementation plan.

## Suggested Skills For Continuation

- `brainstorming`: continue resolving design questions and present final design sections for approval.
- `customize-opencode`: validate OpenCode config shape and plugin/MCP/skill registration details.
- `context7-mcp`: fetch current docs for OpenCode, Context7, and library setup details when needed.
- `write-a-skill`: design or draft any new TGO-managed skill workflows.
- `writing-plans`: after the design specs are approved, create implementation plans.
- `subagent-driven-development` or `executing-plans`: after the implementation plan is approved, execute work task-by-task.
- `verification-before-completion`: before claiming implementation complete or publishing/cutover readiness.
