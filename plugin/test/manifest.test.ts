import { describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {
  validateManifest,
  checkScopeConflicts,
  planManifest,
  readManifest,
  writeManifestAtomic,
  getManifestRow,
  buildManifestPointer,
  manifestPath,
  MANIFEST_REL_PATH,
  ManifestScopeConflictError,
  getManifestRowSyncFromManifest,
  type Manifest,
} from "../src/manifest";
import {
  manifestOnDispatch,
  manifestOnDispatchSync,
  manifestOnComplete,
  manifestOnCompleteSync,
  manifestMessageFilter,
  manifestMessageFilterSync,
} from "../src/manifest-hooks";
import { parseTaskReport } from "../src/report";
import { buildBoardTextWithHints } from "../src/board";

// helpers
async function mkTmpRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tgo-manifest-"));
  await fs.mkdir(path.join(dir, ".tgo"), { recursive: true });
  return dir;
}
function cleanup(dir: string) {
  return fs.rm(dir, { recursive: true, force: true }).catch(() => {});
}

const validManifest: Manifest = {
  waves: [
    {
      wave: 1,
      beads: [
        { issueId: "tgo-1a", story: "implement foo", scope: ["src/foo.ts", "src/bar.ts"], parallelSet: "A", deps: [] },
        { issueId: "tgo-1b", story: "implement baz", scope: ["src/baz.ts"], parallelSet: "A", deps: [] },
        { issueId: "tgo-1c", story: "other lane", scope: ["src/foo.ts"], parallelSet: "B", deps: [] },
      ],
    },
    {
      wave: 2,
      beads: [
        { issueId: "tgo-2a", story: "follow up", scope: ["src/foo.ts"], parallelSet: "A", deps: ["tgo-1a"] },
      ],
    },
  ],
};

const conflictManifestSameSet: Manifest = {
  waves: [
    {
      wave: 1,
      beads: [
        { issueId: "tgo-c1", story: "a", scope: ["src/shared.ts", "src/a.ts"], parallelSet: "X", deps: [] },
        { issueId: "tgo-c2", story: "b", scope: ["src/shared.ts"], parallelSet: "X", deps: [] },
      ],
    },
  ],
};

const noConflictDiffSet: Manifest = {
  waves: [
    {
      wave: 1,
      beads: [
        { issueId: "tgo-d1", story: "a", scope: ["src/shared.ts"], parallelSet: "X", deps: [] },
        { issueId: "tgo-d2", story: "b", scope: ["src/shared.ts"], parallelSet: "Y", deps: [] },
      ],
    },
  ],
};

const crossWaveOverlapLegal: Manifest = {
  waves: [
    { wave: 1, beads: [{ issueId: "tgo-w1", story: "a", scope: ["src/foo.ts"], parallelSet: "A", deps: [] }] },
    { wave: 2, beads: [{ issueId: "tgo-w2", story: "b", scope: ["src/foo.ts"], parallelSet: "A", deps: ["tgo-w1"] }] },
  ],
};

describe("manifest validation", () => {
  test("accepts valid manifest", () => {
    const v = validateManifest(validManifest);
    expect(v.valid).toBe(true);
    expect(v.errors.length).toBe(0);
  });
  test("rejects missing waves and malformed bead", () => {
    expect(validateManifest({} as any).valid).toBe(false);
    expect(validateManifest({ waves: "bad" } as any).valid).toBe(false);
    const bad = validateManifest({ waves: [{ wave: 1, beads: [{ issueId: "bad/id", story: "", scope: [], parallelSet: "", deps: "bad" }] }] } as any);
    expect(bad.valid).toBe(false);
    expect(bad.errors.join(" ")).toContain("VALID_BEAD_ID");
  });
  test("rejects duplicate issueId across waves", () => {
    const dup: Manifest = {
      waves: [
        { wave: 1, beads: [{ issueId: "tgo-dup", story: "a", scope: ["a.ts"], parallelSet: "A", deps: [] }] },
        { wave: 2, beads: [{ issueId: "tgo-dup", story: "b", scope: ["b.ts"], parallelSet: "A", deps: [] }] },
      ],
    };
    expect(validateManifest(dup).valid).toBe(false);
    expect(validateManifest(dup).errors.join(" ")).toContain("duplicate");
  });
});

