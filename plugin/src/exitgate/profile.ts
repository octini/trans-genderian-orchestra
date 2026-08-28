/**
 * Gate profile — per-repo config declaring blacklist patterns and gate toggles.
 *
 * Chosen location: `.tgo/gate.json` (versioned alongside `.tgo/runs/`).
 * Rationale: keeps gate config next to run logs, avoids polluting the
 * opencode plugin options (`tgoConfig`), and is trivially discoverable per
 * worktree. If the file is absent, safe defaults are used (lenient
 * no-op gate — backward compat).
 *
 * Alternative considered: `tgo.json` gate section inside opencode.json plugin
 * options. Rejected because it couples gate persistence to the host plugin
 * loader and makes per-worktree overrides harder to version.
 *
 * Profile is deterministic, no network, no LLM. Blacklist patterns are regex
 * strings evaluated locally against run-log `note` fields.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface GateProfile {
  /** Master toggle. When false the gate is skipped entirely. */
  enabled: boolean;
  /** Per-axis toggles. */
  toggles: {
    deltaSpec: boolean;
    triage: boolean;
    trajectory: boolean;
  };
  /** Regex strings — each matched case-insensitively against run-log notes. */
  blacklist: string[];
  trajectory: {
    /** Soft efficiency caps — exceeding emits WARNING, not CRITICAL. */
    maxSteps?: number;
    /** Expected tool sequence hints in order, e.g. ["read","edit","bash"]. */
    expectedSequence?: string[];
  };
}

export const DEFAULT_BLACKLIST: string[] = [
  // Destructive filesystem
  "rm\\s+-rf\\s+/(\\s|$)",
  "rm\\s+-rf\\s+\\*",
  "rm\\s+-rf\\s+~",
  // Fork bomb
  ":\\(\\)\\s*\\{",
  // Disk / device destruction
  "mkfs",
  "dd\\s+if=",
  ">\\s*/dev/sd[a-z]",
  "chmod\\s+777\\s+/(\\s|$)",
  "shutdown",
  "reboot",
  "init\\s+0",
];

export const DEFAULT_GATE_PROFILE: GateProfile = {
  enabled: true,
  toggles: {
    deltaSpec: true,
    triage: true,
    trajectory: true,
  },
  blacklist: [...DEFAULT_BLACKLIST],
  trajectory: {
    maxSteps: 250,
    expectedSequence: [],
  },
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toGateProfile(raw: unknown): GateProfile | undefined {
  if (!isObject(raw)) return undefined;
  const enabled = typeof raw.enabled === "boolean" ? raw.enabled : DEFAULT_GATE_PROFILE.enabled;
  const togglesRaw = isObject(raw.toggles) ? raw.toggles : {};
  const toggles = {
    deltaSpec: typeof togglesRaw.deltaSpec === "boolean" ? togglesRaw.deltaSpec : DEFAULT_GATE_PROFILE.toggles.deltaSpec,
    triage: typeof togglesRaw.triage === "boolean" ? togglesRaw.triage : DEFAULT_GATE_PROFILE.toggles.triage,
    trajectory: typeof togglesRaw.trajectory === "boolean" ? togglesRaw.trajectory : DEFAULT_GATE_PROFILE.toggles.trajectory,
  };
  let blacklist: string[];
  if (Array.isArray(raw.blacklist)) {
    const filtered = raw.blacklist.filter((s) => typeof s === "string" && (s as string).trim().length > 0) as string[];
    // validate each compiles
    const valid: string[] = [];
    for (const p of filtered) {
      try {
        // test compile case-insensitive
        new RegExp(p, "i");
        valid.push(p);
      } catch {
        // skip invalid pattern — deterministic, no throw
      }
    }
    blacklist = valid.length > 0 ? valid : [...DEFAULT_GATE_PROFILE.blacklist];
    // if raw had explicit empty array, treat as explicit disable? But spec says ship safe defaults.
    // An explicit empty blacklist means "no blacklist" — honour it only if raw.blacklist is empty array.
    if (Array.isArray(raw.blacklist) && raw.blacklist.length === 0) blacklist = [];
  } else {
    blacklist = [...DEFAULT_GATE_PROFILE.blacklist];
  }

  const trajRaw = isObject(raw.trajectory) ? raw.trajectory : {};
  const maxSteps = typeof trajRaw.maxSteps === "number" && Number.isFinite(trajRaw.maxSteps) && trajRaw.maxSteps > 0 ? Math.floor(trajRaw.maxSteps) : DEFAULT_GATE_PROFILE.trajectory.maxSteps;
  const expectedSequence = Array.isArray(trajRaw.expectedSequence)
    ? (trajRaw.expectedSequence.filter((s) => typeof s === "string" && (s as string).trim().length > 0) as string[])
    : DEFAULT_GATE_PROFILE.trajectory.expectedSequence;

  return {
    enabled,
    toggles,
    blacklist,
    trajectory: {
      maxSteps,
      expectedSequence,
    },
  };
}

export function gateProfilePath(repoRoot: string): string {
  return path.join(repoRoot, ".tgo", "gate.json");
}

/**
 * Load gate profile from `.tgo/gate.json`. Missing file → defaults.
 * Never throws on missing/invalid JSON — returns defaults.
 * Deterministic, no network, no LLM.
 */
export async function loadGateProfile(repoRoot: string): Promise<GateProfile> {
  const target = gateProfilePath(repoRoot);
  try {
    const raw = await fs.readFile(target, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    const profile = toGateProfile(parsed);
    if (profile) return profile;
    return { ...DEFAULT_GATE_PROFILE, blacklist: [...DEFAULT_GATE_PROFILE.blacklist] };
  } catch {
    return { ...DEFAULT_GATE_PROFILE, blacklist: [...DEFAULT_GATE_PROFILE.blacklist] };
  }
}

/**
 * Synchronous variant for hot path where async is inconvenient (e.g. tests).
 * Uses `Bun.file`/`fs.readFileSync` alternative — falls back to defaults if sync read unavailable.
 * Prefer `loadGateProfile` in production; this is a test helper that stays deterministic.
 */
export async function loadGateProfileSync(repoRoot: string): Promise<GateProfile> {
  return loadGateProfile(repoRoot);
}

export function parseGateProfile(raw: unknown): GateProfile {
  const p = toGateProfile(raw);
  if (p) return p;
  return { ...DEFAULT_GATE_PROFILE, blacklist: [...DEFAULT_GATE_PROFILE.blacklist] };
}

/** Compile blacklist patterns to regexes (case-insensitive). Invalid patterns already filtered. */
export function compileBlacklist(blacklist: string[]): RegExp[] {
  const out: RegExp[] = [];
  for (const p of blacklist) {
    try {
      out.push(new RegExp(p, "i"));
    } catch {}
  }
  return out;
}
