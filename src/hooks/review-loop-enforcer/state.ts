import {
  clearReviewLoop,
  recordEnsembleVerdict as recordCounterEnsembleVerdict,
  recordPrincipalVerdict as recordCounterPrincipalVerdict,
  recordReviewIteration,
} from '../../workflow/review-loop-counter.js';
import type {
  ChangeClassification,
  ParsedEnsembleVerdict,
  ParsedPrincipalMetadata,
  RequiredNextAction,
  ReviewGate,
} from './types.js';

export class ReviewGateStore {
  private readonly gates = new Map<string, ReviewGate>();

  recordComposerCompletion(
    parentSessionId: string,
    reportedTaskId: string,
    classification: ChangeClassification,
  ): ReviewGate {
    const activeGate = this.gates.get(parentSessionId);
    const taskId =
      activeGate?.requiredNextAction === 'composer'
        ? activeGate.taskId
        : reportedTaskId;
    const loopState = recordReviewIteration(taskId);
    // review-loop-counter marks wheelsSpinning at the start of the third
    // Composer review round (loopCount >= 3), before a third Ensemble review.
    const requiredNextAction = loopState.wheelsSpinning
      ? 'principal-escalation'
      : classification.requiredReview;
    const gate: ReviewGate = {
      parentSessionId,
      taskId,
      requiredNextAction,
      skipEnsemble: classification.skipEnsemble,
      classification,
      loopCount: loopState.loopCount,
      wheelsSpinning: loopState.wheelsSpinning,
    };

    this.gates.set(parentSessionId, gate);
    return gate;
  }

  recordEnsembleVerdict(
    parentSessionId: string,
    parsed: ParsedEnsembleVerdict,
  ): ReviewGate | undefined {
    const activeGate = this.gates.get(parentSessionId);
    if (!activeGate) return undefined;

    if (activeGate.requiredNextAction !== 'ensemble') {
      return this.updateGate(
        parentSessionId,
        activeGate,
        activeGate.requiredNextAction,
        `out-of-order ensemble verdict: expected ${activeGate.requiredNextAction}`,
      );
    }

    if (!parsed.valid) {
      return this.updateGate(
        parentSessionId,
        activeGate,
        'ensemble',
        parsed.reason,
      );
    }

    if (parsed.reviewedTaskId !== activeGate.taskId) {
      return this.updateGate(
        parentSessionId,
        activeGate,
        'ensemble',
        `reviewedTaskId mismatch: expected ${activeGate.taskId}, received ${parsed.reviewedTaskId}`,
      );
    }

    recordCounterEnsembleVerdict(activeGate.taskId, parsed.verdict);
    return this.updateGate(
      parentSessionId,
      activeGate,
      parsed.verdict === 'approve' ? 'principal' : 'composer',
    );
  }

  recordPrincipalVerdict(
    parentSessionId: string,
    parsed: ParsedPrincipalMetadata,
  ): ReviewGate | undefined {
    const activeGate = this.gates.get(parentSessionId);
    if (!activeGate) return undefined;

    if (!isPrincipalReviewExpected(activeGate)) {
      return this.updateGate(
        parentSessionId,
        activeGate,
        activeGate.requiredNextAction,
        `out-of-order principal verdict: expected ${activeGate.requiredNextAction}`,
      );
    }

    if (!parsed.valid) {
      return this.updateGate(
        parentSessionId,
        activeGate,
        principalRequiredAction(activeGate),
        parsed.reason,
      );
    }

    if (parsed.reviewedTaskId !== activeGate.taskId) {
      return this.updateGate(
        parentSessionId,
        activeGate,
        principalRequiredAction(activeGate),
        `reviewedTaskId mismatch: expected ${activeGate.taskId}, received ${parsed.reviewedTaskId}`,
      );
    }

    if (parsed.verdict === 'pass') {
      recordCounterPrincipalVerdict(activeGate.taskId, 'approve');
      clearReviewLoop(activeGate.taskId);
      this.gates.delete(parentSessionId);
      return undefined;
    }

    recordCounterPrincipalVerdict(activeGate.taskId, 'reject');
    return this.updateGate(parentSessionId, activeGate, 'composer');
  }

  getGate(parentSessionId: string): ReviewGate | undefined {
    return this.gates.get(parentSessionId);
  }

  private updateGate(
    parentSessionId: string,
    activeGate: ReviewGate,
    requiredNextAction: RequiredNextAction,
    lastError?: string,
  ): ReviewGate {
    const gate: ReviewGate = {
      ...activeGate,
      requiredNextAction,
      lastError,
    };
    if (lastError === undefined) delete gate.lastError;
    this.gates.set(parentSessionId, gate);
    return gate;
  }
}

export function formatReviewGateReminder(gate: ReviewGate): string {
  const action =
    gate.requiredNextAction === 'ensemble'
      ? '@ensemble review is required before continuing.'
      : gate.requiredNextAction === 'principal'
        ? '@principal final review is required before continuing.'
        : gate.requiredNextAction === 'principal-escalation'
          ? '@principal escalation is required with wheelsSpinning: true before continuing.'
          : '@composer rework is required before continuing.';

  return [
    '<internal_reminder>',
    'SENTINEL: review-loop-enforcer-v1',
    `Review gate active for taskId: ${gate.taskId}`,
    `Required next action: ${gate.requiredNextAction}`,
    `wheelsSpinning: ${gate.wheelsSpinning}`,
    `Reason: ${gate.lastError ?? gate.classification.reason}`,
    action,
    'Do not summarize or finish until this review gate is satisfied.',
    '</internal_reminder>',
  ].join('\n');
}

function principalRequiredAction(gate: ReviewGate): RequiredNextAction {
  return gate.requiredNextAction === 'principal-escalation'
    ? 'principal-escalation'
    : 'principal';
}

function isPrincipalReviewExpected(gate: ReviewGate): boolean {
  return (
    gate.requiredNextAction === 'principal' ||
    gate.requiredNextAction === 'principal-escalation'
  );
}
