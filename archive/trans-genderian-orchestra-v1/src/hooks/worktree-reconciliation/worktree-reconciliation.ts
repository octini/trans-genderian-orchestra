import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const WORKTREE_RECONCILIATION_NOTE_PATH = '.opencode/worktree.md';

export type WorktreeReviewStatus =
  | 'pending_review'
  | 'verified'
  | 'rejected'
  | 'merge_conflict'
  | 'merged';

export interface WorktreeMergeCandidate {
  /** Specialist responsible for the worktree output. */
  agent: string;
  /** Absolute or repository-relative path to the worktree checkout. */
  worktreePath: string;
  /** Branch/ref to merge after reviewer verification passes. */
  branch: string;
  /** Optional base branch. Defaults to the active integration branch. */
  baseBranch?: string;
  summary?: string;
  validation?: string[];
  status?: WorktreeReviewStatus;
}

export interface WorktreeReconciliationPlan {
  /** Branch that receives verified worktree branches. */
  targetBranch: string;
  /** Parallel worktree outputs awaiting reviewer verification. */
  candidates: WorktreeMergeCandidate[];
  reviewerSessionId?: string;
  notes?: string[];
}

/**
 * Reviewer worktree reconciliation design skeleton.
 *
 * Intended flow once the full hook is wired:
 * 1. Orchestrator records parallel builder/researcher worktrees in
 *    `.opencode/worktree.md` and delegates verification to @reviewer.
 * 2. Reviewer verifies each candidate against acceptance criteria, validation
 *    evidence, and `git diff`/`git status` from that worktree.
 * 3. When a candidate passes, reviewer switches to `targetBranch` and runs a
 *    non-fast-forward `git merge` for the candidate branch.
 * 4. On conflicts or failed verification, reviewer stops, records the status in
 *    `worktree.md`, and sends the candidate back to the responsible specialist.
 *
 * This module intentionally does not execute git commands yet. It provides the
 * shared data model and `worktree.md` note writer that a future reconciliation
 * hook can call from a reviewer-approved merge workflow.
 */

function bulletList(items: string[] | undefined): string[] {
  if (!items || items.length === 0) return ['- _None recorded_'];
  return items.map((item) => `- ${item}`);
}

export function renderWorktreeReconciliationNote(
  plan: WorktreeReconciliationPlan,
): string {
  const lines = [
    '# Worktree Reconciliation',
    '',
    '> Structural skeleton: reviewer verifies each worktree and merges only',
    '> candidates that pass acceptance and validation checks.',
    '',
    `- Target branch: \`${plan.targetBranch}\``,
    plan.reviewerSessionId
      ? `- Reviewer session: \`${plan.reviewerSessionId}\``
      : '- Reviewer session: _pending_',
    '',
    '## Merge Protocol',
    '',
    '1. Verify candidate output against the delegation envelope and plan.',
    '2. Inspect `git status`, `git diff`, and validation evidence in the worktree.',
    '3. If verification passes, merge the candidate branch into the target branch.',
    '4. If verification fails or merge conflicts occur, stop and record the blocker.',
    '',
    '## Candidates',
    '',
  ];

  if (plan.candidates.length === 0) {
    lines.push('_No worktree candidates recorded._');
  }

  for (const candidate of plan.candidates) {
    lines.push(
      `### ${candidate.agent}: ${candidate.branch}`,
      '',
      `- Status: \`${candidate.status ?? 'pending_review'}\``,
      `- Worktree: \`${candidate.worktreePath}\``,
      `- Base branch: \`${candidate.baseBranch ?? plan.targetBranch}\``,
      `- Summary: ${candidate.summary ?? '_pending_'}`,
      '',
      'Validation:',
      ...bulletList(candidate.validation),
      '',
    );
  }

  lines.push('## Notes', '', ...bulletList(plan.notes), '');

  return lines.join('\n');
}

export async function writeWorktreeReconciliationNote(
  repoRoot: string,
  plan: WorktreeReconciliationPlan,
): Promise<string> {
  const targetPath = path.join(repoRoot, WORKTREE_RECONCILIATION_NOTE_PATH);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, renderWorktreeReconciliationNote(plan), 'utf8');
  return targetPath;
}
