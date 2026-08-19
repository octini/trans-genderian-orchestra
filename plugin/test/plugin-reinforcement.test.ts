import { describe, expect, test } from 'bun:test';

import { TgoPlugin } from '../src/plugin';
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

function input() {
  return {
    client: {
      app: { log: async () => ({}) },
      session: {
        get: async ({ path }: { path: { id: string } }) => ({
          data: path.id === "delegated" ? { parentID: "primary" } : { parentID: null },
        }),
      },
    },
    $: (() => {}) as never,
    project: { worktree: "/tmp/tgo-test" },
    directory: "/tmp/tgo-test",
    worktree: "/tmp/tgo-test",
  } as never;
}

describe("plugin completion observer boundary", () => {
  test("tool boundary validates tiny, standard, and heavy packets while bypassing ordinary tools", async () => {
    const hooks = await TgoPlugin(input(), {});
    const before = hooks["tool.execute.before"]!;
    const run = (args: unknown) => before({ sessionID: "primary", callID: "call", tool: "task" } as never, { args } as never);
    await run({ tool: "bash", command: "true" });
    await run({
      touchSet: ["src/value.ts"], boundedTouchSet: true, transformation: "replace", reversible: true,
      deterministicVerification: true,
      delegationPacket: { minimal: true, Objective: "Replace", Files: ["src/value.ts"], Verification: "test", exitGate: true },
    });
    await run({ touchSet: ["src/value.ts"], delegationPacket: {
      Objective: "Replace", Files: ["src/value.ts"], Interfaces: "same", Constraints: "bounded", Verification: "test", exitGate: true,
      issueId: "tgo-standard", issueStatusObserved: "in_progress", issueAssigneeObserved: "ryangking", claimExitCode: 0, delegationId: "d-standard", beadsOperator: "Bernstein",
    }});
    await run({ touchSet: ["src/value.ts"], ambiguity: true, delegationPacket: {
      Objective: "Resolve", Files: ["src/value.ts"], Interfaces: "same", Constraints: "bounded", Verification: "review", exitGate: true,
      issueId: "tgo-heavy", issueStatusObserved: "in_progress", issueAssigneeObserved: "ryangking", claimExitCode: 0, delegationId: "d-heavy", beadsOperator: "Bernstein",
    }});
  });

  test("tool boundary rejects malformed packets", async () => {
    const hooks = await TgoPlugin(input(), {});
    await expect(hooks["tool.execute.before"]!({ sessionID: "primary", callID: "call", tool: "task" } as never, {
      args: { touchSet: ["src/value.ts"], delegationPacket: { Objective: "x", Files: ["src/other.ts"] } },
    } as never)).rejects.toThrow("routed named touch set");
  });

  test("bypasses delegation validation for non-task tools", async () => {
    const hooks = await TgoPlugin(input(), {});
    await expect(hooks["tool.execute.before"]!({ sessionID: "primary", callID: "call", tool: "bash" } as never, {
      args: { delegationPacket: { Objective: "x", Files: ["src/other.ts"] } },
    } as never)).resolves.toBeUndefined();
  });

  test("tool result preserves metadata while recording the specialist report", async () => {
    const hooks = await TgoPlugin(input(), {});
    const raw = "STATUS: partial\nCHANGES: x\nVERIFIED: exit gate: true; tests pass\nGAPS: one test remains";
    const output = {
      title: "existing title",
      output: raw,
      metadata: { requestID: "request-1", recovery: "caller-owned" },
    };

    await hooks["tool.execute.after"]!(
      { sessionID: "primary", callID: "call", tool: "task", args: { subagent_type: "Horowitz" } } as never,
      output as never,
    );

    expect(output.title).toBe("existing title");
    expect(output.output).toBe(raw);
    expect(output.metadata).toMatchObject({ requestID: "request-1", recovery: "caller-owned" });
    expect(output.metadata.specialistReport).toMatchObject({
      raw,
      completionSafe: false,
      recovery: "retry",
    });
    expect(output.metadata.closureGate).toMatchObject({ canClose: false, closureBlocked: true });
  });

  test("metadata-only integration closes complete standard work after Horowitz review", async () => {
    const hooks = await TgoPlugin(input(), {});
    const output = {
      output: "STATUS: complete\nCHANGES: x\nVERIFIED: exit gate: true; tests pass\nGAPS: none",
      metadata: { reviewComplete: true },
    };

    await hooks["tool.execute.after"]!(
      {
        sessionID: "primary",
        callID: "call",
        tool: "task",
        args: {
          touchSet: ["src/value.ts"],
          boundedTouchSet: true,
          transformation: "replace",
          reversible: true,
          deterministicVerification: true,
          delegationPacket: {
            Objective: "Replace", Files: ["src/value.ts"], Interfaces: "same",
            Constraints: "bounded", Verification: "test", exitGate: true,
            issueId: "tgo-standard", issueStatusObserved: "in_progress", issueAssigneeObserved: "ryangking", claimExitCode: 0, delegationId: "d-standard", beadsOperator: "Bernstein",
          },
        },
      } as never,
      output as never,
    );

    expect(output.metadata).toMatchObject({ closureGate: { canClose: true, closureBlocked: false } });
  });

  test("rejects forged Bernstein metadata from a child session", async () => {
    const hooks = await TgoPlugin(input(), {});
    await expect(hooks["tool.execute.before"]!(
        { sessionID: "delegated", callID: "call", tool: "task" } as never,
      {
        args: {
          touchSet: ["src/value.ts"],
          delegationPacket: {
            Objective: "Replace", Files: ["src/value.ts"], Interfaces: "same",
            Constraints: "bounded", Verification: "test", exitGate: true,
            issueId: "tgo-forged", issueStatusObserved: "in_progress", issueAssigneeObserved: "ryangking", claimExitCode: 0,
            delegationId: "d-forged", beadsOperator: "Bernstein",
          },
        },
      } as never,
    )).rejects.toThrow("identified primary session");
  });

  test("fails closed when primary session identity is unavailable", async () => {
    const hooks = await TgoPlugin({
      ...input(),
      client: { app: { log: async () => ({}) }, session: { get: async () => ({ data: undefined }) } },
    } as never, {});
    await expect(hooks["tool.execute.before"]!(
      { sessionID: "unknown", callID: "call", tool: "task" } as never,
      { args: {
        touchSet: ["src/value.ts"],
        delegationPacket: {
          Objective: "Replace", Files: ["src/value.ts"], Interfaces: "same",
          Constraints: "bounded", Verification: "test", exitGate: true,
          issueId: "tgo-forged", issueStatusObserved: "in_progress", issueAssigneeObserved: "ryangking", claimExitCode: 0, delegationId: "d-forged", beadsOperator: "Bernstein",
        },
      } } as never,
    )).rejects.toThrow("identified primary session");
  });

  test("fails closed when parentID is missing", async () => {
    const hooks = await TgoPlugin({
      ...input(),
      client: { app: { log: async () => ({}) }, session: { get: async () => ({ data: {} }) } },
    } as never, {});
    await expect(hooks["tool.execute.before"]!(
      { sessionID: "unknown", callID: "call", tool: "task" } as never,
      { args: { touchSet: ["src/value.ts"], delegationPacket: {
        Objective: "x", Files: ["src/value.ts"], Interfaces: "same", Constraints: "bounded",
        Verification: "test", exitGate: true, issueId: "tgo-missing-parent", issueStatusObserved: "in_progress", issueAssigneeObserved: "ryangking", claimExitCode: 0,
        delegationId: "d-missing-parent", beadsOperator: "Bernstein",
      } } } as never,
    )).rejects.toThrow("identified primary session");
  });

  test("does not run setup for a session with missing parentID", async () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "tgo-missing-parent-"));
    const hooks = await TgoPlugin({
      ...input(),
      directory,
      project: { worktree: directory },
      worktree: directory,
    } as never, {});
    await hooks.event!({ event: {
      type: "session.created",
      properties: { info: { id: "missing-parent", directory, parentID: undefined } },
    } } as never);
    expect(existsSync(path.join(directory, ".beads"))).toBe(false);
    rmSync(directory, { recursive: true, force: true });
  });

  test("tiny completion emits no Beads lifecycle operation", async () => {
    const hooks = await TgoPlugin(input(), {});
    const output = {
      output: "STATUS: complete\nCHANGES: x\nVERIFIED: exit gate: true\nGAPS: none",
      metadata: {},
    };

    await hooks["tool.execute.after"]!(
      {
        sessionID: "primary", callID: "call", tool: "task",
        args: {
          touchSet: ["src/value.ts"],
          boundedTouchSet: true,
          transformation: "replace",
          reversible: true,
          deterministicVerification: true,
          delegationPacket: {
            minimal: true, Objective: "Replace", Files: ["src/value.ts"],
            Verification: "test", exitGate: true,
          },
        },
      } as never,
      output as never,
    );

    expect(output.metadata.specialistReport).toBeDefined();
    expect(output.metadata.closureGate).toMatchObject({ canClose: true, closureBlocked: false });
    expect(output.metadata.beadsLifecycle).toBeUndefined();
  });

  test("metadata-only integration closes complete heavy work after Horowitz review", async () => {
    const hooks = await TgoPlugin(input(), {});
    const output = {
      output: "STATUS: complete\nCHANGES: x\nVERIFIED: exit gate: true; tests pass\nGAPS: none",
      metadata: { reviewComplete: true },
    };

    await hooks["tool.execute.after"]!(
      {
        sessionID: "primary",
        callID: "call",
        tool: "task",
        args: {
          touchSet: ["src/value.ts"], ambiguity: true,
          delegationPacket: {
            Objective: "Resolve", Files: ["src/value.ts"], Interfaces: "same",
            Constraints: "bounded", Verification: "review", exitGate: true,
            issueId: "tgo-heavy", issueStatusObserved: "in_progress", issueAssigneeObserved: "ryangking", claimExitCode: 0, delegationId: "d-heavy", beadsOperator: "Bernstein",
          },
        },
      } as never,
      output as never,
    );

    expect(output.metadata).toMatchObject({ closureGate: { canClose: true, closureBlocked: false } });
  });

  test("metadata-only integration blocks incomplete Horowitz review", async () => {
    const hooks = await TgoPlugin(input(), {});
    const output = {
      output: "STATUS: complete\nCHANGES: x\nVERIFIED: exit gate: true; tests pass\nGAPS: none",
      metadata: { reviewComplete: false },
    };

    await hooks["tool.execute.after"]!(
      {
        sessionID: "primary", callID: "call", tool: "task",
        args: {
          touchSet: ["src/value.ts"],
          delegationPacket: {
            Objective: "Replace", Files: ["src/value.ts"], Interfaces: "same",
            Constraints: "bounded", Verification: "test", exitGate: true,
            issueId: "tgo-standard", issueStatusObserved: "in_progress", issueAssigneeObserved: "ryangking", claimExitCode: 0, delegationId: "d-standard", beadsOperator: "Bernstein",
          },
        },
      } as never,
      output as never,
    );

    expect(output.metadata).toMatchObject({ closureGate: { canClose: false, closureBlocked: true } });
  });

  test("metadata-only integration blocks missing Horowitz review", async () => {
    const hooks = await TgoPlugin(input(), {});
    const output = {
      output: "STATUS: complete\nCHANGES: x\nVERIFIED: exit gate: true; tests pass\nGAPS: none",
      metadata: {},
    };

    await hooks["tool.execute.after"]!(
      {
        sessionID: "primary", callID: "call", tool: "task",
        args: {
          touchSet: ["src/value.ts"],
          delegationPacket: {
            Objective: "Replace", Files: ["src/value.ts"], Interfaces: "same",
            Constraints: "bounded", Verification: "test", exitGate: true,
            issueId: "tgo-standard", issueStatusObserved: "in_progress", issueAssigneeObserved: "ryangking", claimExitCode: 0, delegationId: "d-standard", beadsOperator: "Bernstein",
          },
        },
      } as never,
      output as never,
    );

    expect(output.metadata).toMatchObject({ closureGate: { canClose: false, closureBlocked: true } });
  });

  test("is inert by default and does not alter the system transform", async () => {
    const hooks = await TgoPlugin(input(), {});
    const output = { text: "The result is ready. The result is ready." };
    await hooks["experimental.text.complete"]?.(
      { sessionID: "primary", messageID: "message", partID: "part" } as never,
      output as never,
    );
    const system = ["existing"];
    await hooks["experimental.chat.system.transform"]?.(
      { sessionID: "primary", model: "test" } as never,
      { system } as never,
    );
    expect(system).not.toContain("Self-audit the next response");
  });

  test("keeps the opt-in surrogate observer primary-only", async () => {
    const hooks = await TgoPlugin(input(), { concision: { enabled: true, reinforcement: true } });
    const complete = hooks["experimental.text.complete"]!;
    await complete(
      { sessionID: "primary", messageID: "message", partID: "part" } as never,
      { text: "The result is ready. The result is ready." } as never,
    );
    await complete(
      { sessionID: "delegated", messageID: "message", partID: "part" } as never,
      { text: "The result is ready. The result is ready." } as never,
    );
    const system = ["existing"];
    await hooks["experimental.chat.system.transform"]?.(
      { sessionID: "primary", model: "test" } as never,
      { system } as never,
    );
    expect(system).not.toContain("Self-audit the next response");
  });

  test("plugin boundary suppresses delegated completion after a parent lookup", async () => {
    const hooks = await TgoPlugin(input(), { concision: { enabled: true, reinforcement: true } });
    const complete = hooks["experimental.text.complete"]!;
    await complete(
      { sessionID: "delegated", messageID: "message", partID: "part" } as never,
      { text: "The result is ready. The result is ready." } as never,
    );
    const system = ["existing"];
    await hooks["experimental.chat.system.transform"]?.(
      { sessionID: "delegated", model: "test" } as never,
      { system } as never,
    );
    expect(system).toEqual(["existing"]);
  });
});
