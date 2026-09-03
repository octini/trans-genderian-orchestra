import { STYLE_QUALITY_FIXTURES, type Mode, type StyleQualityFixture, type CardId } from "../test/fixtures/style-quality";
import { estimateTokens } from "../src/config";
import { analyzeStyleDrift, type DriftResult } from "../src/drift";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// Voice card ids — must stay in sync with plugin/assets/voices/*.json and plugin/src/voices.ts
export type VoiceCardId = CardId;
export type BenchmarkVariant = "none" | "tgo-small" | "tgo-current" | "tgo-ste-selective" | "tgo-large";

export const VARIANT_PAYLOAD_TOKENS = {
  none: 0,
  "tgo-small": 85,
  "tgo-current": 720, // 480 runtime + 240 fold (docs/spec/concision-enforcement.md actuals)
  "tgo-ste-selective": 580,
  "tgo-large": 6680,
} as const;

export const VARIANT_PAYLOAD_PROVENANCE = "proxy" as const;

// All three cards at v1 — used for 3× coverage in byCard
export const VOICE_CARD_IDS: VoiceCardId[] = ["tgo-default", "tgo-prose", "tgo-conversational"];

// D9 settled calibration synthesis — the hard targets the benchmark gates against (§9.1, D9)
// Keep these in sync with docs/spec/voice-cards.md and plugin/assets/voices/*.json
export const CARD_RHYTHM_TARGETS: Record<VoiceCardId, { buckets: [number, number, number]; mean: number; median: number; p90: number; max: number }> = {
  "tgo-default": { buckets: [30, 45, 25], mean: 18, median: 16, p90: 30, max: 60 },
  "tgo-prose": { buckets: [29, 44, 27], mean: 19, median: 16, p90: 37, max: 60 },
  "tgo-conversational": { buckets: [26, 42, 32], mean: 20, median: 19, p90: 34, max: 60 },
};

function taskClassForFixture(fixture: StyleQualityFixture): string {
  const maybe = fixture as unknown as { taskClass?: string };
  if (maybe.taskClass) return maybe.taskClass;
  if (fixture.id === "terse-qa-factual") return "terse-qa";
  if (fixture.id === "orchestration-dag-wave") return "orchestration";
  if (fixture.id.startsWith("tool-heavy") || fixture.id === "failure-warning-and-error") return "tool-heavy";
  if (fixture.outputClass === "voice-forward-prose") return "voice-forward";
  if (fixture.mode === "tool-heavy") return "tool-heavy";
  return "technical";
}

export interface BenchmarkCase {
  id: string;
  mode: Mode;
  outputClass: StyleQualityFixture["outputClass"];
  taskClass: string;
  variant: BenchmarkVariant;
  cardId: VoiceCardId;
  inputTokens: { value: number; provenance: "proxy" | "measured" };
  cachedInputTokens: { value: number; provenance: "proxy" | "measured" };
  outputTokens: { value: number; provenance: "proxy" | "measured" };
  responseLength: { characters: number; words: number; sentences: number };
  readability: { score: number; averageSentenceWords: number; longestSentenceWords: number };
  drift: { frequency: number; actionable: boolean; severity: DriftResult["aggregate"]["severity"]; precision: number; recall: number; provenance: "placeholder" };
  requiredClaimRetention: number;
  preservation: number;
  metricProvenance: { requiredClaimRetention: "fixture-retention"; preservation: "measured" };
  taskSuccess: number;
  retries: number;
  delegation: { count: number; provenance: "proxy" };
  latency: { valueMs: number; provenance: "proxy" };
  cost: { valueUsd: number; provenance: "proxy" };
  costPerSuccessfulTask: { valueUsd: number; provenance: "proxy" };
  steLength: DriftResult["metrics"]["steLength"];
  artifact: { source: "supplied-fixture" | "deterministic-surrogate"; transformation: string };
  // D14 card-aware metrics (prose §9.1)
  rhythm?: RhythmMetrics;
  paragraphHead?: { violations: number; details: string[] };
  oneDevicePerSentence?: { violations: number; violationsPer100w: number; applicable: boolean; basis: string };
}

export interface RhythmMetrics {
  totalSentences: number;
  buckets: { short: number; medium: number; long: number }; // percentages 0-100
  meanWords: number;
  medianWords: number;
  p90Words: number;
  maxWords: number;
  sentenceLens: number[];
}

