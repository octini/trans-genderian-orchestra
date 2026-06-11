import { describe, expect, test } from 'bun:test';
import { buildConductorPrompt } from './conductor.js';
import { createComposerAgent } from './composer.js';
import { createCouncillorAgent } from './councillor.js';
import { createEnsembleAgent } from './ensemble.js';
import { createPrincipalAgent } from './principal.js';

describe('review metadata prompts', () => {
  test('composer prompt requires taskId review metadata', () => {
    const prompt = createComposerAgent('test/model').config.prompt as string;
    expect(prompt).toContain('<review_metadata>');
    expect(prompt).toContain('"taskId"');
  });

  test('ensemble review JSON requires reviewedTaskId', () => {
    const prompt = createEnsembleAgent('test/model').config.prompt as string;
    expect(prompt).toContain('"reviewedTaskId"');
    expect(prompt).toContain('reviewedTaskId of the Composer task');
  });

  test('principal prompt requires reviewedTaskId confirmation', () => {
    const prompt = createPrincipalAgent('test/model').config.prompt as string;
    expect(prompt).toContain('<review_metadata>');
    expect(prompt).toContain('"reviewedTaskId"');
  });
});

describe('retrieval-led prompt hardening', () => {
  test('conductor routes context gathering through scribe before non-trivial implementation', () => {
    const prompt = buildConductorPrompt();

    expect(prompt).toContain('retrieval-led');
    expect(prompt).toContain(
      'unfamiliar, behavior-changing, or docs/API-dependent',
    );
    expect(prompt).toContain('@scribe');
    expect(prompt).toContain('tiny/trivial');
  });

  test('composer prompt requires spec/test/inspect discipline', () => {
    const prompt = createComposerAgent('test/model').config.prompt as string;

    expect(prompt).toContain('Spec/Test/Inspect');
    expect(prompt).toContain('contracts, types, specs');
    expect(prompt).toContain('behavior changes');
    expect(prompt).toContain('validation failures');
  });

  test('principal final gate requires grounded file and evidence review', () => {
    const prompt = createPrincipalAgent('test/model').config.prompt as string;

    expect(prompt).toContain('retrieval-led verification');
    expect(prompt).toContain('modified files, diffs, and validation evidence');
    expect(prompt).toContain('Do not approve unread or ungrounded work');
  });

  test('ensemble and councillor prompts flag ungrounded implementation', () => {
    const ensemblePrompt = createEnsembleAgent('test/model').config
      .prompt as string;
    const councillorPrompt = createCouncillorAgent('test/model').config
      .prompt as string;

    expect(ensemblePrompt).toContain('evidence-compliance');
    expect(ensemblePrompt).toContain('ungrounded implementation');
    expect(councillorPrompt).toContain('ungrounded implementation');
    expect(councillorPrompt).toContain('cited files, tests, or docs');
  });
});
