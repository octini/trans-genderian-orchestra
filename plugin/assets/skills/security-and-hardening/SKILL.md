---
name: security-and-hardening
description: Security gate for auth, untrusted input, PII, external URLs, and LLM tool output. Use when adding login/session logic, validating input, storing PII, fetching external URLs, or passing model output to code, shell, or DOM.
license: MIT
---

# Security and Hardening

Threat-model first, then harden. External input is hostile, secrets are sacred, authZ checks are mandatory. A pre-merge gate for code touching user data, auth, or external systems — not a general review.

## When To Use

Gate changes that add login/session logic, validate untrusted input, store or transmit PII, fetch external URLs (webhooks, import-from-URL, previews), add third-party integrations, or pass LLM output into code, SQL, shell, paths, or DOM. Skip pure internal refactors with no boundary crossing.

## Process

### 1. Threat Model (five minutes)

1. **Boundaries:** where does untrusted data enter? Requests, forms, uploads, webhooks, third-party APIs, queues, **LLM output**, plus OS-handed values that look internal (env, command lines, shared-volume paths). Trust follows who *wrote* the value, not the channel.
2. **Assets:** credentials, PII, payment data, admin actions, money movement.
3. **STRIDE each boundary:** Spoofing (auth?), Tampering (integrity?), Repudiation (audit log?), Disclosure (field allowlists, generic errors?), DoS (rate limit, size caps, timeouts?), Elevation (authZ, least privilege?).
4. **Abuse cases next to use cases** — "how would I misuse this?" is the first test. Unnamed boundaries = not ready (OWASP A04).

### 2. Three Tiers

**Always:** schema-validate input at the boundary; parameterize queries; framework auto-escaping (never `innerHTML`/`eval` on user data); HTTPS; password hashing (bcrypt/scrypt/argon2); security headers (CSP, HSTS); httpOnly + secure + sameSite cookies; native audit on the committed lockfile pre-release.

**Ask first:** new/changed auth flows; new PII/payment storage; new integrations; CORS changes; uploads; rate-limit changes; elevated roles.

**Never:** commit or log secrets; trust client validation as a boundary; disable headers; localStorage auth tokens; stack traces to users.

### 3. Key Patterns

- **AuthZ everywhere:** authenticate, then check ownership (`ownerId !== user.id → 403`); admin actions verify admin role.
- **SSRF:** user-influenced server fetches allowlist `https` + host, reject private/reserved IPs on all resolved records, forbid redirects.
- **LLM output is input:** parse defensively (schema), validate, encode (`textContent`, never `innerHTML`); no secrets or cross-tenant data in prompts; scope tools, confirm destructive actions; cap tokens/rate/loops.
- **Destructive paths:** resolve symlinks, then require allowlisted root + below-root depth + ownership evidence read before the op. On refusal log and stop — never fall back broader.
- **Secrets:** `.env` never committed; check `git diff --cached` pre-commit. Committed = compromised: rotate first, purge second.
- **Limits:** shared-store rate limits on auth (per-process memory multiplies by instance); PII minimized to a stated purpose with retention + deletion path.

## Rationalizations

| Rationalization | Reality |
|---|---|
| "Internal tool, skip it" | Attackers target the weakest link. |
| "Framework handles it" | Frameworks give tools, not guarantees. |
| "Just LLM text" | That text can be SQL, a script tag, or a shell command. |
| "Audit passed, safe" | Audits match known advisories only. |

## Red Flags

Input in queries/shell/HTML; endpoints without authZ; wildcard CORS; secrets in code/logs; unallowlisted server fetches; shape-check-only destructive paths; model output as code; PII with no purpose/retention/deletion.

## Verification

- [ ] Boundaries named; STRIDE + abuse cases recorded.
- [ ] Input validated at boundaries; queries parameterized; output encoded.
- [ ] Auth + authZ per protected endpoint; headers on; errors generic.
- [ ] URL fetches allowlisted; destructive paths triple-checked.
- [ ] No secrets in code/history; PII minimized with deletion path.
- [ ] Audit clean of reachable critical/high; auth rate-limited (shared store).

*Adapted from addyosmani/agent-skills `security-and-hardening` (MIT License). Upstream: https://github.com/addyosmani/agent-skills*
