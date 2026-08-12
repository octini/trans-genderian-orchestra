# Concision skills audit — research notes

Sources:
- `ayghri/i-have-adhd` — GitHub (16,390 stars). README, `skills/i-have-adhd/SKILL.md`, `hooks/always-on.sh`, `hooks/hooks.json`, `INSTALL.md`. https://github.com/ayghri/i-have-adhd
- `JuliusBrussee/caveman` — GitHub (95,585 stars). `skills/caveman/SKILL.md`, README, `docs/HONEST-NUMBERS.md`, `commands/caveman-init.md`. https://github.com/JuliusBrussee/caveman
- `kuba-guzik/caveman-micro` — GitHub (153 stars). `caveman-micro.txt` + README (85-token micro prompt vs ~552-token original). https://github.com/kuba-guzik/caveman-micro
- `DietrichGebert/ponytail` — GitHub (95,200 stars, canonical). `skills/ponytail/SKILL.md`, `AGENTS.md`, `hooks/claude-codex-hooks.json`, `hooks/ponytail-activate.js`, `.opencode/plugins/ponytail.mjs`, `opencode.json`. https://github.com/DietrichGebert/ponytail
- `TheYan3/ponytail-skills` — GitHub (fork-family). `skills/ponytail/SKILL.md`, `skills/ponytail-review/SKILL.md`, README. https://github.com/TheYan3/ponytail-skills
- `vagkaratzas/token-saviour` — GitHub. `skills/token-saviour/SKILL.md`, `AGENTS.md`, `references/tool_links.md` (routing/benchmark cross-references; names DietrichGebert/ponytail as canonical). https://github.com/vagkaratzas/token-saviour
- GitHub repo search API queries: `q=ADHD+claude+skill`, `q=caveman+claude+skill`, `q=ponytail+claude+skill`, `q="i-have-adhd"`, `q="ponytail"+claude+skill+language:markdown` (0 results).
- JetBrains SkillsBench study cited in caveman README: https://blog.jetbrains.com/ai/2026/07/speak-to-ai-agents-like-cavemen-tosave-tokens/

Note on names: the skill literally named "i-have-adhd" was **found** (repo `ayghri/i-have-adhd`, 16k stars) — it does NOT make the model "behave as if it has ADHD" (no stream-of-consciousness, no in-character persona). It formats output *for a reader with ADHD*. The "caveman" style exists in many forks; `JuliusBrussee/caveman` is the canonical origin. "Ponytail" was verified to be a **YAGNI / minimal-code style** (not a prose-terseness style) — the `DietrichGebert/ponytail` repo is canonical and even ships an OpenCode plugin.

## What each skill does

### i-have-adhd

**What it is.** An output-shaping skill: "Shape output for a reader with ADHD" — action-first, numbered steps, no preamble. Self-described as *"stops your coding agent from burying the answer."* Not a persona prompt (the model does not roleplay having ADHD); it is a readability/productivity format layer. Credited as "loosely based on *The Adult ADHD Tool Kit* (Ramsay & Rostain)." Frontmatter sets `disable-model-invocation: true` — the model cannot trigger it; only the `/i-have-adhd` command or the always-on hook turns it on.

**Prompt behavior.** 10 numbered rules, each with bad/good examples:
1. Lead with the next action (first line is the runnable thing, not context).
2. Number multi-step tasks; one bounded action per step.
3. End with one concrete next action (something doable in under two minutes).
4. Suppress tangents — finish first issue, offer second issue separately.
5. Restate state every turn ("Step 3 of 5 done… next…").
6. Specific time estimates (minutes, never "a bit").
7. Make completed work visible (show what now works).
8. Matter-of-fact errors (never "Uh oh").
9. Cap lists at 5 items; split into "do now" vs "later".
10. No preamble, no recap, no closers ("Great question", "Hope this helps" forbidden).

Plus an explicit "When to break the rules" list (explanations, destructive-action safety, debug spirals, real ambiguity, rule-vs-task conflict, rule-vs-harness conflict — the harness system prompt outranks the skill) and a "Pre-send check" (delete announcing first sentence, recap last sentence, by-the-way sidebars, hedges, idioms).

