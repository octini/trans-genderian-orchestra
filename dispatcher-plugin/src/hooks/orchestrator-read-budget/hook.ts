import { log } from '../../utils/logger';

const READ_TOOLS = new Set([
  'read',
  'Read',
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
      input: { tool: string; sessionID?: string; callID?: string },
      output: {
        args?: Record<string, unknown>;
        output?: unknown;
        is_denied?: boolean;
      },
    ): Promise<void> => {
      const { tool, sessionID } = input;
      if (!sessionID) return;

      if (options.shouldCheck && !options.shouldCheck(sessionID)) return;

      // Reset count on delegation
      if (tool.toLowerCase() === 'task') {
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
      if (!READ_TOOLS.has(tool)) return;

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
        // Inject a warning into the output
        const warning = `\n\n[SYSTEM: You have made ${count} consecutive read/research calls. As a pure dispatcher, you should delegate investigation to @researcher rather than investigating yourself. Consider delegating now.]\n`;
        // Check if output is a string we can append to
        if (typeof output.output === 'string') {
          output.output += warning;
        } else if (output.output == null) {
          output.output = warning;
        }
        return;
      }
    },
  };
}
