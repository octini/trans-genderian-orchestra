import type { PluginInput } from '@opencode-ai/plugin';
import type { AgentDefinition } from '../agents';
import type { CommandExecuteInput, CommandExecuteOutput } from '../hooks/types';
import {
  abortSessionWithTimeout,
  createInternalAgentTextPart,
  extractSessionResult,
  OperationTimeoutError,
  promptWithTimeout,
} from '../utils';
import { log } from '../utils/logger';

const COMMAND_NAME = 'ping-all';
const DEFAULT_TIMEOUT_MS = 10_000;
const PING_PROMPT = 'Respond with only the word PONG';
const EXCLUDED_AGENT_NAMES = new Set(['orchestrator', 'councillor']);

export interface PingAllCommandOptions {
  timeoutMs?: number;
}

interface PingResult {
  agent: string;
  ok: boolean;
  detail: string;
}

function normalizeCommand(command: string): string {
  return command.trim().replace(/^\//, '');
}

function pingableAgentNames(agentDefs: AgentDefinition[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const agent of agentDefs) {
    if (EXCLUDED_AGENT_NAMES.has(agent.name)) continue;
    if (seen.has(agent.name)) continue;

    seen.add(agent.name);
    names.push(agent.name);
  }

  return names;
}

function isPongResponse(text: string): boolean {
  return text.trim().toLowerCase() === 'pong';
}

function truncateForTable(value: string, maxLength = 120): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

function escapeTableCell(value: string): string {
  return value.replaceAll('|', '\\|').replace(/\r?\n/g, ' ');
}

function formatPingError(error: unknown): string {
  if (error instanceof OperationTimeoutError) return 'timeout';

  const message = error instanceof Error ? error.message : String(error);
  if (/timed out|timeout/i.test(message)) return 'timeout';
  return truncateForTable(message || 'error');
}

function formatPingResults(results: PingResult[], timeoutMs: number): string {
  const timeoutSeconds = Math.round(timeoutMs / 1000);
  const lines = [
    '## `/ping-all` RESULT',
    '',
    `Pinged ${results.length} enabled specialist agent${results.length === 1 ? '' : 's'} (${timeoutSeconds}s timeout each).`,
    '',
    '| Agent | Result |',
    '| --- | --- |',
  ];

  for (const result of results) {
    const status = result.ok ? '✅' : '❌';
    lines.push(
      `| \`${escapeTableCell(result.agent)}\` | ${status} ${escapeTableCell(result.detail)} |`,
    );
  }

  return lines.join('\n');
}

async function cleanupSession(
  ctx: PluginInput,
  sessionId: string,
): Promise<void> {
  try {
    await abortSessionWithTimeout(ctx.client, sessionId);
  } catch (error) {
    log('[ping-all] failed to abort ping session', {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export class PingAllCommand {
  private readonly agentNames: string[];
  private readonly timeoutMs: number;

  constructor(
    private readonly ctx: PluginInput,
    agentDefs: AgentDefinition[],
    options: PingAllCommandOptions = {},
  ) {
    this.agentNames = pingableAgentNames(agentDefs);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  registerCommand(opencodeConfig: Record<string, unknown>): void {
    const commandConfig = opencodeConfig.command as
      | Record<string, unknown>
      | undefined;
    if (commandConfig?.[COMMAND_NAME]) return;

    if (!opencodeConfig.command) opencodeConfig.command = {};
    (opencodeConfig.command as Record<string, unknown>)[COMMAND_NAME] = {
      template: 'Ping all enabled specialist agents',
      description: 'Test connectivity to every enabled Dispatcher specialist',
    };
  }

  async handleCommandExecuteBefore(
    input: CommandExecuteInput,
    output: CommandExecuteOutput,
  ): Promise<void> {
    if (normalizeCommand(input.command) !== COMMAND_NAME) return;

    output.parts.length = 0;

    if (this.agentNames.length === 0) {
      output.parts.push(
        createInternalAgentTextPart(
          '## `/ping-all` RESULT\n\nNo enabled specialist agents were found.',
        ),
      );
      return;
    }

    const results = await Promise.all(
      this.agentNames.map((agentName) =>
        this.pingAgent(agentName, input.sessionID),
      ),
    );

    output.parts.push(
      createInternalAgentTextPart(formatPingResults(results, this.timeoutMs)),
    );
  }

  private async pingAgent(
    agentName: string,
    parentSessionId: string,
  ): Promise<PingResult> {
    let sessionId: string | undefined;

    try {
      const session = await this.ctx.client.session.create({
        body: {
          parentID: parentSessionId,
          title: `Ping ${agentName}`,
        },
        query: { directory: this.ctx.directory },
      });

      sessionId = session.data?.id;
      if (!sessionId) {
        throw new Error('Failed to create ping session');
      }

      await promptWithTimeout(
        this.ctx.client,
        {
          path: { id: sessionId },
          body: {
            agent: agentName,
            tools: { task: false },
            parts: [{ type: 'text', text: PING_PROMPT }],
          },
          query: { directory: this.ctx.directory },
        },
        this.timeoutMs,
      );

      const extraction = await extractSessionResult(
        this.ctx.client,
        sessionId,
        {
          directory: this.ctx.directory,
          includeReasoning: false,
        },
      );
      const response = extraction.text.trim();

      if (response && isPongResponse(response)) {
        return { agent: agentName, ok: true, detail: 'pong' };
      }

      return {
        agent: agentName,
        ok: false,
        detail: response
          ? `unexpected: ${truncateForTable(response)}`
          : 'empty response',
      };
    } catch (error) {
      return { agent: agentName, ok: false, detail: formatPingError(error) };
    } finally {
      if (sessionId) {
        await cleanupSession(this.ctx, sessionId);
      }
    }
  }
}

export function createPingAllCommand(
  ctx: PluginInput,
  agentDefs: AgentDefinition[],
  options?: PingAllCommandOptions,
): PingAllCommand {
  return new PingAllCommand(ctx, agentDefs, options);
}
