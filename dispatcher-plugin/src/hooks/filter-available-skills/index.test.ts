import { describe, expect, test } from 'bun:test';
import type { PluginInput } from '@opencode-ai/plugin';
import type { PluginConfig } from '../../config';
import {
  createFilterAvailableSkillsHook,
  filterAvailableSkillsText,
} from './index';

const mockCtx = {} as PluginInput;

function skillBlock(name: string): string {
  return `<skill>
  <name>${name}</name>
  <description>${name} description</description>
  <location>file:///tmp/${name}</location>
</skill>`;
}

function availableSkillsBlock(...names: string[]): string {
  return `<available_skills>
${names.map((name) => skillBlock(name)).join('\n')}
</available_skills>`;
}

describe('filterAvailableSkillsText', () => {
  test('keeps only allowed skills using exact skill names', () => {
    const text = availableSkillsBlock('skill1', 'skill2', 'skill3');
    const result = filterAvailableSkillsText(text, {
      '*': 'deny',
      skill1: 'allow',
      skill3: 'allow',
    });

    expect(result).toContain('<name>skill1</name>');
    expect(result).not.toContain('<name>skill2</name>');
    expect(result).toContain('<name>skill3</name>');
  });

  test('renders No skills available when nothing is allowed', () => {
    const result = filterAvailableSkillsText(availableSkillsBlock('skill1'), {
      '*': 'deny',
    });

    expect(result).toContain('No skills available.');
    expect(result).not.toContain('<name>skill1</name>');
  });

  test('always keeps Tier 1 preloaded skills', () => {
    const result = filterAvailableSkillsText(
      availableSkillsBlock('using-superpowers', 'skill1'),
      {
        '*': 'deny',
      },
    );

    expect(result).toContain('<name>using-superpowers</name>');
    expect(result).not.toContain('<name>skill1</name>');
  });

  test('allows Tier 2 skills from the agent role pool', () => {
    const result = filterAvailableSkillsText(
      availableSkillsBlock('tdd', 'codemap', 'using-superpowers'),
      { agentName: 'builder' },
    );

    expect(result).toContain('<name>tdd</name>');
    expect(result).toContain('<name>using-superpowers</name>');
    expect(result).not.toContain('<name>codemap</name>');
  });

  test('allows Tier 3 dynamic recommendations', () => {
    const result = filterAvailableSkillsText(
      availableSkillsBlock('zoom-out', 'codemap'),
      { agentName: 'builder', dynamicRecommendations: ['zoom-out'] },
    );

    expect(result).toContain('<name>zoom-out</name>');
    expect(result).not.toContain('<name>codemap</name>');
  });
});

