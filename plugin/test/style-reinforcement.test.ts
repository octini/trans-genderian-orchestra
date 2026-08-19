import { describe, expect, test } from "bun:test";
import { STYLE_NUDGE, StyleReinforcementController } from "../src/style-reinforcement";

const drift = "The result is ready. The result is ready.";
const client = { session: { get: async () => ({ data: { parentID: null } }) } };
const context = { preservation: "known" as const };

describe("generation-time style reinforcement", () => {
  test("nudges once and never rewrites the candidate", async () => {
    const controller = new StyleReinforcementController({ register: "concise", productionEnabled: true });
    expect(await controller.noteCompletion(client, { sessionID: "s", messageID: "m1", responseLineageID: "turn-1", candidate: drift, taskContext: context })).toBe(true);
    const system = ["existing"];
    expect(await controller.appendPending(client, "s", system)).toBe(true);
    expect(system).toEqual(["existing", STYLE_NUDGE]);
    expect(await controller.appendPending(client, "s", system)).toBe(false);
    expect(await controller.noteCompletion(client, { sessionID: "s", messageID: "m1", responseLineageID: "turn-1", candidate: drift, taskContext: context })).toBe(false);
  });

  test("deduplicates retries and starts a new user-turn attempt", async () => {
    const controller = new StyleReinforcementController({ productionEnabled: true });
    expect(await controller.noteCompletion(client, { sessionID: "s", messageID: "m1", responseLineageID: "turn-1", candidate: drift, taskContext: context })).toBe(true);
    expect(await controller.noteCompletion(client, { sessionID: "s", messageID: "m1-retry", responseLineageID: "turn-1", candidate: drift, taskContext: context })).toBe(false);
    await controller.appendPending(client, "s", []);
    controller.noteUserMessage("s", "new answer", "turn-2", context);
    expect(await controller.noteCompletion(client, { sessionID: "s", messageID: "m2", responseLineageID: "turn-2", candidate: drift, taskContext: context })).toBe(true);
  });

  test("honors config and in-session off-switches", async () => {
    const disabled = new StyleReinforcementController({ enabled: false });
    expect(await disabled.noteCompletion(client, { sessionID: "s", messageID: "m", responseLineageID: "t", candidate: drift, taskContext: context })).toBe(false);
    const stopped = new StyleReinforcementController({ productionEnabled: true });
    stopped.noteUserMessage("s", "stop X");
    expect(await stopped.noteCompletion(client, { sessionID: "s", messageID: "m", responseLineageID: "t", candidate: drift, taskContext: context })).toBe(false);
    const normal = new StyleReinforcementController({ productionEnabled: true });
    normal.noteUserMessage("s", "normal mode");
    expect(await normal.noteCompletion(client, { sessionID: "s", messageID: "m", responseLineageID: "t", candidate: drift, taskContext: context })).toBe(false);
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
});
