---
name: checkpoint
description: Put the approval step on the path to a consequential action, in the system an AI agent runs in, rather than trusting the agent to ask. Use it when building or wiring up an agent, an MCP server, a tool, a workflow or a CI pipeline that can do something consequential (pay, deploy, delete, merge, email outside the organisation, change access); when someone asks to make approvals compulsory, put a gateway in front of tools, add a human step to a pipeline, or stop agents going around a check; and when reviewing an agent setup for where a check could be skipped. It covers choosing the checkpoint, the hosted MCP gateway, a gate in the code that acts, checking the signed decision token where the action happens, the GitHub Action, Amazon Bedrock AgentCore Gateway, and what each one does not cover. It works with Deliverd's MCP gateway, SDKs and public integrations.
license: MIT
---

# Checkpoint

The approval skill teaches an agent to ask. This one is for whoever builds
the system the agent runs in, so that asking is not up to the agent. A check
an agent can skip is a suggestion. The goal is to put the check on the only
path to the action, and to have the thing that acts verify that a person, or
the organisation's policy, said yes to exactly this.

## 1. Find the one path

Before choosing a tool, answer three questions about the action:

1. **What performs it?** The API, the MCP server, the CLI, the deploy job.
   That is where the check belongs, not in the prompt.
2. **What credential does it need, and who holds it?** If the agent holds
   the credential, the agent can act without asking. Move the credential to
   the checkpoint, and give the agent only the way through it.
3. **What is the action called?** Name it once, such as `finance.refund` or
   `deployment.production`, so the organisation's rules can say what it needs
   (see the policy skill). An action no rule mentions goes to a person.

Say plainly which of these you could not fix. "The agent still has the Stripe
key in its environment, so the gateway can be bypassed" is the most useful
sentence in a review.

## 2. Choose the checkpoint

| The agent acts through | Put the check | Section |
|---|---|---|
| A remote MCP server | Deliverd's hosted MCP gateway in front of it | 3 |
| Code you own (an API, a tool, a worker) | A gate in that code, and a token check where it acts | 4 |
| A CI or deploy pipeline | The Deliverd Approval GitHub Action before the step | 5 |
| Amazon Bedrock AgentCore Gateway | The Deliverd interceptor on the gateway | 6 |
| A workflow tool (n8n, Zapier, Make, Power Automate, Step Functions, Workspace Studio) | The Deliverd step or connector for that tool, from https://deliverd.dev/connect | |

Use more than one when the action can be reached more than one way. The
check closest to the action is the one that matters most.

## 3. The hosted MCP gateway

Deliverd sits in front of an MCP server so a governed tool call cannot reach
it without a yes. An owner or administrator adds the gateway under
**Organisation → Integrations & webhooks**: the server's public HTTPS
address, the Authorization header the server expects (sealed, and never shown
again) and which calls are checked: tools that change something (the
default), every tool call, or tools matching a pattern.

The agent is then configured with the gateway's address,
`https://deliverd.dev/api/gateway/mcp/{id}`, as a Streamable HTTP MCP
server, and an agent key with `gates:write` and `gates:execute` as its
bearer token. It is never given the server's own credential.

Each checked `tools/call` becomes a gate on `mcp_gateway.tool_call`, with the
tool and its arguments as input, so rules under **Agents → Rules →
Publishing & request rules** can tell one tool from another. An allowed call
goes through carrying the decision token; one that needs a person comes back
as a tool error with the approval link, and the same call made again after
approval goes through; a refused call never reaches the server.

## 4. A gate in the code that acts

When you write the code that performs the action, ask before acting and act
on what was agreed:

```ts
import { Deliverd } from "@deliverd/sdk"; // npm install @deliverd/sdk

const deliverd = new Deliverd(); // DELIVERD_API_KEY
const decision = await deliverd.gate({
  action: "finance.refund",
  externalId: `refund:${order.id}`,
  input: { customer_id: order.customerId, amount: 1240, currency: "GBP" },
});
if (!decision.allowed) return { refused: decision.reason, link: decision.approvalUrl };
await stripe.refunds.create(decision.input);
```

