export type CommandName =
  | 'bootstrap'
  | 'doctor'
  | 'setup'
  | 'uninstall'
  | 'init';

export type CommandMode = 'dry-run' | 'apply' | 'read-only' | 'repair';

export type Severity = 'info' | 'warning' | 'error';

export interface CommandNotice {
  code: string;
  message: string;
  severity: Severity;
}

export interface PlannedAction {
  id: string;
  title: string;
  target: string;
  action: 'create' | 'update' | 'remove' | 'check' | 'install' | 'adopt';
  requires_confirmation: boolean;
}

export interface AppliedChange {
  id: string;
  title: string;
  target: string;
}

export interface BackupRecord {
  id: string;
  path: string;
  source_path: string;
}

export interface ManifestUpdate {
  path: string;
  key: string;
  value_summary: string;
}

export interface CapabilityStatus {
  capability: string;
  reason: string;
  repair_command?: string;
}

export interface DeterministicCommandResult {
  command: CommandName;
  mode: CommandMode;
  planned_actions: PlannedAction[];
  changes_applied: AppliedChange[];
  backups_created: BackupRecord[];
  manifest_updates: ManifestUpdate[];
  warnings: CommandNotice[];
  blocked_capabilities: CapabilityStatus[];
  degraded_capabilities: CapabilityStatus[];
  restart_required: boolean;
  next_steps: string[];
}

export function createEmptyCommandResult(
  command: CommandName,
  mode: CommandMode,
): DeterministicCommandResult {
  return {
    command,
    mode,
    planned_actions: [],
    changes_applied: [],
    backups_created: [],
    manifest_updates: [],
    warnings: [],
    blocked_capabilities: [],
    degraded_capabilities: [],
    restart_required: false,
    next_steps: [],
  };
}

export function pushWarning(
  result: DeterministicCommandResult,
  warning: CommandNotice,
): void {
  result.warnings.push(warning);
}

export function markRestartRequired(
  result: DeterministicCommandResult,
  reason: string,
): void {
  result.restart_required = true;
  const step = `Restart OpenCode: ${reason}`;
  if (!result.next_steps.includes(step)) {
    result.next_steps.push(step);
  }
}
