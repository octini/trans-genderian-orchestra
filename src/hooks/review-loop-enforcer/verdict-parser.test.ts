import { describe, expect, test } from 'bun:test';
import {
  parseEnsembleVerdict,
  parsePrincipalReviewMetadata,
} from './verdict-parser.js';

describe('review-loop verdict parser', () => {
  test('parses ensemble approve verdict with reviewedTaskId', () => {
    const parsed = parseEnsembleVerdict(`before
{
  "reviewedTaskId": "task-1",
  "verdict": "approve",
  "per_councillor_findings": { "first": "ok", "second": "ok", "third": "ok" },
  "issues": [],
  "consensus": "unanimous"
}
after`);
    expect(parsed.valid).toBe(true);
    if (parsed.valid) {
      expect(parsed.reviewedTaskId).toBe('task-1');
      expect(parsed.verdict).toBe('approve');
      expect(parsed.requiredNextAction).toBe('principal');
    }
  });

  test('parses ensemble reject verdict', () => {
    const parsed = parseEnsembleVerdict(
      JSON.stringify({
        reviewedTaskId: 'task-1',
        verdict: 'reject',
        issues: [
          { file: 'src/a.ts', line: 1, description: 'bad', severity: 'major' },
        ],
        consensus: 'majority',
      }),
    );
    expect(parsed.valid).toBe(true);
    if (parsed.valid) {
      expect(parsed.verdict).toBe('reject');
      expect(parsed.requiredNextAction).toBe('composer');
    }
  });

  test('forces reject when critical issue is present', () => {
    const parsed = parseEnsembleVerdict(
      JSON.stringify({
        reviewedTaskId: 'task-1',
        verdict: 'approve',
        issues: [{ severity: 'critical', description: 'data loss' }],
        consensus: 'majority',
      }),
    );
    expect(parsed.valid).toBe(true);
    if (parsed.valid) {
      expect(parsed.verdict).toBe('reject');
      expect(parsed.criticalIssueCount).toBe(1);
      expect(parsed.requiredNextAction).toBe('composer');
    }
  });

  test('returns invalid for malformed JSON', () => {
    const parsed = parseEnsembleVerdict('{ "verdict": "approve" ');
    expect(parsed.valid).toBe(false);
  });

  test('returns invalid when reviewedTaskId is missing', () => {
    const parsed = parseEnsembleVerdict(
      JSON.stringify({ verdict: 'approve', issues: [] }),
    );
    expect(parsed.valid).toBe(false);
  });

  test('parses principal reviewedTaskId confirmation', () => {
    const parsed = parsePrincipalReviewMetadata(`
<results>
  <verdict>pass</verdict>
  <review_metadata>{"reviewedTaskId":"task-1"}</review_metadata>
</results>`);
    expect(parsed.valid).toBe(true);
    if (parsed.valid) {
      expect(parsed.reviewedTaskId).toBe('task-1');
      expect(parsed.verdict).toBe('pass');
    }
  });
});
