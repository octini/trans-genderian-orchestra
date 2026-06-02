import { createManagedEntriesForToolPreset } from '../tools/managed';
import type { ToolPresetName } from '../tools/presets';

export interface ManagedEntries {
  plugins: string[];
  defaultAgent: string;
  agents: Record<string, unknown>;
  mcps: Record<string, unknown>;
}

export function planDefaultManagedEntries(
  tools: ToolPresetName = 'default',
): ManagedEntries {
  return createManagedEntriesForToolPreset(tools);
}