describe("scope-conflict check — pairwise same-parallelSet", () => {
  test("same parallelSet overlap → conflict typed error", () => {
    const { hasConflict, conflicts } = checkScopeConflicts(conflictManifestSameSet);
    expect(hasConflict).toBe(true);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0]?.overlappingFiles).toContain("src/shared.ts");
    expect(conflicts[0]?.parallelSet).toBe("X");
    expect(conflicts[0]?.wave).toBe(1);
  });
  test("disjoint same parallelSet → no conflict", () => {
    const { hasConflict } = checkScopeConflicts(validManifest);
    // validManifest has same parallelSet A with overlapping? Let's check: tgo-1a vs tgo-1b are same set A but disjoint scopes (foo/bar vs baz) → no conflict
    // tgo-1c is different set B, even though overlaps foo with tgo-1a, not conflict
    expect(hasConflict).toBe(false);
  });
  test("same file across different parallelSet within same wave → OK", () => {
    const { hasConflict } = checkScopeConflicts(noConflictDiffSet);
    expect(hasConflict).toBe(false);
  });
  test("cross-wave overlap → OK (sequenced by deps)", () => {
    const { hasConflict } = checkScopeConflicts(crossWaveOverlapLegal);
    expect(hasConflict).toBe(false);
  });
  test("cross-wave and same-wave legal fixtures together → cross-wave OK, same-set still fails separately", () => {
    const combined: Manifest = {
      waves: [
        { wave: 1, beads: [{ issueId: "tgo-a", story: "a", scope: ["src/x.ts"], parallelSet: "P", deps: [] }, { issueId: "tgo-b", story: "b", scope: ["src/y.ts"], parallelSet: "P", deps: [] }] },
        { wave: 2, beads: [{ issueId: "tgo-c", story: "c", scope: ["src/x.ts"], parallelSet: "P", deps: [] }] },
      ],
    };
    const { hasConflict } = checkScopeConflicts(combined);
    expect(hasConflict).toBe(false);
    const withConflict: Manifest = {
      waves: [
        { wave: 1, beads: [{ issueId: "tgo-a", story: "a", scope: ["src/x.ts"], parallelSet: "P", deps: [] }, { issueId: "tgo-b", story: "b", scope: ["src/x.ts"], parallelSet: "P", deps: [] }] },
      ],
    };
    const { hasConflict: hc2 } = checkScopeConflicts(withConflict);
    expect(hc2).toBe(true);
  });
});

