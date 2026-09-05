# Prototype

Something the reader clicks. Built to provoke a reaction, not to be
maintained.

## Shape

- Opens on the state that makes the point. No splash screen, no login, no
  empty state the reviewer has to populate before seeing anything.
- Realistic content. "Lorem ipsum" and `User 1 / User 2` make a design
  impossible to judge — plausible names, plausible numbers, plausible lengths,
  including one uncomfortably long one.
- The main interaction actually works. Everything else can be inert, but say
  so, visibly, rather than letting someone click a dead button and conclude it
  is broken.
- A short "what this is" line at the top: what is real, what is faked, what
  you want feedback on.

## Rules

- **One file.** Inline the CSS and the JS. Vanilla JavaScript is almost always
  enough; a framework via CDN is a dependency that may silently fail to load
  (see `platform-limits.md`).
- **All state in memory.** No backend, no `localStorage` unless the point of
  the prototype is persistence — a reviewer who returns to a half-filled form
  they do not remember filling will think it is a bug.
- **No external requests.** Data is a literal array in the script. `fetch()` to
  another origin is blocked once published.
- Real controls: `<button>`, `<a>`, `<input>`, with focus states. A prototype
  that cannot be tabbed through cannot be evaluated for accessibility, and
  that is often exactly what someone wants to check.
- Handle the narrow viewport. Reviewers open prototypes on phones.
- Keep it under a few hundred lines. A prototype that needs a build step has
  stopped being a prototype.

## Common failure

Building the whole thing. The value is in the one interaction under question;
everything else is cost, and it delays the feedback that might make all of it
unnecessary.
