/**
 * Contract-level corpus for tgo-g87.
 *
 * The pure analyzer consumes these records directly. This file contains fixture
 * data only: expected findings are authored contracts, while
 * protected spans are derived only to keep their offsets deterministic.
 */

export type OutputClass = "technical-steps-code" | "voice-forward-prose";
export type Mode = "chat" | "tool-heavy";
export type Register = "concise" | "natural";
export type Axis = "response-length" | "readability" | "progress-narration" | "anti-style-cluster";
export type Severity = "none" | "low" | "medium" | "high";

export type ProtectedKind =
  | "code"
  | "command"
  | "error"
  | "warning"
  | "quotation"
  | "exact-string"
  | "number-unit"
  | "negation"
  | "necessary-explanation";

export interface ProtectedSpan {
  kind: ProtectedKind;
  text: string;
  start: number;
  end: number;
}

export interface ExpectedFinding {
  axis: Axis;
  severity: Severity;
  basis: "cluster" | "repeated-signal" | "strong-evidence";
  evidence: string;
  suppressed: boolean;
  suppressionReason?: string;
  uncertainty?: "preservation" | "classification" | "necessity";
  spans: Array<{ start: number; end: number }>;
}

export interface StyleQualityFixture {
  id: string;
  description: string;
  register: Register;
  outputClass: OutputClass;
  mode: Mode;
  taskClass?: string;
  candidate: string;
      expected: {
    aggregate: Severity;
    actionable: boolean;
    reinforcementEligible: boolean;
    findings: ExpectedFinding[];
    protectedKinds: ProtectedKind[];
    preservation: "exact" | "meaning-retained" | "uncertain";
    requiredClaims: string[];
  };
  protected: Array<{ kind: ProtectedKind; text: string }>;
}

function withSpans(
  fixture: Omit<StyleQualityFixture, "protected" | "expected"> & {
    expected: Omit<StyleQualityFixture["expected"], "protectedKinds">;
    protected: Array<{ kind: ProtectedKind; text: string }>;
  },
): StyleQualityFixture {
  let cursor = 0;
  const protectedKinds = fixture.protected.map(({ kind, text }) => {
    const start = fixture.candidate.indexOf(text, cursor);
    if (start < 0) throw new Error(`${fixture.id}: protected text is absent or out of order: ${text}`);
    cursor = start + text.length;
    return kind;
  });
  return { ...fixture, expected: { ...fixture.expected, protectedKinds } };
}

