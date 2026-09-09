---
name: api-and-interface-design
description: Design stable interfaces contract-first. Use when making an endpoint/contract/props/schema change — REST or GraphQL endpoints, type contracts, module boundaries, component props.
license: MIT
---

# API and Interface Design

Design interfaces that are hard to misuse. Good interfaces make the right thing easy and the wrong thing hard. This covers REST endpoints, GraphQL schemas, module boundaries, component props, and any surface where one piece of code talks to another.

## Core Principles

### Hyrum's Law

> With a sufficient number of users of an API, all observable behaviors of your system will be depended on by somebody, regardless of what you promise in the contract.

Every observable behavior — quirks, error text, timing, ordering — becomes a de facto contract once users depend on it. Be intentional about what you expose. Never leak implementation details. Plan for deprecation at design time. Tests alone do not save you: "safe" changes still break users who depend on undocumented behavior.

### The One-Version Rule

Never force consumers to choose between parallel versions of the same API. Parallel versions multiply maintenance cost and create diamond dependencies. Extend the one version rather than forking it.

## Process

### 1. Contract First

Define the interface before implementing it. The contract is the spec; implementation follows. Keep one typed contract per surface (endpoint shapes, input/output types, error shape), with server-generated fields marked as such. Define partial-update semantics explicitly (PATCH changes only provided fields; DELETE is idempotent).

### 2. Consistent Error Semantics

Pick one error strategy and apply it everywhere: one structured error body with a machine-readable code plus a human-readable message, and one stable status mapping (400 invalid data, 401 unauthenticated, 403 unauthorized, 404 not found, 409 conflict, 422 semantically invalid, 500 server error without internals). Never mix throwing, null returns, and error envelopes across endpoints.

### 3. Validate at Boundaries

Trust internal code; validate at system edges where external input enters: route handlers, form submissions, third-party responses (always untrusted), environment loading. Validate shape and content before use. Never scatter validation through internal functions that already share type contracts, and never trust data just because it came from your own database without checking the boundary it crossed.

### 4. Prefer Addition Over Modification

Extend without breaking: add optional fields, never change a field type or remove a field. Paginate every list endpoint from the start. Keep naming predictable: plural nouns for REST resources, no verbs in URLs, consistent casing for params and fields, `is/has/can` prefixes for booleans.

## Rationalizations

| Rationalization | Reality |
|---|---|
| "We'll document the API later" | The types are the documentation. Define them first. |
| "We don't need pagination for now" | You will at 100+ items. Add it from the start. |
| "PUT is simpler than PATCH" | PUT demands the full object. PATCH is what clients want. |
| "We'll version when we need to" | Unversioned breaking changes break consumers. Design for extension now. |
| "Nobody uses that undocumented behavior" | Hyrum's Law: observable means depended upon. |
| "We'll maintain two versions" | Two versions multiply cost. Prefer the One-Version Rule. |
| "Internal APIs need no contract" | Internal consumers are still consumers. Contracts enable parallel work. |

## Red Flags

- Endpoints returning different shapes by condition.
- Inconsistent error formats across endpoints.
- Validation scattered through internal code instead of at boundaries.
- Breaking field changes (type changes, removals).
- List endpoints without pagination.
- Verbs in REST URLs (`/api/createTask`).
- Third-party responses used without validation.

## Verification

- [ ] Every endpoint has typed input and output schemas.
- [ ] Errors follow one consistent format.
- [ ] Validation sits at system boundaries only.
- [ ] List endpoints paginate.
- [ ] New fields are additive and optional.
- [ ] Naming follows one convention across endpoints.
- [ ] Contract types ship alongside the implementation.

*Adapted from addyosmani/agent-skills `api-and-interface-design` (MIT License). Upstream: https://github.com/addyosmani/agent-skills*
