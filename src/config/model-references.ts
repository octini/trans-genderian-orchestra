import type { AgentName } from './constants.js';

/**
 * Resolves model references in the model map.
 * A reference is a value that matches another agent name (case-insensitive)
 * AND does not contain a '/' (model IDs always have a provider prefix).
 * E.g., "ensemble: conductor" → resolves to conductor's model.
 * Max depth: 3 to prevent cycles.
 */
export function resolveModelReferences(
  modelMap: Partial<Record<AgentName, string>>,
  maxDepth = 3,
): Partial<Record<AgentName, string>> {
  const resolved = { ...modelMap };
  const agentNames = new Set(Object.keys(modelMap).map((k) => k.toLowerCase()));

  function isReference(value: string): boolean {
    // Model IDs always contain a '/' (e.g., 'openai/gpt-4.1')
    // Agent names never contain '/' (e.g., 'conductor')
    return agentNames.has(value.toLowerCase()) && !value.includes('/');
  }

  for (let depth = 0; depth < maxDepth; depth++) {
    let changed = false;
    for (const [agent, model] of Object.entries(resolved)) {
      if (
        model &&
        isReference(model) &&
        model.toLowerCase() !== agent.toLowerCase()
      ) {
        const referencedModel = resolved[model.toLowerCase() as AgentName];
        if (referencedModel && !isReference(referencedModel)) {
          resolved[agent as AgentName] = referencedModel;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  return resolved;
}
