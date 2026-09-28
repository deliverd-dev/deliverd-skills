# Showing a report inside SharePoint

A Deliverd report can be embedded in a SharePoint page, so people find it where
they already look. The report is still served by Deliverd and access is still
checked on every request — SharePoint only supplies the frame.

This is deliberately not "publish into SharePoint". A document library cannot
render an HTML report: SharePoint Online enforces *strict* browser file
handling and, unlike SharePoint Server, the setting cannot be changed, so an
`.html` file is always served as a download. Embedding keeps the report on the
side that can render it, evaluate access, keep versions at one address, and
record who opened it.

---

## What a reader sees

| The report is | In the SharePoint page |
|---|---|
| Readable without signing in | Renders inline. No sign-in, no click. |
| Anything else | A card with one line and an **Open report** button, opening at top level. |

There is no third case, and this is stronger than it first looks: **inside
SharePoint, a private report will never render inline for anybody, however
many times they have signed in.** Browsers do not send a site's sign-in cookies
to a page framed inside a different site, and SharePoint Online is always a
different site — your tenant lives on `sharepoint.com`. So Deliverd cannot tell
who is reading inside the frame, and rather than redirect a blank frame to a
sign-in page, it shows the card straight away. Clicking **Open report**,
reading it, and returning to the intranet page still shows the card.

So: **if your intranet reports are readable without signing in, embedding gives
you a genuinely seamless page. If they are not, embedding gives you a one-click
doorway and nothing else will.** Both are useful; they are not the same thing,
and it is worth deciding which you are building before you promise it to
anybody.

### "We have SSO — won't it honour the Microsoft session?"

The most reasonable question anyone asks here, and the answer is no. Two
separate reasons, either of which is enough on its own.

**Deliverd's session is not available in the frame.** SSO changes how someone
proves who they are at the identity provider; it does not change how a browser
treats cookies inside a frame on another site. A live Microsoft session does
not make Deliverd's session appear there.

**And the sign-in page cannot be framed anyway.** Microsoft Entra sets
`X-Frame-Options: DENY` on `login.microsoftonline.com`, deliberately, to stop
credential pages being framed. It is controlled by Microsoft, not by a setting
in your tenant, and there is no exception. So even if the frame could carry a
session, the identity provider would refuse to take part in a silent
round-trip.

What SSO *does* change is the price of the click. **Open report** opens a tab,
Deliverd redirects to Entra, Entra recognises the existing session, and the
report appears — no password, usually no prompt at all. The doorway is one
click and a tab, not a sign-in. That is worth weighing before making a report
readable by anyone with its address purely to avoid it.

### Making a report render inline

It must be readable without signing in, which needs all three of:

- **public links enabled** for the organisation (Admin → Sharing),
- a **classification** other than confidential or restricted, and
- a **public grant** on the report itself — the Share dialog's public option.

Be clear-eyed about that trade. A public report is readable by anyone who has
the address, and putting the address on an intranet page does not change that.
For a genuinely internal-only report the one-click doorway is the honest
answer, and the click buys the property the rest of this product is about.

---

## Setting it up

### 1. Allow the site in Deliverd

**Admin → Security → Embedding.** Add your SharePoint origin, one per line:

```
https://contoso.sharepoint.com
```

The origin only — `https://`, the hostname, nothing else. A path, a port, a
wildcard, or `http://` is refused: a wildcard would hand every tenant on
`sharepoint.com` the right to frame your reports, and `http://` would let
anyone on the network be the embedder.

Everywhere you have not listed is still refused. This does not make reports
public — it decides who may *frame* them, not who may read them.

### 2. Allow the domain on the SharePoint site

SharePoint refuses to embed a domain nobody has approved.

**This is not in the SharePoint admin centre.** It is a *site collection*
setting, which is worth stating plainly because looking for it under Settings
in the admin centre is a dead end — it is not there, under any name.

Go to the site that will hold the page: gear icon → **Site information** →
**View all site settings** → under **Site Collection Administration**,
**HTML Field Security**. Then choose *Allow contributors to insert iframes
from these domains* and add the hostname your reports are served from.

Straight there, if you would rather not hunt for it:

```
https://<tenant>.sharepoint.com/sites/<site>/_layouts/15/HtmlFieldSecurity.aspx
https://<tenant>.sharepoint.com/_layouts/15/HtmlFieldSecurity.aspx   # root site collection
```

It must be the **root site of the site collection** — a subsite's Site
Settings page links up to it rather than carrying its own.

Two consequences follow from it being per site collection rather than
tenant-wide. A **site collection administrator** can do it, so this does not
need a tenant administrator. And **each site collection that embeds reports
needs it** — approving one site does not approve the next.

There is a third option on that page, *allow contributors to insert iframes
from any domain*. Do not use it to save time. It permits every site on the
internet to be framed inside your intranet pages, which is a considerably
larger decision than the one you came here to make.

The hostname to add is the one in your reports' addresses — open a report and
read it from the address bar. That is either Deliverd's shared host for
reports, or your own custom domain if you have verified one under
**Admin → Domains** — which is the tidiest answer here, because the domain
your staff see in the intranet is then yours rather than ours.

### 3. Add it to a page

Edit the SharePoint page → **+** → **Embed**, and paste an iframe — *not* the
address:

```html
<iframe src="https://<host>/<org-slug>/<report-slug>" width="100%" height="900"></iframe>
```

**Pasting the bare address does not work, and the error it gives is
misleading.** SharePoint first tries to resolve an address through oEmbed and,
when it cannot, says *"This website doesn't support embedding using just the
address."* That is not a permissions problem and not a Deliverd problem: it
happens in the browser before any request reaches Deliverd, and SharePoint says
it about every site that is not one of the oEmbed providers it already knows.
The web part's own second sentence is the fix — embed code, iframe-based.

The `src` is the report's ordinary address, the same one you would send
anybody. There is no separate embed URL and no token in it, and access is still
evaluated per reader on every request.

Resize the web part in the page editor rather than hunting for the right
`height`; the number above is only a sensible starting point.

---

## Troubleshooting

**"This website doesn't support embedding using just the address."** You pasted
the URL. Paste an iframe instead — see step 3. Nothing is misconfigured.

**"Embedding content from this website isn't allowed."** Different message,
different cause: this one *is* step 2. The domain has not been approved on this
site collection.

**The frame is blank.** Almost always step 2, and usually because it was done
on a different site collection than the one holding the page — the approval
does not carry across. SharePoint blocks the frame before the request reaches
Deliverd, so there will be nothing in Deliverd's audit log for it. The browser
console on the SharePoint page names the refused domain.

**The frame shows "Sign in to read this report" and you expected the report.**
Working as intended, and it also proves both allowlists are right — that card
comes from Deliverd, so SharePoint let the frame through and Deliverd accepted
the framing site. The report is simply not readable without signing in. See
*Making a report render inline* above; and note that signing in once does not
fix it for next time, for the reason given there.

**The frame shows a 403.** The reader reached Deliverd and was refused: they
are signed in but not on the audience. Add them to the report, or make it
readable by the organisation.

**It works for you and not for a colleague.** You probably have a session
from opening the report directly earlier. Test in a private window.

---

## What this does not do

- It does not put a copy of the report in your tenant. If a records-retention
  policy requires the file to live in SharePoint, embedding does not satisfy
  it.
- It does not use SharePoint's permissions. Deliverd decides who may read the
  report, exactly as it does everywhere else. A person who can see the
  SharePoint page but is not on the report's audience gets a refusal inside it.
- It does not apply to `.docx`, `.xlsx` or `.pptx` files, which Deliverd does
  not currently accept.
