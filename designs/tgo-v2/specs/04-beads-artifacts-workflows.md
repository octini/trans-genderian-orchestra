---
artifact_type: design_spec
status: draft
spec_id: tgo-v2-04-beads-artifacts-workflows
created_at: 2026-06-02
updated_at: 2026-06-02
source_checkpoint: designs/tgo-v2-settled-decisions.md
---

# Beads, Artifacts, Workflows, And Project Context

## Beads Versus TGO Artifacts

Beads owns work tracking. TGO artifacts preserve reasoning and verification history.

Beads tracks:

- Actionable issues.
- Dependencies.
- Status.
- Priority/order.
- Ready/blocked state.

TGO artifacts track:

- Specs.
- Plans.
- Evidence.
- Reviews.
- Handoffs.
- Decisions.
- Validation profiles.
- Worktree/integration state.

TGO links Beads issues to artifacts rather than duplicating full artifact content into Beads.

## Artifact Format

Specs, plans, evidence packs, reviews, and handoffs are Markdown files with YAML frontmatter. Typical frontmatter:

- `artifact_type`
- `status`
- `stream_id`
- `beads_issue`
- `created_at`
- `updated_at`
- `superseded_by`
- `worktree`
- `branch`
- `commit`

Machine state and manifests are JSONC. Doctor validates frontmatter enough to detect broken links/status drift, but does not deeply parse every Markdown body.

## Artifact Lifecycle

Artifact statuses include:

- `draft`
- `approved`
- `active`
- `completed`
- `superseded`
- `archived`

Specs/plans start as `draft`. User-approved specs/plans become `approved`. Implementation-linked plans become `active`. Completed/reviewed plans become `completed`. Replaced decisions become `superseded` with `superseded_by`. Old streams become `archived`.

Reviewer/Council artifacts are immutable audit evidence after creation except metadata fixes.

## Beads Issue Generation

Approved TGO implementation plans automatically generate/link Beads issues, but only after spec/plan approval.

Each plan task becomes one Beads issue with dependencies/status and links back to relevant TGO spec/plan/evidence/review files. TGO must not create Beads issues during early brainstorming or unapproved design.

Doctor detects approved plan tasks without linked Beads issues and offers repair.

## TGO-Managed Beads Lifecycle

TGO mutates Beads automatically only for TGO-managed issues.

- On worktree/branch creation: mark issue `in_progress`, link spec/plan artifacts.
- Builder done but Reviewer pending: keep `in_progress`, add branch/implementation artifact info.
- Reviewer rejection: record blocked status or blocked note with Reviewer artifact link.
- Reviewer pass plus auto-commit: mark complete/done and record commit hash plus review artifact link.
- Validation override: record in both Beads and TGO artifact.

Non-TGO/user-managed Beads issues are not mutated automatically unless selected for TGO work.

## TGO Work Flow

`/tgo:work` and inferred work intent use Beads and artifacts together.

If a ready Beads issue is linked to an approved TGO plan, Orchestrator can proceed through Goal Confirmation, scheduling, Builder delegation, Reviewer gate, commit, integration, validation, and Beads updates.

If a ready Beads issue is not linked to an approved TGO plan, TGO uses a lightweight intake gate first. Orchestrator retrieves issue context, checks project docs, creates or asks for a minimal spec/task brief, then gets approval before implementation. Trivial maintenance may use a very small brief.

## Work Autonomy

Autonomy is conversation-triggered, not unattended.

TGO should not start work just because Beads has ready issues. It must not launch edits from startup, timers, compaction hooks, or background polling. Work starts when the user invokes a command or normal language indicates work intent.

Default settings:

- `auto_worktree: true`
- `auto_continue: true`
- `auto_commit_after_review: true`
- Parallel Builders enabled with scheduler guardrails.

Users can disable these globally or per project.

## Project Init Outputs

`/tgo:init` creates lean project context:

- `AGENTS.md`: entrypoint with critical rules and links.
- `CONTEXT.md`: glossary/domain terms when needed.
- `docs/agents/issue-tracker.md`: Beads-aware issue tracker guidance.
- `docs/agents/triage-labels.md`: local triage vocabulary when useful.
- `docs/agents/domain.md`: domain docs guidance.
- `docs/agents/validation.md`: validation profile.
- `.opencode/tgo/*`: artifact directories and project state.

`AGENTS.md` should avoid dumping all detailed guidance inline. It should link to generated docs and TGO artifacts.

## Validation Profile

`docs/agents/validation.md` plus manifest metadata records project validation setup:

- Install command.
- Build command.
- Typecheck command.
- Test command.
- Lint command.
- Fast task-level validation.
- Full integration validation.
- Known acceptable pre-existing failures.
- Unsafe commands requiring confirmation.
- Manual OpenCode validation prompts for agent behavior.

TGO may detect obvious commands from `package.json`, lockfiles, CI workflows, and repo conventions, but must preview and ask before treating them as authoritative. Specs/plans reference this profile and may add task-specific validation commands.

## Post-Commit And Post-Integration Options

After Reviewer passes and TGO creates task commits, TGO pauses or continues only within chain-local rules.

After integration, user sees explicit options:

- Continue to next approved Beads issue.
- Open a PR using `gh`/GitHub tooling after preview.
- Leave branch/worktree for manual review.
- Merge locally only after explicit approval.
- Inspect integration worktree.
- Clean up completed worktrees only after explicit confirmation.

TGO never pushes, opens PRs, merges into main, squashes, or deletes branches/worktrees automatically by default.

## Worktree Cleanup

TGO never deletes worktrees automatically. Doctor reports stale, merged, abandoned, or inconsistent worktrees and offers cleanup through explicit repair such as `/tgo:doctor --repair --prune-worktrees` or inferred “clean up completed TGO worktrees.”

## Failure, Warning, And Override Metadata

Artifacts and Beads capture failures without dumping noisy logs.

Artifact metadata for failed/degraded workflows includes:

- `failure_type`
- `attempt_count`
- `last_error_summary`
- `fallback_used`
- `retry_budget_remaining`
- `blocked_on`
- `recommended_next_step`

Overrides require a reason and are recorded in artifact frontmatter/body, Beads notes if issue-linked, and manifest state if setup/config-related. Overrides cannot bypass hard safety rules.
