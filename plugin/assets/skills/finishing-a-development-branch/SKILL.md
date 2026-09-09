---
name: finishing-a-development-branch
description: Integrate a finished branch after tests pass. Use when implementation is complete and green — merge locally, open a PR, keep as-is, or discard on request — then clean up the worktree.
license: MIT
---

# Finishing a Development Branch

Verify tests → detect environment → present options → execute choice → clean up. The integration decision belongs to the human partner — present the menu and wait.

## 1. Verify Tests (gate)

Run the full suite on the current tree. On failure report and stop — the menu comes only after green. A green run proves only the tree it ran on.

## 2. Detect Environment

Capture before any directory change: `GIT_DIR` vs `GIT_COMMON` (equal = normal repo, no worktree cleanup), named worktree branch (standard menu + cleanup), detached HEAD (reduced menu, no merge, leave workspace in place).

## 3. Confirm the Base

Base = whatever the work forked from. If unknown, ask ("split from <best guess> — correct?"). Confirm before merging; the wrong base is expensive to undo.

## 4. Present Options

Named branch — exactly these three:

```
1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
```

Detached HEAD — exactly these two (no merge). Discard never appears; it happens only on explicit request plus the typed word `discard`, with branch, commits, and path listed first.

## 5. Execute

**Merge:** from the main root — checkout base, pull, merge, re-run the full suite. Failure: stop, leave branch + worktree, investigate. Green: cleanup (§6), `git branch -d`.

**PR:** push (`-u origin <branch>`, detached: `HEAD:refs/heads/<new-branch>`), open against base per repo template, report URL. Keep the worktree — feedback lands there.

**Keep:** report branch name + worktree path. **Discard:** confirmed only, then cleanup + `git branch -D`. Never force-push/remove unasked.

## 6. Clean Up

Merge/discard only; PR/keep always preserve. From outside the worktree: `.worktrees/`-owned → `git worktree remove` + `prune`. On refusal (uncommitted files exist nowhere else): never `--force` — show status and ask commit/move/delete. Host-owned paths: leave in place.

## Verification

- [ ] Suite green pre- and post-merge on the integrated tree.
- [ ] Partner chose from the exact menu; no assumed merges or discards.
- [ ] Branch deleted only after green merge or confirmed discard; worktree matches the choice.

*Adapted from obra/superpowers `finishing-a-development-branch` (MIT License). Upstream: https://github.com/obra/superpowers*