**Effect on writing.** Produces terse, scannable, next-action-oriented output. Removes pleasantries and tangents (same territory as caveman's prose trims) but its defining move is *structure* — numbered action lists, restated progress, concrete estimates — not word-level compression.

### caveman

**What it is.** A system-prompt style skill: "talk like a smart caveman" to compress prose output. Canonical repo claims a measured **~65% output-token cut** (range 22–87%, 10-prompt benchmark) while keeping technical substance. It is a word/grammar-level compression layer ("Drop articles, filler, pleasantries, hedging; fragments OK; short synonyms"). Ships six intensity levels: `lite`, `full` (default), `ultra`, and `wenyan-*` (classical-Chinese compression).

**Prompt behavior.** Rules in `SKILL.md`:
- Drop articles (a/an/the), filler (just/really/basically), pleasantries, hedging; fragments allowed; short synonyms (big not extensive, fix not "implement a solution for").
- **Never** drop negations (not/never/no/only/except) or numbers/units — meaning-preservation is a hard guardrail. Never invent abbreviations (cfg/impl/req/res/fn) — tokenizer splits them same as full words, "zero token saved." No causal arrows (→). Code blocks, commands, API names, and error strings stay verbatim.
- No tool-call narration ("no preamble, plan, or progress note before or between calls").
- No self-reference — never announce the style, no "me caveman think."
- Pattern: `[thing] [action] [reason]. [next step].`
- Persistence: "ACTIVE EVERY RESPONSE… Off only: 'stop caveman' / 'normal mode'."
- Auto-Clarity: drop caveman for security warnings, irreversible confirmations, multi-step sequences where fragment order risks misread, or when compression creates technical ambiguity.
- Boundaries: persisted writing (code, comments, commits, docs, issue/PR text, memory files) stays normal prose — caveman applies to chat replies only.

**Effect on writing.** Compresses chat prose substantially while preserving technical terms verbatim. Distinct from i-have-adhd in that it operates at the sentence/word level (grammar), not the structure level. It keeps a strong safety layer (never drop negations, verbatim code/errors).

### ponytail

**What it is.** Verified: a **code-output / build-philosophy skill** — YAGNI minimalism, NOT a prose-terseness style. Canonical repo (`DietrichGebert/ponytail`, 95k stars): "Makes your AI agent think like the laziest senior dev in the room. The best code is the code you never wrote." Do NOT assume it's a prose style; its own SKILL.md says "Ponytail governs what you build, not how you talk (pair with Caveman for terse prose)." Frontmatter scopes it: "Use on ANY coding task… Do NOT use for non-coding requests (general knowledge, prose, translation, summaries, recipes)."

**Prompt behavior.** A "ladder" the agent climbs before writing code, stopping at the first rung that holds:
1. Does this need to exist at all? (YAGNI)
2. Already in this codebase? Reuse it.
3. Stdlib does it? Use it.
4. Native platform feature covers it? Use it.
5. Already-installed dependency solves it? Don't add new ones.
6. Can it be one line? One line.
7. Only then: minimum code that works.

Rules: no unrequested abstractions (interface with one impl, factory for one product, config for a value that never changes), no boilerplate/scaffolding "for later", deletion over addition, fewest files, shortest working diff (but only after understanding the problem), bug fix = root cause (grep callers, fix the shared function once). Mark deliberate simplifications with a `ponytail:` comment naming the ceiling and upgrade path. Output rule: code first, then at most three short lines ("if the explanation is longer than the code, delete the explanation"). Levels `lite|full(default)|ultra`. Hard "never simplify away" list: trust-boundary input validation, error handling that prevents data loss, security, accessibility, anything explicitly requested, and hardware calibration knobs. Non-trivial logic must leave one runnable check (`assert`-based `demo()`/one small `test_*.py`). Sibling skill `ponytail-review`: a review pass that only hunts over-engineering, one line per finding (`L12-38: stdlib: …`), scored as `net: -N lines possible`, and `Lean already. Ship.` when there's nothing to cut.

**Effect on writing.** Changes *what code gets written* (smaller diffs, fewer deps, no speculative abstractions) and how the agent *reports* it (code-first, ≤3-line explanations), but does not change prose register. On prose it is ~0% — it's "the mirror image of caveman" (per token-saviour's benchmark write-up: caveman shrinks prose, ponytail shrinks code; each ~0% outside its lane).

## Compatibility & conflicts

