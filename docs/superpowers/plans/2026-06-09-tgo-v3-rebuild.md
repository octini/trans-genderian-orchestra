# TGO v3 Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the trans-genderian-orchestra plugin by forking omo-slim v2-beta.15 and replacing the agent roster (conductor, scribe, composer, principal, ensemble) with a review loop (composer → ensemble → principal).

**Architecture:** Wholesale source replacement from omo-slim. The plugin structure, config system, CLI, and infrastructure remain unchanged. Only the agent roster, prompts, and review loop logic change. Agent names are used everywhere (no internal/display name split).

**Tech Stack:** TypeScript, Bun, Zod, @opencode-ai/plugin SDK

---

## File Structure

### Files to Create
None — all files come from omo-slim v2-beta.15 via copy.

### Files to Delete (from omo-slim copy)
- `src/agents/observer.ts`
- `src/agents/librarian.ts`
- `src/agents/fixer.ts`
- `src/divoom/` (entire directory — Divoom hardware display integration; user does not use it)

### Files to Modify (from omo-slim copy)

| File | Responsibility | Key Changes |
|------|---------------|-------------|
| `package.json` | Package identity | Rename to trans-genderian-orchestra, update version |
| `src/config/constants.ts` | Agent name constants | Rename all 9 agents, update all arrays/records |
| `src/config/schema.ts` | Config validation schemas | Update agent name keys in ManualPlanSchema, FallbackChainsSchema |
| `src/config/agent-mcps.ts` | MCP permissions per agent | Update agent name keys, add scribe MCPs |
| `src/agents/orchestrator.ts` | Conductor agent + prompt | Rename to conductor, rewrite prompt, update all @agent references |
| `src/agents/explorer.ts` | Scribe agent + prompt | Rename to scribe, rewrite prompt, add librarian MCPs |
| `src/agents/oracle.ts` | Principal agent + prompt | Rename to principal, rewrite prompt |
| `src/agents/designer.ts` | Composer agent + prompt | Rename to composer, rewrite prompt |
| `src/agents/council.ts` → `src/agents/ensemble.ts` | Ensemble agent + prompt | Rename to ensemble, rewrite prompt, add structured verdict |
| `src/agents/councillor.ts` | Councillor (unchanged name) | Update prompt for reviewer role with per-seat focus |
| `src/agents/index.ts` | Agent factory registry | Update SUBAGENT_FACTORIES, permission sets, agent classification |
| `src/index.ts` | Plugin entry point | Update all 6+ hardcoded `'orchestrator'` refs, plugin name, log service tag |
| `src/cli/skills.ts` | Skill permissions | Update agent name references |
| `src/cli/custom-skills.ts` | Custom skill registry | Update allowedAgents references |
| `src/cli/providers.ts` | Model preset mappings | Update MODEL_MAPPINGS keys |
| `src/utils/background-job-board.ts` | Background job prefixes | Update AGENT_PREFIX keys |
| `src/hooks/image-hook.ts` | Image processing hook | Remove observer references entirely |
| `src/hooks/filter-available-skills/index.ts` | Skill filtering hook | Update fallback `'orchestrator'` → `'conductor'` |
| `src/hooks/phase-reminder/index.ts` | Phase reminder hook | Update `agent !== 'orchestrator'` → `agent !== 'conductor'` |
| `src/hooks/deepwork/index.ts` | Deepwork command hook | Update `@oracle` reference → `@principal` |
| `src/hooks/task-session-manager/index.ts` | **CRITICAL** — task delegation tracker | Update hardcoded `AGENT_NAME_SET` (validates `subagent_type`) and `agent !== 'orchestrator'` routing check |
| `src/hooks/auto-update-checker/constants.ts` | Auto-update PACKAGE_NAME | Update `PACKAGE_NAME = 'oh-my-opencode-slim'` → new package name |
| `src/hooks/auto-update-checker/index.ts` | Auto-update toast messages | Update 5× `OMO-Slim` display strings |
| `src/tools/council.ts` → `src/tools/ensemble.ts` | Council/ensemble tool | Rename, update `allowedAgents = ['council']` → `['ensemble']` |
| `src/tools/preset-manager.ts` | Preset manager tool | Update `oh-my-opencode-slim.jsonc` references |
| `src/council/council-manager.ts` | Internal council orchestration | Update import path `../agents/council` → `../agents/ensemble` |
| `src/config/loader.ts` | Config loader | Update `PROMPTS_DIR_NAME`, config paths, console warnings |
| `src/cli/paths.ts` | CLI path resolution | Update `oh-my-opencode-slim` references |
| `src/cli/config-io.ts` | CLI config I/O | Update `PACKAGE_NAME` constant |
| `src/tui.ts` | TUI sidebar | Update `PLUGIN_NAME`, `'OMO-Slim'` display label, `agent !== 'council'` filter → `'ensemble'` |
| `src/tui-state.ts` | TUI state persistence | Update `STATE_DIR = 'oh-my-opencode-slim'` → new name |
| `src/interview/ui.ts` | Interview dashboard UI | Update `BRAND_LOGO_URL`, "Oh My Opencode Slim" alt text, "OH MY OPENCODE SLIM" footer text |
| `src/multiplexer/session-manager.ts` | Multiplexer state | Update `Symbol.for('oh-my-opencode-slim....')` key |
| `oh-my-opencode-slim.schema.json` → `trans-genderian-orchestra.schema.json` | JSON schema for config | Rename file, update `$id`, regenerate with new agent names |
| `src/skills/oh-my-opencode-slim/SKILL.md` | Skill documentation | Rename directory and update all references |
| Test files | Various | Update hardcoded agent names |

---

## Task 1: Copy omo-slim Source and Rename Package

**Files:**
- Delete: `src/` (existing TGO v2 source — archive first)
- Create: `src/` (from omo-slim v2-beta.15)
- Modify: `package.json`

- [ ] **Step 1: Archive existing TGO v2 source**

```bash
# From the repo root
mkdir -p archive/tgo-v2-source
cp -r src/ archive/tgo-v2-source/
```

- [ ] **Step 2: Obtain omo-slim v2-beta.15 TypeScript source**

The omo-slim npm package ships compiled `dist/` + `src/skills/` only — the TypeScript source isn't in the package. Obtain it from GitHub:

```bash
# Clone the v2-beta branch (shallow clone for speed)
git clone --depth 1 --branch v2-beta https://github.com/alvinunreal/oh-my-opencode-slim.git /tmp/omo-slim-source
```

Then copy the `src/` directory:

```bash
# Remove existing src
rm -rf src/

# Copy from the cloned repo
cp -r /tmp/omo-slim-source/src/ src/

# Also copy the JSON schema file
cp /tmp/omo-slim-source/oh-my-opencode-slim.schema.json .

# Clean up
rm -rf /tmp/omo-slim-source
```

- [ ] **Step 3: Update package.json**

Replace the package name and version. Keep all dependencies — they're the same.

```jsonc
{
  "name": "trans-genderian-orchestra",
  "version": "3.0.0-beta.1",
  "description": "Agent orchestration plugin for OpenCode with specialist delegation and review loops",
  // ... rest stays the same
}
```

- [ ] **Step 4: Verify build passes**

```bash
bun run build
```

Expected: Build succeeds. The source compiles even though agent names haven't changed yet — we're just establishing the baseline.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: fork omo-slim v2-beta.15 as TGO v3 base"
```

---

## Task 2: Discovery Sweep — Inventory All Old References

**Files:**
- Create: `discovery-sweep.txt` (temporary, not committed)
- No source modifications in this task — pure investigation

This task produces a definitive inventory of every file in the copied omo-slim source that references old agent names or the old plugin identity. This prevents blind spots during later tasks. The output is used as a checklist throughout subsequent tasks.

- [ ] **Step 1: Sweep for old agent name references**

```bash
rg -n --no-heading -t ts -t json -t md \
  'orchestrator|explorer|librarian|oracle|designer|fixer|observer|council\b|councillor' \
  src/ \
  | tee discovery-sweep-agents.txt
```

Expected: Hundreds of lines across many files. This output becomes the checklist for agent rename tasks.

- [ ] **Step 2: Sweep for old plugin identity references**

```bash
rg -n --no-heading -t ts -t json -t md \
  'oh-my-opencode-slim|OMO-Slim|OH MY OPENCODE SLIM|ohmyopencodeslim\.com|OH_MY_OPENCODE_SLIM' \
  src/ package.json README.md \
  | tee discovery-sweep-identity.txt
```

Expected: Dozens of lines. This output becomes the checklist for identity rename tasks.

- [ ] **Step 3: Cross-check against known critical files**

Verify that the sweep found references in these files (if not, the sweep is incomplete):

```bash
for f in \
  src/index.ts \
  src/config/constants.ts \
  src/config/loader.ts \
  src/hooks/task-session-manager/index.ts \
  src/hooks/auto-update-checker/constants.ts \
  src/hooks/auto-update-checker/index.ts \
  src/tui.ts \
  src/tui-state.ts \
  src/interview/ui.ts \
  src/multiplexer/session-manager.ts \
  src/council/council-manager.ts; do
  count=$(grep -c "orchestrator\|oh-my-opencode-slim\|OMO-Slim" "$f" 2>/dev/null || echo "MISSING")
  echo "$f: $count refs"
done
```

Expected: Each file shows at least 1 reference. Any "MISSING" indicates the file wasn't in the copied source (problem with Task 1).

- [ ] **Step 4: Identify files NOT covered by the planned tasks**

Compare the file list from `discovery-sweep-agents.txt` and `discovery-sweep-identity.txt` against the "Files to Modify" list in the File Structure section above. Any file that appears in the sweep but NOT in the plan needs investigation before proceeding.

```bash
# Extract unique file paths from sweep
cut -d: -f1 discovery-sweep-agents.txt discovery-sweep-identity.txt | sort -u > discovery-sweep-files.txt
wc -l discovery-sweep-files.txt
```

Expected: ~30-40 unique files. If significantly more, there are gaps in the plan.

- [ ] **Step 5: Add discovery files to .gitignore**

```bash
echo "discovery-sweep-*.txt" >> .gitignore
git add .gitignore
git commit -m "chore: ignore discovery sweep output files"
```

The sweep files stay locally as a working checklist but are not committed.

---

## Task 3: Rename Agent Names in constants.ts

**Files:**
- Modify: `src/config/constants.ts`

This is the centralized change that propagates to ~60% of runtime code.

- [ ] **Step 1: Update ORCHESTRATOR_NAME**

```typescript
// Before
export const ORCHESTRATOR_NAME = 'orchestrator' as const;

// After
export const ORCHESTRATOR_NAME = 'conductor' as const;
```

- [ ] **Step 2: Update SUBAGENT_NAMES**

Remove observer, librarian, fixer. Rename remaining.

```typescript
// Before
export const SUBAGENT_NAMES = [
  'explorer',
  'librarian',
  'oracle',
  'designer',
  'fixer',
  'observer',
  'council',
  'councillor',
] as const;

// After
export const SUBAGENT_NAMES = [
  'scribe',
  'principal',
  'composer',
  'ensemble',
  'councillor',
] as const;
```

- [ ] **Step 3: Update ORCHESTRATABLE_AGENTS**

```typescript
// Before
export const ORCHESTRATABLE_AGENTS = [
  'explorer',
  'librarian',
  'oracle',
  'designer',
  'fixer',
  'observer',
  'council',
] as const satisfies readonly SubagentName[];

