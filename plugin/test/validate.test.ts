import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { tgoConfigSchema } from "../src/config";
import { voiceCardSchema, rulePackSchema } from "../src/voices";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function unwrapZod(schema: unknown): unknown {
  let current = schema;
  while (current && typeof current === "object" && "unwrap" in current) {
    const curType = (current as { def?: { type?: string }; _zod?: { def?: { type?: string } } }).def?.type ?? (current as { _zod?: { def?: { type?: string } } })._zod?.def?.type;
    if (curType === "array") break;
    const next = (current as { unwrap: () => unknown }).unwrap();
    const nextType = (next as { def?: { type?: string }; _zod?: { def?: { type?: string } } } | null | undefined)?.def?.type ?? (next as { _zod?: { def?: { type?: string } } } | null | undefined)?._zod?.def?.type;
    if (nextType === "array") {
      current = next;
      break;
    }
    current = next;
  }
  return current;
}

function isZodObject(schema: unknown): boolean {
  const unwrapped = unwrapZod(schema);
  return !!unwrapped && typeof unwrapped === "object" && "shape" in unwrapped;
}

function zodShapeKeys(schema: unknown): string[] {
  const unwrapped = unwrapZod(schema);
  return Object.keys((unwrapped as { shape: Record<string, unknown> }).shape);
}

function resolveRef(node: unknown, root: Record<string, unknown>): unknown {
  if (!node || typeof node !== "object") return node;
  const ref = (node as Record<string, unknown>).$ref;
  if (typeof ref !== "string") return node;
  if (!ref.startsWith("#/definitions/")) return node;
  const name = ref.slice("#/definitions/".length);
  const defs = root.definitions as Record<string, unknown> | undefined;
  return defs?.[name] ?? node;
}

function jsonObjectKeys(node: unknown): string[] {
  if (!node || typeof node !== "object") return [];
  const properties = (node as Record<string, unknown>).properties;
  if (!properties || typeof properties !== "object") return [];
  return Object.keys(properties);
}

function assertSchemaZodParity(
  zod: unknown,
  jsonNodeIn: unknown,
  pathLabel: string,
  root: Record<string, unknown>
): string[] {
  const jsonNode = resolveRef(jsonNodeIn, root);
  if (!isZodObject(zod)) return [];
  const zodKeys = zodShapeKeys(zod).sort();
  const jsonKeys = jsonObjectKeys(jsonNode).sort();
  if (zodKeys.join(",") !== jsonKeys.join(",")) {
    return [`${pathLabel} keys differ — zod [${zodKeys.join(", ")}] vs schema [${jsonKeys.join(", ")}]`];
  }
  const problems: string[] = [];
  const properties = (jsonNode as Record<string, unknown>).properties as Record<string, unknown>;
  for (const key of zodKeys) {
    const childZod = (unwrapZod(zod) as { shape: Record<string, unknown> }).shape[key];
    problems.push(...assertSchemaZodParity(childZod, properties[key], `${pathLabel}.${key}`, root));
  }
  return problems;
}

describe("schema ↔ zod parity", () => {
  test("tgo.config.schema.json parity", () => {
    const raw = JSON.parse(fs.readFileSync(path.join(packageRoot, "schema", "tgo.config.schema.json"), "utf-8"));
    const problems = assertSchemaZodParity(tgoConfigSchema, raw, "tgo.config.schema.json", raw);
    expect(problems).toEqual([]);
  });

  test("voice-card.schema.json parity", () => {
    const raw = JSON.parse(fs.readFileSync(path.join(packageRoot, "schema", "voice-card.schema.json"), "utf-8"));
    const problems = assertSchemaZodParity(voiceCardSchema, raw, "voice-card.schema.json", raw);
    expect(problems).toEqual([]);
  });

  test("rule-pack.schema.json parity", () => {
    const raw = JSON.parse(fs.readFileSync(path.join(packageRoot, "schema", "rule-pack.schema.json"), "utf-8"));
    const problems = assertSchemaZodParity(rulePackSchema, raw, "rule-pack.schema.json", raw);
    expect(problems).toEqual([]);
  });
});

