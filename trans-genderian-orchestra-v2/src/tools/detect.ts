import type { CapabilityStatus } from '../commands/result';

export interface CommandDetector {
  which(command: string): Promise<string | undefined>;
}

export interface DetectedTool {
  name: 'git' | 'bd' | 'ctx7';
  status: 'user-managed' | 'missing';
  path?: string;
}

export interface ToolDetectionResult {
  tools: DetectedTool[];
  blocked: CapabilityStatus[];
  degraded: CapabilityStatus[];
}

async function detectTool(
  detector: CommandDetector,
  name: DetectedTool['name'],
): Promise<DetectedTool> {
  const path = await detector.which(name);
  return path ? { name, status: 'user-managed', path } : { name, status: 'missing' };
}

export async function detectRequiredTools(
  detector: CommandDetector,
): Promise<ToolDetectionResult> {
  const tools = await Promise.all([
    detectTool(detector, 'git'),
    detectTool(detector, 'bd'),
    detectTool(detector, 'ctx7'),
  ]);

  const blocked: CapabilityStatus[] = [];
  const degraded: CapabilityStatus[] = [];

  if (tools.find((tool) => tool.name === 'bd')?.status === 'missing') {
    blocked.push({
      capability: 'beads',
      reason: 'Beads CLI is missing.',
      repair_command: 'brew install beads or npm install -g @beads/bd',
    });
  }

  if (tools.find((tool) => tool.name === 'ctx7')?.status === 'missing') {
    degraded.push({
      capability: 'context7-cli',
      reason: 'Context7 CLI is missing.',
      repair_command: 'npx ctx7 setup --opencode',
    });
  }

  return { tools, blocked, degraded };
}