export interface BenchmarkReport {
  generatedFrom: string;
  variants: Record<BenchmarkVariant, BenchmarkCase[]>;
  byMode: Record<Mode, Record<BenchmarkVariant, { cases: number; driftFrequency: number; averageOutputTokens: number; requiredClaimRetention: number; preservation: number; taskSuccess: number; averageSteViolations: number; averageCostUsd: number }>>;
  byTaskClass: Record<string, Record<BenchmarkVariant, { cases: number; driftFrequency: number; averageOutputTokens: number; requiredClaimRetention: number; preservation: number; taskSuccess: number; averageSteViolations: number }>>;
  byCard: Record<VoiceCardId, Record<BenchmarkVariant, { cases: number; driftFrequency: number; averageOutputTokens: number; requiredClaimRetention: number; preservation: number; taskSuccess: number; averageSteViolations: number; averageCostUsd: number }>>;
  failures: string[];
  externalClaims: string[];
  limitations: string[];
  thresholds: { minimumRequiredClaimRetention: number; minimumPreservation: number; maximumDriftRegression: number };
  // D14 gate detail — kept for debugging/report inspection
  cardGates?: Record<VoiceCardId, { rhythmStaticFailures: string[]; driftRegression: number; driftRegressionFailures: string[] }>;
  sessions: Array<{ id: string; mode: Mode; fixtureIDs: string[]; variants: Array<{ variant: BenchmarkVariant; lifecycle: Array<{ state: string; events: string[]; attemptID: string; input: { artifact: string; provenance: string }; generatedOutput: { artifact: string; provenance: string }; analyzerResult: DriftResult; evaluation: { artifact: string; provenance: string; requiredClaimRetention: number; preservation: number } }> }> }>;
}

const variants: BenchmarkVariant[] = ["none", "tgo-small", "tgo-current", "tgo-ste-selective", "tgo-large"];

export function sentences(text: string): string[] {
  return text.match(/[^.!?\n]+[.!?]+/g)?.map((value) => value.trim()).filter(Boolean) ?? (text.trim() ? [text.trim()] : []);
}

// -- Rhythm helpers (D9) ---------------------------------------------------------

export function rhythmMetrics(candidate: string): RhythmMetrics {
  const list = sentences(candidate);
  const lens = list.map((s) => s.split(/\s+/).filter(Boolean).length);
  const total = lens.length;
  const short = lens.filter((l) => l >= 1 && l <= 10).length;
  const medium = lens.filter((l) => l >= 11 && l <= 24).length;
  const long = lens.filter((l) => l >= 25).length;
  const buckets = total
    ? { short: (short / total) * 100, medium: (medium / total) * 100, long: (long / total) * 100 }
    : { short: 0, medium: 0, long: 0 };
  const mean = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const sorted = [...lens].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const p90 = sorted.length ? sorted[Math.floor(sorted.length * 0.9)] : 0;
  const max = lens.length ? Math.max(...lens) : 0;
  return { totalSentences: total, buckets, meanWords: mean, medianWords: median, p90Words: p90, maxWords: max, sentenceLens: lens };
}

// Load a voice card's syntax_targets for static rhythm validation (no import of src/voices to avoid Bun circular)
function loadCardSyntaxTargets(cardId: VoiceCardId): { buckets: [number, number, number]; mean: number; median: number; p90: number; max: number } | null {
  try {
    const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const file = path.join(packageRoot, "assets", "voices", `${cardId}.json`);
    const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as {
      voice_invariants?: { syntax_targets?: { sentence_buckets_by_count?: { short_1_10w?: number; medium_11_24w?: number; long_25w_plus?: number }; mean_words?: number; median_words?: number; p90_words?: number; max_words?: number } };
    };
    const st = raw.voice_invariants?.syntax_targets;
    if (!st) return null;
    const b = st.sentence_buckets_by_count;
    if (b?.short_1_10w == null || b?.medium_11_24w == null || b?.long_25w_plus == null) return null;
    return {
      buckets: [b.short_1_10w, b.medium_11_24w, b.long_25w_plus] as [number, number, number],
      mean: st.mean_words ?? CARD_RHYTHM_TARGETS[cardId].mean,
      median: st.median_words ?? CARD_RHYTHM_TARGETS[cardId].median,
      p90: st.p90_words ?? CARD_RHYTHM_TARGETS[cardId].p90,
      max: st.max_words ?? CARD_RHYTHM_TARGETS[cardId].max,
    };
  } catch {
    return null;
  }
}

// Static card-declaration check: the JSON's syntax_targets must be within D9 tolerances
export function checkRhythmStatic(cardId: VoiceCardId): string[] {
  const failures: string[] = [];
  const expected = CARD_RHYTHM_TARGETS[cardId];
  const declared = loadCardSyntaxTargets(cardId);
  if (!declared) {
    failures.push(`${cardId}: missing syntax_targets declaration`);
    return failures;
  }
  const bucketLabels: Array<[string, number, number]> = [
    ["short_1_10w", expected.buckets[0], declared.buckets[0]],
    ["medium_11_24w", expected.buckets[1], declared.buckets[1]],
    ["long_25w_plus", expected.buckets[2], declared.buckets[2]],
  ];
  for (const [label, exp, dec] of bucketLabels) {
    if (Math.abs(dec - exp) > 5) failures.push(`${cardId}: rhythm bucket ${label} ${dec} deviates >±5 from ${exp} (D9)`);
  }
  if (Math.abs(declared.mean - expected.mean) > 2) failures.push(`${cardId}: mean_words ${declared.mean} deviates >±2 from ${expected.mean}`);
  if (Math.abs(declared.median - expected.median) > 2) failures.push(`${cardId}: median_words ${declared.median} deviates >±2 from ${expected.median}`);
  if (Math.abs(declared.p90 - expected.p90) > 2) failures.push(`${cardId}: p90_words ${declared.p90} deviates >±2 from ${expected.p90}`);
  if (declared.max > 60) failures.push(`${cardId}: max_words ${declared.max} >60 hard cap`);
  if (expected.max > 60) failures.push(`${cardId}: expected max ${expected.max} >60 (spec invariant)`);
  return failures;
}

