import { describe, expect, test } from "bun:test";
import { compareVersions } from "../src/version";

describe("compareVersions", () => {
  test("equal versions return 0", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("0.2.1", "0.2.1")).toBe(0);
    expect(compareVersions("v1.2.3", "1.2.3")).toBe(0);
  });

  test("handles v prefix", () => {
    expect(compareVersions("v1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("v0.2.0", "0.2.1")).toBe(-1);
    expect(compareVersions("1.0.0", "v1.0.1")).toBe(-1);
    expect(compareVersions("v2.0.0", "v1.9.9")).toBe(1);
    expect(compareVersions("v1.0.0-alpha", "1.0.0-alpha")).toBe(0);
  });

  test("numeric ordering", () => {
    expect(compareVersions("1.0.0", "1.0.1")).toBe(-1);
    expect(compareVersions("1.0.1", "1.0.0")).toBe(1);
    expect(compareVersions("0.2.0", "0.2.1")).toBe(-1);
    expect(compareVersions("1.9.9", "2.0.0")).toBe(-1);
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
  });

  test("prerelease ordering: pre-release < release", () => {
    expect(compareVersions("1.0.0-alpha", "1.0.0")).toBe(-1);
    expect(compareVersions("1.0.0", "1.0.0-alpha")).toBe(1);
    expect(compareVersions("1.0.0-beta", "1.0.0")).toBe(-1);
    expect(compareVersions("0.2.1-alpha", "0.2.1")).toBe(-1);
  });

  test("prerelease lexical ordering", () => {
    expect(compareVersions("1.0.0-alpha", "1.0.0-beta")).toBe(-1);
    expect(compareVersions("1.0.0-beta", "1.0.0-alpha")).toBe(1);
    expect(compareVersions("1.0.0-alpha", "1.0.0-alpha")).toBe(0);
  });

  test("build metadata is ignored (equal)", () => {
    expect(compareVersions("1.0.0+build", "1.0.0")).toBe(0);
    expect(compareVersions("1.0.0", "1.0.0+build")).toBe(0);
    expect(compareVersions("1.0.0+build.1", "1.0.0+build.2")).toBe(0);
    expect(compareVersions("1.0.0+001", "1.0.0+20130313144700")).toBe(0);
    expect(compareVersions("v1.0.0+build", "1.0.0")).toBe(0);
    expect(compareVersions("1.0.0-alpha+001", "1.0.0-alpha")).toBe(0);
    expect(compareVersions("1.0.0-alpha+001", "1.0.0-alpha+002")).toBe(0);
    expect(compareVersions("1.0.0+build", "1.0.0-alpha")).toBe(1);
  });

  test("whitespace trimming", () => {
    expect(compareVersions(" 1.0.0 ", "1.0.0")).toBe(0);
    expect(compareVersions(" v1.0.0 ", "1.0.0")).toBe(0);
  });
});
