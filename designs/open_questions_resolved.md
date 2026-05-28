# Open Questions Resolved — Parallelization, Configuration Inheritance & Startup Initialization

This document details the concrete, production-ready designs for the remaining open questions in the **"Dispatcher"** (pure-delegation fork of `oh-my-opencode-slim`) framework.

---

## 1. Parallelization Model for v2 (Git Worktrees & Merger)

Parallelizing agent execution enables concurrent research and independent implementation tasks. To ensure safety, prevent file locking, and avoid merge conflicts, we adopt a robust **Git Worktree Isolation** model inspired by `mattpocock/sandcastle`.

```
                  ┌─────────────────────────────────┐
                  │   Orchestrator (Dispatcher)     │
                  └───────────────┬─────────────────┘
                                  │
                   (Spawns Parallel Subtasks)
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
┌─────────────────────────────────┐               ┌─────────────────────────────────┐
│     Git Worktree A (Task 1)     │               │     Git Worktree B (Task 2)     │
│ • Branch: dispatcher/task-001   │               │ • Branch: dispatcher/task-002   │
│ • Sandbox: Mounts Worktree A    │               │ • Sandbox: Mounts Worktree B    │
│ • Executor: Builder A           │               │ • Executor: Builder B           │
└────────────────┬────────────────┘               └────────────────┬────────────────┘
                 │                                                 │
                 ▼                                                 ▼
┌─────────────────────────────────┐               ┌─────────────────────────────────┐
│     Reviewer Verification       │               │     Reviewer Verification       │
│ • Runs checks inside Worktree A │               │ • Runs checks inside Worktree B │
└────────────────┬────────────────┘               └────────────────┬────────────────┘
                 │                                                 │
                 └────────────────────────┬────────────────────────┘
                                          │
                                (Approved & Merged)
                                          ▼
                         ┌─────────────────────────────────┐
                         │   Main Working Directory        │
                         │ • Auto Git Merge / Rebase       │
                         │ • Conflict? Reviewer Advisory   │
                         │ • Clean up & Prune Worktrees    │
                         └─────────────────────────────────┘
```

### 1.1 Git Worktree Isolation Workflow
When the Orchestrator determines that two tasks in the `plan.md` can be executed concurrently (declared independent by the Planner), it initiates parallel branches:

> **Heuristic Gate:** Only parallelize when the Planner declares tasks independent AND estimated work exceeds 5 minutes each. Otherwise execute tasks serially — the disk + warm-up cost of worktree creation can exceed the wall-clock benefit for short tasks.

1. **Branch & Worktree Creation**:
   For each parallel task, the Orchestrator runs:
   ```bash
   git worktree add -b "dispatcher/task-<id>" ".opencode/worktrees/task-<id>" HEAD
   ```
   This creates an isolated folder structure containing a clean checkout of the current HEAD.

   To prevent parent worktree git status from tracking nested checkouts, add `.opencode/worktrees/` to the repository's .gitignore (or configure core.excludesFile globally). Alternatively, worktrees can be placed outside the repo at `../.opencode-worktrees/` — the path is configurable via the WORKTREE_DIR environment variable.

2. **Isolated Session Spawning**:
   The Orchestrator spawns the `builder` or `researcher` subagent inside a container/sandbox that has `.opencode/worktrees/task-<id>` bind-mounted as its working directory.
   - Files changed in Worktree A do not impact Worktree B or the user's main workspace.
   - Eliminates read/write races on compiler/linter lock files (e.g. `node_modules/.cache`, `target/`, `.svelte-kit/`).

3. **In-Worktree Reviewer Verification**:
   When the specialist claims completion, the **Reviewer** (in Verification Mode) is spun up inside the exact same worktree directory.
   - It compiles, runs unit tests, and validates LSP diagnostics against the worktree changes.
   - Ensures the branch is "compile-clean" and verified before attempting integration.

### 1.2 The Merger & Reconciler Protocol
Once the Reviewer approves a branch, it transitions to the **Merger** loop:

```typescript
export async function mergeSubtaskBranch(
  client: OpencodeClient,
  taskId: string,
  mainRepoPath: string
): Promise<{ success: boolean; conflictFiles?: string[] }> {
  const branchName = `dispatcher/task-${taskId}`;
  const worktreePath = `.opencode/worktrees/task-${taskId}`;

  try {
    // 1. Determine base branch from HEAD symbolic ref, then fetch latest
    const baseBranch = process.env.DISPATCHER_BASE_BRANCH ?? "main";
    await execGit(["checkout", baseBranch], mainRepoPath);
    await execGit(["pull", "origin", baseBranch], mainRepoPath).catch(() => {});

    // 2. Perform the merge operation
    const mergeResult = await execGit(["merge", "--no-ff", branchName], mainRepoPath);
    
    // 3. Clean up the worktree on success
    await execGit(["worktree", "remove", "--force", worktreePath], mainRepoPath);
    await execGit(["branch", "-d", branchName], mainRepoPath);

    return { success: true };

  } catch (err) {
    // 4. Handle merge conflict
    const conflictFiles = await getConflictFiles(mainRepoPath);
    
    // Abort the ongoing merge to restore safety
    await execGit(["merge", "--abort"], mainRepoPath);

    return { success: false, conflictFiles };
  }
}
```

