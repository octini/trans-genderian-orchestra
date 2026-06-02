# TGO v2 Architecture

## Purpose

TGO v2 is an OpenCode workflow plugin that coordinates specialist agents, durable artifacts, deterministic setup, and reviewer gates. It is designed to make OpenCode sessions more reliable without giving the plugin silent authority over user config or release actions.

## Beta Scope

- Current public package: `2.0.0-beta.2`.
- Current recommended selector: `trans-genderian-orchestra@beta`.
- npm `latest` caveat: `latest` still points to `2.0.0-beta.0` until a non-prerelease version is published.
- The package lives at the repository root after the approved root cutover.

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
- TGO does not start work from startup hooks, timers, compaction hooks, polling, or ready Beads issues without a conversation-triggered action.
- TGO does not bypass Reviewer for behavior-changing work.
- TGO does not store raw API keys, PATs, tokens, or passwords in manifests, generated config, Beads notes, artifacts, or doctor output.

## Package Layout

The active package is the repository root. Archived v1 material remains reference material only and is not active package guidance.

## Namespacing

TGO-managed commands use the `tgo:` namespace where practical. Compatibility aliases exist only where implemented by the plugin command config.

## Global And Project Scope

Global setup handles OpenCode-level plugin/config installation. Project initialization handles Beads, guidance, validation, and local artifact scaffolding. Both flows should preview changes and preserve user-owned config.

## Retained V1 Ideas

- Dispatcher-oriented workflows.
- Specialist roles.
- Permission/path-gating concepts.
- Council-style escalation.
- Rich public documentation style.

## Explicit V1 Changes

- V2 replaces v1/omo-slim instead of running side by side.
- The active package is no longer a nested v2 subdirectory.
- Planner responsibilities are folded into orchestrator phase control rather than a permanent Planner role.
- Runtime claims are limited to implemented beta behavior.

## Spec Coverage

- Spec 00: architecture goals, non-goals, artifact model, and workflow philosophy.
- Spec 07: implementation phase order, validation gates, and beta release hardening.
