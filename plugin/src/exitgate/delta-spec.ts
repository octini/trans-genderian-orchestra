/**
 * Delta-spec parser: SHALL/MUST requirement lines + Scenario blocks.
 * Ingests the issue's spec text (bd description — five-part spec) and
 * surfaces missing/ambiguous SHALLs as findings.
 *
 * Deterministic, no LLM, no network.
 */
import type { Finding } from "./triage";

export interface DeltaRequirement {
  id: string;
  text: string;
  kind: "SHALL" | "MUST";
  line: number;
  ambiguous: boolean;
  ambiguousReason?: string;
}

export interface DeltaScenario {
  id: string;
  title: string;
  line: number;
  body: string;
}

export interface DeltaSpec {
  requirements: DeltaRequirement[];
  scenarios: DeltaScenario[];
  findings: Finding[];
  raw: string;
}

const AMBIGUOUS_MARKERS: Array<{ re: RegExp; reason: string }> = [
  { re: /\betc\.?(\s|$|,)/i, reason: "contains etc" },
  { re: /\bappropriate\b/i, reason: "vague term: appropriate" },
  { re: /\bmaybe\b/i, reason: "vague term: maybe" },
  { re: /\bshould\b/i, reason: "weak modal: should (use SHALL/MUST)" },
  { re: /\bTBD\b/i, reason: "placeholder: TBD" },
  { re: /\bTODO\b/i, reason: "placeholder: TODO" },
  { re: /\bas needed\b/i, reason: "vague term: as needed" },
  { re: /\bif needed\b/i, reason: "vague term: if needed" },
  { re: /\bgenerally\b/i, reason: "vague qualifier: generally" },
  { re: /\busually\b/i, reason: "vague qualifier: usually" },
  { re: /\bsome\b.*\b(things|stuff|cases)?/i, reason: "vague quantifier: some" },
];

function isAmbiguous(text: string): { ambiguous: boolean; reason?: string } {
  for (const m of AMBIGUOUS_MARKERS) {
    if (m.re.test(text)) return { ambiguous: true, reason: m.reason };
  }
  return { ambiguous: false };
}

/**
 * Parse SHALL/MUST requirements and Scenario blocks from spec text.
 * - SHALL/MUST: any line containing the token SHALL or MUST (case-insensitive,
 *   but canonical uppercase is recorded). Multiple occurrences on one line
 *   produce one requirement per line (not per token).
 * - Scenario: lines matching `Scenario:` or `Scenario -` with title capture.
 *   Body is the indented block until next blank-line-separated heading.
 */
export function parseDeltaSpec(specText: string): DeltaSpec {
  const raw = typeof specText === "string" ? specText : String(specText ?? "");
  const lines = raw.split(/\r?\n/);
  const requirements: DeltaRequirement[] = [];
  const scenarios: DeltaScenario[] = [];
  const findings: Finding[] = [];

  let reqCounter = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const upper = line.toUpperCase();
    // Detect SHALL/MUST — require word boundaries
    const shallIdx = upper.indexOf("SHALL");
    const mustIdx = upper.indexOf("MUST");
    // Only count if token appears as word
    const hasShall = /\bSHALL\b/i.test(line);
    const hasMust = /\bMUST\b/i.test(line);
    if (hasShall || hasMust) {
      reqCounter++;
      // Kind: prefer SHALL if both present? Use first occurrence
      let kind: "SHALL" | "MUST" = "SHALL";
      if (hasShall && hasMust) {
        const sPos = line.search(/\bSHALL\b/i);
        const mPos = line.search(/\bMUST\b/i);
        kind = sPos <= mPos ? "SHALL" : "MUST";
      } else if (hasMust) {
        kind = "MUST";
      }
      const amb = isAmbiguous(line);
      const text = line.trim();
      requirements.push({
        id: `REQ-${reqCounter}`,
        text,
        kind,
        line: i + 1,
        ambiguous: amb.ambiguous,
        ambiguousReason: amb.reason,
      });
      if (amb.ambiguous) {
        findings.push({
          axis: "completeness",
          severity: "WARNING",
          message: `Ambiguous requirement ${`REQ-${reqCounter}`} (line ${i + 1}): ${amb.reason} — "${text.slice(0, 120)}"`,
          source: "delta-spec",
        });
      }
      // Also detect very short SHALL lines like "SHALL do stuff." without substance
      if (text.length < 20) {
        findings.push({
          axis: "coherence",
          severity: "SUGGESTION",
          message: `Requirement ${`REQ-${reqCounter}`} is unusually short — may be underspecified (line ${i + 1})`,
          source: "delta-spec",
        });
      }
    }
  }

  // Scenario blocks — Scenario: <title>
  let scenCounter = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const m = line.match(/^\s*Scenario\s*[:\-]\s*(.+)\s*$/i);
    if (m) {
      scenCounter++;
      const title = (m[1] ?? "").trim();
      // Collect body until next Scenario or double blank or heading
      const bodyLines: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const nxt = lines[j] ?? "";
        if (/^\s*Scenario\s*[:\-]/i.test(nxt)) break;
        if (/^\s*#{1,6}\s+/.test(nxt) && bodyLines.length > 3) break;
        bodyLines.push(nxt);
        // stop after collecting meaningful body and hitting blank separation?
        // Keep collecting up to 20 lines
        if (bodyLines.length > 20) break;
      }
      const body = bodyLines.join("\n").trim();
      scenarios.push({
        id: `SCN-${scenCounter}`,
        title,
        line: i + 1,
        body,
      });
      // Validate scenario body contains Given/When/Then or steps
      const hasGWT = /\b(Given|When|Then|And)\b/i.test(body);
      if (!hasGWT && body.length > 0) {
        findings.push({
          axis: "completeness",
          severity: "SUGGESTION",
          message: `Scenario ${`SCN-${scenCounter}`} "${title}" lacks Given/When/Then structure`,
          source: "delta-spec",
        });
      }
      if (body.length === 0) {
        findings.push({
          axis: "completeness",
          severity: "WARNING",
          message: `Scenario ${`SCN-${scenCounter}`} "${title}" has empty body`,
          source: "delta-spec",
        });
      }
    }
  }

  // Missing requirements finding
  if (requirements.length === 0) {
    findings.push({
      axis: "completeness",
      severity: "WARNING",
      message: "No SHALL/MUST requirement lines found in spec — delta-spec is empty",
      source: "delta-spec",
    });
  }

  // If scenarios exist but no requirements, coherence warning
  if (scenarios.length > 0 && requirements.length === 0) {
    findings.push({
      axis: "coherence",
      severity: "SUGGESTION",
      message: "Spec contains Scenario blocks but no SHALL/MUST requirements — traceability gap",
      source: "delta-spec",
    });
  }

  return {
    requirements,
    scenarios,
    findings,
    raw,
  };
}
