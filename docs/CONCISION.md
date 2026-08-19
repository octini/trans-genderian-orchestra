# Always-on Concision

TGO's house style is one amalgamated three-axis ruleset, applied uniformly to every agent, every turn. It is not a post-hoc editor and not an optional linter: it is generation-time advice injected into the loop, with a two-position register dial that rides on Dylan's output alone and a universal off-switch.

This page is the human-readable version of `docs/spec/concision-enforcement.md`; that spec stays canonical.

## The three axes

- **Structure** — action-first and active voice. Put a controlling condition before its command. Use one action per numbered step and complete instructional sentences. Restate the state before acting; use no preamble or closer.
- **Prose** — compress style, never substance. Drop articles only in scan-oriented fragments, never instructional sentences. Preserve qualifiers, negations, numbers, units, identifiers, commands, errors, exact strings, and explanations needed for correctness, safety, or ambiguity handling. Never invent facts, and write in the project's own language — its terms and naming, not generic synonyms. The cure for verbosity is writing in the project's voice, not just writing shorter.
- **Code** — smallest change that works (YAGNI); never cut tests, error handling, or security checks to save space; code-first reporting (show the change, then the one-line why). The axis no-ops for seats that produce no code.

When the axes pull apart, precedence is: structure wins for steps, compression for connective prose, cadence variety for voice-forward prose.

## The register dial

Two positions only — **concise** and **natural** — and only Dylan's output ever toggles between them:

- Bernstein can mandate the register via the spec's optional Register field at the delegation boundary (docs, copy, prose deliverables).
- Omitted, Dylan self-classifies by output class: technical steps/code → concise; voice-forward prose (narrative, human-facing docs) → natural.
- All other seats stay in the default register, set by the `register` config option (`"concise"` by default).

The dial is a build-time fold: the config `register` value is rendered into each rendered subagent prompt's register line, so the seat-default register is baked in at install. A user instruction overrides everything.

## Anti-slop: the scrub list

The always-on banned-tell list is concrete, not generic. Tells are judged by clusters, not isolated instances — one "however" is fine, a run of AI-isms is not. The list includes:

- **Filler and throat-clearing** — "Here's the thing", "Great question", "Let me be clear", "It's worth noting", "When it comes to", "Let's dive in"
- **AI-vocabulary** — utilize, leverage, delve, showcase, landscape, testament, vibrant, facilitate, foster, underscore
- **Marketing adjectives** — seamless, robust, cutting-edge, effortless, world-class, next-generation, revolutionary
- **Pomposities** — commence, initiate, furthermore, moreover, myriad
- **Adverbs** — really, just, literally, deeply, truly, fundamentally
- **Modal hedges** — "it is important to note", "I think", "in my opinion"
- **Pattern tells** — rule-of-three padding, "not X, it's Y" posturing, synonym-cycling, passive voice with a hidden actor, em-dash spam, chatbot closers ("Hope this helps", "Let me know if you need anything"), diff-anchored narration (narrating the change instead of the result)

Two guardrails keep the list honest:

- **No fabrication** — never add a fact, name, number, date, or quote that isn't in the source.
- **Clusters, not isolated tells** — a single instance of a mild tell is not a violation; a run of them is.

And a mandatory **self-audit** step: re-read before delivering, cut or rewrite any banned tell found without dropping information.

## How it's delivered: two channels, one ruleset

1. **Runtime payload for the primary loop** — hook #4 (`experimental.chat.system.transform`) appends the full instruction (~480 tokens) to Bernstein's system prompt every turn. Per-request, drift-proof: it survives compaction because it is re-appended. The payload is built by one instruction builder (`buildConcisionInstruction()` in `plugin/src/concision.ts`) from `plugin/assets/concision-instruction.md`, with the `{{TGO_REGISTER}}` slot rendered from config.
2. **Build-time fold into subagent seats** — the compact scrub half (~240 tokens) is folded into every subagent seat prompt via the `{{TGO_HOUSE_STYLE}}` slot at build time. Bernstein has no fold slot — he is the primary loop, and folding him too would double-inject. The runtime hook skips subagent sessions (they carry `parentID`), so nothing is ever double-injected.

The spec calls for a 300–500-token runtime payload and a 250-token fold ceiling; `plugin/test/concision.test.ts` pins the actual sizes and the content (tell vocabulary, no-fabrication rule, clusters guard, diff-anchored tell), so bloat or a strip-back breaks CI.

