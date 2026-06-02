import { describe, expect, test } from 'bun:test';
import { createProviderCircuitBreaker } from './circuit-breaker';

describe('provider circuit breaker', () => {
  test('opens after threshold structural failures', () => {
    const breaker = createProviderCircuitBreaker({
      threshold: 3,
      cooldown_ms: 300_000,
    });

    breaker.recordFailure('github-copilot/gpt-5.5', 1_000);
    breaker.recordFailure('github-copilot/gpt-5.5', 2_000);
    expect(breaker.canUse('github-copilot/gpt-5.5', 3_000)).toEqual({
      allowed: true,
      state: 'closed',
    });
    breaker.recordFailure('github-copilot/gpt-5.5', 3_000);

    expect(breaker.canUse('github-copilot/gpt-5.5', 4_000)).toEqual({
      allowed: false,
      state: 'open',
    });
  });

  test('allows one half-open probe after cooldown then closes on success', () => {
    const breaker = createProviderCircuitBreaker({
      threshold: 2,
      cooldown_ms: 100,
    });
    breaker.recordFailure('provider/model', 0);
    breaker.recordFailure('provider/model', 10);

    expect(breaker.canUse('provider/model', 50)).toEqual({
      allowed: false,
      state: 'open',
    });
    expect(breaker.canUse('provider/model', 120)).toEqual({
      allowed: true,
      state: 'half-open',
    });
    breaker.recordSuccess('provider/model');

    expect(breaker.canUse('provider/model', 130)).toEqual({
      allowed: true,
      state: 'closed',
    });
  });
});
