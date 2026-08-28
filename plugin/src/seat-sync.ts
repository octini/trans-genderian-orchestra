import * as fs from "node:fs/promises";
import * as path from "node:path";
import { safeWarn } from "./config";

function parseSteps(content: string): string | null {
  const m = content.match(/^\s*steps:\s*(\d+)/m);
  return m ? m[1] : null;
}

export async function reconcileSeats(
  assetsAgentsDir: string,
  installedAgentsDir: string,
  log?: (level: "warn" | "info" | "error", message: string, extra?: Record<string, unknown>) => void
): Promise<string[]> {
  const summary: string[] = [];
  let files: string[];
  try {
    files = await fs.readdir(assetsAgentsDir);
  } catch (err) {
    safeWarn(log, "tgo: seat sync readdir failed", { assetsAgentsDir, error: String(err) });
    return summary;
  }

  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const seatName = path.basename(file, ".md");
    const assetPath = path.join(assetsAgentsDir, file);
    const installedPath = path.join(installedAgentsDir, file);

    let assetContent: string;
    try {
      assetContent = await fs.readFile(assetPath, "utf-8");
    } catch (err) {
      safeWarn(log, "tgo: seat sync read asset failed", { file, error: String(err) });
      continue;
    }

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

    if (installedExists && installedContent === assetContent) {
      continue;
    }

    // need to write: ensure installed dir exists
    try {
      await fs.mkdir(installedAgentsDir, { recursive: true });
    } catch (err) {
      safeWarn(log, "tgo: seat sync mkdir failed", { installedAgentsDir, error: String(err) });
      continue;
    }

    // backup previous content if it existed
    if (installedExists && installedContent !== undefined) {
      try {
        await fs.writeFile(`${installedPath}.bak`, installedContent, "utf-8");
      } catch (err) {
        safeWarn(log, "tgo: seat sync backup failed", { file, error: String(err) });
        // continue to still try to write the new content? If backup fails we still attempt write, but don't add to summary if write fails
      }
    }

    try {
      await fs.writeFile(installedPath, assetContent, "utf-8");
    } catch (err) {
      safeWarn(log, "tgo: seat sync write failed", { file, error: String(err) });
      continue;
    }

    const oldSteps = installedContent ? parseSteps(installedContent) : null;
    const newSteps = parseSteps(assetContent);
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

    // format as spec example "dylan (steps 20→100)" — use parentheses
    summary.push(`${seatName} (${change})`);
  }

  return summary;
}
