import { log } from '../../utils/logger';
import type { ToolExecuteInput, ToolExecuteOutput } from '../types';

const READ_TOOLS = new Set([
  'read',
  'glob',
  'grep',
  'list',
  'codesearch',
  'ast_grep_search',
  'lsp_diagnostics',
  'lsp',
  'webfetch',
]);

const WARNING_THRESHOLD = 3;
const DENY_THRESHOLD = 5;

interface ReadBudgetOptions {
  shouldCheck?: (sessionID: string) => boolean;
}

export function createReadBudgetHook(options: ReadBudgetOptions = {}) {
  // Track consecutive read counts per session
  const readCounts = new Map<string, number>();

  return {
    'tool.execute.before': async (
      input: ToolExecuteInput,
      output: ToolExecuteOutput,
    ): Promise<void> => {
      const { tool, sessionID } = input;
      if (!sessionID) return;
      const normalizedTool = tool.toLowerCase();

      if (options.shouldCheck && !options.shouldCheck(sessionID)) return;

      // Reset count on delegation
      if (normalizedTool === 'task') {
        const priorCount = readCounts.get(sessionID);
        if (priorCount !== undefined && priorCount > 0) {
          log(
            `[metrics] session ${sessionID} orchestrator reads before delegation: ${priorCount}`,
          );
        }
        readCounts.delete(sessionID);
        return;
      }

      // Only track reading/exploring tools
      if (!READ_TOOLS.has(normalizedTool)) return;

      const count = (readCounts.get(sessionID) ?? 0) + 1;
      readCounts.set(sessionID, count);

      if (count >= DENY_THRESHOLD) {
        log(
          `[read-budget] orchestrator exceeded read budget for session ${sessionID}: ${count} consecutive reads without delegation`,
        );
        output.is_denied = true;
        output.output = `[SYSTEM: Orchestrator read budget exceeded. You have made ${count} read/research calls without delegating. As a pure dispatcher, you must delegate investigation to @researcher. Please route this task to the appropriate specialist.]`;
        return;
      }

      if (count >= WARNING_THRESHOLD) {
        log(
          `[read-budget] orchestrator approaching read budget limit for session ${sessionID}: ${count} consecutive reads`,
        );
        return;
      }
    },
  };
}
