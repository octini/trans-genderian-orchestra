import { z } from 'zod';

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
  plan_ref: z.string().optional(),
});

export type DelegationEnvelope = z.infer<typeof DelegationEnvelopeSchema>;

/**
 * Extract and validate a delegation envelope from a prompt string.
 * Looks for <delegation_envelope>...</delegation_envelope> XML tags.
 * Returns the parsed envelope or null if not found/invalid.
 */
export function extractDelegationEnvelope(
  prompt: string,
): DelegationEnvelope | null {
  const match = /<delegation_envelope>([\s\S]*?)<\/delegation_envelope>/.exec(
    prompt,
  );
  if (!match) return null;

  try {
    const parsed: unknown = JSON.parse(match[1].trim());
    return DelegationEnvelopeSchema.parse(parsed);
  } catch {
    return null;
  }
}

/**
 * Parse and correct a malformed delegation envelope with feedback.
 * Returns the corrected envelope or null if the error is unfixable.
 */
export function parseAndCorrect(prompt: string): {
  envelope: DelegationEnvelope;
  corrected: boolean;
  issues?: string[];
} | null {
  const raw = extractDelegationEnvelope(prompt);
  if (raw) return { envelope: raw, corrected: false };

  // Attempt fallback: try to find any JSON block between XML tags
  const anyXmlMatch = /<[A-Za-z_]+>([\s\S]*?)<\/[A-Za-z_]+>/.exec(prompt);
  if (!anyXmlMatch) return null;

  try {
    const parsed: unknown = JSON.parse(anyXmlMatch[1].trim());
    // Wrap in correct tags and parse
    const reconstructed = `<delegation_envelope>${JSON.stringify(
      parsed,
    )}</delegation_envelope>`;
    const reMatch =
      /<delegation_envelope>([\s\S]*?)<\/delegation_envelope>/.exec(
        reconstructed,
      );
    if (!reMatch) return null;

    const result = DelegationEnvelopeSchema.safeParse(
      JSON.parse(reMatch[1].trim()),
    );
    if (result.success) {
      return {
        envelope: result.data,
        corrected: true,
        issues: ['malformed XML tags corrected'],
      };
    }

    // Return validation issues
    return {
      envelope: null as unknown as DelegationEnvelope,
      corrected: false,
      issues: result.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`,
      ),
    };
  } catch {
    return null;
  }
}

/**
 * Unified entry point: try exact parse first, fall back to correction.
 */
export function extractDelegationEnvelopeV2(prompt: string): {
  envelope: DelegationEnvelope | null;
  corrected: boolean;
  issues?: string[];
} {
  const exact = extractDelegationEnvelope(prompt);
  if (exact) return { envelope: exact, corrected: false };
  const corrected = parseAndCorrect(prompt);
  if (corrected?.envelope) {
    return {
      envelope: corrected.envelope,
      corrected: true,
      issues: corrected.issues,
    };
  }
  return { envelope: null, corrected: false, issues: corrected?.issues };
}
