# TGO Spec — MCP / Tools & Per-seat Permission Matrix

Status: **spec** (buildable). Source decisions: `docs/wayfinder/decisions.md` (tgo-a6r.16, tgo-a6r.17, tgo-a6r.18). Related ADRs: `docs/adr/0004-bundling.md`.

## 1. Dependencies (pinned)

- **AFT + magic-context = FULL dependencies (do not adapt).** Their value IS the engine — AFT's symbol-aware tree-sitter tooling, magic-context's historian/dreamer/recall pipeline. There is no thin stable wrapper to own; "adapting" would re-wrap a fast-moving engine.
- **beads = make our own opencode-side wrapper** over the `bd` engine (see `docs/spec/beads-integration.md`). The `bd` CLI + Dolt DB stays an engine dependency.
- **context7 = the one external MCP** (decided 2026-08-05, deep-dive): remote 2-tool server (`https://mcp.context7.com/mcp`), granted to **Nas + Dylan**. Token-cheap, no local process; CLI+Skills fallback noted. Free key auto-generated at `npx ctx7 setup --opencode`. Context: all frameworks converge on context7 for docs lookup (gsd/slim/bmad); no framework ships a websearch MCP (native Exa `websearch` wins).
- **Installer auto-installs missing dependencies** (beads, AFT, magic-context, context7) — checks presence, fetches/installs if absent, as part of TGO's own setup.
- Native feel is achieved via the **permission graph**: `aft_*` / `ctx_*` / `ctx7_*` tools become grantable/deniable per seat exactly like skills.
- **Revisit only if** a magic-context feature becomes load-bearing for TGO's core loop — then define a thin interface around it, not a re-wrap. Today memory is "supporting," not core.
- **Lost from consideration:** gh_grep (websearch approximates), MemPalace MCP + oh-my-pi memory tools (magic-context owns memory), ruflo monolithic MCP (against skills-over-MCPs).
- **Dropped (tgo-a6r.20):** slim's enhanced webfetch (llms.txt probing, content extraction, secondary-model summarization). Native OpenCode webfetch + the concision layer cover the value; the plugin never reimplements host tools.

## 2. Bundling split (final)

- bundle small (beads: own wrapper), depend on large (AFT, magic-context whole plugins).
- Listed on the "works well with" docs page.

## 3. Permission FRAMEWORK

This is the framework + per-seat constraints + grant *guidance*, **not a final inventory** — specific skill/tool/MCP names (context7, review skill, etc.) are deferred until the lineup is real (consistent with the flexible skill count and "adopt by function"). AFT + magic-context are the only pinned names.

### Per-seat matrix

| Seat | Deny | Allow | Tools/task | Notes |
|---|---|---|---|---|
| **Bernstein** | `edit`/`grep`/`glob`/`list`; bash except allowlist | `read`/`websearch`/`skill`; **bash = verification allowlist** (`git diff`/`status`, lint, test) + **`bd` CLI commands** (create/update/close/dep/label/list/show/remember) | `task` → Horowitz/Nas/Dylan/Nirvana | skills = structure+grammar sliders |
| **Horowitz** | `edit`; bash except allowlist | **bash = read-only investigate allowlist** (`git log/show/status`, log/process/file inspection) | `task` → built-in `explore` only | review skill. Investigate vs. verify — separate lanes |
| **Nas** | `edit`/`bash`/`task` | `read`/`grep`/`glob`/`list` + `websearch`/`webfetch` + `context7` + MC recall | — | recon/research skills; read-only lookup |
| **Dylan** | — | `edit`/`bash`; **AFT symbol tools**; **context7** | `task` → built-in `explore` only | all three concision sliders + implementation skills |
| **Nirvana + band members** | everything except below | Nirvana: `task` → band members. Band members: nothing | — | tool-less |

`subagent_depth: 2` caps all delegation — set in the **global `opencode.json`** (verified: it's a global option, not a per-agent field; default 1), applied as part of the permission graph's deliverable in tgo-96f.4. The installer writes it as a merged `opencode.json` fragment alongside any existing `opencode.json(c)` (opencode merges both files).

**Background subagents (build note, tgo-96f.4):** `task` with `background: true` (the deepwork/band parallel paths) requires `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true` in the environment **at opencode process start** — it is a runtime env var, not a config key (verified in the opencode binary: the Task tool fails with "Background subagents require OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true"). The installer cannot set it persistently; it is documented in the README + install output and the user sets it in their shell profile.

### Magic-context recall — broad, not exclusive

Recall is pull-based (opt-in querying): no worklane-contamination concern, no tie to beads. **Grant MC recall to ALL named agents** (Bernstein/Horowitz/Nas/Dylan); only the tool-less band seats deny it. Guidance: **"granted broadly, used tersely"** — recall pulls tokens into the agent's window, so cheap agents shouldn't drag in giant recall dumps.

## 4. What this enforces

- Bernstein literally cannot edit/grep/glob/list — he can only orchestrate and verify.
- Nas has zero bash/task — findings return as structured reports.
- Dylan is the only seat that writes.
- Bernstein's `bd` allowlist (amended via tgo-a6r.18) is the single-writer beads contract: specialists have zero beads surface.
- **`todowrite: deny` globally** (config level, not prompt-level). This is capabilities-not-compliance for task tracking: the agent cannot fall back to native todos, so beads is the only work tracker. Verified: opencode's `permission` field accepts tool rules (tools.md); `todowrite` is also disabled for subagents by default. (Decided 2026-08-05 — resolves opencode-beads issue #66 discussion, closed as not planned.)

## 5. Cross-references

- opencode-beads fork injection mechanics: `docs/spec/beads-integration.md` §6.
- Beads-native integration: `docs/spec/beads-integration.md`.
