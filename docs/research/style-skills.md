# Anti-slop / writing-style audit — research notes

Sources:
- `woosal1337/blog` — GitHub (355 stars, repo is "My blog website"). Episode kit at `videos/ep01-the-cure-for-ai-slop/`: `README.md`, `ste-writing-skill.md`, `ste-lint.py`, `before-after-samples.md`, `experiment-results.md`, `experiment-results-openai.md`, `run-openai.py`. https://github.com/woosal1337/blog
- `CatKinKitKat/ste100` — fork of the above (0 stars), "ASD-STE100 Issue 9 + ste-lint.py checker. Forked from woosal1337/blog ep01 (the cure for AI slop)". Useful pointer, not canonical. https://github.com/CatKinKitKat/ste100
- `hardikpandya/stop-slop` — GitHub (15,144 stars, MIT). `SKILL.md`, `references/phrases.md`, `references/structures.md`, `references/examples.md`, README, CHANGELOG. https://github.com/hardikpandya/stop-slop
- `blader/humanizer` — GitHub (33,410 stars, MIT, v2.9.1). `SKILL.md`, `README.md`, `AGENTS.md`, `.claude-plugin/`. https://github.com/blader/humanizer
- `op7418/Humanizer-zh` — GitHub (14,552 stars). Chinese localization of blader/humanizer; its README attributes the original to `blader/humanizer` and its utility sections to `hardikpandya/stop-slop`. Confirms canonical lineage. https://github.com/op7418/Humanizer-zh
- Wikipedia: "Signs of AI writing" (WikiProject AI Cleanup) — the upstream taxonomy humanizer is built on. https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing
- GitHub repo search queries: `q=cure-for-ai-slop`, `q=stop-slop`, `q=humanizer+claude+skill`, `q=woosal1337+blog`, `q=Humanizer+claude+code+skill+humanize`.

Naming note: "the cure for AI slop" is a **YouTube episode** (frontmatter in `before-after-samples.md`: `project: youtube`, `status: draft`, date 2026-07-21) with a downloadable "kit" — the skill, linter, and experiment data live in the repo. It is an essay/episode whose prescriptive payload is the STE writing skill. It was NOT found as an installable skill; it is a spec.

## ep01-the-cure-for-ai-slop

**What it is.** A YouTube-episode companion kit (written essay + code) in `woosal1337/blog`, path `videos/ep01-the-cure-for-ai-slop/`. The thesis: **the cure for AI slop is ASD-STE100, a 1986 aviation standard (Simplified Technical English, Issue 9)**. The episode ships three things: (1) `ste-writing-skill.md` — a distilled agent skill in two modes; (2) `ste-lint.py` — a deterministic anti-slop linter scoring violations per 100 words; (3) a first-party cross-model experiment with full before/after samples. The fork `CatKinKitKat/ste100` repackages the same files (plus an `AMA-OpenCode-SkillTree` port reference) — attribution retained, not a new source.

**Prescriptive content.** The skill is a controlled-technical-English writing system, not a "sound natural" style:
- **Words:** one name per thing (never two names for the same item); short common words — start (not begin/commence/initiate), use (not utilize/leverage), help (not facilitate), before (not prior to), about (not regarding/concerning), get (not obtain), show (not demonstrate), also (not additionally/furthermore/moreover); one meaning per word; **no marketing adjectives** (seamless, robust, powerful, cutting-edge, effortless, world-class, next-generation, revolutionary); American spelling.
- **Verbs:** active voice ("the parser reads the file"); verb for an action ("analyze the log", not "perform an analysis"); no stacked auxiliaries ("it is important to note that this may help to improve" → "this improves X"); no `-ing` main verb where a simple tense works.
- **Sentences:** one instruction per sentence; caps of 20 words (instruction) / 25 (descriptive); **no contractions; use articles a/an/the**.
- **Punctuation:** no semicolons. (Self-note in the skill: STE does NOT ban the em dash — "add 'no em dash' yourself if you want it gone.")
- **Structure:** one topic per paragraph, max six sentences; steps as numbered vertical lists, one action per item, imperative form; put a condition before its command.
- **Output rule:** "Write only the requested text. No preamble, no summary, no closing remarks."
- **Modes:** strict (procedures, runbooks, safety text, error messages — every rule + both length caps) vs STE-flavored (general prose: READMEs, PR descriptions, docs — keep sentence/paragraph/active-voice discipline, relax the ~900-word dictionary lockdown so text reads naturally).
- **Self-lint** before returning: split >20-word sentences; replace semicolons with periods; expand contractions; make passive active; kill `-ing` main verbs/nominalizations/phrasal verbs; pick one name per thing.
- Explicit boundary: "Not for marketing copy, essays, or anything that needs a voice — STE strips voice on purpose." And the honest caveat: "This skill fixes the FORM of slop. It cannot make a hollow paragraph true."