// After
export const ORCHESTRATABLE_AGENTS = [
  'scribe',
  'principal',
  'composer',
  'ensemble',
] as const satisfies readonly SubagentName[];
```

- [ ] **Step 4: Update PROTECTED_AGENTS**

```typescript
// Before
export const PROTECTED_AGENTS = new Set<SubagentName>(['orchestrator', 'councillor']);

// After
export const PROTECTED_AGENTS = new Set<SubagentName>(['conductor', 'councillor']);
```

- [ ] **Step 5: Update AGENT_ALIASES**

```typescript
// Before
export const AGENT_ALIASES: Record<string, AgentName> = {
  explore: 'explorer',
  'frontend-ui-ux-engineer': 'designer',
};

// After
export const AGENT_ALIASES: Record<string, AgentName> = {
  explore: 'scribe',
  'frontend-ui-ux-engineer': 'composer',
  // Legacy aliases for backward compatibility with user configs
  explorer: 'scribe',
  librarian: 'scribe',
  oracle: 'principal',
  designer: 'composer',
  fixer: 'composer',
  council: 'ensemble',
  // NOTE: observer is deleted, NOT aliased — it was a disabled-by-default
  // image analysis agent with no equivalent in the new roster
};
```

Note: Legacy aliases ensure existing user configs with old agent names still work for model overrides, MCP lists, etc.

- [ ] **Step 6: Update SUBAGENT_DELEGATION_RULES**

```typescript
// Before
export const SUBAGENT_DELEGATION_RULES: Record<AgentName, readonly SubagentName[]> = {
  explorer: [],
  librarian: [],
  oracle: [],
  designer: [],
  fixer: [],
  observer: [],
  council: [],
  councillor: [],
  orchestrator: [
    'explorer',
    'librarian',
    'oracle',
    'designer',
    'fixer',
    'observer',
    'council',
  ],
};

// After
export const SUBAGENT_DELEGATION_RULES: Record<AgentName, readonly SubagentName[]> = {
  scribe: [],
  principal: [],
  composer: [],
  ensemble: [],
  councillor: [],
  conductor: [
    'scribe',
    'principal',
    'composer',
    'ensemble',
  ],
};
```

- [ ] **Step 7: Update DEFAULT_MODELS**

```typescript
// Before (omo-slim v2-beta actual defaults)
export const DEFAULT_MODELS: Record<AgentName, string | undefined> = {
  orchestrator: undefined,
  oracle: 'openai/gpt-5.5',
  librarian: 'openai/gpt-5.4-mini',
  explorer: 'openai/gpt-5.4-mini',
  designer: 'openai/gpt-5.4-mini',
  fixer: 'openai/gpt-5.4-mini',
  observer: 'openai/gpt-5.4-mini',
  council: 'openai/gpt-5.4-mini',
  councillor: 'openai/gpt-5.4-mini',
};

// After
export const DEFAULT_MODELS: Record<AgentName, string | undefined> = {
  conductor: undefined,
  scribe: 'openai/gpt-5.4-mini',
  principal: 'openai/gpt-5.5',
  composer: 'openai/gpt-5.4-mini',
  ensemble: 'openai/gpt-5.4-mini',
  councillor: 'openai/gpt-5.4-mini',
};
```

- [ ] **Step 8: Update DEFAULT_DISABLED_AGENTS**

```typescript
// Before
export const DEFAULT_DISABLED_AGENTS: SubagentName[] = ['observer'];

// After
export const DEFAULT_DISABLED_AGENTS: SubagentName[] = [];
```

Note: observer is deleted entirely, so there's nothing to disable by default.

- [ ] **Step 9: Verify build passes**

```bash
bun run build
```

Expected: Build fails with type errors in files that reference old agent names. This is expected — we'll fix those in subsequent tasks.

- [ ] **Step 10: Commit**

```bash
git add src/config/constants.ts
git commit -m "feat: rename agent names in constants (conductor, scribe, principal, composer, ensemble)"
```

---

## Task 4: Update Config Schema (schema.ts)

**Files:**
- Modify: `src/config/schema.ts`

- [ ] **Step 1: Update FALLBACK_AGENT_NAMES**

```typescript
// Before
const FALLBACK_AGENT_NAMES = ['orchestrator', 'oracle', 'designer', 'explorer', 'librarian', 'fixer'] as const;

// After
const FALLBACK_AGENT_NAMES = ['conductor', 'principal', 'composer', 'scribe'] as const;
```

- [ ] **Step 2: Update MANUAL_AGENT_NAMES**

```typescript
// Before
const MANUAL_AGENT_NAMES = ['orchestrator', 'oracle', 'designer', 'explorer', 'librarian', 'fixer'] as const;

// After
const MANUAL_AGENT_NAMES = ['conductor', 'principal', 'composer', 'scribe'] as const;
```

- [ ] **Step 3: Update ManualPlanSchema**

The schema uses `ManualAgentPlanSchema` (with `primary`, `fallback1`, `fallback2`, `fallback3` fields), not `z.array(TaskSchema)`.

```typescript
// Before
export const ManualPlanSchema = z.object({
  'orchestrator': ManualAgentPlanSchema,
  'oracle': ManualAgentPlanSchema,
  'designer': ManualAgentPlanSchema,
  'explorer': ManualAgentPlanSchema,
  'librarian': ManualAgentPlanSchema,
  'fixer': ManualAgentPlanSchema,
}).strict();

// After
export const ManualPlanSchema = z.object({
  'conductor': ManualAgentPlanSchema,
  'principal': ManualAgentPlanSchema,
  'composer': ManualAgentPlanSchema,
  'scribe': ManualAgentPlanSchema,
}).strict();
```

Note: `ManualAgentPlanSchema` has fields: `primary`, `fallback1`, `fallback2`, `fallback3` (all `ProviderModelIdSchema`). Do NOT change its structure — only change which agent names are keys in `ManualPlanSchema`.

- [ ] **Step 4: Update FallbackChainsSchema**

```typescript
// Before
export const FallbackChainsSchema = z.object({
  'orchestrator': z.array(z.string()).optional(),
  'oracle': z.array(z.string()).optional(),
  'designer': z.array(z.string()).optional(),
  'explorer': z.array(z.string()).optional(),
  'librarian': z.array(z.string()).optional(),
  'fixer': z.array(z.string()).optional(),
}).catchall(z.array(z.string()));

// After
export const FallbackChainsSchema = z.object({
  'conductor': z.array(z.string()).optional(),
  'principal': z.array(z.string()).optional(),
  'composer': z.array(z.string()).optional(),
  'scribe': z.array(z.string()).optional(),
  'ensemble': z.array(z.string()).optional(),
}).catchall(z.array(z.string()));
```

- [ ] **Step 5: Update council config section**

The `council` section in `PluginConfigSchema` and `src/config/council-schema.ts` references agent names for councillor seats. Update any references to `council` agent name to `ensemble`, and verify that councillor seat names (first, second, third) are compatible with the new system.

```typescript
// Check src/config/council-schema.ts for:
// - Agent name references (council → ensemble)
// - Councillor seat names (should be first/second/third)
// - Preset structure compatibility
// Also check the `council` field in PluginConfigSchema in schema.ts
```

- [ ] **Step 6: Verify build passes**

```bash
bun run build
```

- [ ] **Step 6: Commit**

```bash
git add src/config/schema.ts
git commit -m "feat: update config schema with new agent names"
```

---

## Task 5: Delete Removed Agent Files

**Files:**
- Delete: `src/agents/observer.ts`
- Delete: `src/agents/librarian.ts`
- Delete: `src/agents/fixer.ts`

- [ ] **Step 1: Delete the three agent files**

```bash
rm src/agents/observer.ts src/agents/librarian.ts src/agents/fixer.ts
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove deleted agent files (observer, librarian, fixer)"
```

---

## Task 6: Rename and Rewrite Explorer → Scribe

**Files:**
- Modify: `src/agents/explorer.ts`

- [ ] **Step 1: Rename the file**

```bash
mv src/agents/explorer.ts src/agents/scribe.ts
```

- [ ] **Step 2: Rewrite the agent definition**

Replace the entire file content. The scribe synthesizes explorer (codebase nav) and librarian (external research) into one read-only research specialist.

```typescript
import type { AgentDefinition } from './orchestrator.js';
import { READONLY_FILE_OPERATIONS_RULES } from '../config/constants.js';

const SCRIBE_PROMPT = `You are Scribe — a research specialist for codebase exploration and external documentation lookup.

## Identity
You find information. You explore codebases, look up documentation, search for patterns, and research external libraries. You do NOT write code, edit files, or implement features.

## Research Methods
- **Codebase exploration**: Use glob, grep, ast_grep_search for file/symbol/pattern discovery
- **File reading**: Use read for understanding implementation details
- **External research**: Use websearch, context7, grep_app for documentation and examples
- **URL fetching**: Use webfetch for specific documentation pages

## Output Format
<results>
  <files>Relevant file paths with line numbers</files>
  <answer>Direct answer with evidence and sources</answer>
</results>

## Rules
${READONLY_FILE_OPERATIONS_RULES}
- Be thorough but concise — show relevant code snippets, not entire files
- Always cite sources (file paths, URLs, documentation references)
- If you can't find something, say so clearly rather than guessing
- Prefer evidence over opinion — show the code/docs that support your answer
`;

export function createScribeAgent(
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): AgentDefinition {
  let prompt = SCRIBE_PROMPT;

  if (customPrompt) {
    prompt = customPrompt;
  } else if (customAppendPrompt) {
    prompt = `${SCRIBE_PROMPT}\n\n${customAppendPrompt}`;
  }

  return {
    name: 'scribe',
    description: 'Research specialist. Codebase exploration, documentation lookup, external research. Use for finding files, understanding code, looking up library docs.',
    config: {
      model,
      temperature: 0.3,
      prompt,
    },
  };
}
```

- [ ] **Step 3: Verify build passes**

```bash
bun run build
```

- [ ] **Step 4: Commit**

```bash
git add src/agents/scribe.ts
git rm src/agents/explorer.ts
git commit -m "feat: replace explorer with scribe (explorer + librarian synthesis)"
```

---

## Task 7: Rename and Rewrite Oracle → Principal

**Files:**
- Modify: `src/agents/oracle.ts`

- [ ] **Step 1: Rename the file**

```bash
mv src/agents/oracle.ts src/agents/principal.ts
```

- [ ] **Step 2: Rewrite the agent definition**

```typescript
import type { AgentDefinition } from './orchestrator.js';
import { READONLY_FILE_OPERATIONS_RULES } from '../config/constants.js';

const PRINCIPAL_PROMPT = `You are Principal — a strategic advisor and final review gate.

## Identity
You provide high-judgment technical guidance and verify completed work. You advise on architecture, debug complex problems, and serve as the final approval gate after the review panel.

## Strategic Advisory
- Architecture decisions with long-term impact
- Complex debugging with unclear root cause
- Security, scalability, and data integrity decisions
- Costly trade-offs (performance vs maintainability)
- Problems persisting after multiple fix attempts

## Final Review Gate
After the Ensemble review panel approves work, you perform final verification:
- Does the implementation match the original intent and acceptance criteria?
- Are there risks the review panel missed?
- Is the change safe to ship?

Return a structured verdict:
{
  "verdict": "approve|reject",
  "findings": "Summary of findings",
  "issues": [
    { "file": "path", "line": 42, "description": "What's wrong", "severity": "critical|major|minor" }
  ]
}

## Rules
${READONLY_FILE_OPERATIONS_RULES}
- Be direct and opinionated — your job is to make judgment calls
- When reviewing, focus on what matters: correctness, safety, intent alignment
- If you approve, say so clearly. If you reject, say exactly what needs to change.
`;

