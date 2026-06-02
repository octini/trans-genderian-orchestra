---
artifact_type: design_spec
status: draft
spec_id: tgo-v2-07-implementation-phases-validation-gates
created_at: 2026-06-02
updated_at: 2026-06-02
source_checkpoint: designs/tgo-v2-settled-decisions.md
---

# Implementation Phases And Validation Gates

## Development Approach

V2 starts as a blank-slate package skeleton in `trans-genderian-orchestra-v2/`. V1 is a reference library, not the starting point. Copy over only deliberately selected files/modules after reviewing whether they fit v2.

Every copied v1 module requires a reuse justification in the implementation plan:

- Why it is reused.
- What assumptions were checked.
- What v2 tests cover it.

Safe reuse candidates:

- JSON/config merge helpers.
- Permission/path-gating concepts, not exact allowlists.
- Skill filtering hook architecture.
- Council/session lifecycle pieces if not too coupled to old role names.
- Existing tests as behavioral references.
- MCP definitions for websearch/grep_app reviewed against new ownership rules.

Rewrite candidates:

- Orchestrator prompt and role roster.
- Planner removal.
- Startup/init command surface.
- Beads init/setup.
- Matt Pocock setup behavior.
- Tool preset handling.
- Manifest/doctor/uninstall/bootstrap logic.
- Artifact model.
- Delegation envelopes.
- Parallel scheduler/integration workflow.

## Phase Order

Phase 1: package skeleton and deterministic setup foundation.

Phase 2: agent roster and permissions.

Phase 3: delegation, artifacts, and workflow intent routing.

Phase 4: Beads work tracking, worktrees, parallel scheduler, and integration flow.

Phase 5: tool presets and integrations.

Phase 6: model presets, fallback routing, resilience profiles, and council derivation.

Phase 7: beta migration and release cutover.

Rationale: setup/config/manifest behavior is riskiest because it touches global config and is easiest to test deterministically. Permissions and delegation are the spine. Beads and integrations should attach to a working orchestrator/reviewer workflow.

## Phase Gate Rule

No phase is complete until all three validation layers pass:

- CI unit/integration tests for deterministic logic.
- Local smoke commands using temp HOME/config fixtures, with no real global config mutation.
- Manual OpenCode workflow prompts only where a running OpenCode session is required.

Each phase must include exact commands/prompts, expected outputs, progression checklist, and failure-handling guidance.

For generated TGO plans, phase gates are enforced. Each phase/milestone gets Beads parent/task issues with validation subtasks. TGO should not mark a phase complete or generate next phase implementation issues until gates are recorded as passed, unless the user explicitly overrides with a note.

## Phase 1 Scope

Phase 1 builds a thin runnable v2 package skeleton plus deterministic setup foundation:

- `trans-genderian-orchestra-v2/` blank-slate package skeleton.
- Plugin entrypoint.
- External `bootstrap` CLI.
- Shared deterministic command result shape.
- Manifest read/write/backup logic.
- OpenCode config parse/merge/preview/apply logic.
- `/tgo:doctor` read-only checks.
- Minimal default agent registration with basic prompt if needed.
- Tests around dry-run/apply/backup/drift/secret-safe behavior.

Example CI command:

```bash
bun test src/bootstrap/*.test.ts src/commands/*.test.ts
```

Expected Phase 1 behaviors:

- Dry-run returns `planned_actions` for TGO plugin, pinned `opencode-beads`, AFT, websearch MCP, and grep_app MCP.
- Dry-run writes no files.
- Apply creates timestamped backup before config write.
- Token-like raw strings are redacted or rejected on TGO-managed surfaces.
- Existing user plugins/MCPs/providers remain unchanged.
- Conflicting TGO-managed keys appear under `warnings` and require approval.
- `--json` matches deterministic result shape.
- Doctor reports `restart_required` after config-changing apply.
- Missing `bd` reports blocked/degraded Beads capability with exact install command.
- Missing `ctx7` reports Context7 CLI degraded/unauthed state without blocking base install.

Example local smoke commands:

```bash
TGO_TEST_HOME=$(mktemp -d) npx ./trans-genderian-orchestra-v2 bootstrap --tools default --models balanced --resilience balanced --dry-run --json
```