**Generation-time or post-hoc?** **Generation-time.** The skill is a write-time system prompt ("Write prose in ASD-STE100… Write only the requested text"). `ste-lint.py` is a **post-hoc detector** (scores an existing draft; violations/100 words; "the score delta between two texts is the signal") — it does **not** rewrite text, so it is a diagnostic, not a post-hoc editor. Neither violates TGO's no-post-hoc-editing stance. The linter's mechanical rule subset: banned marketing words, banned pomposities (begin/utilize/leverage/facilitate/ensure/furthermore/moreover/myriad), phrasal verbs (spin up, dive into, circle back), modal hedges ("it is important to note"), sentences >20 words, semicolons, contractions, passive voice.

**Size / token cost.** `ste-writing-skill.md` ≈ 3.5 KB ≈ ~500 words ≈ **~650 tokens** — the cheapest of the three. Linter is ~4.5 KB Python (optional, runs outside the model). No always-on cost is claimed.

**Always-on mechanism.** None shipped. Pure prompt skill, model-invocable via its description ("Use when asked to make writing not sound like AI, make docs clear or plain…"). No hooks, no AGENTS.md injection, no plugin. Always-on would be a manual paste (like the `AMA-OpenCode-SkillTree` port does — it drops the skill into an OpenCode skill tree).

**Compatibility with concision.** Surprisingly high, because STE is a *constraint* style, not a *natural-voice* style:
- **STE + caveman:** both want short sentences, no filler, active voice, no hedging. Align on the compression axis. **Conflicts:** caveman drops articles + allows fragments + allows contractions-implied telegraphic prose; STE *mandates* articles, *bans* contractions, and caps at 20–25 words (so caveman's ultra fragments violate STE's "one instruction per sentence"). Also caveman's "no causal arrows →" vs STE's rule 1-6 has no arrow rule — minor. Treat as: STE ≈ "caveman, but with grammar kept intact" — they are two settings on the same compression dial, not two orthogonal layers.
- **STE + i-have-adhd:** designed-pairing energy. STE's numbered vertical lists, one action per item, imperative, condition-before-command, and "no preamble/closers" are i-have-adhd's rules 1, 2, 10 restated in aviation-register. Strong co-alignment.
- **STE + stop-slop/humanizer:** STE is *not* the same philosophy — it strips voice on purpose, while those two exist to restore natural human voice. They target different failure modes (STE fixes doc-form slop; humanizer fixes voice slop).

