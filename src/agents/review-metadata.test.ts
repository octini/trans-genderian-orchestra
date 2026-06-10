import { describe, expect, test } from 'bun:test';
import { createComposerAgent } from './composer.js';
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
