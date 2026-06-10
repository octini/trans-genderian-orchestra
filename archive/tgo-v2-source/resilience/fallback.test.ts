import { describe, expect, test } from 'bun:test';
import {
  classifyFailureForFallback,
  shouldUseProviderFallback,
} from './fallback';

describe('fallback failure classification', () => {
  test('uses provider fallback only for structural provider failures', () => {
    expect(shouldUseProviderFallback('structural_provider')).toBe(true);
    expect(shouldUseProviderFallback('semantic')).toBe(false);
    expect(shouldUseProviderFallback('tool_schema')).toBe(false);
    expect(shouldUseProviderFallback('environmental_preexisting')).toBe(false);
  });

  test('classifies provider unavailable and empty response as structural provider', () => {
    expect(classifyFailureForFallback('model unavailable')).toBe(
      'structural_provider',
    );
    expect(classifyFailureForFallback('provider returned empty response')).toBe(
      'structural_provider',
    );
    expect(classifyFailureForFallback('reviewer rejected implementation')).toBe(
      'semantic',
    );
  });
});
