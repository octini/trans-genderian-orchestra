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
      reason:
        'Declared write scope is unknown; auto-parallelization is not allowed.',
    });
  });
});