describe("manifest write/read round-trip + atomicity", () => {
  test("write and read round-trip preserves manifest", async () => {
    const dir = await mkTmpRepo();
    try {
      await planManifest(dir, validManifest);
      const read = await readManifest(dir);
      expect(read).toEqual(validManifest);
      // file exists at expected path
      const p = manifestPath(dir);
      const raw = await fs.readFile(p, "utf-8");
      expect(raw).toContain("tgo-1a");
    } finally {
      await cleanup(dir);
    }
  });
  test("atomicity: no partial file on conflict — refuse write leaves prior intact", async () => {
    const dir = await mkTmpRepo();
    try {
      await planManifest(dir, validManifest);
      const before = await readManifest(dir);
      expect(before).toBeDefined();
      let threw = false;
      try {
        await planManifest(dir, conflictManifestSameSet);
      } catch (e) {
        threw = true;
        expect(e instanceof ManifestScopeConflictError).toBe(true);
        expect((e as Error).message).toContain("MANIFEST_SCOPE_CONFLICT");
        expect((e as ManifestScopeConflictError).code).toBe("MANIFEST_SCOPE_CONFLICT");
        // also thrown as MANIFEST_SCOPE_CONFLICT prefix when via tool path
        expect(String(e)).toContain("shared.ts");
      }
      expect(threw).toBe(true);
      const after = await readManifest(dir);
      expect(after).toEqual(before); // not overwritten with conflicting
      // Ensure no tmp files left
      const tgoDir = path.join(dir, ".tgo");
      const entries = await fs.readdir(tgoDir);
      expect(entries.some((e) => e.startsWith(".manifest-") && e.endsWith(".tmp"))).toBe(false);
    } finally {
      await cleanup(dir);
    }
  });
  test("planManifest validation failure is typed and does not write", async () => {
    const dir = await mkTmpRepo();
    try {
      let threw = false;
      try {
        await planManifest(dir, { waves: [{ wave: 0, beads: [{ issueId: "bad/id", story: "", scope: [], parallelSet: "", deps: [] }] }] } as any);
      } catch (e) {
        threw = true;
        expect(String(e)).toContain("validation");
      }
      expect(threw).toBe(true);
      expect(await readManifest(dir)).toBeUndefined();
    } finally {
      await cleanup(dir);
    }
  });
  test("missing manifest read returns undefined (zero overhead)", async () => {
    const dir = await mkTmpRepo();
    try {
      expect(await readManifest(dir)).toBeUndefined();
    } finally {
      await cleanup(dir);
    }
  });
  test("writeManifestAtomic is atomic tmp+rename with no partial", async () => {
    const dir = await mkTmpRepo();
    try {
      const m: Manifest = { waves: [{ wave: 1, beads: [{ issueId: "tgo-atom", story: "s", scope: ["a.ts"], parallelSet: "A", deps: [] }] }] };
      await writeManifestAtomic(dir, m);
      const read = await readManifest(dir);
      expect(read).toEqual(m);
      // check no tmp leftover
      const tgoDir = path.join(dir, ".tgo");
      const entries = await fs.readdir(tgoDir);
      expect(entries.filter((e) => e.includes(".tmp")).length).toBe(0);
    } finally {
      await cleanup(dir);
    }
  });
});

