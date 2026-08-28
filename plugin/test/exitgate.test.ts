import { describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { parseDeltaSpec } from "../src/exitgate/delta-spec";
import { triageFindings, finding } from "../src/exitgate/triage";
import { scoreTrajectory, scoreTrajectoryEntries, type RunLogEntry } from "../src/exitgate/trajectory";
import { loadGateProfile, DEFAULT_GATE_PROFILE, DEFAULT_BLACKLIST, parseGateProfile, compileBlacklist } from "../src/exitgate/profile";
import { runExitGate, runExitGateSync } from "../src/exitgate/gate";
import { evaluateClosure, applyGateToClosure, shouldRunGate, gateBlockedWithError, evaluateGatedClosure } from "../src/lifecycle";
import { parseTaskReport } from "../src/report";
import { checkCloseGate, blockedCloseMessage } from "../src/exitgate/close-gate";

// Helper to create temp repoRoot
async function mkTempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tgo-exitgate-"));
  await fs.mkdir(path.join(dir, ".tgo", "runs"), { recursive: true });
  return dir;
}
function cleanup(dir: string) {
  return fs.rm(dir, { recursive: true, force: true }).catch(() => {});
}

// Contract v2 synthetic entry: includes required issueId, tool, ok boolean, etc.
// By default uses issueId tgo-abc, seat dylan, ok true.
// For heartbeat, tool must be "heartbeat" per contract.
function syntheticEntry(overrides: Partial<RunLogEntry> & { cmd?: string } = {}): RunLogEntry {
  const base: RunLogEntry = {
    ts: Date.now(),
    type: "step",
    seat: "dylan",
    tool: "bash",
    argsHash: "abcd1234",
    ok: true,
    durationMs: 100,
    note: "echo hi",
    issueId: "tgo-abc",
    ...overrides,
  } as RunLogEntry;
  // Ensure overrides that set cmd are preserved
  if (overrides.cmd !== undefined) (base as any).cmd = overrides.cmd;
  return base;
}
function withIssueId(entries: RunLogEntry[], issueId: string): RunLogEntry[] {
  return entries.map((e) => ({ ...e, issueId }));
}
function terminalStatus(issueId: string, note: string = "complete"): RunLogEntry {
  return {
    ts: Date.now(),
    type: "status",
    seat: "dylan",
    tool: "heartbeat",
    argsHash: "ffff0000",
    ok: true,
    durationMs: 5,
    note,
    issueId,
  };
}

describe("gate profile", () => {
  test("missing profile → defaults (lenient, no throw)", async () => {
    const dir = await mkTempRepo();
    try {
      const profile = await loadGateProfile(dir);
      expect(profile.enabled).toBe(true);
      expect(profile.blacklist.length).toBeGreaterThan(0);
      expect(profile.toggles.deltaSpec).toBe(true);
      expect(profile.toggles.trajectory).toBe(true);
    } finally {
      await cleanup(dir);
    }
  });
  test("profile from .tgo/gate.json overrides blacklist and toggles", async () => {
    const dir = await mkTempRepo();
    try {
      const custom = {
        enabled: true,
        blacklist: ["rm -rf /tmp/custom"],
        toggles: { deltaSpec: false, triage: false, trajectory: true },
        trajectory: { maxSteps: 10, expectedSequence: ["read", "edit"] },
      };
      await fs.writeFile(path.join(dir, ".tgo", "gate.json"), JSON.stringify(custom), "utf-8");
      const profile = await loadGateProfile(dir);
      expect(profile.blacklist).toEqual(["rm -rf /tmp/custom"]);
      expect(profile.toggles.deltaSpec).toBe(false);
      expect(profile.toggles.triage).toBe(false);
      expect(profile.toggles.trajectory).toBe(true);
      expect(profile.trajectory.maxSteps).toBe(10);
    } finally {
      await cleanup(dir);
    }
  });
  test("invalid blacklist patterns are filtered, not thrown", () => {
    const p = parseGateProfile({ blacklist: ["[invalid", "valid.*pattern"] });
    expect(p.blacklist).toContain("valid.*pattern");
    expect(p.blacklist).not.toContain("[invalid");
  });
  test("explicit empty blacklist honoured (no hard-fail)", () => {
    const p = parseGateProfile({ blacklist: [] });
    expect(p.blacklist).toEqual([]);
  });
  test("DEFAULT_BLACKLIST ships safe defaults (destructive bash)", () => {
    expect(DEFAULT_BLACKLIST.length).toBeGreaterThan(0);
    expect(DEFAULT_BLACKLIST.join(" ")).toContain("rm");
  });
  test("ReDoS: pattern length >200 capped/ignored", () => {
    const longPattern = "a".repeat(201);
    const p = parseGateProfile({ blacklist: [longPattern, "safe"] });
    expect(p.blacklist).not.toContain(longPattern);
    expect(p.blacklist).toContain("safe");
    const compiled = compileBlacklist([longPattern, "safe"]);
    expect(compiled.length).toBe(1);
    expect(compiled[0]?.source).toBe("safe");
  });
  test("ReDoS: haystack truncated to 500 before match (no throw on huge input)", () => {
    const profile = { ...DEFAULT_GATE_PROFILE, blacklist: ["EVIL"] };
    const hugeNote = "x".repeat(10000) + " EVIL";
    // Without cap, regex on huge input could be slow; with cap 500, EVIL beyond 500 is not seen
    const entries = [syntheticEntry({ note: hugeNote })];
    const { findings } = scoreTrajectoryEntries(entries, profile);
    // EVIL is beyond 500, so should NOT match (haystack truncated)
    expect(findings.some((f) => f.code === "BLACKLIST_HARD_FAIL")).toBe(false);
    // Within 500, should match
    const closeNote = "EVIL " + "x".repeat(10000);
    const entries2 = [syntheticEntry({ note: closeNote })];
    const { findings: f2 } = scoreTrajectoryEntries(entries2, profile);
    expect(f2.some((f) => f.code === "BLACKLIST_HARD_FAIL")).toBe(true);
  });
});

