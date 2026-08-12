# TGO Spec — Beads-Native Integration

Status: **spec** (buildable). Source decision: `docs/wayfinder/decisions.md` (tgo-a6r.18). Related ADRs: `docs/adr/0005-beads.md`. Parked investigations: see decisions log §PARKED INVESTIGATIONS (opencode-beads fork vs official beads opencode support; disabling `todowrite`).

## 1. Coupling: scoped deep integration

Beads tracks the **work units** the loop cares about — each delegated task maps to an issue, status machine-readable. Bernstein reconciles via `bd list`/`bd show` status rather than trusting chat.

**The Background Job Board becomes a RENDERER over beads + a thin live-state shim, NOT a parallel structure** — one store, no drift. The board's context-injection function survives (the LLM must see a snapshot each turn) but is **derived from beads**. The thin runtime layer keeps only genuinely-live state (streaming tasks); beads captures the durable record at phase boundaries.

## 2. Single-writer model

**Bernstein is the ONLY beads operator:**

- **Creates** the issue BEFORE delegating; type chosen by delegation target (spike→Nas, task→Dylan, review→Horowitz, decision→only when warranted).
- **Assigns** (= the claim — beads has no auth layer, assignment IS the claim).
- Marks `in_progress` at dispatch; **closes on verified completion**; reopens on kick-back; records Horowitz review verdicts.
- **Specialists have ZERO beads surface** — reinforces the permission matrix (Nas/Horowitz stay bash-less entirely; Dylan never needs `bd`).
- **Enforcement invariant:** Bernstein never delegates without first creating the backing issue.
- **Nirvana: ephemeral, no beads issues** — output is a report that graduates to an issue only if Bernstein/requester deems it warrantable.

## 3. Where the thin board lives

Part of TGO's own opencode-beads replacement — the plugin wiring owns:
- **context injection** (beads-derived snapshot each turn; sentinel-tagged; strip-and-replace for cache safety — architecture hook #1), and
- **`bd` calls** (Bernstein's bash allowlist — see `docs/spec/mcp-permissions.md`).

The `bd` CLI remains the engine dependency, auto-installed by the installer if missing.

## 4. Living spec on the issue

Each work-unit issue is a **living spec** (Bernstein amendment): explicit success criteria, bidirectional updates (implementation writes back what was built), verification against the spec not just the diff, spec-review checkpoint before coding starts, decision log on the issue. See `docs/spec/roster.md` §5.

## 5. Session reconciliation

The session-reconciliation hook (architecture hook #2) keeps the board consistent with reality across compactions and resumes — the thin live-state shim (streaming tasks) is reconciled back into beads at phase boundaries.

## 6. Reference: the opencode-beads fork (0.7.0, installed)

TGO writes its own wiring, but the fork is the proven reference for hook #1's injection mechanics (verified in source 2026-08-05):
- **Injection event:** `chat.message` (once per session, deduped via `injectedSessions` Set) + `session.compacted` re-injection.
- **Sentinel:** wraps `bd prime` output in `<beads-context>…</beads-context>`; checks for an existing sentinel before injecting (handles plugin reload/reconnect).
- **Subagent-skip:** queries `client.app.agents()` and skips subagents (only primary/all modes get context) — avoids token pollution and pointless bd/git ops. TGO mirrors this: Bernstein (primary) gets the board; specialists don't.
- **Model/agent-preserving:** synthetic `noReply` prompt passes `model` + `agent` from the real user message to prevent mode/model switching.
- It registers `beads:*` commands (not the README's documented `/bd-*`) and a `beads-task-agent`; those vendor commands reference nonexistent beads MCP tools — the reliable path is `bd …` via bash with `BD_NON_INTERACTIVE=1`.

Official beads (CLI v1.1.2) also ships `bd setup opencode`, which installs a managed AGENTS.md Beads block (guidance only — no plugin, no hooks). `bd prime` remains the context SSOT.

## 7. Operating quirk (env reality)

All `bd` operations are CLI via `bash` (no `bd` tool, no beads MCP server). TGO's own wiring replaces the opencode-beads plugin layer.
