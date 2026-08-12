# TGO Spec — Always-on Concision & Anti-Slop Enforcement

Status: **spec** (buildable). Source decisions: `docs/wayfinder/decisions.md` (tgo-a6r.14, tgo-a6r.15). Audit: `docs/research/style-skills.md` (ep01-the-cure-for-ai-slop, stop-slop, humanizer). **Implemented (2026-08-11, tgo-69m):** the scrub half is now enriched with the concrete tell-vocabulary (AI-vocab, marketing adjectives, pomposities, throat-clearing openers, chatbot closers), the no-fabrication rule, the clusters-not-isolated-tells guard, and the diff-anchored-narration tell; drift protection pins the runtime payload in a 300–500-token band, a 250-token fold ceiling, and content pins (see `plugin/test/concision.test.ts`). **Amended (2026-08-11, 67ca5c2):** the wait-what ubiquitous-language fold ("write in the project's voice, not just shorter" — skill-candidates.md:148) is now in both payloads. Actual sizes: runtime ~480 tokens, fold ~240.

## 1. The house style: one amalgamated 3-axis ruleset, uniform across all agents

- **Structure** (i-have-adhd): action-first, numbered steps, state-restatement, no preamble/closers.
- **Prose-grammar** (caveman): drop filler/articles/hedging; meaning-preservation guardrails (never drop negations; verbatim code/errors); auto-disable for safety.
- **Code-output** (ponytail): YAGNI ladder, don't-cut list, code-first reporting.

Amalgamated into **one pruned injection (~300-500 tokens)**, applied uniformly to every agent. The code slider no-ops when a seat produces no code. One universal off-switch ("stop X" / "normal mode", standardized).

**Two delivery channels, one ruleset (clarified 2026-08-05, tgo-96f.3):** the ~300-500-token amalgamated injection is the **runtime payload for the primary loop** (Bernstein, via hook #4 `system.transform`, tgo-96f.9) — it can be large because it is re-appended every turn (drift-proof). The **build-time fold into subagent seat prompts is the compact scrub half (~135 tokens)** — seat prompts are capped at <1000 tokens total (body only), so the fold must be lean; it carries the same 3-axis rules plus the register line (see §4).

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
