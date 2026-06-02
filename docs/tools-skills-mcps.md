# Tools, Skills, And MCPs

## Tool Presets

- `bare-bones`: minimal managed tool planning.
- `default`: recommended balanced tool preset for normal beta validation.
- `all-bells`: broader managed tool planning for users who opt into more integrations.

Tool preset changes must not silently change model or resilience presets.

## Bundled Plugin Planning

TGO setup can plan related OpenCode plugins where implemented, but it must preserve user-managed plugins and avoid treating the plugin as a general-purpose package manager.

## Skill Policy

Skills are part of the workflow surface. TGO should preserve user-managed skills and only manage entries it owns or the user explicitly adopts.

## MCP Intent

The design includes integrations for documentation lookup, AFT/code intelligence, web search, GitHub operations, grep_app search, and Serena-style code navigation where available. Public docs should explain intent without claiming every external service is always installed or authenticated.

## User-Managed Preservation

Existing providers, plugins, MCPs, skills, agents, and custom config are user-owned by default.

## Permissions

MCP/tool permissions should be explicit and bounded. Generated config should avoid broad mutation authority unless the user chooses it.

## Required CLI Detection

Doctor and setup can warn about missing CLIs required for a selected preset. Missing optional tools should be warnings with next steps, not silent destructive repair.

## Spec Coverage

- Spec 05: tool presets, integrations, skills, MCP planning, preservation rules, and CLI detection.
