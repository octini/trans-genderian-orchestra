import * as fs from "node:fs/promises";
import * as path from "node:path";

export const PROGRESS_LOCK_STALE_MS = 10_000;

export function progressPath(repoRoot: string, issueId: string): string {
  return path.join(repoRoot, ".tgo", issueId, "progress.md");
}

export async function readProgress(repoRoot: string, issueId: string): Promise<string | undefined> {
  try {
    const target = progressPath(repoRoot, issueId);
    const data = await fs.readFile(target, "utf-8");
    return data;
  } catch {
    return undefined;
  }
}

async function acquireProgressLock(issueDir: string, lockPath: string): Promise<string | null> {
  try {
    await fs.mkdir(issueDir, { recursive: true });
  } catch {}

  const ownerToken = `${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`;

  let acquired = false;

  const tryAcquire = async (): Promise<boolean> => {
    let handle: fs.FileHandle | undefined;
    try {
      handle = await fs.open(lockPath, "wx");
      try {
        await handle.writeFile(ownerToken, "utf-8");
      } catch {}
      acquired = true;
      return true;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code !== "EEXIST") {
        return false;
      }
      return false;
    } finally {
      if (handle) {
        try {
          await handle.close();
        } catch {}
      }
    }
  };

  let ok = await tryAcquire();
  if (!ok) {
    try {
      const stat = await fs.stat(lockPath);
      const age = Date.now() - stat.mtimeMs;
      if (age > PROGRESS_LOCK_STALE_MS) {
        try {
          await fs.unlink(lockPath);
        } catch {}
        ok = await tryAcquire();
        if (!ok) return null;
        acquired = true;
      } else {
        return null;
      }
    } catch {
      return null;
    }
  } else {
    acquired = true;
  }

  if (!acquired) return null;
  return ownerToken;
}

async function releaseProgressLock(lockPath: string, ownerToken: string): Promise<void> {
  try {
    const cur = await fs.readFile(lockPath, "utf-8");
    if (cur === ownerToken) {
      await fs.unlink(lockPath);
    }
  } catch {}
}

export async function writeProgress(repoRoot: string, issueId: string, content: string): Promise<boolean> {
  try {
    const issueDir = path.join(repoRoot, ".tgo", issueId);
    const lockPath = path.join(issueDir, "progress.lock");
    const targetPath = path.join(issueDir, "progress.md");

    const ownerToken = await acquireProgressLock(issueDir, lockPath);
    if (!ownerToken) return false;

    try {
      await fs.mkdir(issueDir, { recursive: true });
      const tmp = path.join(issueDir, `progress.md.${process.pid}.${Date.now()}.tmp`);
      await fs.writeFile(tmp, content, "utf-8");
      await fs.rename(tmp, targetPath);
      return true;
    } catch {
      return false;
    } finally {
      await releaseProgressLock(lockPath, ownerToken);
    }
  } catch {
    return false;
  }
}

export async function updateProgress(
  repoRoot: string,
  issueId: string,
  merge: (parts: ProgressParts) => ProgressParts,
): Promise<boolean> {
  try {
    const issueDir = path.join(repoRoot, ".tgo", issueId);
    const lockPath = path.join(issueDir, "progress.lock");
    const targetPath = path.join(issueDir, "progress.md");

    const ownerToken = await acquireProgressLock(issueDir, lockPath);
    if (!ownerToken) return false;

    try {
      let current: ProgressParts;
      try {
        const data = await fs.readFile(targetPath, "utf-8");
        current = parseProgress(data);
      } catch {
        current = { touchSet: [], decisions: [], blockers: [], extra: {} };
      }

      let next: ProgressParts;
      try {
        next = merge(current);
      } catch (err) {
        console.warn(`tgo: updateProgress merge failed: ${String(err)}`, { repoRoot, issueId });
        return false;
      }

      // Ensure extra defaults to current.extra for backward compat if merge omitted it
      if (!(next as any).extra) (next as any).extra = (current as any).extra ?? {};
      if (!Array.isArray(next.touchSet)) (next as any).touchSet = [];
      if (!Array.isArray(next.decisions)) (next as any).decisions = [];
      if (!Array.isArray(next.blockers)) (next as any).blockers = [];

      const content = formatProgress(next);
      try {
        await fs.mkdir(issueDir, { recursive: true });
        const tmp = path.join(issueDir, `progress.md.${process.pid}.${Date.now()}.tmp`);
        await fs.writeFile(tmp, content, "utf-8");
        await fs.rename(tmp, targetPath);
        return true;
      } catch {
        return false;
      }
    } finally {
      await releaseProgressLock(lockPath, ownerToken);
    }
  } catch {
    return false;
  }
}

