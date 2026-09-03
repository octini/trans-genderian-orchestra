# Always-on Concision

TGO's house style is one amalgamated three-axis ruleset, applied uniformly to every agent, every turn, now single-sourced from the default voice card (`tgo-default`). It is not a post-hoc editor and not an optional linter: it is generation-time advice injected into the loop, with named cards layered on when assigned and a universal off-switch.

This page is the human-readable version of `docs/spec/concision-enforcement.md` and `docs/spec/voice-cards.md`; those specs stay canonical.

## The three axes

- **Structure** — action-first and active voice. Put a controlling condition before its command. Use one action per numbered step and complete instructional sentences. Restate the state before acting; use no preamble or closer.
- **Prose** — compress style, never substance. Drop articles only in scan-oriented fragments, never instructional sentences. Preserve qualifiers, negations, numbers, units, identifiers, commands, errors, exact strings, and explanations needed for correctness, safety, or ambiguity handling. Never invent facts, and write in the project's own language — its terms and naming, not generic synonyms. The cure for verbosity is writing in the project's voice, not just writing shorter.
- **Code** — smallest change that works (YAGNI); never cut tests, error handling, or security checks to save space; code-first reporting (show the change, then the one-line why). The axis no-ops for seats that produce no code.

When the axes pull apart, precedence is: structure wins for steps, compression for connective prose, cadence variety for voice-forward prose.

## Voice cards

`tgo-default` is always-on for every seat. Named cards override when assigned:

- **Sources:** (a) delegation packet field `DelegationPacket.style` (`default` | `prose` | `conversational`), (b) explicit user request in session (`use prose`, `use conversational`, `use default` plus `stop X` / `normal mode` off-switch), (c) orchestrator asks user when ambiguous via the existing `suspend` machinery. **Precedence:** explicit request > packet assignment > default (`tgo-default`). The old `register` (`concise`/`natural`) and `{{TGO_REGISTER}}` machinery is removed; `style.card` is the config surface (`style.card: "default"` or omit for default, `"prose"` / `"conversational"` for named cards) and an old `register` key is safely ignored.
- **Dylan fallback:** self-classification survives only for **unassigned creative-writing tasks** when none of the three sources yields a card (it selects an exemplar shape hint, never the card). Technical steps/code never self-classify — they stay on `tgo-default`.

The default card folds `house-style.md` + `concision-instruction.md` plus plain-English deltas (ISO 24495-1, Strunk & White): abstract-noun-subject ban, circumlocution swaps (`due to the fact that→because`, `at this point in time→now`, `in order to→to`), modal ladder (`should` is hedge; instructions say `must` or state as fact), no sycophancy. Named cards add measured rhythm targets and distinct anti-pattern tuning: `tgo-prose` 29/44/27 buckets mean 19 median 16 p90 37 max ≤60; `tgo-conversational` 26/42/32 mean 20 median 19 p90 34 max ≤60; long via paratactic addition, paragraph-head discipline (max one long opener before a short landing; never two longs stacked), one device per sentence; shipped exemplars are embedded verbatim by shape (loader injects 1–2, never all); `tgo-default` is exemplar-free permanently. Off-switch is `style.enabled: false` or `stop X` / `normal mode`.

## Anti-slop: the scrub list (now in three rule packs)

The always-on banned-tell list is concrete, not generic. Tells are judged by clusters, not isolated instances — one "however" is fine, a run of AI-isms is not. Families live in loadable JSON packs (`plugin/assets/rule-packs/*.json`, validated via `plugin/schema/rule-pack.schema.json`):

