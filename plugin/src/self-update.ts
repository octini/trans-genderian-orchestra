import * as fs from "node:fs/promises";
import * as fsSync from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export const LOCK_STALE_MS = 120_000;
export const LOCK_FILE = ".tgo-selfupdate.lock";

export function resolveCacheRoot(homeDir?: string): string {
  const base =
    process.env.OPENCODE_TEST_HOME ??
    process.env.XDG_CACHE_HOME ??
    path.join(homeDir ?? os.homedir(), ".cache");
  return path.join(base, "opencode");
}

export function slotDirs(cacheRoot: string, pkgName: string): string[] {
  const candidates = [
    path.join(cacheRoot, "packages", `${pkgName}@latest`),
    path.join(cacheRoot, "packages", pkgName),
  ];
  return candidates.filter((dir) => {
    try {
      return fsSync.existsSync(dir) && fsSync.statSync(dir).isDirectory();
    } catch {
      return false;
    }
  });
}

function parseSemver(v: string): { major: number; minor: number; patch: number; prerelease: string[] | null } | null {
  if (typeof v !== "string") return null;
  let s = v.trim().replace(/^v/, "");
  if (s.length === 0) return null;
  // strip build metadata
  const plusIdx = s.indexOf("+");
  if (plusIdx !== -1) {
    const build = s.slice(plusIdx + 1);
    if (build.length === 0) return null;
    const buildIds = build.split(".");
    for (const id of buildIds) {
      if (id.length === 0 || !/^[0-9A-Za-z-]+$/.test(id)) return null;
    }
    s = s.slice(0, plusIdx);
  }
  let coreStr: string;
  let preStr: string | null = null;
  const dashIdx = s.indexOf("-");
  if (dashIdx !== -1) {
    coreStr = s.slice(0, dashIdx);
    preStr = s.slice(dashIdx + 1);
    if (preStr.length === 0) return null;
  } else {
    coreStr = s;
  }
  const coreParts = coreStr.split(".");
  if (coreParts.length !== 3) return null;
  const nums: number[] = [];
  for (const p of coreParts) {
    if (!/^(0|[1-9]\d*)$/.test(p)) return null;
    nums.push(parseInt(p, 10));
  }
  let prerelease: string[] | null = null;
  if (preStr !== null) {
    const ids = preStr.split(".");
    for (const id of ids) {
      if (id.length === 0 || !/^[0-9A-Za-z-]+$/.test(id)) return null;
      if (/^[0-9]+$/.test(id) && !/^(0|[1-9]\d*)$/.test(id)) return null;
    }
    prerelease = ids;
  }
  return { major: nums[0]!, minor: nums[1]!, patch: nums[2]!, prerelease };
}

export function semverGt(a: string, b: string): boolean {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return false;
  if (pa.major !== pb.major) return pa.major > pb.major;
  if (pa.minor !== pb.minor) return pa.minor > pb.minor;
  if (pa.patch !== pb.patch) return pa.patch > pb.patch;
  const aPre = pa.prerelease;
  const bPre = pb.prerelease;
  if (aPre === null && bPre === null) return false;
  if (aPre === null && bPre !== null) return true;
  if (aPre !== null && bPre === null) return false;
  // both have prerelease
  const aA = aPre!;
  const bA = bPre!;
  const len = Math.min(aA.length, bA.length);
  for (let i = 0; i < len; i++) {
    const aId = aA[i]!;
    const bId = bA[i]!;
    if (aId === bId) continue;
    const aIsNum = /^[0-9]+$/.test(aId);
    const bIsNum = /^[0-9]+$/.test(bId);
    if (aIsNum && bIsNum) {
      return parseInt(aId, 10) > parseInt(bId, 10);
    }
    if (aIsNum && !bIsNum) return false;
    if (!aIsNum && bIsNum) return true;
    // both alphanumeric lexical (ASCII)
    return aId > bId;
  }
  return aA.length > bA.length;
}

export function shouldRefresh(runningVersion: string, latestVersion: string): boolean {
  return semverGt(latestVersion, runningVersion);
}

export function buildInstallArgs(dir: string, pkgName: string): string[] {
  return ["npm", "install", "--prefix", dir, `${pkgName}@latest`, "--save-exact", "--ignore-scripts", "--no-audit", "--no-fund"];
}

// deprecated compat: keep for old callers/tests
export function buildInstallCommand(dir: string, pkgName: string): string {
  return buildInstallArgs(dir, pkgName).join(" ");
}

export async function recoverOrphans(dir: string): Promise<void> {
  try {
    const dirExists = await fs.stat(dir).then(() => true).catch(() => false);
    const backup = `${dir}.tgo-backup`;
    const staging = `${dir}.tgo-staging`;
    if (!dirExists) {
      const backupExists = await fs.stat(backup).then(() => true).catch(() => false);
      if (backupExists) {
        try {
          await fs.rename(backup, dir);
        } catch {}
      }
      return;
    }
    await rmRf(staging);
    await rmRf(backup);
  } catch {}
}

async function rmRf(p: string): Promise<void> {
  try {
    await fs.rm(p, { recursive: true, force: true });
  } catch {}
}

async function copyDir(src: string, dest: string): Promise<void> {
  // prefer fs.cp if available
  const cp = (fs as unknown as { cp?: (s: string, d: string, opts: unknown) => Promise<void> }).cp;
  if (typeof cp === "function") {
    await cp.call(fs, src, dest, { recursive: true, force: true });
    return;
  }
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) {
      await copyDir(s, d);
    } else if (e.isSymbolicLink()) {
      const target = await fs.readlink(s);
      await fs.symlink(target, d);
    } else {
      await fs.copyFile(s, d);
    }
  }
}

