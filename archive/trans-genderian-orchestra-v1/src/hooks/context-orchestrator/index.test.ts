import { describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createContextOrchestratorHook } from './index';

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'dispatcher-context-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('context orchestrator hook', () => {
  test('uses subtask_summary what_changed and files_touched for task log entries', async () => {
    await withTempDir(async (dir) => {
      const sessionAgentMap = new Map([['parent-1', 'orchestrator']]);
      const hook = createContextOrchestratorHook(dir, sessionAgentMap);
      const detailedOutput = 'Below are the detailed findings. '.repeat(20);

      await hook['tool.execute.after'](
        { tool: 'task', sessionID: 'parent-1', callID: 'call-1' },
        {
          output: [
            detailedOutput,
            '<subtask_summary>',
            JSON.stringify({
              what_changed:
                'Implemented state log summaries from structured subtask output.',
              files_touched: [
                'src/hooks/context-orchestrator/hook.ts',
                'src/hooks/context-orchestrator/index.test.ts',
              ],
            }),
            '</subtask_summary>',
          ].join('\n'),
        },
      );

      const state = await readFile(
        path.join(dir, '.opencode', 'state.md'),
        'utf8',
      );

      expect(state).toContain(
        '- **Summary:** Implemented state log summaries from structured subtask output.',
      );
      expect(state).toContain('    - `src/hooks/context-orchestrator/hook.ts`');
      expect(state).toContain(
        '    - `src/hooks/context-orchestrator/index.test.ts`',
      );
      expect(state).not.toContain('Below are the detailed findings.');
    });
  });

  test('falls back to first 200 output characters without subtask_summary', async () => {
    await withTempDir(async (dir) => {
      const sessionAgentMap = new Map([['parent-1', 'orchestrator']]);
      const hook = createContextOrchestratorHook(dir, sessionAgentMap);
      const rawOutput = `summary:${'x'.repeat(250)}`;

      await hook['tool.execute.after'](
        { tool: 'task', sessionID: 'parent-1', callID: 'call-1' },
        { output: rawOutput },
      );

      const state = await readFile(
        path.join(dir, '.opencode', 'state.md'),
        'utf8',
      );

      expect(state).toContain(`- **Summary:** ${rawOutput.slice(0, 200)}`);
      expect(state).toContain('    - None');
    });
  });
});
