import {
  createToolSchemaFailure,
  type ToolSchemaFailureResult,
} from './delegation-envelope';

export const SPECIALIST_RESULT_STATUSES = [
  'completed',
  'needs_decision',
  'blocked',
  'failed',
  'rejected_scope',
] as const;

export type SpecialistLane = 'researcher' | 'builder' | 'reviewer' | 'council';
export type SpecialistResultStatus =
  (typeof SPECIALIST_RESULT_STATUSES)[number];

export interface SpecialistResult {
  status: SpecialistResultStatus;
  summary: string;
  artifact_refs: string[];
  changed_files?: string[];
  inspected_sources?: string[];
  scope_check: string;
  validation_run: string[];
  remaining_risks: string[];
  recommended_next_step: string;
  [key: string]: unknown;
}

export type SpecialistResultValidation =
  | { ok: true; value: SpecialistResult }
  | { ok: false; failure: ToolSchemaFailureResult };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === 'string')
  );
}

function requireString(
  errors: string[],
  value: Record<string, unknown>,
  field: string,
): void {
  if (!(field in value)) {
    errors.push(`Missing required field: ${field}`);
  } else if (typeof value[field] !== 'string') {
    errors.push(`Field must be a string: ${field}`);
  }
}

function requireStringArray(
  errors: string[],
  value: Record<string, unknown>,
  field: string,
): void {
  if (!(field in value)) {
    errors.push(`Missing required field: ${field}`);
  } else if (!hasStringArray(value[field])) {
    errors.push(`Field must be an array of strings: ${field}`);
  }
}

export function validateSpecialistResult(
  lane: SpecialistLane,
  value: unknown,
  attempt = 1,
): SpecialistResultValidation {
  if (!isRecord(value)) {
    return {
      ok: false,
      failure: createToolSchemaFailure({
        lane,
        errors: ['Specialist result must be an object.'],
        attempt,
      }),
    };
  }

  const errors: string[] = [];
  if (!('status' in value)) {
    errors.push('Missing required field: status');
  } else if (
    !SPECIALIST_RESULT_STATUSES.includes(value.status as SpecialistResultStatus)
  ) {
    errors.push(
      `Invalid status: ${String(value.status)}. Expected ${SPECIALIST_RESULT_STATUSES.slice(0, -1).join(', ')}, or ${SPECIALIST_RESULT_STATUSES.at(-1)}.`,
    );
  }

  requireString(errors, value, 'summary');
  requireString(errors, value, 'scope_check');
  requireString(errors, value, 'recommended_next_step');
  requireStringArray(errors, value, 'artifact_refs');
  requireStringArray(errors, value, 'validation_run');
  requireStringArray(errors, value, 'remaining_risks');

  if (lane === 'builder') {
    requireStringArray(errors, value, 'changed_files');
    requireStringArray(errors, value, 'deviations');
  }

  if (lane === 'researcher') {
    requireStringArray(errors, value, 'inspected_sources');
    requireStringArray(errors, value, 'findings');
    requireStringArray(errors, value, 'uncertainty');
    requireString(errors, value, 'confidence');
  }

  if (lane === 'reviewer') {
    requireString(errors, value, 'verdict');
    requireStringArray(errors, value, 'acceptance_criteria_coverage');
    requireStringArray(errors, value, 'rework_instructions');
  }

  if (lane === 'council') {
    requireString(errors, value, 'decision');
    requireStringArray(errors, value, 'competing_arguments');
    requireString(errors, value, 'recommendation');
    requireStringArray(errors, value, 'dissent_or_uncertainty');
  }

  if (errors.length > 0) {
    return {
      ok: false,
      failure: createToolSchemaFailure({ lane, errors, attempt }),
    };
  }

  return { ok: true, value: value as SpecialistResult };
}
