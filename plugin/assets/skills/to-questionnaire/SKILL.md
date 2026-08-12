---
name: to-questionnaire
description: Turn a decision you can't fully answer into a questionnaire for someone else to fill in. Use when a decision needs knowledge or judgment from a stakeholder who isn't in the session.
disable-model-invocation: true
---

# To Questionnaire

Turn something you can't answer alone into a **questionnaire** handed to one person (async or over a meeting). They hold knowledge you lack.

**Grill the send, not the subject.** Interview the user only about the *send*:

1. **Who is it going to?** Recipient's role, expertise, relationship → tone + context load.
2. **What do you need back?** The concrete decisions/facts only they can supply.
3. **Write it.** Most-important-first, one idea per question with an answer stub beneath. Write to `to-questionnaire-<slug>.md`, report the path.

```
# <Title>
**Purpose:** <why it exists + the decision riding on it>
**From:** <user> → **To:** <recipient> · **Answers used for:** <where they go>
## Context
One paragraph orienting someone who wasn't in your head.
## How to answer
Deadline + rough effort; partial answers and "I don't know" are useful.
## <Theme>
### <Question>  (one idea per question)
> <answer stub>
## Anything else?
```
