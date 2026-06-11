# Configuration Reference

TGO configuration has two layers: OpenCode's core config loads the plugin, and TGO's own config controls agents, models, prompts, MCP access, and workflow helpers.

## Config File Locations

TGO uses `OPENCODE_CONFIG_DIR` when it is set. Otherwise it uses `XDG_CONFIG_HOME/opencode`, then `~/.config/opencode`.

| Path | Owner | Purpose |
|---|---|---|
| `~/.config/opencode/opencode.json` or `.jsonc` | OpenCode/user-owned, with small TGO edits | Plugin registration, OpenCode defaults, user providers, user commands, user MCPs, and other OpenCode settings. |
| `~/.config/opencode/trans-genderian-orchestra.json` or `.jsonc` | TGO-owned/user-editable plugin config | TGO presets, agent overrides, Ensemble config, fallback, MCP permissions, interview/deepwork-related settings. |
| `<project>/.opencode/trans-genderian-orchestra.json` or `.jsonc` | Project-local overrides | Optional project-specific TGO config. Project config is deep-merged over user config. |
| `~/.config/opencode/trans-genderian-orchestra/*.md` | User prompt overrides | Full or append-only prompt files for built-in or custom agents. |

Think of `opencode.json[c]` as the load-bearing OpenCode config and `trans-genderian-orchestra.json[c]` as the TGO catalog/config. The installer keeps OpenCode config small and writes TGO-specific agent/model data to the TGO file.

JSONC is supported for TGO config: comments, trailing commas, and `{env:VAR_NAME}` interpolation are accepted by the loader.

## Load And Merge Order

1. User TGO config is loaded from the OpenCode config directory.
2. Project TGO config is loaded from `<project>/.opencode/` if present.
3. Project config overrides user config.
4. Nested objects such as `agents`, `multiplexer`, `interview`, `backgroundJobs`, `fallback`, and `ensemble` are deep-merged.
5. If `preset` is set, `presets[preset]` is merged into `agents`.
6. Root `agents` entries override preset entries.
7. `TGO_PRESET` or `TRANS_GENDERIAN_ORCHESTRA_PRESET` overrides the config-file preset.
8. Model references such as `ensemble: { model: "conductor" }` resolve to the referenced agent's model.

## Generated Default Config

Fresh generated config includes exactly two primary presets:

- `github-copilot` — active by default;
- `opencode-go`.

It also generates an `ensemble` block with three councillor seats for both presets. See [Model presets and Ensemble](./model-presets-and-ensemble.md) for exact mappings.

## Top-Level Keys

| Key | Type | Use |
|---|---|---|
| `preset` | string | Active preset name. Defaults to `github-copilot` in generated config. |
| `setDefaultAgent` | boolean | When not `false`, TGO sets OpenCode `default_agent` to `conductor` if the user has not set one. |
| `autoUpdate` | boolean | Disable automatic update installation when `false`. Defaults to enabled. Pinned plugin versions are not auto-updated. |
| `presets` | object | Named groups of per-agent overrides. Used by startup config and `/preset`. |
| `agents` | object | Root per-agent overrides and custom agent definitions. Root entries override active preset entries. |
| `disabled_agents` | string[] | Disable named agents. `conductor` and internal `councillor` are protected. |
| `disabled_mcps` | string[] | Disable built-in MCP servers by name. |
| `multiplexer` | object | Preferred multiplexer config: `type`, `layout`, `main_pane_size`. |
| `tmux` | object | Legacy compatibility config; migrated to `multiplexer` when enabled. |
| `websearch` | object | Select websearch MCP provider: `exa` or `tavily`. |
| `interview` | object | Configure `/interview` questions, output folder, browser opening, dashboard, and port. |
| `backgroundJobs` | object | Configure reusable background task tracking limits and read-context capture. |
| `fallback` | object | Runtime model fallback chains and retry behavior. |
| `ensemble` | object | Councillor presets, timeout, execution mode, and retry count. |
| `manualPlan`, `scoringEngineVersion`, `balanceProviderUsage` | advanced/internal | Schema-supported advanced keys; leave unset unless you are working from source-level guidance. |

## Agent Override Shape

Agent overrides may appear under `presets.<preset>.<agent>` or `agents.<agent>`:

```jsonc
{
  "agents": {
    "composer": {
      "model": "github-copilot/gpt-5.5",
      "variant": "xhigh",
      "temperature": 0.5,
      "skills": ["simplify"],
      "mcps": [],
      "options": {
        "reasoningEffort": "high"
      },
      "displayName": "builder"
    }
  }
}
```

