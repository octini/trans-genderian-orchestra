---
name: wayfinder
description: Plan a huge chunk of work — more than one agent session can hold — as a shared map of decision tickets on the beads tracker, and resolve them one at a time until the way to the destination is clear.
disable-model-invocation: true
---

# Wayfinder

A loose idea has arrived — too big for one agent session, and wrapped in fog. Wayfinding finds the way from here to the **destination**: chart the route as a **shared map** on the beads tracker, then work its **decision tickets** — questions whose resolution is a decision, not a slice of a build — one at a time until the route is clear.

## Plan, don't do

Wayfinder is **planning** by default: each ticket resolves a decision, and the map is done when the way is clear — nothing left to decide before someone goes and does the thing. Produce decisions, not deliverables.

## Refer by name

Every map and ticket is a beads issue, so it has a **name** — its title. In everything the human reads, refer to it by that name, never by a bare id or number.

## The map

Create one beads issue labelled `wayfinder:map` — the canonical artifact. Its tickets are **child issues** of the map.

**The map body:**

```
## Destination
<what reaching the end of this map looks like — the spec, decision, or change. One or two lines; every session orients to it before choosing a ticket.>

## Notes
<domain; skills every session should consult; standing preferences for this effort>

## Decisions so far
<!-- one line per closed ticket: enough to judge relevance, then zoom the ticket for detail -->
- [<closed ticket title>](bd show <id>) — <one-line gist of the answer>

## Not yet specified
<!-- in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope
<!-- work ruled beyond the destination; closed, never graduates -->
```

**Tickets:** each is a child issue of the map, its body sized to one 100K-token agent session:

```
## Question
<the decision or investigation this ticket resolves>
```

Each ticket carries a `wayfinder:<type>` label — `research`, `prototype`, `grilling`, or `task`. A session **claims** a ticket (`bd update <id> --claim`) **before** any work, so concurrent sessions skip it. Blocking uses beads' native `bd dep add` edges — the frontier is the open, unblocked, unclaimed children.

## Ticket types

- **Research (AFK):** surface a fact a decision waits on from docs/APIs/knowledge bases. Resolved by delegating to **Nas** (`bmad-deep-recon`). Use when knowledge outside the repo is required.
- **Prototype (HITL):** make a cheap, rough, concrete artifact to react to (outline, rough take, stub). Links the prototype as an asset. Use when "how should it look / behave" is the key question.
- **Grilling (HITL):** conversation. The default case. Always invoke the `grilling` skill. Use when a decision needs the user's judgment.
- **Task (HITL or AFK):** manual work that must happen before a decision can be made (provisioning, access, data moves). Resolved when the work is done; the answer records what was done and any resulting facts later tickets depend on.

## Fog of war

Don't chart what you can't yet see. Beyond the live tickets lies the **fog of war** — decisions you can tell are coming but can't yet pin down. Resolving a ticket clears the fog ahead of it, graduating whatever's now specifiable into fresh tickets. The map's **Not yet specified** section holds that dim view.

**Fog or ticket?** The test is whether you can state the question precisely now — not whether you can answer it now. Ticket when the question is sharp (even if blocked); Not-yet-specified when it isn't.

## Out of scope

Work beyond the destination is **out of scope** — not fog, and not in **Not yet specified**. It gets its own **Out of scope** section. Out-of-scope work never graduates — the frontier stops at the destination.

## Invocation

Two modes. Either way, **never resolve more than one ticket per session** — except research tickets.

### Chart the map

1. **Name the destination.** Run a `grilling` session to pin down what this map is finding its way to. The destination fixes scope, so it's settled first.
2. **Map the frontier.** Grill again, **breadth-first**: fan out across the whole space, surfacing the open decisions and first steps takeable now. If this surfaces no fog — the way is already clear and small enough for one session — stop; you don't need a map.
3. **Create the map** (`wayfinder:map`): Destination + Notes filled, Decisions-so-far empty, fog sketched into Not yet specified.
4. **Create the tickets you can specify now** as children of the map, then wire blocking edges in a second pass (`bd dep add`).
5. **Fire the research tickets** — for each, delegate to Nas in parallel, capturing findings back to the ticket.
6. Stop — charting is one session's work; it hand-resolves nothing.

### Work through the map

1. Load the **map** — the low-res view, not every ticket body.
2. Choose the ticket. If the user named one, use it. Otherwise take the first frontier ticket. **Claim it** before any work.
3. Resolve it — zoom into related/closed tickets on demand; invoke the skills the Notes block names. In doubt, use `grilling`.
4. Record the resolution: post the answer as a resolution comment, **close** the issue (`bd close <id>`), and append a context pointer to the map's Decisions so far.
5. Add newly-surfaced tickets (create-then-wire); graduate any fog the answer made specifiable. If the answer reveals a ticket sits beyond the destination, rule it **out of scope** rather than resolving it on the route.
