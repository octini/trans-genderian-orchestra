// src/sidebar/tui.tsx
import { createMemo, createSignal, For, getOwner, runWithOwner, Show } from "solid-js";

// src/sidebar/bd.ts
import { execFile } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join as join3 } from "node:path";
import { promisify } from "node:util";

// src/exitgate/profile.ts
import * as fs from "node:fs/promises";
import * as path from "node:path";
var DEFAULT_BLACKLIST = [
  "rm\\s+-rf\\s+/(\\s|$)",
  "rm\\s+-rf\\s+\\*",
  "rm\\s+-rf\\s+~",
  ":\\(\\)\\s*\\{",
  "mkfs",
  "dd\\s+if=",
  ">\\s*/dev/sd[a-z]",
  "chmod\\s+777\\s+/(\\s|$)",
  "shutdown",
  "reboot",
  "init\\s+0"
];
var DEFAULT_GATE_PROFILE = {
  enabled: true,
  toggles: {
    deltaSpec: true,
    triage: true,
    trajectory: true
  },
  blacklist: [...DEFAULT_BLACKLIST],
  trajectory: {
    maxSteps: 250,
    expectedSequence: []
  }
};
function isObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function toGateProfile(raw) {
  if (!isObject(raw))
    return;
  const enabled = typeof raw.enabled === "boolean" ? raw.enabled : DEFAULT_GATE_PROFILE.enabled;
  const togglesRaw = isObject(raw.toggles) ? raw.toggles : {};
  const toggles = {
    deltaSpec: typeof togglesRaw.deltaSpec === "boolean" ? togglesRaw.deltaSpec : DEFAULT_GATE_PROFILE.toggles.deltaSpec,
    triage: typeof togglesRaw.triage === "boolean" ? togglesRaw.triage : DEFAULT_GATE_PROFILE.toggles.triage,
    trajectory: typeof togglesRaw.trajectory === "boolean" ? togglesRaw.trajectory : DEFAULT_GATE_PROFILE.toggles.trajectory
  };
  let blacklist;
  if (Array.isArray(raw.blacklist)) {
    const filtered = raw.blacklist.filter((s) => typeof s === "string" && s.trim().length > 0);
    const valid = [];
    for (const p of filtered) {
      if (p.length > 200)
        continue;
      try {
        new RegExp(p, "i");
        valid.push(p);
      } catch {}
    }
    blacklist = valid.length > 0 ? valid : [...DEFAULT_GATE_PROFILE.blacklist];
    if (Array.isArray(raw.blacklist) && raw.blacklist.length === 0)
      blacklist = [];
  } else {
    blacklist = [...DEFAULT_GATE_PROFILE.blacklist];
  }
  const trajRaw = isObject(raw.trajectory) ? raw.trajectory : {};
  const maxSteps = typeof trajRaw.maxSteps === "number" && Number.isFinite(trajRaw.maxSteps) && trajRaw.maxSteps > 0 ? Math.floor(trajRaw.maxSteps) : DEFAULT_GATE_PROFILE.trajectory.maxSteps;
  const expectedSequence = Array.isArray(trajRaw.expectedSequence) ? trajRaw.expectedSequence.filter((s) => typeof s === "string" && s.trim().length > 0) : DEFAULT_GATE_PROFILE.trajectory.expectedSequence;
  return {
    enabled,
    toggles,
    blacklist,
    trajectory: {
      maxSteps,
      expectedSequence
    }
  };
}
function gateProfilePath(repoRoot) {
  return path.join(repoRoot, ".tgo", "gate.json");
}
async function loadGateProfile(repoRoot) {
  const target = gateProfilePath(repoRoot);
  try {
    const raw = await fs.readFile(target, "utf-8");
    const parsed = JSON.parse(raw);
    const profile = toGateProfile(parsed);
    if (profile)
      return profile;
    return { ...DEFAULT_GATE_PROFILE, blacklist: [...DEFAULT_GATE_PROFILE.blacklist] };
  } catch {
    return { ...DEFAULT_GATE_PROFILE, blacklist: [...DEFAULT_GATE_PROFILE.blacklist] };
  }
}
function compileBlacklist(blacklist) {
  const out = [];
  for (const p of blacklist) {
    if (p.length > 200)
      continue;
    try {
      out.push(new RegExp(p, "i"));
    } catch {}
  }
  return out;
}

// src/exitgate/delta-spec.ts
var AMBIGUOUS_MARKERS = [
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
  { re: /\bsome\b.*\b(things|stuff|cases)?/i, reason: "vague quantifier: some" }
];
function isAmbiguous(text) {
  for (const m of AMBIGUOUS_MARKERS) {
    if (m.re.test(text))
      return { ambiguous: true, reason: m.reason };
  }
  return { ambiguous: false };
}
function parseDeltaSpec(specText) {
  const raw = typeof specText === "string" ? specText : String(specText ?? "");
  const lines = raw.split(/\r?\n/);
  const requirements = [];
  const scenarios = [];
  const findings = [];
  let reqCounter = 0;
  for (let i = 0;i < lines.length; i++) {
    const line = lines[i] ?? "";
    const upper = line.toUpperCase();
    const shallIdx = upper.indexOf("SHALL");
    const mustIdx = upper.indexOf("MUST");
    const hasShall = /\bSHALL\b/i.test(line);
    const hasMust = /\bMUST\b/i.test(line);
    if (hasShall || hasMust) {
      reqCounter++;
      let kind = "SHALL";
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
        ambiguousReason: amb.reason
      });
      if (amb.ambiguous) {
        findings.push({
          axis: "completeness",
          severity: "WARNING",
          message: `Ambiguous requirement ${`REQ-${reqCounter}`} (line ${i + 1}): ${amb.reason} — "${text.slice(0, 120)}"`,
          source: "delta-spec"
        });
      }
      if (text.length < 20) {
        findings.push({
          axis: "coherence",
          severity: "SUGGESTION",
          message: `Requirement ${`REQ-${reqCounter}`} is unusually short — may be underspecified (line ${i + 1})`,
          source: "delta-spec"
        });
      }
    }
  }
  let scenCounter = 0;
  for (let i = 0;i < lines.length; i++) {
    const line = lines[i] ?? "";
    const m = line.match(/^\s*Scenario\s*[:\-]\s*(.+)\s*$/i);
    if (m) {
      scenCounter++;
      const title = (m[1] ?? "").trim();
      const bodyLines = [];
      for (let j = i + 1;j < lines.length; j++) {
        const nxt = lines[j] ?? "";
        if (/^\s*Scenario\s*[:\-]/i.test(nxt))
          break;
        if (/^\s*#{1,6}\s+/.test(nxt) && bodyLines.length > 3)
          break;
        bodyLines.push(nxt);
        if (bodyLines.length > 20)
          break;
      }
      const body = bodyLines.join(`
`).trim();
      scenarios.push({
        id: `SCN-${scenCounter}`,
        title,
        line: i + 1,
        body
      });
      const hasGWT = /\b(Given|When|Then|And)\b/i.test(body);
      if (!hasGWT && body.length > 0) {
        findings.push({
          axis: "completeness",
          severity: "SUGGESTION",
          message: `Scenario ${`SCN-${scenCounter}`} "${title}" lacks Given/When/Then structure`,
          source: "delta-spec"
        });
      }
      if (body.length === 0) {
        findings.push({
          axis: "completeness",
          severity: "WARNING",
          message: `Scenario ${`SCN-${scenCounter}`} "${title}" has empty body`,
          source: "delta-spec"
        });
      }
    }
  }
  if (requirements.length === 0) {
    findings.push({
      axis: "completeness",
      severity: "WARNING",
      message: "No SHALL/MUST requirement lines found in spec — delta-spec is empty",
      source: "delta-spec"
    });
  }
  if (scenarios.length > 0 && requirements.length === 0) {
    findings.push({
      axis: "coherence",
      severity: "SUGGESTION",
      message: "Spec contains Scenario blocks but no SHALL/MUST requirements — traceability gap",
      source: "delta-spec"
    });
  }
  return {
    requirements,
    scenarios,
    findings,
    raw
  };
}

