# Deliverd skills

Open-source [agent skills](https://code.claude.com/docs) for Claude Code,
Codex and Cursor, plus runnable examples and developer docs for
[Deliverd](https://deliverd.dev), the human layer for AI agents. MIT licensed,
no dependencies, no account needed.

| Folder | What's in it |
|---|---|
| [`skills/`](./skills) | The nine agent skills below |
| [`examples/`](./examples) | Four small programs — a deployment gate, a purchase approval, a report sign-off and a Jev escalation — that run with no account and no keys |
| [`docs/`](./docs) | How to use Deliverd from code: the REST API, CLI, MCP setup, CI, single sign-on, Slack and Teams, SharePoint and Jev |

The full documentation is at [deliverd.dev/docs](https://deliverd.dev/docs).

| Skill | What it does |
|---|---|
| [`approval`](./skills/approval) | Stop and ask a person before anything consequential: when to ask, how to write a request someone can decide from a phone, and how to act on the answer |
| [`ethics`](./skills/ethics) | Notice when work could harm or wrong a person, and put that concern in front of whoever decides — never around them |
| [`artifact`](./skills/artifact) | Build a beautiful, self-contained HTML report, dashboard, diagram, executive summary, plan or prototype — then offer to publish it |
| [`tasks`](./skills/tasks) | Keep long work aimed at its goal: state the objective, keep a short working state, branch a problem into a side task and bring its result back, and leave decisions to a person |
| [`compliance`](./skills/compliance) | Do AI work under an organisation's governance: describe the work, meet its controls with real evidence and eval results, ask the gate before acting, report incidents, and leave every judgement about its own oversight to a person |
| [`screen`](./skills/screen) | Check text for personal data, secrets and confidential terms before it goes to a model, and redact what should not go, locally with Deliverd Screen and no account |
| [`prompts`](./skills/prompts) | Use the organisation's approved prompts instead of your own words when one fits, check what they produce against their limitations, and draft words that worked for a person to approve |
| [`policy`](./skills/policy) | Help a person write the rules that decide what agents may do alone, what goes to a person and what is refused, as policy files with tests, replayed against past decisions and checked in CI |
| [`checkpoint`](./skills/checkpoint) | Put the approval step on the path to a consequential action, in the system an agent runs in, rather than leaving it to the agent: MCP gateway, a gate in code, signed decision tokens, CI |

### Install all nine, with the Deliverd MCP server (Claude Code)

```bash
claude plugin marketplace add deliverd-dev/deliverd-skills
claude plugin install deliverd@deliverd
```

The plugin also adds three commands:

| Command | Does |
|---|---|
| `/deliverd:publish` | Publish an HTML page to a persistent, secure URL, asking who should see it |
| `/deliverd:ask` | Ask a person to approve something, wait for the answer and act on it |
| `/deliverd:status` | Who you are signed in as, and the workspaces you can publish to |

Already installed? `claude plugin marketplace update deliverd`, then `claude plugin update deliverd@deliverd`.

### Grok and Cursor

This repository is also a plugin for Grok (Grok Build and Grok Bot) and for
Cursor: [`.grok-plugin/plugin.json`](./.grok-plugin/plugin.json) and
[`.cursor-plugin/plugin.json`](./.cursor-plugin/plugin.json) bundle the same
MCP server, skills and commands as the Claude Code plugin. In Grok Build, open
`/plugin` and pick Deliverd; in Grok Bot or Cursor, add it from the plugin
marketplace.

- **Network:** the plugin talks only to `https://deliverd.dev/api/mcp`.
- **Credentials:** none to paste. The MCP server signs you in with OAuth 2.1
  in the browser on first use; a free account works.
- **No hooks, no local code:** the skills and commands are Markdown.

### Muse Code

It is a plugin for Muse Code, Meta's coding agent, too:
[`.muse-plugin/plugin.json`](./.muse-plugin/plugin.json) bundles the MCP
server and the nine skills. Muse Code's plugins are behind a flag for now:

```bash
export MUSE_EXPERIMENTAL_PLUGINS=1
muse plugins marketplace add deliverd https://github.com/deliverd-dev/deliverd-skills
muse plugins install deliverd@deliverd
muse plugins approve deliverd
muse mcp login deliverd
```

Without the flag, `npx deliverd setup --agent muse-code` adds the MCP server
to Muse Code's settings, and Muse Code reads the skills from `~/.agents/skills`
after `npx skills add deliverd-dev/deliverd-skills`.

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

## tasks

Long work loses its goal. An agent starts on an objective, meets an error,
debugs it, researches an API, tries an alternative — and forty turns later
nobody, the agent included, can say what the work was for. This skill keeps
the goal somewhere the conversation cannot bury it, and has the agent branch
the problem rather than the conversation.

It teaches the agent to state the objective as an outcome, keep a short
working state instead of relying on the history, suggest a side task (asking
first) when a problem starts to take over, come back with a structured result,
and re-anchor on the objective. Decisions it records stay suggestions until a
person confirms them, and it never records its private reasoning.

### Install

```bash
npx skills add deliverd-dev/deliverd-skills --skill tasks
```

It works with no account: the agent keeps the objective and state in the
conversation. With [Deliverd](https://deliverd.dev) connected, the objective,
side tasks, findings and decisions live in Deliverd's Task Graph, survive
restarts and new sessions, and a decision can be put to a person for approval.

## compliance

Governance written up after the work is a story; governance recorded while
the work happens is evidence. This skill has an agent keep that record honest
as it goes: describe what the work is and what it touches, meet the controls
that follow with real evidence (evaluation and red-team results included, and
the release they tested), ask the governance gate before deploying, sending or
publishing, and report what goes wrong at once, DORA incident reports
included.

An agent may raise risk, add facts, submit evidence and ask for approvals. It
never lowers risk, sets its own thresholds, resolves its own incidents or
approves its own controls: each of those is a person's. And it never calls
the work compliant; the record assists audit, it certifies nothing.

### Install

```bash
npx skills add deliverd-dev/deliverd-skills --skill compliance
```

It works with no account: the agent keeps the same record in the
conversation and waits for an explicit yes before anything goes live. With
[Deliverd](https://deliverd.dev) connected (Compliance Mode, Business and
Enterprise), the profile, controls, evidence, gate and evidence pack live in
Deliverd, and evidence can be pulled from Langfuse, LangSmith, Braintrust or
Weave with the organisation's own keys.

## screen

Text sent to a model is text you no longer control. This skill has an agent
check it first, for email addresses, card numbers, IBANs, national ID
numbers, keys, passwords and the organisation's own confidential terms, and
then send it, send it redacted, ask a person, or send nothing. It runs
locally with [Deliverd Screen](https://deliverd.dev/screen) (MIT, no
account), as an MCP tool, a CLI or a library wired into the code that calls
the model.

```bash
npx skills add deliverd-dev/deliverd-skills --skill screen
```

## prompts

When an organisation has found the words that get a piece of work right, an
agent should use them rather than rediscover them. This skill has the agent
look for an approved prompt first, take the version in force filled in with
its inputs, use it as written and check the result against its limitations.
When words it wrote worked well, it drafts them as a prompt for a person to
approve. It never quietly improves the approved words.

```bash
npx skills add deliverd-dev/deliverd-skills --skill prompts
```

## policy

A rule that lets an agent act alone is the sentence that takes a person out
of a decision. This skill helps a person write those rules: name the
consequential actions, write policy files with test cases, replay a change
against the decisions already made, and wire up CI that tests on a pull
request and pushes on merge. The agent drafts; a person puts rules in force,
and the agent never widens what it may do itself.

```bash
npx skills add deliverd-dev/deliverd-skills --skill policy
```

## checkpoint

A check an agent can skip is a suggestion. This skill is for whoever builds
the system an agent runs in: find the one path to a consequential action,
move the credential off the agent, and put the approval step there, with
Deliverd's hosted MCP gateway, a gate in the code that acts, the signed
decision token checked where the action happens, the
[GitHub Action](https://github.com/deliverd-dev/approve-action) or the
[AgentCore Gateway interceptor](https://github.com/deliverd-dev/aws-agentcore).
It also says plainly what each one does not cover.

```bash
npx skills add deliverd-dev/deliverd-skills --skill checkpoint
```

## Contributing

The playbooks are opinions, and better opinions are welcome. Two things to
know before opening a pull request:

- **`references/platform-limits.md` describes real behaviour**, not policy.
  Several of its rules exist because breaking them fails *silently* rather
  than loudly — a CDN script from an unlisted host publishes with only a
  warning and then renders blank. Check a claim against the behaviour before
  changing it; a plausible edit is exactly how that file goes wrong.
- **Every skill except `artifact` names real tools, fields and rules.** Each one is
  checked against the Deliverd code, so a rename there fails a test before
  this skill teaches a call that no longer exists. Suggest wording and
  judgement changes freely; for anything that names an API, say what you
  checked it against.
- **`skills/artifact/examples/` is verified, not decorative.** Every example is run through
  the same secret scanner, external-reference analyser and heuristic scanner
  that a real publish uses. An example containing a CDN `<script src>` or an
  invented-but-realistic API key fails that check, by design. That test lives
  in the Deliverd repository, because the scanners it calls do.

## Licence

MIT. See [`LICENSE`](./LICENSE).
