# Public Beta OpenCode Validation Design

## Goal

Make the public beta dogfood check repeatable before manual UI testing. The check should prove the published npm beta can be installed by OpenCode, can run `/tgo:doctor --json` through the plugin command path, and does not mutate user config during doctor inspection.

## Current Context

- Published npm beta: `trans-genderian-orchestra@2.0.0-beta.2`.
- npm dist-tags: `beta` points to `2.0.0-beta.2`; `latest` remains `2.0.0-beta.0`.
- Real-profile dogfood passed after refreshing the OpenCode plugin cache.
- The passing command path executed `npx --yes trans-genderian-orchestra@beta doctor --json` and did not run `bd doctor`.
- Manual interactive UI testing should remain the final gate, not the next gate.

## Design

Add an explicit release-smoke script, `scripts/verify-public-beta-opencode.ts`, and a package script, `verify:public-beta-opencode`.

The script will:

- Create a disposable temp `HOME` and never write to the real profile.
- Install `trans-genderian-orchestra@beta` into that disposable profile with `opencode plugin trans-genderian-orchestra@beta --global --force`.
- Seed the disposable profile with schema-safe old omo-slim style agent config and a TGO manifest.
- Run `opencode run -m opencode/mimo-v2.5-free --command=tgo:doctor --format json --dir <repo-root> -- --json`.
- Parse OpenCode JSONL output and assert the actual tool command includes `npx --yes trans-genderian-orchestra@beta doctor --json`.
- Assert no actual tool command includes `bd doctor`.
- Assert TGO doctor JSON is present, reports v1 migration availability, and includes planned v2 replacement.
- Assert the disposable config remains unchanged after doctor runs.
- Assert npm `beta` resolves to the local package version so the script detects stale published tags.

## Boundaries

- This is not part of the default `bun run test` path because it depends on OpenCode, npm/network access, and a usable model.
- The script may fail with an actionable message if `opencode`, npm registry access, or `opencode/mimo-v2.5-free` is unavailable.
- The script must not print tokens, auth config, or sensitive provider settings.
- The script must not mutate real `~/.config/opencode` or real project config.

## Acceptance Criteria

- `bun run verify:public-beta-opencode` passes in this environment.
- `RELEASE.md` documents the command as the automated public-beta OpenCode smoke.
- Existing local verification remains passing.
- No npm publish, GitHub release, or `latest` tag change happens as part of this work.
