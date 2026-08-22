# TGO Roster

TGO runs a fixed roster of five seats — a "band" — around one primary orchestrator. Seats are role-anchored, never name-anchored: the names are naming and UX devices, not personas, and the standing rule is effectiveness over theming. None of them roleplay their namesake.

This page is the human-readable version of `docs/spec/roster.md`; that spec stays canonical.

## The five seats

| Seat | Role | Model tier | Bound |
|---|---|---|---|
| **Bernstein** | Primary (Orchestrator) — plan, delegate, reconcile, verify | strongest (balanced/frontier) | Scheduler-not-worker: no direct edits, no UI work, no doing |
| **Horowitz** | Review + strategic advisor | strong, judgment | Reviews work that exists; never implements |
| **Nas** | Read-only lookup: recon + research + docs | cheap flash | No file writes; findings returned as structured reports, never committed artifacts |
| **Dylan** | Sole writer: code + technical docs + prose artifacts | writing-capable | Executes specs; no strategy |
| **Nirvana** | Band (synthesizer + 3 lenses) | strongest, low temp | Tool-less |

## Prompt anatomy — 4 blocks, under 1000 tokens

Each seat prompt is built from four blocks, and the whole body (frontmatter excluded) must stay under 1000 tokens — enforced at build time and by `validate`:

1. **Identity** (1–2 lines) — name plus a one-line mandate.
2. **Rules as bullets** — do/don't boundaries; the bulk of the prompt.
3. **Bernstein-only lane-card** — "delegate when" routing thresholds: multi-step implementation → Dylan; external research → Nas; judgment-heavy or ambiguous → Nirvana; never UI.
4. **Examples** (1–2) — a worked mini-example of the seat's output or report format.

Frontmatter (tool and skill grants) is config, not prompt — excluded from the count. The budget was raised from 600 to 1000 tokens (2026-08-12) because orchestration agents typically run 1500–4000+ tokens; 1000 keeps Bernstein 2–4x slimmer than most while ending the prose-trim compromise whenever a new mandate rule lands.

## Presets and model routing

Seat→model maps are called **presets**: named data files, not code, so model-name drift is tolerated. Three built-ins — **balanced / cheap / frontier** — applied at plugin load by the `config` hook. Per-seat models are fixed for the session, because OpenCode's `task` tool takes no model parameter and a subagent without an explicit model inherits the parent's.

| Seat | Balanced | Cheap | Frontier |
|---|---|---|---|
| Bernstein | `opencode-go/ox-alpha-free` (max) | `opencode-go/ox-alpha-free` (max) | `opencode-go/kimi-k3` (max) |
| Horowitz | `opencode-go/ox-alpha-free` (max) | `opencode-go/ox-alpha-free` (max) | `opencode-go/kimi-k3` (max) |
| Nas | `opencode-go/ox-alpha-free` (max) | `opencode-go/ox-alpha-free` (max) | `opencode-go/ox-alpha-free` (max) |
| Dylan | `opencode-go/ox-alpha-free` (max) | `opencode-go/ox-alpha-free` (max) | `opencode-go/ox-alpha-free` (max) |
| Nirvana synth | `opencode-go/ox-alpha-free` (max) | `opencode-go/ox-alpha-free` (max) | `opencode-go/kimi-k3` (max) |
| Band members | `opencode-go/ox-alpha-free` (max) | `opencode-go/ox-alpha-free` (max) | `opencode-go/ox-alpha-free` (max) |

The routing rationale, from the spec:

- **Balanced = ox-alpha-free on every seat (max)** — all six balanced entries route to `opencode-go/ox-alpha-free` at effort `max`.
- **Cheap = same as balanced** — all six cheap entries route to `opencode-go/ox-alpha-free` at effort `max`.
- **Frontier = Kimi K3 on judgment seats, ox-alpha-free elsewhere — all max** — Bernstein/Horowitz/Nirvana → `opencode-go/kimi-k3` (max); Nas/Dylan/band-members → `opencode-go/ox-alpha-free` (max).

Switching presets at runtime is a prose nudge, not a config edit: say "go cheap" or "use frontier for this" and Bernstein sets the active preset, which takes effect at the next plugin load. Partial overrides are possible via the `presets` config option.

## Bernstein's mandate

Beyond the seat description, Bernstein's prompt carries five amendments from the architectural review:

1. **Living-spec mechanism** — each work-unit beads issue IS a living spec: bidirectional updates, explicit success criteria, verification against the spec (not just the diff), a spec-review checkpoint before coding starts, and a decision log.
2. **DAG + wave decomposition** — decompose the goal into a dependency-ordered DAG; same-level tasks dispatch together as a wave; the next wave waits on the prior.
3. **Boolean exit gates** — every delegated spec carries an explicit deterministic success criterion that must hold before the issue closes.
4. **Stagnation detection** — in deepwork mode, three identical actions trigger intervention; periodic progress checks layer on the hard bounds.
5. **Adaptive re-planning levels** — light (tweak params) / medium (reorder deps) / heavy (full re-decomposition), layered on the escalation ladder.

Two boundaries are absolute:

- **The doing-boundary.** Bernstein never modifies a file, however trivial; any change goes to Dylan via a beads issue. He may read, run verification (`git diff`/`status`, lint, test), run `bd`, delegate, and reconcile. "Delegate the doing, keep the deciding."
- **Routing scales with blast radius.** Tiny/mechanical work gets a minimal spec, a direct Dylan dispatch, and a fast verify. Standard multi-step work gets the full Five-part Spec and normal wave dispatch. Judgment-heavy or high-blast-radius work gets the full pipeline: grilling/wayfinder for shape, the band for risk, review before merge. The heavy pipeline is reserved, not the default for small work.

His future Beads operating rules (single-writer: create before delegating, claim at dispatch, close only on verified completion) live in `docs/spec/beads-integration.md`; the current plugin host validates metadata only. Board reads do not authorize lifecycle actions; bd init --directory is unsupported, bd -C fails, must use .cwd(directory). Plugin remains metadata-only (beadsLifecycle.allowed:false) until host boundary validated. Tiny routing retains its documented bypass.

## Structured output contracts

- Delegation in: the **Five-part Spec** (Objective / Files / Interfaces / Constraints / Verification, plus an optional Register field).
- Reports out: **STATUS** (complete / partial / blocked / escalate) · **CHANGES** · **VERIFIED** · **GAPS**.

The optional Register field (concise/natural) is Bernstein's way of mandating the register when the deliverable's audience makes it matter — docs, copy, prose. Omitted, Dylan self-classifies by output class: technical steps/code → concise; voice-forward prose → natural. See `docs/CONCISION.md`.

## Delegation depth and step caps

`subagent_depth: 2` caps all delegation (orchestrator → specialist → lens), and the `general` subagent is excluded from the delegation graph. Nas, Horowitz, and Dylan carry a 20-step cap, so a recon, review, or implementation session that would exhaust its output budget mid-report returns a usable partial result instead of an empty handoff; their seat bodies also mandate "never end a turn with no text."

## Related

- Spec: `docs/spec/roster.md` (canonical), `docs/spec/architecture.md`, `docs/spec/features.md`, `docs/spec/band.md`
- ADR: `docs/adr/0002-roster.md`
- Presets data: `plugin/assets/presets.json`
- Human pages: `docs/ARCHITECTURE.md`, `docs/CONCISION.md`
