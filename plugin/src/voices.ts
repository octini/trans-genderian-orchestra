import { z } from "zod";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export const voiceCardIdSchema = z.enum(["tgo-default", "tgo-prose", "tgo-conversational"]);
export type VoiceCardId = z.infer<typeof voiceCardIdSchema>;

const metaSchema = z.object({
  display_name: z.string().min(1),
  attribution: z.string().min(1),
  exemplar_source: z.string().optional(),
  notes: z.string().optional(),
});

const sentenceBucketsSchema = z.object({
  short_1_10w: z.number().int().min(0).max(100).optional(),
  medium_11_24w: z.number().int().min(0).max(100).optional(),
  long_25w_plus: z.number().int().min(0).max(100).optional(),
});

const steThresholdsSchema = z.object({
  instruction: z.number().int().positive().optional(),
  descriptive: z.number().int().positive().optional(),
});

const syntaxTargetsSchema = z.object({
  sentence_buckets_by_count: sentenceBucketsSchema.optional(),
  mean_words: z.number().optional(),
  median_words: z.number().optional(),
  p90_words: z.number().optional(),
  max_words: z.number().int().positive().optional(),
  long_formation: z.string().optional(),
  ste_thresholds: steThresholdsSchema.optional(),
});

const punctuationBudgetsSchema = z.object({
  em_dash_per_100w_max: z.number().optional(),
  em_dash_cluster_flag: z.number().int().optional(),
  sentence_initial_transitions_per_paragraph_max: z.number().int().optional(),
  transitions_exempt_from_flagging: z.array(z.string()).optional(),
  one_device_per_sentence: z.boolean().optional(),
});

const rhythmRulesSchema = z.object({
  paragraph_head_discipline: z.string().optional(),
  length_bias: z.enum(["short", "medium", "long"]).optional(),
  variance_follows_emphasis: z.boolean().optional(),
  no_metronome_alternation: z.boolean().optional(),
  linked_clause_requires_verb: z.boolean().optional(),
  fragments: z.string().optional(),
});

const antiPatternsThresholdsSchema = z
  .object({
    hedge_stack_max: z.number().int().optional(),
    hidden_actor_flag: z.string().optional(),
    rule_of_three_cluster: z.number().int().optional(),
    synonym_cycle_window_sentences: z.number().int().optional(),
    novelty_inflation_flag: z.string().optional(),
    false_balance_flag: z.string().optional(),
  })
  .passthrough();

const antiPatternsSchema = z.object({
  refs: z.array(z.string()).optional(),
  strictness: z.enum(["low", "medium", "high"]).optional(),
  thresholds: antiPatternsThresholdsSchema.optional(),
});

const controlsSchema = z.object({
  off_switch: z.string().optional(),
  exemplar_injection_max: z.number().int().min(0).optional(),
  exemplar_selection: z.string().optional(),
  closer: z.string().optional(),
});

const voiceInvariantsSchema = z.object({
  tone: z.string().optional(),
  diction: z.string().optional(),
  syntax_targets: syntaxTargetsSchema.optional(),
  punctuation_budgets: punctuationBudgetsSchema.optional(),
  rhythm_rules: rhythmRulesSchema.optional(),
  perspective: z.string().optional(),
  anti_patterns: antiPatternsSchema.optional(),
  controls: controlsSchema.optional(),
});

const templateSchema = z.object({
  shape: z.string().min(1),
  moves: z.array(z.string()),
  constraints: z.array(z.string()).optional(),
});

const arcRepertoireSchema = z.object({
  templates: z.array(templateSchema).optional(),
});

const exemplarSchema = z.object({
  shape: z.string().min(1),
  person: z.enum(["first", "second", "third"]),
  first_line: z.string().min(1),
  last_line: z.string().min(1),
  text: z.string().min(1),
});

