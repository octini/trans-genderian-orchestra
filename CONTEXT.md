# TGO — Context

## What this is

TGO (**trans-genderian-orchestra**) is a custom multi-agent orchestration plugin for [OpenCode](https://opencode.ai). It coordinates a fixed roster of named, role-anchored subagents (a "band") around one primary orchestrator agent. TGO is configuration-first: routing and delegation are prompt-driven; a thin plugin core validates lifecycle metadata and observes state, never reimplementing control flow or performing Beads lifecycle writes.

This `CONTEXT.md` is the single-context root for the TGO project. It is the entry point for the build expedition that implements the spec.

## Structure

```
CONTEXT.md              <- this file: what TGO is, glossary, reading order
docs/adr/               <- architectural decision records (the "why")
docs/spec/              <- the buildable spec (the "what/how"), one doc per concern
docs/wayfinder/         <- planning expedition artifacts (decisions log, map ticket)
docs/research/          <- framework/skill research that informed the decisions
tgo_build_notes.md      <- the original project brief
```

## Reading order

1. **This file** — domain vocabulary and the one-paragraph design.
2. `docs/spec/architecture.md` — the shape: hybrid config-first + thin plugin core; the four core hooks plus opt-in observer boundary; capabilities-not-compliance enforcement.
3. `docs/spec/roster.md` — the five seats, prompt anatomy, model routing, Bernstein's mandate (including the 5 architectural-review amendments).
4. `docs/spec/band.md` — the Nirvana review band mechanism.
5. `docs/spec/skill-candidates.md` — **the resolved 11-skill/13-grant bundle** and the full per-cluster decision trail.
6. `docs/spec/skill-curation.md` — the "all batteries included" curation policy and per-seat grants.
7. `docs/spec/concision-enforcement.md` — the always-on 3-axis house style and register dial.
8. `docs/spec/mcp-permissions.md` — AFT + magic-context + context7 dependencies and the per-seat permission matrix.
9. `docs/spec/beads-integration.md` — beads-native work tracking; the Background Job Board as a renderer over beads.
10. `docs/spec/features.md` — the five adopted beyond-minimum features (autonomous loop, checkpoints, reflect loop, worktree lanes, presets) plus Bernstein's living-spec/DAG-wave/exit-gate/stagnation/re-planning additions.
11. `docs/spec/setup.md` — per-repo auto-triggered, default-complete setup.
12. `docs/spec/gap-review.md` — pre-build gap review: all decision-shaped gaps resolved; discovery-shaped gaps (delegation/session/hook mechanics) listed for the build's first slice to answer empirically.
13. `docs/adr/` — ADRs for the load-bearing "why" decisions.

## Glossary

- **Seat** — one member of the fixed roster: Bernstein (primary), Horowitz, Nas, Dylan, Nirvana. Seats are role-anchored, never name-anchored: names are naming/UX devices, not personas.
- **The band** — informal name for the roster.
- **Nirvana / the band** — the tool-less review band (three lenses + a synthesizer), fired on high-stakes or ambiguous judgment.
- **Bernstein** — the primary (Orchestrator) seat: plans, delegates, reconciles, verifies. Scheduler-not-worker; never does the doing.
- **Living spec** — Bernstein's work-unit beads issue doubles as the spec: explicit success criteria, bidirectional updates, verification against the spec not just the diff.
- **Background Job Board** — the per-turn snapshot of in-flight work Bernstein reads each turn; a renderer over beads plus a thin live-state shim, not a parallel store.
- **Five-part Spec** — the delegation contract: Objective / Files / Interfaces / Constraints / Verification.
- **Structured report** — the specialist's response format: STATUS (complete/partial/blocked/escalate) / CHANGES / VERIFIED / GAPS.
- **Register dial** — the two-position (concise/natural) writing register, toggleable only on Dylan's output.
- **Scrub list** — the always-on banned-tells list (filler, hedges, AI-vocab, etc.).
- **Presets** — named seat→model/variant maps (balanced/cheap/frontier) applied at delegation boundaries.
- **Deepwork mode** — the opt-in autonomous loop ("keep going"), default off.
- **beads / bd** — the issue tracker (a local Dolt-backed CLI). TGO's work-unit store.

## One-paragraph design

TGO is a hub-and-spoke orchestra with a single writer. **Bernstein**, the primary, turns each goal into a dependency-ordered DAG of work units, each a living-spec beads issue with a boolean exit gate. He dispatches same-level tasks together as waves to the specialist seats — **Dylan** (sole writer), **Nas** (read-only lookup), **Horowitz** (review/advisor) — and convenes **Nirvana** (three tool-less lenses + synthesizer) for judgment-heavy calls. Bernstein is the intended single-writer in the future architecture (create before delegating, claim at dispatch, close only on verified completion per docs/spec/beads-integration.md); the current plugin host validates lifecycle metadata only via four runtime hooks plus a thin live-state shim and does not perform Beads create, claim, close, reopen, or recovery — see that spec for host limitation (bd init --directory unsupported, bd -C fails, must use .cwd(directory)). All seats speak in one uniform, always-on concise house style enforced by a per-turn system transform and folded seat prompts; a two-position register dial rides on Dylan's output alone. Enforcement is by capabilities, not compliance: the Orchestrator literally cannot edit, grep, or glob; specialists can only do their lane. A thin plugin core provides four core runtime hooks (job-board injection, session reconciliation, task-fit rejection normalization, concision transform) plus an opt-in completion observer for surrogate-only style reinforcement; everything else lives in config, prompts, and presets. Autonomy is a mode, not the default — deepwork is opt-in with hard bounds, and a checkpoint protocol pauses on irreversible, expensive, or direction-changing actions.

## Session handoff — 2026-08-19

### Verified state

- Proportional routing classifier, delegation validator, structured report parser, metadata-only lifecycle validation, and a deterministic vague-request E2E fixture are implemented and tested. Tiny work keeps its minimal bypass; standard/heavy work requires the Five-part Spec, explicit boolean exit gate, and lifecycle metadata.
- The disposable Beads CLI probe covers `bd init`, create, show, claim, close, invalid-command exit status, and cleanup. Setup captures subprocess exit code, stdout, and stderr. Primary setup is gated on an explicitly null `parentID`; missing identity is not treated as primary. The Background Job Board is read-only; board reads do not authorize Beads lifecycle writes.
- Explicit-null primary gates and the read-only board clarification are documented and covered by tests. The implementation does **not** prove live plugin-mediated Beads lifecycle authorization or writes.
- Balanced preset: Bernstein/Nirvana → `opencode-go/glm-5.3-flash` (max), Horowitz → `opencode-go/gpt-5.6-luna` (max), Dylan/Nas/band-members → `opencode-go/muse-spark-1.2-contributor` (xhigh). Cheap preset: Muse Spark (xhigh) on every seat. Frontier preset: Bernstein → `opencode-go/glm-5.3` (max), Horowitz → `opencode-go/kimi-k3` (max), Nirvana → `opencode-go/grok-4.6` (xhigh), Dylan/Nas/band-members → Muse Spark (xhigh). Muse Spark and Grok 4.6 cap at `xhigh`; the rest support `max`.

### Verified gates and limitations

- The repository's documented gates are `bun test`, `bunx tsc --noEmit`, `bun run validate`, and `bun run build`; the handoff session also has the independent Beads probe and deterministic E2E coverage.
- AFT inspection repeatedly returned `PHASE-FAILED` with `inspect_not_fresh` (`diagnostics did not complete`) after LSP startup/quiescence. This is a tooling freshness limitation, not proof of a code failure; retry/investigate it next session.

### Next session

1. Retry and investigate the AFT `inspect_not_fresh` diagnosis.
2. Decide and test the remaining OpenCode↔Beads validation, without claiming live plugin-mediated lifecycle authorization or writes.
3. Review, commit, push, publish the new npm version, and update the local installation.

### Parked backlog

- Magic Context automatic-update/doctor failure and dependency-update checks.
- Periodic adapted-source checks.
- Beads TUI visualizer.
