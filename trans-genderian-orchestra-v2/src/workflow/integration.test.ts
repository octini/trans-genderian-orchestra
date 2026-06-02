import { describe, expect, test } from 'bun:test';

import { createReconciliationTask, planIntegrationBatch } from './integration';

describe('integration planning', () => {
  test('plans branch reviewer artifacts, batch reviewer artifact, and integration worktree', () => {
    const plan = planIntegrationBatch({
      repo_name: 'demo-repo',
      plan_id: 'phase4-plan',
      integration_base_directory: '../.tgo-worktrees',
      reviewed_branches: [
        {
          task_id: 'task-a',
          planned_issue_id: 'beads-123-task-a',
          branch: 'tgo/beads-123-task-a',
          reviewed_commit: 'abc123',
          dependencies: [],
          priority: 2,
        },
        {
          task_id: 'task-b',
          planned_issue_id: 'beads-124-task-b',
          branch: 'tgo/beads-124-task-b',
          reviewed_commit: 'def456',
          dependencies: ['task-a'],
          priority: 1,
        },
      ],
    });

    expect(plan.integration_worktree_path).toBe(
      '../.tgo-worktrees/demo-repo/phase4-plan-integration',
    );
    expect(
      plan.branch_review_artifacts.map((artifact) => artifact.artifact_id),
    ).toEqual(['review-task-a', 'review-task-b']);
    expect(plan.batch_review_artifact.artifact_id).toBe(
      'review-phase4-plan-batch',
    );
    expect(plan.merge_order.map((branch) => branch.task_id)).toEqual([
      'task-a',
      'task-b',
    ]);
    expect(plan.post_integration_options).toEqual([
      { action: 'continue_next_issue', requires_approval: true },
      { action: 'open_pr', requires_approval: true },
      { action: 'leave_for_manual_review', requires_approval: true },
      { action: 'merge_to_main', requires_approval: true },
      { action: 'inspect_integration_worktree', requires_approval: false },
      { action: 'cleanup_completed_worktrees', requires_approval: true },
    ]);
  });

  test('creates reconciliation task instead of automatic conflict-resolution commit', () => {
    expect(
      createReconciliationTask({
        plan_id: 'phase4-plan',
        conflicting_branches: ['tgo/beads-123-task-a', 'tgo/beads-124-task-b'],
        conflicting_files: ['src/shared.ts'],
        base_commit: 'base123',
        attempted_merge_order: ['task-a', 'task-b'],
        affected_issues: ['beads-123-task-a', 'beads-124-task-b'],
      }),
    ).toEqual({
      status: 'blocked_reconciliation',
      task_id: 'phase4-plan-reconciliation',
      goal: 'Resolve integration conflicts for phase4-plan without automatic conflict-resolution commits.',
      declared_write_scope: ['src/shared.ts'],
      affected_issues: ['beads-123-task-a', 'beads-124-task-b'],
      conflicting_branches: ['tgo/beads-123-task-a', 'tgo/beads-124-task-b'],
      conflicting_files: ['src/shared.ts'],
      base_commit: 'base123',
      attempted_merge_order: ['task-a', 'task-b'],
    });
  });
});
