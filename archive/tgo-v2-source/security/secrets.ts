export interface SecretMatch {
  kind: 'github_token' | 'generic_assignment';
  match: string;
}

const secretPatterns: Array<{ kind: SecretMatch['kind']; pattern: RegExp }> = [
  { kind: 'github_token', pattern: /ghp_[A-Za-z0-9_]{30,}/g },
  { kind: 'github_token', pattern: /github_pat_[A-Za-z0-9_]{30,}/g },
  {
    kind: 'generic_assignment',
    pattern:
      /(?:api[_-]?key|secret|token|password)\s*=\s*['"]?[A-Za-z0-9_./+=-]{24,}/gi,
  },
];

export function findSecretLikeValues(text: string): SecretMatch[] {
  const matches: SecretMatch[] = [];

  for (const { kind, pattern } of secretPatterns) {
    for (const match of text.matchAll(pattern)) {
      const value = match[0];
      if (value.includes('{env:')) {
        continue;
      }
      matches.push({ kind, match: value });
    }
  }

  return matches;
}

export function redactSecretLikeValues(text: string): string {
  let redacted = text;
  for (const secret of findSecretLikeValues(text)) {
    redacted = redacted.replaceAll(secret.match, `[REDACTED:${secret.kind}]`);
  }
  return redacted;
}
