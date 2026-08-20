# Setup

TGO installs in two layers: a **global install** (the plugin, seat prompts, config, and engine dependencies in `~/.config/opencode/`) and a **per-repo setup** (the beads work-unit store and the AGENTS advice fragment in each repo you work in). The per-repo step is auto-triggered; the global install is the one place you have choices.

This page is the human-readable version of `docs/spec/setup.md`; that spec stays canonical. Setup can attempt host-supported `bd` commands, but this does not provide plugin-mediated Beads lifecycle support. Board reads do not authorize lifecycle actions; bd init --directory is unsupported, bd -C fails, must use .cwd(directory). Plugin remains metadata-only (beadsLifecycle.allowed:false) until host boundary validated.

## Global install

Single `opencode plugin add trans-genderian-orchestra` gives both surfaces — board (server) + sidebar (TUI) — no second install. One npm package exposes both via dual-package exports since v0.1.5+ (`exports "./server" → "./dist/server.js"`, `"./tui" → "./dist/tui.js"`); peers `solid-js`, `@opentui/solid`, `@opentui/core` are host-resolved externals. Interactive TUI sidebar (order 450) added in 0.1.6 — 0.1.5 shipped the dual exports and the renderer-only `tgo_beads_snapshot` tool, not the live sidebar.

```bash
opencode plugin add trans-genderian-orchestra
```

Manual `opencode.jsonc` entry also works — the npm path:

```json
{ "plugin": ["trans-genderian-orchestra@0.1.6"] }
```

OpenCode installs the package and its dependencies. A blank-slate install ends up with the plugin loaded, not just config files on disk. The plugin registers itself in both `opencode.jsonc` (server) and `tui.jsonc` (TUI) — one `trans-genderian-orchestra` entry covers both surfaces, no second install.

For more control, run the installer from a checkout:

```bash
git clone https://github.com/octini/trans-genderian-orchestra
bun install
bun run setup --configDir <dir>   # defaults to ~/.config/opencode/
```

The installer builds the seat prompts from templates, writes the global config fragment, auto-installs missing engine dependencies, and self-registers the plugin in your global `opencode.jsonc`.

Installer flags:

- `--deps auto | check | skip` — auto (default) checks presence and installs anything missing; `check` only reports; `skip` leaves the dependency layer alone.
- `--no-register` — don't self-register in `opencode.jsonc` (e.g. you're wiring the plugin by hand).
- `--register <module>` — register a different module or path.
- `--no-bg` — don't write the background-subagents env export to your shell startup file.

The installer is idempotent — re-running never duplicates entries.

### TUI ordering & Todo coexistence

`tui.jsonc` is the TUI surface: OpenCode's TUI loads external plugins only from `tui.json`/`tui.jsonc` (the `TuiConfig.pluginOrigins` list), never from `opencode.jsonc`. The Beads sidebar registers at `order: 450` in `tui.jsonc` — between the built-in Todo panel at `400` and Modified Files at `500` — via `slots.register({ order: 450, slots: { sidebar_content } })` with the default `append` mode, so it coexists with Todo rather than replacing it.

To replace the built-in Todo panel instead of coexisting, disable it in `tui.jsonc`:

```jsonc
{ "plugin_enabled": { "internal:sidebar-todo": false } }
```

This hides Todo while keeping the Beads sidebar at 450; remove the flag to restore Todo alongside Beads.

### Lean & peer externals

Lean (0 LLM tokens): `grep -c slots.register plugin/dist/server.js` ==0 and `grep -c experimental.chat plugin/dist/tui.js` ==0 — server has no TUI slots, TUI has no chat hooks. Validated by `plugin/src/build.ts` and CI. `plugin/dist/server.js` and `plugin/dist/tui.js` are separate bundles with shared externals (`solid-js`, `@opentui/solid`, `@opentui/core`, `@opencode-ai/plugin`, `@opencode-ai/plugin/*`) left host-resolved (not bundled), so they share peers without duplication.

### The two load paths

1. **npm** — add `"trans-genderian-orchestra@0.1.6"` to the `plugin` array of `opencode.jsonc`. OpenCode installs the package and its dependencies automatically.
2. **Local plugin** — symlink or copy `src/plugin.ts` into `~/.config/opencode/plugins/`. Seat prompts are auto-discovered from `~/.config/opencode/agent/` (opencode scans both `agent/` and `agents/`).

### What the installer writes

