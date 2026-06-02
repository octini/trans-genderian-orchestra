export interface ReviewedBranch {
  task_id: string;
  planned_issue_id: string;
  branch: string;
  reviewed_commit: string;
  dependencies: string[];
  priority: number;
}

export interface IntegrationBatchInput {
  repo_name: string;
  plan_id: string;
  integration_base_directory: string;
  reviewed_branches: ReviewedBranch[];
}

export interface ReviewArtifactPlan {
  artifact_id: string;
  artifact_type: 'review';
  subject: string;
  status: 'planned';
}

export type PostIntegrationAction =
  | 'continue_next_issue'
  | 'open_pr'
  | 'leave_for_manual_review'
  | 'merge_to_main'
  | 'inspect_integration_worktree'
  | 'cleanup_completed_worktrees';

export interface PostIntegrationOption {
  action: PostIntegrationAction;
  requires_approval: boolean;
}

export interface IntegrationBatchPlan {
  integration_worktree_path: string;
  branch_review_artifacts: ReviewArtifactPlan[];
  batch_review_artifact: ReviewArtifactPlan;
  merge_order: ReviewedBranch[];
  post_integration_options: PostIntegrationOption[];
}

export interface ReconciliationTaskInput {
  plan_id: string;
  conflicting_branches: string[];
  conflicting_files: string[];
  base_commit: string;
  attempted_merge_order: string[];
  affected_issues: string[];
}

export interface ReconciliationTaskPlan {
  status: 'blocked_reconciliation';
  task_id: string;
  goal: string;
  declared_write_scope: string[];
  affected_issues: string[];
  conflicting_branches: string[];
  conflicting_files: string[];
  base_commit: string;
  attempted_merge_order: string[];
}

function sortReviewedBranches(branches: ReviewedBranch[]): ReviewedBranch[] {
  return [...branches].sort((left, right) => {
    if (right.dependencies.includes(left.task_id)) {
      return -1;
    }

    if (left.dependencies.includes(right.task_id)) {
      return 1;
    }

    return left.priority - right.priority;
  });
}

export function planIntegrationBatch(
  input: IntegrationBatchInput,
): IntegrationBatchPlan {
  return {
    integration_worktree_path: `${input.integration_base_directory}/${input.repo_name}/${input.plan_id}-integration`,
    branch_review_artifacts: input.reviewed_branches.map((branch) => ({
      artifact_id: `review-${branch.task_id}`,
      artifact_type: 'review',
      subject: branch.branch,
      status: 'planned',
    })),
    batch_review_artifact: {
      artifact_id: `review-${input.plan_id}-batch`,
      artifact_type: 'review',
      subject: input.plan_id,
      status: 'planned',
    },
    merge_order: sortReviewedBranches(input.reviewed_branches),
    post_integration_options: [
      { action: 'continue_next_issue', requires_approval: true },
      { action: 'open_pr', requires_approval: true },
      { action: 'leave_for_manual_review', requires_approval: true },
      { action: 'merge_to_main', requires_approval: true },
      { action: 'inspect_integration_worktree', requires_approval: false },
      { action: 'cleanup_completed_worktrees', requires_approval: true },
    ],
  };
}

export function createReconciliationTask(
  input: ReconciliationTaskInput,
): ReconciliationTaskPlan {
  return {
    status: 'blocked_reconciliation',
    task_id: `${input.plan_id}-reconciliation`,
    goal: `Resolve integration conflicts for ${input.plan_id} without automatic conflict-resolution commits.`,
    declared_write_scope: input.conflicting_files,
    affected_issues: input.affected_issues,
    conflicting_branches: input.conflicting_branches,
    conflicting_files: input.conflicting_files,
    base_commit: input.base_commit,
    attempted_merge_order: input.attempted_merge_order,
  };
}
