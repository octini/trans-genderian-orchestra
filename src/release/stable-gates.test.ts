import { describe, expect, test } from 'bun:test';
import { evaluateStableReleaseGates } from './stable-gates';

describe('stable release gates', () => {
  test('blocks latest when any stable gate is missing', () => {
    const result = evaluateStableReleaseGates({
      bootstrap_dry_run_apply_backup_rollback_uninstall: true,
      doctor_drift_and_v1_detection: true,
      init_scaffolding: false,
      default_preset_clean_config: true,
      beta_migration_restore_v1: true,
      orchestrator_builder_reviewer_flow: false,
      parallel_integration_reviewer_flow: true,
      delegation_envelopes: true,
      beads_issue_approval: true,
      secret_handling: true,
      readme_and_migration_docs: true,
      v1_tagged_or_archived: false,
    });

    expect(result.status).toBe('blocked');
    expect(result.missing_gates).toEqual([
      'init_scaffolding',
      'orchestrator_builder_reviewer_flow',
      'v1_tagged_or_archived',
    ]);
    expect(result.can_publish_latest).toBe(false);
  });

  test('allows latest only when every gate passes', () => {
    const passed = Object.fromEntries(
      [
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
      ].map((gate) => [gate, true]),
    );

    const result = evaluateStableReleaseGates(passed);

    expect(result.status).toBe('ready');
    expect(result.missing_gates).toEqual([]);
    expect(result.can_publish_latest).toBe(true);
  });
});