describe("onDispatch injection — compact row", () => {
  test("injects manifest row for known bead", async () => {
    const dir = await mkTmpRepo();
    try {
      await planManifest(dir, validManifest);
      const packet = { Objective: "do foo", Files: ["src/foo.ts"], issueId: "tgo-1a", delegationId: "d1" } as unknown as Record<string, unknown>;
      const res = await manifestOnDispatch({ repoRoot: dir, issueId: "tgo-1a", packet });
      expect(res.injected).toBe(true);
      expect(res.row?.issueId).toBe("tgo-1a");
      expect(res.packet.manifest).toBeDefined();
      const m = res.packet.manifest as any;
      expect(m.story).toBe("implement foo");
      expect(m.scope).toEqual(["src/foo.ts", "src/bar.ts"]);
      expect(m.parallelSet).toBe("A");
      expect(m.wave).toBe(1);
      // original packet not mutated large — only one compact block
      expect(Object.keys(res.packet)).toContain("manifest");
      // Files preserved (messageFilter separate)
      expect(res.packet.Files).toEqual(["src/foo.ts"]);
    } finally {
      await cleanup(dir);
    }
  });
  test("onDispatch zero-overhead when manifest missing", async () => {
    const dir = await mkTmpRepo();
    try {
      const packet = { Objective: "x", Files: ["a.ts"], issueId: "tgo-missing" } as any;
      const res = await manifestOnDispatch({ repoRoot: dir, issueId: "tgo-missing", packet });
      expect(res.injected).toBe(false);
      expect(res.packet).toBe(packet); // same ref when no-op (zero overhead)
    } finally {
      await cleanup(dir);
    }
  });
  test("onDispatch zero-overhead when bead not in manifest", async () => {
    const dir = await mkTmpRepo();
    try {
      await planManifest(dir, validManifest);
      const packet = { Objective: "x", Files: ["a.ts"], issueId: "tgo-not-in-manifest" } as any;
      const res = await manifestOnDispatch({ repoRoot: dir, issueId: "tgo-not-in-manifest", packet });
      expect(res.injected).toBe(false);
    } finally {
      await cleanup(dir);
    }
  });
  test("sync variant behaves same", async () => {
    const m = validManifest;
    const packet = { Files: ["src/foo.ts"] } as any;
    const res = manifestOnDispatchSync({ manifest: m, issueId: "tgo-1b", packet });
    expect(res.injected).toBe(true);
    expect((res.packet.manifest as any).scope).toEqual(["src/baz.ts"]);
    const miss = manifestOnDispatchSync({ manifest: undefined, issueId: "tgo-1b", packet });
    expect(miss.injected).toBe(false);
  });
  test("context-lean: manifest size does not affect injected row size", async () => {
    // small manifest vs large manifest — injected row size approx same
    const small: Manifest = { waves: [{ wave: 1, beads: [{ issueId: "tgo-s", story: "small story", scope: ["a.ts"], parallelSet: "A", deps: [] }] }] };
    const large: Manifest = {
      waves: Array.from({ length: 10 }, (_, wi) => ({
        wave: wi,
        beads: Array.from({ length: 5 }, (_, bi) => ({
          issueId: `tgo-l${wi}-${bi}`,
          story: `story ${wi}-${bi} with some details to make it longer but not huge`,
          scope: [`src/file${wi}-${bi}.ts`, `src/other${wi}-${bi}.ts`],
          parallelSet: `P${bi % 2}`,
          deps: [] as string[],
        })),
      })),
    };
    // ensure both contain target with identical row fields
    large.waves[0]!.beads[0]!.issueId = "tgo-target";
    large.waves[0]!.beads[0]!.story = "target story";
    large.waves[0]!.beads[0]!.scope = ["src/target.ts"];
    large.waves[0]!.beads[0]!.parallelSet = "A";
    large.waves[0]!.beads[0]!.deps = [];
    small.waves[0]!.beads[0]!.issueId = "tgo-target";
    small.waves[0]!.beads[0]!.story = "target story";
    small.waves[0]!.beads[0]!.scope = ["src/target.ts"];
    small.waves[0]!.beads[0]!.parallelSet = "A";
    small.waves[0]!.beads[0]!.deps = [];
    const pkt: Record<string, unknown> = { Files: ["src/target.ts"] };
    const rSmall = manifestOnDispatchSync({ manifest: small, issueId: "tgo-target", packet: { ...pkt } });
    const rLarge = manifestOnDispatchSync({ manifest: large, issueId: "tgo-target", packet: { ...pkt } });
    const sizeSmall = JSON.stringify(rSmall.packet.manifest).length;
    const sizeLarge = JSON.stringify(rLarge.packet.manifest).length;
    expect(sizeSmall).toEqual(sizeLarge); // same row, manifest size irrelevant
    expect(sizeSmall).toBeLessThan(500); // compact
  });
});

