export interface ReviewLoopState {
  taskKey: string;
  loopCount: number;
  lastEnsembleVerdict?: 'approve' | 'reject';
  lastPrincipalVerdict?: 'approve' | 'reject';
  wheelsSpinning: boolean;
}

const reviewLoops = new Map<string, ReviewLoopState>();

const MAX_LOOPS = 3;

/**
 * Records a review loop iteration for a given task.
 * Returns the current state including whether the loop has exceeded max cycles.
 */
export function recordReviewIteration(taskKey: string): ReviewLoopState {
  const existing = reviewLoops.get(taskKey);
  if (existing) {
    existing.loopCount += 1;
    existing.wheelsSpinning = existing.loopCount >= MAX_LOOPS;
    return existing;
  }

  const state: ReviewLoopState = {
    taskKey,
    loopCount: 1,
    wheelsSpinning: false,
  };
  reviewLoops.set(taskKey, state);
  return state;
}

/**
 * Records the ensemble verdict for the current loop.
 */
export function recordEnsembleVerdict(
  taskKey: string,
  verdict: 'approve' | 'reject',
): void {
  const state = reviewLoops.get(taskKey);
  if (state) {
    state.lastEnsembleVerdict = verdict;
  }
}

/**
 * Records the principal verdict for the current loop.
 */
export function recordPrincipalVerdict(
  taskKey: string,
  verdict: 'approve' | 'reject',
): void {
  const state = reviewLoops.get(taskKey);
  if (state) {
    state.lastPrincipalVerdict = verdict;
  }
}

/**
 * Gets the current review loop state for a task.
 */
export function getReviewLoopState(
  taskKey: string,
): ReviewLoopState | undefined {
  return reviewLoops.get(taskKey);
}

/**
 * Clears the review loop state for a task (when complete).
 */
export function clearReviewLoop(taskKey: string): void {
  reviewLoops.delete(taskKey);
}

/**
 * Resets all review loop state (for testing).
 */
export function resetAllReviewLoops(): void {
  reviewLoops.clear();
}
