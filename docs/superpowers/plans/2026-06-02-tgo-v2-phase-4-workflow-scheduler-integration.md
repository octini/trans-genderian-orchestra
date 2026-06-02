# TGO v2 Phase 4 Workflow Scheduler And Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic Phase 4 workflow planning primitives for approved-plan Beads issue generation, guarded scheduler waves, task worktree assignments, review/integration planning, reconciliation planning, and `/tgo:work` runtime guidance.

**Architecture:** Phase 4 adds pure TypeScript workflow modules that preview the work TGO would perform before any external mutation happens. The modules compose existing Phase 3 contracts with new Beads/worktree/scheduler/integration plan objects, so unit tests can verify the safety gates without creating real Beads issues, branches, worktrees, pushes, PRs, or cleanup actions.

**Tech Stack:** TypeScript, Bun test, Biome, existing plugin command config modules, no new runtime dependencies.

---

## Source Specs

- `designs/tgo-v2/specs/01-agent-workflow-delegation-review.md`
- `designs/tgo-v2/specs/02-bootstrap-setup-doctor-manifests.md`
- `designs/tgo-v2/specs/04-beads-artifacts-workflows.md`
- `designs/tgo-v2/specs/06-resilience-fallback-escalation.md`
- `designs/tgo-v2/specs/07-implementation-phases-validation-gates.md`
- `designs/tgo-v2-settled-decisions.md`
- `docs/superpowers/plans/2026-06-02-tgo-v2-phase-3-workflow-contracts-artifacts.md`

## Phase 4 Scope Boundary

In scope:

- Approved-plan gating before Beads issue generation.
- Deterministic planned Beads issue records linked to plan/artifact/task metadata.
- Schedulable task metadata validation for dependencies, declared write scope, acceptance criteria, validation commands, and artifact refs.
- Scheduler wave planning with default `max_parallel_builders = 2`.
- Serial fallback for overlapping write scopes.
- Clarification route for unknown write scope when auto-parallelization would otherwise be attempted.
- Per-task worktree and branch assignment using the v2 naming convention.
- Integration worktree planning for a completed sibling wave.
- Branch Reviewer artifact and batch Reviewer artifact plans.
- Conflict/reconciliation planning that creates a reconciliation task instead of automatic conflict-resolution commits.
- Explicit post-integration options that require approval for push, PR, main merge, and cleanup.
- `/tgo:work` command template guidance aligned with the Phase 4 safety gates.

Out of scope:

- Calling the real `bd` CLI or mutating `.beads/*`.
- Creating real git worktrees or branches.
- Dispatching real OpenCode subagents.
- Making commits from generated tasks.
- Running a real integration merge.
- Pushing, opening PRs, merging into `master`/`main`, or deleting worktrees.
- Provider fallback, circuit breaker, model presets, tool presets, and release migration.
- Full Markdown plan parsing. Phase 4 receives typed approved-plan inputs; parsing TGO Markdown artifacts can be added after the deterministic model is stable.

## Reuse Justification

No v1 module should be copied in Phase 4.

Approved reference-only reuse:

- Existing Phase 3 workflow contracts in `trans-genderian-orchestra-v2/src/workflow/delegation-envelope.ts` and `src/workflow/specialist-result.ts`: reuse the field vocabulary and status concepts, but do not broaden those modules in this phase.
- Existing artifact lifecycle rules in `trans-genderian-orchestra-v2/src/artifacts/lifecycle.ts`: reference artifact status names and artifact types for planned review/integration artifacts.
- Existing plugin command config in `trans-genderian-orchestra-v2/src/plugin/commands.ts`: update the `/tgo:work` template only; do not add provider-dependent command execution.
- Existing deterministic result style in `trans-genderian-orchestra-v2/src/commands/result.ts`: use the same explicit, structured, mutation-safe style for workflow preview objects, but do not force agent-orchestrated workflow previews into deterministic setup command result shape.

If any v1 source code is copied later, add a new reuse justification before doing so.

## File Structure

Create these files:

