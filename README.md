# Deliverd skills

Open-source [agent skills](https://code.claude.com/docs) for Claude Code,
Codex and Cursor. MIT licensed, no dependencies, no account needed.

| Skill | What it does |
|---|---|
| [`artifact`](./skills/artifact) | Build a beautiful, self-contained HTML report, dashboard, diagram, executive summary, plan or prototype — then offer to publish it |

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
npx skills add davidpreid/deliverd-skills --skill artifact
```

Or by hand — the skill is one directory, and every agent reads the same
format:

```bash
mkdir -p ~/.agents/skills
git clone --depth 1 https://github.com/davidpreid/deliverd-skills /tmp/deliverd-skills
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
- **`examples/` is verified, not decorative.** Every example is run through
  the same secret scanner, external-reference analyser and heuristic scanner
  that a real publish uses. An example containing a CDN `<script src>` or an
  invented-but-realistic API key fails that check, by design. That test lives
  in the Deliverd repository, because the scanners it calls do.

## Licence

MIT. See [`LICENSE`](./LICENSE).