If a conflict is detected:
1. The Orchestrator delegates the conflicted files to the **Reviewer** in **Advisory Mode**.
2. The Reviewer provides a strategic integration plan or a resolved patch file.
3. If trivial, the Reviewer applies the patch directly. If complex, the Orchestrator escalates to the **User** with a highly structured diff comparison, prompting for manual resolution.

Merger integration behavior is controlled by configuration:

```typescript
merge_strategy: z.enum(["merge_to_base", "pull_request"]).default("merge_to_base")
```

- `"merge_to_base"`: Merges completed work directly into the base branch via `git merge --no-ff`. Best for orchestrator-only repos where all work is agent-generated and reviewed before merge. DEFAULT.
- `"pull_request"`: Pushes completed work to a feature branch and creates a GitHub PR for human review before merging to base. Recommended for production repos with human-in-the-loop requirements.

The merger prompts the user at session start for which strategy to use, defaulting to the configured value.

---

## 2. AGENTS.md Global vs Per-Project Inheritance Architecture

To ensure the framework remains lightweight, deterministic, and easily customizable, the configuration of agents, skills, and tools is driven by a hierarchical **Cascading AGENTS.md** protocol.

```
┌─────────────────────────────────────────┐
│   Global AGENTS.md (~/.config/...)       │
│ - Base model mappings (gpt-4o, claude)  │
│ - Global disallowed tools (write/edit)  │
│ - Standard preloaded skills             │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│   Local AGENTS.md (Project Root)        │
│ - Project specific overrides            │
│ - Custom MCP configs (database, api)    │
│ - Disabled skills                       │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│     Zod-Merged Dynamic Runtime Config   │
│ - Strict Agent Permissions              │
│ - Tailored Skill/MCP Allowlist          │
└─────────────────────────────────────────┘
```

### 2.1 The Cascading Parser & Compiler
At session initialization, the Dispatcher reads configuration from three sources:
- **Global**: `~/.config/dispatcher/AGENTS.md` (stores user-wide preferences and model provider assignments).
- **Config file**: `.opencode/dispatcher.config.jsonc` (stores machine-readable model config, timeouts, presets — see cluster2_content_design.md §9).
- **Local**: `./AGENTS.md` (stores repository-specific details, project goals, and overrides).

The parser converts the Markdown headers and tables into a structured JSON configuration using the following merging logic:

