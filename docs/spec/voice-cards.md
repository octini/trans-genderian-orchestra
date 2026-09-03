# TGO Spec — Voice Cards + Rule Packs

Status: **spec** (buildable). Source decisions: calibration session Fixed Decisions D1–D15 (2026-09-02). Related: `docs/CONCISION.md`, `docs/spec/concision-enforcement.md`, `plugin/assets/house-style.md`, `plugin/assets/concision-instruction.md`, `plugin/src/concision.ts`, `plugin/src/build.ts`, `plugin/src/drift.ts`, `plugin/src/style-reinforcement.ts`, `plugin/src/config.ts`, `plugin/schema/tgo.config.schema.json`, `plugin/assets/presets.json`, `tmp-repro/sentence-stats.json` (measured corpus, per-file provenance). Calibration corpus `*.rtf` gitignored (`.gitignore:23`).

## 1. Summary & goals

Replace the binary `concise`/`natural` register dial with **voice cards** (selectable prose voices) and **rule packs** (loadable drift families). `tgo-default` is always-on for every seat; named cards override when assigned. Rule families move from hard-coded `drift.ts` to JSON packs with card-aware gating. Findings become revision instructions (flag-then-override), not generic nudges.

Goals:

- Preserve the current house-style directives by folding them into the default card (no directive loss).
- Remove the `REGISTER_SLOT` / `{{TGO_REGISTER}}` machinery; single-source the default card from `build.ts` and `concision.ts`.
- Ship three cards at v1: `tgo-default`, `tgo-prose`, `tgo-conversational` with measured rhythm targets and distinct anti-pattern tuning.
- Make drift enforcement card-tuned via numeric thresholds and family applicability, not a global `natural` suppression.
- Keep asset count and validation inside existing JSON + `validate.ts` patterns (no new dependencies).
- Add card-aware benchmark regression gates; defer docs-rewrite validation to a post-merge Phase 2 ticket.

## 2. Decision register (D1–D15, traceable)

| ID | Decision (fixed) | Spec sections | Ticket |
|---|---|---|---|
| D1 | Kill the `concise`/`natural` register dial (`{{TGO_REGISTER}}`, `REGISTER_SLOT`). `tgo-default` always-on for all seats; named cards override when assigned. Dylan self-classify demoted to fallback for unassigned creative-writing tasks only. | §5, §6 | T2 |
| D2 | Assignment sources: (a) delegation packet field (orchestrator sets style per task), (b) explicit user request, (c) orchestrator asks user when ambiguous via existing `suspend` machinery. Precedence: explicit request > packet assignment > default. | §6 | T4 |
| D3 | Three cards at v1: `tgo-default`, `tgo-prose`, `tgo-conversational`. | §3, §4 | T1 |
| D4 | Card format: JSON files + JSON Schema (`plugin/schema/`), assets at `plugin/assets/voices/`. No new dependencies (JSON over YAML, validate via existing `validate.ts`). | §3, §4 | T1 |
| D5 | Card schema splits **Voice Invariants** (always apply: tone, diction, syntax targets, punctuation budgets, rhythm rules, perspective, anti-pattern refs, controls) from **Arc Repertoire** (conditional: structure templates per task shape). Exemplar selection by shape tag: loader injects 1–2 exemplars whose `shape` matches the task, never all. | §3 | T1 |
| D6 | Shipped exemplars are generated, user-approved passages only (embedded verbatim, shape-tagged). Generic attribution in `meta` (no author name-drops). Human calibration corpus never ships; `*.rtf` already gitignored. | §3, §4 | T1, T5 |
| D7 | Rule packs: `drift.ts` hard-coded families become loadable JSON packs in three false-positive tiers: **Mechanics** (low-FP, always on: spelling/caps/repetition + new mechanical paste-tells: unfilled placeholders, chat citation markup, AI tracking params), **Concision** (medium-FP, whitelist-gated: verbal false limbs table, unnamed-authority patterns, circumlocution swaps, corporate speak), **Voice-Cadence** (high-FP, cluster-judged: passive/hidden-actor, hedge stacks, novelty inflation, false balance, em-dash budgets, rule-of-three, synonym cycling). Cards declare `anti_patterns.refs` + `strictness` + numeric thresholds. Card-aware gating replaces `register=natural` suppression. | §7 | T3 |
| D8 | Findings-targeted nudge: replace generic `STYLE_NUDGE` with revision instruction built from `DriftFinding` data (spans, evidence, family); flag-then-override: a flag survives only if no one-word override reason applies (`rhythm`/`emphasis`/`picture`/`idiom`/`joke`). Active on all cards (same spine, card-tuned selection). | §8 | T5 |
| D9 | Measured rhythm targets (from `tmp-repro/sentence-stats.json` — per-file counts in §9; aggregates below are the settled calibration synthesis): `tgo-prose` by count ~29/44/27 (short 1–10w / medium 11–24w / long 25w+), mean ~19w, median ~16, p90 ~37, max ≤60. `tgo-conversational` ~26/42/32, mean ~20w, median 19, p90 34, max ≤60. Long via **paratactic addition** (and-chains of full clauses), not subordination depth. Paragraph-head discipline: max one long opener before a short landing; never two longs stacked. One device per sentence (no trope-in-trope). STE thresholds 20/25 stay in default. | §3, §7, §9 | T3, T5 |
| D10 | Prose card rules: informed similes only (comparison must inform; universal truisms hollow, banned); personified environment does concrete physical things only (never abstract/epistemic roles); no content-word echo within a sentence (unless deliberate anaphora); entity coherence (no role contradictions); unearned-resonance ban (closers may only gesture at meaning the passage built; flat landings need concrete referents); era-agnosticism (world-texture native to scene era; era defaulting anti-pattern); variance-follows-emphasis (no metronomic alternation). | §3 | T1, T5 |
| D11 | Conversational card rules: sentence-initial casual transitions (`But`/`And`/`So`/`Anyway`/`Plus`) rationed 1–2 per paragraph — features, exempt from flagging; every linked clause carries its own verb (no verbless chained absolutes; fragments only as deliberate beats); load-bearing authorities (borrowed voices must bear on claim); plain-wit over whimsy (max 1 precious metaphor per piece); two-beat button closing (flat verdict + one short widening line); length bias short. | §3 | T1, T5 |
| D12 | Default card content = fold of `house-style.md` + `concision-instruction.md` (directives preserved) plus plain-english-skill deltas: abstract-noun-subject ban, circumlocution swap list (`due to the fact that→because` etc.), modal ladder (`should` is hedge; instructions say `must` or state recommendation as fact), no sycophancy. Named priors: "Plain Language (ISO 24495-1)", "Strunk & White, The Elements of Style". Exemplar-free permanently. Off-switch preserved: `stop X` / `normal mode`. | §3, §4, §5 | T2 |
| D13 | `build.ts` (seat baking) and `concision.ts` (runtime injection) single-source from the default card — the two near-duplicate assets retire. | §4, §5 | T2 |
| D14 | Benchmarks: extend `plugin/benchmark/style-quality.ts` with card-aware regression gates against D9–D11 numeric targets. Phase 2 (separate ticket, post-merge): proof-of-concept rewrite of TGO GitHub docs (README) in each of the three voices as user validation. | §9 | T5, T6 |
| D15 | Config/presets: `tgo.config.schema.json` + `presets.json` updated (register surface replaced by style/card surface; default `"default"`; keep `productionEnabled`-style gating semantics for `style-reinforcement`). | §4, §5 | T5 |

