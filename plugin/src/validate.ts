import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { estimatePromptTokens, loadTgoConfig, MAX_PROMPT_TOKENS, tgoConfigSchema } from "./config";
import { renderSeats } from "./build";
import { readSeatContent, reportSeat } from "./permissions";
import { rulePackSchema, voiceCardSchema } from "./voices";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

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
    return [
      `${pathLabel} keys differ — zod [${zodKeys.join(", ")}] vs schema [${jsonKeys.join(", ")}]`,
    ];
  }
  const problems: string[] = [];
  const properties = (jsonNode as Record<string, unknown>).properties as Record<
    string,
    unknown
  >;
  for (const key of zodKeys) {
    const childZod = (unwrapZod(zod) as { shape: Record<string, unknown> }).shape[key];
    problems.push(...assertSchemaZodParity(childZod, properties[key], `${pathLabel}.${key}`, root));
  }
  return problems;
}

async function validateSchema(): Promise<void> {
  const schemaPath = path.join(packageRoot, "schema", "tgo.config.schema.json");
  const raw = JSON.parse(await fs.readFile(schemaPath, "utf-8"));
  const problems = assertSchemaZodParity(tgoConfigSchema, raw, "tgo.config.schema.json", raw);
  if (problems.length > 0) {
    throw new Error(`schema/zod parity: ${problems.join("; ")}`);
  }

  const voiceCardPath = path.join(packageRoot, "schema", "voice-card.schema.json");
  const voiceRaw = JSON.parse(await fs.readFile(voiceCardPath, "utf-8"));
  const voiceProblems = assertSchemaZodParity(voiceCardSchema, voiceRaw, "voice-card.schema.json", voiceRaw);
  if (voiceProblems.length > 0) {
    throw new Error(`schema/zod parity: ${voiceProblems.join("; ")}`);
  }

  const rulePackPath = path.join(packageRoot, "schema", "rule-pack.schema.json");
  const ruleRaw = JSON.parse(await fs.readFile(rulePackPath, "utf-8"));
  const ruleProblems = assertSchemaZodParity(rulePackSchema, ruleRaw, "rule-pack.schema.json", ruleRaw);
  if (ruleProblems.length > 0) {
    throw new Error(`schema/zod parity: ${ruleProblems.join("; ")}`);
  }
}

async function validateVoiceCards(): Promise<void> {
  for (const id of ["tgo-default", "tgo-prose", "tgo-conversational"] as const) {
    const cardPath = path.join(packageRoot, "assets", "voices", `${id}.json`);
    const raw = JSON.parse(await fs.readFile(cardPath, "utf-8"));
    voiceCardSchema.parse(raw);
  }
}

async function validatePresetsFile(): Promise<void> {
  const presetsPath = path.join(packageRoot, "assets", "presets.json");
  const raw = JSON.parse(await fs.readFile(presetsPath, "utf-8"));
  await loadTgoConfig({ preset: "balanced", presets: raw });
}

async function validateRenderedSeats(): Promise<void> {
  const agentsDir = path.join(packageRoot, "assets", "agents");
  for (const card of ["default", "prose", "conversational"] as const) {
    const seats = await renderSeats(agentsDir, card);
    let checked = 0;
    for (const seat of seats) {
      const tokens = estimatePromptTokens(seat.content);
      if (tokens > MAX_PROMPT_TOKENS) {
        throw new Error(
          `${seat.fileName} (${card}): ${tokens} tokens exceeds ${MAX_PROMPT_TOKENS}-token budget`
        );
      }
      checked++;
    }
    if (checked === 0) {
      console.log(`WARNING: no seat prompt files found to validate (${card})`);
    }
  }
}

