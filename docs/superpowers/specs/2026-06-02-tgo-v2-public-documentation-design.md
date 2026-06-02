# TGO v2 Public Documentation Design

## Goal

Replace the current minimal public documentation with a full GitHub-facing documentation set in the richer omo-slim style, while keeping every claim grounded in shipped TGO v2 behavior.

The documentation should help a reader understand what TGO is, why it exists, how to install and validate the beta, what features are available, and where to read deeper explanations. It should also act as a validation exercise by checking the final docs against the approved v2 design specs and implemented source modules.

## Source Material

- Current root `README.md`, `RELEASE.md`, and `MIGRATION.md`.
- Archived rich README style at `archive/trans-genderian-orchestra-v1/README.md`.
- Archived docs hub style at `archive/trans-genderian-orchestra-v1/docs/README.md`.
- TGO v2 design specs under `designs/tgo-v2/specs/00-umbrella-architecture.md` through `07-implementation-phases-validation-gates.md`.
- Implemented modules under `src/`, especially plugin agent/command config, workflow contracts, setup/doctor/manifest commands, tool/model/resilience presets, release/migration helpers, and public beta validation harness.

## Chosen Approach

Use a README-as-front-door plus focused deep-dive docs.

Do not attempt a full historical docs rewrite. The archived v1 docs contain useful style and structure, but much of their content is stale or aspirational for the current root package. The new docs should borrow the style while describing only the beta.2 implementation and clearly labeling beta/manual gates.

## README Design

The root README becomes the primary GitHub landing page.

It should include:

- Centered hero/header inspired by the archived v1 README: project name, tagline, short description, beta status, and badges/links only when accurate.
- A concise “What It Is” section: TGO is an OpenCode dispatcher plugin that routes work through specialist agents, deterministic setup, and review-oriented workflows.
- A philosophy section covering pure dispatch, specialist lanes, approval gates, retrieval-led reasoning, SDD-style artifacts, deterministic/reversible config, and automated validation before manual testing.
- Quick start:
  - `npm install trans-genderian-orchestra@beta`
  - `opencode plugin trans-genderian-orchestra@beta --global --force`
  - restart OpenCode because config-time plugin changes are not hot-reloaded
  - run `/tgo:doctor --json` before applying setup/bootstrap changes
- Current beta status:
  - root package version `2.0.0-beta.2`
  - npm `beta` tag points to `2.0.0-beta.2`
  - npm `latest` still points to `2.0.0-beta.0`
  - examples and automation should prefer `@beta` until stable release
- Feature map covering shipped behavior:
  - agent roster and permissions
  - command surface
  - setup/bootstrap/doctor/uninstall flows
  - manifests, backups, rollback, and ownership boundaries
  - v1/omo-slim migration preview
  - tool presets, skills, MCP planning, and user-managed config preservation
  - model presets, resilience profiles, provider fallback classification, and council derivation
  - delegation envelope, specialist result contract, reviewer gate, scheduler/worktree planning, integration/reconciliation primitives
  - release-readiness and public beta OpenCode validation harnesses
- Documentation index linking to the focused deep dives.
- Safety and boundaries section: no silent mutation, backups before writes, read-only doctor, uninstall only TGO-managed entries, no shared CLI uninstall, explicit approval before destructive/release actions.
- Validation status: automated suite, release-readiness verifier, and reusable public-beta OpenCode smoke.

The README must not claim unimplemented v1 features such as a working `/ping-all`, installer TUI, multiplexer panes, browser interview flow, or mature stable release unless the source code supports them.

## Deep-Dive Documentation Design

Create or update these docs under `docs/`:

1. `docs/README.md`

   Public docs hub. It should replace stale archived-v1-style links with current v2 docs and commands.

2. `docs/architecture.md`

   Umbrella architecture: purpose, goals, non-goals, root package layout, beta scope, namespacing, global/project scope, release boundary, retained v1 ideas, and explicit v1 changes.

3. `docs/agents-and-workflows.md`

   Agent roster, role boundaries, permissions, conversation-triggered intent, goal confirmation, delegation envelope, specialist result contract, reviewer gate, council escalation, scheduler waves, worktree planning, batch integration, reconciliation, and auto-continue/resume concepts. Clearly distinguish implemented deterministic primitives from future live-orchestrator behavior where needed.

4. `docs/setup-doctor-manifests.md`

   Bootstrap/setup/doctor/uninstall command behavior, command result contract, manifests, backups, config merge and ownership, secret-like value warnings, CLI detection, rollback, and safe uninstall.

5. `docs/tools-skills-mcps.md`

   Tool presets (`bare-bones`, `default`, `all-bells`), bundled plugin planning, skill policy, Context7/AFT/websearch/grep_app/GitHub/Serena intent, user-managed preservation, MCP permissions, and required CLI detection.

6. `docs/models-resilience-council.md`

   Model preset catalog, model switch planning, fallback classification, circuit breaker, resilience profiles, semantic retry boundaries, council derivation, councillor seats, and council synthesis readiness.

7. `docs/migration-and-release.md`

   v1/omo-slim detection, v2 replacement rule, rollback/uninstall, root cutover, npm beta state, `latest` caveat, release gates, public beta smoke, and remaining manual gate.

Keep `MIGRATION.md` and `RELEASE.md` as short operational documents and link to them from the docs hub. Update them only if the new public docs reveal stale wording.

## Validation And Coverage Design

Add lightweight documentation tests rather than relying only on manual review.

The tests should verify:

- README mentions `2.0.0-beta.2`, `trans-genderian-orchestra@beta`, `opencode plugin trans-genderian-orchestra@beta --global --force`, `/tgo:doctor --json`, `verify:public-beta-opencode`, and the `latest` caveat.
- README links to each new deep-dive doc.
- Docs hub links to each deep-dive doc.
- Documentation avoids stale v1 install paths such as `trans-genderian-orchestra-v2/` as active package guidance and old local archive install examples.
- Feature docs cover every v2 spec file number from `00` through `07` in some named section or checklist.

Also run existing validation:

- `bun test src/release/docs.test.ts src/release/release-readiness.test.ts src/release/repository-layout.test.ts`
- `bun run typecheck`
- `bun run check:ci`
- `bun run verify:release-readiness`

Do not run the external `verify:public-beta-opencode` smoke as part of this docs-only implementation unless the implementation plan explicitly chooses to; it is already available and validated but depends on network/OpenCode/model access.

## Non-Goals

- No npm publish.
- No version bump.
- No GitHub release or tag.
- No changes to plugin runtime behavior.
- No deletion of archived v1 material.
- No claim that TGO is stable; it remains public beta.

## Acceptance Criteria

- Root README is a full public landing page in the richer omo-slim style, but updated for root package beta.2 reality.
- Docs hub and deep-dive docs exist and are linked from README.
- Docs clearly explain install, doctor-first validation, beta/latest tag state, and restart requirements.
- Docs cover the shipped feature set across agents, workflows, setup/doctor/manifests, tools/skills/MCPs, models/resilience/council, migration/release, and validation.
- Docs avoid stale v1 claims and clearly distinguish implemented behavior from remaining manual gates.
- Documentation tests and focused validation commands pass.
- Only documentation/tests needed to validate documentation are changed.