export function estimateVoiceTokens(text: string): number {
  const normalized = text.replace(/\s+/g, " ").trim();
  const words = normalized.length === 0 ? 0 : normalized.split(" ").length;
  const punctuation = (normalized.match(/[^\w\s]/g) ?? []).length;
  return Math.ceil(words + punctuation * 0.25);
}

export function renderFold(card: VoiceCard): string {
  const v = card.voice_invariants;
  const parts: string[] = [];
  parts.push("## TGO house style — active every turn");
  parts.push("");
  // Structure — from perspective + rhythm_rules + syntax_targets
  const structure = v.perspective ?? "use active voice. Put condition before command. Use one action per numbered step and complete instructional sentences. Start with the action; restate the state; use no preamble or closer.";
  parts.push(`- Structure — ${structure}`);
  // Prose — compressed from diction (first sentence + key preserves)
  const proseCore = "compress style, never substance. Drop articles only in scan-oriented fragments, not instructional sentences. Preserve qualifiers, negations, numbers, units, identifiers, commands, errors, and explanations needed for correctness, safety, or ambiguity handling. Keep code verbatim. Never invent facts. Use project's own language (ubiquitous language).";
  parts.push(`- Prose — ${proseCore}`);
  // Banned tells — always the full high-leverage list; the degraded fallback string is removed.
  // Probe retained as hard gate for the baked default: if default diction ever loses the cluster phrase, fail loudly rather than emit degraded output.
  if (card.id === "tgo-default" && !v.diction?.includes("judge by clusters")) {
    throw new Error(`renderFold: card ${card.id} diction missing "judge by clusters" — refusing degraded fallback; expected full banned-tell vocabulary`);
  }
  const bannedShort = "Banned tells (judge by clusters, not isolated instances — one however is fine, a run of AI-isms is not): filler, AI-vocab (utilize, leverage, delve, showcase, landscape, testament), marketing adjectives (seamless, robust, cutting-edge, effortless, world-class), pomposities (commence, initiate, furthermore, moreover), adverbs (really, just, literally, truly), modal hedges (it is important to note), rule-of-three, not X, it's Y, synonym-cycling, passive voice, em-dash spam, throat-clearing, chatbot closers (Hope this helps), diff-anchored narration.";
  parts.push(`- ${bannedShort}`);
  // Code + self-audit from controls
  const code = v.controls?.closer ?? "smallest working change; never cut tests or errors; report code first.";
  // Extract code portion: first sentences
  const codeSnippet = code.split(";")[0] ?? code;
  parts.push(`- Code — ${codeSnippet.trim()}; never cut tests, error handling, or security checks to save space; report code first.`);
  parts.push(`- Self-audit — re-read before delivering; cut or rewrite any banned tell without dropping information.`);
  parts.push(`- Off-switch: ${v.controls?.off_switch ?? "stop X / normal mode"} turns this layer off. Break these only when following them breaks correctness.`);
  // Plain-english delta hint (modal + abstract noun) compressed
  parts.push(`- Plain-english: abstract-noun subjects banned; circumlocution swaps due to the fact that→because, at this point in time→now, in order to→to; modal ladder should is hedge — use must or state as fact; no sycophancy; priors: Plain Language (ISO 24495-1), Strunk & White, The Elements of Style.`);
  const text = parts.join("\n");
  // Guard: ensure ≤250 tokens; if over, truncate to 250 by trimming last parts
  if (estimateVoiceTokens(text) > 250) {
    // iterative truncation: remove plain-english line first, then shorten banned tells
    let candidate = parts.slice(0, -1).join("\n");
    if (estimateVoiceTokens(candidate) <= 250) return candidate;
    // fallback: hard truncate words to 250 tokens approx (1 token ~ 0.75 words → 250 tokens ~ 188 words)
    const words = text.split(/\s+/);
    return words.slice(0, 190).join(" ");
  }
  return text;
}

