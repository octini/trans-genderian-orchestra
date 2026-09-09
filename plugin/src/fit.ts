export const REROUTE_NOT_RETRY = "REROUTE-NOT-RETRY";

export const LANE_REJECTION_PATTERNS: RegExp[] = [
  /not (my|the) lane/i,
  /out of (my|the) lane/i,
  /wrong (seat|specialist|agent)/i,
  /not the right (seat|specialist|agent)/i,
  /not (a|my) (review|implementation|research|coding|writing) (task|job|role)/i,
  /this (isn'?t|is not) (my|the|a) lane/i,
];

export function detectLaneRejection(output: string): boolean {
  return LANE_REJECTION_PATTERNS.some((pattern) => pattern.test(output));
}

// ── Failure-type routing (tgo-bf6) ───────────────────────────────────────
// Classify delegation/run/report failures by TYPE so rerouting carries the
// right context (build log → dylan, dependency → deps check, etc.).
// Pure function: failure signature/text/status → FailureType.
// Additive: unclassified preserves existing routing behavior.

export type FailureType = "build" | "test" | "dependency" | "deploy" | "env" | "watchdog" | "unclassified";

export const FAILURE_TYPE_PATTERNS: Record<Exclude<FailureType, "unclassified">, RegExp[]> = {
  watchdog: [
    /watchdog.{0,40}abort/i,
    /abort.{0,40}watchdog/i,
    /WATCHDOG-ABORT/i,
    /aborted by.*watchdog/i,
  ],
  dependency: [
    /npm ERR!/i,
    /npm error/i,
    /cannot find module/i,
    /module not found/i,
    /ERR_PNPM/i,
    /could not resolve/i,
    /peer dep/i,
    /dependency.*(?:not found|missing|failed|error)/i,
    /bun install.*(?:failed|error)/i,
    /yarn error/i,
  ],
  build: [
    /\bbuild failed\b/i,
    /\bcompilation failed\b/i,
    /\bcompile error\b/i,
    /\bFailed to compile\b/i,
    /error TS\d+/i,
    /TS\d+:\s*error\b/i,
    /\btsc\b.*\bERROR\b/i,
    /\bSyntaxError\b/i,
    /\bcannot find name\b/i,
    /\bCannot find name\b/,
    /Module not found:.*Can't resolve/i,
  ],
  test: [
    /\btest[s]?\s+failed\b/i,
    /\btests?\s+failing\b/i,
    /\bfailing tests\b/i,
    /\btest suite failed\b/i,
    /\bAssertionError\b/i,
    /\bassertion failed\b/i,
    /\bexpected\b.{0,60}\breceived\b/i,
    /\bexpect\s*\(.*\)\s*\.\s*to[A-Z]/,
    /\b\d+\s+failed\b/i,
    /^\s*FAIL\b/m,
  ],
  deploy: [
    /\bdeploy.*failed\b/i,
    /\bdeployment failed\b/i,
    /\bCI.*failed\b/i,
    /\bgithub actions.*failed\b/i,
    /\bdocker.*failed\b/i,
    /\bpush rejected\b/i,
    /\bvercel.*error\b/i,
    /\bnetlify.*error\b/i,
  ],
  env: [
    /\bcommand not found\b/i,
    /executable file not found in \$PATH/i,
    /not found in \$PATH/i,
    /\bpermission denied\b/i,
    /\bno such file or directory\b/i,
    /ENOENT:\s*no such file/i,
    /\bbad interpreter\b/i,
    /\bPATH.*not set\b/i,
    /\benv.*not found\b/i,
  ],
};

export const FAILURE_TYPE_LABELS: Record<Exclude<FailureType, "unclassified">, string> = {
  watchdog: "watchdog abort",
  dependency: "dependency/npm",
  build: "build/compile",
  test: "test failure",
  deploy: "deploy/CI",
  env: "env/PATH",
};

export const FAILURE_TYPE_HINTS: Record<Exclude<FailureType, "unclassified">, string> = {
  watchdog: "Watchdog abort — session was aborted (wall-clock/idle/stuck); verify what landed, then re-dispatch smaller.",
  dependency: "Dependency/npm error — check deps/install (bd, npm, bun) before retry.",
  build: "Build/compile error — retry with build log and tsc output; route to dylan for fix.",
  test: "Test failure — include failing test output and rerun verification.",
  deploy: "Deploy/CI error — verify CI/deploy config before reroute.",
  env: "Env/PATH error — check PATH and env setup before retry.",
};

const FAILURE_PRIORITY: Exclude<FailureType, "unclassified">[] = [
  "watchdog",
  "deploy",
  "build",
  "dependency",
  "test",
  "env",
];

// ── Run-path RecoveryFlag reason table (tgo-21a) ───────────────────────────
// Maps RecoveryFlag.reason (runs.ts:181-252 RecoveryFlag shape) → FailureType
// so dead-heartbeat feeds rerouting like delegation-path failures.
// dead-heartbeat → watchdog; suspended/aborted stay distinct (unclassified,
// preserving awaiting/aborted semantics); unknown/missing → unclassified.
// Reuses classifyFailureType only — no classifyReportFailureType/classifyRunFailureType.
export const RECOVERY_REASON_TO_FAILURE_TYPE: Record<string, FailureType> = {
  "dead-heartbeat": "watchdog",
  suspended: "unclassified",
  aborted: "unclassified",
};

/** Classify a RecoveryFlag reason string via the table; unknown/missing → unclassified. */
export function classifyRecoveryReason(reason: unknown): FailureType {
  if (typeof reason !== "string") return "unclassified";
  return RECOVERY_REASON_TO_FAILURE_TYPE[reason] ?? "unclassified";
}

/**
 * Rollout gate for run-path reroute signal (tgo-21a).
 * Default ON so dead-heartbeat feeds rerouting; kill switch disables fast emission
 * to prevent transient flapping. Env: TGO_RUN_PATH_REROUTE=0/false/off kills,
 * TGO_RUN_PATH_REROUTE_KILL=1 (or TGO_DISABLE_RUN_PATH_REROUTE=1) also kills.
 */
export function isRunPathRerouteEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const kill = env.TGO_RUN_PATH_REROUTE_KILL ?? env.TGO_DISABLE_RUN_PATH_REROUTE;
  if (kill === "1" || kill === "true" || kill === "on") return false;
  const flag = env.TGO_RUN_PATH_REROUTE;
  if (flag === undefined || flag === "") return true;
  if (flag === "0" || flag === "false" || flag === "off") return false;
  return flag === "1" || flag === "true" || flag === "on";
}

