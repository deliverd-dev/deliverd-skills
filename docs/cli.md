# CLI

The CLI is on npm as [`deliverd`](https://www.npmjs.com/package/deliverd).
Install it globally, or run any command through `npx deliverd …`.

```bash
npm install -g deliverd

# First run: browser-assisted login (opens Deliverd, you approve, done)
deliverd login
# …or with a token from Settings → API tokens:
deliverd login --token dlv_…

# Publish an HTML file, a ZIP, or a whole folder
deliverd publish ./report.html --audience "Finance team" --title "Q3 Review"
deliverd publish ./report-folder --slug finance/weekly --living

# Update an existing report (new immutable version, same URL)
deliverd update finance/weekly ./report-folder \
  --change-summary "October figures" --expected-version 4

# Rename, or move to a new address (the old address keeps redirecting)
deliverd rename finance/weekly --title "Weekly Finance"
deliverd rename finance/weekly --slug finance/weekly-review

# Browse
deliverd list
deliverd list --query finance --limit 20
deliverd open finance/weekly
deliverd versions finance/weekly
deliverd analytics finance/weekly
deliverd analytics                    # every report: what is read, and what is not
deliverd analytics --days 90 --limit 20
```

## Sharing, and taking it back

```bash
# Check a name before you use it — the two ways a share is refused are an
# ambiguous name and one that matches nothing, and this says which.
deliverd who "Finance team" sarah@acme.com

deliverd share finance/weekly --audience "Finance team" sarah@acme.com
deliverd unshare finance/weekly --audience sarah@acme.com

# Sending is different from sharing: it reaches addresses the organisation
# has never seen, and says something alongside the link.
deliverd send finance/weekly --to sarah@client.com ops@client.com \
  -m "Final numbers — let me know by Friday if anything looks wrong."

deliverd archive finance/weekly      # the URL stops serving; nothing is deleted
deliverd unarchive finance/weekly    # back, at the same version and audience

deliverd rollback finance/weekly --version 3
```

`versions` prints `latestVersion`, which is what `--expected-version` compares
to. It is not always the version being served: a publish held for approval, or
declined, takes a number without going live.

## Living reports

A report that fetches `_data/<name>` at open time shows new figures with no new
version, no re-share and no URL change — which makes the morning numbers job a
cron line rather than a publish.

```bash
deliverd data list finance/weekly
deliverd data set finance/weekly figures ./today.json
./generate-figures | deliverd data set finance/weekly figures -
deliverd data rm finance/weekly old-figures
```

Rolling a report back restores the markup, not the data: datasets are not
versioned, so the earlier version renders today's numbers.

## Feedback

```bash
deliverd comments open                # every open thread, across all reports
deliverd comments list finance/weekly
deliverd comments list finance/weekly --status all
deliverd comments add finance/weekly "Fixed in v5" --thread <id>
deliverd comments retract finance/weekly <comment-id>   # while nobody has replied
deliverd comments resolve <thread-id> --note "Corrected the Q3 total"
```

`--quote` anchors a comment to a passage, and the passage has to occur
**exactly once in the report's current version**. Not there at all is
`quote_not_found`, and it names the version it looked in — which is the clue:
a republish rewrites the text, so a quote you had from yesterday stops
matching. Re-read the report and quote what it says now rather than sending
the same passage again. `quote_ambiguous` is the opposite problem and wants
*more* of the surrounding sentence, not less; it prints how many times it
matched. An empty quote is `quote_empty`.

## Putting a person in the loop

The reason this is in a CLI and not only in the SDK: a build step that opens an
approval, exits zero and carries on doing the thing it was asking about has
done worse than not asking. `--wait` blocks, and exits non-zero on anything but
an approval — so `set -e` is the whole integration.

```bash
# Blocks until somebody decides, or an hour passes. --wait 1800 for half of one.
deliverd ask "Ship the Q3 pack to Acme?" \
  --why "Final numbers, partner-reviewed" \
  --approver partner@firm.com --report finance/weekly --wait

deliverd approvals                       # what you have asked for
deliverd approvals get <id> --wait       # block on one already raised
deliverd approvals answer <id> --question <qid> --answer "Yes, signed off Friday"
deliverd approvals cancel <id>
```

### Letting the approver correct it

Send the arguments you will run with, and name the ones a person may fix.
They see the values, can change an amount or a date instead of rejecting, and
you run with what they approved:

```bash
deliverd ask "Refund Acme for invoice 4821" \
  --input '{"customer": "acme", "amount": 1240}' --editable amount \
  --risk high --approver finance@firm.com --wait --json > decision.json

jq .approvedInput decision.json   # {"customer":"acme","amount":1000}: corrections included
jq .changes decision.json         # [{"field":"amount","from":1240,"to":1000}]
```

`--input` takes inline JSON, `@file.json`, or `@-` for standard input, and
must be an object. `--editable` names fields that `--input` has. Both are
checked before anything is sent. Run with `approvedInput`, never with what
you proposed. Without `--json`, the approval prints the changes and a
`Run with:` line.

`--callback https://…` has the outcome POSTed to you when somebody decides,
instead of waiting. The secret that signs each POST is printed once, when the
request is made, and is in the `--json` output. Keep it.

An approver can ask a question back. A wait stops when one is unanswered rather
than timing out silently — the request is not stuck, it is waiting on you, and
that is a different thing to be told.

`--question` takes an id from that approval, which is what
`deliverd approvals get <id>` prints and what the flag's own help points at.
An id from a different approval is `question_not_found`; one somebody has
already answered is `already_answered`. They are worth telling apart in a
script: the first means the id came from the wrong place, the second means
the answer is already there to read.

Reviews and requests for information work the same way:

```bash
deliverd reviews ask "Check the Q3 commentary" --reviewer "Finance team" --report finance/weekly
deliverd reviews get <id>

deliverd collect ask "Renewal details" \
  --question "Which quarter?" "Who owns the budget?" --respondent ops@firm.com
deliverd collect get <id>

deliverd flows start "Q3 close"          # then pass --flow <id> to the above
deliverd flows get <id>
deliverd flows complete <id>
```

## What your software may do

An **action** is a consequential thing your code performs, named once per
organisation — `finance.refund`, `deployment.production`. Policy is written
against these names rather than against whichever function happens to
implement them, so three agents calling three different tools can all be
doing `finance.refund`.

Register them from your deploy. It is an upsert, so running it every time is
the normal case:

```bash
deliverd actions push                                 # deliverd.actions.json
deliverd actions push --file ops/actions.json
deliverd actions list
```

The file:

```json
{
  "actions": [
    {
      "actionId": "finance.refund",
      "name": "Issue customer refund",
      "displayTitle": "Refund {{amount}} {{currency}} to {{customer_id}}",
      "riskCategory": "financial",
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

`editableFields` is what an approver may correct before approving; leave it
out for approve-or-reject only. The schema is a deliberately small subset —
`type`, `properties`, `required`, fields of string, number, integer or
boolean, with `enum`, `minimum`, `maximum`, `minLength`, `maxLength` and
`pattern`. Anything else is refused rather than ignored, because a schema that
silently drops a keyword is a check somebody believes is running.

**Push with your own key, not an agent's.** The API refuses an agent
principal here: policy is keyed on the action id, so an agent that could name
actions could name its way around the rule that governs it.

## Gate policy

The registry says what your software *may* do. A policy says what any of it
**costs**: allowed outright, refused, or a person decides.

```bash
deliverd policy simulate --action finance.refund \
  --input '{"customer_id":"cus_1","amount":40,"currency":"GBP"}'

deliverd policy push                                  # deliverd.policy.json
deliverd policy push --activate
deliverd policy list
deliverd policy activate --policy <id> --version 3
```

The file:

```json
{
  "name": "Refunds",
  "description": "What finance agreed automation may settle without asking",
  "note": "Raised the auto-allow ceiling to 50 after the November review",
  "rules": [
    {
      "name": "Large refunds need two people",
      "priority": 10,
      "effect": "require_human",
      "match": {
        "actions": ["finance.refund"],
        "input": { "amount": { "gt": 1000 } }
      },
      "params": { "requiredApprovals": 2, "approvers": ["finance-leads"] },
      "explanation": "Over £1000 two finance leads sign it off."
    },
    {
      "name": "Small refunds go through",
      "priority": 20,
      "effect": "allow",
      "match": {
        "actions": ["finance.refund"],
        "input": { "amount": { "lte": 50 } }
      }
    }
  ]
}
```

Lower `priority` decides first, and the first decisive rule wins — so an
`allow` above a `deny` is how an exception is written. Conditions are
structured rather than parsed from strings like `"> 1000"`, because a parser's
failures here are silent: `">1000"` and `"> 1000 "` would each match nothing
and look exactly like a rule that has not fired yet.

**No rule means a person decides.** This is the opposite of the publishing
policy next door, which allows what no rule forbids — that one governs work
people were already doing, and a gate is new, so it can hold the stricter
line. An action nobody has written a rule about is an action nobody has
decided about.

**`push` is not an upsert**, unlike `actions push`. It adds a **version** to a
policy that already exists, and creates it only the first time. Overwriting a
policy would silently replace the rules your organisation is running under,
and a version that has been in force can never be edited afterwards — it is
what every decision made under it points at. Without `--activate` the version
is stored as a draft, so the sequence that reviews well is: push, simulate,
activate.

**An owner's or an administrator's key.** Not just a scope — the API reads the
key holder's role on every call. Writing a rule is how authority is granted:
`"effect": "allow"` on `finance.refund` is the sentence that removes the human
from it, so it is not something a key can confer on somebody who does not
already hold it. Agents are refused outright, since policy decides whether an
agent needs a person.

`simulate` runs the same evaluation a real request runs — same action lookup,
same schema validation, same rules in force — and records nothing. It changes
no production decision, and it does not appear in your autonomy figures.

## There is no `deliverd gate`

You can write the rules from here and you can ask what they would say. You
cannot fire a real one, and that is deliberate rather than unfinished.

**Every gate evaluation is recorded**, allows included, because the autonomy
rate has every eligible controlled action as its denominator — a decision
nobody recorded is invisible to it. `simulate` is the person's version of the
same question precisely because it records nothing. A `deliverd gate` command
would let somebody move the number the product reports by trying things out at
a terminal, which is the one thing a figure like that must not be vulnerable
to. Gating is the agent's call, made from where the work actually happens.

Reading one back is out for the same reason from the other end: a gate id is
the handle an agent holds while it waits. Somebody investigating a decision
afterwards goes to the approval it raised, or to the audit trail — both name
the action, and neither needs the id.

So the split is: rules and simulation here, the gate itself over
[the API](./api.md#the-gate) or from an SDK.

## The record

```bash
deliverd evidence finance/weekly                     # JSON to stdout
deliverd evidence finance/weekly --format csv -o q3.csv
```

## Lookups

```bash
deliverd schedules                    # the whole timetable
deliverd schedules --due              # only what is waiting on a publish
deliverd schedules create finance/weekly --agent <id> --every "0 9 * * 5"
deliverd schedules update <id> --every "0 9 * * 1"
deliverd schedules update <id> --off  # pause it, keeping the record
deliverd schedules rm <id>

deliverd templates
deliverd copy <template-slug> --title "Q4 Review"
deliverd workspaces
```

## Three conventions

**Every failure prints `Error (code): message` on stderr, then exits 1.** The
code in the brackets is the API's own — `quote_not_found`, `not_permitted`,
`insufficient_scope` — so it is the thing to grep this page for, and the thing
to branch on in a script rather than matching the message, which is written to
be read and will be reworded. Anything the refusal carried with it is printed
under the line as JSON.

**`--json` on everything that returns something.** The human output is meant to
be read, and read means it will be reworded; a pipeline should never be parsing
it. Every command that returns anything takes `--json` and prints exactly what
the API said.

**No `--limit` means all of them.** A list follows the cursor to the end, so
its length is the real count. `--limit N` gives one page of N and prints the
cursor to continue from. The alternative — printing the first page and stopping
— tells somebody they have fifty reports when they have four hundred.

## Credentials

Config is stored at `~/.config/deliverd/config.json`, readable only by you.
`deliverd login` opens Deliverd in your browser, you approve, and the CLI
receives a scoped API token directly on your machine — the token never
transits any third-party service.

In CI there is no browser and nothing keeps that file between steps, so set
`DELIVERD_URL` and `DELIVERD_TOKEN` instead. They take precedence over the
config file, deliberately: a workflow that sets a token means it, and
preferring a stale config left in a cached home directory would publish to the
wrong place. See [ci.md](./ci.md).

If that token belongs to an **agent** rather than a person, deleting the agent
does not disable the token — it breaks it. Every command then fails with
`agent_not_found`, which reads like a bad credential and is not one: the key
still authenticates, and what is gone is the identity it acts as. Recreate the
agent under **Admin → Agents** or issue a token bound to one that exists.
Withdrawing an agent's permissions is the way to stop it doing something;
deleting it is the way to make a pipeline fail confusingly.
