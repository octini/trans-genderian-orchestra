import { READONLY_FILE_OPERATIONS_RULES } from '../config';
import { shortModelLabel } from '../utils/session';
import { type AgentDefinition, resolvePrompt } from './conductor';

const ENSEMBLE_PROMPT = `You are Ensemble — a multi-model consensus engine that synthesizes diverse perspectives into actionable feedback.

**Role**: You operate in one of two modes based on the conductor's request:

## Mode 1: General Consensus (default)
For hard questions needing multiple perspectives. Run 3 reviewers in parallel via council_session, then synthesize.

## Mode 2: Review Panel (when reviewing @composer's work)
For structured review of implementation. Run 3 reviewers in parallel, each with a distinct focus:
- first: Correctness & architecture — does the code work, is it well-structured?
- second: Edge cases & security — what breaks, what's exploitable, what's missing?
- third: UX & performance — is it usable, is it efficient, does it feel right?

## Output Format

For General Consensus mode — use markdown sections:
**Ensemble Response**: Unified answer with key insights
**Reviewer Details**: Individual reviewer perspectives
**Ensemble Summary**: Confidence level and consensus status

For Review Panel mode — use structured JSON:
{
  "verdict": "approve|reject",
  "per_councillor_findings": {
    "first": "Brief summary of correctness/architecture findings",
    "second": "Brief summary of edge cases/security findings",
    "third": "Brief summary of UX/performance findings"
  },
  "issues": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "description": "What's wrong and how to fix it",
      "severity": "critical|major|minor"
    }
  ],
  "consensus": "unanimous|majority|split"
}

**Consensus rules** (both modes):
- Unanimous (3/3 agree): strong consensus
- Majority (2/3 agree): consensus with dissent noted
- Split (1/3 or 0/3): no consensus, surface all perspectives
- Critical severity issue from ANY reviewer → verdict = reject regardless of vote count
- Always surface ALL individual findings — don't suppress minority findings

**Constraints**:
- Include all individual reviewer verdicts in output
- Be specific — reference files, lines, and exact issues
- Don't rubber-stamp — actually review the work

${READONLY_FILE_OPERATIONS_RULES}`;

/**
 * Build the prompt for a specific councillor session.
 *
 * Returns the raw user prompt — the agent factory (councillor.ts) provides
 * the system prompt with tool-aware instructions. No duplication.
 *
 * If a per-councillor prompt override is provided, it is prepended as
 * role/guidance context before the user's question.
 */
export function formatCouncillorPrompt(
  userPrompt: string,
  councillorPrompt?: string,
): string {
  if (!councillorPrompt) return userPrompt;
  return `${councillorPrompt}\n\n---\n\n${userPrompt}`;
}

/**
 * Format councillor results for the ensemble agent to synthesize.
 *
 * Formats councillor results as structured data that the ensemble agent
 * (which called the tool) will receive as the tool response. The ensemble
 * agent's system prompt contains synthesis instructions.
 * Returns a special message when all councillors failed to produce output.
 */
export function formatCouncillorResults(
  originalPrompt: string,
  councillorResults: Array<{
    name: string;
    model: string;
    status: string;
    result?: string;
    error?: string;
  }>,
): string {
  const completedWithResults = councillorResults.filter(
    (cr) => cr.status === 'completed' && cr.result,
  );

  const councillorSection = completedWithResults
    .map((cr) => {
      const shortModel = shortModelLabel(cr.model);
      return `**${cr.name}** (${shortModel}):\n${cr.result}`;
    })
    .join('\n\n');

  const failedSection = councillorResults
    .filter((cr) => cr.status !== 'completed')
    .map((cr) => `**${cr.name}**: ${cr.status} — ${cr.error ?? 'Unknown'}`)
    .join('\n');

  // Defensive guard: caller (runCouncil) short-circuits when all fail,
  // but this function may be reused in other contexts.
  if (completedWithResults.length === 0) {
    const errorDetails = councillorResults
      .map(
        (cr) =>
          `**${cr.name}** (${shortModelLabel(cr.model)}): ${cr.status} — ${
            cr.error ?? 'Unknown'
          }`,
      )
      .join('\n');

    return `---\n\n**Original Prompt**:\n${originalPrompt}\n\n---\n\n**Councillor Responses**:\nAll councillors failed to produce output:\n${errorDetails}\n\nPlease generate a response based on the original prompt alone.`;
  }

  let prompt = `---\n\n**Original Prompt**:\n${originalPrompt}\n\n---\n\n**Councillor Responses**:\n${councillorSection}`;

  if (failedSection) {
    prompt += `\n\n---\n\n**Failed/Timed-out Councillors**:\n${failedSection}`;
  }

  prompt +=
    '\n\n---\n\nYou MUST follow the Synthesis Process steps before producing output: review each councillor response individually, then produce the required output with a synthesized Ensemble Response, per-councillor details using their exact names, and an Ensemble Summary with consensus confidence rating (unanimous, majority, or split).';

  return prompt;
}

export function createEnsembleAgent(
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): AgentDefinition {
  const prompt = resolvePrompt(
    ENSEMBLE_PROMPT,
    customPrompt,
    customAppendPrompt,
  );

  const definition: AgentDefinition = {
    name: 'ensemble',
    description:
      'Multi-model consensus engine. Runs 3 reviewers in parallel with distinct perspectives. Use for hard decisions or structured review of @composer work.',
    config: {
      temperature: 0.1,
      prompt,
    },
  };

  // Ensemble's model comes from config override or is resolved at
  // runtime; only set if a non-empty string is provided.
  if (model) {
    definition.config.model = model;
  }

  return definition;
}
