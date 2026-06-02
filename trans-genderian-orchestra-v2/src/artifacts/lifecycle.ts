export const ARTIFACT_STATUSES = [
  'draft',
  'approved',
  'active',
  'completed',
  'superseded',
  'archived',
] as const;

export type ArtifactStatus = (typeof ARTIFACT_STATUSES)[number];
export type ArtifactType =
  | 'spec'
  | 'plan'
  | 'evidence'
  | 'review'
  | 'handoff'
  | 'decision'
  | 'council'
  | 'validation';

export interface ArtifactFrontmatter {
  artifact_type: ArtifactType;
  status: ArtifactStatus;
  stream_id?: string;
  beads_issue?: string;
  created_at?: string;
  updated_at?: string;
  superseded_by?: string;
  worktree?: string;
  branch?: string;
  commit?: string;
}

export type ArtifactTransitionResult =
  | { ok: true }
  | { ok: false; errors: string[] };

export type ParseFrontmatterResult =
  | { ok: true; value: Partial<ArtifactFrontmatter> }
  | { ok: false; errors: string[] };

const ALLOWED_TRANSITIONS: Record<ArtifactStatus, ArtifactStatus[]> = {
  draft: ['approved', 'superseded', 'archived'],
  approved: ['active', 'completed', 'superseded', 'archived'],
  active: ['completed', 'superseded', 'archived'],
  completed: ['archived'],
  superseded: ['archived'],
  archived: [],
};

export function assertArtifactTransition(input: {
  artifact_type: ArtifactType;
  from_status: ArtifactStatus;
  to_status: ArtifactStatus;
  superseded_by?: string;
  metadata_fix?: boolean;
}): ArtifactTransitionResult {
  const errors: string[] = [];

  if (
    (input.artifact_type === 'review' || input.artifact_type === 'council') &&
    !input.metadata_fix
  ) {
    errors.push(
      `${input.artifact_type} artifacts are immutable audit evidence after creation except metadata fixes.`,
    );
    return { ok: false, errors };
  }

  if (!ALLOWED_TRANSITIONS[input.from_status].includes(input.to_status)) {
    errors.push(
      `Invalid artifact status transition: ${input.from_status} -> ${input.to_status}.`,
    );
  }

  if (input.to_status === 'superseded' && !input.superseded_by) {
    errors.push('superseded artifacts require superseded_by.');
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function serializeArtifactFrontmatter(
  frontmatter: ArtifactFrontmatter,
): string {
  const orderedKeys: Array<keyof ArtifactFrontmatter> = [
    'artifact_type',
    'status',
    'stream_id',
    'beads_issue',
    'created_at',
    'updated_at',
    'superseded_by',
    'worktree',
    'branch',
    'commit',
  ];
  const lines = ['---'];
  for (const key of orderedKeys) {
    const value = frontmatter[key];
    if (value !== undefined) {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---');
  return `${lines.join('\n')}\n`;
}

export function parseArtifactFrontmatter(
  markdown: string,
): ParseFrontmatterResult {
  if (!markdown.startsWith('---\n')) {
    return { ok: false, errors: ['Missing opening frontmatter marker.'] };
  }
  const end = markdown.indexOf('\n---\n', 4);
  if (end === -1) {
    return { ok: false, errors: ['Missing closing frontmatter marker.'] };
  }

  const value: Record<string, string> = {};
  const body = markdown.slice(4, end);
  for (const line of body.split('\n')) {
    if (line.trim().length === 0) {
      continue;
    }
    const separator = line.indexOf(':');
    if (separator === -1) {
      return { ok: false, errors: [`Malformed frontmatter line: ${line}`] };
    }
    value[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }

  return { ok: true, value: value as Partial<ArtifactFrontmatter> };
}