describe("onComplete mismatch → bail routing (merged taxonomy)", () => {
  test("mismatch files outside scope → bail (abandon, not retry)", async () => {
    const dir = await mkTmpRepo();
    try {
      const manifest: Manifest = {
        waves: [{ wave: 1, beads: [{ issueId: "tgo-bail1", story: "s", scope: ["src/allowed.ts"], parallelSet: "A", deps: [] }] }],
      };
      await planManifest(dir, manifest);
      const report = parseTaskReport("STATUS: complete\nCHANGES: src/allowed.ts\nVERIFIED: exit gate: true\nGAPS: none");
      expect(report.completionSafe).toBe(true);
      // worker touched out-of-scope file
      const touched = ["src/allowed.ts", "src/forbidden.ts"];
      const res = await manifestOnComplete({ repoRoot: dir, issueId: "tgo-bail1", report, touchedFiles: touched });
      expect(res.bail).toBe(true);
      expect(res.mismatchFiles).toEqual(["src/forbidden.ts"]);
      expect(res.report.taxonomy.status).toBe("bail");
      expect(res.report.taxonomy.retryable).toBe(false);
      expect(res.report.recovery).toBe("abandon");
      expect(res.report.recovery).not.toBe("retry");
      expect(res.report.recovery).not.toBe("reroute");
    } finally {
      await cleanup(dir);
    }
  });
  test("mismatch via CHANGES parsing (no explicit touchedFiles) → bail", async () => {
    const dir = await mkTmpRepo();
    try {
      const manifest: Manifest = {
        waves: [{ wave: 1, beads: [{ issueId: "tgo-bail2", story: "s", scope: ["src/a.ts"], parallelSet: "A", deps: [] }] }],
      };
      await planManifest(dir, manifest);
      const report = parseTaskReport("STATUS: complete\nCHANGES: src/a.ts, src/b.ts\nVERIFIED: exit gate: true\nGAPS: none");
      const res = await manifestOnComplete({ repoRoot: dir, issueId: "tgo-bail2", report });
      expect(res.bail).toBe(true);
      expect(res.report.taxonomy.status).toBe("bail");
    } finally {
      await cleanup(dir);
    }
  });
  test("no mismatch → no bail (complete stays complete)", async () => {
    const dir = await mkTmpRepo();
    try {
      const manifest: Manifest = {
        waves: [{ wave: 1, beads: [{ issueId: "tgo-ok", story: "s", scope: ["src/a.ts", "src/b.ts"], parallelSet: "A", deps: [] }] }],
      };
      await planManifest(dir, manifest);
      const report = parseTaskReport("STATUS: complete\nCHANGES: src/a.ts\nVERIFIED: exit gate: true\nGAPS: none");
      const res = await manifestOnComplete({ repoRoot: dir, issueId: "tgo-ok", report, touchedFiles: ["src/a.ts"] });
      expect(res.bail).toBe(false);
      expect(res.report.taxonomy.status).toBe("complete");
    } finally {
      await cleanup(dir);
    }
  });
  test("missing manifest → no-op, report unchanged", async () => {
    const dir = await mkTmpRepo();
    try {
      const report = parseTaskReport("STATUS: complete\nCHANGES: src/x.ts\nVERIFIED: exit gate: true\nGAPS: none");
      const res = await manifestOnComplete({ repoRoot: dir, issueId: "tgo-no-manifest", report, touchedFiles: ["src/x.ts"] });
      expect(res.bail).toBe(false);
      expect(res.report).toBe(report); // same ref when no-op
    } finally {
      await cleanup(dir);
    }
  });
  test("bead not in manifest → no-op", async () => {
    const dir = await mkTmpRepo();
    try {
      const manifest: Manifest = { waves: [{ wave: 1, beads: [{ issueId: "tgo-other", story: "s", scope: ["src/a.ts"], parallelSet: "A", deps: [] }] }] };
      await planManifest(dir, manifest);
      const report = parseTaskReport("STATUS: complete\nCHANGES: src/b.ts\nVERIFIED: exit gate: true\nGAPS: none");
      const res = await manifestOnComplete({ repoRoot: dir, issueId: "tgo-notlisted", report, touchedFiles: ["src/b.ts"] });
      expect(res.bail).toBe(false);
    } finally {
      await cleanup(dir);
    }
  });
  test("sync variant mirrors async", () => {
    const manifest: Manifest = { waves: [{ wave: 1, beads: [{ issueId: "tgo-sync", story: "s", scope: ["src/ok.ts"], parallelSet: "A", deps: [] }] }] };
    const report = parseTaskReport("STATUS: complete\nCHANGES: src/ok.ts, src/bad.ts\nVERIFIED: exit gate: true\nGAPS: none");
    const res = manifestOnCompleteSync({ manifest, issueId: "tgo-sync", report });
    expect(res.bail).toBe(true);
    expect(res.mismatchFiles).toEqual(["src/bad.ts"]);
    const ok = manifestOnCompleteSync({ manifest, issueId: "tgo-sync", report: parseTaskReport("STATUS: complete\nCHANGES: src/ok.ts\nVERIFIED: exit gate: true\nGAPS: none") });
    expect(ok.bail).toBe(false);
    const missing = manifestOnCompleteSync({ manifest: undefined, issueId: "tgo-sync", report });
    expect(missing.bail).toBe(false);
  });
  test("bail report consumes merged taxonomy — evaluateClosure → abandon", async () => {
    const { evaluateClosure } = await import("../src/lifecycle");
    const manifest: Manifest = { waves: [{ wave: 1, beads: [{ issueId: "tgo-life", story: "s", scope: ["src/a.ts"], parallelSet: "A", deps: [] }] }] };
    const report = parseTaskReport("STATUS: complete\nCHANGES: src/a.ts, src/b.ts\nVERIFIED: exit gate: true\nGAPS: none");
    const bailed = manifestOnCompleteSync({ manifest, issueId: "tgo-life", report });
    expect(bailed.bail).toBe(true);
    const lifecycle = { issueId: "tgo-life", issueStatusObserved: "in_progress", issueAssigneeObserved: "ryangking", claimExitCode: 0, delegationId: "d-1", beadsOperator: "Bernstein", reviewComplete: true };
    const gate = evaluateClosure("standard", lifecycle as any, bailed.report);
    expect(gate.recovery).toBe("abandon");
    expect(gate.recovery).not.toBe("retry");
    expect(gate.recovery).not.toBe("reroute");
  });
});

