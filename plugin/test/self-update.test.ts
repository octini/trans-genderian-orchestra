import { describe, expect, test, afterEach, beforeEach } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { mkdtempSync, rmSync } from "node:fs";
import {
  buildInstallArgs,
  buildInstallCommand,
  resolveCacheRoot,
  shouldRefresh,
  slotDirs,
  selfUpdate,
  semverGt,
  recoverOrphans,
  LOCK_STALE_MS,
} from "../src/self-update";

const PKG = "trans-genderian-orchestra";

function tmpBase(): string {
  return mkdtempSync(path.join(os.tmpdir(), "tgo-selfupdate-"));
}

// helper to extract prefix dir from either string or args array
function extractDir(cmd: string | string[]): string {
  if (Array.isArray(cmd)) {
    const idx = cmd.indexOf("--prefix");
    if (idx !== -1) return cmd[idx + 1] ?? "";
    return "";
  }
  const match = cmd.match(/--prefix\s+(\S+)/);
  return match ? match[1] : "";
}

// -- shouldRefresh --

describe("shouldRefresh", () => {
  test("gt true", () => {
    expect(shouldRefresh("0.2.0", "0.2.1")).toBe(true);
    expect(shouldRefresh("1.0.0", "1.1.0")).toBe(true);
    expect(shouldRefresh("1.2.3", "2.0.0")).toBe(true);
  });
  test("equal false", () => {
    expect(shouldRefresh("0.2.0", "0.2.0")).toBe(false);
    expect(shouldRefresh("1.0.0", "1.0.0")).toBe(false);
  });
  test("downgrade false", () => {
    expect(shouldRefresh("0.2.1", "0.2.0")).toBe(false);
    expect(shouldRefresh("2.0.0", "1.9.9")).toBe(false);
  });
  test("invalid semver false", () => {
    expect(shouldRefresh("0.2.0", "not-a-version")).toBe(false);
    expect(shouldRefresh("0.2.0", "")).toBe(false);
    expect(shouldRefresh("0.2.0", "1.0")).toBe(false);
    expect(shouldRefresh("0.2.0", "latest")).toBe(false);
  });
  test("handles v prefix", () => {
    expect(shouldRefresh("v0.2.0", "v0.2.1")).toBe(true);
    expect(shouldRefresh("0.2.0", "v0.2.1")).toBe(true);
  });
  test("pre-release is less than release", () => {
    expect(shouldRefresh("1.0.0", "1.0.0-beta")).toBe(false);
    expect(shouldRefresh("1.0.0-beta", "1.0.0")).toBe(true);
  });
});

// -- semverGt --

describe("semverGt", () => {
  test("0.2.1 vs 0.2.1 false", () => {
    expect(semverGt("0.2.1", "0.2.1")).toBe(false);
  });
  test("0.3.0-beta.1 vs 0.2.1 true", () => {
    expect(semverGt("0.3.0-beta.1", "0.2.1")).toBe(true);
  });
  test("1.0.0-beta.10 vs 1.0.0-beta.2 true numeric", () => {
    expect(semverGt("1.0.0-beta.10", "1.0.0-beta.2")).toBe(true);
    expect(semverGt("1.0.0-beta.2", "1.0.0-beta.10")).toBe(false);
  });
  test("1.0.0-beta.1 vs 1.0.0-alpha true numeric < alphanumeric", () => {
    expect(semverGt("1.0.0-beta.1", "1.0.0-alpha")).toBe(true);
    expect(semverGt("1.0.0-alpha", "1.0.0-beta.1")).toBe(false);
  });
  test("build metadata ignored", () => {
    expect(semverGt("1.0.0+build", "1.0.0")).toBe(false);
    expect(semverGt("1.0.0", "1.0.0+build")).toBe(false);
    expect(semverGt("1.0.0+build.1", "1.0.0+build.2")).toBe(false);
  });
  test("invalid → false", () => {
    expect(semverGt("not-a-version", "1.0.0")).toBe(false);
    expect(semverGt("1.0.0", "not-a-version")).toBe(false);
    expect(semverGt("1.0", "1.0.0")).toBe(false);
    expect(semverGt("", "1.0.0")).toBe(false);
    expect(semverGt("1.0.0", "")).toBe(false);
  });
  test("numeric < alphanumeric precedence", () => {
    expect(semverGt("1.0.0-alpha.beta", "1.0.0-alpha.1")).toBe(true);
    expect(semverGt("1.0.0-alpha.1", "1.0.0-alpha.beta")).toBe(false);
  });
  test("shorter prerelease < longer when prefixes equal", () => {
    expect(semverGt("1.0.0-alpha.1", "1.0.0-alpha")).toBe(true);
    expect(semverGt("1.0.0-alpha", "1.0.0-alpha.1")).toBe(false);
  });
  test("release > prerelease", () => {
    expect(semverGt("1.0.0", "1.0.0-beta.1")).toBe(true);
    expect(semverGt("1.0.0-beta.1", "1.0.0")).toBe(false);
  });
});

