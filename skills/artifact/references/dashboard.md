# Dashboard

Numbers someone checks repeatedly. Success is that they can tell in three
seconds whether anything needs their attention.

## Shape

1. **A headline row** of three to five metrics. Never more — beyond five,
   nothing is prominent, and the point of the row is prominence.
2. **The change**, next to each number, with direction and period: `↑ 2.1pt
   vs last week`. A number with no comparison is not a metric, it is a
   reading.
3. **Detail below**, in the order someone would investigate: the thing that
   moved, then the breakdown that explains it.
4. **"As at"**, stated once and clearly. A dashboard with no timestamp gets
   trusted long after it should be.

## Rules

- Set the metric's *value* in the largest type on the page. The label is
  small and muted above it; the change is small below it. Reversing that
  hierarchy is the most common mistake.
- `font-variant-numeric: tabular-nums` everywhere a figure appears, so digits
  do not jitter between updates.
- Direction is never colour alone — one man in twelve will not see it. Use an
  arrow or a sign as well.
- Decide what "good" looks like. Falling churn is good; falling revenue is
  not. Do not paint every decrease red.
- Round consistently and say what you rounded to. `94.2%` and `94.23%` in the
  same row looks like a bug.
- Charts: read the `dataviz` skill if it is available. If not — one idea per
  chart, axes labelled with units, no second y-axis, and a title that states
  the finding rather than naming the variables.

## Live numbers

If the figures change more often than the layout, read them from a dataset
instead of baking them in:

```js
const rows = await fetch("_data/metrics").then((r) => r.json());
```

Then the numbers update without republishing, and the report keeps one URL.
See `platform-limits.md`. Render a plain "could not load" state if the fetch
fails — a dashboard of blanks is worse than one that says why.
