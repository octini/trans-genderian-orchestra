# src/hooks/post-file-tool-nudge/

## Responsibility

Detect file interaction (`Read`/`Write`) and append a concise internal reminder to the tool output. The nudge reinforces role boundaries and retrieval-led delegation after file operations.

## Design

- Factory `createPostFileToolNudgeHook(options?)` emits a `tool.execute.after` handler.
- `FILE_TOOLS` is the canonical set `{ 'Read', 'read', 'Write', 'write' }`.
- Injection is optional per session via `options.shouldInject?: (sessionID) => boolean`.
- The reminder text comes from `POST_FILE_TOOL_NUDGE_TEXT` in `src/config/constants.ts` via the local `POST_FILE_TOOL_NUDGE` alias.

## Flow
1. `tool.execute.after`: if tool is a file tool and has `sessionID`, continue.
2. Optional `shouldInject` can skip the reminder for that session.
3. If `output.output` is a string and does not already contain the nudge, append an `<internal_reminder>` block with `POST_FILE_TOOL_NUDGE_TEXT`.
4. Non-string outputs, non-file tools, missing sessions, or already-reminded outputs are left unchanged.

## Integration

- Registered via `src/hooks/index.ts` and activated in plugin lifecycle registration.
- Mutates only the current string tool output; it is a reminder/nudge, not a hard security boundary.
- Consumed by Conductor session flows that need anti-pattern mitigation for `inspect/edit → implement myself` loops.