## 3. Card schema

### 3.1 Schema pointer and validation

- Schema file: `plugin/schema/voice-card.schema.json` (new). Validated at build via `plugin/src/validate.ts` parity pattern (`assertSchemaZodParity` for `tgo.config.schema.json`; same mechanical check added for voice cards and rule packs).
- Rule-pack schema: `plugin/schema/rule-pack.schema.json` (new), same validation path.
- No YAML, no new dependencies; `plugin/src/validate.ts:validateSchema()` extended to cover both new schemas.
- Existing schema: `plugin/schema/tgo.config.schema.json:properties.register` (line 13) is replaced (see §5); the zod side `plugin/src/config.ts:tgoConfigSchema` (line 124) is the parity target.

### 3.2 Voice invariants vs arc repertoire

`voice_invariants` fields always apply when the card is active. `arc_repertoire` fields are conditional on task shape; the loader selects templates by `shape` tag.

- **Voice Invariants**: `tone`, `diction`, `syntax_targets` (bucket percentages, mean/median/p90/max, long-formation rule, STE thresholds), `punctuation_budgets` (em-dash, transition budgets, device-per-sentence), `rhythm_rules` (paragraph-head discipline, length bias, variance rule, fragment policy), `perspective` (person, authority posture), `anti_patterns` (`refs` to rule-pack families + `strictness` + numeric `thresholds`), `controls` (off-switch, exemplar injection cap, selection mode).
- **Arc Repertoire**: `templates[]` each with `shape` (e.g., `scene-vignette`, `argument`, `instruction`, `narrative`), `moves[]` (ordered structural beats), optional `constraints` (e.g., button shape). Never applied unconditionally; matched by task shape.
- **Exemplars**: `exemplars[]` each with `shape`, `person` (`first`/`third`), `first_line`, `last_line`, `text` (verbatim passage). Loader rule: inject 1–2 exemplars whose `shape` matches the task; never inject the full set. `meta.attribution` is generic (no author name-drops).

### 3.3 Full JSON example — `tgo-conversational` (real thresholds)

```json
{
  "$schema": "../schema/voice-card.schema.json",
  "id": "tgo-conversational",
  "version": "1.0.0",
  "meta": {
    "display_name": "TGO Conversational",
    "attribution": "Generated passages, user-approved (v1 calibration)",
    "exemplar_source": "calibration-transcript",
    "notes": "Generic attribution only; no author name-drops. Human corpus *.rtf never ships."
  },
  "voice_invariants": {
    "tone": "casual, frank, plain-wit over whimsy",
    "diction": "plain, concrete, low ornament; max 1 precious metaphor per piece",
    "syntax_targets": {
      "sentence_buckets_by_count": { "short_1_10w": 26, "medium_11_24w": 42, "long_25w_plus": 32 },
      "mean_words": 20,
      "median_words": 19,
      "p90_words": 34,
      "max_words": 60,
      "long_formation": "paratactic addition (and-chains of full clauses), not subordination depth",
      "ste_thresholds": { "instruction": 20, "descriptive": 25 }
    },
    "punctuation_budgets": {
      "em_dash_per_100w_max": 0.5,
      "em_dash_cluster_flag": 2,
      "sentence_initial_transitions_per_paragraph_max": 2,
      "transitions_exempt_from_flagging": ["But", "And", "So", "Anyway", "Plus"],
      "one_device_per_sentence": true
    },
    "rhythm_rules": {
      "paragraph_head_discipline": "max one long opener before a short landing; never two longs stacked",
      "length_bias": "short",
      "variance_follows_emphasis": true,
      "no_metronome_alternation": true,
      "linked_clause_requires_verb": true,
      "fragments": "only as deliberate beats; no verbless chained absolutes"
    },
    "perspective": "first-person or direct second-person; borrowed voices must be load-bearing authorities",
    "anti_patterns": {
      "refs": ["mechanics", "concision", "voice-cadence"],
      "strictness": "medium",
      "thresholds": {
        "hedge_stack_max": 1,
        "hidden_actor_flag": "cluster >= 2",
        "rule_of_three_cluster": 2,
        "synonym_cycle_window_sentences": 2,
        "novelty_inflation_flag": "cluster >= 2",
        "false_balance_flag": "cluster >= 2"
      }
    },
    "controls": {
      "off_switch": "stop X / normal mode",
      "exemplar_injection_max": 2,
      "exemplar_selection": "shape-tag match only; never all",
      "closer": "two-beat button (flat verdict + one short widening line)"
    }
  },
  "arc_repertoire": {
    "templates": [
      { "shape": "argument", "moves": ["claim", "concession", "evidence", "reframe", "button"], "constraints": ["two-beat closer"] },
      { "shape": "instruction", "moves": ["setup", "steps", "pitfall", "verify"], "constraints": ["every linked clause carries a verb"] },
      { "shape": "narrative", "moves": ["inciting", "complication", "turn", "button"], "constraints": ["transitions 1-2 per paragraph max"] }
    ]
  },
  "exemplars": [
    {
      "shape": "argument",
      "person": "first",
      "first_line": "So I want to defend the elevator...",
      "last_line": "So does most politeness, and we keep doing it.",
      "text": "<!-- EXEMPLAR TEXTS: to be inserted verbatim from calibration transcript at card-authoring time -->"
    },
    {
      "shape": "instruction",
      "person": "second",
      "first_line": "Okay, hard-boiled eggs...",
      "last_line": "nobody at the egg council will explain why.",
      "text": "<!-- EXEMPLAR TEXTS: to be inserted verbatim from calibration transcript at card-authoring time -->"
    },
    {
      "shape": "narrative",
      "person": "first",
      "first_line": "So the power went out at 6:40 last night...",
      "last_line": "the raccoon pasta was perfect.",
      "text": "<!-- EXEMPLAR TEXTS: to be inserted verbatim from calibration transcript at card-authoring time -->"
    }
  ]
}
```

