# TGO v2 Phase 3 Workflow Contracts And Artifacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic Phase 3 workflow primitives for intent routing, delegation envelopes, specialist result contracts, artifact lifecycle rules, and orchestrator prompt guidance.

**Architecture:** Phase 3 adds pure TypeScript modules under `src/workflow/` and `src/artifacts/` so behavior can be tested without a running OpenCode session or external providers. The plugin agent prompt imports the same contract constants used by tests, keeping the orchestrator instructions aligned with machine-validated schema rules while leaving Beads runtime, worktrees, scheduling, and integration for Phase 4.

**Tech Stack:** TypeScript, Bun test, Biome, existing plugin config modules, no new runtime dependencies.

---

## Source Specs

- `designs/tgo-v2/specs/01-agent-workflow-delegation-review.md`
- `designs/tgo-v2/specs/04-beads-artifacts-workflows.md`
- `designs/tgo-v2/specs/06-resilience-fallback-escalation.md`
- `designs/tgo-v2/specs/07-implementation-phases-validation-gates.md`
- `designs/tgo-v2-settled-decisions.md`
- `docs/superpowers/plans/2026-06-02-tgo-v2-phase-2-agent-roster-permissions.md`

## Phase 3 Scope Boundary

In scope:

- Conversation-triggered workflow intent classification with confidence tiers.
- Recorded `inferred_intent` shape containing message excerpt, inferred workflow, confidence, confirmation requirement, final route, and clarification reason.
- Goal confirmation text generation for non-trivial implementation workflows.
- Strict delegation envelope type and validation for required fields, including the nested `user_intent` block.
- Specialist result contract validation for common and lane-specific fields.
- Schema failure result shape using `tool_schema_failure` with self-correction attempt guidance.
- Artifact frontmatter, status transition, supersession, and immutability rules for Markdown artifacts.
- Orchestrator prompt wiring that names the Phase 3 protocols and required gates.

Out of scope:

- Real OpenCode task dispatch orchestration.
- Runtime Beads issue generation or mutation.
- Worktree/branch creation, scheduler waves, batch integration, reconciliation, and commits from generated tasks.
- Model fallback/circuit breaker implementation beyond schema failure classification.
- Full Markdown/YAML parser support; Phase 3 only needs deterministic frontmatter objects and simple serialization/parsing for TGO-owned artifacts.
- Config setup changes beyond registering updated agent prompt text.

## Reuse Justification

No v1 module should be copied in Phase 3.

Approved reference-only reuse:

- Existing v2 command/result shape in `trans-genderian-orchestra-v2/src/commands/result.ts`: reuse the pattern of typed structured outputs and explicit notice codes. Phase 3 tests cover workflow-specific contracts directly.
- Existing v2 plugin agent modules in `trans-genderian-orchestra-v2/src/plugin/agents.ts`: extend prompt wiring only; do not import old v1 orchestrator behavior.
- Design specs listed above are the source of truth for field names and phase boundaries.

If any v1 source code is copied later, add a new reuse justification before doing so.

## File Structure

Create these files:

- `trans-genderian-orchestra-v2/src/workflow/intent.ts`: intent classification, confidence tiers, inferred intent records, and goal confirmation text.
- `trans-genderian-orchestra-v2/src/workflow/intent.test.ts`: tests for high/medium/low confidence routes and confirmation requirements.
- `trans-genderian-orchestra-v2/src/workflow/delegation-envelope.ts`: delegation envelope types, required field constants, validation, and schema failure conversion.
- `trans-genderian-orchestra-v2/src/workflow/delegation-envelope.test.ts`: tests for required fields and `user_intent` preservation.
- `trans-genderian-orchestra-v2/src/workflow/specialist-result.ts`: specialist result types, lane-specific validation, and schema failure result creation.
- `trans-genderian-orchestra-v2/src/workflow/specialist-result.test.ts`: tests for completed/needs_decision/rejected_scope results and malformed result handling.
- `trans-genderian-orchestra-v2/src/workflow/orchestrator-prompt.ts`: shared Phase 3 orchestrator prompt text assembled from validated contract constants.
- `trans-genderian-orchestra-v2/src/artifacts/lifecycle.ts`: artifact frontmatter types, status transitions, supersession rules, immutable artifact checks, and simple frontmatter serialization/parsing.
- `trans-genderian-orchestra-v2/src/artifacts/lifecycle.test.ts`: tests for draft/approved/superseded rules and immutable Reviewer/Council artifacts.

Modify these files:

- `trans-genderian-orchestra-v2/src/plugin/agents.ts`: replace the one-sentence orchestrator prompt with `ORCHESTRATOR_PROMPT` from `src/workflow/orchestrator-prompt.ts`.
- `trans-genderian-orchestra-v2/src/plugin/agents.test.ts`: verify orchestrator prompt contains inferred intent, delegation envelope, result contract, artifact lifecycle, and Reviewer gate guidance.

## Task Metadata

