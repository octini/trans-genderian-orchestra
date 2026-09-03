import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { rulePackSchema, voiceCardSchema, type VoiceCard, type VoiceCardId } from "./voices";

export type DriftRegister = "concise" | "natural";
export type OutputClass = "technical-steps-code" | "voice-forward-prose";
export type DriftMode = "chat" | "tool-heavy";
export type Severity = "none" | "low" | "medium" | "high";
export type Axis = "response-length" | "readability" | "progress-narration" | "anti-style-cluster";
export type Basis = "cluster" | "repeated-signal" | "strong-evidence";
export interface Span { start: number; end: number }
export interface Uncertainty { codes: Array<"preservation" | "classification" | "necessity">; message: string; spans: Span[] }
export interface DriftMetric { value: number; unit: "ratio" | "score-0-to-1"; baseline: number | null; basis: string }
export interface DriftInput {
  attemptID: string; cardId: VoiceCardId; outputClass: OutputClass; mode: DriftMode;
  enabled: boolean; reinforced: boolean;
  taskContext?: { protectedSpans?: Span[]; requiredPhrases?: string[]; baselineTokens?: number | null; answerComplete?: boolean };
  candidate: string;
  // deprecated fallback: if cardId missing, register may be present for transitional callers
  register?: DriftRegister;
}
export interface DriftFinding {
  axis: Axis; severity: Severity; evidence: string; spans: Span[]; basis: Basis;
  uncertainty: Uncertainty; suppressed: boolean; suppressionReason?: string;
}
export interface SteLengthMetric { value: number; violations: number; violationsPer100w: number; applicable: boolean; unit: "violations-per-100w"; baseline: number | null; basis: string; provenance: "proxy" | "measured" }
export interface DriftResult {
  input: Omit<DriftInput, "taskContext" | "candidate" | "register"> & { cardId: VoiceCardId }; findings: DriftFinding[];
  aggregate: { severity: Severity; actionable: boolean; reinforcementEligible: boolean };
  metrics: { concision: DriftMetric; readability: DriftMetric; correctness: DriftMetric; preservation: DriftMetric; steLength: SteLengthMetric };
  protectedContent: { spans: Span[]; treatment: { mode: "excluded" | "discounted" | "none"; reason: string } };
  uncertainty: Uncertainty[]; state: { attemptID: string; enabled: boolean; reinforced: boolean };
}

export interface SteLengthResult { violations: number; violationsPer100w: number; applicable: boolean; words: number; sentences: number }

export const STE_INSTRUCTION_THRESHOLD = 20;
export const STE_DESCRIPTIVE_THRESHOLD = 25;

const instructionPrefix = /^\s*(?:\d+[\.)]\s*|(?:Run|Restart|Set|Check|Verify|Use|Install|Retry|Changed|Ran|Result|Do not|Never|Keep|Clear|If|When|Create|Dispatch|Verify)\b)/i;

export function countSteViolations(candidate: string, mode: DriftMode, thresholds?: { instruction: number; descriptive: number }): SteLengthResult {
  const instr = thresholds?.instruction ?? STE_INSTRUCTION_THRESHOLD;
  const desc = thresholds?.descriptive ?? STE_DESCRIPTIVE_THRESHOLD;
  const words = candidate.trim() ? candidate.trim().split(/\s+/).filter(Boolean).length : 0;
  const applicable = mode === "tool-heavy";
  if (!applicable || words === 0) return { violations: 0, violationsPer100w: 0, applicable, words, sentences: 0 };
  const sentenceList = [...candidate.matchAll(/[^.!?\n]+[.!?]+/g)].map((m) => m[0].trim()).filter(Boolean);
  const sentences = sentenceList.length || (candidate.trim() ? 1 : 0);
  let violations = 0;
  for (const sentence of sentenceList.length ? sentenceList : (candidate.trim() ? [candidate.trim()] : [])) {
    const sentenceWords = sentence.split(/\s+/).filter(Boolean).length;
    const threshold = instructionPrefix.test(sentence) ? instr : desc;
    if (sentenceWords > threshold) violations++;
  }
  const violationsPer100w = words ? (violations / words) * 100 : 0;
  return { violations, violationsPer100w, applicable, words, sentences };
}

