---
name: ethics-rules
description: Help a person write, test and roll out their organisation's ethics rules, the rules that put a concern about harm to a person in front of whoever approves an AI agent's work, ask more people to agree, or refuse it. Use it when someone asks to set up ethics rules, ethical guardrails or responsible-AI checks for agents; to adapt the starter rules; to cover hiring, credit, debt, vulnerable customers, personal data or telling people that AI is involved; to work out why a rule flags too much or too little; or to connect the rules to their AI register and policies. The agent drafts rules; a person adds them and switches them on. It works with Deliverd, or in plain conversation.
license: MIT
---

# Ethics rules

This skill is for whoever writes an organisation's ethics rules, and for an
agent helping them. The `ethics` skill is for the agent that meets those rules
while it works; this one is for writing rules that catch the right requests
and stay switched on.

In Deliverd the rules live in **Agents → Rules → Ethics**. A person adds them
there and switches each one on; there is no API for them. So your work ends at
a draft the person can enter, and a plan for turning it on.

The rule under everything below: **an ethics rule can only add oversight.**
There is no rule that allows. Never draft one meant to make anything easier to
approve, or to quiet another rule.

## 1. What a rule is

| Part | What to write |
|---|---|
| **Name** | What it catches, such as "Screening job applicants". |
| **Principle** | One of fairness, privacy, safety, honesty, autonomy, wellbeing, legality, or other. Approval analytics counts concerns by it. |
| **Concern** | The question the person deciding should weigh, in one or two sentences. An agent is shown it when the rule refuses, so it must make sense on its own. |
| **What it does** | Flag, escalate or refuse (below). |
| **What it matches** | Keywords, registered actions, and the agents it applies to. |

What each effect does:

- **Flag** shows the concern to the person deciding, and approving then needs a
  written reason. At the gate, a flag stops a policy settling the request on
  its own: a person is asked.
- **Escalate** does that and asks more people to agree, sends it to named
  people as well, or both. An escalation that asks for one person and names
  nobody changes nothing, and is refused.
- **Refuse** stops the request and gives the agent the concern as the reason.

A rule needs at least one condition. A rule that matches everything teaches
people to click past it, so it cannot be saved.

## 2. Find where rules belong

Start from the work, not from a list of values. Ask the person:

- What do your agents do that **decides something about a person**: a job,
  pay, credit, a debt, a claim, access to a service?
- What do they **send in someone's name**, or to customers and the public?
- What **personal data** do they read, and where do they send it?
- Who might be on the other end in a **vulnerable situation**?

Two places in Deliverd answer some of this already:

- **The registered actions** (the ones gate policies name, such as
  `hr.terminate`). A rule on an action is the strongest kind, because an agent
  cannot word its way around it.
- **Governance → AI register.** A system recorded there with an EU AI Act use
  in Annex III (employment, credit, education, essential services and the
  rest) is a first place for a rule. The legal reading in the register is a
  person's; don't make or change it.

## 3. Start from what exists

- **The starter rules.** "Add starter rules" on the Ethics page adds six
  keyword rules, switched off: *Decisions about someone's job*; *Credit,
  housing and insurance*; *Health and personal data*; *Children*; *Messages
  sent in someone else's name*; *Things that cannot be undone*. Any whose name
  the organisation already has is skipped.
- **The library** in `references/library.json` beside this file: thirteen more,
  grouped by area (people, hiring and pay; money, credit and debt; speaking to
  customers and the public; personal data; acting on someone's account). Each
  carries requests it should catch and requests it should leave alone.

Neither is right as it stands. Change the keywords to the words this
organisation's agents and people actually use.

## 4. Write each rule well

**Matches.** Prefer a registered action to keywords wherever one exists.
Every condition in a rule must hold for it to match, so an action and a
keyword list in the same rule catches only requests that have both. To catch
either, write two rules. Limiting a rule to some agents narrows it the same
way.

**Keywords** are a net for plain requests, not a lock:

- Whole words or phrases, any case. A trailing `*` matches a prefix
  (`bereave*` catches "bereaved" and "bereavement").
- At least three letters each, and up to 50 in a rule.
- Searched in the request's title, its description and the text values at
  the top level of its input.
- Agents talk about software all day. Leave out words that mean something
  else there: "child" (a child process), "fire" (fire the webhook), "kill",
  "terminate" (an instance), "execute", "abort", "vulnerable" (a dependency),
  "debt" (tech debt), "health" (a health check). Use a phrase instead:
  "terminate employment", "vulnerable customer*".

**Test the keywords before anyone switches the rule on.** Write five requests
the rule should catch and five it should leave alone, and make at least two of
those the everyday wording of this organisation's own agents. Check each by
hand: does a keyword appear as whole words? There is no replay for ethics
rules (replay covers gate policy only), so this is the test.

**The concern.** A question, not a verdict, and never an accusation of the
agent or the person: "Is the decision based on relevant facts?", not "This is
discriminatory." Name what to check. Don't put anyone's name or personal data
in a rule.

**The effect.** Start with flag. Escalate where one person's judgement is not
enough: children, vulnerable people, biometrics. Refuse only for work the
organisation has already decided, in writing, that it never does, and say so
in the concern.

## 5. Turn rules on one at a time

1. Switch on one rule, as a flag.
2. Leave it for a week of normal work.
3. Read **Records → Analytics → Approval analytics**. Its ethics concerns panel
   shows how many requests put a concern to the approver, what share of all
   requests that is, how many of those were approved anyway (each with a
   reason), and the counts by principle.
4. Read the reasons approvers gave.
   - Approved anyway close to every time means the rule flags what people are
     comfortable with. Narrow the keywords, or move the rule to an action,
     before people learn to click past it.
   - Never flagged, when you know the work happened, means the words are
     wrong. Look at how the requests were actually worded.
5. Only then switch on the next, or raise this one to escalate.

Every change to a rule is recorded in **Records → Audit log**
(`ethics.rule_changed`), and so is each request a rule flagged or refused
(`ethics.flagged`, `ethics.refused`). So switch a rule off rather than
delete it quietly, and say why.

## 6. The model screen

On plans that include it, the same page has a model screen: a model reads each
request and adds up to three concerns of its own, shown as "Model screen".
It can only flag, never escalate or refuse, and each request it reads counts
against the plan's monthly limit. It catches what nobody thought to write a
keyword for. It does not replace the rules, and it reads the same text, so
the same care about wording applies.

## 7. Connect the rules to governance

An organisation's AI policy (Governance → AI policies) may say that decisions
about people get a human look, or that people are told when AI is involved.
The rules are one way that policy is put into practice, the audit log is the
record of each time one acted, and approval analytics shows whether people
still read them. Say exactly that. Never say a set of rules makes an
organisation compliant with anything: that reading is a person's.

## Without Deliverd

Everything above still works as a design exercise: the same parts, the same
keyword tests, the same order of switching on. Write the rules as a table the
person can review, with the examples each one catches and leaves alone.

## Non-negotiables

- You draft rules. A person adds them and switches them on.
- There is no allow. Never draft a rule to make anything easier to approve,
  or to quiet another rule or the model screen.
- Write the concern as a question, never as a verdict on a person.
- Never put a person's name or personal data in a rule.
- Never say the rules make anyone compliant.