// src/exitgate/trajectory.ts
import * as fs2 from "node:fs/promises";
import * as path2 from "node:path";

// src/def-snapshot.ts
var VALID_BEAD_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
function isValidBeadID(id) {
  return VALID_BEAD_ID.test(id);
}
function assertValidBeadID(issueId) {
  if (!isValidBeadID(issueId)) {
    throw new Error(`invalid issueId "${issueId}" — must match ${VALID_BEAD_ID.source} (VALID_BEAD_ID)`);
  }
}

// src/exitgate/trajectory.ts
function isRecord(v) {
  return typeof v === "object" && v !== null;
}
function parseEntry(line, lineNo) {
  const trimmed = line.trim();
  if (trimmed.length === 0)
    return;
  try {
    const obj = JSON.parse(trimmed);
    if (!isRecord(obj))
      return;
    const tsRaw = obj.ts;
    if (typeof tsRaw !== "number" || !Number.isFinite(tsRaw))
      return;
    const ts = tsRaw;
    const type = obj.type;
    if (type !== "step" && type !== "heartbeat" && type !== "status")
      return;
    const seat = obj.seat;
    if (typeof seat !== "string" || seat.trim().length === 0)
      return;
    const tool = obj.tool;
    if (typeof tool !== "string" || tool.trim().length === 0)
      return;
    if (type === "heartbeat" && tool !== "heartbeat") {
      return;
    }
    const argsHash = obj.argsHash;
    if (typeof argsHash !== "string" || argsHash.trim().length === 0)
      return;
    const okRaw = obj.ok;
    if (typeof okRaw !== "boolean")
      return;
    const ok = okRaw;
    const durationMsRaw = obj.durationMs;
    let durationMs;
    if (durationMsRaw === undefined)
      durationMs = 0;
    else if (typeof durationMsRaw === "number" && Number.isFinite(durationMsRaw))
      durationMs = durationMsRaw;
    else
      durationMs = 0;
    const noteRaw = obj.note;
    let note;
    if (noteRaw === undefined)
      note = "";
    else if (typeof noteRaw === "string")
      note = noteRaw;
    else
      note = "";
    const issueIdRaw = obj.issueId;
    if (typeof issueIdRaw !== "string" || !isValidBeadID(issueIdRaw))
      return;
    const issueId = issueIdRaw;
    let cmd;
    if ("cmd" in obj && obj.cmd !== undefined && obj.cmd !== null) {
      if (typeof obj.cmd === "string")
        cmd = obj.cmd;
      else
        cmd = undefined;
    }
    return {
      ts,
      type,
      seat,
      tool,
      argsHash,
      ok,
      durationMs,
      note,
      issueId,
      ...cmd !== undefined ? { cmd } : {}
    };
  } catch {
    return;
  }
}
function runLogPath(repoRoot, runId) {
  assertValidBeadID(runId);
  return path2.join(repoRoot, ".tgo", "runs", `${runId}.jsonl`);
}
async function scoreTrajectory(repoRoot, runId, profile = DEFAULT_GATE_PROFILE) {
  const findings = [];
  const target = runLogPath(repoRoot, runId);
  let raw;
  try {
    raw = await fs2.readFile(target, "utf-8");
  } catch (e) {
    const code = e?.code;
    if (code === "ENOENT") {
      return {
        entries: [],
        findings: [
          {
            axis: "completeness",
            severity: "WARNING",
            message: `Trajectory skipped: no run log at .tgo/runs/${runId}.jsonl (writer lands in sibling ticket)`,
            source: "trajectory",
            code: "TRAJECTORY_SKIP_NO_LOG"
          }
        ],
        skipped: true,
        skipReason: "no-log"
      };
    }
    return {
      entries: [],
      findings: [
        {
          axis: "coherence",
          severity: "WARNING",
          message: `Trajectory skipped: unable to read run log (${String(e)})`,
          source: "trajectory",
          code: "TRAJECTORY_SKIP_READ_ERROR"
        }
      ],
      skipped: true,
      skipReason: "read-error"
    };
  }
  const lines = raw.split(/\r?\n/);
  const entries = [];
  for (let i = 0;i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined || line.trim().length === 0)
      continue;
    const entry = parseEntry(line, i + 1);
    if (entry)
      entries.push(entry);
  }
  if (entries.length === 0) {
    findings.push({
      axis: "completeness",
      severity: "WARNING",
      message: "Trajectory: run log exists but contains no valid step entries — skipping trajectory checks",
      source: "trajectory",
      code: "TRAJECTORY_EMPTY"
    });
    return { entries, findings, skipped: true, skipReason: "empty" };
  }
  const hasTerminalStatus = entries.some((e) => e.type === "status");
  if (!hasTerminalStatus) {
    findings.push({
      axis: "completeness",
      severity: "WARNING",
      message: 'Trajectory incomplete: no terminal status line (type:"status") — log may be truncated or writer still in-flight',
      source: "trajectory",
      code: "TRAJECTORY_INCOMPLETE"
    });
  }
  const effectiveBlacklist = profile.blacklist.length > 0 ? profile.blacklist : DEFAULT_GATE_PROFILE.blacklist;
  const blacklistRes = compileBlacklist(effectiveBlacklist);
  for (let idx = 0;idx < entries.length; idx++) {
    const entry = entries[idx];
    const rawHaystack = `${entry.tool} ${entry.cmd ?? ""} ${entry.note}`;
    const haystack = rawHaystack.length > 500 ? rawHaystack.slice(0, 500) : rawHaystack;
    for (const re of blacklistRes) {
      if (re.test(haystack)) {
        findings.push({
          axis: "correctness",
          severity: "CRITICAL",
          message: `Blacklist hard-fail: step ${idx + 1} tool=${entry.tool} matched blacklist /${re.source}/ — note="${entry.note.slice(0, 120)}"`,
          source: "trajectory",
          code: "BLACKLIST_HARD_FAIL"
        });
        break;
      }
    }
  }
  const expected = profile.trajectory.expectedSequence ?? [];
  if (expected.length > 0) {
    const tools = entries.filter((e) => e.type === "step").map((e) => e.tool.toLowerCase());
    let pos = 0;
    for (const hint of expected) {
      const lowerHint = hint.toLowerCase();
      let found = -1;
      for (let i = pos;i < tools.length; i++) {
        if (tools[i]?.includes(lowerHint) || lowerHint.includes(tools[i] ?? "")) {
          found = i;
          break;
        }
      }
      if (found === -1) {
        findings.push({
          axis: "coherence",
          severity: "WARNING",
          message: `Expected tool sequence hint "${hint}" not found in trajectory (tools: ${tools.slice(0, 12).join(", ")})`,
          source: "trajectory",
          code: "EXPECTED_SEQUENCE_MISSING"
        });
        break;
      } else {
        pos = found + 1;
      }
    }
  }
  const maxSteps = profile.trajectory.maxSteps ?? DEFAULT_GATE_PROFILE.trajectory.maxSteps ?? 250;
  const stepCount = entries.filter((e) => e.type === "step").length;
  if (stepCount > maxSteps) {
    findings.push({
      axis: "coherence",
      severity: "WARNING",
      message: `Trajectory efficiency: ${stepCount} steps exceeds maxSteps ${maxSteps}`,
      source: "trajectory",
      code: "EFFICIENCY_MAX_STEPS"
    });
  }
  let maxConsecutive = 1;
  let curConsecutive = 1;
  for (let i = 1;i < entries.length; i++) {
    if (entries[i].tool === entries[i - 1].tool) {
      curConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, curConsecutive);
    } else {
      curConsecutive = 1;
    }
  }
  if (maxConsecutive >= 6) {
    findings.push({
      axis: "coherence",
      severity: "WARNING",
      message: `Trajectory efficiency: ${maxConsecutive} consecutive identical tool calls detected (possible loop)`,
      source: "trajectory",
      code: "EFFICIENCY_LOOP_CONSECUTIVE"
    });
  }
  const failed = entries.filter((e) => e.ok === false).length;
  if (failed > 0 && failed / entries.length > 0.5 && entries.length >= 5) {
    findings.push({
      axis: "correctness",
      severity: "WARNING",
      message: `Trajectory: ${failed}/${entries.length} steps failed (${Math.round(failed / entries.length * 100)}%)`,
      source: "trajectory",
      code: "TRAJECTORY_HIGH_FAILURE_RATE"
    });
  }
  const totalDuration = entries.reduce((sum, e) => sum + (Number.isFinite(e.durationMs) ? e.durationMs : 0), 0);
  if (totalDuration > 30 * 60 * 1000) {
    findings.push({
      axis: "coherence",
      severity: "SUGGESTION",
      message: `Trajectory: total tool duration ${Math.round(totalDuration / 1000)}s exceeds 30m`,
      source: "trajectory",
      code: "TRAJECTORY_LONG_DURATION"
    });
  }
  return {
    entries,
    findings,
    skipped: false
  };
}

