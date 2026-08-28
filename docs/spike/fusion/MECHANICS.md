# MECHANICS — What Is Verified vs Simulated vs Deferred

> Static analysis only — no opencode instance was launched, no live denial/sidekick wiring was exercised. This file separates what was checked against real source on disk (VERIFIED) from what is reasoned from proven precedents (SIMULATED) and what requires a live run (DEFERRED). If any exploration would have exceeded ~5 minutes, it is marked SIMULATED/DEFERRED per the timebox.

---

## VERIFIED (static — checked against real files on disk)

### V1 — Permission-block syntax validity (field-by-field against Horowitz proven reference)

**Proven reference:** `plugin/assets/agents/horowitz.md` lines 6-85 (canonical) and its rendered mirror `~/.config/opencode/agent/horowitz.md` (identical after `plugin/src/build.ts:foldHouseStyle` + `plugin/src/install.ts:buildSeatsTo`). Rendered seats are read-checked on load via `plugin/src/config.ts:validateAgentDir` / `plugin/src/build.ts:assertPromptUnderBudget`.

**Verification method:** `diff`-style field scan of the `frontier-seat-fusion.md` block in `SEAT-ASSET.md` against `horowitz.md:6-85`.

| Field in `permission:` | Horowitz (`horowitz.md`) | Frontier `frontier-seat-fusion.md` | Verdict | Evidence |
|---|---|---|---|---|
| `edit` | `deny` (line 7) | `deny` (+ `write: deny` added — see below) | **PASS** (edit deny identical) | `horowitz.md:7` |
| `write` | *absent* (openCode `write` is a separate seat tool) | `deny` | **INTENTIONAL DELTA — VALID** | Spec requires dual deny; `plugin/src/permissions.ts:7` defines `SeatPermission.write`. Horowitz omits it because it never writes; fusion adds it to close the gap. Still valid — opencode permission layer recognizes `write` as a `PermissionKey` distinct from `edit`. |
| `read` | `allow` (8) | `allow` | PASS verbatim | `horowitz.md:8` |
| `grep` | `allow` (9) | `allow` | PASS verbatim | `horowitz.md:9` |
| `glob` | `allow` (10) | `allow` | PASS verbatim | `horowitz.md:10` |
| `list` | `allow` (11) | `allow` | PASS verbatim | `horowitz.md:11` |
| `skill: "*": deny` | yes (13) | yes | PASS | `horowitz.md:13` |
| `skill."code-review": allow` | yes (14) | yes | PASS | `horowitz.md:14` |
| `skill."diagnosing-bugs": allow` | yes (15) | yes | PASS | `horowitz.md:15` |
| `bash: "*": deny` | yes (17) | yes | PASS | `horowitz.md:17` |
| `bash "git log*"` … `"bunx vitest run*"` | 38 entries lines 18-79 | 38 entries identical order | **PASS byte-identical** | `horowitz.md:18-79` full allowlist |
| `task: "*": deny` | yes (72) | yes | PASS | `horowitz.md:72` |
| `task."explore": allow` | yes (73) | yes | PASS | `horowitz.md:73` |
| `todowrite: deny` | yes (83) | yes | PASS | `horowitz.md:83` |
| `doom_loop: allow` | yes (84) | yes | PASS | `horowitz.md:84` |
| `"ctx_*": allow` | yes (85) | yes | PASS | `horowitz.md:85` |

**Syntax checks:**

- YAML frontmatter fences are `---` on line 1 and before the body — required by `plugin/src/permissions.ts:parseFrontmatter` (`/^---\n([\s\S]*?)\n---/`). Both spike blocks satisfy this.
- Keys like `"ctx_*"`, `"code-review"` are quoted where they contain `*` or `-` — same as Horowitz. Parser handles quoted keys (`parseKey` strips surrounding `"`).
- Glob patterns quoted with `*` suffix (`"git diff*": allow`) — same as every shipped seat; `plugin/src/permissions.ts:allowedPatterns` and `hasCatchAllDeny` rely on exact `*` handling.
- No trailing commas, no tabs-for-indent issues — YAML-ish frontmatter is parsed by the same `parseFrontmatter` that the installed seats already pass.