```yaml
task_id: phase3-workflow-contracts-artifacts
goal: Implement deterministic workflow contracts and artifact lifecycle primitives for TGO v2 Phase 3.
acceptance_criteria:
  - Intent classifier records inferred intent decisions with confidence, final route, confirmation requirement, and clarification reason when needed.
  - Non-trivial work intent requires goal confirmation and preserves verbatim user request in generated records.
  - Delegation envelope validation rejects missing required fields and missing nested user_intent fields.
  - Specialist result validation converts missing or malformed result blocks into tool_schema_failure results with self-correction attempt guidance.
  - Artifact lifecycle rules enforce draft-to-approved, approved-to-active/completed/superseded, superseded_by requirements, and immutable Reviewer/Council artifacts.
  - Orchestrator prompt explicitly instructs inferred intent recording, goal confirmation, strict delegation envelopes, specialist result contracts, artifact lifecycle, and Reviewer gate.
  - Phase 3 validation commands pass.
dependencies:
  - phase2-agent-roster-permissions
declared_write_scope:
  - trans-genderian-orchestra-v2/src/workflow/**
  - trans-genderian-orchestra-v2/src/artifacts/**
  - trans-genderian-orchestra-v2/src/plugin/agents.ts
  - trans-genderian-orchestra-v2/src/plugin/agents.test.ts
expected_read_context:
  - designs/tgo-v2/specs/01-agent-workflow-delegation-review.md
  - designs/tgo-v2/specs/04-beads-artifacts-workflows.md
  - designs/tgo-v2/specs/06-resilience-fallback-escalation.md
  - designs/tgo-v2/specs/07-implementation-phases-validation-gates.md
validation_commands:
  - bun test src/workflow/intent.test.ts
  - bun test src/workflow/delegation-envelope.test.ts src/workflow/specialist-result.test.ts
  - bun test src/artifacts/lifecycle.test.ts src/plugin/agents.test.ts
  - bun test
  - bun run typecheck
  - bun run check:ci
  - bun run build
parallel_group: phase3-serial
risk_level: medium
requires_user_decision: false
beads_issue: not-created-yet
artifact_refs:
  - docs/superpowers/plans/2026-06-02-tgo-v2-phase-3-workflow-contracts-artifacts.md
```

## Tasks

### Task 1: Add Workflow Intent Routing

**Files:**

- Create: `trans-genderian-orchestra-v2/src/workflow/intent.ts`
- Create: `trans-genderian-orchestra-v2/src/workflow/intent.test.ts`

- [ ] **Step 1: Write the failing intent tests**

Create `trans-genderian-orchestra-v2/src/workflow/intent.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import {
  buildGoalConfirmation,
  classifyWorkflowIntent,
} from './intent';

describe('workflow intent routing', () => {
  test('classifies implementation requests as high-confidence work intent', () => {
    const intent = classifyWorkflowIntent(
      'Please implement the next task from the approved plan.',
    );

    expect(intent).toEqual({
      message_excerpt: 'Please implement the next task from the approved plan.',
      inferred_workflow: 'work',
      confidence: 'high',
      confirmation_required: true,
      final_route: 'goal_confirmation',
      clarification_reason: undefined,
    });
  });

  test('classifies setup, doctor, council, and planning intents', () => {
    expect(classifyWorkflowIntent('Initialize TGO in this repo').inferred_workflow).toBe(
      'init',
    );
    expect(classifyWorkflowIntent('Check my setup and repair TGO').inferred_workflow).toBe(
      'doctor',
    );
    expect(classifyWorkflowIntent('Ask the council for another opinion').inferred_workflow).toBe(
      'council',
    );
    expect(classifyWorkflowIntent('Write a plan for phase 4').inferred_workflow).toBe(
      'planning',
    );
  });

  test('routes ambiguous medium-confidence work language to clarification', () => {
    const intent = classifyWorkflowIntent('Can you continue?');

    expect(intent.confidence).toBe('medium');
    expect(intent.final_route).toBe('ask_clarification');
    expect(intent.confirmation_required).toBe(true);
    expect(intent.clarification_reason).toBe(
      'Message suggests work continuation but does not identify a specific approved task or scope.',
    );
  });

  test('treats low-confidence conversation as ordinary conversation', () => {
    const intent = classifyWorkflowIntent('Thanks, that explanation helps.');

    expect(intent.inferred_workflow).toBe('conversation');
    expect(intent.confidence).toBe('low');
    expect(intent.final_route).toBe('ordinary_conversation');
    expect(intent.confirmation_required).toBe(false);
  });

  test('truncates long message excerpts deterministically', () => {
    const intent = classifyWorkflowIntent(`${'a'.repeat(120)} implement this`);

    expect(intent.message_excerpt).toHaveLength(80);
    expect(intent.message_excerpt.endsWith('...')).toBe(true);
  });

  test('builds goal confirmation text for non-trivial work', () => {
    const text = buildGoalConfirmation({
      selected_task: 'phase3-workflow-contracts-artifacts',
      goal: 'Implement workflow contracts',
      scope: ['src/workflow/**', 'src/artifacts/**'],
      acceptance_criteria: ['Delegation envelopes reject missing required fields'],
      key_risks: ['Prompt/schema drift'],
      approved_plan: 'docs/superpowers/plans/2026-06-02-tgo-v2-phase-3-workflow-contracts-artifacts.md',
    });

    expect(text).toContain('Selected task: phase3-workflow-contracts-artifacts');
    expect(text).toContain('Goal: Implement workflow contracts');
    expect(text).toContain('Scope: src/workflow/**; src/artifacts/**');
    expect(text).toContain(
      'Acceptance criteria: Delegation envelopes reject missing required fields',
    );
    expect(text).toContain('Approved plan: docs/superpowers/plans/');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/workflow/intent.test.ts
```

