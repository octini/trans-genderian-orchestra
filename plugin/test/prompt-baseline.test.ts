import { test, expect, describe } from "bun:test";
import * as path from "node:path";
import * as fs from "node:fs";
import { renderSeats } from "../src/build";
import {
  extractSections,
  computeWholeHash,
  computePerSeatHash,
  diffSections,
  normalizeForHash,
  assertSectionsMatch,
  assertWholeHash,
} from "../src/prompt-baseline";

const fixturePath = path.resolve(__dirname, "fixtures/prompt-baseline.json");
const agentsDir = path.resolve(__dirname, "../assets/agents");

interface BaselineFixture {
  _header: string;
  _normalization: string;
  generated: string;
  wholeHash: string;
  seats: Record<string, { sections: string[]; hash: string }>;
}

function isUpdateMode(): boolean {
  const v = process.env.UPDATE_PROMPT_BASELINE;
  if (v === undefined) return false;
  if (v === "") return false;
  if (v === "0") return false;
  if (v.toLowerCase() === "false") return false;
  return true;
}

function loadFixture(): BaselineFixture {
  if (!fs.existsSync(fixturePath)) {
    throw new Error(
      `prompt baseline fixture missing at ${fixturePath} — run UPDATE_PROMPT_BASELINE=1 bun test plugin/test/prompt-baseline.test.ts to generate it`,
    );
  }
  const raw = fs.readFileSync(fixturePath, "utf-8");
  return JSON.parse(raw) as BaselineFixture;
}

function buildFixture(seats: Awaited<ReturnType<typeof renderSeats>>): BaselineFixture {
  const sorted = [...seats].sort((a, b) => a.fileName.localeCompare(b.fileName));
  const seatMap: Record<string, { sections: string[]; hash: string }> = {};
  for (const s of sorted) seatMap[s.fileName] = { sections: extractSections(s.content), hash: computePerSeatHash(s.content) };
  return {
    _header:
      "Prompt assembly baseline — captures rendered seat prompt skeleton (section order + stable markers). Do not hand-edit. To update after intentional changes: UPDATE_PROMPT_BASELINE=1 bun test plugin/test/prompt-baseline.test.ts (see docs/SETUP.md). \"generated\" is an audit stamp only — unhashed and uncompared, expected to diff on every update.",
    _normalization:
      "Normalized before hashing: strip dates, versions/npm versions, absolute paths/home dirs, token counts via normalizeForHash in plugin/src/prompt-baseline.ts (placeholders <DATE>/<VERSION>/<PATH>/<TOKENS>), canonicalize line endings/whitespace.",
    generated: new Date().toISOString(),
    wholeHash: computeWholeHash(seats),
    seats: seatMap,
  };
}

describe("prompt assembly baseline guard", () => {
  test("per-seat section order matches committed fixture (renders from real assets via renderSeats)", async () => {
    const seats = await renderSeats(agentsDir, "default");

    // update path — one-step procedure documented in fixture header + docs/SETUP.md
    if (isUpdateMode()) {
      const next = buildFixture(seats);
      fs.writeFileSync(fixturePath, JSON.stringify(next, null, 2) + "\n", "utf-8");
      console.log(`prompt-baseline: fixture updated at ${fixturePath}`);
      return;
    }

    const fixture = loadFixture();

    // actionable per-seat assertion via load-bearing src helper
    for (const seat of seats) {
      const entry = fixture.seats[seat.fileName];
      expect(
        entry,
        `fixture missing seat ${seat.fileName} — run UPDATE_PROMPT_BASELINE=1 bun test plugin/test/prompt-baseline.test.ts`,
      ).toBeDefined();
      const actual = extractSections(seat.content);
      assertSectionsMatch(seat.fileName, entry!.sections, actual);
      expect(actual).toEqual(entry!.sections);
    }

    // also ensure fixture has no extra seats
    const renderedNames = new Set(seats.map((s) => s.fileName));
    for (const name of Object.keys(fixture.seats)) {
      expect(
        renderedNames.has(name),
        `fixture has stale seat ${name} not rendered from assets`,
      ).toBe(true);
    }
  });

  test("normalized whole-assembly hash matches fixture (stable across machines/days)", async () => {
    const seats = await renderSeats(agentsDir, "default");

    if (isUpdateMode()) {
      // already handled by previous test in same run; ensure hash would match after update
      return;
    }

    const fixture = loadFixture();
    const actualHash = computeWholeHash(seats);
    const expectedPerSeatHashes = Object.fromEntries(
      Object.entries(fixture.seats).map(([k, v]) => [k, v.hash]),
    );
    assertWholeHash(fixture.wholeHash, actualHash, seats, expectedPerSeatHashes);
    expect(actualHash).toBe(fixture.wholeHash);

    // per-seat hash attribution: each seat's normalized hash must match
    for (const s of seats) {
      const expectedHash = fixture.seats[s.fileName]?.hash;
      expect(expectedHash).toBeDefined();
      expect(computePerSeatHash(s.content)).toBe(expectedHash);
    }
  });

  test("normalization strips volatile content (dates, versions, absolute paths, home dirs, token counts, npm versions)", () => {
    const sample = [
      "released on 2026-09-06 and 2026/09/06 version v0.4.1 at /Users/ryan/opencode/tgo and /home/alice/docs",
      "home is ~/projects and $HOME is set",
      "cost 123 tokens and 1000-token budget npm @cortexkit/aft-opencode@1.2.3",
      "plain stable text with max 3 and steps: 100 should remain",
    ].join("\n");
    const normalized = normalizeForHash(sample);
    expect(normalized).toContain("<DATE>");
    expect(normalized).toContain("<VERSION>");
    expect(normalized).toContain("<PATH>");
    expect(normalized).toContain("<TOKENS>");
    // stable content must survive
    expect(normalized).toContain("plain stable text");
    expect(normalized).toContain("max 3");
    // actual volatile strings must be gone
    expect(normalized).not.toContain("2026-09-06");
    expect(normalized).not.toContain("/Users/ryan");
    expect(normalized).not.toContain("0.4.1");
    expect(normalized).not.toContain("123 tokens");
    expect(normalized).not.toContain("1.2.3");

    // hash stability: normalized hashes equal despite volatile differences
    const a = normalizeForHash("built on 2026-09-06 at /Users/ryan with v1.2.3 and 100 tokens");
    const b = normalizeForHash("built on 2025-01-01 at /home/bob with v9.9.9 and 999 tokens");
    // same semantic skeleton after normalization -> same hash fragment
    expect(a).toBe("built on <DATE> at <PATH> with <VERSION> and <TOKENS>\n");
    expect(b).toBe("built on <DATE> at <PATH> with <VERSION> and <TOKENS>\n");
    expect(a).toBe(b);
  });

  test("update procedure documented in fixture header and docs/SETUP.md", () => {
    const fixture = loadFixture();
    expect(fixture._header).toContain("UPDATE_PROMPT_BASELINE=1");
    expect(fixture._header).toContain("bun test plugin/test/prompt-baseline.test.ts");
    const setupPath = path.resolve(__dirname, "../../docs/SETUP.md");
    const setup = fs.readFileSync(setupPath, "utf-8");
    expect(setup).toContain("UPDATE_PROMPT_BASELINE=1");
    expect(setup).toContain("prompt-baseline");
  });
});

