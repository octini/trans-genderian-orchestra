import { describe, expect, test } from 'bun:test';
import {
  createEmptyCommandResult,
  markRestartRequired,
  pushWarning,
} from './result';

describe('deterministic command result contract', () => {
  test('creates all required top-level arrays and flags', () => {
    const result = createEmptyCommandResult('bootstrap', 'dry-run');

    expect(result.command).toBe('bootstrap');
    expect(result.mode).toBe('dry-run');
    expect(result.planned_actions).toEqual([]);
    expect(result.changes_applied).toEqual([]);
    expect(result.backups_created).toEqual([]);
    expect(result.manifest_updates).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.blocked_capabilities).toEqual([]);
    expect(result.degraded_capabilities).toEqual([]);
    expect(result.restart_required).toBe(false);
    expect(result.next_steps).toEqual([]);
  });

  test('warning helper appends stable warning entries', () => {
    const result = createEmptyCommandResult('doctor', 'read-only');

    pushWarning(result, {
      code: 'missing-bd',
      message: 'Beads CLI is not installed.',
      severity: 'warning',
    });

    expect(result.warnings).toEqual([
      {
        code: 'missing-bd',
        message: 'Beads CLI is not installed.',
        severity: 'warning',
      },
    ]);
  });

  test('restart helper records restart requirement once', () => {
    const result = createEmptyCommandResult('bootstrap', 'apply');

    markRestartRequired(result, 'OpenCode config changed.');
    markRestartRequired(result, 'OpenCode config changed.');

    expect(result.restart_required).toBe(true);
    expect(result.next_steps).toEqual([
      'Restart OpenCode: OpenCode config changed.',
    ]);
  });
});
