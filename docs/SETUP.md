# Setup

TGO installs in two layers that sound more complicated than they are. There’s the **global install** — the plugin itself, the seat prompts, the config, and the little engine dependencies that live under `~/.config/opencode/` — and then there’s the **per-repo setup** that makes any ordinary folder feel like a beads-backed workspace. The first one you do once, by hand. The second one happens on its own, the moment you actually say something.

This page is the human-readable version of `docs/spec/setup.md`; the spec stays canonical. If the two disagree, the spec wins — but this page is where the mechanics are easiest to follow.

## The global install — one command, both surfaces

You don’t need to install two things or wire two configs. A single `opencode plugin trans-genderian-orchestra -g` gives you everything:

```bash
opencode plugin trans-genderian-orchestra -g
```

Under the hood that’s one npm package (`trans-genderian-orchestra@0.3.0`) with dual-package exports since v0.1.5 — `"./server" → "./dist/server.js"` for the board that lives in chat, and `"./tui" → "./dist/tui.js"` for the sidebar you see on the right. The host-resolved peers (`solid-js`, `@opentui/solid`, `@opentui/core`) are shared, not bundled twice. On the server the plugin hooks `experimental.chat.messages.transform` and `experimental.chat.system.transform` in `dist/server.js`; in the TUI it calls `slots.register` at `order 450` in `tui.jsonc` (right between the built-in Todo at `400` and Modified Files at `500`) in `dist/tui.js`. The interactive sidebar itself arrived in 0.1.6 — 0.1.5 shipped the dual exports and the renderer-only `tgo_beads_snapshot` tool, not the live sidebar.

If you’d rather declare it explicitly, the manual `opencode.jsonc` form works just as well:

```json
{ "plugin": ["trans-genderian-orchestra@0.3.0"] }
```

OpenCode installs the package and its peers. Restart opencode and you’re globally ready. That’s the whole manual step — everything else is lazy.

For a checkout-based install you can also run:

```bash
git clone https://github.com/octini/trans-genderian-orchestra
bun install
bun run setup --configDir <dir>   # defaults to ~/.config/opencode/
```

The installer builds the seat prompts from templates, writes the global config fragment (the `subagent_depth`, `permission.todowrite`, `default_agent`, and — when magic-context is present — `compaction: { auto:false, prune:false }` dance), auto-installs any missing engine dependencies, and self-registers the plugin in your global `opencode.jsonc`. It’s idempotent — re-running never duplicates entries — and it’s careful about not clobbering a hand-edited JSONC file. If it truly can’t parse what you’ve got, it backs the file up to `opencode.jsonc.bak` first.

A few flags you might reach for:

- `--deps auto | check | skip` — `auto` (the default) checks presence and installs what’s missing; `check` only reports; `skip` leaves the dependency layer alone.
- `--no-register` — don’t self-register in `opencode.jsonc` (for when you’re wiring the plugin by hand).
- `--register <module>` — register a different module or path instead.
- `--no-bg` — don’t write the `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS` export to your shell profile.

A local-plugin path also exists for quick iteration: symlink or copy `src/plugin.ts` into `~/.config/opencode/plugins/`, then run the installer for the config assets. The seat prompts are auto-discovered from `~/.config/opencode/agent/` (opencode scans both `agent/` and `agents/`).

### TUI ordering — why it sits where it does

` tui.jsonc` is the TUI’s world: OpenCode’s TUI loads external plugins only from `tui.json`/`tui.jsonc` (`TuiConfig.pluginOrigins`), never from `opencode.jsonc`. TGO registers its sidebar at `order: 450` via `slots.register({ order: 450, slots: { sidebar_content } })` in the default `append` mode, so it coexists with Todo instead of replacing it. If you do want Todo hidden, that’s a one-liner in `tui.jsonc`:

```jsonc
{ "plugin_enabled": { "internal:sidebar-todo": false } }
```

Remove the flag and Todo comes back alongside Beads.

### How you know it’s lean

A quick receipt you can run any time:

