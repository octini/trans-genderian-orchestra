# Changelog

All notable changes to TGO, in reverse chronological order. Versions track `plugin/package.json`.

## 0.1.2 — 2026-08-12

Docs-only release: the npm package page now carries the full documentation suite (README rewrite, docs/ pages, LICENSE, CHANGELOG). No code changes.

## 0.1.1 — 2026-08-12

- **Fixed:** the magic-context background historian now defaults to the active preset's Dylan model — the volume seat — instead of inheriting a judgment seat's model. The historian stays on the cheap workhorse rather than the expensive seats, and the volume seat's model is the one that matches actual context usage. (`09141ee`, released by `b2fba44`)

## 0.1.0 — 2026-08-12

Initial release. The scaffolded plugin, its config assets, and everything that made the shape real:

- **Thin core, four hooks.** Background Job Board injection (`experimental.chat.messages.transform`), session reconciliation (`session.status`/`idle`), task-fit rejection normalization (`tool.execute.after`), and the always-on concision transform (`experimental.chat.system.transform`), plus a `config` hook that applies the active preset at load.
- **The roster.** Five build-generated seats (Bernstein, Horowitz, Nas, Dylan, Nirvana + band members) with the 4-block prompt anatomy, the house-style fold, and the register dial. The Nirvana band wired end to end.
- **Beads-native work tracking.** Bernstein as single writer; each work-unit issue is a living spec with a boolean exit gate; the Background Job Board is a renderer over beads with a thin live-state shim.
- **Capabilities, not compliance.** Per-seat permission graph in seat frontmatter, global `todowrite` deny, `subagent_depth: 2`, step caps on the specialist seats, and the verification/read-only bash allowlists.
- **Presets.** balanced / cheap / frontier seat→model maps, applied at plugin load, switched at runtime by prose nudge, with partial overrides supported.
- **Deepwork mode.** Opt-in autonomous loop with hard bounds, checkpoint protocol, stagnation detection, and light/medium/heavy re-planning.
- **Installer.** Self-registers the plugin in `opencode.jsonc`; auto-installs beads, AFT, magic-context, and context7; configures magic-context end to end (historian + TUI sidebar); registers context7 as a hosted remote MCP; writes the background-subagents env export to the shell profile; merges existing config JSONC-tolerantly with a `.bak` backup.
- **Per-repo setup.** Auto-triggered on first session (beads init → `bd setup opencode` → AGENTS fragment), idempotent, no-clobber, zero user input.
- **Delegation watchdog.** Aborts hung or stalled delegated sessions and injects a WATCHDOG-ABORT marker into the parent; sleep-aware, background-tool exempt, progress-aware wall clock.
- **Skills.** The 13-skill advisory bundle with 15 per-seat grants.
- **Concision.** Enriched scrub list with concrete tell vocabulary, the no-fabrication rule, the clusters guard, and drift-protection tests; the wait-what ubiquitous-language fold; the prompt budget raised to 1000 tokens; balanced judgment seats moved to the updated V4 Pro.

## Related

- Spec docs: `docs/spec/` (canonical)
- Human pages: `docs/ARCHITECTURE.md`, `docs/ROSTER.md`, `docs/CONCISION.md`, `docs/SETUP.md`, `docs/WORKS-WELL-WITH.md`, `docs/CONTRIBUTING.md`