describe("delta-spec parse", () => {
  test("parses SHALL/MUST requirement lines", () => {
    const spec = `
Objective
The system SHALL persist delegations atomically.
Files
The module MUST expose a deterministic API.
Interfaces
Gate profile SHALL declare blacklist patterns.
`;
    const ds = parseDeltaSpec(spec);
    expect(ds.requirements.length).toBe(3);
    expect(ds.requirements[0]?.kind).toBe("SHALL");
    expect(ds.requirements[1]?.kind).toBe("MUST");
    expect(ds.requirements[2]?.kind).toBe("SHALL");
  });
  test("parses Scenario blocks", () => {
    const spec = `
Scenario: successful close
Given a complete report
When gate runs
Then close is allowed

Scenario: blocked close
Given blacklist violation
When gate runs
Then close is blocked
`;
    const ds = parseDeltaSpec(spec);
    expect(ds.scenarios.length).toBe(2);
    expect(ds.scenarios[0]?.title).toBe("successful close");
    expect(ds.scenarios[1]?.title).toBe("blocked close");
  });
  test("ambiguous SHALL surfaces WARNING finding", () => {
    const spec = `The system SHALL handle appropriate cases etc.`;
    const ds = parseDeltaSpec(spec);
    expect(ds.requirements.length).toBe(1);
    expect(ds.requirements[0]?.ambiguous).toBe(true);
    const amb = ds.findings.find((f) => f.message.includes("Ambiguous"));
    expect(amb).toBeDefined();
    expect(amb?.severity).toBe("WARNING");
    expect(amb?.axis).toBe("completeness");
  });
  test("missing SHALL/MUST surfaces WARNING", () => {
    const ds = parseDeltaSpec("No requirements here, just prose.");
    expect(ds.requirements.length).toBe(0);
    const miss = ds.findings.find((f) => f.message.includes("No SHALL"));
    expect(miss).toBeDefined();
    expect(miss?.severity).toBe("WARNING");
  });
  test("short SHALL surfaces SUGGESTION", () => {
    const ds = parseDeltaSpec("SHALL do x.");
    const sug = ds.findings.find((f) => f.severity === "SUGGESTION" && f.message.includes("short"));
    expect(sug).toBeDefined();
  });
  test("Scenario without Given/When/Then surfaces SUGGESTION", () => {
    const ds = parseDeltaSpec("Scenario: vague\nJust some text without structure");
    const sug = ds.findings.find((f) => f.message.includes("lacks Given"));
    expect(sug).toBeDefined();
    expect(sug?.severity).toBe("SUGGESTION");
  });
  test("empty Scenario body surfaces WARNING", () => {
    const ds = parseDeltaSpec("Scenario: empty\n");
    expect(ds.scenarios.length).toBe(1);
    const warn = ds.findings.find((f) => f.message.includes("empty body"));
    if (warn) expect(warn.severity).toBe("WARNING");
  });
});

describe("3-axis verify triage", () => {
  test("CRITICAL blocks close (completeness)", () => {
    const findings = [finding("completeness", "CRITICAL", "missing file", "test", "C1")];
    const t = triageFindings(findings);
    expect(t.blocked).toBe(true);
    expect(t.highestSeverity).toBe("CRITICAL");
    expect(t.perAxis.completeness.hasCritical).toBe(true);
    expect(t.reason).toContain("CRITICAL");
  });
  test("CRITICAL blocks close (correctness)", () => {
    const t = triageFindings([finding("correctness", "CRITICAL", "blacklist", "trajectory")]);
    expect(t.blocked).toBe(true);
    expect(t.perAxis.correctness.hasCritical).toBe(true);
  });
  test("CRITICAL blocks close (coherence)", () => {
    const t = triageFindings([finding("coherence", "CRITICAL", "incoherent", "test")]);
    expect(t.blocked).toBe(true);
    expect(t.perAxis.coherence.hasCritical).toBe(true);
  });
  test("WARNING does not block", () => {
    const t = triageFindings([
      finding("completeness", "WARNING", "ambiguous", "delta-spec"),
      finding("correctness", "WARNING", "efficiency", "trajectory"),
    ]);
    expect(t.blocked).toBe(false);
    expect(t.highestSeverity).toBe("WARNING");
  });
  test("SUGGESTION does not block", () => {
    const t = triageFindings([finding("coherence", "SUGGESTION", "short req", "delta-spec")]);
    expect(t.blocked).toBe(false);
    expect(t.highestSeverity).toBe("SUGGESTION");
  });
  test("mixed WARNING+SUGGESTION does not block; CRITICAL dominates", () => {
    const withoutCritical = triageFindings([
      finding("completeness", "WARNING", "w1", "a"),
      finding("coherence", "SUGGESTION", "s1", "a"),
    ]);
    expect(withoutCritical.blocked).toBe(false);
    const withCritical = triageFindings([
      finding("completeness", "WARNING", "w1", "a"),
      finding("correctness", "CRITICAL", "c1", "a"),
      finding("coherence", "SUGGESTION", "s1", "a"),
    ]);
    expect(withCritical.blocked).toBe(true);
    expect(withCritical.highestSeverity).toBe("CRITICAL");
  });
  test("per-axis verdict groups correctly", () => {
    const findings = [
      finding("completeness", "WARNING", "w", "a"),
      finding("correctness", "CRITICAL", "c", "a"),
      finding("coherence", "SUGGESTION", "s", "a"),
    ];
    const t = triageFindings(findings);
    expect(t.perAxis.completeness.count).toBe(1);
    expect(t.perAxis.correctness.count).toBe(1);
    expect(t.perAxis.coherence.count).toBe(1);
    expect(t.perAxis.correctness.severity).toBe("CRITICAL");
    expect(t.perAxis.completeness.severity).toBe("WARNING");
  });
});

