import { describe, expect, test } from 'bun:test';
import type { ApprovedPlanWorkRequest, PlanTaskMetadata } from './work-plan';
import { previewTgoWork } from './work-preview';

function task(
  task_id: string,
  declared_write_scope: string[],
  dependencies: string[] = [],
): PlanTaskMetadata {
  return {
    task_id,
    goal: `Implement ${task_id}`,
    acceptance_criteria: [`${task_id} passes`],
    dependencies,
    declared_write_scope,
    expected_read_context: ['docs/spec.md'],
    validation_commands: [`bun test ${task_id}.test.ts`],
    parallel_group: 'phase4',
    risk_level: 'medium',
    requires_user_decision: false,
    beads_issue: 'pending',
    artifact_refs: ['docs/plan.md'],
    priority: 1,
  };
}

function request(
  overrides: Partial<ApprovedPlanWorkRequest> = {},
): ApprovedPlanWorkRequest {
  return {
    stream_id: 'stream-phase4',
    plan_id: 'phase4-plan',
    plan_status: 'approved',
    plan_artifact_ref: 'docs/plan.md',
    repo_name: 'demo-repo',
    base_branch: 'master',
    tasks: [
      task('task-a', ['src/a/**']),
      task('task-b', ['src/b/**']),
      task('task-c', ['src/c/**'], ['task-a']),
    ],
    ...overrides,
  };
}

describe('tgo work preview', () => {
  test('composes approved Beads, scheduler, worktree, review, and integration plans', () => {
    const preview = previewTgoWork(request());

    expect(preview.status).toBe('ready');
    expect(preview.planned_beads_issues).toHaveLength(3);
    expect(preview.scheduler.limits.max_parallel_builders).toBe(2);
    expect(preview.scheduler.waves.map((wave) => wave.task_ids)).toEqual([
      ['task-a', 'task-b'],
      ['task-c'],
    ]);
    expect(
      new Set(preview.worktrees.map((plan) => plan.worktree_path)).size,
    ).toBe(3);
    expect(preview.integration?.integration_worktree_path).toBe(
      '../.tgo-worktrees/demo-repo/phase4-plan-integration',
    );
    expect(preview.integration?.branch_review_artifacts).toHaveLength(3);
    expect(preview.integration?.batch_review_artifact.artifact_id).toBe(
      'review-phase4-plan-batch',
    );
    expect(preview.forbidden_automatic_actions).toEqual([
      'push',
      'open_pr',
      'merge_to_main',
      'cleanup_worktrees',
    ]);
  });

  test('blocks draft plan previews before Beads issue planning', () => {
    const preview = previewTgoWork(request({ plan_status: 'draft' }));

    expect(preview.status).toBe('blocked');
    expect(preview.blocked_reason).toBe('approved_plan_required');
    expect(preview.planned_beads_issues).toEqual([]);
    expect(preview.worktrees).toEqual([]);
    expect(preview.integration).toBeUndefined();
  });
});