`tgo-prose` uses the same outer shape with these deltas: `sentence_buckets_by_count` 29/44/27, `mean 19 / median 16 / p90 37 / max 60`, `tone` "measured, image-led, dry humor only when built", `anti_patterns.strictness` `high` for `voice-cadence`, and additional invariant rules from D10 (informed simile, personified environment concreteness, no content-word echo, entity coherence, unearned-resonance ban, era-agnosticism). `tgo-default` is exemplar-free permanently (`exemplars: []`) and its `voice_invariants` is the preserved fold + plain-english deltas (D12).

### 3.4 Prose and default exemplars — structure (texts deferred)

The spec defines structure; the implementation ticket carries the verbatim texts. Each entry below is a placeholder for the card-authoring step that will insert the approved passage verbatim, preserving line breaks.

**tgo-prose (5):**

- `shape: scene-vignette`, `person: third`, first line `"The marquee said CLOSED FOR THE SEASON, and under that, in smaller letters, THANK YOU FOR 61 YEARS..."`, last line `"...He salted the next batch anyway."` — drive-in theater, blind round.
  `<!-- EXEMPLAR TEXTS: to be inserted verbatim from calibration transcript at card-authoring time -->`
- `shape: institutional-comedy`, `person: first`, first line `"They had us in a room that smelled like carpet and old pizza..."`, last line `"...and twelve people looked at their shoes."` — jury duty, with v0.5 fixes: `"courthouse Bible so worn the gilded edges had gone cloudy"`, `"...like a pet I would never see again"` without feeding echo, `"the bailiff asked who wanted to be foreman"`.
  `<!-- EXEMPLAR TEXTS: to be inserted verbatim from calibration transcript at card-authoring time -->`
- `shape: retrospective-solitude`, `person: third`, first line `"The night shift at the toll plaza ran on coffee and spite..."`, last line `"...The moths kept coming."` — toll plaza revision with sister/voicemail ending.
  `<!-- EXEMPLAR TEXTS: to be inserted verbatim from calibration transcript at card-authoring time -->`
- `shape: dialogue-menace`, `person: first`, first line `"The bell over the door rang at 8:52..."`, last line `"...whether it was a good lock."` — bait shop, Denny first-person, cooler-lock ending.
  `<!-- EXEMPLAR TEXTS: to be inserted verbatim from calibration transcript at card-authoring time -->`
- `shape: genre-dialogue`, `person: third`, first line `"The sorceress kept shop hours the way other women kept cats..."`, last line `"...her apprentices stopped sweeping to listen."`
  `<!-- EXEMPLAR TEXTS: to be inserted verbatim from calibration transcript at card-authoring time -->`

`tgo-default`: no exemplars (permanently). Loader asserts `exemplars.length === 0`.

## 4. Asset layout & shipped artifacts

```
plugin/assets/voices/
  tgo-default.json          # D12 fold + plain-english deltas; exemplar-free
  tgo-prose.json            # D10 + D9 prose targets; 5 exemplars
  tgo-conversational.json   # D11 + D9 conversational targets; 3 exemplars
plugin/schema/
  voice-card.schema.json    # D4, D5 — card shape (invariants / repertoire / exemplars / meta)
  rule-pack.schema.json     # D7 — pack shape (families, patterns, thresholds, tier)
  tgo.config.schema.json    # D15 — register → style surface migration
plugin/assets/rule-packs/
  mechanics.json            # D7 tier 1 — low-FP, always on
  concision.json            # D7 tier 2 — medium-FP, whitelist-gated
  voice-cadence.json        # D7 tier 3 — high-FP, cluster-judged
plugin/assets/
  house-style.md            # RETIRED after T2 (single-source cutover); kept one release as deprecated reference
  concision-instruction.md  # RETIRED after T2
```

Shipped artifacts: the three voice JSON files, the two new schemas, the three rule-pack JSON files, and the migrated config. The human calibration `*.rtf` corpus is never shipped (`.gitignore` already covers `*.rtf`). `presets.json` is updated for the style surface (no new model entries required; presets remain seat→model maps).

Build output: rendered seat prompts in `~/.config/opencode/agent/*.md` continue to contain the default card fragment (baked at build time). Runtime injection for Bernstein's primary loop sources from the same `tgo-default.json` (single source, D13).

## 5. Register refactor (real touch points)

This section enumerates the current register machinery that is removed or retargeted. Every entry cites the actual file and symbol verified in the repository.

### 5.1 `plugin/src/build.ts` — build-time fold

