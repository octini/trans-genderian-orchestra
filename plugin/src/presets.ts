import { PRESET_NAMES, SEATS, BAND_LENS_SEATS, assertValidSeatPreset, safeWarn, type TgoConfig } from "./config";

export { BAND_LENS_SEATS };

export const PRESET_MEMORY_KEY = "tgo.preset";
export const BD_MEMORIES_COMMAND = "bd memories --json";

// The "band-members" preset entry maps to the three lens agents (see
// docs/spec/band.md §4) — there is no single "band-members" seat.
// A preset may also define optional per-lens cobain/grohl/novoselic entries:
// a lens key replaces the whole band-members entry for that lens (never
// merged); lenses without a key fall back to band-members.

function agentName(seat: string): string[] {
  return seat === "band-members" ? [...BAND_LENS_SEATS] : [seat];
}

export function isPresetName(value: unknown): value is (typeof PRESET_NAMES)[number] {
  return typeof value === "string" && (PRESET_NAMES as readonly string[]).includes(value);
}

export function resolveActivePreset(
  config: Pick<TgoConfig, "preset" | "presets">,
  memories: Record<string, unknown>
): string {
  const nudged = memories[PRESET_MEMORY_KEY];
  if (isPresetName(nudged)) return nudged;
  return config.preset;
}

export async function readPresetNudge(
  run: (command: string) => Promise<string>,
  log?: (level: "warn" | "info" | "error", message: string, extra?: Record<string, unknown>) => void
): Promise<Record<string, unknown>> {
  const raw = await run(BD_MEMORIES_COMMAND).catch((err) => {
    const msg = "tgo: readPresetNudge bd memories failed";
    if (log) safeWarn(log, msg, { error: String(err) });
    else console.warn(`${msg}: ${String(err)}`);
    return "";
  });
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function applyPreset(
  config: { agent?: Record<string, Record<string, unknown>> },
  preset: string,
  presets: TgoConfig["presets"]
): string[] {
  if (!presets) return [];
  const seatMap = presets[preset as keyof typeof presets];
  if (!seatMap) return [];
  assertValidSeatPreset(seatMap, preset);
  const applied: string[] = [];
  for (const seat of SEATS) {
    if (seat === "band-members") continue;
    const ref = seatMap[seat];
    if (!ref) continue;
    for (const name of agentName(seat)) {
      if (!config.agent) config.agent = {};
      const agent = (config.agent[name] ??= {});
      agent.model = ref.model;
      if (ref.variant) agent.variant = ref.variant;
      applied.push(name);
    }
  }
  for (const lens of BAND_LENS_SEATS) {
    const ref = seatMap[lens] ?? seatMap["band-members"];
    if (!ref) continue;
    if (!config.agent) config.agent = {};
    const agent = (config.agent[lens] ??= {});
    agent.model = ref.model;
    if (ref.variant) agent.variant = ref.variant;
    else delete agent.variant;
    applied.push(lens);
  }
  return applied;
}

/**
 * tgo-5em: pressure-aware preset recommendation. Advisory only — never
 * upgrades, only ratchets DOWN under queue pressure when the active preset is
 * a cheaper option than the current one.
 * - queueDepth >= 6 → cheap
 * - queueDepth >= 3 → balanced
 * - otherwise → current (unchanged)
 */
export const PRESSURE_HIGH = 6;
export const PRESSURE_MID = 3;

export function recommendPresetForPressure(queueDepth: number, currentPreset: string): string {
  if (!Number.isFinite(queueDepth)) return currentPreset;
  if (queueDepth >= PRESSURE_HIGH) return "cheap";
  if (queueDepth >= PRESSURE_MID) return "balanced";
  return currentPreset;
}

/** Resolve seat → model for a preset (band-members expands to its lens seats). */
export function resolveSeatModels(
  preset: string,
  presets: TgoConfig["presets"]
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!presets) return out;
  const seatMap = presets[preset as keyof typeof presets];
  if (!seatMap) return out;
  assertValidSeatPreset(seatMap, preset);
  for (const seat of SEATS) {
    if (seat === "band-members") continue;
    const ref = seatMap[seat];
    if (!ref || !ref.model) continue;
    for (const name of agentName(seat)) out[name] = ref.model;
  }
  for (const lens of BAND_LENS_SEATS) {
    const ref = seatMap[lens] ?? seatMap["band-members"];
    if (!ref || !ref.model) continue;
    out[lens] = ref.model;
  }
  return out;
}
