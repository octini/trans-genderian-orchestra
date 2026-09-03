import { safeWarn } from "./config";
import { loadVoiceCard as loadVoiceCardFromVoices, renderInstruction, renderStyleOverride, estimateVoiceTokens, type VoiceCard } from "./voices";

export async function loadVoiceCard(cardId = "default"): Promise<VoiceCard> {
  return loadVoiceCardFromVoices(cardId);
}

export async function buildVoiceInstruction(cardId = "default"): Promise<string> {
  const card = await loadVoiceCard(cardId);
  return renderInstruction(card);
}

export async function buildVoiceOverride(cardId: string): Promise<string> {
  const card = await loadVoiceCard(cardId);
  const override = renderStyleOverride(card);
  if (override) {
    const tokens = estimateVoiceTokens(override);
    if (tokens > 200) throw new Error(`voice override for ${cardId} exceeds 200 tokens: ${tokens}`);
  }
  return override;
}

export async function buildLayeredInstructions(effectiveCardId = "default"): Promise<string[]> {
  const defaultInstruction = await buildVoiceInstruction("default");
  const normalized = effectiveCardId.startsWith("tgo-") ? effectiveCardId : `tgo-${effectiveCardId}`;
  if (normalized === "tgo-default") return [defaultInstruction];
  const override = await buildVoiceOverride(effectiveCardId);
  return override ? [defaultInstruction, override] : [defaultInstruction];
}

export interface SessionClient {
  session: {
    get(options: { path: { id: string } }): Promise<{ data?: { parentID?: string | null } }>;
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
  private cardId: string;
  private readonly primaryCache = new Map<string, boolean>();
  private instruction: string | undefined;
  private defaultInstruction: string | undefined;
  private overrideInstruction: string | undefined;
  private overrideCardId: string | undefined;
  private readonly log?: (level: "warn" | "info" | "error", message: string, extra?: Record<string, unknown>) => void;

  constructor(opts: { enabled?: boolean; cardId?: string; register?: string; log?: (level: "warn" | "info" | "error", message: string, extra?: Record<string, unknown>) => void }) {
    this.enabled = opts.enabled ?? DEFAULT_CONCISION_ENABLED;
    const legacy = (opts as { register?: string }).register;
    if (opts.cardId !== undefined) this.cardId = opts.cardId;
    else if (typeof legacy === "string" && (["default", "prose", "conversational"] as const).includes(legacy as unknown as "default")) this.cardId = legacy;
    else if (typeof legacy === "string") this.cardId = "default";
    else this.cardId = "default";
    this.log = opts.log;
  }

  async buildInstruction(): Promise<string> {
    this.instruction ??= await buildVoiceInstruction(this.cardId);
    return this.instruction;
  }

  async buildDefaultInstruction(): Promise<string> {
    this.defaultInstruction ??= await buildVoiceInstruction("default");
    return this.defaultInstruction;
  }

  async buildOverrideInstruction(): Promise<string | undefined> {
    const normalized = this.cardId.startsWith("tgo-") ? this.cardId : `tgo-${this.cardId}`;
    if (normalized === "tgo-default") return undefined;
    if (this.overrideCardId === this.cardId && this.overrideInstruction !== undefined) return this.overrideInstruction;
    const ov = await buildVoiceOverride(this.cardId);
    this.overrideCardId = this.cardId;
    this.overrideInstruction = ov || undefined;
    return this.overrideInstruction;
  }

  private async isPrimary(
    client: SessionClient,
    sessionID: string
  ): Promise<boolean> {
    const cached = this.primaryCache.get(sessionID);
    if (cached !== undefined) return cached;
    const res = await client.session.get({ path: { id: sessionID } }).catch((err) => {
      const msg = "tgo: concision isPrimary session.get failed";
      if (this.log) safeWarn(this.log, msg, { sessionID, error: String(err) });
      else console.warn(`${msg}: ${String(err)}`, { sessionID });
      return undefined;
    });
    const data = res?.data;
    const primary = Boolean(
      data && Object.prototype.hasOwnProperty.call(data, "parentID") && data.parentID === null
    );
    this.primaryCache.set(sessionID, primary);
    return primary;
  }

  reset(): void {
    this.primaryCache.clear();
    this.instruction = undefined;
    this.defaultInstruction = undefined;
    this.overrideInstruction = undefined;
    this.overrideCardId = undefined;
  }

  async transform(
    client: SessionClient,
    input: SystemTransformInput,
    output: SystemTransformOutput
  ): Promise<boolean> {
    if (!this.enabled) return false;
    if (!input.sessionID) return false;
    if (!(await this.isPrimary(client, input.sessionID))) return false;

    // Layered injection: default always, plus override when named card active
    const defaultInstruction = await this.buildDefaultInstruction();
    if (defaultInstruction) output.system.push(defaultInstruction);
    const override = await this.buildOverrideInstruction();
    if (override) output.system.push(override);
    return true;
  }
}
