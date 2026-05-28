/**
 * Context file management for the Dispatcher plugin.
 * The orchestrator maintains state.md, plan.md, notes.md, and handoff.md
 * for cross-agent coordination.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/** Paths relative to project root for context files */
export const CONTEXT_FILE_PATHS = {
  state: '.opencode/state.md',
  plan: '.opencode/plans/plan.md',
  notes: '.opencode/notes.md',
  handoff: '.opencode/handoff.md',
} as const;

export type ContextFileName = keyof typeof CONTEXT_FILE_PATHS;

/**
 * Ensure the context file directory exists.
 */
function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Read a context file. Returns empty string if not found.
 */
export function readContextFile(
  projectRoot: string,
  name: ContextFileName,
): string {
  const filePath = path.join(projectRoot, CONTEXT_FILE_PATHS[name]);
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * Write a context file, creating directories if needed.
 */
export function writeContextFile(
  projectRoot: string,
  name: ContextFileName,
  content: string,
): void {
  const filePath = path.join(projectRoot, CONTEXT_FILE_PATHS[name]);
  ensureDir(filePath);
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Append content to a context file, creating it if needed.
 */
export function appendContextFile(
  projectRoot: string,
  name: ContextFileName,
  content: string,
): void {
  const existing = readContextFile(projectRoot, name);
  writeContextFile(projectRoot, name, `${existing}\n${content}`.trimStart());
}

// ── state.md helpers ─────────────────────────────────────────────

export interface StateDocument {
  currentStream: string;
  activeSessions: Array<{
    sessionId: string;
    agent: string;
    task: string;
    status: 'running' | 'completed' | 'error';
    startedAt: string;
  }>;
  recentDelegations: Array<{
    timestamp: string;
    agent: string;
    task: string;
    status: string;
  }>;
}

const STATE_TEMPLATE = `# Dispatcher State

## Current Stream
{{currentStream}}

## Active Sessions
{{activeSessions}}

## Recent Delegations
{{recentDelegations}}
`;

/**
 * Format a state document as Markdown.
 */
export function formatStateDocument(doc: StateDocument): string {
  const sessionsSection =
    doc.activeSessions.length === 0
      ? '_No active sessions._'
      : doc.activeSessions
          .map(
            (session) =>
              `- **${session.agent}**: ${session.task} (${session.status}) — session \`${session.sessionId}\``,
          )
          .join('\n');

  const delegationsSection =
    doc.recentDelegations.length === 0
      ? '_No recent delegations._'
      : doc.recentDelegations
          .slice(0, 10)
          .map(
            (delegation) =>
              `- ${delegation.timestamp} — @${delegation.agent}: ${delegation.task} — ${delegation.status}`,
          )
          .join('\n');

  return STATE_TEMPLATE.replace('{{currentStream}}', doc.currentStream)
    .replace('{{activeSessions}}', sessionsSection)
    .replace('{{recentDelegations}}', delegationsSection);
}

// ── plan.md helpers ──────────────────────────────────────────────

export interface PlanStep {
  id: string;
  description: string;
  acceptance_criteria: string[];
  agent_to_delegate: string;
  estimated_difficulty: 'easy' | 'medium' | 'hard';
  dependencies: string[];
  risk_tier: 'low' | 'medium' | 'high' | 'critical';
}

export interface Plan {
  title: string;
  description: string;
  status: 'draft' | 'approved' | 'rejected' | 'executing' | 'completed';
  steps: PlanStep[];
}

/**
 * Format a plan as Markdown for plan.md.
 */
export function formatPlan(plan: Plan): string {
  const status = plan.status ?? 'draft';
  const steps = plan.steps
    .map((step, index) =>
      [
        `### Step ${index + 1}: ${step.id}`,
        `**Description:** ${step.description}`,
        `**Agent:** @${step.agent_to_delegate}`,
        `**Difficulty:** ${step.estimated_difficulty}`,
        `**Risk:** ${step.risk_tier}`,
        step.dependencies.length > 0
          ? `**Depends on:** ${step.dependencies.join(', ')}`
          : '',
        '**Acceptance Criteria:**',
        ...step.acceptance_criteria.map((criterion) => `- ${criterion}`),
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');

  return [
    `# Plan: ${plan.title}`,
    '',
    `**Status:** ${status}`,
    '',
    plan.description,
    '',
    '---',
    '',
    steps,
  ].join('\n');
}

// ── handoff.md helpers ───────────────────────────────────────────

/**
 * Format a handoff report as Markdown.
 */
export function formatHandoff(params: {
  fromAgent: string;
  toAgent: string;
  reason: string;
  context: string;
  unresolvedIssues?: string[];
}): string {
  const issues = params.unresolvedIssues?.length
    ? `\n\n**Unresolved Issues:**\n${params.unresolvedIssues
        .map((issue) => `- ${issue}`)
        .join('\n')}`
    : '';

  return [
    `# Handoff: @${params.fromAgent} → @${params.toAgent}`,
    '',
    `**Reason:** ${params.reason}`,
    '',
    `**Context:** ${params.context}`,
    issues,
  ].join('\n');
}