Expected: JSON includes `planned_actions`, `warnings`, `blocked_capabilities`, `degraded_capabilities`, `restart_required`, and `next_steps`; no writes outside temp HOME.

```bash
TGO_TEST_HOME=$(mktemp -d) npx ./trans-genderian-orchestra-v2 bootstrap --tools default --models balanced --resilience balanced --yes --json
```

Expected: config file created/updated under temp HOME only, backup exists before write, manifest records operation, restart required is true.

Manual OpenCode prompts after restart:

```text
Run /tgo:doctor --json and summarize blocked/degraded capabilities.
```

Expected: Doctor distinguishes blocked versus degraded capabilities, never prints secrets, and reports restart/setup status.

```text
Run /tgo:init for this project, but do not overwrite existing AGENTS.md without previewing changes.
```

Expected: Init previews/backups existing managed files before creating/linking Beads/TGO scaffolding.

## Phase 2 Gates

Phase 2 implements namespaced agents and permission/path-gating.

Must verify:

- `tgo-orchestrator` can write only bounded TGO artifacts and explicit init/setup outputs.
- `tgo-researcher` can write evidence packs only.
- `tgo-builder` can edit scoped task worktrees.
- `tgo-reviewer`, `tgo-council`, and `tgo-councillor` are read-only by default.
- User-managed agents remain preserved.
- `default_agent` behavior is previewed/backed up/restorable.

## Phase 3 Gates

Phase 3 implements delegation envelopes, result contracts, intent routing, and artifact lifecycle.

Must verify:

- Non-trivial delegation without required fields is rejected/self-corrected.
- `user_intent.verbatim_request` and confirmed decisions are preserved.
- Missing/malformed specialist result block becomes `tool_schema_failure`.
- Draft/approved/superseded artifact rules are enforced.
- Inferred intent decisions are recorded.

## Phase 4 Gates

Phase 4 implements Beads, worktrees, scheduler, parallel waves, integration worktrees, commits, and post-integration options.

Must verify:

- Beads issues are generated only from approved plans.
- Task metadata includes dependency/write-scope/validation fields before auto-parallelization.
- Default parallel Builder limit is 2.
- Overlapping/unknown write scopes run serially or ask clarification.
- Each Builder gets a separate worktree/branch.
- Branch Reviewer artifacts and batch Reviewer artifact are created.
- Integration happens in dedicated integration worktree.
- Conflicts create reconciliation task, not automatic conflict-resolution commit.
- No push/PR/main merge/cleanup happens without explicit approval.

## Phase 5 Gates

Phase 5 implements tool presets and integrations.

Must verify:

- `bare-bones`, `default`, and `all-bells` produce expected planned registrations.
- Context7 default is CLI+skill, not MCP.
- Websearch and grep_app are Researcher-limited in default.
- AFT failure degrades gracefully.
- Serena and GitHub MCP are all-bells/explicit only.
- User-managed skills/plugins/MCPs remain visible and preserved.
- Secrets are env/OAuth only.

## Phase 6 Gates

Phase 6 implements model presets, resilience profiles, fallback, and council derivation.

Must verify:

- `modelPresets` canonical and legacy `presets` alias behavior.
- `/tgo:models` changes models only.
- `--resilience` changes retry/timeout/parallel/autonomy settings only.
- Provider fallback triggers only structural/provider failures.
- Semantic failures do not rotate models.
- Circuit breaker opens after configured threshold.
- Council derives seats from active Researcher/Builder/Reviewer models.
- Partial Council failure synthesizes from successful councillors.

## Phase 7 Gates

Phase 7 implements beta migration and release cutover behavior.

Must verify:

- V1-era config detected and migration preview shown.
- V2 beta replaces v1 in active config rather than running side-by-side.
- Rollback restores v1 config from manifest-linked backup.
- `MIGRATION.md` documents breaking changes.
- Stable release gates from umbrella spec are all satisfied before `latest`.

## Operator Validation Principle

Every phase must include exact test commands, exact manual prompts, expected output, and pass/fail criteria. Vague “run tests” or “verify behavior” instructions are insufficient.