describe("trajectory scorer contract v2", () => {
  test("skip-when-no-log: missing file → WARNING skipped, not CRITICAL", async () => {
    const dir = await mkTempRepo();
    try {
      const res = await scoreTrajectory(dir, "tgo-abc", DEFAULT_GATE_PROFILE);
      expect(res.skipped).toBe(true);
      expect(res.skipReason).toBe("no-log");
      expect(res.findings.length).toBe(1);
      expect(res.findings[0]?.severity).toBe("WARNING");
      expect(res.findings[0]?.code).toBe("TRAJECTORY_SKIP_NO_LOG");
      expect(triageFindings(res.findings).blocked).toBe(false);
    } finally {
      await cleanup(dir);
    }
  });
  test("trajectory detection with synthetic run log matching contract v2", async () => {
    const dir = await mkTempRepo();
    try {
      const runId = "tgo-syn1";
      const entries: RunLogEntry[] = [
        { ts: Date.now(), type: "step", seat: "dylan", tool: "read", argsHash: "a1b2c3d4", ok: true, durationMs: 120, note: "read files", issueId: runId },
        { ts: Date.now() + 1, type: "step", seat: "dylan", tool: "edit", argsHash: "b2c3d4e5", ok: true, durationMs: 300, note: "edit file", issueId: runId },
        { ts: Date.now() + 2, type: "step", seat: "dylan", tool: "bash", argsHash: "c3d4e5f6", ok: true, durationMs: 200, note: "bun test", issueId: runId, cmd: "bun test" },
        { ts: Date.now() + 3, type: "heartbeat", seat: "dylan", tool: "heartbeat", argsHash: "d4e5f6a7", ok: true, durationMs: 10, note: "hb", issueId: runId },
        { ts: Date.now() + 4, type: "status", seat: "dylan", tool: "heartbeat", argsHash: "e5f6a7b8", ok: true, durationMs: 5, note: "complete", issueId: runId },
      ];
      const content = entries.map((e) => JSON.stringify(e)).join("\n");
      await fs.writeFile(path.join(dir, ".tgo", "runs", `${runId}.jsonl`), content, "utf-8");
      const res = await scoreTrajectory(dir, runId, DEFAULT_GATE_PROFILE);
      expect(res.skipped).toBe(false);
      expect(res.entries.length).toBe(5);
      expect(res.findings.filter((f) => f.severity === "CRITICAL").length).toBe(0);
      expect(triageFindings(res.findings).blocked).toBe(false);
    } finally {
      await cleanup(dir);
    }
  });
  test("heartbeat requires tool heartbeat — wrong tool ignored", async () => {
    const dir = await mkTempRepo();
    try {
      const runId = "tgo-hb1";
      const entries = [
        { ts: 1, type: "heartbeat", seat: "dylan", tool: "bash", argsHash: "abcd", ok: true, durationMs: 10, note: "hb", issueId: runId },
        { ts: 2, type: "step", seat: "dylan", tool: "read", argsHash: "efgh", ok: true, durationMs: 10, note: "read", issueId: runId },
        { ts: 3, type: "status", seat: "dylan", tool: "heartbeat", argsHash: "ijkl", ok: true, durationMs: 5, note: "complete", issueId: runId },
      ];
      const content = entries.map((e) => JSON.stringify(e)).join("\n");
      await fs.writeFile(path.join(dir, ".tgo", "runs", `${runId}.jsonl`), content, "utf-8");
      const res = await scoreTrajectory(dir, runId, DEFAULT_GATE_PROFILE);
      // First heartbeat with tool bash should be ignored, so only 2 valid entries
      expect(res.entries.length).toBe(2);
      expect(res.entries[0]?.tool).toBe("read");
    } finally {
      await cleanup(dir);
    }
  });
  test("required fields strict: ok as string false is ignored, not coerced to true", async () => {
    const dir = await mkTempRepo();
    try {
      const runId = "tgo-coerce1";
      const lines = [
        JSON.stringify({ ts: 1, type: "step", seat: "dylan", tool: "bash", argsHash: "abcd", ok: "false", durationMs: 10, note: "cmd should be ignored", issueId: runId }),
        JSON.stringify({ ts: 2, type: "step", seat: "dylan", tool: "read", argsHash: "efgh", ok: true, durationMs: 10, note: "valid", issueId: runId }),
        JSON.stringify({ ts: 3, type: "status", seat: "dylan", tool: "heartbeat", argsHash: "ijkl", ok: true, durationMs: 5, note: "complete", issueId: runId }),
      ].join("\n");
      await fs.writeFile(path.join(dir, ".tgo", "runs", `${runId}.jsonl`), lines, "utf-8");
      const res = await scoreTrajectory(dir, runId, DEFAULT_GATE_PROFILE);
      expect(res.entries.length).toBe(2); // first line ignored
      expect(res.entries.find((e) => e.note.includes("should be ignored"))).toBeUndefined();
    } finally {
      await cleanup(dir);
    }
  });
  test("missing required fields ignored: tool empty, ok missing, issueId invalid", async () => {
    const dir = await mkTempRepo();
    try {
      const runId = "tgo-miss1";
      const lines = [
        JSON.stringify({ ts: 1, type: "step", seat: "dylan", tool: "", argsHash: "abcd", ok: true, durationMs: 10, note: "empty tool", issueId: runId }),
        JSON.stringify({ ts: 2, type: "step", seat: "dylan", tool: "bash", argsHash: "abcd", ok: true, durationMs: 10, note: "missing issueId" }),
        JSON.stringify({ ts: 3, type: "step", seat: "dylan", tool: "bash", argsHash: "abcd", durationMs: 10, note: "missing ok", issueId: runId }),
        JSON.stringify({ ts: 4, type: "step", seat: "dylan", tool: "bash", argsHash: "abcd", ok: true, durationMs: 10, note: "invalid issueId", issueId: "bad/id" }),
        JSON.stringify({ ts: 5, type: "step", seat: "dylan", tool: "bash", argsHash: "abcd", ok: true, durationMs: 10, note: "valid", issueId: runId }),
        JSON.stringify({ ts: 6, type: "status", seat: "dylan", tool: "heartbeat", argsHash: "abcd", ok: true, durationMs: 5, note: "complete", issueId: runId }),
      ].join("\n");
      await fs.writeFile(path.join(dir, ".tgo", "runs", `${runId}.jsonl`), lines, "utf-8");
      const res = await scoreTrajectory(dir, runId, DEFAULT_GATE_PROFILE);
      expect(res.entries.length).toBe(2); // only last step + status
    } finally {
      await cleanup(dir);
    }
  });
  test("blacklist hard-fail matches tool+cmd+note (cmd primary)", async () => {
    const dir = await mkTempRepo();
    try {
      const runId = "tgo-black1";
      const entries: RunLogEntry[] = [
        syntheticEntry({ tool: "bash", issueId: runId, cmd: "rm -rf / --no-preserve-root", note: "via cmd field" }),
        syntheticEntry({ tool: "read", issueId: runId, note: "safe read" }),
        terminalStatus(runId, "complete"),
      ];
      const content = entries.map((e) => JSON.stringify(e)).join("\n");
      await fs.writeFile(path.join(dir, ".tgo", "runs", `${runId}.jsonl`), content, "utf-8");
      const res = await scoreTrajectory(dir, runId, DEFAULT_GATE_PROFILE);
      const crit = res.findings.filter((f) => f.code === "BLACKLIST_HARD_FAIL");
      expect(crit.length).toBeGreaterThan(0);
      expect(crit[0]?.severity).toBe("CRITICAL");
      expect(triageFindings(res.findings).blocked).toBe(true);
    } finally {
      await cleanup(dir);
    }
  });
  test("blacklist respects repo config, not hard-coded — custom blacklist used", async () => {
    const customProfile = { ...DEFAULT_GATE_PROFILE, blacklist: ["CUSTOM_BAD_CMD"] };
    const entries = [syntheticEntry({ tool: "bash", issueId: "tgo-abc", cmd: "CUSTOM_BAD_CMD --danger", note: "x" }), terminalStatus("tgo-abc", "complete")];
    const { findings } = scoreTrajectoryEntries(entries, customProfile);
    expect(findings.some((f) => f.severity === "CRITICAL" && f.code === "BLACKLIST_HARD_FAIL")).toBe(true);
    const safeEntries = [syntheticEntry({ tool: "bash", issueId: "tgo-abc", cmd: "rm -rf /", note: "x" }), terminalStatus("tgo-abc", "complete")];
    const { findings: safeFindings } = scoreTrajectoryEntries(safeEntries, customProfile);
    expect(safeFindings.some((f) => f.code === "BLACKLIST_HARD_FAIL")).toBe(false);
  });
  test("blacklist from repo config: .tgo/gate.json custom list triggers CRITICAL via cmd", async () => {
    const dir = await mkTempRepo();
    try {
      const runId = "tgo-cust2";
      await fs.writeFile(path.join(dir, ".tgo", "gate.json"), JSON.stringify({ blacklist: ["EVIL_CMD"] }), "utf-8");
      const profile = await loadGateProfile(dir);
      expect(profile.blacklist).toEqual(["EVIL_CMD"]);
      const entries: RunLogEntry[] = [syntheticEntry({ tool: "bash", issueId: runId, cmd: "EVIL_CMD --do", note: "x" }), terminalStatus(runId, "complete")];
      const content = entries.map((e) => JSON.stringify(e)).join("\n");
      await fs.writeFile(path.join(dir, ".tgo", "runs", `${runId}.jsonl`), content, "utf-8");
      const res = await scoreTrajectory(dir, runId, profile);
      expect(res.findings.some((f) => f.severity === "CRITICAL")).toBe(true);
    } finally {
      await cleanup(dir);
    }
  });
  test("F5: no terminal status → WARNING TRAJECTORY_INCOMPLETE, not pass", async () => {
    const dir = await mkTempRepo();
    try {
      const runId = "tgo-incomplete1";
      const entries: RunLogEntry[] = [
        syntheticEntry({ tool: "read", issueId: runId, note: "read" }),
        syntheticEntry({ tool: "edit", issueId: runId, note: "edit" }),
      ];
      const content = entries.map((e) => JSON.stringify(e)).join("\n");
      await fs.writeFile(path.join(dir, ".tgo", "runs", `${runId}.jsonl`), content, "utf-8");
      const res = await scoreTrajectory(dir, runId, DEFAULT_GATE_PROFILE);
      expect(res.entries.length).toBe(2);
      const incomplete = res.findings.find((f) => f.code === "TRAJECTORY_INCOMPLETE");
      expect(incomplete).toBeDefined();
      expect(incomplete?.severity).toBe("WARNING");
      expect(triageFindings(res.findings).blocked).toBe(false);
    } finally {
      await cleanup(dir);
    }
  });
  test("F5: with terminal status → no incomplete warning", async () => {
    const dir = await mkTempRepo();
    try {
      const runId = "tgo-complete1";
      const entries: RunLogEntry[] = [
        syntheticEntry({ tool: "read", issueId: runId, note: "read" }),
        terminalStatus(runId, "complete"),
      ];
      const content = entries.map((e) => JSON.stringify(e)).join("\n");
      await fs.writeFile(path.join(dir, ".tgo", "runs", `${runId}.jsonl`), content, "utf-8");
      const res = await scoreTrajectory(dir, runId, DEFAULT_GATE_PROFILE);
      expect(res.findings.find((f) => f.code === "TRAJECTORY_INCOMPLETE")).toBeUndefined();
    } finally {
      await cleanup(dir);
    }
  });
  test("efficiency signals: maxSteps WARNING, consecutive loop WARNING, but not CRITICAL", async () => {
    const profile = { ...DEFAULT_GATE_PROFILE, trajectory: { maxSteps: 2 } };
    const manySteps = [
      ...Array.from({ length: 5 }, () => syntheticEntry({ tool: "read", issueId: "tgo-abc", note: "read" })),
      terminalStatus("tgo-abc", "complete"),
    ];
    const { findings: f1 } = scoreTrajectoryEntries(manySteps as RunLogEntry[], profile);
    expect(f1.some((f) => f.code === "EFFICIENCY_MAX_STEPS" && f.severity === "WARNING")).toBe(true);
    expect(triageFindings(f1).blocked).toBe(false);
    const loopEntries = [
      ...Array.from({ length: 6 }, () => syntheticEntry({ tool: "bash", issueId: "tgo-abc", note: "echo loop" })),
      terminalStatus("tgo-abc", "complete"),
    ];
    const { findings: f2 } = scoreTrajectoryEntries(loopEntries as RunLogEntry[], DEFAULT_GATE_PROFILE);
    expect(f2.some((f) => f.code === "EFFICIENCY_LOOP_CONSECUTIVE")).toBe(true);
    expect(triageFindings(f2).blocked).toBe(false);
  });
  test("expected sequence hint warning when hint missing", () => {
    const profile = { ...DEFAULT_GATE_PROFILE, trajectory: { expectedSequence: ["read", "edit", "bash"], maxSteps: 100 } };
    const entries = [syntheticEntry({ tool: "bash", issueId: "tgo-abc", note: "bash only" }), terminalStatus("tgo-abc", "complete")];
    const { findings } = scoreTrajectoryEntries(entries as RunLogEntry[], profile);
    expect(findings.some((f) => f.code === "EXPECTED_SEQUENCE_MISSING" && f.severity === "WARNING")).toBe(true);
  });
  test("trajectory skips gracefully when file empty", async () => {
    const dir = await mkTempRepo();
    try {
      const runId = "tgo-empty";
      await fs.writeFile(path.join(dir, ".tgo", "runs", `${runId}.jsonl`), "", "utf-8");
      const res = await scoreTrajectory(dir, runId, DEFAULT_GATE_PROFILE);
      expect(res.skipped).toBe(true);
      expect(res.findings[0]?.severity).toBe("WARNING");
    } finally {
      await cleanup(dir);
    }
  });
  test("malformed JSON lines ignored deterministically, does not throw", async () => {
    const dir = await mkTempRepo();
    try {
      const runId = "tgo-mal";
      const content = `{"ts":1,"type":"step","seat":"dylan","tool":"bash","argsHash":"abcd","ok":true,"durationMs":10,"note":"hi","issueId":"${runId}"}\nnot json\n{"ts":2,"type":"step","seat":"dylan","tool":"read","argsHash":"efgh","ok":true,"durationMs":10,"note":"read","issueId":"${runId}"}\n{"ts":3,"type":"status","seat":"dylan","tool":"heartbeat","argsHash":"ijkl","ok":true,"durationMs":5,"note":"complete","issueId":"${runId}"}\n`;
      await fs.writeFile(path.join(dir, ".tgo", "runs", `${runId}.jsonl`), content, "utf-8");
      const res = await scoreTrajectory(dir, runId, DEFAULT_GATE_PROFILE);
      expect(res.entries.length).toBe(3);
      expect(res.entries[0]?.tool).toBe("bash");
      expect(res.skipped).toBe(false);
    } finally {
      await cleanup(dir);
    }
  });
  test("terminal detection only on type status, not step note", async () => {
    const dir = await mkTempRepo();
    try {
      const runId = "tgo-term1";
      const entries = [
        { ts: 1, type: "step", seat: "dylan", tool: "bash", argsHash: "abcd", ok: true, durationMs: 10, note: "complete", issueId: runId },
        { ts: 2, type: "step", seat: "dylan", tool: "read", argsHash: "efgh", ok: true, durationMs: 10, note: "failed", issueId: runId },
      ];
      const content = entries.map((e) => JSON.stringify(e)).join("\n");
      await fs.writeFile(path.join(dir, ".tgo", "runs", `${runId}.jsonl`), content, "utf-8");
      const res = await scoreTrajectory(dir, runId, DEFAULT_GATE_PROFILE);
      // No status lines, so should have incomplete warning even though notes contain complete/failed
      expect(res.findings.find((f) => f.code === "TRAJECTORY_INCOMPLETE")).toBeDefined();
    } finally {
      await cleanup(dir);
    }
  });
});

