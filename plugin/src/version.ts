import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export const PLUGIN_NPM_NAME = "trans-genderian-orchestra";
export const REGISTRY_URL = `https://registry.npmjs.org/${PLUGIN_NPM_NAME}/latest`;

/**
 * Compare two semver strings.
 * Returns -1 if a < b, 0 if a == b, 1 if a > b.
 * Handles `v` prefix and pre-release suffixes (pre-release < release).
 */
export function compareVersions(a: string, b: string): number {
  const norm = (v: string) => v.trim().replace(/^v/, "");
  const parse = (v: string) => {
    const [core, pre] = norm(v).split("-", 2);
    const parts = core.split(".").map((p) => {
      const n = Number.parseInt(p, 10);
      return Number.isNaN(n) ? 0 : n;
    });
    return { parts, pre: pre ?? null };
  };
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.parts.length, pb.parts.length);
  for (let i = 0; i < len; i++) {
    const av = pa.parts[i] ?? 0;
    const bv = pb.parts[i] ?? 0;
    if (av < bv) return -1;
    if (av > bv) return 1;
  }
  if (pa.pre === pb.pre) return 0;
  if (pa.pre === null) return 1;
  if (pb.pre === null) return -1;
  return pa.pre < pb.pre ? -1 : pa.pre > pb.pre ? 1 : 0;
}

export async function readLocalVersion(packageRoot?: string): Promise<string | null> {
  const root =
    packageRoot ??
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  try {
    const raw = await fs.readFile(path.join(root, "package.json"), "utf-8");
    const json = JSON.parse(raw) as { version?: unknown };
    return typeof json.version === "string" && json.version.length > 0 ? json.version : null;
  } catch {
    return null;
  }
}

export async function fetchLatestVersion(opts?: {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  url?: string;
}): Promise<string | null> {
  const fetchImpl = opts?.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") return null;
  const url = opts?.url ?? REGISTRY_URL;
  const timeoutMs = opts?.timeoutMs ?? 3000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: controller.signal, headers: { accept: "application/json" } } as RequestInit);
    if (!res.ok) return null;
    const json = (await res.json()) as { version?: unknown };
    return typeof json.version === "string" && json.version.length > 0 ? json.version : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface VersionDrift {
  local: string;
  latest: string;
  drift: boolean;
}

export async function checkVersionDrift(opts?: {
  packageRoot?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  url?: string;
}): Promise<VersionDrift | null> {
  const local = await readLocalVersion(opts?.packageRoot);
  if (!local) return null;
  const latest = await fetchLatestVersion({ fetchImpl: opts?.fetchImpl, timeoutMs: opts?.timeoutMs, url: opts?.url });
  if (!latest) return null;
  return { local, latest, drift: compareVersions(local, latest) < 0 };
}
