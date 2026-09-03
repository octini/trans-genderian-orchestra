import { describe, expect, test } from "bun:test";
import { buildFindingsNudge, StyleReinforcementController, detectExplicitStyle, resolveEffectiveVoiceCardIdFromOverride } from "../src/style-reinforcement";
import type { DriftFinding } from "../src/drift";

const drift = "The result is ready. The result is ready.";
const client = { session: { get: async () => ({ data: { parentID: null } }) } };
const context = { preservation: "known" as const };

describe("generation-time style reinforcement", () => {
  test("nudges once and never rewrites the candidate — payload contains header/footer/spans/evidence/family", async () => {
    const controller = new StyleReinforcementController({ cardId: "tgo-default", productionEnabled: true });
    expect(await controller.noteCompletion(client, { sessionID: "s", messageID: "m1", responseLineageID: "turn-1", candidate: drift, taskContext: context })).toBe(true);
    const system = ["existing"];
    expect(await controller.appendPending(client, "s", system)).toBe(true);
    const nudge = system[1];
    expect(nudge).toContain("Style pass — fix only the flagged spans; preserve all protected content.");
    expect(nudge).toContain("Override a flag with a one-word reason if it serves rhythm/emphasis/picture/idiom/joke — otherwise apply the fix.");
    expect(nudge).toContain("spans: [");
    expect(nudge).toContain("evidence '");
    expect(nudge).toContain("keep code/commands/negations/numbers/explanations verbatim.");
    // family present in brackets
    expect(nudge).toMatch(/- \[[^\]]+\] \(severity (medium|high), basis (cluster|repeated-signal|strong-evidence)\): evidence '/);
    expect(await controller.appendPending(client, "s", system)).toBe(false);
    expect(await controller.noteCompletion(client, { sessionID: "s", messageID: "m1", responseLineageID: "turn-1", candidate: drift, taskContext: context })).toBe(false);
  });

  test("buildFindingsNudge orders by span start, then axis, then severity and renders deterministic payload", () => {
    const findings: DriftFinding[] = [
      { axis: "anti-style-cluster", severity: "high", evidence: "second evidence", spans: [{ start: 20, end: 30 }], basis: "cluster", uncertainty: { codes: [], message: "", spans: [] }, suppressed: false },
      { axis: "anti-style-cluster", severity: "medium", evidence: "first evidence", spans: [{ start: 5, end: 15 }], basis: "cluster", uncertainty: { codes: [], message: "", spans: [] }, suppressed: false },
      { axis: "readability", severity: "medium", evidence: "third evidence", spans: [{ start: 5, end: 10 }], basis: "strong-evidence", uncertainty: { codes: [], message: "", spans: [] }, suppressed: false },
    ] as unknown as DriftFinding[];
    // Add family via cast
    (findings[0] as unknown as { family: string }).family = "hedge-stacks";
    (findings[1] as unknown as { family: string }).family = "hidden-actor";
    (findings[2] as unknown as { family: string }).family = "em-dash-budgets";
    const nudge = buildFindingsNudge(findings);
    const lines = nudge.split("\n");
    expect(lines[0]).toBe("Style pass — fix only the flagged spans; preserve all protected content.");
    expect(lines[lines.length - 1]).toBe("Override a flag with a one-word reason if it serves rhythm/emphasis/picture/idiom/joke — otherwise apply the fix.");
    // Ordered: start 5 axis anti-style-cluster (severity medium) before start 5 axis readability, then start 20
    expect(lines[1]).toContain("[hidden-actor]");
    expect(lines[1]).toContain("severity medium");
    expect(lines[3]).toContain("[em-dash-budgets]");
    expect(lines[5]).toContain("[hedge-stacks]");
    expect(lines[5]).toContain("severity high");
    // spans rendering
    expect(lines[2]).toContain("spans: [5:15]");
    expect(lines[4]).toContain("spans: [5:10]");
    expect(lines[6]).toContain("spans: [20:30]");
    // each finding has two lines (evidence + spans)
    expect(lines.filter(l => l.startsWith("- [")).length).toBe(3);
  });

  test("buildFindingsNudge renders multiple spans per finding and never invents content", () => {
    const finding: DriftFinding = {
      axis: "anti-style-cluster",
      severity: "medium",
      evidence: "hedge-stacks tell cluster",
      spans: [{ start: 10, end: 20 }, { start: 30, end: 40 }],
      basis: "cluster",
      uncertainty: { codes: [], message: "", spans: [] },
      suppressed: false,
    } as unknown as DriftFinding;
    (finding as unknown as { family: string }).family = "hedge-stacks";
    const nudge = buildFindingsNudge([finding]);
    expect(nudge).toContain("spans: [10:20, 30:40]");
    expect(nudge).toContain("evidence 'hedge-stacks tell cluster'");
    expect(nudge).toContain("- [hedge-stacks] (severity medium, basis cluster):");
    expect(nudge).toContain("rewrite only these spans; keep code/commands/negations/numbers/explanations verbatim.");
  });

  test("deduplicates retries and starts a new user-turn attempt", async () => {
    const controller = new StyleReinforcementController({ productionEnabled: true });
    expect(await controller.noteCompletion(client, { sessionID: "s", messageID: "m1", responseLineageID: "turn-1", candidate: drift, taskContext: context })).toBe(true);
    expect(await controller.noteCompletion(client, { sessionID: "s", messageID: "m1-retry", responseLineageID: "turn-1", candidate: drift, taskContext: context })).toBe(false);
    await controller.appendPending(client, "s", []);
    controller.noteUserMessage("s", "new answer", "turn-2", context);
    expect(await controller.noteCompletion(client, { sessionID: "s", messageID: "m2", responseLineageID: "turn-2", candidate: drift, taskContext: context })).toBe(true);
  });

  test("honors config and in-session off-switches — suppresses nudge entirely", async () => {
    const disabled = new StyleReinforcementController({ enabled: false });
    expect(await disabled.noteCompletion(client, { sessionID: "s", messageID: "m", responseLineageID: "t", candidate: drift, taskContext: context })).toBe(false);
    const stopped = new StyleReinforcementController({ productionEnabled: true });
    stopped.noteUserMessage("s", "stop X");
    expect(await stopped.noteCompletion(client, { sessionID: "s", messageID: "m", responseLineageID: "t", candidate: drift, taskContext: context })).toBe(false);
    const normal = new StyleReinforcementController({ productionEnabled: true });
    normal.noteUserMessage("s", "normal mode");
    expect(await normal.noteCompletion(client, { sessionID: "s", messageID: "m", responseLineageID: "t", candidate: drift, taskContext: context })).toBe(false);
    // appendPending also suppressed when disabled
    const c = new StyleReinforcementController({ productionEnabled: true });
    c.noteUserMessage("s2", "stop prose", "t1");
    // need a pending to test append suppression — set disabled before append
    // create controller, set pending via noteCompletion then disable
    const c2 = new StyleReinforcementController({ productionEnabled: true });
    await c2.noteCompletion(client, { sessionID: "s2", messageID: "m", responseLineageID: "t1", candidate: drift, taskContext: context });
    c2.noteUserMessage("s2", "stop X", "t2");
    expect(await c2.appendPending(client, "s2", [])).toBe(false);
  });

  test("does not reinforce preservation uncertainty or low findings", async () => {
    const controller = new StyleReinforcementController({ productionEnabled: true });
    expect(await controller.noteCompletion(client, { sessionID: "s", messageID: "m", responseLineageID: "t", candidate: `${drift} Production behavior remains uncertain.`, taskContext: context })).toBe(false);
    expect(await controller.noteCompletion(client, { sessionID: "s2", messageID: "m2", responseLineageID: "t2", candidate: "Utilize this command.", taskContext: context })).toBe(false);
  });

  test("reinforces primary sessions only, never delegated sessions", async () => {
    const controller = new StyleReinforcementController({ productionEnabled: true });
    const primary = { session: { get: async () => ({ data: { parentID: null } }) } };
    const delegated = { session: { get: async () => ({ data: { parentID: "parent" } }) } };
    expect(await controller.noteCompletion(primary, { sessionID: "primary", messageID: "m", responseLineageID: "turn", candidate: drift, taskContext: context })).toBe(true);
    expect(await controller.noteCompletion(delegated, { sessionID: "delegated", messageID: "m", responseLineageID: "turn", candidate: drift, taskContext: context })).toBe(false);
  });

  test("does not reinforce when parentID is missing", async () => {
    const controller = new StyleReinforcementController({ productionEnabled: true });
    const missing = { session: { get: async () => ({ data: {} }) } };
    expect(await controller.noteCompletion(missing, { sessionID: "missing", messageID: "m", responseLineageID: "turn", candidate: drift, taskContext: context })).toBe(false);
    expect(await controller.appendPending(missing, "missing", [])).toBe(false);
  });

  test("off-switch prevails over pending — appendPending suppressed", async () => {
    const c = new StyleReinforcementController({ productionEnabled: true });
    c.noteUserMessage("s", "use prose", "t0");
    await c.noteCompletion(client, { sessionID: "s", messageID: "m", responseLineageID: "t1", candidate: drift, taskContext: context });
    c.noteUserMessage("s", "stop X", "t1");
    expect(await c.appendPending(client, "s", [])).toBe(false);
  });
});

