# Spec A — Bernstein sole beads operator via plugin-mediated writes, verification-gate-first

Status: **spec only — no runtime change**. Source decision: `docs/spec/beads-integration.md` (read-only board, metadata-only lifecycle). Related ADRs: `docs/adr/0006-beads.md` (single-writer intent).

## Goal

Make Bernstein the sole beads operator through host-mediated writes, with verification before spawn.

Bernstein creates the issue before delegating, assigns (= claims) it, and owns create/claim/close/reopen/recovery through the plugin host. Specialists hold zero beads surface (Nas/Horowitz stay bash-less; Dylan never needs `bd`). No dispatch proceeds without a live host-verified claim: the host runs a read-only `bd show --json` with explicit cwd, confirms status and assignee, and only then permits the `task` spawn. Packet metadata never authorizes a write.

## Non-goals

- No worker `bd` writes after freeze. Dylan, Nas, Horowitz, and lens seats never run `bd create`, `bd update`, `bd close`, `bd reopen`, `bd dep add`, or `bd remember` as part of delegated work.
- No `bd -C`. Setup and verification never pass `-C` or `--directory` to `bd`; both remain unsupported.
- No `console.log` in plugin paths. All host diagnostics use `client.app.log`.
- No parallel store, no board-authorized writes, no automated recovery creation in this spec. Recovery creation stays `allowed: false` until Phase 1 proves the verify path.

## Phased rollout

### Phase 0 — freeze worker writes

Deny `bd create/update/close` in the worker-reachable skill surfaces and keep delegation as the only write path:

- Freeze `to-tickets` publish step (`plugin/assets/skills/to-tickets/SKILL.md` §5: `bd create` in dependency order, `bd dep add` second pass) so workers propose ticket bodies and blocking edges but never publish them.
- Freeze `wayfinder` map/ticket writes (`plugin/assets/skills/wayfinder/SKILL.md`: `wayfinder:map` creation, child-issue creation, `bd dep add` wiring, `bd update <id> --claim` before work, `bd close <id>` on resolution) so workers propose maps and resolutions but never mutate them.
- Bernstein delegates only: Bernstein frontmatter (`plugin/assets/agents/bernstein.md`) already denies direct `edit/grep/glob/list` and restricts bash to the read-only verification plus `bd list/show/ready/search` allowlist; Dylan frontmatter (`plugin/assets/agents/dylan.md`) grants `bash: allow` and therefore needs the Phase 0 skill freeze to remove its indirect `bd`-write path.

### Phase 1 — verify-every-claim

Before any non-tiny spawn, the host runs a live read-only lookup and enforces observed-claim semantics:

1. Host runs `bd show --json <issueId>` with explicit cwd (never `bd -C`).
2. Host checks `status === "in_progress"`, assignee truthy, and observed `claimExitCode === 0`.
3. Host rejects forged `issueClaimed` / `beadsOperator` packets: `issueClaimed: true` without observed fields fails (`plugin/src/delegation.ts` forged-boolean diagnostic); `beadsOperator !== "Bernstein"` fails; missing `issueStatusObserved` / `issueAssigneeObserved` / `claimExitCode` fails.
4. Failure closes the gate: throw from the veto hook, log observed values, keep the issue open, surface retry/reroute/escalate/user-clarification recovery. No spawn proceeds.

### Phase 2 — plugin-mediated create/claim/close

Add host-mediated lifecycle writes only after Phase 1 proves the verify path:

- Either a custom tool (`tool` hook, per `docs/research/opencode-plugin-api.md`) or the `tool.execute.before` veto path performs `bd create` / `bd update --claim` / `bd close` on Bernstein's behalf.
- Gate writes behind `allowed: true` (today `beadsLifecycle.allowed: false` per `docs/spec/beads-integration.md` §9 matrix). Flip to `allowed: true` only after the Phase 1 exit gate below passes in full.
- Close path reuses the deterministic exit gate (`checkCloseGate`) already enforced on the human palette path before any `bd close`.

## Host boundary

