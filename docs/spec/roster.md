# TGO Spec — Roster, Roles, and Bernstein's Mandate

Status: **spec** (buildable). Source decisions: `docs/wayfinder/decisions.md` (tgo-a6r.8, tgo-a6r.13, tgo-a6r.15 amendments; architectural-review amendments). Related ADRs: `docs/adr/0002-roster.md`.

## 1. The five seats

| Seat | Role | Model tier | Bound |
|---|---|---|---|
| **Bernstein** | Primary (Orchestrator) — plan, delegate, reconcile, verify | strongest (balanced/frontier) | Scheduler-not-worker: no direct edits, no UI work, no doing |
| **Horowitz** | Review + strategic advisor | strong, judgment | Reviews work that exists; never implements |
| **Nas** | Read-only lookup: recon + research + docs | cheap flash | No file writes; findings returned as structured reports, never committed artifacts |
| **Dylan** | Sole writer: code + technical docs + prose artifacts | writing-capable | Executes specs; no strategy |
| **Nirvana** | Band (synthesizer + 3 lenses) | strongest, low temp | Tool-less (see `docs/spec/band.md`) |

Standing rule (all seats): **effectiveness over theming.** Names are naming/UX devices, not personas. Any identity anchor is **role-anchored, never name-anchored** — Bernstein is *the scheduler who never does*, Horowitz *the reviewer of existing work*, Nas *the fast read-only researcher*, Dylan *the spec executor*, Nirvana *the lens-merging synthesizer*. None roleplay their namesake.

## 2. Prompt anatomy — 4 blocks, <1000 tokens