- `trans-genderian-orchestra-v2/src/workflow/work-plan.ts`: approved plan request types, schedulable task validation, and planned Beads issue generation.
- `trans-genderian-orchestra-v2/src/workflow/work-plan.test.ts`: tests for approved-plan-only issue generation and metadata validation.
- `trans-genderian-orchestra-v2/src/workflow/scheduler.ts`: scheduler limits, write-scope overlap checks, dependency-aware serial/parallel wave planning, and clarification decisions.
- `trans-genderian-orchestra-v2/src/workflow/scheduler.test.ts`: tests for builder limit 2, dependency ordering, overlap serialization, and unknown-scope clarification.
- `trans-genderian-orchestra-v2/src/workflow/worktree-plan.ts`: deterministic task worktree/branch naming and fallback-warning shape when worktree creation fails.
- `trans-genderian-orchestra-v2/src/workflow/worktree-plan.test.ts`: tests for per-task worktrees, branch naming, and confirmation-required fallback.
- `trans-genderian-orchestra-v2/src/workflow/integration.ts`: integration worktree plan, branch/batch review artifact plans, post-integration approval options, and reconciliation task planning.
- `trans-genderian-orchestra-v2/src/workflow/integration.test.ts`: tests for review artifacts, integration worktree, conflict reconciliation, and approval gates.
- `trans-genderian-orchestra-v2/src/workflow/work-preview.ts`: composition layer for `/tgo:work` preview from an approved plan request.
- `trans-genderian-orchestra-v2/src/workflow/work-preview.test.ts`: end-to-end preview tests covering the Phase 4 gates.

Modify these files:

- `trans-genderian-orchestra-v2/src/plugin/commands.ts`: expand `/tgo:work` template with Phase 4 runtime guardrails.
- `trans-genderian-orchestra-v2/src/plugin/agents.test.ts`: assert the `/tgo:work` command template names approved plans, default builder parallelism, separate worktrees, Reviewer artifacts, integration worktree, and no unapproved push/PR/main merge/cleanup.

## Task Metadata

```yaml
task_id: phase4-workflow-scheduler-integration
goal: Implement deterministic workflow planning primitives for TGO v2 Phase 4.
acceptance_criteria:
  - Beads issue plans are generated only when the input plan status is approved.
  - Task metadata validation requires dependencies, declared write scope, acceptance criteria, validation commands, and artifact refs before auto-parallelization.
  - Default scheduler limit is max_parallel_builders = 2.
  - Overlapping write scopes are serialized.
  - Unknown write scopes produce an ask_clarification route instead of auto-parallelization.
  - Every planned Builder task receives a separate deterministic worktree path and branch name.
  - Branch Reviewer artifacts and a batch Reviewer artifact are planned.
  - Integration happens only in a dedicated integration worktree plan.
  - Conflicts produce a reconciliation task plan and no automatic conflict-resolution commit.
  - Push, PR creation, main-branch merge, and cleanup are represented only as post-integration options requiring explicit approval.
  - The /tgo:work command template names the Phase 4 safety gates.
  - Phase 4 validation commands pass.
dependencies:
  - phase3-workflow-contracts-artifacts
declared_write_scope:
  - trans-genderian-orchestra-v2/src/workflow/**
  - trans-genderian-orchestra-v2/src/plugin/commands.ts
  - trans-genderian-orchestra-v2/src/plugin/agents.test.ts
expected_read_context:
  - designs/tgo-v2/specs/01-agent-workflow-delegation-review.md
  - designs/tgo-v2/specs/02-bootstrap-setup-doctor-manifests.md
  - designs/tgo-v2/specs/04-beads-artifacts-workflows.md
  - designs/tgo-v2/specs/06-resilience-fallback-escalation.md
  - designs/tgo-v2/specs/07-implementation-phases-validation-gates.md
validation_commands:
  - bun test src/workflow/work-plan.test.ts
  - bun test src/workflow/scheduler.test.ts src/workflow/worktree-plan.test.ts
  - bun test src/workflow/integration.test.ts src/workflow/work-preview.test.ts
  - bun test src/plugin/agents.test.ts
  - bun test
  - bun run typecheck
  - bun run check:ci
  - bun run build
parallel_group: phase4-serial
risk_level: medium
requires_user_decision: false
beads_issue: not-created-yet
artifact_refs:
  - docs/superpowers/plans/2026-06-02-tgo-v2-phase-4-workflow-scheduler-integration.md
```

## Tasks

### Task 1: Add Approved Plan Work Metadata And Beads Issue Planning

**Files:**

- Create: `trans-genderian-orchestra-v2/src/workflow/work-plan.ts`
- Create: `trans-genderian-orchestra-v2/src/workflow/work-plan.test.ts`