// -- resolveCacheRoot --

describe("resolveCacheRoot", () => {
  let savedOpen: string | undefined;
  let savedXdg: string | undefined;
  beforeEach(() => {
    savedOpen = process.env.OPENCODE_TEST_HOME;
    savedXdg = process.env.XDG_CACHE_HOME;
  });
  afterEach(() => {
    if (savedOpen === undefined) delete process.env.OPENCODE_TEST_HOME;
    else process.env.OPENCODE_TEST_HOME = savedOpen;
    if (savedXdg === undefined) delete process.env.XDG_CACHE_HOME;
    else process.env.XDG_CACHE_HOME = savedXdg;
  });

  test("OPENCODE_TEST_HOME takes precedence over XDG and homeDir", () => {
    process.env.OPENCODE_TEST_HOME = "/tmp/test-home";
    process.env.XDG_CACHE_HOME = "/tmp/xdg";
    expect(resolveCacheRoot("/home/fake")).toBe(path.join("/tmp/test-home", "opencode"));
  });

  test("XDG_CACHE_HOME override when OPENCODE_TEST_HOME not set", () => {
    delete process.env.OPENCODE_TEST_HOME;
    process.env.XDG_CACHE_HOME = "/tmp/xdg-cache";
    expect(resolveCacheRoot("/home/fake")).toBe(path.join("/tmp/xdg-cache", "opencode"));
  });

  test("falls back to homeDir/.cache when no env", () => {
    delete process.env.OPENCODE_TEST_HOME;
    delete process.env.XDG_CACHE_HOME;
    expect(resolveCacheRoot("/home/fake")).toBe(path.join("/home/fake", ".cache", "opencode"));
  });

  test("defaults to os.homedir() when no homeDir and no env", () => {
    delete process.env.OPENCODE_TEST_HOME;
    delete process.env.XDG_CACHE_HOME;
    expect(resolveCacheRoot()).toBe(path.join(os.homedir(), ".cache", "opencode"));
  });
});

// -- slotDirs --

describe("slotDirs", () => {
  let base: string;
  let cacheRoot: string;
  let savedOpen: string | undefined;
  let savedXdg: string | undefined;
  beforeEach(() => {
    savedOpen = process.env.OPENCODE_TEST_HOME;
    savedXdg = process.env.XDG_CACHE_HOME;
    base = tmpBase();
    cacheRoot = path.join(base, "opencode");
  });
  afterEach(() => {
    if (savedOpen === undefined) delete process.env.OPENCODE_TEST_HOME;
    else process.env.OPENCODE_TEST_HOME = savedOpen;
    if (savedXdg === undefined) delete process.env.XDG_CACHE_HOME;
    else process.env.XDG_CACHE_HOME = savedXdg;
    rmSync(base, { recursive: true, force: true });
  });

  test("returns only existing dirs", async () => {
    const a = path.join(cacheRoot, "packages", `${PKG}@latest`);
    const b = path.join(cacheRoot, "packages", PKG);
    await fs.mkdir(a, { recursive: true });
    expect(slotDirs(cacheRoot, PKG)).toEqual([a]);
    await fs.mkdir(b, { recursive: true });
    expect(slotDirs(cacheRoot, PKG)).toEqual([a, b]);
  });

  test("returns empty when none exist", () => {
    expect(slotDirs(cacheRoot, PKG)).toEqual([]);
  });

  test("order is @latest first then base", async () => {
    const a = path.join(cacheRoot, "packages", `${PKG}@latest`);
    const b = path.join(cacheRoot, "packages", PKG);
    await fs.mkdir(a, { recursive: true });
    await fs.mkdir(b, { recursive: true });
    const dirs = slotDirs(cacheRoot, PKG);
    expect(dirs[0]).toBe(a);
    expect(dirs[1]).toBe(b);
  });

  test("resolveCacheRoot + slotDirs integration via XDG env", async () => {
    delete process.env.OPENCODE_TEST_HOME;
    process.env.XDG_CACHE_HOME = base;
    const resolved = resolveCacheRoot("/home/fake");
    expect(resolved).toBe(path.join(base, "opencode"));
    const a = path.join(resolved, "packages", `${PKG}@latest`);
    await fs.mkdir(a, { recursive: true });
    expect(slotDirs(resolved, PKG)).toEqual([a]);
  });
});