// src/exitgate/triage.ts
var AXES = ["completeness", "correctness", "coherence"];
var severityRank = {
  PASS: 0,
  SUGGESTION: 1,
  WARNING: 2,
  CRITICAL: 3
};
function maxSeverity(findings) {
  let max = "PASS";
  let maxRank = 0;
  for (const f of findings) {
    const r = severityRank[f.severity] ?? 0;
    if (r > maxRank) {
      maxRank = r;
      max = f.severity;
    }
  }
  return max;
}
function triageFindings(findings) {
  const perAxis = {
    completeness: { axis: "completeness", severity: "PASS", count: 0, findings: [], hasCritical: false },
    correctness: { axis: "correctness", severity: "PASS", count: 0, findings: [], hasCritical: false },
    coherence: { axis: "coherence", severity: "PASS", count: 0, findings: [], hasCritical: false }
  };
  for (const f of findings) {
    const axis = AXES.includes(f.axis) ? f.axis : "correctness";
    const bucket = perAxis[axis];
    bucket.findings.push(f);
  }
  for (const axis of AXES) {
    const bucket = perAxis[axis];
    bucket.count = bucket.findings.length;
    bucket.severity = maxSeverity(bucket.findings);
    bucket.hasCritical = bucket.findings.some((f) => f.severity === "CRITICAL");
  }
  const allMax = maxSeverity(findings);
  const blocked = findings.some((f) => f.severity === "CRITICAL");
  let reason;
  if (blocked) {
    const critical = findings.filter((f) => f.severity === "CRITICAL");
    const axes = [...new Set(critical.map((f) => f.axis))].join(", ");
    reason = `gate blocked: ${critical.length} CRITICAL finding(s) on ${axes}`;
  }
  return {
    findings: [...findings],
    perAxis,
    blocked,
    highestSeverity: allMax,
    reason
  };
}

