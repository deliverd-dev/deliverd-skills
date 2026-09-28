# Examples

Four working programs. Each one installs, runs and finishes in under a
minute, with **no account and no API key** — the SDK's development mode runs
the whole loop locally against an imaginary approver, through the same client
and the same code path production uses.

```bash
cd deployment-gate && npm install && npm start
```

| | What it is | What it teaches |
|---|---|---|
| [`deployment-gate/`](./deployment-gate) | A production deploy that stops and asks | Evidence on the page, retry safety, answering the approver's questions automatically, exiting non-zero so CI actually gates |
| [`purchase-approval/`](./purchase-approval) | An agent asks before it spends money | Writing for someone on a phone, named approvers, why "no" is a value and not an exception, metadata that lands in the audit trail |
| [`report-sign-off/`](./report-sign-off) | An AI writes a client report; a partner signs it off | The difference between asking permission and asking judgement, publishing to nobody first, and what to do with changes requested |
| [`jev-escalation/`](./jev-escalation) | Jev, TypeSafe's decision model, settles the routine step; a person settles the rest | Where a model's "I cannot settle this" should go, thresholds as policy rather than facts, a model's answer as evidence and never a verdict, failing closed when the model is absent |

`jev-escalation/` is the one that calls a second vendor, and it needs no key
for that either: without `TYPESAFE_API_KEY` nothing judges the step, so every
step escalates. That is the posture rather than a limitation — a step nobody
judged is a step a person judges — and it is why the promise above still holds
for four examples rather than three. The longer version is
[`docs/jev.md`](../docs/jev.md).

## Why they run without a key

The thing you want to know before signing up for something is whether it fits
your code. That is hard to judge from a snippet in a README and easy to judge
from a program that runs.

```js
const deliverd = new Deliverd({
  mode: process.env.DELIVERD_API_KEY ? "live" : "development",
});
```

In development mode nothing leaves the machine, but the retries, the error
mapping and `wait()` are the real implementation — only the transport is
swapped. Every example takes an env var to make the imaginary approver say no,
ask a question, or never answer, so the paths you actually have to handle are
the easy ones to see:

```bash
npm run rejected
```

Set `DELIVERD_API_KEY` and the same file talks to production. Nothing else
changes.

## Running them for real

Create an organisation at [deliverd.dev](https://deliverd.dev), take a key from
Settings, and export it. The approver gets an email, decides on their phone,
and your process continues where it was waiting.

## What is not here

These cover approvals and reviews. The other two request primitives —
`collect()` for facts an agent does not have, and `flows` for tying a job's
requests together — are documented in the
[SDK README](https://www.npmjs.com/package/@deliverd/sdk) and behave the same
way, including in development mode.
