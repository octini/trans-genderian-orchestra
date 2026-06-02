<div align="center">
  <a href="https://github.com/octini/trans-genderian-orchestra/stargazers">
    <img src="img/4k.png" alt="4K GitHub Stars Milestone" style="border-radius: 10px;">
  </a>

  <h1>trans-genderian-orchestra</h1>
  <h3>Pure-dispatcher agent orchestration for OpenCode</h3>

  <p>Route work to specialist agents instead of forcing one model to plan, research, build, review, and decide everything alone.</p>

  <p>
    <a href="https://boringdystopia.ai/"><img src="https://img.shields.io/badge/boringdystopia.ai-111111?style=for-the-badge&logo=vercel&logoColor=white" alt="boringdystopia.ai"></a>&nbsp;
    <a href="https://x.com/alvinunreal"><img src="https://img.shields.io/badge/X-@alvinunreal-000000?style=for-the-badge&logo=x&logoColor=white" alt="X @alvinunreal"></a>&nbsp;
    <a href="https://t.me/boringdystopiadevelopment"><img src="https://img.shields.io/badge/Telegram-Join%20channel-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram Join channel"></a>&nbsp;
  </p>

  <p><b>OpenCode Dispatcher Plugin</b> · Specialist agents · Mandatory review gates · Permission-aware orchestration</p>
</div>

---

## What It Is