const emptyUncertainty = (): Uncertainty => ({ codes: [], message: "", spans: [] });
const overlap = (a: Span, b: Span) => a.start < b.end && b.start < a.end;
const contained = (a: Span, bs: Span[]) => bs.some((b) => a.start >= b.start && a.end <= b.end);
const masked = (text: string, spans: Span[]) => {
  const chars = text.split("");
  for (const span of spans) for (let i = span.start; i < span.end && i < chars.length; i++) if (chars[i] !== "\n") chars[i] = " ";
  return chars.join("");
};

// -- pack loader (synchronous at module init + zod validation) --
type LoadedFamily = {
  name: string;
  packId: string;
  tier: number;
  gating: "always-on" | "whitelist" | "cluster";
  severity: Severity;
  basis: Basis;
  patterns: RegExp[];
  thresholds: Record<string, unknown>;
};

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let loadedPacks: Array<{ id: string; tier: number; gating: string; families: LoadedFamily[] }> = [];
let loadedFamilies: LoadedFamily[] = [];
let packLoadError: string | null = null;

function loadPacksSync(): void {
  const ids = ["mechanics", "concision", "voice-cadence"] as const;
  const packs: typeof loadedPacks = [];
  const families: LoadedFamily[] = [];
  for (const id of ids) {
    const file = path.join(packageRoot, "assets", "rule-packs", `${id}.json`);
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(file, "utf-8"));
    } catch (e) {
      throw new Error(`drift: failed to read pack ${id}: ${String(e)}`);
    }
    const parsed = rulePackSchema.parse(raw);
    const fam: LoadedFamily[] = parsed.families.map((f) => ({
      name: f.name,
      packId: parsed.id,
      tier: parsed.tier,
      gating: parsed.gating as LoadedFamily["gating"],
      severity: (f.severity as Severity) ?? "low",
      basis: (f.basis as Basis) ?? (parsed.gating === "always-on" ? "strong-evidence" : "cluster"),
      patterns: f.patterns.map((p) => new RegExp(p.value, (p as { flags?: string }).flags ?? "")),
      thresholds: (f.thresholds ?? {}) as Record<string, unknown>,
    }));
    packs.push({ id: parsed.id, tier: parsed.tier, gating: parsed.gating, families: fam });
    families.push(...fam);
  }
  loadedPacks = packs;
  loadedFamilies = families;
}

try {
  loadPacksSync();
} catch (e) {
  packLoadError = String(e);
  // fallback empty so module still loads; analyze will throw descriptive error
  console.warn(`drift: pack load failed: ${packLoadError}`);
}

// -- voice card sync loader with cache --
const voiceCardCache = new Map<string, VoiceCard>();

function normalizeCardId(id: string): VoiceCardId {
  const withPrefix = id.startsWith("tgo-") ? id : `tgo-${id}`;
  // allow synthetic test cards (tgo-test-*) to pass through for cache injection
  if (withPrefix.startsWith("tgo-test-")) return withPrefix as VoiceCardId;
  if ((["tgo-default", "tgo-prose", "tgo-conversational"] as const).includes(withPrefix as VoiceCardId)) return withPrefix as VoiceCardId;
  return "tgo-default";
}

function getVoiceCardSync(cardId: string): VoiceCard {
  const normalized = normalizeCardId(cardId);
  const cached = voiceCardCache.get(normalized);
  if (cached) return cached;
  const file = path.join(packageRoot, "assets", "voices", `${normalized}.json`);
  const raw = JSON.parse(fs.readFileSync(file, "utf-8"));
  const parsed = voiceCardSchema.parse(raw);
  voiceCardCache.set(normalized, parsed);
  return parsed;
}

function resolveCardId(input: DriftInput): VoiceCardId {
  if (input.cardId) return normalizeCardId(input.cardId);
  const legacy = (input as { register?: DriftRegister }).register;
  if (legacy === "concise" || legacy === "natural") {
    // map both to default; natural's old suppression now handled via card gating
    return "tgo-default";
  }
  return "tgo-default";
}

function getSteThresholds(card: VoiceCard | undefined): { instruction: number; descriptive: number } {
  const st = card?.voice_invariants.syntax_targets?.ste_thresholds;
  return {
    instruction: st?.instruction ?? STE_INSTRUCTION_THRESHOLD,
    descriptive: st?.descriptive ?? STE_DESCRIPTIVE_THRESHOLD,
  };
}