**All three stack cleanly** — they operate on different axes, and their own texts say so:
- **caveman + ponytail:** explicitly designed to pair. Ponytail's canonical SKILL.md: "Ponytail governs what you build, not how you talk (pair with Caveman for terse prose)." Token-saviour (which A/B-benchmarked the stack) confirms: caveman = prose-output layer, ponytail = code-output layer; combined stack measured ~−70% total tokens on codegen tasks; caveman on code or ponytail on prose is ~0% ("each excellent in its lane and ~useless outside it").
- **i-have-adhd + caveman:** both compress chat prose and forbid the same openers/closers/hedges, so they **agree rather than conflict** on the shared rules. The overlap is mostly redundant (both forbid "Great question", "Hope this helps", hedging). i-have-adhd adds structure (numbering, state-restatement, time estimates, list caps) that caveman's word-level compression doesn't conflict with — caveman drops filler, i-have-adhd shapes structure. No contradiction found in their do/don't lists.
- **i-have-adhd + ponytail:** fully orthogonal (one shapes prose/actions, the other shapes code output).
- **i-have-adhd + caveman + ponytail (all three):** no mutual exclusion anywhere. The one thing to watch is *tone collision*: caveman wants fragments and dropped articles; i-have-adhd wants numbered steps and concrete next actions. When both are active, caveman would compress the very numbered steps i-have-adhd wants intact (e.g., "1. Open src/auth.ts" could survive — code stays verbatim — but surrounding prose fragments). Neither skill documents the other; a TGO combined mode would need to pick precedence (adhd's structure wins, caveman compresses the connective prose).

**No genuine conflicts found.** None of the three is mutually exclusive with another. The only friction is redundancy (i-have-adhd's rule 10 ≈ caveman's filler-drop) and the structural-vs-grammatical tension above. Enforcement notes: i-have-adhd ships `disable-model-invocation: true`, so it can only turn on via command or hook — it cannot fight for control. Caveman and ponytail are both model-invocable and command-invocable; all three share the same off-switch pattern ("stop X" / "normal mode"), so two active modes can be turned off with one consistent gesture.

## Token cost

Approximate SKILL.md body size (frontmatter stripped; tokens estimated at ~1.3× word count):

| Skill | Bytes | Words | Est. tokens |
|---|---|---|---|
| caveman (full SKILL.md) | ~5.5 KB | ~784 | **~1,000** |
| i-have-adhd (full SKILL.md) | ~6.4 KB | ~1,128 | **~1,470** |
| ponytail (canonical SKILL.md) | ~5.7 KB | ~956 | **~1,240** |
| ponytail-review | ~1.9 KB | ~275 | ~360 |
| ponytail AGENTS.md (always-on variant) | ~2.6 KB | ~439 | ~570 |
| caveman-micro (6-line minimal) | 343 B | ~50 | **~65** |

Notes from primary sources:
- **caveman's own "Honest Numbers" doc**: "the skill itself adds ~1–1.5k input tokens per turn" (SKILL.md rules injected into context, plus skill-list entries). Input reduction from the skill: 0%. Output reduction: ~65% avg. Session-level totals land ~14–21% on output-heavy workloads **and net-negative on terse ones** — the rule of thumb it gives: "Normal reply longer than ~1.5–2k output tokens → caveman probably saves you money; shorter → it costs you." Some agent hosts report counter-intuitive *increases* (re-injection + cache/context accounting, e.g. one Cursor A/B showed 4.3M tokens with caveman vs 1M without).
- **caveman-micro** claims an 85-token 6-line prompt that "outperformed the original 552-token skill" on Sonnet/Opus benchmarks — evidence the marginal rules add little value for the cost.
- **i-have-adhd** and **ponytail**: no published overhead numbers; both are whole-SKILL.md injections when active, so cost is roughly their body size per turn when on (≈1.2–1.5k tokens), same order as caveman.
- **Always-on cost**: injecting any of these into every request adds ~1.2–1.5k tokens/turn flat. For a chatty coding agent that's a small fraction of a multi-k input bill; for a terse Q&A agent it can exceed the savings. This is the single most important cost finding: **always-on is cheap in absolute terms but only pays for itself when output is verbose**.

## How each achieves "always-on"

### i-have-adhd
Default is **opt-in per session** (`/i-have-adhd` command; model invocation disabled). Always-on is a **SessionStart hook + flag file**: a `hooks/always-on.sh` (pure POSIX sh) reads `$CLAUDE_CONFIG_DIR/.i-have-adhd-always` (`touch ~/.claude/.i-have-adhd-always` to enable); if the flag exists it strips the SKILL.md frontmatter and injects the full ruleset into session start, prefixed "ADHD MODE ACTIVE (always-on)." Hook never blocks session start (any failure exits 0). **Disabling**: per-session via "stop adhd mode"/"normal mode"; permanently via `rm ~/.claude/.i-have-adhd-always`. On other hosts the always-on route is an `AGENTS.md`/rules-file paste (OpenCode: `~/.config/opencode/AGENTS.md`). Enforced by the instruction being present in context every turn — no runtime gate beyond that.

### caveman
Always-on is achieved several ways, all "instruction injection":
- Model-invoked: the SKILL.md description auto-triggers on brevity requests ("be brief", "less tokens", "use caveman").
- Command: `/caveman [lite|full|ultra|wenyan]`; level persists for the session (a command writes the level, or a session-start hook writes a flag file so it's on "from message one without /caveman" — per README point 3 of "Caveman 2").
- Per-repo init: `/caveman-init` drops rule files into the repo for Cursor/Windsurf/Cline/Copilot/`AGENTS.md` so every IDE agent in that repo is terse.
- `caveman-shrink`: MCP middleware that wraps any MCP server and compresses its tool descriptions (input-side compression, not output style).
Enforcement: purely prompt-based ("ACTIVE EVERY RESPONSE… still active if unsure") plus the flag-file hook. **Disabling**: "stop caveman" / "normal mode" per session; remove the rule file / flag to disable always-on.

### ponytail
Three always-on mechanisms, including a native OpenCode plugin:
- **OpenCode plugin** (`.opencode/plugins/ponytail.mjs`): hooks `experimental.chat.system.transform` and **appends the ruleset to the system prompt on every turn**, filtered to the active intensity level (`lite|full|ultra|off`), reading the persisted mode from a state file (`~/.config/opencode/.ponytail-active`). The `/ponytail <level>` command writes that file; `command.execute.before` persists the switch, and the next turn's injection follows it. This is the closest thing to TGO's "always-on writing-style modifier" in the wild. Installed via `{ "plugin": ["@dietrichgebert/ponytail"] }` in `opencode.json`.
- **Claude Code hooks**: `SessionStart` (ponytail-activate.js emits the level-filtered ruleset into session context, writes the flag file, nudges statusline), `SubagentStart` (propagates the mode to subagents), `UserPromptSubmit` (ponytail-mode-tracker.js applies `/ponytail` switches).
- **AGENTS.md variant**: a ~2.6 KB always-on snippet ("the lightweight always-on version"; the skills are "the enforced version with levels and the review pass"). TheYan3 fork additionally offers a `CLAUDE.md` drop-in.
Enforcement: injected instruction each turn (+ flag-file persistence + subagent propagation). **Disabling**: "stop ponytail" / "normal mode"; mode `off` makes the transform silent; remove plugin/AGENTS.md to disable permanently. Per-agent/per-task control exists via levels and the `off` mode.

## Steal-worthy bits

For TGO's always-on layer that changes **HOW** agents write (a writing-style modifier injected every request):

1. **Level-filtered system-prompt injection (ponytail's opencode plugin).** `experimental.chat.system.transform` appending the ruleset every turn, filtered to a persisted intensity level, with a `off` mode. This is the exact always-on delivery mechanism TGO should copy. Borrow: mode persistence (`off`/`lite`/`full`/`ultra`), per-turn injection, subagent propagation (`SubagentStart`), and a shared "instruction builder" so one source of truth feeds every host.
2. **Meaning-preservation guardrails (caveman).** Never drop negations; numbers/units exact; code blocks, commands, API names, error strings verbatim; never invent abbreviations (tokenizer-split = zero savings + decode cost). Any always-on style modifier must encode "compress style, never substance" as hard rules, not vibes.
3. **Auto-disable for safety (caveman's Auto-Clarity + i-have-adhd's rule-breakers).** Both explicitly drop the style for security warnings, irreversible confirmations, and ambiguity-prone sequences, then resume. An always-on layer needs these escape valves or it will mangle destructive-operation warnings.
4. **Persona-coded rationale instead of bare rules (caveman/ponytail).** "Respond terse like smart caveman" / "You are a lazy senior developer… paged at 3am" — a one-line persona anchor makes the style stickier across turns than a rule list ("ACTIVE EVERY RESPONSE. No drift back.").
5. **Structure + grammar are separate axes (the three-skill thesis).** i-have-adhd (structure: numbered steps, state restatement, next action) + caveman (grammar: drop filler) + ponytail (code output) are orthogonal and stack to ~−70%. TGO should model its concision layer as **three independently-tunable sliders** (prose grammar, output structure, code minimalism) rather than one on/off style.
6. **Explicit don't-cut list (ponytail).** Trust-boundary validation, data-loss error handling, security, accessibility, anything explicitly requested are never simplified away. Plus its "lazy code without its check is unfinished" (leave one runnable check) — a quality floor that keeps compression from becoming sloppiness.
7. **Honest cost accounting (caveman's Honest Numbers doc).** Always-on costs ~1–1.5k tokens/turn flat and is net-negative on terse workloads. TGO should ship its always-on layer with a measurable off-switch and per-agent control, and borrow caveman's own advice: the real win is readability/speed, not necessarily tokens.
8. **Reject: persona roleplay as the whole mechanism.** i-have-adhd is *not* "the model has ADHD" — it formats for a reader with ADHD, and its `disable-model-invocation: true` means the user (not the model) decides when it applies. TGO should treat "concision style" as a user-governed formatting layer, not a model personality. Also reject bare bulk: caveman-micro's 85-token version matched/exceeded the 552-token original — TGO's injected ruleset should be aggressively pruned, since the same payload ships on *every* request.
9. **Borrow the one-consistent-off-switch convention.** All three share the same idiom ("stop caveman" / "stop ponytail" / "stop adhd mode" → "normal mode"). TGO should standardize a single universal off-phrase and level-switch syntax across its always-on layer.