describe("voice card fixtures", () => {
  const placeholder = "<!-- EXEMPLAR TEXTS: to be inserted verbatim from calibration transcript at card-authoring time -->";

  test("each skeleton card validates against voice-card schema via zod", () => {
    for (const id of ["tgo-default", "tgo-prose", "tgo-conversational"] as const) {
      const p = path.join(packageRoot, "assets", "voices", `${id}.json`);
      const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
      const parsed = voiceCardSchema.safeParse(raw);
      expect(parsed.success, `${id} should validate: ${parsed.success ? "" : JSON.stringify(parsed.error.issues)}`).toBe(true);
    }
  });

  test("tgo-default has exemplars.length === 0", () => {
    const raw = JSON.parse(fs.readFileSync(path.join(packageRoot, "assets", "voices", "tgo-default.json"), "utf-8"));
    const parsed = voiceCardSchema.parse(raw);
    expect(parsed.exemplars.length).toBe(0);
  });

  test("tgo-prose has 5 real exemplars (no placeholders) per T5", () => {
    const raw = JSON.parse(fs.readFileSync(path.join(packageRoot, "assets", "voices", "tgo-prose.json"), "utf-8"));
    const parsed = voiceCardSchema.parse(raw);
    expect(parsed.exemplars.length).toBe(5);
    for (const ex of parsed.exemplars) {
      expect(ex.text).not.toBe(placeholder);
      expect(ex.text.length).toBeGreaterThan(100);
      expect(ex.shape.length).toBeGreaterThan(0);
      expect(["first", "second", "third"]).toContain(ex.person);
      expect(ex.first_line.length).toBeGreaterThan(0);
      expect(ex.last_line.length).toBeGreaterThan(0);
      // text must start with first_line and end with last_line (verbatim)
      expect(ex.text.startsWith(ex.first_line)).toBe(true);
      expect(ex.text.endsWith(ex.last_line)).toBe(true);
    }
    // spot-check descriptors match spec D10
    expect(parsed.exemplars[0]).toMatchObject({
      shape: "scene-vignette",
      person: "third",
      first_line: "The marquee said CLOSED FOR THE SEASON, and under that, in smaller letters, THANK YOU FOR 61 YEARS, the Y trailing off where the plastic had cracked.",
      last_line: "He salted the next batch anyway.",
    });
    expect(parsed.exemplars[1]).toMatchObject({
      shape: "institutional-comedy",
      person: "first",
      first_line: "They had us in a room that smelled like carpet and old pizza, forty of us watching a clock that had no second hand.",
      last_line: "Then the bailiff asked who wanted to be foreman, and twelve people looked at their shoes.",
    });
    expect(parsed.exemplars[2]).toMatchObject({
      shape: "retrospective-solitude",
      person: "third",
    });
    // ensure no placeholder marker remains in file
    const fileText = fs.readFileSync(path.join(packageRoot, "assets", "voices", "tgo-prose.json"), "utf-8");
    expect(fileText).not.toContain("EXEMPLAR TEXTS");
  });

  test("tgo-conversational has 3 real exemplars (no placeholders) per T5", () => {
    const raw = JSON.parse(fs.readFileSync(path.join(packageRoot, "assets", "voices", "tgo-conversational.json"), "utf-8"));
    const parsed = voiceCardSchema.parse(raw);
    expect(parsed.exemplars.length).toBe(3);
    for (const ex of parsed.exemplars) {
      expect(ex.text).not.toBe(placeholder);
      expect(ex.text.length).toBeGreaterThan(100);
      expect(ex.text.startsWith(ex.first_line)).toBe(true);
      expect(ex.text.endsWith(ex.last_line)).toBe(true);
    }
    expect(parsed.exemplars[0]).toMatchObject({
      shape: "argument",
      person: "first",
      first_line: "So I want to defend the elevator.",
      last_line: "So does most politeness, and we keep doing it.",
    });
    expect(parsed.exemplars[1]).toMatchObject({
      shape: "instruction",
      person: "second",
      first_line: "Okay, hard-boiled eggs, because mine came out perfect this morning and I want credit.",
      last_line: "Old eggs peel easier than fresh ones, which is backwards, and nobody at the egg council will explain why.",
    });
    expect(parsed.exemplars[2]).toMatchObject({
      shape: "narrative",
      person: "first",
    });
    const fileText = fs.readFileSync(path.join(packageRoot, "assets", "voices", "tgo-conversational.json"), "utf-8");
    expect(fileText).not.toContain("EXEMPLAR TEXTS");
  });

  test("invalid voice card is rejected (missing required id)", () => {
    const bad = {
      version: "1.0.0",
      meta: { display_name: "Bad", attribution: "x" },
      voice_invariants: {},
      arc_repertoire: { templates: [] },
      exemplars: [],
    };
    expect(voiceCardSchema.safeParse(bad).success).toBe(false);
  });

  test("no YAML files exist in voices", () => {
    const dir = path.join(packageRoot, "assets", "voices");
    const files = fs.readdirSync(dir);
    for (const f of files) {
      expect(f.endsWith(".yaml") || f.endsWith(".yml")).toBe(false);
    }
    expect(files.sort()).toEqual(["tgo-conversational.json", "tgo-default.json", "tgo-prose.json"].sort());
  });
});

describe("rule pack fixtures", () => {
  test("valid rule pack validates", () => {
    const raw = {
      id: "mechanics",
      tier: 1,
      false_positive_risk: "low",
      gating: "always-on",
      families: [
        {
          name: "spelling-caps-repetition",
          patterns: [{ kind: "regex", value: "\\btest", flags: "gi" }],
          severity: "low",
          basis: "cluster",
          thresholds: { cluster_min: 2 },
        },
      ],
    };
    expect(rulePackSchema.safeParse(raw).success).toBe(true);
  });

  test("invalid tier is rejected", () => {
    const bad = {
      id: "bad",
      tier: 5,
      false_positive_risk: "low",
      gating: "always-on",
      families: [],
    };
    expect(rulePackSchema.safeParse(bad).success).toBe(false);
  });

  test("invalid gating is rejected", () => {
    const bad = {
      id: "bad",
      tier: 1,
      false_positive_risk: "low",
      gating: "sometimes",
      families: [],
    };
    expect(rulePackSchema.safeParse(bad as unknown as Record<string, unknown>).success).toBe(false);
  });
});