// -- card-aware gating helpers (implements §7.3 pseudocode verbatim) --
function isFamilyIncluded(card: VoiceCard, family: LoadedFamily): boolean {
  const refs = card.voice_invariants.anti_patterns?.refs ?? [];
  if (refs.length === 0) return false;
  if (refs.includes(family.packId)) return true;
  if (refs.includes(family.name)) return true;
  // also support packs listed without exact match? already handled
  return false;
}

function parseThresholdNumber(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const m = value.match(/(\d+(?:\.\d+)?)/);
    if (m) return parseFloat(m[1]);
  }
  return undefined;
}

function getThresholdValue(family: LoadedFamily, card: VoiceCard, key: string): unknown {
  const cardThresholds = (card.voice_invariants.anti_patterns?.thresholds ?? {}) as Record<string, unknown>;
  // special: em_dash_per_100w_max lives in punctuation_budgets
  if (key === "em_dash_per_100w_max") {
    const v = card.voice_invariants.punctuation_budgets?.em_dash_per_100w_max;
    if (v !== undefined) return v;
  }
  if (key in cardThresholds) return cardThresholds[key];
  if (family.thresholds && key in family.thresholds) return family.thresholds[key];
  return undefined;
}

function getRequiredCount(family: LoadedFamily, card: VoiceCard): number {
  const map: Record<string, string> = {
    "hedge-stacks": "hedge_stack_max",
    "passive-hidden-actor": "hidden_actor_flag",
    "rule-of-three": "rule_of_three_cluster",
    "synonym-cycling": "synonym_cycle_window_sentences",
    "novelty-inflation": "novelty_inflation_flag",
    "false-balance": "false_balance_flag",
    "em-dash-budgets": "em_dash_per_100w_max",
  };
  const key = map[family.name];
  if (key) {
    const val = getThresholdValue(family, card, key);
    if (val !== undefined) {
      if (key === "hedge_stack_max") {
        const n = parseThresholdNumber(val);
        if (n !== undefined) return n + 1; // max allowed -> need > max
      }
      const n = parseThresholdNumber(val);
      if (n !== undefined) {
        // for em_dash_per_100w, not a count; handled separately
        if (key === "em_dash_per_100w_max") return -1; // signal special
        return n;
      }
    }
  }
  const clusterMin = getThresholdValue(family, card, "cluster_min") ?? family.thresholds.cluster_min;
  const n = parseThresholdNumber(clusterMin);
  if (n !== undefined) return n;
  return family.tier === 3 ? 2 : 1;
}

function thresholdsNotMet(family: LoadedFamily, basis: Basis, spans: Span[], card: VoiceCard, candidateWords: number): boolean {
  // em-dash special per-100w check
  if (family.name === "em-dash-budgets") {
    const rawMax = getThresholdValue(family, card, "em_dash_per_100w_max") ?? 0.5;
    const max = typeof rawMax === "number" ? rawMax : parseThresholdNumber(rawMax) ?? 0.5;
    const count = spans.length;
    const words = candidateWords || 1;
    const per100w = (count / words) * 100;
    // if per100w exceeds max, then threshold met (not suppressed); otherwise below threshold -> suppressed
    if (per100w <= max) {
      // also check cluster flag fallback
      const clusterFlag = getThresholdValue(family, card, "em_dash_cluster_flag") ?? family.thresholds.em_dash_cluster_flag ?? 2;
      const flag = parseThresholdNumber(clusterFlag) ?? 2;
      if (count < flag) return true;
      // per100w not exceeded, suppress
      return true;
    }
    // per100w exceeded, but still need cluster check?
    const clusterFlag = getThresholdValue(family, card, "em_dash_cluster_flag") ?? family.thresholds.em_dash_cluster_flag ?? 2;
    const flag = parseThresholdNumber(clusterFlag) ?? 2;
    if (count < flag) return true;
    return false;
  }
  const required = getRequiredCount(family, card);
  if (required === -1) return false;
  return spans.length < required;
}

