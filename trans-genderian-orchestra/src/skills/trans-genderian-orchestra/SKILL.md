---
name: trans-genderian-orchestra
description: Configure and safely improve the trans-genderian-orchestra Dispatcher plugin setup, including models, presets, skills, MCP access, custom agents, and prompt overrides.
---

# trans-genderian-orchestra Self-Improvement

Use this skill when the user wants to tune, debug, or improve their
`trans-genderian-orchestra` Dispatcher plugin configuration.

The orchestrator is read-only. When this skill identifies a configuration or
prompt-file change, the orchestrator designs the exact change, asks for approval,
and delegates the actual file writes to `@builder`.

## When to Use

Use this skill for:

- config tuning in `trans-genderian-orchestra`;
- model, preset, fallback, variant, temperature, skill, or MCP changes;
- changing which agents can use which tools, MCPs, or skills;
- prompt adjustments for orchestrator, planner, researcher, builder, reviewer,
  or council;
- adding or refining custom agents;
- recurring workflow friction, repeated delegation mistakes, unclear review
  gates, or agent behavior that should become a stable local preference.

Do not use this skill for ordinary project implementation work unless the work is
specifically about improving `trans-genderian-orchestra` configuration or agent
behavior.

## Configuration Locations

Primary configuration files:

- User config: `~/.config/opencode/trans-genderian-orchestra.jsonc`
- User JSON fallback: `~/.config/opencode/trans-genderian-orchestra.json`
- Project overrides: `<project>/.opencode/trans-genderian-orchestra.json`
- Project JSONC overrides: `<project>/.opencode/trans-genderian-orchestra.jsonc`

JSONC files support comments and trailing commas. When both `.jsonc` and `.json`
exist at the same level, `.jsonc` takes precedence.

Prompt override files live under:

```text
~/.config/opencode/trans-genderian-orchestra/
```

Per-agent prompt files:

- `~/.config/opencode/trans-genderian-orchestra/{agent}.md` replaces the built-in
  prompt for that agent.
- `~/.config/opencode/trans-genderian-orchestra/{agent}_append.md` appends to the
  built-in prompt for that agent.

Preset-specific prompt overrides are checked before root prompt overrides:

- `~/.config/opencode/trans-genderian-orchestra/{preset}/{agent}.md`
- `~/.config/opencode/trans-genderian-orchestra/{preset}/{agent}_append.md`

Valid built-in agent names for this Dispatcher are:

- `orchestrator`
- `planner`
- `researcher`
- `builder`
- `reviewer`
- `council`

## Safe Improvement Rules

Always follow these rules:

1. Ask before changing files unless the user has already approved the exact
   target files and content.
2. Make the narrowest change that solves the recurring problem.
3. Preserve existing settings, comments, formatting, unrelated presets, and
   local overrides.
4. Prefer project overrides for project-specific behavior and user config for
   stable personal defaults.
5. Prefer prompt append files over full prompt replacement.
6. Do not remove fallback models, skills, MCP rules, or disabled-agent settings
   unless the user explicitly asks.
7. Do not convert broad configuration files into generated output; patch only the
   relevant keys or prompt snippets.
8. Keep the orchestrator read-only: it designs and delegates; `@builder` writes.

## Configuration Workflow

### 1. Inspect

Read only the relevant current state:

- active config files that exist at the user and project paths above;
- active `preset` and matching `presets.<name>` entries;
- existing `agents.<agent>` overrides for orchestrator, planner, researcher,
  builder, reviewer, or council;
- existing prompt override files for the affected agent and preset;
- nearby documentation if needed to confirm schema or behavior.

Do not assume the file exists. If it does not exist, plan a minimal new file or
directory.

### 2. Decide

Choose the smallest appropriate change:

- model behavior: edit `presets.<preset>.<agent>.model`, `variant`,
  `temperature`, `options`, or `fallback.chains`;
- agent tool access: edit `skills` or `mcps` for the specific agent;
- agent behavior: create or update `{agent}_append.md` first;
- full behavior replacement: use `{agent}.md` only when an append cannot work;
- project-specific policy: use `<project>/.opencode/trans-genderian-orchestra.json`
  or `.jsonc`;
- personal global preference: use
  `~/.config/opencode/trans-genderian-orchestra.jsonc`.

### 3. Confirm

Before writes, explain:

- the problem being solved;
- the file path(s) to change;
- the exact setting or prompt text to add, update, or remove;
- whether the change is global or project-local;
- expected activation behavior.

Ask for confirmation unless the user has already approved those exact edits.

### 4. Apply by Builder

After approval, the orchestrator delegates file edits to `@builder` with a clear
delegation envelope. Example:

