import { describe, it, expect } from 'bun:test';
import { resolveModelReferences } from './model-references.js';

describe('resolveModelReferences', () => {
  it('resolves direct references', () => {
    const input = {
      conductor: 'opencode-go/kimi-2.6',
      ensemble: 'conductor',
    };
    const result = resolveModelReferences(input);
    expect(result.ensemble).toBe('opencode-go/kimi-2.6');
  });

  it('resolves transitive references (max depth 3)', () => {
    const input = {
      conductor: 'opencode-go/kimi-2.6',
      ensemble: 'conductor',
      councillor: 'ensemble',
    };
    const result = resolveModelReferences(input);
    expect(result.councillor).toBe('opencode-go/kimi-2.6');
  });

  it('does not resolve self-references', () => {
    const input = {
      conductor: 'conductor',
    };
    const result = resolveModelReferences(input);
    expect(result.conductor).toBe('conductor');
  });

  it('handles circular references without infinite loop', () => {
    const input = {
      a: 'b',
      b: 'a',
    };
    const result = resolveModelReferences(input);
    // Should not hang — max depth prevents infinite loop
    expect(result).toBeDefined();
  });

  it('does not treat model IDs as references', () => {
    const input = {
      conductor: 'openai/gpt-5.5',
      ensemble: 'openai/gpt-5.5', // same model, but not a reference
    };
    const result = resolveModelReferences(input);
    expect(result.ensemble).toBe('openai/gpt-5.5'); // unchanged
  });
});
