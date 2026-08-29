# REPORT — Fusion Sidekick Spike (static, time-boxed)

> Branch `tgo/ylz-fusion-spike` @ `8d70a13` (worktree `/Users/ryan/opencode/tgo-wt-ylz`, tree clean before docs). No opencode instance launched. No preset committed.

## GO / NO-GO: CONDITIONAL GO — ship a `frontier-fusion` preset variant ONLY when the conditions below are met

**Headline (explicit):** `CONDITIONAL GO` — mechanics are sound, isolation is proven, the Horowitz permission precedent guarantees denial works, and the `task → cheap writer` round-trip already exists in TGO via Bernstein→Dylan. The unsafe path is wiring it as a **default preset** before measuring the token delta and hardening the denial-loop/bashing edges. The safe path is a **new opt-in preset** (`frontier-fusion`) that keeps `balanced`/`cheap` untouched and is activated only after the Deferred harness (MECHANICS.md D1-D6) clears the conditions in §5.

---

## 1. What was built (static deliverables)

All four files live under `docs/spike/fusion/` (isolated from `plugin/assets/agents/` — see `ISOLATION.md`).

- `SEAT-ASSET.md` — two complete frontmatter blocks:
  - `frontier-seat-fusion.md` — copies Bernstein identity + `mode: primary` + `temperature: 0.1`; model via `plugin/assets/presets.json:frontier.bernstein = opencode-go/glm-5.3 (max)`; steps absent (faithful to `bernstein.md` v0.2.2); permission block = **Horowitz-verbatim** read-only allowlist (38 bash entries, `task: explore` only, `skill: code-review/diagnosing-bugs`) plus intentional `write: deny` to close the `edit/write` distinction. Every field annotated with what it does, why, and the source line.
  - `sidekick-fusion.md` — `mode: subagent`, `muse-spark-1.2-contributor`, `steps: 25`, `edit: allow`/`write: allow`/`bash: allow`, micro-prompt verbatim "apply the requested edit exactly; report files changed; no exploration beyond the named files" (plus the Dylan-convention `{{TGO_HOUSE_STYLE}}` fold).
- `ISOLATION.md` — proves `docs/spike/fusion/` is outside `plugin/src/build.ts:renderSeats`'s `packageRoot + "/assets/agents"` scan and outside `plugin/src/config.ts:resolveAgentsDir`'s `~/.config/opencode/agent` install target, shows the `0.2.2` `reconcileSeats` auto-install that would fire if the assets were under `plugin/assets/agents/`, and why this docs location prevents it.
- `MECHANICS.md` — VERIFIED vs SIMULATED vs DEFERRED split with field-by-field evidence (permission syntax vs Horowitz, steps SDK semantics, model IDs vs `presets.json`; three reasoned flows anchored to Horowitz/Dylan precedents; six deferred live measurements).
- This report.

---

## 2. Mechanics assessment

### 2.1 What is solid

- **Isolation** — proven with repo-relative paths and installer source excerpts. The spike cannot be installed by accident: no code path in `plugin/src/**` reads `docs/`. Moving the same files to `plugin/assets/agents/` would make them live (installed on `npx tgo install` and reconciled on every load since `0.2.2`) — but from `docs/spike/fusion/` they are inert.
- **Permission syntax** — VERIFIED byte-identical to the Horowitz proven reference (`plugin/assets/agents/horowitz.md:6-85` + `~/.config/opencode/agent/horowitz.md` mirror). The only delta is the explicit `write: deny` (valid — `SeatPermission.write` exists and `edit`/`write` are distinct seat tools; Horowitz omits it only because it never writes).
- **Model validity** — both spike IDs exist in `plugin/assets/presets.json` (`opencode-go/glm-5.3` for frontier Bernstein; `muse-spark-1.2-contributor` for sidekick) — no invented model string.
- **Steps semantics** — subagents must carry `steps` (enforced by `plugin/test/build.test.ts:158-169`; Bernstein intentionally carries none as `mode: primary`; sidekick 25 is spec-mandated and within the proven range `horowitz:40 / nas:60 / dylan:100`).
- **Delegation path** — TGO already delegates `Bernstein → Dylan` via `task` with a Five-part Spec (`plugin/src/plugin.ts:tool.execute.before` + `validateDelegationBoundary` + `def-snapshot` + `progress.md`). `Bernstein → sidekick-fusion` with a 25-step cap is the same code path with a tighter prompt and a cheaper model — no new plugin capability is needed.

### 2.2 What is reasoned (SIMULATED) and why we trust it — with residual doubt