```md
@builder
Task: Apply the approved trans-genderian-orchestra configuration change.

Approved files:
- ~/.config/opencode/trans-genderian-orchestra.jsonc
- ~/.config/opencode/trans-genderian-orchestra/orchestrator_append.md

Exact changes:
- Preserve all existing unrelated settings and comments.
- Add only the approved model/skill/prompt adjustment described below.
- Do not rewrite or reformat the whole config file.

Validation:
- Re-read changed files.
- Run `trans-genderian-orchestra doctor` if available.
- Report what changed and whether activation needs a restart/new session.
```

The orchestrator must not perform the write itself.

### 5. Validate

Use validation appropriate to the change:

- For JSON/JSONC config: parse or run `trans-genderian-orchestra doctor` when
  available.
- For prompt files: re-read the file and confirm the path matches the intended
  agent and preset.
- For source changes in the `trans-genderian-orchestra` repository: run the
  relevant project checks, usually `bun run typecheck` and `bun test`.

### 6. Explain Activation

Tell the user how the change activates:

- config file changes apply the next time the plugin loads that config;
- project overrides affect only that project;
- prompt override files are loaded when agents are created, so use a new session
  or restart OpenCode if the current session does not pick them up;
- preset-specific prompt overrides only apply when that preset is active.

## Model and Preset Pattern

Use the active `preset` unless the user asks for a new preset. Keep model changes
agent-specific.

Example project-local model override:

```jsonc
{
  "preset": "openai",
  "presets": {
    "openai": {
      "planner": {
        "model": "github-copilot/gpt-5.5",
        "variant": "xhigh"
      },
      "researcher": {
        "model": [
          { "id": "github-copilot/gemini-3.5-flash", "variant": "high" },
          { "id": "github-copilot/gpt-5.5", "variant": "xhigh" }
        ]
      }
    }
  }
}
```

For skill or MCP access, change only the affected agent:

```jsonc
{
  "presets": {
    "openai": {
      "researcher": {
        "skills": ["codemap", "zoom-out", "grill-with-docs", "diagnose"],
        "mcps": ["websearch", "context7"]
      }
    }
  }
}
```

## Custom Agent Pattern

Use a custom agent when a recurring responsibility does not fit orchestrator,
planner, researcher, builder, reviewer, or council.

Custom agents are defined under `agents` with a safe identifier, a `model`, a
full execution `prompt`, and optionally an `orchestratorPrompt` that teaches the
orchestrator when to delegate to it.

```jsonc
{
  "agents": {
    "janitor": {
      "model": "github-copilot/gpt-5.5",
      "skills": ["simplify", "diagnose"],
      "mcps": [],
      "prompt": "You are Janitor. Audit codebase entropy, dead code, docs drift, naming inconsistencies, and unnecessary complexity. Prefer analysis and bounded recommendations unless explicitly asked to edit.",
      "orchestratorPrompt": "@janitor\n- Role: Maintenance specialist for cleanup, docs drift, dead-code suspicion, naming consistency, and entropy review\n- Delegate when: the user asks for maintenance review, cleanup planning, or post-refactor entropy checks\n- Do not delegate when: the task is normal implementation, architecture planning, factual research, or final verification"
    }
  }
}
```

Custom agent rules:

- names must be safe identifiers such as `janitor` or `security-reviewer`;
- `model` is required;
- custom `orchestratorPrompt` should start with `@<agent-name>`;
- keep the delegation trigger narrow;
- use `disabled_agents` if the user wants to disable a custom agent later;
- do not put `prompt` or `orchestratorPrompt` under built-in agents; built-in
  agents use markdown prompt override files instead.

## Prompt Tuning Pattern

Use prompt tuning for recurring behavior problems that cannot be solved by a
single reminder in the current conversation.

Preferred order:

1. Add a short append prompt in `{agent}_append.md`.
2. If behavior differs by model preset, add it under `{preset}/{agent}_append.md`.
3. Replace the full prompt with `{agent}.md` only when an append cannot reliably
   express the change.

Good append prompts are short, concrete, and testable:

```md
When asked to modify trans-genderian-orchestra configuration, design the exact
config or prompt-file change, ask for confirmation, and delegate writes to
@builder. Do not edit files directly as orchestrator.
```

Prompt tuning checklist:

- Name the exact behavior to change.
- State when the behavior applies and when it does not.
- Preserve the agent's existing role boundaries.
- Avoid broad personality rewrites.
- Avoid duplicating instructions already present in the built-in prompt.
- Include validation expectations if the prompt affects implementation or review.

## Final Response Pattern

After a configuration improvement, summarize:

- what was changed;
- where it was changed;
- whether it is global, project-local, or preset-specific;
- validation results;
- what the user must do for the change to take effect.
