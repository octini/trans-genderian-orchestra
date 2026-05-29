import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AgentGatingConfig } from '../../config/schema';
import { createPathGatingHook } from './index';

async function runHook(
  agent: string,
  tool: string,
  args: Record<string, unknown>,
  agentGating?: AgentGatingConfig,
) {
  const sessionAgentMap = new Map([['session-1', agent]]);
  const hook = createPathGatingHook(sessionAgentMap, agentGating);
  const output: {
    args: Record<string, unknown>;
    output: string;
    is_denied?: boolean;
  } = { args, output: '' };

  await hook['tool.execute.before'](
    { tool, sessionID: 'session-1', callID: 'call-1' },
    output,
  );

  return output;
}

async function simulatedNativeWrite(
  output: { args?: Record<string, unknown>; is_denied?: boolean },
  content: string,
): Promise<void> {
  if (output.is_denied) return;

  const filePath = output.args?.filePath;
  if (typeof filePath !== 'string') return;

  await writeFile(filePath, content);
}

describe('path gating hook', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  test('ignores untracked sessions and non-write tools', async () => {
    const hook = createPathGatingHook(new Map());
    const output: {
      args: Record<string, unknown>;
      output: string;
      is_denied?: boolean;
    } = { args: { filePath: 'src/index.ts' }, output: '' };

    await hook['tool.execute.before'](
      { tool: 'read', sessionID: 'unknown' },
      output,
    );

    expect(output.is_denied).toBeUndefined();
    expect(output.args).not.toHaveProperty('_denied');
  });

  test('blocks orchestrator writes outside state and handoff files', async () => {
    const output = await runHook('orchestrator', 'write', {
      filePath: 'src/index.ts',
    });

    expect(output.is_denied).toBe(true);
    expect(output.args).not.toHaveProperty('_denied');
    expect(output.output).toContain('PATH GATING DENIED');
  });

  test('denied write does not modify the filesystem', async () => {
    const tempDir = await mkdtemp(
      path.join(tmpdir(), 'path-gating-denied-write-'),
    );
    tempDirs.push(tempDir);

    const targetPath = path.join(tempDir, 'src.ts');
    await writeFile(targetPath, 'original');

    const output = await runHook('orchestrator', 'write', {
      filePath: targetPath,
    });

    await simulatedNativeWrite(output, 'modified');

    expect(output.is_denied).toBe(true);
    expect(output.args).not.toHaveProperty('_denied');
    expect(await readFile(targetPath, 'utf-8')).toBe('original');
  });

  test('allows orchestrator writes to state, handoff, and plan status files', async () => {
    const stateOutput = await runHook('orchestrator', 'write', {
      filePath: '.opencode/state.md',
    });
    const handoffOutput = await runHook('orchestrator', 'edit', {
      path: '.opencode/handoff.md',
    });
    const planStatusOutput = await runHook('orchestrator', 'write', {
      filePath: '.opencode/plans/plan.md',
    });

    expect(stateOutput.is_denied).toBeUndefined();
    expect(handoffOutput.is_denied).toBeUndefined();
    expect(planStatusOutput.is_denied).toBeUndefined();
  });

  test('allows researcher only to notes or scratchpad paths', async () => {
    const notesOutput = await runHook('researcher', 'write', {
      filePath: '.opencode/notes.md',
    });
    const sourceOutput = await runHook('researcher', 'write', {
      filePath: 'src/research.ts',
    });

    expect(notesOutput.is_denied).toBeUndefined();
    expect(sourceOutput.is_denied).toBe(true);
  });

  test('blocks reviewer writes because reviewer is SDK read-only', async () => {
    const markdownOutput = await runHook('reviewer', 'edit', {
      filePath: 'docs/review.md',
    });
    const sourceOutput = await runHook('reviewer', 'edit', {
      filePath: 'src/review.ts',
    });

    expect(markdownOutput.is_denied).toBe(true);
    expect(sourceOutput.is_denied).toBe(true);
  });

  test('gates apply_patch using production patchText args', async () => {
    const patchText = `*** Begin Patch
*** Update File: src/index.ts
@@
-old
+new
*** End Patch`;
    const deniedOutput = await runHook('orchestrator', 'apply_patch', {
      patchText,
    });
    const allowedOutput = await runHook('builder', 'apply_patch', {
      patchText,
    });

    expect(deniedOutput.is_denied).toBe(true);
    expect(allowedOutput.is_denied).toBeUndefined();
  });

  test('gates every apply_patch path including move targets', async () => {
    const patchText = `*** Begin Patch
*** Update File: .opencode/plans/plan.md
*** Move to: src/plan.ts
@@
-approved
+executing
*** End Patch`;

    const output = await runHook('orchestrator', 'apply_patch', { patchText });

    expect(output.is_denied).toBe(true);
    expect(output.output).toContain('src/plan.ts');
  });

  test('allows orchestrator apply_patch status updates to plan.md', async () => {
    const output = await runHook('orchestrator', 'apply_patch', {
      patchText: `*** Begin Patch
*** Update File: .opencode/plans/plan.md
@@
-status: approved
+status: executing
*** End Patch`,
    });

    expect(output.is_denied).toBeUndefined();
  });

  test('uses tool directory when gating relative apply_patch targets', async () => {
    const tempDir = await mkdtemp(
      path.join(tmpdir(), 'path-gating-directory-'),
    );
    tempDirs.push(tempDir);
    const hook = createPathGatingHook(new Map([['session-1', 'planner']]));
    const output: {
      args: Record<string, unknown>;
      output: string;
      is_denied?: boolean;
    } = {
      args: {
        patchText: `*** Begin Patch
*** Update File: .opencode/plans/feature.md
@@
-draft
+approved
*** End Patch`,
      },
      output: '',
    };

    await hook['tool.execute.before'](
      {
        tool: 'apply_patch',
        directory: tempDir,
        sessionID: 'session-1',
        callID: 'call-1',
      },
      output,
    );

    expect(output.is_denied).toBeUndefined();
  });

  test('allows planner only under .opencode/plans', async () => {
    const planOutput = await runHook('planner', 'write', {
      filePath: '.opencode/plans/feature.md',
    });
    const sourceOutput = await runHook('planner', 'write', {
      filePath: 'src/plan.ts',
    });

    expect(planOutput.is_denied).toBeUndefined();
    expect(sourceOutput.is_denied).toBe(true);
  });

  test('allows builder writes everywhere and blocks council writes everywhere', async () => {
    const builderOutput = await runHook('builder', 'write', {
      filePath: 'src/index.ts',
    });
    const councilOutput = await runHook('councillor', 'write', {
      filePath: '.opencode/notes.md',
    });

    expect(builderOutput.is_denied).toBeUndefined();
    expect(councilOutput.is_denied).toBe(true);
  });

  test('uses config gating when provided and overrides default rules', async () => {
    const allowedOutput = await runHook(
      'orchestrator',
      'write',
      { filePath: 'docs/orchestrator.md' },
      { orchestrator: ['docs/orchestrator.md'] },
    );
    const defaultPathOutput = await runHook(
      'orchestrator',
      'write',
      { filePath: '.opencode/state.md' },
      { orchestrator: ['docs/orchestrator.md'] },
    );

    expect(allowedOutput.is_denied).toBeUndefined();
    expect(defaultPathOutput.is_denied).toBe(true);
  });

  test('falls back to defaults when no gating config provided', async () => {
    const stateOutput = await runHook('orchestrator', 'write', {
      filePath: '.opencode/state.md',
    });
    const sourceOutput = await runHook('orchestrator', 'write', {
      filePath: 'src/index.ts',
    });

    expect(stateOutput.is_denied).toBeUndefined();
    expect(sourceOutput.is_denied).toBe(true);
  });

  test('config gating patterns support suffix matching', async () => {
    const allowedOutput = await runHook(
      'researcher',
      'write',
      { filePath: '.opencode/research-state.md' },
      { researcher: ['research-state.md'] },
    );
    const deniedOutput = await runHook(
      'researcher',
      'write',
      { filePath: '.opencode/research-notes.md' },
      { researcher: ['research-state.md'] },
    );

    expect(allowedOutput.is_denied).toBeUndefined();
    expect(deniedOutput.is_denied).toBe(true);
  });

  test('config gating ignores empty patterns', async () => {
    const output = await runHook(
      'orchestrator',
      'write',
      { filePath: 'src/index.ts' },
      { orchestrator: [''] },
    );

    expect(output.is_denied).toBe(true);
  });

  test('config suffix matching requires a path boundary', async () => {
    const output = await runHook(
      'researcher',
      'write',
      { filePath: '.opencode/not-research-state.md' },
      { researcher: ['research-state.md'] },
    );

    expect(output.is_denied).toBe(true);
  });

  test('config gating patterns support wildcard prefix matching', async () => {
    const allowedOutput = await runHook(
      'planner',
      'write',
      { filePath: 'src/plans/feature.md' },
      { planner: ['src/plans/*'] },
    );
    const deniedOutput = await runHook(
      'planner',
      'write',
      { filePath: 'docs/plans/feature.md' },
      { planner: ['src/plans/*'] },
    );

    expect(allowedOutput.is_denied).toBeUndefined();
    expect(deniedOutput.is_denied).toBe(true);
  });

  test('config only affects specified agents and keeps defaults for others', async () => {
    const agentGating = { orchestrator: ['docs/orchestrator.md'] };
    const orchestratorOutput = await runHook(
      'orchestrator',
      'write',
      { filePath: '.opencode/state.md' },
      agentGating,
    );
    const plannerOutput = await runHook(
      'planner',
      'write',
      { filePath: '.opencode/plans/feature.md' },
      agentGating,
    );

    expect(orchestratorOutput.is_denied).toBe(true);
    expect(plannerOutput.is_denied).toBeUndefined();
  });

  test('blocks council and councillor regardless of gating config', async () => {
    const councilOutput = await runHook(
      'council',
      'write',
      { filePath: 'docs/council.md' },
      { council: ['docs/council.md'] },
    );
    const councillorOutput = await runHook(
      'councillor',
      'write',
      { filePath: 'docs/councillor.md' },
      { councillor: ['docs/councillor.md'] },
    );

    expect(councilOutput.is_denied).toBe(true);
    expect(councillorOutput.is_denied).toBe(true);
  });
});