// -- buildInstallArgs + buildInstallCommand --

describe("buildInstallCommand", () => {
  test("shape matches spec (string shim)", () => {
    expect(buildInstallCommand("/tmp/dir", PKG)).toBe(
      `npm install --prefix /tmp/dir ${PKG}@latest --save-exact --ignore-scripts --no-audit --no-fund`
    );
  });
  test("includes dir and pkg correctly (string shim)", () => {
    const dir = "/cache/opencode/packages/pkg@latest";
    expect(buildInstallCommand(dir, "my-pkg")).toBe(
      `npm install --prefix ${dir} my-pkg@latest --save-exact --ignore-scripts --no-audit --no-fund`
    );
  });
});

describe("buildInstallArgs", () => {
  test("shape matches spec (array)", () => {
    expect(buildInstallArgs("/tmp/dir", PKG)).toEqual([
      "npm",
      "install",
      "--prefix",
      "/tmp/dir",
      `${PKG}@latest`,
      "--save-exact",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ]);
  });
  test("includes dir and pkg correctly (array)", () => {
    const dir = "/cache/opencode/packages/pkg@latest";
    expect(buildInstallArgs(dir, "my-pkg")).toEqual([
      "npm",
      "install",
      "--prefix",
      dir,
      "my-pkg@latest",
      "--save-exact",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ]);
  });
  test("has no shell metacharacters and passes dir as single argv element", () => {
    const dir = "/tmp/dir with space; echo pwned";
    const args = buildInstallArgs(dir, PKG);
    // dir must be single element at index 3
    expect(args[3]).toBe(dir);
    // no arg should contain shell metacharacters that would be interpreted by shell
    const shellMeta = /[;&|`$(){}[\]!*?<>]/;
    // The dir itself may contain them, but it is a single argv element, not shell-interpreted.
    // The command prefix args should not contain shell syntax
    for (let i = 0; i < args.length; i++) {
      if (i === 3) continue; // dir is user data, but must be single element (already checked)
      expect(args[i]).not.toMatch(shellMeta);
    }
    // ensure no shell string like "/bin/sh"
    expect(args).not.toContain("/bin/sh");
    expect(args).not.toContain("-c");
  });
  test("lock stale threshold 120000", () => {
    expect(LOCK_STALE_MS).toBe(120_000);
  });
});

// -- selfUpdate flow --

describe("selfUpdate", () => {
  let base: string;
  let cacheRoot: string;
  let savedOpen: string | undefined;
  let savedXdg: string | undefined;

  beforeEach(() => {
    savedOpen = process.env.OPENCODE_TEST_HOME;
    savedXdg = process.env.XDG_CACHE_HOME;
    base = tmpBase();
    cacheRoot = path.join(base, "opencode");
    process.env.OPENCODE_TEST_HOME = base;
    delete process.env.XDG_CACHE_HOME;
  });

  afterEach(() => {
    if (savedOpen === undefined) delete process.env.OPENCODE_TEST_HOME;
    else process.env.OPENCODE_TEST_HOME = savedOpen;
    if (savedXdg === undefined) delete process.env.XDG_CACHE_HOME;
    else process.env.XDG_CACHE_HOME = savedXdg;
    rmSync(base, { recursive: true, force: true });
  });

  test("drift triggers install command with correct dir + pkg (staging swap)", async () => {
    const dirA = path.join(cacheRoot, "packages", `${PKG}@latest`);
    const dirB = path.join(cacheRoot, "packages", PKG);
    await fs.mkdir(dirA, { recursive: true });
    await fs.mkdir(dirB, { recursive: true });
    await fs.writeFile(path.join(dirA, "package-lock.json"), "{}", "utf-8");
    await fs.writeFile(path.join(dirB, "package-lock.json"), "{}", "utf-8");
    await fs.writeFile(path.join(dirA, "sentinel.txt"), "keep", "utf-8");

    const spawnCalls: string[][] = [];
    const logs: Array<{ level: string; msg: string }> = [];

    const spawn = async (args: string[]) => {
      spawnCalls.push(args);
      const dir = extractDir(args);
      if (dir) {
        const pkgPath = path.join(dir, "node_modules", PKG, "package.json");
        await fs.mkdir(path.dirname(pkgPath), { recursive: true });
        await fs.writeFile(pkgPath, JSON.stringify({ version: "0.2.1" }), "utf-8");
      }
      return { exitCode: 0, stdout: "", stderr: "" };
    };

    await selfUpdate({
      runningVersion: "0.2.0",
      pkgName: PKG,
      fetchLatest: async () => "0.2.1",
      spawn: spawn as any,
      log: (level, msg) => logs.push({ level, msg }),
    });

    expect(spawnCalls).toHaveLength(2);
    expect(spawnCalls[0]).toEqual(buildInstallArgs(`${dirA}.tgo-staging`, PKG));
    expect(spawnCalls[1]).toEqual(buildInstallArgs(`${dirB}.tgo-staging`, PKG));
    for (const args of spawnCalls) {
      expect(args).toContain(`${PKG}@latest`);
      expect(args).toContain("--save-exact");
      expect(args).toContain("--ignore-scripts");
    }
    // original package-lock untouched (never deleted in live slot)
    await expect(fs.stat(path.join(dirA, "package-lock.json"))).resolves.toBeDefined();
    await expect(fs.stat(path.join(dirB, "package-lock.json"))).resolves.toBeDefined();
    // staging cleaned
    await expect(fs.stat(`${dirA}.tgo-staging`)).rejects.toThrow();
    await expect(fs.stat(`${dirB}.tgo-staging`)).rejects.toThrow();
    // backup gone
    await expect(fs.stat(`${dirA}.tgo-backup`)).rejects.toThrow();
    await expect(fs.stat(`${dirB}.tgo-backup`)).rejects.toThrow();
    // inner version = new after swap
    const rawA = await fs.readFile(path.join(dirA, "node_modules", PKG, "package.json"), "utf-8");
    expect(JSON.parse(rawA).version).toBe("0.2.1");
    const rawB = await fs.readFile(path.join(dirB, "node_modules", PKG, "package.json"), "utf-8");
    expect(JSON.parse(rawB).version).toBe("0.2.1");
    // sentinel still present via copy
    expect(await fs.readFile(path.join(dirA, "sentinel.txt"), "utf-8")).toBe("keep");
    const infos = logs.filter((l) => l.level === "info");
    expect(infos.length).toBeGreaterThanOrEqual(1);
    expect(infos[0]!.msg).toContain(`self-updated ${PKG} to 0.2.1`);
    expect(infos[0]!.msg).toContain("restart opencode to activate");
    await expect(fs.stat(path.join(dirA, ".tgo-selfupdate.lock"))).rejects.toThrow();
    await expect(fs.stat(path.join(dirB, ".tgo-selfupdate.lock"))).rejects.toThrow();
  });

  test("no-drift no-spawn", async () => {
    const dirA = path.join(cacheRoot, "packages", `${PKG}@latest`);
    await fs.mkdir(dirA, { recursive: true });
    const spawnCalls: string[][] = [];
    await selfUpdate({
      runningVersion: "0.2.1",
      pkgName: PKG,
      fetchLatest: async () => "0.2.1",
      spawn: async (args) => {
        spawnCalls.push(args as any);
        return { exitCode: 0, stdout: "", stderr: "" };
      },
      log: () => {},
    });
    expect(spawnCalls).toHaveLength(0);
  });

  test("downgrade no-spawn", async () => {
    const dirA = path.join(cacheRoot, "packages", `${PKG}@latest`);
    await fs.mkdir(dirA, { recursive: true });
    const spawnCalls: string[][] = [];
    await selfUpdate({
      runningVersion: "0.2.1",
      pkgName: PKG,
      fetchLatest: async () => "0.2.0",
      spawn: async (args) => {
        spawnCalls.push(args as any);
        return { exitCode: 0, stdout: "", stderr: "" };
      },
      log: () => {},
    });
    expect(spawnCalls).toHaveLength(0);
  });

  test("fetch failure silent", async () => {
    const dirA = path.join(cacheRoot, "packages", `${PKG}@latest`);
    await fs.mkdir(dirA, { recursive: true });
    const spawnCalls: string[][] = [];
    const logs: Array<{ level: string; msg: string }> = [];
    await expect(
      selfUpdate({
        runningVersion: "0.2.0",
        pkgName: PKG,
        fetchLatest: async () => undefined,
        spawn: async (args) => {
          spawnCalls.push(args as any);
          return { exitCode: 0, stdout: "", stderr: "" };
        },
        log: (level, msg) => logs.push({ level, msg }),
      })
    ).resolves.toBeUndefined();
    expect(spawnCalls).toHaveLength(0);

    await expect(
      selfUpdate({
        runningVersion: "0.2.0",
        pkgName: PKG,
        fetchLatest: async () => {
          throw new Error("network down");
        },
        spawn: async (args) => {
          spawnCalls.push(args as any);
          return { exitCode: 0, stdout: "", stderr: "" };
        },
        log: () => {},
      })
    ).resolves.toBeUndefined();
    expect(spawnCalls).toHaveLength(0);
  });

  test("spawn failure warn + continue (staging cleaned, original intact)", async () => {
    const dirA = path.join(cacheRoot, "packages", `${PKG}@latest`);
    const dirB = path.join(cacheRoot, "packages", PKG);
    await fs.mkdir(dirA, { recursive: true });
    await fs.mkdir(dirB, { recursive: true });
    // put sentinel content to verify original untouched after failure
    await fs.writeFile(path.join(dirA, "keep.txt"), "original-A", "utf-8");
    await fs.writeFile(path.join(dirB, "keep.txt"), "original-B", "utf-8");
    const spawnCalls: string[][] = [];
    const logs: Array<{ level: string; msg: string }> = [];
    const spawn = async (args: string[]) => {
      spawnCalls.push(args);
      if (spawnCalls.length === 1) {
        return { exitCode: 1, stdout: "", stderr: "npm error" };
      }
      return { exitCode: 1, stdout: "", stderr: "npm error 2" };
    };
    await selfUpdate({
      runningVersion: "0.2.0",
      pkgName: PKG,
      fetchLatest: async () => "0.2.1",
      spawn: spawn as any,
      log: (level, msg) => logs.push({ level, msg }),
    });
    expect(spawnCalls).toHaveLength(2);
    const warns = logs.filter((l) => l.level === "warn");
    expect(warns.length).toBeGreaterThanOrEqual(2);
    // staging cleaned after failure
    await expect(fs.stat(`${dirA}.tgo-staging`)).rejects.toThrow();
    await expect(fs.stat(`${dirB}.tgo-staging`)).rejects.toThrow();
    // original intact
    expect(await fs.readFile(path.join(dirA, "keep.txt"), "utf-8")).toBe("original-A");
    expect(await fs.readFile(path.join(dirB, "keep.txt"), "utf-8")).toBe("original-B");
    // backup gone
    await expect(fs.stat(`${dirA}.tgo-backup`)).rejects.toThrow();
    await expect(fs.stat(`${dirB}.tgo-backup`)).rejects.toThrow();
    await expect(fs.stat(path.join(dirA, ".tgo-selfupdate.lock"))).rejects.toThrow();
    await expect(fs.stat(path.join(dirB, ".tgo-selfupdate.lock"))).rejects.toThrow();
  });

  test("spawn throws still warn and continue and lock released", async () => {
    const dirA = path.join(cacheRoot, "packages", `${PKG}@latest`);
    await fs.mkdir(dirA, { recursive: true });
    await fs.writeFile(path.join(dirA, "keep.txt"), "orig", "utf-8");
    const logs: Array<{ level: string; msg: string }> = [];
    await selfUpdate({
      runningVersion: "0.2.0",
      pkgName: PKG,
      fetchLatest: async () => "0.2.1",
      spawn: async () => {
        throw new Error("spawn exploded");
      },
      log: (level, msg) => logs.push({ level, msg }),
    });
    const warns = logs.filter((l) => l.level === "warn");
    expect(warns.length).toBeGreaterThanOrEqual(1);
    await expect(fs.stat(path.join(dirA, ".tgo-selfupdate.lock"))).rejects.toThrow();
    await expect(fs.stat(`${dirA}.tgo-staging`)).rejects.toThrow();
    expect(await fs.readFile(path.join(dirA, "keep.txt"), "utf-8")).toBe("orig");
  });

  test("lock released even on success", async () => {
    const dirA = path.join(cacheRoot, "packages", `${PKG}@latest`);
    await fs.mkdir(dirA, { recursive: true });
    await selfUpdate({
      runningVersion: "0.2.0",
      pkgName: PKG,
      fetchLatest: async () => "0.2.1",
      spawn: async (args) => {
        const dir = extractDir(args as any);
        if (dir) {
          const pkgPath = path.join(dir, "node_modules", PKG, "package.json");
          await fs.mkdir(path.dirname(pkgPath), { recursive: true });
          await fs.writeFile(pkgPath, JSON.stringify({ version: "0.2.1" }), "utf-8");
        }
        return { exitCode: 0, stdout: "", stderr: "" };
      },
      log: () => {},
    });
    await expect(fs.stat(path.join(dirA, ".tgo-selfupdate.lock"))).rejects.toThrow();
    await expect(fs.stat(`${dirA}.tgo-staging`)).rejects.toThrow();
    await expect(fs.stat(`${dirA}.tgo-backup`)).rejects.toThrow();
  });

  test("never throws on any failure", async () => {
    const dirA = path.join(cacheRoot, "packages", `${PKG}@latest`);
    await fs.mkdir(dirA, { recursive: true });
    await expect(
      selfUpdate({
        runningVersion: "0.2.0",
        pkgName: PKG,
        fetchLatest: async () => {
          throw new Error("boom");
        },
        spawn: async () => {
          throw new Error("boom2");
        },
        log: () => {
          throw new Error("log boom");
        },
      })
    ).resolves.toBeUndefined();

    await expect(
      selfUpdate({
        runningVersion: "0.2.0",
        pkgName: PKG,
        fetchLatest: async () => "0.2.1",
        spawn: async () => {
          throw new Error("spawn fail");
        },
        log: () => {},
      })
    ).resolves.toBeUndefined();
  });

  test("stale lock is broken and install proceeds", async () => {
    const dirA = path.join(cacheRoot, "packages", `${PKG}@latest`);
    await fs.mkdir(dirA, { recursive: true });
    const lockPath = path.join(dirA, ".tgo-selfupdate.lock");
    await fs.writeFile(lockPath, "old-owner", "utf-8");
    const old = new Date(Date.now() - 180_000);
    await fs.utimes(lockPath, old, old);

    const spawnCalls: string[][] = [];
    const logs: Array<{ level: string; msg: string }> = [];
    await selfUpdate({
      runningVersion: "0.2.0",
      pkgName: PKG,
      fetchLatest: async () => "0.2.1",
      spawn: async (args) => {
        spawnCalls.push(args as any);
        const dir = extractDir(args as any);
        if (dir) {
          const pkgPath = path.join(dir, "node_modules", PKG, "package.json");
          await fs.mkdir(path.dirname(pkgPath), { recursive: true });
          await fs.writeFile(pkgPath, JSON.stringify({ version: "0.2.1" }), "utf-8");
        }
        return { exitCode: 0, stdout: "", stderr: "" };
      },
      log: (level, msg) => logs.push({ level, msg }),
      now: () => new Date(),
    });
    expect(spawnCalls).toHaveLength(1);
    await expect(fs.stat(lockPath)).rejects.toThrow();
    await expect(fs.stat(`${dirA}.tgo-staging`)).rejects.toThrow();
    await expect(fs.stat(`${dirA}.tgo-backup`)).rejects.toThrow();
  });

  test("fresh lock is respected and skipped", async () => {
    const dirA = path.join(cacheRoot, "packages", `${PKG}@latest`);
    await fs.mkdir(dirA, { recursive: true });
    const lockPath = path.join(dirA, ".tgo-selfupdate.lock");
    await fs.writeFile(lockPath, "someone-else", "utf-8");
    const now = new Date();
    await fs.utimes(lockPath, now, now);

    const spawnCalls: string[][] = [];
    await selfUpdate({
      runningVersion: "0.2.0",
      pkgName: PKG,
      fetchLatest: async () => "0.2.1",
      spawn: async (args) => {
        spawnCalls.push(args as any);
        return { exitCode: 0, stdout: "", stderr: "" };
      },
      log: () => {},
      now: () => new Date(),
    });
    expect(spawnCalls).toHaveLength(0);
    const content = await fs.readFile(lockPath, "utf-8");
    expect(content).toBe("someone-else");
  });

  test("npm failure mid-flow → original slot content intact, staging cleaned, warn logged", async () => {
    const dirA = path.join(cacheRoot, "packages", `${PKG}@latest`);
    await fs.mkdir(dirA, { recursive: true });
    await fs.writeFile(path.join(dirA, "original.txt"), "keep-me", "utf-8");
    await fs.writeFile(path.join(dirA, "package.json"), JSON.stringify({ version: "0.2.0" }), "utf-8");
    const staging = `${dirA}.tgo-staging`;
    const logs: Array<{ level: string; msg: string }> = [];
    await selfUpdate({
      runningVersion: "0.2.0",
      pkgName: PKG,
      fetchLatest: async () => "0.2.5",
      spawn: async () => ({ exitCode: 1, stdout: "", stderr: "npm failed" }),
      log: (level, msg) => logs.push({ level, msg }),
    });
    // original intact
    expect(await fs.readFile(path.join(dirA, "original.txt"), "utf-8")).toBe("keep-me");
    // staging cleaned
    await expect(fs.stat(staging)).rejects.toThrow();
    // warn logged
    expect(logs.some((l) => l.level === "warn")).toBe(true);
    // lock released
    await expect(fs.stat(path.join(dirA, ".tgo-selfupdate.lock"))).rejects.toThrow();
    // backup gone
    await expect(fs.stat(`${dirA}.tgo-backup`)).rejects.toThrow();
  });

  test("success → slot swapped, backup gone, inner version = new", async () => {
    const dirA = path.join(cacheRoot, "packages", `${PKG}@latest`);
    await fs.mkdir(dirA, { recursive: true });
    await fs.writeFile(path.join(dirA, "original.txt"), "keep-me", "utf-8");
    await fs.writeFile(path.join(dirA, "package.json"), JSON.stringify({ name: PKG, version: "0.2.0" }), "utf-8");
    const logs: Array<{ level: string; msg: string }> = [];
    await selfUpdate({
      runningVersion: "0.2.0",
      pkgName: PKG,
      fetchLatest: async () => "0.2.1",
      spawn: async (args) => {
        const dir = extractDir(args as any);
        const pkgPath = path.join(dir, "node_modules", PKG, "package.json");
        await fs.mkdir(path.dirname(pkgPath), { recursive: true });
        await fs.writeFile(pkgPath, JSON.stringify({ version: "0.2.1" }), "utf-8");
        // also modify staging's original.txt to simulate copy then install doesn't delete original content
        return { exitCode: 0, stdout: "", stderr: "" };
      },
      log: (level, msg) => logs.push({ level, msg }),
    });
    await expect(fs.stat(`${dirA}.tgo-staging`)).rejects.toThrow();
    await expect(fs.stat(`${dirA}.tgo-backup`)).rejects.toThrow();
    const inner = JSON.parse(await fs.readFile(path.join(dirA, "node_modules", PKG, "package.json"), "utf-8"));
    expect(inner.version).toBe("0.2.1");
    // original.txt still present after swap (copied)
    expect(await fs.readFile(path.join(dirA, "original.txt"), "utf-8")).toBe("keep-me");
    expect(logs.some((l) => l.level === "info" && l.msg.includes("self-updated"))).toBe(true);
  });
});

// -- config wiring --

describe("selfUpdate config", () => {
  test("defaults to enabled", async () => {
    const { loadTgoConfig } = await import("../src/config");
    const cfg = await loadTgoConfig({});
    expect(cfg.selfUpdate?.enabled).toBe(true);
  });
  test("can be disabled", async () => {
    const { loadTgoConfig } = await import("../src/config");
    const cfg = await loadTgoConfig({ selfUpdate: { enabled: false } });
    expect(cfg.selfUpdate?.enabled).toBe(false);
  });
});

// -- recoverOrphans --

describe("recoverOrphans", () => {
  let base: string;
  beforeEach(() => {
    base = tmpBase();
  });
  afterEach(() => {
    rmSync(base, { recursive: true, force: true });
  });

  test("dir missing + backup present → restores it", async () => {
    const dir = path.join(base, "pkg");
    const backup = `${dir}.tgo-backup`;
    await fs.mkdir(backup, { recursive: true });
    await fs.writeFile(path.join(backup, "marker.txt"), "backup-content", "utf-8");
    await expect(fs.stat(dir)).rejects.toThrow();
    await expect(recoverOrphans(dir)).resolves.toBeUndefined();
    const restored = await fs.stat(dir);
    expect(restored.isDirectory()).toBe(true);
    expect(await fs.readFile(path.join(dir, "marker.txt"), "utf-8")).toBe("backup-content");
    await expect(fs.stat(backup)).rejects.toThrow();
  });

  test("dir present + staging/backup orphans → cleaned", async () => {
    const dir = path.join(base, "pkg");
    const staging = `${dir}.tgo-staging`;
    const backup = `${dir}.tgo-backup`;
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "keep.txt"), "keep", "utf-8");
    await fs.mkdir(staging, { recursive: true });
    await fs.writeFile(path.join(staging, "junk.txt"), "junk", "utf-8");
    await fs.mkdir(backup, { recursive: true });
    await fs.writeFile(path.join(backup, "old.txt"), "old", "utf-8");
    await expect(recoverOrphans(dir)).resolves.toBeUndefined();
    await expect(fs.stat(staging)).rejects.toThrow();
    await expect(fs.stat(backup)).rejects.toThrow();
    expect(await fs.readFile(path.join(dir, "keep.txt"), "utf-8")).toBe("keep");
  });

  test("neither → no-op, no throw", async () => {
    const dir = path.join(base, "pkg-missing");
    const staging = `${dir}.tgo-staging`;
    const backup = `${dir}.tgo-backup`;
    await expect(fs.stat(dir)).rejects.toThrow();
    await expect(fs.stat(staging)).rejects.toThrow();
    await expect(fs.stat(backup)).rejects.toThrow();
    await expect(recoverOrphans(dir)).resolves.toBeUndefined();
    await expect(fs.stat(dir)).rejects.toThrow();
    await expect(fs.stat(staging)).rejects.toThrow();
    await expect(fs.stat(backup)).rejects.toThrow();
  });

  test("dir present without orphans → no-op, no throw", async () => {
    const dir = path.join(base, "pkg-clean");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "keep.txt"), "keep", "utf-8");
    await expect(recoverOrphans(dir)).resolves.toBeUndefined();
    expect(await fs.readFile(path.join(dir, "keep.txt"), "utf-8")).toBe("keep");
    await expect(fs.stat(`${dir}.tgo-staging`)).rejects.toThrow();
    await expect(fs.stat(`${dir}.tgo-backup`)).rejects.toThrow();
  });
});

// -- tgo-vtn additions: semverGt edges, build-metadata stripping, shouldRefresh malformed --

describe("semverGt edges (tgo-vtn)", () => {
  test("v prefix is stripped", () => {
    expect(semverGt("v1.0.1", "v1.0.0")).toBe(true);
    expect(semverGt("v1.0.0", "1.0.0")).toBe(false);
    expect(semverGt("1.0.1", "v1.0.0")).toBe(true);
  });
  test("equal versions with and without build metadata are not gt", () => {
    expect(semverGt("1.0.0+build.1", "1.0.0+build.2")).toBe(false);
    expect(semverGt("1.0.0+abc", "1.0.0")).toBe(false);
    expect(semverGt("1.0.0", "1.0.0+xyz")).toBe(false);
  });
  test("build metadata stripped before prerelease comparison", () => {
    // parseSemver strips +metadata, so these should be equal not gt
    expect(semverGt("1.0.0-alpha+001", "1.0.0-alpha+002")).toBe(false);
    expect(semverGt("1.0.0-alpha+001", "1.0.0-alpha")).toBe(false);
    expect(semverGt("1.0.0+build", "1.0.0-alpha")).toBe(true);
  });
  test("lexical prerelease vs numeric precedence", () => {
    expect(semverGt("1.0.0-alpha.2", "1.0.0-alpha.1")).toBe(true);
    expect(semverGt("1.0.0-alpha.1", "1.0.0-alpha.2")).toBe(false);
    expect(semverGt("1.0.0-1", "1.0.0-alpha")).toBe(false);
    expect(semverGt("1.0.0-alpha", "1.0.0-1")).toBe(true);
  });
  test("patch/minor/major ordering", () => {
    expect(semverGt("1.0.10", "1.0.2")).toBe(true);
    expect(semverGt("1.10.0", "1.9.9")).toBe(true);
    expect(semverGt("2.0.0", "1.99.99")).toBe(true);
  });
  test("malformed inputs return false not throw", () => {
    expect(semverGt("01.0.0", "1.0.0")).toBe(false);
    expect(semverGt("1.0", "1.0.0")).toBe(false);
    expect(semverGt("1.0.0-", "1.0.0")).toBe(false);
    expect(semverGt("1.0.0+ ", "1.0.0")).toBe(false);
  });
});

describe("shouldRefresh malformed handling (tgo-vtn)", () => {
  test("returns false not throw on malformed npm version", () => {
    expect(() => shouldRefresh("0.2.0", "not-a-version")).not.toThrow();
    expect(shouldRefresh("0.2.0", "not-a-version")).toBe(false);
    expect(shouldRefresh("0.2.0", "")).toBe(false);
    expect(shouldRefresh("0.2.0", "latest")).toBe(false);
    expect(shouldRefresh("0.2.0", "1.0")).toBe(false);
    expect(shouldRefresh("0.2.0", "01.0.0")).toBe(false);
    expect(shouldRefresh("0.2.0", "v1.0")).toBe(false);
  });
  test("returns false on malformed running version", () => {
    expect(shouldRefresh("not-a-version", "1.0.0")).toBe(false);
    expect(shouldRefresh("", "1.0.0")).toBe(false);
  });
  test("build metadata does not trigger refresh", () => {
    expect(shouldRefresh("1.0.0", "1.0.0+build")).toBe(false);
    expect(shouldRefresh("1.0.0+build", "1.0.0")).toBe(false);
    expect(shouldRefresh("1.0.0-alpha+001", "1.0.0-alpha+002")).toBe(false);
  });
});