`trans-genderian-orchestra` is a Dispatcher plugin for [OpenCode](https://opencode.ai/). It turns a single-agent coding session into a coordinated specialist workflow.

The core rule is simple: the **Orchestrator is a pure dispatcher**. It routes work, tracks state, synthesizes results, and owns final verification. It does not plan, research, implement, or review everything itself. Those responsibilities are delegated to focused agents: `planner`, `researcher`, `builder`, `reviewer`, and `council`.

Use it when you want OpenCode to behave more like a small engineering team:

- planning is separated from implementation;
- discovery and documentation research happen in dedicated lanes;
- source edits are handled by a write-capable builder;
- non-trivial work passes through a reviewer gate;
- critical decisions can be escalated to multi-model consensus;
- safety hooks enforce permissions and recover from common failure modes.

---

## Quick Start

### 1. Build this local checkout

```bash
cd /Users/ryan/OpenCode/general/omo-slim_modifications/trans-genderian-orchestra
bun install
bun run build
```

### 2. Add the plugin to OpenCode

Edit `~/.config/opencode/opencode.jsonc` or `~/.config/opencode/opencode.json` and add this local path to the `plugin` list:

```jsonc
{
  "plugin": [
    "file:///Users/ryan/OpenCode/general/omo-slim_modifications/trans-genderian-orchestra"
  ]
}
```

If the file already has plugins, keep them and add this entry beside them.

### 3. Configure models

Create or edit `~/.config/opencode/trans-genderian-orchestra.jsonc`:

```jsonc
{
  "preset": "default",
  "presets": {
    "default": {
      "orchestrator": { "model": "github-copilot/gpt-5.5" },
      "builder": { "model": "github-copilot/gpt-5.5" }
    }
  }
}
```

That minimal example is enough to show the shape. Real configs usually define every specialist, fallback chains, council presets, MCP access, and skills. See [Configuration](docs/configuration.md).

### 4. Start OpenCode and verify setup

```bash
opencode
```

Inside OpenCode:

```text
/ping-all
```

`/ping-all` pings every enabled specialist and reports whether each one responds successfully.

### 5. Use it

Ask OpenCode for work normally. The Orchestrator decides which specialist should handle each part, waits for the right outputs, and synthesizes the result.

You can also call specialists directly:

```text
@researcher map the authentication flow
@planner create a migration plan for this API change
@council compare these two architecture options
```

For package-based installation, installer flags, provider auth, reset behavior, and troubleshooting, see the [Installation Guide](docs/installation.md).

---

## Agent Roles

| Agent | Role |
|-------|------|
| **Orchestrator** | Pure dispatcher. Routes work, coordinates state, synthesizes specialist outputs, and verifies completion. It does not write project files or perform implementation. |
| **Planner** | Decomposes complex requests into structured plans under `.opencode/plans/`, including dependencies, steps, acceptance criteria, risk tiers, and agent assignments. |
| **Researcher** | Performs codebase search and documentation research. It combines repository reconnaissance with external docs lookup and returns source-backed findings. |
| **Builder** | Designs and implements changes. It owns source edits, updates tests when needed, and runs relevant validation for bounded implementation tasks. |
| **Reviewer** | Dual-persona gatekeeper. In verification mode, it validates work against acceptance criteria. In advisory mode, it gives strategic guidance and resolves ambiguity. |
| **Council** | Multi-model consensus for critical decisions. The Council agent fans out to configured councillors, compares their answers, and synthesizes one recommendation. |

Older inspiration docs may mention Explorer/Librarian or Designer/Fixer. In this Dispatcher build, those capabilities are merged into `researcher` and `builder`.

---

## Key Architecture

### Delegation Envelope

Every specialist task is wrapped in a structured **Delegation Envelope** so child-agent work is self-contained, auditable, and reviewable.

Common fields:

- `verbatim_request` — the user's original request;
- `task` — the delegated objective;
- `acceptance_criteria` — what must be true when done;
- `context_summary` — relevant state and decisions;
- `file_references` — files to inspect, own, or avoid;
- `agent_mode` — `verification` or `advisory` for reviewer work;
- `risk_tier` — `low`, `medium`, `high`, or `critical`;
- `plan_ref` — the governing plan artifact, when applicable.

This structure reduces context loss and gives enforcement hooks enough information to detect malformed delegations or missing review gates.

### Path-Gating Hook

The path-gating hook enforces per-agent write boundaries before write tools run. It is a runtime safety layer, not just a prompt instruction.

| Agent | Default write access |
|-------|----------------------|
| `orchestrator` | Coordination metadata only, such as `state.md`, `handoff.md`, and plan status updates. |
| `planner` | Planning artifacts under `.opencode/plans/`. |
| `researcher` | Scratch/context notes such as `.opencode/notes.md` and `.opencode/scratchpad.md`. |
| `builder` | Project implementation files. |
| `reviewer` | Read-only by default. |
| `council` / `councillor` | Read-only consensus roles. |

`agentGating` can override most allowlists. Council and councillor remain write-denied because they are judgment and consensus roles, not implementation workers.

### Reviewer Enforcement

Every non-trivial delegation to `builder`, `researcher`, or `planner` must be followed by `reviewer` verification. Trivial skips must be explicitly marked in the Delegation Envelope; they are not inferred silently.

Reviewer mode is selected by `agent_mode`:

- `verification` checks completed work against the request, plan, and acceptance criteria;
- `advisory` provides strategic guidance before or during ambiguous work.

If a reviewer rejects the output, the Orchestrator routes fixes back to the original specialist. Repeated rejection loops escalate to Council.

### 4-Tier Resilience

Dispatcher includes four resilience layers for real-world model and tool failures:

| Tier | Purpose |
|------|---------|
| **Model fallback** | Ordered model arrays and `fallback.chains` let agents fail over when providers rate-limit, time out, or return empty responses. |
| **Circuit breaker** | In-progress guards, deduplication windows, and chain-exhaustion checks prevent retry loops and cross-agent model bleed. |
| **Retry** | Delegation retry guidance, councillor retries, timeout controls, and `retry_on_empty` handling give recoverable failures a structured second chance. |
| **Recovery** | JSON-parse recovery reminders, `apply_patch` rescue, background job reconciliation, and `cancel_task` help recover from malformed calls, stale patches, and stuck work. |

### Init and Runtime Commands

Dispatcher registers practical OpenCode commands during initialization:

| Command | Purpose |
|---------|---------|
| `/init` | Initialize a Git repo and seed project-local `AGENTS.md` if absent. |
| `/beads:init` | Initialize a local Beads issue-tracking database. |
| `/ping-all` | Verify connectivity to all enabled specialist agents. |
| `/preset` | List or switch model presets at runtime. |
| `/init:all` | Run Git, Beads, and skills initialization together. |
| `/setup-matt-pocock-skills` | Install the Matt Pocock skills suite. |

See [Preset Switching](docs/preset-switching.md) for `/preset` details and [Session Management](docs/session-management.md) for background job tracking.

---

## Configuration

Configuration has two main layers:

| File | Purpose |
|------|---------|
| `~/.config/opencode/opencode.json` or `.jsonc` | OpenCode core settings, including the `plugin` list. |
| `~/.config/opencode/trans-genderian-orchestra.jsonc` | Dispatcher settings for presets, agents, fallback, MCPs, skills, council, timeouts, and hooks. |
| `.opencode/trans-genderian-orchestra.json` | Optional project-local overrides, checked before global plugin config. |

The plugin supports JSONC comments and trailing commas. You can configure model presets, fallback chains, custom agents, prompt overrides, skills, MCP permissions, council presets, multiplexer panes, background job limits, and specialist timeouts.

Full reference: **[docs/configuration.md](docs/configuration.md)**.

---

## Documentation

Start with the docs hub: **[docs/README.md](docs/README.md)**.

Useful entry points:

| Doc | What it covers |
|-----|----------------|
| [Installation](docs/installation.md) | Setup, auth, installer flags, reset behavior, troubleshooting. |
| [Configuration](docs/configuration.md) | Full config reference and prompt override rules. |
| [Quick Reference](docs/quick-reference.md) | Compact map of common docs and features. |
| [V2 Background Orchestration](docs/v2-background-orchestration.md) | Scheduler-first orchestration model. |
| [Session Management](docs/session-management.md) | Background job board, reuse, polling, reconciliation. |
| [Council](docs/council.md) | Multi-model consensus setup and usage. |
| [Skills](docs/skills.md) | Bundled skills such as `simplify`, `codemap`, `clonedeps`, and `deepwork`. |
| [MCPs](docs/mcps.md) | Built-in MCP servers and per-agent permissions. |
| [Tools](docs/tools.md) | Patch rescue, web fetch, AST search, formatting, and task control. |
| [Multiplexer](docs/multiplexer-integration.md) | Watch child agents in tmux or Zellij panes. |

---

## Project Status

`trans-genderian-orchestra` is in active development as a Dispatcher-focused OpenCode orchestration plugin.

Current status:

- **1095+ tests passing** in the project test suite;
- TypeScript + Bun implementation with Biome formatting/linting;
- V2 scheduler/background orchestration work underway;
- active hardening around reviewer enforcement, path gating, fallback behavior, background task tracking, and local initialization.

For contributor guidance, see [AGENTS.md](AGENTS.md) and [docs/maintainers.md](docs/maintainers.md).

---

## Development Commands

Run from `trans-genderian-orchestra/`:

| Command | Description |
|---------|-------------|
| `bun run build` | Build the plugin and CLI into `dist/`. |
| `bun run typecheck` | Run TypeScript without emitting files. |
| `bun test` | Run the test suite. |
| `bun run check:ci` | Run Biome checks without auto-fixing. |

---

## License

MIT
