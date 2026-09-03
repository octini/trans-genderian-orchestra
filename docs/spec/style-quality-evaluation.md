# Style-quality evaluation corpus

`plugin/test/fixtures/style-quality.ts` is the contract-level fixture slice for tgo-g87 and tgo-85r. The analyzer-backed tests map each `StyleQualityFixture` to the stable result in `docs/spec/concision-enforcement.md` §7.3a.

Each record identifies `register`, `outputClass`, and `mode`, then states expected aggregate severity, findings, suppression, reinforcement eligibility, preservation outcome, and protected content. Protected text is checked in candidate order to provide deterministic spans. The corpus includes ordinary chat, technical explanations, tool-heavy success and failure reports, code, warnings, quotations, exact strings, numbers, units, negations, necessary explanations, seeded drift, and preservation uncertainty. The corpus covers n=10 fixtures across chat and tool-heavy modes (terse-qa, tool-heavy, orchestration, voice-forward).

Run the corpus with:

```bash
cd plugin && bun test test/style-quality.test.ts
```

The tests validate fixture shape, coverage, and the complete analyzer finding contracts. They do not implement runtime reinforcement, rewriting, or universal sentence/line limits. The plugin-boundary observer remains inert without explicit preservation context and response lineage; surrogate reinforcement is tested through the controller interface.

## Regression benchmark

Run the deterministic benchmark and its regression gate from the repository root:

```bash
cd plugin && bun run benchmark:style-quality
```

The command prints JSON and exits non-zero when the current analyzer severity no longer matches the fixture contract. Use `bun run benchmark/style-quality.ts` without `--check` to inspect the report without applying a gate.

Each fixture is reported under five matched behavioral records — `none`, `tgo-small`, `tgo-current`, `tgo-ste-selective`, and `tgo-large` — each with distinct payload size and transformation. These are benchmark artifacts, not production generation traces. Previously the benchmark reported three records `baseline` (a deterministic surrogate with a baseline-only repeated sentence), `tgo` (the supplied fixture artifact), and `reinforced` (a deterministic surrogate with seeded avoidable style removed); these map to `none` (0-token payload, no style injection, baseline with no scrub), `tgo-current` (current TGO payload, supplied fixture artifact), and `tgo-small` (scrub-only, 85-token payload, single-pattern removal) respectively. Two additional variants complete the 5-way ablation: `tgo-ste-selective` and `tgo-large`.

### Variants and payloads

| Variant | Payload tokens | Description |
|---|---|---|
| `none` | 0 | none — no style payload, baseline with no scrub |
| `tgo-small` | 85 | scrub-only — minimal payload, single-pattern removal |
| `tgo-current` | 720 | current TGO payload (480 runtime + 240 fold, scrub + register dial) |
| `tgo-ste-selective` | 580 | STE-selective — tgo-current plus selective STE vocabulary (use vs utilize, etc.) with soft length metric `steLength` measured only for tool-heavy |
| `tgo-large` | 6680 | large humanizer — heavy taxonomy (6680-token payload, full 33-pattern STE/humanizer list) |

The `steLength` metric (violations per 100 words, 20-word instruction / 25-word descriptive guidance) is a soft signal counted only when `mode === "tool-heavy"`; it is inert for chat outputs (violationsPer100w 0, applicable false) and never blocks the gate.

### Cost per successful task is the primary tradeoff

Cost per successful task is the primary tradeoff (cost = (input+cached+output)*rate), not verbosity alone. The benchmark computes `cost.valueUsd` as `(inputTokens + cachedInputTokens * 0.5 + outputTokens) * rate` with a proxy rate, and `costPerSuccessfulTask` doubles the cost when `taskSuccess === 0` to reflect retry/quality expense. Output tokens alone and response length alone are descriptive, not optimization targets; a cheaper failure is not a win.

Each record reports its transformation source, deterministic session grouping, token and response-length proxies, readability, drift, fixture required-claim retention, and preservation. Token fields carry `provenance: "proxy"` (see limitations); this corpus does not claim provider-measured token counts. Cached input tokens also carry `provenance: "proxy"` (60% of payload tokens are treated as cached). Required-claim retention is a fixture check, not a semantic oracle; preservation measures protected-text retention. Production reinforcement is not validated by this benchmark.

Chat and tool-heavy cases are summarized separately in `byMode`, task classes (`terse-qa`, `tool-heavy`, `orchestration`, `voice-forward`, `technical`) in `byTaskClass`, and voice cards (`tgo-default`, `tgo-prose`, `tgo-conversational`) in `byCard`. `byCard` aggregates 3× coverage: each of the 10 fixtures is run under each card per variant (30 records per variant, 10 per card per variant); legacy 5-way variant labels (`none`/`tgo-small`/`tgo-current`/`tgo-ste-selective`/`tgo-large`) are retained for history with `byCard` aliasing (`tgo-current` is the `tgo-default` payload). Fixture required-claim retention uses the independent `expected.requiredClaims` corpus; preservation uses protected-text retention. A deterministic uncertainty artifact scores both measures `0`; uncertainty is never improved by shortening. There are no universal sentence or line caps, and output tokens are descriptive rather than an optimization target. Each session variant retains attempt identity, input and generated artifacts with provenance, analyzer output, evaluation artifact, and explicit lifecycle state/events. Failures list the fixture ID, card, and observed/expected values. The benchmark does not validate production reinforcement behavior.

### Card-aware gates (D14, D9–D11)

The benchmark extends `plugin/benchmark/style-quality.ts` with card-aware regression gates (D14) against the measured rhythm targets (D9) and card-specific invariants (D10–D11):

