import { Deliverd } from "@deliverd/sdk";

/**
 * A deploy that waits for a person.
 *
 * The shape of every gate: decide what the person needs to know, ask, and
 * branch. The interesting parts are not the `approve()` call — that is four
 * lines — but the three things around it that decide whether the gate is
 * usable on a real pipeline.
 *
 * Run it with no account and no key:
 *
 *   npm install && npm start
 *
 * An imaginary approver says yes. `npm run rejected` makes them say no, so
 * you can see the failure path without waiting for a human to produce one.
 */

const deliverd = new Deliverd({
  // Live when DELIVERD_API_KEY is set; simulated locally when it is not.
  // Same client, same code path, same retries — only the transport differs.
  mode: process.env.DELIVERD_API_KEY ? "live" : "development",
  development: { outcome: process.env.DEMO_OUTCOME ?? "approved" },
});

// Whatever your CI already knows. These are the facts the approver needs and
// cannot get themselves at 6pm on a Friday.
const build = {
  sha: process.env.GITHUB_SHA?.slice(0, 7) ?? "a1b2c3d",
  branch: process.env.GITHUB_REF_NAME ?? "main",
  tests: "412 passed",
  migrations: 1,
  actor: process.env.GITHUB_ACTOR ?? "a robot",
};

const decision = await deliverd.approve({
  title: `Deploy ${build.sha} to production`,
  description:
    `${build.actor} pushed to ${build.branch}. This release contains ` +
    `${build.migrations} database migration, which is not reversible once ` +
    `traffic reaches it.`,

  /*
   * Risk is not decoration. It orders the approver's queue and it is what a
   * standing rule matches on, so an organisation can say "anything critical
   * needs two people" without touching this code.
   */
  risk: build.migrations > 0 ? "high" : "medium",

  /*
   * Evidence, as a checklist on the page. Put what you would otherwise expect
   * them to go and look up — an approver who has to open three tabs before
   * they can answer is an approver who rubber-stamps.
   */
  factors: [
    { label: `Tests: ${build.tests}`, status: "ok" },
    { label: `Branch: ${build.branch}`, status: "ok" },
    {
      label: `${build.migrations} migration in this release`,
      status: build.migrations > 0 ? "warning" : "ok",
      detail: "Adds a column with a default. Safe to run before the deploy.",
    },
  ],

  links: [
    { label: "Commit", url: `https://github.com/acme/app/commit/${build.sha}` },
    { label: "CI run", url: "https://github.com/acme/app/actions/runs/1234" },
  ],

  /*
   * The line that makes this safe to retry.
   *
   * A pipeline that dies and re-runs would otherwise file a second request,
   * and the approver gets asked twice about one deploy. With an externalId,
   * the SDK finds the open request and waits on that one instead — so a
   * crashed job resumes rather than duplicates.
   */
  externalId: `deploy-${build.sha}`,

  /*
   * A deploy nobody answers should not hold the runner all night. After this
   * the request expires undecided and the wait returns `status: "expired"` —
   * which is a "no" you can log, not an exception you have to catch.
   */
  expiresIn: "2h",

  /*
   * The approver can ask a question from the page. Answer the ones you can
   * without a person: they are usually facts your pipeline already holds, and
   * every one answered here is a round trip nobody waits for. Return null and
   * it stays for a human.
   */
  onQuestion: async ({ question }) => {
    if (/staging/i.test(question)) return "Yes — deployed to staging 20 minutes ago and smoke tests passed.";
    if (/rollback|revert/i.test(question)) return "Rollback is one click: redeploy the previous release.";
    return null; // Anything else waits for a person, as it should.
  },

  /*
   * Called after every poll, with the request as it now stands. Useful for a
   * progress line, and for noticing that somebody asked a question you chose
   * not to answer above.
   */
  onPoll: (approval) => {
    // Only on a terminal. In a CI log this would be one line per poll, and
    // carriage returns do not erase anything there.
    if (process.stdout.isTTY) process.stdout.write(`\r  waiting… (${approval.status})\u001b[K`);
  },
});

if (process.stdout.isTTY) process.stdout.write("\r\u001b[K");

if (!decision.approved) {
  /*
   * Rejected, expired and cancelled are all `approved: false`, and they mean
   * different things to whoever reads the log. Say which.
   */
  console.error(`✗ Not deploying — ${decision.status}.`);
  if (decision.note) console.error(`  ${decision.decidedBy ?? "They"} said: ${decision.note}`);
  console.error(`  ${decision.url}`);
  process.exit(1); // Fails the pipeline, which is the whole point.
}

console.log(`✓ Approved by ${decision.decidedBy}.`);
if (decision.note) console.log(`  “${decision.note}”`);
console.log(`  ${decision.url}`);

// …your actual deploy goes here.
console.log("\nDeploying…");
