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
