import { createTgoAgentConfigs } from '../plugin/agents';

export interface ManagedEntries {
  plugins: string[];
  defaultAgent: string;
  agents: Record<string, unknown>;
  mcps: Record<string, unknown>;
}

export function planDefaultManagedEntries(): ManagedEntries {
  return {
    plugins: [
      'trans-genderian-orchestra@2.0.0-beta.0',
      'opencode-beads@0.7.0',
      'aft@0.0.0-pinned-after-verification',
    ],
    defaultAgent: 'tgo-orchestrator',
    agents: createTgoAgentConfigs(),
    mcps: {
      'tgo-websearch': {
        type: 'remote',
        url: 'https://mcp.exa.ai/mcp',
        enabled: true,
        headers: {
          Authorization: 'Bearer {env:EXA_API_KEY}',
        },
      },
      'tgo-grep-app': {
        type: 'remote',
        url: 'https://mcp.grep.app',
        enabled: true,
      },
    },
  };
}
