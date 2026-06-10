export type WorkflowIntent =
  | 'work'
  | 'init'
  | 'doctor'
  | 'council'
  | 'planning'
  | 'conversation';

export type IntentConfidence = 'high' | 'medium' | 'low';

export type IntentRoute =
  | 'goal_confirmation'
  | 'run_init'
  | 'run_doctor'
  | 'run_council'
  | 'create_plan'
  | 'ask_clarification'
  | 'ordinary_conversation';

export interface InferredIntentRecord {
  message_excerpt: string;
  inferred_workflow: WorkflowIntent;
  confidence: IntentConfidence;
  confirmation_required: boolean;
  final_route: IntentRoute;
  clarification_reason?: string;
}

export interface GoalConfirmationInput {
  selected_task: string;
  goal: string;
  scope: string[];
  acceptance_criteria: string[];
  key_risks: string[];
  approved_plan?: string;
}

function excerpt(message: string): string {
  const normalized = message.replace(/\s+/g, ' ').trim();
  return normalized.length <= 80 ? normalized : `${normalized.slice(0, 77)}...`;
}

function includesAny(message: string, terms: string[]): boolean {
  return terms.some((term) => message.includes(term));
}

export function classifyWorkflowIntent(message: string): InferredIntentRecord {
  const lower = message.toLowerCase();
  const message_excerpt = excerpt(message);

  if (
    includesAny(lower, [
      'ask the council',
      'get another opinion',
      'escalate this',
    ])
  ) {
    return {
      message_excerpt,
      inferred_workflow: 'council',
      confidence: 'high',
      confirmation_required: false,
      final_route: 'run_council',
    };
  }

  if (includesAny(lower, ['check my setup', 'repair tgo', 'doctor'])) {
    return {
      message_excerpt,
      inferred_workflow: 'doctor',
      confidence: 'high',
      confirmation_required: false,
      final_route: 'run_doctor',
    };
  }

  if (
    includesAny(lower, [
      'initialize tgo',
      'init tgo',
      'set this repo up',
      'make this project ready',
    ])
  ) {
    return {
      message_excerpt,
      inferred_workflow: 'init',
      confidence: 'high',
      confirmation_required: true,
      final_route: 'run_init',
    };
  }

  if (
    includesAny(lower, [
      'write a plan',
      'create a plan',
      'planning',
      'implementation plan',
    ])
  ) {
    return {
      message_excerpt,
      inferred_workflow: 'planning',
      confidence: 'high',
      confirmation_required: false,
      final_route: 'create_plan',
    };
  }

  if (includesAny(lower, ['implement', 'fix this', 'work on', 'next task'])) {
    return {
      message_excerpt,
      inferred_workflow: 'work',
      confidence: 'high',
      confirmation_required: true,
      final_route: 'goal_confirmation',
    };
  }

  if (includesAny(lower, ['continue', 'next'])) {
    return {
      message_excerpt,
      inferred_workflow: 'work',
      confidence: 'medium',
      confirmation_required: true,
      final_route: 'ask_clarification',
      clarification_reason:
        'Message suggests work continuation but does not identify a specific approved task or scope.',
    };
  }

  return {
    message_excerpt,
    inferred_workflow: 'conversation',
    confidence: 'low',
    confirmation_required: false,
    final_route: 'ordinary_conversation',
  };
}

export function buildGoalConfirmation(input: GoalConfirmationInput): string {
  return [
    `Selected task: ${input.selected_task}`,
    `Goal: ${input.goal}`,
    `Scope: ${input.scope.join('; ')}`,
    `Acceptance criteria: ${input.acceptance_criteria.join('; ')}`,
    `Key risks: ${input.key_risks.join('; ')}`,
    `Approved plan: ${input.approved_plan ?? 'none'}`,
  ].join('\n');
}
