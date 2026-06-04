import type { Plugin } from '@opencode-ai/plugin';
import { createRuntimeTgoAgentConfigs } from './plugin/agents';
import { createTgoCommandConfigs } from './plugin/commands';
import { readActiveModelPresetFromGlobalManifest } from './plugin/runtime-models';

type PluginConfig = Parameters<
  NonNullable<Awaited<ReturnType<Plugin>>['config']>
>[0];

export function applyTgoPluginConfig(
  config: PluginConfig,
  options: { activeModelPreset?: string } = {},
): void {
  const tgoAgentConfigs = createRuntimeTgoAgentConfigs({
    config,
    activeModelPreset: options.activeModelPreset,
  }) as unknown as NonNullable<typeof config.agent>;

  config.agent = {
    ...config.agent,
    ...tgoAgentConfigs,
  };
  config.command = {
    ...config.command,
    ...createTgoCommandConfigs(),
  };
}

const plugin: Plugin = async (_ctx) => {
  return {
    async config(config) {
      applyTgoPluginConfig(config, {
        activeModelPreset: readActiveModelPresetFromGlobalManifest(),
      });
    },
  };
};

export default plugin;
