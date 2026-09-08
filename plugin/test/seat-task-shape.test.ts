import { test, expect, describe } from "bun:test";
import * as path from "node:path";
import { parseFrontmatter, readSeatContent } from "../src/permissions";

const agentsDir = path.resolve(__dirname, "../assets/agents");

// Flat task form only: a nested permission.task map drops the task tool from
// host manifests on opencode 1.18.29. Lane discipline lives in
// validateLaneAllowance (lane.test.ts), not frontmatter nesting.
const EXPECTED_FLAT_TASK: Record<string, "allow" | "deny"> = {
  bernstein: "allow",
  dylan: "allow",
  horowitz: "allow",
  nirvana: "allow",
  nas: "deny",
  cobain: "deny",
  grohl: "deny",
  novoselic: "deny",
};

describe("seat task shape — zero nested task maps", () => {
  for (const [seat, expected] of Object.entries(EXPECTED_FLAT_TASK)) {
    test(`${seat}: task is flat ${expected}`, async () => {
      const content = await readSeatContent(agentsDir, seat);
      const permission = parseFrontmatter(content).permission as Record<string, unknown>;
      expect(typeof permission.task, seat).not.toBe("object");
      expect(permission.task, seat).toBe(expected);
    });
  }

  test("no nested task map in any seat file", async () => {
    const files = Object.keys(EXPECTED_FLAT_TASK);
    expect(files).toHaveLength(8);
    for (const seat of files) {
      const content = await readSeatContent(agentsDir, seat);
      const permission = parseFrontmatter(content).permission as Record<string, unknown>;
      expect(
        permission.task === undefined || typeof permission.task === "string",
        seat
      ).toBe(true);
    }
  });
});