export function createPrincipalAgent(
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): AgentDefinition {
  let prompt = PRINCIPAL_PROMPT;

  if (customPrompt) {
    prompt = customPrompt;
  } else if (customAppendPrompt) {
    prompt = `${PRINCIPAL_PROMPT}\n\n${customAppendPrompt}`;
  }

  return {
    name: 'principal',
    description: 'Strategic advisor and final review gate. Architecture decisions, debugging guidance, final verification of completed work.',
    config: {
      model,
      temperature: 0.3,
      prompt,
    },
  };
}
```

- [ ] **Step 3: Verify build passes**

```bash
bun run build
```

- [ ] **Step 4: Commit**

```bash
git add src/agents/principal.ts
git rm src/agents/oracle.ts
git commit -m "feat: replace oracle with principal (oracle + reviewer synthesis)"
```

---

## Task 8: Rename and Rewrite Designer → Composer

**Files:**
- Modify: `src/agents/designer.ts`

- [ ] **Step 1: Rename the file**

```bash
mv src/agents/designer.ts src/agents/composer.ts
```

- [ ] **Step 2: Rewrite the agent definition**

```typescript
import type { AgentDefinition } from './orchestrator.js';
import { WRITABLE_FILE_OPERATIONS_RULES } from '../config/constants.js';

const COMPOSER_PROMPT = `You are Composer — an implementation specialist for code changes and UI/UX work.

## Identity
You implement. You write code, create tests, fix bugs, build UI components, and make all the changes needed to fulfill a task spec. You do NOT research, explore the codebase, or make architectural decisions — those belong to Scribe and Principal.

## Implementation Methods
- **Code changes**: Use edit and write for all file modifications
- **Validation**: Use bash to run relevant tests, type checks, and linters
- **Background tasks**: Use background: true for long-running commands

## UI/UX Guidance (apply when work involves user-facing interfaces)
- **Typography**: Consistent type scale, readable line heights, clear hierarchy
- **Color**: Purposeful palette, sufficient contrast, consistent usage
- **Motion**: Meaningful transitions, appropriate duration (150-300ms), respect prefers-reduced-motion
- **Spatial**: Consistent spacing scale, clear visual grouping, responsive layouts
- **Depth**: Elevation for hierarchy, subtle shadows, clear focus states

## Output Format
<summary>Brief description of what was implemented</summary>
<changes>
  - file: path/to/file.ts — what changed
</changes>
<verification>
  - Test/lint/typecheck results
</verification>

## Rules
${WRITABLE_FILE_OPERATIONS_RULES}
- Read before edit — always read the file (or relevant section) before modifying it
- Run validation — after changes, run relevant tests/typecheck/lint
- Be precise — make targeted changes, not broad rewrites
- Respect scope — only modify files within your declared write scope
- If a change is outside your scope or needs architectural decision, say so
`;

export function createComposerAgent(
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): AgentDefinition {
  let prompt = COMPOSER_PROMPT;

  if (customPrompt) {
    prompt = customPrompt;
  } else if (customAppendPrompt) {
    prompt = `${COMPOSER_PROMPT}\n\n${customAppendPrompt}`;
  }

  return {
    name: 'composer',
    description: 'Implementation specialist. Code changes, UI/UX work, test writing, bug fixes. All bounded implementation tasks.',
    config: {
      model,
      temperature: 0.5,
      prompt,
    },
  };
}
```

- [ ] **Step 3: Verify build passes**

```bash
bun run build
```

- [ ] **Step 4: Commit**

```bash
git add src/agents/composer.ts
git rm src/agents/designer.ts
git commit -m "feat: replace designer with composer (fixer + designer synthesis)"
```

---

## Task 9: Rename and Rewrite Orchestrator → Conductor

**Files:**
- Modify: `src/agents/orchestrator.ts`

This is the largest single change. The conductor prompt is heavily delegation-focused.

- [ ] **Step 1: Rename the file**

```bash
mv src/agents/orchestrator.ts src/agents/conductor.ts
```

- [ ] **Step 2: Update AGENT_DESCRIPTIONS**

Replace all agent description keys and values with new names.

```typescript
const AGENT_DESCRIPTIONS: Record<string, string> = {
  scribe: `@scribe — Research specialist. Codebase exploration, documentation lookup, external research. Use for "where is X?", "find Y", "how does Z work?". READ-ONLY — never edits files.`,
  principal: `@principal — Strategic advisor and final review gate. Architecture decisions, debugging guidance, final verification. READ-ONLY — never edits files.`,
  composer: `@composer — Implementation specialist. Code changes, UI/UX work, test writing, bug fixes. WRITES files — all bounded implementation tasks.`,
  ensemble: `@ensemble — Multi-model review panel. Runs 3 reviewers in parallel (first/second/third) with distinct focuses. Returns structured JSON verdict. Use for review after @composer completes work.`,
};
```

- [ ] **Step 3: Update VALIDATION_ROUTING**

```typescript
const VALIDATION_ROUTING = [
  { check: 'UI/UX quality', agent: '@composer', condition: 'work involves user-facing interfaces' },
  { check: 'Code review', agent: '@principal', condition: 'behavioral changes, architecture decisions' },
  { check: 'Test coverage', agent: '@composer', condition: 'code changes that should have tests' },
  { check: 'Visual analysis', agent: '@composer', condition: 'UI changes needing visual verification' },
];
```

- [ ] **Step 4: Update PARALLEL_DELEGATION_EXAMPLES**

```typescript
const PARALLEL_DELEGATION_EXAMPLES = [
  'Multiple @scribe searches across different domains',
  '@scribe codebase exploration + @scribe external docs lookup in parallel',
  'Multiple @composer instances for faster, scoped implementation (one per folder)',
  '3 @ensemble reviewers in parallel (first: correctness, second: edge cases, third: UX)',
];
```

- [ ] **Step 5: Rewrite buildOrchestratorPrompt → buildConductorPrompt**

Replace the entire function with the new conductor prompt. This is ~80 lines (shorter than omo-slim's ~200 because agent descriptions are in the agent definitions).

```typescript
export function buildConductorPrompt(): string {
  return `You are Conductor — a technical lead, planning agent, and user-facing coordinator.

**Core identity**: You take user intent, create plans, and delegate ALL implementation work to specialists. You do NOT write code, edit files, research documentation, or perform implementation tasks yourself. Your job is to think, plan, coordinate, and verify.

**Agents**:
${Object.entries(AGENT_DESCRIPTIONS).map(([, desc]) => `- ${desc}`).join('\n')}

**Delegation rules**:
- Implementation work → @composer (always delegate, never do yourself)
- Research/exploration → @scribe (always delegate, never do yourself)
- Architecture decisions → @principal (delegate when uncertain)
- Review after implementation → @ensemble (delegate for review)
- Final verification → @principal (delegate for final gate)
- If you're about to write code: STOP. Delegate to @composer.
- If you're about to search the codebase: STOP. Delegate to @scribe.
- If you're about to edit a file: STOP. Delegate to @composer.

**Workflow**:
1. Understand user intent — ask clarifying questions if needed
2. Create a plan — break work into tasks with clear acceptance criteria
3. Delegate tasks to appropriate specialists
4. Collect and integrate results
5. Route through review loop (see below)
6. Report final outcome to user

## Review Loop

After @composer completes implementation, the review loop runs:

1. Delegate to @ensemble for review panel (pass Composer output + original task spec + modified file paths)
2. If @ensemble returns reject → send back to @composer for rework → repeat step 1
3. When @ensemble returns approve → delegate to @principal for final review gate
4. If @principal rejects → send back to @composer → repeat from step 1
5. Max review loops: 3. After 3 @composer↔@ensemble cycles, escalate to @principal
   with "wheels spinning" flag — the loop was not resolved naturally.

**Skip conditions**: Skip @ensemble for Markdown edits, config tweaks, or changes
under 10 lines that don't touch agent logic. Go directly to @principal.

**Escalation**: If @principal rejects after @ensemble approval, note the specific gap
that @ensemble missed — this improves future review quality.

**Session reuse**: Prefer reusing available specialist sessions over creating new ones. Context reuse saves time and tokens.

**Background tasks**: Use background execution for long-running commands. Never poll — wait for completion reminders.

**Validation routing**:
${VALIDATION_ROUTING.map(r => `- ${r.check}: delegate to ${r.agent} when ${r.condition}`).join('\n')}

**What you DO**:
- Parse and clarify user intent
- Create plans and task breakdowns
- Delegate to specialists
- Integrate results from multiple specialists
- Route through review loop
- Report outcomes to user
- Ask clarifying questions when requirements are ambiguous

**What you NEVER do**:
- Write or edit code/files
- Search the codebase
- Research documentation
- Implement features
- Fix bugs directly
- Run build/test commands (delegate to @composer)

**Constraints**:
- Every code/config/doc change affecting behavior requires @ensemble review + @principal verification before claiming completion
- If you catch yourself about to do implementation work, stop and delegate
- Be concise with users — they want results, not process descriptions

**Communication style**:
- Direct, no fluff
- One-word answers when appropriate
- Brief delegation notices ("Checking docs via @scribe..." not "I'm going to delegate to @scribe because...")
- Never praise user input ("Great question!" "Excellent idea!")
`;
}
```

- [ ] **Step 6: Update createOrchestratorAgent → createConductorAgent**

The conductor factory has a different signature than subagent factories — it takes an optional `disabledAgents` parameter and the model can be a string or array.

```typescript
export function createConductorAgent(
  model?: string | Array<string | { id: string; variant?: string }>,
  customPrompt?: string,
  customAppendPrompt?: string,
  disabledAgents?: Set<string>,
): AgentDefinition {
  const basePrompt = buildConductorPrompt(disabledAgents);
  let prompt = basePrompt;

  if (customPrompt) {
    prompt = customPrompt;
  } else if (customAppendPrompt) {
    prompt = `${basePrompt}\n\n${customAppendPrompt}`;
  }

  const modelArray = Array.isArray(model)
    ? model.map((entry) =>
        typeof entry === 'string' ? { id: entry } : entry,
      )
    : undefined;

  return {
    name: 'conductor',
    description: 'Technical lead, planning agent, and user-facing coordinator. Delegates all implementation to specialists.',
    config: {
      model: Array.isArray(model) ? model[0]?.toString() : model,
      prompt,
    },
    ...(modelArray ? { _modelArray: modelArray } : {}),
  };
}
```

Update `buildConductorPrompt` to accept `disabledAgents`:

```typescript
function buildConductorPrompt(disabledAgents?: Set<string>): string {
  // Filter agent descriptions, validation routing, and parallel examples
  // to exclude disabled agents (same pattern as omo-slim's orchestrator)
  const enabledDescriptions = Object.entries(AGENT_DESCRIPTIONS)
    .filter(([name]) => !disabledAgents?.has(name))
    .map(([, desc]) => `- ${desc}`)
    .join('\n');

  // ... rest of prompt uses enabledDescriptions
}
```

- [ ] **Step 7: Verify build passes**

```bash
bun run build
```

- [ ] **Step 8: Commit**

```bash
git add src/agents/conductor.ts
git rm src/agents/orchestrator.ts
git commit -m "feat: replace orchestrator with conductor (delegation-heavy technical lead)"
```

---

## Task 10: Rename and Rewrite Council → Ensemble

**Files:**
- Modify: `src/agents/council.ts`

- [ ] **Step 1: Rename the file**

```bash
mv src/agents/council.ts src/agents/ensemble.ts
```

- [ ] **Step 2: Update the agent name and prompt**

In `src/agents/ensemble.ts`:

```typescript
// Before: name: 'council'
// After: name: 'ensemble'
```

Replace the council agent prompt with the ensemble prompt:

```typescript
const ENSEMBLE_PROMPT = `You are Ensemble — a multi-model review panel that synthesizes diverse perspectives into actionable feedback.

**Role**: Run 3 reviewers in parallel (first, second, third), each with a distinct review focus. Synthesize their findings into a structured verdict.

**Review process**:
1. Read the composer's output, original task spec, and modified file paths
2. Run all 3 reviewers in parallel via council_session
3. Collect each reviewer's findings
4. Synthesize into a structured verdict (see format below)

**Reviewer focuses**:
- first: Correctness & architecture — does the code work, is it well-structured?
- second: Edge cases & security — what breaks, what's exploitable, what's missing?
- third: UX & performance — is it usable, is it efficient, does it feel right?

**Output format** (structured JSON):
{
  "verdict": "approve|reject",
  "per_councillor_findings": {
    "first": "Brief summary of correctness/architecture findings",
    "second": "Brief summary of edge cases/security findings",
    "third": "Brief summary of UX/performance findings"
  },
  "issues": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "description": "What's wrong and how to fix it",
      "severity": "critical|major|minor"
    }
  ],
  "consensus": "unanimous|majority|split"
}

**Consensus rules**:
- Unanimous (3/3 approve): verdict = approve
- Majority (2/3 approve): verdict = approve, but include dissenting findings
- Split (1/3 or 0/3 approve): verdict = reject
- If any reviewer flags a critical severity issue: verdict = reject regardless of vote count
- Always surface ALL individual findings, even if one reviewer catches something the others miss

**Constraints**:
- Include all individual reviewer verdicts in output — don't suppress minority findings
- Be specific — reference files, lines, and exact issues
- If one reviewer finds a critical issue, verdict = reject regardless of other votes
`;
```

Also update the `createCouncilAgent` → `createEnsembleAgent` function:

```typescript
export function createEnsembleAgent(
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): AgentDefinition {
  let prompt = ENSEMBLE_PROMPT;

  if (customPrompt) {
    prompt = customPrompt;
  } else if (customAppendPrompt) {
    prompt = `${ENSEMBLE_PROMPT}\n\n${customAppendPrompt}`;
  }

  return {
    name: 'ensemble',
    description: 'Multi-model consensus engine. Runs 3 reviewers in parallel with distinct perspectives. Use for hard decisions or structured review.',
    config: {
      model,
      prompt,
    },
  };
}
```

Update `formatCouncillorPrompt` and `formatCouncillorResults` to use new naming if they reference 'council' or 'councillor' in user-facing text.

- [ ] **Step 3: Verify build passes**

```bash
bun run build
```

- [ ] **Step 4: Commit**

```bash
git add src/agents/ensemble.ts
git rm src/agents/council.ts
git commit -m "feat: replace council with ensemble (review panel with structured verdict)"
```

---

## Task 11: Update Councillor Prompt for Review Role

**Files:**
- Modify: `src/agents/councillor.ts`

- [ ] **Step 1: Update the councillor prompt**

The councillor stays as `councillor` (internal, hidden subagent). But its prompt changes to support the review role with per-seat differentiation.

```typescript
const COUNCILLOR_PROMPT = `You are a Councillor — one of three review perspectives in the Ensemble review panel.

Your role depends on which seat you occupy:

**first (Correctness & Architecture)**:
- Does the code compile and run correctly?
- Are types used properly?
- Is the code well-structured and maintainable?
- Does the architecture make sense?
- Are there logic errors or off-by-one bugs?

**second (Edge Cases & Security)**:
- What inputs could break this?
- Are there security vulnerabilities (injection, auth bypass, data leaks)?
- Are edge cases handled (empty arrays, null values, concurrent access)?
- Is error handling comprehensive?
- Are there race conditions or resource leaks?

**third (UX & Performance)**:
- Is the user experience smooth and intuitive?
- Are there performance bottlenecks?
- Is the UI responsive and accessible?
- Are loading states and error states handled?
- Does it feel right?

## Review Checklist
1. Read the original task spec and acceptance criteria
2. Read the modified files (use read, glob, grep as needed)
3. Check against your focus area (see above)
4. Return your findings as structured JSON:

{
  "seat": "first|second|third",
  "verdict": "approve|reject",
  "findings": "Brief summary of your review",
  "issues": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "description": "What's wrong and how to fix it",
      "severity": "critical|major|minor"
    }
  ]
}

## Rules
- Read files before reviewing — you need to see the actual code
- Be specific — cite files, lines, and exact problems
- If you find no issues, return approve with an empty issues list
- Focus on your seat's area of expertise — trust the other seats for their domains
- A critical issue always means reject, even if everything else looks good
`;
```

Note: The seat assignment (first/second/third) is injected by the ensemble when creating the councillor session, not hardcoded in the prompt. The prompt describes all three seats so the model understands the role.

- [ ] **Step 2: Verify build passes**

```bash
bun run build
```

- [ ] **Step 3: Commit**

```bash
git add src/agents/councillor.ts
git commit -m "feat: update councillor prompt for review role with per-seat focuses"
```

---

## Task 12: Update Agent Factory Registry (index.ts)

**Files:**
- Modify: `src/agents/index.ts`

- [ ] **Step 1: Update SUBAGENT_FACTORIES**

```typescript
// Before
const SUBAGENT_FACTORIES: Record<SubagentName, () => AgentConfig> = {
  explorer: createExplorerAgent,
  librarian: createLibrarianAgent,
  oracle: createOracleAgent,
  designer: createDesignerAgent,
  fixer: createFixerAgent,
  observer: createObserverAgent,
  council: createCouncilAgent,
  councillor: createCouncillorAgent,
};

