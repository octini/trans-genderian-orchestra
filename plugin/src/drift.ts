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
  attemptID: string; register: DriftRegister; outputClass: OutputClass; mode: DriftMode;
  enabled: boolean; reinforced: boolean;
  taskContext?: { protectedSpans?: Span[]; requiredPhrases?: string[]; baselineTokens?: number | null; answerComplete?: boolean };
  candidate: string;
}
export interface DriftFinding {
  axis: Axis; severity: Severity; evidence: string; spans: Span[]; basis: Basis;
  uncertainty: Uncertainty; suppressed: boolean; suppressionReason?: string;
}
export interface SteLengthMetric { value: number; violations: number; violationsPer100w: number; applicable: boolean; unit: "violations-per-100w"; baseline: number | null; basis: string; provenance: "proxy" | "measured" }
export interface DriftResult {
  input: Omit<DriftInput, "taskContext" | "candidate">; findings: DriftFinding[];
  aggregate: { severity: Severity; actionable: boolean; reinforcementEligible: boolean };
  metrics: { concision: DriftMetric; readability: DriftMetric; correctness: DriftMetric; preservation: DriftMetric; steLength: SteLengthMetric };
  protectedContent: { spans: Span[]; treatment: { mode: "excluded" | "discounted" | "none"; reason: string } };
  uncertainty: Uncertainty[]; state: { attemptID: string; enabled: boolean; reinforced: boolean };
}

export interface SteLengthResult { violations: number; violationsPer100w: number; applicable: boolean; words: number; sentences: number }

