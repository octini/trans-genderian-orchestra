import { test, expect, describe } from "bun:test";
import {
  buildConcisionInstruction,
  ConcisionController,
  loadConcisionInstruction,
  REGISTER_SLOT,
  type SessionClient,
  type SystemTransformInput,
  type SystemTransformOutput,
} from "../src/concision";
import { REGISTER_SLOT as BUILD_REGISTER_SLOT, loadHouseStyle } from "../src/build";
import { estimateTokens } from "../src/config";

const RUNTIME_MAX_TOKENS = 500;
const RUNTIME_MIN_TOKENS = 300;
const FOLD_MAX_TOKENS = 250;

function fakeClient(sessions: Record<string, { parentID?: string | null }>): SessionClient {
  return {
    session: {
      get: async ({ path }) => ({
        data: sessions[path.id],
      }),
    },
  };
}

function makeOutput(): SystemTransformOutput {
  return { system: ["existing"] };
}

describe("concision instruction builder", () => {
  test("loads the runtime instruction asset", async () => {
    const text = await loadConcisionInstruction();
    expect(text).toContain("house style");
    expect(text).toContain("Structure");
    expect(text).toContain("Prose");
    expect(text).toContain("Code");
  });

  test("renders the register slot from the config register", async () => {
    const concise = await buildConcisionInstruction("concise");
    const natural = await buildConcisionInstruction("natural");
    expect(concise).not.toContain(REGISTER_SLOT);
    expect(concise).toContain("present in concise mode by default");
    expect(natural).toContain("present in natural mode by default");
  });

  test("shares the register slot constant with the build fold", () => {
    expect(REGISTER_SLOT).toBe(BUILD_REGISTER_SLOT);
  });
});

describe("concision drift protection", () => {
  test("runtime payload stays within the spec's 300-500 token band", async () => {
    const tokens = estimateTokens(await loadConcisionInstruction());
    expect(tokens).toBeGreaterThanOrEqual(RUNTIME_MIN_TOKENS);
    expect(tokens).toBeLessThanOrEqual(RUNTIME_MAX_TOKENS);
  });

  test("build fold stays lean and never bloats past 250 tokens", async () => {
    const tokens = estimateTokens(await loadHouseStyle());
    expect(tokens).toBeLessThanOrEqual(FOLD_MAX_TOKENS);
  });

  test("runtime payload carries the specific tell-vocabulary", async () => {
    const text = await loadConcisionInstruction();
    expect(text).toContain("utilize");
    expect(text).toContain("seamless");
    expect(text).toContain("Here's the thing");
    expect(text).toContain("it is important to note");
  });

  test("runtime payload carries the no-fabrication rule", async () => {
    const text = await loadConcisionInstruction();
    expect(text).toContain("Never invent facts");
  });

  test("runtime payload carries the clusters-not-isolated-tells guard", async () => {
    const text = await loadConcisionInstruction();
    expect(text).toContain("clusters");
    expect(text).toContain("isolated");
  });

  test("runtime payload carries the diff-anchored narration tell", async () => {
    const text = await loadConcisionInstruction();
    expect(text).toContain("diff-anchored");
  });

  test("runtime payload grounds prose in the project's own language (wait-what fold)", async () => {
    const text = await loadConcisionInstruction();
    expect(text).toContain("project's own language");
    expect(text).toContain("ubiquitous language");
  });

  test("runtime payload carries selective STE structure and article guardrails", async () => {
    const text = await loadConcisionInstruction();
    expect(text).toContain("active voice");
    expect(text).toContain("condition before");
    expect(text).toContain("one action per numbered step");
    expect(text).toContain("complete instructional sentences");
    expect(text).toContain("scan-oriented fragments");
    expect(text).toContain("qualifiers");
  });

  test("build fold carries the highest-leverage rules too", async () => {
    const text = await loadHouseStyle();
    expect(text).toContain("Never invent facts");
    expect(text).toContain("clusters");
    expect(text).toContain("utilize");
    expect(text).toContain("seamless");
    expect(text).toContain("project's own language");
    expect(text).toContain("active voice");
    expect(text).toContain("one action per numbered step");
    expect(text).toContain("scan-oriented fragments");
  });
});

