export interface ToolExecuteInput {
  tool: string;
  sessionID?: string;
  callID?: string;
}

export interface ToolExecuteOutput {
  args?: Record<string, unknown>;
  output?: unknown;
  is_denied?: boolean;
}

export interface CommandExecuteInput {
  command: string;
  sessionID: string;
  arguments: string;
}

export interface CommandExecuteOutput {
  parts: Array<{ type: string; text?: string }>;
}