// src/exitgate/gate.ts
function shouldSkipForTaxonomy(report) {
  const status = report.taxonomy.status;
  if (status === "bail") {
    return { skip: true, reason: "bail/abandon — human rejection skips gate" };
  }
  if (report.watchdogAborted) {
    return { skip: true, reason: "watchdog abort — reroute, not close" };
  }
  if (status !== "complete") {
    return { skip: true, reason: `${status} — not complete, gate not applicable` };
  }
  return { skip: false };
}
async function runExitGate(input) {
  const profile = input.profile ?? await loadGateProfile(input.repoRoot);
  if (!profile.enabled) {
    const emptyTriage = triageFindings([]);
    return {
      passed: true,
      blocked: false,
      reasonCode: "GATE_SKIPPED_DISABLED",
      reason: "gate disabled via profile.enabled=false",
      triage: emptyTriage,
      findings: [],
      profile,
      skipped: true,
      skipReason: "disabled"
    };
  }
  const taxSkip = shouldSkipForTaxonomy(input.report);
  if (taxSkip.skip) {
    const emptyTriage = triageFindings([]);
    return {
      passed: true,
      blocked: false,
      reasonCode: "GATE_SKIPPED_BAIL",
      reason: `gate skipped: ${taxSkip.reason}`,
      triage: emptyTriage,
      findings: [],
      profile,
      skipped: true,
      skipReason: taxSkip.reason
    };
  }
  const findings = [];
  if (profile.toggles.deltaSpec) {
    const delta = parseDeltaSpec(input.specText);
    for (const f of delta.findings)
      findings.push(f);
  }
  let trajectorySkipped = false;
  if (profile.toggles.trajectory) {
    const traj = await scoreTrajectory(input.repoRoot, input.issueId, profile);
    trajectorySkipped = traj.skipped;
    for (const f of traj.findings)
      findings.push(f);
  }
  let effectiveFindings = findings;
  if (!profile.toggles.triage) {
    effectiveFindings = findings.filter((f) => f.source !== "triage");
  }
  const triage = triageFindings(effectiveFindings);
  if (triage.blocked) {
    return {
      passed: false,
      blocked: true,
      reasonCode: "GATE_BLOCKED_CRITICAL",
      reason: triage.reason,
      triage,
      findings: effectiveFindings,
      trajectorySkipped,
      profile,
      skipped: false,
      compensation: {
        title: `Compensate ${input.issueId} gate failure`,
        body: `Gate blocked ${input.issueId} with ${triage.findings.filter((f) => f.severity === "CRITICAL").length} CRITICAL finding(s):
${triage.findings.filter((f) => f.severity === "CRITICAL").map((f) => `- [${f.axis}/${f.severity}] ${f.message}`).join(`
`)}

Create with: bd create --deps discovered-from:${input.issueId}`,
        discoveredFrom: input.issueId,
        severity: "CRITICAL"
      }
    };
  }
  return {
    passed: true,
    blocked: false,
    reasonCode: "GATE_PASSED",
    triage,
    findings: effectiveFindings,
    trajectorySkipped,
    profile,
    skipped: false
  };
}