- [ ] **Step 1: Write the failing work plan tests**

Create `trans-genderian-orchestra-v2/src/workflow/work-plan.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import {
  createPlannedBeadsIssues,
  validateSchedulableTask,
  type ApprovedPlanWorkRequest,
  type PlanTaskMetadata,
} from './work-plan';

function validTask(overrides: Partial<PlanTaskMetadata> = {}): PlanTaskMetadata {
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/workflow/work-plan.test.ts
```

Expected: FAIL with `Cannot find module './work-plan'`.

- [ ] **Step 3: Implement work plan metadata and Beads issue planning**

Create `trans-genderian-orchestra-v2/src/workflow/work-plan.ts`:

```ts
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
  priority?: number;
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
  planned_issues: PlannedBeadsIssue[];
  blocked_reason?: 'approved_plan_required';
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
      planned_issues: [],
      blocked_reason: 'approved_plan_required',
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
      priority: task.priority ?? 3,
    })),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/workflow/work-plan.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add trans-genderian-orchestra-v2/src/workflow/work-plan.ts trans-genderian-orchestra-v2/src/workflow/work-plan.test.ts
git commit -m "feat: plan approved tgo beads issues"
```

### Task 2: Add Scheduler Wave Planning

**Files:**

- Create: `trans-genderian-orchestra-v2/src/workflow/scheduler.ts`
- Create: `trans-genderian-orchestra-v2/src/workflow/scheduler.test.ts`

- [ ] **Step 1: Write the failing scheduler tests**

Create `trans-genderian-orchestra-v2/src/workflow/scheduler.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { planSchedulerWaves } from './scheduler';
import type { PlanTaskMetadata } from './work-plan';

function task(
  task_id: string,
  declared_write_scope: string[],
  overrides: Partial<PlanTaskMetadata> = {},
): PlanTaskMetadata {
  return {
    task_id,
    goal: `Implement ${task_id}`,
    acceptance_criteria: [`${task_id} passes`],
    dependencies: [],
    declared_write_scope,
    expected_read_context: ['docs/spec.md'],
    validation_commands: [`bun test ${task_id}.test.ts`],
    parallel_group: 'phase4',
    risk_level: 'medium',
    requires_user_decision: false,
    beads_issue: `beads-${task_id}`,
    artifact_refs: ['docs/plan.md'],
    ...overrides,
  };
}

describe('scheduler wave planning', () => {
  test('uses default max_parallel_builders limit of 2', () => {
    const result = planSchedulerWaves([
      task('task-a', ['src/a/**']),
      task('task-b', ['src/b/**']),
      task('task-c', ['src/c/**']),
    ]);

    expect(result.limits.max_parallel_builders).toBe(2);
    expect(result.waves.map((wave) => wave.task_ids)).toEqual([
      ['task-a', 'task-b'],
      ['task-c'],
    ]);
  });

  test('orders dependency tasks before dependants', () => {
    const result = planSchedulerWaves([
      task('task-b', ['src/b/**'], { dependencies: ['task-a'] }),
      task('task-a', ['src/a/**']),
    ]);

    expect(result.waves.map((wave) => wave.task_ids)).toEqual([
      ['task-a'],
      ['task-b'],
    ]);
  });

  test('serializes overlapping write scopes', () => {
    const result = planSchedulerWaves([
      task('task-a', ['src/shared/**']),
      task('task-b', ['src/shared/file.ts']),
    ]);

    expect(result.waves.map((wave) => wave.task_ids)).toEqual([
      ['task-a'],
      ['task-b'],
    ]);
    expect(result.decisions).toContainEqual({
      task_id: 'task-b',
      decision: 'run_serially',
      reason: 'Declared write scope overlaps with task-a.',
    });
  });

  test('asks clarification for unknown write scope before auto-parallelization', () => {
    const result = planSchedulerWaves([
      task('task-a', ['src/a/**']),
      task('task-b', ['unknown']),
    ]);

    expect(result.waves.map((wave) => wave.task_ids)).toEqual([
      ['task-a'],
      ['task-b'],
    ]);
    expect(result.decisions).toContainEqual({
      task_id: 'task-b',
      decision: 'ask_clarification',
      reason: 'Declared write scope is unknown; auto-parallelization is not allowed.',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/workflow/scheduler.test.ts
```