export interface ProgressParts {
  objective?: string;
  touchSet: string[];
  decisions: string[];
  blockers: string[];
  lastStatus?: string;
  extra: Record<string, string[]>;
}

export function formatProgress(parts: ProgressParts): string {
  const lines: string[] = [];
  lines.push("## Objective");
  if (parts.objective !== undefined) {
    lines.push(parts.objective);
  }
  lines.push("## Touch set");
  for (const f of parts.touchSet) {
    lines.push(`- ${f}`);
  }
  lines.push("## Decisions");
  for (const d of parts.decisions) {
    lines.push(`- ${d}`);
  }
  lines.push("## Blockers");
  for (const b of parts.blockers) {
    lines.push(`- ${b}`);
  }
  lines.push("## Status");
  if (parts.lastStatus !== undefined) {
    lines.push(parts.lastStatus);
  }
  const extra: Record<string, string[]> = (parts as any).extra ?? {};
  for (const [name, items] of Object.entries(extra)) {
    lines.push(`## ${name}`);
    for (const it of items as string[]) {
      lines.push(it);
    }
  }
  return lines.join("\n") + "\n";
}

export function parseProgress(content: string): ProgressParts {
  const result: ProgressParts = {
    touchSet: [],
    decisions: [],
    blockers: [],
    extra: {},
  };

  const lines = content.split(/\r?\n/);
  let current: "objective" | "touchSet" | "decisions" | "blockers" | "status" | null = null;
  let currentExtra: string | null = null;
  const objectiveLines: string[] = [];
  const statusLines: string[] = [];

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("## ")) {
      const headerRaw = trimmed.slice(3).trim();
      const header = headerRaw.toLowerCase();
      if (header === "objective") {
        current = "objective";
        currentExtra = null;
      } else if (header === "touch set") {
        current = "touchSet";
        currentExtra = null;
      } else if (header === "decisions") {
        current = "decisions";
        currentExtra = null;
      } else if (header === "blockers") {
        current = "blockers";
        currentExtra = null;
      } else if (header === "status") {
        current = "status";
        currentExtra = null;
      } else {
        current = null;
        currentExtra = headerRaw;
        if (!(currentExtra in result.extra)) {
          result.extra[currentExtra] = [];
        }
      }
      continue;
    }

    if (currentExtra !== null) {
      result.extra[currentExtra].push(raw);
      continue;
    }

    if (current === null) continue;
    if (trimmed === "") continue;

    if (current === "objective") {
      objectiveLines.push(raw);
    } else if (current === "status") {
      statusLines.push(raw);
    } else if (current === "touchSet" || current === "decisions" || current === "blockers") {
      if (trimmed.startsWith("- ")) {
        const val = trimmed.slice(2);
        if (current === "touchSet") result.touchSet.push(val);
        else if (current === "decisions") result.decisions.push(val);
        else result.blockers.push(val);
      } else if (trimmed.startsWith("-")) {
        const val = trimmed.slice(1).trim();
        if (val.length > 0) {
          if (current === "touchSet") result.touchSet.push(val);
          else if (current === "decisions") result.decisions.push(val);
          else result.blockers.push(val);
        }
      }
    }
  }

  if (objectiveLines.length > 0) {
    const joined = objectiveLines.join("\n").trim();
    if (joined.length > 0) result.objective = joined;
  }
  if (statusLines.length > 0) {
    const joined = statusLines.join("\n").trim();
    if (joined.length > 0) result.lastStatus = joined;
  }

  for (const key of Object.keys(result.extra)) {
    const items = result.extra[key] ?? [];
    let start = 0;
    let end = items.length;
    while (start < end && items[start]!.trim() === "") start++;
    while (end > start && items[end - 1]!.trim() === "") end--;
    result.extra[key] = items.slice(start, end);
  }

  return result;
}
