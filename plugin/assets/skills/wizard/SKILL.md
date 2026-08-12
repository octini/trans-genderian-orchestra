---
name: wizard
description: Generate an interactive bash wizard that walks a human through steps only they can perform (provisioning, credentials, CI secrets, unfamiliar dashboards, one-off migrations). Don't use for steps the agent can do itself.
---

# Wizard

A **wizard** is a bash script that walks a human through a tedious manual procedure step by step: opens each URL, says what to click and copy, captures values, writes them where they belong (`.env`, GitHub secrets), confirms at each stage. Ephemeral by default — commit only for a repeatable setup path.

## Process

1. **Scope.** Read the repo first: `.env*`, `README`, `docker-compose*`, `.github/workflows/*` (every `secrets.*`/`vars.*` is a value the wizard must produce). Confirm the ordered stages + each value's source, destination, secrecy.
2. **Map each stage.** Exact path per stage: URL → click → copy → variable. Never invent steps.
3. **Author it.** One `stage` per step in order; helpers for URL-opening, secret entry, `.env` upsert, CI secret writes, confirm-before-irreversible. Set `TOTAL_STAGES`.
4. **Verify, don't run.** `bash -n` + `shellcheck`; trace statically — every value lands where scoped, every secret matches a CI reference. Never run end-to-end (it opens browsers + blocks on input).

Fires when a wayfinder Task ticket or setup hits "steps only the human can perform." Advisory only.