Expected: FAIL with `Cannot find module './scheduler'`.

- [ ] **Step 3: Implement scheduler wave planning**

Create `trans-genderian-orchestra-v2/src/workflow/scheduler.ts`:

```ts
import type { PlanTaskMetadata } from './work-plan';

export interface SchedulerLimits {
  max_parallel_builders: number;
}

export interface SchedulerWave {
  wave_id: string;
  task_ids: string[];
}

export interface SchedulerDecision {
  task_id: string;
  decision: 'run_parallel' | 'run_serially' | 'ask_clarification';
  reason: string;
}

export interface SchedulerPlan {
  limits: SchedulerLimits;
  waves: SchedulerWave[];
  decisions: SchedulerDecision[];
}

function normalizeScope(scope: string): string {
  return scope.replace(/\/\*\*$/, '').replace(/\/\*$/, '');
}

function hasUnknownScope(task: PlanTaskMetadata): boolean {
  return task.declared_write_scope.some((scope) => scope === 'unknown');
}

function scopesOverlap(a: string[], b: string[]): boolean {
  for (const left of a.map(normalizeScope)) {
    for (const right of b.map(normalizeScope)) {
      if (left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`)) {
        return true;
      }
    }
  }
  return false;
}

function sortByDependencies(tasks: PlanTaskMetadata[]): PlanTaskMetadata[] {
  const remaining = [...tasks];
  const sorted: PlanTaskMetadata[] = [];

  while (remaining.length > 0) {
    const nextIndex = remaining.findIndex((task) =>
      (task.dependencies ?? []).every((dependency) =>
        sorted.some((sortedTask) => sortedTask.task_id === dependency),
      ),
    );
    const index = nextIndex === -1 ? 0 : nextIndex;
    const [next] = remaining.splice(index, 1);
    sorted.push(next);
  }

  return sorted;
}

