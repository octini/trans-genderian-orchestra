# TGO v2 Documentation

This hub collects the current public beta documentation for `trans-genderian-orchestra` v2. The root README is the front door; these pages are the deeper references.

## Start Here

- [Architecture](./architecture.md)
- [Agents And Workflows](./agents-and-workflows.md)
- [Setup, Doctor, And Manifests](./setup-doctor-manifests.md)
- [Tools, Skills, And MCPs](./tools-skills-mcps.md)
- [Models, Resilience, And Council](./models-resilience-council.md)
- [Migration And Release](./migration-and-release.md)

## Operational Guides

- [Migration Guide](../MIGRATION.md)
- [Release Guide](../RELEASE.md)

## Validation Commands

```bash
bun test src/release/docs.test.ts src/release/release-readiness.test.ts src/release/repository-layout.test.ts
bun run typecheck
bun run check:ci
bun run verify:release-readiness
```

`bun run verify:public-beta-opencode` is available for public beta smoke testing, but it depends on a usable OpenCode/network/model environment.

## Spec Coverage Map

- Spec 00: umbrella architecture and workflow philosophy.
- Spec 01: deterministic setup foundation.
- Spec 02: agent roster and permissions.
- Spec 03: workflow contracts and artifacts.
- Spec 04: scheduler, worktrees, and integration flow.
- Spec 05: tools, skills, MCPs, and integrations.
- Spec 06: models, resilience, and council derivation.
- Spec 07: implementation phases and validation gates.
