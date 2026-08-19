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

export function rerouteSignal(seat: string | undefined): string {
  const target = seat ? ` for ${seat}` : "";
  return [
    `## ${REROUTE_NOT_RETRY}`,
    `The delegated specialist${target} rejected this task as out of its lane.`,
    "Do NOT retry the same seat — reroute to the correct lane per the lane-card, or re-decompose.",
  ].join("\n");
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

export class TaskFitController {
  normalize(input: TaskFitInput, output: TaskFitOutput): boolean {
    if (input.tool !== "task") return false;
    if (output.output.includes(REROUTE_NOT_RETRY)) return false;
    if (!detectLaneRejection(output.output)) return false;

    const seat = input.args?.subagent_type;
    output.output = `${output.output.trimEnd()}\n\n${rerouteSignal(seat)}`;
    return true;
  }
}
