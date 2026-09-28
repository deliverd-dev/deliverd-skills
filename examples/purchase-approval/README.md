# Purchase approval

An agent works out that it needs a tool, and asks a person before it spends
anything.

```bash
npm install
npm start

npm run rejected   # they say no, with a reason
npm run no-answer  # you stop waiting; the request stays open
```

## What it shows

The deployment gate asks somebody at a desk. This asks somebody who is
probably not at one, and that changes what belongs in the request.

- **The title is the notification.** A good share of approvers answer without
  opening anything else, so the title carries the decision: amount and vendor,
  not "Purchase request #4471".
- **Named approvers.** `approvers: ["finance@..."]` — omit it and it goes to
  owners and admins, which is right for a small team and wrong the moment
  finance is a different person from the founder. You cannot name yourself; the
  API refuses an agent approving its own request rather than letting it look
  like one.
- **A no is a value, not an exception.** `rejected`, `expired` and `cancelled`
  all arrive as a `Decision`. The `catch` is for the wait failing — a network
  that could not be reached, a key that is not valid. It never catches "no".
- **Metadata for the ledger.** It comes back unchanged and lands in the audit
  trail, so "why did we buy this" is attached to the approval rather than to a
  Slack thread nobody can find.
- **Silence is not consent.** `expiresIn: "3d"` and the expired branch does not
  order.

## Running it for real

```bash
export DELIVERD_API_KEY=dlv_...     # https://deliverd.dev/settings
npm start
```

Then decide it on your phone. The approval page is built for that: the ask,
the evidence, two buttons, and a box for the reason.