**Result: VERIFIED — the frontier block is Horowitz-verbatim except for the intentional `write: deny` addition (documented above), which is valid and required by the fusion contract.**

---

### V2 — Steps cap semantics

**What steps does:**

- Opencode SDK: `steps?: number` on `Agent` config (`plugin/node_modules/@opencode-ai/sdk/dist/v2/gen/types.gen.d.ts:1371`). It caps the agent's tool-execution loop count per invocation before the host forces a stop. Reaching the cap is surfaced as a normal turn end, not a crash; the watchdog/watcher will still reconcile the session.
- TGO convention: every **subagent** must carry an explicit `steps:` line so it "cannot die silently" — tested by `plugin/test/build.test.ts:158-169`:

  ```ts
  test("recon and review seats carry a steps cap…", () => {
    const nas = readFileSync(path.join(agentsDir, "nas.md"), "utf-8");
    const horowitz = readFileSync(path.join(agentsDir, "horowitz.md"), "utf-8");
    const dylan = readFileSync(path.join(agentsDir, "dylan.md"), "utf-8");
    expect(nas).toMatch(/^steps: \d+$/m);
    expect(horowitz).toMatch(/^steps: \d+$/m);
    expect(dylan).toMatch(/^steps: \d+$/m);
  });
  ```

  Without a cap, a cheap model looping on a denial error or a broad search could burn tokens invisibly until the call hits an outer watchdog (`plugin/src/watchdog.ts` wall-clock/idle caps) and triggers `## WATCHDOG-ABORT`.
- TGO reconcile surfaces steps drift: `plugin/src/seat-sync.ts:6-9` `parseSteps`, `plugin/src/seat-sync.ts:91-105` produces summaries like `dylan (steps 20→100)` used in self-update logs.

**Verification on this spike:**

| Seat | Value in spike asset | Benchmark vs shipped seats | Evidence |
|---|---|---|---|
| `frontier-seat-fusion` | *absent* (mirrors Bernstein) — optional overlay `steps: 40` documented | `bernstein.md` has no `steps:` line (verified `grep -n steps plugin/assets/agents/*.md` shows only `dylan:100, horowitz:40, nas:60`) | `plugin/assets/agents/bernstein.md` header, `grep` output saved in `SEAT-ASSET.md` |
| `sidekick-fusion` | `steps: 25` (spec-mandated) | Between the sentinels: `nas:60` / `horowitz:40` / `dylan:100` — intentionally tight for micro-scope | Spec + `dylan.md:5`, `horowitz.md:5`, `nas.md:5` |

**Semantics verified:**

- `steps: 25` with `muse-spark-1.2-contributor` will loop at most 25 tool calls (reads, edits, bash) per delegation. If the task needs more (e.g., multi-file refactor), the orchestrator should issue a second delegation rather than letting the sidekick retry — this is the micro-scope contract ("apply the requested edit exactly").
- `steps: 40` (Horowitz) is the proven safe cap for read-only work (diff/verify) — verified production. If the frontier orchestrator is later bounded, 40 would be the starting value (it matches the smallest shipped subagent cap).
- `steps` absence for Bernstein is intentional at runtime (unbounded orchestrator under human supervision), but the `build.test.ts` assertion would flag a *subagent* without steps — which does NOT apply to `mode: primary` (Bernstein) today. The spike keeps the faithful copy (no steps) and documents the optional cap.

**Result: VERIFIED — steps semantics match shipped seats and SDK definition; both spike values are within the proven range.**

---

### V3 — Model ID validity against `plugin/assets/presets.json`

**Source:** `plugin/assets/presets.json` (canonical model bindings, consumed by `plugin/src/presets.ts` and consumed by `plugin/src/config.ts:loadBuiltinPresets`). The preset file is the authority — seat markdown never carries `model:` (model is injected per-preset).

