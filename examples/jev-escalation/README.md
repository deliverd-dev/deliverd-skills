# Jev escalation

An agent asks Jev whether the next step is routine. When Jev is confident it
is, the step runs. When it is not — or when Jev is not there — a person decides.

```bash
npm install
npm start
```

No account and no key, for either service. Without `TYPESAFE_API_KEY` nothing
judges the step, so it escalates, and an imaginary approver decides. That is
the path you should see first, because it is the one a missing verifier takes.

```bash
npm run routine    # an imaginary Jev is confident the step is safe; no ask
npm run rejected   # the imaginary approver says no; the process exits 1
STEP="rm -rf build" npm start   # judge a different command
```

## What it shows

- **Where the escalation goes.** Every harness that routes steps through Jev
  has a branch for "the model could not settle this". This program is that
  branch: `judge()` returns `{ escalate: true, reason }` and the request goes
  to a person through `deliverd.approve()`.
- **Two thresholds, both yours.** `ROUTINE_BELOW` and `CONFIDENCE_FLOOR` are
  policy, not facts. The defaults are cautious on purpose.
- **Jev's answer is evidence, not a verdict.** It goes on the page as
  `factors` — "Jev put the chance this is destructive at 62%" — so the person
  sees why they were asked. It never approves anything.
- **Fail closed.** No key, a timeout, an error: the step is judged by a person.
  A step nobody judged is a step a person judges.
- **A standing rule still applies.** `risk` is derived from the severity
  score, so an organisation can say "anything critical needs two people"
  without touching this file.

## Running it for real

```bash
export DELIVERD_API_KEY=dlv_...       # https://deliverd.dev/settings
export TYPESAFE_API_KEY=...           # from typesafe.ai
npm start
```

Same file. Each client switches transport on its key being present. The step's
`state` goes from this process to TypeSafe under your key and their terms; what
reaches Deliverd is the numbers this file chooses to put on the page.

## Checking Jev still answers the way this expects

```bash
TYPESAFE_API_KEY=... npm run verify
```

Asks Jev about two steps whose answers are not in doubt and checks the wire
shape, the three question types, and that the thresholds above would send the
destructive one to a person. Run it before trusting anything here; it is the
only check in the repository that can reach the real API, because no test can.

The longer argument — including the version that uses `gate()` and a policy
rule that tightens on Jev's answers — is in
[`docs/jev.md`](../../docs/jev.md).
