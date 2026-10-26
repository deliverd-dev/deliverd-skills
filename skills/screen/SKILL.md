---
name: screen
description: Check text for personal data, secrets and confidential terms before it goes to an AI model or leaves the machine, and redact what should not go. Use it when building anything that sends prompts to a model (wire the check into the code), when passing logs, tickets, customer records, .env files or documents on to another model, agent, API or tool, and when writing prompts, eval sets or fixtures that will be committed or shared. Runs locally with Deliverd Screen (free, MIT, no account).
license: MIT
---

# Screen

Text sent to a model is text you no longer control. This skill puts a check
in front of that: find the email addresses, card numbers, IBANs, national
ID numbers, keys and passwords, and the organisation's own confidential
terms, then send the text as it is, send it redacted, ask a person, or send
nothing.

It uses [Deliverd Screen](https://deliverd.dev/screen), an open-source
library for TypeScript, Python and Rust. It runs on the machine, with no
account, no key and no network call.

## 1. Know when it applies

Screen text when it is about to cross a boundary:

- **Code you are writing calls a model.** A chatbot, a summariser, a support
  agent, a RAG pipeline: put the check in the code, before the call. This is
  where the skill does the most good, because it runs on every request after
  you have gone.
- **You are handing text on.** To another model, a subagent, a hosted API, an
  issue tracker, a chat channel, a paste service. Logs, stack traces, customer
  exports and `.env` files are the usual carriers.
- **You are writing something that will be committed or shared.** Prompts,
  eval sets, fixtures, example conversations, test data.

What is already in your own context has already been sent. Screening it now
protects the next hop, not the last one, so say so plainly if a person pasted
something sensitive to you, and do not repeat the values back.

## 2. Run the check

Use the first of these that fits.

**The MCP tool.** If `screen_text` is in your tool list, call it with the
text (and any `terms`). It returns the verdict and the redacted text, never
the values it replaced. To add it in Claude Code:

```bash
claude mcp add deliverd-screen -- npx -y @deliverd/screen mcp
```

**The command line.** Any agent with a shell:

```bash
npx -y @deliverd/screen --redact < notes.txt   # redacted text
npx -y @deliverd/screen --json notes.txt       # kinds and offsets, never values
npx -y @deliverd/screen --fail evals/*.jsonl   # exit 1 if anything is found
npx -y @deliverd/screen --terms clients.txt doc.md
```

**In the code you write.** Pick the language of the project.

```ts
import { screen } from "@deliverd/screen"; // npm install @deliverd/screen

const checked = await screen(prompt, { terms: [{ term: "Project Falcon" }] });
if (!checked.allowed) throw new Error(checked.reasons.join(" "));
const answer = await callModel(checked.text);
return checked.restore(answer);
```

```python
from deliverd_screen import screen  # pip install deliverd-screen

checked = screen(prompt)
if not checked.allowed:
    raise RuntimeError(" ".join(checked.reasons))
answer = call_model(checked.text)
return checked.restore(answer)
```

With the Vercel AI SDK, wrap the model once instead:
`wrapLanguageModel({ model, middleware: screenMiddleware() })` from
`@deliverd/screen/ai-sdk`. For Rust, `cargo add deliverd-screen`.

## 3. Act on the verdict

| Verdict | What you do |
|---|---|
| `allow` | Send the text. |
| `redact` | Send the redacted text. Placeholders such as `[EMAIL_1]` stand in for values; `restore()` puts them back in the answer. |
| `ask` | Stop and put it to a person (special-category data, such as health, by default). With Deliverd connected, use the approval skill; otherwise ask in the conversation. |
| `deny` | Send nothing. Secrets are refused by default. Tell the person what kind of thing was found, not the value. |

By default a model may receive internal data and no personal data. If the
person tells you a model is approved for personal data, pass
`allow: { personalData: true, classification: "confidential" }`
(`personal_data=True, classification="confidential"` in Python). Never widen
it on your own.

## 4. Be straight about the limits

- **Names are not found by patterns.** Say so when it matters. The library
  takes a model as a detector (a Hugging Face token classifier, Presidio, any
  model that returns spans); the README shows how.
- **Redacted is not anonymous.** Text about a person with the identifiers
  replaced is still personal data under GDPR.
- **It is a net, not a certificate.** Never tell anyone a text is clean
  because nothing was found. Say what was checked and what was found.
- **Never put the replaced values anywhere new**: not in a summary, a log, a
  commit message or your reply.

## 5. When a person has to decide

A library can only say stop. When an organisation needs the decision made,
recorded and tied to which models may receive which data, that is Deliverd's
Data Gate: `deliverd.screen()` in the Deliverd SDKs runs the same detectors
locally and sends only the counts. See https://deliverd.dev/screen.
