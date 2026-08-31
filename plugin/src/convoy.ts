/**
 * tgo-4wq: convoys — wave grouping with a single data-flow source.
 *
 * A convoy groups beads into waves and lands them in DEFINED order (wave
 * number), never arrival order, once all waves complete. The state file at
 * .tgo/convoy/.state.json is the single source of truth: waves read it instead
 * of threading scope through per-bead comments. Landing re-validates the
 * file-hash scopeHash and honors exit gates (a failing gate blocks the merge).
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { assertValidBeadID, hashString } from "./def-snapshot";
import { normalizeScopePath } from "./manifest";

export const CONVOY_REL_DIR = ".tgo/convoy";
export const CONVOY_STATE_REL = ".tgo/convoy/.state.json";
/** Existing capacity limit: at most 3 waves in a convoy. */
export const MAX_PARALLEL_WAVES = 3;

export interface ConvoyBead {
  issueId: string;
  scope: string[];
}

export interface ConvoyWave {
  wave: number;
  beads: ConvoyBead[];
}

export interface ConvoyState {
  goal: string;
  scopeHash: string;
  remainingBudget: number;
  completedDeps: string[];
  waves: ConvoyWave[];
}

export function convoyStatePath(repoRoot: string): string {
  return path.join(repoRoot, CONVOY_STATE_REL);
}

/**
 * File-hash scopeHash: FNV-1a over the canonical, sorted, length-prefixed set
 * of scope paths across all waves. Any scope change flips the hash; landing
 * aborts on mismatch.
 */
export function computeScopeHash(waves: ConvoyWave[]): string {
  const all = new Set<string>();
  for (const w of waves) {
    for (const b of w.beads) {
      for (const s of b.scope) {
        const n = normalizeScopePath(s);
        if (n) all.add(n);
      }
    }
  }
  const canonical = [...all].sort().map((s) => `${s.length}:${s}`).join("|");
  return hashString(canonical);
}

export interface ConvoyValidation {
  valid: boolean;
  errors: string[];
}

export function validateConvoyState(state: unknown): ConvoyValidation {
  const errors: string[] = [];
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    return { valid: false, errors: ["convoy state must be an object"] };
  }
  const s = state as Record<string, unknown>;
  if (typeof s.goal !== "string" || s.goal.trim().length === 0) {
    errors.push("goal must be a non-empty string");
  }
  if (typeof s.remainingBudget !== "number" || !Number.isFinite(s.remainingBudget) || s.remainingBudget < 0) {
    errors.push("remainingBudget must be a non-negative number");
  }
  if (!Array.isArray(s.completedDeps)) {
    errors.push("completedDeps must be an array");
  } else {
    for (const d of s.completedDeps) {
      if (typeof d !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(d)) {
        errors.push(`completedDeps entry ${JSON.stringify(d)} is not a valid bead id`);
      }
    }
  }
  if (!Array.isArray(s.waves) || s.waves.length === 0) {
    errors.push("waves must be a non-empty array");
  } else {
    if (s.waves.length > MAX_PARALLEL_WAVES) {
      errors.push(`waves must not exceed ${MAX_PARALLEL_WAVES} (got ${s.waves.length})`);
    }
    const seenWaves = new Set<number>();
    for (const w of s.waves as ConvoyWave[]) {
      if (!w || typeof w.wave !== "number") {
        errors.push("each wave must have a numeric wave number");
        continue;
      }
      if (seenWaves.has(w.wave)) errors.push(`duplicate wave number ${w.wave}`);
      seenWaves.add(w.wave);
      if (!Array.isArray(w.beads) || w.beads.length === 0) {
        errors.push(`wave ${w.wave} must have a non-empty beads array`);
        continue;
      }
      for (const b of w.beads) {
        if (!b || typeof b.issueId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(b.issueId)) {
          errors.push(`wave ${w.wave} bead issueId ${JSON.stringify(b?.issueId)} is invalid`);
        }
        if (!Array.isArray(b.scope) || b.scope.length === 0) {
          errors.push(`wave ${w.wave} bead ${b?.issueId} must have a non-empty scope`);
        }
      }
    }
  }
  if (typeof s.scopeHash !== "string" || !/^[0-9a-f]{8}$/.test(s.scopeHash)) {
    errors.push("scopeHash must be an 8-hex hash string");
  } else if (Array.isArray(s.waves) && errors.length === 0) {
    const expected = computeScopeHash(s.waves as ConvoyWave[]);
    if (s.scopeHash !== expected) {
      errors.push(`scopeHash mismatch (expected ${expected}, got ${s.scopeHash})`);
    }
  }
  return { valid: errors.length === 0, errors };
}

