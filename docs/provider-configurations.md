# Provider Configurations

TGO does not replace OpenCode provider setup. It references provider/model IDs in its agent presets, while OpenCode remains responsible for provider authentication, available models, and provider-specific credentials.

## Provider Setup Flow

1. Install TGO:

   ```bash
   bunx trans-genderian-orchestra install
   ```

2. Authenticate providers in OpenCode:

   ```bash
   opencode auth login
   ```

3. Refresh model discovery:

   ```bash
   opencode models --refresh
   ```

4. Select or edit a TGO preset in `~/.config/opencode/trans-genderian-orchestra.json[c]`.

5. Restart OpenCode after provider, model, preset, or plugin config changes.

## Generated Provider Presets

Fresh generated config includes two primary presets.

| Preset | Best for | Notes |
|---|---|---|
| `github-copilot` | Default, high-quality mixed specialist routing through GitHub Copilot models. | Active by default. Requires GitHub Copilot access through OpenCode. |
| `opencode-go` | Alternative provider stack using OpenCode Go model IDs. | Useful when those models are available and you want a single provider family. |

Exact generated model mappings are documented in [Model presets and Ensemble](./model-presets-and-ensemble.md).

## GitHub Copilot Preset

Generated `github-copilot` assigns:

| Agent | Model | Variant |
|---|---|---|
| `conductor` | `github-copilot/gpt-5.5` | `xhigh` |
| `scribe` | `github-copilot/gemini-3.5-flash` | `high` |
| `composer` | `github-copilot/gpt-5.5` | `xhigh` |
| `principal` | `github-copilot/claude-opus-4.7` | `max` |
| `ensemble` | `conductor` | model reference |

The Ensemble agent defaults to the Conductor model so the top-level synthesis matches the primary coordination model unless you override it.

## OpenCode Go Preset

Generated `opencode-go` assigns:

| Agent | Model | Variant |
|---|---|---|
| `conductor` | `opencode-go/mimo-v2.5-pro` | `high` |
| `scribe` | `opencode-go/mimo-v2.5` | `high` |
| `composer` | `opencode-go/mimo-v2.5` | `high` |
| `principal` | `opencode-go/mimo-v2.5-pro` | `high` |
| `ensemble` | `conductor` | model reference |

Install directly with this preset:

```bash
bunx trans-genderian-orchestra install --preset=opencode-go
```

Or switch an existing config:

```jsonc
{
  "preset": "opencode-go"
}
```

## Mixed-Provider Presets

You can create your own preset when different roles should use different providers. Example:

```jsonc
{
  "preset": "mixed",
  "presets": {
    "mixed": {
      "conductor": { "model": "github-copilot/gpt-5.5", "variant": "xhigh" },
      "scribe": { "model": "opencode-go/mimo-v2.5", "variant": "high" },
      "composer": { "model": "github-copilot/gpt-5.5", "variant": "xhigh" },
      "principal": { "model": "github-copilot/claude-opus-4.7", "variant": "max" },
      "ensemble": { "model": "conductor" }
    }
  }
}
```

Guidelines:

- Put the strongest reasoning model on `conductor` and `principal` when scope/risk is high.
- Put a fast, inexpensive model on `scribe` for read-heavy exploration when quality remains acceptable.
- Put a reliable coding model on `composer`; implementation mistakes cost more than a slow response.
- Keep `ensemble` mapped to `conductor` unless you have a reason to separate synthesis from coordination.
- Configure councillor seats under `ensemble.presets` if you want the review panel itself to use different providers.

## Budget And Performance Patterns

| Pattern | Config idea | Trade-off |
|---|---|---|
| Quality-first | Strong models for Conductor, Composer, Principal, and at least two Councillor seats. | Higher cost/latency, stronger review. |
| Research-cheap | Cheaper Scribe model, strong Composer/Principal models. | Saves on exploration; may need more precise Scribe prompts. |
| Fast iteration | Faster Composer and Scribe models, strong Principal. | Better latency; final gate catches more issues. |
| Review-heavy | Diverse councillor providers plus Principal on a strong model. | Good for risky changes; slower and more expensive. |
| Single-provider | All roles on one provider family. | Simpler auth and fewer provider surprises; less model diversity. |

## Fallback Guidance

TGO supports foreground fallback chains for rate-limit and quota-like failures:

```jsonc
{
  "fallback": {
    "enabled": true,
    "retry_on_empty": true,
    "chains": {
      "conductor": ["github-copilot/gpt-5.5", "opencode-go/mimo-v2.5-pro"],
      "scribe": ["github-copilot/gemini-3.5-flash", "opencode-go/mimo-v2.5"],
      "composer": ["github-copilot/gpt-5.5", "opencode-go/mimo-v2.5"],
      "principal": ["github-copilot/claude-opus-4.7", "opencode-go/mimo-v2.5-pro"]
    }
  }
}
```

Fallback is not a substitute for provider setup. The fallback model must be available to OpenCode and authenticated already.

## Environment Variables

TGO reads a few environment variables that affect provider-related behavior:

| Variable | Use |
|---|---|
| `TGO_PRESET` | Override active TGO preset at runtime. |
| `TRANS_GENDERIAN_ORCHESTRA_PRESET` | Alternate preset override variable. |
| `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS` | Required by OpenCode for background subagent behavior. Installer can help persist it. |
| `EXA_API_KEY` | Optional key for the default Exa websearch MCP. |
| `TAVILY_API_KEY` | Required if `websearch.provider` is `tavily`. |
| `CONTEXT7_API_KEY` | Optional key passed to Context7 MCP when present. |

Keep secrets in environment variables or provider auth stores, not in TGO config files.