1. **Identity** (1-2 lines) — name + one-line mandate.
2. **Rules as bullets** — do/don't boundaries (the bulk).
3. **Bernstein-only lane-card** — "delegate when" routing thresholds: multi-step implementation → Dylan; external research → Nas; judgment-heavy/ambiguous → Nirvana; never UI. (bmad's route-to-smallest-safe-path, as prompt.)
4. **Examples** (1-2) — a worked mini-example of the seat's output/report format.

**Budget: <1000 tokens per prompt, body only (frontmatter excluded), enforced at build time** — the plugin's config schema validates prompt-file size (gsd-core byte-budget idea, as a schema check). Raised from 600 (2026-08-12, tgo-6ef): the original ~500-token guidance was a single opinion; orchestration agents typically run 1500–4000+ tokens, and 1000 keeps Bernstein ~2–4× slimmer than most while ending the prose-trim compromise whenever a new mandate rule lands. Frontmatter (tool/allowlist grants) is config, not prompt — excluded from the count.

## 3. Where seat behavior lives

- Seat behavior lives **only** in agent prompt files (`~/.config/opencode/agent/*.md`), where the permission graph binds.
- TGO ships a global `AGENTS.md` fragment as a **thin always-on advice layer only**: concise-writing modifier, no-slash-commands/prose-driven reminder, "record work in beads" directive. Never load-bearing (skills are advisory, generalized).
- Repo-specific setup stays out (see `docs/spec/setup.md`).

## 4. Model routing

Per-role model routing via presets (see `docs/spec/features.md` §5): named seat→model/variant maps. Three built-ins: **balanced / cheap / frontier**. **Applied at plugin load** from the active preset (config hook), never mid-task — OpenCode 1.18.13's `task` tool takes no model parameter and a subagent without an explicit `model` inherits the parent's model, so per-seat models are fixed for the session.

**Concrete presets (decided 2026-08-05, Go + free Zen models; balanced amended 2026-08-16, tgo-5a6):**

| Seat | Balanced | Cheap | Frontier |
|---|---|---|---|
| Bernstein | `opencode-go/muse-spark-1.2-contributor` (xhigh) | `opencode/deepseek-v4-flash-free` (effort max) | `opencode-go/kimi-k3` (max) |
| Horowitz | `opencode-go/muse-spark-1.2-contributor` (xhigh) | `opencode/deepseek-v4-flash-free` (effort high) | `opencode-go/kimi-k3` (max) |
| Nas | `opencode-go/muse-spark-1.2-contributor` (medium; vision) | `opencode/mimo-v2.5-free` (vision; default) | `opencode-go/deepseek-v4-flash` (effort high) |
| Dylan | `opencode-go/muse-spark-1.2-contributor` (high) | `opencode/deepseek-v4-flash-free` (effort high) | `opencode-go/deepseek-v4-flash` (effort max) |
| Nirvana synth | `opencode-go/muse-spark-1.2-contributor` (xhigh) | `opencode/deepseek-v4-flash-free` (effort max) | `opencode-go/kimi-k3` (max) |
| Band members | `opencode-go/muse-spark-1.2-contributor` (high) | `opencode/deepseek-v4-flash-free` (effort high) | `opencode-go/deepseek-v4-flash` (effort high) |

**Rationale:**
- **Balanced = Muse Spark 1.2 Contributor on every seat**: all six balanced entries route to `opencode-go/muse-spark-1.2-contributor`; the preset differentiates by supported reasoning effort: xhigh on the judgment seats (Bernstein/Horowitz/Nirvana), medium on Nas (read-only research and vision), and high on Dylan (writing) and band members (tool-less reasoning). Dylan stays at high for execution work; Nas stays at medium for read-only research while preserving his vision lane.
- **Nas = the eyes** (cheap: MiMo V2.5 with vision; balanced: Muse Spark with vision): Bernstein delegates vision tasks to Nas on demand — the slim Observer pattern, with **Nas read-only** (confirmed: slim's Observer is read-only, no write access needed). **Implemented (2026-08-11, tgo-dqa):** Bernstein's prompt carries the vision rule both ways — anything needing sight goes to Nas when his model lacks vision; when his model HAS vision (frontier Kimi K3), he reads images himself and only delegates vision work that's research/recon. Nas's prompt identifies him as "the eyes" so he accepts sight tasks in the structured report format.
- **Frontier = Kimi K3** for the judgment seats: 1M context, vision, reasoning max (its only option). Nas/Dylan stay DS4 Flash (research/execution never need frontier cost).
- **Provider split across presets:** balanced runs OpenCode Go; cheap stays OpenCode free-tier. Cross-vendor review remains an option in the "works well with" page.
- Reasoning-effort variants: xhigh on balanced judgment seats (Bernstein/Horowitz/Nirvana), medium on balanced Nas (research), high on balanced Dylan (writing) and band members (tool-less reasoning).
- Models move fast; these are the plan-as-of-today. The JSON schema + build step should tolerate model-name drift (presets are data, not code).

## 5. Bernstein's mandate (including architectural-review amendments)

Bernstein is the single orchestrator. In addition to §1-4, his mandate carries five additions from the architectural review (2026-08-04), all amending tgo-a6r.9:

1. **Living-spec mechanism.** Each work-unit beads issue IS a living spec: bidirectional updates (implementation writes back what was built), explicit success criteria, verification against the spec (not just the diff), a **spec-review checkpoint before coding starts**, and a decision log on the issue. Addresses context/alignment drift — the top-3 failure mode.
2. **DAG + wave decomposition.** Bernstein decomposes the goal into a dependency-ordered DAG; same-level tasks dispatch together as a **wave**; the next wave waits on the prior. Gives the job board its "what runs in parallel when" rule.
3. **Boolean exit gates.** Every delegated Spec carries an explicit deterministic success criterion (tests pass, lint clean) that must hold before Bernstein closes the issue — antidote to vague handoffs and verifier false-passes.
4. **Stagnation detection.** In deepwork mode: repeated-identical-action detection + periodic progress checks (3 identical actions → intervene; periodic check every N steps), layered on the existing hard bounds (max phases, token budget, checkpoint cadence).
5. **Adaptive re-planning levels.** Bernstein's failure response gains light/medium/heavy: tweak params → reorder deps → full re-decomposition, layered on the escalation ladder.

His beads operating rules (single-writer) are specified in `docs/spec/beads-integration.md`. Board reads do not authorize lifecycle actions; bd init --directory is unsupported, bd -C fails, must use .cwd(directory). Plugin remains metadata-only (beadsLifecycle.allowed:false) until host boundary validated. Tiny routing retains its documented bypass.

**The doing-boundary (decided 2026-08-05):** Bernstein's boundary is **absolute** — he never modifies a file, however trivial; any change goes to Dylan via a beads issue. He may read, run verification (git diff/status, lint, test), run `bd`, delegate, and reconcile. Vision tasks go to Nas (per model presets §4). "Delegate the doing, keep the deciding" made structural (fusion).

**Routing depth scales with blast radius (decided 2026-08-05):** the workflow is NOT one-size-fits-all (bmad "route to smallest safe path"; fusion sidekick-for-mechanical-edits). Bernstein routes by blast radius:
- **One-shot classification:** `tiny` requires one bounded named file, an explicit transformation, reversibility, and deterministic verification. Ambiguity, missing location/old value, multiple interpretations/files, verification failure, unexpected diff, user-visible or high-blast-radius impact, irreversibility, API/schema/auth/dependency/migration/security/deployment impact, greenfield/unfamiliar work, or agent escalation promotes to `heavy`. Incomplete tiny evidence without a heavy trigger is `standard`.
- **Tiny/mechanical** (one-liner, zero blast radius): minimal spec + direct Dylan dispatch + fast verify + close. No wayfinder, no grilling, no band.
- **Standard** (multi-step): full Five-part Spec, normal wave dispatch, exit-gate verify.
- **Judgment-heavy / high-blast-radius**: full pipeline — grilling/wayfinder for shape, band for risk, review before merge.
The heavy pipeline is reserved; it is not the default for small work.
This classifier only supplies the routing result. Downstream tiny bypass and heavy-pipeline promotion wiring is a later slice.

**Reference for the living-spec workflow:** the opencode-beads `beads-task-agent` prompt (installed at vendor/agents/task-agent.md) models the claim→execute→close→file-discoveries discipline — mine it for Bernstein's prompt. Caveat: that agent depends on beads MCP tools that don't exist in our install; Bernstein replaces it, he IS the beads operator.

## 6. Structured output contracts

- Delegation in: **Five-part Spec** (see `docs/spec/architecture.md` §3.1).
- Reports out: **STATUS** (complete/partial/blocked/escalate) / **CHANGES** / **VERIFIED** / **GAPS**.

## 7. Delegation depth

`subagent_depth: 2` caps all delegation. Nirvana's shape: orchestrator(0) → nirvana(1) → lens(2). Specialists may not spawn further general-purpose subagents.