/** Pure classifier: failure signature/text/status → FailureType. Accepts string or structured report/run objects. */
export function classifyFailureType(input: unknown): FailureType {
  if (input == null) return "unclassified";
  let text = "";
  if (typeof input === "string") {
    text = input;
  } else if (typeof input === "object") {
    const o = input as Record<string, unknown>;
    // Fast-path: explicit watchdog flag from report.ts
    if (o.watchdogAborted === true) return "watchdog";
    // Run-path RecoveryFlag fast-path (tgo-21a; caller TaskFitController.normalize at fit.ts:306 reuses this classifier for delegation output, while run-path RecoveryFlag reasons flow here via problemsFromRecovery reuse). Shape per runs.ts RecoveryFlag.
    if (typeof o.runId === "string" && ("hasAwaitJson" in o || "hasTerminalStatus" in o || "issueId" in o)) {
      if (typeof o.reason === "string") {
        const mapped = RECOVERY_REASON_TO_FAILURE_TYPE[o.reason];
        if (mapped !== undefined) return mapped;
        return "unclassified";
      }
      return "unclassified";
    }
    // Collect text from known shapes (ParsedReport, RunEvent, RecoveryFlag, generic)
    if (typeof o.raw === "string") text += " " + o.raw;
    if (typeof o.output === "string") text += " " + o.output;
    if (typeof o.text === "string") text += " " + o.text;
    if (typeof o.note === "string") text += " " + o.note;
    if (typeof o.cmd === "string") text += " " + o.cmd;
    if (typeof o.reason === "string") text += " " + o.reason;
    if (typeof o.status === "string") text += " " + o.status;
    if (typeof o.message === "string") text += " " + o.message;
    // Also mine fields from ParsedReport for failure signatures
    if (o.fields && typeof o.fields === "object") {
      const fields = o.fields as Record<string, unknown>;
      for (const v of Object.values(fields)) {
        if (typeof v === "string") text += " " + v;
      }
    }
    // If still empty, try JSON stringify as fallback for arbitrary objects
    if (!text.trim()) {
      try {
        text += " " + JSON.stringify(o);
      } catch {}
    }
  } else {
    text = String(input);
  }
  text = text.trim();
  if (!text) return "unclassified";
  for (const type of FAILURE_PRIORITY) {
    const patterns = FAILURE_TYPE_PATTERNS[type];
    if (patterns.some((re) => re.test(text))) return type;
  }
  return "unclassified";
}

