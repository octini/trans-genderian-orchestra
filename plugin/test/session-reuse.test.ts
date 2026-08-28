import { test, expect, describe } from "bun:test";
import { mkdtempSync, rmSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {
  loadSessionMap,
  saveSessionMap,
  upsertSession,
  probeSessionReuseCapability,
  estimateSessionTokens,
  shouldReuse,
  issueIdBySession,
  persistAbortHandback,
  type SessionMap,
} from "../src/session-reuse";
import { validateDelegationPacket } from "../src/delegation";
import { estimateTokens, loadTgoConfig } from "../src/config";
import type { RoutingClassification } from "../src/fit";

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "tgo-session-reuse-"));
}

const standard: RoutingClassification = { route: "standard", tiny: false, reasons: [] };
const tiny: RoutingClassification = { route: "tiny", tiny: true, reasons: [] };

const full = {
  Objective: "Replace the value",
  Files: ["src/value.ts"],
  Interfaces: "Keep the exported function signature",
  Constraints: "Do not change adjacent behavior",
  Verification: "Run the focused test",
  exitGate: true,
  issueId: "tgo-test",
  issueStatusObserved: "in_progress",
  issueAssigneeObserved: "ryangking",
  claimExitCode: 0,
  delegationId: "delegation-test",
  beadsOperator: "Bernstein",
};