// Dynamic per-candidate rhythm check (used for negative-test helpers and optionally per fixture)
export function checkRhythmDynamic(candidate: string, cardId: VoiceCardId, opts?: { minSentences?: number; minWords?: number }): string[] {
  const failures: string[] = [];
  const m = rhythmMetrics(candidate);
  const words = candidate.trim().split(/\s+/).filter(Boolean).length;
  const minSentences = opts?.minSentences ?? 8;
  const minWords = opts?.minWords ?? 80;
  // Small technical fragments are exempt — otherwise n=10 short fixtures would spuriously fail D9 prose buckets
  if (m.totalSentences < minSentences || words < minWords) return failures;
  const expected = CARD_RHYTHM_TARGETS[cardId];
  if (Math.abs(m.buckets.short - expected.buckets[0]) > 5) failures.push(`${cardId}: rhythm short bucket ${m.buckets.short.toFixed(1)}% deviates >±5 from ${expected.buckets[0]}%`);
  if (Math.abs(m.buckets.medium - expected.buckets[1]) > 5) failures.push(`${cardId}: rhythm medium bucket ${m.buckets.medium.toFixed(1)}% deviates >±5 from ${expected.buckets[1]}%`);
  if (Math.abs(m.buckets.long - expected.buckets[2]) > 5) failures.push(`${cardId}: rhythm long bucket ${m.buckets.long.toFixed(1)}% deviates >±5 from ${expected.buckets[2]}%`);
  if (Math.abs(m.meanWords - expected.mean) > 2) failures.push(`${cardId}: rhythm mean ${m.meanWords.toFixed(1)} deviates >±2 from ${expected.mean}`);
  if (Math.abs(m.medianWords - expected.median) > 2) failures.push(`${cardId}: rhythm median ${m.medianWords} deviates >±2 from ${expected.median}`);
  if (Math.abs(m.p90Words - expected.p90) > 2) failures.push(`${cardId}: rhythm p90 ${m.p90Words} deviates >±2 from ${expected.p90}`);
  if (m.maxWords > 60) failures.push(`${cardId}: rhythm max ${m.maxWords} >60 hard cap`);
  return failures;
}

// Hard max ≤60 check — always applied per fixture (fixture-level assertion)
export function checkMaxHard(candidate: string, fixtureId?: string): string[] {
  const m = rhythmMetrics(candidate);
  if (m.maxWords > 60) return [`${fixtureId ?? "candidate"}: max ${m.maxWords} >60 hard fail`];
  return [];
}

// -- Paragraph-head discipline (D9) -------------------------------------------
// Rule: max one long opener before a short landing; never two longs stacked.
// Long = >25 words, short = 1–10 words. Applies per paragraph (split on \n\n).
export function checkParagraphHead(candidate: string, fixtureId?: string): string[] {
  const failures: string[] = [];
  const paragraphs = candidate.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  // If no explicit paragraph breaks, treat whole candidate as one paragraph
  const paras = paragraphs.length ? paragraphs : [candidate];
  for (let pi = 0; pi < paras.length; pi++) {
    const para = paras[pi];
    const list = sentences(para);
    const lens = list.map((s) => s.split(/\s+/).filter(Boolean).length);
    const isLong = (n: number) => n > 25;
    const isShort = (n: number) => n >= 1 && n <= 10;
    // Never two longs stacked — any consecutive pair both long is a violation
    for (let i = 0; i < lens.length - 1; i++) {
      if (isLong(lens[i]) && isLong(lens[i + 1])) {
        failures.push(`${fixtureId ?? "candidate"}: paragraph ${pi + 1} sentences ${i + 1}-${i + 2} are both long (${lens[i]}, ${lens[i + 1]}w) — never two longs stacked`);
      }
    }
    // Max one long opener before a short landing: if paragraph opens with a long,
    // the next sentence must be short. If opening long and second is not short, violation.
    if (lens.length >= 2 && isLong(lens[0]) && !isShort(lens[1])) {
      failures.push(`${fixtureId ?? "candidate"}: paragraph ${pi + 1} opens with long (${lens[0]}w) but second is not short landing (${lens[1]}w) — max one long opener before short`);
    }
    // Also if paragraph opens with two longs, already caught above, but keep explicit
    if (lens.length >= 2 && isLong(lens[0]) && isLong(lens[1])) {
      // already reported, but keep as discipline grouping
    }
  }
  return failures;
}

