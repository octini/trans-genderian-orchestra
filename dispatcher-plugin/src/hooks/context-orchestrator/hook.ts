import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const STATE_MD_HEADER = `# Dispatcher System State

## 1. Active Work Stream
- **Current Stream:** \`default\`
- **Created At:** \`${new Date().toISOString()}\`

## 2. Active Session IDs
- *No active sessions*

## 3. Recent Delegations Log
`;

export interface DelegationLogEntry {
  taskId: string;
  agent: string;
  status: string;
  touchedFiles: string[];
  summary: string;
}

export interface StreamSummary {
  label: string;
  createdAt?: string;
  closedAt: string;
}

export function formatDelegationLogEntry(entry: DelegationLogEntry): string {
  const files =
    entry.touchedFiles.length > 0
      ? entry.touchedFiles.map((file) => `    - \`${file}\``).join('\n')
      : '    - None';

  return `- **Task ID:** \`${entry.taskId}\`
  - **Agent:** \`${entry.agent}\`
  - **Status:** \`${entry.status}\`
  - **Touched Files:**
${files}
  - **Summary:** ${entry.summary}
`;
}

export const HANDOFF_MD_TEMPLATE = (taskId: string) => `# Handoff: ${taskId}

## Original Request
[Verbatim user request that initiated the work]

## Current State
[What was accomplished, what was attempted, what failed]

## Blockers
[What prevents completion — include file paths and error messages]

## Next Steps
[Recommended actions for the next agent or the user]

## Relevant Context
[File paths, snippets, logs the next agent must see]
`;

