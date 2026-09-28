# Publishing from CI

A report that is regenerated on every build wants publishing on every build.
The CLI is on npm as [`deliverd`](https://www.npmjs.com/package/deliverd), and
anything that can run `npx` can publish.

## Credentials

`deliverd login` opens a browser, which is right at a desk and impossible on a
build server. In CI, set two environment variables instead — they take
precedence over any config file:

| Variable | Value |
|---|---|
| `DELIVERD_URL` | `https://deliverd.dev` |
| `DELIVERD_TOKEN` | An API token with `reports:write` |

Set both: the CLI refuses a token without a URL rather than guessing where to
send it.

Create the token under **Settings → API tokens** and store it as a secret. It
is shown once. Give it the narrowest scopes the job needs: a job that only
publishes needs `reports:write`, not `reports:share`.

## The command

```bash
export DELIVERD_URL=https://deliverd.dev
npx deliverd publish ./dist/report --slug finance/weekly --living --json
```

**Publishing the same `slug` again updates that report in place and keeps the
URL.** That is what makes this worth running on every push rather than only the
first: the link in last month's email still opens the current build.

`--json` prints `{ id, title, slug, url, version, warnings }` so the next step
can take the URL without parsing human output that may be reworded later.

To keep the version history reading like the git log, pass the commit message
as the change summary:

```bash
npx deliverd publish ./dist/report --slug finance/weekly --living \
  --change-summary "$COMMIT_MESSAGE" --json
```

## GitHub Actions

```yaml
- name: Publish the report
  id: report
  env:
    DELIVERD_URL: https://deliverd.dev
    DELIVERD_TOKEN: ${{ secrets.DELIVERD_TOKEN }}
    COMMIT_MESSAGE: ${{ github.event.head_commit.message }}
  run: |
    npx deliverd@0.7.0 publish ./dist/report --slug finance/weekly --living \
      --change-summary "$COMMIT_MESSAGE" --json > published.json
    echo "url=$(jq -r .url published.json)" >> "$GITHUB_OUTPUT"

- run: echo "Published ${{ steps.report.outputs.url }}"
```

The `url` output is enough to comment the link on a pull request or post it to
a channel.

## GitLab CI

```yaml
publish:
  image: node:24
  script:
    - npx deliverd publish ./dist/report --slug finance/weekly --living
  variables:
    DELIVERD_URL: https://deliverd.dev
  # DELIVERD_TOKEN comes from a masked CI/CD variable.
```

## Two things worth getting right

**Pin the CLI version** for a reproducible build — `npx deliverd@0.7.0`, or
whichever version you have tested. `latest` is convenient and moves under you.

**Never interpolate untrusted text into the command line.** A branch name or a
pull-request title is attacker-controlled on a fork, and `${{ }}` in a `run:`
block is textual substitution, not an argument. Pass values as environment
variables and quote them in the script, as `$COMMIT_MESSAGE` is above.

## When the report changes while CI is running

If more than one thing publishes to the same report — a build and an agent,
say — pass the expected version (`--expected-version` on the CLI,
`expectedVersion` through the API) so the loser is refused with a `409` rather
than silently overwriting the winner. See the notes on `latestVersion` in
[api.md](./api.md#approvals) and in [cli.md](./cli.md). A single CI job
publishing on its own does not need it.
