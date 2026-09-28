# Jev, from typesafe.ai, beside Deliverd

Jev is a decision model. It answers typed questions about a piece of state with
calibrated probabilities, in about a second, for a fraction of a cent. An agent
built on it can settle the routine case without a person. What it cannot do is
settle the rest — and every harness that adopts it inherits a branch for
exactly that, with nowhere to send it.

This document is about that branch. Deliverd is where it goes.

## What Jev is, and is not

**A decision model, never a text generator.** `POST /v1/systemone` takes a
`state` — text or JSON — and named questions of three types, and returns one
answer per question with the `model` that answered and token usage:

| Question | Built with | Comes back as |
|---|---|---|
| Yes or no | `noul(instructions, { true, false })` | `{ noul: p }`, the probability of yes |
| One of several labels | `choice(instructions, { label: description })` | `{ choice, confidence, probabilities }` |
| A point on an ordered rubric | `score(instructions, [level0, level1, …])` | `{ score, confidence, legend, probabilities }` |

The official SDKs are `@typesafe-ai/sdk` on npm (Node 20 or newer; ten-second
timeout, two retries by default) and `typesafe-sdk` on PyPI. The package named
`typesafe-ai` on PyPI is **not** the SDK: it is a shim registered defensively
against the name being squatted, and it does nothing.

**Generally available.** The waitlist is gone; a key is issued on sign-up. The
SDK still ships no mock, which is what shapes the example below: it has to be
runnable by somebody who has not signed up for anything.

**What it is good at, in Deliverd's terms.** A question over agent-supplied
content — a shell command, a refund note, a draft email — that a schema cannot
answer. Policy can compare `amount` to a threshold; it cannot read
`customer_note` and decide whether it mentions a solicitor. Jev can.

## The division of labour

Jev settles the routine case. Deliverd gets a person for the rest. The
organisation's policy governs both, because the request a person sees passes
through the same standing rules every approval does.

The Jev ecosystem already writes the seam. `jev-use`, the Claude Code and
Codex plugin that routes steps through the model, describes an **escalation
contract**: a verdict Jev cannot settle comes back with `escalate: true` and
a typed reason. Every harness built on it therefore has a branch that reads
"a person has to look at this", and the branch is usually a log line. It
should be an ask.

```
agent proposes a step
  → Jev: is this routine?
      → confidently yes  → run it
      → anything else    → deliverd.approve()  → a person decides → run it, or not
```

Two things are true about that shape and both are the point:

- **Jev's answer never approves anything.** It is evidence on the page the
  approver reads. A person reading "62% chance this is destructive" is making a
  better decision than one reading nothing.
- **Fail closed.** No key, a timeout, an error from the API: the step goes to a
  person. A step nobody judged is a step a person judges. That is also what
  lets the example run with no key at all.

## Connecting the agent to Deliverd

