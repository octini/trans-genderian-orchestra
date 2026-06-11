# Model Presets And Ensemble

TGO generated config is model-preset driven. Presets assign models to agents, and the Ensemble configuration assigns models to hidden councillor seats.

## Generated Presets

Fresh generated config includes exactly two primary presets:

- `github-copilot` — active by default;
- `opencode-go`.

The installer accepts only generated preset names for `--preset`:

```bash
bunx trans-genderian-orchestra install --preset=github-copilot
bunx trans-genderian-orchestra install --preset=opencode-go
```

## `github-copilot` Mapping

| Agent | Model | Variant |
|---|---|---|
| `conductor` | `github-copilot/gpt-5.5` | `xhigh` |
| `scribe` | `github-copilot/gemini-3.5-flash` | `high` |
| `composer` | `github-copilot/gpt-5.5` | `xhigh` |
| `principal` | `github-copilot/claude-opus-4.7` | `max` |
| `ensemble` | `conductor` | model reference |

## `opencode-go` Mapping

| Agent | Model | Variant |
|---|---|---|
| `conductor` | `opencode-go/mimo-v2.5-pro` | `high` |
| `scribe` | `opencode-go/mimo-v2.5` | `high` |
| `composer` | `opencode-go/mimo-v2.5` | `high` |
| `principal` | `opencode-go/mimo-v2.5-pro` | `high` |
| `ensemble` | `conductor` | model reference |

## Why Ensemble Maps To Conductor By Default

Generated presets set `ensemble.model` to `conductor`. This is a model reference, not a provider ID. During config load, TGO resolves it to the active preset's Conductor model.

That default keeps synthesis and coordination aligned: the model responsible for steering the workflow also synthesizes councillor results unless you intentionally split those responsibilities.

Override it when you want Ensemble synthesis to use a different model:

```jsonc
{
  "agents": {
    "ensemble": {
      "model": "github-copilot/claude-opus-4.7",
      "variant": "max"
    }
  }
}
```

## Runtime `/preset`

The plugin registers `/preset` from source.

| Command | Behavior |
|---|---|
| `/preset` | Lists available presets and marks the active one. |
| `/preset <name>` | Saves the requested preset to user TGO config and runtime state. It asks you to restart or reload OpenCode before relying on the new agent configuration. |

`/preset` is deliberately conservative: it avoids tearing down the active conversation while OpenCode is still processing the command.

## Ensemble Configuration

Generated config includes an `ensemble` block with:

| Key | Generated value |
|---|---|
| `default_preset` | The selected install preset (`github-copilot` by default). |
| `councillor_execution_mode` | `parallel`. |
| `timeout` | `180000` milliseconds. |
| `councillor_retries` | Schema default `3` retries for empty provider responses. |
| `presets` | Councillor seat mappings for `github-copilot` and `opencode-go`. |

Councillor execution can be changed to `serial` for single-model systems or providers that do poorly with parallel requests.

## Generated Councillor Seats

### `github-copilot`

| Seat | Focus | Model | Variant |
|---|---|---|---|
| `first` | Correctness & Architecture | `github-copilot/gemini-3.5-flash` | `high` |
| `second` | Edge Cases & Security | `github-copilot/gpt-5.5` | `xhigh` |
| `third` | UX & Performance | `github-copilot/claude-opus-4.7` | `max` |

### `opencode-go`

| Seat | Focus | Model | Variant |
|---|---|---|---|
| `first` | Correctness & Architecture | `opencode-go/mimo-v2.5` | `high` |
| `second` | Edge Cases & Security | `opencode-go/deepseek-v4-flash` | `max` |
| `third` | UX & Performance | `opencode-go/kimi-k2.6` | default |

Councillors are hidden read-only subagents. They do not ask the user questions, write files, run shell commands, or spawn subagents.

## Consensus Rules

For review-panel mode, Ensemble uses:

| Councillor votes | Result |
|---|---|
| 3/3 approve | Approve with unanimous consensus. |
| 2/3 approve | Approve with dissenting findings surfaced. |
| 1/3 approve or 0/3 approve | Reject. |
| Any critical issue | Reject regardless of vote count. |

The Ensemble response should keep minority findings visible. It should not rubber-stamp work simply because a majority approves.

## Custom Ensemble Example

```jsonc
{
  "ensemble": {
    "default_preset": "mixed-review",
    "councillor_execution_mode": "parallel",
    "timeout": 180000,
    "councillor_retries": 2,
    "presets": {
      "mixed-review": {
        "first": {
          "model": "github-copilot/gemini-3.5-flash",
          "variant": "high",
          "prompt": "Focus: Correctness & Architecture"
        },
        "second": {
          "model": "opencode-go/deepseek-v4-flash",
          "variant": "max",
          "prompt": "Focus: Edge Cases & Security"
        },
        "third": {
          "model": "github-copilot/claude-opus-4.7",
          "variant": "max",
          "prompt": "Focus: UX & Performance"
        }
      }
    }
  }
}
```

Keep councillor prompts short and focused. Ensemble already supplies the synthesis instructions.

## Fallback And Resilience

TGO has two relevant resilience mechanisms:

- **Foreground fallback chains** under `fallback.chains`, used when foreground sessions hit rate-limit/quota-like errors.
- **Councillor retries** under `ensemble.councillor_retries`, used when councillor sessions return empty responses.

Both mechanisms require models that OpenCode can already access. They do not create provider credentials or bypass provider limits.