describe("ConcisionController", () => {
  const client = fakeClient({
    "primary-1": { parentID: null },
    "sub-1": { parentID: "primary-1" },
  });

  test("appends the instruction to the system array for a primary session", async () => {
    const ctrl = new ConcisionController({});
    const output = makeOutput();
    const appended = await ctrl.transform(client, { sessionID: "primary-1" }, output);
    expect(appended).toBe(true);
    expect(output.system.length).toBe(2);
    expect(output.system[1]).toContain("house style");
  });

  test("does not append for a subagent session", async () => {
    const ctrl = new ConcisionController({});
    const output = makeOutput();
    const appended = await ctrl.transform(client, { sessionID: "sub-1" }, output);
    expect(appended).toBe(false);
    expect(output.system).toEqual(["existing"]);
  });

  test("does not append when parentID is missing", async () => {
    const ctrl = new ConcisionController({});
    const output = makeOutput();
    const appended = await ctrl.transform(fakeClient({ missing: {} }), { sessionID: "missing" }, output);
    expect(appended).toBe(false);
    expect(output.system).toEqual(["existing"]);
  });

  test("does not append when disabled", async () => {
    const ctrl = new ConcisionController({ enabled: false });
    const output = makeOutput();
    const appended = await ctrl.transform(client, { sessionID: "primary-1" }, output);
    expect(appended).toBe(false);
    expect(output.system).toEqual(["existing"]);
  });

  test("does not append without a sessionID", async () => {
    const ctrl = new ConcisionController({});
    const output = makeOutput();
    const appended = await ctrl.transform(client, {}, output);
    expect(appended).toBe(false);
    expect(output.system).toEqual(["existing"]);
  });

  test("caches the primary/subagent decision per session", async () => {
    let calls = 0;
    const counting: SessionClient = {
      session: {
        get: async () => {
          calls++;
           return { data: { parentID: null } };
        },
      },
    };
    const ctrl = new ConcisionController({});
    const a = makeOutput();
    const b = makeOutput();
    const ra = await ctrl.transform(counting, { sessionID: "s1" }, a);
    const rb = await ctrl.transform(counting, { sessionID: "s1" }, b);
    expect(calls).toBe(1);
    expect(ra).toBe(true);
    expect(rb).toBe(true);
    expect(a.system.length).toBe(2);
    expect(b.system.length).toBe(2);
  });

  test("renders the instruction once and reuses it across turns", async () => {
    const ctrl = new ConcisionController({ register: "natural" });
    const a = await ctrl.buildInstruction();
    const b = await ctrl.buildInstruction();
    expect(a).toBe(b);
    expect(a).toContain("present in natural mode by default");
  });

  test("reset clears caches and rebuilds", async () => {
    const ctrl = new ConcisionController({ register: "concise" });
    const before = await ctrl.buildInstruction();
    ctrl.reset();
    const after = await ctrl.buildInstruction();
    expect(after).toBe(before);
    expect(after).toContain("present in concise mode by default");
  });
});

describe("concision debug observability", () => {
  test("plugin.ts logs concision.appended through app.log (TGO_DEBUG_EVENTS gate)", () => {
    // The runtime concision injection needs to be verifiable: with
    // TGO_DEBUG_EVENTS=1 the plugin logs when the instruction is appended to a
    // primary session's system prompt. This test pins that wiring so the toggle
    // can be confirmed live from the opencode log, not just from seat folds.
    const source = require("node:fs").readFileSync(
      require("node:path").resolve(__dirname, "../src/plugin.ts"),
      "utf-8"
    );
    expect(source).toContain("concision.appended");
    expect(source).toContain("register: config.register");
  });
});