Expected: FAIL with module resolution error for `./intent`.

- [ ] **Step 3: Implement intent routing**

Create `trans-genderian-orchestra-v2/src/workflow/intent.ts`:

```ts
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

  if (includesAny(lower, ['ask the council', 'get another opinion', 'escalate this'])) {
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

  if (includesAny(lower, ['initialize tgo', 'init tgo', 'set this repo up', 'make this project ready'])) {
    return {
      message_excerpt,
      inferred_workflow: 'init',
      confidence: 'high',
      confirmation_required: true,
      final_route: 'run_init',
    };
  }

  if (includesAny(lower, ['write a plan', 'create a plan', 'planning', 'implementation plan'])) {
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/workflow/intent.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

Run:

```bash
git add trans-genderian-orchestra-v2/src/workflow/intent.ts trans-genderian-orchestra-v2/src/workflow/intent.test.ts
git commit -m "feat: add tgo workflow intent routing"
```

### Task 2: Add Delegation Envelope Validation

**Files:**

- Create: `trans-genderian-orchestra-v2/src/workflow/delegation-envelope.ts`
- Create: `trans-genderian-orchestra-v2/src/workflow/delegation-envelope.test.ts`

- [ ] **Step 1: Write the failing delegation envelope tests**

Create `trans-genderian-orchestra-v2/src/workflow/delegation-envelope.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import {
  createToolSchemaFailure,
  DELEGATION_ENVELOPE_REQUIRED_FIELDS,
  validateDelegationEnvelope,
} from './delegation-envelope';

const validEnvelope = {
  stream_id: 'phase3-stream',
  phase: 'apply',
  goal: 'Implement workflow contracts',
  scope: ['trans-genderian-orchestra-v2/src/workflow/**'],
  out_of_scope: ['worktree scheduler'],
  artifact_refs: [
    'docs/superpowers/plans/2026-06-02-tgo-v2-phase-3-workflow-contracts-artifacts.md',
  ],
  reuse_policy: 'Do not copy v1 modules.',
  acceptance_criteria: ['Delegation envelope required fields are enforced.'],
  verification_required: ['bun test src/workflow/delegation-envelope.test.ts'],
  allowed_write_paths: ['trans-genderian-orchestra-v2/src/workflow/**'],
  failure_mode: 'Return needs_decision or rejected_scope instead of improvising.',
  user_intent: {
    verbatim_request:
      'Continue with phased implementation, writing the plan for each phase based on the design document.',
    relevant_quotes: ['stop only when you need input from me'],
    orchestrator_interpretation: 'Implement Phase 3 from approved design specs.',
    user_confirmed_decisions: ['Local commits allowed; no remote push without asking.'],
    open_questions: [],
  },
};

