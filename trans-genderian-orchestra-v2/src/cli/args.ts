export type CliArgs =
  | {
      command: 'bootstrap';
      dryRun: boolean;
      yes: boolean;
      json: boolean;
      tools: string;
      models: string;
      resilience: string;
    }
  | { command: 'doctor'; json: boolean }
  | { command: 'help' };

function valueAfter(args: string[], flag: string, fallback: string): string {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : (args[index + 1] ?? fallback);
}

export function parseCliArgs(args: string[]): CliArgs {
  const command = args[0] ?? 'help';
  if (command === 'bootstrap') {
    return {
      command: 'bootstrap',
      dryRun: args.includes('--dry-run') || !args.includes('--yes'),
      yes: args.includes('--yes'),
      json: args.includes('--json'),
      tools: valueAfter(args, '--tools', 'default'),
      models: valueAfter(args, '--models', 'balanced'),
      resilience: valueAfter(args, '--resilience', 'balanced'),
    };
  }
  if (command === 'doctor') {
    return { command: 'doctor', json: args.includes('--json') };
  }
  return { command: 'help' };
}
