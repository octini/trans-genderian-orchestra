# TGO skill-candidate tiers — G1 working doc

Full candidate set drawn from `docs/research/skill-sources-inventory.md` (Matt Pocock installed skills, superpowers, oh-my-opencode-slim, gsd-core, bmad-method, ruflo, oh-my-pi, langgraph standard), filtered through the six curation criteria (adopt by function / nothing load-bearing / skills-over-MCPs / token discipline / borrow-over-author / per-seat grants) and the fact that TGO features already own a lot of function.

Tiering = how strong I think the candidate is. **Seat** = natural grant target. **Overlap** = what it collides with (another skill, a native tool, or a TGO feature). Ruling out happens next.

---

## Tier 1 — definite inclusions (core method, additive, no real overlap)

| # | Skill (source) | Seat | Why | Overlap |
|---|---|---|---|---|
| 1 | `to-tickets` (Matt) | Bernstein | DAG+wave decomposition playbook; his living-spec issues ARE tickets | none (method, not a TGO feature) |
| 2 | `wayfinder` (Matt) | Bernstein | Map-of-decision-tickets for foggy/huge work — proven this session | grilling (shares vocabulary), but distinct: map vs pressure-test |
| 3 | `grilling` (Matt) | Bernstein | One-question-at-a-time pressure-testing; drives checkpoint/escalation judgment | wayfinder (shares "relentless interview" lineage); grill-me / grill-with-docs are wrapper variants — rule those out |
| 4 | `bmad-build-auto` (bmad) | Bernstein, Dylan | Machine-readable status (draft/ready/in-progress/done/blocked + deferred[] + blocked conditions) = the structured-report contract exactly | TGO's report/exit-gate *concept*, but this is the concrete status vocabulary |
| 5 | `code-review` (Matt) | Horowitz | Two-axis review (Standards + Spec) since a fixed point — his core lane | none |
| 6 | `bmad-deep-recon` (bmad) | Nas | Three-mode research + claim verification + typed packs → structured-report contract | ruflo deep-research (see T2) |
| 7 | `implement` (Matt) | Dylan | Spec/ticket-driven execution discipline — his core lane | bmad-build (see T2), gsd executor |
| 8 | `tdd` (Matt) | Dylan | Red-green-refactor; the house implementation method | none |

## Tier 2 — strong candidates (additive, but meaningful overlap to adjudicate or heavy adaptation)

