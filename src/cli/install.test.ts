/// <reference types="bun-types" />

import { describe, expect, test } from 'bun:test';
import { DOCS_URL, GITHUB_REPO, GITHUB_URL } from './install';

describe('install GitHub references', () => {
  test('points users at the current repository and docs hub', () => {
    expect(GITHUB_REPO).toBe('octini/trans-genderian-orchestra');
    expect(GITHUB_URL).toBe(
      'https://github.com/octini/trans-genderian-orchestra',
    );
    expect(DOCS_URL).toBe(
      'https://github.com/octini/trans-genderian-orchestra/blob/master/docs/README.md',
    );
    expect(`${GITHUB_REPO} ${GITHUB_URL} ${DOCS_URL}`).not.toContain(
      'alvinunreal/trans-genderian-orchestra',
    );
  });
});
