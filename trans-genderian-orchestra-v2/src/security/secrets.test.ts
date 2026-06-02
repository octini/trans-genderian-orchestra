import { describe, expect, test } from 'bun:test';
import { findSecretLikeValues, redactSecretLikeValues } from './secrets';

describe('secret scanner', () => {
  test('detects token-like values in config text', () => {
    const text =
      '{"headers":{"Authorization":"Bearer ghp_1234567890abcdef1234567890abcdef1234"}}';

    expect(findSecretLikeValues(text)).toEqual([
      {
        kind: 'github_token',
        match: 'ghp_1234567890abcdef1234567890abcdef1234',
      },
    ]);
  });

  test('does not flag environment variable references', () => {
    const text =
      '{"headers":{"Authorization":"Bearer {env:GITHUB_PERSONAL_ACCESS_TOKEN}"}}';

    expect(findSecretLikeValues(text)).toEqual([]);
  });

  test('redacts secret-like values', () => {
    const text = 'token=github_pat_abcdefghijklmnopqrstuvwxyz_1234567890';

    expect(redactSecretLikeValues(text)).toBe('token=[REDACTED:github_token]');
  });
});