type CardSuppression = { suppressed: boolean; reason?: string };
function getCardSuppression(family: LoadedFamily, basis: Basis, spans: Span[], input: DriftInput, card: VoiceCard, candidateWords: number): CardSuppression {
  // tier1 never card-suppressed
  if (family.tier === 1) return { suppressed: false };
  // refs exclusion
  if (!isFamilyIncluded(card, family)) return { suppressed: true, reason: "card marks family non-applicable" };
  // strictness low + tier3 unless strong-evidence
  const strictness = card.voice_invariants.anti_patterns?.strictness;
  if (strictness === "low" && family.tier === 3 && basis !== "strong-evidence") {
    return { suppressed: true, reason: "card strictness low suppresses voice-cadence without strong evidence" };
  }
  // thresholds not met
  if (thresholdsNotMet(family, basis, spans, card, candidateWords)) {
    return { suppressed: true, reason: "below card threshold" };
  }
  return { suppressed: false };
}

function protectedSpans(input: DriftInput): Span[] {
  const spans = (input.taskContext?.protectedSpans ?? []).filter((s) => Number.isInteger(s.start) && Number.isInteger(s.end) && s.start >= 0 && s.end > s.start && s.end <= input.candidate.length).map((s) => ({ ...s }));
  const add = (start: number, end: number) => spans.push({ start, end });
  const patterns = [
    /```[\s\S]*?```|`[^`\n]+`/g,
    /^\s*(?:[$>]|(?:npm|bun|pnpm|yarn|git|cargo|python|curl)\s)[^\n]*$/gim,
    /^\s*>[^\n]*$/gm, /"[^"\n]+"|(?<![\p{L}\p{N}])'[^'\n]+'/gu,
    /^\s*(?:warning|error):[^\n]*$/gim,
    /\b\d+(?:\.\d+)?\s*(?:ms|s|seconds?|minutes?|hours?|days?|%|tests?|tasks?|waves?|tokens?|bytes?|MB|GB)\b/gi,
    /\b(?:do not|don't|never|must not|cannot|can't|should not|shouldn't)\b[^.!?\n]*/gi,
    /\b(?:because|so that|until|otherwise)\b[^.!?\n]*/gi,
    /\b(?:if|when|unless|only if|provided that|at least|at most|exactly|approximately)\b[^.!?\n]*/gi,
    /\b(?:https?:\/\/|www\.)[^\s)]+/gi,
    /\b[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+\b/g,
    /\b[A-Za-z0-9_-]+@[A-Za-z0-9._-]+\b/g,
    /\b(?:API|APIs|SDK|OAuth|OIDC|JWT|TLS|SSL|SSH|HTTPS|CORS|CSRF|XSS|SQL)\b/g,
    /\b(?:security|authentication|authorization|credentials?|secrets?|tokens?)\b[^.!?\n]*/gi,
    // Keep code-shaped names out of prose heuristics.  `config` is a common
    // standalone configuration identifier even when it is not code-formatted.
    // Exclude placeholder inner words (e.g., TODO inside [TODO]) and mechanical leak signals (oai_citation, citeturn) — they are not code identifiers.
    /(?<!\[)\b(?!(?:TODO|PLACEHOLDER|oai_citation|citeturn)\b)(?:[a-z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*|[A-Z][A-Za-z0-9_]*[A-Z][A-Za-z0-9_]*|[A-Za-z_$][\w$]*_[A-Za-z_$][\w$]*|config)\b/g,
  ];
  for (const pattern of patterns) for (const match of input.candidate.matchAll(pattern)) add(match.index!, match.index! + match[0].length);
  // Exclude code-shaped matches that lie inside placeholder delimiters — placeholders are not code identifiers
  const placeholderRanges: Span[] = [];
  for (const m of input.candidate.matchAll(/\[[^\]]+\]/g)) placeholderRanges.push({ start: m.index!, end: m.index! + m[0].length });
  for (const m of input.candidate.matchAll(/\{\{[^}]+\}\}/g)) placeholderRanges.push({ start: m.index!, end: m.index! + m[0].length });
  for (const m of input.candidate.matchAll(/<<[^>]+>>/g)) placeholderRanges.push({ start: m.index!, end: m.index! + m[0].length });
  for (const m of input.candidate.matchAll(/20\d\d-XX-XX/g)) placeholderRanges.push({ start: m.index!, end: m.index! + m[0].length });
  const withoutPlaceholderCode = spans.filter((s) => !placeholderRanges.some((r) => s.start >= r.start && s.end <= r.end));
  return withoutPlaceholderCode.sort((a, b) => a.start - b.start || a.end - b.end).filter((s, i, all) => i === 0 || s.start !== all[i - 1].start || s.end !== all[i - 1].end);
}
function unprotectedSpans(text: string, regex: RegExp, protectedList: Span[], offset = 0): Span[] {
  const localProtected = protectedList.map((span) => ({ start: span.start - offset, end: span.end - offset }));
  const safeText = masked(text, localProtected);
  return [...safeText.matchAll(regex)].flatMap((m) => {
    const whole = { start: m.index! + offset, end: m.index! + offset + m[0].length };
    if (protectedList.some((span) => overlap(whole, span))) return [];
    return [whole];
  });
}
function spansForFamily(family: LoadedFamily, text: string, protectedList: Span[], offset = 0): Span[] {
  // For ai-tracking-params, URL protection would hide the very signal we need to flag (tracking params appear inside URLs).
  // Exclude URL-derived protected spans for this family so the param is still detectable, while code-span protection still suppresses.
  let effectiveProtected = protectedList;
  if (family.name === "ai-tracking-params") {
    const urlRegex = /\b(?:https?:\/\/|www\.)[^\s)]+/gi;
    const urlSpans: Span[] = [];
    for (const m of text.matchAll(urlRegex)) urlSpans.push({ start: m.index! + offset, end: m.index! + m[0].length });
    effectiveProtected = protectedList.filter((p) => !urlSpans.some((u) => p.start >= u.start && p.end <= u.end));
  }
  return family.patterns.flatMap((p) => unprotectedSpans(text, p, effectiveProtected, offset)).sort((a, b) => a.start - b.start);
}
function finding(
  axis: Axis,
  severity: Severity,
  evidence: string,
  spans: Span[],
  basis: Basis,
  input: DriftInput,
  reason?: string,
  uncertainty = emptyUncertainty(),
  family?: LoadedFamily,
  card?: VoiceCard,
  candidateWords?: number,
): DriftFinding {
  // preservation / disabled outrank card gating
  let suppressed = false;
  let suppressionReason: string | undefined;
  if (!input.enabled) {
    suppressed = true;
    suppressionReason = "analyzer disabled";
  } else if (reason) {
    suppressed = true;
    suppressionReason = reason;
  } else if (uncertainty.codes.length > 0) {
    suppressed = true;
    suppressionReason = "preservation or correctness concern";
  } else if (family && card) {
    // apply §7.3 card-aware gating pseudocode exactly:
    // tier1 never card-suppressed → refs exclusion → strictness low+tier3 unless strong-evidence → thresholds not met → else actionable
    const cs = getCardSuppression(family, basis, spans, input, card, candidateWords ?? 0);
    if (cs.suppressed) {
      suppressed = true;
      suppressionReason = cs.reason;
    }
  } else if (family && !card) {
    // no card loaded, fallback to not suppressed (should not happen)
    suppressed = false;
  } else if (!family && axis === "readability" && card) {
    // readability is voice-cadence-like: apply strictness/threshold gating even without family
    const strictness = card.voice_invariants.anti_patterns?.strictness;
    if (strictness === "low" && basis !== "strong-evidence") {
      suppressed = true;
      suppressionReason = "card strictness low suppresses voice-cadence without strong evidence";
    }
  }
  return { axis, severity: suppressed ? "none" : severity, evidence, spans, basis, uncertainty, suppressed, ...(suppressionReason ? { suppressionReason } : {}) };
}
function rank(s: Severity) { return ["none", "low", "medium", "high"].indexOf(s); }
function same(a: string, b: string) { return a.toLowerCase().replace(/\s+/g, " ").trim() === b.toLowerCase().replace(/\s+/g, " ").trim(); }

export function analyzeStyleDrift(input: DriftInput): DriftResult {
  if (packLoadError) {
    throw new Error(`drift packs failed to load: ${packLoadError}`);
  }
  const cardId = resolveCardId(input);
  let card: VoiceCard | undefined;
  try {
    card = getVoiceCardSync(cardId);
  } catch {
    // fallback to default
    card = getVoiceCardSync("tgo-default");
  }
  const steThresholds = getSteThresholds(card);
  const protectedContent = protectedSpans(input);
  const suppliedProtected = input.taskContext?.protectedSpans ?? [];
  const invalidProtected = suppliedProtected.filter((s) => !Number.isInteger(s.start) || !Number.isInteger(s.end) || s.start < 0 || s.end <= s.start || s.end > input.candidate.length);
  const sentences = [...input.candidate.matchAll(/[^.!?\n]+[.!?]+/g)]
    .map((m) => ({ text: m[0].trim(), span: { start: m.index!, end: m.index! + m[0].length } }))
    .filter((x) => x.text.length > 0);
  const findings: DriftFinding[] = [];
  const preservationUncertainty = /\b(?:uncertain|unknown|not sure|cannot verify|can't verify|unable to verify|remains unclear)\b/i.test(input.candidate)
    ? { codes: ["preservation"] as Array<"preservation">, message: "Candidate states that preservation or production behavior remains uncertain.", spans: [] } : emptyUncertainty();

  const candidateWords = input.candidate.trim() ? input.candidate.trim().split(/\s+/).filter(Boolean).length : 0;

  for (let i = 1; i < sentences.length; i++) if (same(sentences[i - 1].text, sentences[i].text) && !protectedContent.some((span) => overlap(sentences[i - 1].span, span) || overlap(sentences[i].span, span))) {
    findings.push(finding("response-length", "high", `Consecutive repeated sentence: ${sentences[i].text}`, [sentences[i - 1].span, sentences[i].span], "strong-evidence", input, undefined, preservationUncertainty));
  }
  const familyEvidence: Span[] = [];
  // collect familyEvidence and handle closer special
  for (const family of loadedFamilies) {
    const spans = spansForFamily(family, input.candidate, protectedContent, 0).sort((a, b) => a.start - b.start);
    if (spans.length === 0) continue;
    if (family.name === "closer") {
      if (input.taskContext?.answerComplete ?? true) {
        findings.push(finding("anti-style-cluster", "medium", "Chatbot closer after the answer is complete", spans, "strong-evidence", input, undefined, preservationUncertainty, family, card, candidateWords));
      }
      continue;
    }
    familyEvidence.push(...spans);
  }
  const sections = [...input.candidate.matchAll(/(?:^|\n\s*\n)([\s\S]*?)(?=\n\s*\n|$)/g)];
  for (const section of sections) {
    const start = section.index! + (section[0].length - section[1].length);
    const sectionText = section[1];
    const sectionFamilies = loadedFamilies
      .filter((f) => f.name !== "closer")
      .map((f) => {
        const spans = spansForFamily(f, sectionText, protectedContent, start).sort((a, b) => a.start - b.start);
        return { family: f, spans };
      })
      .filter((x) => x.spans.length > 0);
    // per-family cluster findings: require pack-declared cluster_min (not yet card threshold, card gating will further filter)
    for (const { family, spans } of sectionFamilies) {
      const packRequired = (() => {
        const v = family.thresholds.cluster_min;
        const n = parseThresholdNumber(v);
        if (n !== undefined) return n;
        return family.tier === 3 ? 2 : 1;
      })();
      if (spans.length >= packRequired) {
        let severity: Severity;
        if (family.tier === 1) severity = family.severity;
        else severity = spans.length >= 3 ? "medium" : "low";
        findings.push(finding("anti-style-cluster", severity, `${family.name} tell cluster`, spans, "cluster", input, undefined, preservationUncertainty, family, card, candidateWords));
      }
    }
    const sectionSpans = sectionFamilies.map(({ family, spans }) => [family.name, spans.length] as const);
    if (sectionSpans.length >= 2 && !sectionSpans.some(([, count]) => count >= 2) && !/(?:^|[.!?]\s+)Not\s+(?!(?:only|just|sure|certain|clear|necessarily|really|today|tomorrow)\b)[^.!?,\n]+,\s*it(?:'|’)s\s+[^.!?,\n]+/.test(sectionText)) {
      const spans = loadedFamilies
        .filter((f) => f.name !== "closer")
        .flatMap((f) => spansForFamily(f, sectionText, protectedContent, start))
        .sort((a, b) => a.start - b.start);
      // cross-family is a cluster finding, treat as voice-cadence tier3 for strictness
      // synthesize a family-like object for card gating: choose first family tier 3 if available else tier2
      const crossFamilyTier = 3;
      // we create a synthetic family for gating checks? For now create finding without family (bypass refs), but still apply strictness if needed
      // Instead we handle card strictness via finding's axis readability path? We'll just call finding without family, but then strictness low would not suppress cross-family.
      // To make card gating testable, we handle via manual check: if card strictness low + tier3 cluster without strong-evidence, suppress.
      // We'll pass a synthetic family with tier 3 for gating.
      const syntheticFamily: LoadedFamily = {
        name: "cross-family",
        packId: "voice-cadence",
        tier: crossFamilyTier,
        gating: "cluster",
        severity: "medium",
        basis: "cluster",
        patterns: [],
        thresholds: { cluster_min: 2 },
      };
      findings.push(finding("anti-style-cluster", "medium", "Cross-family anti-style cluster", spans, "cluster", input, undefined, preservationUncertainty, syntheticFamily, card, candidateWords));
    }
  }

  const progressRegex = /\b(?:I|we)\s+(?:changed|updated|implemented|modified|added|removed|ran|verified|checked)\b[^.!?\n]*[.!?]?/gi;
  const progress = unprotectedSpans(input.candidate, progressRegex, protectedContent);
  const paragraphs = [...input.candidate.matchAll(/(?:^|\n\s*\n)([\s\S]*?)(?=\n\s*\n|$)/g)];
  const resultBefore = (end: number) => /\b(?:result|outcome|current state|now|verified|passed|ready)\s*:/i.test(input.candidate.slice(0, end)) || /\b(?:the result|the outcome|the current state)\b/i.test(input.candidate.slice(0, end));
  for (const paragraph of paragraphs) {
    const start = paragraph.index! + paragraph[0].length - paragraph[1].length;
    const text = masked(paragraph[1], protectedContent.map((span) => ({ start: span.start - start, end: span.end - start }))).trim();
    const paragraphProgress = progress.filter((s) => s.start >= start && s.end <= start + paragraph[1].length);
    const onlyProgress = paragraphProgress.length > 0 && text.replace(progressRegex, "").replace(/[\s.!?]+/g, "") === "";
    if (onlyProgress && resultBefore(start)) {
      findings.push(finding("progress-narration", "medium", "Repeated progress narration in status context", paragraphProgress, "strong-evidence", input, undefined, preservationUncertainty));
    }
  }

  // Repeated paragraphs are strong evidence even when they are deliberately
  // written without terminal punctuation.  Compare masked, non-code text so
  // identifiers and quoted/code content cannot become prose evidence.
  for (let i = 1; i < paragraphs.length; i++) {
    const previous = paragraphs[i - 1];
    const current = paragraphs[i];
    const previousStart = previous.index! + previous[0].length - previous[1].length;
    const currentStart = current.index! + current[0].length - current[1].length;
    const previousText = masked(previous[1], protectedContent.map((span) => ({ start: span.start - previousStart, end: span.end - previousStart }))).trim();
    const currentText = masked(current[1], protectedContent.map((span) => ({ start: span.start - currentStart, end: span.end - currentStart }))).trim();
    if (previousText && currentText && same(previousText, currentText) && !/```|^\s*(?:[$>]|(?:npm|bun|pnpm|yarn|git|cargo|python|curl)\s)/im.test(previous[1] + "\n" + current[1])) {
      const previousSpan = { start: previousStart, end: previousStart + previous[1].length };
      const currentSpan = { start: currentStart, end: currentStart + current[1].length };
      findings.push(finding("response-length", "high", `Consecutive repeated paragraph: ${currentText}`, [previousSpan, currentSpan], "strong-evidence", input, undefined, preservationUncertainty));
    }
  }

  const words = candidateWords;
  const baseline = input.taskContext?.baselineTokens ?? null;
  const ratio = baseline && baseline > 0 ? words / baseline : null;
  const repeated = sentences.filter((s, i) => i > 0 && same(sentences[i - 1].text, s.text)).length;
  if (ratio !== null && ratio > 1 && repeated === 0 && familyEvidence.length >= 2) findings.push(finding("response-length", ratio >= 1.5 ? "medium" : "low", "Unnecessary material exceeds the matched contract baseline", [{ start: 0, end: input.candidate.length }], "repeated-signal", input, undefined, preservationUncertainty));
  const long = sentences.filter((s) => s.text.split(/\s+/).length > 40);
  if (long.length >= 2) findings.push(finding("readability", "low", "Multiple overloaded sentences", long.map((x) => x.span), "cluster", input, undefined, preservationUncertainty, undefined, card, words));
  const required = input.taskContext?.requiredPhrases ?? [];
  const retainedRequired = required.filter((phrase) => input.candidate.includes(phrase)).length;
  // No preservation obligations means the descriptive score is complete, not
  // failed. Caller-supplied requirements still determine the measured ratio.
  const preserved = required.length ? retainedRequired / required.length : 1;
  for (const phrase of required.filter((phrase) => !input.candidate.includes(phrase))) findings.push(finding("response-length", "none", `Missing required phrase: ${phrase}`, [], "strong-evidence", input, "required content is missing", { codes: ["preservation"], message: "A required phrase is absent from the candidate.", spans: [] }));
  if (invalidProtected.length) findings.push(finding("response-length", "none", "Invalid caller-provided protected span", invalidProtected, "strong-evidence", input, "protected span could not be validated", { codes: ["preservation"], message: "Caller-provided protected content has an invalid span.", spans: invalidProtected }));
  findings.sort((a, b) => (a.spans[0]?.start ?? 0) - (b.spans[0]?.start ?? 0) || a.axis.localeCompare(b.axis) || rank(b.severity) - rank(a.severity));
  const actionable = input.enabled && findings.some((f) => !f.suppressed && rank(f.severity) >= 2 && !f.uncertainty.codes.length);
  const aggregateSeverity = input.enabled ? findings.reduce<Severity>((max, f) => !f.suppressed && !f.uncertainty.codes.length && rank(f.severity) >= 2 && rank(f.severity) > rank(max) ? f.severity : max, "none") : "none";
  const allProtected = input.candidate.trim().length > 0 && Array.from({ length: input.candidate.length }, (_, index) => index).every((index) => /\s/.test(input.candidate[index]) || protectedContent.some((span) => index >= span.start && index < span.end));
  const ste = countSteViolations(input.candidate, input.mode, steThresholds);
  const steLength: SteLengthMetric = {
    value: ste.violationsPer100w,
    violations: ste.violations,
    violationsPer100w: ste.violationsPer100w,
    applicable: ste.applicable,
    unit: "violations-per-100w",
    baseline: null,
    basis: ste.applicable ? `STE soft length: ${steThresholds.instruction}-word instruction / ${steThresholds.descriptive}-word descriptive guidance counted as violations per 100 words (metric only, no gate)` : "STE soft length inert for non-tool-heavy outputs",
    provenance: "proxy",
  };
  const result: DriftResult = {
    input: { attemptID: input.attemptID, cardId, outputClass: input.outputClass, mode: input.mode, enabled: input.enabled, reinforced: input.reinforced }, findings,
    aggregate: { severity: aggregateSeverity, actionable, reinforcementEligible: actionable && !input.reinforced && findings.every((f) => f.uncertainty.codes.length === 0) },
    metrics: { concision: { value: ratio === null ? 0 : Math.max(0, 1 - ratio), unit: "ratio", baseline, basis: ratio === null ? "no matched baseline" : "candidate token count versus matched baseline" }, readability: { value: sentences.length ? Math.max(0, 1 - long.length / sentences.length) : 1, unit: "score-0-to-1", baseline: null, basis: "sentence-length distribution" }, correctness: { value: preserved, unit: "score-0-to-1", baseline: null, basis: "no rewrite; protected and required content retained" }, preservation: { value: preserved, unit: "score-0-to-1", baseline: null, basis: protectedContent.length ? "protected spans detected and excluded or discounted" : "no protected spans detected" }, steLength },
    protectedContent: { spans: protectedContent, treatment: { mode: allProtected ? "excluded" : protectedContent.length ? "discounted" : "none", reason: allProtected ? "candidate consists of protected content" : protectedContent.length ? "protected content is excluded from style evidence while surrounding material remains analyzable" : "no protected spans detected" } },
    uncertainty: [], state: { attemptID: input.attemptID, enabled: input.enabled, reinforced: input.reinforced },
  };
  result.uncertainty = [...findings.flatMap((f) => f.uncertainty), ...(preservationUncertainty.codes.length ? [preservationUncertainty] : [])].filter((u, i, all) => i === all.findIndex((x) => JSON.stringify(x) === JSON.stringify(u)));
  return result;
}

// Test helpers: expose loaded families/packs and allow synthetic card injection for tests
export const __loadedFamilies = loadedFamilies;
export const __loadedPacks = loadedPacks;
export function __injectVoiceCard(card: VoiceCard): void {
  voiceCardCache.set(card.id, card);
}
export function __clearVoiceCardCache(): void {
  voiceCardCache.clear();
}
