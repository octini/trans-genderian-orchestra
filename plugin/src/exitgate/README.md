# Exit Gate — per-repo profile

Chosen location: `.tgo/gate.json` (alongside `.tgo/runs/`).

- Why `.tgo/gate.json` over `tgo.json` gate section: keeps gate config versioned per worktree next to run logs, avoids coupling to the opencode plugin options loader (`loadTgoConfig`), and makes per-worktree overrides trivial to inspect. If the file is absent, safe defaults are used — backward compat (lenient gate, trajectory skip with WARNING).
- Content: `enabled` (master), `toggles` (`deltaSpec`, `triage`, `trajectory`), `blacklist` (regex strings, case-insensitive, matched against `tool + note` of run steps), `trajectory` (`maxSteps`, `expectedSequence`).
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
- Deterministic, no network, no LLM. Run log: `.tgo/runs/<runId>.jsonl` (one JSON per line, `assertValidBeadID` for path, FNV argsHash opaque).
