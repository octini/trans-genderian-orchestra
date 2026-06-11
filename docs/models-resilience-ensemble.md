# Models And Ensemble

## Model Presets

TGO uses omo-slim's procedural, config-driven model preset generator. Fresh generated configs use `github-copilot` as the active preset and include exactly two primary presets: `github-copilot` and `opencode-go`.

Generated default model assignments:
- `github-copilot`: conductor/composer use `github-copilot/gpt-5.5` (`xhigh`), scribe uses `github-copilot/gemini-3.5-flash` (`high`), principal uses `github-copilot/claude-opus-4.7` (`max`), and ensemble references `conductor`.
- `opencode-go`: conductor uses `opencode-go/mimo-v2.5-pro` (`high`), scribe/composer use `opencode-go/mimo-v2.5` (`high`), principal uses `opencode-go/mimo-v2.5-pro` (`high`), and ensemble references `conductor`.

## Ensemble Model Auto-Population

By default, the ensemble agent model is a model reference to the active preset's conductor model. Generated ensemble/councillor configuration sets `default_preset` to `github-copilot`, runs councillors in `parallel`, uses a `180000` ms timeout, and provides three differentiated councillor seats for both generated presets.

Users can override with explicit model strings. The reference syntax `"ensemble": "conductor"` resolves to the conductor's assigned model.

## Councillor Seats

Councillor seats are internal ensemble participants with differentiated review focuses:
- First: Correctness & Architecture
- Second: Edge Cases & Security
- Third: UX & Performance

Generated `opencode-go` councillor defaults use `opencode-go/mimo-v2.5` (`high`) for first, `opencode-go/deepseek-v4-flash` (`max`) for second, and `opencode-go/kimi-k2.6` with its default variant for third.

They should not ask the user questions or write files; they provide independent read-only analysis for synthesis.

## Ensemble Consensus

The ensemble uses majority rule (2/3) with a critical-issue override:
- 3/3 or 2/3 approve: verdict = approve (with dissenting findings if majority)
- 1/3 or 0/3 approve: verdict = reject
- Any critical severity issue: verdict = reject regardless of vote count

## Ensemble Synthesis Readiness

Ensemble consensus is appropriate when the user explicitly asks, risk is high, or the conductor determines that multiple perspectives are needed. The ensemble also serves as the structured review panel in the review loop after the composer completes implementation.
