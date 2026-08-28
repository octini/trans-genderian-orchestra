import { test, expect, describe } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { TgoPlugin } from "../src/plugin";

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "tgo-guard-"));
}

function makeDollar(): any {
  const chain: any = {
    env: () => chain,
    cwd: () => chain,
    nothrow: () => chain,
    text: async () => "",
    stdout: { toString: () => "" },
    stderr: { toString: () => "" },
    exitCode: 0,
  };
  const fn: any = (_strings: TemplateStringsArray, ..._vals: any[]) => chain;
  return fn;
}

function makeClient(dir: string, delegatedToParent: Map<string, string>, aborts: string[], prompts: Array<{ parentID: string; text: string }>) {
  return {
    app: { log: async () => ({}) },
    session: {
      abort: async ({ path: { id } }: { path: { id: string } }) => { aborts.push(id); },
      prompt: async ({ path: { id }, body }: { path: { id: string }; body: { parts: Array<{ type: string; text: string; synthetic?: boolean }> } }) => { prompts.push({ parentID: id, text: body.parts?.[0]?.text ?? "" }); },
      get: async ({ path: { id } }: { path: { id: string } }) => {
        const parent = delegatedToParent.get(id);
        if (parent) return { data: { parentID: parent } };
        return { data: { parentID: null } };
      },
      messages: async () => [],
    },
  } as any;
}

function makeInput(dir: string, client: any) {
  return {
    client,
    $: makeDollar(),
    project: { worktree: dir },
    directory: dir,
    worktree: dir,
  } as never;
}

