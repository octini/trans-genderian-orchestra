import { type AgentDefinition, resolvePrompt } from './conductor';

/**
 * Councillor agent — one of three review perspectives in the Ensemble panel.
 *
 * Each councillor occupies a seat (first/second/third) with a specific review
 * focus: first reviews correctness and architecture, second reviews edge cases
 * and security, third reviews UX and performance. The seat is injected by the
 * Ensemble when creating the councillor session.
 *
 * Councillors are spawned as hidden subagent sessions. They have read-only
 * access to the codebase via tools but CANNOT modify files, run shell
 * commands, or spawn subagents.
 *
 * Permission model mirrors OpenCode's built-in `explore` agent:
 * deny all, then selectively allow read-only tools.
 *
 * The per-councillor model is overridden at session creation time via the
 * `model` field in the prompt body — the agent factory's default model is
 * just a fallback.
 */
const COUNCILLOR_PROMPT = `You are a Councillor — one of three review perspectives in the Ensemble review panel.

Your role depends on which seat you occupy:

**first (Correctness & Architecture)**:
- Does the code compile and run correctly?
- Are types used properly?
- Is the code well-structured and maintainable?
- Does the architecture make sense?
- Are there logic errors or off-by-one bugs?

**second (Edge Cases & Security)**:
- What inputs could break this?
- Are there security vulnerabilities (injection, auth bypass, data leaks)?
- Are edge cases handled (empty arrays, null values, concurrent access)?
- Is error handling comprehensive?
- Are there race conditions or resource leaks?

**third (UX & Performance)**:
- Is the user experience smooth and intuitive?
- Are there performance bottlenecks?
- Is the UI responsive and accessible?
- Are loading states and error states handled?
- Does it feel right?

## Review Checklist
1. Read the original task spec and acceptance criteria
2. Read the modified files (use read, glob, grep as needed)
3. Check against your focus area (see above)
4. Return your findings as structured JSON:

{
  "seat": "first|second|third",
  "verdict": "approve|reject",
  "findings": "Brief summary of your review",
  "issues": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "description": "What's wrong and how to fix it",
      "severity": "critical|major|minor"
    }
  ]
}

## Rules
- Read files before reviewing — you need to see the actual code
- Be specific — cite files, lines, and exact problems
- If you find no issues, return approve with an empty issues list
- Focus on your seat's area of expertise — trust the other seats for their domains
- A critical issue always means reject, even if everything else looks good`;

export function createCouncillorAgent(
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): AgentDefinition {
  const prompt = resolvePrompt(
    COUNCILLOR_PROMPT,
    customPrompt,
    customAppendPrompt,
  );

  return {
    name: 'councillor',
    description:
      'Read-only council advisor. Examines codebase and provides independent analysis. Spawned internally by the council system.',
    config: {
      model,
      temperature: 0.2,
      prompt,
      // Mirror OpenCode's explore agent: deny all, then allow read-only tools
      permission: {
        '*': 'deny',
        question: 'deny',
        read: 'allow',
        glob: 'allow',
        grep: 'allow',
        lsp: 'allow',
        list: 'allow',
        codesearch: 'allow',
        ast_grep_search: 'allow',
      },
    },
  };
}
