import { describe, expect, mock, test } from 'bun:test';
import type { AgentDefinition } from '../agents';
import { SLIM_INTERNAL_INITIATOR_MARKER } from '../utils';
import { createPingAllCommand } from './ping-all';

type MockFunction = ReturnType<typeof mock>;

function agent(name: string): AgentDefinition {
  return { name, config: {} as AgentDefinition['config'] };
}

function createMockContext(responses: Record<string, string | Error>) {
  let sessionCounter = 0;
  const agentBySession = new Map<string, string>();

  const ctx = {
    directory: '/tmp/project',
    client: {
      session: {
        create: mock(async () => ({
          data: { id: `ping-session-${++sessionCounter}` },
        })),
        prompt: mock(async (args: unknown) => {
          const request = args as {
            path: { id: string };
            body: { agent?: string };
          };
          const agentName = request.body.agent ?? 'unknown';
          agentBySession.set(request.path.id, agentName);

          const response = responses[agentName];
          if (response instanceof Error) throw response;
          return {};
        }),
        messages: mock(async (args: unknown) => {
          const request = args as { path: { id: string } };
          const agentName = agentBySession.get(request.path.id) ?? 'unknown';
          const response = responses[agentName] ?? 'PONG';

          return {
            data: [
              {
                info: { role: 'assistant' },
                parts: [
                  {
                    type: 'text',
                    text: response instanceof Error ? '' : response,
                  },
                ],
              },
            ],
          };
        }),
        abort: mock(async () => ({})),
      },
    },
  } as never;

  return ctx;
}

describe('ping-all command', () => {
  test('registers /ping-all command when absent', () => {
    const hook = createPingAllCommand(createMockContext({}), [
      agent('builder'),
    ]);
    const config: Record<string, unknown> = {};

    hook.registerCommand(config);

    const command = (config.command as Record<string, unknown>)['ping-all'] as {
      template?: string;
      description?: string;
    };
    expect(command).toBeDefined();
    expect(command.template).toContain('Ping all');
    expect(command.description).toContain('connectivity');
  });

  test('pings enabled specialist agents and excludes orchestrator internals', async () => {
    const ctx = createMockContext({
      planner: 'PONG',
      builder: 'pong',
    });
    const hook = createPingAllCommand(ctx, [
      agent('orchestrator'),
      agent('planner'),
      agent('builder'),
      agent('councillor'),
    ]);
    const output = { parts: [{ type: 'text', text: 'template' }] };

    await hook.handleCommandExecuteBefore(
      { command: 'ping-all', sessionID: 'parent-session', arguments: '' },
      output,
    );

    const session = (
      ctx as never as { client: { session: { prompt: MockFunction } } }
    ).client.session;
    const promptCalls = session.prompt.mock.calls as Array<
      [{ body: { agent: string } }]
    >;
    expect(promptCalls.map(([call]) => call.body.agent)).toEqual([
      'planner',
      'builder',
    ]);

    expect(output.parts).toHaveLength(1);
    expect(output.parts[0].text).toContain('## `/ping-all` RESULT');
    expect(output.parts[0].text).toContain('| `planner` | ✅ pong |');
    expect(output.parts[0].text).toContain('| `builder` | ✅ pong |');
    expect(output.parts[0].text).toContain(SLIM_INTERNAL_INITIATOR_MARKER);
  });

  test('reports prompt failures in the result table', async () => {
    const ctx = createMockContext({ reviewer: new Error('provider offline') });
    const hook = createPingAllCommand(ctx, [agent('reviewer')]);
    const output = { parts: [{ type: 'text', text: 'template' }] };

    await hook.handleCommandExecuteBefore(
      { command: '/ping-all', sessionID: 'parent-session', arguments: '' },
      output,
    );

    expect(output.parts[0].text).toContain(
      '| `reviewer` | ❌ provider offline |',
    );
  });

  test('ignores other commands', async () => {
    const hook = createPingAllCommand(createMockContext({}), [
      agent('builder'),
    ]);
    const output = { parts: [{ type: 'text', text: 'template' }] };

    await hook.handleCommandExecuteBefore(
      { command: 'preset', sessionID: 's1', arguments: '' },
      output,
    );

    expect(output.parts).toEqual([{ type: 'text', text: 'template' }]);
  });
});