- Veto hook `tool.execute.before` (`plugin/src/plugin.ts:1197`) validates the delegation packet and authorizes the primary seat before spawn; throw to veto.
- Primary signal `parentID===null` via `authorizeLifecycleSession` (`plugin/src/lifecycle.ts:33-47`): fetch the session, require an own `parentID` property, return true only when `parentID === null`; missing client, missing session, or child identity fails closed.
- Cwd resolution `directory ?? worktree ?? project.worktree ?? "."` with `.cwd(directory)` (never `bd -C`): resolve the repo root from host input and run subprocesses from that directory. `bd -C <dir> init` exits 1 (`cannot use -C directory ...: no beads project found`); `bd init --directory` is likewise unsupported.
- `execFile` argv spawn (never shell-split `$`+interpolation like `plugin/src/plugin.ts:183` and `:555`): pass `bd` arguments as an argv array through `execFile`; never split a command string on whitespace and interpolate it into a shell template.
- `BD_ENV` merges `process.env` + `HOME`: subprocess environment carries `BD_NON_INTERACTIVE=1` plus `HOME: os.homedir()` so `bd` telemetry resolves to the real home instead of a literal `~/` inside the target repo.
- Diagnostics via `client.app.log` only: console output from the server worker lands in the TUI stdout stream; `app.log` routes to the structured log.

## Readonly/mutate boundary

- `sidebar/bd.ts query()` forces `--readonly` + `--json` and returns `undefined` on failure: `exec(["--readonly", ...args, "--json"])`, JSON-parse on success, `undefined` on non-zero exit, missing database, or unknown id. The panel renders nothing rather than throwing.
- `mutate()` only via human palette today: `sidebar/bd.ts mutate()` gates the id through `isValidBeadID`, consults `checkCloseGate` before any close, and is reachable only from the palette commands in `sidebar/commands.ts` (`beads.start`, `beads.close`, `beads.reopen` via explicit picker + toast). No delegated path calls `mutate()`.
- `bd show` rewrites `last-touched` even under `--readonly`, so verify perturbs signature: the client pins the directory signature per refresh cycle (`beginRefresh`) and re-walks after (`snapshot`) because a pre-query signature would make own reads look like external change and refresh in a loop.
- `get` uses `list --id` for that reason: `get` deliberately calls `list --id <id> --all` rather than `show`, which would rewrite `.beads/last-touched` under `--readonly` and loop the poller; the panel never needs the expanded-dependency data `show` adds.

## Verification semantics

`bd show` CAN prove:

- Lifecycle sequence `open` → `in_progress` with truthy `assignee` → `closed` with `close_reason`, each step exit `0` with `{exitCode, stdout, stderr}` preserved.
- Exit codes: `bd show --json <missing>` and `bd update --json <nonexistent> --claim` exit non-zero and count as failed claim preconditions.
- Double-claim idempotent: repeated `bd update --claim` on a claimed id stays `in_progress` with exit `0`.
- Reopen demotion rules: `closed` → `bd reopen` exits `0` to `open` with `closed_at` cleared; `in_progress` → `bd reopen` exits `0` but demotes to `open` (claim lost, not valid failed-gate recovery); `open` → `bd reopen` exits `0` no-op (`is already open`); bogus id → `bd reopen` exits `1` (`no issue found` / `error resolving` / `does not exist`).

`bd show` CANNOT prove:

- Seat actor. Claims record the shared OS user (observed `assignee: ryangking`); beads has no auth layer, so assignment IS the claim and any seat with shell access produces the same record.
- Delegation lineage. `beadsOperator` is packet metadata, never a credential; `issueClaimed` was a forgeable boolean, now replaced by observed fields (`issueStatusObserved: "in_progress"`, `issueAssigneeObserved` truthy, `claimExitCode: 0`), and observed fields still attest to tracker state, not to which seat ran the command.
- Authorization. Board reads (`bd list` / `bd ready` / `bd blocked` / `bd memories`) never authorize a session or any lifecycle action; only the host-observable `parentID===null` lineage plus the live lookup gates dispatch.

