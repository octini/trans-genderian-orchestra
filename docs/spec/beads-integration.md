# TGO Spec — Beads-Native Integration

Status: **read-only board support / lifecycle follow-up**. When host setup supports `bd`, the current plugin may render a read-only Beads-derived board from `bd list`, `bd ready`, `bd blocked`, and `bd memories`; it does not perform Bernstein-owned lifecycle operations. Create, claim, close, reopen, recovery, and authorization remain disabled or unproven. Source decision: `docs/wayfinder/decisions.md` (tgo-a6r.18). Related ADRs: `docs/adr/0005-beads.md`. Parked investigations: see decisions log §PARKED INVESTIGATIONS (opencode-beads fork vs official beads opencode support; disabling `todowrite`).

## 1. Coupling: scoped deep integration

The intended architecture uses Beads to track the **work units** the loop cares about — each delegated task maps to an issue, status machine-readable. The current plugin may read `bd list`, `bd ready`, `bd blocked`, and `bd memories` to render a read-only board when host setup supports it. Live issue mapping, authorization, and Bernstein lifecycle reconciliation remain disabled or unproven.

**The Background Job Board becomes a RENDERER over beads + a thin live-state shim, NOT a parallel structure** — one store, no drift. The board's context-injection function survives (the LLM must see a snapshot each turn) but is **derived from beads**. The thin runtime layer keeps only genuinely-live state (streaming tasks); beads captures the durable record at phase boundaries.

## 2. Single-writer model

**Bernstein is the ONLY intended beads operator in the future architecture:**

- **Would create** the issue BEFORE delegating; type chosen by delegation target (spike→Nas, task→Dylan, review→Horowitz, decision→only when warranted).
- **Would assign** (= the claim — beads has no auth layer, assignment IS the claim).
- Bernstein owns lifecycle writes; specialists have no Beads capability.
- **Specialists have ZERO beads surface** — reinforces the permission matrix (Nas/Horowitz stay bash-less entirely; Dylan never needs `bd`).
- **Enforcement invariant:** Bernstein never delegates without first creating the backing issue.
- **Nirvana: ephemeral, no beads issues** — output is a report that graduates to an issue only if Bernstein/requester deems it warrantable.

## 2a. Delegation and closure metadata

Standard and heavy delegation packets carry `issueId`, `issueStatusObserved: "in_progress"`, `issueAssigneeObserved` (non-empty), `claimExitCode: 0`, `delegationId`, and `beadsOperator: Bernstein` — observed claim metadata replacing the forgeable `issueClaimed: true` boolean. The plugin rejects dispatch when any prerequisite is absent, including when a packet asserts `issueClaimed: true` without those observed values; diagnostics reflect observed values (`issueStatusObserved` must be `"in_progress"`, `issueAssigneeObserved` must be truthy, `claimExitCode` must be `0`). At the task-result boundary it records parsed report and closure metadata: completion-safe report, explicit `exitGate`, and `reviewComplete` when externally supplied by the Horowitz review path. The current hook does not generate Horowitz completion metadata or `reviewComplete`. `canClose` is metadata for Bernstein; it does not query Beads, claim an issue, close an issue, or reopen an issue, and it validates the same observed claim fields as the dispatch gate. Failed metadata validation exposes a retry, reroute, escalate, or user-clarification recovery action. The Bernstein-owned controller consumes this gate. Tiny routing is the only review and metadata bypass.
Separation: issueId (work unit) / delegationId (dispatch) / beadsOperator+session parentID (authorization) — tgo-3id contract — board reads never authorize writes.

The plugin does not perform these Bernstein-owned lifecycle writes. It validates packet/report fields and emits a `closureGate` for Bernstein; validation checks the observed claim fields but remains metadata-only — it does not invoke `bd` to verify claim state, and no live host-mediated claim lookup is enabled. When host setup supports the read commands, the board reads Beads for context; those reads do not authorize a session or any lifecycle action. The plugin does not create, claim, close, reopen, or recover issues. Tiny routing retains its documented bypass. Live `bd` lifecycle integration, host-validated claim semantics beyond the disposable probe, and recovery are follow-up work; host validation must use a supported OpenCode boundary because `bd -C` and `bd init --directory` remain unsupported — must use `.cwd(directory)` for setup only.