| Flow | Trust anchor | Residual doubt | How we close it (Deferred) |
|---|---|---|---|
| Denial (`edit: deny`/`write: deny`) | Horowitz uses `edit: deny` in production and never edits; TGO depends on it for reviewer integrity. `write` is the same permission-layer check on a different key. | Exact denial error payload (string, `ok:` flag) unmeasured; model reaction to it unobserved (does it obey or retry-loop?). | D1 + D4: capture live `edit` denial payload and loop behavior. |
| Sidekick round-trip | Bernstein→Dylan works today — child sessions, `BD_ENV`, worktree family pre-approval, `task` validation, report contract. | Cheap-model output quality on organic edits; verbosity of handoff vs price delta; 25 steps may be tight for `standard` tickets. | D2 + D5 + D6: flame test same task both ways; measure step hops and total tokens. |
| Diff review | Horowitz verifies diffs with the same bash allowlist (`git diff*`, `cat`, `rg`, `bun test*`, `bunx tsc …`). | Frontier may miss `git worktree list*` or `bd *` coverage if Horowitz's list is taken verbatim — needs audit. | D3: verify full wave under frontier allowlist. |

Overall: the *hard parts* are proven (permission deny works; task delegation works; read-only verification works). The remaining unknowns are **operational tuning** (cost delta, bash coverage, loop hardening) — exactly what makes this a CONDITIONAL GO rather than an unreserved GO.

---

## 3. Friction risks (must be addressed before shipping)

### F1 — Bash allowlist granularity (Horowitz's allowlist vs Bernstein's needs)

- **Risk:** Horowitz's allowlist is tight for a reviewer (60+ read-only commands). Bernstein-as-primary occasionally runs `git worktree list*`, `bd ready/list/show/search`, and broad `git ls-tree`. The frontier copy already includes those (because Horowitz does) but a future Bernstein nuance (e.g., `bd create` or `git push` never needed) could be blocked. Over-blocking is safer than under-blocking, but a false denial on `git worktree list` inside the orchestrator would look like a Horowitz denial and confuse the loop.
- **Mitigation:** Before shipping, run a live frontier wave that touches worktree + bd + lint + typecheck (D3). Whitelist any read-only `bd`/`git -C` variants that Bernstein legitimately uses. Keep `edit`/`write`/`grep`/`glob`/`list` denied at the top-level (Horowitz already denies `grep`/`glob`/`list` for Bernstein — fusion inherits that via the verbatim copy).
- **Severity:** Low — Horowitz and Bernstein already share ~90% of their allowlists; diff is small and additive.

### F2 — Sidekick context handoff cost

- **Risk:** The token saving of the cheap model is `price_per_token(delta) × edit_tokens` minus `delegation_overhead_tokens`. If Bernstein passes the entire conversation as delegation context, the cheap model's **input** tokens may offset the model-price win. TGO's current delegation already serializes a compact Five-part Spec + `progress.md`/`def-snapshot` (not the full chat), so overhead is bounded, but it is still additive.
- **Mitigation:** Enforce spec-only handoff (named `Files` list + Interfaces/Constraints/Verification) and cap the delegation packet. Measure (D5) — establish a rule like "delegate only if expected edit tokens > 2× delegation overhead." `balanced`/`cheap` presets avoid this entirely (no delegation).
- **Severity:** Medium — cheap-model pricing is significantly cheaper, so even a modest overhead still nets positive for frontier where edits are large. For `balanced`/`cheap` where Bernstein already runs `muse-spark-1.2-contributor`, the delta is near-zero (see §4) and fusion should not be offered there at all.

### F3 — Denial-loop risk (frontier keeps trying `edit` after a denial)

