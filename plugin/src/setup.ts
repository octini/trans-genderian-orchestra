import * as fs from "node:fs/promises";
import * as path from "node:path";
import { AGENTS_MARKER_BEGIN, AGENTS_MARKER_END, mergeAgentsFragment } from "./build";

export type SetupResult =
  | { action: "already-set-up" }
  | { action: "completed"; steps: string[] }
  | { action: "no-bd" }
  | { action: "failed"; error: string };

export interface SetupControllerOptions {
  run: (command: string, cwd?: string) => Promise<string>;
  hasBd: () => Promise<boolean>;
  installBd?: () => Promise<void>;
}

export class SetupController {
  private readonly run: SetupControllerOptions["run"];
  private readonly hasBd: SetupControllerOptions["hasBd"];
  private readonly installBd: SetupControllerOptions["installBd"];
  private readonly attempted = new Set<string>();

  constructor(opts: SetupControllerOptions) {
    this.run = opts.run;
    this.hasBd = opts.hasBd;
    this.installBd = opts.installBd;
  }

  private async readAgents(directory: string): Promise<string> {
    try {
      return await fs.readFile(path.join(directory, "AGENTS.md"), "utf-8");
    } catch {
      return "";
    }
  }

  private async missingSteps(directory: string): Promise<string[]> {
    const steps: string[] = [];
    try {
      await fs.access(path.join(directory, ".beads"));
    } catch {
      // `bd init` on an existing store exits 1 ("Aborting.") but is safe; still,
      // never re-run it when the store is already present.
      steps.push("bd init");
    }
    const agents = await this.readAgents(directory);
    const hasBeadsBlock = agents.includes("BEGIN BEADS INTEGRATION");
    if (!hasBeadsBlock) steps.push("bd setup opencode");
    const hasTgoFragment =
      agents.includes(AGENTS_MARKER_BEGIN) && agents.includes(AGENTS_MARKER_END);
    if (!hasTgoFragment) steps.push("AGENTS fragment");
    return steps;
  }

  async needsSetup(directory: string): Promise<boolean> {
    return (await this.missingSteps(directory)).length > 0;
  }

  async maybeSetup(directory: string): Promise<SetupResult> {
    if (!directory) return { action: "failed", error: "no directory" };
    if (this.attempted.has(directory)) return { action: "already-set-up" };

    if (!(await this.needsSetup(directory))) {
      this.attempted.add(directory);
      return { action: "already-set-up" };
    }

    if (!(await this.hasBd())) {
      if (this.installBd) {
        try {
          await this.installBd();
        } catch (error) {
          return { action: "failed", error: `bd install failed: ${String(error)}` };
        }
      }
      if (!(await this.hasBd())) {
        this.attempted.add(directory);
        return { action: "no-bd" };
      }
    }

    const steps: string[] = [];
    const missing = await this.missingSteps(directory);
    try {
      for (const step of missing) {
        if (step === "bd init" || step === "bd setup opencode") {
          await this.run(step, directory);
        } else if (step === "AGENTS fragment") {
          await mergeAgentsFragment(directory);
        }
        steps.push(step);
      }
    } catch (error) {
      return { action: "failed", error: String(error) };
    }
    this.attempted.add(directory);
    return { action: "completed", steps };
  }
}