// After
const SUBAGENT_FACTORIES: Record<SubagentName, () => AgentConfig> = {
  scribe: createScribeAgent,
  principal: createPrincipalAgent,
  composer: createComposerAgent,
  ensemble: createEnsembleAgent,
  councillor: createCouncillorAgent,
};
```

Update imports at the top of the file:

```typescript
// Before
import { createExplorerAgent } from './explorer.js';
import { createLibrarianAgent } from './librarian.js';
import { createOracleAgent } from './oracle.js';
import { createDesignerAgent } from './designer.js';
import { createFixerAgent } from './fixer.js';
import { createObserverAgent } from './observer.js';
import { createCouncilAgent } from './council.js';
import { createCouncillorAgent } from './councillor.js';

// After
import { createScribeAgent } from './scribe.js';
import { createPrincipalAgent } from './principal.js';
import { createComposerAgent } from './composer.js';
import { createEnsembleAgent } from './ensemble.js';
import { createCouncillorAgent } from './councillor.js';
```

- [ ] **Step 2: Update COUNCIL_TOOL_ALLOWED_AGENTS**

```typescript
// Before
const COUNCIL_TOOL_ALLOWED_AGENTS = new Set(['council']);

// After
const COUNCIL_TOOL_ALLOWED_AGENTS = new Set(['ensemble']);
```

- [ ] **Step 3: Update CANCEL_TASK_ALLOWED_AGENTS**

```typescript
// Before
const CANCEL_TASK_ALLOWED_AGENTS = new Set(['orchestrator']);

// After
const CANCEL_TASK_ALLOWED_AGENTS = new Set(['conductor']);
```

- [ ] **Step 4: Update createAgents function**

Find and update all references to old agent names in `createAgents()`:

```typescript
// Before
const disabled = new Set<SubagentName>(config.disabledAgents ?? DEFAULT_DISABLED_AGENTS);
if (!config.enableCouncil) {
  disabled.add('council');
}

// After
const disabled = new Set<SubagentName>(config.disabledAgents ?? DEFAULT_DISABLED_AGENTS);
if (!config.enableCouncil) {
  disabled.add('ensemble');
}
```

Also update the fixer/librarian model fallback logic — these agents no longer exist, so remove that fallback code entirely.

- [ ] **Step 5: Update getAgentConfigs function**

Update mode classification:

```typescript
// Before
if (name === 'orchestrator') return 'primary';
if (name === 'council' || name === 'councillor') return 'all';
return 'subagent';

