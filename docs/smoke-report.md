# TGO 0.3.0 — Integration Smoke Report

Generated as the `tgo-4qw` pre-commit gate. Nothing is committed until this report is green and the user explicitly approves.

## Gates

| Gate | Command | Result |
|------|---------|--------|
| Typecheck | `tsc --noEmit` (plugin/) | ✅ clean (0 errors) |
| Full suite | `bun test` (plugin/) | ✅ 943 pass / 0 fail (54 files, 3950 expects) |
| Lean build | `bun run src/build.ts` | ✅ `dist/server.js` + `dist/tui.js` rebuilt; 8 seat prompts under budget; lean check OK |

## End-to-end scenarios (`bun test test/smoke.test.ts`)

| Scenario | Evidence | Result |
|----------|----------|--------|
| manifest conflict rejected at plan time | overlapping same-parallelSet scope → `ManifestScopeConflictError` | ✅ |
| version pin badge | `writeDefSnapshot`→`readDefSnapshot` round-trip (promptHash/model) | ✅ |
| step replay round-trip | produced run log → `replayStep` returns frozen input hash | ✅ |
| recursion block | child at `maxDepth:1` → `allowed:false` with depth reason | ✅ |
| suspend → prose resume | valid resume clears gate; invalid reply rejected | ✅ |
| exit-gate blocks bad report | blacklisted run-log note → `gate.blocked:true` | ✅ |
| convoy auto-landing | out-of-arrival completion still lands waves `[1,2,3]` | ✅ |
| queue gauge under load | `renderQueueLine` reports pending count | ✅ |
| problems view stuck render | `buildProblemsSection` lists stuck run | ✅ |
| closed-issue filter | `stateOf` maps closed beads → `closed` | ✅ |

## Feature coverage (unit suites)

| Ticket | Feature | Tests |
|--------|---------|-------|
| tgo-5t1 | version pinning (def snapshot) | 41 |
| tgo-a9i | sidebar closed-issue filter | 11 |
| tgo-9kk | status taxonomy | 30 |
| tgo-z8s | exit gates | 44 |
| tgo-esy | wait gate (suspend/resume) | 22 |
| tgo-2ry | problems view | — |
| tgo-bh0 | worktree lanes | 24 |
| tgo-dw5 | manifests + hooks | 38 |
| tgo-wpl | recursion blocking | — |
| tgo-5em | quota presets + cost surface | 19 |
| tgo-4wq | convoys | 11 |
| tgo-ccl | step replay | 6 |

## Notes

- `dist/` was rebuilt during this gate and now contains the wave-3+ source (it was previously stale as of wave-2).
- The smoke harness is committed (`test/smoke.test.ts`) and re-runnable on a clean checkout via `bun test test/smoke.test.ts`.
- Uncommitted working tree carries all twelve feature tickets' changes (plus the destination-hash audit fixes for bh0/dw5); nothing committed or pushed pending user approval.