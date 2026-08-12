import * as fs from "node:fs/promises";
import * as path from "node:path";export interface PermissionRule {
  [pattern: string]: string;
}

export interface SeatPermission {
  edit?: string;
  grep?: string;
  glob?: string;
  list?: string;
  read?: string;
  bash?: string | PermissionRule;
  task?: string | PermissionRule;
  skill?: string | PermissionRule;
  webfetch?: string;
  websearch?: string;
  todowrite?: string;
  doom_loop?: string;
  [toolPrefix: string]: unknown;
}

export function parseFrontmatter(content: string): Record<string, unknown> {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const body = m[1];
  const root: Record<string, unknown> = {};
  const stack: Array<{ indent: number; node: Record<string, unknown> }> = [
    { indent: -1, node: root },
  ];

  const parseKey = (s: string): string => s.trim().replace(/^"(.*)"$/, "$1");
  const parseValue = (s: string): string => s.trim().replace(/^"(.*)"$/, "$1");

  for (const line of body.split("\n")) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    const indent = line.length - line.trimStart().length;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = parseKey(line.slice(0, idx));
    const raw = line.slice(idx + 1).trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].node;

    if (raw === "") {
      const child: Record<string, unknown> = {};
      parent[key] = child;
      stack.push({ indent, node: child });
    } else {
      parent[key] = parseValue(raw);
    }
  }
  return root;
}

export function parseSeatPermission(content: string): SeatPermission {
  const fm = parseFrontmatter(content);
  return (fm.permission ?? {}) as SeatPermission;
}

function hasCatchAllDeny(rule: string | PermissionRule | undefined): boolean {
  if (rule === "deny") return true;
  if (!rule || typeof rule === "string") return false;
  return rule["*"] === "deny";
}

function allowedPatterns(rule: string | PermissionRule | undefined): string[] {
  if (!rule || typeof rule === "string") return [];
  return Object.entries(rule)
    .filter(([k, v]) => k !== "*" && v === "allow")
    .map(([k]) => k);
}

export function denyList(seat: SeatPermission): string[] {
  return Object.entries(seat)
    .filter(([k, v]) => v === "deny" && k !== "todowrite")
    .map(([k]) => k);
}

export function allToolsDenied(seat: SeatPermission): boolean {
  return seat["*"] === "deny";
}

export function toolAllowPrefixes(seat: SeatPermission): string[] {
  return Object.entries(seat)
    .filter(([k, v]) => typeof v === "string" && v === "allow" && k.includes("*"))
    .map(([k]) => k);
}

export interface PermissionGraphReport {
  seat: string;
  editDenied: boolean;
  readAllowed: boolean;
  bashDenyAll: boolean;
  bashAllowed: string[];
  taskDenyAll: boolean;
  taskAllowed: string[];
  skillDenyAll: boolean;
  skillAllowed: string[];
  todowriteDenied: boolean;
  toolAllowPrefixes: string[];
  denyList: string[];
  allToolsDenied: boolean;
}

export function reportSeat(
  seat: string,
  content: string
): PermissionGraphReport {
  const p = parseSeatPermission(content);
  const allDenied = allToolsDenied(p);
  return {
    seat,
    editDenied: allDenied || p.edit === "deny",
    readAllowed: p.read === "allow",
    bashDenyAll: hasCatchAllDeny(p.bash),
    bashAllowed: allowedPatterns(p.bash),
    taskDenyAll: hasCatchAllDeny(p.task),
    taskAllowed: allowedPatterns(p.task),
    skillDenyAll: hasCatchAllDeny(p.skill),
    skillAllowed: allowedPatterns(p.skill),
    todowriteDenied: allDenied || p.todowrite === "deny",
    toolAllowPrefixes: toolAllowPrefixes(p),
    denyList: denyList(p),
    allToolsDenied: allDenied,
  };
}

export const GLOBAL_TODO_DENY_KEY = "todowrite";

export async function readSeatContent(
  agentsDir: string,
  seat: string
): Promise<string> {
  return fs.readFile(path.join(agentsDir, `${seat}.md`), "utf-8");
}

// Pre-approve external_directory reads for the project's worktree family
// (sibling worktrees under the same parent) so delegated sessions that
// legitimately inspect adjacent worktrees don't surface interactive permission
// prompts mid-orchestration (test-7 live finding tgo-5to). Mirrors Claude
// Code's additionalDirectories / opencode-fusion's permission-layer
// enforcement: extend the boundary so the loop runs unattended, keep
// everything outside the parent on the default ask. Returns the merged
// permission object (the original input is untouched).
//
// The worktree root passed here must come from the most reliable source
// available at plugin state init. In headless runs project.worktree resolves
// correctly, but in TUI runs it can resolve to the GLOBAL project (worktree
// "/") because the plugin factory may be invoked before the session's project
// is attached (test-9 finding: pre-approval silently no-op'd -> every sibling
// worktree access asked). PluginInput carries the instance's directory/worktree
// at the same init moment, which stays reliable. resolveWorktreeFamily() picks
// the first non-root candidate among the ones the caller can provide.
export function resolveWorktreeFamily(
  ...candidates: Array<string | undefined>
): string | undefined {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const parent = path.dirname(candidate);
    if (!parent || parent === "/" || parent === ".") continue;
    return candidate;
  }
  return undefined;
}

export function preapproveExternalDirectory(
  permission: Record<string, unknown> | undefined,
  worktree: string | undefined
): Record<string, unknown> {
  if (!worktree) return permission ?? {};
  const parent = path.dirname(worktree);
  if (!parent || parent === "/" || parent === ".") return permission ?? {};
  const existingExternal = (permission?.external_directory ?? {}) as Record<string, string>;
  return {
    ...(permission ?? {}),
    external_directory: {
      ...existingExternal,
      [`${parent}/*`]: "allow",
    },
  };
}
