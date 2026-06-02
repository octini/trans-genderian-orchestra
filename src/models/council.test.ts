import { describe, expect, test } from 'bun:test';
import { canSynthesizeCouncilResult, deriveCouncilPlan } from './council';
import { createBuiltInModelCatalog } from './presets';

describe('council derivation', () => {
  test('derives synthesizer from orchestrator and seats from researcher builder reviewer', () => {
    const balanced = createBuiltInModelCatalog().presets.balanced;
    const plan = deriveCouncilPlan(balanced);

    expect(plan.synthesizer_model).toEqual(
      balanced.roles['tgo-orchestrator'][0],
    );
    expect(plan.seats.map((seat) => seat.id)).toEqual([
      'researcher-model-councillor',
      'builder-model-councillor',
      'reviewer-model-councillor',
    ]);
    expect(plan.seats[0]).toMatchObject({
      source_role: 'tgo-researcher',
      focus: 'evidence quality, missing context, source reliability',
    });
  });

  test('keeps duplicate model seats by default and warns about low diversity', () => {
    const balanced = createBuiltInModelCatalog().presets.balanced;
    const duplicated = {
      ...balanced,
      roles: {
        ...balanced.roles,
        'tgo-builder': balanced.roles['tgo-reviewer'],
      },
    };

    const plan = deriveCouncilPlan(duplicated);

    expect(plan.seats).toHaveLength(3);
    expect(plan.warnings.map((warning) => warning.code)).toContain(
      'low-council-model-diversity',
    );
  });

  test('can synthesize from at least one successful councillor', () => {
    expect(
      canSynthesizeCouncilResult([{ seat_id: 'a', status: 'failed' }]),
    ).toBe(false);
    expect(
      canSynthesizeCouncilResult([{ seat_id: 'a', status: 'completed' }]),
    ).toBe(true);
  });
});
