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

## When the diagram is too big to read at once

Past roughly a dozen nodes a static picture stops working: either the labels
shrink below reading size or the page scrolls sideways and nobody sees the
whole shape. That is the point at which interaction earns its cost — pan and
zoom, click a node to read about it, trace one path through the rest.

`examples/reference-architecture.html` is the worked version: 17 nodes, 25
labelled edges, an inspector panel and two traced flows, in one file with no
external request. Copy its structure rather than reinventing it. Three things
in it are not obvious and are what make it legible:

- **Put the prose in a side panel, not on the canvas.** Responsibilities and
  connection lists belong beside the diagram. Cramming them into boxes is what
  forces the text below reading size in the first place.
- **Place edge labels on the real curve.** The midpoint of the straight line
  between two endpoints is not on the bezier drawn between them, so the naive
  version leaves labels floating beside the line they name. Walk the path with
  `getPointAtLength`, and measure the text after inserting it — a guessed
  width clips on a machine that resolved a different font.
- **Hide a label rather than stack it.** When a label cannot find clear space,
  leave it out and show it when its edge is selected or traced. A diagram that
  is honest at rest and complete on demand beats one that is illegible in both
  states.

Draw edges beneath nodes, so a line passing behind a box reads as depth rather
than as a collision. And keep every node reachable by keyboard with an
`aria-label` that carries what the inspector would say — a pan-and-zoom canvas
is otherwise unusable without a mouse.

Do not reach for this below about a dozen nodes. A static SVG that fits on the
screen is better than an interactive one that has to be explored.

## Common failure

A diagram that shows the boxes but not the arrows — an architecture picture
with five labelled components and no indication of what calls what. The
relationships are the content; the boxes are scaffolding.
