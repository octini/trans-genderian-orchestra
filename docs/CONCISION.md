# Always-on Concision

TGO's house style is one amalgamated three-axis ruleset, applied uniformly to every agent, every turn. It is not a post-hoc editor and not an optional linter: it is generation-time advice injected into the loop, with a two-position register dial that rides on Dylan's output alone and a universal off-switch.

This page is the human-readable version of `docs/spec/concision-enforcement.md`; that spec stays canonical.

## The three axes

- **Structure** — action-first; numbered steps for anything sequenced; restate the state before acting; no preamble, no closers.
- **Prose** — compress style, never substance. Drop filler, articles, and hedging, but never negations, numbers, units, or exact strings; keep code, commands, API names, and error messages verbatim. Never invent facts not in the source, and write in the project's own language — its terms and naming, not generic synonyms. The real cure for verbosity is writing in the project's voice, not just writing shorter.
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

## Related

- Spec: `docs/spec/concision-enforcement.md` (canonical)
- Research: `docs/research/style-skills.md` (the tell taxonomy the scrub list draws from)
- Assets: `plugin/assets/house-style.md` (the fold), `plugin/assets/concision-instruction.md` (the runtime payload)
- Human pages: `docs/ARCHITECTURE.md`, `docs/ROSTER.md`
