import { test, expect, describe } from "bun:test";
import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { TgoPlugin } from "../src/plugin";

function ensureTmpTestClaimedFixture(issueId: string): void {
  const dir = "/tmp/tgo-test";
  try { mkdirSync(dir, { recursive: true }); } catch {}
  spawnSync("git", ["init"], { cwd: dir, encoding: "utf8", stdio: "ignore" });
  spawnSync("git", ["config", "user.email", "test@test.com"], { cwd: dir, encoding: "utf8", stdio: "ignore" });
  spawnSync("git", ["config", "user.name", "Test"], { cwd: dir, encoding: "utf8", stdio: "ignore" });
  spawnSync("bd", ["init", "--non-interactive", "--skip-hooks"], { cwd: dir, encoding: "utf8", stdio: "ignore" });
  spawnSync("bd", ["create", `TGO fixture ${issueId}`, "-t", "task", "-p", "2", "--id", issueId, "--force", "--json"], { cwd: dir, encoding: "utf8", stdio: "ignore" });
  spawnSync("bd", ["update", "--json", issueId, "--claim"], { cwd: dir, encoding: "utf8", stdio: "ignore" });
}

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    client: {
      app: { log: async () => ({}) },
      session: {
        get: async () => ({ data: { parentID: null } }),
        abort: async () => {},
      },
    },
    $: (() => {}) as never,
    project: { worktree: "/tmp/tgo-test" },
    directory: "/tmp/tgo-test",
    worktree: "/tmp/tgo-test",
    ...overrides,
  } as never;
}

describe("preset resolution failure propagation", () => {
  test("any rejection from preset path aborts dispatch (generic error propagates)", async () => {
    // Use an invalid directory type (number) to force a generic TypeError inside the snapshot path
    // This error does NOT contain any of the old allowlisted substrings, so old code would swallow it.
    const hooks = await TgoPlugin(
      baseInput({
        directory: 123 as any,
        project: { worktree: 123 as any },
        worktree: 123 as any,
      }),
      {}
    );
    const before = hooks["tool.execute.before"]!;
    // Valid packet that reaches the snapshot capture block
    const args = {
      subagent_type: "dylan",
      delegationPacket: {
        Objective: "Do work",
        Files: ["src/a.ts"],
        Interfaces: "keep",
        Constraints: "none",
        Verification: "run tests",
        exitGate: true,
        issueId: "tgo-123",
        issueStatusObserved: "in_progress",
        issueAssigneeObserved: "tester",
        claimExitCode: 0,
        delegationId: "d-1",
        beadsOperator: "Bernstein",
      },
    };
    // With the fix, the generic TypeError from path.join(123, ...) must propagate as a rejection
    await expect(before({ sessionID: "primary", callID: "c1", tool: "task" } as never, { args } as never)).rejects.toThrow();
  });

  test("host-authoritative preset failures still propagate", { timeout: 20000 }, async () => {
    // Live-claim gate fixture (test-side): claim tgo-124 in /tmp/tgo-test so dispatch reaches the host-authoritative throw.
    ensureTmpTestClaimedFixture("tgo-124");
    const hooks = await TgoPlugin(baseInput(), {});
    const before = hooks["tool.execute.before"]!;
    // Missing subagent_type triggers host-authoritative seat resolution failure
    const args = {
      // subagent_type intentionally omitted to trigger seat resolution error
      delegationPacket: {
        Objective: "Do work",
        Files: ["src/a.ts"],
        Interfaces: "keep",
        Constraints: "none",
        Verification: "run tests",
        exitGate: true,
        issueId: "tgo-124",
        issueStatusObserved: "in_progress",
        issueAssigneeObserved: "tester",
        claimExitCode: 0,
        delegationId: "d-2",
        beadsOperator: "Bernstein",
      },
    };
    await expect(before({ sessionID: "primary", callID: "c1", tool: "task" } as never, { args } as never)).rejects.toThrow(/host-authoritative/);
  });
});
