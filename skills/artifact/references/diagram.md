# Diagram

A picture earns its place when it shows a **mechanism** — how something flows,
what depends on what, where a decision branches. If it would be a list, make
it a list.

## Build it as inline SVG

Not an image file, not a canvas, not a chart library. Inline `<svg>` in the
document:

- It scales and stays sharp at any size.
- It inherits `currentColor`, so it works in light and dark with no second
  asset.
- It is selectable, searchable and accessible.
- It needs no network request, which is the only kind of image a published
  report can rely on.

```html
<svg viewBox="0 0 640 240" role="img" aria-labelledby="d-title">
  <title id="d-title">Publish flow: agent to reader</title>
  …
</svg>
```

Always `viewBox`, never fixed `width`/`height` in pixels. `role="img"` plus a
`<title>` that describes what the diagram *shows*, not what it is called.

## Rules

- **Label every node and every edge.** An unlabelled arrow is a guess.
- Text belongs in the SVG as `<text>`, not baked into a shape. It must be
  selectable and must reflow with the reader's contrast settings.
- Minimum 12px effective text size. Diagram labels are the first thing to
  become unreadable on a phone.
- `stroke="currentColor"` and `fill="none"` for structure; use the accent
  colour for at most one emphasised path.
- Left-to-right or top-to-bottom. Never both in one diagram.
- Wrap it in `<div style="overflow-x:auto">` so a wide diagram scrolls inside
  its own box rather than making the page scroll sideways.

## Mermaid

If the destination renders Mermaid, a fenced ```mermaid block is less work and
stays editable. A published HTML artifact does **not** render it — that needs
a library, and an external library is exactly what a published report cannot
load. In HTML, write the SVG.

## Common failure

A diagram that shows the boxes but not the arrows — an architecture picture
with five labelled components and no indication of what calls what. The
relationships are the content; the boxes are scaffolding.
