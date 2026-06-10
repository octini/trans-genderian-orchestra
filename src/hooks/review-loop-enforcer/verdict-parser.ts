import type {
  ParsedEnsembleVerdict,
  ParsedPrincipalMetadata,
} from './types.js';

export function parseEnsembleVerdict(text: string): ParsedEnsembleVerdict {
  const json = extractFirstJsonObject(text);
  if (!json) return { valid: false, reason: 'No JSON object found' };

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { valid: false, reason: 'Malformed JSON' };
  }

  if (!isRecord(data))
    return { valid: false, reason: 'Verdict JSON is not an object' };
  if (
    typeof data.reviewedTaskId !== 'string' ||
    data.reviewedTaskId.trim() === ''
  ) {
    return { valid: false, reason: 'Missing reviewedTaskId' };
  }
  if (data.verdict !== 'approve' && data.verdict !== 'reject') {
    return { valid: false, reason: 'Invalid verdict' };
  }

  const issues = Array.isArray(data.issues) ? data.issues : [];
  const criticalIssues = Array.isArray(data.criticalIssues)
    ? data.criticalIssues
    : [];
  const criticalIssueCount =
    criticalIssues.length +
    issues.filter((issue) => issueHasCriticalSeverity(issue)).length;
  const verdict = criticalIssueCount > 0 ? 'reject' : data.verdict;

  return {
    valid: true,
    reviewedTaskId: data.reviewedTaskId.trim(),
    verdict,
    requiredNextAction: verdict === 'approve' ? 'principal' : 'composer',
    criticalIssueCount,
    issues,
  };
}

export function parsePrincipalReviewMetadata(
  text: string,
): ParsedPrincipalMetadata {
  const verdictMatch = /<verdict>\s*(pass|fail)\s*<\/verdict>/i.exec(text);
  const metadataMatch =
    /<review_metadata>\s*([\s\S]*?)\s*<\/review_metadata>/i.exec(text);
  if (!verdictMatch)
    return { valid: false, reason: 'Missing principal verdict' };
  if (!metadataMatch)
    return { valid: false, reason: 'Missing principal review metadata' };

  try {
    const data = JSON.parse(metadataMatch[1]);
    if (!isRecord(data) || typeof data.reviewedTaskId !== 'string') {
      return { valid: false, reason: 'Missing reviewedTaskId' };
    }
    return {
      valid: true,
      reviewedTaskId: data.reviewedTaskId.trim(),
      verdict: verdictMatch[1].toLowerCase() as 'pass' | 'fail',
    };
  } catch {
    return { valid: false, reason: 'Malformed principal review metadata' };
  }
}

function extractFirstJsonObject(text: string): string | undefined {
  const start = text.indexOf('{');
  if (start === -1) return undefined;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') inString = true;
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return text.slice(start, i + 1);
  }
  return undefined;
}

function issueHasCriticalSeverity(issue: unknown): boolean {
  return (
    isRecord(issue) && String(issue.severity ?? '').toLowerCase() === 'critical'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
