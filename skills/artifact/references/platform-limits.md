# What a published artifact may contain

These are not style preferences. They are what the hosting accepts, and what
the browser will run once it is served. Breaking one produces a page that is
refused at publish time, or — worse — one that publishes cleanly and renders
with pieces missing.

Everything here is the default. An organisation's admin can loosen several of
these settings; **never assume a loosened organisation**, because the artifact
will be opened by people in one you know nothing about.

## The security policy the page runs under

A published report is served with a strict Content Security Policy:

```
default-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;
font-src 'self' data:; connect-src 'self'; media-src 'self';
object-src 'none'; base-uri 'self'; form-action 'self'; frame-src 'none'
```

Read that as a list of what your artifact may do:

| | |
|---|---|
| ✅ Inline `<script>` and `<style>` | The normal way to build these |
| ✅ Scripts and styles from the bundle itself | Relative paths only |
| ✅ `data:` and `blob:` images, `data:` fonts | Inline SVG, embedded images |
| ✅ `fetch()` to the same origin | This is how live data works — see below |
| ✅ Forms posting to the same origin | |
| ❌ `<script src="https://cdn…">` | Unless auto-vendored — see below |
| ❌ `<link rel="stylesheet" href="https://fonts…">` | Use a system font stack |
| ❌ Remote `<img src="https://…">` | Inline the SVG, or embed as a data URI |
| ❌ `fetch()` to any other origin | No third-party APIs at view time |
| ❌ `<iframe>`, `<object>`, `<embed>` | |

`unsafe-eval` is permitted, so a library that compiles templates at runtime
works — but `eval(` and `new Function(` trip a heuristic warning on publish.
Avoid them where you have the choice.

**The practical rule: one file, everything inlined.** It satisfies all of the
above without having to think about any of it.

## CDN scripts, and why "it worked" is not proof

Assets from six hosts are fetched at publish time and bundled into the report:

```
cdn.jsdelivr.net   unpkg.com   cdnjs.cloudflare.com
ajax.googleapis.com   fonts.googleapis.com   fonts.gstatic.com
```

Limits: 2 MB per asset, 8 MB total, 20 assets, 10-second timeout.

A `<script src>` from **any other host** is not fetched, is then blocked by the
CSP at view time, and produces only a warning at publish — so the report
publishes successfully and the chart is simply missing. Nobody finds out until
a reader mentions it.

Even on the six allowed hosts, a fetch that times out leaves the tag to be
blocked later. **Inlining the library is the only version of this with no
failure mode.**

## Files and paths

A single HTML document is the simple case. For a bundle:

- Entry point is `index.html` at the root.
- **Relative paths** — `assets/logo.svg` rather than `/assets/logo.svg`. The
  gateway injects a `<base>` so relative paths resolve. A root-absolute path
  that points at a file in the bundle (what `vite build` emits) is rewritten
  to relative at publish; one that points at nothing is left alone and
  reported as a warning, because under the report's address it will not
  load.
- **Never write your own `<base>` tag.** The injection is skipped if the
  document already has one, and then every relative path breaks.
- No `..`, no absolute paths, no drive letters. Maximum depth 10.
- **`_data/` at the top level is refused.** That prefix serves live datasets.
- Allowed extensions: `.html .htm .css .js .mjs .json .svg .png .jpg .jpeg
  .gif .webp .ico .avif .woff .woff2 .ttf .txt .csv .md .map .mp4 .webm`.
  Anything else fails the publish.
- Markdown in a bundle is rendered to HTML, with raw HTML inside it escaped
  rather than passed through.

## Size

| Path | Limit |
|---|---|
| Inline `content` (MCP or REST) | 2 MB |
| Inline `files` array | 50 entries, 2 MB each; binary as base64 with `encoding: "base64"` |
| Zip or folder upload | 500 files, 50 MB zipped, 150 MB unpacked, 30 MB per file |

A binary asset goes through the inline `files` array as base64: set
`encoding: "base64"` on that entry and it is decoded into the bundle. Data
URIs and a zip upload both still work.

## Secrets: blockers, not warnings

A document containing any of these is **refused**, and the whole publish
fails:

AWS access keys (`AKIA…`/`ASIA…`) · PEM private key blocks · GitHub tokens
(`ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`) · Slack tokens (`xox…`) · live Stripe
keys (`sk_live_`, `rk_live_`) · OpenAI keys (`sk-…`) · Anthropic keys
(`sk-ant-…`)

This catches invented examples as readily as real credentials. **Never write a
realistic-looking key into sample code, a config snippet or a screenshot
mockup.** Use an obvious placeholder: `YOUR_API_KEY`, `<token>`, `xxx`.

Test Stripe keys, Google API keys, JWTs and `password = "…"` assignments are
warnings rather than blockers — they publish, and they are still worth not
writing.

## Live data

A report can read data without being republished:

```js
const rows = await fetch("_data/sales").then((r) => r.json());
```

Same origin, so the CSP allows it, and it is behind the same access check as
the report. Datasets are ≤5 MB, up to 25 per report, named as one lowercase
segment. Write them through the API; the artifact only reads.

Use this when the numbers change more often than the layout. It is also what
clears a recurring schedule — for a report that reads its figures from
`_data/…`, updating the data *is* the update; republishing identical markup is
not needed.

## Things a publishing agent cannot do

- **Grant public access.** An agent identity is refused, at the service. If
  something genuinely needs to be public, a person has to do it.
- **Copy a report.** Ask the person to copy it and point you at the result.
- **Assume filing means access.** Moving a report into a workspace does not
  let anyone in that workspace read it — that is a separate grant. Ask before
  requesting one.

## What "it published" does not mean

The publish result carries a `warnings` array. It is there to be read: an
external script that was not vendored, a form pointing off-origin, a
heuristic finding. A successful publish with warnings is a report with
something wrong in it. Fix and update rather than moving on.
