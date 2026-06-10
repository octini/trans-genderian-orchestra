export const TGO_AGENT_IDS = [
  'tgo-orchestrator',
  'tgo-researcher',
  'tgo-builder',
  'tgo-reviewer',
  'tgo-council',
  'tgo-councillor',
] as const;

export type TgoAgentId = (typeof TGO_AGENT_IDS)[number];
