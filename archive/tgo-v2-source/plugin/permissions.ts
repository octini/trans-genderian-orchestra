import type { TgoAgentId } from './agent-ids';

export type PermissionAction = 'allow' | 'ask' | 'deny';
export type PermissionValue =
  | PermissionAction
  | Record<string, PermissionAction>;
export type PermissionProfile = Record<string, PermissionValue>;

const READ_ONLY_PERMISSIONS: PermissionProfile = {
  '*': 'deny',
  read: 'allow',
  glob: 'allow',
  grep: 'allow',
  list: 'allow',
  lsp: 'allow',
  edit: 'deny',
  write: 'deny',
  apply_patch: 'deny',
  bash: 'deny',
  task: 'deny',
};

const ORCHESTRATOR_PERMISSIONS: PermissionProfile = {
  ...READ_ONLY_PERMISSIONS,
  task: 'allow',
  todowrite: 'allow',
  question: 'allow',
};

const RESEARCHER_PERMISSIONS: PermissionProfile = {
  ...READ_ONLY_PERMISSIONS,
  bash: 'allow',
  webfetch: 'allow',
  websearch: 'allow',
  write: 'allow',
};

const BUILDER_PERMISSIONS: PermissionProfile = {
  '*': 'deny',
  read: 'allow',
  glob: 'allow',
  grep: 'allow',
  list: 'allow',
  lsp: 'allow',
  edit: 'allow',
  write: 'allow',
  apply_patch: 'allow',
  bash: 'allow',
  task: 'allow',
  question: 'allow',
  webfetch: 'allow',
  websearch: 'allow',
};

const REVIEWER_PERMISSIONS: PermissionProfile = {
  ...READ_ONLY_PERMISSIONS,
  external_directory: {
    '~/.config/opencode/**': 'allow',
  },
};

const COUNCILLOR_PERMISSIONS: PermissionProfile = {
  ...READ_ONLY_PERMISSIONS,
  question: 'deny',
};

const PROFILES: Record<TgoAgentId, PermissionProfile> = {
  'tgo-orchestrator': ORCHESTRATOR_PERMISSIONS,
  'tgo-researcher': RESEARCHER_PERMISSIONS,
  'tgo-builder': BUILDER_PERMISSIONS,
  'tgo-reviewer': REVIEWER_PERMISSIONS,
  'tgo-council': READ_ONLY_PERMISSIONS,
  'tgo-councillor': COUNCILLOR_PERMISSIONS,
};

export function getPermissionProfile(agentId: TgoAgentId): PermissionProfile {
  return { ...PROFILES[agentId] };
}
