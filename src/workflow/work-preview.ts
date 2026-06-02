import { type IntegrationBatchPlan, planIntegrationBatch } from './integration';
import { planSchedulerWaves, type SchedulerPlan } from './scheduler';
import {
  type ApprovedPlanWorkRequest,
  createPlannedBeadsIssues,
  type PlannedBeadsIssue,
} from './work-plan';
import { planTaskWorktrees, type TaskWorktreePlan } from './worktree-plan';

export interface TgoWorkPreview {
  status: 'ready' | 'blocked';
  blocked_reason?: 'approved_plan_required' | 'unschedulable_task_metadata';
  planned_beads_issues: PlannedBeadsIssue[];
  scheduler: SchedulerPlan;
  worktrees: TaskWorktreePlan[];
  integration?: IntegrationBatchPlan;
  forbidden_automatic_actions: Array<
    'push' | 'open_pr' | 'merge_to_main' | 'cleanup_worktrees'
  >;
}

export function previewTgoWork(
  request: ApprovedPlanWorkRequest,
): TgoWorkPreview {
  const beads = createPlannedBeadsIssues(request);
  const emptyScheduler = planSchedulerWaves([]);
  const forbidden_automatic_actions: TgoWorkPreview['forbidden_automatic_actions'] =
    ['push', 'open_pr', 'merge_to_main', 'cleanup_worktrees'];

  if (beads.status === 'blocked') {
    return {
      status: 'blocked',
      blocked_reason: beads.blocked_reason,
      planned_beads_issues: [],
      scheduler: emptyScheduler,
      worktrees: [],
      forbidden_automatic_actions,
    };
  }

  const scheduler = planSchedulerWaves(request.tasks);
  const worktrees = planTaskWorktrees({
    repo_name: request.repo_name,
    base_directory: '../.tgo-worktrees',
    base_branch: request.base_branch,
    issues: beads.planned_issues,
  });
  const orderedTaskIds = scheduler.waves.flatMap((wave) => wave.task_ids);
  const orderedWorktrees = orderedTaskIds.flatMap((taskId) =>
    worktrees.filter((worktree) => worktree.task_id === taskId),
  );
  const integration = planIntegrationBatch({
    repo_name: request.repo_name,
    plan_id: request.plan_id,
    integration_base_directory: '../.tgo-worktrees',
    reviewed_branches: orderedWorktrees.map((worktree) => {
      const task = request.tasks.find(
        (candidate) => candidate.task_id === worktree.task_id,
      );
      const issue = beads.planned_issues.find(
        (candidate) => candidate.task_id === worktree.task_id,
      );

      return {
        task_id: worktree.task_id,
        planned_issue_id: worktree.planned_issue_id,
        branch: worktree.branch,
        reviewed_commit: 'pending-review',
        dependencies: task?.dependencies ?? [],
        priority: issue?.priority ?? 3,
      };
    }),
  });

  return {
    status: 'ready',
    planned_beads_issues: beads.planned_issues,
    scheduler,
    worktrees,
    integration,
    forbidden_automatic_actions,
  };
}
