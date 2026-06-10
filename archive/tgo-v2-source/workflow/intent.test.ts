import { describe, expect, test } from 'bun:test';
import { buildGoalConfirmation, classifyWorkflowIntent } from './intent';

describe('workflow intent routing', () => {
  test('classifies implementation requests as high-confidence work intent', () => {
    const intent = classifyWorkflowIntent(
      'Please implement the next task from the approved plan.',
    );

    expect(intent).toEqual({
      message_excerpt: 'Please implement the next task from the approved plan.',
      inferred_workflow: 'work',
      confidence: 'high',
      confirmation_required: true,
      final_route: 'goal_confirmation',
      clarification_reason: undefined,
    });
  });

  test('classifies setup, doctor, council, and planning intents', () => {
    expect(
      classifyWorkflowIntent('Initialize TGO in this repo').inferred_workflow,
    ).toBe('init');
    expect(
      classifyWorkflowIntent('Check my setup and repair TGO').inferred_workflow,
    ).toBe('doctor');
    expect(
      classifyWorkflowIntent('Ask the council for another opinion')
        .inferred_workflow,
    ).toBe('council');
    expect(
      classifyWorkflowIntent('Write a plan for phase 4').inferred_workflow,
    ).toBe('planning');
  });

  test('routes ambiguous medium-confidence work language to clarification', () => {
    const intent = classifyWorkflowIntent('Can you continue?');

    expect(intent.confidence).toBe('medium');
    expect(intent.final_route).toBe('ask_clarification');
    expect(intent.confirmation_required).toBe(true);
    expect(intent.clarification_reason).toBe(
      'Message suggests work continuation but does not identify a specific approved task or scope.',
    );
  });

  test('treats low-confidence conversation as ordinary conversation', () => {
    const intent = classifyWorkflowIntent('Thanks, that explanation helps.');

    expect(intent.inferred_workflow).toBe('conversation');
    expect(intent.confidence).toBe('low');
    expect(intent.final_route).toBe('ordinary_conversation');
    expect(intent.confirmation_required).toBe(false);
  });

  test('truncates long message excerpts deterministically', () => {
    const intent = classifyWorkflowIntent(`${'a'.repeat(120)} implement this`);

    expect(intent.message_excerpt).toHaveLength(80);
    expect(intent.message_excerpt.endsWith('...')).toBe(true);
  });

  test('builds goal confirmation text for non-trivial work', () => {
    const text = buildGoalConfirmation({
      selected_task: 'phase3-workflow-contracts-artifacts',
      goal: 'Implement workflow contracts',
      scope: ['src/workflow/**', 'src/artifacts/**'],
      acceptance_criteria: [
        'Delegation envelopes reject missing required fields',
      ],
      key_risks: ['Prompt/schema drift'],
      approved_plan:
        'docs/superpowers/plans/2026-06-02-tgo-v2-phase-3-workflow-contracts-artifacts.md',
    });

    expect(text).toContain(
      'Selected task: phase3-workflow-contracts-artifacts',
    );
    expect(text).toContain('Goal: Implement workflow contracts');
    expect(text).toContain('Scope: src/workflow/**; src/artifacts/**');
    expect(text).toContain(
      'Acceptance criteria: Delegation envelopes reject missing required fields',
    );
    expect(text).toContain('Approved plan: docs/superpowers/plans/');
  });
});
