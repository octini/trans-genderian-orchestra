import { test, expect, describe } from "bun:test";
import {
  WatchdogController,
  WATCHDOG_ABORT_MARKER,
  type WatchdogConfig,
} from "../src/watchdog";

function makeConfig(overrides: Partial<WatchdogConfig> = {}): WatchdogConfig {
  return {
    enabled: true,
    wallClockMs: 60_000,
    idleMs: 30_000,
    checkMs: 1_000,
    ...overrides,
  };
}

function makeDeps() {
  const aborts: string[] = [];
  const notifies: Array<{ parentID: string; text: string }> = [];
  const logs: Array<{ level: string; message: string }> = [];
  return {
    aborts,
    notifies,
    logs,
    deps: {
      log: (level: string, message: string) => {
        logs.push({ level, message });
      },
      abort: async (sessionID: string) => {
        aborts.push(sessionID);
      },
      notifyParent: async (parentID: string, text: string) => {
        notifies.push({ parentID, text });
      },
    },
  };
}

describe("WatchdogController", () => {
  test("ignores sessions without a parent (primary/user sessions)", () => {
    const { deps } = makeDeps();
    const wd = new WatchdogController(makeConfig(), deps);
    wd.noteSessionCreated({ id: "s-primary", parentID: undefined });
    expect(wd.size).toBe(0);
    wd.dispose();
  });

  test("tracks delegated sessions (created with a parentID)", () => {
    const { deps } = makeDeps();
    const wd = new WatchdogController(makeConfig(), deps);
    wd.noteSessionCreated({ id: "s-sub", parentID: "s-parent" });
    expect(wd.size).toBe(1);
    wd.dispose();
  });

  test("does not double-register the same session", () => {
    const { deps } = makeDeps();
    const wd = new WatchdogController(makeConfig(), deps);
    wd.noteSessionCreated({ id: "s-sub", parentID: "p" });
    wd.noteSessionCreated({ id: "s-sub", parentID: "p" });
    expect(wd.size).toBe(1);
    wd.dispose();
  });

  test("busy status arms the session; idle clears it without aborting", async () => {
    const { deps, aborts } = makeDeps();
    const wd = new WatchdogController(makeConfig(), deps);
    wd.noteSessionCreated({ id: "s-sub", parentID: "p" });
    wd.noteStatus("s-sub", "busy");
    expect(wd.tracked[0]?.busy).toBe(true);
    wd.noteStatus("s-sub", "idle");
    await wd.check();
    expect(aborts).toEqual([]);
    wd.dispose();
  });

  test("aborts on wall-clock cap with a busy session, notifies the parent", async () => {
    const { deps, aborts, notifies } = makeDeps();
    const wd = new WatchdogController(
      makeConfig({ wallClockMs: 50, idleMs: 10_000 }),
      deps
    );
    wd.noteSessionCreated({ id: "s-sub", parentID: "p" });
    wd.noteStatus("s-sub", "busy");
    await new Promise((r) => setTimeout(r, 60));
    await wd.check();
    expect(aborts).toEqual(["s-sub"]);
    expect(notifies.length).toBe(1);
    expect(notifies[0]?.parentID).toBe("p");
    expect(notifies[0]?.text).toContain(WATCHDOG_ABORT_MARKER);
    expect(notifies[0]?.text).toContain("s-sub");
    wd.dispose();
  });

  test("aborts on idle cap when busy but silent past idleMs", async () => {
    const { deps, aborts } = makeDeps();
    const wd = new WatchdogController(
      makeConfig({ wallClockMs: 60_000, idleMs: 30 }),
      deps
    );
    wd.noteSessionCreated({ id: "s-sub", parentID: "p" });
    wd.noteStatus("s-sub", "busy");
    await new Promise((r) => setTimeout(r, 30));
    await wd.check();
    expect(aborts).toEqual(["s-sub"]);
    wd.dispose();
  });

  test("activity resets the idle clock (no false abort)", async () => {
    const { deps, aborts } = makeDeps();
    const wd = new WatchdogController(
      makeConfig({ wallClockMs: 60_000, idleMs: 30 }),
      deps
    );
    wd.noteSessionCreated({ id: "s-sub", parentID: "p" });
    wd.noteStatus("s-sub", "busy");
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 20));
      wd.noteActivity("s-sub");
      await wd.check();
    }
    expect(aborts).toEqual([]);
    wd.dispose();
  });

  test("once aborted, a session is not re-aborted or re-notified", async () => {
    const { deps, aborts, notifies } = makeDeps();
    const wd = new WatchdogController(
      makeConfig({ wallClockMs: 20, idleMs: 60_000 }),
      deps
    );
    wd.noteSessionCreated({ id: "s-sub", parentID: "p" });
    wd.noteStatus("s-sub", "busy");
    await new Promise((r) => setTimeout(r, 40));
    await wd.check();
    await wd.check();
    expect(aborts).toEqual(["s-sub"]);
    expect(notifies.length).toBe(1);
    wd.dispose();
  });

  test("disabled config does not start the check timer", () => {
    const { deps } = makeDeps();
    const wd = new WatchdogController(makeConfig({ enabled: false }), deps);
    wd.noteSessionCreated({ id: "s-sub", parentID: "p" });
    wd.noteStatus("s-sub", "busy");
    // no timer was started; a manual check still runs but a disabled watchdog
    // isn't meant to be exercised — just confirm it doesn't throw
    expect(wd.size).toBe(1);
    wd.dispose();
  });

  test("retry status keeps the session armed like busy", async () => {
    const { deps, aborts } = makeDeps();
    const wd = new WatchdogController(
      makeConfig({ wallClockMs: 20, idleMs: 60_000 }),
      deps
    );
    wd.noteSessionCreated({ id: "s-sub", parentID: "p" });
    wd.noteStatus("s-sub", "busy");
    wd.noteStatus("s-sub", "retry");
    await new Promise((r) => setTimeout(r, 40));
    await wd.check();
    expect(aborts).toEqual(["s-sub"]);
    wd.dispose();
  });

  test("host sleep is excluded from idle and wall-clock (no false abort on wake)", async () => {
    // tgo-hcm: overnight laptop sleep made Date.now()-based clocks read as
    // hours of idle and aborted every delegated session on wake. With injected
    // clocks, simulate: session goes busy, the host sleeps 2 hours (wall clock
    // races ahead, uptime freezes), then wakes. Both guards must measure
    // awake-time only.
    let wall = 1_000_000;
    let uptime = 500_000;
    const { deps, aborts, logs } = makeDeps();
    const wd = new WatchdogController(
      makeConfig({ wallClockMs: 60_000, idleMs: 30_000, checkMs: 1_000 }),
      {
        ...deps,
        wallNow: () => wall,
        uptimeNow: () => uptime,
      }
    );
    wd.noteSessionCreated({ id: "s-sub", parentID: "p" });
    wd.noteStatus("s-sub", "busy");
    await wd.check();
    expect(aborts).toEqual([]);

    // The host sleeps for 2 hours. Wall clock advances 7.2e6 ms; uptime barely
    // moves (a single 1s check tick worth).
    wall += 7_200_000;
    uptime += 1_000;
    await wd.check();
    expect(aborts).toEqual([]);
    expect(logs.some((l) => l.message.includes("host sleep"))).toBe(true);

    // Still awake and silent past idleMs → abort normally.
    wall += 40_000;
    uptime += 40_000;
    await wd.check();
    expect(aborts).toEqual(["s-sub"]);
    wd.dispose();
  });

  test("busy-but-awake long runs are not falsely aborted by wall-clock over sleep", async () => {
    // A delegate active for 90 min of awake time but the wall-clock cap is 60s:
    // with no sleep, this should abort on the wall cap.
    let wall = 1_000_000;
    let uptime = 500_000;
    const { deps, aborts } = makeDeps();
    const wd = new WatchdogController(
      makeConfig({ wallClockMs: 60_000, idleMs: 30_000, checkMs: 1_000 }),
      {
        ...deps,
        wallNow: () => wall,
        uptimeNow: () => uptime,
      }
    );
    wd.noteSessionCreated({ id: "s-sub", parentID: "p" });
    wd.noteStatus("s-sub", "busy");
    await wd.check();

    // Simulate an active session producing a message every ~15s of wall time,
    // no sleep involved.
    for (let i = 0; i < 6; i++) {
      wall += 15_000;
      uptime += 15_000;
      wd.noteActivity("s-sub");
      await wd.check();
    }
    // 90s elapsed, activity refreshed idle each time, but wall clock cap (60s)
    // still applies to awake time.
    expect(aborts).toEqual(["s-sub"]);
    wd.dispose();
  });

  test("normal wall↔uptime parity does not trigger sleep detection", async () => {
    let wall = 1_000_000;
    let uptime = 500_000;
    const { deps, aborts, logs } = makeDeps();
    const wd = new WatchdogController(
      makeConfig({ wallClockMs: 60_000, idleMs: 30_000, checkMs: 1_000 }),
      {
        ...deps,
        wallNow: () => wall,
        uptimeNow: () => uptime,
      }
    );
    wd.noteSessionCreated({ id: "s-sub", parentID: "p" });
    wd.noteStatus("s-sub", "busy");
    for (let i = 0; i < 3; i++) {
      wall += 2_000;
      uptime += 2_000;
      await wd.check();
    }
    expect(logs.some((l) => l.message.includes("host sleep"))).toBe(false);
    wd.dispose();
  });

  test("an in-flight tool pauses the idle clock but wall-clock still aborts a hung tool", async () => {
    // A long-running bash command emits no message/activity events while it
    // runs, so without the in-flight heartbeat it would trip the idle cap.
    // tool.execute.before → noteToolStart pauses idle; wall-clock still bites.
    let wall = 1_000_000;
    let uptime = 500_000;
    const { deps, aborts } = makeDeps();
    const wd = new WatchdogController(
      makeConfig({ wallClockMs: 60_000, idleMs: 30_000, checkMs: 1_000 }),
      {
        ...deps,
        wallNow: () => wall,
        uptimeNow: () => uptime,
      }
    );
    wd.noteSessionCreated({ id: "s-sub", parentID: "p" });
    wd.noteStatus("s-sub", "busy");
    wd.noteToolStart("s-sub");
    // 45s of a running tool with no other activity: idle would have tripped at
    // 30s, but the in-flight tool pauses it.
    wall += 45_000;
    uptime += 45_000;
    await wd.check();
    expect(aborts).toEqual([]);
    // The tool finishes; now silence past idleMs aborts normally.
    wd.noteToolEnd("s-sub");
    wall += 40_000;
    uptime += 40_000;
    await wd.check();
    expect(aborts).toEqual(["s-sub"]);
    wd.dispose();
  });

  test("an in-flight tool does NOT stop the wall-clock cap (hung tool still aborts)", async () => {
    let wall = 1_000_000;
    let uptime = 500_000;
    const { deps, aborts } = makeDeps();
    const wd = new WatchdogController(
      makeConfig({ wallClockMs: 60_000, idleMs: 30_000, checkMs: 1_000 }),
      {
        ...deps,
        wallNow: () => wall,
        uptimeNow: () => uptime,
      }
    );
    wd.noteSessionCreated({ id: "s-sub", parentID: "p" });
    wd.noteStatus("s-sub", "busy");
    wd.noteToolStart("s-sub");
    wall += 70_000;
    uptime += 70_000;
    await wd.check();
    expect(aborts).toEqual(["s-sub"]);
    wd.dispose();
  });

  test("an ACTIVE session with a background tool running is not wall-clocked (dev server)", async () => {
    // The test-8 false-abort: Dylan launched `bun src/index.ts` with
    // background:true as the final boot-check, then kept working (activity
    // flowing). A background process is meant to run long, so while it holds
    // the session and the session is producing activity, wall-clock must NOT
    // fire — killing it at the cap was a false positive.
    let wall = 1_000_000;
    let uptime = 500_000;
    const { deps, aborts } = makeDeps();
    const wd = new WatchdogController(
      makeConfig({ wallClockMs: 60_000, idleMs: 30_000, checkMs: 1_000 }),
      {
        ...deps,
        wallNow: () => wall,
        uptimeNow: () => uptime,
      }
    );
    wd.noteSessionCreated({ id: "s-sub", parentID: "p" });
    wd.noteStatus("s-sub", "busy");
    wd.noteToolStart("s-sub", true);
    // Way past the wall-clock cap, but the session keeps producing activity
    // (streaming heartbeats, other tools) while the background process runs.
    for (let i = 0; i < 10; i++) {
      wall += 15_000;
      uptime += 15_000;
      wd.noteActivity("s-sub");
      await wd.check();
    }
    expect(aborts).toEqual([]);
    wd.dispose();
  });

  test("a background tool does NOT pause idle: a silent session parked on it still idle-aborts", async () => {
    // The corollary: backgrounding a process must not shield the session from
    // idle forever. If the delegate is genuinely stuck (no activity, no
    // streaming) while a background process runs, the idle cap still fires.
    let wall = 1_000_000;
    let uptime = 500_000;
    const { deps, aborts } = makeDeps();
    const wd = new WatchdogController(
      makeConfig({ wallClockMs: 600_000, idleMs: 30_000, checkMs: 1_000 }),
      {
        ...deps,
        wallNow: () => wall,
        uptimeNow: () => uptime,
      }
    );
    wd.noteSessionCreated({ id: "s-sub", parentID: "p" });
    wd.noteStatus("s-sub", "busy");
    wd.noteToolStart("s-sub", true);
    // 45s of silence with only a background process running: idle tripped at
    // 30s — the background flag does not pause the idle clock.
    wall += 45_000;
    uptime += 45_000;
    await wd.check();
    expect(aborts).toEqual(["s-sub"]);
    wd.dispose();
  });

  test("a hung FOREGROUND tool still wall-clock-aborts even with a background process running", async () => {
    // The safety net stays: a background process must not mask a hung
    // foreground command. With a foreground tool in flight, wall-clock applies
    // regardless of the background process.
    let wall = 1_000_000;
    let uptime = 500_000;
    const { deps, aborts } = makeDeps();
    const wd = new WatchdogController(
      makeConfig({ wallClockMs: 60_000, idleMs: 30_000, checkMs: 1_000 }),
      {
        ...deps,
        wallNow: () => wall,
        uptimeNow: () => uptime,
      }
    );
    wd.noteSessionCreated({ id: "s-sub", parentID: "p" });
    wd.noteStatus("s-sub", "busy");
    // A background process running plus a hung foreground command.
    wd.noteToolStart("s-sub", true);
    wd.noteToolStart("s-sub", false);
    wall += 70_000;
    uptime += 70_000;
    await wd.check();
    expect(aborts).toEqual(["s-sub"]);
    wd.dispose();
  });

  test("a productive session completing tools is NOT wall-clocked (test-9 regression)", async () => {
    // Test-9: Dylan ran 196 tool calls / 81k output tokens before the 20m
    // wall-clock cap fired. wall-clock used to be a fixed budget from session
    // start, so a long-but-productive session died at exactly the cap. A
    // completed foreground tool is forward progress — the baseline resets.
    let wall = 1_000_000;
    let uptime = 500_000;
    const { deps, aborts } = makeDeps();
    const wd = new WatchdogController(
      makeConfig({ wallClockMs: 60_000, idleMs: 30_000, checkMs: 1_000 }),
      {
        ...deps,
        wallNow: () => wall,
        uptimeNow: () => uptime,
      }
    );
    wd.noteSessionCreated({ id: "s-sub", parentID: "p" });
    wd.noteStatus("s-sub", "busy");
    // A long implementation session: a tool completes every ~45s for 3 minutes
    // of wall time. Wall-clock cap is 60s, but each completion resets the
    // baseline, so the session must survive.
    for (let i = 0; i < 4; i++) {
      wall += 45_000;
      uptime += 45_000;
      wd.noteToolStart("s-sub");
      wall += 1_000;
      uptime += 1_000;
      wd.noteToolEnd("s-sub");
      await wd.check();
    }
    expect(aborts).toEqual([]);
    // Then it goes silent: no tool completes for 2 minutes → wall-clock fires.
    wall += 120_000;
    uptime += 120_000;
    await wd.check();
    expect(aborts).toEqual(["s-sub"]);
    wd.dispose();
  });

  test("streaming part updates refresh the idle clock (message.part.updated heartbeat)", async () => {
    let wall = 1_000_000;
    let uptime = 500_000;
    const { deps, aborts } = makeDeps();
    const wd = new WatchdogController(
      makeConfig({ wallClockMs: 120_000, idleMs: 30_000, checkMs: 1_000 }),
      {
        ...deps,
        wallNow: () => wall,
        uptimeNow: () => uptime,
      }
    );
    wd.noteSessionCreated({ id: "s-sub", parentID: "p" });
    wd.noteStatus("s-sub", "busy");
    // A long stream: parts update every 20s of wall time, so idle never trips.
    for (let i = 0; i < 4; i++) {
      wall += 20_000;
      uptime += 20_000;
      wd.noteActivity("s-sub");
      await wd.check();
    }
    expect(aborts).toEqual([]);
    wd.dispose();
  });
});