export async function selfUpdate(deps: {
  runningVersion: string;
  pkgName: string;
  fetchLatest: () => Promise<string | undefined>;
  spawn: (args: string[]) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  log: (level: "info" | "warn", msg: string) => void;
  homeDir?: string;
  now?: () => Date;
}): Promise<void> {
  try {
    let latest: string | undefined | null;
    try {
      latest = await deps.fetchLatest();
    } catch {
      return;
    }
    if (!latest) return;
    if (typeof latest !== "string" || latest.trim().length === 0) return;
    if (!shouldRefresh(deps.runningVersion, latest)) return;

    const cacheRoot = resolveCacheRoot(deps.homeDir);
    const dirs = slotDirs(cacheRoot, deps.pkgName);
    if (dirs.length === 0) return;

    const nowMs = deps.now ? deps.now().getTime() : Date.now();

    for (const dir of dirs) {
      try {
        await recoverOrphans(dir);
      } catch {}
      const lockPath = path.join(dir, LOCK_FILE);
      const staging = `${dir}.tgo-staging`;
      const backup = `${dir}.tgo-backup`;
      let ownerToken: string | null = null;
      let acquired = false;

      try {
        try {
          await fs.mkdir(dir, { recursive: true });
        } catch {}
        const token = `${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`;

        const tryAcquire = async (): Promise<boolean> => {
          let handle: fs.FileHandle | undefined;
          try {
            handle = await fs.open(lockPath, "wx");
            try {
              await handle.writeFile(token, "utf-8");
            } catch {}
            ownerToken = token;
            acquired = true;
            return true;
          } catch (err) {
            const code = (err as NodeJS.ErrnoException)?.code;
            if (code !== "EEXIST") return false;
            return false;
          } finally {
            if (handle) {
              try {
                await handle.close();
              } catch {}
            }
          }
        };

        let ok = await tryAcquire();
        if (!ok) {
          try {
            const stat = await fs.stat(lockPath);
            const age = nowMs - stat.mtimeMs;
            if (age > LOCK_STALE_MS) {
              try {
                await fs.unlink(lockPath);
              } catch {}
              ok = await tryAcquire();
              if (!ok) continue;
            } else {
              continue;
            }
          } catch {
            continue;
          }
        }
        if (!acquired || !ownerToken) continue;

        let innerError: unknown = null;
        let newVersionForLog: string | null = null;

        try {
          // (b) staging copy
          try {
            await rmRf(staging);
            await copyDir(dir, staging);
          } catch (e) {
            throw new Error(`self-update staging failed for ${dir}: ${String(e)}`);
          }

          // (c) npm install with --prefix staging
          const args = buildInstallArgs(staging, deps.pkgName);
          let result: { exitCode: number; stdout: string; stderr: string };
          try {
            result = await deps.spawn(args);
          } catch (e) {
            throw new Error(`self-update spawn failed for ${dir}: ${String(e)}`);
          }
          if (result.exitCode !== 0) {
            throw new Error(`self-update failed for ${dir}: exit ${result.exitCode} ${result.stderr || result.stdout}`.trim());
          }

          // (d) verify staging version gt running
          let newVersion = "";
          try {
            const pkgJsonPath = path.join(staging, "node_modules", deps.pkgName, "package.json");
            const raw = await fs.readFile(pkgJsonPath, "utf-8");
            const json = JSON.parse(raw) as { version?: unknown };
            newVersion = typeof json.version === "string" ? json.version : "";
          } catch (e) {
            throw new Error(`self-update verification failed for ${dir}: ${String(e)}`);
          }
          if (!newVersion) {
            throw new Error(`self-update verification failed for ${dir}: missing version`);
          }
          if (!semverGt(newVersion, deps.runningVersion)) {
            throw new Error(`self-update verification failed for ${dir}: installed ${newVersion} not > ${deps.runningVersion}`);
          }
          newVersionForLog = newVersion;

          // (e) swap
          try {
            await rmRf(backup);
            await fs.rename(dir, backup);
            await fs.rename(staging, dir);
            await rmRf(backup);
          } catch (e) {
            // swap failure: try to restore backup if dir missing
            try {
              const backupExists = await fs.stat(backup).then(() => true).catch(() => false);
              const dirExists = await fs.stat(dir).then(() => true).catch(() => false);
              if (backupExists && !dirExists) {
                try {
                  await fs.rename(backup, dir);
                } catch {}
              }
              await rmRf(staging);
            } catch {}
            throw new Error(`self-update swap failed for ${dir}: ${String(e)}`);
          }

          // success log
          try {
            deps.log("info", `self-updated ${deps.pkgName} to ${newVersionForLog} — restart opencode to activate`);
          } catch {}
        } catch (e) {
          innerError = e;
          // (f) ANY failure → rm staging, restore backup if needed, log warn, original untouched
          try {
            const backupExists = await fs.stat(backup).then(() => true).catch(() => false);
            const dirExists = await fs.stat(dir).then(() => true).catch(() => false);
            if (backupExists && !dirExists) {
              try {
                await fs.rename(backup, dir);
              } catch {}
            }
            await rmRf(staging);
          } catch {}
          try {
            const msg = String((e as Error)?.message ?? e);
            // ensure warn contains needed substrings; if message already contains warn-like text, log it directly
            if (msg.includes("self-update")) {
              deps.log("warn", msg);
            } else {
              deps.log("warn", `self-update failed for ${dir}: ${String(e)}`);
            }
          } catch {}
        }
        // lock release handled in finally below
      } finally {
        try {
          if (ownerToken) {
            const cur = await fs.readFile(lockPath, "utf-8").catch(() => "");
            if (cur === ownerToken) {
              await fs.unlink(lockPath).catch(() => {});
            }
          }
        } catch {}
      }
    }
  } catch {
    return;
  }
}
