import { classifyRouting, type RouteClass, type RoutingInput } from "./fit";

export interface DelegationPacket {
  Objective?: unknown;
  Files?: unknown;
  Interfaces?: unknown;
  Constraints?: unknown;
  Verification?: unknown;
  /** The deterministic exit gate. This must be a boolean, not prose. */
  exitGate?: unknown;
  /** Tiny work may use the documented minimal packet. */
  minimal?: unknown;
  /** Bernstein's Beads issue and delegation linkage for non-tiny work. */
  issueId?: unknown;
  issueStatusObserved?: unknown;
  issueAssigneeObserved?: unknown;
  claimExitCode?: unknown;
  delegationId?: unknown;
  beadsOperator?: unknown;
  taskId?: unknown;
  progressPath?: string;
}

export interface DelegationBoundaryArgs {
  delegationPacket?: unknown;
  touchSet?: readonly string[];
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

export interface DelegationValidation {
  route: RouteClass;
  valid: boolean;
  missing: string[];
  malformed: string[];
  diagnostics: string[];
}

const ROUTES: readonly RouteClass[] = ["tiny", "standard", "heavy"];

const FULL_FIELDS = ["Objective", "Files", "Interfaces", "Constraints", "Verification"] as const;
const MINIMAL_FIELDS = ["Objective", "Files", "Verification"] as const;
const LIFECYCLE_FIELDS = ["issueId", "issueStatusObserved", "issueAssigneeObserved", "claimExitCode", "delegationId", "beadsOperator"] as const;

function presentText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function presentFiles(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && value.every((file) => presentText(file));
}

function fieldValid(field: string, value: unknown): boolean {
  if (field === "Files") return presentFiles(value);
  return presentText(value);
}

/**
 * Verify observed claim metadata — replaces the forgeable `issueClaimed` boolean.
 * True only when `bd update --claim` was observed to exit 0 with status in_progress + assignee.
 */
export function verifyClaimObserved(packet: DelegationPacket): boolean {
  return (
    packet.issueStatusObserved === "in_progress" &&
    typeof packet.issueAssigneeObserved === "string" &&
    packet.issueAssigneeObserved.trim().length > 0 &&
    packet.claimExitCode === 0
  );
}

/**
 * Validate a packet against an already-made routing decision.
 * This function deliberately does not classify work; callers must provide the
 * result from classifyRouting so routing and contract validation stay separate.
 */
export function validateDelegationPacket(
  routing: unknown,
  packet: unknown,
  routedTouchSet?: readonly string[],
): DelegationValidation {
  const candidate = routing && typeof routing === "object" ? routing as Record<string, unknown> : {};
  const route = candidate.route as RouteClass;
  const value = packet && typeof packet === "object" ? packet as DelegationPacket : {};
  const routeValid = ROUTES.includes(route);
  const tinyConsistent = typeof candidate.tiny === "boolean" && candidate.tiny === (route === "tiny");
  const fields = route === "tiny" ? MINIMAL_FIELDS : FULL_FIELDS;
  const missing: string[] = fields.filter((field) => !(field in value));
  const malformed: string[] = fields.filter((field) => field in value && !fieldValid(field, value[field]));
  const diagnostics: string[] = [];

  if (!routeValid) diagnostics.push("route must be exactly tiny, standard, or heavy.");
  if (routeValid && !tinyConsistent) diagnostics.push("tiny must be true only for route tiny and false otherwise.");

  if (missing.length > 0) diagnostics.push(`Add required field(s): ${missing.join(", ")}.`);
  if (malformed.includes("Files")) diagnostics.push("Files must be a non-empty array of named, non-empty paths.");
  for (const field of malformed.filter((name) => name !== "Files")) {
    diagnostics.push(`${field} must be a non-empty structured text field.`);
  }

  if (typeof value.exitGate !== "boolean") {
    if ("exitGate" in value) malformed.push("exitGate");
    else missing.push("exitGate");
    diagnostics.push("Add exitGate as an explicit boolean; prose claims of success do not count.");
  } else if (value.exitGate !== true) {
    diagnostics.push("Set exitGate to true only when the deterministic verification checks pass.");
  }

  if (route === "tiny" && value.minimal !== true) {
    if ("minimal" in value) malformed.push("minimal");
    diagnostics.push("Tiny packets must declare minimal: true to use the proportional minimal path.");
  }

  if (route !== "tiny") {
    for (const field of LIFECYCLE_FIELDS) {
      if (!(field in value)) {
        missing.push(field);
        diagnostics.push(`Add required Beads lifecycle field: ${field}.`);
      } else if (field === "issueStatusObserved") {
        if (value[field] !== "in_progress") {
          malformed.push(field);
          diagnostics.push(`issueStatusObserved must be "in_progress" (observed claim status); got ${JSON.stringify(value[field])}.`);
        }
      } else if (field === "issueAssigneeObserved") {
        if (!presentText(value[field])) {
          malformed.push(field);
          diagnostics.push("issueAssigneeObserved must be a non-empty assignee from observed claim.");
        }
      } else if (field === "claimExitCode") {
        if (value[field] !== 0) {
          malformed.push(field);
          diagnostics.push(`claimExitCode must be 0 (observed claim exit code); got ${JSON.stringify(value[field])}.`);
        }
      } else if (field === "beadsOperator") {
        if (value[field] !== "Bernstein") {
          malformed.push(field);
          diagnostics.push("beadsOperator must be Bernstein; specialists cannot operate Beads.");
        }
      } else if (!presentText(value[field])) {
        malformed.push(field);
        diagnostics.push(`${field} must be non-empty linkage metadata.`);
      }
    }
    // Forgeable boolean `issueClaimed` is not a precondition; if present without observed fields it is already rejected via missing observed fields.
    // Add explicit diagnostic when a forged boolean is asserted without valid observed claim evidence.
    if ("issueClaimed" in value && !verifyClaimObserved(value)) {
      diagnostics.push("issueClaimed is forgeable asserted metadata; observed claim fields (issueStatusObserved, issueAssigneeObserved, claimExitCode) are required and must reflect live bd state.");
      if (!malformed.includes("issueStatusObserved") && !missing.includes("issueStatusObserved")) {
        // ensure the forged packet is marked invalid even if caller only sent issueClaimed
      }
    }
  }

  if ("taskId" in value) {
    const taskId = value.taskId;
    if (typeof taskId !== "string" || taskId.trim().length === 0 || !/^ses_[A-Za-z0-9]+$/.test(taskId.trim())) {
      malformed.push("taskId");
      diagnostics.push("taskId must be a session identifier matching ses_<alphanumeric>.");
    }
  }

  if ("progressPath" in value) {
    const progressPath = value.progressPath;
    if (typeof progressPath !== "string" || progressPath.trim().length === 0 || !/^\.tgo\/[A-Za-z0-9][A-Za-z0-9._-]*\/progress\.md$/.test(progressPath.trim())) {
      malformed.push("progressPath");
      diagnostics.push("progressPath must match .tgo/<issueId>/progress.md where <issueId> matches [A-Za-z0-9][A-Za-z0-9._-]*");
    }
  }

  if (routedTouchSet !== undefined && "Files" in value && Array.isArray(value.Files)) {
    const allowed = new Set(routedTouchSet ?? []);
    const outside = value.Files.filter((file) => typeof file === "string" && !allowed.has(file));
    if (outside.length > 0) {
      diagnostics.push("Files must be contained in the routed named touch set.");
      malformed.push("Files");
    }
  }

  return {
    route,
    valid: routeValid && tinyConsistent && missing.length === 0 && malformed.length === 0 && value.exitGate === true && (route !== "tiny" || value.minimal === true),
    missing,
    malformed,
    diagnostics,
  };
}

/** Validate structured task arguments at the plugin's task boundary. */
export function validateDelegationBoundary(args: unknown): DelegationValidation | undefined {
  if (!args || typeof args !== "object") return undefined;
  const value = args as DelegationBoundaryArgs;
  if (!("delegationPacket" in value)) return undefined;
  const routing = classifyRouting(value as RoutingInput);
  return validateDelegationPacket(routing, value.delegationPacket, value.touchSet);
}
