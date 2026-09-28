# MCP setup

The MCP server lives at `https://deliverd.dev/api/mcp` (Streamable HTTP).

**Authentication is OAuth, not a pasted token.** The server implements the MCP
authorization spec, so a client registers itself and the person approves it in
a browser. Bearer tokens from **Settings → API tokens** still work, for clients
that cannot do OAuth.

## Asking before acting

One tool on this server has a different shape from all the others, and it is
worth a paragraph before the table rather than a row inside it. Every other tool
does a thing. `check_gate` asks whether to.

You declare the action you are about to perform and the arguments you will
perform it with, and the organisation's policy answers. Three answers come back
and you branch on one field:

- `allowed: true` — a rule permitted it. Carry on, with the `input` that comes
  back rather than the one you sent; it is what the action's schema validated
  and what an approver saw.
- `allowed: false`, `status: "denied"` — a rule refused it. `reason` and `rule`
  say which and why. **A refusal is a result, not an error.** An agent told no
  behaved correctly by asking.
- `allowed: false`, `status: "pending"` — nobody has decided yet. An ordinary
  approval has been raised; `get_gate` reads it back once somebody answers.

**An action no rule covers goes to a person.** That is the opposite of how most
permission systems default, and it is deliberate: an action nobody has written a
rule about is one nobody has decided about, which is not the same as one
everybody is happy with.

**The decision is advisory.** You report what you intend to do and then perform
the action yourself — Deliverd never runs it for you — so act only on an
allowed decision, and with the `input` it returned. What the gate gives you is a
question asked before the act, answered by somebody other than you, and written
down either way.