## Risks

- Injection. Bead ids flow from `.beads/last-touched` and `bd` JSON output, both attacker-influenced in a cloned repo. `execFile` removes shell injection, but a leading-`-` id still parses as a flag. Gate every id through the anchored `VALID_BEAD_ID` (`/^[A-Za-z0-9][A-Za-z0-9._-]*$/`) before it reaches `bd` argv; reject anything else.
- CWD misdirection. A wrong repo root verifies or mutates the wrong store. Thread cwd explicitly from host input on every spawn (`directory ?? worktree ?? project.worktree ?? "."`); never rely on ambient process cwd and never substitute `bd -C`.
- Single-point-of-failure. A throwing plugin factory drops the entire plugin silently (verified headless, 1.18.13). Keep load-time checks warn-only; enforce strictly only on dispatch/install paths.
- Orphan-claim on crash between create and claim. A crash after `bd create` but before `bd update --claim` leaves an open, unassigned issue with no owner. Phase 1 verify fails closed on it (status `open` ≠ `in_progress`); Bernstein re-claims or re-delegates explicitly. Never auto-close or auto-reuse the orphan.

## Tests to extend

- `delegation.test.ts` forged-rejection: keep the `issueClaimed:true`-without-observed-fields rejection, missing-observed-fields diagnostics, and `VALID_BEAD_ID` gate coverage; extend with the host-verify precondition (observed status/assignee/exit-code triple required).
- `lifecycle.test.ts` closureGate: keep `evaluateClosure` metadata validation (observed-claim triple, `beadsOperator=Bernstein`, `Horowitz review`, completion-safe report, taxonomy-derived recovery); extend with gate-blocked close refusal wired to the real close path.
- `beads-probe.test.ts` disposable patterns (never project `.beads`): keep `mkdtempSync(os.tmpdir()/tgo-bd-probe-*)`, `directory !== process.cwd()` assertion, and `rmSync` cleanup on every probe; keep probes 1–8 (happy claim, forged packet, observed packet, missing-id exits, double-claim, closed→reopen, active→reopen demotion, missing→error).
- NEW: live host-mediated `bd show` lookup with threaded cwd — disposable repo, `execFile` argv spawn, explicit `cwd: directory`, assert `open` → `in_progress` + assignee → observed triple passes the dispatch gate.
- NEW: forged-claim rejection test — packet asserts `issueClaimed: true` / `beadsOperator: Bernstein` while live `bd show` reports `open` or missing; host lookup rejects, no spawn.
- NEW: cwd-misdirection test — lookup pointed at a second disposable repo with no such id exits non-zero; gate treats it as failed precondition rather than falling back to ambient cwd.

## Exit gate for Phase 1

- [x] `docs/spec/beads-operator-a.md` states `parentID===null` primary signal with explicit-cwd lookup.
- [x] `docs/spec/beads-operator-a.md` states argv-spawn (`execFile`, never shell-split) and `BD_ENV` + `client.app.log` rules.
- [x] `docs/spec/beads-operator-a.md` states the readonly/mutate boundary (`--readonly` + `--json`, `undefined` on failure, `last-touched` perturbation, `get` via `list --id`).
- [x] `docs/spec/beads-operator-a.md` states CAN-prove vs CANNOT-prove claim semantics.
- [x] `docs/spec/beads-operator-a.md` states injection, CWD-misdirection, single-point-of-failure, and orphan-claim risks.
- [x] `docs/spec/beads-operator-a.md` states the tests-to-extend set including the three NEW tests.
- [x] `grep bd create` over `plugin/src` shows zero host spawns (board/sidebar reads and gate diagnostics excepted; no lifecycle `create` path).
- [x] Forged-claim test rejects (`issueClaimed:true` without observed triple fails; live-`open` packet fails host lookup).
- [x] Worker-skill freeze landed (to-tickets + wayfinder propose but never run `bd` writes).
- [x] `bd show` verify path threads cwd explicitly (no `bd -C`, no ambient-cwd fallback).
