# Changelog

All notable changes to the TGO plugin, in reverse chronological order. Versions track `plugin/package.json`.

## [0.7.1] - 2026-09-12

- **Fix primary-session gate false negative (host omits parentID for root sessions):** opencode 1.18.x `session.get` returns `parentID` only for delegated sessions (non-null string) and omits it for root sessions, so the `hasOwnProperty(parentID) && parentID === null` check denied every real primary session. All five gates (`authorizeLifecycleSession` in `lifecycle.ts`, `isPrimarySessionData` in `session.ts`, board gate, concision gate, style-reinforcement gate) now treat absent/undefined/null `parentID` as primary and a truthy string as delegated. Fail-closed behavior is unchanged for non-object data, missing `session.get`, and thrown errors.
