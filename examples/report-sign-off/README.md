# Report sign-off

An AI writes something for a client. A partner reads it and signs it off
before it leaves the building.

```bash
npm install
npm start

npm run changes-requested   # the reviewer sends it back instead
```

## What it shows

The other two examples ask permission *before* an action. This asks judgement
*about work that already exists* — a different question, and a different
primitive. `review()` comes back with verdicts and a count of comment threads,
not a yes or no.

- **Published to nobody first.** `audience: []`. The client is not the audience
  until a partner has read it; a report published straight to them is the exact
  failure this example exists to prevent.
- **The reviewer reads the actual document.** `reportId` attaches it, so they
  review the thing in place with a comment tool on it rather than a description
  of it.
- **Instructions that get it checked.** "Please review" gets a skim. Naming the
  two things that would be expensive to get wrong gets those two checked.
- **Changes requested is the useful answer.** It is `approved: false`, and
  `threadCount` is the input to the next draft.
- **A held publish is a real outcome.** If the organisation's own policy holds
  the version for approval, `publish` answers `status: "pending_approval"` and
  nobody can read it yet. A caller that assumes it went live would be wrong.

## One honest caveat

Development mode simulates the **request** APIs — approvals, reviews,
collections, flows. It does not simulate publishing, because publishing puts
bytes somewhere and there is nowhere local to put them. Ask it to publish
without a key and you get a clear 501 saying so.

So with no key this runs the sign-off half. Set `REPORT_ID` to attach a report
you already have, or add a key and it runs the whole loop:

```bash
export DELIVERD_API_KEY=dlv_...     # https://deliverd.dev/settings
npm start
```

## The loop this closes

```
model writes HTML  →  publish to nobody  →  review()  →  changes requested
      ↑                                                        │
      └──────────────  revision brief  ←───────────────────────┘
```

An agent picks the reviewer's notes up with `get_revision_brief` over MCP, or
`GET /v1/reports/{id}/revision-briefs`, and publishes v2 to the same URL.
