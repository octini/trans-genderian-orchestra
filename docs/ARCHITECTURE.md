# TGO Architecture

TGO is a **hybrid**: configuration owns the orchestra, and a thin plugin core enforces lifecycle and state. Routing, delegation, and seat behavior live in config — agent prompt files, a per-seat permission graph, and presets — while the plugin core provides exactly four runtime hooks. The plugin never reimplements control flow.

This page is the human-readable version of `docs/spec/architecture.md`; that spec, plus the ADRs, stays canonical.

## The shape

```
                      ┌────────────────┐
                      │      You       │
                      └───────┬────────┘
                              │
                ┌─────────────▼─────────────┐
                │         Bernstein         │
                │  plan · delegate ·        │
                │  reconcile · verify       │
            └──┬──────────────┬───────────────┬──┘
               │              │               │
        ┌──────▼──────┐  ┌────▼─────┐  ┌──────▼──────┐
        │    Dylan    │  │   Nas    │  │  Horowitz   │
        │ sole writer │  │ read-only│  │ review +    │
        │             │  │ lookup   │  │ advisor     │
        └─────────────┘  └──────────┘  └─────────────┘
        ┌────────────────────────────────────────────┐
        │                  Nirvana                   │
        │      tool-less band: 3 lenses + a          │
        │      synthesizer, for judgment-heavy calls │
        └────────────────────────────────────────────┘
```

Hub-and-spoke, with a single writer. Bernstein is the only seat that plans, delegates, reconciles, and verifies; Dylan is the only seat that writes files. Nas researches read-only, Horowitz reviews work that already exists, and Nirvana convenes for judgment-heavy or ambiguous calls. The five seats are documented in `docs/ROSTER.md`.

## The four hooks (and one load-time config hook)

Everything the plugin does in code fits in four runtime hooks, verified against `@opencode-ai/plugin` 1.18.13:

1. **Background Job Board injection** — `experimental.chat.messages.transform` + a `chat.message` gate. The board is a renderer over beads plus a thin live-state shim: four `bd` queries merged with genuinely-live state (streaming tasks), sentinel-tagged and strip-and-replaced every turn so it never accumulates.
2. **Session reconciliation** — `session.status` / `session.idle` / `session.compacted` events. Keeps the board's live-state shim consistent across busy/idle/retry transitions, compactions, and resumes.
3. **Task-fit rejection normalization** — `tool.execute.after` on the `task` tool. Turns a specialist's "this isn't my lane" rejection into a REROUTE-NOT-RETRY signal so Bernstein reroutes to the right seat instead of retrying the same one.
4. **Always-on concision transform** — `experimental.chat.system.transform`. Appends the house-style instruction to the primary loop's system prompt every turn. Subagent seats get the same ruleset folded into their prompts at build time; Bernstein has no fold slot, so he is never double-injected. See `docs/CONCISION.md`.

At plugin load, the `config` hook applies the active preset (seat→model/variant maps) and pre-approves `external_directory` reads for the project's worktree family. Presets are data, applied once per session — OpenCode's `task` tool takes no model parameter, so per-seat models are fixed at session start.

Two additional code paths sit outside the hooks: the **installer** (builds seats, writes the global config fragment, installs missing dependencies) and the **per-repo setup auto-trigger** on `session.created` (beads init + AGENTS fragment, idempotent and no-clobber). Both are documented in `docs/SETUP.md`.

## The delegation contract

Every delegation carries a **Five-part Spec**: Objective / Files / Interfaces / Constraints / Verification. Verification is the boolean exit gate — tests pass, lint clean — that must hold before Bernstein closes the issue. Specialists reply with a **structured report**: STATUS (complete / partial / blocked / escalate) · CHANGES · VERIFIED · GAPS.

Heavy state lives in files on disk, never pasted into context. The per-turn job board snapshot is the one thing injected into the prompt loop, and it is re-derived from beads each step — inherently cache-safe.

## Enforcement: capabilities, not compliance

The seat prompts carry a per-seat permission matrix in their frontmatter, enforced by opencode itself:

- Bernstein's frontmatter **denies** `edit`, `grep`, `glob`, `list`, and all `bash` except the verification allowlist; his `task` allowlist is exactly the four named seats.
- Nas has **zero** `bash` and zero `task` — findings return as structured reports or not at all.
- Dylan is the **only** seat with write access.
- Nirvana and the band members are tool-less (`"*": deny`).
- Globally, `todowrite` is denied and `subagent_depth: 2` caps delegation.

The point of the graph: the orchestrator cannot drift into doing, because it lacks the tools. Prompts only advise; the permission graph enforces. The full matrix is in `docs/spec/mcp-permissions.md`.

## State and work units

Beads is the work-unit store, and Bernstein is its single writer: he creates an issue before delegating, claims it at dispatch, and closes it only on verified completion. Specialists have zero beads surface. Each issue doubles as a **living spec** — explicit success criteria, bidirectional updates (implementation writes back what was built), a spec-review checkpoint before coding starts, and a decision log. This is the answer to context/alignment drift, the top failure mode in the orchestration literature.

The Background Job Board is a *renderer* over beads plus a thin live-state shim — one store, no drift. Details in `docs/spec/beads-integration.md`.

## Why this shape

The design decisions are recorded in the ADRs (`docs/adr/0001-shape.md` for the overall shape) and were stress-tested against the literature in `docs/research/architectural-review.md`:

- Orchestration costs ~15x the tokens of plain chat, so the plugin is token-frugal by construction: thin core, heavy state on disk, seat prompts under 1000 tokens.
- Verification breakdowns are 21.3% of failures (MAST), so every task has a boolean exit gate and the judger is a separate seat from the doer.
- Roughly 1 in 4 agent interactions produces a semantic conflict (SCF), and only pre-execution gating prevents cascading failure — hence capabilities-not-compliance.
- Doer/judger separation is the single highest-leverage change in the literature, so it is structural: Dylan writes, Bernstein verifies, Horowitz reviews.

## Related

- Spec: `docs/spec/architecture.md` (canonical), `docs/spec/beads-integration.md`, `docs/spec/mcp-permissions.md`, `docs/spec/features.md`
- ADR: `docs/adr/0001-shape.md`
- Research: `docs/research/architectural-review.md`, `docs/research/opencode-plugin-api.md`
- Human pages: `docs/ROSTER.md`, `docs/CONCISION.md`, `docs/SETUP.md`, `docs/WORKS-WELL-WITH.md`
