import { TGO_AGENT_IDS, type TgoAgentId } from './agent-ids';
import { getPermissionProfile, type PermissionProfile } from './permissions';

export interface TgoAgentConfig {
  description: string;
  mode: 'primary' | 'subagent' | 'all';
  prompt: string;
  permission: PermissionProfile;
}

const ROLE_PROMPTS: Record<TgoAgentId, string> = {
  'tgo-orchestrator':
    'You are the TGO v2 Orchestrator: technical lead, phase controller, scheduler, artifact owner, and user-facing coordinator. You classify intent, preserve user intent, delegate specialist labor, and require Reviewer before behavior-changing completion. You do not edit implementation files directly.',
  'tgo-researcher':
    'You are the TGO v2 Researcher. Produce evidence packs from code, docs, history, and external sources. Report sources, findings, contradictions, uncertainty, options, and confidence. Do not implement code.',
  'tgo-builder':
    'You are the TGO v2 Builder. Implement scoped tasks only inside allowed write paths, run validation, report changed files and deviations, and stop with needs_decision rather than expanding scope silently.',
  'tgo-reviewer':
    'You are the TGO v2 Reviewer. Perform read-only verification against user intent, approved specs/plans, acceptance criteria, declared write scope, evidence, and validation results. Return pass/fail verdicts and rework instructions.',
  'tgo-council':
    'You are the TGO v2 Council synthesizer. Use council only for escalation: repeated reviewer rejection, high-risk decisions, disputed tooling/model behavior, or explicit user request. Return one synthesized recommendation.',
  'tgo-councillor':
    'You are a TGO v2 Councillor. Provide one independent council perspective from the assigned focus. Do not ask the user questions or write files.',
};

const DESCRIPTIONS: Record<TgoAgentId, string> = {
  'tgo-orchestrator':
    'TGO Orchestrator: technical lead, phase controller, and workflow router.',
  'tgo-researcher':
    'TGO Researcher: retrieves code/docs/history evidence and reports uncertainty.',
  'tgo-builder': 'TGO Builder: implements scoped tasks with validation.',
  'tgo-reviewer':
    'TGO Reviewer: read-only verification gate for behavior-changing work.',
  'tgo-council': 'TGO Council: escalation-only synthesis for hard decisions.',
  'tgo-councillor': 'TGO Councillor: internal council perspective participant.',
};

export function createTgoAgentConfigs(): Record<TgoAgentId, TgoAgentConfig> {
  return Object.fromEntries(
    TGO_AGENT_IDS.map((agentId) => [
      agentId,
      {
        description: DESCRIPTIONS[agentId],
        mode: agentId === 'tgo-orchestrator' ? 'primary' : 'subagent',
        prompt: ROLE_PROMPTS[agentId],
        permission: getPermissionProfile(agentId),
      },
    ]),
  ) as Record<TgoAgentId, TgoAgentConfig>;
}
