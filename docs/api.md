# REST API

Interactive reference: **[deliverd.dev/docs/api](https://deliverd.dev/docs/api)**,
rendered from the OpenAPI spec at `https://deliverd.dev/api/v1/openapi.json`.

- Base URL: `https://deliverd.dev/api/v1`
- Auth: `Authorization: Bearer <token>`. Two credentials work and they are
  peers: a **`dlv_` API key** from Settings → API tokens (or an agent key),
  and a **`dlvo_` OAuth access token** obtained by a connector through the
  OAuth 2.1 flow at `/api/mcp` — no token pasted anywhere. Both resolve to the
  same principal and are checked against the same scopes, so anything below
  works with either.
- Scopes: `reports:read`, `reports:write`, `reports:share`,
  `audiences:read`, `workspaces:read`, `comments:read`, `comments:write`,
  `schedules:read`, `schedules:write`, and for asking people and the gate
  `approvals:*`, `reviews:*`, `collections:*`, `flows:*`, `gates:*`,
  `actions:*` and `policies:*` (each `:read` or `:write`, as named on the
  endpoints below). A key carries the scopes it
  was issued with — they are a snapshot, not a lookup — so a key created before
  a scope existed will not have it. Reissue rather than wonder.
- A call the credential does not carry the scope for answers
  **`403 insufficient_scope`**, naming the scope it needed. That is a
  different answer from `auth_error`, which means the credential itself was
  not accepted — worth branching on separately, because nothing is wrong with
  the key in the first case and reissuing another with the same scopes fails
  identically.

## Authenticating as a connector

An OAuth access token is accepted on every route an API key is, on the scopes
its user consented to. The consent screen offers exactly the API's own scope
list, so it describes what the token will be able to do here.

Two differences worth knowing:

- **Membership is re-checked on every request.** A token outlives a person's
  membership, so somebody removed from an organisation loses API access at
  that moment rather than whenever their token expires. A person's API key
  works the same way: it is refused while its owner is suspended, and
  removing somebody revokes their keys outright.
- **The principal is always a user**, never an agent. Agent-policy rules that
  key off an agent identity do not apply to a connector; the acting person is
  who the audit trail names.

## Errors

Errors are `{ "error": { "code", "message", "details?" } }`. The `code` is the
contract — branch on it, not on the message — and every one of them has a
fixed status, listed in
[Errors and limits](https://deliverd.dev/docs/developers/errors). The shape of
it: plan limits are `402`, refusals about you or a rule about you are `403`, scan blocks are `422`, and **`409` means
the request was fine and the world moved** — re-read and retry rather than
reformulating. `400` means change the request. A refusal by the
organisation's publishing policy is `policy_denied`.

## Publish in two calls

```bash
# 1. Get an upload ticket, PUT the bundle (HTML or ZIP)
curl -X POST $API/uploads -H "Authorization: Bearer $TOKEN"
curl -X PUT "<uploadUrl>" --data-binary @report.zip

# 2. Publish
curl -X POST $API/reports -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"uploadId": "…", "audience": ["Finance team"], "living": true,
       "slug": "finance/weekly"}'
```

Small reports can skip the upload and send inline `content` (single HTML,
≤2 MB) or `files: [{path, content}]`.

**A ticket is consumed by the publish that reads it.** Once the bytes are
copied into the version the staged bundle is deleted, so a second publish with
the same `uploadId` answers `404 upload_not_found` — and the honest reading of
that is usually that **the first one worked**. Look at the report before
uploading again, or you will publish it twice. The delete happens when the
version is stored rather than when it goes live, because a held publish is
approved days later and the upload would be long gone by then.

## Living-report updates

`POST /reports/{idOrSlug}/versions` with a new bundle — same URL, same
audience, version history preserved.

### Undoing

`POST /reports/{id}/rollback` with `{"version": 3}` serves that version
again at the same URL. `versionId` works too, for a caller holding one from
the versions list. Nothing is deleted — roll forward the same way. Datasets
are not versioned, so a rollback restores the markup and not the numbers it
renders.

`POST /reports/{id}/archive` stops the URL serving: a reader following a
link they already hold is told the report is no longer available. The body
is optional and defaults to archiving; `{"archived": false}` puts the report
back, at the same version and to the same audience, because archiving takes
nothing away. A report a scan blocked cannot be unarchived this way — an
administrator clears it.

`DELETE /reports/{id}/data/{name}` removes a dataset. The published version
is untouched, but a report that fetches that name shows its readers an error
from the next open, so list the datasets first if you are not sure what
reads it.

## Approvals

A publishing-policy rule with the effect **Needs approval** (Admin →
Policies; two ship switched off — one for agent publishes, one for anything
addressed to people outside the organisation) holds a publish instead of
making it live. Both publish calls then answer **202** rather than 201, with
`status: "pending_approval"` and an `approval` object naming the rule. The
version is stored and scanned; the URL serves the previous version, or
nothing for a new report, until an organisation owner or admin approves it
from Admin → Approvals. Approval runs everything a publish normally does —
the audience grant, the `report.published`/`report.updated` webhook, the
living-report notices — at that moment.

While a version is waiting, the report accepts no other version: a further
publish is refused with `409 approval_pending`. To see whether one is
waiting, `GET /reports/{idOrSlug}/versions` returns `pendingApproval` and
`latestVersion`. Pass `latestVersion`, not the live version's number, as
`expectedVersion`: a held or declined version takes a number without going
live, and an update that expected the live number after one would be refused
as stale every time.

The hold itself is a webhook event, `publish.held`, so a Slack or Teams
channel can carry the "waiting on you" alongside the rest.

## Retrying safely

Every `POST` accepts an `Idempotency-Key`. Send one, keep it across your own
retries, and a request that arrives twice is only done once:

```bash
curl -X POST https://deliverd.dev/api/v1/approvals \
  -H "Authorization: Bearer $DELIVERD_TOKEN" \
  -H "Idempotency-Key: 3f2504e0-4f89-11d3-9a0c-0305e82c3301" \
  -H "Content-Type: application/json" \
  -d '{"title":"Deploy to production"}'
```

The second request comes back with the first one's status and body, and an
`Idempotency-Replayed: true` header so your own logs can tell the two apart.

**The SDK does this for you.** It generates a key per logical call and holds
it across its retries — which is what makes those retries safe, because a
`POST` that reached us and lost its response on the way back would otherwise
have been a second approval, and two people asked to authorise one act. Pass
`idempotencyKey` yourself when *your* process is the thing retrying: a nightly
job that reruns from the start wants the key its first run used, and only you
can derive that.

| Situation | Response |
|---|---|
| Same key, same request | The first answer, with `Idempotency-Replayed: true` |
| Same key, different request | `422 idempotency_key_reused` |
| Same key, first attempt still running | `409 idempotency_in_progress` — retry shortly, same key |
| Malformed key | `400 invalid_idempotency_key` |

A key is scoped to your organisation and lasts 24 hours. A `5xx` does not
consume it: we cannot tell whether the write landed, so the key is released
and your retry is a real attempt rather than a replayed error.

## Reading a list

Every list takes `?limit=` and `?cursor=`, and every list answers with
`nextCursor`. That field is the whole convention: **null means this page is
the end of the list, a string means it is not.**

```bash
curl "https://deliverd.dev/api/v1/approvals?status=pending&limit=50" \
  -H "Authorization: Bearer $DELIVERD_TOKEN"
```

```json
{
  "approvals": [ … 50 rows … ],
  "nextCursor": "MjAyNi0wOS0xNlQwNToyMjowNy44NDBafDVjOTJhMTAz…"
}
```

Pass that string back as `?cursor=` for the next page, and keep going until
`nextCursor` is null.

This exists because a full page and a complete list are otherwise
indistinguishable: without `nextCursor`, a list that stops at two hundred rows
looks exactly like one that has only two hundred.

**A cursor, not an offset.** Things are being written to these lists while you
read them. With `?offset=`, a row created between your first and second
request shifts every later row down one and you skip a row you never saw. A
cursor names the last row you were actually given, so an insert changes nothing
about where you resume.

**A cursor is opaque.** It is base64 and you can decode it, but the shape is
ours to change — pass back what you were given rather than building one.

| Situation | Response |
|---|---|
| `limit` above the maximum (200) | The maximum. Asking for more is not an error |
| `limit` missing or not a number | The default, 50 |
| A cursor we did not issue | `400 invalid_cursor` |

The last row of that table is the one deliberate refusal. A limit that makes no
sense costs you some rows; a cursor that makes no sense would resume from an
unknown position and hand back the *wrong* rows, which is exactly the failure
this is here to remove.

**The SDK pages for you.** `list()` with no `limit` follows the cursor to the
end, so the array really is every row. Pass a `limit` and you get one page of
that size; use `listPage()` when you want the cursor in your own hands.

```ts
const all = await deliverd.approvals.list({ status: "pending" });   // all of them
const page = await deliverd.approvals.listPage({ limit: 50 });      // one page
// page.nextCursor → pass as { cursor } to listPage for the next
```

## The SDKs

Two packages are this API with the waiting, the retries and the polling written
for you. Everything below this section works without either.

| | Install | Import |
|---|---|---|
| TypeScript / JavaScript | `npm install @deliverd/sdk` | `import { deliverd } from "@deliverd/sdk"` |
| Python 3.9+ | `pip install deliverd` | `from deliverd import deliverd` |

The two carry the same objects field for field, the same error codes and the
same webhook verification. Two differences, both deliberate:

- **Python blocks; TypeScript awaits.** `decision = deliverd.approve(…)` returns
  when somebody has decided. There is no async Python client yet; inside
  `asyncio`, use `await asyncio.to_thread(deliverd.approve, title=…)`.
- **A bare duration is seconds in Python and milliseconds in TypeScript**,
  because that is what each language's own timers take. `"30m"`, `"4h"` and
  `"2d"` mean the same in both, which is what these docs use.

`flows`, `comments` and `schedules` are TypeScript-only so far. Every primitive
takes a flow id in both, so a Python agent can join a flow it did not create.

### TypeScript

```bash
npm install @deliverd/sdk
```

```ts
import { deliverd } from "@deliverd/sdk";

const decision = await deliverd.approve({ title: "Deploy to production" });
if (decision.approved) await deploy();
```

No configuration: the key comes from `DELIVERD_API_KEY`, the approvers default
to your owners and admins, and the request expires after a day so the wait
always ends. `approve()` resolves on a rejection too — a refusal is an answer —
and throws only on a timeout, an abort, or an unreachable API.

Before you have a key, `new Deliverd({ mode: "development" })` runs the same
code with an imaginary approver, printing what they would have seen and
simulating any of `approved`, `rejected`, `timeout` or `question`. It swaps out
the network and nothing else, so what you exercise is what will run.

Also there: `confirm()` for a yes or no, `publish()` for the reports half,
`deliverd.approvals.*` for the full surface, and `constructEvent` for webhook
verification. Zero dependencies, Node 20+. Full reference in
[the package README](https://www.npmjs.com/package/@deliverd/sdk).

### Python

```bash
pip install deliverd
```

```python
from deliverd import deliverd

decision = deliverd.approve(title="Deploy to production")
if decision.approved:
    deploy()
```

Fields are named the Python way — `decision.decided_by_id`, `expires_in`,
`on_question` — and the SDK converts them to the API's `decidedById` style on
the wire. What a caller put in `metadata`, and the questions a collection is
keyed by, are never renamed.

`Deliverd(mode="development")` runs the same loop offline, the same four
endings, the same stand-in-transport design. A refusal returns rather than
raising, exactly as in TypeScript. Zero dependencies, Python 3.9+. Full
reference in [the package README](https://pypi.org/project/deliverd/).

## Action approvals

An agent that is about to do something consequential — raise a purchase
order, deploy, send a renewal, disable an account — can pause and ask named
people to authorise it first. This is distinct from the publish approval
above: nothing is published, the request is about an action the agent will
take itself once told yes. The concepts are in
[Approvals, reviews and requests](https://deliverd.dev/docs/developers/approvals).

```
POST /api/v1/approvals                 approvals:write
{
  "title": "Create £14,280 purchase order",
  "description": "New server equipment for London infrastructure.",
  "risk": "medium",
  "factors": [
    { "label": "Within the quarter's budget", "status": "ok" },
    { "label": "Supplier not on the preferred list", "status": "warning",
      "detail": "HPE is approved but not preferred for this cost centre." }
  ],
  "links": [{ "label": "Quote", "url": "https://…" }],
  "approvers": ["dave@example.com"],
  "expiresAt": "2026-09-20T17:00:00Z",
  "externalId": "po_12882",
  "metadata": { "supplier": "HPE", "amount": 14280 }
}
→ 201 { "id": "…", "status": "pending", "url": "https://deliverd.dev/approve/…", … }
```

Approvers are members of the organisation, named by email or user id; an
address that is not an active member is refused with `400 unknown_approver`
rather than notified into nothing. Omit `approvers` and the organisation's
owners and admins decide. The requester — person or agent — is never an
approver of their own request.

**Ask a team, not a person.** An entry can also be the name or id of a
directory group or a workspace, or a word meaning the whole organisation
(`"everyone"`, `"the organisation"`) — the same words that work for a report's
audience. A request addressed to one person waits for that person to come back
from holiday; one addressed to `["Finance team"]` can be answered by anyone on
it, and the page says so: *Waiting on Finance team — 4 people, any of whom can
decide.*

The team is expanded once, when the request is made, and both halves are kept:
the roster decides, and what you named is what the page and the evidence pack
report. So somebody who joins the team on Thursday cannot settle a request made
on Monday, and somebody who leaves does not stop it settling — the same reason
`requiredApprovals` is fixed at creation.

Three refusals worth knowing:

- A name matching both a person and a team is `400 unknown_approver` naming
  both, never a guess — an approval that went to the wrong people and reads as
  though it went to the right ones is the worst outcome available. Name it by
  id.
- A team with nobody else in it is `400` rather than a silent fall back to the
  admins, which would send the request somewhere nobody asked for.
- `"anyone with the link"`, `"public"`, a domain and a guest are refused by
  name: they say who may *read* something, not who may decide. Being on a team
  you address is fine, and means the rest of it.

Each approver gets an in-app notification and an email with the page. The
page works on a phone: what is being asked, why, the factors as a checklist,
the metadata, and Approve, Reject (with a reason) and Ask a question.
**A person can ask too.** Inbox → *Ask for* → *Approval* (or a report's menu,
which attaches the report) raises the same request through the same service, so a
firm does not need an agent wired up to use any of this. The picker browses
before it searches: opening it lists the organisation's groups and workspaces,
with how many people each reaches, so addressing a request to a team is
something you find rather than something you have to know to type. It sends
ids, so the ambiguity refusal above cannot arise from the app, and a team with
nobody else in it is shown as unpickable rather than refused after the fact.


The decision is a person's and takes as long as it takes. Read it any of
three ways:

- `GET /api/v1/approvals/{id}` — `status` becomes `approved`, `rejected`,
  `expired` or `cancelled`, with `decidedBy`, `decidedAt` and `note`.
  `decidedBy` is the person — their name, or their email when they have not
  set one — the same shape as a review verdict's `by` and a collection
  reply's `respondent`; `decidedById` is their user id. The `approval.approved` and
  `approval.rejected` webhooks carry the same pair, so compare user ids
  against `decidedById`, never against `decidedBy`. (Before September 2026
  `decidedBy` held the user id; code written then should switch.)
- The organisation's webhooks: `approval.requested`, `approval.approved`,
  `approval.rejected`, `approval.expired`, `approval.escalated`, `approval.question`,
  `approval.answered`, signed like every other event and rendered as a card
  with a button in Slack and Teams.
- The MCP tool `get_approval`.

**Questions.** An approver can ask the requester something from the page.
That is the `approval.question` event, and `GET` shows it under `questions`
with `answer: null`. Answer with
`POST /api/v1/approvals/{id}/answers { questionId, answer }` (or the MCP tool
`answer_approval_question`); the answer appears on the page and the asker is
told. Only the requester can answer.

A `questionId` that is not on this approval answers `404 question_not_found` —
usually an id carried over from a different one. A question somebody has
already answered is `409 already_answered` instead, which is a different thing
and worth its own branch: the first means look again at where the id came
from, the second means read the answer.

**Reminders.** A request with an `expiresIn` nudges each approver once, when
under a quarter of the window remains — six hours into a 24-hour request, eight
into a three-day one. It scales with the window rather than using a fixed
number of hours, because a fixed one would nudge a short request before its
first email had been read and leave a long one silent until it was nearly too
late. Anyone who has already decided is skipped, a request with no expiry is
never nudged, and nobody is nudged twice. The nudge is `approval.reminded` in
the audit trail. A request with no `expiresIn` has no deadline to be late for
and gets nothing.

`POST /api/v1/approvals/{id}/cancel` withdraws a pending request; the request
stays as evidence. Every step — requested, approved, rejected, expired,
cancelled, question, answered — is recorded in the audit trail with the agent
or person as actor.

### Guests who approve

Some decisions belong to someone outside the organisation: the client who
signs off a change order, or the outside accountant who approves a payment run.
Name them by email in `approvers`, as long as:

- **they are already a guest of the organisation.** Somebody in the
  organisation gave them access, for example by sharing a report with them. An
  address nobody admitted is refused with `unknown_approver`, the same as an
  unknown member. An agent chooses the approvers, so allowing any address would
  let it send a request to an inbox it reads and approve itself.
- **an administrator has switched on "Guests may approve"** in Sharing
  settings. It is off by default. While it is off, naming a guest is refused
  with a message saying so, and switching it off later stops any open guest
  links from working.
- **the request is low or medium risk.** A guest decides from the signed link
  in their email, with no account, and a link only decides low and medium
  risk. A high or critical request that names a guest is refused when it is
  made.

The guest gets the same approval email with a link of their own, and a
reminder as the deadline nears. On the page they see the request and any
"What will run" fields (restricted fields hidden), and they approve, approve
with changes, or reject. They can't bring anyone else in or ask a question.
Their decision counts toward `requiredApprovals` like a member's. It is
recorded as theirs: the audit trail names a guest actor, `decidedBy` reads
"Name (guest)", and `decidedById` is null because a guest has no user id. A
guest who is revoked can no longer decide.

A request addressed only to guests is not the admins' to decide, and does not
appear in the admins' queue of requests that name nobody.

### Push notifications

Approvers can have requests arrive on their phone or computer's lock screen.
Each person turns it on per device, in their own **Settings**, under *Push
notifications*. On an iPhone or iPad, Safari only allows this once Deliverd has
been added to the home screen.

A notification is sent when a request reaches someone (made, widened or
covered while someone is away) and with the reminder as a deadline nears. Its
title is the request's `title`, so write it as the thing to decide. Tapping it
opens the approval through the approver's own signed link, the same one their
email carries, so a low- or medium-risk request can be decided without
signing in. Push is sent alongside email, never instead of it. A device that
has turned push off, or that the push service reports gone, is forgotten.

### Seeing whether people keep up

**Admin → Decisions** shows, for the last 7, 30 or 90 days:

- how many requests were made, and how many came from agents;
- the approval rate, and the median and 90th-percentile time to decide.
  These count only requests a person settled, so expired ones don't skew it;
- how often a request expired with nobody answering;
- requests per day, by outcome.

It also lists who open requests are waiting on right now, including guests and
requests that named nobody (the admins'), and the oldest open requests. The
"settled by policy" figure is the gate's autonomy rate: the share of gated
actions a rule allowed without asking anyone.

### Out of office

A request addressed to one person waits for that person. When they are away,
they can name who covers for them under *Out of office* in their own **Settings**: a
colleague, an end date (up to 90 days) and an optional note. While it runs:

- **New requests** that name them also go to the colleague covering, with the
  reason recorded ("Covering for Dana, who is away until 2026-10-08").
  Cover never raises how many approvals a request needs: a request needing
  one signature from Dana needs one from Dana or Sam, not both.
- **Requests already waiting** on them, which they have not decided, are
  widened to include the colleague. This happens when cover is saved, or
  when it starts if it was set in advance. It goes through the same path as
  "bring somebody else in", so it is audited as `approval.escalated`, sent as
  that webhook, and the colleague gets the usual email and Slack or Teams
  message.
- **The person away stays on every request** and can still decide. Coming
  back ("I'm back") stops new requests going to the colleague. Nobody is
  removed from a request they were added to.
- **The approval page** shows it: *Dana (away; Sam is covering)*.

Cover goes one hop only: if the colleague is also away, their own cover is not
followed. Both people must be active members, and nobody can cover a request
they made themselves.

### Approve with changes

Send the arguments you will act on as `input`, and name the ones a person may
correct in `editableFields`:

```
POST /api/v1/approvals
{
  "title": "Refund £420 to Acme",
  "input": { "orderId": "1042", "amount": 420, "currency": "GBP" },
  "editableFields": ["amount"]
}
```

The approval page shows `input` field by field, and lets the approver change
the editable ones before approving: "Approve with changes". When it settles,
`approvedInput` is what to run with, which is `input` with their corrections,
and `changes` lists them as `{ field, from, to }`. The `approval.approved`
webhook and callback carry the same `input` and `changes`. Run with
`approvedInput`, never with what you proposed.

The rules:

- **Only flat values** (strings, numbers, true/false) can be editable, and a
  correction keeps the value's type. Nothing can be added or removed, and a
  field that was not offered cannot be changed.
- **Only on an approval**, and only when one approval settles the request. A
  request that needs several approvers is approved as proposed, because an
  earlier approver agreed to the proposal, not to a correction they never saw.
- **A gate's approval** shows the action's input, and offers the fields the
  action registered as `editableFields`, each held to that field's schema: a
  corrected amount cannot exceed the action's `maximum`. `GET /gates/{id}`
  then returns the corrected `input`, with `changes` beside it.

### Concerns

An organisation can write ethics rules (Admin → Ethics) about the kinds of
request it wants a person to weigh before an agent goes ahead. They read every
approval or gate check made through the API or MCP, whatever the key or
connector; only an approval a person raises in the app itself is exempt. When
one matches, the approval and the gate result carry it in `concerns`:

```
"concerns": [
  { "principle": "fairness", "rule": "Decisions about someone's job",
    "concern": "This may affect someone's employment. Is the decision based on relevant facts?" }
]
```

`concerns` is empty when nothing matched, and records the rules as they read
when the request was made. A request with concerns:

- **reaches its approvers with the concern first**: on the page, in the email,
  in Slack and Teams, and in the push notification;
- **is approved with a written reason**, which goes on the record as the
  approval's `note`, and never with one tap in Slack or Teams;
- **is never decided from the sign-in-free link** in an approval email, and
  cannot be addressed to a guest;
- **at the gate, goes to a person** even when a policy would have allowed it.
  A rule that refuses turns the gate's answer into `denied`, with the rule's
  concern as the `reason`, and an approval request into `refused_by_rule`.

Rules only ever add oversight. None can approve anything, so wording a request
to avoid one gains nothing an agent is entitled to.

An organisation on Business or above can also switch on the **model screen**
(Admin → Ethics), up to a monthly number of requests its plan sets. A
model reads each agent request and may add up to three concerns, which
arrive in `concerns` with `"rule": "Model screen"`. It can only add a
concern: it never approves, refuses or removes anything. If it cannot run,
or the month's screens are used up, the request is read by the
organisation's rules alone. A request it declines
to assess gets one concern asking the approver to read it with care. It can
add a few seconds to creating an approval or answering a gate call, and
fields an action marks restricted are never sent to the model provider.

**Restricted fields** (an administrator's sensitivity label) are neither
shown nor editable on the page reached from an email link without signing
in. Slack and Teams buttons approve as proposed.

In the SDKs, `decision.input` is what to run with and is null unless it was
approved. The Claude Agent SDK and LangGraph adapters pass corrections
through: `deliverdCanUseTool({ editable: (tool) => ... })` runs the tool with
the approved input.

## Reviews

An approval asks permission for something that has not happened. A **review**
asks judgement on something that has: named people read the work and return a
verdict of `approved` or `changes_requested`.

```bash
curl -X POST https://deliverd.dev/api/v1/reviews \
  -H "Authorization: Bearer $DELIVERD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Q3 board pack",
    "reportId": "…",
    "instructions": "Check the figures against the ledger.",
    "reviewers": ["partner@firm.example"]
  }'
```

`201` with the review and its `url`. Poll `GET /api/v1/reviews/{id}`, or
subscribe to `review.approved` and `review.changes_requested`.

**There is no endpoint that records a verdict.** A verdict is a person's
judgement, and an API key is not a person — the same reason there is no
endpoint that decides an approval. The reviewer records theirs on the page,
where they have just read the work.

A reviewer must be an **active member or a guest who can already open the
report**. Anything else is refused at creation rather than emailed into
nothing, which also means an agent cannot use this to reach an address of its
choosing. Share the report with someone before naming them.

The requester cannot review their own request. One reviewer gives one verdict;
a second is refused, because the first is evidence. `requiredApprovals`
decides how many approvals settle it, and a single `changes_requested` settles
it regardless.

`threadCount` on the response is how many comment threads the reviewers opened
while reading. Read them with `GET /api/v1/reports/{id}/comments` and turn them
into the next version with `POST /api/v1/reports/{id}/revision-briefs`.

**Ask a team, not a person.** A reviewer entry can also be the name or id of a
directory group or a workspace, or a word meaning the whole organisation
(`"everyone"`) — the same words that work for an approval and for a report's
audience. A review addressed to one person waits for that person to come back
from holiday; one addressed to `["QA team"]` can be answered by anyone on it,
and the record keeps both halves: what you named, and who it reached. A team
holds members only, so addressing one never reaches a guest.

The refusals match the approvals ones: a name matching both a person and a team
is `400 ambiguous_reviewer` naming both rather than a guess, and a team with
nobody else in it is refused rather than silently reaching no one.

**A person can ask too.** Inbox → *Ask for* → *Review*, or a report's menu,
which attaches the report **and pins its current version** — so publishing
again mid-review does not move the ground under the reviewer. The picker
offers members and the guests the organisation already knows, naming a member
by id and a guest by address, which is what the resolver above matches on.

Over MCP: `request_review` and `get_review`. In the SDK:

```ts
const outcome = await deliverd.review({
  title: "Q3 board pack",
  reportId: report.id,
  instructions: "Check the figures against the ledger.",
  reviewers: ["partner@firm.example"],
});
if (!outcome.approved) await revise(outcome.verdicts);
```

## Collections

An approval asks permission. A review asks judgement. A **collection** asks for
a fact: the figure, the date, the choice between two treatments, the sentence
only the client can write. It is the one primitive that goes the other way —
the agent is asking, and it stops until somebody answers.

```bash
curl -X POST https://deliverd.dev/api/v1/collections \
  -H "Authorization: Bearer $DELIVERD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Before I can finish the Q3 pack",
    "instructions": "Three things the ledger does not tell me.",
    "questions": [
      { "prompt": "Closing headcount at 30 September", "kind": "number" },
      { "prompt": "Revenue recognition basis", "kind": "choice",
        "options": ["Accrual", "Cash"] },
      { "prompt": "Anything the board should know that is not in the numbers?",
        "kind": "long_text", "required": false }
    ],
    "respondents": ["cfo@client.example"],
    "dueAt": "2026-10-01T09:00:00Z"
  }'
```

`201` with the collection and its `url` — the page the people you asked will
fill in. Poll `GET /api/v1/collections/{id}`, or subscribe to
`collection.completed`.

The kinds are `text`, `long_text`, `number`, `date`, `choice`, `multi_choice`
and `boolean`. **A value is checked against its question's kind before it is
stored**, so a `number` comes back as a number and not as the string somebody
typed. A required question blocks submission; an optional one does not. There
is no `file` kind.

**Ask a team, not a person.** A respondent entry can be a group, a workspace or
the whole organisation as well as a member or a guest, resolved exactly as a
reviewer is; `ambiguous_respondent` is the refusal for a name that means two
things. `requiredResponses` is still counted against the people the team came
to, and is fixed when the request is made.

**A person can ask too.** Inbox → *Ask for* → *Information* builds the
questionnaire — up to forty questions across the seven kinds, reordered where
they sit, each with its own hint and required flag. It sets `dueAt` from one
deadline and `expiresAt` a day later, so being late is not the same as being
too late; the API lets you set them independently.

**There is no endpoint that submits an answer.** An answer is a person's, and
an API key is not a person — the same reason there is no endpoint that decides
an approval or records a verdict. If your agent knows the figure, it does not
need to ask.

A respondent must be an **active member or a guest the organisation already
knows**. Anything else is refused at creation rather than emailed into nothing,
which also means an agent cannot use this to reach an address of its choosing.

`requiredResponses` decides how many submitted replies complete it; omitted, it
is everyone you asked. **A reply that has not been submitted carries no
answers** in the response body: a half-typed draft is not what anyone meant to
say. `dueAt` is shown to the person and is what the single reminder is measured
against — one nudge per person, ever. `expiresAt` closes the request unanswered.

`POST /api/v1/collections/{id}/cancel` withdraws it. The request stays as evidence
of what was asked and dropped.

Over MCP: `request_information` and `get_collection`. In the SDK:

```ts
const collected = await deliverd.collect({
  title: "Before I can finish the Q3 pack",
  questions: [
    { prompt: "Closing headcount at 30 September", kind: "number" },
    { prompt: "Revenue recognition basis", kind: "choice",
      options: ["Accrual", "Cash"] },
  ],
  respondents: ["cfo@client.example"],
});
if (collected.complete) {
  const headcount = collected.answers["Closing headcount at 30 September"];
}
```

## Flows

An approval, a review and a collection each answer one question. A job that
needs more than one of them is still one job, and a **flow** is the thread
that ties them together — so the history reads as one sequence rather than as
four unrelated lists.

```bash
curl -X POST https://deliverd.dev/api/v1/flows \
  -H "Authorization: Bearer $DELIVERD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "title": "Q3 close", "externalId": "close_2026_q3" }'
```

`201` with the flow and its `url` — the timeline page a person can open.
Nothing is attached here. A member joins by naming `flowId` when **it** is
created:

```bash
curl -X POST https://deliverd.dev/api/v1/collections \
  -H "Authorization: Bearer $DELIVERD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "title": "Before I start", "flowId": "…", "questions": […], "respondents": […] }'
```

`flowId` is accepted on `POST /approvals`, `POST /reviews`, `POST /collections`
and `POST /reports`. Attaching takes the member's own write scope — naming a
flow on an approval needs `approvals:write`, not `flows:write` — because what
is being created is the approval. A report joins on its **first** publish
only: the report is the member, not the version, so a new version keeps
whatever flow the report is already in.

**It groups and does nothing else.** No steps, no transitions, no dependencies
between members, no visual builder. Nothing waits on a flow and nothing is
blocked by one — do the work in the order you want it done and name the flow
as you go.

`GET /api/v1/flows/{id}` returns the members and the `timeline`: every audited
step across the flow and everything in it, in the order it happened.
`allSettled` says nothing is outstanding **at this moment**. It is not a claim
that the job is finished — a flow is extended as it goes, so nothing closes one
automatically, and an empty flow is never settled.

`POST /api/v1/flows/{id}/complete` says the work is done; only whoever started
the flow may, and it stops taking new members. It is allowed with members still
outstanding, and how many is recorded and sent with `flow.completed` — a flow
that could not be closed until every reviewer replied would be one that stayed
open for ever. `POST .../cancel` calls the work off; the flow and its members
stay as evidence, and nothing inside it is cancelled.

Over MCP: `create_flow` and `get_flow`. In the SDK the flow is a handle:

```ts
const flow = await deliverd.flows.resume({
  title: "Q3 close",
  externalId: "close_2026_q3",   // so a restart extends this one
});

const { answers } = await flow.collect({ title: "Before I start", questions, respondents });
const outcome = await flow.review({ title: "Draft pack", reportId, reviewers });
if (outcome.approved) await deliverd.publish({ title, content, flowId: flow.id });

await flow.close();
```

`flow.approve()`, `flow.review()` and `flow.collect()` are the same calls with
the flow already named — which is the point of the handle: a `flowId` passed by
hand at four call sites is one that gets left off the fifth, and that step is
then missing from the history with nothing to say so.

## Evidence

Show your working. One call assembles the whole record of a piece of work:
every approval, review and request for information with who was asked, what
they were told and what they said, the report's version history, and the
timeline across all of it.

```bash
curl "https://deliverd.dev/api/v1/flows/$FLOW_ID/evidence" \
  -H "Authorization: Bearer $DELIVERD_API_KEY"

# Or the deliverable itself, which is what an auditor usually names:
curl "https://deliverd.dev/api/v1/reports/q3-board-pack/evidence" \
  -H "Authorization: Bearer $DELIVERD_API_KEY"
```

A **flow** is the better subject when the job is in one — it is the whole
piece of work. A **report** works whether or not there is a flow: its steps
are the approvals, reviews and requests that point at it, plus its own
versions. Nothing published before flows existed is in a flow, so the report
subject is the one that answers for work a firm has already done.

`?format=csv` returns the timeline alone as a spreadsheet. The JSON is the
whole record — a CSV cannot hold a step's questions, verdicts and answers, so
the file opens with a line saying as much rather than being filed as
everything there was. The PDF is on the **Evidence pack** control on the flow
or report page: it is the document a person reads, and it costs a headless
browser, which is not what an API client wants.

**Scopes.** An evidence export requires `reports:read`, `approvals:read`,
`reviews:read` **and** `collections:read`. Nothing in a pack is new
disclosure — every part is already readable through the individual endpoints —
but it arrives in one call, so one scope would otherwise yield what four used
to. A key missing any of them is refused by name rather than handed a thinner
pack, because a partial record with nothing saying it is partial is worse than
a refusal. In the product, exporting is owners and administrators only.

**What the digest means.** Every pack carries an `integrity` block:

```json
{
  "algorithm": "sha256",
  "digest": "…",
  "covers": "This digest is taken over the pack as it was exported…",
  "doesNotCover": "It says nothing about the records themselves…",
  "recordsAreInsertOnly": true
}
```

The digest is computed over the pack with the `digest` field removed, so a
recipient can recompute it and tell whether the file was altered after it left
Deliverd. It makes **no claim about the records themselves**. What stands
behind those is that the audit trail is append-only — entries cannot be
updated or deleted — which is tamper-evident history, not cryptographic
immutability. Both sentences ship inside the pack, because a hash with no
qualification beside it reads as the stronger claim.

Every export is itself audited as `evidence.exported`, carrying the digest, so
the trail records which copy was taken and not only that one was.

Over MCP: `get_evidence`, taking `flowId` or `report`. In the SDK:

```ts
const pack = await flow.evidence();
const pack = await deliverd.reports.evidence(report.id);
```

## The action registry

The consequential things your software may do, named once per organisation so
a policy can be written about them and a person can understand one. Tools are
implementation details; actions are the stable vocabulary.

```http
POST /api/v1/actions            actions:write
GET  /api/v1/actions            actions:read
```

```bash
curl -X POST https://deliverd.dev/api/v1/actions \
  -H "Authorization: Bearer $DELIVERD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "actionId": "finance.refund",
    "name": "Issue customer refund",
    "displayTitle": "Refund {{amount}} {{currency}} to {{customer_id}}",
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
  }'
```

It is an **upsert**: registering the same id again is the normal case, because
this runs on every deploy. It overwrites only the half your code owns. An
administrator's title, risk category and per-field sensitivity are kept
separately and survive a re-registration — and no administrator can edit
the input schema, because a schema they could loosen is a check your code no
longer performs.

**An agent principal is refused**, with `403 agent_not_permitted`. Policy is
keyed on the action id: an agent able to name actions could define the
vocabulary its own policy is written against — register `finance.refund_v2`
and gate on that rather than on the `finance.refund` everybody wrote rules
for. Register from your deploy, with a key bound to a person who is an owner
or administrator; any other member gets `403 not_permitted`, because
registering rewrites an existing action's schema and default risk.

The schema is a small subset of JSON Schema, written out rather than depended
upon so both SDKs can carry it: `type`, `properties`, `required`, fields of
string, number, integer or boolean, with `enum`, `minimum`, `maximum`,
`minLength`, `maxLength` and `pattern`. Unknown keywords are refused rather
than ignored (`400 invalid_definition`), and so are unknown *input* fields at
request time (`400 invalid_input`) — a field no policy examined is a field
that slipped past one. Both refusals carry a `problems` list naming what was
wrong, rather than only that something was.

`GET` is paged like every other list — `?limit=` and `?cursor=`, with
`nextCursor` null at the end. Sensitivity labels are not returned: telling the
caller which values are confidential tells it which are worth taking.

## The gate

Ask before you act. The agent declares the action it is about to perform and
the arguments it will perform it with; your organisation's policy answers.

```http
POST /api/v1/gates          gates:write
GET  /api/v1/gates/{id}     gates:read
```

```bash
curl -X POST https://deliverd.dev/api/v1/gates \
  -H "Authorization: Bearer $DELIVERD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "actionId": "finance.refund",
    "externalId": "refund:ord_8812",
    "input": { "customer_id": "cus_1", "amount": 1240, "currency": "GBP" },
    "reason": "Customer reported a duplicate charge"
  }'
```

One field to branch on:

| `status` | `allowed` | What happened |
|---|---|---|
| `allowed` | `true` | A rule permitted it. Go ahead, with exactly the `input` returned. |
| `denied` | `false` | A rule refused it. `reason` and `rule` say which and why. |
| `pending` | `false` | Nobody has decided yet. An approval has been raised; `approvalUrl` is where it is. |
| `approved` | `true` | A person agreed to it. |
| `rejected` / `expired` / `cancelled` | `false` | Nobody said yes. |

**A denial is `200`, not `403`.** It is a result you act on, not an error — an
agent told no behaved correctly by asking. Putting it in the error channel
would route the most ordinary policy outcome through every client's failure
path.

**`externalId` is required**, which no other `POST` here does. A random
per-attempt idempotency key protects a retried HTTP request, not a retried
*decision*: a crashed agent re-running its refund step would raise a second
approval for the same money. A retry with the same id re-reads its decision and
comes back `200` with `reused: true`; a first ask comes back `201`. No id
Deliverd could invent would know which two calls are the same unit of work, so
you name it.

**It fails closed.** An unregistered action, input its schema does not
describe, and a policy that cannot be read all refuse or ask a person — none of
them proceed. An action no rule mentions goes to a person, because it is one
nobody has decided about.

**An agent key is welcome here**, and this is the only one of the three
control-plane surfaces of which that is true. Registering an action is refused
to agents because policy is keyed on the action id; writing policy is refused
because policy decides whether an agent needs a person. Neither argument
touches this: an agent calling `gate()` is submitting to the rule rather than
writing it, and an agent that cannot ask can only proceed unasked.

While a decision is pending, poll `GET /gates/{id}`. When a person answers,
`outcome` and `settledAt` fill in and `status` becomes what they decided. The
SDKs have a `wait()` that does the polling for you, in `gate()`:

```ts
const decision = await deliverd.gate({
  action: "finance.refund",
  externalId: `refund:${order.id}`,
  input: { customer_id: order.customerId, amount: 1240, currency: "GBP" },
});
if (!decision.allowed) return;
await stripe.refunds.create(decision.input);
```

`wait()` is the default, so that call blocks until policy or a person settles
it; `deliverd.gates.create()` is the same request without the wait, for a
handler that must not hold a connection open. **Act on `decision.input`, not on
the object you sent** — see the note under the request body above.

Both SDKs carry it: `@deliverd/sdk` on npm and `deliverd` on PyPI. The Python
call takes the same arguments under snake_case names and returns the same
decision.

**The decision is advisory.** You report what you intend to do, policy answers,
and your own code then performs the action — Deliverd never runs it for you.
So the discipline is yours: act only on an allowed decision, and with exactly
the `input` it returned. What the gate gives you is a question asked before the
act, answered by somebody other than the caller, and written down either way.

## Gate policy

The registry says what your software may do. A policy says what any of it
**costs**: allowed outright, refused, or a person decides.

```http
POST /api/v1/policies                    policies:write
GET  /api/v1/policies                    policies:read
POST /api/v1/policies/{id}/versions      policies:write
POST /api/v1/policies/{id}/activate      policies:write
POST /api/v1/policies/simulate           policies:read
```

```bash
curl -X POST https://deliverd.dev/api/v1/policies \
  -H "Authorization: Bearer $DELIVERD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Refunds",
    "activate": true,
    "rules": [
      {
        "name": "Large refunds need two people",
        "priority": 10,
        "effect": "require_human",
        "match": {
          "actions": ["finance.refund"],
          "input": { "amount": { "gt": 1000 } }
        },
        "params": { "requiredApprovals": 2, "approvers": ["finance-leads"] }
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
  }'
```

A rule has a `name`, an `effect` of `allow | deny | require_human`, a
`priority` (lower decides first, default 100), a `match`, an optional
`explanation`, and for `require_human` a `params` of `requiredApprovals`,
`approvers`, `expiresInMinutes` and `escalateAfterMinutes`. The first decisive
rule by priority wins, so an `allow` above a `deny` is how an exception is
written; where several rules match, the tightest constraint across all of them
applies and named approvers are **unioned** — two rules each naming a
different person mean both, because either alone would have.

`match` takes `actions` (a dotted id, or the prefix `finance.*`), `agentIds`,
`environments`, and `input` mapping a field name to one of `eq`, `ne`, `gt`,
`gte`, `lt`, `lte` or `in`. Conditions are structured rather than parsed from
strings like `"> 1000"`: a parser's failures here are silent, and a rule that
matches nothing is indistinguishable from one that has not fired yet. A
condition naming a field the action's schema does not declare is refused at
authoring time (`400 invalid_rules`, with a `problems` list naming each one)
for the same reason — an administrator would otherwise believe a control
exists.

**`invalid_rules` and `invalid_policy` are different answers.** The first is
yours: the rule set cannot be stored as written, `problems` says why, and
editing the file fixes it. The second is ours — a policy the server could not
read or store — and answers **500**, because there is nothing you can change.
Three more answers are worth branching on: a policy name already in use is
`409 duplicate`, activating a version that has been replaced is
`409 superseded`, and a version that is not there — or a policy that is not
there, when you post a version to one — is `404 not_found`. An id belonging to
another organisation answers `404` too: "not yours" and "no such policy" look
the same from outside.

**No matching rule means a person decides.** This is the opposite of the
publishing policy, which allows what no rule forbids. That one governs work
people were already doing; a gate is new, so it can hold the stricter line, and
an action nobody has written a rule about is an action nobody has decided
about.

**Policies are versioned, and a version that has been in force is immutable.**
`POST /versions` takes the complete rule set rather than a patch, because a
version has to be readable on its own — it is what every decision made under it
points at. `POST /activate` swaps which one is in force and supersedes the
other; a superseded version cannot be revived, so copy its rules into a new one
instead. Creating a policy is **not** an upsert, unlike registering an action:
a second policy of the same name is refused, because silently replacing the
rules an organisation is running under is the one write nobody should make by
accident.

**These endpoints need more than a scope.** The key's holder must be an owner
or an administrator of the organisation, read fresh on every call — a key
outlives a role change. Writing a rule is how authority is granted:
`"effect": "allow"` is the sentence that removes the human, so a member holding
a `policies:write` key is refused (`403 not_permitted`) exactly as if they did
not. An agent principal is refused outright (`403 agent_not_permitted`), since
policy decides whether an agent needs a person.

`POST /policies/simulate` answers what a request would meet, and changes
nothing:

```bash
curl -X POST https://deliverd.dev/api/v1/policies/simulate \
  -H "Authorization: Bearer $DELIVERD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"actionId":"finance.refund","input":{"customer_id":"cus_1","amount":40,"currency":"GBP"}}'
```

It runs the same evaluation a real request runs — same action lookup, same
schema validation against the registry, same rules in force — so the action
must exist and the input must satisfy its schema here exactly as in production.
It is **not** scoped to one policy: every active policy is evaluated together
as one rule set, so simulating a policy in isolation would report that its
rule fires when a higher-priority deny elsewhere is what a real request would
meet. Nothing is recorded, so a simulation never appears in your autonomy
figures. The response's `governed` is false when nothing matched — that is the
fail-closed default asking for a person, not a rule that did.

## Agent policy

Two things govern what an agent sets in motion, and they are not the same as
its key's scopes.

**Permissions** say which of publish, collect, review and approve an agent may
request at all. A scope is what a key may call; a permission is what the agent
behind it may put in front of a person — and an administrator can withdraw one
without reissuing a key, on the agent's page under **Admin → Agents**.
A missing permission means allowed, so nothing changes until somebody turns
something off. The refusal is `403 action_not_permitted`.

**Standing rules** decide how a request is handled before anybody sees it, set
under **Admin → Policies**. Each rule matches on agent, action and a
risk floor — all optional, all meaning "any" when unset — and does one of two
things:

- **Escalate**: more people must agree, and optionally it goes to named
  approvers as well as whoever the requester asked for. The rule's approvers
  are *added*, never substituted: the requester wanted one person's judgement
  and the rule wanted another's, and both were meant.
- **Refuse**: `403 refused_by_rule`, carrying the rule's explanation.

**An identity that is not there** answers `404 agent_not_found`. Nothing is
wrong with the credential — it still authenticates, and what is gone is the
identity it speaks as, so every call the key makes fails the same way until the
agent is recreated or the key is reissued against one that exists. Deleting an
agent is therefore not a way to pause it; withdrawing its permissions is.

An escalating rule may also carry a **deadline** — between five minutes and
fourteen days. Without one it behaves as it always has and adds its approvers
when the request is made. With one it holds them back and brings them in
once the request has gone that long unanswered — so a single rule form
expresses both *two people from the start* and *one person, and a second if
nobody has answered by lunchtime*. A rule that refuses still decides at
creation whatever else it carries: there is no point waiting to say no.

The automatic widening happens **once** per request, whatever rules match.
Repeated automatic widening would walk a request out to the whole organisation
while nobody was looking.

Refuse beats escalate whatever order the rules were written in. Among
escalations the strictest count wins and the named approvers are unioned.

**A rule can only make a request harder. There is no auto-approve.** The
obvious next feature is "low-risk requests from this agent go through
automatically", and it is absent on purpose: `risk` is declared by whoever
makes the request, so a rule keyed on it is a rule the agent writes for
itself. An agent that could mark its own work low-risk would have talked its
way past the approval rather than obtained one. Pre-authorisation needs a fact
the agent cannot choose — an amount checked against a system of record — and
there is not one yet.

### An approval that needs more than one person

When a rule escalates, `GET /api/v1/approvals/{id}` carries the progress:

```json
{ "status": "pending", "requiredApprovals": 2, "approvalsSoFar": 1 }
```

Poll on those two rather than on `status` alone — "waiting on one more person"
is a different situation from "waiting on anybody". `get_approval` says the
same thing in its message.

**One rejection settles it**, however many approvals were required; the point
of asking two people is that either may stop it, not that both must agree.

### Bringing somebody in by hand

Anybody already asked, and any organisation administrator, can add approvers to
a pending request from its page. It is the same act the rules perform and it
obeys the same limits: `requiredApprovals` is untouched, the requester is
filtered out, and **nothing anywhere removes an approver**. Letting one take
somebody off would let the person least willing to decide choose who does, and
it would leave "who was asked, and when did that change" answerable only at the
end rather than at every point in the request's life.

Each addition records who made it and why, both of which appear on the page and
in the evidence pack, and emits `approval.escalated`. People added this way get
the notification an original approver got, because it is the same thing that
happened to them. Adding by hand does not consume the rules' one automatic
widening, and the rules firing does not stop a person adding whoever they
actually needed.

A second decision from the same person is refused rather than counted. The
settling decision is `approval.approved` or `approval.rejected` as before, and
every decision along the way is audited as `approval.decision_recorded`.

`requiredApprovals` is fixed when the request is made and never re-read, so a
rule changed while people are deciding cannot move the bar under them.

## Scheduled updates

`GET /schedules` lists the recurring publishes an organisation expects.
`GET /schedules?due=1` narrows it to the ones waiting on work. An agent key
sees only its own schedules; a user key sees the organisation's.

**A schedule is due once it has fired and nobody has acted on it since.**
That is not the same as "the next run time has passed": `nextRunAt` moves
on at the moment a schedule fires, so by the time anyone asks, the next run is
always in the future.

Acting means either publishing a new version **or writing a dataset**. A
living dashboard reads `_data/…` at view time, so refreshing this morning's
numbers is the whole job — there is no new markup to publish, and requiring
one would mean republishing an unchanged report to move a timestamp the agent
does not care about.

Either clears it. There is nothing to acknowledge and no state to reset —
publish a version or update the data, and the schedule drops off the due list
on the next call.
An agent that decides there is nothing worth publishing this week leaves the
schedule due until the next firing moves the timestamp on, which is a true
statement about the schedule rather than an error.

```
GET /api/v1/schedules?due=1
Authorization: Bearer dlv_…

{ "schedules": [ {
    "id": "…", "reportSlug": "finance/weekly", "reportTitle": "Weekly Finance Report",
    "reportUrl": "https://…", "agentName": "Finance Reporting Agent",
    "recurrence": "0 9 * * 5", "enabled": true,
    "lastRunAt": "2026-09-04T09:01:11Z", "nextRunAt": "2026-09-11T09:00:00Z",
    "currentVersion": 4, "due": true, "dueSince": "2026-09-04T09:01:11Z"
} ] }
```

The MCP equivalent is `list_due_schedules`, which takes an optional `all` to
show the whole timetable rather than only what is outstanding.

Recurrence is a five-field cron expression evaluated in UTC. An expression
with no occurrence in the coming year (`0 0 30 2 *`) is refused at creation,
and a stored one is disabled rather than treated as permanently due.

### Setting the timetable

```
POST   /api/v1/schedules              { reportId, agentId, recurrence }
PATCH  /api/v1/schedules/{id}         { recurrence?, enabled? }
DELETE /api/v1/schedules/{id}
```

All three take `schedules:write`, and all three **refuse an agent key** with
`403 not_permitted`. A schedule is an instruction *to* an agent, so deciding
one is a person's job — the read side already works that way, showing an
agent only the schedules addressed to it.

Changing the recurrence re-times the next run, so a weekly publish moved from
Friday to Monday does not fire once more on the Friday. Turning a schedule
back on does the same, because one that has been off for a month carries a
next run a month in the past, which would otherwise read as due.

`DELETE` and `{"enabled": false}` say different things and both are worth
having: disabled is "not for now" and keeps the record, deleted is the
recurring job being over. Removing one leaves the report and its versions
untouched.

Creating counts against the plan's `maxScheduledAgents` limit — `409
limit_reached` — measured in enabled schedules, so turning one off frees the
slot. The MCP tools are `create_schedule`, `update_schedule` and
`delete_schedule`; the CLI is `deliverd schedules create|update|rm`.

## Sending a report

`POST /reports/{idOrSlug}/send` takes a list of email addresses and emails
each one a link, with a covering note.

```
POST /api/v1/reports/finance/q3-pack/send
{ "to": ["sarah@client.com", "ops@client.com"],
  "message": "Final numbers — let me know by Friday if anything looks wrong.",
  "expiresInDays": 90 }
```

Distinct from `POST …/share`, which grants access to people the organisation
already knows — members, teams, guests who exist. The audience resolver
matches those and nothing else, so a client address nobody had used before
comes back `unresolved`. Sending creates the guest record behind each address
first.

**Not a mailing list.** Each recipient gets their own link tied to their own
guest record, which is what makes the audit trail and the per-reader
analytics mean anything, and why the list is capped at 50. The link keeps
working as the report is updated, so there is no new file to send next time.

It grants access exactly as a share does, so the same rules apply: the
organisation's publishing policy for sharing outside it — the built-in rule
*"Confidential reports stay inside the organisation"* refuses it outright —
the agent's own allow-list, the maximum expiry, the audit trail and the
`report.shared` webhook. Beside those, one `report.sent` audit event records
the act: who sent it, to whom, and whether a note went with it.

`allowComments` defaults to true: sending a client the work and hearing
nothing back is half the job. A recipient who already had access is emailed
again rather than skipped — re-sending to somebody who says they never got it
is the point, and `alreadyHadAccess` names them.

The MCP tool is `send_report`; the SDK is `deliverd.reports.send()`; the CLI
is `deliverd send <report> --to …`.

## Anyone with the link

`POST /reports/{idOrSlug}/share` takes an `audience`, and one principal in it
needs no sign-in at all.

```
POST /api/v1/reports/finance/weekly/share
{ "audience": [ { "type": "public", "id": null } ] }

{ "granted": [ { "type": "public", "id": null } ] }
```

**The URL does not change.** It is the report's own address, the same one
every other reader uses; what changes is who it will be served to. Nothing
new is minted, so there is no second link to keep track of and no token to
leak — turning public access off takes the same
address back.

Four things constrain it, and the first is the one that catches callers out.

**The organisation has to have turned public links on**, under Admin →
Sharing, and it is off until somebody does. That switch is read when a reader
arrives rather than when the grant is written, so this call answers 200 with
the switch off and every anonymous visitor is then refused `public_disabled`.
A 200 here is not by itself a working link. The order is deliberate — switching
public links off has to close the links that already exist — but it does mean
you can hand somebody an address that has never worked.

**A confidential or restricted report can never be public.** Two layers say so
independently: the built-in rule *"Confidential reports stay inside the
organisation"* refuses a public grant, and even with a grant in
place the reader is refused `classification_not_public`. Lower the
classification first if that is wrong.

**An agent key cannot do this**, and neither can any key not tied to a person.
Both answer `403 public_sharing_denied`. It is the one audience type an
autonomous identity may never grant, said twice over: the built-in rule
*"Agents cannot create public links"*, which cannot be switched off, and a
separate check that applies whatever an agent's own policy says.
Every other principal type — a colleague, a team, a workspace, a guest, an
email domain — an agent may grant normally.

**A public reader only ever reads.** A public grant never carries comment
rights, so there is no public commenting and no public feedback: the report,
and nothing around it.

One thing does change beside the access. A public report gets a real link
preview — title, description and the time it last changed — where a private one
gets a bare card that says nothing about the contents. Same three conditions:
the switch, the classification, a live grant.

Turning it off is `DELETE …/share` with the same audience, below. Anonymous
readers are refused `not_public` from that moment — the address stays valid and
stops serving them. It writes
`share.public_disabled` where an ordinary grant writes `share.revoked`, and
enabling writes `share.public_enabled` rather than `share.created` — a report
becoming readable by anybody is not the same event as a report reaching one
more colleague, and the audit trail should not have to be read twice to tell
them apart.

From the app, the same switch is in the share dialog on the report, under
**Anyone with the link** — shown on every report whether or not the
organisation allows it, so the option is findable rather than silently absent.

## Taking access away

`DELETE /reports/{idOrSlug}/share` takes the same `audience` the POST takes,
and removes every grant that matches it.

```
DELETE /api/v1/reports/finance/weekly/share
{ "audience": ["sarah.jones@acme.com"] }

{ "revoked": [ { "type": "user", "id": "…", "label": "Sarah Jones" } ] }
```

**By audience, not by grant id**, because a grant id is not something a caller
can get: the audience on `GET /reports/{idOrSlug}` carries each grant's
*principal* id, never an id for the grant itself. Saying again what you said to grant it
is also the symmetry you would expect.

Two refusals worth knowing. The **owner's access cannot be revoked** — it is
what keeps a report reachable by the person responsible for it, and removing
it leaves work nobody can open and nobody can put right. And an audience that
**never had access is an error, not a no-op**: a caller told "revoked" for a
grant that was not there would report the door shut while it is open.

Every removal writes `share.revoked` (or `share.public_disabled` for a public
link) against the report, one per grant, exactly as the app does.

`revoke_access` over MCP, `deliverd.reports.revoke()` in the SDK, `deliverd
unshare` on the CLI.

## A PDF of a shared report

Add `?format=pdf` to a report's own address and the reader gets a PDF of
it:

```
https://reports.example.com/acme/finance/weekly?format=pdf
```

**It is the page as that reader would see it**, not a copy assembled from
the stored files: their pinned version, their per-viewer watermark, and their
refusal if their access lapsed an hour ago all apply exactly as they do when
they open the report.

Downloads have to be allowed: by the organisation's downloads switch, and by
its publishing policy, whose built-in rules keep a restricted classification
read-only. A PDF is audited as `report.downloaded` with `format: "pdf"`, and
counts as one view.

An anonymous reader of a public report gets one too, with nothing extra
issued to them.

Members can also export a PDF from the report page. This is for the client,
who never sees that page: they have the link, so the PDF is on the link. It is
also offered in the client portal where downloads are enabled.

## Readership

`GET /reports/{idOrSlug}/analytics` answers "did anyone read this": total
views on every plan, and — with analytics on the plan — unique, internal and
external readers, a 30-day series, views per version, and recent readers.
Reader names appear only where the organisation's sharing policy shows viewer
identities; otherwise the kind of reader stands in.

`GET /analytics` answers the question that does not name a report: what is
being read across the organisation. Total views and unique readers over the
period, how many reports are live, shared outside the organisation and
public, how many publishes happened, the most-read reports, and the live
reports **nobody has opened**. That last list is the reason this endpoint
exists — it cannot be reconstructed from per-report calls, because a report
nobody has read does not appear in anything you would think to ask about.

`?days=` (1–365, default 30) and `?limit=` (1–50, default 10) size it. Not
cursor-paged: it is a summary with two bounded leaderboards, and a caller who
wants every report has `GET /reports`. Organisation-wide readership is part
of analytics, so it refuses with `plan_required` below Team; the per-report
call keeps its total-view count on every plan because the reports list
already shows it.

The MCP tools are `get_report_analytics` and `get_org_analytics`; the SDK is
`deliverd.reports.analytics()` and `deliverd.reports.orgAnalytics()`; the CLI
is `deliverd analytics <report>` and `deliverd analytics` with no argument.

## Feedback, images and revision briefs

### Is anything waiting on me?

`GET /comments` lists every open thread in the organisation, newest activity
first, with the quoted passage and who wrote it. `GET
/reports/{idOrSlug}/comments` answers the same question one report at a time,
which means walking every report to find the two with feedback on them.

Threads on archived reports are left out: the URL does not serve, so nothing
can be done about them until somebody unarchives it.

Each thread carries `reportOwnerId`, so a caller can narrow to the reports
they own — which is what the Inbox does with it.

Paged like every other list — `?limit=` and `?cursor=` in, `nextCursor` out.
The MCP tool is `list_open_comments`; the SDK is `deliverd.comments.open()`;
the CLI is `deliverd comments open`. In the app the same threads appear in
the Inbox, narrowed to the reports you own.

### Quoting a passage

`POST /reports/{idOrSlug}/comments { body, quote?, threadId? }` starts a thread
or adds to one. A `quote` is anchored by matching it against the report's
current version, and it has to match exactly once:

| | |
|---|---|
| Not in that version | `404 quote_not_found`, naming the version it looked in |
| Matches in several places | `400 quote_ambiguous`, with `occurrences` |
| No readable text in it | `400 quote_empty` |

The first is the one that surprises people, and it is a republish: the text
moved under the quote. Re-read the current version and quote what it says now
rather than retrying the same passage. The second wants **more** of the
surrounding sentence, not less.

### Taking a comment back

`DELETE /reports/{idOrSlug}/comments/{commentId}` retracts a comment this
credential posted. The rule is one line: **your own last comment in a thread
nobody has closed.**

Everything that makes it safe follows from "last". A comment somebody replied
to is not the last one, so it cannot disappear from under the reply and leave
it answering something no longer on the page. A resolved thread has been acted
on, so it is refused with `thread_resolved` and the answer is to reopen it
first. Somebody else's comment is refused with `not_author` — this is
retraction, not moderation, and an administrator removing a client's
inconvenient feedback is a different thing that does not exist here.

Retracting the only comment in a thread takes the thread and its highlight
with it, and any images attached to the comment go too, bytes included: a
snapshot is a photograph of the report as that reader saw it, and the signed
links handed out for it stay valid for a week unless the object is gone.

**It unsends nothing.** The report's owner may have been emailed the moment
the comment was posted, and a webhook receiver may have relayed it into a
channel. This closes what a reader can see. The retraction is audited as
`comment.retracted`, with the comment and thread it names.

`commentId` comes back from the `POST` that created the comment, and `GET
/reports/{idOrSlug}/comments` carries one on every message with `retractable`
beside it, so a caller never has to re-derive the rule. The MCP tool is
`retract_comment`; the SDK is `deliverd.comments.retract()`; the CLI is
`deliverd comments retract <report> <comment-id>`. In the app it is a
**Retract** control in the comment panel, on the one message you could still
take back.

A comment thread can carry images: a **snapshot** of the highlighted
passage, taken as the member who asked for it would see it, or an **upload** the reader pasted or dropped — a marked-up
screenshot, a mock-up of what they want instead. `GET
/reports/{idOrSlug}/comments` lists them on each thread as signed links,
good for a week, so a client can fetch them with no session. Inside the
product they are served through the report's own access check, never from
public storage.

`POST /reports/{idOrSlug}/revision-briefs` composes the open threads into
one prompt: the report and its current version, each thread's quoted
passage, the surrounding text as it is now, the whole conversation, the
image links, and closing instructions to publish with
`POST …/versions` (with `expectedVersion` and a `changeSummary`) and to
resolve each thread with a note. Pass `threadIds` to include only some
open threads and `instructions` for extra direction. Composing a brief is
recorded on the report, so the people who commented see their feedback is
being worked on.

The MCP equivalent is `get_revision_brief`, which returns the same text and
the images themselves as image content.

## Publishing from CI

See [ci.md](./ci.md) — the CLI authenticates from `DELIVERD_URL` and
`DELIVERD_TOKEN`, so a build step can publish with one `npx` line.

## Webhooks

Add an endpoint under **Admin → Integrations → Webhooks**. Every event that endpoint
subscribes to arrives as a signed `POST`, queued and retried independently of
whatever caused it — a publish never waits on your endpoint and never fails
because of it.

Events. Publishing: `report.published`, `report.updated`, `report.shared`,
`report.viewed`, `comment.created`, `access.requested`, `schedule.due`,
`publish.held`. Asking a person: `approval.requested`, `approval.approved`,
`approval.rejected`, `approval.expired`, `approval.question`,
`approval.answered`, `review.requested`, `review.approved`,
`review.changes_requested`, `collection.requested`, `collection.completed`.
A whole piece of work: `flow.completed`. A gate that refused: `gate.denied`.
Subscribing to none means all of them, including any added later — so an
endpoint you set up before an event existed starts receiving it.

An individual verdict and an individual reply are audited rather than emitted.
A channel wants to know the answer is in, not to be pinged once per person.

There is deliberately no `gate.allowed` and no `gate.escalated`. The first
would fire on every auto-allowed action, which is the point of the feature and
therefore a firehose — allows are audited and counted, which is where a rate
belongs. The second already reaches you as `approval.requested`, because a gate
that needs a person raises an ordinary approval, and telling a channel twice
about one request is the same mistake as a `flow.created` would be.

Two are worth knowing the shape of before you subscribe:

- `report.viewed` is throttled at source. A viewer is counted against a report
  at most once per 30 minutes, and only for the document itself, never its
  images or scripts — so a reader refreshing a dashboard is one message, not
  twenty. `data.viewer` names who was reading only when **Admin → Sharing**
  has viewer identity switched on; with it off you get the principal type and
  nothing else.
- `schedule.due` fires once each time a schedule comes due. It is the push
  equivalent of polling `GET /schedules?due=1`.

**Slack and Teams.** An endpoint has a *format*: the signed JSON envelope
below, or a native message. Choose **Slack** and paste the URL of an Incoming
Webhook (Slack app → Incoming Webhooks → add to a channel); every event then
arrives as a Block Kit message with a button to the right page. Choose
**Microsoft Teams** and paste the URL from the Workflows app's *Post to a
channel when a webhook request is received* template; each event arrives as
an Adaptive Card. A held publish carries a **Review** button that lands the
approver on the queue, signed in. The signature headers are still sent on
both, over whatever body was posted, so a relay that reads them can verify.
Slack and Teams ignore them.

**Send one now.** Each endpoint has a *Send test* control on the same page,
which posts your choice of event immediately — same signature, same headers,
same envelope, with `"test": true` beside `event` and obviously fake ids in
`data`. It answers with the status code your endpoint returned, or why it
could not be reached.

Use it rather than waiting: `access.requested` cannot be produced by anyone
who is already allowed to read the report, and `schedule.due` waits on the
recurrence. A test send counts as one delivery in the log, never retries, and
never counts toward the failure run that disables an endpoint — so it is safe
to press repeatedly at one that is currently broken.

```
POST https://hooks.example.com/deliverd
Content-Type: application/json
Deliverd-Event: report.published
Deliverd-Delivery: 7f3c…
Deliverd-Signature: t=1800000000,v1=5257a869e7…

{ "event": "report.published", "sentAt": "…", "data": { … } }
```

**Verify the signature.** The address is the only thing an attacker needs to
post convincing fakes into your channel, so check every delivery:

```js
import { createHmac, timingSafeEqual } from "node:crypto";

function verify(secret, body, header, toleranceSeconds = 300) {
  const parts = new Map(header.split(",").map((p) => {
    const at = p.indexOf("=");
    return [p.slice(0, at).trim(), p.slice(at + 1).trim()];
  }));
  const t = Number(parts.get("t"));
  const v1 = parts.get("v1");
  if (!Number.isFinite(t) || !v1) return false;
  if (Math.abs(Date.now() / 1000 - t) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
```

Sign the **raw body**, not a re-serialised object — `JSON.parse` then
`JSON.stringify` will not reproduce the same bytes, and the signature will not
match. The timestamp is inside the signed material, so a captured delivery
cannot be replayed with a fresh `t=`.

The signing secret is shown once, when the endpoint is created. It is not
retrievable afterwards; delete the endpoint and add it again if you lose it.

**Retries.** Answer `2xx` and we consider it delivered — acknowledge first and
do your work afterwards, because the request times out after ten seconds.
Anything else is retried up to five times with growing backoff, except a `4xx`
that is not `408` or `429`, which we take to mean the request itself is wrong
and will still be wrong later. Redirects are not followed. After twenty
consecutive failures the endpoint is paused and says so in the console.

### Callbacks: being told instead of polling

Webhooks above are the organisation's: an administrator chooses the
endpoints and every event goes to them. A **callback** is the agent's: name a
`callbackUrl` when you ask for an approval, a review or information, and that
one address is told when a person answers. A serverless function or a durable
workflow (Inngest, Temporal, a LangGraph deployment) can
sleep until then instead of holding a process open to poll.

```bash
curl -X POST https://deliverd.dev/api/v1/approvals \
  -H "Authorization: Bearer $DELIVERD_API_KEY" -H "Content-Type: application/json" \
  -d '{"title":"Refund £1,240","approvers":["finance"],"callbackUrl":"https://agent.example.com/hooks/deliverd"}'
```

The response carries `callbackSecret` — **once**, on this response only. Keep
it with whatever receives the callback. Each POST to your address is signed
exactly as a webhook is (`Deliverd-Signature: t=…,v1=…`, HMAC-SHA256 of
`<t>.<raw body>`), with that secret:

```json
{
  "event": "approval.approved",
  "sentAt": "2026-09-23T08:00:00.000Z",
  "requestType": "approval",
  "requestId": "3f2c…",
  "data": { "…": "the same object the organisation's webhook carries" }
}
```

| Request | Events |
|---|---|
| Approval | `approval.approved`, `approval.rejected`, `approval.expired`, and `approval.question` — the approver asked something and nobody will decide until you answer it |
| Review | `review.approved`, `review.changes_requested`, `review.expired` |
| Collection | `collection.completed`, `collection.expired` |

- **Address rules:** HTTPS and a public host. Private, loopback and internal
  addresses are refused when the request is made, and a redirect is never
  followed.
- **Retries:** a 2xx is delivered. Anything else is retried on the webhook
  ladder: five attempts in all, 1, 4, 16 and 64 minutes apart, so about an
  hour and a half. A 4xx other than 408 and 429 is not retried.
- **Verifying:** `constructCallback(callbackSecret, rawBody, signature)` in
  TypeScript, `construct_callback(...)` in Python. Both return the envelope
  or throw. Pass the raw body, not a re-encoded object.

### Inside an agent framework

`@deliverd/sdk/adapters` wires approvals into the hook each framework already
has, with no extra dependencies: `deliverdCanUseTool` for the Claude Agent
SDK's `canUseTool`, `deliverdToolApproval` for the AI SDK's `toolApproval`,
`runWithDeliverdApprovals` for the OpenAI Agents SDK's interruptions, and
`approveInGraph` with `resumeFromCallback` for LangGraph, which pairs with a
callback so a paused graph wakes when the person answers. Each tool call is
one request keyed by its call id (`externalId`), so a retried call does not
ask twice. Examples are in the SDK's README.

## Live data

A published report is stored bytes, so a dashboard is accurate the day it is
published and stale afterwards. A dataset is the smallest fix: the report
fetches a document from its own origin at view time.

```
PUT    /api/v1/reports/{idOrSlug}/data/{name}    reports:write
GET    /api/v1/reports/{idOrSlug}/data           reports:read
DELETE /api/v1/reports/{idOrSlug}/data/{name}    reports:write
```

The body is JSON, stored verbatim — not parsed and re-serialised, so what the
report receives is what you sent. Up to 5 MB, 25 datasets per report. Names are
one lowercase segment (`sales`, `q3-revenue`).

The report reads it from a relative path:

```html
<script>
  const data = await (await fetch("_data/sales")).json();
</script>
```

That works under the default content security policy with nothing to change:
`connect-src 'self'`, and the dataset is served from the report's own origin.
It is behind the **same access check as the report** — a reader who cannot open
the dashboard cannot read its numbers either — and is never stored in a shared
cache, so an update is visible on the next load.

**A dataset is mutable and a version is not.** Everything else about a report
rests on versions being immutable; this deliberately sits outside that.
The consequence is worth knowing before you rely on it: **rolling back to v3
does not roll the data back.** The reader gets v3's markup rendering today's
numbers. For a dashboard that is the point; for a frozen artefact it is wrong,
which is why data is opt-in per report.

`_data/` is reserved. A bundle containing a top-level `_data/` folder is
refused at publish time rather than published with unreachable files in it.

There is no execution and no query language — the report reads a document it
was given. A sandbox is a much larger decision and is not this.

## Copying a report

```
POST /api/v1/reports/{idOrSlug}/copy    reports:write
```

Duplicates the current version into a new report you own — the primitive
behind "make a copy" and behind using a report as a template.

**Copying is publishing, not reading.** You end up owning a full duplicate you
can share with anyone your plan and policy allow, so it requires both that you
can already read the source and that you may publish at its classification. It
counts against your plan's report limit.

What comes with it: the content, the title (suffixed `(copy)` unless you pass
one), the description, the classification, the report type, and any datasets —
all of which you could already read.

What does not: **the audience, comments and share links.** The copy starts
private to you. An audience is a decision somebody made about a particular
report; inheriting it would mean revoking access on the original quietly
leaving it granted on a duplicate they were never told about.

The copy starts at version 1 rather than duplicating history. Agent keys are
refused — a copy lands outside an agent's allow-list, so it could not touch
what it had just made. Copy it yourself and point the agent at the result.

## Templates

```
GET /api/v1/templates    reports:read
```

The reports an organisation offers as starting points. A template is a report
with a flag, not a separate kind of object, so it has the same versions, the
same access rules and the same copy path as anything else — start from one
with `POST /reports/{idOrSlug}/copy`.

Marking a report as a template **does not change who can see it**. Templates
are listed under the same access rules as every other report, so one is
offered to people who could already open it and revealed to nobody else. API keys are organisation-scoped, so this endpoint lists the
organisation's templates.

The MCP equivalent is `list_templates`. An agent can read a template with
`get_report(includeContent)` to follow the house structure, but cannot copy one
— see the note on `/copy`.
