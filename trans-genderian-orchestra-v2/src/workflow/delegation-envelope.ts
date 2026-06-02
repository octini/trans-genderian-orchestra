export const DELEGATION_ENVELOPE_REQUIRED_FIELDS = [
  'stream_id',
  'phase',
  'goal',
  'scope',
  'out_of_scope',
  'artifact_refs',
  'reuse_policy',
  'acceptance_criteria',
  'verification_required',
  'allowed_write_paths',
  'failure_mode',
  'user_intent',
] as const;

export const USER_INTENT_REQUIRED_FIELDS = [
  'verbatim_request',
  'relevant_quotes',
  'orchestrator_interpretation',
  'user_confirmed_decisions',
  'open_questions',
] as const;

export type DelegationEnvelopeRequiredField =
  (typeof DELEGATION_ENVELOPE_REQUIRED_FIELDS)[number];

export interface DelegationUserIntent {
  verbatim_request: string;
  relevant_quotes: string[];
  orchestrator_interpretation: string;
  user_confirmed_decisions: string[];
  open_questions: string[];
}

export interface DelegationEnvelope {
  stream_id: string;
  phase: string;
  goal: string;
  scope: string[];
  out_of_scope: string[];
  artifact_refs: string[];
  reuse_policy: string;
  acceptance_criteria: string[];
  verification_required: string[];
  allowed_write_paths: string[];
  failure_mode: string;
  user_intent: DelegationUserIntent;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

export interface ToolSchemaFailureResult {
  status: 'tool_schema_failure';
  failure_class: 'tool_schema_failure';
  lane: string;
  errors: string[];
  expected_shape: string;
  self_correction_allowed: boolean;
  recommended_next_step: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === 'string')
  );
}

export function validateDelegationEnvelope(
  value: unknown,
): ValidationResult<DelegationEnvelope> {
  if (!isRecord(value)) {
    return { ok: false, errors: ['Delegation envelope must be an object.'] };
  }

  const errors: string[] = [];

  for (const field of DELEGATION_ENVELOPE_REQUIRED_FIELDS) {
    if (!(field in value)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  const stringFields = [
    'stream_id',
    'phase',
    'goal',
    'reuse_policy',
    'failure_mode',
  ];
  for (const field of stringFields) {
    if (field in value && typeof value[field] !== 'string') {
      errors.push(`Field must be a string: ${field}`);
    }
  }

  const stringArrayFields = [
    'scope',
    'out_of_scope',
    'artifact_refs',
    'acceptance_criteria',
    'verification_required',
    'allowed_write_paths',
  ];
  for (const field of stringArrayFields) {
    if (field in value && !hasStringArray(value[field])) {
      errors.push(`Field must be an array of strings: ${field}`);
    }
  }

  if (!isRecord(value.user_intent)) {
    errors.push('Field must be an object: user_intent');
  } else {
    for (const field of USER_INTENT_REQUIRED_FIELDS) {
      if (!(field in value.user_intent)) {
        errors.push(`Missing required user_intent field: ${field}`);
      }
    }
    for (const field of ['verbatim_request', 'orchestrator_interpretation']) {
      if (
        field in value.user_intent &&
        typeof value.user_intent[field] !== 'string'
      ) {
        errors.push(`user_intent field must be a string: ${field}`);
      }
    }
    for (const field of [
      'relevant_quotes',
      'user_confirmed_decisions',
      'open_questions',
    ]) {
      if (
        field in value.user_intent &&
        !hasStringArray(value.user_intent[field])
      ) {
        errors.push(`user_intent field must be an array of strings: ${field}`);
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: value as unknown as DelegationEnvelope };
}

export function createToolSchemaFailure(input: {
  lane: string;
  errors: string[];
  attempt: number;
}): ToolSchemaFailureResult {
  const selfCorrectionAllowed = input.attempt <= 2;
  return {
    status: 'tool_schema_failure',
    failure_class: 'tool_schema_failure',
    lane: input.lane,
    errors: input.errors,
    expected_shape: `Delegation envelope fields: ${DELEGATION_ENVELOPE_REQUIRED_FIELDS.join(', ')}; user_intent fields: ${USER_INTENT_REQUIRED_FIELDS.join(', ')}`,
    self_correction_allowed: selfCorrectionAllowed,
    recommended_next_step: selfCorrectionAllowed
      ? `Return a corrected ${input.lane} result with the required shape and do not repeat malformed fields.`
      : `Mark the delegated ${input.lane} task blocked_tool_schema and ask for help.`,
  };
}
