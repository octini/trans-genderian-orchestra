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
      if (
        left === right ||
        left.startsWith(`${right}/`) ||
        right.startsWith(`${left}/`)
      ) {
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
        reason:
          'Declared write scope is unknown; auto-parallelization is not allowed.',
      });
      waves.push({
        wave_id: `wave-${waves.length + 1}`,
        task_ids: [task.task_id],
      });
      continue;
    }

    const dependencyWaveIndex = waves.findIndex((wave) =>
      wave.task_ids.some((taskId) =>
        (task.dependencies ?? []).includes(taskId),
      ),
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
      waves.push({
        wave_id: `wave-${waves.length + 1}`,
        task_ids: [task.task_id],
      });
    } else {
      openWave.task_ids.push(task.task_id);
      decisions.push({
        task_id: task.task_id,
        decision: 'run_parallel',
        reason:
          'Declared write scope is independent and scheduler capacity is available.',
      });
    }
  }

  return { limits, waves, decisions };
}
