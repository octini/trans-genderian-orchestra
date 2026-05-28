import type { AgentOverrideConfig } from './schema';

// Agent names
export const AGENT_ALIASES: Record<string, string> = {
  build: 'builder',
  plan: 'planner',
  research: 'researcher',
  review: 'reviewer',
};

export const SUBAGENT_NAMES = [
  'planner',
  'researcher',
  'builder',
  'reviewer',
  'council',
  'councillor',
] as const;

export const ORCHESTRATOR_NAME = 'orchestrator' as const;

export const ALL_AGENT_NAMES = [ORCHESTRATOR_NAME, ...SUBAGENT_NAMES] as const;

// Agent name type (for use in DEFAULT_MODELS)
export type AgentName = (typeof ALL_AGENT_NAMES)[number];

// Subagent delegation rules: which agents can spawn which subagents
// orchestrator: can spawn all orchestratable agents (full delegation)
// planner/researcher/builder/reviewer/council: leaf nodes
// Which agents each agent type can spawn via delegation.
// councillor is internal — only CouncilManager spawns it, and createAgents()
// only registers it when the opt-in council configuration is present.
export const ORCHESTRATABLE_AGENTS = [
  'planner',
  'researcher',
  'builder',
  'reviewer',
  'council',
] as const;

/** Agents that cannot be disabled even if listed in disabled_agents config. */
export const PROTECTED_AGENTS = new Set(['orchestrator', 'councillor']);

/**
 * Get the list of orchestratable agents, excluding any disabled agents.
 * This is used for delegation validation at runtime.
 */
export function getOrchestratableAgents(
  disabledAgents?: Set<string>,
): string[] {
  return ORCHESTRATABLE_AGENTS.filter((name) => !disabledAgents?.has(name));
}

export const SUBAGENT_DELEGATION_RULES: Record<AgentName, readonly string[]> = {
  orchestrator: ORCHESTRATABLE_AGENTS,
  planner: [],
  researcher: [],
  builder: [],
  reviewer: [],
  council: [],
  councillor: [],
};

// Default models for each agent
// orchestrator is undefined so its model is fully resolved at runtime via priority fallback
export const DEFAULT_MODELS: Record<AgentName, string | undefined> = {
  orchestrator: undefined,
  planner: undefined,
  researcher: undefined,
  builder: undefined,
  reviewer: undefined,
  council: undefined,
  councillor: undefined,
};

// User-preferred default model chains. These are applied before any
// user-provided overrides so local config still wins.
export const DEFAULT_AGENT_OVERRIDES: Partial<
  Record<AgentName, AgentOverrideConfig>
> = {
  orchestrator: {
    model: [
      { id: 'opencode-go/kimi-k2.6' },
      { id: 'google/antigravity-claude-opus-4-6-thinking', variant: 'max' },
      { id: 'nvidia/z-ai/glm-5.1' },
    ],
  },
  planner: {
    model: [
      { id: 'github-copilot/gpt-5.5', variant: 'xhigh' },
      { id: 'github-copilot/claude-opus-4.7', variant: 'max' },
      { id: 'nvidia/z-ai/glm-5.1' },
    ],
  },
  researcher: {
    model: [
      { id: 'github-copilot/gemini-3.5-flash', variant: 'high' },
      { id: 'github-copilot/gpt-5.5', variant: 'xhigh' },
      { id: 'github-copilot/claude-opus-4.7', variant: 'max' },
    ],
  },
  reviewer: {
    model: [
      { id: 'github-copilot/claude-opus-4.7', variant: 'max' },
      { id: 'github-copilot/gpt-5.5', variant: 'xhigh' },
      { id: 'nvidia/z-ai/glm-5.1' },
    ],
  },
  council: {
    model: [{ id: 'opencode-go/kimi-k2.6' }],
  },
  councillor: {
    model: [
      { id: 'github-copilot/gpt-5.5', variant: 'xhigh' },
      { id: 'github-copilot/claude-opus-4.7', variant: 'max' },
      { id: 'github-copilot/gemini-3.5-flash', variant: 'high' },
    ],
  },
};

// Polling configuration
export const POLL_INTERVAL_MS = 500;
export const POLL_INTERVAL_SLOW_MS = 1000;
export const POLL_INTERVAL_BACKGROUND_MS = 2000;

// Timeouts
export const DEFAULT_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
export const MAX_POLL_TIME_MS = 5 * 60 * 1000; // 5 minutes
export const FALLBACK_FAILOVER_TIMEOUT_MS = 15_000;

// Subagent depth limits
export const DEFAULT_MAX_SUBAGENT_DEPTH = 3;

// Workflow reminders
export const PHASE_REMINDER_TEXT = `!IMPORTANT! Scheduler workflow: plan lanes/dependencies → dispatch background specialists → track task IDs → wait for hook-driven completion or use task_status only when needed → reconcile terminal results → verify. Do not consume running-job output or advance dependent work. !END!`;

export const WRITABLE_FILE_OPERATIONS_RULES = `**File Operations Rules**:
- Prefer dedicated file tools for normal code work: glob/grep/ast_grep_search for discovery, read for file contents, and edit/write/apply_patch for targeted source changes.
- Use bash for execution and automation: git, package managers, tests, builds, scripts, diagnostics, and shell-native filesystem operations.
- Shell is acceptable for bulk or mechanical filesystem changes when it is clearer or safer than many individual edits (for example: truncate generated logs, remove build artifacts, batch rename/move files), especially when the user explicitly asks for that shell operation.
- Before destructive or broad shell operations, verify the target set and quote paths. Prefer a dry-run/listing first when practical.
- Do not use cat/head/tail/sed/awk only to read code into context; use read/grep unless a shell pipeline is genuinely the better diagnostic.`;

export const READONLY_FILE_OPERATIONS_RULES = `**File Operations Rules**:
- READ-ONLY: inspect and report; do not modify files.
- Prefer dedicated file tools for codebase inspection: glob/grep/ast_grep_search for discovery and read for file contents.
- Bash is allowed for non-mutating diagnostics and shell-native inspection when it is the clearest tool, but not for modifying files.
- Do not use cat/head/tail/sed/awk only to read code into context; use read/grep unless a shell pipeline is genuinely the better diagnostic.`;

export const NO_SHELL_READONLY_FILE_OPERATIONS_RULES = `**File Operations Rules**:
- READ-ONLY: inspect and report; do not modify files.
- Use glob/grep/ast_grep_search for discovery and read for file contents.
- Do not use bash or shell commands.`;

// Tmux pane spawn delay (ms) — gives TmuxSessionManager time to create pane
export const TMUX_SPAWN_DELAY_MS = 500;

// Stagger delay (ms) between parallel councillor launches to avoid tmux collisions
export const COUNCILLOR_STAGGER_MS = 250;

// Polling stability
export const STABLE_POLLS_THRESHOLD = 3;

/**
 * Agents that are disabled by default independent of config. Council and its
 * internal councillor are conditionally gated by getDisabledAgents(): they are
 * unavailable until the opt-in council config exists.
 */
export const DEFAULT_DISABLED_AGENTS: string[] = [];