// -- One-device-per-sentence + STE (D9, D11) -----------------------------------
// One device per sentence: heuristic — count "device markers" per sentence.
// Markers: em-dash (— or --), simile " like " / " as " patterns, "as if", "than",
// metaphor signal "is a ...", but we approximate with a small deterministic set.
// For benchmark we treat any sentence containing >1 distinct marker type as violation.
const DEVICE_MARKERS: Array<{ name: string; re: RegExp }> = [
  { name: "em-dash", re: /—|--/ },
  { name: "simile-like", re: /\blike\b/i },
  { name: "simile-as", re: /\bas\b/i },
  { name: "metaphor-is", re: /\bis a\b/i },
  { name: "rule-of-three-signal", re: /,.*,.*and\b/i },
];

export function countDeviceViolations(candidate: string): { violations: number; perSentence: number[] } {
  const list = sentences(candidate);
  let violations = 0;
  const perSentence: number[] = [];
  for (const s of list) {
    const hits = DEVICE_MARKERS.filter((m) => m.re.test(s)).length;
    perSentence.push(hits);
    if (hits > 1) violations++;
  }
  return { violations, perSentence };
}

export function checkOneDevicePerSentence(candidate: string, mode: Mode): { violations: number; violationsPer100w: number; applicable: boolean; failures: string[] } {
  const applicable = mode === "tool-heavy";
  // For non-tool-heavy, metric is inert (same provenance split as steLength) — do not gate
  if (!applicable) {
    return { violations: 0, violationsPer100w: 0, applicable: false, failures: [] };
  }
  const { violations } = countDeviceViolations(candidate);
  const words = candidate.trim().split(/\s+/).filter(Boolean).length || 1;
  const violationsPer100w = (violations / words) * 100;
  const failures: string[] = [];
  if (violations > 0) failures.push(`one-device-per-sentence: ${violations} sentence(s) with >1 device (violationsPer100w ${violationsPer100w.toFixed(2)})`);
  return { violations, violationsPer100w, applicable, failures };
}

// -- Anti-pattern FP budgets helpers -------------------------------------------
// For benchmark we expose a helper to check per-card thresholds violation budgets.
// The actual drift gating is via analyzeStyleDrift's card-aware thresholds; here we
// gate that per-card driftFrequency stays within card-declared maxima and regression ≤0.25.

