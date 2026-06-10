import { beforeEach, describe, expect, test } from 'bun:test';
import { resetAllReviewLoops } from '../../workflow/review-loop-counter.js';
import { formatReviewGateReminder, ReviewGateStore } from './state.js';
import type { ChangeClassification } from './types.js';

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

  test('out-of-order ensemble verdict keeps composer gate active', () => {
    const store = new ReviewGateStore();
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

    const gate = store.recordEnsembleVerdict('parent-1', {
      valid: true,
      reviewedTaskId: 'task-1',
      verdict: 'approve',
      requiredNextAction: 'principal',
      criticalIssueCount: 0,
      issues: [],
    });

    expect(gate?.requiredNextAction).toBe('composer');
    expect(gate?.lastError).toContain('out-of-order ensemble verdict');
  });

  test('out-of-order principal verdict keeps ensemble gate active', () => {
    const store = new ReviewGateStore();
    store.recordComposerCompletion(
      'parent-1',
      'task-1',
      ensembleClassification,
    );

    const gate = store.recordPrincipalVerdict('parent-1', {
      valid: true,
      reviewedTaskId: 'task-1',
      verdict: 'pass',
    });

    expect(gate?.requiredNextAction).toBe('ensemble');
    expect(gate?.lastError).toContain('out-of-order principal verdict');
  });
});

describe('formatReviewGateReminder', () => {
  beforeEach(() => resetAllReviewLoops());

  test('ensemble gate reminder requires ensemble review and uses classification reason', () => {
    const store = new ReviewGateStore();
    const gate = store.recordComposerCompletion(
      'parent-1',
      'task-1',
      ensembleClassification,
    );
    const reminder = formatReviewGateReminder(gate);

    expectCommonReminderFields(reminder, 'task-1');
    expect(reminder).toContain('@ensemble review is required');
    expect(reminder).toContain('Reason: non-trivial change set');
  });

  test('principal gate reminder requires principal final review', () => {
    const store = new ReviewGateStore();
    const gate = store.recordComposerCompletion(
      'parent-1',
      'task-1',
      principalClassification,
    );
    const reminder = formatReviewGateReminder(gate);

    expectCommonReminderFields(reminder, 'task-1');
    expect(reminder).toContain('@principal final review is required');
  });

  test('principal-escalation gate reminder requires principal escalation with wheels spinning', () => {
    const store = new ReviewGateStore();
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
    const reminder = formatReviewGateReminder(gate);

    expectCommonReminderFields(reminder, 'task-1');
    expect(reminder).toContain('@principal escalation');
    expect(reminder).toContain('wheelsSpinning: true');
  });

  test('composer gate reminder requires composer rework', () => {
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
    expect(gate).toBeDefined();
    if (gate === undefined) throw new Error('Expected composer gate');
    const reminder = formatReviewGateReminder(gate);

    expectCommonReminderFields(reminder, 'task-1');
    expect(reminder).toContain('@composer rework is required');
  });

  test('reminder uses lastError in reason line when present', () => {
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
    expect(gate).toBeDefined();
    if (gate === undefined) throw new Error('Expected mismatch gate');
    const reminder = formatReviewGateReminder(gate);

    expectCommonReminderFields(reminder, 'task-1');
    expect(reminder).toContain('Reason: reviewedTaskId mismatch');
  });
});

function expectCommonReminderFields(reminder: string, taskId: string): void {
  expect(reminder).toContain('SENTINEL: review-loop-enforcer-v1');
  expect(reminder).toContain(`Review gate active for taskId: ${taskId}`);
}
