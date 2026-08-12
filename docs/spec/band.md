# TGO Spec — Nirvana Band

Status: **spec** (buildable). Source decision: `docs/wayfinder/decisions.md` (tgo-a6r.12). Related ADRs: `docs/adr/0003-band.md`.

## 1. Invocation

The band fires **only** on:
- (a) Bernstein's judgment that a decision is high-stakes/ambiguous, or
- (b) user prose request ("run it by the band" / "run it by Nirvana").

Never default. No direct `@Nirvana` addressing (autonomy-first). Bernstein's prompt carries the routing rule: ordinary work → fitting specialist; judgment-heavy/ambiguous → band.

## 2. Lenses

Three judgment axes, chosen for efficacy — theming is naming only (prompt content comes from efficacy, not persona):

| Lens | Naming | Concern | Steer |
|---|---|---|---|
| **Risk** | Cobain | What breaks | bugs, edge cases, failure modes, security |
| **Structure** | Novoselic | Holds up over time | maintainability, boundaries, complexity |
| **Economy** | Grohl | Simplest thing that works | less, faster, minimal surface |

Each lens = a **~50-100 token steering paragraph**.

## 3. Reconciliation

Output contract:

- **Band Response** — the synthesized recommendation (what Bernstein acts on).
- **Per-lens details** — each lens's reasoning, for auditability.
- **Band Summary** — agreement/disagreement/unresolved uncertainty + confidence rating (unanimous / majority / split).

**Named-override rule:** on conflict, the synthesizer must state **which lens it overrode and why**; no averaging into mush; disagreement always surfaced.

## 4. Shape

- **Nirvana** = one registered subagent (the synthesizer): strongest model in the active preset, low temperature.
- Each **lens = a tool-less reasoning band-member subagent** (no tools — pure judgment), spawned in parallel via `task()` at depth 1: orchestrator(0) → nirvana(1) → lens(2), filling `subagent_depth: 2`.
- **Background-capable** on the Job Board so the band streams/parallelizes and Bernstein stays unblocked.

## 5. Ephemerality

Nirvana is **ephemeral: no beads issues** (user decision). Its output is a report that graduates to an issue only if Bernstein or the requester deems it warrantable. **Band Response lands in the beads work-unit's decision log** (Bernstein appends it as a note) + chat for the user — durable audit trail that matches the living-spec decision-log discipline, with no new file surface. (Decided 2026-08-05.)

## 6. Permissions

Nirvana + band members are **tool-less**. Nirvana's only tool is `task` → its band members. No AFT/magic-context recall for band seats.
