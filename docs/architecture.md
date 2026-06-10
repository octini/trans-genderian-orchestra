# TGO v3 Architecture

## Purpose

TGO v3 is an OpenCode workflow plugin that coordinates specialist agents, a structured review loop, and deterministic setup. It is built on oh-my-opencode-slim v2-beta.15 as its foundation, with a restructured agent roster and a review panel workflow. It is designed to make OpenCode sessions more reliable without giving the plugin silent authority over user config or release actions.

## Beta Scope

- Current public package: `3.0.0-beta.1`.
- Foundation: oh-my-opencode-slim v2-beta.15 with restructured agent roster.
- The package lives at the repository root.

## Core Goals

- Preserve exact user intent across handoffs.
- Retrieve/read before reasoning.
- Use SDD-inspired phases as workflow states.
- Keep setup deterministic, reversible, previewed, backed up, and secret-safe.
- Preserve user-owned OpenCode config.
- Require explicit approval for destructive or release actions.

## Non-Goals

- TGO is not a general-purpose package manager.
- TGO does not silently remove or overwrite user-managed tools, skills, plugins, MCPs, providers, or config.
- TGO does not start work from startup hooks, timers, compaction hooks, polling, or ready issues without a conversation-triggered action.
- TGO does not bypass the review loop for implementation work.
- TGO does not store raw API keys, PATs, tokens, or passwords in config or generated output.

## Package Layout

The active package is the repository root. Archived v1 material remains reference material only and is not active package guidance.

## Namespacing

TGO-managed commands use the `tgo:` namespace where practical. Compatibility aliases exist only where implemented by the plugin command config.

## Global And Project Scope

Global setup handles OpenCode-level plugin/config installation. Project initialization handles Beads, guidance, validation, and local artifact scaffolding. Both flows should preview changes and preserve user-owned config.

Bootstrap keeps required OpenCode entries minimal in `~/.config/opencode/opencode.jsonc` and writes generated TGO agent/model catalog data to `~/.config/opencode/trans-genderian-orchestra.jsonc`. The peer catalog is TGO-owned state, not an OpenCode schema include.

## Retained omo-slim Ideas

- Dispatcher-oriented workflows.
- Specialist roles.
- Permission concepts.
- Ensemble-style consensus.
- Rich public documentation style.

## Explicit V3 Changes

- V3 replaces the previous TGO v2 plugin entirely.
- The agent roster is restructured: conductor, scribe, composer, principal, ensemble, councillor.
- Scribe absorbs explorer + librarian (codebase exploration + external research).
- Composer absorbs designer + fixer (implementation + UI/UX).
- Principal absorbs oracle + reviewer (strategic advice + verification).
- Ensemble replaces council as the multi-model consensus engine and review panel.
- A structured review loop is added: composer → ensemble → principal → max 3 cycles.
- The conductor is a pure technical lead/coordinator that delegates all implementation work.

## Spec Coverage

- Spec 00: architecture goals, non-goals, artifact model, and workflow philosophy.
- Spec 07: implementation phase order, validation gates, and beta release hardening.
