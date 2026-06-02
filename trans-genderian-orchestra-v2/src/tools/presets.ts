import type { TgoAgentId } from '../plugin/agent-ids';

export type ToolPresetName = 'bare-bones' | 'default' | 'all-bells';

export interface PeerPluginPlan {
  id: string;
  package: string;
  version: string;
  required: boolean;
}

export interface SkillPlan {
  id: string;
  source: 'bundled' | 'curated-matt-pocock' | 'context7';
  enabled_by_default: boolean;
}

export interface McpPlan {
  id: string;
  type: 'remote' | 'local';
  config: Record<string, unknown>;
  allowed_agents: TgoAgentId[];
  auth: 'none' | 'env' | 'oauth';
  optional: boolean;
}

export interface RequiredCliToolPlan {
  name: 'git' | 'bd' | 'ctx7' | 'gh' | 'uvx';
  capability: string;
  missing_status: 'blocked' | 'degraded';
  repair_command: string;
}

export interface ToolPresetPlan {
  name: ToolPresetName;
  peer_plugins: PeerPluginPlan[];
  skills: SkillPlan[];
  mcps: McpPlan[];
  required_cli_tools: RequiredCliToolPlan[];
}

const CORE_PLUGINS: PeerPluginPlan[] = [
  {
    id: 'trans-genderian-orchestra',
    package: 'trans-genderian-orchestra',
    version: '2.0.0-beta.0',
    required: true,
  },
  {
    id: 'opencode-beads',
    package: 'opencode-beads',
    version: '0.7.0',
    required: true,
  },
];

const DEFAULT_SKILLS: SkillPlan[] = [
  {
    id: 'setup-matt-pocock-skills',
    source: 'curated-matt-pocock',
    enabled_by_default: true,
  },
  {
    id: 'grill-with-docs',
    source: 'curated-matt-pocock',
    enabled_by_default: true,
  },
  { id: 'diagnose', source: 'curated-matt-pocock', enabled_by_default: true },
  { id: 'tdd', source: 'curated-matt-pocock', enabled_by_default: true },
  { id: 'to-prd', source: 'curated-matt-pocock', enabled_by_default: true },
  { id: 'to-issues', source: 'curated-matt-pocock', enabled_by_default: true },
  { id: 'triage', source: 'curated-matt-pocock', enabled_by_default: true },
  {
    id: 'improve-codebase-architecture',
    source: 'curated-matt-pocock',
    enabled_by_default: true,
  },
  { id: 'zoom-out', source: 'curated-matt-pocock', enabled_by_default: true },
  { id: 'handoff', source: 'curated-matt-pocock', enabled_by_default: true },
];

const CONTEXT7_SKILL: SkillPlan = {
  id: 'context7-mcp',
  source: 'context7',
  enabled_by_default: true,
};

const DEFAULT_CLIS: RequiredCliToolPlan[] = [
  {
    name: 'git',
    capability: 'git',
    missing_status: 'blocked',
    repair_command: 'Install git from https://git-scm.com/downloads',
  },
  {
    name: 'bd',
    capability: 'beads',
    missing_status: 'blocked',
    repair_command: 'brew install beads or npm install -g @beads/bd',
  },
  {
    name: 'ctx7',
    capability: 'context7-cli',
    missing_status: 'degraded',
    repair_command: 'npx ctx7 setup --opencode',
  },
];

function defaultMcps(): McpPlan[] {
  return [
    {
      id: 'tgo-websearch',
      type: 'remote',
      config: {
        type: 'remote',
        url: 'https://mcp.exa.ai/mcp',
        enabled: true,
        headers: { Authorization: 'Bearer {env:EXA_API_KEY}' },
      },
      allowed_agents: ['tgo-researcher'],
      auth: 'env',
      optional: false,
    },
    {
      id: 'tgo-grep-app',
      type: 'remote',
      config: { type: 'remote', url: 'https://mcp.grep.app', enabled: true },
      allowed_agents: ['tgo-researcher'],
      auth: 'none',
      optional: false,
    },
  ];
}

function allBellsMcps(): McpPlan[] {
  return [
    ...defaultMcps(),
    {
      id: 'tgo-github',
      type: 'remote',
      config: {
        type: 'remote',
        url: 'https://api.githubcopilot.com/mcp/',
        enabled: true,
        headers: { Authorization: 'Bearer {env:GITHUB_PERSONAL_ACCESS_TOKEN}' },
      },
      allowed_agents: ['tgo-researcher', 'tgo-reviewer'],
      auth: 'env',
      optional: true,
    },
    {
      id: 'tgo-serena',
      type: 'local',
      config: { type: 'local', command: 'uvx', args: ['serena-mcp-server'] },
      allowed_agents: ['tgo-researcher'],
      auth: 'oauth',
      optional: true,
    },
  ];
}

export function createToolPresetPlan(name: ToolPresetName): ToolPresetPlan {
  if (name === 'bare-bones') {
    return {
      name,
      peer_plugins: CORE_PLUGINS,
      skills: DEFAULT_SKILLS,
      mcps: [],
      required_cli_tools: DEFAULT_CLIS.filter((tool) => tool.name !== 'ctx7'),
    };
  }

  const defaultPlan: ToolPresetPlan = {
    name,
    peer_plugins: [
      ...CORE_PLUGINS,
      {
        id: 'aft',
        package: 'aft',
        version: '0.0.0-pinned-after-verification',
        required: false,
      },
    ],
    skills: [...DEFAULT_SKILLS, CONTEXT7_SKILL],
    mcps: name === 'all-bells' ? allBellsMcps() : defaultMcps(),
    required_cli_tools:
      name === 'all-bells'
        ? [
            ...DEFAULT_CLIS,
            {
              name: 'gh',
              capability: 'github-cli',
              missing_status: 'degraded',
              repair_command: 'Install gh from https://cli.github.com/',
            },
            {
              name: 'uvx',
              capability: 'serena',
              missing_status: 'degraded',
              repair_command: 'Install uvx from https://docs.astral.sh/uv/',
            },
          ]
        : DEFAULT_CLIS,
  };

  return defaultPlan;
}
