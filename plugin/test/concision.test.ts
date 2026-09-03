import { test, expect, describe } from "bun:test";
import {
  buildVoiceInstruction,
  ConcisionController,
  loadVoiceCard,
  type SessionClient,
  type SystemTransformInput,
  type SystemTransformOutput,
} from "../src/concision";
import { loadVoiceCard as loadBuildVoiceCard, renderSeats } from "../src/build";
import { estimateTokens, estimatePromptTokens, MAX_PROMPT_TOKENS } from "../src/config";
import { renderFold, renderInstruction } from "../src/voices";

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

describe("voice card loader", () => {
  test("loads tgo-default and validates against schema", async () => {
    const card = await loadVoiceCard("default");
    expect(card.id).toBe("tgo-default");
    expect(card.exemplars.length).toBe(0);
    expect(card.voice_invariants.controls?.off_switch).toContain("stop X");
  });

  test("build and voices loaders agree on card identity", async () => {
    const a = await loadVoiceCard("default");
    const b = await loadBuildVoiceCard("default");
    expect(a.id).toBe(b.id);
    expect(a.voice_invariants.tone).toBe(b.voice_invariants.tone);
  });
});

describe("register kill", () => {
  test("build.ts contains no REGISTER_SLOT or REGISTERS or quoted concise/natural", () => {
    const source = require("node:fs").readFileSync(
      require("node:path").resolve(__dirname, "../src/build.ts"),
      "utf-8"
    );
    expect(source).not.toContain("REGISTER_SLOT");
    expect(source).not.toContain("REGISTERS");
    expect(source).not.toContain('"concise"');
    expect(source).not.toContain('"natural"');
  });

  test("concision.ts contains no REGISTER_SLOT or quoted concise/natural", () => {
    const source = require("node:fs").readFileSync(
      require("node:path").resolve(__dirname, "../src/concision.ts"),
      "utf-8"
    );
    expect(source).not.toContain("REGISTER_SLOT");
    expect(source).not.toContain('"concise"');
    expect(source).not.toContain('"natural"');
  });
});

describe("concision drift protection", () => {
  test("runtime payload stays within the spec's 300-500 token band", async () => {
    const tokens = estimateTokens(await buildVoiceInstruction("default"));
    expect(tokens).toBeGreaterThanOrEqual(RUNTIME_MIN_TOKENS);
    expect(tokens).toBeLessThanOrEqual(RUNTIME_MAX_TOKENS);
  });

  test("build fold stays lean and never bloats past 250 tokens", async () => {
    const card = await loadVoiceCard("default");
    const fold = renderFold(card);
    const tokens = estimateTokens(fold);
    expect(tokens).toBeLessThanOrEqual(FOLD_MAX_TOKENS);
  });

  test("runtime payload carries the specific tell-vocabulary", async () => {
    const text = await buildVoiceInstruction("default");
    expect(text).toContain("utilize");
    expect(text).toContain("seamless");
    expect(text).toContain("Here's the thing");
    expect(text).toContain("it is important to note");
  });

  test("runtime payload carries the no-fabrication rule", async () => {
    const text = await buildVoiceInstruction("default");
    expect(text).toContain("Never invent facts");
  });

  test("runtime payload carries the clusters-not-isolated-tells guard", async () => {
    const text = await buildVoiceInstruction("default");
    expect(text).toContain("clusters");
    expect(text).toContain("isolated");
  });

  test("runtime payload carries the diff-anchored narration tell", async () => {
    const text = await buildVoiceInstruction("default");
    expect(text).toContain("diff-anchored");
  });

  test("runtime payload grounds prose in the project's own language (wait-what fold)", async () => {
    const text = await buildVoiceInstruction("default");
    expect(text).toContain("project's own language");
    expect(text).toContain("ubiquitous language");
  });

  test("runtime payload carries selective STE structure and article guardrails", async () => {
    const text = await buildVoiceInstruction("default");
    expect(text).toContain("active voice");
    expect(text).toContain("condition before");
    expect(text).toContain("one action per numbered step");
    expect(text).toContain("complete instructional sentences");
    expect(text).toContain("scan-oriented fragments");
    expect(text).toContain("qualifiers");
  });

  test("runtime payload carries plain-english deltas", async () => {
    const text = await buildVoiceInstruction("default");
    expect(text).toContain("due to the fact that");
    expect(text).toContain("Plain Language (ISO 24495-1)");
    expect(text).toContain("Strunk & White");
    expect(text).toContain("abstract-noun");
    expect(text).toContain("should is hedge");
    expect(text).toContain("must");
  });

  test("runtime payload carries no-sycophancy and off-switch", async () => {
    const text = await buildVoiceInstruction("default");
    expect(text).toContain("no sycophancy");
    expect(text).toContain("stop X");
    expect(text).toContain("normal mode");
  });

  test("build fold carries the highest-leverage rules too", async () => {
    const card = await loadVoiceCard("default");
    const text = renderFold(card);
    expect(text).toContain("Never invent facts");
    expect(text).toContain("clusters");
    expect(text).toContain("utilize");
    expect(text).toContain("seamless");
    expect(text).toContain("project's own language");
    expect(text).toContain("active voice");
    expect(text).toContain("one action per numbered step");
    expect(text).toContain("scan-oriented fragments");
  });

  test("rendered seat prompts pass assertPromptUnderBudget", async () => {
    const agentsDir = require("node:path").resolve(__dirname, "../assets/agents");
    const seats = await renderSeats(agentsDir, "default");
    expect(seats.length).toBeGreaterThanOrEqual(7);
    for (const seat of seats) {
      const tokens = estimatePromptTokens(seat.content);
      expect(tokens).toBeLessThanOrEqual(MAX_PROMPT_TOKENS);
    }
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
    const ctrl = new ConcisionController({ cardId: "default" });
    const a = await ctrl.buildInstruction();
    const b = await ctrl.buildInstruction();
    expect(a).toBe(b);
    expect(a).toContain("house style");
  });

  test("reset clears caches and rebuilds", async () => {
    const ctrl = new ConcisionController({ cardId: "default" });
    const before = await ctrl.buildInstruction();
    ctrl.reset();
    const after = await ctrl.buildInstruction();
    expect(after).toBe(before);
    expect(after).toContain("house style");
  });
});