## The off-switch

- Config: `concision.enabled: false` disables the per-turn injection entirely.
- In-session: "stop X" or "normal mode" turns the layer off.
- The escape list is explicit: break these rules when following them breaks correctness — a security warning, an irreversible confirmation, or an ambiguity-prone sequence must stay full and clear.

## No post-hoc editor

The layer is generation-time advice, never a rewrite pass. Draft → self-audit → final is an internal loop at generation time, which is legitimate; rewriting finished text after the fact is not something TGO does.

## Drift evaluation contract

The drift analyzer judges clusters or strong evidence across response length, sentence-length/readability, progress narration, and the scrub list. A cluster means at least two related avoidable signals in one response or section; related means the same axis or scrub-tell family contributing to the same reader problem. Avoidable means removable or rephraseable without losing required meaning, protected content, correctness, safety, or ambiguity handling. Material reader cost means increased scan effort because a signal repeats content, delays or obscures the result/next action, or adds non-result process text. A repeated signal means the same avoidable signal in at least two separate spans; strong evidence is limited to two consecutive identical non-code sentences or paragraphs, a listed chatbot closer after the answer is complete, or a paragraph made only of progress narration that repeats an already stated result. “After the answer is complete” means the requested result and required caveats, commands, or verification have been delivered and no required answer or action remains. Each rule is mechanically testable and correctness-neutral only after protected/necessary spans are checked. Isolated tells do not trigger drift. Findings use `none` / `low` / `medium` / `high` severity and suppress evidence that is required, protected, safety-critical, or uncertain. Natural register suppresses cadence/readability signals only; it does not suppress length, progress narration, or anti-style-cluster findings. The analyzer uses TGO's existing register hierarchy: Bernstein's optional `Register` field selects Dylan's register; without it Dylan uses concise for technical steps/code and natural for voice-forward prose, while Bernstein, Horowitz, Nas, and Nirvana default to concise unless existing policy says otherwise. User instructions override the applicable default.

Code, commands, API names and identifiers, errors, warnings and security text, quotations, exact strings, numbers and units, negations, and explanations necessary for correctness, safety, irreversible confirmation, or ambiguity-prone sequences are protected. This list is non-exhaustive; the canonical protected-content and preservation rules are in §7.4 of the spec. Evaluation reports concision, readability, correctness, and preservation as measurements, not universal caps or policy defaults. The runtime `300–500` token band and fold `250`-token ceiling remain policy pins.

A nudge may reinforce a `medium` or `high` finding once per response attempt only when the drift is correctness-neutral. Preservation-risk findings are suppressed and non-actionable, and preservation uncertainty suppresses reinforcement. Attempt identity and `reinforced` state persist across retries within the same user turn while the controller instance lives; a later user turn creates a new attempt. Compaction does not provide cross-process persistence. It must not rewrite delivered text or repeat the same reinforcement for the same attempt. The existing `concision.enabled` switch and “stop X” / “normal mode” off-switch suppress it.

The analyzer result is descriptive and deterministic. Input and result state carry `attemptID`, `enabled`, and `reinforced`; input also carries `register`, `outputClass`, and `mode`, while ordered findings carry `axis`, `severity`, `evidence`, `spans`, `basis`, per-finding `uncertainty`, and suppression fields. Per-finding uncertainty is `{ codes, message, spans }`, so actionable aggregation never infers uncertainty from spans. The result also carries `aggregate` (`severity`, `actionable`, `reinforcementEligible`), four metrics shaped as `{ value, unit, baseline, basis }`, and protected content shaped as `{ spans, treatment: { mode, reason } }`. Metric values are numeric observations, not policy caps; preservation-risk findings cannot be actionable or raise aggregate severity. Production reinforcement is opt-in and inert on the registered completion-hook path because that hook does not supply explicit preservation context or response lineage. The plugin does not synthesize those inputs. Controller tests use the direct surrogate interface with explicit context and lineage; controller state remains only while that controller instance lives, with no cross-process persistence. The complete field contract is in §7.3a of the canonical spec.

## Related

- Spec: `docs/spec/concision-enforcement.md` (canonical)
- Research: `docs/research/style-skills.md` (the tell taxonomy the scrub list draws from)
- Assets: `plugin/assets/house-style.md` (the fold), `plugin/assets/concision-instruction.md` (the runtime payload)
- Human pages: `docs/ARCHITECTURE.md`, `docs/ROSTER.md`
