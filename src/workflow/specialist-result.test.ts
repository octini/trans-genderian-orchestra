import { describe, expect, test } from 'bun:test';
import { validateSpecialistResult } from './specialist-result';

describe('specialist result contract validation', () => {
  test('accepts a completed builder result with validation evidence', () => {
    const result = validateSpecialistResult('builder', {
      status: 'completed',
      summary: 'Implemented workflow contracts.',
      artifact_refs: ['.opencode/tgo/reviews/phase3.md'],
      changed_files: ['trans-genderian-orchestra-v2/src/workflow/intent.ts'],
      scope_check: 'All changed files are inside allowed write paths.',
      validation_run: ['bun test src/workflow/intent.test.ts'],
      remaining_risks: [],
      recommended_next_step: 'Run Reviewer gate.',
      deviations: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected valid builder result');
    }
    expect(result.value.status).toBe('completed');
  });

  test('accepts researcher inspected sources and confidence', () => {
    const result = validateSpecialistResult('researcher', {
      status: 'completed',
      summary: 'Inspected workflow specs.',
      artifact_refs: ['.opencode/tgo/evidence/phase3.md'],
      inspected_sources: [
        'designs/tgo-v2/specs/01-agent-workflow-delegation-review.md',
      ],
      scope_check: 'Read-only research only.',
      validation_run: [],
      remaining_risks: [
        'Spec 04 has runtime requirements deferred to Phase 4.',
      ],
      recommended_next_step: 'Write implementation plan.',
      findings: ['Phase 3 requires schema failure handling.'],
      uncertainty: ['No runtime dispatcher yet.'],
      confidence: 'high',
    });

    expect(result.ok).toBe(true);
  });

  test('accepts reviewer verdict fields', () => {
    const result = validateSpecialistResult('reviewer', {
      status: 'completed',
      summary: 'Reviewer passed Phase 3.',
      artifact_refs: ['.opencode/tgo/reviews/phase3-review.md'],
      inspected_sources: [
        'trans-genderian-orchestra-v2/src/workflow/intent.ts',
      ],
      scope_check: 'No scope drift.',
      validation_run: ['bun test'],
      remaining_risks: [],
      recommended_next_step: 'Commit and merge locally.',
      verdict: 'pass',
      acceptance_criteria_coverage: ['Intent routing covered.'],
      rework_instructions: [],
    });

    expect(result.ok).toBe(true);
  });

  test('returns tool_schema_failure for missing common fields', () => {
    const result = validateSpecialistResult('builder', {
      summary: 'Missing validation fields.',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected schema failure');
    }
    expect(result.failure.status).toBe('tool_schema_failure');
    expect(result.failure.errors).toContain('Missing required field: status');
    expect(result.failure.errors).toContain(
      'Missing required field: scope_check',
    );
  });

  test('returns tool_schema_failure for invalid status', () => {
    const result = validateSpecialistResult('builder', {
      status: 'done',
      summary: 'Bad status.',
      artifact_refs: [],
      changed_files: [],
      scope_check: 'n/a',
      validation_run: [],
      remaining_risks: [],
      recommended_next_step: 'n/a',
      deviations: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected schema failure');
    }
    expect(result.failure.errors).toContain(
      'Invalid status: done. Expected completed, needs_decision, blocked, failed, or rejected_scope.',
    );
  });
});
