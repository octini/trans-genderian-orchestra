---
name: bmad-deep-recon
description: Deep research in three modes — draft a deep-research prompt, process a research report, or run in-place with parallel fan-out and claim verification. Read-only: findings as structured reports, never files.
---

# bmad-deep-recon

Deep research for **Nas** — read-only, never touching the codebase. Findings are **structured reports**, never file edits.

## Three modes

### Mode A — Draft a deep-research prompt

Turn a fuzzy research need into a precise deep-research prompt for the host's research tooling: the question, the claim to verify, the sources to trust, and the confidence bar. Hand it to the caller; don't run it yourself.

### Mode B — Process a research report

Given a raw research dump (search results, doc excerpts, fetched pages): verify claims against the sources, rate confidence per claim, and compress to a structured report. Quote the source line for every claim. Split findings into:

- **Established** — multiple independent sources, high confidence
- **Plausible** — single good source or medium confidence
- **Suspect** — weak source, contradiction, or unresolved

### Mode C — Run in-place with parallel fan-out

Run the research yourself: parallel fan-out across subagents/searches for independent sub-questions, then aggregate. Verify every claim before it lands in the report. Six typed packs to fill per report:

1. **Question** — the decision the research serves
2. **Claims** — each stated, with source + confidence stamp
3. **Package legitimacy verdict** (gsd): **OK / SUS / SLOP** for any third-party package — supported, sus, or skippable — with the evidence
4. **Confidence stamp** — overall: high / medium / low, and what would raise it
5. **Gaps** — what remains unknown and how to close it
6. **Answer** — the direct answer to the question, in one paragraph

## Rules

- **Never edit files, never run bash** — read-only recon.
- **Report findings, not raw content**: a `RESEARCH.md`-style path or a structured report back to the caller, never a wall of pasted pages.
- **Claim verification first**: every finding carries its source line + confidence stamp; unverifiable claims go in Gaps.
- **Verdict packages you're asked about** — OK/SUS/SLOP — rather than staying neutral.

Fires when Bernstein or a wayfinder research ticket delegates deep recon.
