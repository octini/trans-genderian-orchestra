import * as fs from "node:fs/promises";
import * as path from "node:path";
import { safeWarn } from "./config";
import { renderSeats, type Register } from "./build";

function parseSteps(content: string): string | null {
  const m = content.match(/^\s*steps:\s*(\d+)/m);
  return m ? m[1] : null;
}

export async function reconcileSeats(
  assetsAgentsDir: string,
  installedAgentsDir: string,
  log?: (level: "warn" | "info" | "error", message: string, extra?: Record<string, unknown>) => void,
  register: Register = "concise"
): Promise<string[]> {
  const summary: string[] = [];
  let renderedSeats: Array<{ fileName: string; content: string }>;
  try {
    renderedSeats = await renderSeats(assetsAgentsDir, register);
  } catch (err) {
    safeWarn(log, "tgo: seat sync render failed", { assetsAgentsDir, error: String(err) });
    return summary;
  }

  if (renderedSeats.length === 0) {
    // renderSeats handles readdir failure internally with console.warn; treat empty as nothing to reconcile
    // but also check if assets dir was unreadable: ensure we don't silently succeed — still return empty
    try {
      await fs.readdir(assetsAgentsDir);
    } catch (err) {
      safeWarn(log, "tgo: seat sync readdir failed", { assetsAgentsDir, error: String(err) });
    }
    if (renderedSeats.length === 0) return summary;
  }

  for (const seat of renderedSeats) {
    const file = seat.fileName;
    const expectedContent = seat.content;
    const seatName = path.basename(file, ".md");
    const installedPath = path.join(installedAgentsDir, file);

    let installedContent: string | undefined;
    let installedExists = false;
    try {
      installedContent = await fs.readFile(installedPath, "utf-8");
      installedExists = true;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === "ENOENT") {
        installedExists = false;
        installedContent = undefined;
      } else {
        safeWarn(log, "tgo: seat sync read installed failed", { file, error: String(err) });
        continue;
      }
    }

    if (installedExists && installedContent === expectedContent) {
      continue;
    }

    try {
      await fs.mkdir(installedAgentsDir, { recursive: true });
    } catch (err) {
      safeWarn(log, "tgo: seat sync mkdir failed", { installedAgentsDir, error: String(err) });
      continue;
    }

    if (installedExists && installedContent !== undefined) {
      try {
        await fs.writeFile(`${installedPath}.bak`, installedContent, "utf-8");
      } catch (err) {
        safeWarn(log, "tgo: seat sync backup failed", { file, error: String(err) });
        continue;
      }
    }

    const tmp = path.join(installedAgentsDir, `.${file}.${process.pid}.${Date.now()}.tmp`);
    try {
      await fs.writeFile(tmp, expectedContent, "utf-8");
      await fs.rename(tmp, installedPath);
    } catch (err) {
      safeWarn(log, "tgo: seat sync write failed", { file, error: String(err) });
      try {
        await fs.rm(tmp, { force: true });
      } catch {}
      continue;
    }

    const oldSteps = installedContent ? parseSteps(installedContent) : null;
    const newSteps = parseSteps(expectedContent);
    let change: string;
    if (!installedExists) {
      if (newSteps) change = `steps →${newSteps}`;
      else change = "created";
    } else if (oldSteps && newSteps && oldSteps !== newSteps) {
      change = `steps ${oldSteps}→${newSteps}`;
    } else if (oldSteps && newSteps && oldSteps === newSteps) {
      change = "updated";
    } else {
      change = "updated";
    }

    summary.push(`${seatName} (${change})`);
  }

  return summary;
}
