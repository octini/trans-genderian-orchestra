import { z } from 'zod';
import { log } from '../utils/logger';

/**
 * Delegation envelope schema — passed from orchestrator to specialist agents
 * Wrapped in <delegation_envelope> XML tags, embedded inline in task prompt
 */
export const DelegationEnvelopeSchema = z.object({
  verbatim_request: z.string().min(1, 'Original user request is required'),
  task: z.string().min(1, 'Task description is required'),
  acceptance_criteria: z
    .array(z.string())
    .min(1, 'At least one acceptance criterion required'),
  context_summary: z.string().min(1, 'Context summary is required'),
  file_references: z
    .array(
      z.object({
        path: z.string().min(1),
        purpose: z.string(),
        focus_lines: z.array(z.number()).optional(),
      }),
    )
    .default([]),
  agent_mode: z.enum(['verification', 'advisory']).optional(),
  risk_tier: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  trivial: z.boolean().default(false).optional(),
  plan_ref: z.string().optional(),
});

export type DelegationEnvelope = z.infer<typeof DelegationEnvelopeSchema>;

export type DelegationEnvelopeParseErrorType =
  | 'missing-envelope'
  | 'invalid-json'
  | 'schema-validation';

export type DelegationEnvelopeParseSuccess = {
  envelope: DelegationEnvelope;
  corrected: boolean;
  issues?: string[];
  errorType?: undefined;
};

export type DelegationEnvelopeParseFailure = {
  envelope: null;
  corrected: false;
  issues: string[];
  errorType: DelegationEnvelopeParseErrorType;
};

export type DelegationEnvelopeParseResult =
  | DelegationEnvelopeParseSuccess
  | DelegationEnvelopeParseFailure;

const DELEGATION_ENVELOPE_RE =
  /<delegation_envelope>([\s\S]*?)<\/delegation_envelope>/;
const ANY_XML_RE = /<([A-Za-z_][\w.-]*)\b[^>]*>([\s\S]*?)<\/\1>/;
const MISSING_ENVELOPE_ISSUE = 'missing <delegation_envelope> block';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatIssuePath(path: Array<PropertyKey>): string {
  const joined = path.map(String).join('.');
  return joined.length > 0 ? joined : '(root)';
}

function formatZodIssues(error: z.ZodError): string[] {
  return error.issues.map(
    (issue) => `${formatIssuePath(issue.path)}: ${issue.message}`,
  );
}

function logEnvelopeParseFailure(
  source: 'exact' | 'fallback',
  failure: DelegationEnvelopeParseFailure,
  raw: string,
): void {
  log('[delegation-envelope] invalid delegation envelope', {
    source,
    errorType: failure.errorType,
    issues: failure.issues,
    rawPreview: raw.slice(0, 200),
  });
}

function stripMarkdownFences(raw: string): string {
  let cleaned = raw.trim();
  // Remove leading ```json, ```, or ```<anything> lines
  if (cleaned.startsWith('```')) {
    const firstNewline = cleaned.indexOf('\n');
    if (firstNewline !== -1) {
      cleaned = cleaned.slice(firstNewline + 1);
    }
  }
  // Remove trailing ```
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3).trimEnd();
  } else if (cleaned.endsWith('```\n')) {
    cleaned = cleaned.slice(0, -4).trimEnd();
  }
  return cleaned.trim();
}

function parseEnvelopePayload(
  raw: string,
  options: {
    source: 'exact' | 'fallback';
    corrected: boolean;
    successIssues?: string[];
    logFailures?: boolean;
  },
): DelegationEnvelopeParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripMarkdownFences(raw));
  } catch (error) {
    const failure: DelegationEnvelopeParseFailure = {
      envelope: null,
      corrected: false,
      errorType: 'invalid-json',
      issues: [`invalid JSON: ${errorMessage(error)}`],
    };
    if (options.logFailures) {
      logEnvelopeParseFailure(options.source, failure, raw);
    }
    return failure;
  }

  const result = DelegationEnvelopeSchema.safeParse(parsed);
  if (!result.success) {
    const failure: DelegationEnvelopeParseFailure = {
      envelope: null,
      corrected: false,
      errorType: 'schema-validation',
      issues: formatZodIssues(result.error),
    };
    if (options.logFailures) {
      logEnvelopeParseFailure(options.source, failure, raw);
    }
    return failure;
  }

  return {
    envelope: result.data,
    corrected: options.corrected,
    issues: options.successIssues,
  };
}

function parseExactEnvelope(
  prompt: string,
  logFailures: boolean,
): DelegationEnvelopeParseResult {
  const match = DELEGATION_ENVELOPE_RE.exec(prompt);
  if (!match) {
    return {
      envelope: null,
      corrected: false,
      errorType: 'missing-envelope',
      issues: [MISSING_ENVELOPE_ISSUE],
    };
  }

  return parseEnvelopePayload(match[1], {
    source: 'exact',
    corrected: false,
    logFailures,
  });
}

function correctMalformedEnvelope(
  prompt: string,
  logFailures: boolean,
): DelegationEnvelopeParseResult | null {
  const anyXmlMatch = ANY_XML_RE.exec(prompt);
  if (!anyXmlMatch) return null;

  return parseEnvelopePayload(anyXmlMatch[2], {
    source: 'fallback',
    corrected: true,
    successIssues: [`malformed XML tags corrected: found <${anyXmlMatch[1]}>`],
    logFailures,
  });
}

/**
 * Extract and validate a delegation envelope from a prompt string.
 * Looks for <delegation_envelope>...</delegation_envelope> XML tags.
 * Returns the parsed envelope or null if not found/invalid.
 *
 * @deprecated Use extractDelegationEnvelopeV2 instead. Kept for direct-import
 * backward compatibility.
 */
export function extractDelegationEnvelope(
  prompt: string,
): DelegationEnvelope | null {
  return parseExactEnvelope(prompt, true).envelope;
}

/**
 * Parse and correct a malformed delegation envelope with feedback.
 * Returns the corrected envelope or null if the error is unfixable.
 *
 * @deprecated Use extractDelegationEnvelopeV2 instead. Kept for direct-import
 * backward compatibility.
 */
export function parseAndCorrect(prompt: string): {
  envelope: DelegationEnvelope | null;
  corrected: boolean;
  issues?: string[];
  errorType?: DelegationEnvelopeParseErrorType;
} | null {
  const exact = parseExactEnvelope(prompt, true);
  if (exact.envelope) return exact;

  // Correcting can only help malformed or missing wrapper tags. If the correct
  // wrapper was present but its JSON/schema was invalid, return that typed
  // failure instead of fabricating a partial envelope.
  if (exact.errorType !== 'missing-envelope') return exact;

  // Attempt fallback: try to find any JSON block between XML tags
  return correctMalformedEnvelope(prompt, true);
}

/**
 * Unified entry point: try exact parse first, fall back to correction.
 */
export function extractDelegationEnvelopeV2(prompt: string): {
  envelope: DelegationEnvelope | null;
  corrected: boolean;
  issues?: string[];
  errorType?: DelegationEnvelopeParseErrorType;
} {
  const exact = parseExactEnvelope(prompt, true);
  if (exact.envelope) return exact;

  if (exact.errorType !== 'missing-envelope') return exact;

  const corrected = correctMalformedEnvelope(prompt, true);
  return corrected ?? exact;
}
