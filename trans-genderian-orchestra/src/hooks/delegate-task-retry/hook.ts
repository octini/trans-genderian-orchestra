import type { PluginInput } from '@opencode-ai/plugin';
import type { ToolExecuteInput, ToolExecuteOutput } from '../types';
import { buildRetryGuidance } from './guidance';
import { detectDelegateTaskError } from './patterns';

export function createDelegateTaskRetryHook(_ctx: PluginInput) {
  return {
    'tool.execute.after': async (
      input: ToolExecuteInput,
      output: ToolExecuteOutput,
    ): Promise<void> => {
      const toolName = input.tool.toLowerCase();
      const isDelegateTool = toolName === 'task';
      if (!isDelegateTool) return;

      if (typeof output.output !== 'string') return;

      const detected = detectDelegateTaskError(output.output);
      if (!detected) return;

      output.output += `\n${buildRetryGuidance(detected)}`;
    },
  };
}