describe("messageFilter — strip file refs outside scope", () => {
  test("strips Files not in scope, keeps those in scope", async () => {
    const dir = await mkTmpRepo();
    try {
      const manifest: Manifest = {
        waves: [{ wave: 1, beads: [{ issueId: "tgo-filter", story: "s", scope: ["src/a.ts", "src/b.ts"], parallelSet: "A", deps: [] }] }],
      };
      await planManifest(dir, manifest);
      const packet = { Files: ["src/a.ts", "src/b.ts", "src/c.ts", "src/d.ts"], Objective: "x" } as unknown as Record<string, unknown>;
      const res = await manifestMessageFilter({ repoRoot: dir, issueId: "tgo-filter", packet });
      expect(res.filtered).toBe(true);
      expect(res.packet.Files).toEqual(["src/a.ts", "src/b.ts"]);
      expect(res.stripped).toEqual(["src/c.ts", "src/d.ts"]);
      // original not mutated
      expect(packet.Files).toEqual(["src/a.ts", "src/b.ts", "src/c.ts", "src/d.ts"]);
    } finally {
      await cleanup(dir);
    }
  });
  test("no strip when all files within scope", async () => {
    const dir = await mkTmpRepo();
    try {
      const manifest: Manifest = { waves: [{ wave: 1, beads: [{ issueId: "tgo-f2", story: "s", scope: ["src/a.ts"], parallelSet: "A", deps: [] }] }] };
      await planManifest(dir, manifest);
      const packet = { Files: ["src/a.ts"] } as any;
      const res = await manifestMessageFilter({ repoRoot: dir, issueId: "tgo-f2", packet });
      expect(res.filtered).toBe(false);
      expect(res.packet).toBe(packet);
    } finally {
      await cleanup(dir);
    }
  });
  test("missing manifest → no-op (zero overhead)", async () => {
    const dir = await mkTmpRepo();
    try {
      const packet = { Files: ["src/a.ts", "src/b.ts"] } as any;
      const res = await manifestMessageFilter({ repoRoot: dir, issueId: "tgo-missing-manifest", packet });
      expect(res.filtered).toBe(false);
      expect(res.packet).toBe(packet);
    } finally {
      await cleanup(dir);
    }
  });
  test("bead not in manifest → no-op", async () => {
    const dir = await mkTmpRepo();
    try {
      const manifest: Manifest = { waves: [{ wave: 1, beads: [{ issueId: "tgo-exists", story: "s", scope: ["src/a.ts"], parallelSet: "A", deps: [] }] }] };
      await planManifest(dir, manifest);
      const packet = { Files: ["src/a.ts", "src/b.ts"] } as any;
      const res = await manifestMessageFilter({ repoRoot: dir, issueId: "tgo-notfound", packet });
      expect(res.filtered).toBe(false);
    } finally {
      await cleanup(dir);
    }
  });
  test("sync variant", () => {
    const manifest: Manifest = { waves: [{ wave: 1, beads: [{ issueId: "tgo-syncf", story: "s", scope: ["src/a.ts"], parallelSet: "A", deps: [] }] }] };
    const packet = { Files: ["src/a.ts", "src/b.ts"] } as any;
    const res = manifestMessageFilterSync({ manifest, issueId: "tgo-syncf", packet });
    expect(res.filtered).toBe(true);
    expect(res.packet.Files).toEqual(["src/a.ts"]);
    expect(res.stripped).toEqual(["src/b.ts"]);
    const noManifest = manifestMessageFilterSync({ manifest: undefined, issueId: "tgo-syncf", packet });
    expect(noManifest.filtered).toBe(false);
  });
});

