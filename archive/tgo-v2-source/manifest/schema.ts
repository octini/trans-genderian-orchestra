export type ToolPreset = 'bare-bones' | 'default' | 'all-bells';
export type ModelPreset = 'balanced' | string;
export type ResiliencePreset = 'conservative' | 'balanced' | 'aggressive';

export interface ManagedConfigEntry {
  kind:
    | 'agent'
    | 'mcp'
    | 'plugin'
    | 'command'
    | 'default_agent'
    | 'model_preset';
  key: string;
}

export interface ToolStatus {
  name: string;
  status: 'user-managed' | 'tgo-installed' | 'missing' | 'degraded';
  version?: string;
}

export interface BackupManifestRecord {
  operation_id: string;
  created_at: string;
  path: string;
  source_path: string;
}

export interface TgoManifest {
  schema_version: 1;
  package: {
    name: 'trans-genderian-orchestra';
    version: string;
  };
  active_presets: {
    tools: ToolPreset;
    models: ModelPreset;
    resilience: ResiliencePreset;
  };
  managed_config: ManagedConfigEntry[];
  tools: ToolStatus[];
  backups: BackupManifestRecord[];
  ignored_warnings: Array<{
    code: string;
    scope: 'global' | 'project';
    reason: string;
    expires_at?: string;
  }>;
  last_verification?: {
    checked_at: string;
    status: 'clean' | 'warnings' | 'blocked';
  };
}

export function createDefaultManifest(): TgoManifest {
  return {
    schema_version: 1,
    package: {
      name: 'trans-genderian-orchestra',
      version: '2.0.0-beta.0',
    },
    active_presets: {
      tools: 'default',
      models: 'balanced',
      resilience: 'balanced',
    },
    managed_config: [],
    tools: [],
    backups: [],
    ignored_warnings: [],
  };
}