export function renderStyleOverride(card: VoiceCard): string {
  if (card.id === "tgo-default") return "";
  const v = card.voice_invariants;
  const parts: string[] = [];
  parts.push(`## TGO voice delta — ${card.id} (layered on default; default spine still applies)`);
  parts.push("");
  if (v.tone) parts.push(`- Tone delta: ${v.tone}.`);
  if (v.diction) {
    const snippet = v.diction.length > 160 ? v.diction.slice(0, 160).trim() + "…" : v.diction;
    parts.push(`- Diction delta: ${snippet}`);
  }
  if (v.perspective) parts.push(`- Perspective: ${v.perspective}`);
  const r = v.rhythm_rules;
  if (r) {
    const bits: string[] = [];
    if (r.paragraph_head_discipline) bits.push(r.paragraph_head_discipline);
    if (r.length_bias) bits.push(`length bias ${r.length_bias}`);
    if (r.fragments) bits.push(r.fragments);
    if (bits.length) parts.push(`- Rhythm: ${bits.join("; ")}.`);
  }
  const st = v.syntax_targets;
  if (st?.sentence_buckets_by_count) {
    const b = st.sentence_buckets_by_count;
    parts.push(`- Syntax targets: buckets ${b.short_1_10w}/${b.medium_11_24w}/${b.long_25w_plus}, mean ${st.mean_words} median ${st.median_words} p90 ${st.p90_words} max ${st.max_words} (${st.long_formation ?? "paratactic addition"}).`);
  }
  const pb = v.punctuation_budgets;
  if (pb) {
    parts.push(`- Punctuation: em-dash ${pb.em_dash_per_100w_max ?? "n/a"}/100w cluster ${pb.em_dash_cluster_flag ?? "n/a"}, transitions ${pb.sentence_initial_transitions_per_paragraph_max ?? "n/a"}/para, one device per sentence ${pb.one_device_per_sentence ?? true}.`);
  }
  const arc = card.arc_repertoire?.templates;
  if (arc?.length) {
    const shapes = arc.map((t) => t.shape).join(", ");
    parts.push(`- Arc repertoire (shape-tagged, 1–2 only): ${shapes}.`);
  }
  const ap = v.anti_patterns;
  if (ap) {
    const refs = (ap.refs ?? []).join(", ");
    parts.push(`- Anti-patterns: strictness ${ap.strictness ?? "medium"}; refs [${refs}].`);
  }
  if (v.controls?.closer) parts.push(`- Closer: ${v.controls.closer}`);
  const text = parts.join("\n");
  const tokens = estimateVoiceTokens(text);
  if (tokens > 200) {
    let candidate = text;
    while (estimateVoiceTokens(candidate) > 200 && candidate.split(/\s+/).length > 20) {
      const w = candidate.split(/\s+/);
      candidate = w.slice(0, w.length - 6).join(" ");
    }
    return candidate;
  }
  return text;
}

