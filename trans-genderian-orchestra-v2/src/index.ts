import type { Plugin } from '@opencode-ai/plugin';

const plugin: Plugin = async (_ctx) => {
  return {
    async config(config) {
      config.agent = {
        ...config.agent,
        'tgo-orchestrator': {
          description:
            'TGO Orchestrator: technical lead, phase controller, and workflow router.',
          mode: 'primary',
          prompt:
            'You are the TGO v2 Orchestrator. Phase 1 only registers the agent shell; full workflow behavior is implemented in later phases.',
        },
      };
      config.command = {
        ...config.command,
        'tgo:doctor': {
          description: 'Inspect TGO v2 setup state and report repairs.',
          template:
            'Run the deterministic TGO doctor workflow. In Phase 1, use the external CLI doctor command for authoritative checks.',
        },
      };
    },
  };
};

export default plugin;
