export type ReviewAgent = 'composer' | 'ensemble' | 'principal';

export type RequiredReview = 'ensemble' | 'principal';

export type RequiredNextAction =
  | 'ensemble'
  | 'principal'
  | 'composer'
  | 'principal-escalation';

export interface ChangedFile {
  path: string;
  added: number;
  deleted: number;
  binary?: boolean;
}

export interface ChangeSet {
  files: ChangedFile[];
}

export interface ChangeClassification {
  requiredReview: RequiredReview;
  skipEnsemble: boolean;
  changedLines: number;
  reason: string;
  riskPaths: string[];
}

export type EnsembleVerdict = 'approve' | 'reject';
export type PrincipalVerdict = 'pass' | 'fail';

export type ParsedEnsembleVerdict =
  | {
      valid: true;
      reviewedTaskId: string;
      verdict: EnsembleVerdict;
      requiredNextAction: 'principal' | 'composer';
      criticalIssueCount: number;
      issues: unknown[];
    }
  | { valid: false; reason: string };

export type ParsedPrincipalMetadata =
  | { valid: true; reviewedTaskId: string; verdict: PrincipalVerdict }
  | { valid: false; reason: string };
