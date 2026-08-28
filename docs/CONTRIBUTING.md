# Contributing

TGO is a small codebase on purpose: a thin plugin core plus configuration assets. This page covers the dev workflow, the test commands, how to add a skill, and the seat-prompt budget that keeps the whole thing lean.

Work is tracked in beads (`bd`), not markdown TODOs. These are contributor-side CLI commands, not operations performed by the current plugin: check `bd ready` for available work, claim with `bd update <id> --claim`, close with `bd close <id> --reason "..."`, and use `bd create` to file new issues. Link discovered work with `--deps discovered-from:<parent-id>`. Bernstein-owned create/claim/close lifecycle integration remains follow-up work. Board reads do not authorize lifecycle actions; bd init --directory is unsupported, bd -C fails, must use .cwd(directory). Plugin remains metadata-only (beadsLifecycle.allowed:false) until host boundary validated.

## Layout

```
plugin/ (not exhaustive)
  src/            thin core: plugin.ts (hooks), config.ts (zod schema),
                  build.ts (template renderer), permissions.ts, board.ts,
                  concision.ts, session.ts, fit.ts, setup.ts, install.ts,
                  deps.ts, validate.ts, watchdog.ts, presets.ts
  assets/
    agents/       seat prompt templates (bernstein, horowitz, nas, dylan,
                  nirvana + band members) — 4-block anatomy, house-style
                  fold slot, permission-graph frontmatter
    house-style.md        style fragment folded into subagent seats at build
    concision-instruction.md  runtime payload appended to the primary loop
    AGENTS.fragment.md    thin advice layer merged into global AGENTS.md
    presets.json          seat→model maps (balanced/cheap/frontier) — data
    skills/               the advisory skill bundle (<name>/SKILL.md)
  schema/tgo.config.schema.json   JSON schema for plugin options
  test/           per-module tests (config, build, permissions, board,
                  concision, session, fit, deps, setup)
docs/ (not exhaustive)     human-readable pages; docs/spec/ stays canonical
```

## Commands

Run everything from `plugin/`:

```bash
bun install
bun run validate      # schema + presets + rendered seat-prompt budget (fails hard)
bun run build         # render seat prompts; pass --outDir <dir> to write
bun test              # budget + schema + build + hook tests
bunx tsc --noEmit     # typecheck
bun run setup --configDir <dir>   # build + install (defaults to ~/.config/opencode/)
```

The exit gates for any change: `bun test` green, `bunx tsc --noEmit` clean, `bun run validate` clean. A change that touches the concision layer also has drift-protection pins to satisfy — see below.

## The seat-prompt budget

Seat prompts are capped at **<1000 tokens, body only** — frontmatter is config, not prompt, and is excluded from the count. The budget is enforced:

- **At install and by `validate`** — hard failure. `assertPromptUnderBudget` in `src/config.ts` throws when a rendered seat exceeds `MAX_PROMPT_TOKENS` (1000).
- **At plugin load** — a re-check against the rendered seats in the config dir `agent/` that **warns, never throws**: a throwing plugin factory makes opencode silently drop the whole plugin, so load-time stays non-fatal. Hand-edited seats that exceed the budget get a warning, not a crash.

The budget counts only seat prompts. The runtime concision payload (~480 tokens) is separate — it appends to the primary loop's system prompt and is not a seat prompt.

## How the build works

`bun run build` renders the seat prompts from `assets/agents/*.md` templates. Two folds matter:

- `{{TGO_HOUSE_STYLE}}` — folds `assets/house-style.md` into every **subagent** seat (Horowitz, Nas, Dylan, Nirvana, band members). Bernstein has **no** fold slot: he is the primary loop and gets the style at runtime via hook #4, so folding him would double-inject.
- `{{TGO_REGISTER}}` — renders the config `register` value (`"concise" | "natural"`) into the fragment's register line, so the seat-default register is baked in at build time.

The rendered output is what the token budget validates. After changing a template, run `bun run build --outDir <dir>` and check the rendered files.

## Adding a skill

Skills are advisory only — nothing load-bearing. A missing skill never breaks the plugin; permissions and hooks enforce behavior. To add one:

1. **Adapt, don't fork.** TGO borrows over authoring: skills are selected, adapted, and token-pruned from the sources documented in `docs/research/skill-sources-inventory.md`. Bodies are pruned hard, but the shipped bundle's real bodies run ~90–1300 tokens.
2. **Create `plugin/assets/skills/<name>/SKILL.md`** with progressive disclosure: only `SKILL.md` frontmatter loads at startup; bodies load on demand.
3. **Grant it per seat** via `permission.skill` pattern objects (`"*": deny` + named allows) in the seat frontmatter of `assets/agents/*.md`. Grants are per-seat, never global — seats carry only the skills their mandate needs.
4. **Update `validate` if needed** — `bun run validate` enforces the rendered budget and the permission graph, including skill grants.
5. **Keep it advisory.** If a skill's function becomes load-bearing, it belongs in the plugin core or the spec, not in a skill.

The current bundle is 13 skills / 15 per-seat grants, plus `tgo-setup` (the non-load-bearing setup skill, 14 total in the config dir). The full grant map is in `docs/spec/skill-candidates.md`.

## Concision drift protection

The always-on concision layer is pinned by tests so it can't silently bloat or strip back:

- `test/concision.test.ts` pins (a) a token band for the runtime payload (300–500) and a 250-token ceiling for the fold, and (b) content pins for the specific tell vocabulary, the no-fabrication rule, the clusters guard, and the diff-anchored tell.
- `test/build.test.ts` pins the seat-token budget for both registers.

A change that pushes the payload out of band or removes a pinned rule breaks CI on purpose. See `docs/CONCISION.md` for what the layer does.

## Docs

- The spec docs under `docs/spec/` stay canonical; the human pages in `docs/` and the README are reformulations. When behavior changes, update the spec first, then the human pages.
- `README.md` at the repo root is mirrored byte-for-byte into `plugin/README.md` (the npm readme). Edit one, copy to the other — the two must stay identical.
- Cross-links between human pages and their spec sources should resolve to real paths.

## Releasing

The changelog (`CHANGELOG.md`) is human-readable and versioned. Version-bump locations: `plugin/package.json`, `README.md` (badge + plugin tuple), `plugin/README.md` (kept as an identical copy of README.md), `docs/SETUP.md` (version references), plus the `CHANGELOG.md` entry (current `0.2.1`). Bump versions, add the changelog entry, and commit with the `chore(release): bump X -> Y (short summary)` pattern. Release gate: `bun test` green, `bunx tsc --noEmit` clean, `bun run validate` clean. Publish is handled separately — no CI, no release automation in this repo.