- `plugin/src/build.ts:HOUSE_STYLE_SLOT` — `"{{TGO_HOUSE_STYLE}}"` (line 11) — retained, but its payload becomes the rendered default card, not `house-style.md` verbatim.
- `plugin/src/build.ts:REGISTER_SLOT` — `"{{TGO_REGISTER}}"` (line 12) — **removed**. All `.replace(new RegExp(REGISTER_SLOT,"g"), register)` call sites go.
- `plugin/src/build.ts:REGISTERS` — `["concise","natural"]` (line 16) — **removed**; replaced by `VOICE_CARDS = ["default","prose","conversational"]` (or equivalent enum derived from `plugin/assets/voices/*.json` filenames). Type `Register` (line 17) becomes `VoiceCardId`.
- `plugin/src/build.ts:loadHouseStyle()` (line 24) — reads `assets/house-style.md` — retargeted to `loadVoiceCard("tgo-default")` (read + validate JSON against `voice-card.schema.json`).
- `plugin/src/build.ts:loadAgentsFragment()` (line 29) — unchanged.
- `plugin/src/build.ts:foldHouseStyle()` (line 34) — `(template, houseStyle, register)` → `(template, voiceCard)` where `voiceCard` is the rendered default-card text. Removes the `register` param.
- `plugin/src/build.ts:renderSeats()` (line 45) — `(sourceDir, register)` → `(sourceDir, voiceCardId?)` — default param becomes `"default"`; validates token budget unchanged.
- `plugin/src/build.ts:buildSeatsTo()` (line 66) — `(agentsDir, register)` → `(agentsDir, voiceCardId?)`.
- `plugin/src/build.ts:assertPromptUnderBudget()` call at line 60 — retained; budget remains `MAX_PROMPT_TOKENS=1000`.
- `plugin/src/build.ts` CLI dual-emit block (line 379–447) — unchanged except `renderSeats` signature.

### 5.2 `plugin/src/concision.ts` — runtime injection

