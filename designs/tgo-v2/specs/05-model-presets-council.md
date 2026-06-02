---
artifact_type: design_spec
status: draft
spec_id: tgo-v2-05-model-presets-council
created_at: 2026-06-02
updated_at: 2026-06-02
source_checkpoint: designs/tgo-v2-settled-decisions.md
---

# Model Presets And Council Derivation

## Model Presets

Model presets are independent from tooling and resilience presets. They control role model lineups and fallback chains.

Canonical config key: `modelPresets`.

Legacy alias: `presets`, interpreted as model presets for compatibility. `/tgo:doctor` warns if both are present and conflict. Migration can copy legacy `presets` into `modelPresets` with approval.

Default bootstrap uses:

```bash
--models balanced
```

Actual bundled model presets remain provisional until the user provides the desired model list.

## Commands

- `/tgo:models <name>` is canonical for model-lineup switching.
- `/preset` remains a legacy compatibility alias for model preset switching.
- `/tgo:setup --tools <preset>` changes tooling, not models.
- `/tgo:setup --resilience <preset>` changes resilience, not models.
- `/tgo:doctor` reports all active dimensions: tools, models, resilience.

## Built-In Catalog

Model presets ship as a versioned built-in catalog. User/global config can add or override via `modelPresets`. `/tgo:models` lists built-in plus user-defined presets. The global manifest records active model preset and catalog version.

Doctor validates lightweight role capability expectations without hard-failing unknown models.

Expected capabilities:

- Orchestrator: strong reasoning, long-context synthesis, tool discipline, phase control.
- Researcher: retrieval, summarization, source comparison, citations, uncertainty reporting.
- Builder: code editing, test generation, command/tool competence.
- Reviewer: adversarial reasoning, spec comparison, defect detection.
- Council: reasoning diversity and high-context analysis.

Warnings are advisory unless a model is known incompatible. Example: using the same low-reasoning model for Orchestrator, Builder, and Reviewer risks weak independent verification.

## Fallback Chains

Fallback chains are role-specific. Known agent name should not fall through to another role's chain. Provider/model fallback triggers only structural/provider failures, not semantic failures.

Fallback candidates are ordered per role. Fallback decisions are recorded when they affect delegated work.

## Council Derivation

Council is a single escalation mode, not split into “team meeting” and “external model council.”

Defaults:

- Council synthesizer uses the active Orchestrator model.
- Councillor seats derive from active Researcher, Builder, and Reviewer models.
- Councillors do not act as normal role agents; each uses council-specific prompts/foci.

Default foci:

- Researcher-model councillor: evidence quality, missing context, source reliability.
- Builder-model councillor: feasibility, sequencing, operational risk.
- Reviewer-model councillor: correctness, verification gaps, failure modes.

If two roles use the same underlying model, keep both seats by default because prompted perspectives differ. Optionally warn about low model diversity; do not collapse seats unless configured.

## Council Overrides

Optional config may override:

- Councillor prompts.
- Seat names.
- Seat models.
- Timeouts/retries.
- Explicit council presets.

Existing explicit council presets remain an advanced override path for compatibility, but derived council from active role lineup is default/recommended.

## Council Failure Handling

Council supports partial failure:

- Councillors may run in parallel internally.
- Empty provider response gets retry behavior per resilience rules.
- Timed-out/failed councillors are marked in the council artifact.
- Council can synthesize if at least one councillor returns useful output.
- If zero councillors complete, Council returns an error and Orchestrator escalates to user.

Council result artifact records decision, competing arguments, recommendation, dissent/uncertainty, failed seats if any, and source artifacts used.