describe("prompt baseline seeded-mutation proof — guard is not vacuous", () => {
  test("mutated section order is caught with actionable seat + section message", async () => {
    const fixture = loadFixture();
    const seats = await renderSeats(agentsDir, "default");
    const actualByFile = Object.fromEntries(seats.map((s) => [s.fileName, extractSections(s.content)]));

    // perturb: reverse dylan's sections (or first seat if dylan missing)
    const targetFile = fixture.seats["dylan.md"] ? "dylan.md" : Object.keys(fixture.seats)[0];
    const mutatedSections = [...fixture.seats[targetFile].sections].reverse();

    const diff = diffSections(mutatedSections, actualByFile[targetFile]);
    // guard must detect mismatch
    expect(diff).not.toBeNull();
    expect(diff!.index).toBe(0);

    // verify the load-bearing guard helper throws with actionable message
    expect(() => assertSectionsMatch(targetFile, mutatedSections, actualByFile[targetFile])).toThrow(targetFile);
    expect(() => assertSectionsMatch(targetFile, mutatedSections, actualByFile[targetFile])).toThrow("at section 0");
    expect(() => assertSectionsMatch(targetFile, mutatedSections, actualByFile[targetFile])).toThrow("expected");

    // also ensure mutated hash would diverge
    const mutatedSeats = seats.map((s) =>
      s.fileName === targetFile ? { ...s, content: s.content + "\n## MUTATED SECTION\n" } : s,
    );
    const mutatedHash = computeWholeHash(mutatedSeats);
    expect(mutatedHash).not.toBe(fixture.wholeHash);
  });

  test("mutated rendered seats fail whole-hash guard", async () => {
    const fixture = loadFixture();
    const seats = await renderSeats(agentsDir, "default");
    const actualHash = computeWholeHash(seats);
    expect(actualHash).toBe(fixture.wholeHash);

    // introduce a content mutation not visible in sections (body text change) — hash must catch it
    const mutatedSeats = seats.map((s) => ({ ...s, content: s.content + "\nmutated body" }));
    const mutatedHash = computeWholeHash(mutatedSeats);
    expect(mutatedHash).not.toBe(fixture.wholeHash);

    // directly assert load-bearing helper throws on hash mismatch with per-seat attribution
    const expectedPerSeatHashes = Object.fromEntries(
      Object.entries(fixture.seats).map(([k, v]) => [k, v.hash]),
    );
    expect(() => assertWholeHash(fixture.wholeHash, mutatedHash, mutatedSeats, expectedPerSeatHashes)).toThrow(
      "whole-assembly hash mismatch",
    );
    // per-seat attribution: should name at least one diverging seat
    expect(() => assertWholeHash(fixture.wholeHash, mutatedHash, mutatedSeats, expectedPerSeatHashes)).toThrow(
      /diverging seat\(s\):/,
    );
  });

  test("renamed section is caught (not just reordered)", async () => {
    const fixture = loadFixture();
    const seats = await renderSeats(agentsDir, "default");
    const actualByFile = Object.fromEntries(seats.map((s) => [s.fileName, extractSections(s.content)]));
    const targetFile = "bernstein.md";
    const mutatedSections = ["# RENAMED", ...fixture.seats[targetFile].sections.slice(1)];
    const diff = diffSections(mutatedSections, actualByFile[targetFile]);
    expect(diff).not.toBeNull();
    expect(diff!.expected).toBe("# RENAMED");
    expect(diff!.actual).toBe("# Bernstein");

    // load-bearing helper must also catch it
    expect(() => assertSectionsMatch(targetFile, mutatedSections, actualByFile[targetFile])).toThrow(
      "prompt baseline drift",
    );
  });
});
