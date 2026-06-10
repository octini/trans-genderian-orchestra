import { beforeEach, describe, expect, test } from 'bun:test';
import { resetAllReviewLoops } from '../../workflow/review-loop-counter.js';
import type { ChangeClassification } from './types.js';
import { ReviewGateStore } from './state.js';

const ensembleClassification: ChangeClassification = {
  requiredReview: 'ensemble',
  skipEnsemble: false,
  changedLines: 12,
  reason: 'non-trivial change set',
  riskPaths: [],
};

const principalClassification: ChangeClassification = {
  requiredReview: 'principal',
  skipEnsemble: true,
  changedLines: 3,
  reason: 'under 10 changed lines and no risk path touched',
  riskPaths: [],
};

describe('ReviewGateStore', () => {
  beforeEach(() => resetAllReviewLoops());

  test('composer completion requires ensemble for normal implementation work', () => {
    const store = new ReviewGateStore();
    const gate = store.recordComposerCompletion(
      'parent-1',
      'task-1',
      ensembleClassification,
    );
    expect(gate.requiredNextAction).toBe('ensemble');
    expect(gate.skipEnsemble).toBe(false);
  });

  test('markdown-only change requires principal directly', () => {
    const store = new ReviewGateStore();
    const gate = store.recordComposerCompletion('parent-1', 'task-1', {
      ...principalClassification,
      reason: 'markdown-only docs changes',
    });
    expect(gate.requiredNextAction).toBe('principal');
    expect(gate.skipEnsemble).toBe(true);
  });

  test('small non-risk change requires principal directly', () => {
    const store = new ReviewGateStore();
    const gate = store.recordComposerCompletion(
      'parent-1',
      'task-1',
      principalClassification,
    );
    expect(gate.requiredNextAction).toBe('principal');
    expect(gate.skipEnsemble).toBe(true);
  });

  test('agent plugin logic change requires ensemble', () => {
    const store = new ReviewGateStore();
    const gate = store.recordComposerCompletion('parent-1', 'task-1', {
      ...ensembleClassification,
      reason: 'risk path touched: src/agents/composer.ts',
      riskPaths: ['src/agents/composer.ts'],
    });
    expect(gate.requiredNextAction).toBe('ensemble');
  });

  test('ensemble reject requires composer rework', () => {
    const store = new ReviewGateStore();
    store.recordComposerCompletion(
      'parent-1',
      'task-1',
      ensembleClassification,
    );
    const gate = store.recordEnsembleVerdict('parent-1', {
      valid: true,
      reviewedTaskId: 'task-1',
      verdict: 'reject',
      requiredNextAction: 'composer',
      criticalIssueCount: 0,
      issues: [],
    });
    expect(gate?.requiredNextAction).toBe('composer');
  });

  test('ensemble approve requires principal final review', () => {
    const store = new ReviewGateStore();
    store.recordComposerCompletion(
      'parent-1',
      'task-1',
      ensembleClassification,
    );
    const gate = store.recordEnsembleVerdict('parent-1', {
      valid: true,
      reviewedTaskId: 'task-1',
      verdict: 'approve',
      requiredNextAction: 'principal',
      criticalIssueCount: 0,
      issues: [],
    });
    expect(gate?.requiredNextAction).toBe('principal');
  });

  test('loop count 3 requires principal escalation', () => {
    const store = new ReviewGateStore();
    // Existing review-loop-counter semantics set wheelsSpinning at the
    // start of the third Composer review round (loopCount >= 3), not after
    // a third Ensemble rejection completes.
    store.recordComposerCompletion(
      'parent-1',
      'task-1',
      ensembleClassification,
    );
    store.recordEnsembleVerdict('parent-1', {
      valid: true,
      reviewedTaskId: 'task-1',
      verdict: 'reject',
      requiredNextAction: 'composer',
      criticalIssueCount: 0,
      issues: [],
    });
    store.recordComposerCompletion(
      'parent-1',
      'task-1',
      ensembleClassification,
    );
    store.recordEnsembleVerdict('parent-1', {
      valid: true,
      reviewedTaskId: 'task-1',
      verdict: 'reject',
      requiredNextAction: 'composer',
      criticalIssueCount: 0,
      issues: [],
    });
    const gate = store.recordComposerCompletion(
      'parent-1',
      'task-1',
      ensembleClassification,
    );
    expect(gate.requiredNextAction).toBe('principal-escalation');
    expect(gate.wheelsSpinning).toBe(true);
  });

  test('principal pass clears the gate', () => {
    const store = new ReviewGateStore();
    store.recordComposerCompletion(
      'parent-1',
      'task-1',
      principalClassification,
    );
    store.recordPrincipalVerdict('parent-1', {
      valid: true,
      reviewedTaskId: 'task-1',
      verdict: 'pass',
    });
    expect(store.getGate('parent-1')).toBeUndefined();
  });

  test('reviewedTaskId mismatch keeps required gate active', () => {
    const store = new ReviewGateStore();
    store.recordComposerCompletion(
      'parent-1',
      'task-1',
      ensembleClassification,
    );
    const gate = store.recordEnsembleVerdict('parent-1', {
      valid: true,
      reviewedTaskId: 'other-task',
      verdict: 'approve',
      requiredNextAction: 'principal',
      criticalIssueCount: 0,
      issues: [],
    });
    expect(gate?.requiredNextAction).toBe('ensemble');
    expect(gate?.lastError).toContain('reviewedTaskId mismatch');
  });
});