describe("gate orchestrator", () => {
  const completeReport = parseTaskReport("STATUS: complete\nCHANGES: did work\nVERIFIED: exit gate: true; tests pass\nGAPS: none");
  const bailReport = parseTaskReport("STATUS: bail\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: human rejected\nRETRYABLE: false");
  test("complete path runs gate; bail/abandon skips gate", async () => {
    const dir = await mkTempRepo();
    try {
      const bailRes = await runExitGate({ repoRoot: dir, issueId: "tgo-bail1", specText: "SHALL do x", report: bailReport });
      expect(bailRes.skipped).toBe(true);
      expect(bailRes.reasonCode).toBe("GATE_SKIPPED_BAIL");
      expect(bailRes.blocked).toBe(false);
      const completeRes = await runExitGate({ repoRoot: dir, issueId: "tgo-comp1", specText: "SHALL do x", report: completeReport });
      expect(completeRes.skipped).toBe(false);
      expect(completeRes.reasonCode).toBe("GATE_PASSED");
    } finally {
      await cleanup(dir);
    }
  });
  test("gate failure blocks close with typed reason GATE_BLOCKED_CRITICAL", async () => {
    const dir = await mkTempRepo();
    try {
      const runId = "tgo-gateblock";
      const entries = [syntheticEntry({ tool: "bash", issueId: runId, cmd: "rm -rf / --no-preserve-root", note: "x" }), terminalStatus(runId, "complete")];
      await fs.writeFile(path.join(dir, ".tgo", "runs", `${runId}.jsonl`), entries.map((e) => JSON.stringify(e)).join("\n"), "utf-8");
      const res = await runExitGate({ repoRoot: dir, issueId: runId, specText: "SHALL do safe work", report: completeReport });
      expect(res.blocked).toBe(true);
      expect(res.passed).toBe(false);
      expect(res.reasonCode).toBe("GATE_BLOCKED_CRITICAL");
      expect(res.reason).toContain("CRITICAL");
      expect(res.findings.some((f) => f.severity === "CRITICAL")).toBe(true);
      expect(res.compensation).toBeDefined();
      expect(res.compensation?.discoveredFrom).toBe(runId);
    } finally {
      await cleanup(dir);
    }
  });
  test("WARNING/SUGGESTION does not block gate", async () => {
    const dir = await mkTempRepo();
    try {
      const specText = "The system SHALL handle appropriate cases etc.";
      const res = await runExitGate({ repoRoot: dir, issueId: "tgo-warn1", specText, report: completeReport });
      expect(res.blocked).toBe(false);
      expect(res.passed).toBe(true);
      expect(res.triage.highestSeverity).toBe("WARNING");
    } finally {
      await cleanup(dir);
    }
  });
  test("compensation convention: on blocked, OUTPUT recommends discovered-from linked issue (no engine)", async () => {
    const dir = await mkTempRepo();
    try {
      const runId = "tgo-comp-issue";
      const entries = [syntheticEntry({ tool: "bash", issueId: runId, cmd: "mkfs /dev/sda1", note: "x" }), terminalStatus(runId, "complete")];
      await fs.writeFile(path.join(dir, ".tgo", "runs", `${runId}.jsonl`), entries.map((e) => JSON.stringify(e)).join("\n"), "utf-8");
      const res = await runExitGate({ repoRoot: dir, issueId: runId, specText: "SHALL be safe", report: completeReport });
      expect(res.blocked).toBe(true);
      expect(res.compensation?.discoveredFrom).toBe(runId);
      expect(res.compensation?.body).toContain(`discovered-from:${runId}`);
    } finally {
      await cleanup(dir);
    }
  });
  test("disabled profile skips gate", async () => {
    const dir = await mkTempRepo();
    try {
      await fs.writeFile(path.join(dir, ".tgo", "gate.json"), JSON.stringify({ enabled: false }), "utf-8");
      const profile = await loadGateProfile(dir);
      const res = await runExitGate({ repoRoot: dir, issueId: "tgo-dis", specText: "SHALL x", report: completeReport, profile });
      expect(res.skipped).toBe(true);
      expect(res.reasonCode).toBe("GATE_SKIPPED_DISABLED");
      expect(res.blocked).toBe(false);
    } finally {
      await cleanup(dir);
    }
  });
  test("triage toggle skips axis, never downgrades CRITICAL", () => {
    // When triage false, findings with source triage are filtered, but trajectory CRITICAL remains and still blocks
    const profileWithTriageOff = { ...DEFAULT_GATE_PROFILE, toggles: { deltaSpec: true, triage: false, trajectory: true }, blacklist: ["BAD"] };
    const trajectoryFindings = [{ axis: "correctness" as const, severity: "CRITICAL" as const, message: "blacklist", source: "trajectory", code: "BLACKLIST_HARD_FAIL" }];
    const res = runExitGateSync({ specText: "SHALL x", report: completeReport, profile: profileWithTriageOff, trajectoryFindings });
    // trajectory CRITICAL should still block because triage toggle only skips triage-source findings
    expect(res.blocked).toBe(true);
    expect(res.triage.highestSeverity).toBe("CRITICAL");
    // Now test that triage-source findings are indeed skipped
    const triageFindings = [{ axis: "correctness" as const, severity: "CRITICAL" as const, message: "triage critical", source: "triage", code: "TRIAGE_CRIT" }];
    const res2 = runExitGateSync({ specText: "SHALL x", report: completeReport, profile: profileWithTriageOff, trajectoryFindings: triageFindings });
    expect(res2.blocked).toBe(false); // triage CRITICAL skipped, no block
    // Ensure downgrade never happens: triage off must not turn CRITICAL into WARNING
    expect(res2.triage.highestSeverity).not.toBe("WARNING");
  });
  test("runExitGateSync in-memory path mirrors async behavior for blacklist", () => {
    const profile = { ...DEFAULT_GATE_PROFILE, blacklist: ["EVIL"] };
    const findings = [{ axis: "correctness" as const, severity: "CRITICAL" as const, message: "evil", source: "trajectory", code: "BLACKLIST_HARD_FAIL" }];
    const res = runExitGateSync({ specText: "SHALL x", report: completeReport, profile, trajectoryFindings: findings });
    expect(res.blocked).toBe(true);
    expect(res.reasonCode).toBe("GATE_BLOCKED_CRITICAL");
  });
});

