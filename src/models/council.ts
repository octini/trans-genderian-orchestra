import type { CommandNotice } from '../commands/result';
import type { TgoAgentId } from '../plugin/agent-ids';
import type { ModelEntry, ModelPresetDefinition } from './presets';

export interface CouncilSeatPlan {
  id: string;
  source_role: Extract<
    TgoAgentId,
    'tgo-researcher' | 'tgo-builder' | 'tgo-reviewer'
  >;
  model: ModelEntry;
  focus: string;
}

export interface CouncilPlan {
  synthesizer_model: ModelEntry;
  seats: CouncilSeatPlan[];
  warnings: CommandNotice[];
}

export interface CouncilSeatResultStatus {
  seat_id: string;
  status: 'completed' | 'failed' | 'timed_out' | 'empty_response';
}

const SEAT_FOCI = {
  'tgo-researcher': 'evidence quality, missing context, source reliability',
  'tgo-builder': 'feasibility, sequencing, operational risk',
  'tgo-reviewer': 'correctness, verification gaps, failure modes',
} as const;

export function deriveCouncilPlan(preset: ModelPresetDefinition): CouncilPlan {
  const seats: CouncilSeatPlan[] = [
    {
      id: 'researcher-model-councillor',
      source_role: 'tgo-researcher',
      model: preset.roles['tgo-researcher'][0],
      focus: SEAT_FOCI['tgo-researcher'],
    },
    {
      id: 'builder-model-councillor',
      source_role: 'tgo-builder',
      model: preset.roles['tgo-builder'][0],
      focus: SEAT_FOCI['tgo-builder'],
    },
    {
      id: 'reviewer-model-councillor',
      source_role: 'tgo-reviewer',
      model: preset.roles['tgo-reviewer'][0],
      focus: SEAT_FOCI['tgo-reviewer'],
    },
  ];
  const uniqueModels = new Set(seats.map((seat) => seat.model.id));
  const warnings: CommandNotice[] = [];
  if (uniqueModels.size < seats.length) {
    warnings.push({
      code: 'low-council-model-diversity',
      message:
        'Two or more council seats use the same underlying model; prompted perspectives are still kept as separate seats.',
      severity: 'warning',
    });
  }

  return {
    synthesizer_model: preset.roles['tgo-orchestrator'][0],
    seats,
    warnings,
  };
}

export function canSynthesizeCouncilResult(
  results: CouncilSeatResultStatus[],
): boolean {
  return results.some((result) => result.status === 'completed');
}