## 3. Where the thin board lives

Part of TGO's own opencode-beads replacement — the plugin wiring owns:
- **context injection** (beads-derived snapshot each turn; sentinel-tagged; strip-and-replace for cache safety — architecture hook #1), and
- **Beads context reads** through the existing board renderer. Lifecycle writes are not implemented by the plugin.

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

## 8. Verification evidence — 2026-08-19

- Installed CLI: `bd version 1.1.2 (20e493e56)`.
- Disposable repository probe: `bd init --non-interactive --skip-hooks`, `bd create --json`, `bd show --json`, `bd update --json <id> --claim`, and `bd close --json <id> --reason ...` all exited `0`. The observed state sequence was `open` → `in_progress` with `assignee: ryangking` → `closed` with `close_reason`. The claim precondition is observed via `{exitCode, stdout, stderr}` in `mkdtempSync(os.tmpdir()/tgo-bd-probe-*)` — status `in_progress` with truthy `assignee` and `claimExitCode 0` is required; the forgeable `issueClaimed` boolean is no longer a dispatch precondition.
- Additional disposable probes: `bd show --json <missing-id>` and `bd update --json <nonexistent> --claim` both yield non-zero exit and are treated as failed claim preconditions; double `bd update --claim` remains `in_progress` (idempotent) without forging. All probes use `mkdtempSync` and assert `directory !== process.cwd()` with cleanup; `bd -C` and `bd init --directory` remain unsupported.
- The probe used a temporary directory and was removed after verification; the project `.beads` store was not used.
- Setup probing with `bd -C <fresh-git-directory> init` exited `1` with `cannot use -C directory ...: no beads project found`; setup must run from the target directory for a fresh store. This does not prove that the current OpenCode host can authorize Bernstein-owned lifecycle writes.
- TGO setup subprocesses now preserve exit code, stdout, and stderr. A nonzero `bd init` or `bd setup opencode` result is reported as a failed setup instead of being silently accepted.
- Primary setup excludes subagent sessions (`parentID`); this is covered by the existing isolated setup tests. The task boundary now fails closed when host session identity is unavailable or identifies a child session. `beadsOperator` and observed claim fields remain metadata and never authorize a write. The board may still perform read-only Beads reads when host setup supports them; live host authorization, plugin-mediated issue lookup/claim/close/recovery, and any host-mediated claim verification beyond the disposable probe remain unproven. The plugin remains metadata-only until host boundary validated.

## 9. OpenCode boundary probe — 2026-08-19

An isolated host smoke probe was run with OpenCode `1.18.18` using `OPENCODE_CONFIG_DIR` pointing at a temporary config directory and `--dir` pointing at a temporary Git repository. The config loaded the local TGO plugin and selected Bernstein. The command was:

```text
OPENCODE_CONFIG_DIR=<temp-config> TGO_DEBUG_EVENTS=1 opencode --dir <temp-repo> run --format json --model opencode-go/mimo-v2.5 "Reply with exactly STATUS: complete"
```

Evidence captured:

- exit code: `0`
- stdout: JSON `step_start`, `text`, and `step_finish` events; the text was exactly `STATUS: complete`
- stderr: empty
- the temporary repository and config directory were removed after the run
- no project `.beads` directory was used

The command proves that the real host can launch an isolated primary session and execute the plugin path. The JSON run output does not expose plugin `client.app.log` records, so it does not independently prove hook delivery or authorization. No lifecycle write was enabled. The existing plugin hook contract and source reference identify `event`/`session.created`, `tool.execute.before`, and `tool.execute.after`; host-observable primary-versus-child identity still needs a run that performs a real task delegation.

### Proven / unproven matrix

| Boundary | Result | Evidence |
|---|---|---|
| Disposable `bd` read/claim/close | Proven | Disposable CLI probe (`mkdtempSync`): `open` → `in_progress` with `assignee: ryangking` + `claimExitCode 0` → `closed`, with `{exitCode, stdout, stderr}` diagnostics |
| Claim-before-execution linkage | Proven via disposable probe; plugin remains metadata-only | Delegation packet now requires `issueStatusObserved: "in_progress"`, `issueAssigneeObserved` truthy, `claimExitCode: 0`; forged `issueClaimed:true` without observed status is rejected (`delegation.test.ts`, `lifecycle.test.ts`); live claim verified in `beads-probe.test.ts` disposable `mkdtempSync(os.tmpdir()/tgo-bd-probe-*)`; plugin validation is metadata-only diagnostic until host write path proven — no live plugin-mediated `bd` claim |
| Missing/invalid claim observation | Proven to fail | `bd show --json <missing>` and `bd update --json <nonexistent> --claim` yield non-zero exit and are treated as failed precondition; double-claim remains `in_progress` or errors without forging (`beads-probe.test.ts`) |
| Isolated real OpenCode launch | Proven | OpenCode `1.18.18`, exit `0`, JSON stdout, empty stderr |
| `session.created` primary filtering | Proven by plugin source and isolated setup tests; live event record not exposed by this probe | `parentID` gate in `src/plugin.ts` (`parentID===null`); setup tests |
| Child-session filtering | Unproven at this boundary | No real delegation was invoked |
| Forged `beadsOperator` / forged `issueClaimed` authorization | Rejected; host lineage is required and child/missing identity fails closed; observed fields required | `plugin-reinforcement.test.ts`; metadata is not authorization; `issueClaimed` alone is rejected |
| Plugin-mediated issue lookup/claim/close/recovery | Unproven and disabled | `beadsLifecycle.allowed: false`; no lifecycle subprocess path; remains `metadata-only` until host boundary validated |
| Tiny task lifecycle operation | Proven absent in plugin hook test | Tiny closure metadata omits `beadsLifecycle`; no lifecycle write is enabled |
| Board reads authorize writes | Explicitly not authorized | Board is read-only; `bd -C` and `bd init --directory` unsupported; `.cwd(directory)` for setup only |

### Failed-gate recovery (2026-08-19, disposable probes — tgo-mvw)

Failed-gate recovery is metadata-only until host write path proven; the plugin does not close, reopen, or recover Beads issues. `closureGate` carries `canClose`, `closureBlocked`, and `recovery` for Bernstein; no live `bd` calls are made. Board reads remain read-only (`bd list`/`bd ready`/`bd blocked`/`bd memories`); `bd -C` and `bd init --directory` remain unsupported — must use `.cwd(directory)` for setup only.

| Scenario | Real `bd` behavior (disposable probe) | Plugin `closureGate` | Actionable vs unsupported | Evidence (exit codes) |
|---|---|---|---|---|
| Failed verification | `bd close` not invoked; issue remains `open`/`in_progress`; no `bd close`/`bd reopen` is valid recovery | `canClose: false`, `closureBlocked: true`, `recovery` from `report.recovery` (`retry`/`escalate`/`user-clarification`); plugin makes no live `bd` calls | Actionable: keep open, satisfy missing (review, `VERIFIED` `exit gate: true`, `GAPS`), then `retry`/`escalate`/`user-clarification`; Unsupported: `bd close`/`bd reopen`/`bd create` are not invoked (metadata-only) | `parseTaskReport` `completionSafe:false` → `canClose:false`; no `bd` exit code (no live call) |
| Active issue (`in_progress`) | `bd reopen <id>` on `in_progress` demotes to `open` (exit 0, stdout JSON `status: open`), loses claim; `open` → `bd reopen` is no-op exit 0 with stderr `is already open` | `canClose: false` (missing review/delegationId or failed verification), `recovery` from report (`retry`/`reroute`/`escalate`/`user-clarification`); plugin never calls `bd reopen` | Actionable is keep `in_progress` open, satisfy missing, retry/reroute/escalate; reopen demotion is documented but not used as recovery (plugin never calls it) — Active in_progress: `bd reopen` demotes to open (exit 0) but is NOT valid failed-gate recovery — actionable is keep `in_progress` open, satisfy missing, retry/reroute/escalate; reopen demotion is documented but not used as recovery (plugin never calls it). Open: reopen no-op "is already open". | disposable: `in_progress` → `bd reopen` exit 0, `status: open` after (`beads-probe.test.ts` probe 7); `open` → `bd reopen` exit 0, `is already open` (probe 7) |
| Missing issue | `bd show --json <bogus>` and `bd update --json <bogus> --claim` and `bd reopen --json <bogus>` all exit 1, stderr `no issue found`/`error resolving`/`does not exist` | `canClose: false`, `missing: ["issueId"]` or `["issueStatusObserved:in_progress", ...]`, `recovery: retry` default but docs advise `user-clarification`/`escalate` | Not actionable via retry same id → `user-clarification`/`escalate`; `bd reopen` on missing is not recovery (exit 1) — Missing/bogus: exit 1 error resolving, not actionable via retry same id → user-clarification/escalate. | `bogus`/`no-id` → `bd reopen` exit 1 `error`/`requires at least 1 arg`; `bd show`/`bd update --claim` exit 1 (probes 4,8) |
| Watchdog-abort | No `bd` close/reopen is authoritative; abort text marks incomplete run | `canClose: false`, `closureBlocked: true`, `recovery: reroute` authoritative (`report.recovery` from `watchdogAborted`) | Actionable: reroute (never retry same session as if complete); Unsupported: trust watchdog output as `complete` — Watchdog: reroute. | `parseTaskReport` with `watchdog.*abort` → `watchdogAborted:true`, `recovery: reroute` (report.test.ts, lifecycle.test.ts) |
| Tiny route | No Beads lifecycle; bypasses review/claim checks | `canClose: completionSafe` (`report.completionSafe` only), `closureBlocked: !completionSafe`, `recovery: retry` if blocked | Actionable: retry with valid report (`exit gate: true`); Unsupported: no `bd` writes, no `reopen`/`recovery` creation | `tiny` → `evaluateClosure` ignores `issueId`/`reviewComplete`; `canClose:false` if report invalid (lifecycle.test.ts) |

- Closed: `bd reopen` on `closed` works (exit 0 → `open`, `closed_at` cleared) but remains unsupported for plugin until proven host path (currently plugin never calls reopen; docs must say disabled) — Closed: reopen works (exit 0 → open) but remains unsupported for plugin until proven host path (currently plugin never calls reopen; docs must say disabled).
- Recovery creation `bd create --deps discovered-from` generically exit 0 but disabled in plugin (`allowed:false`), not reachable as automated recovery — Recovery creation `bd create --deps discovered-from` generically exit 0 but disabled in plugin (allowed:false), not reachable as automated recovery.
- Failed verification: keep open, no `bd close`/`reopen` — Failed verification: keep open, no bd close/reopen.
- `bd -C` and `bd init --directory` remain unsupported — must use `.cwd(directory)` for setup only.
- Board remains read-only; plugin never calls `bd close`/`bd reopen`/`bd create` as recovery.

Read-only board rendering remains supported when the host exposes the documented `bd` reads. The OpenCode smoke probe does not justify enabling lifecycle writes.

## 10. Routing slice boundary (tgo-6d7)

Git diff at this slice may show `plugin/src/delegation.ts`, `plugin/src/lifecycle.ts`, `plugin/src/plugin.ts`, `plugin/src/report.ts`, and related tests as added/modified; those were introduced in the prior tgo-6ww chain and are not part of the tgo-6d7 routing change. This Dylan session touched only routing surfaces: `plugin/src/fit.ts` verification (no functional change required), `plugin/test/fit.test.ts` preset-intent test, and `docs/spec/roster.md`/`docs/spec/architecture.md` routing classifier wording — no delegation/closure files were modified in this session per the routing docs/tests-only constraint.