export function planSchedulerWaves(
  tasks: PlanTaskMetadata[],
  limits: SchedulerLimits = { max_parallel_builders: 2 },
): SchedulerPlan {
  const waves: SchedulerWave[] = [];
  const decisions: SchedulerDecision[] = [];

  for (const task of sortByDependencies(tasks)) {
    if (hasUnknownScope(task)) {
      decisions.push({
        task_id: task.task_id,
        decision: 'ask_clarification',
        reason: 'Declared write scope is unknown; auto-parallelization is not allowed.',
      });
      waves.push({ wave_id: `wave-${waves.length + 1}`, task_ids: [task.task_id] });
      continue;
    }

    const dependencyWaveIndex = waves.findIndex((wave) =>
      wave.task_ids.some((taskId) => (task.dependencies ?? []).includes(taskId)),
    );
    const canJoinOpenWave =
      dependencyWaveIndex === -1 || dependencyWaveIndex < waves.length - 1;
    const openWave = canJoinOpenWave ? waves.at(-1) : undefined;
    const openWaveTasks = tasks.filter((candidate) =>
      openWave?.task_ids.includes(candidate.task_id),
    );
    const overlaps = openWaveTasks.find((candidate) =>
      scopesOverlap(candidate.declared_write_scope, task.declared_write_scope),
    );

    if (
      !openWave ||
      openWave.task_ids.length >= limits.max_parallel_builders ||
      overlaps
    ) {
      if (overlaps) {
        decisions.push({
          task_id: task.task_id,
          decision: 'run_serially',
          reason: `Declared write scope overlaps with ${overlaps.task_id}.`,
        });
      }
      waves.push({ wave_id: `wave-${waves.length + 1}`, task_ids: [task.task_id] });
    } else {
      openWave.task_ids.push(task.task_id);
      decisions.push({
        task_id: task.task_id,
        decision: 'run_parallel',
        reason: 'Declared write scope is independent and scheduler capacity is available.',
      });
    }
  }

  return { limits, waves, decisions };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/workflow/scheduler.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add trans-genderian-orchestra-v2/src/workflow/scheduler.ts trans-genderian-orchestra-v2/src/workflow/scheduler.test.ts
git commit -m "feat: plan guarded tgo scheduler waves"
```

### Task 3: Add Task Worktree And Branch Planning

**Files:**

- Create: `trans-genderian-orchestra-v2/src/workflow/worktree-plan.ts`
- Create: `trans-genderian-orchestra-v2/src/workflow/worktree-plan.test.ts`

- [ ] **Step 1: Write the failing worktree plan tests**

Create `trans-genderian-orchestra-v2/src/workflow/worktree-plan.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import {
  handleWorktreeCreationFailure,
  planTaskWorktrees,
} from './worktree-plan';
import type { PlannedBeadsIssue } from './work-plan';

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/workflow/worktree-plan.test.ts
```

Expected: FAIL with `Cannot find module './worktree-plan'`.

- [ ] **Step 3: Implement task worktree planning**

Create `trans-genderian-orchestra-v2/src/workflow/worktree-plan.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/workflow/worktree-plan.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add trans-genderian-orchestra-v2/src/workflow/worktree-plan.ts trans-genderian-orchestra-v2/src/workflow/worktree-plan.test.ts
git commit -m "feat: plan tgo task worktrees"
```

### Task 4: Add Integration, Review Artifact, And Reconciliation Planning

**Files:**

- Create: `trans-genderian-orchestra-v2/src/workflow/integration.ts`
- Create: `trans-genderian-orchestra-v2/src/workflow/integration.test.ts`

- [ ] **Step 1: Write the failing integration tests**

Create `trans-genderian-orchestra-v2/src/workflow/integration.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import {
  createReconciliationTask,
  planIntegrationBatch,
} from './integration';

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
    expect(plan.branch_review_artifacts.map((artifact) => artifact.artifact_id)).toEqual([
      'review-task-a',
      'review-task-b',
    ]);
    expect(plan.batch_review_artifact.artifact_id).toBe('review-phase4-plan-batch');
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/workflow/integration.test.ts
```

Expected: FAIL with `Cannot find module './integration'`.

- [ ] **Step 3: Implement integration and reconciliation planning**

Create `trans-genderian-orchestra-v2/src/workflow/integration.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/workflow/integration.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add trans-genderian-orchestra-v2/src/workflow/integration.ts trans-genderian-orchestra-v2/src/workflow/integration.test.ts
git commit -m "feat: plan tgo integration and reconciliation"
```

### Task 5: Add `/tgo:work` Preview Composition And Command Guidance

**Files:**

- Create: `trans-genderian-orchestra-v2/src/workflow/work-preview.ts`
- Create: `trans-genderian-orchestra-v2/src/workflow/work-preview.test.ts`
- Modify: `trans-genderian-orchestra-v2/src/plugin/commands.ts`
- Modify: `trans-genderian-orchestra-v2/src/plugin/agents.test.ts`

- [ ] **Step 1: Write the failing work preview tests**

Create `trans-genderian-orchestra-v2/src/workflow/work-preview.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { previewTgoWork } from './work-preview';
import type { ApprovedPlanWorkRequest, PlanTaskMetadata } from './work-plan';

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
    expect(new Set(preview.worktrees.map((plan) => plan.worktree_path)).size).toBe(3);
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
```

- [ ] **Step 2: Add failing `/tgo:work` command guidance expectations**

Modify the `creates namespaced command configs and compatibility aliases` test in `trans-genderian-orchestra-v2/src/plugin/agents.test.ts` by adding these assertions after the existing `tgo:init` expectation:

```ts
    expect(commands['tgo:work'].template).toContain('approved TGO plan');
    expect(commands['tgo:work'].template).toContain('max_parallel_builders = 2');
    expect(commands['tgo:work'].template).toContain('separate worktree/branch');
    expect(commands['tgo:work'].template).toContain('Branch Reviewer artifact');
    expect(commands['tgo:work'].template).toContain('batch Reviewer artifact');
    expect(commands['tgo:work'].template).toContain('dedicated integration worktree');
    expect(commands['tgo:work'].template).toContain(
      'Do not push, open a PR, merge to main, or clean up worktrees without explicit approval.',
    );
```

- [ ] **Step 3: Run the tests to verify they fail**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/workflow/work-preview.test.ts src/plugin/agents.test.ts
```

Expected: FAIL with `Cannot find module './work-preview'` and `/tgo:work` template assertions failing.

- [ ] **Step 4: Implement work preview composition**

Create `trans-genderian-orchestra-v2/src/workflow/work-preview.ts`:

```ts
import { planIntegrationBatch, type IntegrationBatchPlan } from './integration';
import { planSchedulerWaves, type SchedulerPlan } from './scheduler';
import { createPlannedBeadsIssues, type ApprovedPlanWorkRequest, type PlannedBeadsIssue } from './work-plan';
import { planTaskWorktrees, type TaskWorktreePlan } from './worktree-plan';

export interface TgoWorkPreview {
  status: 'ready' | 'blocked';
  blocked_reason?: 'approved_plan_required';
  planned_beads_issues: PlannedBeadsIssue[];
  scheduler: SchedulerPlan;
  worktrees: TaskWorktreePlan[];
  integration?: IntegrationBatchPlan;
  forbidden_automatic_actions: Array<
    'push' | 'open_pr' | 'merge_to_main' | 'cleanup_worktrees'
  >;
}

export function previewTgoWork(request: ApprovedPlanWorkRequest): TgoWorkPreview {
  const beads = createPlannedBeadsIssues(request);
  const emptyScheduler = planSchedulerWaves([]);
  const forbidden_automatic_actions: TgoWorkPreview['forbidden_automatic_actions'] = [
    'push',
    'open_pr',
    'merge_to_main',
    'cleanup_worktrees',
  ];

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
```

- [ ] **Step 5: Update `/tgo:work` command template guidance**

Modify the `tgo:work` entry in `trans-genderian-orchestra-v2/src/plugin/commands.ts`:

```ts
    'tgo:work': {
      description:
        'Start or continue approved TGO-managed implementation work.',
      template:
        'Route the request through TGO work intent and require an approved TGO plan before Beads issue generation. Validate task metadata before auto-parallelization, use max_parallel_builders = 2 by default, assign each Builder a separate worktree/branch, create a Branch Reviewer artifact per branch, create a batch Reviewer artifact after dedicated integration worktree validation, create reconciliation tasks for conflicts, and do not push, open a PR, merge to main, or clean up worktrees without explicit approval.',
    },
```

- [ ] **Step 6: Run the tests to verify they pass**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/workflow/work-preview.test.ts src/plugin/agents.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add trans-genderian-orchestra-v2/src/workflow/work-preview.ts trans-genderian-orchestra-v2/src/workflow/work-preview.test.ts trans-genderian-orchestra-v2/src/plugin/commands.ts trans-genderian-orchestra-v2/src/plugin/agents.test.ts
git commit -m "feat: preview tgo work orchestration"
```

### Task 6: Run Phase 4 Validation Gate

**Files:**

- Validate all Phase 4 files and the full package.

- [ ] **Step 1: Run targeted Phase 4 tests**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/workflow/work-plan.test.ts
bun test src/workflow/scheduler.test.ts src/workflow/worktree-plan.test.ts
bun test src/workflow/integration.test.ts src/workflow/work-preview.test.ts
bun test src/plugin/agents.test.ts
```

Expected: all targeted tests pass.

- [ ] **Step 2: Run full validation**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test
bun run typecheck
bun run check:ci
bun run build
```

Expected:

- `bun test`: all tests pass with 0 failures.
- `bun run typecheck`: `tsc --noEmit` exits 0.
- `bun run check:ci`: Biome reports no errors and no fixes needed.
- `bun run build`: plugin, CLI, and declarations build successfully.

- [ ] **Step 3: Run Phase 4 workflow preview smoke**

Run:

```bash
cd trans-genderian-orchestra-v2
bun -e "import { previewTgoWork } from './src/workflow/work-preview.ts'; const task=(task_id,scope,dependencies=[])=>({task_id,goal:'Implement '+task_id,acceptance_criteria:[task_id+' passes'],dependencies,declared_write_scope:scope,expected_read_context:['docs/spec.md'],validation_commands:['bun test '+task_id+'.test.ts'],parallel_group:'phase4',risk_level:'medium',requires_user_decision:false,beads_issue:'pending',artifact_refs:['docs/plan.md'],priority:1}); const preview=previewTgoWork({stream_id:'stream-phase4',plan_id:'phase4-plan',plan_status:'approved',plan_artifact_ref:'docs/plan.md',repo_name:'demo-repo',base_branch:'master',tasks:[task('task-a',['src/a/**']),task('task-b',['src/b/**']),task('task-c',['src/c/**'],['task-a'])]}); console.log(JSON.stringify({smoke:'phase4-workflow-scheduler',status:preview.status,beads:preview.planned_beads_issues.length===3,max_parallel_builders:preview.scheduler.limits.max_parallel_builders,waves:preview.scheduler.waves.length,worktrees:new Set(preview.worktrees.map((plan)=>plan.worktree_path)).size===3,integration:preview.integration?.integration_worktree_path==='../.tgo-worktrees/demo-repo/phase4-plan-integration',approvals:preview.integration?.post_integration_options.filter((option)=>option.requires_approval).length===5,forbidden:preview.forbidden_automatic_actions.includes('push')&&preview.forbidden_automatic_actions.includes('merge_to_main')}, null, 2));"
```

Expected JSON:

```json
{
  "smoke": "phase4-workflow-scheduler",
  "status": "ready",
  "beads": true,
  "max_parallel_builders": 2,
  "waves": 2,
  "worktrees": true,
  "integration": true,
  "approvals": true,
  "forbidden": true
}
```

- [ ] **Step 4: Inline reviewer-style self-review**

Because TGO/oracle subagents are currently unavailable in this environment, perform a local reviewer pass before merge:

```bash
git diff --stat HEAD~5..HEAD
git diff --name-status HEAD~5..HEAD
PLACEHOLDER_PATTERN='TO''DO|T''BD|fill'' in|implement'' later|Similar'' to Task|appropriate'' error handling|Write'' tests for the above'
grep -R "$PLACEHOLDER_PATTERN" trans-genderian-orchestra-v2/src/workflow trans-genderian-orchestra-v2/src/plugin/commands.ts trans-genderian-orchestra-v2/src/plugin/agents.test.ts || true
```

Expected:

- Changed files are limited to the Phase 4 declared write scope.
- No placeholder-pattern matches in modified source/tests.
- No implementation creates real Beads issues, real worktrees, real branches, pushes, PRs, main merges, or cleanup operations.
- Phase 4 gates from `designs/tgo-v2/specs/07-implementation-phases-validation-gates.md` are covered by tests or the smoke command.

- [ ] **Step 5: Commit any validation-only formatting fixes**

If `bun run check:ci` reports formatting issues, run:

```bash
cd trans-genderian-orchestra-v2
bunx biome check . --write
```

Then rerun Step 1, Step 2, and Step 3. If the diff is formatting-only, commit:

```bash
git add trans-genderian-orchestra-v2/src/workflow trans-genderian-orchestra-v2/src/plugin/commands.ts trans-genderian-orchestra-v2/src/plugin/agents.test.ts
git commit -m "style: format phase 4 workflow scheduler"
```

Expected: formatting commit only if Biome changed files.

## Phase 4 Completion Criteria

- This plan is committed before implementation starts.
- Phase 4 branch contains the Task 1-5 commits and any validation-only formatting commit.
- Targeted Phase 4 tests pass.
- Full `bun test`, `bun run typecheck`, `bun run check:ci`, and `bun run build` pass.
- Phase 4 smoke prints the expected `phase4-workflow-scheduler` JSON with all booleans true.
- Inline reviewer-style pass is recorded in `.slim/deepwork/tgo-v2-phased-implementation.md` because oracle subagents are unavailable.
- Branch is locally merged into `master` only after branch validation passes.
- Merged `master` receives the same full validation and smoke check.
- No remote push is performed without asking the user first.

## Manual Testing

No manual OpenCode session test is required for Phase 4 because this phase implements deterministic workflow preview/scheduler primitives and `/tgo:work` prompt guidance only. Manual OpenCode workflow testing should begin when real OpenCode task dispatch, real Beads mutation, or real worktree creation is wired in a later phase or when the disabled TGO subagents become available again.

## Self-Review Notes

- Spec coverage: Phase 4 gates are represented by Task 1 approved-plan Beads planning, Task 2 scheduler waves, Task 3 worktree planning, Task 4 review/integration/reconciliation planning, and Task 5 composed `/tgo:work` preview/guidance.
- Scope boundary: this phase intentionally previews external mutations rather than performing them. That preserves the hard safety rules while establishing the deterministic spine needed before real mutation wiring.
- Placeholder scan: no incomplete placeholder tokens are intentionally present.
- Type consistency: `PlanTaskMetadata`, `PlannedBeadsIssue`, scheduler waves, task worktrees, and integration plans are passed through explicit imports between tasks.
