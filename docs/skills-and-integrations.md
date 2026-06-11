# Skills And Integrations

TGO bundles a small set of skills and runtime integrations to support orchestration, retrieval-led reasoning, implementation, review, and safety. It does not try to install every possible tool a user might want.

## Bundled Skills

The installer copies bundled skills from `src/skills/` into the OpenCode skills directory when `--skills=yes` is used.

| Skill | Default allowed agents | Purpose |
|---|---|---|
| `simplify` | `principal`, `composer` | Readability and maintainability simplification. |
| `codemap` | `conductor` | Repository understanding and hierarchical codemap generation. |
| `clonedeps` | `conductor` | Clone important dependency source for local inspection. |
| `deepwork` | `conductor` | Heavy/complex coding sessions and phased implementation workflow. |
| `trans-genderian-orchestra` | `conductor` | Configure, customize, and safely improve TGO setups. |

Install without bundled skills if you want to manage them yourself:

```bash
bunx trans-genderian-orchestra install --skills=no
```

## Skill Permission Lists

Agent config can allow or deny skills with list syntax:

```jsonc
{
  "agents": {
    "conductor": { "skills": ["*"] },
    "composer": { "skills": ["simplify"] },
    "principal": { "skills": ["*", "!codemap"] }
  }
}
```

`'*'` means all skills. Entries starting with `!` exclude a skill from a wildcard list.

## Built-In MCPs

TGO registers these MCP configurations unless disabled:

| MCP | Type | Purpose | Notes |
|---|---|---|---|
| `websearch` | remote | Web search through Exa by default or Tavily when configured. | `EXA_API_KEY` optional for Exa; `TAVILY_API_KEY` required for Tavily. |
| `context7` | remote | Library/documentation lookup through Context7. | Passes `CONTEXT7_API_KEY` if set. |
| `grep_app` | remote | GitHub-scale code search through grep.app. | No OAuth configured by TGO. |

Disable one globally:

```jsonc
{
  "disabled_mcps": ["grep_app"]
}
```

Change websearch provider:

```jsonc
{
  "websearch": {
    "provider": "tavily"
  }
}
```

## Default MCP Access By Agent

| Agent | Default MCP list |
|---|---|
| `conductor` | `['*', '!context7']` |
| `scribe` | `['websearch', 'context7', 'grep_app']` |
| `composer` | `[]` |
| `principal` | `[]` |
| `ensemble` | `[]` |
| `councillor` | `[]` |

The config hook turns those lists into per-agent MCP tool permissions. User-defined permissions in OpenCode config are preserved when already present.

## Built-In Tools

TGO registers several plugin tools:

| Tool | Who can use it by default | Purpose |
|---|---|---|
| `webfetch` | Available as a plugin tool; permission is requested per URL. | Fetch URL content with docs-focused extraction, redirects, optional `llms.txt`, metadata, and binary safeguards. |
| `ast_grep_search` | Available as a plugin tool. | AST-aware structural code search. |
| `ast_grep_replace` | Available as a plugin tool. | AST-aware replacement; dry-run by default. |
| `cancel_task` | Conductor only. | Cancel tracked background specialist tasks. |
| `council_session` | Ensemble only, when `ensemble` config exists. | Spawn hidden councillor sessions and return their results for Ensemble synthesis. |

Tool permissions are enforced in prompts, agent permissions, and tool code where needed. Councillors are read-only and cannot invoke shell or subagents.

## Slash-Command Integrations

Verified current slash commands:

| Command | Integration |
|---|---|
| `/preset [name]` | Runtime preset list/switch helper. |
| `/interview <idea>` | Localhost interview UI and live markdown specification workflow. |
| `/deepwork <task>` | Heavy-workflow activation through the bundled deepwork skill. |

TGO setup and doctor are CLI commands, not slash commands.

## Background Subagents And Multiplexers

OpenCode background subagents require this environment setting:

```bash
OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true
```

The installer can print or write a shell startup block:

```bash
bunx trans-genderian-orchestra install --background-subagents=yes
```

Optional `multiplexer` config supports `auto`, `tmux`, `zellij`, or `none`. Multiplexers are for visibility and pane management; they are not required for TGO's core agent roster.

## AFT, context7, grep.app, And Web Search

TGO's philosophy is retrieval-led reasoning:

- use code search and file reads before asserting how a codebase works;
- after file reads/writes, a lightweight post-file-tool nudge can remind Conductor sessions to use retrieved evidence, route non-trivial context gathering through Scribe, and delegate implementation rather than turning inspection into direct work;
- use Context7 for library docs when available;
- use grep.app for examples across public repositories;
- use websearch/webfetch for current or external documentation;
- use AST-grep for structural search and safe previewed rewrites.

Some environments also provide AFT-style code intelligence tools outside the plugin. TGO docs treat those as environment tools, not bundled dependencies.

## Safety Boundaries

TGO intentionally avoids broad hidden mutation:

- It does not store raw secrets in generated config.
- It does not uninstall shared CLIs such as `gh`, `uvx`, `bd`, or other user tools.
- It does not claim every MCP is authenticated just because it registered a config.
- It does not push, publish, merge, tag, rewrite remotes, or delete worktrees without explicit approval.
- It preserves user-managed OpenCode providers, plugins, MCPs, skills, and custom config unless explicitly asked to change them.

## What Is Intentionally Not Bundled

TGO does not bundle or automatically install:

- provider credentials or paid provider access;
- GitHub CLI authentication;
- local multiplexer binaries such as tmux or zellij;
- every external MCP server a project might want;
- a rollback/uninstall command in current source;
- undocumented `/tgo:*` slash commands.

If you need a tool outside this set, add it to OpenCode or your shell environment explicitly and document the project-specific setup in your own repo.