describe("missing-manifest no-op across hooks", () => {
  test("all hooks no-op when manifest absent", async () => {
    const dir = await mkTmpRepo();
    try {
      const packet = { Files: ["src/a.ts"], issueId: "tgo-x" } as any;
      const report = parseTaskReport("STATUS: complete\nCHANGES: src/a.ts\nVERIFIED: exit gate: true\nGAPS: none");
      expect((await manifestOnDispatch({ repoRoot: dir, issueId: "tgo-x", packet })).injected).toBe(false);
      expect((await manifestOnComplete({ repoRoot: dir, issueId: "tgo-x", report })).bail).toBe(false);
      expect((await manifestMessageFilter({ repoRoot: dir, issueId: "tgo-x", packet })).filtered).toBe(false);
    } finally {
      await cleanup(dir);
    }
  });
});

describe("board one-line pointer — context-lean", () => {
  test("pointer is one line, not full manifest", async () => {
    const dir = await mkTmpRepo();
    try {
      const manifest: Manifest = {
        waves: [
          { wave: 1, beads: [{ issueId: "tgo-b1", story: "s", scope: ["a.ts"], parallelSet: "A", deps: [] }] },
          { wave: 2, beads: [{ issueId: "tgo-b2", story: "s", scope: ["b.ts"], parallelSet: "A", deps: [] }] },
          { wave: 3, beads: [{ issueId: "tgo-b3", story: "s", scope: ["c.ts"], parallelSet: "A", deps: [] }] },
        ],
      };
      await planManifest(dir, manifest);
      const pointer = buildManifestPointer(manifest);
      expect(pointer).toBe(`manifest: ${MANIFEST_REL_PATH} (3 waves)`);
      expect(pointer?.split("\n").length).toBe(1);
      expect(pointer).not.toContain("tgo-b1");
      expect(pointer).not.toContain("scope");
    } finally {
      await cleanup(dir);
    }
  });
  test("board text includes pointer when manifest present, not full content", async () => {
    const dir = await mkTmpRepo();
    try {
      const manifest: Manifest = {
        waves: [
          { wave: 1, beads: [{ issueId: "tgo-b1", story: "s with lots of details that should not be in board", scope: ["src/a.ts", "src/b.ts", "src/c.ts"], parallelSet: "A", deps: [] }] },
        ],
      };
      await planManifest(dir, manifest);
      const text = await buildBoardTextWithHints(
        { inProgress: [], ready: [], blocked: [], memories: [], streaming: [] },
        undefined,
        undefined,
        6,
        dir
      );
      expect(text).toContain(`manifest: ${MANIFEST_REL_PATH} (1 waves)`);
      expect(text).not.toContain("src/a.ts");
      expect(text).not.toContain("tgo-b1");
      expect(text.split("manifest:").length).toBe(2); // exactly one pointer line
    } finally {
      await cleanup(dir);
    }
  });
  test("board text zero overhead when manifest missing — no pointer line", async () => {
    const dir = await mkTmpRepo();
    try {
      const text = await buildBoardTextWithHints(
        { inProgress: [], ready: [], blocked: [], memories: [], streaming: [] },
        undefined,
        undefined,
        6,
        dir
      );
      expect(text).not.toContain("manifest:");
    } finally {
      await cleanup(dir);
    }
  });
  test("getManifestRow reads only its own row (worker read-only)", async () => {
    const dir = await mkTmpRepo();
    try {
      await planManifest(dir, validManifest);
      const row = await getManifestRow(dir, "tgo-1a");
      expect(row?.bead.issueId).toBe("tgo-1a");
      expect(row?.bead.scope).toEqual(["src/foo.ts", "src/bar.ts"]);
      expect(row?.wave).toBe(1);
      const missing = await getManifestRow(dir, "tgo-notfound");
      expect(missing).toBeUndefined();
      // invalid bead id → undefined, no throw, no path traversal
      expect(await getManifestRow(dir, "../etc/passwd")).toBeUndefined();
    } finally {
      await cleanup(dir);
    }
  });
});