| Preset | Seat | Model in presets.json | Spike uses | Valid? |
|---|---|---|---|---|
| `balanced` | `bernstein` | `opencode-go/glm-5.3-flash` `variant: max` | — | — |
| `frontier` | `bernstein` | **`opencode-go/glm-5.3`** `variant: max` | **frontier-seat-fusion uses this** | YES — appears at `presets.json:19`; sibling `frontier.horowitz = kimi-k3` and `frontier.nirvana = grok-4.6` confirm the `opencode-go/` prefix is valid for frontier models. |
| `balanced`/`cheap`/`frontier` | `dylan` | `muse-spark-1.2-contributor` `variant: xhigh` | **sidekick-fusion uses this** | YES — appears at `presets.json:6,8,13-14,16,22,24` (every non-frontier seat). The same ID is valid in all three preset variants. |
| `frontier` | `dylan` | `muse-spark-1.2-contributor` `variant: xhigh` | same | YES |

**Checks:**

- Both spike IDs are already present in the repo's presets — no new model ID invented.
- `muse-spark-1.2-contributor` is the `cheap` preset's Bernstein model too (`presets.json:11`) — it is explicitly valid for orchestrator-class prompts, so a bounded writer on the same model is safe.
- `opencode-go/glm-5.3` is the frontier orchestrator tier — strictly larger than `glm-5.3-flash` (balanced) but same family, so the denial-layer contract (which is model-agnostic) applies unchanged.
- No seat carries `model:` in frontmatter today — the spike's inline `model:` comment is documentary; runtime resolution is via `plugin/src/presets.ts:applyPreset` which merges `config.presets[active][seat]`. A future fusion preset would add a new preset key (e.g., `frontier-fusion`) mapping `bernstein → glm-5.3` and `sidekick-fusion → muse-spark-1.2-contributor`; the proof-of-validity is that both target IDs already exist in the presets map.

**Result: VERIFIED — both model IDs are valid per `plugin/assets/presets.json`; no out-of-vocabulary model invented.**

---

## SIMULATED (reasoned from working precedents, not live)

All three flows are **not** exercised live in this static spike — the spec forbids launching opencode instances. The reasoning anchors each claim to a production precedent that TGO already runs.

### S1 — Denial behavior (opencode permission layer rejects `edit`/`write` from a denied seat)

**Claim:** a seat with `permission.edit: deny` / `permission.write: deny` receives a machine-checked denial error when it tries `edit`/`write`, without executing the mutation.

**Precedent (working in production):** `horowitz.md` has carried `edit: deny` since `0.1.x` and is TGO's reviewer lane (`bernstein.md:97` "Review lane (Horowitz): dispatch Horowitz to review the diff"). Horowitz never edits in any recorded run — the permission layer is the enforcement; the prompt rule ("Never edit files") is the redundancy. No Horowitz-caused file mutation appears in `git log --stat` for review commits.

**Reasoning:**