function artifact(fixture: StyleQualityFixture, variant: BenchmarkVariant): { candidate: string; source: BenchmarkCase["artifact"]["source"]; transformation: string } {
  if (variant === "none") {
    return { candidate: `${fixture.candidate}\nThe answer is to restart the service.`, source: "deterministic-surrogate", transformation: "none: baseline with no scrub (0-token payload, no style injection)" };
  }
  if (variant === "tgo-current") {
    return { candidate: fixture.candidate, source: "supplied-fixture", transformation: "tgo-current: current TGO payload (480 runtime + 240 fold, scrub + style card)" };
  }
  if (variant === "tgo-small") {
    const candidate = fixture.candidate
      .replace(/It is important to note that we can utilize this robust approach\./g, "Use this approach.")
      .replace(/ Hope this helps\./g, "");
    const transformed = candidate !== fixture.candidate ? candidate : fixture.candidate;
    const trans = candidate !== fixture.candidate ? "tgo-small: scrub-only (85-token payload, single-pattern removal)" : "tgo-small: scrub-only (85-token payload, no applicable pattern in candidate)";
    return { candidate: transformed, source: transformed === fixture.candidate ? "supplied-fixture" : "deterministic-surrogate", transformation: trans };
  }
  if (variant === "tgo-ste-selective") {
    const base = fixture.candidate;
    const candidate = base
      .replace(/\butilize\b/gi, "use")
      .replace(/\butilizes\b/gi, "uses")
      .replace(/\butilized\b/gi, "used")
      .replace(/\butilizing\b/gi, "using")
      .replace(/\bleverage\b/gi, "use")
      .replace(/\bdelve\b/gi, "explore");
    const scrubbed = candidate
      .replace(/It is important to note that we can use this robust approach\./g, "Use this approach.")
      .replace(/ Hope this helps\./g, "");
    return { candidate: scrubbed, source: scrubbed === fixture.candidate ? "supplied-fixture" : "deterministic-surrogate", transformation: "tgo-ste-selective: tgo-current + selective STE vocabulary (use vs utilize) with steLength (580-token payload)" };
  }
  const candidate = fixture.candidate
    .replace(/It is important to note that we can utilize this robust approach\./g, "Use this approach.")
    .replace(/I think it is really useful and, in my opinion, it is the best option\./g, "This is the best option.")
    .replace(/ The answer is to restart the service\. The answer is to restart the service\./g, " Restart the service.")
    .replace(/ Hope this helps\./g, "")
    .replace(/\butilize\b/gi, "use")
    .replace(/\bleverage\b/gi, "use")
    .replace(/\bdelve\b/gi, "explore")
    .replace(/\bshowcase\b/gi, "show")
    .replace(/\blandscape\b/gi, "area")
    .replace(/\bseamless\b/gi, "smooth")
    .replace(/\brobust\b/gi, "strong")
    .replace(/\bworld-class\b/gi, "strong")
    .replace(/\bcutting-edge\b/gi, "strong")
    .replace(/\bbasically\b/gi, "")
    .replace(/\bactually\b/gi, "")
    .replace(/\bReally\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return { candidate, source: "deterministic-surrogate", transformation: "tgo-large: heavy taxonomy (6680-token payload, full 33-pattern STE/humanizer list)" };
}

function metricCase(fixture: StyleQualityFixture, variant: BenchmarkVariant, cardId: VoiceCardId): BenchmarkCase {
  const supplied = artifact(fixture, variant);
  const candidate = supplied.candidate;
  const result = analyzeStyleDrift({
    attemptID: `${fixture.id}:${variant}:${cardId}`,
    cardId,
    // byCard naming: cardId is primary; legacy register alias ("concise"/"natural" → "default") kept as fallback for older fixtures
    register: fixture.register,
    outputClass: fixture.outputClass,
    mode: fixture.mode,
    enabled: true,
    reinforced: false,
    candidate,
  });
  const sentenceList = sentences(candidate);
  const sentenceWords = sentenceList.map((sentence) => sentence.split(/\s+/).filter(Boolean).length);
  const protectedTexts = fixture.protected.map(({ text }) => text);
  const retained = protectedTexts.filter((text) => candidate.includes(text)).length;
  const uncertaintyArtifact = /\b(?:uncertain|unknown|not sure|cannot verify|can't verify|unable to verify|remains unclear)\b/i.test(candidate);
  const preservation = uncertaintyArtifact ? 0 : protectedTexts.length ? retained / protectedTexts.length : 1;
  const requiredClaims = fixture.expected.requiredClaims;
  const retainedClaims = requiredClaims.filter((claim) => candidate.includes(claim)).length;
  const requiredClaimRetention = uncertaintyArtifact ? 0 : requiredClaims.length ? retainedClaims / requiredClaims.length : 1;
  const taskClass = taskClassForFixture(fixture);
  const baseInputTokens = estimateTokens(`${fixture.mode} ${fixture.outputClass} ${fixture.description}`);
  const payloadTokens = VARIANT_PAYLOAD_TOKENS[variant];
  const inputTokensValue = baseInputTokens + payloadTokens;
  const cachedInputTokensValue = Math.floor(payloadTokens * 0.6);
  const outputTokensValue = estimateTokens(candidate);
  const isUncertain = uncertaintyArtifact;
  const taskSuccess = !isUncertain && preservation === 1 && requiredClaimRetention === 1 ? 1 : 0;
  const delegationCount = (() => {
    if (variant === "none") return 0;
    if (taskClass === "orchestration") return variant === "tgo-large" ? 4 : variant === "tgo-current" || variant === "tgo-ste-selective" ? 3 : 1;
    if (fixture.mode === "tool-heavy") return variant === "tgo-large" ? 3 : variant === "tgo-small" ? 1 : 2;
    return 0;
  })();
  const retries = 0;
  const latencyMs = Math.round(80 + payloadTokens * 0.15 + candidate.length * 0.3 + delegationCount * 12);
  const costUsd = Number(((inputTokensValue + cachedInputTokensValue * 0.5 + outputTokensValue) * 0.000002).toFixed(6));
  const costPerSuccessfulTaskUsd = taskSuccess ? costUsd : Number((costUsd * 2).toFixed(6));
  const actionableCount = result.findings.filter((finding) => !finding.suppressed).length;
  const expectedActionable = fixture.expected.actionable ? 1 : 0;
  const observedActionable = result.aggregate.actionable ? 1 : 0;
  const precision = observedActionable === 0 && expectedActionable === 0 ? 1 : observedActionable === expectedActionable ? 1 : 0.5;
  const recall = expectedActionable === 0 ? 1 : observedActionable === 1 ? 1 : 0;
  // card-aware rhythm + paragraph-head + device metrics for byCard visibility
  const rhythm = rhythmMetrics(candidate);
  const paragraphHead = { violations: checkParagraphHead(candidate).length, details: checkParagraphHead(candidate) };
  const oneDevice = (() => {
    const { violations, violationsPer100w, applicable } = checkOneDevicePerSentence(candidate, fixture.mode);
    return { violations, violationsPer100w, applicable, basis: applicable ? `one-device-per-sentence violations per 100w (metric, tool-heavy only, provenance proxy)` : "one-device-per-sentence inert for non-tool-heavy (provenance proxy)" };
  })();
  return {
    id: fixture.id,
    mode: fixture.mode,
    outputClass: fixture.outputClass,
    taskClass,
    variant,
    cardId,
    inputTokens: { value: inputTokensValue, provenance: "proxy" },
    cachedInputTokens: { value: cachedInputTokensValue, provenance: "proxy" },
    outputTokens: { value: outputTokensValue, provenance: "proxy" },
    responseLength: { characters: candidate.length, words: candidate.trim().split(/\s+/).filter(Boolean).length, sentences: sentenceList.length },
    readability: { score: result.metrics.readability.value, averageSentenceWords: sentenceWords.length ? sentenceWords.reduce((a, b) => a + b, 0) / sentenceWords.length : 0, longestSentenceWords: Math.max(0, ...sentenceWords) },
    drift: { frequency: actionableCount, actionable: result.aggregate.actionable, severity: result.aggregate.severity, precision, recall, provenance: "placeholder" },
    requiredClaimRetention,
    preservation,
    metricProvenance: { requiredClaimRetention: "fixture-retention", preservation: "measured" },
    taskSuccess,
    retries,
    delegation: { count: delegationCount, provenance: "proxy" },
    latency: { valueMs: latencyMs, provenance: "proxy" },
    cost: { valueUsd: costUsd, provenance: "proxy" },
    costPerSuccessfulTask: { valueUsd: costPerSuccessfulTaskUsd, provenance: "proxy" },
    steLength: result.metrics.steLength,
    artifact: { source: supplied.source, transformation: supplied.transformation },
    rhythm,
    paragraphHead,
    oneDevicePerSentence: oneDevice as BenchmarkCase["oneDevicePerSentence"],
  };
}

function summary(cases: BenchmarkCase[]) {
  return {
    cases: cases.length,
    driftFrequency: cases.length ? cases.filter((item) => item.drift.actionable).length / cases.length : 0,
    averageOutputTokens: cases.length ? cases.reduce((sum, item) => sum + item.outputTokens.value, 0) / cases.length : 0,
    requiredClaimRetention: cases.length ? cases.reduce((sum, item) => sum + item.requiredClaimRetention, 0) / cases.length : 0,
    preservation: cases.length ? cases.reduce((sum, item) => sum + item.preservation, 0) / cases.length : 0,
    taskSuccess: cases.length ? cases.reduce((sum, item) => sum + item.taskSuccess, 0) / cases.length : 0,
    averageSteViolations: cases.length ? cases.reduce((sum, item) => sum + item.steLength.violations, 0) / cases.length : 0,
    averageCostUsd: cases.length ? cases.reduce((sum, item) => sum + item.cost.valueUsd, 0) / cases.length : 0,
  };
}

function lifecycle(fixture: StyleQualityFixture, variant: BenchmarkVariant, item: BenchmarkCase) {
  const generated = artifact(fixture, variant);
  const analyzerResult = analyzeStyleDrift({
    attemptID: `${fixture.id}:${variant}:${item.cardId}`,
    cardId: item.cardId,
    register: fixture.register,
    outputClass: fixture.outputClass,
    mode: fixture.mode,
    enabled: true,
    reinforced: false,
    candidate: generated.candidate,
  });
  return {
    state: "completed",
    events: ["created", "generated", "analyzed", "evaluated", "completed"],
    attemptID: `${fixture.id}:${variant}:${item.cardId}`,
    input: { artifact: fixture.candidate, provenance: "supplied-fixture" },
    generatedOutput: { artifact: generated.candidate, provenance: generated.source },
    analyzerResult,
    evaluation: { artifact: `${fixture.id}:${variant}:${item.cardId}:evaluation`, provenance: "deterministic-fixture-evaluation", requiredClaimRetention: item.requiredClaimRetention, preservation: item.preservation },
  };
}

export function runBenchmark(fixtures = STYLE_QUALITY_FIXTURES): BenchmarkReport {
  // 3× card coverage: each fixture under each of tgo-default/prose/conversational for every variant
  const variantCases = Object.fromEntries(
    variants.map((variant) => [variant, fixtures.flatMap((fixture) => VOICE_CARD_IDS.map((cardId) => metricCase(fixture, variant, cardId)))])
  ) as Record<BenchmarkVariant, BenchmarkCase[]>;
  const byMode = Object.fromEntries(
    ((["chat", "tool-heavy"] as Mode[]).map((mode) => [mode, Object.fromEntries(variants.map((variant) => [variant, summary(variantCases[variant].filter((item) => item.mode === mode))]))]))
  ) as BenchmarkReport["byMode"];
  const taskClasses = [...new Set(fixtures.map((f) => taskClassForFixture(f)))];
  const byTaskClass = Object.fromEntries(
    taskClasses.map((taskClass) => [taskClass, Object.fromEntries(variants.map((variant) => [variant, summary(variantCases[variant].filter((item) => item.taskClass === taskClass))]))])
  ) as BenchmarkReport["byTaskClass"];
  const byCard = Object.fromEntries(
    VOICE_CARD_IDS.map((cardId) => [cardId, Object.fromEntries(variants.map((variant) => [variant, summary(variantCases[variant].filter((item) => item.cardId === cardId))]))])
  ) as BenchmarkReport["byCard"];

  const failures: string[] = [];
  const thresholds = { minimumRequiredClaimRetention: 1, minimumPreservation: 1, maximumDriftRegression: 0.25 };

  // -- Static rhythm declaration gates (D9) — one per card, always checked
  const cardGates: Record<VoiceCardId, { rhythmStaticFailures: string[]; driftRegression: number; driftRegressionFailures: string[] }> = {
    "tgo-default": { rhythmStaticFailures: [], driftRegression: 0, driftRegressionFailures: [] },
    "tgo-prose": { rhythmStaticFailures: [], driftRegression: 0, driftRegressionFailures: [] },
    "tgo-conversational": { rhythmStaticFailures: [], driftRegression: 0, driftRegressionFailures: [] },
  };
  for (const cardId of VOICE_CARD_IDS) {
    const staticFailures = checkRhythmStatic(cardId);
    cardGates[cardId].rhythmStaticFailures = staticFailures;
    failures.push(...staticFailures);
  }

  // -- Per-fixture correctness spine (exact, card-matched)
  // Only the fixture's declared card is checked for severity/preservation to avoid cross-card false positives
  for (const fixture of fixtures) {
    // Fixture's declared card (fallback to tgo-default for legacy register fixtures)
    const declaredCard: VoiceCardId = (fixture.cardId as VoiceCardId) ?? "tgo-default";
    const currentCases = variantCases["tgo-current"].filter((item) => item.id === fixture.id && item.cardId === declaredCard);
    // There will be exactly one per declared card
    for (const current of currentCases) {
      if (current.drift.severity !== fixture.expected.aggregate) failures.push(`${fixture.id} [${declaredCard}]: severity ${current.drift.severity} != expected ${fixture.expected.aggregate}`);
      const expectedRequiredClaimRetention = fixture.expected.preservation === "uncertain" ? 0 : thresholds.minimumRequiredClaimRetention;
      if (current.requiredClaimRetention !== expectedRequiredClaimRetention) failures.push(`${fixture.id} [${declaredCard}]: required claim retention ${current.requiredClaimRetention} != expected ${expectedRequiredClaimRetention}`);
      const expectedPreservation = fixture.expected.preservation === "uncertain" ? 0 : thresholds.minimumPreservation;
      if (current.preservation !== expectedPreservation) failures.push(`${fixture.id} [${declaredCard}]: preservation ${current.preservation} != expected ${expectedPreservation}`);
      const baseline = variantCases.none.find((item) => item.id === fixture.id && item.cardId === declaredCard)!;
      const driftRegression = current.drift.frequency - baseline.drift.frequency;
      if (driftRegression > thresholds.maximumDriftRegression) failures.push(`${fixture.id} [${declaredCard}]: drift regression ${driftRegression} > ${thresholds.maximumDriftRegression}`);
    }
    // Also enforce exact preservation/retention for all cards' tgo-current (non-uncertain fixtures must stay 1.0)
    if (fixture.expected.preservation !== "uncertain") {
      for (const cardId of VOICE_CARD_IDS) {
        const c = variantCases["tgo-current"].find((item) => item.id === fixture.id && item.cardId === cardId)!;
        if (c.requiredClaimRetention !== 1) failures.push(`${fixture.id} [${cardId}]: required claim retention ${c.requiredClaimRetention} != 1.0 (preservation gate)`);
        if (c.preservation !== 1) failures.push(`${fixture.id} [${cardId}]: preservation ${c.preservation} != 1.0 (preservation gate)`);
      }
    }
  }

  // -- Per-card drift regression analogue (threshold 0.25 per card)
  for (const cardId of VOICE_CARD_IDS) {
    const currentCases = variantCases["tgo-current"].filter((c) => c.cardId === cardId);
    const baselineCases = variantCases.none.filter((c) => c.cardId === cardId);
    const currentFreq = currentCases.length ? currentCases.filter((c) => c.drift.actionable).length / currentCases.length : 0;
    const baselineFreq = baselineCases.length ? baselineCases.filter((c) => c.drift.actionable).length / baselineCases.length : 0;
    const regression = currentFreq - baselineFreq;
    cardGates[cardId].driftRegression = regression;
    if (regression > thresholds.maximumDriftRegression) {
      const msg = `${cardId}: drift regression ${regression.toFixed(3)} > ${thresholds.maximumDriftRegression} (per-card)` ;
      cardGates[cardId].driftRegressionFailures.push(msg);
      failures.push(msg);
    }
    // Anti-pattern FP budget: per-card thresholds violations stay within card-declared maxima (proxy: driftFrequency must not exceed 0.25 + baseline)
    // Already covered by regression check above; keep as explicit gate for documentation.
  }

  // -- Per-fixture max ≤60 hard fail and paragraph-head discipline (fixture-level assertion)
  // Checked for every card/variant's tgo-current to ensure 3× coverage; any violation hard-fails.
  for (const fixture of fixtures) {
    for (const cardId of VOICE_CARD_IDS) {
      const candidate = artifact(fixture, "tgo-current").candidate;
      const maxFailures = checkMaxHard(candidate, `${fixture.id} [${cardId}]`);
      failures.push(...maxFailures);
      const headFailures = checkParagraphHead(candidate, `${fixture.id} [${cardId}]`);
      failures.push(...headFailures);
      // One-device-per-sentence is metric-only for non-tool-heavy; for tool-heavy, record as failure only if we consider it a gate.
      // Spec: inert/metric-only for non-tool-heavy, violations-per-100w for tool-heavy (same provenance as steLength) — so not a hard gate for chat.
      // We keep it as metric-only here; tests can assert helper directly. If strict gating is desired for tool-heavy, uncomment:
      // if (fixture.mode === "tool-heavy") {
      //   const { failures: deviceFailures } = checkOneDevicePerSentence(candidate, fixture.mode);
      //   failures.push(...deviceFailures.map(f => `${fixture.id} [${cardId}]: ${f}`));
      // }
      // STE is likewise inert for chat, violations-per-100w for tool-heavy — already in steLength, not a hard gate.
    }
  }

  // -- Rhythm dynamic per-fixture gate: wired for size-qualifying fixtures (minSentences 8 / minWords 80 already in helper)
  // Short fixtures (e.g., prose exemplars 40/31/28 words) are exempt via the helper's size gate — no spurious failures.
  for (const fixture of fixtures) {
    for (const cardId of VOICE_CARD_IDS) {
      const candidate = artifact(fixture, "tgo-current").candidate;
      const dynFailures = checkRhythmDynamic(candidate, cardId);
      if (dynFailures.length) failures.push(...dynFailures.map((f) => `${fixture.id} [${cardId}]: ${f}`));
    }
  }

  return {
    generatedFrom: "plugin/test/fixtures/style-quality.ts + plugin/src/drift.ts + plugin/assets/voices/*.json (card-aware D14)",
    variants: variantCases,
    byMode,
    byTaskClass,
    byCard,
    failures,
    externalClaims: ["Caveman's reported token reductions are external vendor claims from docs/research/concision-skills.md, not TGO measurements."],
    limitations: [
      "Benchmark uses deterministic surrogates and proxy token/cost/latency fields, not provider-measured usage.",
      "Drift precision/recall are placeholders against fixture contracts, not human or model ratings.",
      "Cost per successful task is a proxy (input + cached input + output tokens) and does not drive adoption decisions automatically (no auto-adoption).",
      "Style payload sizes are constants (none=0, tgo-small~85, tgo-current~720, tgo-ste-selective~580, tgo-large~6680) with provenance proxy.",
      "byCard aggregates 3× coverage: each fixture run under tgo-default / tgo-prose / tgo-conversational per variant; legacy 5-way variant labels retained for history with byCard aliasing.",
      "Rhythm buckets per card are gated against D9 targets (prose 29/44/27 mean 19 median 16 p90 37, conversational 26/42/32 mean 20 median 19 p90 34, default 30/45/25 mean 18 median 16 p90 30) within ±5 points / ±2 words; max ≤60 hard fail (static card declaration + per-fixture max check).",
      "Paragraph-head discipline: max one long opener before short landing; never two longs stacked (fixture-level assertion).",
      "One-device-per-sentence + STE 20/25 are inert/metric-only for non-tool-heavy and violations-per-100w for tool-heavy (same provenance split as steLength).",
      "Anti-pattern FP budgets: per-card drift regression beyond 0.25 per card fails (analogue of thresholds.maximumDriftRegression).",
    ],
    thresholds,
    cardGates,
    sessions: (["chat", "tool-heavy"] as Mode[]).map((mode) => ({ id: `style-quality:${mode}`, mode, fixtureIDs: fixtures.filter((fixture) => fixture.mode === mode).map((fixture) => fixture.id), variants: variants.map((variant) => ({ variant, lifecycle: variantCases[variant].filter((item) => item.mode === mode).map((item) => lifecycle(fixtures.find((fixture) => fixture.id === item.id)!, variant, item)) })) })),
  };
}

export function renderBenchmark(report: BenchmarkReport): string {
  return JSON.stringify(report, null, 2) + "\n";
}

if (import.meta.main) {
  const report = runBenchmark();
  const check = Bun.argv.includes("--check");
  process.stdout.write(renderBenchmark(report));
  if (check && report.failures.length) process.exit(1);
}
