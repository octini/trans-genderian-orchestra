import { describe, expect, test } from 'bun:test';
import {
  createResilienceProfileCatalog,
  planResilienceSwitch,
} from './profiles';

describe('resilience profiles', () => {
  test('defines conservative balanced and aggressive profile values', () => {
    const catalog = createResilienceProfileCatalog();

    expect(Object.keys(catalog).sort()).toEqual([
      'aggressive',
      'balanced',
      'conservative',
    ]);
    expect(catalog.conservative.max_parallel_builders).toBe(1);
    expect(catalog.balanced.semantic_retry_budget).toBe(3);
    expect(catalog.balanced.tool_schema_retries).toBe(2);
    expect(catalog.aggressive.max_parallel_builders).toBe(3);
    expect(catalog.aggressive.auto_continue).toBe(true);
  });

  test('plans resilience switches without changing tools or models', () => {
    const plan = planResilienceSwitch({
      current: { tools: 'default', models: 'balanced', resilience: 'balanced' },
      requested_resilience: 'aggressive',
    });

    expect(plan.status).toBe('ready');
    expect(plan.next_active_presets).toEqual({
      tools: 'default',
      models: 'balanced',
      resilience: 'aggressive',
    });
    expect(plan.profile.semantic_retry_budget).toBe(4);
  });

  test('warns when aggressive semantic retry budget exceeds balanced default', () => {
    const plan = planResilienceSwitch({
      current: { tools: 'default', models: 'balanced', resilience: 'balanced' },
      requested_resilience: 'aggressive',
    });

    expect(plan.warnings).toContainEqual({
      code: 'high-semantic-retry-budget',
      message:
        'Aggressive resilience uses semantic retry budget 4; this can increase cost and risk.',
      severity: 'warning',
    });
  });
});
