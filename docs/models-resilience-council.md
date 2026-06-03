# Models, Resilience, And Council

## Model Presets

TGO separates model presets from tool and resilience presets. `/tgo:models` inspects or switches model presets without changing tool or resilience dimensions.

Built-in model presets:

- `mixed`: default full-spectrum lineup using GitHub Copilot primaries with OpenCode Go, Antigravity, and Nvidia NIM fallbacks where useful.
- `balanced`: compatibility alias for `mixed`, retained for existing bootstrap commands and manifests.
- `copilot`: GitHub Copilot-only lineup for environments where Copilot quota is preferred over paid/free provider juggling.
- `go`: OpenCode Go-only lineup tuned around Go provider availability and quota tradeoffs.
- `free`: free-provider lineup using Antigravity, OpenCode Zen, and Nvidia NIM routes. This preset may be slower or more quota-sensitive because free providers vary more.

## Model Switch Planning

Model changes should be planned, previewed, and scoped so provider config and user-owned settings are preserved.

## Fallback Classification

Provider fallback is for structural/provider failures such as provider errors, unavailable models, or transport failures. It is not a way to treat semantic disagreement as success.

## Circuit Breaker

Resilience design includes circuit-breaker behavior to avoid repeatedly selecting failing providers or models without surfacing the failure.

## Resilience Profiles

Resilience profiles should define retry and fallback behavior separately from model selection and tool presets.

## Semantic Retry Boundaries

Semantic failures require review, rework, or escalation. They should not be hidden by automatic provider fallback.

## Council Derivation

Council behavior derives from model and role configuration so different councillor seats can provide independent analysis when escalation is needed. By default, councillor seats track the active preset's Researcher, Builder, and Reviewer primary models when possible; the orchestrator primary model is used for synthesis.

## Councillor Seats

Councillor seats are internal council participants. They should not ask the user questions or write files; they provide independent read-only analysis for synthesis.

## Council Synthesis Readiness

Council synthesis is appropriate when the user explicitly asks, risk is high, or reviewer loops suggest that a broader architectural decision is needed.

## Spec Coverage

- Spec 06: model presets, fallback routing, resilience profiles, and council derivation.
