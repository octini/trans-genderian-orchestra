import { describe, expect, test } from 'bun:test';
import {
  createToolSchemaFailure,
  DELEGATION_ENVELOPE_REQUIRED_FIELDS,
  validateDelegationEnvelope,
} from './delegation-envelope';

const validEnvelope = {
  stream_id: 'phase3-stream',
  phase: 'apply',
  goal: 'Implement workflow contracts',
  scope: ['trans-genderian-orchestra-v2/src/workflow/**'],
  out_of_scope: ['worktree scheduler'],
  artifact_refs: [
    'docs/superpowers/plans/2026-06-02-tgo-v2-phase-3-workflow-contracts-artifacts.md',
  ],
  reuse_policy: 'Do not copy v1 modules.',
  acceptance_criteria: ['Delegation envelope required fields are enforced.'],
  verification_required: ['bun test src/workflow/delegation-envelope.test.ts'],
  allowed_write_paths: ['trans-genderian-orchestra-v2/src/workflow/**'],
  failure_mode:
    'Return needs_decision or rejected_scope instead of improvising.',
  user_intent: {
    verbatim_request:
      'Continue with phased implementation, writing the plan for each phase based on the design document.',
    relevant_quotes: ['stop only when you need input from me'],
    orchestrator_interpretation:
      'Implement Phase 3 from approved design specs.',
    user_confirmed_decisions: [
      'Local commits allowed; no remote push without asking.',
    ],
    open_questions: [],
  },
};

describe('delegation envelope validation', () => {
  test('exports the strict required field list from the design spec', () => {
    expect(DELEGATION_ENVELOPE_REQUIRED_FIELDS).toEqual([
      'stream_id',
      'phase',
      'goal',
      'scope',
      'out_of_scope',
      'artifact_refs',
      'reuse_policy',
      'acceptance_criteria',
      'verification_required',
      'allowed_write_paths',
      'failure_mode',
      'user_intent',
    ]);
  });

  test('accepts a complete envelope and preserves verbatim user intent', () => {
    const result = validateDelegationEnvelope(validEnvelope);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected valid envelope');
    }
    expect(result.value.user_intent.verbatim_request).toContain(
      'Continue with phased implementation',
    );
    expect(result.value.user_intent.user_confirmed_decisions).toContain(
      'Local commits allowed; no remote push without asking.',
    );
  });

  test('rejects missing top-level required fields', () => {
    const { goal: _goal, ...missingGoal } = validEnvelope;
    const result = validateDelegationEnvelope(missingGoal);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected invalid envelope');
    }
    expect(result.errors).toContain('Missing required field: goal');
  });

  test('rejects missing nested user_intent fields', () => {
    const result = validateDelegationEnvelope({
      ...validEnvelope,
      user_intent: {
        verbatim_request: validEnvelope.user_intent.verbatim_request,
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected invalid envelope');
    }
    expect(result.errors).toContain(
      'Missing required user_intent field: orchestrator_interpretation',
    );
    expect(result.errors).toContain(
      'Missing required user_intent field: user_confirmed_decisions',
    );
  });

  test('creates tool_schema_failure result with attempt-specific guidance', () => {
    const failure = createToolSchemaFailure({
      lane: 'builder',
      errors: ['Missing required field: goal'],
      attempt: 1,
    });

    expect(failure.status).toBe('tool_schema_failure');
    expect(failure.failure_class).toBe('tool_schema_failure');
    expect(failure.self_correction_allowed).toBe(true);
    expect(failure.expected_shape).toContain('stream_id');
    expect(failure.recommended_next_step).toContain(
      'Return a corrected builder result',
    );
  });

  test('blocks after the second self-correction attempt', () => {
    const failure = createToolSchemaFailure({
      lane: 'reviewer',
      errors: ['Malformed result block'],
      attempt: 3,
    });

    expect(failure.self_correction_allowed).toBe(false);
    expect(failure.recommended_next_step).toBe(
      'Mark the delegated reviewer task blocked_tool_schema and ask for help.',
    );
  });
});