The rules themselves are not written from here — see
[cli.md](./cli.md#gate-policy) and [api.md](./api.md#gate-policy).

## Tools

There are 48, each gated on the scope beside it. MCP directories list 47,
because the deprecated alias `find_report` is not advertised to somebody
choosing a tool for the first time.

| Tool | Scope | What it does |
|---|---|---|
| `publish_report` | `reports:write` | Publish HTML and get back a persistent secure URL |
| `update_report` | `reports:write` | New version of an existing report, same URL and audience |
| `rename_report` | `reports:write` | Change the title, the address, or both — the old address keeps working |
| `move_report` | `reports:write` | File into a workspace. Filing is not access; see below |
| `archive_report` | `reports:write` | Stop the URL serving. Nothing is deleted |
| `unarchive_report` | `reports:write` | Put an archived report back, same URL and audience |
| `rollback_report` | `reports:write` | Serve an earlier version again, by version number |
| `get_report` | `reports:read` | Metadata, URL and current version; optionally the HTML |
| `find_reports` | `reports:read` | Search by title or slug |
| `find_report` | `reports:read` | Deprecated alias for `find_reports` |
| `list_templates` | `reports:read` | Reports the organisation offers as starting points |
| `share_report` | `reports:share` | Grant people, teams or groups access |
| `revoke_access` | `reports:share` | Take access away again, from the same audience phrase |
| `send_report` | `reports:share` | Email it to a list of addresses, with a covering note |
| `list_workspaces` | `workspaces:read` | Workspaces by name, with whether each can already open a report |
| `list_due_schedules` | `schedules:read` | Recurring reports waiting on this agent |
| `create_schedule` | `schedules:write` | Ask an agent for a recurring publish, on a cron cadence |
| `update_schedule` | `schedules:write` | Change a schedule's cadence, or turn it on or off |
| `delete_schedule` | `schedules:write` | Stop asking for a recurring publish |
| `list_report_data` | `reports:read` | The datasets a report reads when it is opened |
| `update_report_data` | `reports:write` | Replace a report's live data — no new version, same URL and audience |
| `delete_report_data` | `reports:write` | Remove a dataset — the published version is untouched |
| `list_comments` | `comments:read` | Reader feedback, with the quoted text and surrounding excerpt |
| `list_open_comments` | `comments:read` | Every open thread across all reports, newest activity first — what needs attention |
| `get_report_analytics` | `reports:read` | Who read a report and when; the detail needs the analytics plan |
| `get_org_analytics` | `reports:read` | What is being read across every report, and which ones nobody opens |
| `get_revision_brief` | `comments:read` | The open feedback composed into one prompt, with readers' screenshots as image content — everything needed to produce the next version |
| `comment_on_report` | `comments:write` | Comment, or reply to a thread; `quote` anchors it to a passage |
| `retract_comment` | `comments:write` | Take back your own last comment in a thread nobody has replied to |
| `resolve_comment` | `comments:write` | Mark a thread resolved, with a note on what changed |
| `resolve_audience` | `audiences:read` | Turn natural-language phrases into concrete principals |
| `request_approval` | `approvals:write` | Pause before a consequential action and ask named people to authorise it; returns the request and its page |
| `cancel_approval` | `approvals:write` | Withdraw an approval you asked for, while it is still pending; the requester only |
| `get_approval` | `approvals:read` | The status of an approval, with who decided and any questions the approver asked |
| `answer_approval_question` | `approvals:write` | Answer a question an approver asked from the page |
| `request_review` | `reviews:write` | Ask named people to read work and say whether it is right |
| `cancel_review` | `reviews:write` | Withdraw a review you asked for, while it is still unanswered; a verdict already given is evidence |
| `get_review` | `reviews:read` | The outcome of a review, with each reviewer's verdict and note |
| `request_information` | `collections:write` | Ask named people typed questions and get structured answers back |
| `cancel_collection` | `collections:write` | Withdraw a request for information you made; replies already submitted stay on the record |
| `get_collection` | `collections:read` | The answers to a request for information, with who replied |
| `check_gate` | `gates:write` | Ask whether you may perform a registered action, before you perform it; policy answers allow, refuse, or a person decides |
| `get_gate` | `gates:read` | The state of a gate decision you raised, once a person has answered it |
| `create_flow` | `flows:write` | Start a flow: the thread tying one job's requests and publishes together |
| `get_flow` | `flows:read` | A flow with everything in it and the timeline across all of them |
| `complete_flow` | `flows:write` | Say the work is done. Only whoever started the flow, and it takes no new members after |
| `cancel_flow` | `flows:write` | Close a flow as abandoned rather than done, so the history says which happened |
| `get_evidence` | every read scope | An evidence pack for a flow or a report: every step, who decided what, and the full timeline |

Audience parameters accept natural language ("Finance team", "Sarah Jones",
"everyone"); when a phrase is ambiguous the tool returns candidates for the AI
to confirm with the user, then retry.

A key issued before a scope existed does not have it. `schedules:read` and both
comments scopes are recent, so a key from before then gets a 403 naming the
scope it is missing — reissue it rather than debugging the tool.

## One command

```bash
npx deliverd setup
```

Finds Claude Code, Codex, Claude Desktop and Cursor on the machine and
configures whichever are installed. It writes no credential, merges into existing config
rather than replacing it, keeps a timestamped backup of anything it changes,
and refuses a file it cannot parse rather than overwriting it.

`--print` shows the settings without writing; `--agent <id>` limits it to one
tool.

## Claude Code

```bash
claude mcp add --transport http deliverd https://deliverd.dev/api/mcp
```

## Codex

```bash
codex mcp add deliverd --url https://deliverd.dev/api/mcp
codex mcp login deliverd
```

Codex is the one client that does not begin the approval flow on first use, so
the second command is not optional — without it every call reports that
authorization is required and never recovers.

Streamable HTTP servers need the rmcp client. On an older Codex the server
simply does not appear; upgrade it, or add this above the server entry in
`~/.codex/config.toml`:

```toml
[features]
experimental_use_rmcp_client = true
```

## Cursor

`.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "deliverd": {
      "type": "http",
      "url": "https://deliverd.dev/api/mcp"
    }
  }
}
```

The page at [deliverd.dev/cursor](https://deliverd.dev/cursor) has an **Add to Cursor** button that does the
same thing from a link.

## VS Code

The page at [deliverd.dev/vscode](https://deliverd.dev/vscode) has **Add to VS Code** and **Add to VS Code
Insiders** buttons. By hand, `.vscode/mcp.json` in a project (or user
settings for every project):

```json
{
  "servers": {
    "deliverd": {
      "type": "http",
      "url": "https://deliverd.dev/api/mcp"
    }
  }
}
```

The key is `servers` — VS Code's file is not the same shape as Cursor's, and an
`mcpServers` block is accepted and ignored. Then **MCP: List Servers** from
the command palette, start it, and approve in the browser.

## Windsurf

`~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "deliverd": {
      "serverUrl": "https://deliverd.dev/api/mcp"
    }
  }
}
```

The key is `serverUrl`; a plain `url` is ignored. Refresh in Cascade's MCP
panel, then approve in the browser.

## Gemini CLI

```bash
gemini mcp add --transport http deliverd https://deliverd.dev/api/mcp
```

If it does not open a browser by itself, `/mcp auth deliverd` inside Gemini
does.

## The artifact skill

Separate from the server, and useful without it: an open-source skill that
teaches an agent to build a well-made, self-contained HTML artifact and then
offer to publish it.

```bash
npx skills add deliverd-dev/deliverd-skills --skill artifact
```

Claude Code can take the server and all three skills — `approval`, `ethics`
and `artifact` — together, as a plugin:

```bash
claude plugin marketplace add deliverd-dev/deliverd-skills
claude plugin install deliverd@deliverd
```

## Claude Desktop / stdio-only clients

Bridge with [`mcp-remote`](https://www.npmjs.com/package/mcp-remote):

```json
{
  "mcpServers": {
    "deliverd": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://deliverd.dev/api/mcp",
               "--header", "Authorization: Bearer dlv_…"]
    }
  }
}
```

## ChatGPT

Settings → Apps → Advanced settings → **Developer mode**, then add a custom
connector pointing at `https://deliverd.dev/api/mcp`. Custom MCP connectors are
on the paid ChatGPT plans; that is OpenAI's restriction, not ours.

The connector registers itself and receives its own credentials through the
same OAuth flow as everything else — there is no token to paste.

## Claude connectors (desktop and web)

Add `https://deliverd.dev/api/mcp` in **Settings → Connectors**. No token to
paste: the connector registers itself, sends you to a consent screen, and
receives its own credentials.

Behind that one click is the MCP authorization spec, which Deliverd implements
in full:

| Step | Endpoint |
|---|---|
| 1. Unauthenticated request gets `WWW-Authenticate` | `/api/mcp` |
| 2. Which resource, which authorization server (RFC 9728) | `/.well-known/oauth-protected-resource` |
| 3. Where to register and authorise (RFC 8414) | `/.well-known/oauth-authorization-server` |
| 4. The connector registers itself (RFC 7591) | `POST /api/oauth/register` |
| 5. You choose an organisation and approve | `/oauth/authorize` |
| 6. Code exchanged for tokens | `POST /api/oauth/token` |
| 7. Disconnecting revokes them (RFC 7009) | `POST /api/oauth/revoke` |

Things worth knowing:

- **PKCE is mandatory and S256-only.** `plain` is refused.
- **A token is bound to one organisation.** If you belong to several, the
  consent screen makes you pick; consenting to one is not consenting to all.
- **Membership is re-checked on every request**, not trusted from consent time,
  so removing someone from an organisation cuts their connector off at once
  rather than whenever the token expires.
- **Access tokens last an hour**, refresh tokens thirty days and rotate on use.
- Registration is open, as "dynamic" requires. A `client_id` authorises
  nothing: every request still turns on an exact redirect-URI match, PKCE, and
  a human pressing Allow.

API keys still work everywhere they did — the MCP endpoint accepts both, told
apart by prefix (`dlvo_` OAuth, `dlv_` API key).

## Views in the chat (MCP Apps)

Four tools return a rendered panel instead of a wall of JSON, in hosts that
support the [MCP Apps](https://github.com/modelcontextprotocol/ext-apps)
extension:

| Tool | What it draws |
|---|---|
| `get_evidence` | The pack: subject, each step with who was asked and what they said, the timeline, and the integrity block. |
| `get_flow` | The flow, what is in it, and the order things happened in. |
| `get_approval` | The request, its risk, signatures so far, and any open questions. |
| `list_open_comments` | Open threads grouped by report, newest activity first. |

Nothing is required of you. The server advertises the extension under
`capabilities.extensions["io.modelcontextprotocol/ui"]` at initialize, each of
those tools carries a `_meta.ui.resourceUri`, and each view is served as a
`ui://deliverd/…` resource with media type `text/html;profile=mcp-app`. A host
that does not implement the extension ignores all of it and shows the same
JSON it always did.

Things worth knowing:

- **The views are read-only, on purpose.** They render; they never call a
  tool. The approval view links to the approval's own page rather than
  offering Approve and Reject, because whoever holds the MCP session is
  usually the person who *made* the request — and nobody approves their own
  request. Putting the buttons in the chat would either hit that refusal or
  quietly route around it.
- **A view carries no data.** The `ui://` document is static; the result
  arrives afterwards over `postMessage`. One organisation's records are never
  inside a resource another organisation can read, and a host is free to
  cache it.
- **Each document is entirely self-contained** — styles and script inline,
  nothing fetched. Hosts render these under `default-src 'none'`, so an
  external stylesheet or font would be blocked silently.

## Filing and access are two different things

`move_report` files a report into a workspace. It does **not** by itself let
anyone in that workspace read it — that is a separate grant, and the tool takes
`grantAccess` for it.

That distinction catches people out, so `publish_report` returns a `nextStep`
when a report lands with no workspace or no audience: it tells the assistant to
ask which workspace it belongs in, whether the people there should be able to
open it, and lists the workspaces by name so it can offer real choices. Someone
publishing from a chat window has no screen telling them workspaces exist.

An ambiguous workspace name returns candidates rather than a guess. Filing a
board pack in the wrong place is not a mistake worth being decisive about.

## Typical flow

> "Create an executive summary from these numbers and publish it to Finance
> Leadership."

The AI builds the HTML, calls `publish_report` with
`audience: ["Finance Leadership"]`, and returns the secure URL. If "Finance
Leadership" matched both a group and a workspace, the tool responds with the
candidates and the AI asks which you meant.

And the other shape, where the question comes before the work rather than after
it:

> "Refund the duplicate charge on invoice 4821."

The AI calls `check_gate` with `finance.refund` and the amount, before touching
anything. A rule under your ceiling answers on the spot and it carries on; a
larger one raises an approval, and the AI waits or comes back to `get_gate`
once somebody has decided. Either way the decision is recorded, including the
ones nobody had to look at.
