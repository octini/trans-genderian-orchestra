import { describe, expect, test } from 'bun:test';
import { parseCliArgs } from './args';

describe('CLI argument parser', () => {
  test('parses default bootstrap dry-run', () => {
    expect(parseCliArgs(['bootstrap', '--dry-run', '--json'])).toEqual({
      command: 'bootstrap',
      dryRun: true,
      yes: false,
      json: true,
      tools: 'default',
      models: 'balanced',
      resilience: 'balanced',
    });
  });

  test('parses bootstrap apply presets', () => {
    expect(
      parseCliArgs([
        'bootstrap',
        '--yes',
        '--tools',
        'all-bells',
        '--models',
        'balanced',
        '--resilience',
        'conservative',
      ]),
    ).toEqual({
      command: 'bootstrap',
      dryRun: false,
      yes: true,
      json: false,
      tools: 'all-bells',
      models: 'balanced',
      resilience: 'conservative',
    });
  });

  test('parses doctor json', () => {
    expect(parseCliArgs(['doctor', '--json'])).toEqual({
      command: 'doctor',
      json: true,
    });
  });
});
