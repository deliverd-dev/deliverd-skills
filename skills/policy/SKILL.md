---
name: policy
description: Help a person write the rules that decide what AI agents may do on their own, what goes to a person and what is refused, and keep those rules in a repository with tests. Use it when someone asks to set up approval rules, gate policy or guardrails for agents; to register the consequential actions their software performs; to keep policy as code, reviewed in pull requests and pushed by CI; or when an agent newly connected to Deliverd should describe what it can do so an administrator can set it up. It covers proposing a setup, the actions file, policy files and their test cases, replaying a change against past decisions, the GitHub workflow, and the line an agent never crosses: it drafts rules, a person puts them in force. It works with the Deliverd MCP server and CLI, or in plain conversation when none is set up.
license: MIT
---

# Policy

Policy is where an organisation decides how much it trusts its agents. A rule
with `effect: allow` is the sentence that takes a person out of a decision,
so it is written by people with the authority to grant that trust. You can
draft rules, write their tests and wire up the pipeline that checks them. You
never put a rule in force, and you never write one that hands yourself more
room than the person asked for.

## 1. When you are newly connected: propose a setup

If the Deliverd MCP server is connected and the organisation has not set up
rules for what you do, call `propose_setup`. Give your `agent` name as the
people here know you, a `description` of what you do for them, and
`actions`: the consequential things you can do (refunds, deploys, emails
outside the organisation, data exports, deletions), each with a `name` and a
`description` of what it changes and which inputs matter (amounts,
recipients). An `actionId` such as `payments.refund` helps when you have one.

Deliverd's setup assistant turns that into a draft of actions and rules. Nothing
is registered or enforced by the call. Give the person the URL it returns;
an administrator reviews the draft, sees what its rules would decide on test
requests, and adds it. Describe yourself honestly, including the things you
were told need a person. Leaving an action out does not make it safe; it
makes it unknown.

## 2. Name the actions

Rules are written against action names (`finance.refund`,
`deployment.production`), not against whichever tool or function does the
work, so three agents with three tools can all be doing `finance.refund`.
In a repository, actions live in `deliverd.actions.json`:

```json
{
  "actions": [
    {
      "actionId": "finance.refund",
      "name": "Issue customer refund",
      "displayTitle": "Refund {{amount}} {{currency}} to {{customer_id}}",
      "defaultRisk": "high",
      "editableFields": ["amount"],
      "inputSchema": {
        "type": "object",
        "required": ["customer_id", "amount", "currency"],
        "properties": {
          "customer_id": { "type": "string" },
          "amount": { "type": "number", "minimum": 0 },
          "currency": { "type": "string", "enum": ["GBP", "EUR", "USD"] }
        }
      }
    }
  ]
}
```

`editableFields` are the inputs an approver may correct before approving;
leave it out for approve-or-reject. The schema is a small subset (`type`,
`properties`, `required`, and `enum`, `minimum`, `maximum`, `minLength`,
`maxLength`, `pattern` on string, number, integer and boolean fields), and
anything else is refused rather than ignored. `deliverd actions push`
registers the file; it is an upsert, so running it on every deploy is normal.

## 3. Write a policy file with its tests

One file per policy, YAML or JSON, under `deliverd/policies/`. Each holds
its rules and the test cases that say what those rules must do:

```yaml
# deliverd/policies/refunds.yaml
name: Refunds
description: What finance agreed automation may settle without asking
note: Why this version exists, in a sentence
rules:
  - name: Large refunds need two people
    priority: 10
    effect: require_human
    match:
      actions: [finance.refund]
      input:
        amount: { gt: 1000 }
    params:
      requiredApprovals: 2
      approvers: [finance-leads]
  - name: Small refunds go through
    priority: 20
    effect: allow
    match:
      actions: [finance.refund]
      input:
        amount: { lte: 50 }
tests:
  - name: a small refund is allowed
    action: finance.refund
    input: { customer_id: cus_1, amount: 20, currency: GBP }
    expect: { effect: allow, rule: Small refunds go through }
  - name: a middling one falls through to a person
    action: finance.refund
    input: { customer_id: cus_1, amount: 400, currency: GBP }
    expect: { effect: require_human, rule: null }
```

What to know when writing one:

- **The effects** are `allow`, `deny`, `require_human` and `require_review`.
- **No rule means a person decides.** An action nobody has written a rule
  about goes to a person. You never need a rule to make something safe; you
  need one to let something through.
- **Lower `priority` decides first**, and the first decisive rule wins, across
  every policy in force, not just this file. An `allow` above a `deny` is how
  an exception is written, so place every `allow` with care.