**Effectiveness claims / evidence.** The strongest evidence in this whole audit — a real controlled experiment, first-party: 6 engineer-writing tasks (README, PR description, API docs, error message, getting-started, deprecation) × 4 conditions (baseline / banned-words list / Orwell's 6 rules / STE skill) on **both** Claude sonnet and gpt-5.5, scored by the heuristic linter (violations/100 words):

| Condition | Claude sonnet | gpt-5.5 |
|---|---|---|
| baseline | 4.36 | 3.54 |
| banned-words list | 4.21 (−3%) | 2.14 (−40%) |
| Orwell's 6 rules | 2.48 (−43%) | 1.69 (−52%) |
| STE skill | 1.12 (−74%) | 1.76 (−50%) |

Honest caveats they publish themselves: n=6, heuristic linter, per-100-words noisy on short outputs, STE slightly *worse* than baseline on 1 of 6 tasks on gpt-5.5 (API docs, linter artifact). Two robust cross-model claims: (1) a writing *system* beats a vibe — ban-lists are the least reliable fix (3% on Claude); (2) models slop differently — Claude's slop is flashy (em dashes, "seamless/robust", run-ons); gpt-5.5's slop is subtler (long sentences, passive voice, empty closers).

## stop-slop

**What it is.** A clean SKILL.md + references pack ("A skill for removing AI tells from prose", author Hardik Pandya, MIT). Structure: `SKILL.md` (core rules) + `references/phrases.md` (banned phrases), `references/structures.md` (structural clichés), `references/examples.md` (before/after). Aimed at essays/prose, not code chat. 15,144 stars.

**Prescriptive content.** 8 core rules, then quick-checks and a scoring rubric:
1. **Cut filler phrases** — throat-clearing openers ("Here's the thing:", "Here's what X", "The uncomfortable truth is", "It turns out", "Let me be clear", "Can we talk about"), emphasis crutches ("Full stop.", "Let that sink in.", "Make no mistake"), **all adverbs** (really, just, literally, genuinely, deeply, truly, fundamentally, crucially…), filler ("At its core", "In today's X", "It's worth noting", "When it comes to").
2. **Break formulaic structures** — binary contrasts ("not X, it's Y" / "It's not this. It's that."), negative listings ("Not a X… Not a Y… A Z."), dramatic fragmentation ("[Noun]. That's it. That's the thing."), rhetorical setups ("What if…?", "Think about it:", "And that's okay."), false agency (inanimate subjects doing human verbs: "a complaint becomes a fix", "the decision emerges", "the data tells us"), narrator-from-a-distance ("Nobody designed this.").
3. **Active voice** — every sentence needs a human subject doing something; no passive; no inanimate objects performing human actions.
4. **Be specific** — no vague declaratives ("The implications are significant"), no lazy extremes (every/always/never/everyone).
5. **Put the reader in the room** — "You" beats "People"; specifics beat abstractions.
6. **Vary rhythm** — mix sentence lengths; two items beat three; vary paragraph endings; **no em dashes**.
7. **Trust readers** — state facts directly; skip softening/justification/hand-holding.
8. **Cut quotables** — if it sounds like a pull-quote, rewrite it.
Plus a **Quick Checks** checklist (any adverb? passive? Wh- sentence starter? "here's what" throat-clearing? "not X, it's Y" contrast? three same-length sentences in a row? punchy one-liner paragraph ending? any em dash? meta-joiners?) and a **Scoring** rubric — rate 1–10 on Directness / Rhythm / Trust / Authenticity / Density, "below 35/50: revise."

**Generation-time or post-hoc?** **Generation-time by default**, with an in-model self-review pass. The "Core Rules" are write-time prescriptions (system-prompt style: "Cut filler", "Use active voice", "Vary rhythm"). There is no rewriting tool, no wrapper, no code. The scoring rubric is a self-check the *model* runs on its own output (a review step inside the same generation, not a separate editor). Description covers "drafting, editing, or reviewing" — so it can also be invoked on finished text, but that's just the model re-applying the rules, not a tool. **Does not violate TGO's no-post-hoc-editing stance** — nothing post-hoc to adopt or reject; it's a constraint set.

**Size / token cost.** `SKILL.md` ≈ 2.6 KB ≈ ~420 words ≈ **~550 tokens** core ruleset. References load on demand (phrases.md ~2.9 KB, structures.md ~5.3 KB, examples.md ~1.7 KB). Middle of the pack.

**Always-on mechanism.** None shipped — no hooks, no plugin, no AGENTS.md. README offers four delivery paths: Claude Code skill folder, Claude Project knowledge, "copy core rules into custom instructions," or "include SKILL.md in your system prompt" for API calls. Always-on requires a manual paste. Enforced purely by instruction presence.

**Compatibility with concision.** The highest-overlap resource with the concision stack — and the one genuine conflict:
- **Agrees with caveman/i-have-adhd:** banned openers/closers/hedges ("Here's the thing", "Great question", hedging), no adverbs, active voice, no throat-clearing, no meta-joiners, density rule — all four (caveman, i-have-adhd, stop-slop) cut the same garbage. Overlap is largely redundant, not contradictory.
- **Genuine conflict — cadence:** stop-slop *requires* varied rhythm ("three consecutive sentences match length" is a violation; vary paragraph endings). Caveman tends to produce uniform telegraphic fragments — which is exactly what stop-slop's "dramatic fragmentation" / "staccato" rules flag. caveman = uniform short; stop-slop = deliberately uneven. If both are live, one must give: either caveman keeps fragments short (stop-slop's rhythm rule fails) or stop-slop forces varied length (caveman's compression drops). This is the concrete terse-vs-natural fault line.
- **Neutral on structure:** stop-slop says nothing against numbered steps, so i-have-adhd is untouched.

**Effectiveness claims / evidence.** No benchmarks. Popularity is the evidence (15,144 stars, 1,080 forks, 43 open issues); README claims the skill "teaches Claude (or any LLM) to catch and remove them." CHANGELOG shows active maintenance (Jan 2026 additions of performative-emphasis and telling-not-showing phrases). No measured numbers anywhere.

## humanizer

**What it is.** The canonical, highest-star (33,410) anti-slop skill: "Agent skill that removes signs of AI-generated writing from text." A single portable SKILL.md (v2.9.1) + README + optional Claude Code plugin. Based on Wikipedia's "Signs of AI writing" guide (WikiProject AI Cleanup, "observations of thousands of instances of AI-generated text"). 33 numbered patterns with before/after examples, organized: Content Patterns (1–6), Language & Grammar (7–13), Style (14–19, 26–33), Communication (20–22), Filler & Hedging (23–25).

**Prescriptive content.** The full 33-pattern taxonomy (condensed):
- *Content:* significance inflation ("marking a pivotal moment", "stands as a testament"), notability name-dropping (list-of-media without context), superficial `-ing` analyses ("symbolizing… reflecting… showcasing"), promotional language ("nestled", "vibrant", "breathtaking"), vague attributions ("Experts believe", "Industry reports"), formulaic "Challenges and Future Prospects" sections.
- *Language:* AI vocabulary words (Actually, additionally, crucial, delve, enhance, fostering, leverage, **landscape** (abstract), **showcase**, tapestry, testament, underscore, vibrant), copula avoidance ("serves as/boasts" → "is/has"), negative parallelisms + tailing negations ("not just X, it's Y"; "…, no guessing"), **rule of three**, elegant variation / synonym cycling (repetition-penalty artifact), false ranges ("from X to Y" where no scale exists), passive voice + subjectless fragments.
- *Style:* **em/en dashes: hard cut** ("one of the most reliable AI tells… treat as a hard constraint, not 'use sparingly'"; replace with period/comma/colon/parens), boldface overuse, inline-header vertical lists ("**Performance:** …"), title-case headings, emojis, curly quotes, hyphenated word-pair overuse (drop in predicate position: "the report is high quality"), persuasive authority tropes ("at its core", "the real question is", "the deeper issue"), signposting/announcements ("Let's dive in", "Here's what you need to know"), fragmented headers (heading followed by a sentence that restates it), **diff-anchored writing** (docs written as change narration — very relevant to agent-generated docs), manufactured punchlines / staccato drama (a run of short declaratives), aphorism formulas ("X is the language of Y"), conversational rhetorical openers ("Honestly?", "Here's the thing").
- *Communication/filler:* chatbot artifacts ("I hope this helps!", "Would you like…?", "Should I continue?"), knowledge-cutoff disclaimers + **speculative gap-filling** ("maintains a low profile", "likely grew up in…"), sycophancy ("Great question! You're absolutely right!"), filler phrases ("In order to" → "To"), excessive hedging, generic positive conclusions.
- **The anti-slop meta-rules (the actually-steal-worthy parts):**
  1. **PERSONALITY AND SOUL** — removing tells is only half; sterile writing is just as obvious. Gate this: apply only where voice is wanted (blog/essay/opinion); for encyclopedic/technical/legal text "neutral and plain IS the correct human voice — don't inject opinions or first person there."
  2. **"Preserve the information, not the shape"** — every claim survives; depth can be uneven; merge/split paragraphs freely. "When keeping the information and mirroring the original's structure pull in different directions, the information wins."
  3. **Never invent facts** — no fact/name/number/date/quote/citation not in the source (v2.9.0 addition). Specificity must come from source/user; ask, or write the plain version without it.
  4. **Voice Calibration** — if the user supplies a writing sample, match its sentence lengths/vocab/quirks; "A sample outranks this skill's style rules, including the em dash rule."
  5. **False-positive guard ("What NOT to flag")** — perfect grammar, mixed casual/formal registers, blandness alone, formal vocab, letter salutations, one "however", curly quotes alone, em dashes alone, one short emphatic sentence, unsourced claims, clean formatting are NOT tells. "When in doubt, look for **clusters** of tells, not isolated ones."
  6. **Signs of human writing to preserve** — specific/hard-to-fabricate detail, mixed feelings, era-bound references, first-person editorial choices, sentence-length variety, genuine asides/self-corrections, pre-2022 text. "Over-editing will destroy what makes the piece sound human."
  7. **Draft → audit → final loop** — write a draft, ask "What makes the below so obviously AI generated?" and "Does the rewrite state any fact… not in the source?", revise. Audit catches lingering tells.

**Generation-time or post-hoc?** **Post-hoc editor. Hard flag.** It is an *editing* skill: "When given text to humanize… identify patterns… rewrite." Three invocation modes — pasted text (deliver draft + audit bullets + final), **file mode (rewrite the file in place)**, embedded mode (rewrite inside another task). This is precisely the post-hoc rewrites-finished-output pattern TGO has already decided against. **Do not adopt the mechanism.** The reusable value is the *pattern taxonomy* (33 tells + no-fabrication rule + false-positive guard), which TGO can invert into generation-time constraints ("don't write em dashes", "don't use AI vocabulary") — but as shipped it is a second-pass editor. The embedded-mode framing is notable though: it can run *inside* one step of a larger task rather than as a separate pass, which blurs the line — but it's still post-hoc on that step's text.

**Size / token cost.** **Expensive.** SKILL.md ≈ 29.6 KB ≈ ~4,800 words ≈ **~6,200 tokens** injected per invocation (plus README 13.9 KB). Largest by ~10×. The version history shows deliberate trims ("removed the duplicated long-form example from the runtime prompt") yet it remains the heavyweight. A ~500-token distilled subset is trivially achievable.

**Always-on mechanism.** None shipped. Skill is model-invocable or slash-command (`/humanizer:humanizer` via plugin); installable globally via `npx skills add blader/humanizer --global`. The repo's `AGENTS.md` is contributor maintenance guidance (keep SKILL.md/README in sync, version bumps), **not** an instruction-injection file. No hooks. Always-on would be manual.

**Compatibility with concision.** Two separate stories:
- **On the banned-tells (the "scrub" half):** broadly compatible — no em dashes, no AI vocab, no filler/hedging, no passive, no chatbot closers, no diff-anchored narration all agree with caveman/i-have-adhd's cutting instincts. Caveman already kills filler and hedging; humanizer adds *which specific words* are tells.
- **On the voice half (PERSONALITY AND SOUL + cadence):** **direct conflict with caveman.** Humanizer wants varied rhythm, uneven cadence, asides, mixed feelings, first-person stance, "sentences [that] breathe"; it flags staccato runs and clipped prose ("without becoming clipped or slogan-like" — from its own changelog). Caveman produces uniform telegraphic fragments and forbids self-reference/persona ("never announce the style", "no 'me caveman think'"). Humanizer's hostility to "inline-header vertical lists" and "fragmented headers" also brushes against i-have-adhd's structure — though i-have-adhd's numbered action-steps are closer to STE's sanctioned structure and would mostly survive. A humanizer rewrite *by design* re-shapes structure ("merge or split paragraphs freely"), so it can undo i-have-adhd's shaping.

**Effectiveness claims / evidence.** No benchmarks. Evidence is scale + provenance: 33,410 stars, maintained (v2.9.1), built on the Wikipedia guide (thousands of observed instances), forked/translated widely (Humanizer-zh alone 14,552 stars; plus academic-, Czech-, Russian-, Portuguese variants). The README's anti-slop examples are convincing but illustrative. No measured slop-reduction numbers (contrast ep01's experiment).

