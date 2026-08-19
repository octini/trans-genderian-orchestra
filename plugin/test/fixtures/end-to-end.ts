import { classifyRouting, type RouteClass } from "../../src/fit";
import { validateDelegationPacket } from "../../src/delegation";
import { evaluateClosure, type ClosureGate } from "../../src/lifecycle";
import { parseTaskReport, type ParsedReport } from "../../src/report";

export type FixtureEvent =
  | "clarification"
  | "research"
  | "vision"
  | "spec"
  | "dag"
  | "delegated"
  | "reported"
  | "reviewed"
  | "verified"
  | "closed"
  | "recovery";

export interface EndToEndScenario {
  name: string;
  route: RouteClass;
  events: FixtureEvent[];
  bypassed: string[];
  delegation: "validated" | "bypassed" | "rejected";
  artifacts: { vision?: string; spec?: string; dag?: readonly string[] };
  report: ParsedReport;
  closure: ClosureGate;
  recovery?: string;
}

const completeReport =
  "STATUS: complete\nCHANGES: verified fixture path\nVERIFIED: exit gate: true; focused tests pass\nGAPS: none";

const tinyPacket = {
  minimal: true,
  Objective: "Replace the phone-number literal with the corrected literal",
  Files: ["src/contacts.ts"],
  Verification: "Run the focused contacts test",
  exitGate: true,
};

/** A deterministic harness for the observable orchestration contracts. */
export function runEndToEndFixture(): {
  vagueGreenfield: EndToEndScenario;
  trivialLiteral: EndToEndScenario;
  malformedRecovery: EndToEndScenario;
} {
  const vagueRouting = classifyRouting({
    greenfieldOrUnfamiliar: true,
    ambiguity: true,
    touchSet: ["app/"],
  });
  const vaguePacket = {
    Objective: "Define and build the desktop D&D campaign app after user clarification",
    Files: ["app/vision.md", "app/spec.md", "app/src/"],
    Interfaces: "Honor the approved vision, spec, and dependency graph",
    Constraints: "Research unknowns first; no implementation before clarification",
    Verification: "Run focused tests, full tests, typecheck, validation, diff-check, and Horowitz review",
    exitGate: true,
    issueId: "tgo-w9s-vague",
    issueStatusObserved: "in_progress",
    issueAssigneeObserved: "ryangking",
    claimExitCode: 0,
    delegationId: "delegation-vague",
    beadsOperator: "Bernstein",
  };
  const vagueReport = parseTaskReport(completeReport);
  const vagueClosure = evaluateClosure(
    vagueRouting.route,
    { ...vaguePacket, reviewComplete: true },
    vagueReport,
  );

  const trivialRouting = classifyRouting({
    touchSet: ["src/contacts.ts"],
    boundedTouchSet: true,
    transformation: "replace one literal phone number",
    reversible: true,
    deterministicVerification: true,
  });
  const trivialReport = parseTaskReport(
    "STATUS: complete\nCHANGES: replaced one phone-number literal\nVERIFIED: exit gate: true; focused contacts test passes\nGAPS: none",
  );

  const malformedReport = parseTaskReport(
    "STATUS: complete\nCHANGES: attempted handoff\nVERIFIED: tests failed\nGAPS: recovery required",
  );

  return {
    vagueGreenfield: {
      name: "vague desktop D&D app",
      route: vagueRouting.route,
      events: ["clarification", "research", "vision", "spec", "dag", "delegated", "reported", "reviewed", "verified", "closed"],
      bypassed: [],
      delegation: validateDelegationPacket(vagueRouting, vaguePacket).valid ? "validated" : "rejected",
      artifacts: {
        vision: "Desktop campaign workspace for D&D sessions",
        spec: "Campaigns contain sessions, characters, notes, and encounters",
        dag: ["clarify → research", "research → vision", "vision → spec", "spec → implementation", "implementation → review"],
      },
      report: vagueReport,
      closure: vagueClosure,
    },
    trivialLiteral: {
      name: "phone-number literal replacement",
      route: trivialRouting.route,
      events: ["verified", "closed"],
      bypassed: ["grilling", "Wayfinder", "band", "Horowitz"],
      delegation: validateDelegationPacket(trivialRouting, tinyPacket).valid ? "bypassed" : "rejected",
      artifacts: {},
      report: trivialReport,
      closure: evaluateClosure(trivialRouting.route, {}, trivialReport),
    },
    malformedRecovery: {
      name: "failed specialist handoff",
      route: vagueRouting.route,
      events: ["delegated", "reported", "recovery"],
      bypassed: [],
      delegation: validateDelegationPacket(vagueRouting, { ...vaguePacket, Interfaces: "" }).valid ? "validated" : "rejected",
      artifacts: {},
      report: malformedReport,
      closure: evaluateClosure(vagueRouting.route, vaguePacket, malformedReport),
      recovery: malformedReport.recovery,
    },
  };
}