describe("explicit style override detection and precedence (T4)", () => {
  test("detectExplicitStyle recognizes use prose / use conversational / use default and variants", () => {
    expect(detectExplicitStyle("please use prose for this" )).toBe("tgo-prose");
    expect(detectExplicitStyle("please use conversational for this" )).toBe("tgo-conversational");
    expect(detectExplicitStyle("write this in prose voice" )).toBe("tgo-prose");
    expect(detectExplicitStyle("write this in conversational voice" )).toBe("tgo-conversational");
    expect(detectExplicitStyle("USE PROSE" )).toBe("tgo-prose");
    expect(detectExplicitStyle("Use Conversational" )).toBe("tgo-conversational");
    expect(detectExplicitStyle("switch to prose" )).toBe("tgo-prose");
    expect(detectExplicitStyle("in prose voice please" )).toBe("tgo-prose");
    expect(detectExplicitStyle("in conversational voice please" )).toBe("tgo-conversational");
    expect(detectExplicitStyle("prose voice" )).toBe("tgo-prose");
    expect(detectExplicitStyle("use default" )).toBe("clear");
    expect(detectExplicitStyle("normal mode" )).toBe("clear");
    expect(detectExplicitStyle("write this in default voice" )).toBe("clear");
    expect(detectExplicitStyle("just prose without cue" )).toBeNull();
    expect(detectExplicitStyle("hello world" )).toBeNull();
  });

  test("noteUserMessage sets session-scoped styleOverride and clears it via use default / normal mode", () => {
    const c = new StyleReinforcementController({ productionEnabled: true });
    c.noteUserMessage("s1", "please use prose", "t1");
    expect(c.getStyleOverride("s1")).toBe("tgo-prose");
    c.noteUserMessage("s1", "write this in conversational voice", "t2");
    expect(c.getStyleOverride("s1")).toBe("tgo-conversational");
    c.noteUserMessage("s1", "use default", "t3");
    expect(c.getStyleOverride("s1")).toBeUndefined();
    c.noteUserMessage("s1", "use prose", "t4");
    expect(c.getStyleOverride("s1")).toBe("tgo-prose");
    c.noteUserMessage("s1", "normal mode", "t5");
    expect(c.getStyleOverride("s1")).toBeUndefined();
    const c2 = new StyleReinforcementController({ productionEnabled: true });
    c2.noteUserMessage("s2", "stop X", "t1");
    expect(c2.getStyleOverride("s2")).toBeUndefined();
  });

  test("keeps existing stop X / normal mode off-switch; normal mode clears explicit override and disables", async () => {
    const c = new StyleReinforcementController({ productionEnabled: true });
    c.noteUserMessage("s", "use prose", "turn-1");
    expect(c.getStyleOverride("s")).toBe("tgo-prose");
    c.noteUserMessage("s", "normal mode", "turn-2");
    expect(c.getStyleOverride("s")).toBeUndefined();
    expect(await c.noteCompletion(client, { sessionID: "s", messageID: "m", responseLineageID: "turn-2", candidate: drift, taskContext: context })).toBe(false);
    const c3 = new StyleReinforcementController({ productionEnabled: true });
    c3.noteUserMessage("s3", "stop prose", "turn-1");
    expect(await c3.noteCompletion(client, { sessionID: "s3", messageID: "m", responseLineageID: "turn-1", candidate: drift, taskContext: context })).toBe(false);
  });

  test("precedence: explicit request > packet assignment > default; absent everything → default", () => {
    const c = new StyleReinforcementController({ productionEnabled: true });
    expect(c.getEffectiveStyle("s", undefined)).toBe("tgo-default");
    expect(c.getEffectiveStyle("s", "prose")).toBe("tgo-prose");
    expect(c.getEffectiveStyle("s", "conversational")).toBe("tgo-conversational");
    expect(c.getEffectiveStyle("s", "default")).toBe("tgo-default");
    expect(resolveEffectiveVoiceCardIdFromOverride({ packetStyle: "prose" })).toBe("tgo-prose");
    expect(resolveEffectiveVoiceCardIdFromOverride({})).toBe("tgo-default");
    c.noteUserMessage("s", "use conversational", "t1");
    expect(c.getEffectiveStyle("s", "prose")).toBe("tgo-conversational");
    expect(c.getEffectiveStyle("s", "default")).toBe("tgo-conversational");
    expect(c.getEffectiveStyle("s", undefined)).toBe("tgo-conversational");
    c.noteUserMessage("s", "use default", "t2");
    expect(c.getEffectiveStyle("s", "prose")).toBe("tgo-prose");
    expect(c.getEffectiveStyle("s", undefined)).toBe("tgo-default");
    c.noteUserMessage("s", "write this in prose voice", "t3");
    expect(c.getEffectiveStyle("s", "conversational")).toBe("tgo-prose");
  });

  test("explicit override is session-scoped and survives unrelated user messages until cleared", () => {
    const c = new StyleReinforcementController({ productionEnabled: true });
    c.noteUserMessage("sA", "use prose", "turn-1");
    expect(c.getStyleOverride("sA")).toBe("tgo-prose");
    c.noteUserMessage("sA", "hello, do the task", "turn-2");
    expect(c.getStyleOverride("sA")).toBe("tgo-prose");
    expect(c.getEffectiveStyle("sA", "conversational")).toBe("tgo-prose");
    expect(c.getStyleOverride("sB")).toBeUndefined();
    expect(c.getEffectiveStyle("sB", "prose")).toBe("tgo-prose");
    expect(c.getEffectiveStyle("sB", undefined)).toBe("tgo-default");
  });
});