describe("layered injection (Fix 1)", () => {
  const layeredClient = fakeClient({
    "primary-1": { parentID: null },
  });
  test("override ≤200 tokens for prose and conversational", async () => {
    const prose = await loadVoiceCard("tgo-prose");
    const conv = await loadVoiceCard("tgo-conversational");
    const { renderStyleOverride, estimateVoiceTokens } = await import("../src/voices");
    const proseOv = renderStyleOverride(prose);
    const convOv = renderStyleOverride(conv);
    expect(estimateVoiceTokens(proseOv)).toBeLessThanOrEqual(200);
    expect(estimateVoiceTokens(convOv)).toBeLessThanOrEqual(200);
    expect(proseOv).toContain("voice delta");
    expect(convOv).toContain("voice delta");
    // Must contain delta components per spec: tone/diction/rhythm/perspective, arc notes, anti-pattern thresholds, closer
    expect(proseOv).toContain("Tone delta");
    expect(proseOv).toContain("Closer");
    expect(convOv).toContain("Closer");
  });

  test("named-card layering: instruction contains default banned-tell vocabulary AND override section", async () => {
    const ctrl = new ConcisionController({ cardId: "tgo-prose" });
    const output = makeOutput();
    await ctrl.transform(layeredClient, { sessionID: "primary-1" }, output);
    expect(output.system.length).toBe(3);
    const combined = output.system.slice(1).join("\n");
    expect(combined).toContain("utilize");
    expect(combined).toContain("seamless");
    expect(combined).toContain("clusters");
    expect(combined).toContain("isolated");
    expect(combined).toContain("voice delta");
    expect(combined).toContain("tgo-prose");
  });

  test("default card does not append override", async () => {
    const ctrl = new ConcisionController({ cardId: "tgo-default" });
    const output = makeOutput();
    await ctrl.transform(layeredClient, { sessionID: "primary-1" }, output);
    expect(output.system.length).toBe(2);
    expect(output.system.slice(1).join("\n")).not.toContain("voice delta");
  });

  test("baking pinned to default: config.style.card=prose still bakes tgo-default fold, no prose content", async () => {
    const installSrc = require("node:fs").readFileSync(require("node:path").resolve(__dirname, "../src/install.ts"), "utf-8");
    expect(installSrc).toContain('buildSeatsTo(target.agentsDir, "default")');
    expect(installSrc).not.toMatch(/buildSeatsTo\(target\.agentsDir, config\.style/);
    const seatSyncSrc = require("node:fs").readFileSync(require("node:path").resolve(__dirname, "../src/seat-sync.ts"), "utf-8");
    expect(seatSyncSrc).toContain('renderSeats(assetsAgentsDir, "default")');
    // Verify that default fold does not contain prose-specific D10/D11 content, while override does
    const prose = await loadVoiceCard("tgo-prose");
    const { renderStyleOverride } = await import("../src/voices");
    const defCard = await loadVoiceCard("default");
    const fold = renderFold(defCard);
    expect(fold).not.toContain("informed similes");
    expect(fold).not.toContain("plain-wit");
    expect(renderStyleOverride(prose)).toContain("Tone delta");
  });

  test("total system addition = default 300-500 + override ≤200", async () => {
    const defaultInstr = await buildVoiceInstruction("default");
    const proseCard = await loadVoiceCard("tgo-prose");
    const { renderStyleOverride, estimateVoiceTokens } = await import("../src/voices");
    const override = renderStyleOverride(proseCard);
    const defaultTokens = estimateVoiceTokens(defaultInstr);
    const overrideTokens = estimateVoiceTokens(override);
    expect(defaultTokens).toBeGreaterThanOrEqual(300);
    expect(defaultTokens).toBeLessThanOrEqual(500);
    expect(overrideTokens).toBeLessThanOrEqual(200);
    expect(defaultTokens + overrideTokens).toBeLessThanOrEqual(700);
  });

  test("renderFold cannot emit degraded fallback string", () => {
    const src = require("node:fs").readFileSync(require("node:path").resolve(__dirname, "../src/voices.ts"), "utf-8");
    expect(src).not.toContain("utilize, seamless, clusters, isolated, diff-anchored.");
  });
});

describe("concision debug observability", () => {
  test("plugin.ts logs concision.appended through app.log (TGO_DEBUG_EVENTS gate)", () => {
    const source = require("node:fs").readFileSync(
      require("node:path").resolve(__dirname, "../src/plugin.ts"),
      "utf-8"
    );
    expect(source).toContain("concision.appended");
  });
});