describe("lifecycle gate integration — enforcing consumer", () => {
  const lifecycle = {
    issueId: "tgo-int1",
    issueStatusObserved: "in_progress",
    issueAssigneeObserved: "ryangking",
    claimExitCode: 0,
    delegationId: "d-1",
    beadsOperator: "Bernstein",
    reviewComplete: true,
  };
  const completeReport = parseTaskReport("STATUS: complete\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: none");
  const bailReport = parseTaskReport("STATUS: bail\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: human rejected");
  test("shouldRunGate: complete → true, bail → false, failed/tripwire → false", () => {
    expect(shouldRunGate(completeReport)).toBe(true);
    expect(shouldRunGate(bailReport)).toBe(false);
    const failed = parseTaskReport("STATUS: failed\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: transient error\nRETRYABLE: true");
    expect(shouldRunGate(failed)).toBe(false);
    const tripwire = parseTaskReport("STATUS: tripwire\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: scope violation");
    expect(shouldRunGate(tripwire)).toBe(false);
  });
  test("F1: gateBlockedWithError produces typed blocked gate, never silent proceed", () => {
    const blocked = gateBlockedWithError("tgo-err1", "disk full");
    expect(blocked.blocked).toBe(true);
    expect(blocked.passed).toBe(false);
    expect(blocked.reasonCode).toBe("GATE_BLOCKED_CRITICAL");
    expect(blocked.reason).toContain("disk full");
    expect(blocked.findings?.[0]?.severity).toBe("CRITICAL");
    expect(blocked.compensation?.discoveredFrom).toBe("tgo-err1");
  });
  test("F1: evaluateGatedClosure is enforcing consumer — blocked gate forces canClose:false", () => {
    const closure = evaluateClosure("standard", lifecycle, completeReport);
    expect(closure.canClose).toBe(true);
    const blockedGate = gateBlockedWithError("tgo-int1", "simulated error");
    const gated = evaluateGatedClosure("standard", lifecycle, completeReport, blockedGate);
    expect(gated.canClose).toBe(false);
    expect(gated.closureBlocked).toBe(true);
    expect(gated.gateBlocked).toBe(true);
    expect(gated.gateReasonCode).toBe("GATE_BLOCKED_CRITICAL");
  });
  test("gate-blocks-close integration: failing gate prevents bead close even though closure would allow", async () => {
    const dir = await mkTempRepo();
    try {
      const runId = "tgo-gate-int2";
      const closure = evaluateClosure("standard", { ...lifecycle, issueId: runId }, completeReport);
      expect(closure.canClose).toBe(true);
      const entries = [syntheticEntry({ tool: "bash", issueId: runId, cmd: "rm -rf /", note: "x" }), terminalStatus(runId, "complete")];
      await fs.writeFile(path.join(dir, ".tgo", "runs", `${runId}.jsonl`), entries.map((e) => JSON.stringify(e)).join("\n"), "utf-8");
      const gateRes = await runExitGate({ repoRoot: dir, issueId: runId, specText: "SHALL be safe", report: completeReport });
      expect(gateRes.blocked).toBe(true);
      const merged = applyGateToClosure(closure, {
        passed: gateRes.passed,
        blocked: gateRes.blocked,
        reasonCode: gateRes.reasonCode as unknown as import("../src/lifecycle").GateReasonCode,
        reason: gateRes.reason,
        findings: gateRes.findings as unknown[],
        compensation: gateRes.compensation as unknown as { title: string; body: string; discoveredFrom: string; severity: string },
        skipped: gateRes.skipped,
      });
      expect(merged.canClose).toBe(false);
      expect(merged.closureBlocked).toBe(true);
      expect(merged.gateBlocked).toBe(true);
      expect(merged.gateReasonCode).toBe("GATE_BLOCKED_CRITICAL");
      expect(merged.missing.join(" ")).toContain("gate:");
      expect(merged.diagnostics.join(" ")).toContain("Exit gate blocked");
      expect(merged.gateCompensation?.discoveredFrom).toBe(runId);
    } finally {
      await cleanup(dir);
    }
  });
  test("gate pass does not block close via enforcing consumer", async () => {
    const dir = await mkTempRepo();
    try {
      const closure = evaluateClosure("standard", lifecycle, completeReport);
      expect(closure.canClose).toBe(true);
      const gateRes = await runExitGate({ repoRoot: dir, issueId: "tgo-pass1", specText: "SHALL do x", report: completeReport });
      expect(gateRes.blocked).toBe(false);
      const merged = evaluateGatedClosure("standard", lifecycle, completeReport, {
        passed: gateRes.passed,
        blocked: gateRes.blocked,
        reasonCode: gateRes.reasonCode as unknown as import("../src/lifecycle").GateReasonCode,
        reason: gateRes.reason,
        findings: gateRes.findings as unknown[],
        compensation: undefined,
        skipped: gateRes.skipped,
      });
      expect(merged.canClose).toBe(true);
      expect(merged.gateBlocked).toBe(false);
    } finally {
      await cleanup(dir);
    }
  });
  test("bail skip preserves closure (not blocked by gate)", () => {
    const closure = evaluateClosure("standard", lifecycle, bailReport);
    expect(closure.canClose).toBe(false);
    const gateSkipped = { passed: true, blocked: false, reasonCode: "GATE_SKIPPED_BAIL" as const, reason: "bail skip", findings: [], skipped: true, skipReason: "bail" };
    const merged = applyGateToClosure(closure, gateSkipped as unknown as import("../src/lifecycle").GateResultForLifecycle);
    expect(merged.gateBlocked).toBe(false);
    expect(merged.closureBlocked).toBe(true);
  });
  test("tiny route bypasses gate (plugin layer) — but lifecycle helper still works", () => {
    const tinyReport = parseTaskReport("STATUS: complete\nCHANGES: tiny\nVERIFIED: exit gate: true\nGAPS: none");
    const tinyClosure = evaluateClosure("tiny", {}, tinyReport);
    expect(tinyClosure.canClose).toBe(true);
    const merged = applyGateToClosure(tinyClosure, undefined);
    expect(merged.canClose).toBe(true);
  });
});

