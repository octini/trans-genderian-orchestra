import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { REGISTER_SLOT, type Register } from "./build";

export { REGISTER_SLOT };

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

export async function loadConcisionInstruction(): Promise<string> {
  const file = path.join(packageRoot, "assets", "concision-instruction.md");
  return fs.readFile(file, "utf-8");
}

export async function buildConcisionInstruction(
  register: Register = "concise"
): Promise<string> {
  const template = await loadConcisionInstruction();
  return template.replace(new RegExp(REGISTER_SLOT, "g"), register);
}

export interface SessionClient {
  session: {
    get(options: { path: { id: string } }): Promise<{ data?: { parentID?: string } }>;
  };
}

export interface SystemTransformInput {
  sessionID?: string;
}

export interface SystemTransformOutput {
  system: string[];
}

export const DEFAULT_CONCISION_ENABLED = true;

export class ConcisionController {
  private readonly enabled: boolean;
  private readonly register: Register;
  private readonly primaryCache = new Map<string, boolean>();
  private instruction: string | undefined;

  constructor(opts: { enabled?: boolean; register?: Register }) {
    this.enabled = opts.enabled ?? DEFAULT_CONCISION_ENABLED;
    this.register = opts.register ?? "concise";
  }

  async buildInstruction(): Promise<string> {
    this.instruction ??= await buildConcisionInstruction(this.register);
    return this.instruction;
  }

  private async isPrimary(
    client: SessionClient,
    sessionID: string
  ): Promise<boolean> {
    const cached = this.primaryCache.get(sessionID);
    if (cached !== undefined) return cached;
    const res = await client.session.get({ path: { id: sessionID } }).catch(() => undefined);
    const primary = !res?.data?.parentID;
    this.primaryCache.set(sessionID, primary);
    return primary;
  }

  reset(): void {
    this.primaryCache.clear();
    this.instruction = undefined;
  }

  async transform(
    client: SessionClient,
    input: SystemTransformInput,
    output: SystemTransformOutput
  ): Promise<boolean> {
    if (!this.enabled) return false;
    if (!input.sessionID) return false;
    if (!(await this.isPrimary(client, input.sessionID))) return false;

    const instruction = await this.buildInstruction();
    if (instruction) output.system.push(instruction);
    return true;
  }
}
