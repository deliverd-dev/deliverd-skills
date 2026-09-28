import { Deliverd, DeliverdError, DeliverdTimeoutError } from "@deliverd/sdk";

/**
 * An agent about to spend money, and the person who decides whether it does.
 *
 * The deployment gate asks somebody at a desk. This asks somebody who is
 * probably not at one — a partner in a meeting, a finance lead on a train —
 * and that changes what you put in the request. They will read it on a phone,
 * in about fifteen seconds, and they will not open a dashboard to find out
 * what you left out.
 *
 * Run it with no account and no key:
 *
 *   npm install && npm start
 */

const deliverd = new Deliverd({
  mode: process.env.DELIVERD_API_KEY ? "live" : "development",
  development: {
    outcome: process.env.DEMO_OUTCOME ?? "approved",
    note:
      process.env.DEMO_OUTCOME === "rejected"
        ? "Not this quarter — we already have two seats spare on the existing plan."
        : "Fine. Put it on the platform budget, not the team one.",
  },
});

/** What the agent worked out on its own, and now needs permission to act on. */
const purchase = {
  vendor: "Acme Analytics",
  amount: 4_800,
  currency: "GBP",
  term: "12 months",
  reason: "The free tier caps at 10k events/month and we passed that in week three.",
  budgetRemaining: 12_500,
  alternativesChecked: 3,
};

const money = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: purchase.currency,
  maximumFractionDigits: 0,
});

try {
  const decision = await deliverd.approve({
    /*
     * The title is the push notification and the email subject. It has to
     * carry the decision on its own, because a good share of approvers will
     * answer without opening anything else. Amount and vendor, not
     * "Purchase request #4471".
     */
    title: `Spend ${money.format(purchase.amount)} on ${purchase.vendor}`,

    description:
      `${purchase.reason}\n\n` +
      `${money.format(purchase.amount)} for ${purchase.term}. ` +
      `That leaves ${money.format(purchase.budgetRemaining - purchase.amount)} ` +
      `of this quarter's tooling budget.`,

    /*
     * Money leaving the company is high, and it is worth being consistent
     * about it: risk is what a standing rule matches on, so an organisation
     * can require two approvers above a threshold without this code knowing
     * that rule exists.
     */
    risk: purchase.amount >= 5_000 ? "critical" : "high",

    factors: [
      {
        label: `${money.format(purchase.budgetRemaining)} left in the tooling budget`,
        status: purchase.amount <= purchase.budgetRemaining ? "ok" : "warning",
      },
      {
        label: `${purchase.alternativesChecked} alternatives priced`,
        status: "info",
        detail: "Cheapest was £3,900 but has no SSO, which we need for SOC 2.",
      },
      { label: `${purchase.term} term, cancellable at 30 days`, status: "ok" },
    ],

    links: [{ label: "Quote", url: "https://example.invalid/quotes/4471.pdf" }],

    /*
     * Name the people who may decide. Omit this and it goes to the
     * organisation's owners and admins, which is right for a small team and
     * wrong the moment finance is a different person from the founder.
     *
     * You cannot name yourself: an agent asking itself is not an approval,
     * and the API refuses it rather than letting it look like one.
     */
    approvers: ["finance@acme.example"],

    externalId: `purchase-${purchase.vendor}-${purchase.amount}`.toLowerCase().replace(/\s+/g, "-"),
    expiresIn: "3d", // A purchase can wait for someone to be back at work.

    /*
     * Everything you would want in the ledger afterwards. Metadata comes back
     * unchanged on the decision and lands in the audit trail, so the answer to
     * "why did we buy this" is attached to the approval rather than to a
     * Slack thread nobody can find.
     */
    metadata: {
      vendor: purchase.vendor,
      amountMinor: purchase.amount * 100,
      currency: purchase.currency,
      costCentre: "platform",
    },
  });

  switch (decision.status) {
    case "approved":
      console.log(`✓ ${decision.decidedBy} approved it.`);
      if (decision.note) console.log(`  “${decision.note}”`);
      console.log(`\n  Placing the order…`);
      break;

    case "rejected":
      // A no is an answer, not an error. It arrives here, not in the catch.
      console.log(`✗ ${decision.decidedBy} said no.`);
      if (decision.note) console.log(`  “${decision.note}”`);
      console.log(`\n  Not ordering. Logged against ${decision.id}.`);
      break;

    case "expired":
      // The request's own deadline passed server-side. Distinct from the
      // timeout below: nobody will decide this one now.
      console.log(`⏱ Nobody answered within three days, and the request expired.`);
      console.log(`  Not ordering — silence is not consent.`);
      break;

    case "cancelled":
      console.log(`⊘ Withdrawn before anyone decided.`);
      break;
  }

  console.log(`  ${decision.url}`);
} catch (error) {
  /*
   * The catch is for the wait failing, never for the answer being no. "They
   * said no" is a value; these are exceptions.
   *
   * Two of them, and the difference matters more than it looks:
   *
   *   DeliverdTimeoutError — *you* stopped waiting. The request is untouched
   *     and still open, so somebody can still decide it and the order can
   *     still happen later. Do not treat this as a refusal.
   *
   *   status: "expired" (above, not here) — the *request* ran out of time.
   *     Nobody is going to decide it now.
   */
  if (error instanceof DeliverdTimeoutError) {
    console.log(`⏳ Stopped waiting, but the request is still open.`);
    console.log(`   Somebody can still decide it — pick it back up with its externalId.`);
    process.exit(0);
  }
  if (error instanceof DeliverdError) {
    console.error(`Could not ask: ${error.message}`);
    process.exit(1);
  }
  throw error;
}