## The axis question: terse vs. natural

**The audit breaks the assumed one-dimensional axis.** "Anti-slop" is not a single target — the three resources land at *different points* and even *opposite ends* of a second axis:

| Resource | What "not slop" means | Register |
|---|---|---|
| **STE (ep01)** | Constrained, controlled, plain *technical* English. Vocabulary lockdown, word caps, no contractions. | **Control** — explicitly "strips voice on purpose" |
| **stop-slop** | Direct, specific, active-voice prose with *varied* rhythm. | Middle — cuts filler hard but wants uneven cadence |
| **humanizer** | Natural *human voice*: opinions, asides, mixed feelings, uneven rhythm. | **Latitude** — explicitly anti-"clipped" |

So "terse" (caveman/STE) and "natural" (humanizer) are **two poles of a register axis (control↔voice latitude)**, not one slider, and STE is on the *terse* side — it is caveman with its grammar intact. The genuine terse-vs-natural conflicts that actually surface when constraints are combined:

1. **Cadence is the real fault line.** Concision wants uniform shortness (fragments, telegraphic). stop-slop and humanizer both flag *uniform* short lines (stop-slop: "three consecutive sentences match length" is a violation; humanizer: staccato runs "start to sound engineered"). They want deliberate variety — which costs tokens.
2. **Grammar completeness.** caveman drops articles/allows fragments; STE *mandates* articles and *bans* contractions; humanizer wants natural (inconsistent) grammar. Direct 3-way disagreement on this micro-rule.
3. **Voice/persona.** caveman forbids self-reference and persona; humanizer's PERSONALITY AND SOUL *wants* first-person stance, asides, mixed feelings. Can't both hold in one output.
4. **Structure.** i-have-adhd's numbered steps survive STE (identical form) and are ignored by stop-slop, but humanizer's rewrite loop can freely re-shape them.

