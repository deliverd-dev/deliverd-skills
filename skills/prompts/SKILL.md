---
name: prompts
description: Use the organisation's approved prompts instead of your own words when one fits the job, and turn words that worked into a prompt a person can approve. Use it when asked for a kind of work an organisation does again and again (summarising a contract, drafting a customer reply, reviewing a supplier, writing release notes), when someone mentions "the approved prompt", "the prompt library" or "the one we agreed", and when a prompt you wrote has worked well enough that others should reuse it. It covers finding a prompt, taking the version in force filled in with your inputs, checking the result against its limitations, and drafting a new prompt or a new version for a person to approve. It works with the Deliverd MCP server, its SDKs or CLI, or in plain conversation when none is set up.
license: MIT
---

# Prompts

An organisation that has found the words that get a piece of work right
should not have to hope every person and every agent rediscovers them. An
approved prompt is those words, written down, owned by someone, reviewed on a
date and versioned like a policy. Your job is to use them when they fit,
check what they produce, and help good words become approved ones. It is
never to quietly improve them.

## 1. Look before you write

When you are asked for a piece of work, look for an approved prompt first:
call `list_playbooks` with `kind` `prompt`. Each row has its newest version
and `inForce`, the version people are meant to use. A prompt with nothing in
force is a draft nobody has approved yet; do not use it as if it were.

Match on the job, not on wording. "Summarise this renewal against last
year's" fits a prompt titled *Compare two contracts* even though neither
word appears. When two fit, say which you picked and why. When none fits,
write your own and carry on; you can offer to draft one later (section 4).

## 2. Take the version in force

Call `use_prompt` with the prompt's `playbookId` and its `inputs`, by name.
Any version's id works: the version in force is the one handed out, and
`ranOlderVersion` says when that was not the one you named. The answer has:

- `text`: the approved words with your inputs put in their `{placeholders}`;
- `missingInputs`: required inputs you did not give, whose placeholders are
  still in the text;
- `limitations`: what the prompt is not for, and how to check its output.

Each use is recorded against the version, so the organisation can see the
approved words are the ones in use. That record is the point; take the
prompt through `use_prompt` even when you remember its words.

If `missingInputs` is not empty, get the values (from the work, or by asking
the person) and call `use_prompt` again. Never send a prompt to a model with
a placeholder still in it, and never invent a value to fill one.

## 3. Use the words as written, then check

Use `text` as the instruction for the work, as it is. If you think it is
wrong for this case, say so to the person and ask before changing it; then
say plainly that you departed from the approved prompt and how.

Check what it produced against `limitations` before anyone relies on it. If
the limitations say "not for contracts under another jurisdiction" and this
one is, stop and say so. If they say how to check (compare every figure with
the source, flag clauses it could not find), do that check and report it.

A prompt can require a person to review what it produced. When you run it as
a playbook with `start_playbook`, its one step carries a `review` rule:
call `request_review` on the result and wait, as the approval skill
describes, before handing it on.

## 4. Turn words that worked into a draft

When a prompt you wrote did the job well and the work will come round again,
offer to draft it as an approved prompt. Call `draft_playbook` with a
`title` (the job, as people name it), a one-line `purpose`, the `inputs` it
takes, and a `prompt` instead of steps:

- `text`: the words, with each input as `{input name}`. Every placeholder
  needs an input and every required input needs a placeholder, or the draft
  is refused.
- `limitations`: what it is not for, and how to check its output. Write this
  honestly; it is the part people skip and the part that prevents harm.
- `ownerEmail`: the member who keeps it current, when the person names one.
  It defaults to whoever drafts it.
- `reviewDueOn`, `department`, `taskType`, `language` when the person gives
  them, and `checkOutput` when a person should review every result.

To improve an approved prompt, draft its next version: pass the prompt's id
as `familyId`. The version in force keeps being handed out until a person
approves the new one.

Nobody uses a draft. A person approves it, or publishes it, in Deliverd; you
never do. Give the person the URL the draft returns. Keep names, customer
details and secrets out of a prompt: it is shared across the organisation.

## 5. Without Deliverd

With no MCP server, SDK or CLI set up, the same habits hold in the
conversation. If the person has a prompt they always use, ask for it and use
it as written. Say when you depart from it. When something you wrote worked,
offer it back as a reusable prompt with its placeholders and limitations
spelled out, so they can keep it wherever their team keeps such things.

## Reference

| Do | MCP | TypeScript | Python | CLI |
|---|---|---|---|---|
| Find prompts | `list_playbooks` | `deliverd.playbooks.list()` | `deliverd.playbooks.list()` | `deliverd playbooks` |
| Take one, filled in | `use_prompt` | `deliverd.playbooks.use()` | `deliverd.playbooks.use()` | `deliverd playbooks use` |
| Run one with a review | `start_playbook` | `deliverd.playbooks.start()` | `deliverd.playbooks.start()` | `deliverd playbooks start` |
| Draft one | `draft_playbook` | `deliverd.playbooks.draft()` | `deliverd.playbooks.draft()` | |
| Draft its next version | `draft_playbook` | `deliverd.playbooks.draftVersion()` | `deliverd.playbooks.draft_version()` | |

From a terminal, `deliverd playbooks use <id> --input "previous contract=2025 terms"`
prints the filled-in words alone, so they pipe to a clipboard. Connect the
MCP server with
`claude mcp add --transport http deliverd https://deliverd.dev/api/mcp`, or
see https://deliverd.dev/connect for other tools.
