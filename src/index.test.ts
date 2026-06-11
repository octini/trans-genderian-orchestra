/// <reference types="bun-types" />

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { TGO_ISSUES_URL } from './constants';
import * as pluginEntry from './index';

function isOpenCodeLoaderExport(value: unknown): boolean {
  if (typeof value === 'function') {
    return true;
  }

  return (
    value !== null &&
    typeof value === 'object' &&
    'server' in value &&
    typeof (value as { server?: unknown }).server === 'function'
  );
}

describe('plugin entrypoint exports', () => {
  test('only exposes OpenCode loader-compatible exports', () => {
    const invalidExports = Object.entries(pluginEntry)
      .filter(([, value]) => !isOpenCodeLoaderExport(value))
      .map(([name]) => name);

    expect(Object.keys(pluginEntry)).toContain('default');
    expect(invalidExports).toEqual([]);
  });
});

describe('plugin support URLs', () => {
  test('points user-facing TGO issue messages at the current repository', () => {
    expect(TGO_ISSUES_URL).toBe(
      'github.com/octini/trans-genderian-orchestra/issues',
    );
    expect(TGO_ISSUES_URL).not.toContain('anomalyco/trans-genderian-orchestra');
    expect(TGO_ISSUES_URL).not.toContain(
      'alvinunreal/trans-genderian-orchestra',
    );
  });

  test('root schema id points at the current repository', () => {
    const schema = JSON.parse(
      readFileSync('trans-genderian-orchestra.schema.json', 'utf8'),
    );

    expect(schema.$id).toContain('octini/trans-genderian-orchestra');
    expect(schema.$id).not.toContain('anomalyco/trans-genderian-orchestra');
    expect(schema.$id).not.toContain('alvinunreal/trans-genderian-orchestra');
  });
});