**But the overlap is large, and it's the overlap that both sides agree on:** banned filler/hedging/openers/closers ("Here's the thing", "Great question", "Hope this helps"), no adverbs, no passive-with-hidden-actor, no AI-vocabulary words, no marketing adjectives, no rule-of-three padding, no synonym-cycling, no "not X, it's Y" posturing, no mechanical announcements — every resource bans *the same garbage*. Em dashes are banned by stop-slop and humanizer (the two natural-voice ones); STE deliberately does not ban them. None of the concision skills conflict with any of that shared ban-list.

**Recommendation for TGO's style axis.** Model "style" as **two orthogonal dials**, not one terse↔natural slider:

- **Dial A — density/compression (how much to cut).** Already modeled: caveman (prose grammar) + i-have-adhd (structure) + ponytail (code). Unchanged.
- **Dial B — register/voice (control ↔ latitude).** New. STE-flavored sits near "control/terse"; stop-slop is mid; humanizer's voice rules sit at "latitude/natural."

The coexistence answer: **yes, but only the *scrub half* of anti-slop is a simultaneous generation-time constraint; the *voice half* must be softened and gated.** Concretely:

1. **Make the banned-tells list a generation-time constraint that is always composable with the concision stack.** The shared ban (filler, hedges, AI-vocab, adverbs, passive, em-dash-spam, rule-of-three, synonym cycling, throat-clearing, mechanical announcements) *agrees* with caveman/i-have-adhd on nearly every item and adds specific tell-vocabulary the concision skills lack. This is the highest-leverage, lowest-conflict lift — humanizer's 33-pattern taxonomy is directly invertible into "don't-write" rules, and stop-slop's core rules are already phrased that way.
2. **Gate the voice half per output-class.** "Vary rhythm, use personality, let sentences breathe" conflicts with caveman at the cadence level — so it must NOT be a global generation-time constraint. Instead: apply it only where voice is wanted (docs, PR copy, blog/essay text — humanizer's own PERSONALITY section is explicitly gated this way, and caveman's Auto-Clarity already exempts persisted writing from compression). For chat/technical output, keep the terse default; for prose-forward output, swap the register dial toward stop-slop/humanizer cadence rules and *soften* caveman (drop the fragment/ultra level, keep its filler-kill and guardrails). This is exactly what the three source skills themselves preach: STE "not for essays that need a voice", humanizer "neutral and plain IS the correct voice for technical text", caveman auto-disables for ambiguity-prone prose.
3. **Never adopt humanizer's mechanism (post-hoc rewrite pass).** Its value is the taxonomy + no-fabrication rule + false-positive guard, not the second-pass editor TGO already rejected. The "embedded mode" shows the acceptable compromise: the scrub pass can run as one *step inside* a generation (draft → self-audit → final) rather than as a wrapper on finished text — equivalent to stop-slop's in-model scoring and caveman's self-lint, which TGO can adopt as generation-time internal loops.
4. **Bound the per-output-class conflict with a precedence rule.** When both dials are live on the same output (the one genuinely conflicting case — cadence), pick a winner per unit of output: structure wins for steps (i-have-adhd/STE form), compression wins for connective prose, cadence variety wins for voice-forward prose. No resource in the audit specifies this precedence, so TGO should encode it explicitly.

