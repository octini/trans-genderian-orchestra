# TGO Spec — Always-on Concision & Anti-Slop Enforcement

Status: **spec** (buildable). Source decisions: `docs/wayfinder/decisions.md` (tgo-a6r.14, tgo-a6r.15). Audit: `docs/research/style-skills.md` (ep01-the-cure-for-ai-slop, stop-slop, humanizer). **Implemented (2026-08-11, tgo-69m):** the scrub half is now enriched with the concrete tell-vocabulary (AI-vocab, marketing adjectives, pomposities, throat-clearing openers, chatbot closers), the no-fabrication rule, the clusters-not-isolated-tells guard, and the diff-anchored-narration tell; drift protection pins the runtime payload in a 300–500-token band, a 250-token fold ceiling, and content pins (see `plugin/test/concision.test.ts`). **Amended (2026-08-11, 67ca5c2):** the wait-what ubiquitous-language fold ("write in the project's voice, not just shorter" — skill-candidates.md:148) is now in both payloads. Actual sizes: runtime ~480 tokens, fold ~240.

## 1. The house style: one amalgamated 3-axis ruleset, uniform across all agents

- **Structure** (i-have-adhd): action-first, active voice, condition-before-command, one action per numbered step, complete instructional sentences, state-restatement, no preamble/closers.
- **Prose-grammar** (caveman): drop filler and hedging; drop articles only in scan-oriented fragments, never instructional sentences; preserve qualifiers, negations, identifiers, numbers, units, commands, errors, and necessary explanations; auto-disable for safety.
- **Code-output** (ponytail): YAGNI ladder, don't-cut list, code-first reporting.

Amalgamated into **one pruned injection (~300-500 tokens)**, applied uniformly to every agent. The code slider no-ops when a seat produces no code. One universal off-switch ("stop X" / "normal mode", standardized).