- **Tier 1 — Mechanics (low-FP, always-on):** spelling/caps/repetition + mechanical paste-tells — unfilled placeholders (`[TODO]`, `{{placeholder}}`, `<<insert>>`), chat citation markup (`【†L…】`), AI tracking params (`utm_source=chatgpt`).
- **Tier 2 — Concision (medium-FP, whitelist-gated):** verbal false limbs table (`make an improvement→improve`), unnamed-authority patterns (`experts say` without citation), circumlocution swaps, corporate speak (`leverage`, `synergy`, `circle back`).
- **Tier 3 — Voice-cadence (high-FP, cluster-judged):** passive/hidden-actor, hedge stacks, novelty inflation, false balance, em-dash budgets, rule-of-three, synonym cycling. A single instance is not a finding — at least two related avoidable signals in the same response or section are required.

The surface list still includes:

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

## How it's delivered: two channels, one ruleset (single-sourced)

1. **Runtime payload for the primary loop** — hook #4 (`experimental.chat.system.transform`) appends the rendered default card (`plugin/src/voices.ts:renderInstruction` via `plugin/src/concision.ts:buildVoiceInstruction`) to Bernstein's system prompt every turn. Per-request, drift-proof: it survives compaction because it is re-appended. When a named card is active, the payload is layered `default (300–500 tokens) + override (≤200 tokens)` via `buildLayeredInstructions`; the override is `renderStyleOverride` and is not baked into seat prompts, preserving the 250-token fold ceiling. Exemplars are selected by shape tag at load time (1–2 injected, never all).
2. **Build-time fold into subagent seats** — the compact default card (`plugin/src/voices.ts:renderFold`, ≤250 tokens) is folded into every subagent seat prompt via the `{{TGO_HOUSE_STYLE}}` slot at build time. Bernstein has no fold slot — he is the primary loop, and folding him too would double-inject. The runtime hook skips subagent sessions (they carry `parentID`), so nothing is ever double-injected. The two near-duplicate assets `plugin/assets/house-style.md` and `plugin/assets/concision-instruction.md` are retired; `plugin/src/build.ts` and `plugin/src/concision.ts` single-source from `plugin/assets/voices/tgo-default.json`.

The spec calls for a 300–500-token runtime payload and a 250-token fold ceiling; `plugin/test/concision.test.ts` pins the actual sizes and the content (tell vocabulary, no-fabrication rule, clusters guard, diff-anchored tell), so bloat or a strip-back breaks CI.

## The off-switch

- Config: `style.enabled: false` disables the per-turn injection entirely (old `concision.enabled: false` and `register` are ignored but tolerated).
- In-session: "stop X" or "normal mode" turns the layer off (and `use default` clears an explicit card override).
- The escape list is explicit: break these rules when following them breaks correctness — a security warning, an irreversible confirmation, or an ambiguity-prone sequence must stay full and clear.

## No post-hoc editor

The layer is generation-time advice, never a rewrite pass. Draft → self-audit → final is an internal loop at generation time, which is legitimate; rewriting finished text after the fact is not something TGO does.

## Drift evaluation contract

The drift analyzer judges clusters or strong evidence across response length, sentence-length/readability, progress narration, and the scrub list, now **card-aware** via the three packs. A cluster means at least two related avoidable signals in one response or section; related means the same axis or scrub-tell family contributing to the same reader problem. Avoidable means removable or rephraseable without losing required meaning, protected content, correctness, safety, or ambiguity handling. Material reader cost means increased scan effort because a signal repeats content, delays or obscures the result/next action, or adds non-result process text. A repeated signal means the same avoidable signal in at least two separate spans; strong evidence is limited to two consecutive identical non-code sentences or paragraphs, a listed chatbot closer after the answer is complete, or a paragraph made only of progress narration that repeats an already stated result. “After the answer is complete” means the requested result and required caveats, commands, or verification have been delivered and no required answer or action remains. Each rule is mechanically testable and correctness-neutral only after protected/necessary spans are checked. Isolated tells do not trigger drift. Findings use `none` / `low` / `medium` / `high` severity and suppress evidence that is required, protected, safety-critical, or uncertain.