async function writeConvoyStateAtomic(repoRoot: string, state: ConvoyState): Promise<void> {
  const dir = path.join(repoRoot, CONVOY_REL_DIR);
  await fs.mkdir(dir, { recursive: true });
  const target = convoyStatePath(repoRoot);
  const tmp = path.join(dir, `.state.json.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), "utf-8");
  await fs.rename(tmp, target);
}

/** Create/overwrite a convoy state file after validation. Returns the persisted state. */
export async function initConvoy(
  repoRoot: string,
  input: { goal: string; remainingBudget: number; waves: ConvoyWave[] },
): Promise<ConvoyState> {
  const state: ConvoyState = {
    goal: input.goal,
    scopeHash: computeScopeHash(input.waves),
    remainingBudget: input.remainingBudget,
    completedDeps: [],
    waves: input.waves,
  };
  const v = validateConvoyState(state);
  if (!v.valid) {
    throw new Error(`CONVOY_INVALID: ${v.errors.join("; ")}`);
  }
  await writeConvoyStateAtomic(repoRoot, state);
  return state;
}

export async function readConvoyState(repoRoot: string): Promise<ConvoyState | undefined> {
  const target = convoyStatePath(repoRoot);
  let raw: string;
  try {
    raw = await fs.readFile(target, "utf-8");
  } catch {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as ConvoyState;
    const v = validateConvoyState(parsed);
    return v.valid ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** Record wave completion — dedupes completedDeps, atomic, validates before writing. */
export async function markWaveComplete(
  repoRoot: string,
  completedIssueIds: string[],
): Promise<ConvoyState> {
  const state = await readConvoyState(repoRoot);
  if (!state) throw new Error("CONVOY_MISSING: no convoy state to update");
  const existing = new Set(state.completedDeps);
  for (const id of completedIssueIds) {
    assertValidBeadID(id);
    existing.add(id);
  }
  const next: ConvoyState = { ...state, completedDeps: [...existing] };
  const v = validateConvoyState(next);
  if (!v.valid) throw new Error(`CONVOY_INVALID: ${v.errors.join("; ")}`);
  await writeConvoyStateAtomic(repoRoot, next);
  return next;
}

/** True when every bead across all waves is in completedDeps. */
export function allWavesComplete(state: ConvoyState): boolean {
  const done = new Set(state.completedDeps);
  for (const w of state.waves) {
    for (const b of w.beads) {
      if (!done.has(b.issueId)) return false;
    }
  }
  return true;
}

/** Landing order: DEFINED wave-number order, never completion arrival order. */
export function convoyLandingOrder(state: ConvoyState): number[] {
  return state.waves.map((w) => w.wave).sort((a, b) => a - b);
}

export interface LandConvoyDeps {
  /** Merge one wave's beads in order (worktree → main). */
  mergeWorktree: (wave: number, beadIssueIds: string[]) => Promise<void>;
  /** Exit-gate check per bead; a non-ok result blocks landing. */
  gateCheck: (issueId: string) => Promise<{ ok: boolean; reason?: string }>;
}

export interface LandConvoyResult {
  landed: boolean;
  reason?: string;
  mergedWaves: number[];
}

/**
 * Land a convoy: re-validate state (scopeHash mismatch aborts), then merge
 * waves in DEFINED order, running an exit-gate check per bead first. Stops
 * (and reports) at the first gate failure.
 */
export async function landConvoy(repoRoot: string, deps: LandConvoyDeps): Promise<LandConvoyResult> {
  const state = await readConvoyState(repoRoot);
  if (!state) return { landed: false, reason: "no convoy state", mergedWaves: [] };
  const v = validateConvoyState(state);
  if (!v.valid) return { landed: false, reason: `state invalid: ${v.errors.join("; ")}`, mergedWaves: [] };
  if (state.scopeHash !== computeScopeHash(state.waves)) {
    return { landed: false, reason: "scopeHash mismatch — abort landing", mergedWaves: [] };
  }
  if (!allWavesComplete(state)) {
    return { landed: false, reason: "not all waves complete", mergedWaves: [] };
  }
  const merged: number[] = [];
  for (const wave of convoyLandingOrder(state)) {
    const w = state.waves.find((x) => x.wave === wave);
    if (!w) continue;
    for (const b of w.beads) {
      const g = await deps.gateCheck(b.issueId);
      if (!g.ok) {
        return { landed: false, reason: `gate blocked ${b.issueId}: ${g.reason ?? "unknown"}`, mergedWaves: merged };
      }
    }
    await deps.mergeWorktree(wave, w.beads.map((b) => b.issueId));
    merged.push(wave);
  }
  return { landed: true, mergedWaves: merged };
}

/** Board section: one-line summary + per-wave landed progress. */
export async function buildConvoySection(repoRoot: string): Promise<string[] | undefined> {
  const state = await readConvoyState(repoRoot);
  if (!state) return undefined;
  const done = new Set(state.completedDeps);
  const lines: string[] = [
    `CONVOY: ${state.goal.slice(0, 80)} | budget $${state.remainingBudget} | scope ${state.scopeHash.slice(0, 8)}`,
  ];
  for (const w of state.waves) {
    const landed = w.beads.filter((b) => done.has(b.issueId)).length;
    lines.push(`  wave ${w.wave}: ${landed}/${w.beads.length} landed`);
  }
  if (allWavesComplete(state)) lines.push("  → all waves complete — run tgo_land_convoy to land");
  return lines;
}