**Two delivery channels, one ruleset (clarified 2026-08-05, tgo-96f.3):** the ~300-500-token amalgamated injection is the **runtime payload for the primary loop** (Bernstein, via hook #4 `system.transform`, tgo-96f.9) — it can be large because it is re-appended every turn (drift-proof). The **build-time fold into subagent seat prompts is the compact scrub half (actual ~240 tokens, ceiling 250)** — seat prompts are capped at <1000 tokens total (body only), so the fold must be lean; it carries the same 3-axis rules plus the register line (see §4).

**Persona anchor policy:** ONE thin style anchor per slider, kept only for stickiness (a one-line anchor holds the style across turns better than bare rules); no cosplay; droppable on evidence. Distinct from identity anchors in seat prompts (`docs/spec/roster.md` §1) — style anchors for stickiness, identity anchors role-anchored.

## 2. Mechanism: per-turn injection

ponytail's pattern: `experimental.chat.system.transform` appending the level-filtered ruleset to the system prompt **every turn** (drift-proof — SessionStart-once degrades under compaction). **One "instruction builder" as source of truth**; universal off-switch (the only intensity setting — on/off; no lite/full/ultra ladder, decided 2026-08-06, tgo-96f.9). Borrow i-have-adhd's "when to break rules" escape list.

## 3. Propagation: folded into seat prompts at build time

The style fragment is folded into **all seat prompts** via the build step (no new hook). Rationale: ponytail uses a SubagentStart hook because it operates in the open world (unknown subagent prompts); TGO owns a **closed roster of five build-generated agents**, so folding is both elegant AND structurally guaranteed. The system.transform covers the primary/first-party loop; folding covers subagents.

**Fold scope (clarified 2026-08-05, tgo-96f.3):** the fold targets the **subagent seats** (Horowitz, Nas, Dylan, Nirvana, band members) via a `{{TGO_HOUSE_STYLE}}` slot. **Bernstein has NO fold slot** — he is the primary loop, covered by `system.transform` (hook #4); folding him too would double-inject the style every turn. Implemented in `plugin/src/build.ts`; rendered subagent prompts carry the fold, Bernstein's does not.

## 4. The style layer

- **Scrub half is always-on and composable.** Banned tells (filler, hedges, AI-vocab, adverbs, passive, em-dash spam, rule-of-three, throat-clearing) agree with the concision skills; upgraded with specific tell-vocabulary from humanizer's 33-pattern taxonomy + stop-slop phrase lists + STE vocab. Highest-leverage, lowest-conflict lift.
- **Register dial is class-gated, two positions only** (concise / natural) — never both-on. Replaces the "two parallel layers" idea; the "which winner if both on" problem disappears. **Implemented in the fold (2026-08-05, tgo-96f.3):** the house-style fragment's register line is rendered from the config `register` value at build time (slot `{{TGO_REGISTER}}`), so the seat-default register is baked into each rendered subagent prompt; the self-classification judgment below is the prompt-level toggle.
- **No post-hoc editor ever.** humanizer's MECHANISM (rewrite finished text, file-in-place) is rejected; its CONTENT (taxonomy, no-fabrication rule, false-positive "clusters not isolated tells" guard) is adopted as generation-time don'ts. Draft → self-audit → final is a generation-time INTERNAL loop (legitimate).
- **Toggle determination = hierarchy:** seat-default register → Bernstein mandate (via the spec's optional Register field, applied at delegation boundary) → model self-classifies output class → user instruction overrides. No hooks/detection; the judgment lives in prompts (capabilities enforce, prompts advise).

## 5. Register ownership

- **Only Dylan's output ever toggles the register dial** (concise/natural), driven by Bernstein's optional Register field in the spec (mandate) or Dylan's self-classification when omitted. All other seats present in concise mode by default (~99%).
- Precedence (now trivial): structure wins for steps, compression for connective prose, cadence-variety for voice-forward prose.

## 6. Where this hook fits in the code boundary

This is hook #4 in `docs/spec/architecture.md` §4: `experimental.chat.system.transform` (system-prompt append each turn). Distinct from hook #1's `experimental.chat.messages.transform` (the job-board message transform). Which skills feed it = the selection decision (§1); detailed mechanism = this document.

## 7. Style-drift contract (tgo-85r)

This section defines the contract for the pure analyzer and bounded runtime reinforcement. The analyzer reports findings and the runtime may append one generation-time nudge; neither component rewrites delivered text.

### 7.1 Unit and inputs

The analyzer receives one candidate response plus its task/spec context, the selected register (`concise` or `natural`), and lifecycle state. Its input contract is `{ attemptID, register, outputClass, mode, enabled, reinforced, taskContext, candidate }`. `attemptID` is the stable identifier for the candidate-generation lifecycle. `enabled` is the effective concision state after config and the in-session off-switch have been applied; false disables actionable aggregation and reinforcement. `reinforced` records whether the one allowed nudge has already been emitted for this attempt. Register selection uses the existing hierarchy: Bernstein's optional `Register` field selects Dylan's register at the delegation boundary; when that field is absent, Dylan self-classifies technical steps/code as `concise` and voice-forward prose as `natural`; Bernstein, Horowitz, Nas, and Nirvana default to `concise` unless an existing policy explicitly says otherwise; a user instruction overrides the applicable default. The analyzer consumes that selected value; it does not infer a new register. It returns findings and metrics; it never edits the response. Evaluation reports must identify the output class (technical steps/code or voice-forward prose) and whether the response is chat-style or tool-heavy. Comparisons use a matched baseline where available; token count is an observation, not a target.

Retries and resumed generation within the same turn retain `attemptID`, `enabled`, `reinforced`, and the finding/suppression record while the controller instance lives. Compaction does not create a persistence boundary that TGO can rely on. A later user turn or newly requested answer creates a new `attemptID` with `reinforced: false`; plugin disposal or process restart clears controller state.

### 7.2 Drift signals

Signals are evidence of meaningful departure from the applicable house-style axes, not violations of universal length limits:

- **Response length:** unnecessary connective or repeated material relative to the task, while retaining the explanation needed for correctness.
- **Sentence length/readability:** avoidable nesting, overloaded sentences, or cadence that makes the answer harder to scan. Sentence length is a distributional signal and review aid, never a fixed maximum.
- **Progress narration:** narrating edits, tool activity, or internal process instead of stating the result, current state, or required next action. Required status-restatement and verification evidence are not drift.
- **Anti-style clusters:** multiple related scrub-list tells in one response or section: filler/throat-clearing, AI-vocabulary, marketing adjectives, pomposities, adverbs, modal hedges, rule-of-three padding, “not X, it’s Y” posturing, synonym-cycling, hidden-actor passive voice, em-dash spam, chatbot closers, or diff-anchored narration.

One mild tell, one long sentence, or one necessary repetition is not drift. Operationally, a **cluster** is at least two related, avoidable signals in the same response or section; a **repeated signal** is the same avoidable signal appearing at least twice in separate spans; and **strong evidence** is one unambiguous, correctness-neutral pattern whose reader cost is material without relying on protected or necessary content. The small strong-evidence set is limited to: (a) two consecutive identical non-code sentences or paragraphs; (b) a listed chatbot closer (`Hope this helps` or `Let me know if you need anything`) after the answer is complete; and (c) a paragraph made only of progress narration that repeats a result already stated, such as `I changed X` after the response has already given the resulting state. These patterns are mechanically testable and must be checked against protected and necessary spans. Strong evidence is not a license to promote an isolated subjective impression. A finding requires a cluster, a repeated signal, or one of these defined strong-evidence patterns. The analyzer must report the evidence and affected axis rather than infer intent.

For fixtures, **related** means signals from the same axis or scrub-tell family whose evidence occurs in the same response or section and contributes to the same reader problem. **Avoidable** means removable or rephraseable while retaining required meaning, protected content, correctness, safety, and ambiguity handling. **Material reader cost** means increased scan effort because the signal repeats content, delays or obscures the result/next action, or adds non-result process text. **After the answer is complete** means the requested result and required caveats, commands, or verification have been delivered and no required answer or action remains; completion comes from task context and candidate content, not token count.

### 7.3 Severity and suppression

Severity is per finding and aggregate:

| Severity | Contract meaning | Future reinforcement eligibility |
|---|---|---|
| `none` | No actionable drift, or evidence is isolated/ambiguous. | Never |
| `low` | A small cluster or mild repeated signal with limited reader cost. | No automatic nudge |
| `medium` | A clear cluster or repeated signal that materially reduces scanability or obscures the result. | One bounded nudge |
| `high` | Strong, repeated drift that obscures the result or drops required structure. | One bounded nudge |

Suppress a finding when it is isolated, required by the task, part of protected content, or required for safety or ambiguity handling. The selected `natural` register may suppress cadence/readability findings only; it does not suppress response-length, progress-narration, or anti-style-cluster findings. Suppression must record a reason. Do not aggregate protected and unprotected text as if they were the same evidence. A strong-evidence exception is valid only when the pattern is correctness-neutral. Any preservation-risk finding, including possible loss or alteration of required/protected content, is suppressed and non-actionable; unresolved preservation risk is also recorded as uncertainty. Neither may raise aggregate severity or qualify for reinforcement.

### 7.3a Stable analyzer result

The pure analyzer returns one descriptive result with this stable shape (field names and enum values are contract, while the internal detection method is not):

```text
{
  input: { attemptID, register, outputClass, mode, enabled, reinforced },
  findings: [{ axis, severity, evidence, spans, basis, uncertainty, suppressed, suppressionReason }],
  aggregate: { severity, actionable, reinforcementEligible },
  metrics: { concision, readability, correctness, preservation },
  protectedContent: { spans, treatment },
  uncertainty: [],
  state: { attemptID, enabled, reinforced }
}
```

`outputClass` is `technical-steps-code` or `voice-forward-prose`; `mode` is `chat` or `tool-heavy`; `basis` is `cluster`, `repeated-signal`, or `strong-evidence`; and `spans` are deterministic locations in the candidate response. `evidence` is descriptive text, not a rewrite or an inferred motive. Each finding is ordered by response position, then axis, then severity. Each finding's `uncertainty` is `{ codes, message, spans }`; `codes` is an array containing `preservation`, `classification`, or `necessity`. The top-level `uncertainty` is the deduplicated union for reporting; aggregation uses the per-finding value and never infers uncertainty from spans. Each metric is `{ value, unit, baseline, basis }`: `value` is numeric, `unit` is the metric's declared scale, `baseline` is a numeric matched-baseline value or `null`, and `basis` identifies the measurement inputs. `concision` uses `ratio` (avoidable-content reduction); `readability` uses `score-0-to-1`; `correctness` uses `score-0-to-1`; and `preservation` uses `score-0-to-1`. Metrics are measurements, not pass/fail thresholds. `protectedContent.treatment` is `{ mode, reason }`, where `mode` is `excluded`, `discounted`, or `none`; `protectedContent.spans` remains the deterministic span list. `state` echoes lifecycle identity and switches so a consumer cannot apply a result to another attempt.

The aggregate considers actionable findings only: suppressed findings have no severity contribution, and protected/necessary spans cannot raise severity. Otherwise, aggregate severity is the highest actionable finding severity (`none` < `low` < `medium` < `high`); ties retain all findings in stable order. `actionable` is true only for `medium` or `high` findings with no per-finding uncertainty, when `enabled` is true, and that are not suppressed. `reinforcementEligible` is true only when `actionable` is true, `reinforced` is false, and correctness, preservation, and all per-finding uncertainty contain no failure or unresolved concern. When `enabled` is false, aggregate severity is `none`, `actionable` is false, and `reinforcementEligible` is false. This aggregation describes the response and does not authorize runtime behavior in this slice.

### 7.4 Protected content and preservation

The analyzer excludes or discounts, without rewriting, code blocks and inline code; commands; API names and identifiers; error messages; warnings and security text; quotations; exact strings; numbers and units; negations; and explanations necessary to establish correctness, safety, an irreversible confirmation, or an ambiguity-prone sequence. It must preserve the project's terms and naming. The no-fabrication rule remains absolute: reinforcement may not add a fact, name, number, date, quote, citation, or claim absent from the source/context.

### 7.5 Metrics: policy versus measurement

The following are evaluation dimensions, not normative thresholds. TGO records the value, comparison baseline, protected-content treatment, and uncertainty where applicable:

- **Concision:** avoidable-content reduction or response-length change, with required-content retention reported separately.
- **Readability:** sentence-length distribution, structural scanability, and the frequency/severity of drift findings. No universal sentence or line cap.
- **Correctness:** preservation of required claims, negations, numbers, units, code, commands, errors, warnings, exact strings, and necessary explanations; factual additions are failures.
- **Preservation:** protected-span exact-match rate and unprotected meaning/requirement retention. A shorter response that loses required content fails, even if readability improves.

Evaluation must report false positives on protected and necessary content, false negatives on seeded drift, and results separately for concise and natural outputs. Hush-style readability dimensions may guide measurement; they do not become TGO policy or hard defaults. Existing runtime and fold token bands remain contract pins: runtime `300–500` tokens, fold ceiling `250` tokens.

### 7.6 Once-only reinforcement

If a runtime nudge is enabled and a response reaches `medium` or `high` actionable drift, emit at most one reinforcement for that response attempt. Reinforcement is eligible only when the actionable drift is correctness-neutral: any preservation failure, preservation uncertainty, or uncertainty about whether required/protected content was retained suppresses reinforcement. Preservation failure or uncertainty remains an evaluation finding, not a reason to ask for a shorter response. The reinforcement is a generation-time instruction to self-audit and produce the next response; it does not rewrite delivered text. Do not repeat the same nudge on retries, turns, or compaction for the same response attempt.

An **attempt identity** is the stable identifier assigned to one candidate-generation lifecycle, including its originating user turn/request and response lineage. A retry of that candidate or a resumed generation after interruption within the same turn retains the same attempt identity and `reinforced` state; it does not create a new reinforcement opportunity. Compaction preserves the current attempt identity, `reinforced` state, and finding/suppression record. A later user turn or a newly requested answer starts a new attempt identity, even when it addresses the same task. Mark the current attempt as reinforced, then allow its next response to pass without another nudge; only a new attempt can independently cross the contract. The nudge is suppressed entirely when `concision.enabled: false` or the in-session off-switch (“stop X” / “normal mode”) is active.

The current controller keeps this lifecycle state in plugin memory. The supported hooks provide evidence for the active session and compaction boundary, but they do not provide a persistence contract across plugin disposal, process restart, or unsupported lifecycle recovery; reinforcement state is not promised across those boundaries.

Production reinforcement is opt-in (`concision.reinforcement: true`) and the registered completion-hook path is inert because the verified `experimental.text.complete` contract supplies only `sessionID`, `messageID`, `partID`, and completed `text`; it does not supply preservation/task context or a stable user-turn lineage. The plugin does not synthesize those inputs or claim integrated production reinforcement. Direct controller tests exercise the opt-in surrogate path with explicit context and lineage; they do not validate captured production sessions.