// src/report.ts
var REPORT_STATUSES = ["complete", "partial", "blocked", "escalate"];
var TASK_STATUSES = ["complete", "bail", "failed", "tripwire"];
var FIELD_NAMES = ["STATUS", "CHANGES", "VERIFIED", "GAPS"];
var FIELD_RE = /(?:^|\n)\s*(?:#{1,6}\s*)?(STATUS|CHANGES|VERIFIED|GAPS|TASK_STATUS|RETRYABLE)\s*:\s*/gi;
function hasFailure(text) {
  const withoutNegatedSuccess = text.replace(/\bno\s+(?:failures?|errors?)\b/gi, "").replace(/\bdid\s+not\s+fail(?:ed|ure|ing)?\b/gi, "");
  return /\b(?:fail(?:ed|ure)?|failing|error|not run|unverified|unknown|did not pass)\b/i.test(withoutNegatedSuccess);
}
function statusTextToTaskStatus(text) {
  if (!text)
    return;
  const lower = text.trim().toLowerCase();
  const asTaxonomy = TASK_STATUSES.find((c) => lower === c);
  if (asTaxonomy)
    return asTaxonomy;
  const asLegacy = REPORT_STATUSES.find((c) => lower === c);
  if (asLegacy) {
    if (asLegacy === "complete")
      return "complete";
    if (asLegacy === "partial")
      return "failed";
    if (asLegacy === "blocked" || asLegacy === "escalate")
      return "tripwire";
  }
  return;
}
function parseTaskReport(raw) {
  const text = typeof raw === "string" ? raw : String(raw ?? "");
  const fields = {};
  const malformed = [];
  const matches = [...text.matchAll(FIELD_RE)];
  for (let i = 0;i < matches.length; i++) {
    const name = matches[i]?.[1]?.toUpperCase();
    const start = (matches[i]?.index ?? 0) + (matches[i]?.[0]?.length ?? 0);
    const value = text.slice(start, matches[i + 1]?.index ?? text.length).trim();
    if (fields[name] !== undefined)
      malformed.push(`${String(name)} (duplicate)`);
    else if (!value)
      malformed.push(String(name));
    else
      fields[name] = value;
  }
  const missing = FIELD_NAMES.filter((name) => fields[name] === undefined);
  const statusText = fields.STATUS?.trim().toLowerCase();
  const status = REPORT_STATUSES.find((candidate) => statusText === candidate);
  const statusIsTaxonomy = TASK_STATUSES.find((candidate) => statusText === candidate);
  if (fields.STATUS !== undefined && !status && !statusIsTaxonomy)
    malformed.push("STATUS");
  const taskStatusText = fields.TASK_STATUS?.trim().toLowerCase();
  const taskStatusFromField = taskStatusText ? TASK_STATUSES.find((c) => taskStatusText === c) : undefined;
  if (fields.TASK_STATUS !== undefined && !taskStatusFromField)
    malformed.push("TASK_STATUS");
  const retryableText = fields.RETRYABLE?.trim().toLowerCase();
  let retryableFromField;
  if (fields.RETRYABLE !== undefined) {
    if (["true", "yes", "1"].includes(retryableText ?? ""))
      retryableFromField = true;
    else if (["false", "no", "0"].includes(retryableText ?? ""))
      retryableFromField = false;
    else
      malformed.push("RETRYABLE");
  }
  const contradictions = [];
  if (status === "complete" && fields.VERIFIED && hasFailure(fields.VERIFIED)) {
    contradictions.push("STATUS complete conflicts with failed or unverified VERIFIED evidence");
  }
  if (status === "complete" && fields.GAPS && !/^\s*(?:none|n\/a|no gaps?)[.!]?\s*$/i.test(fields.GAPS)) {
    contradictions.push("STATUS complete conflicts with non-empty GAPS");
  }
  const exitGate = /exit\s*gate\s*:\s*true(?![\w-])/i.test(fields.VERIFIED ?? "");
  if (!exitGate) {
    malformed.push(/exit\s*gate/i.test(fields.VERIFIED ?? "") ? "VERIFIED exit-gate claim" : "VERIFIED exit-gate evidence");
  } else if (hasFailure(fields.VERIFIED ?? "")) {
    malformed.push("VERIFIED exit-gate claim");
  }
  let taskStatus;
  if (taskStatusFromField) {
    taskStatus = taskStatusFromField;
  } else if (statusIsTaxonomy) {
    taskStatus = statusIsTaxonomy;
  } else if (status) {
    if (status === "complete")
      taskStatus = "complete";
    else if (status === "partial")
      taskStatus = "failed";
    else if (status === "blocked" || status === "escalate")
      taskStatus = "tripwire";
    else
      taskStatus = "failed";
  } else {
    taskStatus = "failed";
  }
  if (fields.STATUS !== undefined && fields.TASK_STATUS !== undefined) {
    const impliedFromStatus = statusTextToTaskStatus(fields.STATUS);
    const impliedFromTask = taskStatusFromField;
    if (impliedFromStatus && impliedFromTask && impliedFromStatus !== impliedFromTask) {
      contradictions.push(`STATUS ${fields.STATUS} conflicts with TASK_STATUS ${fields.TASK_STATUS}`);
    }
  }
  if (taskStatus === "complete" && fields.VERIFIED && hasFailure(fields.VERIFIED)) {
    const msg = "TASK_STATUS complete conflicts with failed or unverified VERIFIED evidence";
    if (!contradictions.includes(msg) && !contradictions.some((c) => c.includes("STATUS complete conflicts"))) {
      contradictions.push(msg);
    }
  }
  if (taskStatus === "complete" && fields.GAPS && !/^\s*(?:none|n\/a|no gaps?)[.!]?\s*$/i.test(fields.GAPS)) {
    const msg = "TASK_STATUS complete conflicts with non-empty GAPS";
    if (!contradictions.includes(msg) && !contradictions.some((c) => c.includes("STATUS complete conflicts with non-empty GAPS"))) {
      contradictions.push(msg);
    }
  }
  let retryable;
  if (retryableFromField !== undefined) {
    retryable = retryableFromField;
  } else {
    if (taskStatus === "failed")
      retryable = true;
    else if (taskStatus === "complete")
      retryable = false;
    else
      retryable = false;
  }
  let taxonomy;
  switch (taskStatus) {
    case "complete":
      taxonomy = { status: "complete", retryable };
      break;
    case "bail":
      taxonomy = { status: "bail", retryable };
      break;
    case "failed":
      taxonomy = { status: "failed", retryable };
      break;
    case "tripwire":
      taxonomy = { status: "tripwire", retryable };
      break;
  }
  const watchdogAborted = /watchdog.{0,40}abort/i.test(text);
  const valid = !watchdogAborted && missing.length === 0 && malformed.length === 0 && contradictions.length === 0;
  let recovery = "retry";
  if (watchdogAborted)
    recovery = "reroute";
  else if (contradictions.length > 0)
    recovery = "escalate";
  else if (taxonomy.status === "bail")
    recovery = "abandon";
  else if (taxonomy.status === "tripwire")
    recovery = "fix-plan";
  else if (fields.GAPS && /clarif(?:y|ication)|ambiguous|unclear|need(?:s)? user/i.test(fields.GAPS))
    recovery = "user-clarification";
  else if (taxonomy.status === "failed")
    recovery = taxonomy.retryable ? "retry" : "escalate";
  else if (taxonomy.status === "complete")
    recovery = "retry";
  else {
    if (status === "blocked" || status === "escalate")
      recovery = "escalate";
  }
  return {
    valid,
    completionSafe: valid && taxonomy.status === "complete" && exitGate,
    exitGate,
    status,
    taxonomy,
    fields,
    raw: text,
    missing,
    malformed,
    contradictions,
    watchdogAborted,
    recovery
  };
}

// src/exitgate/close-gate.ts
async function checkCloseGate(repoRoot, issueId, specText) {
  const syntheticComplete = parseTaskReport(`STATUS: complete
CHANGES: close via sidebar
VERIFIED: exit gate: true; close check
GAPS: none`);
  const gate = await runExitGate({ repoRoot, issueId, specText: specText ?? "", report: syntheticComplete });
  if (gate.blocked) {
    return { allowed: false, gate };
  }
  return { allowed: true, gate };
}
function blockedCloseMessage(gate) {
  const reason = gate.reason ?? "CRITICAL gate findings";
  const comp = gate.compensation ? ` — compensation: ${gate.compensation.title} (discovered-from:${gate.compensation.discoveredFrom}) — bd create --deps discovered-from:${gate.compensation.discoveredFrom}` : "";
  return `close blocked: ${gate.reasonCode} — ${reason}${comp}`;
}

// src/sidebar/bd.ts
var run = promisify(execFile);
var TIMEOUT_MS = 1e4;
var MAX_DEPTH = 5;
var MAX_ENTRIES = 400;
var VALID_BEAD_ID2 = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
function isValidBeadID2(id) {
  return VALID_BEAD_ID2.test(id);
}
function createBdClient(worktree) {
  const beadsDir = join3(worktree, ".beads");
  const lastTouched = join3(beadsDir, "last-touched");
  const cache = new Map;
  let pinnedSignature;
  function enabled() {
    return existsSync(beadsDir);
  }
  function computeSignature() {
    let newest = 0;
    let seen = 0;
    try {
      newest = statSync(beadsDir).mtimeMs;
    } catch {}
    const walk = (dir, depth) => {
      if (depth > MAX_DEPTH || seen >= MAX_ENTRIES)
        return;
      let entries;
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (seen++ >= MAX_ENTRIES)
          return;
        const full = join3(dir, entry.name);
        try {
          const mtime = statSync(full).mtimeMs;
          if (mtime > newest)
            newest = mtime;
        } catch {
          continue;
        }
        if (entry.isDirectory())
          walk(full, depth + 1);
      }
    };
    walk(beadsDir, 0);
    return `${newest}:${seen}`;
  }
  function signature() {
    return pinnedSignature ?? computeSignature();
  }
  function beginRefresh() {
    pinnedSignature = computeSignature();
  }
  function snapshot() {
    pinnedSignature = undefined;
    return computeSignature();
  }
  function lastTouchedID() {
    try {
      const id = readFileSync(lastTouched, "utf8").trim();
      return isValidBeadID2(id) ? id : undefined;
    } catch {
      return;
    }
  }
  async function exec(args) {
    const { stdout } = await run("bd", args, {
      cwd: worktree,
      timeout: TIMEOUT_MS,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024
    });
    return stdout;
  }
  async function query(args) {
    if (!enabled())
      return;
    const key = args.join("\x00");
    const sig = signature();
    const hit = cache.get(key);
    if (hit) {
      if (hit.signature === sig)
        return hit.value;
      cache.delete(key);
    }
    try {
      const stdout = await exec(["--readonly", ...args, "--json"]);
      const trimmed = stdout.trim();
      const value = trimmed.length > 0 ? JSON.parse(trimmed) : undefined;
      for (const [k, v] of cache)
        if (v.signature !== sig)
          cache.delete(k);
      cache.set(key, { signature: sig, value });
      return value;
    } catch {
      return;
    }
  }
  async function mutate(id, args) {
    if (!isValidBeadID2(id))
      return { ok: false, message: `invalid bead id: ${id}` };
    const isClose = args[0] === "close" || args.includes("close");
    if (isClose) {
      try {
        let specText = "";
        try {
          const beads = await query(["list", "--id", id, "--all"]);
          const bead = beads?.[0];
          if (bead && typeof bead.description === "string")
            specText = bead.description;
        } catch {}
        const { allowed, gate } = await checkCloseGate(worktree, id, specText);
        if (!allowed) {
          return { ok: false, message: blockedCloseMessage(gate) };
        }
      } catch (e) {
        return { ok: false, message: `close blocked: gate evaluation error: ${String(e)}` };
      }
    }
    try {
      await exec(args);
      cache.clear();
      return { ok: true };
    } catch (err) {
      cache.clear();
      return { ok: false, message: messageFor(err) };
    }
  }
  function invalidate() {
    cache.clear();
  }
  return {
    enabled,
    signature,
    beginRefresh,
    snapshot,
    lastTouchedID,
    invalidate,
    mutate,
    children: (id) => isValidBeadID2(id) ? query(["children", id]) : Promise.resolve(undefined),
    get: (id) => isValidBeadID2(id) ? query(["list", "--id", id, "--all"]) : Promise.resolve(undefined),
    ready: () => query(["ready"]),
    list: (args = []) => query(["list", ...args]),
    epics: () => query(["list", "--type", "epic", "--all"])
  };
}
function messageFor(err) {
  if (err && typeof err === "object") {
    const e = err;
    const stderr = typeof e.stderr === "string" ? e.stderr.trim() : "";
    if (stderr)
      return firstLine(stderr);
    if (e.code === "ENOENT")
      return "bd not found on PATH";
    if (typeof e.message === "string")
      return firstLine(e.message);
  }
  return String(err);
}
function firstLine(text) {
  const line = text.split(/\r?\n/).find((it) => it.trim().length > 0);
  return (line ?? text).trim();
}