/** Hint for a given failure type, undefined for unclassified. */
export function failureTypeHint(type: FailureType): string | undefined {
  if (type === "unclassified") return undefined;
  return FAILURE_TYPE_HINTS[type];
}

export function failureTypeLabel(type: FailureType): string | undefined {
  if (type === "unclassified") return undefined;
  return FAILURE_TYPE_LABELS[type];
}

/** Reroute signal for pure failure-type failures (non-lane). */
export function failureRerouteSignal(failureType: Exclude<FailureType, "unclassified">, seat?: string): string {
  const target = seat ? ` for ${seat}` : "";
  const label = failureTypeLabel(failureType);
  const hint = failureTypeHint(failureType);
  return [
    `## ${REROUTE_NOT_RETRY}`,
    `Delegation failed${target} with ${label} error.`,
    hint,
    "Do NOT simply retry — address the failure context above and reroute per lane-card.",
  ].join("\n");
}

export function rerouteSignal(seat: string | undefined, failureType?: FailureType): string {
  const target = seat ? ` for ${seat}` : "";
  const base = [
    `## ${REROUTE_NOT_RETRY}`,
    `The delegated specialist${target} rejected this task as out of its lane.`,
    "Do NOT retry the same seat — reroute to the correct lane per the lane-card, or re-decompose.",
  ];
  if (failureType && failureType !== "unclassified") {
    const label = failureTypeLabel(failureType);
    const hint = failureTypeHint(failureType);
    if (label && hint) {
      base.push("", `Failure type: ${label} — ${hint}`);
    }
  }
  return base.join("\n");
}

export interface TaskFitInput {
  tool: string;
  sessionID: string;
  callID: string;
  args?: { subagent_type?: string };
}

export interface TaskFitOutput {
  title: string;
  output: string;
  metadata: unknown;
}

export type RouteClass = "tiny" | "standard" | "heavy";

export interface RoutingInput {
  /** The files the requested change is expected to touch. */
  touchSet?: readonly string[];
  /** A bounded touch set means one named file, not an open-ended scan. */
  boundedTouchSet?: boolean;
  transformation?: string;
  reversible?: boolean;
  deterministicVerification?: boolean;
  ambiguity?: boolean;
  missingLocationOrOldValue?: boolean;
  multipleInterpretationsOrFiles?: boolean;
  failedVerification?: boolean;
  unexpectedDiff?: boolean;
  userVisible?: boolean;
  highBlastRadius?: boolean;
  irreversible?: boolean;
  apiSchemaAuthDependencyMigrationSecurityOrDeploymentImpact?: boolean;
  greenfieldOrUnfamiliar?: boolean;
  agentEscalation?: boolean;
}

