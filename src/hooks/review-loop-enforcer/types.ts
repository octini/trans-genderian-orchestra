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
