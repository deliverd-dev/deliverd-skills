---
description: Ask a person to approve something before you do it, and wait for the answer
argument-hint: "<what you want to do> [approver: name, email or team]"
---

Ask for approval through Deliverd: $ARGUMENTS

Follow the `approval` skill. In short:

1. Turn the request into something a person can decide from a phone: a
   one-line `title` saying exactly what will happen, a `description` saying
   why and what it affects, the evidence as `factors`, and a `risk`.
2. Use the approver named above as `approvers` (an email, a person's name or a
   team such as "Finance team"). If none was named, leave `approvers` out and
   the organisation's admins decide. Do not guess an email address.
3. Call `request_approval` and show the person the `url` it returns.
4. Poll `get_approval` with the `id` until `status` is no longer `pending`.
   A decision can take hours; check every minute or so and say you are
   waiting rather than going silent.
5. Act on the answer, and only on it:
   - `approved`: go ahead. If `approvedInput` is set, the approver changed the
     inputs: use theirs, not yours.
   - `changes_requested`: revise as the approver asked, then ask again.
   - `rejected`, `expired` or `cancelled`: do not do it. Say so and stop.
   - If the approver asked a question, answer it with
     `answer_approval_question` and keep waiting.

An approval is your organisation's authorisation only. If Claude Code or the
person you are working with asks to confirm a step, that still stands.