describe("delegation helpers — additive", () => {
  test("isFileInManifestScope and filterFilesByManifestScope", async () => {
    const { isFileInManifestScope, filterFilesByManifestScope } = await import("../src/delegation");
    expect(isFileInManifestScope("src/a.ts", ["src/a.ts", "src/b.ts"])).toBe(true);
    expect(isFileInManifestScope("src/c.ts", ["src/a.ts"])).toBe(false);
    const { kept, stripped } = filterFilesByManifestScope(["src/a.ts", "src/b.ts", "src/c.ts"], ["src/a.ts"]);
    expect(kept).toEqual(["src/a.ts"]);
    expect(stripped).toEqual(["src/b.ts", "src/c.ts"]);
  });
});


describe("G3 manifest cache", () => {
  test("readManifest returns cached object across reads", async () => {
    const dir = await mkTmpRepo();
    const m = { waves: [{ wave: 1, beads: [{ issueId: "tgo-g3c", story: "s", scope: ["src/a.ts"], parallelSet: "1", deps: [] }] }] };
    await planManifest(dir, m);
    const first = await readManifest(dir);
    const second = await readManifest(dir);
    const same = (first === second);
    if (!same) throw new Error("G3 cache: readManifest returned different objects");
    await fs.rm(dir, { recursive: true, force: true });
  });
});

describe("G3 manifest filter refusal", () => {
  test("messageFilter refuses when scope excludes ALL files", async () => {
    const dir = await mkTmpRepo();
    const m = { waves: [{ wave: 1, beads: [{ issueId: "tgo-g3r", story: "s", scope: ["src/a.ts"], parallelSet: "2", deps: [] }] }] };
    await planManifest(dir, m);
    const filt = await manifestMessageFilter({ repoRoot: dir, issueId: "tgo-g3r", packet: { Files: ["src/x.ts", "lib/y.ts"] } });
    if (!filt.refused) throw new Error("G3 refusal: expected refused flag");
    if (!filt.refused.includes("tgo-g3r")) throw new Error("G3 refusal: message should interpolate issueId");
    await fs.rm(dir, { recursive: true, force: true });
  });
});


describe("G3 manifest run-log source", () => {
  test("onComplete derives touched files from run log when present", async () => {
    const dir = await mkTmpRepo();
    const m = { waves: [{ wave: 1, beads: [{ issueId: "tgo-g3l", story: "s", scope: ["src/a.ts"], parallelSet: "3", deps: [] }] }] };
    await planManifest(dir, m);
    await fs.mkdir(path.join(dir, ".tgo", "runs"), { recursive: true });
    await fs.writeFile(path.join(dir, ".tgo", "runs", "tgo-g3l.jsonl"), "{\"ts\":1,\"type\":\"step\",\"tool\":\"edit\",\"cmd\":\"src/a.ts\"}", "utf-8");
    const r = parseTaskReport("STATUS: complete\nCHANGES:\n- src/out.txt");
    const mc = await manifestOnComplete({ repoRoot: dir, issueId: "tgo-g3l", report: r });
    if (mc.bail) throw new Error("G3 runlog: expected no bail for in-scope edit");
    await fs.writeFile(path.join(dir, ".tgo", "runs", "tgo-g3l.jsonl"), "{\"ts\":3,\"type\":\"step\",\"tool\":\"write\",\"cmd\":\"lib/bad.ts\"}", "utf-8");
    const mc2 = await manifestOnComplete({ repoRoot: dir, issueId: "tgo-g3l", report: r });
    if (!mc2.bail) throw new Error("G3 runlog: expected bail for out-of-scope write");
    await fs.rm(dir, { recursive: true, force: true });
  });
});