```
grep -c slots.register plugin/dist/server.js  # → 0 — server never touches TUI slots
grep -c experimental.chat plugin/dist/tui.js  # → 0 — TUI never touches chat hooks
```

`plugin/src/build.ts` and CI enforce that separation; the two bundles share the same externals (`solid-js`, `@opentui/solid`, `@opentui/core`, `@opencode-ai/plugin`, `@opencode-ai/plugin/*`) without duplication.

### What the installer writes, concretely

- **Seats** — rendered `.md` files in `~/.config/opencode/agent/` (the house-style fragment and the `present in … mode by default` register line are folded in — see `docs/CONCISION.md`).
- **Global config fragment** in `opencode.jsonc` — the last file opencode loads (`config.json → opencode.json → opencode.jsonc`), which is why TGO writes there. It carries `subagent_depth: 2`, `permission.todowrite: "deny"`, `default_agent: "bernstein"`, `sessionReuse {enabled:true, maxContextTokens:100000}`, `termination {enabled:true}` — installer-managed defaults (`sessionReuse {enabled:true, maxContextTokens:100000}`, `termination {enabled:true}`) — and compaction off when magic-context is present (magic-context quietly disables itself while opencode’s built-in compaction is on).
- **Dependencies** — beads (`bd` CLI), AFT, magic-context, context7. Magic-context lands on both surfaces (`ctx_*` server tools plus the TUI sidebar, with its historian on the active preset’s Dylan model); context7 registers as a hosted remote MCP (`mcp.context7 = { type: "remote", url: "https://mcp.context7.com/mcp" }`) because its own `npx ctx7 setup --opencode` is an interactive TUI that can’t run non-interactively.
- **Shell profile** — an idempotent marker block exporting `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true` (the Nirvana band’s parallel lenses need it at process start; opencode has no `env` config key) and `OPENCODE_ENABLE_EXA=true` so `websearch` uses Exa. Opt out with `--no-bg`, and it’s skipped automatically when the variable is already set. Restart opencode after install.

## Per-repo setup — the first real sentence does it

Here’s the part that feels almost too simple: make an empty folder however you like, open opencode in it, and say something real. No slash command needed.

```bash
mkdir ~/opencode/diceproject
cd ~/opencode/diceproject
opencode
```

Now try a first prompt that means something:

> build me a simple D&D dice roller CLI — `dice 2d6+3` should roll two six-sided dice, add three, and print each die plus the total. keep it tiny, with a quick test I can run.

That first prose is the trigger. While Bernstein starts thinking through the dice roller, TGO is already running per-repo setup concurrently in the background — `bd init` and `bd setup opencode` from the target directory when the `bd` CLI is available (auto-installed if you left `autoInstallBeads` on), with exit code, stdout, and stderr retained so a non-zero result is reported as a failed setup rather than silently accepted. Then the thin `AGENTS.md` advice fragment is merged in without clobbering anything you already had.

You didn’t run `/init` or `/tgo-setup`. The directory didn’t need to be created with `mkdir` specifically — creating it in Finder works, and reusing a cleaned-out folder you’d emptied earlier works too. Any empty folder that becomes your worktree qualifies. The setup is lazy — it doesn’t run at `opencode` launch — and it runs concurrent with that very first LLM turn, so you don’t sit and watch it. By the time Bernstein answers, `.beads/` and the `AGENTS.md` markers are usually already there.

### How the trigger is that forgiving

TGO is deliberately generous about when it fires, because the host doesn’t always tell the same story the same way:

- **Primary path: `session.created`.** The plugin’s `handleSessionCreated` at `plugin/src/plugin.ts:168` only runs for primary sessions. The guard is `if (info.parentID != null) return;` — that loose `!= null` catches both `null` and `undefined`, which matters because some hosts leave `parentID` undefined rather than null. It also prefers the session’s own `directory` but falls back to the plugin’s worktree directory when the event doesn’t carry one, and it bails cleanly on `"/"` so a stray global session never tries to `bd init` your home directory.
- **Fallback: `chat.message`.** If the `session.created` event was missed or arrived before the plugin could act, the fallback at `plugin/src/plugin.ts:287` runs on the next user message. It re-checks `parentID` via `client.session.get` — again with `parentID == null` as the “is primary” test — and calls the same `SetupController.maybeSetup`. That’s why a brand-new folder only needs prose; a slash isn’t required to get its attention.

