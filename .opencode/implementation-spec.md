# Dispatcher Plugin Critical Fixes - Implementation Status

Status: ✅ Implemented. The critical fixes below have been applied, along with startup initialization and path-gating work needed for the current Dispatcher state.

## Fix 1: Orchestrator Permissions (src/agents/index.ts)
- Status: ✅ Implemented
- Change orchestrator from `READ_BASH_TOOL_PERMISSIONS` to new `ORCHESTRATOR_TOOL_PERMISSIONS`
- Add `task: 'allow'` (was missing — this blocked delegation!)
- Remove `bash: 'allow'`
- Keep read/glob/grep/list/ast_grep_search/lsp for coordination file access

## Fix 2: Deep-merge permissions (src/index.ts ~442-463)
- Status: ✅ Implemented
- In config() hook, the shallow merge `{ ...pluginAgent, ...existing }` overwrites `permission` object
- Change to deep-merge `permission`: spread both permission objects together

## Fix 3: Default models with fallbacks (src/config/constants.ts + src/agents/index.ts)
- Status: ✅ Implemented
- Add DEFAULT_AGENT_OVERRIDES constant with user's model preferences including variants and fallback chains
- orchestrator: opencode-go/kimi-k2.6 → google/antigravity-claude-opus-4-6-thinking (max) → nvidia/z-ai/glm-5.1
- planner: github-copilot/gpt-5.5 (xhigh) → github-copilot/claude-opus-4.7 (max) → nvidia/z-ai/glm-5.1
- researcher: github-copilot/gemini-3.5-flash (high) → github-copilot/gpt-5.5 (xhigh) → github-copilot/claude-opus-4.7 (max)
- reviewer: github-copilot/claude-opus-4.7 (max) → github-copilot/gpt-5.5 (xhigh) → nvidia/z-ai/glm-5.1
- council: opencode-go/kimi-k2.6
- councillor: github-copilot/gpt-5.5 (xhigh) → github-copilot/claude-opus-4.7 (max) → github-copilot/gemini-3.5-flash (high)
- In createAgents(), apply default overrides BEFORE user overrides

## Fix 4: Prompt fixes (src/agents/orchestrator.ts)
- Status: ✅ Implemented
- Remove "do it yourself" language
- Remove "direct-to-builder" path language
- Change to "delegate every task to appropriate specialist"
- Tighten Context Isolation section

## Fix 5: Session tracking (src/index.ts ~781-791)
- Status: ✅ Implemented
- In session.created event, map child session IDs to agent names in GLOBAL_SESSION_AGENT_MAP
- Use resolveRuntimeAgentName() for name resolution

## Fix 6: Error surfacing (src/index.ts)
- Status: ✅ Implemented
- In pre-tool hook try/catch, inject error messages into output so they're visible

## Fix 7: Dynamic AGENT_NAME_SET (src/hooks/task-session-manager/index.ts)
- Status: ✅ Implemented
- Replace hardcoded AGENT_NAME_SET with getEnabledAgentNames(config)
- Pass config to task session manager hook

## Startup Init Feature
- Status: ✅ Implemented
- Environment audit checks git, Beads, and skills availability.
- `/init` initializes git and seeds AGENTS.md from `templates/AGENTS.md`.
- `/beads:init` initializes local Beads tracking.
- `/setup-skills` executes the skills installer hook.

## Path Gating
- Status: ✅ Implemented
- `src/hooks/path-gating/` enforces per-agent write/edit boundaries.
- Config-level `agentGating` overrides are supported by the plugin schema/loader.
- The hook is wired through the plugin entry point and covered by tests.

## Remaining Follow-Up
- Live end-to-end OpenCode smoke test.
- GitHub remote/CI setup.
- Release artifact/package validation.
