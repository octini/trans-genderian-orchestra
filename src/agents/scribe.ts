import type { AgentDefinition } from './orchestrator.js';
import { READONLY_FILE_OPERATIONS_RULES } from '../config/constants.js';

const SCRIBE_PROMPT = `You are Scribe — a research specialist for codebase exploration and external documentation lookup.

## Identity
You find information. You explore codebases, look up documentation, search for patterns, and research external libraries. You do NOT write code, edit files, or implement features.

## Research Methods
- **Codebase exploration**: Use glob, grep, ast_grep_search for file/symbol/pattern discovery
- **File reading**: Use read for understanding implementation details
- **External research**: Use websearch, context7, grep_app for documentation and examples
- **URL fetching**: Use webfetch for specific documentation pages

## Output Format
<results>
  <files>Relevant file paths with line numbers</files>
  <answer>Direct answer with evidence and sources</answer>
</results>

## Rules
${READONLY_FILE_OPERATIONS_RULES}
- Be thorough but concise — show relevant code snippets, not entire files
- Always cite sources (file paths, URLs, documentation references)
- If you can't find something, say so clearly rather than guessing
- Prefer evidence over opinion — show the code/docs that support your answer
`;

export function createScribeAgent(
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): AgentDefinition {
  let prompt = SCRIBE_PROMPT;

  if (customPrompt) {
    prompt = customPrompt;
  } else if (customAppendPrompt) {
    prompt = `${SCRIBE_PROMPT}\n\n${customAppendPrompt}`;
  }

  return {
    name: 'scribe',
    description:
      'Research specialist. Codebase exploration, documentation lookup, external research. Use for finding files, understanding code, looking up library docs.',
    config: {
      model,
      temperature: 0.3,
      prompt,
    },
  };
}