const families: Record<string, RegExp[]> = {
  "AI-vocabulary": [/\b(?:utilize|leverage|delve|showcase|landscape)\b/gi],
  marketing: [/\b(?:seamless|robust|world-class|cutting-edge)\b/gi],
  filler: [/\b(?:basically|actually|simply|in order to)\b/gi, /\b(?:it is important to note|here(?:'|’)s the thing)\b/gi],
  adverb: [/\b(?:really|very|just|literally|truly|clearly|obviously)\b/gi],
  "modal-hedge": [/\b(?:might|may|perhaps|arguably)\b/gi, /\b(?:I think|in my opinion|it seems)\b/gi],
  pompous: [/\b(?:commence|furthermore|moreover)\b/gi],
  closer: [/Hope this helps/gi, /Let me know if you need anything/gi],
  "rule-of-three": [/(?:(?:first|second|third)\b)/gi, /\b\w+\s*,\s*\w+\s*,\s*(?:and|or)\s+\w+/gi],
  "not-x-it-is-y": [/(?:^|[.!?]\s+)Not\s+(?!(?:only|just|sure|certain|clear|necessarily|really|today|tomorrow)\b)[^.!?,\n]+,\s*it(?:'|’)s\s+[^.!?,\n]+/g],
  "synonym-cycling": [/\b(?:fix|resolve|address|solve|correct)\b/gi],
  "hidden-actor": [/\b(?:is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?\w+ed(?:\s+by)?\b/gi],
  "em-dash-spam": [/—/g],
  "diff-anchored-narration": [/\b(?:line|lines)\s+\d+\b/gi, /\b(?:hunk|diff|patch)\b/gi],
};
export const STE_INSTRUCTION_THRESHOLD = 20;
export const STE_DESCRIPTIVE_THRESHOLD = 25;

const instructionPrefix = /^\s*(?:\d+[\.)]\s*|(?:Run|Restart|Set|Check|Verify|Use|Install|Retry|Changed|Ran|Result|Do not|Never|Keep|Clear|If|When|Create|Dispatch|Verify)\b)/i;

export function countSteViolations(candidate: string, mode: DriftMode): SteLengthResult {
  const words = candidate.trim() ? candidate.trim().split(/\s+/).filter(Boolean).length : 0;
  const applicable = mode === "tool-heavy";
  if (!applicable || words === 0) return { violations: 0, violationsPer100w: 0, applicable, words, sentences: 0 };
  const sentenceList = [...candidate.matchAll(/[^.!?\n]+[.!?]+/g)].map((m) => m[0].trim()).filter(Boolean);
  const sentences = sentenceList.length || (candidate.trim() ? 1 : 0);
  let violations = 0;
  for (const sentence of sentenceList.length ? sentenceList : (candidate.trim() ? [candidate.trim()] : [])) {
    const sentenceWords = sentence.split(/\s+/).filter(Boolean).length;
    const threshold = instructionPrefix.test(sentence) ? STE_INSTRUCTION_THRESHOLD : STE_DESCRIPTIVE_THRESHOLD;
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
    /\b(?:[a-z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*|[A-Z][A-Za-z0-9_]*[A-Z][A-Za-z0-9_]*|[A-Za-z_$][\w$]*_[A-Za-z_$][\w$]*|config)\b/g,
  ];
  for (const pattern of patterns) for (const match of input.candidate.matchAll(pattern)) add(match.index!, match.index! + match[0].length);
  return spans.sort((a, b) => a.start - b.start || a.end - b.end).filter((s, i, all) => i === 0 || s.start !== all[i - 1].start || s.end !== all[i - 1].end);
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
function finding(axis: Axis, severity: Severity, evidence: string, spans: Span[], basis: Basis, input: DriftInput, reason?: string, uncertainty = emptyUncertainty()): DriftFinding {
  const naturalCadence = input.register === "natural" && axis === "readability";
  const suppressed = !input.enabled || !!reason || naturalCadence || uncertainty.codes.length > 0;
  const suppressionReason = !input.enabled ? "analyzer disabled" : reason ?? (uncertainty.codes.length ? "preservation or correctness concern" : naturalCadence ? "natural register suppresses cadence/readability" : undefined);
  return { axis, severity: suppressed ? "none" : severity, evidence, spans, basis, uncertainty, suppressed, ...(suppressionReason ? { suppressionReason } : {}) };
}
function rank(s: Severity) { return ["none", "low", "medium", "high"].indexOf(s); }
function same(a: string, b: string) { return a.toLowerCase().replace(/\s+/g, " ").trim() === b.toLowerCase().replace(/\s+/g, " ").trim(); }

export function analyzeStyleDrift(input: DriftInput): DriftResult {
  const protectedContent = protectedSpans(input);
  const suppliedProtected = input.taskContext?.protectedSpans ?? [];
  const invalidProtected = suppliedProtected.filter((s) => !Number.isInteger(s.start) || !Number.isInteger(s.end) || s.start < 0 || s.end <= s.start || s.end > input.candidate.length);
  const sentences = [...input.candidate.matchAll(/[^.!?\n]+[.!?]+/g)]
    .map((m) => ({ text: m[0].trim(), span: { start: m.index!, end: m.index! + m[0].length } }))
    .filter((x) => x.text.length > 0);
  const findings: DriftFinding[] = [];
  const preservationUncertainty = /\b(?:uncertain|unknown|not sure|cannot verify|can't verify|unable to verify|remains unclear)\b/i.test(input.candidate)
    ? { codes: ["preservation"] as Array<"preservation">, message: "Candidate states that preservation or production behavior remains uncertain.", spans: [] } : emptyUncertainty();

  for (let i = 1; i < sentences.length; i++) if (same(sentences[i - 1].text, sentences[i].text) && !protectedContent.some((span) => overlap(sentences[i - 1].span, span) || overlap(sentences[i].span, span))) {
    findings.push(finding("response-length", "high", `Consecutive repeated sentence: ${sentences[i].text}`, [sentences[i - 1].span, sentences[i].span], "strong-evidence", input, undefined, preservationUncertainty));
  }
  const familyEvidence: Span[] = [];
  for (const [family, patterns] of Object.entries(families)) {
    const spans = patterns.flatMap((p) => unprotectedSpans(input.candidate, p, protectedContent)).sort((a, b) => a.start - b.start);
    if (family === "closer" && spans.length && (input.taskContext?.answerComplete ?? true)) findings.push(finding("anti-style-cluster", "medium", "Chatbot closer after the answer is complete", spans, "strong-evidence", input, undefined, preservationUncertainty));
    if (family !== "closer") familyEvidence.push(...spans);
  }
  const sections = [...input.candidate.matchAll(/(?:^|\n\s*\n)([\s\S]*?)(?=\n\s*\n|$)/g)];
  for (const section of sections) {
    const start = section.index! + (section[0].length - section[1].length);
    const sectionFamilies = Object.entries(families).filter(([name]) => name !== "closer").map(([name, ps]) => [name, ps.flatMap((p) => unprotectedSpans(section[1], p, protectedContent, start)).sort((a, b) => a.start - b.start)] as const).filter(([, spans]) => spans.length > 0);
    for (const [family, spans] of sectionFamilies) if (spans.length >= 2) findings.push(finding("anti-style-cluster", spans.length >= 3 ? "medium" : "low", `${family} tell cluster`, spans, "cluster", input, undefined, preservationUncertainty));
    const sectionSpans = sectionFamilies.map(([name, spans]) => [name, spans.length] as const);
    if (sectionSpans.length >= 2 && !sectionSpans.some(([, count]) => count >= 2) && !/(?:^|[.!?]\s+)Not\s+(?!(?:only|just|sure|certain|clear|necessarily|really|today|tomorrow)\b)[^.!?,\n]+,\s*it(?:'|’)s\s+[^.!?,\n]+/.test(section[1])) {
      const spans = Object.entries(families).filter(([name]) => name !== "closer").flatMap(([, ps]) => ps.flatMap((p) => unprotectedSpans(section[1], p, protectedContent, start))).sort((a, b) => a.start - b.start);
      findings.push(finding("anti-style-cluster", "medium", "Cross-family anti-style cluster", spans, "cluster", input, undefined, preservationUncertainty));
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

  const words = input.candidate.trim() ? input.candidate.trim().split(/\s+/).length : 0;
  const baseline = input.taskContext?.baselineTokens ?? null;
  const ratio = baseline && baseline > 0 ? words / baseline : null;
  const repeated = sentences.filter((s, i) => i > 0 && same(sentences[i - 1].text, s.text)).length;
  if (ratio !== null && ratio > 1 && repeated === 0 && familyEvidence.length >= 2) findings.push(finding("response-length", ratio >= 1.5 ? "medium" : "low", "Unnecessary material exceeds the matched contract baseline", [{ start: 0, end: input.candidate.length }], "repeated-signal", input, undefined, preservationUncertainty));
  const long = sentences.filter((s) => s.text.split(/\s+/).length > 40);
  if (long.length >= 2) findings.push(finding("readability", "low", "Multiple overloaded sentences", long.map((x) => x.span), "cluster", input, undefined, preservationUncertainty));
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
  const ste = countSteViolations(input.candidate, input.mode);
  const steLength: SteLengthMetric = {
    value: ste.violationsPer100w,
    violations: ste.violations,
    violationsPer100w: ste.violationsPer100w,
    applicable: ste.applicable,
    unit: "violations-per-100w",
    baseline: null,
    basis: ste.applicable ? `STE soft length: ${STE_INSTRUCTION_THRESHOLD}-word instruction / ${STE_DESCRIPTIVE_THRESHOLD}-word descriptive guidance counted as violations per 100 words (metric only, no gate)` : "STE soft length inert for non-tool-heavy outputs",
    provenance: "proxy",
  };
  const result: DriftResult = {
    input: { attemptID: input.attemptID, register: input.register, outputClass: input.outputClass, mode: input.mode, enabled: input.enabled, reinforced: input.reinforced }, findings,
    aggregate: { severity: aggregateSeverity, actionable, reinforcementEligible: actionable && !input.reinforced && findings.every((f) => f.uncertainty.codes.length === 0) },
    metrics: { concision: { value: ratio === null ? 0 : Math.max(0, 1 - ratio), unit: "ratio", baseline, basis: ratio === null ? "no matched baseline" : "candidate token count versus matched baseline" }, readability: { value: sentences.length ? Math.max(0, 1 - long.length / sentences.length) : 1, unit: "score-0-to-1", baseline: null, basis: "sentence-length distribution" }, correctness: { value: preserved, unit: "score-0-to-1", baseline: null, basis: "no rewrite; protected and required content retained" }, preservation: { value: preserved, unit: "score-0-to-1", baseline: null, basis: protectedContent.length ? "protected spans detected and excluded or discounted" : "no protected spans detected" }, steLength },
    protectedContent: { spans: protectedContent, treatment: { mode: allProtected ? "excluded" : protectedContent.length ? "discounted" : "none", reason: allProtected ? "candidate consists of protected content" : protectedContent.length ? "protected content is excluded from style evidence while surrounding material remains analyzable" : "no protected spans detected" } },
    uncertainty: [], state: { attemptID: input.attemptID, enabled: input.enabled, reinforced: input.reinforced },
  };
  result.uncertainty = [...findings.flatMap((f) => f.uncertainty), ...(preservationUncertainty.codes.length ? [preservationUncertainty] : [])].filter((u, i, all) => i === all.findIndex((x) => JSON.stringify(x) === JSON.stringify(u)));
  return result;
}
