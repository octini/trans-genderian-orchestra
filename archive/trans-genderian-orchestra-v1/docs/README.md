# Documentation

Welcome to the trans-genderian-orchestra documentation hub. Use this page to find setup guides, configuration references, orchestration concepts, advanced features, and maintainer notes for the Dispatcher plugin.

## Getting Started

- [Installation Guide](installation.md) — Install the plugin, choose installer flags, authenticate providers, troubleshoot setup, and uninstall.
- [Quick Reference](quick-reference.md) — Compact index of the most common docs, commands, and feature references.
- [Interview](interview.md) — Use `/interview` to refine feature ideas in a browser UI and save a markdown spec in your repo.

## Core Concepts

- [V2 Background Orchestration](v2-background-orchestration.md) — Scheduler-first orchestration model using native OpenCode background subagents.
- [V2 Core Refactor Plan](v2_core.md) — Implementation plan for V2 prompts, job-board behavior, task integration, and multiplexer compatibility.
- [Session Management](session-management.md) — Background job tracking, child-session reuse, polling, and reconciliation behavior.
- [Council Agent Guide](council.md) — Multi-model consensus workflow, councillor setup, presets, usage, and failure handling.

## Configuration

- [Configuration Reference](configuration.md) — Full reference for plugin config files, JSONC support, prompt overrides, agents, MCPs, and options.
- [Preset Switching](preset-switching.md) — Runtime `/preset` command for switching agent model presets without restarting OpenCode.
- [OpenCode Go Preset](opencode-go-preset.md) — Generated preset for running Pantheon agents through OpenCode Go models.
- [$30 Preset](thirty-dollars-preset.md) — Example mixed-provider setup using Codex Plus and GitHub Copilot Pro.
- [Author's Preset](authors-preset.md) — The author's day-to-day configuration, including model, council, multiplexer, and skill settings.
- [MCP Servers](mcps.md) — Built-in MCP servers, default agent permissions, and global MCP configuration.
- [Skills](skills.md) — Bundled prompt-based skills such as `simplify`, `codemap`, `clonedeps`, and `deepwork`.
- [Tools & Capabilities](tools.md) — Built-in tool behavior for patch rescue, web fetch, code search, formatting, and diagnostics.

## Advanced Features

- [Multiplexer Integration](multiplexer-integration.md) — Watch subagents work in live tmux or Zellij panes while OpenCode continues running.
- [Codemap Skill](codemap.md) — Generate and maintain repository codemaps for faster codebase understanding.
- [Clonedeps](clonedeps.md) — Clone important dependency source repos into an ignored workspace for deeper agent inspection.

## Development

- [Maintainer Guide](maintainers.md) — Issue triage, support boundaries, and lightweight repository maintenance practices.
- [V2 Workstreams](v2-workstreams.md) — Track V2 branches, worktrees, integration status, and cleanup commands.
- [Background Job Board Lessons](background-job-board-lessons.md) — Notes from hardening task tracking, cancellation, session reuse, and pane cleanup.

## Quick Reference

- Install interactively: `bunx trans-genderian-orchestra@latest install` — see [Installation Guide](installation.md).
- Install non-interactively: `bunx trans-genderian-orchestra@latest install --no-tui --skills=yes`.
- Configure the plugin: edit `~/.config/opencode/trans-genderian-orchestra.jsonc` — see [Configuration Reference](configuration.md).
- Switch presets in OpenCode: run `/preset` to list presets or `/preset <name>` to activate one.
- Use OpenCode Go: install with `--preset=opencode-go`, then run `opencode auth login` and `opencode models --refresh`.
- Enable V2 background mode: start OpenCode with `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true opencode`.
- Watch agents in panes: configure multiplexer support, then start OpenCode with a matching `--port` and `OPENCODE_PORT`.
