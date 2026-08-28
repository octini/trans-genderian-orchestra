# Exit Gate — per-repo profile

Chosen location: `.tgo/gate.json` (alongside `.tgo/runs/`).

- Why `.tgo/gate.json` over `tgo.json` gate section: keeps gate config versioned per worktree next to run logs, avoids coupling to the opencode plugin options loader (`loadTgoConfig`), and makes per-worktree overrides trivial to inspect. If the file is absent, safe defaults are used — backward compat (lenient gate, trajectory skip with WARNING).
- Content: `enabled` (master), `toggles` (`deltaSpec`, `triage`, `trajectory` — false skips axis entirely, never downgrades CRITICAL), `blacklist` (regex strings, case-insensitive, matched against `tool + cmd + note` per contract v2; pattern capped 200, haystack 500 for ReDoS safety), `trajectory` (`maxSteps`, `expectedSequence`).
- Contract v2 run log: `.tgo/runs/<runId>.jsonl` one JSON per line `{ts, type:"step"|"heartbeat"|"status", seat, tool, argsHash, ok, durationMs, note, cmd?, issueId}` — tool non-empty on ALL lines (heartbeat uses `tool:"heartbeat"`), ok strict boolean (no coercion), issueId valid bead ID required, cmd optional (bash/edit/write actual command truncated 500, control chars stripped), type:"status" reserved for terminal outcomes only (note complete|failed|aborted). Reader ignores lines failing required-field validation; terminal detection only on type:"status" (missing → WARNING TRAJECTORY_INCOMPLETE).
- Example `.tgo/gate.json`:
```json
{
  "enabled": true,
  "toggles": { "deltaSpec": true, "triage": true, "trajectory": true },
  "blacklist": ["rm\\s+-rf\\s+/(\\s|$)", "mkfs", "dd\\s+if="],
  "trajectory": { "maxSteps": 250, "expectedSequence": [] }
}
```
- Defaults ship in `profile.ts` (`DEFAULT_BLACKLIST`, `DEFAULT_GATE_PROFILE`) but are not hard-coded checks — every blacklist evaluation uses the loaded profile.
- Deterministic, no network, no LLM. Run log path uses `assertValidBeadID`/`isValidBeadID` for runId/issueId.
- Enforcement: `lifecycle.ts:evaluateGatedClosure` is the authoritative close decision — when gate.blocked, `canClose:false` + `closureBlocked:true` + typed `GATE_BLOCKED_CRITICAL` + compensation `discovered-from` link; gate evaluation errors → typed blocked-with-error, never silent proceed.