Net: terse and natural **can** coexist as simultaneous generation-time constraints **provided** the anti-slop contribution is the *scrub list* (full-compatible) and the voice/cadence contribution is *class-gated* (exclusive with caveman compression on the same output). The one axis to "soften" is cadence: you cannot hold "uniformly compressed" and "varied rhythm" at once — pick per output class.

## Steal-worthy bits

1. **A writing *system* beats a banned-word list — proven, cross-model (ep01).** STE cut slop −74% (Claude) / −50% (gpt-5.5) vs a ban-list's −3% (Claude) / −40% (gpt-5.5). Confirms TGO's "effectiveness over theming": give the model a coherent register to write in, not a list of words to avoid. The reverse lesson is built in: ban-lists still help on some models (gpt-5.5 −40%), so a tell-list is a cheap floor, not the main lever.
2. **The 33-pattern tell taxonomy + "look for clusters, not isolated tells" (humanizer).** The single most complete enumeration of what makes prose read as AI — invertible into generation-time don'ts. The false-positive guard (don't gut a real human's prose for one em dash) is the discipline that keeps an anti-slop layer from becoming a flattening layer; its "clusters" rule is the decision heuristic.
3. **No-fabrication rule (humanizer) + meaning-preservation guardrails (caveman).** Humanizer's "never add a fact/name/date/citation not in the source" is the natural-voice mirror of caveman's "never drop negations/numbers." Together they bound both directions of style change — a style modifier must neither invent nor destroy information. Steal both as hard rules, not vibes.
4. **Class-gated voice (humanizer's PERSONALITY + STE's boundary).** Both resources gate their own style by output class: STE refuses essays/voice, humanizer's personality applies "only when content and voice call for it," and both say plain IS correct for technical text. This is the exact mechanism TGO needs to resolve terse-vs-natural without a global compromise: route the register dial per output-class instead of tuning one global knob.
5. **Diff-anchored writing as a tell (humanizer §30) + in-model self-audit (all three).** "Docs written as if narrating a change" is a uniquely agent-relevant slop source (every agent tool-call narration ends up in docs), and TGO's always-on layer should suppress it. The draft → self-audit → final loop (humanizer) and self-lint steps (STE) and scoring rubric (stop-slop) are all *generation-time internal loops* — the legitimate replacement for the post-hoc editor TGO rejected.

---

*Note on evidence hierarchy: only ep01 publishes measured numbers (first-party, cross-model, n=6, honest caveats). stop-slop and humanizer rely on star-scale adoption. Treat their rulesets as high-quality opinion, ep01's as data.*