| # | Skill (source) | Seat | Why | Overlap |
|---|---|---|---|---|
| 9 | `bmad-review` (bmad) | Horowitz (+Nirvana content) | 5 lenses in parallel (adversarial/edge-case/verification-gap/structure/prose), one findings array | Nirvana band lenses (Risk/Structure/Economy) — content source, but as a *shipped skill* it's Horowitz's |
| 10 | `verification-planning` (slim) | Bernstein, Nirvana | Plan an evidence path before non-trivial changes | TGO boolean exit gates (concept); this is the method |
| 11 | `verification-before-completion` (superpowers) | Horowitz, Nirvana | Evidence over claims — "is it actually fixed" | overlaps verification-planning + exit gates; pick one |
| 12 | `bmad-spec` (bmad) | Bernstein, Dylan | Single-writer spec contract (Why/Capabilities/Constraints/Non-goals/Success signal) | TGO living-spec (concept); this is the writing method |
| 13 | `bmad-code-review` + `bmad-correct-course` (bmad) | Horowitz | Post-build review + course-correction loop | overlaps code-review (T1#5) |
| 14 | gsd verification/gates (gsd) | Horowitz, Nirvana | Requirement + decision coverage; Confirm/Quality/Safety/Transition gates | TGO checkpoint protocol (concept); overlaps verification skills |
| 15 | `writing-plans` (superpowers) | Bernstein | Bite-sized tasks with exact paths + verification steps | overlaps to-tickets + bmad-spec |
| 16 | `research` (Matt) | Nas | High-trust primary sources, cited markdown | overlaps bmad-deep-recon + ruflo deep-research; pick one heavy-research skill |
| 17 | ruflo `deep-research` / `dossier-collect` (ruflo) | Nas | Heavyweight research + dossier gathering | overlaps bmad-deep-recon (T1#6) — likely lose these |
| 18 | gsd research module (gsd) | Nas | Fetch-to-disk, confidence stamping, package-legitimacy verdicts | overlaps bmad-deep-recon; unique bit = package-legitimacy (supports TGO checkpoint on deps) |
| 19 | `codemap` (slim) | Nas | Hierarchical repo maps | native grep/glob can approximate; low ceiling |
| 20 | `prototype` (Matt) | Bernstein, Dylan | Throwaway prototype to answer a design question | none; but who runs it — Bernstein delegates a prototype lane? |
| 21 | `handoff` (Matt) | memory/context | Compact conversation into handoff doc for another session | magic-context (plugin) covers cross-session memory; handoff is the *deliberate* version |

## Tier 3 — plausible (heavy adaptation, meaningful overlap, or niche)

| # | Skill (source) | Seat | Why consider | Why it might lose |
|---|---|---|---|---|
| 22 | `to-spec` (Matt) | Bernstein | Conversation → spec → tracker | overlaps living-spec + bmad-spec |
| 23 | `bmad-help` (bmad) | Bernstein | Artifact-scan routing substitute | overlaps Bernstein's lane-card routing |
| 24 | `domain-modeling` (Matt) | Bernstein | ADRs + ubiquitous language | TGO already does ADRs; niche for a build |
| 25 | superpowers `brainstorming` | Bernstein | Socratic design refinement | overlaps grilling |
| 26 | `gsd-autonomous` (gsd) | Bernstein | Chain discuss→plan→execute with gates | TGO autonomous loop owns this |
| 27 | ruflo `goal-plan` (ruflo) | Bernstein | GOAP long-horizon planning + replan | TGO DAG+wave + re-planning levels own this |
| 28 | slim `deepwork` (slim) | Bernstein | Phased scheduler + review gates | TGO autonomous loop owns this |
| 29 | superpowers `requesting-code-review` | Horowitz | Pre-review checklist | overlaps code-review |
| 30 | superpowers `receiving-code-review` | Dylan | Respond to feedback without friction | small, but nice for Dylan's review loop |
| 31 | superpowers `executing-plans` | Dylan | Batch execution with checkpoints | TGO checkpoint protocol owns this |
| 32 | superpowers `systematic-debugging` | Horowitz, Dylan | 4-phase root-cause | overlaps Matt `diagnosing-bugs` — pick one |
| 33 | `diagnosing-bugs` (Matt) | Horowitz | Diagnosis loop, refuses to theorize | overlaps systematic-debugging — pick one |
| 34 | `improve-codebase-architecture` (Matt) | Horowitz | Deepening scan + visual report | heavy; advisory |
| 35 | `codebase-design` (Matt) | Horowitz, Dylan | Deep-module vocabulary | vocabulary, not a workflow |
| 36 | `clonedeps` (slim) | Nas | Clone dep source for inspection | Nas has no bash — would need bash grant or adaptation |
| 37 | `simplify` (slim) | Horowitz | Behavior-preserving simplification | review-adjacent |
| 38 | `resolving-merge-conflicts` (Matt) | Dylan, Bernstein | Worktree merge reconciliation | niche; Bernstein reconciles per TGO worktree lanes |
| 39 | `reflect` (slim) | memory/context | Friction → reusable skills/config | TGO reflect loop owns this |
| 40 | gsd `mempalace-recall` (gsd) | memory/context | Cross-session memory | magic-context (plugin) covers |

## Tier 4 — barely worth mentioning (native/TGO-feature overlap, meta, or user-facing)

| # | Skill (source) | Why it loses |
|---|---|---|
| 41 | ruflo `intelligence-route` | Learned routing — over-engineered vs lane-card |
| 42 | ruflo `memory-search` / `neural-train` / `intelligence-transfer` | magic-context covers memory |
| 43 | oh-my-pi `retain`/`recall`/`reflect`/`learn` | magic-context covers memory |
| 44 | superpowers `subagent-driven-development` | It's an *orchestrator* skill; Dylan IS the subagent, Bernstein owns delegation |
| 45 | superpowers `dispatching-parallel-agents` | TGO DAG+wave owns this |
| 46 | gsd executor wave-parallelism | TGO DAG+wave owns this |
| 47 | superpowers `writing-skills` | meta |
| 48 | superpowers `using-superpowers` | bootstrap |
| 49 | superpowers `finishing-a-development-branch` | git-native |
| 50 | Matt `teach` | user-facing, not roster |
| 51 | Matt `triage` | incoming-issue intake, not roster |
| 52 | Matt `setup-matt-pocock-skills` | TGO setup owns it |
| 53 | oh-my-pi `scout` / `reviewer` / `librarian` | bundled *agents*, overlap existing seats |
| 54 | slim `oh-my-opencode-slim` self-config | TGO setup owns it |
| 55 | slim `loop-engineering` | tuning the orchestrator loop; meta |

## Tier-2/3 grill sweep (2026-08-05) — all remaining candidates decided

- **Spec/planning artifacts (Group 1):** writing-plans, bmad-spec, to-spec, domain-modeling → **all lose.** Planning/spec surface owned by to-tickets + living-spec + Five-part Spec.
- **Review-adjacent (Group 2):** **receive-code-review → ADOPT for Dylan** (the writer's half of the review loop). Lose: requesting-code-review (folds into code-review prep), bmad-code-review/correct-course (folds into escalation), simplify (overlaps YAGNI ladder).
- **Codebase health/design (Group 3):** improve-codebase-architecture, codebase-design, codemap → **all lose.** First stays on "works well with" page; second's vocabulary goes into Bernstein/Horowitz prompts; third approximated by Nas's native read/grep/glob.
- **Operational/misc (Group 4):** prototype, handoff, brainstorming, clonedeps, resolving-merge-conflicts, bmad-help → **all lose.** prototype/handoff/resolving-merge-conflicts on "works well with" page; brainstorming + bmad-help overlap grilling/lane-card; clonedeps needs bash Nas is denied.

## FINAL BUNDLE (G1, decided 2026-08-05; amended 2026-08-06)

**13 shipped skills, 15 seat-grants:**

- **Bernstein:** wayfinder, grilling, to-tickets, bmad-build-auto, verification-planning, diagnosing-bugs, to-questionnaire, wizard
- **Horowitz:** code-review (lens-expanded w/ bmad five-lens vocab + Fowler baseline), diagnosing-bugs
- **Nas:** bmad-deep-recon (adapted read-only + gsd package-legitimacy verdict + confidence stamping)
- **Dylan:** implement, tdd, receiving-code-review, diagnosing-bugs
- **Nirvana:** none (tool-less; lens content in steering paragraphs)

**SHIPPED 2026-08-07 (tgo-96f.13):** all 13 skills ship as `plugin/assets/skills/<name>/SKILL.md`, copied into the config dir `skills/` at install (no-clobber, 14 total incl. tgo-setup). Per-seat grants are `permission.skill` pattern objects (`"*": deny` + named allows) in seat frontmatter. This section is the authoritative grant map — see `docs/wayfinder/decisions.md` for the live-verification record.


**Lost (by cluster):** research cluster → bmad-deep-recon only; review cluster → code-review only; verification cluster → verification-planning only; planning cluster → wayfinder+grilling+to-tickets; debug cluster → diagnosing-bugs only; autonomy cluster → none (TGO features); memory cluster → none (magic-context).

**Added 2026-08-06 (Pocock v1.2.x review):** `to-questionnaire` (Bernstein) + `wizard` (Bernstein), both advisory grants — see Pocock v1.2.x review below.

- **magic-context** tools (`ctx_memory`/`ctx_search`/`ctx_dream`) and **aft** symbol tools — plugins/tools, granted via permission graph (tgo-a6r.16), not the skill bundle.
- **Concision/writing skills** (i-have-adhd, caveman, ponytail, stop-slop, humanizer, ep01) — already amalgamated into the house style + scrub list (tgo-a6r.14/15); they are *content*, not shipped skills.
- **Nirvana** — tool-less band (tgo-a6r.12); lens content folds into steering paragraphs, never a shipped skill.

---

## Overlap clusters — DECISIONS

- **RESEARCH CLUSTER (decided 2026-08-05):** 4 → 1. **bmad-deep-recon** (T1#6) is Nas's research skill, adapted read-only (findings as structured reports, never files — consistent with Nas's no-edit/no-bash). **Fold in** gsd's package-legitimacy verdict (OK/SUS/SLOP — powers the dependency-legitimacy checkpoint) + gsd's confidence stamping as a report field. **Lose:** Matt research (file-writing conflicts with read-only), ruflo deep-research/dossier-collect (overlapping fan-out, no unique add). gsd's cache/waterfall internals = build-time implementation notes, not a skill.
- **REVIEW CLUSTER (decided 2026-08-05):** 5 → 1. **Matt code-review** (T1#5) is Horowitz's review skill, **expanded with bmad-review's five-lens vocabulary** (adversarial / edge-case / verification-gap / structure / prose) beyond its two axes. **Lose:** bmad-code-review + correct-course (correct-course folds into Bernstein's escalation ladder), gsd gates (TGO owns via checkpoint/exit gates), requesting-code-review (thin; folds into code-review prep), fusion reviewer (concept already in Horowitz's seat prompt). bmad-review's **prose lens** folds into the concision scrub list. The band keeps its three strategic lenses (separate lane from code review).
- **VERIFICATION CLUSTER (decided 2026-08-05):** 3 → 1. **verification-planning** (slim, T2#10) is Bernstein's up-front evidence-path method — converts the exit gate from "tests pass" into a planned evidence path at spec time (the MAST fix). **Lose:** verification-before-completion (content folds into code-review's verification-gap lens + Bernstein's exit-gate discipline), bmad-spec (its Success-signal is already owned by the Five-part Spec Verification field + living-spec mechanism).
- **PLANNING CLUSTER (decided 2026-08-05):** 4 → 3. **Bernstein** gets wayfinder (fog→clarity) + grilling (sharpening; grill-me/grill-with-docs collapse in) + to-tickets (clarity→work-units). Distinct methods forming a pipeline (proven this session). **Lose:** to-spec (the living-spec mechanism owns its function).
- **DEBUG CLUSTER (decided 2026-08-05):** 2 → 1. **diagnosing-bugs** (Matt, installed, feedback-loop-first — congruent with evidence-over-claims) for Horowitz + Dylan. **Lose:** systematic-debugging (root-cause-tracing subsumed by the red-loop-first model).
- **AUTONOMY CLUSTER (decided 2026-08-05):** gsd-autonomous, ruflo goal-plan, slim deepwork, executing-plans → all **lose** to TGO features (autonomous loop, checkpoint protocol, DAG+wave, re-planning levels). No shipped skills.
- **MEMORY CLUSTER (decided 2026-08-05):** reflect (slim), gsd mempalace-recall, ruflo memory-search/neural-train, oh-my-pi memory tools → all **lose** to magic-context (plugin) + TGO reflect loop. No shipped skills.

---

## Pocock v1.2.x review (2026-08-06) — source: video transcript + repo diff to v1.2.3

Trigger: `2026_08_06_pocock_video_transcript.txt` (v1.2.0 release video) + audit of `mattpocock/skills` at **v1.2.3** (two patches past the video; v1.2.2 made `writing-for-agents` model-invokable, v1.2.3 added `diagnosing-bugs` Redact section + harness-agnostic `code-review` + wizard time-estimate removal).

### What changed in the source repo

- **`grilling` rewritten** — one-question-at-a-time → **rounds + frontier** ("work the tree in rounds; the frontier is every decision whose prerequisites are settled; ask the whole frontier in one round, numbered, with a recommended answer each"). Matches TGO DAG+wave cap-3 exactly. `grill-me` is now a 7-line router to `/grilling`.
- **`diagnosing-bugs` Redact section** (v1.2.3): redact every secret first (`<REDACTED>`), build loops against env vars, quote only signal-carrying lines of captured artifacts.
- **`code-review` Fowler baseline** (v1.1.0, ~12 smells, reported as judgement calls not violations) + **harness-agnostic** (v1.2.3: drops Claude tool names; `general-purpose` subagent; "issue/spec" not "issue/PRD").
- **`writing-great-skills` → `writing-for-agents`** (v1.2.0): broadened to any agent-facing doc (AGENTS.md/CLAUDE.md), added context-pointers, two loads, leading words, progressive disclosure, pruning, negation. Now model-invoked.
- **New: `wait-what`** (user-invoked, 7 lines): re-pitch in ASD-STE100 Simplified Technical English + ground in the ubiquitous language from `CONTEXT.md`. Key insight: *"the real cure for verbosity is not to tell it to use simple language... it is to tell it to use your language."*
- **New: `to-questionnaire`** (productivity, user-invoked): grilling decisions → Markdown questionnaire for a stakeholder who isn't in the session ("grill the send, not the subject"). The collaboration patch.
- **New: `wizard`** (engineering, model-invoked): deterministic bash wizard (ephemeral) for steps only the human can perform — provisioning, credentials, migrations.
- In-progress (not shipped): `loop-me`, `writing-beats/fragments/shape`, `claude-handoff`, `setup-ts-deep-modules`. Codex sidecars (`openai.yaml` / `allow_implicit_invocation`) + Claude Code marketplace — not applicable to opencode.

### Bundle decisions (recorded on tgo-96f.13)

- **UPDATE `grilling`** → adapt the new rounds/frontier version for Bernstein (supersedes the one-at-a-time adaptation; better fit with the wave model). `grill-me` stays ruled out (now literally a router to grilling).
- **UPDATE `diagnosing-bugs`** → adopt the v1.2.3 Redact section.
- **UPDATE `code-review`** → fold in the Fowler baseline + harness-agnostic subagent wording.
- **ADD `to-questionnaire` (Bernstein, advisory):** wayfinder Task tickets needing *someone else's* knowledge get a questionnaire instead of a loose checklist.
- **ADD `wizard` (Bernstein, advisory):** wayfinder Task tickets with human-only steps (provisioning/credentials) get a deterministic script.
- **DON'T bundle:** `wait-what` (user-facing; insight → concision payload, tgo-96f.9); `writing-for-agents` (meta/writing; rename reference in `skill-sources-inventory.md`, list on "works well with" page).
- **REMOVALS:** none. All 11 original skills hold.

### Adaptation notes — new grants (Bernstein, both advisory-only, nothing load-bearing)

**`to-questionnaire`** — adapt from Pocock's productivity skill. Core method: grill the *send*, never the subject — (1) who is it going to (role, expertise, relationship → sets tone + context load), (2) what do you need back (concrete decisions/facts), (3) write the questionnaire as a discovery doc (most-important-first, one idea per question, answer stub beneath, `_why this matters_` only where misreadable). Write to `to-questionnaire-<slug>.md`, report the path. Fires when Bernstein's wayfinder/grilling surfaces a decision needing input from a human not in the session — including the human's own stakeholders. User-invoked (humans invoke via Bernstein delegation boundary, not model-auto). Prune: Pocock version is ~300 tokens; TGO fold targets ~150.

**`wizard`** — adapt from Pocock's engineering skill. Core method: scope the procedure from the repo first (`.env*`, README, `docker-compose*`, `.github/workflows/*` — every `secrets.*`/`vars.*` reference is a value the wizard must produce); confirm the ordered stage list + captured values with the human; map each stage's journey (URL → click → copy → which var); author from the shared `template.sh` library (stage/step/open_url/ask/ask_secret/write_env/set_secret/pause/confirm, `TOTAL_STAGES`); verify statically (`bash -n`, shellcheck, every value lands where scoped — never run end-to-end; it opens browsers + blocks on human input). Ephemeral by default; commit only for repeatable setup. Fires when a wayfinder Task ticket or setup hits "steps only the human can perform." Model-invoked grant (Bernstein can reach it during delegation). Prune: wizard's ~600 tokens → ~200 (TGO has no browser-run need; keep stage/secret/env helpers, drop time-estimate machinery already removed upstream).