describe("F2 contract optionality: durationMs/note optional, required strict", () => {
  test("status line without durationMs/note scores as terminal (no false incomplete)", async () => {
    const dir = await mkTempRepo();
    try {
      const runId = "tgo-opt1";
      const lines = [
        JSON.stringify({ ts: 1, type: "step", seat: "dylan", tool: "read", argsHash: "abcd", ok: true, issueId: runId, note: "read" }), // missing durationMs → default 0
        JSON.stringify({ ts: 2, type: "status", seat: "dylan", tool: "heartbeat", argsHash: "efgh", ok: true, issueId: runId }), // missing durationMs and note → defaults
      ].join("\n");
      await fs.writeFile(path.join(dir, ".tgo", "runs", `${runId}.jsonl`), lines, "utf-8");
      const res = await scoreTrajectory(dir, runId, DEFAULT_GATE_PROFILE);
      expect(res.entries.length).toBe(2);
      expect(res.entries[1]?.type).toBe("status");
      expect(res.entries[1]?.durationMs).toBe(0);
      expect(res.entries[1]?.note).toBe("");
      // Has terminal status, so no incomplete warning
      expect(res.findings.find((f) => f.code === "TRAJECTORY_INCOMPLETE")).toBeUndefined();
    } finally {
      await cleanup(dir);
    }
  });
  test("wrong-typed optional durationMs/note/cmd → default, not line rejection", async () => {
    const dir = await mkTempRepo();
    try {
      const runId = "tgo-opt2";
      const lines = [
        JSON.stringify({ ts: 1, type: "step", seat: "dylan", tool: "bash", argsHash: "abcd", ok: true, durationMs: "bad", note: 123 as unknown as string, cmd: 456 as unknown as string, issueId: runId }),
        JSON.stringify({ ts: 2, type: "status", seat: "dylan", tool: "heartbeat", argsHash: "efgh", ok: true, issueId: runId }),
      ].join("\n");
      await fs.writeFile(path.join(dir, ".tgo", "runs", `${runId}.jsonl`), lines, "utf-8");
      const res = await scoreTrajectory(dir, runId, DEFAULT_GATE_PROFILE);
      expect(res.entries.length).toBe(2);
      expect(res.entries[0]?.durationMs).toBe(0);
      expect(res.entries[0]?.note).toBe("");
      expect((res.entries[0] as unknown as { cmd?: string }).cmd).toBeUndefined();
    } finally {
      await cleanup(dir);
    }
  });
  test("wrong-typed required ts/ok → line ignored", async () => {
    const dir = await mkTempRepo();
    try {
      const runId = "tgo-opt3";
      const lines = [
        JSON.stringify({ ts: "bad", type: "step", seat: "dylan", tool: "bash", argsHash: "abcd", ok: true, issueId: runId }),
        JSON.stringify({ ts: 2, type: "step", seat: "dylan", tool: "bash", argsHash: "abcd", ok: "false" as unknown as boolean, issueId: runId }),
        JSON.stringify({ ts: 3, type: "step", seat: "dylan", tool: "read", argsHash: "abcd", ok: true, issueId: runId, note: "valid" }),
        JSON.stringify({ ts: 4, type: "status", seat: "dylan", tool: "heartbeat", argsHash: "abcd", ok: true, issueId: runId, note: "complete" }),
      ].join("\n");
      await fs.writeFile(path.join(dir, ".tgo", "runs", `${runId}.jsonl`), lines, "utf-8");
      const res = await scoreTrajectory(dir, runId, DEFAULT_GATE_PROFILE);
      expect(res.entries.length).toBe(2); // only valid step + status
    } finally {
      await cleanup(dir);
    }
  });
});

