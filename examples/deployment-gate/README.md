# Deployment gate

A production deploy that stops and asks a person first.

```bash
npm install
npm start
```

No account, no API key, no network. An imaginary approver decides, so you can
see the whole loop — including the parts that only happen when the answer is
no — before you sign up for anything.

```bash
npm run rejected          # they say no; the process exits 1
npm run asks-a-question   # they ask something; onQuestion answers it
```

## What it shows

- **Evidence on the page.** `factors` renders as a checklist. An approver who
  has to open three tabs before they can answer will rubber-stamp instead.
- **Retry safety.** `externalId` means a re-run of a crashed pipeline resumes
  the open request rather than asking the same person twice.
- **An ending.** `expiresIn: "2h"` — an unanswered deploy releases the runner
  and comes back `status: "expired"`, which is a result to log rather than an
  exception to catch.
- **Questions answered without a human.** `onQuestion` replies to the ones your
  pipeline already knows the answer to. Return `null` to leave it for a person.
- **Why it failed.** `rejected`, `expired` and `cancelled` are all
  `approved: false`. The log says which.

## Running it for real

```bash
export DELIVERD_API_KEY=dlv_...     # https://deliverd.dev/settings
npm start
```

Same file. The client switches transport on the key being present; nothing
else changes. The approver gets an email, decides on their phone, and the
process continues.

## In GitHub Actions

```yaml
- name: Wait for sign-off
  env:
    DELIVERD_API_KEY: ${{ secrets.DELIVERD_API_KEY }}
  run: node gate.mjs      # exits 1 on a no, which fails the job
```
