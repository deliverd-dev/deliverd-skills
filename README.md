# Deliverd skills

Open-source [agent skills](https://code.claude.com/docs) for Claude Code,
Codex and Cursor. MIT licensed, no dependencies, no account needed.

| Skill | What it does |
|---|---|
| [`approval`](./skills/approval) | Stop and ask a person before anything consequential: when to ask, how to write a request someone can decide from a phone, and how to act on the answer |
| [`ethics`](./skills/ethics) | Notice when work could harm or wrong a person, and put that concern in front of whoever decides — never around them |
| [`artifact`](./skills/artifact) | Build a beautiful, self-contained HTML report, dashboard, diagram, executive summary, plan or prototype — then offer to publish it |

### Install all three, with the Deliverd MCP server (Claude Code)

```bash
claude plugin marketplace add deliverd-dev/deliverd-skills
claude plugin install deliverd@deliverd
```

Or one skill at a time, for any agent, as below.

## approval

An agent that asks about everything gets ignored, and one that asks about
nothing gets switched off after its first mistake. This skill tells an agent
when to stop: anything irreversible, external, costly, privileged or outside
the brief. It also covers how to write a request a busy person can decide
from a phone: the action as the title, the reason, the evidence, an honest
risk, and the exact arguments that will run.

It then covers acting on the answer. An approved request runs with the
approved values, including any correction the approver made. A rejection is
not asked again in different words. A refusal by an organisation's policy is
an answer, not an error. And the agent never approves itself.

### Install

```bash
npx skills add deliverd-dev/deliverd-skills --skill approval
```

It works in plain conversation with no account: the agent asks you in chat, in
the same structured shape, and waits for an explicit yes. With
[Deliverd](https://deliverd.dev) connected, through the MCP server, the
TypeScript or Python SDK, or the CLI, the request goes to the right person's
email, Slack, Teams or phone. They can approve, reject, correct a value or ask
a question, and every step is recorded.

## ethics

Most harm an agent does is not malice but momentum: a shortlist that quietly
filters out career gaps, a debt letter sent in a person's name, a record
deleted that could not come back. This skill gives the agent seven principles
to check its work against: fairness, privacy, safety, honesty, autonomy,
wellbeing and legality. When one applies, it doesn't decide on its own that
the concern is fine. It stops and puts the concern to a person, as a question
they can answer.

It also covers the other side. When an organisation's own ethics rules flag
or refuse a request, the agent never rewords, splits or reroutes the work to
get past them, and a refusal is treated as an answer. And when an
administrator asks for help writing those rules, the agent drafts rules that
match on what an agent cannot word its way around, not on keywords alone.

It only ever adds oversight. Nothing in it makes anything easier to approve.

### Install

```bash
npx skills add deliverd-dev/deliverd-skills --skill ethics
```

It works with no account: the agent raises the concern in the conversation
and waits for your answer. It pairs with `approval`, which covers how a
request is written and sent. With [Deliverd](https://deliverd.dev) connected,
the concern reaches the approver's email, Slack, Teams or phone as part of
the request, beside any concern the organisation's own rules add.

## artifact

Ask an agent for a report and you usually get one of two things: markdown in
the chat window, or an HTML file with a purple gradient, three accent colours,
an emoji in every heading and a table that scrolls the whole page sideways on
a phone.

This skill gives the agent a method — decide the form from what the reader has
to *do*, lead with the conclusion, then build it as one self-contained file —
and craft rules specific enough to act on: one typeface, one accent, one
spacing unit, a 68-character measure, tabular figures, dark mode, print styles,
and a checklist to run before it calls the work done.

### Install

```bash
npx skills add deliverd-dev/deliverd-skills --skill artifact
```

Or by hand — the skill is one directory, and every agent reads the same
format:

```bash
mkdir -p ~/.agents/skills
git clone --depth 1 https://github.com/deliverd-dev/deliverd-skills /tmp/deliverd-skills
cp -r /tmp/deliverd-skills/skills/artifact ~/.agents/skills/artifact
```

| Agent | Reads |
|---|---|
| Claude Code | `.claude/skills/`, `~/.claude/skills/` |
| Codex | `.codex/skills/`, `~/.codex/skills/` |
| Cursor | `.agents/skills/`, `.cursor/skills/`, and both of the above |

For one project rather than every project, put it in `.agents/skills/artifact`
inside that repository instead.

Then just ask for what you want: *"write this up as a report"*, *"turn these
numbers into a dashboard"*, *"mock this screen up so I can click it"*.

### What's inside

| File | |
|---|---|
| `SKILL.md` | The method, and the rules that are not negotiable |
| `references/craft.md` | Typography, colour, space, print, accessibility |
| `references/platform-limits.md` | What a hosted artifact may contain |
| `references/report.md` and five siblings | One playbook per artifact type |
| `examples/report.html` | A complete artifact, to copy the shape from |
| `examples/reference-architecture.html` | An interactive diagram: pan, zoom, inspect, trace |

The agent reads `SKILL.md` and pulls in only the reference it needs, so a short
request does not drag six documents into context.

### Publishing

The last step is optional and stands apart from the rest: once the artifact
exists, the agent offers to publish it to a URL behind your organisation's
sign-in, using [Deliverd](https://deliverd.dev).

Everything before that step works with no account, no token and no network —
and if Deliverd is not configured, the skill says so once, in one line, and
stops. The file is the deliverable either way. That is deliberate: a skill
that is useless without a subscription is an advertisement, and nobody should
install one of those.

If you do want it, connecting is one command — see
[deliverd.dev/claude-code](https://deliverd.dev/claude-code),
[/codex](https://deliverd.dev/codex), [/cursor](https://deliverd.dev/cursor)
or [/chatgpt](https://deliverd.dev/chatgpt).

## Contributing

The playbooks are opinions, and better opinions are welcome. Two things to
know before opening a pull request:

- **`references/platform-limits.md` describes real behaviour**, not policy.
  Several of its rules exist because breaking them fails *silently* rather
  than loudly — a CDN script from an unlisted host publishes with only a
  warning and then renders blank. Check a claim against the behaviour before
  changing it; a plausible edit is exactly how that file goes wrong.
- **`skills/approval` and `skills/ethics` name real tools, fields and rules.** Each one is
  checked against the Deliverd code, so a rename there fails a test before
  this skill teaches a call that no longer exists. Suggest wording and
  judgement changes freely; for anything that names an API, say what you
  checked it against.
- **`examples/` is verified, not decorative.** Every example is run through
  the same secret scanner, external-reference analyser and heuristic scanner
  that a real publish uses. An example containing a CDN `<script src>` or an
  invented-but-realistic API key fails that check, by design. That test lives
  in the Deliverd repository, because the scanners it calls do.

## Licence

MIT. See [`LICENSE`](./LICENSE).