- **Risk:** The frontier model, seeing a denial error, may interpret it as a transient and retry the same `edit`/`write`, burning its (or the primary's) steps instead of re-delegating. Under `doom_loop` + `watchdog`, after ~3 identical actions (`plugin/src/watchdog.ts:stuckLoopTools`, `bernstein.md:106`) the delegating handler would abort with `## WATCHDOG-ABORT`, but up to that cap tokens are burned for nothing.
- **Mitigation:** Make the denial error **prompt-corrective** — the sidekick handoff instruction should say "if `edit: denied` appears, delegate to `sidekick-fusion` with a Five-part Spec limited to <file>." The frontier prompt already carries "Never use direct `edit`" as a soft guard; harden it with an explicit `write: denied` branch. Tune `doom_loop` to catch `edit`-denial loops early (D4).
- **Severity:** Medium — mitigable with prompting, but the failure mode is the classic "fusion tax" seen in other orchestration plugins (measure before promising saving).

### F4 — Sidekick scope creep (cheap model edits more than the named files)

- **Risk:** `muse-spark-1.2-contributor` is cheaper and faster but more literal; on a vague spec it may "helpfully" refactor neighboring files. The micro-prompt says "no exploration beyond the named files," but without permission-layer enforcement the model can still `grep`/`glob` and find adjacent code.
- **Mitigation:** Keep the Files touch set **named and narrow** (the `tiny` classification pattern: bounded named touch set, explicit transformation, reversibility, deterministic verification — `bernstein.md:99`). Verification ("run `git diff --stat` and confirm only named files changed") is owned by the frontier — if extra files changed, the frontier rejects and re-delegates a corrective slice.
- **Severity:** Low — the verification lane already expects this (Bernstein's "Verify against the spec, not just the diff").

### F5 — Steps exhaustion (25 may be tight for `standard` tickets)

- **Risk:** A 25-step cap on the sidekick is enough for a single-file `tiny` (the most common Dylan handoff), but a `standard` Five-part Spec that spans 3 files plus `bun test` may need 40-60 tool calls. Hitting the cap mid-edit leaves a partial write (watchdog will still reconcile, but Bernstein must retry).
- **Mitigation:** Keep the cap at 25 for the spike and log live step hops (D6). Promote to 40 if median `tiny` exceeds 20 steps. Heavier tickets are already wave-decomposed by Bernstein (max 3 parallel Dylans per wave); fusion would just narrow the blast radius per delegation.
- **Severity:** Low — controlled by wave decomposition.

---

## 4. Estimated token saving

> No live measurement was taken — this spike is static. The estimate below is reasoned from preset model assignments and standard TGO ticket sizes, marked as anecdotal as required. Honest range: uncertain until D2 runs.

### 4.1 Frontier preset (the intended beneficiary)

| Component | Today's frontier (`bernstein = opencode-go/glm-5.3, variant:max`) | Fusion frontier (`bernstein = glm-5.3` read-only, `sidekick = muse-spark-1.2-contributor xhigh`) | Saving |
|---|---|---|---|
| Orchestration (planning, board reads, verifications) | Frontier model at full price on **all** tokens (plan + reads + edits). | Frontier model at full price on plan/reads/reviews only; **edits handled by cheap model**. | Shifts ~40-60% of tokens per edit ticket off the frontier tier. |
| Representative `tiny` (single-file edit, 1 delegation, ~800-1200 edit tokens) | `~1200` frontier tokens for the edit slice | `~1200` cheap tokens for the edit + `~120-180` frontier tokens delegation overhead + `~80` frontier review | **~35-50% net token-cost delta on the edit slice; ~15-30% on the full issue** (plan+review dominate). Flame test required to sharpen. |
| Representative `standard` (3-file refactor, 2-3 waves) | `~3000-5000` frontier edit tokens | 2-3 sidekick delegations at cheap price, same review overhead | **Similar slice delta**, but more sidekick invocations → higher handoff cost — still positive for frontier because the price gap is large. |

**Read:** for the **frontier preset**, fusion is where the money is. The spec's anecdotal "35-60% delta" maps to the edit slice, not the whole issue. Expecting 35-60% end-to-end saving overstates it — the planning/review pass stays on the frontier model by design.

### 4.2 Balanced / Cheap presets

- `balanced.bernstein = opencode-go/glm-5.3-flash` (already cheaper than frontier full), `cheap.bernstein = muse-spark-1.2-contributor`.
- Fusion would delegate Bernstein's edit tokens to a sidekick on the **same** `muse-spark-1.2-contributor` model (`balanced.dylan` and `cheap.dylan` are already that model). The per-token price delta is therefore **minimal — seats already cheap**.
- Adding a delegation hop **adds overhead without a price advantage** → net **negative or flat**. This is not a regression to paper over; it's the reason the spike recommends fusion **NOT** ship for those presets.

**Envelope:**

- Frontier: **conditional positive** — `GO` if live D2 proves `>25-30%` net saving per `tiny`/`standard` after delegation overhead.
- Balanced / Cheap: **`NO-GO` for a fusion variant** — no variant should be built; the existing seats are already cheap enough. The fusion preset surface should be `frontier-fusion` only (or remain a docs-only spike until D2 runs).

---

## 5. Conditions for a full `frontier-fusion` preset variant

Build `frontier-fusion` (new key under `plugin/assets/presets.json`, e.g. `frontier-fusion = { bernstein: { model: "opencode-go/glm-5.3", variant:"max" }, sidekick-fusion: { model:"muse-spark-1.2-contributor", variant:"xhigh" }, dylan/nas/horowitz/nirvana: … }`) **only when all** of the following are satisfied:

1. **[Cost]** Live flame test (D2 + D5) over at least 5 `tiny` + 3 `standard` specs — median **net token-cost saving > 25-30% on `tiny`**, positive on `standard`, after counting delegation packet overhead. Publish the per-ticket report (input/output tokens per seat, step hops).
2. **[Denial]** Live capture (D1 + D4) — `edit`/`write` denial from the read-only frontier surfaces a **stable, prompt-corrective error** and the model **does not retry-loop** beyond 1-2 attempts (cross-checked with `doom_loop` logs). The denial message leads to a `task(sidekick-fusion)` handoff, not a tight loop.
3. **[Bash coverage]** Live audit (D3) — full orchestration wave (board reads, `git diff/status/worktree`, `bd show/ready/search`, `bunx tsc --noEmit`, `bun test`) completes under the Horowitz allowlist without a `bash denied` for a legitimate read-only command. Fix any gap by additive allowlist change (never relax `edit`/`write`).
4. **[Steps]** Live profile (D6) — `tiny` under sidekick completes within **25 steps** for p50 and within **35 steps** for p95; `standard` waves decompose so no single sidekick exceeds 25 (or bump to 40 with evidence).
5. **[Isolation]** Diff gate — `frontier-fusion` preset is **opt-in only** (`bd remember --key tgo.preset` / `--preset frontier-fusion` or equivalent). `balanced`/`cheap` stay default; docs call out that fusion is not recommended there. CI enforces the new preset passes `plugin/test/build.test.ts` budget + `plugin/test/seat-sync.test.ts` + `plugin/test/install.test.ts` (new seat files not covered by reconcile drift unless intended).
6. **[UX]** Delegation handoff prompt is included verbatim ("apply the requested edit exactly; report files changed; no exploration beyond the named files") and the frontier's verification step explicitly checks `git diff --stat` against the `Files` touch set before closing.

If any condition fails, **do not build the preset variant** — keep the spike docs-only, file the failing D-item as a `discovered-from:tgo-ylz` blocker, and revisit after tuning.

---

## 6. Alternative considered (why not just make Bernstein cheap?)

`cheap.bernstein = muse-spark-1.2-contributor` already exists. It eliminates the price delta without any delegation complexity. The fusion split preserves **frontier judgment** (GLM 5.3 / Kimi reasoning) for planning and review while moving **mechanical mutation** to the cheaper tier — a strictly better trade for reasoning-heavy issues where planning quality determines blast-radius correctness. For mechanical issues where the orchestrator's judgment adds little, users are better served by switching the whole issue to the `cheap` preset than by adding fusion overhead.

---

## 7. Exit gate for this spike (static)

- [x] Four files present under `docs/spike/fusion/`: `SEAT-ASSET.md`, `ISOLATION.md`, `MECHANICS.md`, `REPORT.md` (this file).
- [x] `ISOLATION.md` shows real installer paths (`plugin/src/build.ts`, `plugin/src/config.ts:resolveAgentsDir`, `plugin/src/seat-sync.ts:reconcileSeats`, `plugin/src/install.ts:buildSeatsTo`) with excerpts and the post-0.2.2 reconcile danger that the isolation prevents.
- [x] `REPORT.md` has an **explicit GO/NO-GO headline** (CONDITIONAL GO) with friction, token estimate (frontier vs balanced/cheap), and conditions for a full preset-variant build.
- [ ] `bunx tsc --noEmit` clean — trivially satisfied (repo src untouched; only `docs/` changed) — to be run before commit (see verification below).
- [ ] `bun test` full suite 0 fail — same (docs not in `plugin/test/**`) — to be run before commit.
- [ ] Single commit `docs(tgo-ylz): fusion sidekick spike — assets, isolation proof, mechanics report` on branch `tgo/ylz-fusion-spike` (not master, no push); leave `tgo-ylz` in_progress (bd from `/Users/ryan/opencode/tgo`).

---

## 8. Recommendation (summary for Bernstein)

**CONDITIONAL GO.**

The fusion mechanic is **architecturally compatible** with TGO (permission-deny is already proven by Horowitz; task delegation to a writer already exists via Dylan; isolation of experimental seats is proven). The remaining work is **pricing + prompt hardening**, not invention.

**Next step is not a preset PR** — it is a live flame harness (D1-D6) that runs ~5 `tiny` + 3 `standard` specs in `frontier` vs `frontier+sidekick` and ships the token/step report. If that report clears 25-30% net saving and the denial-loop stays cold, then open the `frontier-fusion` preset PR with the sidekick seat + a new `frontier-fusion` entry in `plugin/assets/presets.json` behind the opt-in flag.

Until then, `balanced`/`cheap` should **not** receive a fusion variant (minimal saving — seats already cheap).