describe('createFilterAvailableSkillsHook', () => {
  test('filters system prompt skill blocks for explicit agent skills', async () => {
    const config: PluginConfig = {
      agents: {
        researcher: {
          skills: ['skill1', 'skill3'],
        },
      },
    };

    const hook = createFilterAvailableSkillsHook(mockCtx, config);
    const output = {
      messages: [
        {
          info: { role: 'system' },
          parts: [
            {
              type: 'text',
              text: availableSkillsBlock('skill1', 'skill2', 'skill3'),
            },
          ],
        },
        {
          info: { role: 'user', agent: 'researcher' },
          parts: [{ type: 'text', text: 'check skills' }],
        },
      ],
    };

    await hook['experimental.chat.messages.transform']({}, output);

    const resultText = output.messages[0].parts[0].text;
    expect(resultText).toContain('<name>skill1</name>');
    expect(resultText).not.toContain('<name>skill2</name>');
    expect(resultText).toContain('<name>skill3</name>');
  });

  test('preserves Tier 1 for agents with an empty skills list', async () => {
    const config: PluginConfig = {
      agents: {
        builder: {
          skills: [],
        },
      },
    };

    const hook = createFilterAvailableSkillsHook(mockCtx, config);
    const output = {
      messages: [
        {
          info: { role: 'system' },
          parts: [
            {
              type: 'text',
              text: availableSkillsBlock('using-superpowers', 'skill1'),
            },
          ],
        },
        {
          info: { role: 'user', agent: 'builder' },
          parts: [{ type: 'text', text: 'check skills' }],
        },
      ],
    };

    await hook['experimental.chat.messages.transform']({}, output);

    const resultText = output.messages[0].parts[0].text;
    expect(resultText).toContain('<name>using-superpowers</name>');
    expect(resultText).not.toContain('<name>skill1</name>');
  });

  test('uses orchestrator Tier 2 pool by default', async () => {
    const hook = createFilterAvailableSkillsHook(mockCtx, {});
    const output = {
      messages: [
        {
          info: { role: 'system' },
          parts: [
            {
              type: 'text',
              text: availableSkillsBlock('brainstorming', 'skill1'),
            },
          ],
        },
        {
          info: { role: 'user', agent: 'orchestrator' },
          parts: [{ type: 'text', text: 'check skills' }],
        },
      ],
    };

    await hook['experimental.chat.messages.transform']({}, output);

    const resultText = output.messages[0].parts[0].text;
    expect(resultText).toContain('<name>brainstorming</name>');
    expect(resultText).not.toContain('<name>skill1</name>');
  });

  test('supports wildcard allow with explicit exclusions', async () => {
    const config: PluginConfig = {
      agents: {
        builder: {
          skills: ['*', '!skill2'],
        },
      },
    };

    const hook = createFilterAvailableSkillsHook(mockCtx, config);
    const output = {
      messages: [
        {
          info: { role: 'system' },
          parts: [
            { type: 'text', text: availableSkillsBlock('skill1', 'skill2') },
          ],
        },
        {
          info: { role: 'user', agent: 'builder' },
          parts: [{ type: 'text', text: 'check skills' }],
        },
      ],
    };

    await hook['experimental.chat.messages.transform']({}, output);

    const resultText = output.messages[0].parts[0].text;
    expect(resultText).toContain('<name>skill1</name>');
    expect(resultText).not.toContain('<name>skill2</name>');
  });

  test('defaults to orchestrator when no agent is present', async () => {
    const hook = createFilterAvailableSkillsHook(mockCtx, {});
    const output = {
      messages: [
        {
          info: { role: 'system' },
          parts: [
            { type: 'text', text: availableSkillsBlock('brainstorming') },
          ],
        },
        {
          info: { role: 'user' },
          parts: [{ type: 'text', text: 'check skills' }],
        },
      ],
    };

    await hook['experimental.chat.messages.transform']({}, output);

    expect(output.messages[0].parts[0].text).toContain(
      '<name>brainstorming</name>',
    );
  });

  test('allows dynamically recommended skills in delegation text', async () => {
    const hook = createFilterAvailableSkillsHook(mockCtx, {});
    const output = {
      messages: [
        {
          info: { role: 'system' },
          parts: [
            {
              type: 'text',
              text: availableSkillsBlock('tdd', 'zoom-out', 'random-skill'),
            },
          ],
        },
        {
          info: { role: 'user', agent: 'builder' },
          parts: [
            {
              type: 'text',
              text: '**Recommended skills:** `zoom-out`. Load it first.',
            },
          ],
        },
      ],
    };

    await hook['experimental.chat.messages.transform']({}, output);

    const resultText = output.messages[0].parts[0].text;
    expect(resultText).toContain('<name>tdd</name>');
    expect(resultText).toContain('<name>zoom-out</name>');
    expect(resultText).not.toContain('<name>random-skill</name>');
  });

  test('filters multiple skill blocks across messages', async () => {
    const config: PluginConfig = {
      agents: {
        researcher: {
          skills: ['skill1'],
        },
      },
    };

    const hook = createFilterAvailableSkillsHook(mockCtx, config);
    const output = {
      messages: [
        {
          info: { role: 'system' },
          parts: [
            {
              type: 'text',
              text: `Intro\n${availableSkillsBlock('skill1', 'skill2')}`,
            },
          ],
        },
        {
          info: { role: 'developer' },
          parts: [
            { type: 'text', text: availableSkillsBlock('skill2', 'skill3') },
          ],
        },
        {
          info: { role: 'user', agent: 'researcher' },
          parts: [{ type: 'text', text: 'check skills' }],
        },
      ],
    };

    await hook['experimental.chat.messages.transform']({}, output);

    expect(output.messages[0].parts[0].text).toContain('<name>skill1</name>');
    expect(output.messages[0].parts[0].text).not.toContain(
      '<name>skill2</name>',
    );
    expect(output.messages[1].parts[0].text).toContain('No skills available.');
  });

  test('reuses permission rules without caching the final skills block text', async () => {
    const config: PluginConfig = {
      agents: {
        researcher: {
          skills: ['skill1', 'skill3'],
        },
      },
    };

    const hook = createFilterAvailableSkillsHook(mockCtx, config);
    const firstOutput = {
      messages: [
        {
          info: { role: 'system' },
          parts: [
            {
              type: 'text',
              text: availableSkillsBlock('skill1', 'skill2'),
            },
          ],
        },
        {
          info: { role: 'user', agent: 'researcher' },
          parts: [{ type: 'text', text: 'check skills' }],
        },
      ],
    };
    const secondOutput = {
      messages: [
        {
          info: { role: 'system' },
          parts: [
            {
              type: 'text',
              text: availableSkillsBlock('skill2', 'skill3'),
            },
          ],
        },
        {
          info: { role: 'user', agent: 'researcher' },
          parts: [{ type: 'text', text: 'check skills' }],
        },
      ],
    };

    await hook['experimental.chat.messages.transform']({}, firstOutput);
    await hook['experimental.chat.messages.transform']({}, secondOutput);

    expect(firstOutput.messages[0].parts[0].text).toContain(
      '<name>skill1</name>',
    );
    expect(firstOutput.messages[0].parts[0].text).not.toContain(
      '<name>skill3</name>',
    );
    expect(secondOutput.messages[0].parts[0].text).not.toContain(
      '<name>skill1</name>',
    );
    expect(secondOutput.messages[0].parts[0].text).toContain(
      '<name>skill3</name>',
    );
  });
});