**Jev connects to nothing here.** Your agent calls Jev under your key; when a
verdict comes back `escalate: true`, your agent calls Deliverd. There is no
Deliverd connector for Jev, no MCP entry and no install path for it, because
nothing about Jev ever reaches us — see [what Deliverd does with Jev's
data](#what-deliverd-does-with-jevs-data-nothing).

What connects is whatever the harness *is*, and there are two shapes of that.

**A program you wrote** — the example below, or any harness calling the
TypeSafe SDK itself. It holds a `dlv_` key from Settings → API tokens and talks
to Deliverd over the SDK:

```bash
npm install @deliverd/sdk      # or: pip install deliverd
export DELIVERD_API_KEY=dlv_...
```

`deliverd.approve()` then blocks until somebody answers, which is what makes
the escalation branch a single call rather than a queue you have to build.

**`jev-use` inside Claude Code or Codex.** Here the harness already is an MCP
client, so it connects the ordinary way:

```bash
claude mcp add --transport http deliverd https://deliverd.dev/api/mcp
```

Every other client — Codex, Cursor, VS Code, Windsurf, Gemini CLI, ChatGPT,
Claude desktop and web — is in [mcp-setup.md](./mcp-setup.md); OAuth means no
token is pasted. The escalation branch then calls the `request_approval` tool
instead of `deliverd.approve()`. Same request, same page, same audit trail.

**Issue the key to an agent, not to a person.** A `dlv_` key can be bound to an
agent identity, and then the request says which agent raised it rather than
which employee's key it borrowed. It also puts the harness on the right side of
the rule that matters here: an agent may not decide anything, and may not
approve its own request — refused at the service, whichever route the request
came in by. A harness running under a person's key is a harness that looks, to
every surface, like that person.

## The runnable example

[`examples/jev-escalation/`](../examples/jev-escalation) is a working program
in the shape of the other three: it installs both SDKs from their registries,
runs with neither key, and finishes in under a minute.

```bash
cd examples/jev-escalation && npm install && npm start
```

It asks Jev two questions about a shell command — a `noul` for *would this
destroy something* with both outcomes described, and a `score` for severity on
a five-point rubric — and branches on two thresholds:

```js
const ROUTINE_BELOW = 0.2;     // P(destructive) must be under this
const CONFIDENCE_FLOOR = 0.8;  // and the severity answer at least this confident
```

**Read those as policy, not as facts.** There is no correct value of
`ROUTINE_BELOW`. A one-in-five chance of destroying something is not routine for
most organisations and is far too cautious for a sandbox. The example's job is
to put the choice in one place with a name, so that whoever changes it is
changing a sentence about risk appetite rather than a magic number.

When the step escalates, Jev's numbers go on the page as `factors`, and `risk`
is derived from the severity score — so an administrator's standing rule
("anything critical needs two approvers") applies to Jev-escalated requests
without the harness knowing the rule exists.

Without `TYPESAFE_API_KEY` the model is not asked and every step escalates;
`DEMO_JEV=routine` makes an imaginary Jev confident, the way `DEMO_OUTCOME`
makes the imaginary approver decide. That is the whole reason it can run
keyless: **the imaginary model's default answer is no answer**, and no answer
goes to a person.

### Confirming it still works

Everything above is a claim about somebody else's API, and nothing can check it
without a key — a unit test that mocked the call would only prove the mock. So
the check is a command instead, short enough to actually be run:

```bash
cd examples/jev-escalation && npm install
TYPESAFE_API_KEY=... npm run verify
```

It asks Jev about two steps whose answers are not in doubt — `DROP DATABASE
production` and `ls -la` — and checks eleven things: that the response carries
the model and its token usage, that a `noul` comes back as a probability
between zero and one, that a `score` carries a confidence, a legend and a
probability per level, that a `choice` returns one of its own labels, that the
destructive command reads as destructive and the harmless one does not, and
that the example's two thresholds would consequently send the first to a
person and let the second through.

The last group is the part a schema check cannot make. A model returning
well-formed numbers unrelated to the question would satisfy every type in this
document and fail those three.

**Run it before you rely on the integration**, and run it again when TypeSafe
ships a new `jev-latest`. The script never writes the key
anywhere; if you pasted one somewhere to obtain it, treat it as disclosed and
rotate it.

## The gate variant

`approve()` is the right primitive for the example because it mirrors the
escalation contract one to one and needs nothing registered. Once an
organisation has an [action registry](./api.md#the-gate), the same harness can
carry Jev's answers in as **input fields** and let policy tighten on them.

Register the action with Jev's two answers in its schema. Both types are ones
the registry's schema subset accepts:

```json
{
  "actionId": "agent.run_step",
  "name": "Run a step the planner proposed",
  "inputSchema": {
    "type": "object",
    "properties": {
      "command": { "type": "string", "maxLength": 2000 },
      "jev_destructive": { "type": "number", "minimum": 0, "maximum": 1 },
      "jev_severity": { "type": "integer", "minimum": 0, "maximum": 4 }
    },
    "required": ["command", "jev_destructive", "jev_severity"]
  },
  "editableFields": [],
  "riskCategory": "infrastructure",
  "defaultRisk": "high"
}
```

Then call `gate()` with the answers, rounded to what the schema declares, and
write rules that make a request **harder** when Jev is worried:

```json
{
  "name": "Steps Jev is worried about",
  "rules": [
    {
      "name": "Probably destructive: two people",
      "priority": 10,
      "effect": "require_human",
      "match": {
        "actions": ["agent.run_step"],
        "input": { "jev_destructive": { "gte": 0.3 } }
      },
      "params": { "requiredApprovals": 2 },
      "explanation": "Jev put the chance of data loss at 30% or more."
    },
    {
      "name": "Severe: platform leads",
      "priority": 20,
      "effect": "require_human",
      "match": {
        "actions": ["agent.run_step"],
        "input": { "jev_severity": { "gte": 3 } }
      },
      "params": { "approvers": ["platform-leads"] },
      "explanation": "Worst plausible outcome is data loss or worse."
    }
  ]
}
```

And now the sentence the whole document turns on.

**An answer the agent carried in is a fact the agent chose.** `jev_destructive`
arrived in the request body. Deliverd did not compute it; the harness did, from
a call the harness made, and a harness that wanted to could have written `0.01`
without asking anyone. So a rule over it may only ever make a request harder —
which is the rule Deliverd's [agent policy](./api.md#agent-policy) already
applies to `risk`, for the same reason: *"A rule can only make a request
harder."*

Concretely: **write no `allow` rule keyed on a `jev_` field.** A rule that says
"if Jev thinks it is safe, skip the person" is the auto-approve-on-`risk`
mistake with a model in the middle. The two rules above tighten; the default
when nothing matches is still a person; and nothing loosens.

Everything else the gate gives you applies unchanged — the recorded decision
with the answers in it, the autonomy rate, the evidence pack
naming the rule that fired — and the decision is advisory in exactly the way
[api.md](./api.md#the-gate) describes.

## What Deliverd does with Jev's data: nothing

Deliverd never calls TypeSafe. It holds no TypeSafe key, contains no TypeSafe
client, and TypeSafe is not one of its subprocessors.

The `state` — the command, the note, the draft — goes from *your* agent to
TypeSafe under *your* key and *their* terms. What reaches Deliverd is the
number you chose to put on the page or in the input. If the state is something
your organisation would not send to a third party, that is a decision to make
in the harness, and this document's position is that Deliverd should not make
it for you by making the call itself.

## What not to do

- **Do not let Jev approve.** Not by threshold and not by confidence. A model's
  confidence is a claim about the model, and the gate's whole reason to exist is
  that the question of *who may decide* belongs to the organisation.
- **Do not skip the person on confidence alone.** Confidence is how sure Jev is
  of its answer, not how safe the step is. A model can be very sure a step is
  severity four.
- **Do not read "0% structured-output error" as a claim about judgement.** It
  is a claim about format: the answer is always a well-formed probability. Ask
  the wrong question and the well-formed answer is to the wrong question.
- **Do not send `state` you would not send anywhere else.** The example sends
  a shell command. A refund note with a customer's name in it is a different
  decision, and yours.
