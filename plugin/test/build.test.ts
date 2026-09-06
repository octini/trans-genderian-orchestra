import { test, expect, describe } from "bun:test";
import { mkdtempSync, existsSync, readFileSync, rmSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  buildSeatsTo,
  fixPinnedPluginEntries,
  foldHouseStyle,
  HOUSE_STYLE_SLOT,
  hasGlobalTgoKeys,
  hasPluginEntry,
  loadAgentsFragment,
  loadVoiceCard,
  mergeAgentsFragment,
  mergeOpenCodeConfig,
  PINNED_DEPS,
  PLUGIN_MODULE,
  registerGlobalPlugin,
  registerMcpServer,
  registerTuiPlugin,
  renderSeats,
  unionPluginArrays,
  VOICE_CARDS,
} from "../src/build";
import { renderFold } from "../src/voices";
import { estimatePromptTokens, MAX_PROMPT_TOKENS } from "../src/config";

const agentsDir = path.resolve(__dirname, "../assets/agents");

function tmpDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "tgo-test-"));
  return dir;
}

describe("house-style fold", () => {
  test("subagent templates carry the fold slot", async () => {
    const bernstein = readFileSync(path.join(agentsDir, "bernstein.md"), "utf-8");
    const dylan = readFileSync(path.join(agentsDir, "dylan.md"), "utf-8");
    expect(bernstein).not.toContain(HOUSE_STYLE_SLOT);
    expect(dylan).toContain(HOUSE_STYLE_SLOT);
  });

  test("fold replaces the slot with the house-style body", async () => {
    const card = await loadVoiceCard("default");
    const fold = renderFold(card);
    const rendered = foldHouseStyle("a\n{{TGO_HOUSE_STYLE}}\nb", fold);
    expect(rendered).not.toContain(HOUSE_STYLE_SLOT);
    expect(rendered).toContain("TGO house style");
    expect(rendered).toContain("Banned tells");
  });

  test("fold renders the default-card banned-tell vocabulary (cluster framing)", async () => {
    const card = await loadVoiceCard("default");
    const fold = renderFold(card);
    const rendered = foldHouseStyle("{{TGO_HOUSE_STYLE}}", fold);
    expect(rendered).toContain("judge by clusters, not isolated instances");
    expect(rendered).toContain("utilize");
    expect(rendered).toContain("seamless");
    expect(rendered).toContain("leverage");
    expect(rendered).toContain("house style");
    expect(rendered).not.toContain("{{TGO_REGISTER}}");
  });

  test("templates without a slot are left untouched", async () => {
    const rendered = foldHouseStyle("plain prompt", "style");
    expect(rendered).toBe("plain prompt");
  });

  test("every rendered seat stays under the token budget in every voice card", async () => {
    for (const cardId of VOICE_CARDS) {
      const seats = await renderSeats(agentsDir, cardId);
      expect(seats.length).toBeGreaterThanOrEqual(7);
      for (const seat of seats) {
        const tokens = estimatePromptTokens(seat.content);
        expect(tokens).toBeLessThanOrEqual(MAX_PROMPT_TOKENS);
      }
    }
    // default param is default card
    const defaultSeats = await renderSeats(agentsDir);
    expect(defaultSeats.length).toBeGreaterThanOrEqual(7);
    for (const seat of defaultSeats) {
      expect(estimatePromptTokens(seat.content)).toBeLessThanOrEqual(MAX_PROMPT_TOKENS);
    }
  });

  test("rendered subagents gain house style; bernstein does not", async () => {
    const seats = await renderSeats(agentsDir);
    const byName = Object.fromEntries(seats.map((s) => [s.fileName, s.content]));
    expect(byName["bernstein.md"]).not.toContain("TGO house style");
    expect(byName["dylan.md"]).toContain("TGO house style");
    expect(byName["dylan.md"]).toContain("Banned tells");
    expect(byName["cobain.md"]).toContain("TGO house style");
  });

  test("buildSeatsTo writes rendered seats to disk", async () => {
    const dir = tmpDir();
    const seats = await buildSeatsTo(dir, "default");
    expect(seats.length).toBeGreaterThanOrEqual(7);
    for (const seat of seats) {
      expect(existsSync(path.join(dir, seat.fileName))).toBe(true);
      const content = readFileSync(path.join(dir, seat.fileName), "utf-8");
      expect(estimatePromptTokens(content)).toBeLessThanOrEqual(MAX_PROMPT_TOKENS);
      if (seat.fileName === "bernstein.md") {
        expect(content).not.toContain("TGO house style");
      } else {
        expect(content).toContain("TGO house style");
      }
    }
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("bernstein mandate encoding", () => {
  test("carries the living-spec mechanism", () => {
    const prompt = readFileSync(path.join(agentsDir, "bernstein.md"), "utf-8");
    expect(prompt).toContain("Living spec");
    expect(prompt).toContain("spec-review checkpoint");
    expect(prompt).toContain("bidirectionally update the issue");
    expect(prompt).toContain("log decisions on it");
  });

  test("carries DAG + wave decomposition with the concurrency cap", () => {
    const prompt = readFileSync(path.join(agentsDir, "bernstein.md"), "utf-8");
    expect(prompt).toContain("dependency-ordered DAG");
    expect(prompt).toContain("same-level tasks as waves");
    expect(prompt).toContain("(max 3)");
  });

  test("carries boolean exit gates", () => {
    const prompt = readFileSync(path.join(agentsDir, "bernstein.md"), "utf-8");
    expect(prompt).toContain("boolean exit gate");
    expect(prompt).toContain("Verify against the spec");
    expect(prompt).toContain("Run the exit gate");
  });

  test("carries metadata-only Beads lifecycle boundaries", () => {
    const prompt = readFileSync(path.join(agentsDir, "bernstein.md"), "utf-8");
    expect(prompt).toContain("ONLY intended Beads operator in the future architecture");
    expect(prompt).toContain("does not create, claim, close, reopen, or recover Beads issues");
    expect(prompt).toContain("Treat `issueId`, `issueStatusObserved`, `issueAssigneeObserved`, `claimExitCode`, `beadsOperator`, `exitGate`");
    expect(prompt).toContain("issueStatusObserved");
    expect(prompt).toContain("issueAssigneeObserved");
    expect(prompt).toContain("claimExitCode");
    expect(prompt).toContain("ephemeral");
  });

  test("carries stagnation detection + the re-planning ladder", () => {
    const prompt = readFileSync(path.join(agentsDir, "bernstein.md"), "utf-8");
    expect(prompt).toContain("3 identical actions");
    expect(prompt).toContain("light (tweak) → medium (reorder deps) → heavy (re-decompose)");
  });

  test("carries the doing-boundary + routing amendments", () => {
    const prompt = readFileSync(path.join(agentsDir, "bernstein.md"), "utf-8");
    expect(prompt).toContain("Never use the direct `edit`/`grep`/`glob`/`list` tools");
    expect(prompt).toContain("Route by blast radius");
    expect(prompt).toContain("Prose-nudge");
    expect(prompt).toContain("Depth caps at 2");
    expect(prompt).toContain("git worktrees");
    expect(prompt).toContain("bd admin compact --analyze");
    expect(prompt).toContain("next wave waits on the prior");
    expect(prompt).toContain("no beads issue");
    expect(prompt).toContain("Prompt/config → human; code → beads issue");
  });

  test("carries the front-door rule: grill decisions, facts are never memory, greenfield recon is required", () => {
    const prompt = readFileSync(path.join(agentsDir, "bernstein.md"), "utf-8");
    // grilling owns decisions
    expect(prompt).toContain("Front-door");
    expect(prompt).toContain("DECISIONS first");
    expect(prompt).toContain("decisions are the user's");
    // facts are never the user's and never memory — research is not discretionary
    expect(prompt).toContain("Facts are never the user's and never memory");
    expect(prompt).toContain("any frontier question carrying a fact");
    expect(prompt).toContain("dispatch Nas BEFORE that decision settles");
    // greenfield recon is REQUIRED, not optional — the anti-regression anchor
    expect(prompt).toContain("REQUIRED first dispatch");
    // pre-spec audit gate catches memory-backed facts before the spec leaves
    expect(prompt).toContain("Pre-spec audit");
    expect(prompt).toContain("retrieval-backed or an explicit user decision");
    expect(prompt).toContain("memory-backed and retrievable → Nas");
    // lane-card keeps facts routed to Nas
    expect(prompt).toContain("Facts → Nas, never user, never memory");
  });

  test("carries the watchdog-abort handling rule", () => {
    const prompt = readFileSync(path.join(agentsDir, "bernstein.md"), "utf-8");
    expect(prompt).toContain("## WATCHDOG-ABORT");
    expect(prompt).toContain("re-dispatch smaller or re-decompose");
  });

  test("recon and review seats carry a steps cap so they cannot die silently", () => {
    const nas = readFileSync(path.join(agentsDir, "nas.md"), "utf-8");
    const horowitz = readFileSync(path.join(agentsDir, "horowitz.md"), "utf-8");
    const dylan = readFileSync(path.join(agentsDir, "dylan.md"), "utf-8");
    expect(nas).toMatch(/^steps: \d+$/m);
    expect(horowitz).toMatch(/^steps: \d+$/m);
    expect(dylan).toMatch(/^steps: \d+$/m);
    // the seat body tells the agent to end with text, never silently
    expect(nas).toContain("never end a turn with no text");
    expect(horowitz).toContain("never end a turn with no text");
    expect(dylan).toContain("never end a turn with no text");
  });

  test("nas carries the websearch-first rule (mandatory websearch, webfetch only known URLs)", () => {
    const nas = readFileSync(path.join(agentsDir, "nas.md"), "utf-8");
    expect(nas).toContain("Websearch-first");
    expect(nas).toContain("MANDATORY");
    expect(nas).toContain("query, don't guess URLs");
    expect(nas).toContain("never guess raw.githubusercontent");
    expect(nas).toContain("stop after 2 misses");
  });

  test("carries review-before-close routing to Horowitz", () => {
    const prompt = readFileSync(path.join(agentsDir, "bernstein.md"), "utf-8");
    expect(prompt).toContain("Review lane (Horowitz)");
    expect(prompt).toContain("dispatch Horowitz to review the diff against the spec");
    expect(prompt).toContain("Review-before-close");
    expect(prompt).toContain("When in doubt, route it to Horowitz");
  });

  test("AGENTS fragment carries the retrieval-led reasoning line", async () => {
    const fragment = await loadAgentsFragment();
    expect(fragment).toContain("Prefer retrieval-led reasoning over pre-training-led reasoning");
    expect(fragment).toContain("go look it up");
  });

  test("carries deepwork mode: opt-in, default off, hard bounds, wake-on-event", () => {
    const prompt = readFileSync(path.join(agentsDir, "bernstein.md"), "utf-8");
    expect(prompt).toContain("Deepwork opt-in only");
    expect(prompt).toContain("off by default");
    expect(prompt).toContain("bounds:");
    expect(prompt).toContain("token budget");
    expect(prompt).toContain("wake-on-event/heartbeat chains phases");
  });

  test("carries stagnation detection + progress checks", () => {
    const prompt = readFileSync(path.join(agentsDir, "bernstein.md"), "utf-8");
    expect(prompt).toContain("3 identical actions");
    expect(prompt).toContain("progress checks");
    expect(prompt).toContain("light (tweak) → medium (reorder deps) → heavy (re-decompose)");
  });

  test("carries the checkpoint pause list + resumable continuation", () => {
    const prompt = readFileSync(path.join(agentsDir, "bernstein.md"), "utf-8");
    expect(prompt).toContain("## CHECKPOINT REACHED");
    expect(prompt).toContain("(resumable)");
    expect(prompt).toContain("irreversible/expensive");
    expect(prompt).toContain("direction change");
    expect(prompt).toContain("dep legitimacy");
    expect(prompt).toContain("verify-fail after ladder");
    expect(prompt).toContain("user-flagged");
    expect(prompt).toContain("else auto-approve");
  });

  test("carries the vision-delegation rule: Nas is the eyes when Bernstein lacks vision; self-serve when he has it", () => {
    const prompt = readFileSync(path.join(agentsDir, "bernstein.md"), "utf-8");
    // delegates sight tasks to Nas when the current model has no vision
    expect(prompt).toContain("Nas is the eyes");
    expect(prompt).toContain("goes to Nas when your model lacks vision");
    // and does NOT bother delegating when the model has vision (frontier)
    expect(prompt).toContain("when your model HAS vision");
    expect(prompt).toContain("read images yourself");
  });
});

describe("nirvana band wiring", () => {
  test("nirvana spawns its three lenses in parallel", () => {
    const prompt = readFileSync(path.join(agentsDir, "nirvana.md"), "utf-8");
    expect(prompt).toContain("in parallel via task");
    expect(prompt).toContain("cobain");
    expect(prompt).toContain("grohl");
    expect(prompt).toContain("novoselic");
    expect(prompt).toContain("then synthesize");
  });

  test("nirvana carries the reconciliation contract (Band Response, per-lens details, summary, named-override)", () => {
    const prompt = readFileSync(path.join(agentsDir, "nirvana.md"), "utf-8");
    expect(prompt).toContain("Band Response");
    expect(prompt).toContain("per-lens details");
    expect(prompt).toContain("Band Summary");
    expect(prompt).toContain("unanimous / majority / split");
    expect(prompt).toContain("Named-override");
  });

  test("bernstein routes judgment or user prose to the band", () => {
    const prompt = readFileSync(path.join(agentsDir, "bernstein.md"), "utf-8");
    expect(prompt).toContain("Nirvana band");
    expect(prompt).toContain("judgment");
    expect(prompt).toContain("run it by the band");
  });

  test("bernstein carries band ephemerality (no beads issue)", () => {
    const prompt = readFileSync(path.join(agentsDir, "bernstein.md"), "utf-8");
    expect(prompt).toContain("Nirvana band ephemeral");
    expect(prompt).toContain("graduate if warranted");
  });

  test("band seats stay tool-less and depth-capped", () => {
    const bernstein = readFileSync(path.join(agentsDir, "bernstein.md"), "utf-8");
    expect(bernstein).toContain("nirvana → band members is the last hop");
    for (const seat of ["cobain", "grohl", "novoselic"]) {
      const prompt = readFileSync(path.join(agentsDir, `${seat}.md`), "utf-8");
      expect(prompt).toContain("Tool-less");
      expect(prompt).toContain("no tools");
    }
  });
});

describe("AGENTS.md fragment merge", () => {
  test("creates AGENTS.md when missing", async () => {
    const dir = tmpDir();
    const result = await mergeAgentsFragment(dir);
    expect(result.action).toBe("created");
    const content = readFileSync(path.join(dir, "AGENTS.md"), "utf-8");
    expect(content).toContain("Record work in beads");
    rmSync(dir, { recursive: true, force: true });
  });

  test("appends to existing AGENTS.md without clobbering", async () => {
    const dir = tmpDir();
    const existing = "# My project\n\nSome guidance.\n";
    const { writeFileSync } = await import("node:fs");
    writeFileSync(path.join(dir, "AGENTS.md"), existing);
    const result = await mergeAgentsFragment(dir);
    expect(result.action).toBe("appended");
    const content = readFileSync(path.join(dir, "AGENTS.md"), "utf-8");
    expect(content).toContain("# My project");
    expect(content).toContain("Record work in beads");
    rmSync(dir, { recursive: true, force: true });
  });

  test("is idempotent — does not double-append", async () => {
    const dir = tmpDir();
    await mergeAgentsFragment(dir);
    const second = await mergeAgentsFragment(dir);
    expect(second.action).toBe("unchanged");
    const content = readFileSync(path.join(dir, "AGENTS.md"), "utf-8");
    expect(content.split("Record work in beads").length - 1).toBe(1);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("global opencode config merge", () => {
  test("creates opencode.jsonc (the winning last-loaded file) with subagent_depth: 2 + todowrite deny", async () => {
    const dir = tmpDir();
    const result = await mergeOpenCodeConfig(dir);
    expect(result.action).toBe("created");
    expect(result.configFile.endsWith("opencode.jsonc")).toBe(true);
    const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
    expect(cfg.subagent_depth).toBe(2);
    expect(cfg.permission.todowrite).toBe("deny");
    expect(cfg.default_agent).toBe("bernstein");
    expect(hasGlobalTgoKeys(cfg)).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });

  test("merges into an existing opencode.jsonc without clobbering", async () => {
    const dir = tmpDir();
    const { writeFileSync } = await import("node:fs");
    writeFileSync(
      path.join(dir, "opencode.jsonc"),
      JSON.stringify({ model: "opencode-go/deepseek-v4-flash", plugin: ["opencode-beads"] })
    );
    const result = await mergeOpenCodeConfig(dir);
    expect(result.action).toBe("merged");
    const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
    expect(cfg.model).toBe("opencode-go/deepseek-v4-flash");
    expect(cfg.plugin).toEqual(["opencode-beads"]);
    expect(cfg.subagent_depth).toBe(2);
    expect(cfg.permission.todowrite).toBe("deny");
    expect(cfg.default_agent).toBe("bernstein");
    rmSync(dir, { recursive: true, force: true });
  });

  test("migrates legacy opencode.json content forward when only it exists", async () => {
    const dir = tmpDir();
    const { writeFileSync } = await import("node:fs");
    writeFileSync(
      path.join(dir, "opencode.json"),
      JSON.stringify({ model: "legacy-model", plugin: ["legacy-plugin"] })
    );
    const result = await mergeOpenCodeConfig(dir);
    expect(result.action).toBe("created");
    const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
    expect(cfg.model).toBe("legacy-model");
    expect(cfg.plugin).toEqual(["legacy-plugin"]);
    expect(cfg.subagent_depth).toBe(2);
    expect(cfg.permission.todowrite).toBe("deny");
    rmSync(dir, { recursive: true, force: true });
  });

  test("tolerates a JSONC opencode.jsonc (comments + trailing commas) without losing user keys", async () => {
    const dir = tmpDir();
    const { writeFileSync, existsSync } = await import("node:fs");
    const jsonc = `{
      // my comment
      "model": "acme/fancy-model",
      /* block */
      "plugin": ["opencode-beads",],
    }`;
    writeFileSync(path.join(dir, "opencode.jsonc"), jsonc);
    const result = await mergeOpenCodeConfig(dir);
    expect(result.action).toBe("merged");
    expect(result.backedUp).toBeFalsy();
    const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
    expect(cfg.model).toBe("acme/fancy-model");
    expect(cfg.plugin).toEqual(["opencode-beads"]);
    expect(cfg.subagent_depth).toBe(2);
    expect(cfg.permission.todowrite).toBe("deny");
    expect(existsSync(path.join(dir, "opencode.jsonc.bak"))).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });

  test("backs up a genuinely unparseable opencode.jsonc instead of clobbering it", async () => {
    const dir = tmpDir();
    const { writeFileSync, existsSync, readFileSync: read } = await import("node:fs");
    const broken = "{ this is not json at all {{{";
    writeFileSync(path.join(dir, "opencode.jsonc"), broken);
    const result = await mergeOpenCodeConfig(dir);
    expect(result.action).toBe("created");
    expect(result.backedUp).toBe(true);
    expect(read(path.join(dir, "opencode.jsonc.bak"), "utf-8")).toBe(broken);
    const cfg = JSON.parse(read(path.join(dir, "opencode.jsonc"), "utf-8"));
    expect(cfg.subagent_depth).toBe(2);
    expect(cfg.permission.todowrite).toBe("deny");
    rmSync(dir, { recursive: true, force: true });
  });

  test("is idempotent — does not rewrite when already present", async () => {
    const dir = tmpDir();
    await mergeOpenCodeConfig(dir);
    const second = await mergeOpenCodeConfig(dir);
    expect(second.action).toBe("unchanged");
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("plugin self-registration", () => {
  test("hasPluginEntry recognizes string, tuple, and object entries", () => {
    expect(hasPluginEntry(["opencode-beads", PLUGIN_MODULE], PLUGIN_MODULE)).toBe(true);
    expect(hasPluginEntry([["opencode-beads", {}], PLUGIN_MODULE], PLUGIN_MODULE)).toBe(true);
    expect(hasPluginEntry([{ module: PLUGIN_MODULE, options: {} }], PLUGIN_MODULE)).toBe(true);
    expect(hasPluginEntry(["opencode-beads"], PLUGIN_MODULE)).toBe(false);
    expect(hasPluginEntry(undefined, PLUGIN_MODULE)).toBe(false);
  });

  test("adds the plugin to an empty opencode.jsonc", async () => {
    const dir = tmpDir();
    const result = await registerGlobalPlugin(dir);
    expect(result.action).toBe("added");
    expect(result.configFile.endsWith("opencode.jsonc")).toBe(true);
    const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
    expect(cfg.plugin).toEqual([PLUGIN_MODULE]);
    rmSync(dir, { recursive: true, force: true });
  });

  test("appends to an existing plugin array without clobbering", async () => {
    const dir = tmpDir();
    const { writeFileSync } = await import("node:fs");
    writeFileSync(
      path.join(dir, "opencode.jsonc"),
      JSON.stringify({ model: "acme/model", plugin: ["opencode-beads"] })
    );
    const result = await registerGlobalPlugin(dir);
    expect(result.action).toBe("added");
    const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
    expect(cfg.model).toBe("acme/model");
    expect(cfg.plugin).toEqual(["opencode-beads", PLUGIN_MODULE]);
    rmSync(dir, { recursive: true, force: true });
  });

  test("coexists with AFT's opencode.jsonc plugin array (clobbering regression)", async () => {
    const dir = tmpDir();
    const { writeFileSync } = await import("node:fs");
    // AFT's installer owns opencode.jsonc; TGO must append, not replace.
    writeFileSync(
      path.join(dir, "opencode.jsonc"),
      JSON.stringify({ plugin: ["@cortexkit/aft-opencode@latest"] })
    );
    const result = await registerGlobalPlugin(dir);
    expect(result.action).toBe("added");
    const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
    expect(cfg.plugin).toEqual(["@cortexkit/aft-opencode@latest", PLUGIN_MODULE]);
    rmSync(dir, { recursive: true, force: true });
  });

  test("migrates a plugin entry registered only in legacy opencode.json", async () => {
    const dir = tmpDir();
    const { writeFileSync } = await import("node:fs");
    writeFileSync(
      path.join(dir, "opencode.json"),
      JSON.stringify({ plugin: ["legacy-plugin"] })
    );
    const result = await registerGlobalPlugin(dir);
    expect(result.action).toBe("added");
    const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
    expect(cfg.plugin).toEqual(["legacy-plugin", PLUGIN_MODULE]);
    rmSync(dir, { recursive: true, force: true });
  });

  test("is idempotent — reports unchanged when already registered", async () => {
    const dir = tmpDir();
    await registerGlobalPlugin(dir);
    const second = await registerGlobalPlugin(dir);
    expect(second.action).toBe("unchanged");
    const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
    expect(cfg.plugin).toEqual([PLUGIN_MODULE]);
    rmSync(dir, { recursive: true, force: true });
  });

  test("registers a custom module path when passed explicitly", async () => {
    const dir = tmpDir();
    const result = await registerGlobalPlugin(dir, "/some/local/plugin.ts");
    expect(result.action).toBe("added");
    const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
    expect(cfg.plugin).toEqual(["/some/local/plugin.ts"]);
    rmSync(dir, { recursive: true, force: true });
  });

  describe("TUI plugin registration (tui.json)", () => {
    test("registers a TUI plugin in a fresh tui.jsonc (the TUI only loads tui.* files)", async () => {
      const dir = tmpDir();
      const result = await registerTuiPlugin(dir, "@cortexkit/opencode-magic-context@latest");
      expect(result.action).toBe("added");
      expect(result.configFile.endsWith("tui.jsonc")).toBe(true);
      const cfg = JSON.parse(readFileSync(path.join(dir, "tui.jsonc"), "utf-8"));
      expect(cfg.plugin).toEqual(["@cortexkit/opencode-magic-context@latest"]);
      rmSync(dir, { recursive: true, force: true });
    });

    test("appends to AFT's existing tui.json without clobbering", async () => {
      const dir = tmpDir();
      const { writeFileSync } = await import("node:fs");
      writeFileSync(
        path.join(dir, "tui.json"),
        JSON.stringify({ plugin: ["@cortexkit/aft-opencode@latest"] })
      );
      const result = await registerTuiPlugin(dir, "@cortexkit/opencode-magic-context@latest");
      expect(result.action).toBe("added");
      expect(result.configFile.endsWith("tui.jsonc")).toBe(true);
      const cfg = JSON.parse(readFileSync(path.join(dir, "tui.jsonc"), "utf-8"));
      expect(cfg.plugin).toEqual([
        "@cortexkit/aft-opencode@latest",
        "@cortexkit/opencode-magic-context@latest",
      ]);
      rmSync(dir, { recursive: true, force: true });
    });

    test("is idempotent — does not duplicate the entry", async () => {
      const dir = tmpDir();
      await registerTuiPlugin(dir, "@cortexkit/opencode-magic-context@latest");
      const second = await registerTuiPlugin(dir, "@cortexkit/opencode-magic-context@latest");
      expect(second.action).toBe("unchanged");
      const cfg = JSON.parse(readFileSync(path.join(dir, "tui.jsonc"), "utf-8"));
      expect(cfg.plugin).toEqual(["@cortexkit/opencode-magic-context@latest"]);
      rmSync(dir, { recursive: true, force: true });
    });
  });

  describe("MCP server registration (remote entry)", () => {
    test("registers a remote MCP server in a fresh opencode.jsonc", async () => {
      const dir = tmpDir();
      const result = await registerMcpServer(dir, "context7", {
        type: "remote",
        url: "https://mcp.context7.com/mcp",
      });
      expect(result.action).toBe("added");
      expect(result.configFile.endsWith("opencode.jsonc")).toBe(true);
      const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
      expect(cfg.mcp.context7).toEqual({
        type: "remote",
        url: "https://mcp.context7.com/mcp",
      });
      rmSync(dir, { recursive: true, force: true });
    });

    test("merges into an existing config without clobbering other mcp servers or keys", async () => {
      const dir = tmpDir();
      const { writeFileSync } = await import("node:fs");
      writeFileSync(
        path.join(dir, "opencode.jsonc"),
        JSON.stringify({ model: "acme/model", mcp: { other: { type: "remote", url: "https://x.example/mcp" } } })
      );
      const result = await registerMcpServer(dir, "context7", {
        type: "remote",
        url: "https://mcp.context7.com/mcp",
      });
      expect(result.action).toBe("added");
      const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
      expect(cfg.model).toBe("acme/model");
      expect(cfg.mcp.other).toEqual({ type: "remote", url: "https://x.example/mcp" });
      expect(cfg.mcp.context7).toEqual({ type: "remote", url: "https://mcp.context7.com/mcp" });
      rmSync(dir, { recursive: true, force: true });
    });

    test("is idempotent — does not duplicate or overwrite the entry", async () => {
      const dir = tmpDir();
      await registerMcpServer(dir, "context7", { type: "remote", url: "https://mcp.context7.com/mcp" });
      const second = await registerMcpServer(dir, "context7", {
        type: "remote",
        url: "https://mcp.context7.com/mcp",
      });
      expect(second.action).toBe("unchanged");
      const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
      expect(cfg.mcp.context7).toEqual({ type: "remote", url: "https://mcp.context7.com/mcp" });
      rmSync(dir, { recursive: true, force: true });
    });
  });

  test("install self-registers the plugin by default (blank-slate path)", async () => {
    const dir = tmpDir();
    const { install } = await import("../src/install");
    const report = await install({ configDir: dir, deps: "skip" });
    expect(report.plugin).toBe(PLUGIN_MODULE);
    expect(report.pluginAction).toBe("added");
    const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
    expect(cfg.plugin).toContain(PLUGIN_MODULE);
    rmSync(dir, { recursive: true, force: true });
  });

  test("install honors register: false as an explicit opt-out", async () => {
    const dir = tmpDir();
    const { install } = await import("../src/install");
    const report = await install({ configDir: dir, deps: "skip", register: false });
    expect(report.plugin).toBeUndefined();
    expect(report.pluginAction).toBeUndefined();
    const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
    expect(cfg.plugin).toBeUndefined();
    rmSync(dir, { recursive: true, force: true });
  });

  test("install registers the context7 remote MCP server when the dep is present", async () => {
    const dir = tmpDir();
    const { writeFileSync } = await import("node:fs");
    // Seed the detect marker so context7 counts as "present" (as if a prior
    // install had registered it), without a real mcp entry yet.
    writeFileSync(path.join(dir, "opencode.jsonc"), JSON.stringify({ marker: "context7" }));
    const { install } = await import("../src/install");
    const report = await install({ configDir: dir, deps: "skip" });
    expect(report.context7Registered).toBe(true);
    const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
    expect(cfg.mcp.context7).toEqual({
      type: "remote",
      url: "https://mcp.context7.com/mcp",
    });
    expect(cfg.marker).toBe("context7");
    rmSync(dir, { recursive: true, force: true });
  });

  test("install skips context7 registration under register: false", async () => {
    const dir = tmpDir();
    const { writeFileSync } = await import("node:fs");
    writeFileSync(path.join(dir, "opencode.jsonc"), JSON.stringify({ marker: "context7" }));
    const { install } = await import("../src/install");
    const report = await install({ configDir: dir, deps: "skip", register: false });
    expect(report.context7Registered).toBeUndefined();
    const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
    expect(cfg.mcp?.context7).toBeUndefined();
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("pinned dep auto-fix (R2)", () => {
  test("fixPinnedPluginEntries: pinned magic-context entry → fixed to @latest", () => {
    const { fixed, changed } = fixPinnedPluginEntries(["@cortexkit/opencode-magic-context@0.38.0"]);
    expect(changed).toBe(true);
    expect(fixed).toEqual(["@cortexkit/opencode-magic-context@latest"]);
  });

  test("fixPinnedPluginEntries: pinned AFT entry → fixed to @latest", () => {
    const { fixed, changed } = fixPinnedPluginEntries(["@cortexkit/aft-opencode@1.2.3"]);
    expect(changed).toBe(true);
    expect(fixed).toEqual(["@cortexkit/aft-opencode@latest"]);
  });

  test("fixPinnedPluginEntries: third-party pinned entry → untouched", () => {
    const { fixed, changed } = fixPinnedPluginEntries(["some-other@1.2.3", "@other/pkg@0.1.0"]);
    expect(changed).toBe(false);
    expect(fixed).toEqual(["some-other@1.2.3", "@other/pkg@0.1.0"]);
  });

  test("fixPinnedPluginEntries: already-@latest → unchanged", () => {
    const { fixed, changed } = fixPinnedPluginEntries(["@cortexkit/opencode-magic-context@latest", "@cortexkit/aft-opencode@latest"]);
    expect(changed).toBe(false);
    expect(fixed).toEqual(["@cortexkit/opencode-magic-context@latest", "@cortexkit/aft-opencode@latest"]);
  });

  test("fixPinnedPluginEntries: bare names untouched", () => {
    const { fixed, changed } = fixPinnedPluginEntries(["@cortexkit/opencode-magic-context", "@cortexkit/aft-opencode"]);
    expect(changed).toBe(false);
    expect(fixed).toEqual(["@cortexkit/opencode-magic-context", "@cortexkit/aft-opencode"]);
  });

  test("registerGlobalPlugin auto-fixes pinned magic-context entry in existing config", async () => {
    const dir = tmpDir();
    const { writeFileSync } = await import("node:fs");
    writeFileSync(path.join(dir, "opencode.jsonc"), JSON.stringify({ plugin: ["@cortexkit/opencode-magic-context@0.38.0"] }));
    const result = await registerGlobalPlugin(dir, "@cortexkit/opencode-magic-context@latest");
    expect(result.action).toBe("pin-fixed");
    const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
    expect(cfg.plugin).toEqual(["@cortexkit/opencode-magic-context@latest"]);
    // second call now unchanged
    const second = await registerGlobalPlugin(dir, "@cortexkit/opencode-magic-context@latest");
    expect(second.action).toBe("unchanged");
    rmSync(dir, { recursive: true, force: true });
  });

  test("registerGlobalPlugin auto-fixes pinned AFT entry", async () => {
    const dir = tmpDir();
    const { writeFileSync } = await import("node:fs");
    writeFileSync(path.join(dir, "opencode.jsonc"), JSON.stringify({ plugin: ["@cortexkit/aft-opencode@0.10.0", "other@1.0.0"] }));
    const result = await registerGlobalPlugin(dir, PLUGIN_MODULE);
    const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
    expect(cfg.plugin).toContain("@cortexkit/aft-opencode@latest");
    expect(cfg.plugin).not.toContain("@cortexkit/aft-opencode@0.10.0");
    expect(cfg.plugin).toContain("other@1.0.0");
    rmSync(dir, { recursive: true, force: true });
  });

  test("registerGlobalPlugin leaves third-party pinned entries untouched", async () => {
    const dir = tmpDir();
    const { writeFileSync } = await import("node:fs");
    writeFileSync(path.join(dir, "opencode.jsonc"), JSON.stringify({ plugin: ["third-party@1.2.3", "@cortexkit/opencode-magic-context@latest"] }));
    await registerGlobalPlugin(dir, PLUGIN_MODULE);
    const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
    expect(cfg.plugin).toContain("third-party@1.2.3");
    expect(cfg.plugin).toContain("@cortexkit/opencode-magic-context@latest");
    rmSync(dir, { recursive: true, force: true });
  });

  test("registerTuiPlugin auto-fixes pinned dep entry", async () => {
    const dir = tmpDir();
    const { writeFileSync } = await import("node:fs");
    writeFileSync(path.join(dir, "tui.jsonc"), JSON.stringify({ plugin: ["@cortexkit/aft-opencode@0.38.0"] }));
    await registerTuiPlugin(dir, "@cortexkit/aft-opencode@latest");
    const cfg = JSON.parse(readFileSync(path.join(dir, "tui.jsonc"), "utf-8"));
    expect(cfg.plugin).toEqual(["@cortexkit/aft-opencode@latest"]);
    rmSync(dir, { recursive: true, force: true });
  });

  test("registerGlobalPlugin registers @latest dep entry (regression)", async () => {
    const dir = tmpDir();
    const { writeFileSync } = await import("node:fs");
    writeFileSync(path.join(dir, "opencode.jsonc"), JSON.stringify({ marker: "aft" }));
    await registerGlobalPlugin(dir, "@cortexkit/opencode-magic-context@latest");
    const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
    expect(cfg.plugin).toContain("@cortexkit/opencode-magic-context@latest");
    rmSync(dir, { recursive: true, force: true });
  });

  test("fixPinnedPluginEntries: tuple branch pinned entry → fixed to @latest preserving opts", () => {
    const tuple: unknown = ["@cortexkit/opencode-magic-context@0.38.0", { foo: "bar" }];
    const { fixed, changed } = fixPinnedPluginEntries([tuple]);
    expect(changed).toBe(true);
    expect(fixed).toEqual([["@cortexkit/opencode-magic-context@latest", { foo: "bar" }]]);
  });

  test("fixPinnedPluginEntries: tuple branch already-@latest untouched", () => {
    const tuple: unknown = ["@cortexkit/aft-opencode@latest", { opt: 1 }];
    const { fixed, changed } = fixPinnedPluginEntries([tuple]);
    expect(changed).toBe(false);
    expect(fixed).toEqual([tuple]);
  });

  test("fixPinnedPluginEntries: object branch pinned entry → fixed to @latest preserving sibling keys", () => {
    const obj = { module: "@cortexkit/aft-opencode@1.2.3", options: { x: 1 }, extra: true };
    const { fixed, changed } = fixPinnedPluginEntries([obj]);
    expect(changed).toBe(true);
    expect(fixed).toEqual([{ module: "@cortexkit/aft-opencode@latest", options: { x: 1 }, extra: true }]);
  });

  test("fixPinnedPluginEntries: object branch already-@latest untouched", () => {
    const obj = { module: "@cortexkit/opencode-magic-context@latest", foo: 1 };
    const { fixed, changed } = fixPinnedPluginEntries([obj]);
    expect(changed).toBe(false);
    expect(fixed).toEqual([obj]);
  });

  test("fixPinnedPluginEntries: prefix collision @cortexkit/aft-opencode-extra@1.0.0 must remain untouched", () => {
    const collision = "@cortexkit/aft-opencode-extra@1.0.0";
    const { fixed, changed } = fixPinnedPluginEntries([collision]);
    expect(changed).toBe(false);
    expect(fixed).toEqual([collision]);
    const tupleColl: unknown = ["@cortexkit/aft-opencode-extra@1.0.0", {}];
    const r2 = fixPinnedPluginEntries([tupleColl]);
    expect(r2.changed).toBe(false);
    expect(r2.fixed).toEqual([tupleColl]);
    const objColl = { module: "@cortexkit/aft-opencode-extra@1.0.0" };
    const r3 = fixPinnedPluginEntries([objColl]);
    expect(r3.changed).toBe(false);
    expect(r3.fixed).toEqual([objColl]);
  });

  test("fixPinnedPluginEntries: partial pins and ranges are intentionally untouched", () => {
    const entries = ["@cortexkit/opencode-magic-context@0.38", "@cortexkit/aft-opencode@^0.38.0", "@cortexkit/opencode-magic-context@~1.2.3"];
    const { fixed, changed } = fixPinnedPluginEntries(entries);
    expect(changed).toBe(false);
    expect(fixed).toEqual(entries);
  });

  test("post-fix dedupe: fixed entry must not duplicate an already-@latest sibling after unionPluginArrays", () => {
    const pinned = "@cortexkit/aft-opencode@0.38.0";
    const latest = "@cortexkit/aft-opencode@latest";
    const { fixed } = fixPinnedPluginEntries([pinned, latest]);
    expect(fixed).toEqual([latest, latest]);
    const deduped = unionPluginArrays(fixed, []);
    expect(deduped).toEqual([latest]);
    // via registerGlobalPlugin path: dest has @latest, legacy has pinned → union dedupes
    // tested implicitly by register flow; explicit union check above proves dedupe
  });

  test("registerGlobalPlugin dedupes post-fix duplicate via union (AFT pinned + existing @latest)", async () => {
    const dir = tmpDir();
    const { writeFileSync } = await import("node:fs");
    writeFileSync(path.join(dir, "opencode.jsonc"), JSON.stringify({ plugin: ["@cortexkit/aft-opencode@0.38.0", "@cortexkit/aft-opencode@latest"] }));
    await registerGlobalPlugin(dir, PLUGIN_MODULE);
    const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
    // should contain single @latest, not two, plus PLUGIN_MODULE
    const aftEntries = (cfg.plugin as string[]).filter((p: string) => typeof p === "string" && p.startsWith("@cortexkit/aft-opencode"));
    expect(aftEntries).toEqual(["@cortexkit/aft-opencode@latest"]);
    expect(cfg.plugin).toContain(PLUGIN_MODULE);
    rmSync(dir, { recursive: true, force: true });
  });

  test("registerGlobalPlugin: pinned entry ONLY in legacy file is fixed and converged to disk; second run reports no further fix", async () => {
    const dir = tmpDir();
    const { writeFileSync } = await import("node:fs");
    writeFileSync(path.join(dir, "opencode.json"), JSON.stringify({ plugin: ["@cortexkit/opencode-magic-context@0.38.0"] }));
    // dest does not exist yet
    const result = await registerGlobalPlugin(dir, PLUGIN_MODULE);
    // first run may be added (new dest) or pin-fixed depending on module presence; just check files
    const legacyCfg = JSON.parse(readFileSync(path.join(dir, "opencode.json"), "utf-8"));
    expect(legacyCfg.plugin).toEqual(["@cortexkit/opencode-magic-context@latest"]);
    const destCfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
    expect(destCfg.plugin).toContain("@cortexkit/opencode-magic-context@latest");
    expect(destCfg.plugin).toContain(PLUGIN_MODULE);
    // second run should be unchanged (no further auto-fix)
    const second = await registerGlobalPlugin(dir, PLUGIN_MODULE);
    expect(second.action).toBe("unchanged");
    const legacyCfg2 = JSON.parse(readFileSync(path.join(dir, "opencode.json"), "utf-8"));
    expect(legacyCfg2.plugin).toEqual(["@cortexkit/opencode-magic-context@latest"]);
    rmSync(dir, { recursive: true, force: true });
  });

  test("registerTuiPlugin: pinned entry ONLY in legacy tui.json is converged; second run unchanged", async () => {
    const dir = tmpDir();
    const { writeFileSync } = await import("node:fs");
    writeFileSync(path.join(dir, "tui.json"), JSON.stringify({ plugin: ["@cortexkit/aft-opencode@0.38.0"] }));
    const result = await registerTuiPlugin(dir, "@cortexkit/opencode-magic-context@latest");
    const legacyCfg = JSON.parse(readFileSync(path.join(dir, "tui.json"), "utf-8"));
    expect(legacyCfg.plugin).toEqual(["@cortexkit/aft-opencode@latest"]);
    const destCfg = JSON.parse(readFileSync(path.join(dir, "tui.jsonc"), "utf-8"));
    expect(destCfg.plugin).toContain("@cortexkit/aft-opencode@latest");
    const second = await registerTuiPlugin(dir, "@cortexkit/opencode-magic-context@latest");
    expect(second.action).toBe("unchanged");
    rmSync(dir, { recursive: true, force: true });
  });

  test("registerGlobalPlugin fix-only reports pin-fixed, not added", async () => {
    const dir = tmpDir();
    const { writeFileSync } = await import("node:fs");
    writeFileSync(path.join(dir, "opencode.jsonc"), JSON.stringify({ plugin: ["@cortexkit/opencode-magic-context@0.38.0", PLUGIN_MODULE] }));
    const result = await registerGlobalPlugin(dir, PLUGIN_MODULE);
    expect(result.action).toBe("pin-fixed");
    const cfg = JSON.parse(readFileSync(path.join(dir, "opencode.jsonc"), "utf-8"));
    expect(cfg.plugin).toContain("@cortexkit/opencode-magic-context@latest");
    expect(cfg.plugin).toContain(PLUGIN_MODULE);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("plugin diagnostics routing", () => {
  test("the plugin never writes to the console (console.log leaks into the TUI stdout)", () => {
    // Verified on opencode 1.18.15: a server plugin's console.log lands in the
    // TUI's stdout stream as a stray "auto-populated" line in the input box.
    // Diagnostics must go through client.app.log() instead.
    const source = readFileSync(path.resolve(__dirname, "../src/plugin.ts"), "utf-8");
    for (const banned of ["console.log(", "console.warn(", "console.error("]) {
      expect(source).not.toContain(banned);
    }
    expect(source).toContain("client.app.log");
  });
});