- **Seats** — rendered prompt `.md` files in `~/.config/opencode/agent/` (the build folds the house-style fragment and the register line into each subagent seat; see `docs/CONCISION.md`).
- **Global config fragment** in `opencode.jsonc` — `subagent_depth: 2`, `permission.todowrite: "deny"`, `default_agent: "bernstein"`, and `compaction: { auto: false, prune: false }` when magic-context is installed (magic-context disables itself while opencode's built-in compaction is on). OpenCode loads config in order `config.json` → `opencode.json` → `opencode.jsonc` and the last file wins for the `plugin` array, which is why TGO writes there. An existing JSONC file is merged leniently; a genuinely unparseable one is backed up to `opencode.jsonc.bak` before a fresh fragment is written — never silently clobbered.
- **Dependencies** — beads (`bd` CLI), AFT, magic-context, context7. Magic-context is registered on both surfaces (the `ctx_*` server tools in `opencode.jsonc` and the TUI sidebar in `tui.json`/`tui.jsonc`), with the historian on the active preset's Dylan model; context7 is registered as a hosted remote MCP (`mcp.context7 = { type: "remote", url: ... }`) because its own `npx ctx7 setup --opencode` is an interactive TUI that can't run under a non-interactive installer.
- **Shell startup file** — an idempotent marker block exporting `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true` (needed for the Nirvana band's parallel lens spawns; the env var must be present at opencode start, and opencode has no `env` config key). The same block exports `OPENCODE_ENABLE_EXA=true` so opencode's built-in `websearch` uses the Exa provider. Opt out with `--no-bg`; skipped automatically when the var is already set. Restart opencode after install.

## Per-repo setup (auto-triggered)

The plugin watches `session.created` (primary sessions only) and runs per-repo setup on first contact with a repo — the same pattern as `bd prime`'s auto-initialization:

- `bd init` and `bd setup opencode` are attempted from the target repository when the host provides `bd` (the CLI is auto-installed if configured). Exit code, stdout, and stderr are retained; a nonzero command is a failed setup result.
- The official `bd setup opencode` managed Beads block is installed only after that command succeeds.
- The current plugin does not perform issue reads, create, claim, close, reopen, recovery, or authorization. `bd init --directory` is unsupported; host-mediated lifecycle validation remains future work.
- TGO's thin AGENTS.md advice fragment is merged in — no-clobber, so existing content is preserved.

Guardrails, all of them: **no-clobber** (existing AGENTS.md/user content is preserved), **idempotent + per-repo marker** (a repo with `.beads/` and both markers is never re-touched), **granular** (`bd init` only runs when `.beads/` is absent), and **zero user input** (defaults: tracker → beads, labels → default triage, monorepo → auto-detect). Personal choices are deferred, not required. These guardrails do not authorize lifecycle writes.

The `tgo-setup` skill (`skills/tgo-setup/SKILL.md`, copied into the config dir at install) documents the same steps and offers the manual path.

### Controlling it

Via the plugin config:

```jsonc
["trans-genderian-orchestra", {
  "setup": { "enabled": false }             // disable the auto-trigger entirely
  // "setup": { "autoInstallBeads": false } // report a missing bd CLI instead of installing it
}]
```

## Verifying the install

### Beads snapshot (renderer-only, 0.1.5)

For a one-shot terminal view, invoke the `tgo_beads_snapshot` OpenCode tool from a primary session. It shows ready, open, pending, in-progress, and blocked work with dependency edges. This is a read-only renderer snapshot added in 0.1.5, not the interactive TUI; it does not authorize lifecycle actions. `plugin/src/tui.ts` remains the implementation detail for the loader and renderer. The interactive sidebar at `order 450` in `tui.jsonc` was added in 0.1.6.

### Sidebar graceful states & debug

The interactive sidebar (added in 0.1.6, at `order 450` in `tui.jsonc`) degrades without throwing:

- **No `.beads/` directory** → sidebar renders nothing (no panel, no error) — the repo has no work-unit store.
- **`bd` missing from `PATH` (`ENOENT`)** → sidebar treats beads as unavailable (shows empty/unavailable, `bd not found on PATH` on mutate) rather than crashing.
- **Manual refresh** → `beads.refresh` (`bd-refresh`) re-reads beads now; `beads.focus`/`beads.unfocus` pin per-session epic scope.

For tracing, set the debug sink:

```bash
BEADS_SIDEBAR_DEBUG=/tmp/beads-sidebar.log opencode
```

The sidebar appends `refresh` / `pin` / `signature` lines with ISO timestamps to that file (`src/sidebar/debug.ts`); unset (default) stays silent.

- **Register + concision are live:** check the installed seats (`~/.config/opencode/agent/dylan.md`) for the house-style block and the "present in *register* mode by default" line — that's the register that took effect at install.
- **The runtime concision hook is firing:** start opencode with `TGO_DEBUG_EVENTS=1`; the log line `event concision.appended <session-id> {"register":"concise"}` appears each time the instruction is injected into a primary session's system prompt. Absence of the line means the hook isn't firing.
- **Plugin diagnostics** route through `client.app.log()` (service `tgo`) — never `console.log`, which would land in the TUI's stdout stream. `TGO_DEBUG_EVENTS=1` traces events through the same structured log.

## Troubleshooting

| Symptom | What's going on | Fix |
|---|---|---|
| Plugin doesn't load after install | The plugin entry may be in the wrong config file (a later file wins the `plugin` array merge), or a hand-edited seat exceeded the token budget — the load-time check warns rather than throws, but a throwing factory would silently drop the whole plugin | Check `opencode.jsonc` has `trans-genderian-orchestra` in `plugin`; check `~/.config/opencode/agent/*.md` bodies stay under 1000 tokens |
| Background band spawns fail | `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS` wasn't set at opencode start | Confirm the marker block in `~/.zshrc` / `~/.bashrc` / fish `conf.d`, then restart opencode |
| Magic-context sidebar doesn't mount | OpenCode's TUI loads plugins only from `tui.*` files, never from `opencode.jsonc` | Confirm the magic-context entry is registered in `tui.json`/`tui.jsonc` (the installer does this) |
| Per-repo setup never runs | The auto-trigger fires on primary `session.created` events only, and only when the repo is new to you | Check `setup.enabled` in the config; run the manual path via the `tgo-setup` skill |
| Config got corrupted somehow | The installer backs up before overwriting | Look for `opencode.jsonc.bak` in the config dir |
| A model override didn't take effect | Per-seat models are fixed at session start (OpenCode's `task` tool takes no model parameter) | Change the preset/override and start a new session |

## Related

- Spec: `docs/spec/setup.md` (canonical), `docs/spec/mcp-permissions.md` (dependencies), `docs/spec/beads-integration.md` (the work-unit store)
- Human pages: `docs/ARCHITECTURE.md`, `docs/CONTRIBUTING.md`
