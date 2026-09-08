import { test, expect, describe } from "bun:test";
import {
  validateLaneAllowance,
  formatLaneViolation,
  LANE_ALLOWANCE,
} from "../src/delegation";

// Lane discipline enforced in code (replaces frontmatter task scoping —
// nested task maps drop the tool from 1.18.29 host manifests).

describe("validateLaneAllowance", () => {
  test("bernstein spawns exactly its four seats", () => {
    for (const sub of ["dylan", "nas", "horowitz", "nirvana"]) {
      const v = validateLaneAllowance("bernstein", sub);
      expect(v, sub).toMatchObject({ allowed: true, knownCaller: true });
    }
    expect([...LANE_ALLOWANCE.bernstein].sort()).toEqual(
      ["dylan", "horowitz", "nas", "nirvana"].sort()
    );
  });

  test("bernstein may not spawn outside its lane", () => {
    for (const sub of ["explore", "general", "cobain", "grohl", "novoselic", "build"]) {
      const v = validateLaneAllowance("bernstein", sub);
      expect(v, sub).toMatchObject({ allowed: false, knownCaller: true });
    }
  });

  test("dylan and horowitz spawn only explore", () => {
    for (const caller of ["dylan", "horowitz"]) {
      expect(validateLaneAllowance(caller, "explore"), caller).toMatchObject({
        allowed: true,
        knownCaller: true,
      });
      for (const sub of ["dylan", "nas", "horowitz", "nirvana", "general"]) {
        expect(validateLaneAllowance(caller, sub), `${caller}→${sub}`).toMatchObject({
          allowed: false,
          knownCaller: true,
        });
      }
    }
  });

  test("nirvana spawns exactly its three lenses", () => {
    for (const sub of ["cobain", "grohl", "novoselic"]) {
      const v = validateLaneAllowance("nirvana", sub);
      expect(v, sub).toMatchObject({ allowed: true, knownCaller: true });
    }
    expect([...LANE_ALLOWANCE.nirvana].sort()).toEqual(
      ["cobain", "grohl", "novoselic"].sort()
    );
    for (const sub of ["dylan", "explore", "general"]) {
      expect(validateLaneAllowance("nirvana", sub), sub).toMatchObject({
        allowed: false,
        knownCaller: true,
      });
    }
  });

  test("nas spawns nothing", () => {
    for (const sub of ["dylan", "nas", "horowitz", "nirvana", "explore", "general"]) {
      expect(validateLaneAllowance("nas", sub), sub).toMatchObject({
        allowed: false,
        knownCaller: true,
      });
    }
    expect(LANE_ALLOWANCE.nas).toEqual([]);
  });

  test("lenses spawn nothing", () => {
    for (const caller of ["cobain", "grohl", "novoselic"]) {
      for (const sub of ["dylan", "explore", "cobain"]) {
        expect(validateLaneAllowance(caller, sub), `${caller}→${sub}`).toMatchObject({
          allowed: false,
          knownCaller: true,
        });
      }
    }
  });

  test("non-TGO callers bypass entirely", () => {
    for (const caller of ["build", "explore", "general", "plan"]) {
      const v = validateLaneAllowance(caller, "dylan");
      expect(v, caller).toMatchObject({ allowed: true, knownCaller: false });
    }
  });

  test("unresolvable caller fails open", () => {
    for (const caller of [undefined, "", "   ", 42, null]) {
      const v = validateLaneAllowance(caller, "dylan");
      expect(v, String(caller)).toMatchObject({ allowed: true, knownCaller: false });
    }
  });

  test("violation message is distinct from the recursion gate prefix", () => {
    const v = validateLaneAllowance("bernstein", "general");
    expect(v.allowed).toBe(false);
    const msg = formatLaneViolation("bernstein", "general", v.lane);
    expect(msg).toBe(
      "Lane violation: bernstein may not spawn general (lane: bernstein→[dylan, nas, horowitz, nirvana])"
    );
    expect(msg).not.toContain("Delegation blocked:");
  });
});