**Card-aware gating replaces `register=natural` suppression:** for each finding with family F in tier T, if T is `mechanics` it is never suppressed by card; otherwise if the active card's `anti_patterns.refs` excludes F it is suppressed; otherwise if card `strictness` is `low` and tier is `voice-cadence` it is suppressed unless strong-evidence; otherwise if the card's numeric thresholds (`em_dash_per_100w_max`, `hedge_stack_max`, etc.) are not met it is suppressed. Preservation and protected-content still outrank card gating. The analyzer consumes the selected `cardId` (default `tgo-default`); it does not infer a card. User instructions override the applicable default.

Code, commands, API names and identifiers, errors, warnings and security text, quotations, exact strings, numbers and units, negations, and explanations necessary for correctness, safety, irreversible confirmation, or ambiguity-prone sequences are protected. This list is non-exhaustive; the canonical protected-content and preservation rules are in §7.4 of the spec. Evaluation reports concision, readability, correctness, and preservation as measurements, not universal caps or policy defaults. The runtime `300–500` token band and fold `250`-token ceiling remain policy pins.

A **findings-targeted nudge** may reinforce a `medium` or `high` finding once per response attempt only when the drift is correctness-neutral. Preservation-risk findings are suppressed and non-actionable, and preservation uncertainty suppresses reinforcement. The nudge is not generic — it is a revision instruction built from `DriftFinding` spans/evidence/family ordered by span start: header "fix only flagged spans; preserve protected content," per-finding family/severity/basis/evidence plus deterministic spans, and footer "Override a flag with a one-word reason if it serves rhythm/emphasis/picture/idiom/joke — otherwise apply the fix." A flag survives only if a one-word override (`rhythm`, `emphasis`, `picture`, `idiom`, `joke`) applies; any other token is not a valid override. Active on all cards (same spine, card-tuned selection). Attempt identity and `reinforced` state persist across retries within the same user turn while the controller instance lives; a later user turn creates a new attempt. Compaction does not provide cross-process persistence. It must not rewrite delivered text or repeat the same reinforcement for the same attempt. `style.enabled: false` and the off-switch suppress it.

The analyzer result is descriptive and deterministic. Input and result state carry `attemptID`, `enabled`, and `reinforced`; input also carries `cardId` (legacy `register` alias tolerated for old fixtures), `outputClass`, and `mode`, while ordered findings carry `axis`, `severity`, `evidence`, `spans`, `basis`, per-finding `uncertainty`, and suppression fields. Per-finding uncertainty is `{ codes, message, spans }`, so actionable aggregation never infers uncertainty from spans. The result also carries `aggregate` (`severity`, `actionable`, `reinforcementEligible`), four metrics shaped as `{ value, unit, baseline, basis }`, and protected content shaped as `{ spans, treatment: { mode, reason } }`. Metric values are numeric observations, not policy caps; preservation-risk findings cannot be actionable or raise aggregate severity. Production reinforcement is opt-in and inert on the registered completion-hook path because that hook does not supply explicit preservation context or response lineage. The plugin does not synthesize those inputs. Controller tests use the direct surrogate interface with explicit context and lineage; controller state remains only while that controller instance lives, with no cross-process persistence. The complete field contract is in §7.3a of the canonical spec and `docs/spec/voice-cards.md` §8.

## Related

- Spec: `docs/spec/concision-enforcement.md` (canonical), `docs/spec/voice-cards.md` (voice cards + rule packs + findings-targeted nudge)
- Research: `docs/research/style-skills.md` (the tell taxonomy the scrub list draws from)
- Assets: `plugin/assets/voices/tgo-default.json` (fold + runtime, single source), `plugin/assets/voices/tgo-prose.json` + `tgo-conversational.json` (named cards with exemplars), `plugin/assets/rule-packs/{mechanics,concision,voice-cadence}.json` (three tiers)
- Human pages: `docs/ARCHITECTURE.md`, `docs/ROSTER.md`