Supported fields:

| Field | Meaning |
|---|---|
| `model` | Either a `provider/model` string, an agent-name reference such as `conductor`, or an ordered fallback array. |
| `variant` | Provider/model variant passed to OpenCode. |
| `temperature` | Number from `0` to `2`. |
| `skills` | Skill allow/exclude list. `['*']` means all; `['*', '!codemap']` means all except `codemap`. |
| `mcps` | MCP allow/exclude list using the same wildcard syntax. |
| `options` | Provider-specific model options. |
| `displayName` | Optional public alias for an agent. Must be safe and non-conflicting. |
| `prompt` | Only for custom agents in JSON config. Built-in agents must use prompt files. |
| `conductorPrompt` | Only for custom agents; tells Conductor when to route to that custom agent. |

Built-in agent names are `conductor`, `scribe`, `composer`, `principal`, `ensemble`, and `councillor`. Some legacy alias keys are accepted for backward compatibility, but new public docs and config should use current names. Existing users can find migration notes in [MIGRATION.md](../MIGRATION.md).

## Prompt Overrides

Use prompt files for built-in agents:

| File | Effect |
|---|---|
| `~/.config/opencode/trans-genderian-orchestra/conductor_append.md` | Append to the built-in Conductor prompt. Preferred for small local rules. |
| `~/.config/opencode/trans-genderian-orchestra/conductor.md` | Replace the built-in Conductor prompt entirely. Use rarely. |
| `~/.config/opencode/trans-genderian-orchestra/github-copilot/conductor_append.md` | Preset-specific append, checked before the non-preset file. |

The same naming pattern works for `scribe`, `composer`, `principal`, `ensemble`, `councillor`, and custom agents.

Prefer append files for local preferences. Full replacements must restate all essential role behavior, permissions, output formats, and safety gates.

## Safe Customization Examples

### Change Active Preset

```jsonc
{
  "preset": "opencode-go"
}
```

Restart OpenCode after editing config. You can also use `/preset opencode-go`; it saves the preset and tells you to restart or reload to apply safely.

### Use A Mixed-Provider Preset

```jsonc
{
  "preset": "mixed-quality",
  "presets": {
    "mixed-quality": {
      "conductor": { "model": "github-copilot/gpt-5.5", "variant": "xhigh" },
      "scribe": { "model": "opencode-go/mimo-v2.5", "variant": "high" },
      "composer": { "model": "github-copilot/gpt-5.5", "variant": "xhigh" },
      "principal": { "model": "github-copilot/claude-opus-4.7", "variant": "max" },
      "ensemble": { "model": "conductor" }
    }
  }
}
```

### Add Foreground Fallbacks

```jsonc
{
  "fallback": {
    "enabled": true,
    "retry_on_empty": true,
    "chains": {
      "conductor": ["github-copilot/gpt-5.5", "opencode-go/mimo-v2.5-pro"],
      "composer": ["github-copilot/gpt-5.5", "opencode-go/mimo-v2.5"]
    }
  }
}
```

Fallback reacts to rate-limit and quota-like foreground session errors. It does not make unavailable providers available; authenticate and refresh models first.

### Tune Built-In MCP Access

```jsonc
{
  "agents": {
    "scribe": {
      "mcps": ["websearch", "context7", "grep_app"]
    },
    "conductor": {
      "mcps": ["*", "!context7"]
    }
  }
}
```

### Add A Custom Read-Only Reviewer

```jsonc
{
  "agents": {
    "api-reviewer": {
      "model": "github-copilot/claude-opus-4.7",
      "variant": "max",
      "prompt": "You review API compatibility, migration risk, and error semantics. Return concise findings with file references.",
      "conductorPrompt": "Delegate to @api-reviewer for public API changes, SDK contracts, compatibility questions, or migration-risk review. Do not use it for routine implementation.",
      "skills": [],
      "mcps": []
    }
  }
}
```

Custom agent names must be safe identifiers and cannot reuse built-in names.

## What Not To Put In Config

- Raw API keys, PATs, tokens, or passwords.
- Built-in agent `prompt` or `conductorPrompt` fields; use markdown prompt files instead.
- Large one-off task instructions that belong in the current conversation.
- Provider settings that belong to OpenCode's provider/auth system.

After any config or prompt change, restart OpenCode if you need the change immediately.
