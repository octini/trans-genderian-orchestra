import { describe, expect, test } from 'bun:test';
import {
  type ApprovedPlanWorkRequest,
  createPlannedBeadsIssues,
  type PlanTaskMetadata,
  validateSchedulableTask,
} from './work-plan';

function validTask(
  overrides: Partial<PlanTaskMetadata> = {},
): PlanTaskMetadata {
  return {
    task_id: 'task-a',
    goal: 'Implement task A',
    acceptance_criteria: ['Task A passes validation'],
    dependencies: [],
    declared_write_scope: ['src/task-a/**'],
    expected_read_context: ['docs/spec.md'],
    validation_commands: ['bun test src/task-a.test.ts'],
    parallel_group: 'phase4',
    risk_level: 'medium',
    requires_user_decision: false,
    beads_issue: 'pending',
    artifact_refs: ['docs/superpowers/plans/phase4.md'],
    priority: 2,
    ...overrides,
  };
}

function request(
  overrides: Partial<ApprovedPlanWorkRequest> = {},
): ApprovedPlanWorkRequest {
  return {
    stream_id: 'stream-phase4',
    plan_id: 'phase4-plan',
    plan_status: 'approved',
    plan_artifact_ref: 'docs/superpowers/plans/phase4.md',
    repo_name: 'demo-repo',
    base_branch: 'master',
    tasks: [validTask()],
    ...overrides,
  };
}

describe('approved plan work metadata', () => {
  test('generates planned Beads issues only for approved plans', () => {
    const approved = createPlannedBeadsIssues(request());
    const draft = createPlannedBeadsIssues(request({ plan_status: 'draft' }));

    expect(approved.status).toBe('ready');
    expect(approved.planned_issues).toEqual([
      {
        planned_issue_id: 'phase4-plan-task-a',
        task_id: 'task-a',
        title: 'Implement task A',
        dependencies: [],
        artifact_refs: ['docs/superpowers/plans/phase4.md'],
        status: 'planned',
        priority: 2,
      },
    ]);
    expect(draft.status).toBe('blocked');
    expect(draft.blocked_reason).toBe('approved_plan_required');
    expect(draft.planned_issues).toEqual([]);
  });

  test('requires schedulable metadata before auto-parallelization', () => {
    const result = validateSchedulableTask(
      validTask({
        acceptance_criteria: [],
        dependencies: undefined,
        declared_write_scope: [],
        validation_commands: [],
        artifact_refs: [],
      }),
    );

    expect(result.schedulable).toBe(false);
    expect(result.errors).toContain('Missing dependencies metadata.');
    expect(result.errors).toContain('Missing acceptance criteria.');
    expect(result.errors).toContain('Missing declared write scope.');
    expect(result.errors).toContain('Missing validation commands.');
    expect(result.errors).toContain('Missing artifact refs.');
  });

  test('accepts complete schedulable task metadata', () => {
    expect(validateSchedulableTask(validTask())).toEqual({
      schedulable: true,
      errors: [],
    });
  });
});
