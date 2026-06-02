import type { PlannedBeadsIssue } from './work-plan';

export interface TaskWorktreePlanInput {
  repo_name: string;
  base_directory: string;
  base_branch: string;
  issues: PlannedBeadsIssue[];
}

export interface TaskWorktreePlan {
  task_id: string;
  planned_issue_id: string;
  worktree_path: string;
  branch: string;
  base_branch: string;
}

export interface WorktreeCreationFailureInput {
  task_id: string;
  requested_path: string;
  error_summary: string;
}

export interface WorktreeCreationFailurePlan {
  status: 'blocked_needs_confirmation';
  task_id: string;
  requested_path: string;
  warning: string;
}

export function planTaskWorktrees(
  input: TaskWorktreePlanInput,
): TaskWorktreePlan[] {
  return input.issues.map((issue) => ({
    task_id: issue.task_id,
    planned_issue_id: issue.planned_issue_id,
    worktree_path: `${input.base_directory}/${input.repo_name}/${issue.planned_issue_id}`,
    branch: `tgo/${issue.planned_issue_id}`,
    base_branch: input.base_branch,
  }));
}

export function handleWorktreeCreationFailure(
  input: WorktreeCreationFailureInput,
): WorktreeCreationFailurePlan {
  return {
    status: 'blocked_needs_confirmation',
    task_id: input.task_id,
    requested_path: input.requested_path,
    warning: `Worktree creation failed for ${input.task_id}: ${input.error_summary}. Ask before falling back to the current worktree.`,
  };
}