export const STYLE_QUALITY_FIXTURES: StyleQualityFixture[] = [
  withSpans({
    id: "chat-ordinary-concise",
    description: "Ordinary answer with one isolated mild tell; no drift finding.",
    register: "concise",
    outputClass: "technical-steps-code",
    mode: "chat",
    candidate: "1. Restart the service. The change takes effect immediately.",
    expected: { aggregate: "none", actionable: false, reinforcementEligible: false, findings: [], preservation: "exact", requiredClaims: ["Restart the service."] },
    protected: [],
  }),
  withSpans({
    id: "technical-explanation-preserved",
    description: "Technical explanation keeps an identifier, number, unit, negation, and necessary caveat.",
    register: "concise",
    outputClass: "technical-steps-code",
    mode: "chat",
    candidate: "Set `timeoutMs` to 500 ms. Do not remove the retry because the first request can fail during startup.",
    expected: { aggregate: "none", actionable: false, reinforcementEligible: false, findings: [], preservation: "exact", requiredClaims: ["Set `timeoutMs` to 500 ms.", "Do not remove the retry because the first request can fail during startup."] },
    protected: [
      { kind: "exact-string", text: "timeoutMs" },
      { kind: "number-unit", text: "500 ms" },
      { kind: "negation", text: "Do not remove" },
      { kind: "necessary-explanation", text: "because the first request can fail during startup" },
    ],
  }),
  withSpans({
    id: "tool-heavy-success",
    description: "Tool-heavy result separates command and verification from progress narration.",
    register: "concise",
    outputClass: "technical-steps-code",
    mode: "tool-heavy",
    candidate: "1. Ran `bun test plugin/test/concision.test.ts`.\n2. Result: 18 tests passed. No files changed.",
    expected: { aggregate: "none", actionable: false, reinforcementEligible: false, findings: [], preservation: "exact", requiredClaims: ["Ran `bun test plugin/test/concision.test.ts`.", "Result: 18 tests passed."] },
    protected: [
      { kind: "command", text: "`bun test plugin/test/concision.test.ts`" },
      { kind: "number-unit", text: "18 tests" },
    ],
  }),
  withSpans({
    id: "failure-warning-and-error",
    description: "Failure report preserves the exact error, warning, command, and security instruction.",
    register: "concise",
    outputClass: "technical-steps-code",
    mode: "tool-heavy",
    candidate: "1. `npm run build` failed with `ERR_MODULE_NOT_FOUND`. Warning: do not run this with production credentials. Retry after installing `zod@4.1.13`.",
    expected: { aggregate: "none", actionable: false, reinforcementEligible: false, findings: [], preservation: "exact", requiredClaims: ["`npm run build` failed with `ERR_MODULE_NOT_FOUND`.", "Warning: do not run this with production credentials.", "Retry after installing `zod@4.1.13`."] },
    protected: [
      { kind: "command", text: "`npm run build`" },
      { kind: "error", text: "`ERR_MODULE_NOT_FOUND`" },
      { kind: "warning", text: "Warning: do not run this with production credentials" },
      { kind: "exact-string", text: "zod@4.1.13" },
    ],
  }),
  withSpans({
    id: "code-and-quotation",
    description: "Code and a quotation are protected even when the surrounding answer is short.",
    register: "concise",
    outputClass: "technical-steps-code",
    mode: "chat",
    candidate: "Use `if (ready) return;`. The API contract says, \"A missing token is not anonymous access.\"",
    expected: { aggregate: "none", actionable: false, reinforcementEligible: false, findings: [], preservation: "exact", requiredClaims: ["Use `if (ready) return;`.", "A missing token is not anonymous access."] },
    protected: [
      { kind: "code", text: "`if (ready) return;`" },
      { kind: "quotation", text: "\"A missing token is not anonymous access.\"" },
    ],
  }),
  withSpans({
    id: "chat-drift-cluster",
    description: "Chat-style answer seeds filler, AI vocabulary, hedging, repetition, and a closer.",
    register: "natural",
    outputClass: "voice-forward-prose",
    mode: "chat",
    candidate: "Great question. It is important to note that we can utilize this robust approach. I think it is really useful and, in my opinion, it is the best option. The answer is to restart the service. The answer is to restart the service. Hope this helps.",
    expected: {
      aggregate: "high",
      actionable: true,
      reinforcementEligible: true,
      findings: [
          { axis: "anti-style-cluster", severity: "low", basis: "cluster", evidence: "modal-hedge tell cluster", suppressed: false, spans: [{ start: 82, end: 89 }, { start: 115, end: 128 }] },
         { axis: "response-length", severity: "high", basis: "strong-evidence", evidence: "Consecutive repeated sentence: The answer is to restart the service.", suppressed: false, spans: [{ start: 152, end: 190 }, { start: 190, end: 228 }] },
         { axis: "anti-style-cluster", severity: "medium", basis: "strong-evidence", evidence: "Chatbot closer after the answer is complete", suppressed: false, spans: [{ start: 229, end: 244 }] },
      ],
        preservation: "meaning-retained",
         requiredClaims: ["The answer is to restart the service."],
      },
    protected: [],
  }),
  withSpans({
    id: "tool-heavy-narration-and-preservation-risk",
    description: "Tool narration repeats the result; an uncertain protected span suppresses reinforcement.",
    register: "concise",
    outputClass: "technical-steps-code",
    mode: "tool-heavy",
    candidate: "Changed `config.ts` to set 30 seconds. I changed `config.ts`. The warning says \"Do not disable TLS verification.\" The exact production behavior remains uncertain.",
     expected: {
       aggregate: "none",
       actionable: false,
       reinforcementEligible: false,
       findings: [],
       preservation: "uncertain",
       requiredClaims: ["Changed `config.ts` to set 30 seconds.", "Do not disable TLS verification."],
    },
    protected: [
      { kind: "code", text: "`config.ts`" },
      { kind: "number-unit", text: "30 seconds" },
      { kind: "warning", text: "\"Do not disable TLS verification.\"" },
    ],
  }),
  withSpans({
    id: "long-reasoning-natural",
    description: "Longer reasoning retains a necessary ambiguity explanation; cadence is not capped.",
    register: "natural",
    outputClass: "voice-forward-prose",
    mode: "chat",
    candidate: "There are two plausible causes. If the cache is stale, clearing it fixes the symptom, but if the token is expired, clearing it changes nothing. Check the timestamp first; that distinction matters because the safe next step differs, and we should not delete the cache until the token check is complete.",
    expected: { aggregate: "none", actionable: false, reinforcementEligible: false, findings: [], preservation: "exact", requiredClaims: ["There are two plausible causes.", "we should not delete the cache until the token check is complete."] },
    protected: [
      { kind: "necessary-explanation", text: "that distinction matters because the safe next step differs" },
      { kind: "negation", text: "should not delete" },
    ],
  }),
  withSpans({
    id: "terse-qa-factual",
    description: "Terse factual Q&A preserves negation, number-unit, and quotation in a concise answer.",
    register: "concise",
    outputClass: "technical-steps-code",
    mode: "chat",
    taskClass: "terse-qa",
    candidate: "Answer: \"Do not retry on 429.\" Set `retryMs` to 20 ms. Do not skip the backoff.",
    expected: { aggregate: "none", actionable: false, reinforcementEligible: false, findings: [], preservation: "exact", requiredClaims: ["Answer: \"Do not retry on 429.\"", "Set `retryMs` to 20 ms.", "Do not skip the backoff."] },
    protected: [
      { kind: "quotation", text: "\"Do not retry on 429.\"" },
      { kind: "code", text: "`retryMs`" },
      { kind: "number-unit", text: "20 ms" },
      { kind: "negation", text: "Do not skip" },
    ],
  }),
  withSpans({
    id: "orchestration-dag-wave",
    description: "Orchestration wave: Bernstein DAG create→dispatch→verify with delegation count.",
    register: "concise",
    outputClass: "technical-steps-code",
    mode: "tool-heavy",
    taskClass: "orchestration",
    candidate: "Bernstein created DAG with 3 waves: create→dispatch→verify. Dispatched wave 1 to Dylan and Nas. Verified 4 tasks. Result: 8 tasks passed. No files changed.",
    expected: { aggregate: "none", actionable: false, reinforcementEligible: false, findings: [], preservation: "exact", requiredClaims: ["Bernstein created DAG with 3 waves: create→dispatch→verify.", "Dispatched wave 1 to Dylan and Nas.", "Verified 4 tasks."] },
    protected: [
      { kind: "exact-string", text: "DAG" },
      { kind: "number-unit", text: "3 waves" },
      { kind: "number-unit", text: "4 tasks" },
      { kind: "number-unit", text: "8 tasks" },
    ],
  }),
];

export const STYLE_QUALITY_FIXTURE_IDS = STYLE_QUALITY_FIXTURES.map(({ id }) => id);
