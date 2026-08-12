import { test, expect, describe } from "bun:test";
import { mkdtempSync, existsSync, readFileSync, rmSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  foldHouseStyle,
  HOUSE_STYLE_SLOT,
  hasGlobalTgoKeys,
  hasPluginEntry,
  loadAgentsFragment,
  loadHouseStyle,
  mergeAgentsFragment,
  mergeOpenCodeConfig,
  PLUGIN_MODULE,
  registerGlobalPlugin,
  registerMcpServer,
  registerTuiPlugin,
  renderSeats,
} from "../src/build";
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
    const houseStyle = await loadHouseStyle();
    const rendered = foldHouseStyle("a\n{{TGO_HOUSE_STYLE}}\nb", houseStyle);
    expect(rendered).not.toContain(HOUSE_STYLE_SLOT);
    expect(rendered).toContain("House style");
  });

  test("fold renders the register dial from the register value", async () => {
    const houseStyle = await loadHouseStyle();
    const concise = foldHouseStyle("{{TGO_HOUSE_STYLE}}", houseStyle, "concise");
    const natural = foldHouseStyle("{{TGO_HOUSE_STYLE}}", houseStyle, "natural");
    expect(concise).toContain("present in concise mode by default");
    expect(natural).toContain("present in natural mode by default");
    expect(natural).toContain("self-classify by output class");
    expect(concise).not.toContain("{{TGO_REGISTER}}");
  });

  test("templates without a slot are left untouched", async () => {
    const rendered = foldHouseStyle("plain prompt", "style");
    expect(rendered).toBe("plain prompt");
  });

  test("every rendered seat stays under the token budget in both registers", async () => {
    for (const register of ["concise", "natural"] as const) {
      const seats = await renderSeats(agentsDir, register);
      expect(seats.length).toBeGreaterThanOrEqual(7);
      for (const seat of seats) {
        const tokens = estimatePromptTokens(seat.content);
        expect(tokens).toBeLessThanOrEqual(MAX_PROMPT_TOKENS);
      }
    }
  });

  test("rendered subagents gain house style; bernstein does not", async () => {
    const seats = await renderSeats(agentsDir);
    const byName = Object.fromEntries(seats.map((s) => [s.fileName, s.content]));
    expect(byName["bernstein.md"]).not.toContain("House style");
    expect(byName["dylan.md"]).toContain("House style");
    expect(byName["cobain.md"]).toContain("House style");
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

  test("carries single-writer beads ops", () => {
    const prompt = readFileSync(path.join(agentsDir, "bernstein.md"), "utf-8");
    expect(prompt).toContain("ONLY beads operator");
    expect(prompt).toContain("Create the issue before delegating");
    expect(prompt).toContain("mark in_progress at dispatch");
    expect(prompt).toContain("close only on verified completion");
    expect(prompt).toContain("ephemeral");
  });

  test("carries stagnation detection + the re-planning ladder", () => {
    const prompt = readFileSync(path.join(agentsDir, "bernstein.md"), "utf-8");
    expect(prompt).toContain("3 identical actions");
    expect(prompt).toContain("light (tweak) → medium (reorder deps) → heavy (re-decompose)");
  });

  test("carries the doing-boundary + routing amendments", () => {
    const prompt = readFileSync(path.join(agentsDir, "bernstein.md"), "utf-8");
    expect(prompt).toContain("Never edit/grep/glob/list files");
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