export function createContextOrchestratorHook(
  projectDir: string,
  sessionAgentMap: Map<string, string>,
): {
  'tool.execute.after': (
    input: { tool: string; sessionID?: string; callID?: string },
    output: Record<string, unknown>,
  ) => Promise<void>;
  updateStateMd: (entry: DelegationLogEntry) => Promise<void>;
  startNewStream: (label?: string) => Promise<string>;
  closeCurrentStream: () => Promise<StreamSummary>;
  writeHandoffMd: (taskId: string, content: string) => Promise<void>;
} {
  const opencodeDir = join(projectDir, '.opencode');
  const stateMdPath = join(opencodeDir, 'state.md');

  async function ensureDir(): Promise<void> {
    await mkdir(opencodeDir, { recursive: true });
  }

  async function updateStateMd(entry: DelegationLogEntry): Promise<void> {
    await ensureDir();

    try {
      const existing = await readFile(stateMdPath, 'utf-8').catch(() => null);

      if (!existing) {
        await writeFile(stateMdPath, STATE_MD_HEADER, 'utf-8');
      }

      const logEntry = formatDelegationLogEntry(entry);
      await appendFile(stateMdPath, `\n${logEntry}`, 'utf-8');
    } catch {
      // state.md is best-effort coordination metadata; never fail the tool
      // call because the lifecycle file could not be updated.
    }
  }

  async function ensureStateMd(): Promise<string> {
    await ensureDir();
    const existing = await readFile(stateMdPath, 'utf-8').catch(() => null);
    if (existing) return existing;

    await writeFile(stateMdPath, STATE_MD_HEADER, 'utf-8');
    return STATE_MD_HEADER;
  }

  function extractCurrentStream(content: string): {
    label: string;
    createdAt?: string;
  } {
    const numberedMatch = content.match(
      /- \*\*Current Stream:\*\* `([^`]+)`[\s\S]*?- \*\*Created At:\*\* `([^`]+)`/,
    );
    if (numberedMatch) {
      return { label: numberedMatch[1], createdAt: numberedMatch[2] };
    }

    const simpleMatch = content.match(/## Current Stream\s+([^\n]+)/);
    if (simpleMatch) {
      return { label: simpleMatch[1].replace(/`/g, '').trim() || 'default' };
    }

    return { label: 'default' };
  }

  function replaceSection(
    content: string,
    headingPattern: RegExp,
    replacement: string,
  ): string {
    const match = headingPattern.exec(content);
    if (!match) return content;

    const start = match.index;
    const nextHeading = content.slice(start + 1).search(/^## /m);
    const end = nextHeading >= 0 ? start + 1 + nextHeading : content.length;
    return `${content.slice(0, start)}${replacement}${content.slice(end)}`;
  }

  function resetActiveSessionsSection(content: string): string {
    if (/^## 2\. Active Session IDs/m.test(content)) {
      return replaceSection(
        content,
        /^## 2\. Active Session IDs/m,
        '## 2. Active Session IDs\n- *No active sessions*\n\n',
      );
    }

    if (/^## Active Sessions/m.test(content)) {
      return replaceSection(
        content,
        /^## Active Sessions/m,
        '## Active Sessions\n_No active sessions._\n\n',
      );
    }

    return content;
  }

  function upsertStreamArchive(
    content: string,
    summary: StreamSummary,
  ): string {
    const entry = [
      `- **Stream:** \`${summary.label}\``,
      summary.createdAt ? `  - **Created At:** \`${summary.createdAt}\`` : '',
      `  - **Closed At:** \`${summary.closedAt}\``,
      '  - **Summary:** Stream closed; see Recent Delegations Log above for detailed activity.',
    ]
      .filter(Boolean)
      .join('\n');

    if (/^## 4\. Stream Archive/m.test(content)) {
      return `${content.trimEnd()}\n${entry}\n`;
    }

    return `${content.trimEnd()}\n\n## 4. Stream Archive\n${entry}\n`;
  }

  async function startNewStream(label = 'default'): Promise<string> {
    const safeLabel = label.trim() || 'default';
    const createdAt = new Date().toISOString();
    const existing = await ensureStateMd();
    let updated = existing;

    if (/^## 1\. Active Work Stream/m.test(updated)) {
      updated = replaceSection(
        updated,
        /^## 1\. Active Work Stream/m,
        `## 1. Active Work Stream\n- **Current Stream:** \`${safeLabel}\`\n- **Created At:** \`${createdAt}\`\n\n`,
      );
    } else if (/^## Current Stream/m.test(updated)) {
      updated = replaceSection(
        updated,
        /^## Current Stream/m,
        `## Current Stream\n${safeLabel}\n\n`,
      );
    } else {
      updated = `${STATE_MD_HEADER}\n${updated}`;
      updated = replaceSection(
        updated,
        /^## 1\. Active Work Stream/m,
        `## 1. Active Work Stream\n- **Current Stream:** \`${safeLabel}\`\n- **Created At:** \`${createdAt}\`\n\n`,
      );
    }

    await writeFile(stateMdPath, resetActiveSessionsSection(updated), 'utf-8');
    return safeLabel;
  }

  async function closeCurrentStream(): Promise<StreamSummary> {
    const existing = await ensureStateMd();
    const current = extractCurrentStream(existing);
    const summary: StreamSummary = {
      label: current.label,
      createdAt: current.createdAt,
      closedAt: new Date().toISOString(),
    };
    const updated = upsertStreamArchive(
      resetActiveSessionsSection(existing),
      summary,
    );
    await writeFile(stateMdPath, updated, 'utf-8');
    return summary;
  }

  async function writeHandoffMd(
    taskId: string,
    content: string,
  ): Promise<void> {
    await ensureDir();

    const handoffPath = join(opencodeDir, `handoff-${taskId}.md`);
    await writeFile(handoffPath, content, 'utf-8');
  }

  return {
    'tool.execute.after': async (
      input: { tool: string; sessionID?: string; callID?: string },
      output: Record<string, unknown>,
    ): Promise<void> => {
      if (input.tool?.toLowerCase() !== 'task') return;
      if (!input.sessionID) return;
      if (sessionAgentMap.get(input.sessionID) !== 'orchestrator') return;

      const taskResult = output?.output;
      const taskSummary =
        typeof taskResult === 'string'
          ? taskResult.slice(0, 200)
          : 'Task completed (no text output)';

      await updateStateMd({
        taskId: input.callID ?? 'unknown',
        agent: 'specialist',
        status: 'completed',
        touchedFiles: [],
        summary: taskSummary,
      });
    },
    updateStateMd,
    startNewStream,
    closeCurrentStream,
    writeHandoffMd,
  };
}
