# TGO v3 Documentation

This hub collects the current public beta documentation for `trans-genderian-orchestra` v3. The root README is the front door; these pages are the deeper references.

Current repository package version: `3.0.0-beta.1`.

Current setup uses a minimal `~/.config/opencode/opencode.jsonc` plus a TGO-owned peer catalog at `~/.config/opencode/trans-genderian-orchestra.jsonc`. Fresh generated configs write `github-copilot` as the active default and include exactly the `github-copilot` and `opencode-go` primary presets.

## Start Here

- [Architecture](./architecture.md)
- [Agents And Workflows](./agents-and-workflows.md)
- [Setup, Doctor, And Manifests](./setup-doctor-manifests.md)
- [Tools, Skills, And MCPs](./tools-skills-mcps.md)
- [Models, Resilience, And Ensemble](./models-resilience-ensemble.md)
- [Migration And Release](./migration-and-release.md)

## Operational Guides

- [Migration Guide](../MIGRATION.md)
- [Release Guide](../RELEASE.md)

## Validation Commands

```bash
bun test src/index.test.ts src/cli/providers.test.ts src/cli/config-io.test.ts
bun run typecheck
bun run check:ci
bun run build
bun run verify:release-readiness
```

The optional public beta smoke lives at `scripts/verify-public-beta-opencode.ts`; run it only when the npm registry, OpenCode CLI, and model access are available and the published beta should match the local package version.

## Topic Coverage

- Architecture goals, non-goals, and workflow philosophy.
- Deterministic setup foundation, manifests, backups, doctor, config merge, and secret safety.
- Active v3 agent roster and review-loop permissions.
- Workflow contracts, scheduler/worktree planning, and integration flow.
- Tool presets, skills, MCP planning, preservation rules, and CLI detection.
- Models, resilience, ensemble, and councillor derivation.