- `plugin/src/concision.ts:REGISTER_SLOT` import (line 4) `import { REGISTER_SLOT, type Register } from "./build"` — replaced by `VOICE_CARD` type import.
- `plugin/src/concision.ts:loadConcisionInstruction()` (line 14) — reads `assets/concision-instruction.md` — retargeted to load `tgo-default.json` and render its `voice_invariants` as the instruction (single source with `build.ts`).
- `plugin/src/concision.ts:buildConcisionInstruction(register)` (line 19) — `(register="concise") => template.replace(REGISTER_SLOT, register)` — becomes `buildVoiceInstruction(cardId="default")` with no slot replacement; same (≈300–500 token) band now governed by the default-card rendering, not two near-duplicate files.
- `plugin/src/concision.ts:ConcisionController` (line 42) — field `register: Register` → `cardId: VoiceCardId`; constructor `register` opt → `cardId`.
- `plugin/src/concision.ts:ConcisionController.buildInstruction()` (line 55) — `buildConcisionInstruction(this.register)` → `buildVoiceInstruction(this.cardId)`.
- `plugin/src/concision.ts:ConcisionController.transform()` (line 85) — injection point `experimental.chat.system.transform` (hook #4, `docs/spec/architecture.md` §4) — retains `isPrimary` gate and `enabled` check; payload source changes; subagent skip (`parentID` check) stays.

The two-asset duplication (`house-style.md` ≈240 tokens fold + `concision-instruction.md` ≈480 tokens runtime) collapses to one JSON source; the runtime payload and the fold are two renderings of the same `tgo-default` invariants (D13).

### 5.3 `plugin/src/drift.ts` — hard-coded families to packs

- `plugin/src/drift.ts:families` (line 31) `Record<string, RegExp[]>` — 13 hard-coded families (`AI-vocabulary`, `marketing`, `filler`, `adverb`, `modal-hedge`, `pompous`, `closer`, `rule-of-three`, `not-x-it-is-y`, `synonym-cycling`, `hidden-actor`, `em-dash-spam`, `diff-anchored-narration`) — extracted into three JSON packs (see §7); `families` becomes a runtime load of the packs.
- `plugin/src/drift.ts:STE_INSTRUCTION_THRESHOLD / STE_DESCRIPTIVE_THRESHOLD` (lines 46–47) `20 / 25` — preserved, now owned by the default card's `syntax_targets.ste_thresholds` but constants remain as fallback defaults.
- `plugin/src/drift.ts:countSteViolations()` (line 51) — unchanged, gated on `mode === "tool-heavy"` as before.
- `plugin/src/drift.ts:protectedSpans()` (line 76) — unchanged.
- `plugin/src/drift.ts:finding()` (line 109) — suppression line `register === "natural" && axis === "readability"` — **replaced** by card-aware gating (see §7): `card.anti_patterns.refs` + `strictness` + `thresholds` + tier.
- `plugin/src/drift.ts:analyzeStyleDrift()` (line 118) — signature `register: DriftRegister` → `cardId: VoiceCardId` (or `card: VoiceCard`); internal suppression and family wiring now pack-driven.

### 5.4 `plugin/src/style-reinforcement.ts` — generic nudge to findings-targeted

- `plugin/src/style-reinforcement.ts:STYLE_NUDGE` (line 4) — `"Self-audit …"` — **replaced** by a builder `buildFindingsNudge(findings: DriftFinding[])` that renders spans/evidence/family into a revision instruction (D8).
- `plugin/src/style-reinforcement.ts:StyleReinforcementController` (line 21) — field `register` → `cardId`; constructor `register` opt → `cardId`.
- `plugin/src/style-reinforcement.ts:noteUserMessage()` (line 45) — off-switch `stop X / normal mode` stays; now also handles style override phrasing (`use prose` / `use conversational` / `use default`) as explicit-request signal for §6.
- `plugin/src/style-reinforcement.ts:noteCompletion()` (line 75) — `analyzeStyleDrift({ register: this.register, … })` → `… { cardId: this.cardId, … }`; `reinforcementEligible` now also requires flag-then-override survival (see §8).
- `plugin/src/style-reinforcement.ts:appendPending()` (line 101) — `system.push(STYLE_NUDGE)` → `system.push(buildFindingsNudge(pending.findings))`.

### 5.5 `plugin/src/config.ts` + `plugin/schema/tgo.config.schema.json` + `plugin/assets/presets.json`

- `plugin/src/config.ts:tgoConfigSchema` (line 124) — field `register: z.enum(["concise","natural"]).default("concise")` (line 133) → `style: z.object({ card: z.enum(["default","prose","conversational"]).default("default"), … })` or top-level `card` (exact key chosen in T5; schema parity required). `concision: concisionConfig` (line 72) → `style` with `enabled` + `reinforcement` (gating semantics preserved: `productionEnabled` analogue).
- `plugin/schema/tgo.config.schema.json:properties.register` (line 13) and `properties.concision` (line 45) — migrated to `properties.style` with `card` enum.
- `plugin/assets/presets.json` — **not** expanded with style bundling per preset (matches existing decision that register/style is top-level, not per-preset; `docs/spec/features.md` §5). The file gains no per-preset style keys.
- `plugin/src/config.ts:loadTgoConfig()` (line 198), `estimatePromptTokens()` (line 177), `assertPromptUnderBudget()` (line 181) — unchanged except schema shape.

### 5.6 `plugin/src/plugin.ts` — hook and instantiation surfaces

- `plugin/src/plugin.ts:ConcisionController` instantiation (line 214) — `new ConcisionController({ enabled: config.concision?.enabled, register: config.register })` → `…({ enabled: config.style?.enabled, cardId: config.style?.card })`.
- `plugin/src/plugin.ts:StyleReinforcementController` instantiation (line 219) — same migration; `productionEnabled: config.concision?.reinforcement` preserves gating semantics under `config.style.reinforcement`.
- Hook registration `experimental.chat.system.transform` (concision, hook #4) and the inert `experimental.text.complete` observer — wires unchanged; payload builder changes as above.
- Seat sync path `reconcileSeats(…, config.register)` (line 152) → `…, config.style?.card`.

### 5.7 `plugin/src/delegation.ts` + `plugin/src/suspend.ts` — assignment plumbing

- `plugin/src/delegation.ts:DelegationPacket` interface (line 19) — add optional `style?: "default" | "prose" | "conversational"` (and `styleSource?: "explicit" | "packet"`) for source (a) in D2. Validation in `validateDelegationPacket()` (line 111) extended to validate `style` enum when present.
- `plugin/src/suspend.ts:suspend()` (line 393) / `tryProseResume()` (line 465) — reused for source (c): orchestrator asks user when ambiguous (see §6); no new suspension mechanism, just a defined question schema.

### 5.8 `plugin/benchmark/style-quality.ts` — benchmark extension

- `plugin/benchmark/style-quality.ts:runBenchmark()` / `renderBenchmark()` and variant map `VARIANT_PAYLOAD_TOKENS` — extended with card-aware fixtures and regression gates (D14); new `byCard` aggregation alongside existing `byMode` / `byTaskClass`.

## 6. Assignment model & precedence

**Sources (D2):**

1. **Delegation packet field** — orchestrator sets `style` per task (`delegation.ts:DelegationPacket.style`). This is the primary programmatic assignment.
2. **Explicit user request** — in-session natural language (`use prose`, `use conversational`, `use default`, `stop X`, `normal mode`). Detected in `style-reinforcement.ts:noteUserMessage()` and in the primary loop's style controller; treated as a session-scoped override.
3. **Orchestrator asks user when ambiguous** — Bernstein escalates via the existing `suspend` machinery (`suspend.ts:suspend` with a typed schema `{ style: enum[default, prose, conversational], reason: string }`; resume via `tryProseResume`). No new durability mechanism.

**Precedence (strict):**

```
explicit request  >  packet assignment  >  default (tgo-default)
```

- Default is `tgo-default` always (never `undefined`). Every seat renders with the default card; a named card is an additive override, not a replacement of the enforcement spine.
- Within a session, an explicit request overrides the packet for subsequent turns until the user clears it (`normal mode` / `use default`). Packet assignment is per-delegation, not session-persistent.
- Dylan's self-classification survives only as fallback for **unassigned creative-writing tasks** when none of the three sources yields a card (D1). It is not a register toggle; it is a shape-tag hint that selects the exemplar template, never the card itself. Technical steps/code tasks never self-classify to a voice card — they stay on `tgo-default`.

**Injection mechanics:**

- Build-time fold: `build.ts:renderSeats` bakes the default card into every subagent seat prompt (`~/.config/opencode/agent/*.md`), same as today's `{{TGO_HOUSE_STYLE}}` slot. Named-card deltas are **not** baked; they are injected at runtime when the card is active (prevents prompt bloat and keeps the fold ceiling 250 tokens).
- Runtime injection: `concision.ts:ConcisionController.transform` (hook #4, `experimental.chat.system.transform`, primary-loop only via `isPrimary`/`parentID` check) appends the active card's `voice_invariants` rendering. When a named card is active, the payload is `default invariants + named-card overrides` (layered, not duplicated). Token budget for the runtime payload remains 300–500 tokens (same pin as `docs/spec/concision-enforcement.md` §5).

> 2026-09-02 remediation: layered injection budget = default 300–500 + named-card override ≤200; seat baking pinned to tgo-default.

## 7. Rule packs (format, three tiers, per-family FP risk, card-aware gating)

### 7.1 Format

Each rule pack is a JSON file at `plugin/assets/rule-packs/*.json` validated by `plugin/schema/rule-pack.schema.json`.

```json
{
  "$schema": "../schema/rule-pack.schema.json",
  "id": "mechanics",
  "tier": 1,
  "false_positive_risk": "low",
  "gating": "always-on",
  "families": [
    {
      "name": "spelling-caps-repetition",
      "patterns": [{ "kind": "regex", "value": "\\b…", "flags": "gi" }],
      "severity": "low",
      "basis": "cluster",
      "thresholds": { "cluster_min": 2 }
    }
  ]
}
```

Load path: `drift.ts` imports the three packs at startup (synchronous JSON `fs.readFile` + schema validation). No dynamic `require` of user-supplied paths. Pattern `kind` is `regex` only at v1 (no JS payloads).

### 7.2 Three tiers

**Tier 1 — Mechanics (low-FP, always on):**

- Families: `spelling`, `caps`, `repetition` (existing) + new **mechanical paste-tells**: `unfilled-placeholders` (e.g., `[TODO]`, `{{placeholder}}`, `<<insert>>`), `chat-citation-markup` (e.g., `【†L…】` style leak), `ai-tracking-params` (e.g., `utm_source=chatgpt`-style query params in URLs).
- `gating: always-on` — never suppressed by card. Findings in this tier are always actionable when `enabled`, because the evidence is mechanical and correctness-neutral.

**Tier 2 — Concision (medium-FP, whitelist-gated):**

- Families: `verbal-false-limbs` (table, e.g., `make an improvement → improve`), `unnamed-authority` (`experts say`, `studies show` without citation), `circumlocution-swaps` (`due to the fact that→because`, `at this point in time→now`, `in order to→to`), `corporate-speak` (`leverage`, `synergy`, `circle back`, `move the needle`).
- `gating: whitelist` — applied only when not in `protectedSpans` (identifiers, quotations, necessary explanations). Whitelist check is per-family via `protectedContent.treatment` (`drift.ts:protectedSpans` + `protectedContent.treatment.mode`).

**Tier 3 — Voice-Cadence (high-FP, cluster-judged):**

- Families: `passive-hidden-actor`, `hedge-stacks`, `novelty-inflation`, `false-balance`, `em-dash-budgets`, `rule-of-three`, `synonym-cycling`.
- `gating: cluster` — a single instance is not a finding. Contract: **cluster** = at least two related, avoidable signals in the same response or section; **repeated signal** = same avoidable signal in two separate spans; **strong evidence** = the three mechanically testable patterns defined in `docs/spec/concision-enforcement.md` §7.2. This preserves the current §7.2 definition verbatim.

### 7.3 Card-aware gating semantics (replaces register suppression)

Current suppression: `drift.ts:finding()` suppresses `readability` when `register === "natural"` (D7 migration target). New semantics:

```
For each finding with family F in tier T:
  if T == mechanics              → never suppressed by card
  else if card.anti_patterns.refs excludes F → suppressed (reason: "card marks family non-applicable")
  else if card.anti_patterns.strictness == "low" and T == voice-cadence
                                 → suppressed unless strong-evidence
  else if cluster/span thresholds in card.anti_patterns.thresholds not met
                                 → suppressed (reason: "below card threshold")
  else                           → actionable (subject to existing preservation / protected checks)
```

- `anti_patterns.refs` is an explicit allowlist of families the card cares about. `tgo-default` refs include all of tier 1 + most of tier 2 + a narrow subset of tier 3 (e.g., `hidden-actor`, `hedge-stacks`, `closer`). `tgo-prose` and `tgo-conversational` include additional tier 3 families but with card-tuned thresholds (e.g., conversational exempts `sentence_initial_transitions`).
- `strictness` (`low`/`medium`/`high`) is a coarse knob; `thresholds` are the precise numeric overrides (e.g., `em_dash_per_100w_max`, `hedge_stack_max`). Thresholds win over strictness ties.
- Preservation and protected-content suppression (existing) outranks card gating: a preservation-risk finding is always suppressed and non-actionable, regardless of card.

### 7.4 Mapping from current hard-coded families to packs

| Current `drift.ts:families` key | Target pack | Notes |
|---|---|---|
| `AI-vocabulary`, `marketing`, `pompous`, `adverb`, `modal-hedge` | `concision.json` + `voice-cadence.json` split | `AI-vocab` generic terms → concision `corporate-speak`; `modal-hedge` / `adverb` hedge stacks → voice-cadence |
| `filler`, `closer`, `diff-anchored-narration` | `mechanics.json` (filler subset) + `voice-cadence.json` (closer) | `closer` stays high-FP, cluster-judged |
| `rule-of-three`, `synonym-cycling`, `not-x-it-is-y` | `voice-cadence.json` | Unchanged, now threshold-driven |
| `hidden-actor`, `em-dash-spam` | `voice-cadence.json` | Budgets become numeric (`em_dash_per_100w_max`) |
| new: `unfilled-placeholders`, `chat-citation-markup`, `ai-tracking-params` | `mechanics.json` | New low-FP mechanical tells |

## 8. Findings-targeted nudge protocol

Replaces `style-reinforcement.ts:STYLE_NUDGE` (D8). Same enforcement spine (once per attempt, correctness-neutral, `enabled`/`reinforced`/`primary` gates), card-tuned finding selection via §7.3.

**Trigger:** `analyzeStyleDrift` returns `aggregate.reinforcementEligible === true` (i.e., actionable, correctness-neutral, no preservation uncertainty, `reinforced === false`).

**Payload:** not a generic reminder. The controller builds a revision instruction from the `DriftFinding` array:

```
Header: "Style pass — fix only the flagged spans; preserve all protected content."
For each actionable finding (ordered by span start, then axis, then severity):
  "- [family] (severity medium/high, basis cluster/repeated-signal/strong-evidence): evidence '…'"
  "  spans: [start:end, …] — rewrite only these spans; keep code/commands/negations/numbers/explanations verbatim."
Flag-then-override footer:
  "Override a flag with a one-word reason if it serves rhythm/emphasis/picture/idiom/joke — otherwise apply the fix."
```

- `spans` are deterministic locations from `drift.ts` (already contract). `evidence` is descriptive, not rewritten prose. The builder never invents a span or claim.
- The footer codifies the **flag-then-override** protocol: a flag survives only if no one-word override reason applies. Valid reasons: `rhythm`, `emphasis`, `picture`, `idiom`, `joke`. Any other token is not a valid override; the flag stands.
- Active on **all cards** — same spine, card-tuned selection. `tgo-default` will typically produce concision/mechanics nudges; `tgo-prose`/`tgo-conversational` will additionally surface voice-cadence nudges whose families are refs for that card.

**State and hooks:**

- `noteCompletion()` (line 75) now stores the actionable findings as `pending.findings` on the session state, not just `pending=true`.
- `appendPending()` (line 101) renders `buildFindingsNudge(pending.findings)` and pushes it into `system[]` (hook #4's `system.transform` output, or the `experimental.text.complete` → next-turn injection when that observer is active). Marks `reinforced=true`.
- Once-only guarantee preserved: `reinforced` flag per `attemptID` (stable across retries and compaction; new user turn = new `attemptID`). `enabled === false` or off-switch suppresses entirely, same as today.

## 9. Benchmarks & phase-2 PoC

### 9.1 Extending `plugin/benchmark/style-quality.ts`

Extend the deterministic benchmark with **card-aware regression gates** against D9–D11 numeric targets.

- New dimension `byCard: Record<VoiceCardId, …>` alongside existing `byMode` and `byTaskClass` in `BenchmarkReport`.
- Fixtures: existing `STYLE_QUALITY_FIXTURES` (10, `plugin/test/fixtures/style-quality.ts`) remain the correctness spine. Add card-conditioned fixture variants: each fixture run under each of `tgo-default`, `tgo-prose`, `tgo-conversational` (3× coverage). Current 5-way `none`/`tgo-small`/`tgo-current`/`tgo-ste-selective`/`tgo-large` variant labeling maps to `none`/`tgo-default` (or retains legacy names with `byCard` alias) to preserve history.
- Metrics gated:
  - **Rhythm buckets** (§3.2 syntax_targets): per-card bucket percentages within ±5 points of 29/44/27 (prose) and 26/42/32 (conversational); mean/median/p90 within ±2 words; max ≤60 hard cap (fail on violation).
  - **Paragraph-head discipline**: max one long opener before a short landing; never two longs stacked (fixture-level assertion).
  - **One device per sentence** and **STE thresholds** (20/25) as inert/metric-only for non-tool-heavy, violations-per-100w for tool-heavy — same provenance split as today's `steLength`.
  - **Anti-pattern FP budgets**: per-card `thresholds` violations must stay within card-declared maxima; regressions beyond `thresholds.maximumDriftRegression` (0.25) analogue per card fail the gate.
  - **Preservation/correctness**: `preservation: score-0-to-1` and `requiredClaimRetention` remain exact (1.0 for non-uncertain fixtures), same as current thresholds.
- Command: `bun run benchmark:style-quality --check` fails on any gate violation. `bun run benchmark/style-quality.ts` without `--check` prints the full JSON report (same UX as `docs/spec/style-quality-evaluation.md`).

Reference files: `plugin/benchmark/style-quality.ts` (variant payloads, `runBenchmark`, `renderBenchmark`), `plugin/test/fixtures/style-quality.ts` (corpus), `tmp-repro/sentence-stats.json` (per-file provenance for D9 aggregates: `prose_2.rtf` 30/39/30 mean 20.9 median 20 p90 39 max 54; `prose_3.rtf` 35/35/29 mean 20.2 median 19 p90 40 max 58; `conversational_1.rtf` 11/39/50 mean 22.9 median 23.5 p90 34 max 44; `conversational_2.rtf` 36/32/32 mean 20.5 median 16 p90 39 max 62 — aggregates in D9 are the settled synthesis, not a single file).

### 9.2 Phase 2 — post-merge PoC (separate ticket)

Proof-of-concept rewrite of TGO GitHub docs (`README.md` at minimum) in each of the three voices (default / prose / conversational) as **user validation**. This is not part of the build gate; it is a filed follow-up ticket closed by user approval.

- Input: current `README.md`.
- Output: `docs/validation/voice-cards/README-{default,prose,conversational}.md` (or equivalent path agreed with user).
- Acceptance: user sign-off on voice distinctness and correctness; no benchmark gate.

## 10. Implementation checklist (≤6 tickets, dependency-ordered)

### T1 — Card schema & asset scaffold

- **Objective:** Create the JSON Schema contracts and the asset inventory so subsequent tickets have a stable shape to target.
- **Files:** `plugin/schema/voice-card.schema.json` (new), `plugin/schema/rule-pack.schema.json` (new), `plugin/assets/voices/tgo-default.json` (skeleton), `plugin/assets/voices/tgo-prose.json` (skeleton), `plugin/assets/voices/tgo-conversational.json` (skeleton), `plugin/src/validate.ts` (extend `validateSchema()`), `plugin/test/validate.test.ts` (extend parity fixture).
- **Acceptance criteria:**
  - `bun run plugin/src/validate.ts` passes (zod ↔ JSON schema parity for both new schemas + existing `tgo.config.schema.json`).
  - `bun test plugin/test/validate.test.ts` green.
  - Three voice files exist, validate against `voice-card.schema.json` via `validate.ts` machinery, no YAML, no new dependencies.
  - `*.rtf` remains gitignored.

### T2 — Default card content + register kill + single-source wiring

- **Depends on:** T1.
- **Objective:** Fold `house-style.md` + `concision-instruction.md` into `tgo-default.json` (D12 deltas included) and remove the `REGISTER_SLOT` dial, collapsing two assets into one source.
- **Files:** `plugin/assets/voices/tgo-default.json` (fill invariants: axes + banned tells + plain-english deltas + STE 20/25 + priors), `plugin/src/build.ts` (remove `REGISTER_SLOT`/`REGISTERS`/`Register`, retarget `loadHouseStyle`→`loadVoiceCard`, strip `register` param from `foldHouseStyle`/`renderSeats`/`buildSeatsTo`), `plugin/src/concision.ts` (remove `REGISTER_SLOT`, replace `loadConcisionInstruction`/`buildConcisionInstruction` with `loadVoiceCard`/`buildVoiceInstruction`, `ConcisionController` `register`→`cardId`), `plugin/assets/house-style.md` (mark deprecated), `plugin/assets/concision-instruction.md` (mark deprecated), `plugin/test/concision.test.ts` (update pins: no `REGISTER_SLOT`, token bands 300–500 runtime / 250 fold ceiling still asserted, tell vocabulary still asserted).
- **Acceptance criteria:**
  - `bun test plugin/test/concision.test.ts` green (payload still 300–500 tokens, fold ≤250 tokens; content now sourced from `tgo-default.json`).
  - `plugin/src/build.ts` contains no `REGISTER_SLOT` or `REGISTERS: ["concise","natural"]`.
  - `plugin/src/concision.ts` contains no `"concise"`/`"natural"` literal and no `REGISTER_SLOT`.
  - Rendered seat prompts (`build.ts:renderSeats` with `tgo-default`) still pass `assertPromptUnderBudget` (<1000 tokens).

### T3 — Rule packs + card-aware gating in `drift.ts`

- **Depends on:** T1, T2.
- **Objective:** Extract `drift.ts:families` into three JSON rule packs and replace `register=natural` suppression with card-aware gating (D7).
- **Files:** `plugin/assets/rule-packs/mechanics.json`, `plugin/assets/rule-packs/concision.json`, `plugin/assets/rule-packs/voice-cadence.json`, `plugin/schema/rule-pack.schema.json` (if not already by T1), `plugin/src/drift.ts` (`families` → pack loader, `finding()` card-aware gating, `analyzeStyleDrift` signature `register`→`cardId`, `thresholds` plumbing), `plugin/test/drift.test.ts` (family coverage, FP tiers), `plugin/test/style-quality.test.ts` (suppression semantics).
- **Acceptance criteria:**
  - All pack files validate against `rule-pack.schema.json`.
  - `mechanics` findings are always actionable when not protected (low-FP guarantee).
  - `concision` findings are whitelist-gated (protected spans suppress correctly).
  - `voice-cadence` findings require cluster (`≥2` related signals) to become actionable.
  - Card-aware gating test: a `hidden-actor` cluster on `tgo-default` is actionable; same single-instance is suppressed on a card that excludes that family; `mechanics` never suppressed by card.
  - `bun test plugin/test/drift.test.ts plugin/test/style-quality.test.ts` green.

### T4 — Assignment model & delegation packet + suspend question

- **Depends on:** T1.
- **Objective:** Wire the three assignment sources and precedence (D2) with minimal code surface.
- **Files:** `plugin/src/delegation.ts` (`DelegationPacket.style` + validation), `plugin/src/suspend.ts` (question schema for ambiguous style), `plugin/src/style-reinforcement.ts` (`noteUserMessage` explicit-request detection for `use prose`/`use conversational`/`use default` + `stop X`), `plugin/src/plugin.ts` (pass `style` from delegation into controller instantiation / per-turn routing), `plugin/test/delegation.test.ts`, `plugin/test/suspend.test.ts`.
- **Acceptance criteria:**
  - `validateDelegationPacket` accepts `style ∈ {default,prose,conversational}` and rejects invalid strings; absent `style` is valid (defaults to `tgo-default`).
  - Precedence test: explicit request overrides packet, which overrides default; `normal mode` / `use default` clears the explicit override.
  - Ambiguity path: when `packet.style` absent and task shape is ambiguous, Bernstein can invoke `suspend` with `{ style: enum, reason }` and resume via `tryProseResume` (file-based durable gate, no new mechanism).
  - `bun test plugin/test/delegation.test.ts plugin/test/suspend.test.ts` green.

### T5 — Findings-targeted nudge + card-specific invariant checks + config/presets migration + prose/conversational cards

- **Depends on:** T2, T3, T4.
- **Objective:** Replace `STYLE_NUDGE` with the findings-targeted revision instruction (D8), fill the two named cards (D10, D11 with D9 targets and exemplar placeholders), and migrate config/presets away from `register` (D15).
- **Files:** `plugin/src/style-reinforcement.ts` (`STYLE_NUDGE`→`buildFindingsNudge`, flag-then-override footer, `pending.findings` state, `noteCompletion`/`appendPending` builders), `plugin/assets/voices/tgo-prose.json` (full invariants per D10 + D9 29/44/27 + exemplars 5), `plugin/assets/voices/tgo-conversational.json` (full invariants per D11 + D9 26/42/32 + exemplars 3), `plugin/src/config.ts` (`register`→`style.card` with default `"default"`, `concision`→`style` object), `plugin/schema/tgo.config.schema.json` (`register`→`style.card`), `plugin/assets/presets.json` (no per-preset style bundling; top-level `style` only), `plugin/src/plugin.ts` (`config.style` wiring to both controllers + seat sync + `board` validation), `plugin/src/validate.ts` (extended parity), `plugin/test/style-reinforcement.test.ts` (flag-then-override, once-only).
- **Acceptance criteria:**
  - Nudge payload contains deterministic `spans`, `evidence`, `family` per finding; header says "fix only flagged spans; preserve protected content"; footer lists `rhythm/emphasis/picture/idiom/joke` as the only valid one-word overrides.
  - Once-only guarantee holds (second `appendPending` in same `attemptID` is no-op; new user turn resets `reinforced`).
  - Off-switch (`stop X` / `normal mode`) suppresses nudge entirely.
  - `tgo.config.schema.json` ↔ `config.ts:tgoConfigSchema` parity holds (validate script green).
  - Both named cards validate against `voice-card.schema.json`; `tgo-default` exemplar-free assert passes; prose/conversational exemplar placeholders carry the required shape/person/first_line/last_line descriptors (verbatim texts to be inserted from calibration transcript at card-authoring time — see §3.4).
  - Existing concision goldens (`docs/spec/concision-enforcement.md` §7 token pins) remain green via default card.

### T6 — Benchmark regression gates + Phase-2 validation ticket

- **Depends on:** T3, T5.
- **Objective:** Extend `plugin/benchmark/style-quality.ts` with card-aware gates (D14, D9–D11) and file the Phase-2 docs-rewrite validation ticket.
- **Files:** `plugin/benchmark/style-quality.ts` (new `byCard` aggregation, rhythm/paragraph-head/device-per-sentence/STE gates, `byCard` thresholds), `plugin/test/fixtures/style-quality.ts` (card-conditioned variants if needed), `docs/spec/style-quality-evaluation.md` (document `byCard` and new gates), filed beads issue `tgo-*` for Phase-2 PoC (README rewrites in three voices, user validation).
- **Acceptance criteria:**
  - `bun run benchmark:style-quality --check` passes under `tgo-default` / `tgo-prose` / `tgo-conversational` variant runs; fails when rhythm bucket deviates >±5 or `max >60` or paragraph-head discipline violated.
  - `byCard` report is present and documented.
  - Phase-2 issue exists with acceptance: user sign-off on three README rewrites (default/prose/conversational) for voice distinctness and correctness — not a build gate.

## 11. Open questions

None. One deferred insertion is tracked explicitly (not a gap):

- **Exemplar verbatim insertion** — the 8 passages (5 prose + 3 conversational) are structurally specified in §3.4 with shape/person/first_line/last_line descriptors and a `<!-- EXEMPLAR TEXTS: to be inserted verbatim from calibration transcript at card-authoring time -->` marker per entry. The actual passage texts are supplied in T5's card-authoring step from the calibration transcript. No invention is authorized.

