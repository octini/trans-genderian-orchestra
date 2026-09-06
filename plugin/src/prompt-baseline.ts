/**
 * Prompt-assembly baseline helpers.
 *
 * Normalization (documented): before hashing, strip volatile content so the
 * hash is stable across machines and days:
 *  - dates: YYYY-MM-DD, YYYY/MM/DD, MM/DD/YYYY, ISO timestamps
 *  - versions / npm versions: semver x.y.z with optional -prerelease/+build (v? prefix)
 *  - absolute paths & home dirs: /Users/..., /home/..., /tmp/..., /var/..., /opt/..., ~/..., $HOME, $HOME/..., Windows C:\...
 *  - token counts: "<n> token(s)", "<n>-token"
 *  All replaced with placeholders (<DATE>, <VERSION>, <PATH>, <TOKENS>).
 *  Line endings and trailing whitespace are also canonicalized.
 *
 * Update procedure: UPDATE_PROMPT_BASELINE=1 bun test plugin/test/prompt-baseline.test.ts
 * See fixture header in plugin/test/fixtures/prompt-baseline.json and docs/SETUP.md.
 */
import * as crypto from "node:crypto";
import type { RenderedSeat } from "./build";

export function normalizeForHash(content: string): string {
  let out = content.replace(/\r\n/g, "\n");
  // canonicalize trailing whitespace per line
  out = out
    .split("\n")
    .map((l) => l.replace(/\s+$/g, ""))
    .join("\n");

  // Tradeoff: numeric elision (dates/token counts/versions) can mask authored
  // numeric drift — e.g. a rendered token-cap number changing would be hidden
  // as <TOKENS>/<DATE>/<VERSION>. Current rendered seats contain no
  // machine/date-volatile content; revisit if folds ever render numeric caps.
  // 1. dates — YYYY-MM-DD + optional time, YYYY/MM/DD, MM/DD/YYYY
  out = out.replace(/\b\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)?\b/g, "<DATE>");
  out = out.replace(/\b\d{4}\/\d{2}\/\d{2}\b/g, "<DATE>");
  out = out.replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, "<DATE>");

  // 2. token counts — "123 tokens", "1 token", "1000-token", "500-tokens"
  out = out.replace(/\b\d+\s*tokens?\b/gi, "<TOKENS>");
  out = out.replace(/\b\d+-tokens?\b/gi, "<TOKENS>");

  // 3. absolute paths & home dirs (machine-specific)
  //    keep URL hosts intact — only match known machine prefixes
  out = out.replace(/~\/[^\s\n]*/g, "<PATH>");
  // bare ~ token (home dir)
  out = out.replace(/(?<![^\s])~(?=\s|$|[,\.])/g, "<PATH>");
  out = out.replace(/\$HOME(?:\/[^\s\n]*)?/g, "<PATH>");
  out = out.replace(/\/Users\/[^\s\n]*/g, "<PATH>");
  out = out.replace(/\/home\/[^\s\n]*/g, "<PATH>");
  out = out.replace(/\/tmp\/[^\s\n]*/g, "<PATH>");
  out = out.replace(/\/var\/[^\s\n]*/g, "<PATH>");
  out = out.replace(/\/opt\/[^\s\n]*/g, "<PATH>");
  out = out.replace(/\/private\/[^\s\n]*/g, "<PATH>");
  // Windows absolute paths
  out = out.replace(/\b[A-Z]:\\[^\s\n]*/gi, "<PATH>");
  out = out.replace(/\b[A-Z]:\/[^\s\n]*/gi, "<PATH>");

  // 4. versions / npm versions — semver x.y.z (v? prefix, optional prerelease/build)
  //    do this after paths so "/tmp/foo@1.2.3" path prefix already replaced
  out = out.replace(/\bv?\d+\.\d+\.\d+(?:[-+][\w.+-]+)?\b/g, "<VERSION>");

  // 5. collapse excessive blank lines
  out = out.replace(/\n{3,}/g, "\n\n");
  out = out.trim() + "\n";
  return out;
}

export function extractSections(content: string): string[] {
  // ATX-only headings, fence-blind/setext-blind — verified against current
  // seat files; a col-0 '#' inside a fenced block would pollute sections.
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^#{1,6}\s+/.test(l));
}

export function computeWholeHash(seats: RenderedSeat[]): string {
  const sorted = [...seats].sort((a, b) => a.fileName.localeCompare(b.fileName));
  const concatenated = sorted.map((s) => normalizeForHash(s.content)).join("\n---\n");
  return crypto.createHash("sha256").update(concatenated, "utf-8").digest("hex");
}

export function computePerSeatHash(content: string): string {
  return crypto.createHash("sha256").update(normalizeForHash(content), "utf-8").digest("hex");
}

export interface SectionDiff {
  index: number;
  expected: string | undefined;
  actual: string | undefined;
}

export function diffSections(expected: string[], actual: string[]): SectionDiff | null {
  const len = Math.max(expected.length, actual.length);
  for (let i = 0; i < len; i++) {
    if (expected[i] !== actual[i]) return { index: i, expected: expected[i], actual: actual[i] };
  }
  return null;
}

export function assertSectionsMatch(fileName: string, expected: string[], actual: string[]): void {
  const diff = diffSections(expected, actual);
  if (diff) {
    const exp = diff.expected ?? "<missing>";
    const act = diff.actual ?? "<missing>";
    throw new Error(
      `prompt baseline drift in ${fileName} at section ${diff.index}: expected "${exp}" vs actual "${act}" — expected order [${expected.join(" | ")}] vs actual [${actual.join(" | ")}]`,
    );
  }
}

export function assertWholeHash(
  expected: string,
  actual: string,
  seats: RenderedSeat[],
  expectedPerSeatHashes?: Record<string, string>,
): void {
  if (expected !== actual) {
    const hint = seats.map((s) => s.fileName).join(", ");
    let perSeatClue = "";
    if (expectedPerSeatHashes) {
      const diverging: string[] = [];
      for (const s of seats) {
        const expHash = expectedPerSeatHashes[s.fileName];
        const actHash = computePerSeatHash(s.content);
        if (expHash === undefined) diverging.push(`${s.fileName} (new)`);
        else if (expHash !== actHash) diverging.push(s.fileName);
      }
      for (const name of Object.keys(expectedPerSeatHashes)) {
        if (!seats.some((s) => s.fileName === name)) diverging.push(`${name} (stale)`);
      }
      if (diverging.length > 0) perSeatClue = ` diverging seat(s): ${diverging.join(", ")}`;
    }
    throw new Error(
      `prompt baseline whole-assembly hash mismatch: expected ${expected} vs actual ${actual} (seats: ${hint})${perSeatClue} — check per-seat section diffs above or run UPDATE_PROMPT_BASELINE=1 to refresh after intentional changes`,
    );
  }
}
