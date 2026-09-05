# Plan

A sequence of work somebody else has to follow. Its job is to be executed
without the author in the room.

## Shape

1. **Context.** Why this is being done, what changes when it is finished. Two
   or three sentences — enough that someone joining halfway can orient.
2. **The steps, in order**, each with an owner and a rough size. Steps are
   verbs.
3. **Dependencies**, stated as which step blocks which. A plan whose steps
   secretly depend on each other is a list.
4. **What could go wrong**, and what you would do instead.
5. **How you will know it worked** — the check, not the intention.

## Rules

- Number the steps. People refer to them by number.
- One outcome per step. "Set up the database and migrate the users" is two,
  and one of them will get lost.
- Say what is *not* in scope. Most disagreement about a plan is disagreement
  about its edges.
- Estimate in ranges, or say you cannot. A single fabricated number is worse
  than "unknown — spike first".
- If sequence genuinely matters, show it: a numbered list is usually enough,
  and a diagram only when steps run in parallel and rejoin (see
  `diagram.md`).
- Do not mark anything complete that has not been verified. A plan that lies
  about its own progress is worse than no plan.

## Common failure

Steps written as topics rather than actions — "Authentication", "Testing".
Nobody can tell when a topic is finished. "Add SAML sign-in for the admin
console" can be done or not done.