describe("session-reuse store", () => {
  test("round-trip save→load equality", async () => {
    const dir = tmpDir();
    try {
      const map: SessionMap = {
        "tgo-123": { sessionId: "ses_abc123", delegationId: "d1", updatedAt: new Date().toISOString() },
        "tgo-456": { sessionId: "ses_xyz789", updatedAt: new Date().toISOString() },
      };
      await saveSessionMap(dir, map);
      const loaded = await loadSessionMap(dir);
      expect(loaded).toEqual(map);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("missing file returns {}", async () => {
    const dir = tmpDir();
    try {
      const loaded = await loadSessionMap(dir);
      expect(loaded).toEqual({});
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("corrupt file returns {}", async () => {
    const dir = tmpDir();
    try {
      await fs.mkdir(path.join(dir, ".tgo"), { recursive: true });
      await fs.writeFile(path.join(dir, ".tgo", "sessions.json"), "not-json{{{", "utf-8");
      const loaded = await loadSessionMap(dir);
      expect(loaded).toEqual({});
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("atomic write leaves no .tmp behind", async () => {
    const dir = tmpDir();
    try {
      const map: SessionMap = {
        "tgo-1": { sessionId: "ses_1", updatedAt: new Date().toISOString() },
      };
      await saveSessionMap(dir, map);
      const tmpPath = path.join(dir, ".tgo", "sessions.json.tmp");
      const targetPath = path.join(dir, ".tgo", "sessions.json");
      expect(existsSync(tmpPath)).toBe(false);
      expect(existsSync(targetPath)).toBe(true);
      const raw = await fs.readFile(targetPath, "utf-8");
      expect(JSON.parse(raw)).toEqual(map);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("upsert latest-wins and is pure (input unmutated)", () => {
    const original: SessionMap = {
      "tgo-1": { sessionId: "ses_old", delegationId: "d-old", updatedAt: "2026-01-01T00:00:00.000Z" },
    };
    const originalCopy = JSON.parse(JSON.stringify(original));
    const updated: SessionMap = upsertSession(original, "tgo-1", {
      sessionId: "ses_new",
      delegationId: "d-new",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    // input unmutated
    expect(original).toEqual(originalCopy);
    expect(original["tgo-1"]?.sessionId).toBe("ses_old");
    // latest wins
    expect(updated["tgo-1"]?.sessionId).toBe("ses_new");
    expect(updated["tgo-1"]?.delegationId).toBe("d-new");
    // returns new map reference
    expect(updated).not.toBe(original);
  });

  test("upsert adds new issue without affecting others", () => {
    const map: SessionMap = {
      "tgo-1": { sessionId: "ses_1", updatedAt: "2026-01-01T00:00:00.000Z" },
    };
    const next = upsertSession(map, "tgo-2", { sessionId: "ses_2", updatedAt: "2026-01-02T00:00:00.000Z" });
    expect(next["tgo-1"]).toEqual(map["tgo-1"]);
    expect(next["tgo-2"]?.sessionId).toBe("ses_2");
    expect(Object.keys(next).length).toBe(2);
  });
});

describe("probeSessionReuseCapability", () => {
  test("undefined → true assume v1", () => {
    const r = probeSessionReuseCapability(undefined);
    expect(r.supported).toBe(true);
    expect(r.reason).toBe("version unavailable; assuming v1 task tool");
  });

  test("1.18.23 → true v1 resume", () => {
    const r = probeSessionReuseCapability("1.18.23");
    expect(r.supported).toBe(true);
    expect(r.reason).toBe("v1 task tool supports task_id resume");
  });

  test("2.0.0 → false v2 cannot resume", () => {
    const r = probeSessionReuseCapability("2.0.0");
    expect(r.supported).toBe(false);
    expect(r.reason).toBe("v2 subagent tool cannot resume sessions");
  });

  test("garbage → true assume", () => {
    const r = probeSessionReuseCapability("garbage");
    expect(r.supported).toBe(true);
    expect(r.reason).toBe("version unavailable; assuming v1 task tool");
  });

  test("unparseable empty string → true assume", () => {
    const r = probeSessionReuseCapability("");
    expect(r.supported).toBe(true);
    expect(r.reason).toBe("version unavailable; assuming v1 task tool");
  });

  test("major >=2 with patch → false", () => {
    expect(probeSessionReuseCapability("2.1.0").supported).toBe(false);
    expect(probeSessionReuseCapability("3.0.0").supported).toBe(false);
  });

  test("major <2 → true", () => {
    expect(probeSessionReuseCapability("0.9.0").supported).toBe(true);
    expect(probeSessionReuseCapability("1.0.0").supported).toBe(true);
  });
});

describe("estimateSessionTokens and shouldReuse", () => {
  test("sums estimateTokens over text parts only", () => {
    const messages = [
      { parts: [{ type: "text", text: "hello world" }, { type: "tool", text: "ignored" }] },
      { parts: [{ type: "text", text: "foo bar" }] },
      { parts: [{ type: "text" }] },
      { parts: [{ type: "image", text: "ignored" }] },
    ];
    const expected = estimateTokens("hello world") + estimateTokens("foo bar");
    expect(estimateSessionTokens(messages)).toBe(expected);
  });

  test("empty messages → 0", () => {
    expect(estimateSessionTokens([])).toBe(0);
    expect(estimateSessionTokens([{ parts: [] }])).toBe(0);
  });

  test("guard boundary: estimate === max → false", () => {
    expect(shouldReuse(100000, 100000)).toBe(false);
  });

  test("guard boundary: estimate = max-1 → true", () => {
    expect(shouldReuse(99999, 100000)).toBe(true);
  });

  test("guard: estimate < max → true, estimate > max → false", () => {
    expect(shouldReuse(0, 100000)).toBe(true);
    expect(shouldReuse(100001, 100000)).toBe(false);
  });
});

describe("delegation packet taskId", () => {
  test("absent → valid", () => {
    const result = validateDelegationPacket(standard, full);
    expect(result.valid).toBe(true);
    expect(result.malformed).not.toContain("taskId");
  });

  test("ses_abc123 → valid", () => {
    const result = validateDelegationPacket(standard, { ...full, taskId: "ses_abc123" });
    expect(result.valid).toBe(true);
    expect(result.malformed).not.toContain("taskId");
  });

  test("abc → invalid", () => {
    const result = validateDelegationPacket(standard, { ...full, taskId: "abc" });
    expect(result.valid).toBe(false);
    expect(result.malformed).toContain("taskId");
    expect(result.diagnostics.join(" ")).toContain("taskId");
  });

  test("ses_ → invalid", () => {
    const result = validateDelegationPacket(standard, { ...full, taskId: "ses_" });
    expect(result.valid).toBe(false);
    expect(result.malformed).toContain("taskId");
  });

  test("tiny packet with valid taskId still valid", () => {
    const tinyPacket = {
      minimal: true,
      Objective: "Replace one literal",
      Files: ["src/value.ts"],
      Verification: "Run the focused test",
      exitGate: true,
      taskId: "ses_xyz999",
    };
    const result = validateDelegationPacket(tiny, tinyPacket);
    expect(result.valid).toBe(true);
  });

  test("invalid taskId on tiny still invalid", () => {
    const tinyPacket = {
      minimal: true,
      Objective: "Replace one literal",
      Files: ["src/value.ts"],
      Verification: "Run the focused test",
      exitGate: true,
      taskId: "bad",
    };
    const result = validateDelegationPacket(tiny, tinyPacket);
    expect(result.valid).toBe(false);
    expect(result.malformed).toContain("taskId");
  });
});

describe("config sessionReuse defaults", () => {
  test("defaults to enabled true and 100000 tokens", async () => {
    const cfg = await loadTgoConfig({});
    expect(cfg.sessionReuse?.enabled).toBe(true);
    expect(cfg.sessionReuse?.maxContextTokens).toBe(100000);
  });

  test("can be disabled and tuned", async () => {
    const cfg = await loadTgoConfig({ sessionReuse: { enabled: false, maxContextTokens: 50000 } });
    expect(cfg.sessionReuse?.enabled).toBe(false);
    expect(cfg.sessionReuse?.maxContextTokens).toBe(50000);
  });

  test("rejects non-positive maxContextTokens", async () => {
    await expect(loadTgoConfig({ sessionReuse: { maxContextTokens: 0 } } as unknown as Record<string, unknown>)).rejects.toThrow();
    await expect(loadTgoConfig({ sessionReuse: { maxContextTokens: -1 } } as unknown as Record<string, unknown>)).rejects.toThrow();
  });
});

describe("issueIdBySession", () => {
  test("hit returns issueId", () => {
    const map: SessionMap = {
      "tgo-1": { sessionId: "ses_abc123", updatedAt: new Date().toISOString() },
      "tgo-2": { sessionId: "ses_xyz999", updatedAt: new Date().toISOString() },
    };
    expect(issueIdBySession(map, "ses_abc123")).toBe("tgo-1");
    expect(issueIdBySession(map, "ses_xyz999")).toBe("tgo-2");
  });

  test("miss returns undefined", () => {
    const map: SessionMap = {
      "tgo-1": { sessionId: "ses_abc123", updatedAt: new Date().toISOString() },
    };
    expect(issueIdBySession(map, "ses_missing")).toBeUndefined();
    expect(issueIdBySession({}, "ses_abc123")).toBeUndefined();
  });

  test("first-match-wins on duplicate sessionIds", () => {
    const map: SessionMap = {
      "tgo-first": { sessionId: "ses_dup", updatedAt: new Date().toISOString() },
      "tgo-second": { sessionId: "ses_dup", updatedAt: new Date().toISOString() },
      "tgo-third": { sessionId: "ses_dup", updatedAt: new Date().toISOString() },
    };
    expect(issueIdBySession(map, "ses_dup")).toBe("tgo-first");
  });
});