describe("termination guards", () => {
  test("primary protection: non-delegated session with STATUS complete does not flag", async () => {
    const dir = tmpDir();
    const aborts: string[] = [];
    const prompts: Array<{ parentID: string; text: string }> = [];
    const delegatedToParent = new Map<string, string>();
    const client = makeClient(dir, delegatedToParent, aborts, prompts);
    try {
      const hooks = await TgoPlugin(makeInput(dir, client), { setup: { enabled: false }, board: { enabled: false } } as any);
      const sessionID = "sess_primary123";
      // no session.created with parentID → not delegated
      await hooks["experimental.chat.messages.transform"]!(
        {} as never,
        { messages: [
          { info: { role: "assistant", sessionID, id: "a1" }, parts: [{ type: "text", text: "STATUS: complete\nCHANGES: x" }] },
        ] } as never,
      );
      await hooks["tool.execute.before"]!({ sessionID, callID: "c1", tool: "bash" } as never, { args: {} } as never);
      expect(aborts.length).toBe(0);
      expect(prompts.length).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("stale history: old completion does not flag when last assistant has no completion", async () => {
    const dir = tmpDir();
    const aborts: string[] = [];
    const prompts: Array<{ parentID: string; text: string }> = [];
    const delegatedToParent = new Map<string, string>();
    const client = makeClient(dir, delegatedToParent, aborts, prompts);
    try {
      const hooks = await TgoPlugin(makeInput(dir, client), { setup: { enabled: false }, board: { enabled: false } } as any);
      const delegatedId = "ses_stale123";
      const parentId = "parent_stale123";
      delegatedToParent.set(delegatedId, parentId);
      await hooks.event!({ event: { type: "session.created", properties: { info: { id: delegatedId, parentID: parentId } } } } as never);
      await hooks["experimental.chat.messages.transform"]!(
        {} as never,
        { messages: [
          { info: { role: "assistant", sessionID: delegatedId, id: "a1" }, parts: [{ type: "text", text: "STATUS: complete\nCHANGES: old" }] },
          { info: { role: "assistant", sessionID: delegatedId, id: "a2" }, parts: [{ type: "text", text: "still working, no status" }] },
        ] } as never,
      );
      await hooks["tool.execute.before"]!({ sessionID: delegatedId, callID: "c1", tool: "bash" } as never, { args: {} } as never);
      expect(aborts.length).toBe(0);
      expect(prompts.length).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("gate required not satisfied: delegated complete but exitGate false when true required does not abort and entry remains", async () => {
    const dir = tmpDir();
    const aborts: string[] = [];
    const prompts: Array<{ parentID: string; text: string }> = [];
    const delegatedToParent = new Map<string, string>();
    const client = makeClient(dir, delegatedToParent, aborts, prompts);
    try {
      const hooks = await TgoPlugin(makeInput(dir, client), { setup: { enabled: false }, board: { enabled: false } } as any);
      const delegatedId = "ses_gate123";
      const parentId = "parent_gate123";
      delegatedToParent.set(delegatedId, parentId);
      await hooks.event!({ event: { type: "session.created", properties: { info: { id: delegatedId, parentID: parentId } } } } as never);
      await hooks["experimental.chat.messages.transform"]!(
        {} as never,
        { messages: [
          { info: { role: "user", sessionID: delegatedId, id: "u1" }, parts: [{ type: "text", text: "do work exitGate: true" }] },
          { info: { role: "assistant", sessionID: delegatedId, id: "a1" }, parts: [{ type: "text", text: "STATUS: complete\nexitGate: false" }] },
        ] } as never,
      );
      await hooks["tool.execute.before"]!({ sessionID: delegatedId, callID: "c1", tool: "bash" } as never, { args: {} } as never);
      expect(aborts.length).toBe(0);
      // entry remains: make gate satisfied now via new transform with exitGate true, next residual should abort
      await hooks["experimental.chat.messages.transform"]!(
        {} as never,
        { messages: [
          { info: { role: "user", sessionID: delegatedId, id: "u1" }, parts: [{ type: "text", text: "do work exitGate: true" }] },
          { info: { role: "assistant", sessionID: delegatedId, id: "a1" }, parts: [{ type: "text", text: "STATUS: complete\nexitGate: true" }] },
        ] } as never,
      );
      await hooks["tool.execute.before"]!({ sessionID: delegatedId, callID: "c2", tool: "bash" } as never, { args: {} } as never);
      expect(aborts.length).toBe(1);
      expect(aborts[0]).toBe(delegatedId);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("abort path: delegated complete with gate satisfied and residual tool aborts and notifies parent with truncated report", async () => {
    const dir = tmpDir();
    const aborts: string[] = [];
    const prompts: Array<{ parentID: string; text: string }> = [];
    const delegatedToParent = new Map<string, string>();
    const client = makeClient(dir, delegatedToParent, aborts, prompts);
    try {
      const hooks = await TgoPlugin(makeInput(dir, client), { setup: { enabled: false }, board: { enabled: false } } as any);
      const delegatedId = "ses_abort123";
      const parentId = "parent_abort123";
      delegatedToParent.set(delegatedId, parentId);
      await hooks.event!({ event: { type: "session.created", properties: { info: { id: delegatedId, parentID: parentId } } } } as never);
      // first user without exitGate: true → gate not required, so complete satisfies
      const header = "STATUS: complete\nCHANGES: x\n";
      const report = header + "A".repeat(1980) + "B".repeat(1000);
      const truncated = report.slice(0, 2000);
      await hooks["experimental.chat.messages.transform"]!(
        {} as never,
        { messages: [
          { info: { role: "user", sessionID: delegatedId, id: "u1" }, parts: [{ type: "text", text: "do work without gate" }] },
          { info: { role: "assistant", sessionID: delegatedId, id: "a1" }, parts: [{ type: "text", text: report }] },
        ] } as never,
      );
      await hooks["tool.execute.before"]!({ sessionID: delegatedId, callID: "c1", tool: "bash" } as never, { args: {} } as never);
      expect(aborts.length).toBe(1);
      expect(aborts[0]).toBe(delegatedId);
      expect(prompts.length).toBe(1);
      expect(prompts[0]!.parentID).toBe(parentId);
      expect(prompts[0]!.text).toContain("TGO TERMINATION:");
      expect(prompts[0]!.text).toContain(truncated);
      expect(prompts[0]!.text).not.toContain("B".repeat(20));
      // prompt report part is exactly truncated length
      const idx = prompts[0]!.text.indexOf(truncated);
      expect(idx).toBeGreaterThan(-1);
      // ensure text after prefix contains truncated but total report portion not longer than 2000
      // truncated is 2000, so prompt should not contain report.slice(2000)
      expect(prompts[0]!.text).not.toContain(report.slice(2000, 2020));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("session.deleted removes delegation so subsequent hooks no-op", async () => {
    const dir = tmpDir();
    const aborts: string[] = [];
    const prompts: Array<{ parentID: string; text: string }> = [];
    const delegatedToParent = new Map<string, string>();
    const client = makeClient(dir, delegatedToParent, aborts, prompts);
    try {
      const hooks = await TgoPlugin(makeInput(dir, client), { setup: { enabled: false }, board: { enabled: false } } as any);
      const delegatedId = "ses_del123";
      const parentId = "parent_del123";
      delegatedToParent.set(delegatedId, parentId);
      await hooks.event!({ event: { type: "session.created", properties: { info: { id: delegatedId, parentID: parentId } } } } as never);
      // set a signal first (gate not required)
      await hooks["experimental.chat.messages.transform"]!(
        {} as never,
        { messages: [
          { info: { role: "user", sessionID: delegatedId, id: "u1" }, parts: [{ type: "text", text: "task without gate" }] },
          { info: { role: "assistant", sessionID: delegatedId, id: "a1" }, parts: [{ type: "text", text: "STATUS: complete\nCHANGES: x" }] },
        ] } as never,
      );
      // delete session
      await hooks.event!({ event: { type: "session.deleted", properties: { info: { id: delegatedId } } } } as never);
      // subsequent transform with complete should be no-op (not delegated)
      await hooks["experimental.chat.messages.transform"]!(
        {} as never,
        { messages: [
          { info: { role: "user", sessionID: delegatedId, id: "u1" }, parts: [{ type: "text", text: "after delete" }] },
          { info: { role: "assistant", sessionID: delegatedId, id: "a2" }, parts: [{ type: "text", text: "STATUS: complete\nCHANGES: after delete" }] },
        ] } as never,
      );
      await hooks["tool.execute.before"]!({ sessionID: delegatedId, callID: "c1", tool: "bash" } as never, { args: {} } as never);
      expect(aborts.length).toBe(0);
      expect(prompts.length).toBe(0);
      // also before hook directly after delete without re-transform should no-op (old signal cleared)
      // re-create signal then delete pattern already covered, but ensure second call still no-op
      await hooks["tool.execute.before"]!({ sessionID: delegatedId, callID: "c2", tool: "bash" } as never, { args: {} } as never);
      expect(aborts.length).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
