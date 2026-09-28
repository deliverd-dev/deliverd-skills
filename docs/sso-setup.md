# Single sign-on

Deliverd speaks **SAML 2.0** and **OpenID Connect**. An organisation connects
one of them, claims its email domains, and can require it — after which
passwords and email links stop working for those domains.

Both are set up by an organisation owner or administrator under
**Admin → Identity & SSO**. The two ask for different things:

| | SAML | OpenID Connect |
|---|---|---|
| Configured with | Metadata URL or XML | Issuer URL, client ID, client secret |
| Then | Prove your domains (below) | Prove your domains (below) |

## OpenID Connect

One connection per organisation, and one form for every provider. Google,
Okta, Entra, Auth0, Keycloak and Ping differ only in the issuer URL, which is
read at save time to discover the rest.

### What the administrator needs

Register an application at the provider first, with this redirect URI:

```
https://deliverd.dev/auth/oidc/callback
```

It is compared byte for byte, so it must match exactly — the console shows the
correct value above the form, which is the one to copy.

Then in **Admin → Identity & SSO → OpenID Connect**:

- **Issuer URL** — `https://accounts.google.com`, `https://your-org.okta.com`,
  `https://login.microsoftonline.com/<tenant id>/v2.0`,
  `https://your-tenant.eu.auth0.com`
- **Client ID** and **client secret** from that application
- **Email domains** to route

Saving fetches `<issuer>/.well-known/openid-configuration` and refuses if the
document names a different issuer, is unreachable, or lacks an endpoint
Deliverd needs. A mistyped issuer therefore fails while somebody is still
looking at the screen rather than at the first sign-in next week.

The client secret is stored encrypted and is never shown again after saving.

### What is checked at sign-in

The ID token's signature against the provider's published keys, the issuer, the
audience, expiry, the nonce this browser sent, and an email address that is
present *and* marked verified. The address must also be on a domain the
connection claims — a provider vouching for someone does not make them a member
of the organisation that configured it, and a public provider will vouch for
anybody.

### Requirements

The application must request the `openid`, `email` and `profile` scopes, and
must be a confidential client — the token exchange sends a client secret. PKCE
with S256 is always sent; a provider that does not advertise it is still
accepted, because several support it without saying so.

## SAML

On **Admin → Identity & SSO**, for your provider:

1. Copy the **service provider** values (Entity ID, ACS URL, metadata URL) from
   the "What to enter in …" panel into your IdP's SAML application.
2. Paste your IdP's **metadata URL** back — or, for Google Workspace and most
   on-prem providers, the **metadata XML**, since those export a file rather
   than publishing a URL.
3. List the **email domains** the connection covers.
4. Optionally turn on **Require SSO**, which stops passwords and email links
   working for those domains.

The `NameID` must be `emailAddress` or `persistent`, and the assertion should
carry `email` (and ideally `name`).

Copy the service provider values from the console rather than typing them: they
contain the host name, and an IdP configured against a different address will
not work.

The provider's card shows **Connected** once the connection is registered. If
something is wrong, the reason is shown on the card.

## Prove your domains

A domain routes sign-in only after you prove you own it. For each domain the
connection lists, the card shows a DNS TXT record to publish at
`_deliverd-verify.` followed by the domain. Add it with your DNS provider, then
choose **Check now**; unverified domains are also checked again automatically.
When the check passes, the domain shows **Routing**.

- Until a domain is verified, people at that domain keep signing in with a
  password or an email link. Nobody is locked out while you set up.
- A domain can belong to only one connection across the whole platform.
- Public mailbox domains, such as gmail.com or outlook.com, cannot be claimed.

Turn on **Require SSO** only once a connection is working.

## How sign-in routes

The sign-in page has a **Company** tab that takes an email address. The domain
decides which connection to use, and the person is handed to their IdP.

If someone with an SSO-required domain tries a password or an email link,
Deliverd refuses and moves them to the Company tab. The rule is enforced by the
server, not only by the form.

A connection only routes once it is fully set up and its domains are verified.
Enforcing a half-configured provider would leave a domain with no password
*and* an SSO redirect going nowhere, so routing ignores connections that are
not ready.

## Existing members signing in with SSO for the first time

Somebody who was already a member before SSO was switched on keeps everything
when they first sign in through their IdP: their organisation, workspace and
group memberships (with the role they already had), the reports they own,
access granted to them, their comments, mentions and notifications.

History is never rewritten. The audit trail still shows the original account
performing its original actions, with an `auth.sso_account_linked` event
explaining why the two are the same person — rewriting who did what would
falsify the record, which is the one thing an audit log may not do.

Two guarantees hold throughout:

- **The email must be on one of the connection's domains.** An IdP can only
  bring people into the organisation that registered it, and only for the
  domains it claims. A mismatch signs the session out and is audited as
  `auth.sso_domain_rejected`.
- **A suspended member is not reinstated by signing in again.** That decision
  belongs to an administrator, not to the IdP.

## Provisioning and deprovisioning

First-time SSO users are provisioned just-in-time as **viewers**. Promote them
under **Admin → People**.

There is no SCIM endpoint, so **deprovisioning is manual**: removing someone
from the IdP stops them signing in, but does not remove their membership.
Remove them under **Admin → People** as well.

## Audit events

| Event | When |
|---|---|
| `idp.connected` / `idp.disconnected` | An administrator connects or removes a provider |
| `idp.enforcement_changed` | SSO is required or made optional |
| `auth.sso_login` | A sign-in is redirected to the IdP, and again on return |
| `auth.sso_user_provisioned` | A first-time user is given a membership |
| `auth.sso_account_linked` | An existing member's first SSO sign-in is linked to their account |
| `auth.sso_domain_rejected` | An assertion carried an email outside the connection's domains |
| `auth.sso_inactive_member` | A suspended member signed in and was not reinstated |

The same subject for people who use Deliverd rather than set it up is in
[Identity and single sign-on](https://deliverd.dev/docs/guide/admin/identity).