Either way, deduplication lives in one place: `SetupController` in `plugin/src/setup.ts` keeps an in-memory `attempted` set and marks the directory at the *top* of `maybeSetup` (before awaiting anything). Two near-simultaneous messages — like the first prose and the background setup racing the LLM — can’t both trigger a second `bd init`. And `needsSetup` is granular: `bd init` only runs when `.beads/` is actually missing, `bd setup opencode` only when the `BEGIN BEADS INTEGRATION` block isn’t in `AGENTS.md`, and the TGO `AGENTS` fragment only when its own markers aren’t present. An empty folder gets all three; a folder that already has `.beads/` but lost its `AGENTS.md` marker only gets what’s missing.

### Guardrails that keep it polite

- **No-clobber.** Existing `AGENTS.md` content is preserved; the Beads block and the TGO block are merged in, never overwritten.
- **Idempotent + per-repo.** A repo that already has `.beads/` and both markers is never re-touched.
- **Granular.** Each of the three steps is conditional on its own signal (`.beads/` presence, Beads block, TGO markers) rather than a single “inited” flag.
- **Zero user input.** Tracker → beads, labels → default triage, monorepo → auto-detected (single-context). Personal choices are deferred, not required.
- **Host-honest.** `bd init --directory` remains unsupported and `bd -C` still fails with `cannot use -C directory …: no beads project found` — setup uses `.cwd(directory)` from the target repository and reports what the subprocess actually did. Board reads don’t authorize lifecycle writes — the plugin stays metadata-only (`beadsLifecycle.allowed: false`) until host-mediated lifecycle is proven.

The `tgo-setup` skill at `skills/tgo-setup/SKILL.md` (copied into the config dir at install) documents the same steps and offers the manual path if you ever want it.

### If you want to control it

In your plugin entry:

```jsonc
["trans-genderian-orchestra", {
  "setup": { "enabled": false }             // turn the whole auto-trigger off
  // "setup": { "autoInstallBeads": false } // ask to report a missing bd instead of installing it
}]
```

## Seeing that it worked

### The sidebar that just works

The Beads sidebar at `order 450` refreshes on its own. You don’t need to run `/bd-refresh` — it polls every `1500 ms` (`POLL_MS` in `plugin/src/sidebar/tui.tsx:20`), but it doesn’t shell out on every tick. Instead it keeps a cheap signature of the `.beads` directory (`plugin/src/sidebar/bd.ts` walks `.beads` for `mtime` + entry count) and only re-reads Beads when that signature changes. An idle repo costs one `stat` per tick and zero subprocesses. After you create or update a bead, or after that first prose-driven `bd init` lands, the panel typically catches up within about 1.5 seconds — well under two seconds in practice.

When there’s no epic to hang a plan off, the fallback path at `plugin/src/sidebar/scope.ts:93` runs `bd list --all` (filtered of `epic`/`molecule` containers) so open and in-progress work still shows up right away, ranked with `in_progress` on top. If you pinned an epic with `/bd-focus` (`beads.focus`, slash name `bd-focus`), `/bd-unfocus` (`beads.unfocus`, slash `bd-unfocus`) clears the per-session pin (`kv` key `beads.focus.<sessionID>` set to `""`) and the view falls back to following whichever bead was last touched.

The panel is also kind about unhappy states:

- No `.beads/` yet → it renders nothing (no panel, no error).
- `bd` not on `PATH` (`ENOENT`) → it treats beads as unavailable rather than crashing.

### A one-shot snapshot if you prefer the terminal

From any primary session you can invoke the renderer-only tool `tgo_beads_snapshot` for a plain-text table. It reads `bd list --status in_progress`, `--status open`, `--status pending`, `bd ready`, and `bd blocked` (covered in `plugin/src/tui.ts`), merges them into columns, and renders immediately. It’s read-only — no lifecycle writes — and it refuses to run from a subagent session (`isPrimarySessionData` checks `parentID` strictly as `=== null` there).