export interface RoutingClassification {
  route: RouteClass;
  tiny: boolean;
  reasons: string[];
}

const HEAVY_TRIGGERS: readonly [keyof RoutingInput, string][] = [
  ["ambiguity", "ambiguity"],
  ["missingLocationOrOldValue", "missing location or old value"],
  ["multipleInterpretationsOrFiles", "multiple interpretations or files"],
  ["failedVerification", "failed verification"],
  ["unexpectedDiff", "unexpected diff"],
  ["userVisible", "user-visible impact"],
  ["highBlastRadius", "high blast radius"],
  ["irreversible", "irreversible impact"],
  ["apiSchemaAuthDependencyMigrationSecurityOrDeploymentImpact", "API/schema/auth/dependency/migration/security/deployment impact"],
  ["greenfieldOrUnfamiliar", "greenfield or unfamiliar work"],
  ["agentEscalation", "agent escalation"],
];

/** Classify once, before choosing the smallest safe orchestration path. */
export function classifyRouting(input: RoutingInput): RoutingClassification {
  const reasons = HEAVY_TRIGGERS
    .filter(([key]) => input[key] === true)
    .map(([, reason]) => reason);
  if (reasons.length > 0) return { route: "heavy", tiny: false, reasons };

  const tinyRequirements: [boolean, string][] = [
    [input.boundedTouchSet === true && isBoundedTouchSet(input.touchSet), "bounded touch set"],
    [typeof input.transformation === "string" && input.transformation.trim().length > 0, "explicit transformation"],
    [input.reversible === true, "reversible change"],
    [input.deterministicVerification === true, "deterministic verification"],
  ];
  const missing = tinyRequirements.filter(([present]) => !present).map(([, reason]) => reason);
  if (missing.length === 0) return { route: "tiny", tiny: true, reasons: [] };
  return { route: "standard", tiny: false, reasons: missing };
}

function isBoundedTouchSet(touchSet: readonly string[] | undefined): boolean {
  return touchSet !== undefined && touchSet.length === 1 && touchSet.every((file) => file.trim().length > 0);
}

export interface ParsedReportLike {
  valid?: boolean;
  completionSafe?: boolean;
  status?: string;
  taxonomy?: { status?: string };
  contradictions?: string[];
  watchdogAborted?: boolean;
  raw?: string;
}

function isSuccessReport(text: string, report?: ParsedReportLike | null): boolean {
  if (report) {
    if (report.status === "complete" || report.taxonomy?.status === "complete") return true;
    if (report.raw && /\bSTATUS:\s*(complete|done)\b/i.test(report.raw)) return true;
  }
  if (/\bSTATUS:\s*(complete|done)\b/i.test(text)) return true;
  return false;
}

export class TaskFitController {
  normalize(input: TaskFitInput, output: TaskFitOutput, report?: ParsedReportLike | null): boolean {
    if (input.tool !== "task") return false;
    if (output.output.includes(REROUTE_NOT_RETRY)) return false;

    const isLane = detectLaneRejection(output.output);
    const failureType = classifyFailureType(output.output);

    // Lane rejection always reroutes (enhanced with failure hint if present)
    if (isLane) {
      const seat = input.args?.subagent_type;
      output.output = `${output.output.trimEnd()}\n\n${rerouteSignal(seat, failureType)}`;
      return true;
    }

    // Pure failure-type reroute (additive): classified failures reroute with context,
    // unclassified preserves existing behavior (no-op).
    // Gate: completed/valid reports NEVER receive the failure advisory.
    if (failureType !== "unclassified") {
      if (isSuccessReport(output.output, report)) return false;
      const seat = input.args?.subagent_type;
      output.output = `${output.output.trimEnd()}\n\n${failureRerouteSignal(failureType, seat)}`;
      return true;
    }

    return false;
  }
}
