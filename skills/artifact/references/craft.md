# Craft

What separates a document that looks designed from one that looks generated.
Read this before writing markup.

## The one rule

**Restraint.** Almost everything that makes generated HTML look generated is
something that was added: a gradient, a second accent colour, a drop shadow on
a card that did not need to be a card, an emoji in a heading, a border on every
side of every box. Beautiful documents are mostly empty space and one good
typeface, arranged confidently.

When in doubt, remove it.

## Typography

**One family.** A system stack renders instantly, matches the reader's
platform, and needs no network request:

```css
font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, sans-serif;
```

For anything with a lot of prose, a serif stack reads better and immediately
looks less like a web app:

```css
font-family: ui-serif, Georgia, Cambria, "Times New Roman", serif;
```

Use a monospace stack for numbers in tables (`ui-monospace, SFMono-Regular,
Menlo, Consolas, monospace`) or, better, `font-variant-numeric: tabular-nums`
on the sans stack, so columns of figures line up.

**Measure.** Body text gets `max-width: 68ch`. Lines longer than that are
measurably harder to read, and a full-width paragraph on a 27-inch monitor is
the single clearest sign nobody looked at the output.

**Scale.** Pick a ratio and stick to it. 1.25 is safe:

| Role | Size | Weight | Notes |
|---|---|---|---|
| Body | 16–17px | 400 | `line-height: 1.6` |
| Small / caption | 13–14px | 400 | muted colour |
| H3 | 20px | 600 | `line-height: 1.3` |
| H2 | 25px | 600 | `line-height: 1.2` |
| H1 | 32–40px | 700 | `line-height: 1.1` |

Headings get tighter line-height and slightly negative letter-spacing
(`-0.01em` to `-0.02em`) as they get larger. Body text gets neither.

**Never** centre a paragraph. Centre a single short heading if you like;
centred prose is unreadable past two lines.

## Colour

Start with two colours and add a third only if it earns its place.

- **Ink** — near-black, never `#000`. `#18181b` reads softer and looks
  deliberate.
- **Paper** — near-white, never `#fff` for a full page. `#fafaf9` takes the
  glare off.
- **Muted** — one grey for secondary text, around `#71717a`.
- **Accent** — exactly one, used for links, the active state and at most one
  emphasis per screen. If you find yourself picking a second accent, you
  actually want a different layout.

Semantic colour (positive/negative on a metric) is not an accent and does not
count against that budget — but it must never be the *only* signal, because
roughly one man in twelve will not see the difference. Pair it with a sign, an
arrow or a word.

Define everything as custom properties on `:root` so the dark theme is a
handful of overrides rather than a second stylesheet:

```css
:root {
  --ink: #18181b;
  --paper: #fafaf9;
  --muted: #71717a;
  --line: #e4e4e7;
  --accent: #2563eb;
}
@media (prefers-color-scheme: dark) {
  :root {
    --ink: #f4f4f5;
    --paper: #18181b;
    --muted: #a1a1aa;
    --line: #303034;
    --accent: #60a5fa;
  }
}
```

Dark mode is not "invert everything". Shadows stop working (use a lighter
border instead), and pure white text on pure black vibrates — hence `#f4f4f5`
on `#18181b`.

Check contrast: body text needs 4.5:1 against its background, large text 3:1.

## Space

**One spacing unit**, and multiples of it. 4px or 8px. Every margin, padding
and gap is a multiple. This is most of what "consistent" means visually, and
it is the thing that is instantly obvious when it is missing.

Space is grouping. Elements that belong together sit closer than elements that
do not — so the gap *above* a heading is always larger than the gap below it.
Getting that one relationship right does more than any border.

Give the page real margins: `padding: 3rem 1.5rem` at minimum on mobile, and
generous room at the top. Crowded edges read as unfinished.

## Structure

- Lead with the conclusion. A reader who stops after the first screen should
  still have the answer.
- One idea per section, with a heading that says what the idea *is* — "Revenue
  fell in the second quarter", not "Revenue".
- Tables for anything comparative. Right-align numbers, left-align text,
  `tabular-nums`, and no vertical rules — horizontal rules alone are enough.
- Long content gets a table of contents; short content does not.
- Cite the period and unit next to every number, not in a footnote.

## Motion

Almost none. A `transition` on hover states, and nothing else. Entrance
animations on a document are noise, and they break printing.

Always respect the reader:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Responsive

Design for the narrow case and let it grow. A single column with a
`max-width` and `margin-inline: auto` handles most artifacts with no media
queries at all.

Wide things — tables, code blocks, diagrams — scroll **inside their own box**:

```css
.scroll-x { overflow-x: auto; }
```

The page body must never scroll sideways. That is the most common defect in
generated HTML and the most obvious on a phone.

## Print

Someone will print it or save it as PDF, especially an executive summary.
Costs four lines:

```css
@media print {
  :root { --paper: #fff; --ink: #000; }
  body { font-size: 11pt; }
  nav, .no-print { display: none; }
  h1, h2, h3 { break-after: avoid; }
  table, figure { break-inside: avoid; }
}
```

## Accessibility

Not optional, and mostly free at authoring time:

- Real landmarks: `<header>`, `<main>`, `<nav>`, `<footer>`.
- Headings in order. Never skip a level to get a size — that is what CSS is for.
- Every `<img>` and inline `<svg>` gets alt text or `aria-hidden="true"` when
  it is decorative.
- `<html lang="en">`, and a `<title>` that names the document — it becomes the
  report's title when published.
- Colour is never the only carrier of meaning.
- Interactive things are `<button>` and `<a>`, not `<div onclick>`.

## The check before you finish

1. Resize to 360px wide. Does anything overflow sideways?
2. Switch to dark mode. Is anything invisible?
3. Print preview. Is it usable?
4. Read only the headings. Do they tell the story on their own?
5. Count the accent colours. More than one? Remove one.
6. Is the conclusion above the fold?
