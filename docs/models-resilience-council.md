# Models And Ensemble

## Model Presets

TGO uses omo-slim's config-driven model preset system. The default preset assigns models to each agent in the v3 roster.

Default model assignments:
- Conductor: strongest planning/judgment model (undefined in DEFAULT_MODELS — user configures)
- Scribe: fast, low-cost model (gpt-5.4-mini)
- Principal: strongest high-reasoning model (gpt-5.5)
- Composer: fast, reliable coding model (gpt-5.4-mini)
- Ensemble: auto-populated from conductor's model (see below)

## Ensemble Model Auto-Population

By default, the ensemble agent's model and councillor seats auto-populate from other agents' model assignments:
- Ensemble agent model = conductor's model
- First councillor = conductor's model (correctness/architecture review)
- Second councillor = scribe's model (edge cases/security review)
- Third councillor = composer's model (UX/performance review)

Users can override with explicit model strings. The reference syntax `"ensemble": "conductor"` resolves to the conductor's assigned model.

## Councillor Seats

Councillor seats are internal ensemble participants with differentiated review focuses:
- First: Correctness & Architecture
- Second: Edge Cases & Security
- Third: UX & Performance

They should not ask the user questions or write files; they provide independent read-only analysis for synthesis.

## Ensemble Consensus

The ensemble uses majority rule (2/3) with a critical-issue override:
- 3/3 or 2/3 approve: verdict = approve (with dissenting findings if majority)
- 1/3 or 0/3 approve: verdict = reject
- Any critical severity issue: verdict = reject regardless of vote count

## Ensemble Synthesis Readiness

Ensemble consensus is appropriate when the user explicitly asks, risk is high, or the conductor determines that multiple perspectives are needed. The ensemble also serves as the structured review panel in the review loop after the composer completes implementation.