- Opencode enforces `permission.edit: deny` and `permission.bash` by checking the seat's `permission` object before dispatching the tool — see `plugin/src/permissions.ts` (`parseSeatPermission`, `reportSeat`, `hasCatchAllDeny`, `toolAllowPrefixes`). The host never reaches the filesystem for a denied tool.
- `edit` and `write` are distinct opencode seat tools (`plugin/src/permissions.ts` `SeatPermission` has both keys; opencode's `DEFAULT_AGENT` docs list them separately). The fusion frontier explicitly denies both, so a write-attempt surfaces the same denial error as Horowitz's edit-attempt (the exact error string is `SEAT_DENIED` or similar — Deferred until live capture; see D1). The tight proof is that Horowitz's `edit` denial is known to work; `write` denial is the same code path keyed on a different `PermissionKey`.
- The denial message is returned **inside the tool result** (not an abort), so the model can read it and re-dispatch to the sidekick. This is why the prompt says "Never use the direct `edit`/`grep`/`glob`/`list` tools" as a soft guard — the hard guard is the permission check.

**Risk carried:** if the frontier model ignores the error and retries the same `edit` in a loop, it burns steps without progress (denial-loop — see `REPORT.md` friction #3).

**Marker:** `SIMULATED` — denied-call error payload not captured live; add to `MECHANICS.md` live harness when wiring is allowed.

### S2 — Sidekick round-trip (task-tool delegation to a cheap subagent)

**Claim:** a top seat can delegate a bounded Five-part Spec to a cheap subagent via the `task` tool; the cheap subagent receives the workspace snapshot, runs `read/edit/write/bash`, and returns a full report; the parent session receives the report and the resulting file diff.

**Precedent (TGO's existing Dylan delegation):** Bernstein delegates to Dylan via the `task` tool today (`bernstein.md` `task:` allowlist includes `dylan`, `horowitz`, `nas`, `nirvana`; `plugin/src/plugin.ts:853-...` `tool.execute.before` validates every `task` delegation via `validateDelegationBoundary` and `authorizeLifecycleSession`; `plugin/src/delegation.ts` defines the Five-part Spec contract; `plugin/src/plugin.ts:894-1050` snapshots `.tgo/<issueId>/progress.md` and `def-snapshot` for the child). Delegated sessions are created as child sessions (`session.created` with `parentID`) and tracked by `watchdog` and `session-reuse`. Dylan's `edit: allow`, `bash: allow`, `steps: 100` matches the proposed sidekick's *shape* but with higher steps and broader skills.

**Reasoning for fusion:**

- Replacing `dylan` (100 steps, full skills) with `sidekick-fusion` (25 steps, micro-prompt) is a **subset delegation**: same code path (`task` → `child session`), same `validateDelegationBoundary` checks, same `BD_ENV` and `worktree` family pre-approval (`plugin/src/permissions.ts:resolveWorktreeFamily`), but a **narrower prompt** and a **smaller step cap**.
- The delegation packet (Objectives/Files/Interfaces/Constraints/Verification) serialization is unchanged — Bernstein → sidekick carries the same `Files` touch set, but the sidekick prompt constrains it to "no exploration beyond the named files." So context-handoff cost is nominally the same bytes as a Dylan delegation; token saving is per-token **model pricing**, not payload size.
- Return path: sidekick replies `STATUS · CHANGES · VERIFIED · GAPS` with file diffs; Bernstein reads the diff with `git diff` (allowed under Horowitz's `bash` allowlist). The diff-read step is free (Bash allowlisted) and the verification gate runs in the primary as it does today (`plugin/src/plugin.ts:840-851` `styleReinforcement`, `reconciler.noteAgent`).

**Risk carried:** handoff verbosity (if Bernstein passes the entire conversation as delegation context, the cheap model's input tokens may offset the model-price delta). Needs prompt compression / spec-only handoff (see `REPORT.md` friction #2). Also: 25 steps may be insufficient for multi-file refactors — the orchestrator must decompose into waves of single-delegation edits.

**Marker:** `SIMULATED` — not run with a live `task(sidekick-fusion)`; add a flame test when wiring is allowed.

### S3 — Diff review (frontier reads the sidekick's diff — normal read flow)

**Claim:** a read-only frontier can verify the sidekick's mutations by reading the resulting diff without needing `edit`/`write` or a broad bash.

**Precedent:** Horowitz proves this daily — it verifies diffs using only `read/grep/glob`, `bash` allowlist (`git diff*`, `git show*`, `ls *`, `cat *`, `rg *`, `bunx tsc --noEmit*`, `bun test*` etc.) and `skill: code-review`. Bernstein's current review-before-close (`horowitz.md:102`, `bernstein.md:97`) uses exactly this lane.

**Reasoning:**

- Horowitz's allowlist covers every verification command Bernstein needs post-delegation: `git diff` (see diff), `git status` (see changed files), `cat/head/tail` (read files), `rg/grep` (search issues), `bun test*` (run exit gate), `bunx tsc --noEmit*` (typecheck). Frontier fusion copies this allowlist verbatim, so no verification capability is lost when `edit`/`write` are denied.
- Diff review is **prompt-level** (Bernstein's house-style demands "Verify against the spec, not just the diff"), not permission-level. The frontier's higher model tier (GLM 5.3 full) gives it the judgment for the review without needing to be the mutator.

**Marker:** `SIMULATED` — not run with a live `git diff` inside a frontier session; trivially verifiable with `git diff --stat` but excluded by the static-only constraint.

---

## DEFERRED (needs a live opencode session to measure)

All deferred items require launching an opencode instance (forbidden this spike) and wiring the experimental preset.

| # | Item | Why it must be live | What the future harness should capture |
|---|---|---|---|
| D1 | **Exact denial error payload** | Error strings come from opencode's host permission layer, not TGO's source — need to capture the `tool.execute.before` / host denial message for a `edit` attempt from a `deny` seat (shape, `ok:false`, `error` vs `output` text). | Run a frontier session that intentionally attempts `edit` on a scratch file; log the full `tool_return` for `edit`. Also capture `write` variant. Verify that the message tells the model to delegate (or at least is interpretable enough to trigger a re-delegation). |
| D2 | **Actual token-cost delta** | Model pricing is external (opencode-go gateway), token counts depend on prompt+diff size, not just model ID. Static estimate is anecdotal (see `REPORT.md`). | Flame test: same `Five-part Spec` executed twice — (A) frontier `bernstein` (GLM 5.3, self-edits) vs (B) frontier `bernstein` (GLM 5.3, delegates all mutations to `sidekick-fusion` on `muse-spark-1.2-contributor` 25 steps). Measure `estimateTokens` before/after and provider-reported usage if available. Vary task sizes (tiny/standard) to see where the sidekick offset crosses negative. |
| D3 | **Bash allowlist completeness for frontier verification** | Horowitz's allowlist is proven for reviews, but Bernstein's reconciliation occasionally needs `git worktree list*` and `bd *` — need to confirm coverage. | Run frontier as primary through a full wave that touches worktree ops + `bd show` + `git diff --stat` + `bunx tsc --noEmit`. Capture any `bash denied: command '…'` events. Adjust allowlist before shipping. |
| D4 | **Denial-loop behavior** | Whether the frontier model obeys the denial error or retries the same `edit` in a tight loop depends on prompting and `doom_loop` detection. | Instrument `doom_loop` + `watchdog` (`plugin/src/watchdog.ts:stuckLoopTools`, `stuckLoopMs`) during a live frontier session that hits a denial. Verify it breaks after ≤3 identical actions (`bernstein.md:106` "3 identical actions → intervene") rather than burning the full steps budget. |
| D5 | **Sidekick context-handoff overhead** | Delegation payload size vs model-price saving — static estimate says "minimal for cheap presets" but needs measurement to set the fitness threshold. | Compare total tokens (primary + sidekick(s)) vs self-edit path across 3 task sizes; set a rule like "only delegate if expected edit tokens >2× delegation overhead." |
| D6 | **Steps25 sufficiency** | Whether 25 steps completes a representative single-file edit without hitting `steps` cap mid-write. | Run sidekick on a real `tiny` ticket (named touch set, explicit transformation, deterministic verification) and a `standard` ticket; log step usage from `plugin/src/board.ts` session metrics. Tune to 25/35/45 as needed. |

---

## Summary table

| ID | Check | Mode | Result | Source |
|---|---|---|---|---|
| V1 | Permission-block syntax | VERIFIED (static) | byte-identical to Horowitz proven reference, `write: deny` delta valid | `horowitz.md:6-85`, `permissions.ts:parseFrontmatter` |
| V2 | Steps cap semantics | VERIFIED (static) | `frontier` mirrors Bernstein absence; `sidekick` 25 within `40/60/100` range; SDK `steps?: number` | `build.test.ts:158-169`, SDK types |
| V3 | Model IDs | VERIFIED (static) | both IDs present in `presets.json` frontier/balanced/cheap | `presets.json:6-24` |
| S1 | Denial behavior | SIMULATED (reasoned) | Horowitz `edit: deny` works in prod; `write: deny` same code path | `horowitz.md`, `permissions.ts:SeatPermission` |
| S2 | Sidekick round-trip | SIMULATED (reasoned) | `task(dylan)` precedent, Five-part Spec, child sessions | `plugin/src/plugin.ts`, `delegation.ts`, `bernstein.md` |
| S3 | Diff review | SIMULATED (reasoned) | Horowitz read-only verification precedent | horowitz bash allowlist |
| D1-D6 | Live costs/behaviors | DEFERRED | requires live opencode wiring (forbidden this spike) | `REPORT.md` §Deferred |

