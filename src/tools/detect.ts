import type { CapabilityStatus } from '../commands/result';
import { createToolPresetPlan, type ToolPresetName } from './presets';

export interface CommandDetector {
  which(command: string): Promise<string | undefined>;
}

export interface DetectedTool {
  name: 'git' | 'bd' | 'ctx7' | 'gh' | 'uvx' | 'aft';
  status: 'user-managed' | 'missing';
  path?: string;
}

export interface ToolDetectionResult {
  tools: DetectedTool[];
  blocked: CapabilityStatus[];
  degraded: CapabilityStatus[];
}

export interface ToolDetectionOptions {
  aftPluginConfigured?: boolean;
}

async function detectTool(
  detector: CommandDetector,
  name: DetectedTool['name'],
): Promise<DetectedTool> {
  const path = await detector.which(name);
  return path
    ? { name, status: 'user-managed', path }
    : { name, status: 'missing' };
}

function missingTool(
  tools: DetectedTool[],
  name: DetectedTool['name'],
): boolean {
  return tools.find((tool) => tool.name === name)?.status === 'missing';
}

export async function detectPresetTools(
  preset: ToolPresetName,
  detector: CommandDetector,
  options: ToolDetectionOptions = {},
): Promise<ToolDetectionResult> {
  const plan = createToolPresetPlan(preset);
  const cliTools = await Promise.all(
    plan.required_cli_tools.map((tool) => detectTool(detector, tool.name)),
  );
  const tools =
    preset === 'bare-bones'
      ? cliTools
      : [
          ...cliTools,
          await detectTool(detector, 'aft').then(
            (aftTool): DetectedTool =>
              aftTool.status === 'missing' && options.aftPluginConfigured
                ? {
                    name: 'aft',
                    status: 'user-managed',
                    path: 'opencode-plugin:@cortexkit/aft-opencode',
                  }
                : aftTool,
          ),
        ];

  const blocked: CapabilityStatus[] = [];
  const degraded: CapabilityStatus[] = [];

  for (const required of plan.required_cli_tools) {
    if (!missingTool(tools, required.name)) {
      continue;
    }
    const status = {
      capability: required.capability,
      reason:
        required.name === 'ctx7'
          ? 'Context7 CLI is missing.'
          : required.name === 'bd'
            ? 'Beads CLI is missing.'
            : `${required.capability} is missing.`,
      repair_command: required.repair_command,
    };
    if (required.missing_status === 'blocked') {
      blocked.push(status);
    } else {
      degraded.push(status);
    }
  }

  if (preset !== 'bare-bones' && missingTool(tools, 'aft')) {
    degraded.unshift({
      capability: 'aft',
      reason: 'AFT peer plugin is not detectable in the current environment.',
      repair_command:
        'Run bootstrap/setup with the default tools preset after reviewing the preview.',
    });
  }

  return { tools, blocked, degraded };
}

export async function detectRequiredTools(
  detector: CommandDetector,
): Promise<ToolDetectionResult> {
  return detectPresetTools('default', detector);
}
