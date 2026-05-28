import path from 'node:path';
import type { AgentGatingConfig } from '../../config/schema';

type ToolExecuteBeforeInput = {
  tool: string;
  sessionID?: string;
  callID?: string;
};

type ToolExecuteBeforeOutput = {
  args?: Record<string, unknown>;
  output?: string;
  is_denied?: boolean;
};

const WRITE_TOOLS = new Set(['write', 'edit', 'apply_patch']);
const DENIED_AGENT_NAMES = new Set(['council', 'councillor']);

function normalizePath(filePath: string): string {
  return path.resolve(filePath).split(path.sep).join('/');
}

function normalizeRelativePath(filePath: string): string {
  return path
    .relative(process.cwd(), path.resolve(filePath))
    .split(path.sep)
    .join('/');
}

function normalizePattern(pattern: string): string {
  return pattern.replaceAll('\\', '/').toLowerCase();
}

function extractFilePath(args?: Record<string, unknown>): string | undefined {
  const candidate = args?.filePath ?? args?.path ?? args?.file;
  return typeof candidate === 'string' && candidate.trim()
    ? candidate
    : undefined;
}

function isPathAllowed(
  agent: string,
  filePath: string,
  agentGating?: AgentGatingConfig,
): boolean {
  const normalizedAgent = agent.toLowerCase();
  const normalizedPath = normalizePath(filePath);
  const normalizedGatingPath = normalizedPath.toLowerCase();
  const normalizedRelativePath = normalizeRelativePath(filePath).toLowerCase();

  if (DENIED_AGENT_NAMES.has(normalizedAgent)) {
    return false;
  }

  const gatingPatterns =
    agentGating?.[normalizedAgent as keyof AgentGatingConfig];
  if (gatingPatterns) {
    return gatingPatterns.some((pattern) => {
      const normalized = normalizePattern(pattern);
      if (normalized.endsWith('*')) {
        const prefix = normalized.slice(0, -1);
        const relativePrefix = prefix.startsWith('./')
          ? prefix.slice(2)
          : prefix;
        return (
          normalizedGatingPath.startsWith(prefix) ||
          normalizedRelativePath.startsWith(relativePrefix)
        );
      }
      return normalizedGatingPath.endsWith(normalized);
    });
  }

  switch (normalizedAgent) {
    case 'orchestrator':
      return (
        normalizedPath.endsWith('state.md') ||
        normalizedPath.endsWith('handoff.md')
      );
    case 'researcher':
      return (
        normalizedPath.includes('.opencode/notes.md') ||
        normalizedPath.includes('.opencode/scratchpad.md')
      );
    case 'planner':
      return normalizedPath.includes('.opencode/plans/');
    case 'builder':
      return true;
    default:
      return false;
  }
}

function denialMessage(agent: string, tool: string, filePath: string): string {
  return [
    `[PATH GATING DENIED] ${agent} is not allowed to use ${tool}`,
    `on ${filePath}.`,
    'This write/edit was blocked by the Dispatcher path-gating pre-tool hook.',
  ].join(' ');
}

export function createPathGatingHook(
  sessionAgentMap: Map<string, string>,
  agentGating?: AgentGatingConfig,
): {
  'tool.execute.before': (
    input: ToolExecuteBeforeInput,
    output: ToolExecuteBeforeOutput,
  ) => Promise<void>;
} {
  return {
    'tool.execute.before': async (
      input: ToolExecuteBeforeInput,
      output: ToolExecuteBeforeOutput,
    ): Promise<void> => {
      const tool = input.tool.toLowerCase();
      if (!WRITE_TOOLS.has(tool)) return;
      if (!input.sessionID) return;

      const agent = sessionAgentMap.get(input.sessionID);
      if (!agent) return;

      const args = output.args;
      const filePath = extractFilePath(args);
      if (!args || !filePath) return;

      if (isPathAllowed(agent, filePath, agentGating)) return;

      const message = denialMessage(agent, input.tool, filePath);
      output.is_denied = true;
      output.output = output.output ? `${output.output}\n${message}` : message;
    },
  };
}