// src/sidebar/commands.ts
var COMMANDS = [
  "beads.focus",
  "beads.unfocus",
  "beads.start",
  "beads.close",
  "beads.reopen",
  "beads.refresh"
];
function registerCommands(api, bd, store) {
  async function apply(id, args, describe) {
    const result = await bd.mutate(id, args);
    if (!result.ok) {
      api.ui.toast({ variant: "error", title: "beads", message: result.message });
    } else {
      api.ui.toast({ variant: "success", title: "beads", message: describe });
    }
    await store.refresh(true);
  }
  function pick(title, items, onSelect) {
    if (items.length === 0) {
      api.ui.toast({ variant: "info", title: "beads", message: "nothing to pick" });
      return;
    }
    api.ui.dialog.replace(() => api.ui.DialogSelect({
      title,
      options: items.map((item) => ({
        title: item.bead.title ?? item.bead.id,
        description: `${item.bead.id} · ${item.state}`,
        value: item
      })),
      onSelect: (option) => {
        api.ui.dialog.clear();
        onSelect(option.value);
      }
    }));
  }
  function pickFrom(title, filter, run2) {
    const items = (store.data()?.items ?? []).filter(filter);
    pick(title, items, run2);
  }
  const layer = api.keymap.registerLayer({
    commands: [
      {
        name: "beads.focus",
        title: "Beads: focus an epic",
        desc: "Pin the sidebar to a specific epic for this session",
        category: "Beads",
        namespace: "palette",
        slashName: "bd-focus",
        async run() {
          const epics = await bd.epics() ?? [];
          if (epics.length === 0) {
            api.ui.toast({ variant: "info", title: "beads", message: "no epics in this workspace" });
            return;
          }
          api.ui.dialog.replace(() => api.ui.DialogSelect({
            title: "Focus epic",
            options: epics.map((epic) => ({
              title: epic.title ?? epic.id,
              description: `${epic.id} · ${epic.status ?? "open"}`,
              value: epic.id
            })),
            onSelect: (option) => {
              api.ui.dialog.clear();
              store.pin(String(option.value));
            }
          }));
        }
      },
      {
        name: "beads.unfocus",
        title: "Beads: clear focus",
        desc: "Go back to following whichever bead was last touched",
        category: "Beads",
        namespace: "palette",
        slashName: "bd-unfocus",
        run() {
          store.pin(undefined);
        }
      },
      {
        name: "beads.start",
        title: "Beads: start work",
        desc: "Mark a bead in progress",
        category: "Beads",
        namespace: "palette",
        slashName: "bd-start",
        run() {
          pickFrom("Start work", (item) => item.state !== "closed" && item.state !== "in_progress", (item) => void apply(item.bead.id, ["update", item.bead.id, "--status", "in_progress"], `started ${item.bead.id}`));
        }
      },
      {
        name: "beads.close",
        title: "Beads: close",
        desc: "Close a bead in the current plan",
        category: "Beads",
        namespace: "palette",
        slashName: "bd-close",
        run() {
          pickFrom("Close bead", (item) => item.state !== "closed", (item) => void (async () => {
            const worktree = api?.state?.path?.worktree ?? "";
            const specText = typeof item.bead.description === "string" ? item.bead.description : "";
            try {
              const { allowed, gate } = await checkCloseGate(worktree || ".", item.bead.id, specText);
              if (!allowed) {
                api.ui.toast({ variant: "error", title: "beads", message: blockedCloseMessage(gate) });
                return;
              }
            } catch (e) {
              api.ui.toast({ variant: "error", title: "beads", message: `close blocked: gate evaluation error: ${String(e)}` });
              return;
            }
            apply(item.bead.id, ["close", item.bead.id], `closed ${item.bead.id}`);
          })());
        }
      },
      {
        name: "beads.reopen",
        title: "Beads: reopen",
        desc: "Reopen a closed bead",
        category: "Beads",
        namespace: "palette",
        slashName: "bd-reopen",
        async run() {
          const closed = (store.data()?.items ?? []).filter((item) => item.state === "closed");
          const items = closed.length > 0 ? closed : (await bd.list(["--status", "closed"]) ?? []).map((bead) => ({ bead, state: "closed" }));
          pick("Reopen bead", items, (item) => void apply(item.bead.id, ["reopen", item.bead.id], `reopened ${item.bead.id}`));
        }
      },
      {
        name: "beads.refresh",
        title: "Beads: refresh",
        desc: "Re-read beads now",
        category: "Beads",
        namespace: "palette",
        slashName: "bd-refresh",
        run() {
          store.refresh(true);
        }
      }
    ],
    bindings: api.tuiConfig.keybinds.gather("beads", [...COMMANDS])
  });
  return typeof layer === "function" ? layer : () => {};
}
async function showBead(api, bd, item) {
  const bead = (await bd.get(item.bead.id))?.[0] ?? item.bead;
  const lines = [
    `${bead.id}  ${bead.status ?? "open"}${bead.issue_type ? ` · ${bead.issue_type}` : ""}`,
    "",
    bead.title ?? "",
    "",
    typeof bead.description === "string" && bead.description.length > 0 ? bead.description : "(no description)"
  ];
  if (typeof bead.acceptance_criteria === "string" && bead.acceptance_criteria.length > 0) {
    lines.push("", "Acceptance:", bead.acceptance_criteria);
  }
  api.ui.dialog.replace(() => api.ui.DialogAlert({
    title: bead.title ?? bead.id,
    message: lines.join(`
`)
  }));
}

