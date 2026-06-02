import { describe, expect, test } from 'bun:test';
import {
  assertArtifactTransition,
  parseArtifactFrontmatter,
  serializeArtifactFrontmatter,
} from './lifecycle';

describe('artifact lifecycle rules', () => {
  test('allows draft specs and plans to become approved', () => {
    expect(
      assertArtifactTransition({
        artifact_type: 'plan',
        from_status: 'draft',
        to_status: 'approved',
      }),
    ).toEqual({ ok: true });
  });

  test('allows approved implementation plans to become active or completed', () => {
    expect(
      assertArtifactTransition({
        artifact_type: 'plan',
        from_status: 'approved',
        to_status: 'active',
      }),
    ).toEqual({ ok: true });
    expect(
      assertArtifactTransition({
        artifact_type: 'plan',
        from_status: 'active',
        to_status: 'completed',
      }),
    ).toEqual({ ok: true });
  });

  test('requires superseded_by when superseding an artifact', () => {
    expect(
      assertArtifactTransition({
        artifact_type: 'decision',
        from_status: 'approved',
        to_status: 'superseded',
      }),
    ).toEqual({
      ok: false,
      errors: ['superseded artifacts require superseded_by.'],
    });

    expect(
      assertArtifactTransition({
        artifact_type: 'decision',
        from_status: 'approved',
        to_status: 'superseded',
        superseded_by: '.opencode/tgo/decisions/new-decision.md',
      }),
    ).toEqual({ ok: true });
  });

  test('prevents approval of completed artifacts', () => {
    expect(
      assertArtifactTransition({
        artifact_type: 'plan',
        from_status: 'completed',
        to_status: 'approved',
      }),
    ).toEqual({
      ok: false,
      errors: ['Invalid artifact status transition: completed -> approved.'],
    });
  });

  test('keeps reviewer and council artifacts immutable after creation', () => {
    expect(
      assertArtifactTransition({
        artifact_type: 'review',
        from_status: 'completed',
        to_status: 'archived',
      }),
    ).toEqual({
      ok: false,
      errors: [
        'review artifacts are immutable audit evidence after creation except metadata fixes.',
      ],
    });

    expect(
      assertArtifactTransition({
        artifact_type: 'council',
        from_status: 'completed',
        to_status: 'superseded',
        superseded_by: '.opencode/tgo/council/new.md',
      }),
    ).toEqual({
      ok: false,
      errors: [
        'council artifacts are immutable audit evidence after creation except metadata fixes.',
      ],
    });
  });

  test('serializes and parses deterministic markdown frontmatter', () => {
    const markdown = serializeArtifactFrontmatter({
      artifact_type: 'plan',
      status: 'approved',
      stream_id: 'phase3-stream',
      beads_issue: 'omo-slim_modifications-x7o',
      created_at: '2026-06-02T00:00:00.000Z',
      updated_at: '2026-06-02T01:00:00.000Z',
      superseded_by: undefined,
      worktree: '.worktrees/tgo-v2-phase-3',
      branch: 'tgo-v2-phase-3',
      commit: 'abc1234',
    });

    expect(markdown).toBe(
      `---\nartifact_type: plan\nstatus: approved\nstream_id: phase3-stream\nbeads_issue: omo-slim_modifications-x7o\ncreated_at: 2026-06-02T00:00:00.000Z\nupdated_at: 2026-06-02T01:00:00.000Z\nworktree: .worktrees/tgo-v2-phase-3\nbranch: tgo-v2-phase-3\ncommit: abc1234\n---\n`,
    );
    expect(parseArtifactFrontmatter(markdown).value).toEqual({
      artifact_type: 'plan',
      status: 'approved',
      stream_id: 'phase3-stream',
      beads_issue: 'omo-slim_modifications-x7o',
      created_at: '2026-06-02T00:00:00.000Z',
      updated_at: '2026-06-02T01:00:00.000Z',
      worktree: '.worktrees/tgo-v2-phase-3',
      branch: 'tgo-v2-phase-3',
      commit: 'abc1234',
    });
  });
});
