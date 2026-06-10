import { describe, it, expect, beforeEach } from 'bun:test';
import {
  recordReviewIteration,
  recordEnsembleVerdict,
  recordPrincipalVerdict,
  getReviewLoopState,
  clearReviewLoop,
  resetAllReviewLoops,
} from './review-loop-counter.js';

describe('reviewLoopCounter', () => {
  beforeEach(() => {
    resetAllReviewLoops();
  });

  it('starts at loop count 1', () => {
    const state = recordReviewIteration('task-1');
    expect(state.loopCount).toBe(1);
    expect(state.wheelsSpinning).toBe(false);
  });

  it('increments loop count on subsequent calls', () => {
    recordReviewIteration('task-1');
    recordReviewIteration('task-1');
    const state = recordReviewIteration('task-1');
    expect(state.loopCount).toBe(3);
  });

  it('sets wheelsSpinning at max loops (3)', () => {
    recordReviewIteration('task-1');
    recordReviewIteration('task-1');
    const state = recordReviewIteration('task-1');
    expect(state.wheelsSpinning).toBe(true);
  });

  it('does not set wheelsSpinning before max loops', () => {
    recordReviewIteration('task-1');
    const state = recordReviewIteration('task-1');
    expect(state.wheelsSpinning).toBe(false);
  });

  it('tracks ensemble verdict', () => {
    recordReviewIteration('task-1');
    recordEnsembleVerdict('task-1', 'reject');
    const state = getReviewLoopState('task-1');
    expect(state?.lastEnsembleVerdict).toBe('reject');
  });

  it('tracks principal verdict', () => {
    recordReviewIteration('task-1');
    recordPrincipalVerdict('task-1', 'approve');
    const state = getReviewLoopState('task-1');
    expect(state?.lastPrincipalVerdict).toBe('approve');
  });

  it('clears state for a task', () => {
    recordReviewIteration('task-1');
    clearReviewLoop('task-1');
    expect(getReviewLoopState('task-1')).toBeUndefined();
  });

  it('tracks independent tasks separately', () => {
    recordReviewIteration('task-1');
    recordReviewIteration('task-1');
    recordReviewIteration('task-2');
    expect(getReviewLoopState('task-1')?.loopCount).toBe(2);
    expect(getReviewLoopState('task-2')?.loopCount).toBe(1);
  });
});
