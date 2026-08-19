import type { BdRunner } from "./board";

export type BeadsTuiStatus = "ready" | "open" | "pending" | "in_progress" | "blocked";

export interface BeadsTuiIssue {
  id: string;
  title: string;
  status: BeadsTuiStatus;
  priority: number | string;
  assignee: string;
  blockedBy: string[];
  dependencies: string[];
}

export type BeadsTuiSnapshot =
  | { state: "unavailable"; message: string }
  | { state: "empty"; issues: [] }
  | { state: "ready"; issues: BeadsTuiIssue[] };

const COMMANDS = {
  inProgress: "bd list --status in_progress --json",
  open: "bd list --status open --json",
  pending: "bd list --status pending --json",
  ready: "bd ready --json",
  blocked: "bd blocked --json",
} as const;

type RawIssue = Record<string, unknown>;

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string" || typeof item === "number") return [String(item)];
    if (item && typeof item === "object") {
      const record = item as RawIssue;
      const id = record.id ?? record.issue_id ?? record.depends_on;
      return typeof id === "string" || typeof id === "number" ? [String(id)] : [];
    }
    return [];
  });
}

function arrayField(issue: RawIssue, ...names: string[]): string[] {
  for (const name of names) {
    const value = strings(issue[name]);
    if (value.length) return value;
  }
  return [];
}

function parse(raw: string): { issues: RawIssue[]; malformed: boolean } {
  if (!raw.trim()) return { issues: [], malformed: false };
  try {
    const value: unknown = JSON.parse(raw);
    if (Array.isArray(value)) return { issues: value.filter((item): item is RawIssue => !!item && typeof item === "object"), malformed: false };
    if (value && typeof value === "object") {
      const record = value as RawIssue;
      for (const key of ["issues", "data", "results"]) {
        if (Array.isArray(record[key])) {
          return { issues: record[key].filter((item): item is RawIssue => !!item && typeof item === "object"), malformed: false };
        }
      }
    }
  } catch {
    return { issues: [], malformed: true };
  }
  return { issues: [], malformed: true };
}

function normalize(raw: RawIssue, status: BeadsTuiStatus): BeadsTuiIssue | undefined {
  const id = raw.id ?? raw.issue_id;
  if (typeof id !== "string" && typeof id !== "number") return undefined;
  const title = typeof raw.title === "string" ? raw.title : "(untitled)";
  const priority = typeof raw.priority === "number" || typeof raw.priority === "string" ? raw.priority : "-";
  const assigneeValue = raw.assignee ?? raw.assigned_to;
  const assignee = typeof assigneeValue === "string" ? assigneeValue : "-";
  return {
    id: String(id),
    title,
    status,
    priority,
    assignee,
    blockedBy: arrayField(raw, "blocked_by", "blockedBy", "blocked-by"),
    dependencies: arrayField(raw, "dependencies", "depends_on", "dependsOn", "dependency_edges"),
  };
}

export async function loadBeadsTui(run: BdRunner): Promise<BeadsTuiSnapshot> {
  try {
    const entries = await Promise.all(Object.entries(COMMANDS).map(async ([key, command]) => [key, await run(command)] as const));
    if (entries.every(([, raw]) => !raw.trim())) {
      return { state: "unavailable", message: "Beads snapshot unavailable: bd returned no data" };
    }
    const issues = new Map<string, BeadsTuiIssue>();
    const statuses: Record<string, BeadsTuiStatus> = { inProgress: "in_progress", open: "open", pending: "pending", ready: "ready", blocked: "blocked" };
    for (const [key, raw] of entries) {
      const parsed = parse(raw);
      if (parsed.malformed) {
        return { state: "unavailable", message: `Beads snapshot unavailable: ${key} returned non-empty invalid JSON` };
      }
      for (const item of parsed.issues) {
        const issue = normalize(item, statuses[key]);
        if (!issue) continue;
        const existing = issues.get(issue.id);
        if (!existing) {
          issues.set(issue.id, issue);
          continue;
        }
        const statusRank: Record<BeadsTuiStatus, number> = { ready: 1, open: 2, pending: 3, in_progress: 4, blocked: 5 };
        issues.set(issue.id, {
          ...existing,
          title: existing.title === "(untitled)" ? issue.title : existing.title,
          priority: existing.priority === "-" ? issue.priority : existing.priority,
          assignee: existing.assignee === "-" ? issue.assignee : existing.assignee,
          status: statusRank[issue.status] > statusRank[existing.status] ? issue.status : existing.status,
          blockedBy: [...new Set([...existing.blockedBy, ...issue.blockedBy])].sort(),
          dependencies: [...new Set([...existing.dependencies, ...issue.dependencies])].sort(),
        });
      }
    }
    const rows = [...issues.values()].sort((a, b) => a.id.localeCompare(b.id));
    return rows.length ? { state: "ready", issues: rows } : { state: "empty", issues: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : "bd runner failed";
    return { state: "unavailable", message: `Beads snapshot unavailable: ${message}` };
  }
}

function clip(value: string, width: number): string {
  return value.length > width ? `${value.slice(0, width - 1)}…` : value;
}

function cell(value: string, width: number): string {
  return clip(value, width).padEnd(width);
}

export function renderBeadsTui(snapshot: BeadsTuiSnapshot): string {
  if (snapshot.state === "unavailable") return `BEADS SNAPSHOT UNAVAILABLE\n${snapshot.message}`;
  if (snapshot.state === "empty") return "BEADS SNAPSHOT\nNo ready, open, pending, in_progress, or blocked work.";
  const header = [cell("ID", 14), cell("TITLE", 32), cell("STATUS", 11), cell("PRIORITY", 8), cell("ASSIGNEE", 16), "EDGES"].join(" | ");
  const rows = snapshot.issues.map((issue) => {
    const edges = [issue.blockedBy.length ? `blocked-by: ${issue.blockedBy.join(",")}` : "", issue.dependencies.length ? `depends-on: ${issue.dependencies.join(",")}` : ""].filter(Boolean).join("; ") || "-";
    return [cell(issue.id, 14), cell(issue.title, 32), cell(issue.status, 11), cell(String(issue.priority), 8), cell(issue.assignee, 16), edges].join(" | ");
  });
  return ["BEADS SNAPSHOT", header, "-".repeat(header.length), ...rows].join("\n");
}

export { COMMANDS as BEADS_TUI_COMMANDS };
