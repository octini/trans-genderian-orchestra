/// <reference types="bun-types" />

import { describe, expect, test } from 'bun:test';
import { TGO_ISSUES_URL } from './index';

describe('plugin support URLs', () => {
  test('points user-facing TGO issue messages at the current repository', () => {
    expect(TGO_ISSUES_URL).toBe(
      'github.com/octini/trans-genderian-orchestra/issues',
    );
    expect(TGO_ISSUES_URL).not.toContain('anomalyco/trans-genderian-orchestra');
  });
});
