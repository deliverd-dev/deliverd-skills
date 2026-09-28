import { Deliverd, DeliverdError } from "@deliverd/sdk";

/**
 * An AI writes something for a client, and a partner signs it off before it
 * leaves the building.
 *
 * The other two examples ask permission *before* an action. This asks
 * judgement *about work that already exists*, which is a different question
 * and a different primitive: `review()` comes back with verdicts and a count
 * of the comment threads to read, not a yes or no.
 *
 * Run it with no account and no key:
 *
 *   npm install && npm start
 *
 * One caveat, stated plainly because the code below handles it: development
 * mode simulates the *request* APIs — approvals, reviews, collections, flows —
 * and not publishing. Publishing puts bytes somewhere, and there is nowhere
 * local to put them. So without a key this runs the sign-off half against a
 * report id you supply, and with a key it runs the whole loop.
 */

const live = Boolean(process.env.DELIVERD_API_KEY);

const deliverd = new Deliverd({
  mode: live ? "live" : "development",
  development: { outcome: process.env.DEMO_OUTCOME ?? "approved" },
});

/** Whatever your model produced. Any HTML — a chart, a dashboard, a memo. */
const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Q3 portfolio review — Northwind</title></head>
  <body style="font:16px/1.6 system-ui;max-width:42rem;margin:4rem auto;padding:0 1rem">
    <h1>Q3 portfolio review</h1>
    <p>Prepared for Northwind Capital, ${new Date().toLocaleDateString("en-GB")}.</p>
    <p>Net exposure fell 4.2% on the quarter, driven by the two disposals in
       August. Concentration risk in the top five holdings is unchanged at 31%.</p>
    <table style="border-collapse:collapse;width:100%">
      <tr><th align="left">Holding</th><th align="right">Weight</th></tr>
      <tr><td>Meridian Industrial</td><td align="right">9.1%</td></tr>
      <tr><td>Calder Energy</td><td align="right">7.4%</td></tr>
    </table>
  </body>
</html>`;

/* ── 1. Publish it ────────────────────────────────────────────────────────── */

let reportId = process.env.REPORT_ID ?? null;
let reportUrl = null;

if (live) {
  const result = await deliverd.publish({
    title: "Q3 portfolio review — Northwind",
    content: html,
    /*
     * Nobody, yet. The client is not the audience until a partner has read it,
     * and a report published straight to them is the exact failure this whole
     * example exists to prevent.
     */
    audience: [],
    sourceTool: "example",
    changeSummary: "First draft from the Q3 ledger export.",
  });

  // `publish` answers with the report nested, plus a status — because an
  // organisation's own policy may have held this version for approval before
  // it went anywhere, and a caller that assumes it is live would be wrong.
  reportId = result.report.id;
  reportUrl = result.report.url;

  if (result.status === "pending_approval") {
    console.log(`A publishing policy held this version for approval.\n  It is stored and scanned; nobody can read it yet.\n`);
  } else {
    console.log(`Published as a draft nobody can read yet:\n  ${reportUrl}\n`);
  }
} else {
  console.log(
    "Development mode simulates requests, not publishing — bytes need\n" +
      "somewhere real to live. Running the sign-off half only.\n"
  );
}

/* ── 2. Ask a person whether it is right ──────────────────────────────────── */

try {
  const outcome = await deliverd.review({
    title: "Q3 portfolio review — Northwind",

    /*
     * Attach the report and the reviewer reads the actual thing, in place,
     * with a comment tool on it. Without this they are reviewing a description
     * of a document, which is how figures reach clients unchecked.
     */
    ...(reportId ? { reportId } : {}),

    /*
     * Say what you want checked. "Please review" gets you a skim; naming the
     * two things that would be expensive to get wrong gets you those two
     * things actually checked.
     */
    instructions:
      "Two things before this goes to Northwind: the concentration figure " +
      "against the August ledger, and whether the disposals paragraph needs " +
      "the fee note we added last quarter.",

    reviewers: ["partner@firm.example"],
    expiresIn: "2d",
    externalId: "northwind-q3-review",

    // The review as it now stands, after each poll. Terminal only: in a CI
    // log this would be one line per poll.
    onPoll: (review) => {
      if (process.stdout.isTTY) process.stdout.write(`\r  waiting… (${review.status})\u001b[K`);
    },
  });

  if (process.stdout.isTTY) process.stdout.write("\r\u001b[K");

  if (outcome.approved) {
    console.log(`✓ Signed off.`);
    for (const verdict of outcome.verdicts) {
      console.log(`  ${verdict.by ?? "Reviewer"}: ${verdict.verdict}${verdict.note ? ` — “${verdict.note}”` : ""}`);
    }
    console.log(`\n  Now it can go to the client:`);
    console.log(`    await deliverd.reports.share(reportId, ["northwind.example"])`);
  } else {
    /*
     * Changes requested is the useful answer, and it is `approved: false`.
     * `threadCount` is how many comment threads are waiting — the input to the
     * next draft, which is the point of asking a person at all.
     */
    console.log(`↺ Changes requested — ${outcome.threadCount} thread(s) to read.`);
    console.log(`  ${outcome.url}`);
    console.log(`\n  An agent picks the notes up with get_revision_brief over MCP,`);
    console.log(`  or GET /v1/reports/{id}/revision-briefs, and publishes v2.`);
  }

  if (reportUrl) console.log(`\n  Report: ${reportUrl}`);
} catch (error) {
  if (error instanceof DeliverdError) {
    console.error(`\nCould not ask for a review: ${error.message}`);
    process.exit(1);
  }
  throw error;
}
