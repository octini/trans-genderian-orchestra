import type { Plugin } from '@opencode-ai/plugin';
import { createTgoAgentConfigs } from './plugin/agents';
import { createTgoCommandConfigs } from './plugin/commands';

const plugin: Plugin = async (_ctx) => {
  return {
    async config(config) {
      const tgoAgentConfigs = createTgoAgentConfigs() as unknown as NonNullable<
        typeof config.agent
      >;

      config.agent = {
        ...config.agent,
        ...tgoAgentConfigs,
      };
      config.command = {
        ...config.command,
        ...createTgoCommandConfigs(),
      };
    },
  };
};

export default plugin;
