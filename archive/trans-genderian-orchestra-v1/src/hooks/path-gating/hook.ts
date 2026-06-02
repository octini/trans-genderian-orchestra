import path from 'node:path';

import type { AgentGatingConfig } from '../../config/schema';
import { formatPathGatingDeniedMessage } from '../_messages';
import { parsePatch } from '../apply-patch/codec';
import type { ToolExecuteInput, ToolExecuteOutput } from '../types';

type ToolExecuteBeforeInput = ToolExecuteInput & {
  directory?: string;
};

type ToolExecuteBeforeOutput = ToolExecuteOutput;

const WRITE_TOOLS = new Set(['write', 'edit', 'apply_patch']);
const DENIED_AGENT_NAMES = new Set(['council', 'councillor']);

/**
 * Default Dispatcher write lanes:
 * - orchestrator: coordination metadata only (`state.md`, `handoff.md`, and
 *   `.opencode/plans/plan.md` status changes). It must delegate plans and code.
 * - researcher: scratch context only (`.opencode/notes.md` and
 *   `.opencode/scratchpad.md`) so discovery cannot mutate source files.
 * - planner: `.opencode/plans/` only; planners author specs, not code.
 * - builder: unrestricted writes because implementation is the builder lane.
 * - reviewer/council/councillor/unknown: no writes by default.
 *
 * `agentGating` config replaces a named agent's default allowlist, but council
 * and councillor remain denied regardless because they are read-only consensus
 * roles. Empty patterns are ignored so `""` cannot accidentally allow every
 * path; an explicit `*` remains the opt-in allow-all pattern.
 */

function resolveToolPath(filePath: string, root = process.cwd()): string {
  return path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(root, filePath);
}

function normalizePath(filePath: string, root?: string): string {
  return resolveToolPath(filePath, root).split(path.sep).join('/');
}

function normalizeRelativePath(filePath: string, root?: string): string {
  const base = path.resolve(root ?? process.cwd());
  return path
    .relative(base, resolveToolPath(filePath, base))
    .split(path.sep)
    .join('/');
}

function normalizePattern(pattern: string): string {
  return pattern.trim().replaceAll('\\', '/').toLowerCase();
}

function addStringPath(paths: Set<string>, value: unknown): void {
  if (typeof value !== 'string') return;
  const trimmed = value.trim();
  if (trimmed) paths.add(trimmed);
}

function extractPatchPaths(patchText: string): string[] {
  try {
    const patch = parsePatch(patchText);
    const paths = new Set<string>();

    for (const hunk of patch.hunks) {
      addStringPath(paths, hunk.path);
      if (hunk.type === 'update') {
        addStringPath(paths, hunk.move_path);
      }
    }

    return [...paths];
  } catch {
    // Malformed apply_patch input will be rejected by the apply-patch hook or
    // native tool. Path gating only gates concrete write targets it can see.
    return [];
  }
}

function extractFilePaths(args?: Record<string, unknown>): string[] {
  const paths = new Set<string>();

  addStringPath(paths, args?.filePath);
  addStringPath(paths, args?.path);
  addStringPath(paths, args?.file);

  if (typeof args?.patchText === 'string') {
    for (const filePath of extractPatchPaths(args.patchText)) {
      paths.add(filePath);
    }
  }

  return [...paths];
}

function pathMatchesSuffix(normalizedPath: string, suffix: string): boolean {
  const normalizedSuffix = normalizePattern(suffix);
  return (
    normalizedPath === normalizedSuffix ||
    normalizedPath.endsWith(`/${normalizedSuffix}`)
  );
}

function normalizedRelativePattern(pattern: string): string {
  return pattern.startsWith('./') ? pattern.slice(2) : pattern;
}

function isPathAllowed(
  agent: string,
  filePath: string,
  agentGating?: AgentGatingConfig,
  root?: string,
): boolean {
  const normalizedAgent = agent.toLowerCase();
  const normalizedPath = normalizePath(filePath, root);
  const normalizedGatingPath = normalizedPath.toLowerCase();
  const normalizedRelativePath = normalizeRelativePath(
    filePath,
    root,
  ).toLowerCase();

  if (DENIED_AGENT_NAMES.has(normalizedAgent)) {
    return false;
  }

  const gatingPatterns =
    agentGating?.[normalizedAgent as keyof AgentGatingConfig];
  if (gatingPatterns !== undefined) {
    return gatingPatterns.some((pattern) => {
      const normalized = normalizePattern(pattern);
      if (!normalized) return false;
      if (normalized.endsWith('*')) {
        const prefix = normalized.slice(0, -1);
        if (!prefix) return true;
        const relativePrefix = normalizedRelativePattern(prefix);
        return (
          normalizedGatingPath.startsWith(prefix) ||
          normalizedRelativePath.startsWith(relativePrefix)
        );
      }
      const relativePattern = normalizedRelativePattern(normalized);
      return (
        pathMatchesSuffix(normalizedGatingPath, normalized) ||
        normalizedRelativePath === relativePattern ||
        normalizedRelativePath.endsWith(`/${relativePattern}`)
      );
    });
  }

  switch (normalizedAgent) {
    case 'orchestrator':
      return (
        pathMatchesSuffix(normalizedGatingPath, 'state.md') ||
        pathMatchesSuffix(normalizedGatingPath, 'handoff.md') ||
        pathMatchesSuffix(normalizedGatingPath, '.opencode/plans/plan.md')
      );
    case 'researcher':
      return (
        pathMatchesSuffix(normalizedGatingPath, '.opencode/notes.md') ||
        pathMatchesSuffix(normalizedGatingPath, '.opencode/scratchpad.md')
      );
    case 'planner':
      return (
        normalizedGatingPath.includes('/.opencode/plans/') ||
        normalizedRelativePath.startsWith('.opencode/plans/')
      );
    case 'builder':
      return true;
    default:
      return false;
  }
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
      const filePaths = extractFilePaths(args);
      if (!args || filePaths.length === 0) return;

      const deniedPath = filePaths.find(
        (filePath) =>
          !isPathAllowed(agent, filePath, agentGating, input.directory),
      );
      if (!deniedPath) return;

      const message = formatPathGatingDeniedMessage(
        agent,
        input.tool,
        deniedPath,
      );
      output.is_denied = true;
      output.output = output.output ? `${output.output}\n${message}` : message;
    },
  };
}