describe("F1 close-gate enforcement at real close consumer", () => {
  test("close gate blocked → refused with typed GATE_BLOCKED_CRITICAL + compensation", async () => {
    const dir = await mkTempRepo();
    try {
      const runId = "tgo-close-block1";
      const entries = [syntheticEntry({ tool: "bash", issueId: runId, cmd: "rm -rf /", note: "destructive" }), terminalStatus(runId, "complete")];
      await fs.writeFile(path.join(dir, ".tgo", "runs", `${runId}.jsonl`), entries.map((e) => JSON.stringify(e)).join("\n"), "utf-8");
      const specText = "SHALL not destroy filesystem";
      const { allowed, gate } = await checkCloseGate(dir, runId, specText);
      expect(allowed).toBe(false);
      expect(gate.blocked).toBe(true);
      expect(gate.reasonCode).toBe("GATE_BLOCKED_CRITICAL");
      const msg = blockedCloseMessage(gate);
      expect(msg).toContain("GATE_BLOCKED_CRITICAL");
      expect(msg).toContain(`discovered-from:${runId}`);
    } finally {
      await cleanup(dir);
    }
  });
  test("close gate allowed when trajectory clean and no incomplete", async () => {
    const dir = await mkTempRepo();
    try {
      const runId = "tgo-close-allow1";
      const entries = [syntheticEntry({ tool: "read", issueId: runId, note: "safe" }), terminalStatus(runId, "complete")];
      await fs.writeFile(path.join(dir, ".tgo", "runs", `${runId}.jsonl`), entries.map((e) => JSON.stringify(e)).join("\n"), "utf-8");
      const { allowed, gate } = await checkCloseGate(dir, runId, "SHALL do safe work");
      expect(allowed).toBe(true);
      expect(gate.blocked).toBe(false);
    } finally {
      await cleanup(dir);
    }
  });
  test("close gate uses synthetic complete report — bail spec does not skip (sidebar close is complete intent)", async () => {
    const dir = await mkTempRepo();
    try {
      const runId = "tgo-close-bail";
      // Even though bead description might mention bail, sidebar close is treated as complete intent, so gate runs
      const entries = [syntheticEntry({ tool: "bash", issueId: runId, cmd: "rm -rf /", note: "x" }), terminalStatus(runId, "complete")];
      await fs.writeFile(path.join(dir, ".tgo", "runs", `${runId}.jsonl`), entries.map((e) => JSON.stringify(e)).join("\n"), "utf-8");
      const { allowed } = await checkCloseGate(dir, runId, "bail but closing");
      expect(allowed).toBe(false); // still blocked on blacklist
    } finally {
      await cleanup(dir);
    }
  });
});

