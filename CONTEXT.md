# trans-genderian-orchestra v2 Domain Glossary

## Project

**trans-genderian-orchestra (TGO) v2** - An OpenCode workflow plugin that coordinates specialist agents, durable artifacts, deterministic setup, model presets, and verification gates. The active package lives at the repository root. Archived v1 material is reference material only.

TGO v2 is inspired by dispatcher-style orchestration, SDD-style artifacts, retrieval-led reasoning, and gatekeeper verification. It is not only a router: the orchestrator owns phase control and workflow decisions while builders own implementation.

## Agent Roles

**Orchestrator** - The user-facing technical lead, phase controller, workflow router, and artifact owner. It preserves user intent, classifies requests, asks for missing decisions, routes work to specialists, and synthesizes results. It should not silently implement arbitrary project changes.

**Researcher** - Evidence retrieval role for codebase search, documentation research, source comparison, and uncertainty reporting.

**Builder** - Scoped implementation role for code, tests, documentation, and local validation after approval or a clear task boundary.

**Reviewer** - Verification gatekeeper and advisory role. In Verification Mode it checks work against the user request, plan, tests, and acceptance criteria. In Advisory Mode it helps resolve architecture, security, and intent conflicts.

**Council** - Escalation-only synthesis workflow for explicit user requests, high-risk decisions, or repeated reviewer rejection loops.

**Councillor** - Internal council participant that provides one independent read-only analysis perspective. Councillors do not ask the user questions or write files.

## Workflow Concepts

**Delegation Envelope** - Structured handoff from orchestrator to a specialist. It should preserve verbatim user intent, task scope, acceptance criteria, context summary, relevant files, constraints, non-goals, and validation requirements.

**Specialist Result Contract** - Completion report from a specialist. It should include status, what changed, files touched, validation evidence, risks, and exact follow-up needs.

**Reviewer Gate** - Required verification step for behavior-changing work. Reviewer findings should prioritize bugs, regressions, missing tests, and mismatch with the original request or plan.

**Council Derivation** - Council seat models derive from the active model preset's Researcher, Builder, and Reviewer primary models when possible. The orchestrator primary model is used for synthesis.

**Conversation-Triggered Workflow** - TGO starts meaningful work from user intent in conversation or explicit commands, not from unattended startup hooks, timers, compaction hooks, polling, or ready issue queues.

**Durable Artifacts** - Specs, plans, manifests, state, handoffs, reviews, and validation logs preserve intent across compaction and delegation boundaries.

## Setup And Config Concepts

**Bootstrap** - Deterministic setup flow that previews or applies TGO-managed plugin, default agent, MCP, agent catalog, model preset, and manifest entries.

**Doctor** - Read-only inspection command that reports setup state, v1/omo-slim migration signals, missing TGO-managed entries, tool availability, secret-like values, and next steps without writing files.

**Manifest** - TGO-owned state under `~/.config/opencode/tgo/manifest.jsonc`. It records active presets, managed config keys, backups, ignored warnings, and verification metadata so repair, rollback, and uninstall can distinguish TGO-owned entries from user-owned config.

**OpenCode Config** - The load-bearing global config at `~/.config/opencode/opencode.jsonc`. TGO keeps required entries minimal here because OpenCode has no config include/import field.

**TGO Config Catalog** - The TGO-owned peer file at `~/.config/opencode/trans-genderian-orchestra.jsonc`. Bootstrap writes generated TGO agent definitions and built-in model presets here. OpenCode does not load this file by schema include; TGO commands and plugin hooks use it as plugin-owned catalog/state.

**Config Ownership Boundary** - User-owned providers, plugins, MCPs, agents, skills, permissions, and local tools must be preserved unless explicitly adopted or changed. TGO-managed writes should be backup-aware, manifest-linked, previewable, and reversible.

**Secret-Like Value** - A token, API key, PAT, password, or credential-like string. TGO should warn, redact, or reject secret-like values on generated/managed surfaces.

## Presets And Resilience

**Tool Preset** - Named tool/MCP/skill setup dimension such as `bare-bones`, `default`, or `all-bells`.

**Model Preset** - Named role-to-model lineup. Built-in presets are `balanced`, `mixed`, `copilot`, `go`, and `free`; `balanced` is a compatibility alias for `mixed`.

**Resilience Preset** - Named retry/fallback behavior dimension such as `conservative`, `balanced`, or `aggressive`. Resilience is separate from model selection.

**Fallback Classification** - Provider/model fallback handles structural failures such as transport errors, unavailable models, and provider failures. Semantic disagreement is not treated as success via fallback.

**Circuit Breaker** - Per-model/provider failure guard that prevents repeatedly selecting failing routes without surfacing the degraded state.

## Command Surface

**`/tgo:doctor`** - Inspect TGO setup and planned repairs.

**`/tgo:setup`** - Preview setup or preset changes.

**`/tgo:init`** - Initialize project-local guidance, validation, Beads, and artifact scaffolding.

**`/tgo:uninstall`** - Preview or remove TGO-managed entries safely.

**`/tgo:work`** - Start or continue approved TGO-managed implementation work.

**`/tgo:models`** - Inspect or switch model presets.

Compatibility aliases may exist only where implemented by the plugin command config.
