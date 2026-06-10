import { describe, expect, test } from 'bun:test';
import type { PlannedBeadsIssue } from './work-plan';
import {
  handleWorktreeCreationFailure,
  planTaskWorktrees,
} from './worktree-plan';

const issues: PlannedBeadsIssue[] = [
  {
    planned_issue_id: 'beads-123-task-a',
    task_id: 'task-a',
    title: 'Implement task A',
    dependencies: [],
    artifact_refs: ['docs/plan.md'],
    status: 'planned',
    priority: 1,
  },
  {
    planned_issue_id: 'beads-124-task-b',
    task_id: 'task-b',
    title: 'Implement task B',
    dependencies: [],
    artifact_refs: ['docs/plan.md'],
    status: 'planned',
    priority: 2,
  },
];

describe('task worktree planning', () => {
  test('assigns each builder task a separate deterministic worktree and branch', () => {
    const plans = planTaskWorktrees({
      repo_name: 'demo-repo',
      base_directory: '../.tgo-worktrees',
      base_branch: 'master',
      issues,
    });

    expect(plans.map((plan) => plan.worktree_path)).toEqual([
      '../.tgo-worktrees/demo-repo/beads-123-task-a',
      '../.tgo-worktrees/demo-repo/beads-124-task-b',
    ]);
    expect(plans.map((plan) => plan.branch)).toEqual([
      'tgo/beads-123-task-a',
      'tgo/beads-124-task-b',
    ]);
    expect(new Set(plans.map((plan) => plan.worktree_path)).size).toBe(2);
  });

  test('requires confirmation before falling back to current worktree after creation failure', () => {
    expect(
      handleWorktreeCreationFailure({
        task_id: 'task-a',
        requested_path: '../.tgo-worktrees/demo-repo/beads-123-task-a',
        error_summary: 'permission denied',
      }),
    ).toEqual({
      status: 'blocked_needs_confirmation',
      task_id: 'task-a',
      requested_path: '../.tgo-worktrees/demo-repo/beads-123-task-a',
      warning:
        'Worktree creation failed for task-a: permission denied. Ask before falling back to the current worktree.',
    });
  });
});