describe('delegation envelope validation', () => {
  test('exports the strict required field list from the design spec', () => {
    expect(DELEGATION_ENVELOPE_REQUIRED_FIELDS).toEqual([
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
    ]);
  });

  test('accepts a complete envelope and preserves verbatim user intent', () => {
    const result = validateDelegationEnvelope(validEnvelope);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected valid envelope');
    }
    expect(result.value.user_intent.verbatim_request).toContain(
      'Continue with phased implementation',
    );
    expect(result.value.user_intent.user_confirmed_decisions).toContain(
      'Local commits allowed; no remote push without asking.',
    );
  });

  test('rejects missing top-level required fields', () => {
    const { goal: _goal, ...missingGoal } = validEnvelope;
    const result = validateDelegationEnvelope(missingGoal);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected invalid envelope');
    }
    expect(result.errors).toContain('Missing required field: goal');
  });

  test('rejects missing nested user_intent fields', () => {
    const result = validateDelegationEnvelope({
      ...validEnvelope,
      user_intent: {
        verbatim_request: validEnvelope.user_intent.verbatim_request,
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected invalid envelope');
    }
    expect(result.errors).toContain(
      'Missing required user_intent field: orchestrator_interpretation',
    );
    expect(result.errors).toContain(
      'Missing required user_intent field: user_confirmed_decisions',
    );
  });

  test('creates tool_schema_failure result with attempt-specific guidance', () => {
    const failure = createToolSchemaFailure({
      lane: 'builder',
      errors: ['Missing required field: goal'],
      attempt: 1,
    });

    expect(failure.status).toBe('tool_schema_failure');
    expect(failure.failure_class).toBe('tool_schema_failure');
    expect(failure.self_correction_allowed).toBe(true);
    expect(failure.expected_shape).toContain('stream_id');
    expect(failure.recommended_next_step).toContain('Return a corrected builder result');
  });

  test('blocks after the second self-correction attempt', () => {
    const failure = createToolSchemaFailure({
      lane: 'reviewer',
      errors: ['Malformed result block'],
      attempt: 3,
    });

    expect(failure.self_correction_allowed).toBe(false);
    expect(failure.recommended_next_step).toBe(
      'Mark the delegated reviewer task blocked_tool_schema and ask for help.',
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/workflow/delegation-envelope.test.ts
```

Expected: FAIL with module resolution error for `./delegation-envelope`.

- [ ] **Step 3: Implement delegation envelope validation**

Create `trans-genderian-orchestra-v2/src/workflow/delegation-envelope.ts`:

```ts
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
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
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

  const stringFields = ['stream_id', 'phase', 'goal', 'reuse_policy', 'failure_mode'];
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
      if (field in value.user_intent && typeof value.user_intent[field] !== 'string') {
        errors.push(`user_intent field must be a string: ${field}`);
      }
    }
    for (const field of ['relevant_quotes', 'user_confirmed_decisions', 'open_questions']) {
      if (field in value.user_intent && !hasStringArray(value.user_intent[field])) {
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/workflow/delegation-envelope.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

Run:

```bash
git add trans-genderian-orchestra-v2/src/workflow/delegation-envelope.ts trans-genderian-orchestra-v2/src/workflow/delegation-envelope.test.ts
git commit -m "feat: validate tgo delegation envelopes"
```

### Task 3: Add Specialist Result Contract Validation

**Files:**

- Create: `trans-genderian-orchestra-v2/src/workflow/specialist-result.ts`
- Create: `trans-genderian-orchestra-v2/src/workflow/specialist-result.test.ts`

- [ ] **Step 1: Write the failing specialist result tests**

Create `trans-genderian-orchestra-v2/src/workflow/specialist-result.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { validateSpecialistResult } from './specialist-result';

describe('specialist result contract validation', () => {
  test('accepts a completed builder result with validation evidence', () => {
    const result = validateSpecialistResult('builder', {
      status: 'completed',
      summary: 'Implemented workflow contracts.',
      artifact_refs: ['.opencode/tgo/reviews/phase3.md'],
      changed_files: ['trans-genderian-orchestra-v2/src/workflow/intent.ts'],
      scope_check: 'All changed files are inside allowed write paths.',
      validation_run: ['bun test src/workflow/intent.test.ts'],
      remaining_risks: [],
      recommended_next_step: 'Run Reviewer gate.',
      deviations: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected valid builder result');
    }
    expect(result.value.status).toBe('completed');
  });

  test('accepts researcher inspected sources and confidence', () => {
    const result = validateSpecialistResult('researcher', {
      status: 'completed',
      summary: 'Inspected workflow specs.',
      artifact_refs: ['.opencode/tgo/evidence/phase3.md'],
      inspected_sources: ['designs/tgo-v2/specs/01-agent-workflow-delegation-review.md'],
      scope_check: 'Read-only research only.',
      validation_run: [],
      remaining_risks: ['Spec 04 has runtime requirements deferred to Phase 4.'],
      recommended_next_step: 'Write implementation plan.',
      findings: ['Phase 3 requires schema failure handling.'],
      uncertainty: ['No runtime dispatcher yet.'],
      confidence: 'high',
    });

    expect(result.ok).toBe(true);
  });

  test('accepts reviewer verdict fields', () => {
    const result = validateSpecialistResult('reviewer', {
      status: 'completed',
      summary: 'Reviewer passed Phase 3.',
      artifact_refs: ['.opencode/tgo/reviews/phase3-review.md'],
      inspected_sources: ['trans-genderian-orchestra-v2/src/workflow/intent.ts'],
      scope_check: 'No scope drift.',
      validation_run: ['bun test'],
      remaining_risks: [],
      recommended_next_step: 'Commit and merge locally.',
      verdict: 'pass',
      acceptance_criteria_coverage: ['Intent routing covered.'],
      rework_instructions: [],
    });

    expect(result.ok).toBe(true);
  });

  test('returns tool_schema_failure for missing common fields', () => {
    const result = validateSpecialistResult('builder', {
      status: 'completed',
      summary: 'Missing validation fields.',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected schema failure');
    }
    expect(result.failure.status).toBe('tool_schema_failure');
    expect(result.failure.errors).toContain('Missing required field: scope_check');
  });

  test('returns tool_schema_failure for invalid status', () => {
    const result = validateSpecialistResult('builder', {
      status: 'done',
      summary: 'Bad status.',
      artifact_refs: [],
      changed_files: [],
      scope_check: 'n/a',
      validation_run: [],
      remaining_risks: [],
      recommended_next_step: 'n/a',
      deviations: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected schema failure');
    }
    expect(result.failure.errors).toContain(
      'Invalid status: done. Expected completed, needs_decision, blocked, failed, or rejected_scope.',
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/workflow/specialist-result.test.ts
```

Expected: FAIL with module resolution error for `./specialist-result`.

- [ ] **Step 3: Implement specialist result validation**

Create `trans-genderian-orchestra-v2/src/workflow/specialist-result.ts`:

```ts
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
export type SpecialistResultStatus = (typeof SPECIALIST_RESULT_STATUSES)[number];

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
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function requireString(errors: string[], value: Record<string, unknown>, field: string): void {
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
  requireString(errors, value, 'summary');
  requireString(errors, value, 'scope_check');
  requireString(errors, value, 'recommended_next_step');
  requireStringArray(errors, value, 'artifact_refs');
  requireStringArray(errors, value, 'validation_run');
  requireStringArray(errors, value, 'remaining_risks');

  if (!SPECIALIST_RESULT_STATUSES.includes(value.status as SpecialistResultStatus)) {
    errors.push(
      `Invalid status: ${String(value.status)}. Expected ${SPECIALIST_RESULT_STATUSES.slice(0, -1).join(', ')}, or ${SPECIALIST_RESULT_STATUSES.at(-1)}.`,
    );
  }

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
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/workflow/specialist-result.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

Run:

```bash
git add trans-genderian-orchestra-v2/src/workflow/specialist-result.ts trans-genderian-orchestra-v2/src/workflow/specialist-result.test.ts
git commit -m "feat: validate specialist result contracts"
```

### Task 4: Add Artifact Lifecycle Rules

**Files:**

- Create: `trans-genderian-orchestra-v2/src/artifacts/lifecycle.ts`
- Create: `trans-genderian-orchestra-v2/src/artifacts/lifecycle.test.ts`

- [ ] **Step 1: Write the failing artifact lifecycle tests**

Create `trans-genderian-orchestra-v2/src/artifacts/lifecycle.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import {
  assertArtifactTransition,
  parseArtifactFrontmatter,
  serializeArtifactFrontmatter,
} from './lifecycle';

describe('artifact lifecycle rules', () => {
  test('allows draft specs and plans to become approved', () => {
    expect(
      assertArtifactTransition({
        artifact_type: 'plan',
        from_status: 'draft',
        to_status: 'approved',
      }),
    ).toEqual({ ok: true });
  });

  test('allows approved implementation plans to become active or completed', () => {
    expect(
      assertArtifactTransition({
        artifact_type: 'plan',
        from_status: 'approved',
        to_status: 'active',
      }),
    ).toEqual({ ok: true });
    expect(
      assertArtifactTransition({
        artifact_type: 'plan',
        from_status: 'active',
        to_status: 'completed',
      }),
    ).toEqual({ ok: true });
  });

  test('requires superseded_by when superseding an artifact', () => {
    expect(
      assertArtifactTransition({
        artifact_type: 'decision',
        from_status: 'approved',
        to_status: 'superseded',
      }),
    ).toEqual({
      ok: false,
      errors: ['superseded artifacts require superseded_by.'],
    });

    expect(
      assertArtifactTransition({
        artifact_type: 'decision',
        from_status: 'approved',
        to_status: 'superseded',
        superseded_by: '.opencode/tgo/decisions/new-decision.md',
      }),
    ).toEqual({ ok: true });
  });

  test('prevents approval of completed artifacts', () => {
    expect(
      assertArtifactTransition({
        artifact_type: 'plan',
        from_status: 'completed',
        to_status: 'approved',
      }),
    ).toEqual({
      ok: false,
      errors: ['Invalid artifact status transition: completed -> approved.'],
    });
  });

  test('keeps reviewer and council artifacts immutable after creation', () => {
    expect(
      assertArtifactTransition({
        artifact_type: 'review',
        from_status: 'completed',
        to_status: 'archived',
      }),
    ).toEqual({
      ok: false,
      errors: [
        'review artifacts are immutable audit evidence after creation except metadata fixes.',
      ],
    });

    expect(
      assertArtifactTransition({
        artifact_type: 'council',
        from_status: 'completed',
        to_status: 'superseded',
        superseded_by: '.opencode/tgo/council/new.md',
      }),
    ).toEqual({
      ok: false,
      errors: [
        'council artifacts are immutable audit evidence after creation except metadata fixes.',
      ],
    });
  });

  test('serializes and parses deterministic markdown frontmatter', () => {
    const markdown = serializeArtifactFrontmatter({
      artifact_type: 'plan',
      status: 'approved',
      stream_id: 'phase3-stream',
      beads_issue: 'omo-slim_modifications-x7o',
      created_at: '2026-06-02T00:00:00.000Z',
      updated_at: '2026-06-02T01:00:00.000Z',
      superseded_by: undefined,
      worktree: '.worktrees/tgo-v2-phase-3',
      branch: 'tgo-v2-phase-3',
      commit: 'abc1234',
    });

    expect(markdown).toBe(`---\nartifact_type: plan\nstatus: approved\nstream_id: phase3-stream\nbeads_issue: omo-slim_modifications-x7o\ncreated_at: 2026-06-02T00:00:00.000Z\nupdated_at: 2026-06-02T01:00:00.000Z\nworktree: .worktrees/tgo-v2-phase-3\nbranch: tgo-v2-phase-3\ncommit: abc1234\n---\n`);
    expect(parseArtifactFrontmatter(markdown).value).toEqual({
      artifact_type: 'plan',
      status: 'approved',
      stream_id: 'phase3-stream',
      beads_issue: 'omo-slim_modifications-x7o',
      created_at: '2026-06-02T00:00:00.000Z',
      updated_at: '2026-06-02T01:00:00.000Z',
      worktree: '.worktrees/tgo-v2-phase-3',
      branch: 'tgo-v2-phase-3',
      commit: 'abc1234',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/artifacts/lifecycle.test.ts
```

Expected: FAIL with module resolution error for `./lifecycle`.

- [ ] **Step 3: Implement artifact lifecycle rules**

Create `trans-genderian-orchestra-v2/src/artifacts/lifecycle.ts`:

```ts
export const ARTIFACT_STATUSES = [
  'draft',
  'approved',
  'active',
  'completed',
  'superseded',
  'archived',
] as const;

export type ArtifactStatus = (typeof ARTIFACT_STATUSES)[number];
export type ArtifactType =
  | 'spec'
  | 'plan'
  | 'evidence'
  | 'review'
  | 'handoff'
  | 'decision'
  | 'council'
  | 'validation';

export interface ArtifactFrontmatter {
  artifact_type: ArtifactType;
  status: ArtifactStatus;
  stream_id?: string;
  beads_issue?: string;
  created_at?: string;
  updated_at?: string;
  superseded_by?: string;
  worktree?: string;
  branch?: string;
  commit?: string;
}

export type ArtifactTransitionResult =
  | { ok: true }
  | { ok: false; errors: string[] };

export type ParseFrontmatterResult =
  | { ok: true; value: Partial<ArtifactFrontmatter> }
  | { ok: false; errors: string[] };

const ALLOWED_TRANSITIONS: Record<ArtifactStatus, ArtifactStatus[]> = {
  draft: ['approved', 'superseded', 'archived'],
  approved: ['active', 'completed', 'superseded', 'archived'],
  active: ['completed', 'superseded', 'archived'],
  completed: ['archived'],
  superseded: ['archived'],
  archived: [],
};

export function assertArtifactTransition(input: {
  artifact_type: ArtifactType;
  from_status: ArtifactStatus;
  to_status: ArtifactStatus;
  superseded_by?: string;
  metadata_fix?: boolean;
}): ArtifactTransitionResult {
  const errors: string[] = [];

  if (
    (input.artifact_type === 'review' || input.artifact_type === 'council') &&
    !input.metadata_fix
  ) {
    errors.push(
      `${input.artifact_type} artifacts are immutable audit evidence after creation except metadata fixes.`,
    );
    return { ok: false, errors };
  }

  if (!ALLOWED_TRANSITIONS[input.from_status].includes(input.to_status)) {
    errors.push(
      `Invalid artifact status transition: ${input.from_status} -> ${input.to_status}.`,
    );
  }

  if (input.to_status === 'superseded' && !input.superseded_by) {
    errors.push('superseded artifacts require superseded_by.');
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function serializeArtifactFrontmatter(
  frontmatter: ArtifactFrontmatter,
): string {
  const orderedKeys: Array<keyof ArtifactFrontmatter> = [
    'artifact_type',
    'status',
    'stream_id',
    'beads_issue',
    'created_at',
    'updated_at',
    'superseded_by',
    'worktree',
    'branch',
    'commit',
  ];
  const lines = ['---'];
  for (const key of orderedKeys) {
    const value = frontmatter[key];
    if (value !== undefined) {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---');
  return `${lines.join('\n')}\n`;
}

export function parseArtifactFrontmatter(markdown: string): ParseFrontmatterResult {
  if (!markdown.startsWith('---\n')) {
    return { ok: false, errors: ['Missing opening frontmatter marker.'] };
  }
  const end = markdown.indexOf('\n---\n', 4);
  if (end === -1) {
    return { ok: false, errors: ['Missing closing frontmatter marker.'] };
  }

  const value: Record<string, string> = {};
  const body = markdown.slice(4, end);
  for (const line of body.split('\n')) {
    if (line.trim().length === 0) {
      continue;
    }
    const separator = line.indexOf(':');
    if (separator === -1) {
      return { ok: false, errors: [`Malformed frontmatter line: ${line}`] };
    }
    value[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }

  return { ok: true, value: value as Partial<ArtifactFrontmatter> };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/artifacts/lifecycle.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

Run:

```bash
git add trans-genderian-orchestra-v2/src/artifacts/lifecycle.ts trans-genderian-orchestra-v2/src/artifacts/lifecycle.test.ts
git commit -m "feat: enforce tgo artifact lifecycle rules"
```

### Task 5: Wire Orchestrator Prompt To Phase 3 Contracts

**Files:**

- Create: `trans-genderian-orchestra-v2/src/workflow/orchestrator-prompt.ts`
- Modify: `trans-genderian-orchestra-v2/src/plugin/agents.ts`
- Modify: `trans-genderian-orchestra-v2/src/plugin/agents.test.ts`

- [ ] **Step 1: Write the failing prompt wiring test**

Modify the `creates all role-specific agent configs` test in `trans-genderian-orchestra-v2/src/plugin/agents.test.ts` by adding these expectations after the existing `tgo-reviewer` prompt assertion:

```ts
    expect(agents['tgo-orchestrator'].prompt).toContain('inferred_intent');
    expect(agents['tgo-orchestrator'].prompt).toContain('Goal Confirmation');
    expect(agents['tgo-orchestrator'].prompt).toContain('Delegation Envelope');
    expect(agents['tgo-orchestrator'].prompt).toContain('Specialist Result Contract');
    expect(agents['tgo-orchestrator'].prompt).toContain('tool_schema_failure');
    expect(agents['tgo-orchestrator'].prompt).toContain('Artifact Lifecycle');
    expect(agents['tgo-orchestrator'].prompt).toContain('Reviewer Gate');
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/plugin/agents.test.ts
```

Expected: FAIL because the current one-sentence orchestrator prompt does not contain the full Phase 3 protocol terms.

- [ ] **Step 3: Implement prompt wiring**

Create `trans-genderian-orchestra-v2/src/workflow/orchestrator-prompt.ts`:

```ts
import { DELEGATION_ENVELOPE_REQUIRED_FIELDS } from './delegation-envelope';

export const ORCHESTRATOR_PROMPT = `You are the TGO v2 Orchestrator: technical lead, phase controller, scheduler, artifact owner, and user-facing coordinator.

Role boundary: classify intent, retrieve small context, ask concise clarification questions, create/update TGO artifacts, schedule specialists, reconcile results, trigger deterministic TGO operations, and record state. Do not edit implementation source, tests, package files, or arbitrary project config outside explicit deterministic setup/init operations.

Conversation-triggered routing: when normal user language implies a TGO workflow, record an inferred_intent block with message_excerpt, inferred_workflow, confidence, confirmation_required, final_route, and clarification_reason when clarification is needed. High-confidence work can proceed to Goal Confirmation. Medium confidence asks one short clarification. Low confidence remains ordinary conversation or research.

Goal Confirmation: before non-trivial implementation, state the selected task, goal, scope, acceptance criteria, key risks, and approved plan or issue chain. Trivial maintenance may use a minimal brief, but still preserve scope and expected outcome.

Delegation Envelope: every orchestrator-delegated non-trivial specialist task must include ${DELEGATION_ENVELOPE_REQUIRED_FIELDS.join(', ')}. The user_intent block must preserve verbatim_request, relevant_quotes, orchestrator_interpretation, user_confirmed_decisions, and open_questions. Specialists must flag mismatches and return needs_decision, blocked, or rejected_scope instead of expanding scope.

Specialist Result Contract: require status, summary, artifact_refs, changed_files or inspected_sources, scope_check, validation_run, remaining_risks, and recommended_next_step. Missing or malformed result blocks become tool_schema_failure and receive up to two self-correction attempts before blocked_tool_schema.

Artifact Lifecycle: specs and plans start draft, user-approved specs/plans become approved, implementation-linked plans become active, completed/reviewed plans become completed, replaced decisions become superseded with superseded_by, and old streams become archived. Reviewer and Council artifacts are immutable audit evidence after creation except metadata fixes.

Reviewer Gate: every code/config/doc change affecting behavior requires Reviewer verification before you claim completion. Reviewer rejection routes back to Builder once; a second rejection escalates to Council or the user.`;
```

Modify `trans-genderian-orchestra-v2/src/plugin/agents.ts`:

```ts
import { TGO_AGENT_IDS, type TgoAgentId } from './agent-ids';
import { getPermissionProfile, type PermissionProfile } from './permissions';
import { ORCHESTRATOR_PROMPT } from '../workflow/orchestrator-prompt';
```

Then replace only the `ROLE_PROMPTS['tgo-orchestrator']` value with:

```ts
  'tgo-orchestrator': ORCHESTRATOR_PROMPT,
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/plugin/agents.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

Run:

```bash
git add trans-genderian-orchestra-v2/src/workflow/orchestrator-prompt.ts trans-genderian-orchestra-v2/src/plugin/agents.ts trans-genderian-orchestra-v2/src/plugin/agents.test.ts
git commit -m "feat: wire orchestrator workflow contract prompt"
```

### Task 6: Run Phase 3 Validation Gate

**Files:**

- No source edits expected unless validation exposes issues.

- [ ] **Step 1: Run targeted Phase 3 tests**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test src/workflow/intent.test.ts
bun test src/workflow/delegation-envelope.test.ts src/workflow/specialist-result.test.ts
bun test src/artifacts/lifecycle.test.ts src/plugin/agents.test.ts
```

Expected:

- Intent tests: PASS, 6 tests.
- Delegation/result tests: PASS, 11 tests total.
- Artifact/plugin tests: PASS, 13 tests total.

- [ ] **Step 2: Run full package verification**

Run:

```bash
cd trans-genderian-orchestra-v2
bun test
bun run typecheck
bun run check:ci
bun run build
```

Expected:

- `bun test`: all tests pass with 0 failures.
- `bun run typecheck`: exits 0.
- `bun run check:ci`: exits 0 with no formatter/linter changes required.
- `bun run build`: exits 0 and emits `dist/index.js`, `dist/index.d.ts`, and `dist/cli/index.js`.

- [ ] **Step 3: Run Phase 3 contract smoke after build**

Run:

```bash
cd trans-genderian-orchestra-v2
bun -e "import { classifyWorkflowIntent } from './src/workflow/intent.ts'; import { validateDelegationEnvelope } from './src/workflow/delegation-envelope.ts'; import { validateSpecialistResult } from './src/workflow/specialist-result.ts'; import { assertArtifactTransition } from './src/artifacts/lifecycle.ts'; const intent = classifyWorkflowIntent('Implement the next approved task'); const envelope = validateDelegationEnvelope({ stream_id: 'smoke', phase: 'apply', goal: 'Smoke', scope: ['src/**'], out_of_scope: [], artifact_refs: ['plan.md'], reuse_policy: 'none', acceptance_criteria: ['passes'], verification_required: ['bun test'], allowed_write_paths: ['src/**'], failure_mode: 'blocked', user_intent: { verbatim_request: 'Implement the next approved task', relevant_quotes: [], orchestrator_interpretation: 'Run work flow', user_confirmed_decisions: [], open_questions: [] } }); const specialist = validateSpecialistResult('builder', { status: 'completed', summary: 'ok', artifact_refs: [], changed_files: [], scope_check: 'ok', validation_run: [], remaining_risks: [], recommended_next_step: 'review', deviations: [] }); const transition = assertArtifactTransition({ artifact_type: 'plan', from_status: 'draft', to_status: 'approved' }); if (intent.final_route !== 'goal_confirmation' || !envelope.ok || !specialist.ok || !transition.ok) process.exit(1); console.log(JSON.stringify({ smoke: 'phase3-workflow-contracts', intent: intent.final_route, envelope: envelope.ok, specialist: specialist.ok, transition: transition.ok }, null, 2));"
```

Expected output:

```json
{
  "smoke": "phase3-workflow-contracts",
  "intent": "goal_confirmation",
  "envelope": true,
  "specialist": true,
  "transition": true
}
```

- [ ] **Step 4: Commit any validation-only fixes**

If formatting or type fixes were required, commit them:

```bash
git add trans-genderian-orchestra-v2
git commit -m "style: format phase 3 workflow contracts"
```

If no changes were required, do not create an empty commit.

## Phase 3 Completion Criteria

Phase 3 is complete only when all of these are true:

- The plan file is committed.
- The Phase 3 branch contains commits for Tasks 1 through 5 and any validation fixes.
- Targeted tests pass.
- Full `bun test`, `bun run typecheck`, `bun run check:ci`, and `bun run build` pass.
- Phase 3 contract smoke prints the exact JSON shape above.
- A Reviewer-style pass is recorded in the deepwork file or an explicit review artifact.
- The branch is locally merged into `master` only after validation passes.
- No remote push is performed without asking the user first.

## Manual Testing Prompt

No manual OpenCode session test is required for Phase 3 because the implementation is deterministic TypeScript contract logic plus prompt registration. Manual OpenCode prompt testing starts in Phase 4 when `/tgo:work`, Beads, worktrees, and real subagent dispatch become runtime behavior.

## Self-Review Notes

- Spec coverage: Phase 3 gates from `07-implementation-phases-validation-gates.md` are covered by Tasks 1 through 5.
- Placeholder scan: no incomplete placeholder tokens are intentionally present.
- Type consistency: `tool_schema_failure`, `inferred_intent`, `Delegation Envelope`, `Specialist Result Contract`, and artifact statuses use the exact design-spec terms.
- Scope boundary: Beads/worktrees/scheduler runtime remains deferred to Phase 4.
