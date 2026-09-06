import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { install, isSupportedPlatform, assertSupportedPlatform, parseInstallCliArgs, getInstallErrorMessages } from "../src/install";

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "tgo-preflight-"));
}

function freshConfigDir(): string {
  // path that does NOT exist yet — to verify no mkdir on early failure
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "tgo-preflight-base-"));
  const dir = path.join(base, `cfg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  // note: base remains to be cleaned; dir itself not created
  return dir;
}

describe("installer pre-flight: platform gate", () => {
  test("isSupportedPlatform allows darwin, linux, win32", () => {
    expect(isSupportedPlatform("darwin")).toBe(true);
    expect(isSupportedPlatform("linux")).toBe(true);
    expect(isSupportedPlatform("win32")).toBe(true);
  });

  test("isSupportedPlatform rejects freebsd, sunos, aix", () => {
    expect(isSupportedPlatform("freebsd")).toBe(false);
    expect(isSupportedPlatform("sunos")).toBe(false);
    expect(isSupportedPlatform("aix")).toBe(false);
  });

  test("assertSupportedPlatform throws actionable message on unsupported", () => {
    expect(() => assertSupportedPlatform("freebsd")).toThrow(/Unsupported platform/);
    expect(() => assertSupportedPlatform("freebsd")).toThrow(/Git Bash/);
    expect(() => assertSupportedPlatform("freebsd")).toThrow(/Supported: macOS, Linux, Windows/);
    expect(() => assertSupportedPlatform("freebsd")).toThrow(/https:\/\/git-scm\.com\/downloads/);
  });

  test("assertSupportedPlatform message includes platform name", () => {
    expect(() => assertSupportedPlatform("freebsd")).toThrow(/freebsd/);
    expect(() => assertSupportedPlatform("sunos")).toThrow(/sunos/);
  });

  test("assertSupportedPlatform does not throw on supported", () => {
    expect(() => assertSupportedPlatform("darwin")).not.toThrow();
    expect(() => assertSupportedPlatform("linux")).not.toThrow();
    expect(() => assertSupportedPlatform("win32")).not.toThrow();
  });

  test("supported platform passes via install (mocked __platform)", async () => {
    const dir = tmpDir();
    try {
      const report = await install({ configDir: dir, deps: "skip", __platform: "darwin" } as any);
      expect(report.seats).toBeGreaterThan(0);
      expect(fs.existsSync(path.join(dir, "opencode.jsonc"))).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    const dir2 = tmpDir();
    try {
      const report = await install({ configDir: dir2, deps: "skip", __platform: "linux" } as any);
      expect(report.seats).toBeGreaterThan(0);
    } finally {
      fs.rmSync(dir2, { recursive: true, force: true });
    }
    const dir3 = tmpDir();
    try {
      const report = await install({ configDir: dir3, deps: "skip", __platform: "win32" } as any);
      expect(report.seats).toBeGreaterThan(0);
    } finally {
      fs.rmSync(dir3, { recursive: true, force: true });
    }
  });

  test("unsupported platform → clean early failure, zero writes", async () => {
    const cfg = freshConfigDir();
    const base = path.dirname(cfg);
    try {
      await expect(install({ configDir: cfg, deps: "skip", __platform: "freebsd" } as any)).rejects.toThrow(
        /Unsupported platform/
      );
      // no mkdir by installer — cfg dir should not exist
      expect(fs.existsSync(cfg)).toBe(false);
      // base exists but remains empty aside from not having our cfg contents
      // ensure no partial agent/opencode files leaked into base
      const baseFiles = fs.readdirSync(base);
      // base should be empty or only contain nothing we wrote
      expect(baseFiles).not.toContain("opencode.jsonc");
      expect(baseFiles).not.toContain("agent");
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }

    // also test via tmpDir pre-created empty dir stays empty
    const dir = tmpDir();
    try {
      await expect(install({ configDir: dir, deps: "skip", __platform: "freebsd" } as any)).rejects.toThrow(
        /Unsupported platform/
      );
      const files = fs.readdirSync(dir);
      expect(files.length).toBe(0); // zero writes even though dir pre-existed
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("P3-3: freebsd + skipValidation:true still rejected (gate must survive skip flag)", async () => {
    const dir = tmpDir();
    try {
      await expect(
        install({ configDir: dir, deps: "skip", __platform: "freebsd", skipValidation: true } as any)
      ).rejects.toThrow(/Unsupported platform/);
      const files = fs.readdirSync(dir);
      expect(files.length).toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }

    const cfg = freshConfigDir();
    const base = path.dirname(cfg);
    try {
      await expect(
        install({ configDir: cfg, deps: "skip", __platform: "freebsd", skipValidation: true } as any)
      ).rejects.toThrow(/Unsupported platform/);
      expect(fs.existsSync(cfg)).toBe(false);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });
});

describe("installer pre-flight: validation gate", () => {
  test("validation failure blocks all writes", async () => {
    const cfg = freshConfigDir();
    const base = path.dirname(cfg);
    try {
      await expect(
        install({
          configDir: cfg,
          deps: "skip",
          __validate: async () => {
            throw new Error("mock validation failed: voice card broken");
          },
        } as any)
      ).rejects.toThrow(/mock validation failed/);
      expect(fs.existsSync(cfg)).toBe(false);
      expect(fs.existsSync(path.join(cfg, "opencode.jsonc"))).toBe(false);
      expect(fs.existsSync(path.join(cfg, "agent"))).toBe(false);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }

    const dir = tmpDir();
    try {
      await expect(
        install({
          configDir: dir,
          deps: "skip",
          __validate: async () => {
            throw new Error("mock validation failed");
          },
        } as any)
      ).rejects.toThrow(/mock validation failed/);
      const files = fs.readdirSync(dir);
      expect(files.length).toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("--skip-validation bypasses validation failure", async () => {
    const dir = tmpDir();
    try {
      let validateCalled = false;
      const report = await install({
        configDir: dir,
        deps: "skip",
        skipValidation: true,
        __validate: async () => {
          validateCalled = true;
          throw new Error("should not be called when skipValidation true");
        },
      } as any);
      expect(validateCalled).toBe(false);
      expect(report.seats).toBeGreaterThan(0);
      expect(fs.existsSync(path.join(dir, "opencode.jsonc"))).toBe(true);
      expect(fs.existsSync(path.join(dir, "agent"))).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("skipValidation false runs validation (inject spies call)", async () => {
    const dir = tmpDir();
    try {
      let called = false;
      const report = await install({
        configDir: dir,
        deps: "skip",
        __validate: async () => {
          called = true;
        },
      } as any);
      expect(called).toBe(true);
      expect(report.seats).toBeGreaterThan(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("happy path unchanged — real validation passes and writes", async () => {
    const dir = tmpDir();
    try {
      const report = await install({ configDir: dir, deps: "skip" });
      expect(report.seats).toBeGreaterThan(0);
      expect(report.agentsMerge).toMatch(/created|appended|unchanged/);
      expect(report.globalMerge).toMatch(/created|merged|unchanged/);
      expect(report.plugin).toBeDefined();
      expect(report.pluginAction).toMatch(/added|unchanged|pin-fixed/);
      // files actually written
      expect(fs.existsSync(path.join(dir, "opencode.jsonc"))).toBe(true);
      expect(fs.existsSync(path.join(dir, "AGENTS.md"))).toBe(true);
      expect(fs.existsSync(path.join(dir, "agent"))).toBe(true);
      const agents = fs.readdirSync(path.join(dir, "agent"));
      expect(agents.length).toBeGreaterThanOrEqual(7);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("validation error message is propagated", async () => {
    const dir = tmpDir();
    try {
      await expect(
        install({
          configDir: dir,
          deps: "skip",
          __validate: async () => {
            throw new Error("preset validation: balanced dylan model missing");
          },
        } as any)
      ).rejects.toThrow(/preset validation/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("installer pre-flight: P2-2 mid-install honesty", () => {
  test("mid-install failure does NOT claim no-files-written; honest message includes target", async () => {
    const dir = tmpDir();
    try {
      let caught: any;
      try {
        await install({
          configDir: dir,
          deps: "skip",
          __afterPreFlight: async () => {
            throw new Error("mid-install boom");
          },
        } as any);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeDefined();
      expect(caught.message).toMatch(/mid-install boom/);
      // error must be flagged as mid-install
      expect((caught as any).preFlightDone).toBe(true);
      expect((caught as any).installTarget?.configDir).toBe(dir);

      const msgs = getInstallErrorMessages(caught);
      expect(msgs[0]).toMatch(/Install failed: mid-install boom/);
      expect(msgs[1]).toMatch(/install failed after pre-flight/);
      expect(msgs[1]).toMatch(new RegExp(dir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      expect(msgs[1]).not.toMatch(/No files were written/);
      expect(msgs.join("\n")).not.toMatch(/No files were written \(pre-flight gate\)/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("pre-flight failure DOES claim no-files-written (validation)", async () => {
    const dir = tmpDir();
    try {
      let caught: any;
      try {
        await install({
          configDir: dir,
          deps: "skip",
          __validate: async () => {
            throw new Error("pre-flight mock fail");
          },
        } as any);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeDefined();
      expect((caught as any).preFlightDone).toBeUndefined();
      const msgs = getInstallErrorMessages(caught);
      expect(msgs[1]).toMatch(/No files were written \(pre-flight gate\)/);
      expect(msgs[1]).not.toMatch(/install failed after pre-flight/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("pre-flight failure DOES claim no-files-written (platform gate)", async () => {
    const dir = tmpDir();
    try {
      let caught: any;
      try {
        await install({ configDir: dir, deps: "skip", __platform: "freebsd" } as any);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeDefined();
      expect((caught as any).preFlightDone).toBeUndefined();
      const msgs = getInstallErrorMessages(caught);
      expect(msgs[1]).toMatch(/No files were written \(pre-flight gate\)/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("mid-install failure via stubbed later step (validateAgentDir) is honest", async () => {
    // simulate a failure in a later step by using __afterPreFlight that mimics validateAgentDir throwing
    // but also verify the real path: stub fs.mkdir to throw after pre-flight via hook is already covered,
    // this test ensures the helper distinguishes even without explicit target
    const err: any = new Error("late boom");
    err.preFlightDone = true;
    err.installTarget = { configDir: "/tmp/fake-target" };
    const msgs = getInstallErrorMessages(err);
    expect(msgs[1]).toMatch(/install failed after pre-flight/);
    expect(msgs[1]).toMatch(/\/tmp\/fake-target/);
    expect(msgs[1]).not.toMatch(/No files were written/);
  });
});

describe("installer CLI layer: P3-4 argv parsing + exit path", () => {
  test("parseInstallCliArgs recognizes --skip-validation", () => {
    expect(parseInstallCliArgs(["--skip-validation"]).skipValidation).toBe(true);
    expect(parseInstallCliArgs([]).skipValidation).toBe(false);
    expect(parseInstallCliArgs(["--skip-validation", "--deps", "skip"]).skipValidation).toBe(true);
  });

  test("parseInstallCliArgs handles --configDir and --agentsSubdir", () => {
    const a = parseInstallCliArgs(["--configDir", "/tmp/cfg", "--agentsSubdir", "my-agent"]);
    expect(a.configDir).toBe("/tmp/cfg");
    expect(a.agentsSubdir).toBe("my-agent");
    expect(parseInstallCliArgs([]).configDir).toBeUndefined();
  });

  test("parseInstallCliArgs handles --deps modes", () => {
    expect(parseInstallCliArgs(["--deps", "skip"]).deps).toBe("skip");
    expect(parseInstallCliArgs(["--deps", "check"]).deps).toBe("check");
    expect(parseInstallCliArgs(["--deps", "auto"]).deps).toBe("auto");
    expect(parseInstallCliArgs([]).deps).toBe("auto");
  });

  test("parseInstallCliArgs handles --register and --no-register", () => {
    expect(parseInstallCliArgs(["--no-register"]).register).toBe(false);
    expect(parseInstallCliArgs(["--register", "my-module"]).register).toBe("my-module");
    expect(parseInstallCliArgs([]).register).toBe(true);
    expect(parseInstallCliArgs(["--register"]).register).toBe(true);
    // --no-register takes precedence
    expect(parseInstallCliArgs(["--register", "x", "--no-register"]).register).toBe(false);
  });

  test("parseInstallCliArgs handles --no-bg", () => {
    expect(parseInstallCliArgs(["--no-bg"]).backgroundSubagents).toBe(false);
    expect(parseInstallCliArgs([]).backgroundSubagents).toBeUndefined();
  });

  test("parseInstallCliArgs ignores unknown args (current behavior)", () => {
    const a = parseInstallCliArgs(["--unknown", "foo", "--skip-validation", "--bogus"]);
    expect(a.skipValidation).toBe(true);
    // unknown args do not throw
    expect(() => parseInstallCliArgs(["--unknown", "--another"])).not.toThrow();
    const b = parseInstallCliArgs(["--unknown", "--configDir", "/tmp/x"]);
    expect(b.configDir).toBe("/tmp/x");
  });

  test("CLI exit-1 path on gate failure: getInstallErrorMessages produces pre-flight exit messages", () => {
    const err = new Error('Unsupported platform "freebsd". Supported: macOS, Linux, Windows (Git Bash recommended): https://git-scm.com/downloads');
    const msgs = getInstallErrorMessages(err);
    expect(msgs[0]).toMatch(/Install failed:/);
    expect(msgs[0]).toMatch(/Unsupported platform/);
    expect(msgs[1]).toMatch(/No files were written \(pre-flight gate\)/);
    // simulate CLI catch would process.exit(1) — verify we have exactly 2 lines and process.exit would be called
    expect(msgs.length).toBe(2);
  });

  test("CLI mid-install exit path would print honest message not pre-flight claim", () => {
    const err: any = new Error("something late broke");
    err.preFlightDone = true;
    err.installTarget = { configDir: "/tmp/partial" };
    const msgs = getInstallErrorMessages(err);
    expect(msgs[1]).toMatch(/install failed after pre-flight/);
    expect(msgs[1]).not.toMatch(/No files were written/);
    expect(msgs.length).toBe(2);
  });

  test("parseInstallCliArgs whitelist: only recognized flags affect output", () => {
    const base = parseInstallCliArgs([]);
    const withUnknown = parseInstallCliArgs(["--unknown-flag", "val", "--another"]);
    expect(withUnknown).toEqual(base);
    const withKnown = parseInstallCliArgs(["--skip-validation"]);
    expect(withKnown.skipValidation).toBe(true);
    expect(withKnown).not.toEqual(base);
  });
});