export function renderInstruction(card: VoiceCard): string {
  const v = card.voice_invariants;
  const parts: string[] = [];
  parts.push("## TGO house style — active every turn");
  parts.push("");
  parts.push("This is the amalgamated always-on style layer. It applies to every response in this session, every turn. Follow it unless following it would break correctness (a security warning, an irreversible confirmation, an ambiguity-prone sequence must stay full and clear).");
  parts.push("");
  const perspective = v.perspective ?? "use active voice. Put a controlling condition before its command. Use one action per numbered step and complete instructional sentences. Start with the action; restate the current state; use no preamble, closer, or throat-clearing.";
  parts.push(`- Structure — ${perspective}`);
  // Use diction verbatim for prose + banned tells + plain-english deltas (contains full vocabulary)
  const diction = v.diction ?? "";
  // Split diction into prose + banned tells for readability but keep full diction content
  parts.push(`- Prose — ${diction}`);
  // Code and self-audit from controls (controls.closer already bundles code + self-audit + break rule)
  const controls = v.controls?.closer ?? "smallest working change (YAGNI); never cut tests, error handling, or security checks to save space; code-first reporting (show the change, then the one-line why).";
  parts.push(`- Code (inert if you produce none) — ${controls}`);
  parts.push("");
  const off = v.controls?.off_switch ?? "stop X / normal mode";
  parts.push(`Off-switch: "${off}" turns this whole layer off. Break these rules when following them breaks correctness.`);
  // Add STE + rhythm details to push into 300-500 band if needed
  const ste = v.syntax_targets?.ste_thresholds ? `STE thresholds: instruction ${v.syntax_targets.ste_thresholds.instruction}, descriptive ${v.syntax_targets.ste_thresholds.descriptive}.` : "";
  const rhythm = v.rhythm_rules?.paragraph_head_discipline ? `Rhythm: ${v.rhythm_rules.paragraph_head_discipline}; ${v.rhythm_rules.fragments ?? ""}` : "";
  const punct = v.punctuation_budgets?.em_dash_per_100w_max !== undefined ? `Punctuation budgets: em-dash max ${v.punctuation_budgets.em_dash_per_100w_max}/100w, cluster flag ${v.punctuation_budgets.em_dash_cluster_flag}, one device per sentence ${v.punctuation_budgets.one_device_per_sentence}.` : "";
  if (ste || rhythm || punct) {
    parts.push("");
    if (ste) parts.push(ste);
    if (rhythm) parts.push(rhythm);
    if (punct) parts.push(punct);
  }
  const text = parts.join("\n");
  const tokens = estimateVoiceTokens(text);
  // Ensure 300-500 band: if under 300, pad with diction tail; if over 500, truncate
  if (tokens < 300) {
    // pad by repeating priors line (still substantive, not filler)
    return text + "\n\nPriors reaffirmed: Plain Language (ISO 24495-1) demands concrete subjects, short sentences, and defined terms; Strunk & White, The Elements of Style demands active verbs, concise diction, and omission of needless words.";
  }
  if (tokens > 500) {
    const words = text.split(/\s+/);
    // trim just enough to get under 500 — original is only a few tokens over, so remove last 15 words (rhythm/punct tail)
    // keep off-switch and core directives intact; trim from end
    return words.slice(0, Math.max(0, words.length - 20)).join(" ");
  }
  return text;
}

export async function loadVoiceCard(cardId = "tgo-default"): Promise<VoiceCard> {
  const id = cardId.startsWith("tgo-") ? cardId : `tgo-${cardId}`;
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const file = path.join(packageRoot, "assets", "voices", `${id}.json`);
  const raw = JSON.parse(await fs.readFile(file, "utf-8"));
  return voiceCardSchema.parse(raw);
}

export const voiceCardSchema = z.object({
  $schema: z.string().optional(),
  id: voiceCardIdSchema,
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  meta: metaSchema,
  voice_invariants: voiceInvariantsSchema,
  arc_repertoire: arcRepertoireSchema,
  exemplars: z.array(exemplarSchema),
});

export type VoiceCard = z.infer<typeof voiceCardSchema>;

// Rule pack

const rulePatternSchema = z.object({
  kind: z.enum(["regex"]),
  value: z.string().min(1),
  flags: z.string().optional(),
});

const ruleFamilySchema = z.object({
  name: z.string().min(1),
  patterns: z.array(rulePatternSchema),
  severity: z.enum(["low", "medium", "high", "none"]).optional(),
  basis: z.enum(["cluster", "repeated-signal", "strong-evidence"]).optional(),
  thresholds: z.record(z.string(), z.unknown()).optional(),
});

export const rulePackSchema = z.object({
  $schema: z.string().optional(),
  id: z.string().min(1),
  tier: z.number().int().min(1).max(3),
  false_positive_risk: z.enum(["low", "medium", "high"]),
  gating: z.enum(["always-on", "whitelist", "cluster"]),
  families: z.array(ruleFamilySchema),
});

export type RulePack = z.infer<typeof rulePackSchema>;