async function validatePermissionGraph(): Promise<void> {
  const agentsDir = path.join(packageRoot, "assets", "agents");
  const named = ["bernstein", "horowitz", "nas", "dylan"];
  const toolLess = ["nirvana", "cobain", "grohl", "novoselic"];

  for (const seat of named) {
    const r = reportSeat(seat, await readSeatContent(agentsDir, seat));
    const problems: string[] = [];
    if (!r.editDenied && seat !== "dylan") {
      problems.push("must deny edit");
    }
    if (seat !== "dylan" && !r.bashDenyAll) {
      problems.push("bash must carry a catch-all '*' deny");
    }
    if (!r.taskDenyAll) problems.push("task must carry a catch-all '*' deny");
    if (!r.todowriteDenied) problems.push("must deny todowrite");
    if (seat === "bernstein" && !r.readAllowed) problems.push("must allow read");
    if (problems.length > 0) {
      throw new Error(`permission graph: ${seat} ${problems.join(", ")}`);
    }
  }

  for (const seat of toolLess) {
    const r = reportSeat(seat, await readSeatContent(agentsDir, seat));
    if (!r.allToolsDenied) {
      throw new Error(`permission graph: ${seat} must carry a top-level '*' deny (tool-less)`);
    }
  }

  const nirvana = reportSeat("nirvana", await readSeatContent(agentsDir, "nirvana"));
  const bandMembers = ["cobain", "grohl", "novoselic"];
  for (const lens of bandMembers) {
    if (!nirvana.taskAllowed.includes(lens)) {
      throw new Error(`permission graph: nirvana must be able to task band member ${lens}`);
    }
    const lensReport = reportSeat(lens, await readSeatContent(agentsDir, lens));
    if (!lensReport.allToolsDenied || lensReport.taskAllowed.length > 0) {
      throw new Error(`permission graph: band member ${lens} must be fully tool-less`);
    }
  }
  if (nirvana.taskAllowed.length !== bandMembers.length) {
    throw new Error(`permission graph: nirvana must task exactly its ${bandMembers.length} band members`);
  }

  const bernstein = reportSeat("bernstein", await readSeatContent(agentsDir, "bernstein"));
  if (!bernstein.taskAllowed.includes("nirvana")) {
    throw new Error("permission graph: bernstein must be able to task nirvana");
  }
}

const EXPECTED_SKILL_GRANTS: Record<string, string[]> = {
  bernstein: [
    "grilling",
    "wayfinder",
    "to-tickets",
    "bmad-build-auto",
    "verification-planning",
    "diagnosing-bugs",
    "to-questionnaire",
    "wizard",
  ],
  horowitz: ["code-review", "diagnosing-bugs"],
  nas: ["bmad-deep-recon"],
  dylan: ["implement", "tdd", "receiving-code-review", "diagnosing-bugs"],
};

async function validateSkillGrants(): Promise<void> {
  const agentsDir = path.join(packageRoot, "assets", "agents");
  const skillsDir = path.join(packageRoot, "assets", "skills");
  const shipped = new Set(
    (await fs.readdir(skillsDir, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
  );
  shipped.delete("tgo-setup");

  for (const [seat, expected] of Object.entries(EXPECTED_SKILL_GRANTS)) {
    const r = reportSeat(seat, await readSeatContent(agentsDir, seat));
    if (!r.skillDenyAll) {
      throw new Error(`skill grants: ${seat} must carry a '*' deny catch-all`);
    }
    for (const name of expected) {
      if (!r.skillAllowed.includes(name)) {
        throw new Error(`skill grants: ${seat} must grant ${name}`);
      }
      if (!shipped.has(name)) {
        throw new Error(`skill grants: ${seat} grants ${name} which is not shipped`);
      }
    }
    for (const name of r.skillAllowed) {
      if (!shipped.has(name)) {
        throw new Error(`skill grants: ${seat} grants ${name} which is not shipped`);
      }
    }
  }
  for (const name of shipped) {
    if (!Object.values(EXPECTED_SKILL_GRANTS).some((g) => g.includes(name))) {
      throw new Error(`skill grants: shipped skill ${name} has no grantee`);
    }
  }
}

if (import.meta.main) {
  await validateSchema();
  await validateVoiceCards();
  await validatePresetsFile();
  await validateRenderedSeats();
  await validatePermissionGraph();
  await validateSkillGrants();
  console.log("TGO config validation: PASSED");
}