- **Rhythm buckets** (§3.2 `syntax_targets`): per-card bucket percentages within ±5 points of prose 29/44/27 and conversational 26/42/32 (default 30/45/25), mean/median/p90 within ±2 words; `max_words ≤60` hard cap. The static gate checks each card's `voice_invariants.syntax_targets` declaration against D9; the per-fixture helper `checkRhythmDynamic` is exported for prose fixtures that meet the `minSentences 8 / minWords 80` threshold. A bucket deviation >±5 or mean/median/p90 deviation >±2 or any sentence `>60` fails the gate.
- **Paragraph-head discipline**: max one long opener (`>25w`) before a short landing (`1–10w`); never two longs stacked. This is a fixture-level assertion (`checkParagraphHead`): a paragraph opening with a long whose second sentence is not short, or any consecutive pair of longs in a paragraph head, fails.
- **One-device-per-sentence + STE**: `one_device_per_sentence` (heuristic: >1 device marker per sentence) and STE thresholds `20` (instruction) / `25` (descriptive) are inert/metric-only for `mode !== "tool-heavy"` (`applicable: false`) and `violations-per-100w` for `tool-heavy` (same provenance split as `steLength`). They are reported per case (`oneDevicePerSentence`, `steLength`) but do not hard-fail chat fixtures; tool-heavy violations are surfaced as `violationsPer100w` with `provenance: "proxy"`.
- **Anti-pattern FP budgets**: per-card `anti_patterns.thresholds` violations must stay within the card-declared maxima; the drift regression analogue `maximumDriftRegression 0.25` is applied per card (`byCard[card]["tgo-current"].driftFrequency - byCard[card]["none"].driftFrequency ≤ 0.25`). A per-card regression >0.25 fails.
- **Preservation/correctness**: `preservation` and `requiredClaimRetention` remain exact `1.0` for non-uncertain fixtures on every card (`byCard` checks each card's `tgo-current` against `1.0`). Uncertain fixtures score `0` on both and are excluded from the `1.0` gate.

The report also exposes operational proxies per variant/case: `retries` (deterministic 0), `delegation.count` with `provenance: "proxy"` (orchestration fan-out, tool-heavy delegation), `latency.valueMs` with `provenance: "proxy"` (base 80 ms + payload * 0.15 + length * 0.3 + delegation * 12), `cost.valueUsd` with `provenance: "proxy"`, `costPerSuccessfulTask.valueUsd` with `provenance: "proxy"`, and `steLength` with `provenance: "proxy"` (and applicable/basis).

## Limitations

The benchmark documents limitations and does not make adoption decisions automatically; results are descriptive evidence for cost/quality tradeoffs and do not drive auto-adoption:

- **Proxy vs measured:** token counts use `estimateTokens` (words + punctuation * 0.25) with `provenance: "proxy"` for `inputTokens`, `cachedInputTokens`, and `outputTokens`; cached cost is discounted (0.5). Latency, delegation, retries, and cost are deterministic proxies with `provenance: "proxy"`, not provider-measured usage, wall-clock latency, or billed cost. Do not treat proxies as measured production telemetry.
- **Surrogate vs production:** variants are deterministic surrogates (labeled `deterministic-surrogate` / `supplied-fixture` transformations), not LLM generation traces; edits are string replacements (e.g., utilize→use, pattern scrubbing), not model-sampled outputs.
- **Fixture scope:** n=10 fixtures; coverage is contract-level (chat, terse-qa, tool-heavy, orchestration) and does not represent the full task distribution. Card-aware 3× coverage (`byCard`) does not generate new prose; it re-runs the same 10 candidates under each card so that card-specific gates (rhythm, paragraph-head) can be exercised without inventing new fixtures.
- **No orchestration trajectory:** the benchmark reports per-attempt outputs and deterministic delegation counts; it does not replay multi-step orchestration trajectories or wave-level task success.
- **No auto-adoption decision:** cost per successful task is reported, not thresholded into an adoption recommendation; `externalClaims` and `limitations` do not trigger automatic selection.
- **externalClaims are vendor not TGO:** the report's `externalClaims` field labels Caveman token-reduction figures from `docs/research/concision-skills.md` as vendor claims; they are not TGO measurements (`claim.includes("external") && claim.includes("not TGO measurements")`) and do not affect the gate.
- **Drift precision/recall are placeholders** against fixture contracts, not human or model ratings; thresholds require analyzer severity to match every fixture, fixture required-claim retention and protected-content scores to remain exact, and current drift frequency not to exceed the baseline surrogate (`none`) by more than `0.25` (and per-card analogue `byCard[card] ≤ 0.25`).
- **Rhythm/paragraph-head provenance:** rhythm buckets/mean/median/p90 are measured from `rhythmMetrics(candidate)` with `provenance: "proxy"`; the static gate checks the card JSON declaration against D9, the dynamic helper is threshold-gated (`minSentences 8 / minWords 80`) so that short technical fixtures do not spuriously fail. `checkParagraphHead` and `checkMaxHard` are fixture-level assertions on the candidate text.

Thresholds require analyzer severity to match every fixture on its declared card, fixture required-claim retention and protected-content scores to remain exact `1.0` on every card for non-uncertain fixtures, and current drift frequency not to exceed the baseline surrogate (`none`) by more than `0.25` globally and per-card (`byCard`). Per-card rhythm buckets must stay within ±5 points of D9, mean/median/p90 within ±2 words, max ≤60; paragraph-head discipline and max hard cap are fixture-level. Each session variant retains attempt identity, input and generated artifacts with provenance, analyzer output, evaluation artifact, and explicit lifecycle state/events. Failures list the fixture ID, card, and observed/expected values. The benchmark does not validate production reinforcement behavior.