- **Conditions are structured**: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`.
  Never write `"> 1000"` as a string; it matches nothing and looks exactly like
  a rule that has not fired yet.
- **A test** has a `name`, an `action`, its `input`, and an `expect` with the
  `effect` and, optionally, the `rule` that must decide it (`null` for "no
  rule matches"). Write one for each rule, one for each boundary (exactly
  1000, exactly 50) and one for the case that should fall through to a
  person.

## 4. Check it before anyone merges it

Two commands read the files and write nothing:

- `deliverd policy test --file deliverd/policies` runs each case through the
  same validation and evaluation a real request meets, beside every other
  policy in force, and exits 1 when one fails.
- `deliverd policy replay --file deliverd/policies` evaluates the gated
  requests of the last 30 days (`--days` up to 90) under the rules in force
  and under the files, and reports what would change. By default it fails
  when a request a person rejected would now be allowed without asking
  (`--fail-on` `rejected_allowed`); `loosened` and `changed` are stricter.

Read the replay to the person in plain words: how many decisions change,
which way, and every request a person said no to that would now go through.
Never summarise a loosening as "no material change".

Both need an owner's or administrator's key with `policies:read`, and
Deliverd refuses them to agents: knowing which inputs a rule lets through
is the map for getting past it. So the person runs them, or CI does with a
secret. Never ask for that key, read it from a file, or use one you happen
to find. `deliverd login` deliberately stores a key without these scopes,
because any agent on the machine can read it.

## 5. Wire up CI

The repository's workflow tests and replays on a pull request, and pushes on
merge. The person creates an API token under **Settings → API tokens**,
signed in as an owner or administrator, with `policies:read` and
`policies:write`, and saves it as the repository secret `DELIVERD_TOKEN`:

```yaml
# .github/workflows/deliverd-policy.yml
name: Deliverd policy
on:
  pull_request:
    paths: ["deliverd/policies/**"]
  push:
    branches: [main]
    paths: ["deliverd/policies/**"]

permissions:
  contents: read

jobs:
  check:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    env:
      DELIVERD_URL: https://deliverd.dev
      DELIVERD_TOKEN: ${{ secrets.DELIVERD_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - run: npx -y deliverd@latest policy test --file deliverd/policies --markdown "$GITHUB_STEP_SUMMARY"
      - run: npx -y deliverd@latest policy replay --file deliverd/policies --fail-on rejected_allowed --markdown "$GITHUB_STEP_SUMMARY"

  push:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    env:
      DELIVERD_URL: https://deliverd.dev
      DELIVERD_TOKEN: ${{ secrets.DELIVERD_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - run: npx -y deliverd@latest policy push --file deliverd/policies --activate --git --skip-unchanged
```

`--git` marks each version **Managed in Git**, with the repository, commit
and file it came from, so the app warns anyone editing that policy in the
Policy builder (Agents → Rules → Policy builder) that the next merge replaces
it. `--skip-unchanged` stores nothing for a policy that did not change.
Suggest the person protect `main` so policy changes need a review: the
review is the approval.

## 6. What you never do

- Put a policy in force: no `deliverd policy push --activate` and no
  `deliverd policy activate` run by you. A merge the person approved, or the person, does that.
- Write or widen an `allow` that the person did not ask for, above all one
  that covers what you yourself do. When a request would let more through,
  say so in the pull request description in one plain sentence.
- Delete or loosen a test so a change passes. A failing test is the policy
  doing its job; bring it to the person.
- Treat a passing replay as permission. It says what would have changed, not
  that the change is wise.

## 7. Without Deliverd

With nothing set up, the same work is still worth doing in conversation:
list the consequential actions the person's agents can take, and for each
say who should decide, above what threshold, and why, as a table they can
take to whoever owns the risk. Mark every "allowed without asking" line as a
proposal for them to agree.

## Reference

| Do | MCP | CLI |
|---|---|---|
| Describe what you can do, for an administrator | `propose_setup` | |
| Register actions | | `deliverd actions push` |
| Run a policy file's tests | | `deliverd policy test` |
| Replay a change against past decisions | | `deliverd policy replay` |
| Try one request against the rules in force | | `deliverd policy simulate` |
| Push as the next version | | `deliverd policy push` |

The API behind these is `POST /api/v1/policies/test` and
`POST /api/v1/policies/replay`; the full guide is
https://deliverd.dev/docs/developers/policy-as-code. Connect the MCP server with
`claude mcp add --transport http deliverd https://deliverd.dev/api/mcp`.
