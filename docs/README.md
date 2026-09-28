# Deliverd docs

How to use [Deliverd](https://deliverd.dev) — the human layer for AI agents —
from code, and how to connect it to the tools your organisation already uses.

The full, current documentation lives at
[deliverd.dev/docs](https://deliverd.dev/docs):

- [Guide](https://deliverd.dev/docs/guide) — for the people who use Deliverd
  and the administrators who run it.
- [Developers](https://deliverd.dev/docs/developers) — SDKs, the REST API, MCP
  and the CLI.
- [API reference](https://deliverd.dev/docs/api) — every endpoint, generated
  from the OpenAPI spec.

## In this folder

| Doc | What it covers |
|---|---|
| [api.md](./api.md) | The REST API: publishing, approvals, reviews, collections, flows, evidence, the action registry, the gate and its policy, sharing, webhooks and callbacks |
| [cli.md](./cli.md) | The `deliverd` CLI: publishing, sharing, living data, comments, asking a person, actions and gate policy |
| [mcp-setup.md](./mcp-setup.md) | Connecting Claude Code, Codex, Cursor, VS Code, Windsurf, Gemini CLI, ChatGPT and Claude to the MCP server, and every tool it offers |
| [ci.md](./ci.md) | Publishing a report from GitHub Actions, GitLab CI or any build |
| [chat-apps.md](./chat-apps.md) | Approving from Slack and Microsoft Teams, and channel notifications |
| [sso-setup.md](./sso-setup.md) | Single sign-on with SAML 2.0 or OpenID Connect |
| [sharepoint-embedding.md](./sharepoint-embedding.md) | Showing a report inside a SharePoint page |
| [jev.md](./jev.md) | Using Jev, TypeSafe's decision model, to settle routine steps and Deliverd for the rest |

## Examples

Four small programs in [`../examples`](../examples) that run with no account
and no API key:

| Example | What it is |
|---|---|
| [deployment-gate](../examples/deployment-gate) | A production deploy that stops and asks a person first |
| [purchase-approval](../examples/purchase-approval) | An agent asks a person before it spends anything |
| [report-sign-off](../examples/report-sign-off) | An AI writes a client report; a partner signs it off before it leaves the building |
| [jev-escalation](../examples/jev-escalation) | Jev settles the routine step; when it is not confident, or not there, a person decides |

## Quick start

```bash
# MCP, for Claude Code (OAuth — no token to paste)
claude mcp add --transport http deliverd https://deliverd.dev/api/mcp

# Or configure every AI tool on this machine at once
npx deliverd setup

# From code
npm install @deliverd/sdk      # or: pip install deliverd
export DELIVERD_API_KEY=dlv_...
```
