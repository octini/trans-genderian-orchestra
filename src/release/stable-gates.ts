export type StableReleaseGate =
  | 'bootstrap_dry_run_apply_backup_rollback_uninstall'
  | 'doctor_drift_and_v1_detection'
  | 'init_scaffolding'
  | 'default_preset_clean_config'
  | 'beta_migration_restore_v1'
  | 'orchestrator_builder_reviewer_flow'
  | 'parallel_integration_reviewer_flow'
  | 'delegation_envelopes'
  | 'beads_issue_approval'
  | 'secret_handling'
  | 'readme_and_migration_docs'
  | 'v1_tagged_or_archived';

export type StableReleaseGateInput = Partial<
  Record<StableReleaseGate, boolean>
>;

export interface StableReleaseGateResult {
  status: 'ready' | 'blocked';
  missing_gates: StableReleaseGate[];
  can_publish_latest: boolean;
}

export const STABLE_RELEASE_GATES: StableReleaseGate[] = [
  'bootstrap_dry_run_apply_backup_rollback_uninstall',
  'doctor_drift_and_v1_detection',
  'init_scaffolding',
  'default_preset_clean_config',
  'beta_migration_restore_v1',
  'orchestrator_builder_reviewer_flow',
  'parallel_integration_reviewer_flow',
  'delegation_envelopes',
  'beads_issue_approval',
  'secret_handling',
  'readme_and_migration_docs',
  'v1_tagged_or_archived',
];

export function evaluateStableReleaseGates(
  input: StableReleaseGateInput,
): StableReleaseGateResult {
  const missing_gates = STABLE_RELEASE_GATES.filter(
    (gate) => input[gate] !== true,
  );
  return {
    status: missing_gates.length === 0 ? 'ready' : 'blocked',
    missing_gates,
    can_publish_latest: missing_gates.length === 0,
  };
}
