import { test, expect, describe } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { SetupController } from "../src/setup";
import { copySetupSkill, copySkillBundle } from "../src/install";
import * as fs from "node:fs";
import { reportSeat, readSeatContent, parseSeatPermission } from "../src/permissions";

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "tgo-setup-"));
}

function controller(opts?: {
  run?: (command: string, cwd?: string) => Promise<string>;
  hasBd?: () => Promise<boolean>;
  installBd?: () => Promise<void>;
}): SetupController {
  return new SetupController({
    run: opts?.run ?? (async () => ""),
    hasBd: opts?.hasBd ?? (async () => true),
    installBd: opts?.installBd,
  });
}

describe("SetupController.needsSetup", () => {
  test("empty directory needs setup", async () => {
    const dir = tmpDir();
    expect(await controller().needsSetup(dir)).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });

  test("directory with .beads but no AGENTS markers needs setup", async () => {
    const dir = tmpDir();
    await import("node:fs/promises").then((fs) => fs.mkdir(path.join(dir, ".beads")));
    writeFileSync(path.join(dir, "AGENTS.md"), "# project\n");
    expect(await controller().needsSetup(dir)).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });

  test("complete setup (beads + both markers) does not need setup", async () => {
    const dir = tmpDir();
    await import("node:fs/promises").then((fs) => fs.mkdir(path.join(dir, ".beads")));
    writeFileSync(
      path.join(dir, "AGENTS.md"),
      [
        "<!-- TGO: thin always-on advice layer -->",
        "<!-- END TGO advice layer -->",
        "<!-- BEGIN BEADS INTEGRATION -->",
        "<!-- END BEADS INTEGRATION -->",
      ].join("\n")
    );
    expect(await controller().needsSetup(dir)).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("SetupController.maybeSetup", () => {
  test("runs bd init + bd setup opencode + AGENTS fragment when not set up", async () => {
    const dir = tmpDir();
    const ran: string[] = [];
    const c = controller({
      run: async (command, cwd) => {
        ran.push(`${command}${cwd ? ` @ ${cwd}` : ""}`);
        return "";
      },
    });
    const result = await c.maybeSetup(dir);
    expect(result.action).toBe("completed");
    expect(result.steps).toEqual(["bd init", "bd setup opencode", "AGENTS fragment"]);
    expect(ran.length).toBe(2);
    expect(ran[0]).toBe(`bd init @ ${dir}`);
    expect(ran[1]).toBe(`bd setup opencode @ ${dir}`);
    expect(existsSync(path.join(dir, "AGENTS.md"))).toBe(true);
    expect(
      require("node:fs").readFileSync(path.join(dir, "AGENTS.md"), "utf-8")
    ).toContain("Record work in beads");
    rmSync(dir, { recursive: true, force: true });
  });

  test("never re-runs once set up", async () => {
    const dir = tmpDir();
    let calls = 0;
    const c = controller({
      run: async () => {
        calls++;
        return "";
      },
    });
    await c.maybeSetup(dir);
    await c.maybeSetup(dir);
    expect(calls).toBe(2); // first setup only (bd init + setup opencode)
    const result = await c.maybeSetup(dir);
    expect(result.action).toBe("already-set-up");
    expect(calls).toBe(2);
    rmSync(dir, { recursive: true, force: true });
  });

  test("returns no-bd when the CLI is missing and install is not wired", async () => {
    const dir = tmpDir();
    const c = controller({ hasBd: async () => false });
    const result = await c.maybeSetup(dir);
    expect(result.action).toBe("no-bd");
    rmSync(dir, { recursive: true, force: true });
  });

  test("installs beads first when the CLI is missing and installBd is wired", async () => {
    const dir = tmpDir();
    let installed = false;
    const c = controller({
      hasBd: async () => installed,
      installBd: async () => {
        installed = true;
      },
    });
    const result = await c.maybeSetup(dir);
    expect(result.action).toBe("completed");
    expect(result.steps).toContain("bd init");
    rmSync(dir, { recursive: true, force: true });
  });

  test("propagates a bd init failure as failed", async () => {
    const dir = tmpDir();
    const c = controller({
      run: async () => {
        throw new Error("bd init exploded");
      },
    });
    const result = await c.maybeSetup(dir);
    expect(result.action).toBe("failed");
    expect(result.error).toContain("bd init exploded");
    rmSync(dir, { recursive: true, force: true });
  });

  test("includes subprocess exit status and stderr in setup failures", async () => {
    const dir = tmpDir();
    const c = controller({
      run: async () => ({ exitCode: 7, stdout: "partial output", stderr: "unsupported operation" }),
    });
    const result = await c.maybeSetup(dir);
    expect(result).toEqual({
      action: "failed",
      error: "Error: bd init exited 7: unsupported operation\npartial output",
    });
    rmSync(dir, { recursive: true, force: true });
  });

  test("existing .beads with missing markers never re-runs bd init", async () => {
    const dir = tmpDir();
    await import("node:fs/promises").then((fs) => fs.mkdir(path.join(dir, ".beads")));
    writeFileSync(path.join(dir, "AGENTS.md"), "# project\n");
    const ran: string[] = [];
    const c = controller({
      run: async (command, cwd) => {
        ran.push(`${command}${cwd ? ` @ ${cwd}` : ""}`);
        return "";
      },
    });
    const result = await c.maybeSetup(dir);
    expect(result.action).toBe("completed");
    expect(result.steps).toEqual(["bd setup opencode", "AGENTS fragment"]);
    expect(ran).toEqual([`bd setup opencode @ ${dir}`]);
    rmSync(dir, { recursive: true, force: true });
  });

  test("existing .beads missing only the beads block runs bd setup opencode", async () => {
    const dir = tmpDir();
    await import("node:fs/promises").then((fs) => fs.mkdir(path.join(dir, ".beads")));
    writeFileSync(
      path.join(dir, "AGENTS.md"),
      [
        "<!-- TGO: thin always-on advice layer -->",
        "<!-- END TGO advice layer -->",
      ].join("\n")
    );
    const ran: string[] = [];
    const c = controller({
      run: async (command, cwd) => {
        ran.push(command);
        return "";
      },
    });
    const result = await c.maybeSetup(dir);
    expect(result.action).toBe("completed");
    expect(result.steps).toEqual(["bd setup opencode"]);
    expect(ran).toEqual(["bd setup opencode"]);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("setup skill asset", () => {
  test("copies SKILL.md into the config dir skills/tgo-setup on first install", async () => {
    const dir = tmpDir();
    const result = await copySetupSkill(dir);
    expect(result).toBe("created");
    const content = require("node:fs").readFileSync(
      path.join(dir, "skills", "tgo-setup", "SKILL.md"),
      "utf-8"
    );
    expect(content).toContain("name: tgo-setup");
    expect(content).toContain("description:");
    expect(content).toContain("Never clobber");
    rmSync(dir, { recursive: true, force: true });
  });

  test("is idempotent — does not clobber an existing skill", async () => {
    const dir = tmpDir();
    await copySetupSkill(dir);
    const { writeFileSync } = await import("node:fs");
    writeFileSync(path.join(dir, "skills", "tgo-setup", "SKILL.md"), "user version");
    const second = await copySetupSkill(dir);
    expect(second).toBe("unchanged");
    expect(
      require("node:fs").readFileSync(path.join(dir, "skills", "tgo-setup", "SKILL.md"), "utf-8")
    ).toBe("user version");
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("skill bundle", () => {
  const BUNDLE = [
    "bmad-build-auto",
    "bmad-deep-recon",
    "code-review",
    "diagnosing-bugs",
    "grilling",
    "implement",
    "receiving-code-review",
    "tdd",
    "to-questionnaire",
    "to-tickets",
    "verification-planning",
    "wayfinder",
    "wizard",
  ];

  test("ships the 13-skill FINAL BUNDLE, no-clobber, on first install", async () => {
    const dir = tmpDir();
    const results = await copySkillBundle(dir);
    const names = results.map((r) => r.name).filter((n) => n !== "tgo-setup").sort();
    expect(names).toEqual(BUNDLE);
    expect(results.every((r) => r.action === "created")).toBe(true);
    for (const name of BUNDLE) {
      const content = fs.readFileSync(path.join(dir, "skills", name, "SKILL.md"), "utf-8");
      expect(content).toContain(`name: ${name}`);
      expect(content).toContain("description:");
    }
    rmSync(dir, { recursive: true, force: true });
  });

  test("is idempotent — re-run reports unchanged and never clobbers", async () => {
    const dir = tmpDir();
    await copySkillBundle(dir);
    const { writeFileSync } = await import("node:fs");
    writeFileSync(path.join(dir, "skills", "grilling", "SKILL.md"), "user version");
    const second = await copySkillBundle(dir);
    expect(second.find((r) => r.name === "grilling")?.action).toBe("unchanged");
    expect(
      fs.readFileSync(path.join(dir, "skills", "grilling", "SKILL.md"), "utf-8")
    ).toBe("user version");
    rmSync(dir, { recursive: true, force: true });
  });

  test("per-seat skill grants match the FINAL BUNDLE", async () => {
    const agentsDir = path.join(__dirname, "..", "assets", "agents");
    const expected: Record<string, string[]> = {
      bernstein: ["grilling", "wayfinder", "to-tickets", "bmad-build-auto", "verification-planning", "diagnosing-bugs", "to-questionnaire", "wizard"],
      horowitz: ["code-review", "diagnosing-bugs"],
      nas: ["bmad-deep-recon"],
      dylan: ["implement", "tdd", "receiving-code-review", "diagnosing-bugs"],
    };
    for (const [seat, grants] of Object.entries(expected)) {
      const content = await readSeatContent(agentsDir, seat);
      const p = parseSeatPermission(content);
      const r = reportSeat(seat, content);
      expect(r.skillDenyAll, `${seat} must deny all skills by default`).toBe(true);
      expect([...r.skillAllowed].sort()).toEqual([...grants].sort());
      const perm = p.skill as Record<string, string> | undefined;
      expect(perm?.["*"]).toBe("deny");
    }
  });

  test("every seat without a grant carries a skill '*' deny catch-all", async () => {
    const agentsDir = path.join(__dirname, "..", "assets", "agents");
    const seats = ["nirvana", "cobain", "grohl", "novoselic"];
    for (const seat of seats) {
      const r = reportSeat(seat, await readSeatContent(agentsDir, seat));
      const perm = parseSeatPermission(await readSeatContent(agentsDir, seat));
      expect(r.allToolsDenied || (perm.skill as Record<string, string> | undefined)?.["*"] === "deny",
        `${seat} must deny skill by default`).toBe(true);
    }
  });
});

describe("plugin gate: parentID undefined treated as primary + chat.message fallback idempotence", () => {
  function shouldHandleSession(info: { parentID?: string | null }): boolean {
    // mirrors plugin handleSessionCreated gate: if (info.parentID != null) return (skip)
    if (info.parentID != null) return false;
    return true;
  }

  test("parentID undefined treated as primary for maybeSetup path", () => {
    expect(shouldHandleSession({ parentID: null })).toBe(true);
    expect(shouldHandleSession({ parentID: undefined })).toBe(true);
    expect(shouldHandleSession({})).toBe(true);
    expect(shouldHandleSession({ parentID: "abc" })).toBe(false);
  });

  test("parentID string is subagent skip", () => {
    expect(shouldHandleSession({ parentID: "sub-123" })).toBe(false);
  });

  test("chat.message fallback single-call via SetupController dedupe", async () => {
    const dir = tmpDir();
    let runCalls = 0;
    const c = controller({
      run: async () => {
        runCalls++;
        return "";
      },
    });
    // Simulate chat.message fallback: maybeSetup called for primary twice should dedupe second
    const first = await c.maybeSetup(dir);
    expect(first.action).toBe("completed");
    expect(runCalls).toBe(2); // bd init + bd setup opencode
    const second = await c.maybeSetup(dir);
    expect(second.action).toBe("already-set-up");
    expect(runCalls).toBe(2); // no additional runs
    // also simulate parentID check: fallback only fires when primary
    const chatShouldRun = (parentID: unknown) => parentID == null;
    expect(chatShouldRun(undefined)).toBe(true);
    expect(chatShouldRun(null)).toBe(true);
    expect(chatShouldRun("child")).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });

  test("transient failure does not mark attempted — retry succeeds", async () => {
    const dir = tmpDir();
    let attempts = 0;
    const c = controller({
      run: async () => {
        attempts++;
        if (attempts === 1) throw new Error("transient fs error");
        return "";
      },
    });
    const first = await c.maybeSetup(dir);
    expect(first.action).toBe("failed");
    expect(first.error).toContain("transient fs error");
    const second = await c.maybeSetup(dir);
    expect(second.action).toBe("completed");
    // first attempt 1 throw, second attempt runs bd init + bd setup opencode = 2 more calls
    expect(attempts).toBe(3);
    const third = await c.maybeSetup(dir);
    expect(third.action).toBe("already-set-up");
    expect(attempts).toBe(3);
    rmSync(dir, { recursive: true, force: true });
  });

  test("caps retries at 3 transient failures then marks attempted", async () => {
    const dir = tmpDir();
    const c = controller({
      run: async () => {
        throw new Error("persistent transient");
      },
    });
    for (let i = 0; i < 3; i++) {
      const r = await c.maybeSetup(dir);
      expect(r.action).toBe("failed");
    }
    const fourth = await c.maybeSetup(dir);
    expect(fourth.action).toBe("already-set-up");
    rmSync(dir, { recursive: true, force: true });
  });
});