// After
if (name === 'conductor') return 'primary';
if (name === 'ensemble' || name === 'councillor') return 'all';
return 'subagent';
```

- [ ] **Step 6: Update injectDisplayNames**

This function replaces `@internalName` with `@displayName` in the orchestrator prompt. Since we're using new names directly, this function can be simplified or removed. However, it's still useful for user-configured display names.

Update the agent name references in the replacement map:

```typescript
// The function iterates ALL_AGENT_NAMES and replaces @name with displayName
// Since we renamed the agents, this will automatically use the new names
// No code change needed — just verify it works with the new names
```

- [ ] **Step 7: Verify build passes**

```bash
bun run build
```

- [ ] **Step 8: Commit**

```bash
git add src/agents/index.ts
git commit -m "feat: update agent factory registry with new agent names"
```

---

## Task 13: Update Plugin Entry Point (index.ts)

**Files:**
- Modify: `src/index.ts`

This file is the plugin's main entry point. It contains 6+ hardcoded references to `'orchestrator'` (none of which import from constants), the plugin registration name, log service tag, and error-reporting GitHub URLs. Each must be updated.

- [ ] **Step 1: Update plugin registration name**

```typescript
// Before
return {
  name: 'oh-my-opencode-slim',
  agent: agents,
  ...

// After
return {
  name: 'trans-genderian-orchestra',
  agent: agents,
  ...
```

- [ ] **Step 2: Update app log service tag**

```typescript
// Before
await ctx.client.app.log({
  body: { service: 'oh-my-opencode-slim', level, message },
});

// After
await ctx.client.app.log({
  body: { service: 'trans-genderian-orchestra', level, message },
});
```

- [ ] **Step 3: Update console.error fallback prefix**

```typescript
// Before
console.error(`[oh-my-opencode-slim] ${prefix}: ${message}`);

// After
console.error(`[trans-genderian-orchestra] ${prefix}: ${message}`);
```

- [ ] **Step 4: Update error reporting URLs**

Search for `github.com/alvinunreal/oh-my-opencode-slim` and replace with the TGO v3 repo URL:

```typescript
// Before
`INIT FAILED: ${String(err)}. Report at github.com/alvinunreal/oh-my-opencode-slim/issues/310`

// After (substitute with actual repo URL — e.g., github.com/anomalyco/trans-genderian-orchestra)
`INIT FAILED: ${String(err)}. Report at github.com/anomalyco/trans-genderian-orchestra/issues`
```

- [ ] **Step 5: Update default_agent assignment**

```typescript
// Before
(opencodeConfig as { default_agent?: string }).default_agent = 'orchestrator';

// After
(opencodeConfig as { default_agent?: string }).default_agent = 'conductor';
```

- [ ] **Step 6: Update system prompt guard**

```typescript
// Before
if (agentName === 'orchestrator') {
  const alreadyInjected = output.system.some(
    (s) => typeof s === 'string' && s.includes('<Role>') && s.includes('orchestrator'),
  );

// After
if (agentName === 'conductor') {
  const alreadyInjected = output.system.some(
    (s) => typeof s === 'string' && s.includes('<Role>') && s.includes('conductor'),
  );
```

- [ ] **Step 7: Update postFileToolNudgeHook session filter**

```typescript
// Before
postFileToolNudgeHook = createPostFileToolNudgeHook({
  shouldInject: (sessionID) => sessionAgentMap.get(sessionID) === 'orchestrator',
});

// After
postFileToolNudgeHook = createPostFileToolNudgeHook({
  shouldInject: (sessionID) => sessionAgentMap.get(sessionID) === 'conductor',
});
```

- [ ] **Step 8: Update taskSessionManagerHook session filter**

```typescript
// Before
taskSessionManagerHook = createTaskSessionManagerHook(ctx, {
  ...
  shouldManageSession: (sessionID) => sessionAgentMap.get(sessionID) === 'orchestrator',
});

// After
taskSessionManagerHook = createTaskSessionManagerHook(ctx, {
  ...
  shouldManageSession: (sessionID) => sessionAgentMap.get(sessionID) === 'conductor',
});
```

- [ ] **Step 9: Update cancelTaskTools session filter**

```typescript
// Before
cancelTaskTools = createCancelTaskTool({
  ...
  shouldManageSession: (sessionID) => sessionAgentMap.get(sessionID) === 'orchestrator',
});

// After
cancelTaskTools = createCancelTaskTool({
  ...
  shouldManageSession: (sessionID) => sessionAgentMap.get(sessionID) === 'conductor',
});
```

- [ ] **Step 10: Update any remaining 'councillor' references**

The `agentDef.name === 'councillor'` check stays the same (councillor name is unchanged). Verify it still appears correctly.

```bash
grep -n "'councillor'" src/index.ts
```

Expected: ~1 line referencing `'councillor'`. No changes needed.

- [ ] **Step 11: Update any remaining 'council' references (NOT councillor)**

Search for `'council'` (exact match) and replace with `'ensemble'`:

```bash
grep -n "'council'" src/index.ts | grep -v "councillor"
```

If any matches, update them from `'council'` to `'ensemble'`.

- [ ] **Step 12: Update injectDisplayNames call**

The call to `injectDisplayNames()` should still work since it uses `ALL_AGENT_NAMES` from constants. Verify it compiles.

- [ ] **Step 13: Final sweep verification**

```bash
grep -n "orchestrator\|oh-my-opencode-slim\|'council'" src/index.ts | grep -v "councillor"
```

Expected: No matches (all should be replaced). If any remain, address them.

- [ ] **Step 14: Verify build passes**

```bash
bun run build
```

- [ ] **Step 15: Commit**

```bash
git add src/index.ts
git commit -m "feat: update plugin entry point with new agent names and identity"
```

---

## Task 14: Update MCP Permissions (agent-mcps.ts)

**Files:**
- Modify: `src/config/agent-mcps.ts`

- [ ] **Step 1: Update DEFAULT_AGENT_MCPS**

```typescript
// Before
export const DEFAULT_AGENT_MCPS: Record<AgentName, string[]> = {
  orchestrator: ['*', '!context7'],
  librarian: ['websearch', 'context7', 'grep_app'],
  designer: [],
  oracle: [],
  explorer: [],
  fixer: [],
  observer: [],
  council: [],
  councillor: [],
};

// After
export const DEFAULT_AGENT_MCPS: Record<AgentName, string[]> = {
  conductor: ['*', '!context7'],
  scribe: ['websearch', 'context7', 'grep_app'],  // inherited from librarian
  principal: [],
  composer: [],
  ensemble: [],
  councillor: [],
};
```

- [ ] **Step 2: Verify build passes**

```bash
bun run build
```

- [ ] **Step 3: Commit**

```bash
git add src/config/agent-mcps.ts
git commit -m "feat: update MCP permissions with new agent names"
```

---

## Task 15: Update Skill Permissions (skills.ts, custom-skills.ts)

**Files:**
- Rename: `src/skills/oh-my-opencode-slim/` → `src/skills/trans-genderian-orchestra/`
- Modify: `src/cli/skills.ts`
- Modify: `src/cli/custom-skills.ts`
- Modify: `src/skills/trans-genderian-orchestra/SKILL.md`

- [ ] **Step 1: Rename skill directory**

```bash
mv src/skills/oh-my-opencode-slim src/skills/trans-genderian-orchestra
```

- [ ] **Step 2: Update SKILL.md**

In `src/skills/trans-genderian-orchestra/SKILL.md`, update:
- Config file paths from `oh-my-opencode-slim.jsonc` to `trans-genderian-orchestra.jsonc`
- Agent name references (orchestrator→conductor, explorer→scribe, etc.)
- Plugin name references

- [ ] **Step 3: Update PERMISSION_ONLY_SKILLS in skills.ts**

```typescript
// Before
export const PERMISSION_ONLY_SKILLS = [
  { name: 'requesting-code-review', allowedAgents: ['oracle'] },
];

// After
export const PERMISSION_ONLY_SKILLS = [
  { name: 'requesting-code-review', allowedAgents: ['principal'] },
];
```

- [ ] **Step 4: Update getSkillPermissionsForAgent in skills.ts**

```typescript
// Before
'*': agentName === 'orchestrator' ? 'allow' : 'deny'

// After
'*': agentName === 'conductor' ? 'allow' : 'deny'
```

- [ ] **Step 5: Update CUSTOM_SKILLS in custom-skills.ts**

```typescript
// Before
export const CUSTOM_SKILLS = [
  { name: 'simplify', allowedAgents: ['oracle'] },
  { name: 'codemap', allowedAgents: ['orchestrator'] },
  { name: 'clonedeps', allowedAgents: ['orchestrator'] },
  { name: 'deepwork', allowedAgents: ['orchestrator'] },
  { name: 'oh-my-opencode-slim', allowedAgents: ['orchestrator'] },
];

// After
export const CUSTOM_SKILLS = [
  { name: 'simplify', allowedAgents: ['principal'] },
  { name: 'codemap', allowedAgents: ['conductor'] },
  { name: 'clonedeps', allowedAgents: ['conductor'] },
  { name: 'deepwork', allowedAgents: ['conductor'] },
  { name: 'trans-genderian-orchestra', allowedAgents: ['conductor'] },
];
```

- [ ] **Step 6: Verify build passes**

```bash
bun run build
```

- [ ] **Step 7: Commit**

```bash
git add src/cli/skills.ts src/cli/custom-skills.ts
git commit -m "feat: update skill permissions with new agent names"
```

---

## Task 16: Update Model Preset Mappings (providers.ts)

**Files:**
- Modify: `src/cli/providers.ts`

- [ ] **Step 1: Update MODEL_MAPPINGS**

Replace all agent name keys in every preset. Note: MODEL_MAPPINGS uses `{ model: string, variant?: string }` objects, not bare strings.

```typescript
// Before (example for one preset)
openai: {
  orchestrator: { model: 'openai/gpt-5.5' },
  oracle: { model: 'openai/gpt-5.5', variant: 'high' },
  librarian: { model: 'openai/gpt-5.4-mini' },
  explorer: { model: 'openai/gpt-5.4-mini' },
  designer: { model: 'openai/gpt-5.4-mini' },
  fixer: { model: 'openai/gpt-5.4-mini' },
}

// After
openai: {
  conductor: { model: 'openai/gpt-5.5' },
  principal: { model: 'openai/gpt-5.5', variant: 'high' },
  scribe: { model: 'openai/gpt-5.4-mini' },
  composer: { model: 'openai/gpt-5.4-mini' },
}
```

Apply the same pattern to all presets (kimi, copilot, zai-plan, opencode-go). For opencode-go which also has council/observer entries:

```typescript
// Before
'opencode-go': {
  orchestrator: { model: 'opencode-go/kimi-2.6' },
  oracle: { model: 'opencode-go/kimi-2.6' },
  council: { model: 'opencode-go/kimi-2.6' },
  librarian: { model: 'opencode-go/gpt-4.1-nano' },
  explorer: { model: 'opencode-go/gpt-4.1-nano' },
  designer: { model: 'opencode-go/gpt-4.1' },
  fixer: { model: 'opencode-go/gpt-4.1-nano' },
  observer: { model: 'opencode-go/gpt-4.1-nano' },
}

// After
'opencode-go': {
  conductor: { model: 'opencode-go/kimi-2.6' },
  principal: { model: 'opencode-go/kimi-2.6' },
  scribe: { model: 'opencode-go/gpt-4.1-nano' },
  composer: { model: 'opencode-go/gpt-4.1' },
  ensemble: { model: 'opencode-go/kimi-2.6' },  // or use reference syntax
}
```

- [ ] **Step 2: Update generateLiteConfig**

```typescript
// Before
if (agentName === 'orchestrator') { ... }

// After
if (agentName === 'conductor') { ... }
```

- [ ] **Step 3: Verify build passes**

```bash
bun run build
```

- [ ] **Step 4: Commit**

```bash
git add src/cli/providers.ts
git commit -m "feat: update model preset mappings with new agent names"
```

---

## Task 17: Update Background Job Board and Image Hook

**Files:**
- Modify: `src/utils/background-job-board.ts`
- Modify: `src/hooks/image-hook.ts`

- [ ] **Step 1: Update AGENT_PREFIX in background-job-board.ts**

```typescript
// Before
const AGENT_PREFIX: Record<string, string> = {
  council: 'cou',
  designer: 'des',
  explorer: 'exp',
  fixer: 'fix',
  librarian: 'lib',
  observer: 'obs',
  oracle: 'ora',
};

// After
const AGENT_PREFIX: Record<string, string> = {
  ensemble: 'ens',
  composer: 'com',
  scribe: 'scr',
  principal: 'pri',
  conductor: 'con',
};
```

- [ ] **Step 2: Update image-hook.ts**

Remove all references to `'observer'`. The `processImageAttachments()` function should no longer check for observer or nudge to @observer.

```typescript
// Remove: disabledAgents.has('observer') check
// Remove: @observer references in nudge text
// The function may need to be simplified or removed entirely if observer was its only purpose
```

- [ ] **Step 3: Verify build passes**

```bash
bun run build
```

- [ ] **Step 4: Commit**

```bash
git add src/utils/background-job-board.ts src/hooks/image-hook.ts
git commit -m "feat: update background job board and image hook for new agent names"
```

---

## Task 18: Update Hooks with Agent Name References

**Files:**
- Modify: `src/hooks/filter-available-skills/index.ts`
- Modify: `src/hooks/phase-reminder/index.ts`
- Modify: `src/hooks/deepwork/index.ts`

- [ ] **Step 1: Update filter-available-skills hook**

In `src/hooks/filter-available-skills/index.ts`, the fallback agent name defaults to `'orchestrator'` when no agent is found on the message:

```typescript
// Before
const agentName = getCurrentAgent(messages) ?? 'orchestrator';

// After
const agentName = getCurrentAgent(messages) ?? 'conductor';
```

- [ ] **Step 2: Update phase-reminder hook**

In `src/hooks/phase-reminder/index.ts`, the hook checks `agent !== 'orchestrator'` to decide whether to inject the phase reminder:

```typescript
// Before
if (agent !== 'orchestrator') { ... }

// After
if (agent !== 'conductor') { ... }
```

- [ ] **Step 3: Update deepwork hook**

In `src/hooks/deepwork/index.ts`, the prompt text references `@oracle`:

```typescript
// Before
'@oracle' in prompt text

// After
'@principal' in prompt text
```

- [ ] **Step 4: Verify build passes**

```bash
bun run build
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/filter-available-skills/index.ts src/hooks/phase-reminder/index.ts src/hooks/deepwork/index.ts
git commit -m "feat: update hooks with new agent names"
```

---

## Task 19: Update Tools (Council → Ensemble, Preset Manager)

**Files:**
- Rename: `src/tools/council.ts` → `src/tools/ensemble.ts`
- Modify: `src/tools/preset-manager.ts`

- [ ] **Step 1: Rename and update council tool**

```bash
mv src/tools/council.ts src/tools/ensemble.ts
```

In `src/tools/ensemble.ts`, update the agent guard:

```typescript
// Before
const allowedAgents = ['council'];

// After
const allowedAgents = ['ensemble'];
```

Also rename `createCouncilTool` → `createEnsembleTool` and update the tool description to reference ensemble instead of council.

Update the import in `src/agents/index.ts`:

```typescript
// Before
import { createEnsembleAgent } from './council.js';

// After
import { createEnsembleAgent } from './ensemble.js';
```

- [ ] **Step 2: Update preset-manager tool**

In `src/tools/preset-manager.ts`, update config file references:

```typescript
// Before
'oh-my-opencode-slim.jsonc' in hint text

// After
'trans-genderian-orchestra.jsonc' in hint text
```

Also update any `AGENT_ALIASES` usage — this will automatically use new names since we updated the aliases in Task 3.

- [ ] **Step 3: Verify build passes**

```bash
bun run build
```

- [ ] **Step 4: Commit**

```bash
git add src/tools/ensemble.ts src/tools/preset-manager.ts
git rm src/tools/council.ts
git commit -m "feat: rename council tool to ensemble, update preset manager"
```

---

## Task 20: Update Config Paths (loader.ts, cli/paths.ts, cli/config-io.ts)

**Files:**
- Modify: `src/config/loader.ts`
- Modify: `src/cli/paths.ts`
- Modify: `src/cli/config-io.ts`

- [ ] **Step 1: Update loader.ts**

In `src/config/loader.ts`:

```typescript
// Before
const PROMPTS_DIR_NAME = 'oh-my-opencode-slim';

// After
const PROMPTS_DIR_NAME = 'trans-genderian-orchestra';
```

Also update all console warning prefixes:

```typescript
// Before
console.warn('[oh-my-opencode-slim] ...')

// After
console.warn('[trans-genderian-orchestra] ...')
```

And update config file path references:

```typescript
// Before
'oh-my-opencode-slim.jsonc' / 'oh-my-opencode-slim.json'

// After
'trans-genderian-orchestra.jsonc' / 'trans-genderian-orchestra.json'
```

And update the environment variable name — accept BOTH the long form and a short alias for usability:

```typescript
// Before
const envPreset = process.env.OH_MY_OPENCODE_SLIM_PRESET;

// After (accept either form, prefer TGO_PRESET if both set)
const envPreset =
  process.env.TGO_PRESET ?? process.env.TRANS_GENDERIAN_ORCHESTRA_PRESET;
```

Note: `TGO_PRESET` is the recommended short form for users. The long form is supported for explicitness and parity with the plugin name.

- [ ] **Step 2: Update cli/paths.ts**

In `src/cli/paths.ts`, update config file name references:

```typescript
// Before
'oh-my-opencode-slim.json' / 'oh-my-opencode-slim.jsonc'

// After
'trans-genderian-orchestra.json' / 'trans-genderian-orchestra.jsonc'
```

- [ ] **Step 3: Update cli/config-io.ts**

In `src/cli/config-io.ts`, update the `PACKAGE_NAME` constant:

```typescript
// Before
const PACKAGE_NAME = 'oh-my-opencode-slim';

// After
const PACKAGE_NAME = 'trans-genderian-orchestra';
```

- [ ] **Step 4: Verify build passes**

```bash
bun run build
```

- [ ] **Step 5: Commit**

```bash
git add src/config/loader.ts src/cli/paths.ts src/cli/config-io.ts
git commit -m "feat: update config paths to trans-genderian-orchestra"
```

---

## Task 21: Implement Code-Level Review Loop Counter

**Files:**
- Create: `src/workflow/review-loop-counter.ts` (new file)
- Modify: `src/index.ts` (integrate counter into plugin)

The spec requires a **code-level** loop counter — LLMs are unreliable at tracking counts across delegations and context compactions. The counter enforces the max-3-cycles rule.

- [ ] **Step 1: Create the review loop counter**

```typescript
// src/workflow/review-loop-counter.ts

export interface ReviewLoopState {
  taskKey: string;
  loopCount: number;
  lastEnsembleVerdict?: 'approve' | 'reject';
  lastPrincipalVerdict?: 'approve' | 'reject';
  wheelsSpinning: boolean;
}

const reviewLoops = new Map<string, ReviewLoopState>();

const MAX_LOOPS = 3;

/**
 * Records a review loop iteration for a given task.
 * Returns the current state including whether the loop has exceeded max cycles.
 */
export function recordReviewIteration(taskKey: string): ReviewLoopState {
  const existing = reviewLoops.get(taskKey);
  if (existing) {
    existing.loopCount += 1;
    existing.wheelsSpinning = existing.loopCount >= MAX_LOOPS;
    return existing;
  }

  const state: ReviewLoopState = {
    taskKey,
    loopCount: 1,
    wheelsSpinning: false,
  };
  reviewLoops.set(taskKey, state);
  return state;
}

/**
 * Records the ensemble verdict for the current loop.
 */
export function recordEnsembleVerdict(
  taskKey: string,
  verdict: 'approve' | 'reject',
): void {
  const state = reviewLoops.get(taskKey);
  if (state) {
    state.lastEnsembleVerdict = verdict;
  }
}

/**
 * Records the principal verdict for the current loop.
 */
export function recordPrincipalVerdict(
  taskKey: string,
  verdict: 'approve' | 'reject',
): void {
  const state = reviewLoops.get(taskKey);
  if (state) {
    state.lastPrincipalVerdict = verdict;
  }
}

/**
 * Gets the current review loop state for a task.
 */
export function getReviewLoopState(taskKey: string): ReviewLoopState | undefined {
  return reviewLoops.get(taskKey);
}

/**
 * Clears the review loop state for a task (when complete).
 */
export function clearReviewLoop(taskKey: string): void {
  reviewLoops.delete(taskKey);
}

/**
 * Resets all review loop state (for testing).
 */
export function resetAllReviewLoops(): void {
  reviewLoops.clear();
}
```

- [ ] **Step 2: Add tests for the review loop counter**

```typescript
// src/workflow/review-loop-counter.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import {
  recordReviewIteration,
  recordEnsembleVerdict,
  recordPrincipalVerdict,
  getReviewLoopState,
  clearReviewLoop,
  resetAllReviewLoops,
} from './review-loop-counter.js';

describe('reviewLoopCounter', () => {
  beforeEach(() => {
    resetAllReviewLoops();
  });

  it('starts at loop count 1', () => {
    const state = recordReviewIteration('task-1');
    expect(state.loopCount).toBe(1);
    expect(state.wheelsSpinning).toBe(false);
  });

  it('increments loop count on subsequent calls', () => {
    recordReviewIteration('task-1');
    recordReviewIteration('task-1');
    const state = recordReviewIteration('task-1');
    expect(state.loopCount).toBe(3);
  });

  it('sets wheelsSpinning at max loops (3)', () => {
    recordReviewIteration('task-1');
    recordReviewIteration('task-1');
    const state = recordReviewIteration('task-1');
    expect(state.wheelsSpinning).toBe(true);
  });

  it('does not set wheelsSpinning before max loops', () => {
    recordReviewIteration('task-1');
    const state = recordReviewIteration('task-1');
    expect(state.wheelsSpinning).toBe(false);
  });

  it('tracks ensemble verdict', () => {
    recordReviewIteration('task-1');
    recordEnsembleVerdict('task-1', 'reject');
    const state = getReviewLoopState('task-1');
    expect(state?.lastEnsembleVerdict).toBe('reject');
  });

  it('tracks principal verdict', () => {
    recordReviewIteration('task-1');
    recordPrincipalVerdict('task-1', 'approve');
    const state = getReviewLoopState('task-1');
    expect(state?.lastPrincipalVerdict).toBe('approve');
  });

  it('clears state for a task', () => {
    recordReviewIteration('task-1');
    clearReviewLoop('task-1');
    expect(getReviewLoopState('task-1')).toBeUndefined();
  });

  it('tracks independent tasks separately', () => {
    recordReviewIteration('task-1');
    recordReviewIteration('task-1');
    recordReviewIteration('task-2');
    expect(getReviewLoopState('task-1')?.loopCount).toBe(2);
    expect(getReviewLoopState('task-2')?.loopCount).toBe(1);
  });
});
```

- [ ] **Step 3: Integrate into the plugin**

In `src/index.ts`, expose the review loop counter functions so they can be used by the conductor's prompt injection or a hook. The simplest approach: add a hook that injects the current loop count into the conductor's context when it's about to delegate to ensemble.

- [ ] **Step 4: Verify build and tests pass**

```bash
bun run build
bun test src/workflow/review-loop-counter.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/workflow/review-loop-counter.ts src/workflow/review-loop-counter.test.ts src/index.ts
git commit -m "feat: implement code-level review loop counter"
```

---

## Task 22: Implement Ensemble Model Auto-Population

**Files:**
- Create or modify: `src/config/model-references.ts` (new file)
- Modify: `src/config/loader.ts` (add reference resolution call)

- [ ] **Step 1: Create model reference resolution function**

```typescript
// src/config/model-references.ts
import type { AgentName } from './constants.js';

/**
 * Resolves model references in the model map.
 * A reference is a value that matches another agent name (case-insensitive)
 * AND does not contain a '/' (model IDs always have a provider prefix).
 * E.g., "ensemble: conductor" → resolves to conductor's model.
 * Max depth: 3 to prevent cycles.
 */
export function resolveModelReferences(
  modelMap: Partial<Record<AgentName, string>>,
  maxDepth = 3,
): Partial<Record<AgentName, string>> {
  const resolved = { ...modelMap };
  const agentNames = new Set(Object.keys(modelMap).map(k => k.toLowerCase()));

  function isReference(value: string): boolean {
    // Model IDs always contain a '/' (e.g., 'openai/gpt-4.1')
    // Agent names never contain '/' (e.g., 'conductor')
    return agentNames.has(value.toLowerCase()) && !value.includes('/');
  }

  for (let depth = 0; depth < maxDepth; depth++) {
    let changed = false;
    for (const [agent, model] of Object.entries(resolved)) {
      if (model && isReference(model) && model.toLowerCase() !== agent.toLowerCase()) {
        const referencedModel = resolved[model.toLowerCase() as AgentName];
        if (referencedModel && !isReference(referencedModel)) {
          resolved[agent as AgentName] = referencedModel;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  return resolved;
}
```

- [ ] **Step 2: Integrate into config loading**

In `src/config/loader.ts`, after loading the model preset config, call `resolveModelReferences()` before applying models to agents.

- [ ] **Step 3: Add tests for reference resolution**

```typescript
// src/config/model-references.test.ts
import { describe, it, expect } from 'bun:test';
import { resolveModelReferences } from './model-references.js';

describe('resolveModelReferences', () => {
  it('resolves direct references', () => {
    const input = {
      conductor: 'opencode-go/kimi-2.6',
      ensemble: 'conductor',
    };
    const result = resolveModelReferences(input);
    expect(result.ensemble).toBe('opencode-go/kimi-2.6');
  });

  it('resolves transitive references (max depth 3)', () => {
    const input = {
      conductor: 'opencode-go/kimi-2.6',
      ensemble: 'conductor',
      councillor: 'ensemble',
    };
    const result = resolveModelReferences(input);
    expect(result.councillor).toBe('opencode-go/kimi-2.6');
  });

  it('does not resolve self-references', () => {
    const input = {
      conductor: 'conductor',
    };
    const result = resolveModelReferences(input);
    expect(result.conductor).toBe('conductor');
  });

  it('handles circular references without infinite loop', () => {
    const input = {
      a: 'b',
      b: 'a',
    };
    const result = resolveModelReferences(input);
    // Should not hang — max depth prevents infinite loop
    expect(result).toBeDefined();
  });

  it('does not treat model IDs as references', () => {
    const input = {
      conductor: 'openai/gpt-5.5',
      ensemble: 'openai/gpt-5.5',  // same model, but not a reference
    };
    const result = resolveModelReferences(input);
    expect(result.ensemble).toBe('openai/gpt-5.5');  // unchanged
  });
});
```

- [ ] **Step 4: Verify build and tests pass**

```bash
bun run build
bun test src/config/model-references.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/config/model-references.ts src/config/model-references.test.ts src/config/loader.ts
git commit -m "feat: implement ensemble model auto-population with reference resolution"
```

---

## Task 23: Regenerate JSON Schema

**Files:**
- Rename: `oh-my-opencode-slim.schema.json` → `trans-genderian-orchestra.schema.json`
- Modify: `package.json` (any schema path references)

- [ ] **Step 1: Rename the schema file**

```bash
git mv oh-my-opencode-slim.schema.json trans-genderian-orchestra.schema.json
```

- [ ] **Step 2: Update the `$id` field inside the schema**

Open `trans-genderian-orchestra.schema.json` and update the top-level `$id` URI if present:

```json
{
  "$id": "https://raw.githubusercontent.com/anomalyco/trans-genderian-orchestra/main/trans-genderian-orchestra.schema.json",
  "$schema": "http://json-schema.org/draft-07/schema#",
  ...
}
```

Also update the `title` and `description` fields to reference TGO v3.

- [ ] **Step 3: Update all agent name references in the schema**

Replace:
- `orchestrator` → `conductor`
- `oracle` → `principal`
- `designer` → `composer`
- `explorer` → `scribe`
- `council` → `ensemble`
- Remove `librarian`, `fixer`, `observer` entries entirely

The schema file is a JSON file — update all `manualPlan` and `fallback.chains` properties (and any other agent-keyed objects) to use new agent names.

- [ ] **Step 4: Update package.json to reference new schema**

If `package.json` references the schema file in `files`, `exports`, or any other field, update the path:

```bash
grep -n "schema.json" package.json
```

If matches exist, update to `trans-genderian-orchestra.schema.json`.

- [ ] **Step 5: Update any other files that reference the schema**

```bash
grep -rn "oh-my-opencode-slim.schema.json" .
```

Update any matches found in README, docs, or config files.

- [ ] **Step 6: Commit**

```bash
git add trans-genderian-orchestra.schema.json package.json
git commit -m "feat: rename and regenerate JSON schema for TGO v3"
```

---

## Task 24: Remove Divoom Integration

**Files:**
- Delete: `src/divoom/` (entire directory, including all .gif files and manager.ts, manager.test.ts)
- Modify: `src/index.ts` (remove Divoom plugin wiring)
- Modify: `src/config/schema.ts` (remove `divoom` field if present)

The Divoom hardware pixel-display integration is not used and is being removed entirely.

- [ ] **Step 1: Delete the Divoom directory**

```bash
git rm -rf src/divoom
```

This removes manager.ts, manager.test.ts, and all 9 .gif files (council.gif, councillor.gif, designer.gif, explorer.gif, fixer.gif, input.gif, intro.gif, librarian.gif, oracle.gif, orchestrator.gif).

- [ ] **Step 2: Remove Divoom wiring from src/index.ts**

```bash
grep -n "divoom\|Divoom\|DIVOOM" src/index.ts
```

Remove all matching lines, including:
- Import statements for the Divoom manager
- Calls to instantiate or invoke the Divoom manager
- Hook registrations that route to Divoom
- Environment variable references (`OH_MY_OPENCODE_SLIM_DIVOOM`)

- [ ] **Step 3: Remove Divoom field from config schema**

In `src/config/schema.ts`, search for and remove any `divoom` field:

```bash
grep -n "divoom\|DivoomConfig" src/config/schema.ts
```

If present, remove the field from `PluginConfigSchema` and any related type definitions.

- [ ] **Step 4: Remove Divoom references from loader.ts merge logic**

```bash
grep -n "divoom" src/config/loader.ts
```

If `mergePluginConfigs()` has a `divoom: deepMerge(base.divoom, override.divoom)` line, remove it.

- [ ] **Step 5: Verify no remaining Divoom references**

```bash
grep -rn "divoom\|Divoom\|DIVOOM" src/ package.json
```

Expected: No matches. If any remain, address them.

- [ ] **Step 6: Verify build passes**

```bash
bun run build
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: remove Divoom hardware display integration"
```

---

## Task 25: Update Task Session Manager Hook (CRITICAL)

**Files:**
- Modify: `src/hooks/task-session-manager/index.ts`

This 800+ line hook is the central task delegation tracker. It validates `subagent_type` against a hardcoded set of agent names. If not updated, ALL delegations to conductor/scribe/composer/principal/ensemble will silently fail validation.

- [ ] **Step 1: Update AGENT_NAME_SET**

Find the hardcoded set near the top of the file:

```typescript
// Before
const AGENT_NAME_SET = new Set<AgentName>([
  'orchestrator', 'oracle', 'designer', 'explorer',
  'librarian', 'fixer', 'observer', 'council', 'councillor',
]);

// After
const AGENT_NAME_SET = new Set<AgentName>([
  'conductor', 'principal', 'composer', 'scribe',
  'ensemble', 'councillor',
]);
```

Better: import from constants so this stays in sync automatically:

```typescript
// Best
import { ALL_AGENT_NAMES } from '../../config/constants';
const AGENT_NAME_SET = new Set<AgentName>(ALL_AGENT_NAMES);
```

Prefer the import approach unless there's a reason this set should diverge from `ALL_AGENT_NAMES`.

- [ ] **Step 2: Update routing check**

```typescript
// Before
if (message.info.agent && message.info.agent !== 'orchestrator') {
  continue;
}

// After
if (message.info.agent && message.info.agent !== 'conductor') {
  continue;
}
```

- [ ] **Step 3: Sweep for any remaining old agent name references in this file**

```bash
grep -n "orchestrator\|explorer\|librarian\|oracle\|designer\|fixer\|observer\|'council'" src/hooks/task-session-manager/index.ts | grep -v "councillor"
```

Expected: No matches (all should be updated). Address any remaining.

- [ ] **Step 4: Verify build passes**

```bash
bun run build
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/task-session-manager/index.ts
git commit -m "feat: update task-session-manager with new agent names (CRITICAL)"
```

---

## Task 26: Update Council Manager Import Path

**Files:**
- Modify: `src/council/council-manager.ts`

This file imports `formatCouncillorPrompt` and `formatCouncillorResults` from `../agents/council` — but we renamed that file to `../agents/ensemble` in Task 10.

- [ ] **Step 1: Update import path**

```typescript
// Before
import {
  formatCouncillorPrompt,
  formatCouncillorResults,
} from '../agents/council';

// After
import {
  formatCouncillorPrompt,
  formatCouncillorResults,
} from '../agents/ensemble';
```

- [ ] **Step 2: Verify the hardcoded `agent: 'councillor'` reference is unchanged**

The councillor agent name is unchanged in TGO v3. Verify this line stays as-is:

```typescript
const result = await this.runAgentSession({
  ...
  agent: 'councillor',  // unchanged — councillor is still the internal name
  ...
});
```

- [ ] **Step 3: Sweep for any other old refs**

```bash
grep -n "orchestrator\|explorer\|librarian\|oracle\|designer\|fixer\|observer\|'council'" src/council/council-manager.ts | grep -v "councillor"
```

Expected: No matches. Address any found.

- [ ] **Step 4: Verify build passes**

```bash
bun run build
```

- [ ] **Step 5: Commit**

```bash
git add src/council/council-manager.ts
git commit -m "feat: update council-manager import path for ensemble rename"
```

---

## Task 27: Update Auto-Update Checker

**Files:**
- Modify: `src/hooks/auto-update-checker/constants.ts`
- Modify: `src/hooks/auto-update-checker/index.ts`

The auto-update checker uses the npm package name to check for updates and shows toast notifications with the brand display name.

- [ ] **Step 1: Update PACKAGE_NAME constant**

In `src/hooks/auto-update-checker/constants.ts`:

```typescript
// Before
export const PACKAGE_NAME = 'oh-my-opencode-slim';

// After
export const PACKAGE_NAME = 'trans-genderian-orchestra';
```

The `NPM_REGISTRY_URL` derived from this constant will automatically update.

- [ ] **Step 2: Update toast notification display strings**

In `src/hooks/auto-update-checker/index.ts`, find all 5 `OMO-Slim` display strings:

```bash
grep -n "OMO-Slim" src/hooks/auto-update-checker/index.ts
```

Replace each with `TGO` (short) or `Trans-Genderian-Orchestra` (long). Recommended:

```typescript
// Before
showToast(ctx, `OMO-Slim ${latestVersion}`, `v${latestVersion} available...`, 'info', 8000);
showToast(ctx, 'OMO-Slim Updated!', ..., 'success', 8000);

// After
showToast(ctx, `TGO ${latestVersion}`, `v${latestVersion} available...`, 'info', 8000);
showToast(ctx, 'TGO Updated!', ..., 'success', 8000);
```

- [ ] **Step 3: Verify build passes**

```bash
bun run build
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/auto-update-checker/
git commit -m "feat: update auto-update-checker with new package name and branding"
```

---

## Task 28: Update TUI (tui.ts and tui-state.ts)

**Files:**
- Modify: `src/tui.ts`
- Modify: `src/tui-state.ts`

The TUI sidebar displays the plugin name and uses a state directory named after the plugin.

- [ ] **Step 1: Update tui.ts PLUGIN_NAME**

```typescript
// Before
const PLUGIN_NAME = 'oh-my-opencode-slim';

// After
const PLUGIN_NAME = 'trans-genderian-orchestra';
```

- [ ] **Step 2: Update tui.ts display label**

Find the `'OMO-Slim'` text rendered in the sidebar:

```typescript
// Before
box(...[text({ fg: theme.background }, ['OMO-Slim'])]);

// After
box(...[text({ fg: theme.background }, ['TGO'])]);
```

- [ ] **Step 3: Update tui.ts FALLBACK_SIDEBAR_AGENTS filter**

```typescript
// Before
const FALLBACK_SIDEBAR_AGENTS = SUBAGENT_NAMES.filter(
  (agent) => agent !== 'councillor' && agent !== 'council' && !DEFAULT_DISABLED_AGENTS.includes(agent),
);

// After
const FALLBACK_SIDEBAR_AGENTS = SUBAGENT_NAMES.filter(
  (agent) => agent !== 'councillor' && agent !== 'ensemble' && !DEFAULT_DISABLED_AGENTS.includes(agent),
);
```

Note: `ensemble` is filtered out because it should appear as a primary agent option, not in the sidebar (matching omo-slim's original treatment of `council`).

- [ ] **Step 4: Update tui-state.ts STATE_DIR**

```typescript
// Before
const STATE_DIR = 'oh-my-opencode-slim';

// After
const STATE_DIR = 'trans-genderian-orchestra';
```

Note: This changes the state file location from `$XDG_DATA_HOME/opencode/storage/oh-my-opencode-slim/tui-state.json` to `.../trans-genderian-orchestra/tui-state.json`. Existing TGO v2 state files at this new path will be picked up if present.

- [ ] **Step 5: Sweep for remaining identity references**

```bash
grep -n "oh-my-opencode-slim\|OMO-Slim" src/tui.ts src/tui-state.ts
```

Expected: No matches. Address any found.

- [ ] **Step 6: Verify build passes**

```bash
bun run build
```

- [ ] **Step 7: Commit**

```bash
git add src/tui.ts src/tui-state.ts
git commit -m "feat: update TUI plugin name, label, and state directory"
```

---

## Task 29: Update Interview UI Branding

**Files:**
- Modify: `src/interview/ui.ts`

The interview dashboard web UI displays the plugin's brand name and loads a logo image from the old plugin's domain.

- [ ] **Step 1: Update BRAND_LOGO_URL**

```typescript
// Before
const BRAND_LOGO_URL = 'https://ohmyopencodeslim.com/android-chrome-512x512.png';

// After (use a TGO-owned URL, or an empty string to hide the logo)
const BRAND_LOGO_URL = '';
```

If we don't have a hosted TGO logo, set to empty string. The `brandImage()` function should be updated to return an empty string when the URL is empty (Step 2).

- [ ] **Step 2: Update brandImage() function**

```typescript
// Before
function brandImage(size: number): string {
  return `<img class="brand-mark" src="${BRAND_LOGO_URL}" alt="Oh My Opencode Slim" width="${size}" height="${size}" />`;
}

// After
function brandImage(size: number): string {
  if (!BRAND_LOGO_URL) return '';
  return `<img class="brand-mark" src="${BRAND_LOGO_URL}" alt="Trans-Genderian Orchestra" width="${size}" height="${size}" />`;
}
```

- [ ] **Step 3: Update footer display text**

Find both occurrences of `OH MY OPENCODE SLIM`:

```bash
grep -n "OH MY OPENCODE SLIM" src/interview/ui.ts
```

Replace with `TRANS-GENDERIAN ORCHESTRA` (or just `TGO`):

```html
<!-- Before -->
<div class="footer">OH MY OPENCODE SLIM</div>
<span>OH MY OPENCODE SLIM</span>

<!-- After -->
<div class="footer">TRANS-GENDERIAN ORCHESTRA</div>
<span>TRANS-GENDERIAN ORCHESTRA</span>
```

- [ ] **Step 4: Sweep for remaining identity references**

```bash
grep -n "oh-my-opencode-slim\|OMO-Slim\|OH MY OPENCODE SLIM\|ohmyopencodeslim" src/interview/ui.ts
```

Expected: No matches.

- [ ] **Step 5: Verify build passes**

```bash
bun run build
```

- [ ] **Step 6: Commit**

```bash
git add src/interview/ui.ts
git commit -m "feat: update interview UI branding to TGO v3"
```

---

## Task 30: Update Multiplexer Shared State Symbol Key

**Files:**
- Modify: `src/multiplexer/session-manager.ts`

The multiplexer uses a global `Symbol.for()` key for cross-instance shared state. The key string contains the old plugin name.

- [ ] **Step 1: Update SHARED_STATE_KEY**

```typescript
// Before
const SHARED_STATE_KEY = Symbol.for(
  'oh-my-opencode-slim.multiplexer-session-manager.state',
);

// After
const SHARED_STATE_KEY = Symbol.for(
  'trans-genderian-orchestra.multiplexer-session-manager.state',
);
```

- [ ] **Step 2: Verify build passes**

```bash
bun run build
```

- [ ] **Step 3: Commit**

```bash
git add src/multiplexer/session-manager.ts
git commit -m "feat: update multiplexer shared state symbol key"
```

---

## Task 31: Update Tests

**Files:**
- Modify: Various test files

- [ ] **Step 1: Find all test files referencing old agent names**

```bash
grep -r "orchestrator\|explorer\|librarian\|oracle\|designer\|fixer\|observer\|council" --include="*.test.ts" --include="*.spec.ts" src/
```

- [ ] **Step 2: Update each test file**

Replace old agent names with new names in test data, assertions, and mocks:
- `orchestrator` → `conductor`
- `explorer` → `scribe`
- `oracle` → `principal`
- `designer` → `composer`
- `council` → `ensemble`
- Remove references to `librarian`, `fixer`, `observer`

- [ ] **Step 3: Run all tests**

```bash
bun test
```

Expected: All tests pass. If any fail, fix the test data or assertions.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: update test files with new agent names"
```

---

## Task 32: Update Documentation

**Files:**
- Modify: `docs/README.md`
- Modify: `docs/agents-and-workflows.md`
- Modify: `docs/architecture.md`
- Modify: `docs/migration-and-release.md`
- Modify: `docs/models-resilience-council.md`
- Modify: `docs/setup-doctor-manifests.md`
- Modify: `docs/tools-skills-mcps.md`

- [ ] **Step 1: Update agent name references in all docs files**

Replace all references to old agent names with new names:
- `orchestrator` → `conductor`
- `explorer` → `scribe`
- `oracle` → `principal`
- `designer` → `composer`
- `council` → `ensemble`
- `librarian` → removed (merged into scribe)
- `fixer` → removed (merged into composer)
- `observer` → removed

Also update:
- Plugin name references from `oh-my-opencode-slim` to `trans-genderian-orchestra`
- Config file path references
- Any workflow descriptions that reference the old agent roster

- [ ] **Step 2: Commit**

```bash
git add docs/
git commit -m "docs: update agent names and plugin references for v3"
```

---

## Task 33: Run All Verification Commands

- [ ] **Step 1: Type check**

```bash
bun run typecheck
```

Expected: No type errors.

- [ ] **Step 2: Lint**

```bash
bun run lint
```

Expected: No lint errors.

- [ ] **Step 3: Format**

```bash
bun run format
```

Expected: All files formatted.

- [ ] **Step 4: Full test suite**

```bash
bun test
```

Expected: All tests pass.

- [ ] **Step 5: Build**

```bash
bun run build
```

Expected: Build succeeds.

- [ ] **Step 6: CI checks**

```bash
bun run check:ci
```

Expected: All CI checks pass.

- [ ] **Step 7: Identity sweep — verify no stale plugin name references**

```bash
rg -n "oh-my-opencode-slim|OMO-Slim|OH MY OPENCODE SLIM|ohmyopencodeslim\.com|OH_MY_OPENCODE_SLIM" src/ package.json oh-my-opencode-slim.schema.json 2>/dev/null
```

Expected: No matches in source or top-level config files (the schema file should have been renamed by Task 23 — its old path should not exist).

Allowed exceptions:
- Comment-only references in `src/hooks/foreground-fallback/index.ts` (historical note, not functional)
- Any vendored omo-slim source under `archive/` if it exists (legacy reference only)

If matches appear in functional code paths, address them before proceeding.

- [ ] **Step 8: Agent name sweep — verify no old agent names in functional code**

```bash
rg -n "\\b(orchestrator|explorer|librarian|oracle|designer|fixer|observer)\\b" src/ --type ts | grep -v "councillor"
```

Expected: No matches in functional code. Allowed exceptions:
- Comments referencing the omo-slim heritage (e.g., "// originally `orchestrator` in omo-slim")
- Migration documentation
- Test fixtures explicitly testing the rename mapping

If matches appear in active code, address them.

- [ ] **Step 9: Verify Divoom is fully removed**

```bash
test ! -d src/divoom && rg -n "divoom|Divoom|DIVOOM" src/ package.json 2>/dev/null
```

Expected: `src/divoom/` does not exist, and no Divoom references remain anywhere.

- [ ] **Step 10: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix lint/format/type issues from agent rename"
```

---

## Task 34: Integration Test — Manual Verification

- [ ] **Step 1: Install the plugin locally**

```bash
bun run build
# Link or install the plugin to test with OpenCode
```

- [ ] **Step 2: Verify all 5 agents respond**

In OpenCode, run:
```
@conductor ping
@scribe ping
@composer ping
@principal ping
@ensemble ping
```

Expected: All 5 agents respond. No "agent not found" errors.

- [ ] **Step 3: Verify delegation works (CRITICAL for task-session-manager)**

Ask conductor to delegate a simple task:
```
@conductor Ask @scribe to find the package.json file and tell me the version
```

Expected: Conductor delegates to scribe via the task tool, scribe finds and reports the version. If task-session-manager's AGENT_NAME_SET wasn't updated correctly (Task 25), this will silently fail with no error visible to the user — watch for the delegation NOT happening even though conductor claims it did.

- [ ] **Step 4: Verify review loop**

Ask composer to make a simple change, then verify ensemble and principal are invoked:
```
@composer Add a comment to the top of src/index.ts saying "TGO v3 plugin entry"
```

Expected: Composer makes the change. If review loop is triggered, ensemble runs 3 reviewers, then principal does final gate.

- [ ] **Step 5: Verify ensemble model auto-population**

Check that ensemble's model resolves correctly from the conductor's model assignment. Confirm in your config that `"ensemble": "conductor"` (or similar reference syntax) is resolving as expected.

- [ ] **Step 6: Verify council session works (validates council-manager import fix from Task 26)**

Trigger a council session and confirm councillors run in parallel:
```
@ensemble What should the default model for the conductor be?
```

Expected: Ensemble dispatches multiple councillors. If Task 26's import path update was missed, this will fail with an import error.

- [ ] **Step 7: Verify TUI branding updated**

Launch OpenCode with the TUI sidebar visible. Confirm:
- The sidebar label shows "TGO" (or whichever branding was chosen in Task 28), NOT "OMO-Slim"
- The agent list shows conductor, scribe, composer, principal — NOT old names
- No `council` entry appears in the sidebar (filtered out via FALLBACK_SIDEBAR_AGENTS)

- [ ] **Step 8: Verify interview UI branding (if interview feature is exercised)**

If running the interview dashboard, verify the footer shows "TRANS-GENDERIAN ORCHESTRA" (or chosen branding from Task 29), NOT "OH MY OPENCODE SLIM".

- [ ] **Step 9: Verify state directory**

Confirm the TUI state file is written to the new location:

```bash
ls -la "$XDG_DATA_HOME/opencode/storage/trans-genderian-orchestra/" 2>/dev/null || ls -la "$HOME/.local/share/opencode/storage/trans-genderian-orchestra/"
```

Expected: `tui-state.json` exists in the new path. Old path (`.../oh-my-opencode-slim/`) should NOT contain new state.

- [ ] **Step 10: Verify no old agent names leak in user-facing output**

Search the OpenCode session output for any mention of `orchestrator`, `explorer`, `librarian`, `oracle`, `designer`, `fixer`, or `observer`. There should be none in user-visible text.

- [ ] **Step 11: Document any issues found**

Create issues for any problems discovered during integration testing.

---

## Appendix: Full Agent Name Mapping Reference

| omo-slim Name | TGO v3 Name | Status | MCPs | Skills | File Ops |
|---------------|-------------|--------|------|--------|----------|
| `orchestrator` | `conductor` | Renamed | `['*', '!context7']` | codemap, clonedeps, deepwork, tgo | Prompt-level |
| `explorer` | `scribe` | Renamed (absorbs librarian) | `['websearch', 'context7', 'grep_app']` | None | READONLY |
| `oracle` | `principal` | Renamed (absorbs reviewer) | `[]` | simplify, requesting-code-review | READONLY |
| `designer` | `composer` | Renamed (absorbs fixer) | `[]` | None | WRITABLE |
| `council` | `ensemble` | Renamed | `[]` | None | Prompt-level |
| `councillor` | `councillor` | Unchanged | `[]` | None | Hardcoded deny-all |
| `librarian` | — | Deleted (→ scribe) | — | — | — |
| `fixer` | — | Deleted (→ composer) | — | — | — |
| `observer` | — | Deleted | — | — | — |
