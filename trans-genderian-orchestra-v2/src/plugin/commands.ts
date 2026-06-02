export interface TgoCommandConfig {
  description: string;
  template: string;
}

export function createTgoCommandConfigs(): Record<string, TgoCommandConfig> {
  return {
    'tgo:doctor': {
      description: 'Inspect TGO v2 setup state and report repairs.',
      template:
        'Run the deterministic TGO doctor workflow. Use --json when structured output is needed.',
    },
    'tgo:setup': {
      description:
        'Change TGO v2 setup, presets, managed tools, or repair state with preview.',
      template:
        'Run the deterministic TGO setup workflow with preview before config mutation.',
    },
    'tgo:init': {
      description:
        'Initialize TGO v2 project-local Beads, guidance, validation, and artifact scaffolding.',
      template:
        'Run the TGO project initialization workflow with preview and backups.',
    },
    'tgo:work': {
      description:
        'Start or continue approved TGO-managed implementation work.',
      template:
        'Route the request through TGO work intent, goal confirmation, Builder, Reviewer, and artifacts.',
    },
    'tgo:models': {
      description: 'Switch or inspect TGO v2 model lineup presets.',
      template:
        'Inspect or switch TGO model presets without changing tool or resilience presets.',
    },
    init: {
      description: 'Compatibility alias for /tgo:init.',
      template: 'Route this compatibility alias to /tgo:init.',
    },
    'beads:init': {
      description:
        'Compatibility alias for Beads project initialization through /tgo:init.',
      template:
        'Run the Beads initialization portion of TGO project init using the real bd init flow.',
    },
    preset: {
      description:
        'Compatibility alias for model preset switching through /tgo:models.',
      template: 'Route this compatibility alias to /tgo:models.',
    },
  };
}
