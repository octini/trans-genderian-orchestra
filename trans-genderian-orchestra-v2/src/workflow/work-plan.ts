export type PlanArtifactStatus = 'draft' | 'approved' | 'active' | 'completed';
export type TaskRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface PlanTaskMetadata {
  task_id: string;
  goal: string;
  acceptance_criteria: string[];
  dependencies?: string[];
  declared_write_scope: string[];
  expected_read_context: string[];
  validation_commands: string[];
  parallel_group: string;
  risk_level: TaskRiskLevel;
  requires_user_decision: boolean;
  beads_issue: string;
  artifact_refs: string[];
  priority: number;
}

export interface ApprovedPlanWorkRequest {
  stream_id: string;
  plan_id: string;
  plan_status: PlanArtifactStatus;
  plan_artifact_ref: string;
  repo_name: string;
  base_branch: string;
  tasks: PlanTaskMetadata[];
}

export interface SchedulableTaskValidation {
  schedulable: boolean;
  errors: string[];
}

export interface PlannedBeadsIssue {
  planned_issue_id: string;
  task_id: string;
  title: string;
  dependencies: string[];
  artifact_refs: string[];
  status: 'planned';
  priority: number;
}

export interface PlannedBeadsIssueResult {
  status: 'ready' | 'blocked';
  blocked_reason?: 'approved_plan_required' | 'unschedulable_task_metadata';
  planned_issues: PlannedBeadsIssue[];
  errors: string[];
}

export function validateSchedulableTask(
  task: PlanTaskMetadata,
): SchedulableTaskValidation {
  const errors: string[] = [];

  if (!Array.isArray(task.dependencies)) {
    errors.push('Missing dependencies metadata.');
  }
  if (task.acceptance_criteria.length === 0) {
    errors.push('Missing acceptance criteria.');
  }
  if (task.declared_write_scope.length === 0) {
    errors.push('Missing declared write scope.');
  }
  if (task.validation_commands.length === 0) {
    errors.push('Missing validation commands.');
  }
  if (task.artifact_refs.length === 0) {
    errors.push('Missing artifact refs.');
  }

  return {
    schedulable: errors.length === 0,
    errors,
  };
}

export function createPlannedBeadsIssues(
  request: ApprovedPlanWorkRequest,
): PlannedBeadsIssueResult {
  if (request.plan_status !== 'approved') {
    return {
      status: 'blocked',
      blocked_reason: 'approved_plan_required',
      planned_issues: [],
      errors: [
        'Approved plan status is required before planning Beads issues.',
      ],
    };
  }

  const validationErrors = request.tasks.flatMap((task) =>
    validateSchedulableTask(task).errors.map(
      (error) => `${task.task_id}: ${error}`,
    ),
  );

  if (validationErrors.length > 0) {
    return {
      status: 'blocked',
      blocked_reason: 'unschedulable_task_metadata',
      planned_issues: [],
      errors: validationErrors,
    };
  }

  return {
    status: 'ready',
    planned_issues: request.tasks.map((task) => ({
      planned_issue_id: `${request.plan_id}-${task.task_id}`,
      task_id: task.task_id,
      title: task.goal,
      dependencies: task.dependencies ?? [],
      artifact_refs: task.artifact_refs,
      status: 'planned',
      priority: task.priority,
    })),
    errors: [],
  };
}
