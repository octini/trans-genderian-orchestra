# TGO Spec — Skill Curation

Status: **spec** (buildable). Source decision: `docs/wayfinder/decisions.md` (tgo-a6r.10). Inventory/audits: `docs/research/skill-sources-inventory.md`, `docs/research/style-skills.md`, `docs/research/concision-skills.md`.

## 1. Policy: "all batteries included" via curated bundle

Bundle as many genuinely useful skills as warranted — **count FLEXIBLE, 5 to 50** (15-20 was a rough starting sense, not a cap). Each bundled skill is individually **selected, ADAPTED, and token-pruned** (borrow-over-author; no wholesale forks).

## 2. Mechanics (what makes a big bundle affordable)

- **Progressive disclosure** (Deep Agents): skills expose only `SKILL.md` frontmatter at startup; bodies load on demand.
- **Per-seat grants**: skills attach to the seats that need them; other seats don't carry them.
- **Token discipline**: pruned bodies (caveman-micro lesson — 85 tokens beating 552).
- **Nothing load-bearing**: a missing skill never breaks the plugin; permissions/hooks enforce.

## 3. No shipped second-tier suite

No second-tier suite ships. Instead one thin **"works well with" docs page** listing compatible external suites (Matt's installed skills, superpowers, gsd) that TGO won't disable if present and whose per-seat grants TGO *enables* when available. Trim by design.

## 4. Six selection criteria

1. **Adopt by function, not by repo** — a skill ships only if a seat's mandate needs it AND no opencode-native tool covers it.
2. **Nothing load-bearing.**
3. **Skills-over-MCPs strictly** — if a skill covers the need, the MCP doesn't ship.
4. **Token discipline.**
5. **Borrow over author** — adapted, not forked.
6. **Per-seat grants.**

## 5. Split of labor

- magic-context and aft are **PLUGINS/TOOLS, not skills** → they belong to the MCP/tool decision (`docs/spec/mcp-permissions.md`), not the skill bundle.
- The concision/writing layer is a separate concern: `docs/spec/concision-enforcement.md`.
- The reflect/self-improvement loop may auto-file advisory skills via `bd remember` (see `docs/spec/features.md` §3) — advisory only, never load-bearing.