1. **Agent Definitions**: Local settings fully override Global settings for specified agents (e.g. if a local AGENTS.md modifies the Builder's allowed tools list, the local list replaces the global default).
2. **Skill Registration**: 
   - Global skills and Local skills are combined.
   - Duplicate skills are deduplicated.
   - If a Local AGENTS.md declares a skill as disabled (e.g. `- [x] disable_skill: playwright`), it is stripped from the active runtime pool.
3. **MCP Servers**: Local server configurations (e.g. local databases, specific ports) are merged into the global active list.

### 2.2 Zod-Backed Configurations
The parsed markdown results are compiled into a validated JSON structure:

```typescript
import { z } from 'zod';

export const AgentConfigSchema = z.object({
  role: z.string(),
  // Unified tool permissions. Includes system tools, MCP tools, and AFT tools.
  // Wildcard "*" allows all non-forbidden tools.
  allowed_tools: z.array(z.string()).describe(
    "List of permitted tools. Standard AFT tools (e.g. read, glob, aft_outline) must be explicitly listed here or matched by '*'."
  ),
  forbidden_tools: z.array(z.string()).describe(
    "List of prohibited tools. Takes absolute precedence over allowed_tools (Deny-Wins)."
  ),
  write_forbidden_patterns: z.array(z.string()).default([]).describe(
    "List of glob patterns for file paths where writes are denied. "
    "Takes absolute precedence over allowed write patterns (Deny-Wins). "
    "Example: ['src/**', '*.env']"
  ),
  preloaded_skills: z.array(z.string()),
  on_demand_skills: z.array(z.string()),
  mcp_servers: z.array(z.string()),
  models: z.array(z.string()).min(1).optional().default([]).describe(
    "Optional — dispatcher.config.jsonc is canonical for model data. Must provide at least one model when specified."
  ),
  timeout_minutes: z.number()
});

export const MasterConfigurationSchema = z.object({
  global_settings: z.object({
    default_provider: z.string(),
    compaction_threshold: z.number()
  }),
  agents: z.record(z.string(), AgentConfigSchema)
});

export type MasterConfiguration = z.infer<typeof MasterConfigurationSchema>;
```

Note: `models` is optional because the canonical model configuration lives in `dispatcher.config.jsonc` (see §8.1 of cluster2_content_design.md). The AGENTS.md schema is a fallback/default; `dispatcher.config.jsonc` values take precedence for overlap fields.

> **⚠ Configuration Stability Note:** Markdown is not a reliable machine-config format. Human edits (whitespace changes, column reorder, missing headers) can silently break parsing. For stable runtime configuration, use `dispatcher.config.jsonc` alongside AGENTS.md. AGENTS.md governs agent prose mandates; `dispatcher.config.jsonc` governs machine-readable config (model arrays, timeouts, presets). See `designs/cluster2_content_design.md` §9 for the full file separation design.

---

## 3. Orchestrator Init Prompt & Project Initialization Flow

To guarantee strict version control and workspace readiness, the Orchestrator performs automatic environment auditing at the start of every session, prompting the user for necessary initializations.

### 3.1 Startup Auditing Script
When the plugin is loaded, the Orchestrator executes three lightweight, non-destructive checks:

1. **Git Audit**: Runs `git rev-parse --is-inside-work-tree`. If it fails, the project lacks version control.
2. **Beads Audit**: Scans for the existence of the `.beads/` directory. If missing, the project is not using Beads for issue tracking.
3. **Matt Pocock Skills Audit**: Checks for the presence of the `.skills/` folder or searches `package.json` for skill installations.

### 3.2 Dynamic Interactive Startup Dialog
If any checks fail, the Orchestrator **never** initializes them silently. Instead, it front-loads an interactive setup dialogue into the chat session, requesting explicit user verification:

```markdown
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│             🐝  DISPATCHER ENVIRONMENT AUDIT  🐝            │
│                                                             │
└─────────────────────────────────────────────────────────────┘

I have performed a quick audit of your project workspace. Please approve the initialization of missing development tooling:

## ⚠️ MISSING ENVIRONMENTS DETECTED
- [ ] **Git Version Control**: Highly recommended for file integrity.
- [ ] **Beads Issue Tracker**: The preferred local issue manager.
- [ ] **Matt Pocock Skills**: Necessary to run 'diagnose', 'tdd', and 'grill-with-docs'.

## 🛠️ RECOMMENDED WORKFLOW
Type or click one of the following commands to initialize your workspace:
- `/init` ──────────► Initialize Git & default AGENTS.md config
- `/beads:init` ────► Initialize Beads local tracking database
- `/setup-skills` ──► Load and index Matt Pocock's core skills suite

*Note: You can skip this dialog and proceed to standard instructions if you prefer an unmanaged workspace.*
```

### 3.3 CLI Tool Mapping for Initialization Commands
The CLI triggers map to dedicated shell instructions executed through the sandbox wrapper:

*   **`/init`**:
    ```bash
    git init
    # Generates a customized, minimal local AGENTS.md if none exists
    ```

#### 3.3.1 AGENTS.md Template
The plugin ships a `templates/AGENTS.md` skeleton file used as the local project seed for `/init`. When `/init` runs and no local `AGENTS.md` exists, it copies this template into the project root and substitutes `{{project_name}}` with the current directory name.

The template contains:
- Agent role stubs for the Orchestrator, Planner, Researcher, Builder, Reviewer, and Council.
- MCP server references for GitHub, context7, websearch, and playwright.
- Skill inventory entries with trigger descriptions for when each skill should be used.
- Tool permission defaults for each core agent role.
- A section header reserved for project-specific rules.

This generated `AGENTS.md` is a seed, not a final configuration. Users are expected to customize it per project with repository-specific goals, constraints, permissions, and workflow rules.
*   **`/beads:init`**:
    ```bash
    npx beads init
    ```
*   **`/setup-skills`**:
    ```bash
    # Calls the global skill installer to seed local context
    npx @opencode-ai/skills-installer setup-matt-pocock-skills
    ```

> **⚠️ Placeholder:** `@opencode-ai/skills-installer` — verify package availability on npm before implementation. If unavailable, fall back to bundling skills as local files or using direct skill loading via OpenCode's built-in skill mechanism.

---

## 4. Final Consolidated Agent Prompt Guidelines

To ensure maximum determinism, we refine the system prompt design of the core specialists.

### 4.1 Truth & Evidence Constraints
- **Iron Law of Evidence**: Every specialist must back claims with line-numbered citations `[filePath, lines]`. No generalized statements are accepted.
- **Null State Rule**: If a specialist cannot find a file or symbol, they must explicitly report: *"Searched directories [X, Y] recursively using glob/grep; no matches found."*
- **No Speculative Coding**: The Builder is strictly prohibited from writing code based on assumptions. If an API signature is uncertain, they must delegate to the Researcher first or output `needs_info`.

### 4.2 Error Mitigation Rules
- **Compile-Clean Gate**: The Builder cannot report `completed` unless they run a validation script (`npm run test`, `cargo check`, etc.) and verified that LSP diagnostics return zero errors.
- **Fail-Fast Delegation**: If a specialist hits an unrecoverable semantic failure or API conflict, they must immediately abort and return a `needs_info` envelope to the Orchestrator, bypassing further retry attempts.