```python
from deliverd import Deliverd  # pip install deliverd

deliverd = Deliverd()  # DELIVERD_API_KEY
decision = deliverd.gate(
    action="finance.refund",
    external_id=f"refund:{order.id}",
    input={"customer_id": order.customer_id, "amount": 1240, "currency": "GBP"},
)
if not decision.allowed:
    return {"refused": decision.reason, "link": decision.approval_url}
stripe.Refund.create(**decision.input)
```

Three rules make it hold:

- **Act with `decision.input`**, never your own object. An approver may have
  corrected a value; that is what they agreed to.
- **Make `externalId` stable** for the action, so a retry finds the same
  decision instead of asking twice.
- **A no is an answer, not an error.** Do not retry it, route around it, or
  turn it into a different action that no rule covers.

When the code that acts is not the code that asked (a queue, another
service, a tool server behind a gateway), pass the decision token along and
verify it where the action happens:

```ts
const check = await deliverd.decisionTokens.verify(token, {
  action: "finance.refund",
  input: { customer_id, amount, currency },
});
if (!check.ok) throw new Error(check.reason);
```

It fails when the token is not from your Deliverd, has expired, is for
another action, or was agreed for a different input: a refund of £1240
against a yes for £1200 is refused. In Python it is
`deliverd.decision_tokens.verify`. It does not count uses, so record what
was done against the gate (`deliverd.gates.recordExecution()`, or
`record_execution` over MCP) to spend the permission.

## 5. CI and deploy pipelines

Hold a job until a person approves it:

```yaml
- name: Ask before deploying to production
  uses: deliverd-dev/approve-action@v1
  with:
    title: Deploy ${{ github.ref_name }} to production?
    why: CI is green on main. Release notes are in the PR.
    approvers: releases@example.com
    token: ${{ secrets.DELIVERD_TOKEN }}

- run: ./deploy.sh
```

The token needs `approvals:write` and `approvals:read`. When the person
rejects, asks for changes, or nobody answers within `timeout-minutes`, the
step fails and nothing after it runs. Put the deploy credential in an
environment only this job can reach, or the check is easy to go around.

## 6. Amazon Bedrock AgentCore Gateway

For agents behind an AgentCore gateway, the public interceptor at
https://github.com/deliverd-dev/aws-agentcore checks every MCP tool call the
gateway governs before the target sees it, with no change to the agents. It
asks Deliverd on `agentcore.tool_call`; reads pass untouched by default, an
allowed call carries the decision token, and a refused one, or one Deliverd
cannot decide, is answered as a tool error. It fails closed unless deployed
with `LogOnly` set to `"true"`, which records each decision and lets every
call through: use that to try a policy before enforcing it, and say so
whenever it is on.

## 7. Be honest about the gaps

- A check sees only the calls that pass through it. Code the agent writes
  that a person runs later, a credential left in the agent's environment, a
  second route to the same API: each is outside it. Name them.
- Log-only and report-only modes enforce nothing. Never describe them as
  protection.
- Never weaken a check to make your own work go through: no broader pattern
  that exempts a tool, no `allow` rule for yourself, no second credential.
  If a check is in your way, ask the person.
- Never call a setup secure or compliant. Say what is checked, where, and
  what is not.

## Reference

| Piece | Where |
|---|---|
| Hosted MCP gateway | Organisation → Integrations & webhooks; `https://deliverd.dev/api/gateway/mcp/{id}` |
| Gate in code | `deliverd.gate()` (TypeScript), `deliverd.gate()` (Python), `check_gate` (MCP) |
| Verify the token where it acts | `deliverd.decisionTokens.verify()`, `deliverd.decision_tokens.verify()` |
| CI | `deliverd-dev/approve-action@v1` |
| AgentCore Gateway | https://github.com/deliverd-dev/aws-agentcore |
| Workflow tools | https://deliverd.dev/connect |
| Rules for the actions | Agents → Rules → Publishing & request rules, or the policy skill |