// src/sidebar/debug.ts
import { appendFileSync } from "node:fs";
var SINK = process.env.BEADS_SIDEBAR_DEBUG;
function debug(line) {
  if (!SINK)
    return;
  try {
    appendFileSync(SINK, `${new Date().toISOString()} ${line}
`);
  } catch {}
}

// src/sidebar/scope.ts
function focusKey(sessionID) {
  return `beads.focus.${sessionID}`;
}
var CONTAINER_TYPES = new Set(["epic", "molecule"]);
async function resolveScope(bd, pinned) {
  if (!bd.enabled())
    return;
  const readyResult = await bd.ready();
  const ready = readyResult ? new Set(readyResult.map((it) => it.id)) : undefined;
  if (pinned) {
    const scoped = await epicScope(bd, pinned, ready);
    if (scoped)
      return scoped;
  }
  const touched = bd.lastTouchedID();
  if (touched) {
    const bead = (await bd.get(touched))?.[0];
    if (bead) {
      const epicID = bead.issue_type === "epic" ? bead.id : bead.parent;
      if (typeof epicID === "string" && epicID.length > 0) {
        const scoped = await epicScope(bd, epicID, ready);
        if (scoped)
          return scoped;
      }
    }
  }
  return workspaceScope(bd, ready);
}
async function epicScope(bd, epicID, ready) {
  const epic = (await bd.get(epicID))?.[0];
  if (!epic)
    return;
  const children = await bd.children(epicID) ?? [];
  if (children.length === 0)
    return;
  const all = children.filter((it) => it.id !== epicID).sort(byID).map((bead) => ({ bead, state: stateOf(bead, ready) }));
  const hiddenClosed = all.filter((it) => it.state === "closed").length;
  const items = all.filter((it) => it.state !== "closed");
  return {
    epic,
    items,
    done: hiddenClosed,
    total: all.length,
    fallback: false,
    hiddenClosed
  };
}
async function workspaceScope(bd, ready) {
  const open = await bd.list(["--all"]) ?? [];
  const all = open.filter((it) => !CONTAINER_TYPES.has(it.issue_type ?? "")).map((bead) => ({ bead, state: stateOf(bead, ready) })).sort(byUrgency);
  if (all.length === 0)
    return;
  const hiddenClosed = all.filter((it) => it.state === "closed").length;
  const items = all.filter((it) => it.state !== "closed");
  if (items.length === 0 && hiddenClosed === 0)
    return;
  return {
    items,
    done: hiddenClosed,
    total: all.length,
    fallback: true,
    hiddenClosed
  };
}
function stateOf(bead, ready) {
  const status = typeof bead.status === "string" ? bead.status : "open";
  switch (status) {
    case "closed":
      return "closed";
    case "in_progress":
      return "in_progress";
    case "blocked":
      return "blocked";
    case "deferred":
      return "deferred";
    case "pinned":
      return "pinned";
    case "hooked":
      return "hooked";
    default:
      if (!ready)
        return "open";
      return ready.has(bead.id) ? "ready" : "blocked";
  }
}
function byID(a, b) {
  return a.id.localeCompare(b.id, undefined, { numeric: true });
}
function byUrgency(a, b) {
  const rank = (item) => item.state === "in_progress" ? 0 : item.state === "ready" || item.state === "open" ? 1 : item.state === "blocked" ? 2 : 3;
  const byRank = rank(a) - rank(b);
  if (byRank !== 0)
    return byRank;
  return byID(a.bead, b.bead);
}