describe("fixture specs per triage bucket (CRITICAL blocks, WARNING/SUGGESTION don't)", () => {
  const fixtures: Array<{ name: string; findings: ReturnType<typeof finding>[]; shouldBlock: boolean }> = [
    {
      name: "fixture CRITICAL",
      findings: [finding("completeness", "CRITICAL", "REQUIRED artifact missing", "fixture")],
      shouldBlock: true,
    },
    {
      name: "fixture WARNING",
      findings: [finding("correctness", "WARNING", "ambiguous requirement", "fixture")],
      shouldBlock: false,
    },
    {
      name: "fixture SUGGESTION",
      findings: [finding("coherence", "SUGGESTION", "short requirement", "fixture")],
      shouldBlock: false,
    },
  ];
  test.each(fixtures)("$name → blocked=$shouldBlock", ({ findings, shouldBlock }) => {
    const t = triageFindings(findings);
    expect(t.blocked).toBe(shouldBlock);
    if (shouldBlock) expect(t.reason).toContain("CRITICAL");
  });
  test("real delta-spec fixture per bucket", () => {
    const crit = triageFindings([{ axis: "correctness", severity: "CRITICAL", message: "blacklist rm -rf", source: "trajectory" }]);
    expect(crit.blocked).toBe(true);
    const dsWarn = parseDeltaSpec("SHALL handle appropriate cases etc.");
    const warnT = triageFindings(dsWarn.findings);
    expect(warnT.blocked).toBe(false);
    expect(warnT.highestSeverity).toBe("WARNING");
    const dsSug = parseDeltaSpec("SHALL do x.");
    const sugT = triageFindings(dsSug.findings);
    expect(sugT.blocked).toBe(false);
    expect(sugT.findings.some((f) => f.severity === "SUGGESTION")).toBe(true);
  });
});
