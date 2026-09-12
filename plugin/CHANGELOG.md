# Changelog

All notable changes to the TGO plugin, in reverse chronological order. Versions track `plugin/package.json`.

## [0.8.0] - 2026-09-12

- **Per-lens bandmate models with `band-members` fallback (opt-in, balanced preset only; cheap/frontier unchanged):** the balanced preset may define optional `cobain` / `grohl` / `novoselic` entries — cobain `opencode-go/muse-spark-1.3-contributor` (xhigh), grohl `opencode-go/qwen3.8-flash` (high), novoselic `opencode-go/deepseek-v4.1-flash` (max). A lens key replaces the whole `band-members` entry for that lens (never merged); lenses without a key share `band-members`.
- **Variant validation fail-closed against the selectable-variant table:** per-lens overrides validate model + variant at load (`SELECTABLE_VARIANTS` — Spark ceiling xhigh, `deepseek-v4.1-flash` high/max, `qwen3.8-flash` high; `max` broken upstream: anomalyco/opencode#45987). Unknown model IDs or unselectable variants on lens keys throw; core-seat model drift still passes through.
- **Dispatch variant threading:** lens dispatch resolves model + variant from the active preset (direct lens key first, `band-members` fallback) and threads the variant into the spawned agent.
- Includes the 0.7.1 primary-gate fix (opencode 1.18.x omits parentID for root sessions), so 0.7.0 users get the full delta in this release.
- **Band runtime hardening (tgo-4r5):** per-lens watchdog caps (3min wall + 3min idle per-seat default for cobain/grohl/novoselic, explicit `watchdog.seats` overrides win, global caps unchanged), nirvana skip-on-failure synthesis (name the missing lens in the Band Summary, never retry, never stall), and lens output cap (`steps: 1` + ≈100-token contract + 2000-char host truncation of lens task output).

## [0.7.1] - 2026-09-12

- **Fix primary-session gate false negative (host omits parentID for root sessions):** opencode 1.18.x `session.get` returns `parentID` only for delegated sessions (non-null string) and omits it for root sessions, so the `hasOwnProperty(parentID) && parentID === null` check denied every real primary session. All five gates (`authorizeLifecycleSession` in `lifecycle.ts`, `isPrimarySessionData` in `session.ts`, board gate, concision gate, style-reinforcement gate) now treat absent/undefined/null `parentID` as primary and a truthy string as delegated. Fail-closed behavior is unchanged for non-object data, missing `session.get`, and thrown errors.
