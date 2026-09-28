# Deciding an approval inside Teams or Slack

Deliverd reaches Slack and Microsoft Teams in two different ways, and it is
worth knowing which one you want before you start.

| | Channel notifications | The chat apps |
|---|---|---|
| What arrives | A post in a channel: something happened, with a link | A direct message to each approver, with **Approve** and **Decline** buttons |
| Where it is decided | In a browser tab, from the link | In the message, where the person already is |
| Set up under | **Admin → Integrations → Webhooks** | **Admin → Integrations**, *Approve from chat* |
| What you register | An incoming webhook URL from Slack or Teams | Nothing — you install Deliverd's app |

The two work side by side. A channel feed tells a team what is going on; the
app puts the decision in front of the one person who has to make it.

## Channel notifications

Add an endpoint under **Admin → Integrations → Webhooks** and choose a format:

- **Slack** — paste the URL of a Slack Incoming Webhook (Slack app →
  Incoming Webhooks → add to a channel). Every event arrives as a native
  message with a button to the right page.
- **Microsoft Teams** — paste the URL from the Workflows app's *Post to a
  channel when a webhook request is received* template. Each event arrives as
  an Adaptive Card.

An incoming webhook is one-way, so the only button it can carry is a link out.
Deciding happens on the approval's own page. The events and their payloads are
in [api.md](./api.md#webhooks).

## The chat apps

**One Slack app and one Teams app, published by Deliverd.** A customer installs
ours, the way they install any chat app. You register nothing, open no Azure
portal and hold no secret.

That is worth stating plainly because the other Microsoft surface in Deliverd
works the opposite way round:

| | Owned by | Your part |
|---|---|---|
| **Single sign-on** | Your Entra tenant | You paste your issuer or metadata into Deliverd. You are the identity provider; Deliverd is the relying party. Deliverd never touches your tenant. |
| **Teams app** | Deliverd | You install the app package. No registration, no secrets, no Azure. |

Nothing here changes single sign-on, and single sign-on is not a prerequisite
for this. See [sso-setup.md](./sso-setup.md).

### What an approver sees

Each approver gets the request as a **direct message**, never a channel post,
with Approve and Decline buttons and a link to the full request. Every copy of
the message updates once the request is decided, expires or is withdrawn,
wherever that happened — so nobody presses Approve on something already
settled. Email still goes out as well, so chat is never the only route to
anybody.

### Slack

1. Under **Admin → Integrations**, choose **Add to Slack** under *Approve from
   chat*.
2. Finish the install in Slack. The install is tied to your organisation and to
   the administrator who started it.

Approvers are matched to their Slack account by email address. You can add
more than one workspace.

The app asks for four bot scopes, and no more:

| Scope | What it is for |
|---|---|
| `chat:write` | Post an approval into a conversation the bot is part of. |
| `im:write` | Open a direct message, so a request can reach one person privately. |
| `users:read` | Read a member, to find who pressed the button. |
| `users:read.email` | Read their email, which is what links them to a Deliverd account. |

`chat:write.public` is deliberately not requested: it would let the app post
into any public channel in your workspace without being invited.

### Microsoft Teams

1. Under **Admin → Integrations**, choose **Download the app package**.
2. Your Teams administrator uploads it in the **Teams admin centre**, to your
   organisation's app catalogue.
3. Each approver adds Deliverd from their own chat. The card in
   **Admin → Integrations** shows how many have.

**A Teams app can only message somebody who has added it.** That is a Teams
rule, not a Deliverd one: a bot cannot start a conversation with a person who
has not installed it. Rather than ask each approver, a Teams administrator can
install it for people with an **app setup policy** in the Teams admin centre —
an action inside Teams, not Azure work.

When an approver adds the app, it links them to their Deliverd account by their
Entra user principal name, whose domain your tenant has verified — never by the
editable mail attribute.

The app asks for `identity` and `messageTeamMembers`, and does not use Teams
single sign-on: a person is identified from the verified message Teams sends,
so there is no Teams token to consent to.

## What a button can and cannot do

**A button carries the approval and nothing else.** Not who is being asked, not
their email, not whether they are allowed to decide. Every press is checked
again by Deliverd:

- **who pressed it** is established from Slack's or Teams' own signed request;
- **who they are in Deliverd** comes from the account link made when they
  installed or were matched, never from anything written in the message;
- **what they may do** is decided exactly as on the approval page — the
  requester can never approve their own request, an agent can never decide, a
  settled approval refuses a second decision, and a request that needs two
  approvers still needs the second.

## When the Approve button is missing

- **A request an ethics rule flagged** needs a written reason to approve, which
  a button cannot carry. Its message offers Decline and a link to the page, but
  no Approve. See [Ethics](https://deliverd.dev/docs/guide/admin/ethics).
- **Approve with changes** is not offered in chat: a button approves exactly
  what was proposed. To correct a value before approving, use the page.
- **People whose organisation requires single sign-on** get the email and no
  card, and decide in the app instead.

## Current limits

- **Direct messages only.** Requests go to the people named on them, one direct
  message each. A channel is shared, and a button in it would decide for
  whoever pressed it; a read-only channel feed is what the webhook formats
  above are for.
- **Teams users must have added the app** (or had it installed for them by
  policy) before the app can reach them.
- **No store listing.** Neither app is in the Slack Marketplace or the Teams
  store; Slack installs from **Admin → Integrations** and Teams from the
  uploaded package.

The same subject, as part of the administrator's guide, is in
[Integrations and webhooks](https://deliverd.dev/docs/guide/admin/integrations).
