import { createHash } from "node:crypto";
import { Deliverd } from "@deliverd/sdk";
import { TypeSafeClient, noul, score } from "@typesafe-ai/sdk";

/**
 * Jev settles the routine step. A person settles the rest.
 *
 * An agent is about to run a step. Before it does, it asks Jev — TypeSafe's
 * decision model, which never generates text and answers typed questions with
 * probabilities — two things about the step: would it destroy something, and
 * how bad is the worst plausible outcome. A confident "routine" answer lets
 * the step run. Anything else is escalated to a person through Deliverd, with
 * Jev's numbers on the page so the approver can see why they were asked.
 *
 * That is the escalation contract the Jev ecosystem already writes into every
 * harness that adopts it: a verdict the model cannot settle comes back
 * `escalate: true` with a reason. This is where that branch goes.
 *
 * The interesting parts are the two thresholds, which are a policy choice and
 * not a fact, and the branch that runs when Jev is not there at all.
 *
 * Run it with no account and no key — neither of them:
 *
 *   npm install && npm start
 *
 * Without TYPESAFE_API_KEY, Jev is not asked and every step escalates, which
 * is the fail-closed posture a missing verifier should have. `npm run routine`
 * makes an imaginary Jev confident the step is safe, so you can see the fast
 * path. `npm run rejected` makes the imaginary approver say no.
 */

/*
 * Two thresholds. Both are the organisation's to set, and the example's
 * defaults are deliberately cautious: a one-in-five chance of destroying
 * something is not routine, and a severity score the model is unsure about is
 * not a severity score.
 */
const ROUTINE_BELOW = 0.2; // P(destructive) must be under this
const CONFIDENCE_FLOOR = 0.8; // and the severity answer at least this confident

// The step the agent is about to take. In a real harness this is whatever the
// planner produced; here it is one shell command, or whatever you pass in.
const step = {
  tool: "shell",
  command: process.env.STEP ?? "psql -c \"DELETE FROM sessions WHERE last_seen < now() - interval '30 days'\"",
  cwd: "/srv/app",
  requestedBy: "cleanup-agent",
};

const deliverd = new Deliverd({
  // Live when DELIVERD_API_KEY is set; simulated locally when it is not.
  // Same client, same code path, same retries — only the transport differs.
  mode: process.env.DELIVERD_API_KEY ? "live" : "development",
  development: { outcome: process.env.DEMO_OUTCOME ?? "approved" },
});

/**
 * Ask Jev whether this step is routine.
 *
 * Returns the escalation contract's shape: `{ escalate: false }` when Jev is
 * confident the step is safe, `{ escalate: true, reason }` otherwise — and
 * *otherwise* includes Jev not being reachable. A step nobody judged is a
 * step a person judges.
 */
async function judge(state) {
  if (!process.env.TYPESAFE_API_KEY) {
    // Jev is early access. Without a key the imaginary model, like the
    // imaginary approver, answers however you tell it to — and by default it
    // does not answer at all, which sends everything to a person.
    if (process.env.DEMO_JEV === "routine") {
      return { escalate: false, destructive: 0.04, severity: 0.3, confidence: 0.93, model: "imaginary" };
    }
    return { escalate: true, reason: "no_key" };
  }

  const jev = new TypeSafeClient(); // Reads TYPESAFE_API_KEY.
  const { answers, model } = await jev.systemOne({
    state,
    questions: {
      destructive: noul(
        "Would running this step destroy data or make a change that is hard to reverse?",
        {
          true: "Deletes, drops, overwrites, force-pushes, sends money, or sends a message that cannot be recalled.",
          false: "Reads, builds, tests, or writes something that can be undone in one step.",
        }
      ),
      severity: score("How bad is the worst plausible outcome if this step is wrong?", [
        "Nothing to undo.",
        "Annoying, and reversible in minutes.",
        "Hours of work to recover.",
        "Data or money lost that can be recovered with effort.",
        "Permanent loss, or a legal problem.",
      ]),
    },
  });

  const destructive = answers.destructive.noul;
  const { score: severity, confidence } = answers.severity;
  const routine = destructive < ROUTINE_BELOW && confidence >= CONFIDENCE_FLOOR;

  return {
    escalate: !routine,
    reason: routine ? undefined : destructive >= ROUTINE_BELOW ? "destructive" : "unsure",
    destructive,
    severity,
    confidence,
    model,
  };
}

const verdict = await judge(step);

if (!verdict.escalate) {
  console.log(`✓ Routine, says ${verdict.model} — P(destructive) ${verdict.destructive.toFixed(2)}, ` +
    `severity ${verdict.severity.toFixed(1)}/4 at ${(verdict.confidence * 100).toFixed(0)}% confidence.`);
  console.log(`\nRunning: ${step.command}`);
  process.exit(0);
}

/*
 * Escalate. The page the approver sees carries what Jev said, as evidence and
 * not as a verdict: a person reading "62% chance this is destructive" is
 * making a better decision than one reading nothing, and a standing rule can
 * still make this request harder — two approvers for anything critical —
 * without this code knowing.
 */
const factors =
  verdict.reason === "no_key"
    ? [{ label: "Jev was not asked: TYPESAFE_API_KEY is unset, so nothing judged this step", status: "warning" }]
    : [
        {
          label: `Jev put the chance this is destructive at ${(verdict.destructive * 100).toFixed(0)}%`,
          status: verdict.destructive >= ROUTINE_BELOW ? "warning" : "ok",
        },
        {
          label: `Severity ${verdict.severity.toFixed(1)} of 4, at ${(verdict.confidence * 100).toFixed(0)}% confidence`,
          status: verdict.confidence >= CONFIDENCE_FLOOR ? "ok" : "warning",
          detail: `Answered by ${verdict.model}.`,
        },
      ];

const decision = await deliverd.approve({
  title: `Run: ${step.command}`,
  description:
    `${step.requestedBy} wants to run this in ${step.cwd}. ` +
    (verdict.reason === "no_key"
      ? "No model judged it, so a person has to."
      : `Jev could not settle it (${verdict.reason}), so a person has to.`),

  /*
   * Risk from the severity score, or high when nothing scored it. Risk is what
   * a standing rule matches on, so "anything critical needs two people" is the
   * organisation's sentence rather than this file's.
   */
  risk: riskFrom(verdict),
  factors,

  /*
   * A crashed harness that re-runs must find the open request rather than
   * ask the same person twice about one command.
   */
  externalId: `step-${createHash("sha256").update(JSON.stringify(step)).digest("hex").slice(0, 12)}`,
  expiresIn: "1h",

  onPoll: (approval) => {
    if (process.stdout.isTTY) process.stdout.write(`\r  waiting… (${approval.status})\u001b[K`);
  },
});

if (process.stdout.isTTY) process.stdout.write("\r\u001b[K");

if (!decision.approved) {
  console.error(`✗ Not running — ${decision.status}.`);
  if (decision.note) console.error(`  ${decision.decidedBy ?? "They"} said: ${decision.note}`);
  console.error(`  ${decision.url}`);
  process.exit(1);
}

console.log(`✓ ${decision.decidedBy} approved it.`);
if (decision.note) console.log(`  “${decision.note}”`);
console.log(`  ${decision.url}`);
console.log(`\nRunning: ${step.command}`);

function riskFrom(v) {
  if (v.reason === "no_key") return "high";
  if (v.severity >= 3) return "critical";
  if (v.severity >= 2) return "high";
  if (v.severity >= 1) return "medium";
  return "low";
}