### Graceful states & debug

The palette also exposes the rest of the mutate path if you want it: `beads.start` (`bd-start`), `beads.close` (`bd-close`), `beads.reopen` (`bd-reopen`), and the explicit `beads.refresh` (`bd-refresh`) for when you want to force a re-read now. Focus state is per-session; unfocused, the panel auto-follows `last-touched`.

When you want to watch the plumbing:

```bash
BEADS_SIDEBAR_DEBUG=/tmp/beads-sidebar.log opencode
```

The sidebar appends `refresh` / `pin` / `signature` lines with ISO timestamps to that file (`src/sidebar/debug.ts`); unset, it stays silent.

Two other checks people find useful:

- **Register + concision are live:** peek at `~/.config/opencode/agent/dylan.md` for the house-style block and the `present in *register* mode by default` line — that’s the register that took effect at install (`register` in `plugin/src/config.ts:78`, default `"concise"`).
- **The runtime concision hook is firing:** start opencode with `TGO_DEBUG_EVENTS=1`; the line `event concision.appended <session-id> {"register":"concise"}` appears each time the instruction is injected. No line means the hook isn’t firing.
- **The version check ran:** look for `TGO update available: installed < npm — self-update will refresh cache on restart; if slot stuck: rm -rf ~/.cache/opencode/packages/trans-genderian-orchestra* and restart (opencode plugin --force is a no-op against exact-pinned slots tgo-6m6)` in the structured `tgo` log stream. The check itself is `plugin/src/version.ts:checkVersionDrift` (3 s timeout, behind `config.checkVersion` defaulting to `true`).

Plugin diagnostics, by the way, go through `client.app.log({ service: "tgo" })` — never `console.log`, which in opencode 1.18.15 leaked into the TUI’s input box. `TGO_DEBUG_EVENTS=1` traces events through the same structured log.

## Troubleshooting, plainly said

| What you’re seeing | What’s actually going on | What to try |
|---|---|---|
| Plugin doesn’t load after install | The plugin entry may be in the file the loader doesn’t win with, or a hand-edited seat pushed past the 1,000-token budget — the load-time check warns rather than throws (a throwing factory would make opencode silently drop the whole plugin). | Check that `opencode.jsonc` — the last file opencode loads — contains `trans-genderian-orchestra` in `plugin`; check that `~/.config/opencode/agent/*.md` bodies stay under 1,000 tokens |
| Background band spawns fail | `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS` wasn’t set when opencode started | Confirm the marker block in `~/.zshrc` / `~/.bashrc` / fish `conf.d`, then restart opencode |
| Magic-context sidebar doesn’t mount | The TUI only looks at `tui.*` files, never `opencode.jsonc` | Confirm the magic-context entry is in `tui.json`/`tui.jsonc` (the installer does this) |
| Per-repo setup never ran | The auto-trigger only fires for primary sessions, and only when the repo is actually new to you — but you do need to say something first (prose, not a slash alone); slashes bypass the fallback on purpose so `/` doesn’t try to init `/` | Check `setup.enabled` in the plugin entry; say something ordinary (“hello, set up this repo” is enough); or run the manual path via the `tgo-setup` skill |
| Config feels corrupted | The installer backs up before overwriting | Look for `opencode.jsonc.bak` in the config dir |
| A model override didn’t take effect | Per-seat models are fixed at session start (OpenCode’s `task` tool takes no model parameter) | Change the preset/override and start a new session |

## Where this sits among the rest of the docs

- Spec (canonical): `docs/spec/setup.md`, `docs/spec/mcp-permissions.md` (dependencies), `docs/spec/beads-integration.md` (the work-unit store)
- Human pages: `docs/ARCHITECTURE.md`, `docs/CONTRIBUTING.md`
- Heads-up on updates: `CHANGELOG.md` (and that gentle `checkVersion` warning from `plugin/src/version.ts` when you’re behind)
