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

Chat and tool-heavy cases are summarized separately in `byMode`, and task classes (`terse-qa`, `tool-heavy`, `orchestration`, `voice-forward`, `technical`) are summarized in `byTaskClass`. Fixture required-claim retention uses the independent `expected.requiredClaims` corpus; preservation uses protected-text retention. A deterministic uncertainty artifact scores both measures `0`; uncertainty is never improved by shortening. There are no universal sentence or line caps, and output tokens are descriptive rather than an optimization target. Each session variant retains attempt identity, input and generated artifacts with provenance, analyzer output, evaluation artifact, and explicit lifecycle state/events. Failures list the fixture ID and observed/expected values. The benchmark does not validate production reinforcement behavior.

The report also exposes operational proxies per variant/case: `retries` (deterministic 0), `delegation.count` with `provenance: "proxy"` (orchestration fan-out, tool-heavy delegation), `latency.valueMs` with `provenance: "proxy"` (base 80 ms + payload * 0.15 + length * 0.3 + delegation * 12), `cost.valueUsd` with `provenance: "proxy"`, `costPerSuccessfulTask.valueUsd` with `provenance: "proxy"`, and `steLength` with `provenance: "proxy"` (and applicable/basis).

## Limitations

The benchmark documents limitations and does not make adoption decisions automatically; results are descriptive evidence for cost/quality tradeoffs and do not drive auto-adoption:

- **Proxy vs measured:** token counts use `estimateTokens` (words + punctuation * 0.25) with `provenance: "proxy"` for `inputTokens`, `cachedInputTokens`, and `outputTokens`; cached cost is discounted (0.5). Latency, delegation, retries, and cost are deterministic proxies with `provenance: "proxy"`, not provider-measured usage, wall-clock latency, or billed cost. Do not treat proxies as measured production telemetry.
- **Surrogate vs production:** variants are deterministic surrogates (labeled `deterministic-surrogate` / `supplied-fixture` transformations), not LLM generation traces; edits are string replacements (e.g., utilize→use, pattern scrubbing), not model-sampled outputs.
- **Fixture scope:** n=10 fixtures; coverage is contract-level (chat, terse-qa, tool-heavy, orchestration) and does not represent the full task distribution.
- **No orchestration trajectory:** the benchmark reports per-attempt outputs and deterministic delegation counts; it does not replay multi-step orchestration trajectories or wave-level task success.
- **No auto-adoption decision:** cost per successful task is reported, not thresholded into an adoption recommendation; `externalClaims` and `limitations` do not trigger automatic selection.
- **externalClaims are vendor not TGO:** the report's `externalClaims` field labels Caveman token-reduction figures from `docs/research/concision-skills.md` as vendor claims; they are not TGO measurements (`claim.includes("external") && claim.includes("not TGO measurements")`) and do not affect the gate.
- **Drift precision/recall are placeholders** against fixture contracts, not human or model ratings; thresholds require analyzer severity to match every fixture, fixture required-claim retention and protected-content scores to remain exact, and current drift frequency not to exceed the baseline surrogate (`none`) by more than `0.25`.

Thresholds require analyzer severity to match every fixture, fixture required-claim retention and protected-content scores to remain exact, and current drift frequency not to exceed the baseline surrogate (`none`) by more than `0.25`. Each session variant retains attempt identity, input and generated artifacts with provenance, analyzer output, evaluation artifact, and explicit lifecycle state/events. Failures list the fixture ID and observed/expected values. The benchmark does not validate production reinforcement behavior.