// src/sidebar/tui.tsx
import { jsxDEV } from "@opentui/solid/jsx-dev-runtime";
var POLL_MS = 1500;
var MAX_POLL_MS = 30000;
function createStore(bd, kv) {
  const [data, setData] = createSignal(undefined);
  const [sessionID, setSessionID] = createSignal(undefined);
  let lastSignature;
  let inFlight = false;
  let pending;
  let pollDelay = POLL_MS;
  let owner = null;
  function adopt(next) {
    if (next)
      owner = next;
  }
  function commit(next) {
    if (owner)
      runWithOwner(owner, () => setData(next));
    else
      setData(next);
  }
  function pinned() {
    const id = sessionID();
    if (!id)
      return;
    const value = kv.get(focusKey(id), "");
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }
  function pin(epicID) {
    const id = sessionID();
    if (!id)
      return;
    debug(`pin epic=${epicID ?? "-"} session=${id}`);
    kv.set(focusKey(id), epicID ?? "");
    refresh(true);
  }
  async function refresh(force = false) {
    if (inFlight) {
      pending = { force: pending?.force || force };
      return;
    }
    inFlight = true;
    try {
      if (force)
        bd.invalidate();
      bd.beginRefresh();
      const next = await resolveScope(bd, pinned());
      debug(`refresh items=${next?.items.length ?? "none"} epic=${next?.epic?.id ?? "-"}`);
      commit(next);
      pollDelay = POLL_MS;
    } catch (err) {
      debug(`refresh threw ${String(err)}`);
      pollDelay = Math.min(pollDelay * 2, MAX_POLL_MS);
      commit({ epic: undefined, items: [], done: 0, total: 0, fallback: false, error: String(err), hiddenClosed: 0 });
    } finally {
      lastSignature = bd.snapshot();
      inFlight = false;
      if (pending) {
        const { force: pendingForce } = pending;
        pending = undefined;
        refresh(pendingForce);
      }
    }
  }
  function start() {
    refresh(true);
    let timer;
    const tick = () => {
      const failed = data()?.error !== undefined;
      if (failed || bd.signature() !== lastSignature)
        refresh();
      timer = setTimeout(tick, pollDelay);
    };
    timer = setTimeout(tick, pollDelay);
    return () => clearTimeout(timer);
  }
  return { data, refresh, start, pin, pinned, sessionID, setSessionID, adopt };
}
var GLYPH = {
  closed: "✓",
  in_progress: "◐",
  blocked: "●",
  ready: "○",
  open: "○",
  deferred: "❄",
  pinned: "◆",
  hooked: "◇"
};
var COLLAPSE_THRESHOLD = 2;
function closedHiddenFooter(data) {
  if (!data)
    return;
  if (data.error)
    return;
  const count = data.hiddenClosed ?? 0;
  if (count <= 0)
    return;
  return `${count} closed hidden`;
}
function BeadsPanel(props) {
  const [expanded, setExpanded] = createSignal(true);
  const theme = () => props.api.theme.current;
  props.adopt(getOwner());
  const items = createMemo(() => props.data()?.items ?? []);
  const collapsible = createMemo(() => items().length > COLLAPSE_THRESHOLD);
  const visible = createMemo(() => collapsible() && !expanded() ? [] : items());
  const footerText = createMemo(() => closedHiddenFooter(props.data()));
  const heading = createMemo(() => {
    const data = props.data();
    if (!data)
      return "";
    if (data.fallback)
      return `${data.items.length} open`;
    const pct = data.total > 0 ? Math.round(data.done / data.total * 100) : 0;
    return `${pct}% (${data.done}/${data.total})`;
  });
  return /* @__PURE__ */ jsxDEV(Show, {
    when: props.data(),
    children: (data) => /* @__PURE__ */ jsxDEV(Show, {
      when: data().error,
      fallback: /* @__PURE__ */ jsxDEV("box", {
        children: [
          /* @__PURE__ */ jsxDEV("box", {
            flexDirection: "row",
            gap: 1,
            onMouseDown: () => collapsible() && setExpanded((it) => !it),
            children: [
              /* @__PURE__ */ jsxDEV(Show, {
                when: collapsible(),
                children: /* @__PURE__ */ jsxDEV("text", {
                  fg: theme().text,
                  children: expanded() ? "▼" : "▶"
                }, undefined, false, undefined, this)
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsxDEV("text", {
                fg: theme().text,
                children: /* @__PURE__ */ jsxDEV("b", {
                  children: "Beads"
                }, undefined, false, undefined, this)
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsxDEV(Show, {
                when: data().epic,
                children: (epic) => /* @__PURE__ */ jsxDEV("text", {
                  fg: theme().textMuted,
                  wrapMode: "none",
                  children: epic().id
                }, undefined, false, undefined, this)
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsxDEV("text", {
                fg: theme().textMuted,
                children: heading()
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsxDEV(For, {
            each: visible(),
            children: (item) => /* @__PURE__ */ jsxDEV(Row, {
              api: props.api,
              item,
              onSelect: props.onSelect
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV(Show, {
            when: footerText() !== undefined,
            children: /* @__PURE__ */ jsxDEV("text", {
              fg: theme().textMuted,
              children: footerText()
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      children: /* @__PURE__ */ jsxDEV("box", {
        flexDirection: "row",
        gap: 1,
        children: [
          /* @__PURE__ */ jsxDEV("text", {
            fg: theme().text,
            children: /* @__PURE__ */ jsxDEV("b", {
              children: "Beads"
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV("text", {
            fg: theme().textMuted,
            wrapMode: "none",
            children: `unavailable — ${shortError(data().error ?? "")}; /bd-refresh to retry`
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    }, undefined, false, undefined, this)
  }, undefined, false, undefined, this);
}
function shortError(text) {
  const line = text.split(/\r?\n/).find((it) => it.trim().length > 0) ?? text;
  return line.length > 80 ? `${line.slice(0, 79)}…` : line;
}
function Row(props) {
  const theme = () => props.api.theme.current;
  const color = () => {
    switch (props.item.state) {
      case "in_progress":
        return theme().warning;
      case "blocked":
        return theme().error;
      case "ready":
        return theme().text;
      default:
        return theme().textMuted;
    }
  };
  return /* @__PURE__ */ jsxDEV("box", {
    flexDirection: "row",
    gap: 0,
    onMouseDown: () => props.onSelect(props.item),
    children: [
      /* @__PURE__ */ jsxDEV("text", {
        flexShrink: 0,
        style: { fg: color() },
        children: [
          "[",
          GLYPH[props.item.state] ?? " ",
          "]",
          " "
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsxDEV("text", {
        flexGrow: 1,
        wrapMode: "word",
        style: { fg: color() },
        children: props.item.bead.title ?? props.item.bead.id
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
var SIDEBAR_ORDER = 450;
var tui = async (api) => {
  const bd = createBdClient(api.state.path.worktree);
  debug(`init worktree=${api.state.path.worktree} enabled=${bd.enabled()}`);
  const store = createStore(bd, api.kv);
  const stopPolling = store.start();
  const unregisterCommands = registerCommands(api, bd, store);
  api.lifecycle.onDispose(() => {
    stopPolling();
    unregisterCommands();
  });
  api.slots.register({
    order: SIDEBAR_ORDER,
    slots: {
      sidebar_content(_ctx, value) {
        store.setSessionID(value.session_id);
        return /* @__PURE__ */ jsxDEV(BeadsPanel, {
          api,
          data: store.data,
          adopt: store.adopt,
          onSelect: (item) => void showBead(api, bd, item)
        }, undefined, false, undefined, this);
      }
    }
  });
};
var plugin = {
  id: "trans-genderian-orchestra",
  tui
};
var tui_default = plugin;
export {
  tui_default as default,
  createStore,
  closedHiddenFooter,
  BeadsPanel
};
