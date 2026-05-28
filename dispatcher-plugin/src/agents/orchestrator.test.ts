import { describe, expect, test } from 'bun:test';
import { buildOrchestratorPrompt } from './orchestrator';

describe('buildOrchestratorPrompt', () => {
  test('shows delegation envelope inside the task prompt parameter', () => {
    const prompt = buildOrchestratorPrompt();

    expect(prompt).toContain(
      '<parameter name="prompt" string="true"><delegation_envelope>',
    );
    expect(prompt).toContain('</delegation_envelope>\n\nSearch the codebase');
    expect(prompt).not.toContain('In practice, the envelope goes inside');
  });

  test('instructs ambiguous requests to use grill-with-docs when available', () => {
    const prompt = buildOrchestratorPrompt();

    expect(prompt).toContain(
      'If the request is ambiguous AND the `grill-with-docs` skill is available, load and use it before asking clarifying questions.',
    );
  });

  test('requires reviewer gate and rejection escalation loop', () => {
    const prompt = buildOrchestratorPrompt();

    expect(prompt).toContain(
      '### Reviewer Gate — Mandatory on Every Delegation',
    );
    expect(prompt).toContain(
      'Every work delegation (to @builder, @researcher, @planner) MUST be followed by a delegation to @reviewer.',
    );
    expect(prompt).toContain(
      'After 2 consecutive rejections on the same task, escalate to @council for resolution.',
    );
    expect(prompt).toContain(
      'If @council also rejects, present the situation to the user with all context.',
    );
  });
});
