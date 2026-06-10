# Agents And Workflows

## Agent Roster

- Conductor: user-facing technical lead, planner, and coordinator. Delegates all implementation work to specialists.
- Scribe: research specialist. Codebase exploration, documentation lookup, and external research.
- Composer: implementation specialist. Code changes, UI/UX work, test writing, and validation.
- Principal: strategic advisor and final review gate. Architecture decisions, debugging guidance, and verification.
- Ensemble: multi-model consensus engine and review panel. Runs 3 reviewers in parallel with distinct focuses.
- Councillor: internal ensemble participant (first, second, third) with differentiated review perspectives.

## Role Boundaries

The conductor should not silently implement arbitrary project changes. The conductor plans, delegates, and coordinates. Composers own scoped implementation. The ensemble provides structured review. The principal does final verification before the conductor claims completion.

## Permissions

Agent permissions are designed around bounded write scopes. The conductor and scribe are read-only. The composer has write access. The principal and ensemble are read-only. User-owned config, tools, providers, skills, plugins, and MCPs are preserved unless explicitly adopted or changed.

## Conversation-Triggered Intent

TGO is designed around conversation-triggered workflows. The user should not need to memorize every slash command; the conductor should classify intent, ask for missing decisions when needed, and route to the right workflow.

## Review Loop

After the composer completes implementation, the review loop runs: ensemble (3 parallel reviewers with distinct focuses) → if rejected, composer reworks → ensemble again → principal final gate. Max 3 loops before mandatory escalation with "wheels spinning" flag.

## Specialist Result Contract

Specialists should report what changed, what was validated, unresolved risks, and exact follow-up needs. Results should be synthesizable by the conductor without losing user intent.

## Ensemble Escalation

The ensemble is appropriate for hard decisions needing multiple perspectives, or structured review of the composer's work. The ensemble uses majority consensus (2/3) with critical-issue override.
